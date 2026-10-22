# Latveria full-stack deployment for Render's free web service.
# The original source is kept as latveria-main.zip in the repository.
FROM oven/bun:1.3.14-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends unzip ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace
COPY latveria-main.zip /tmp/latveria-main.zip
RUN unzip -q /tmp/latveria-main.zip -d /workspace
WORKDIR /workspace/latveria-main
RUN bun install --frozen-lockfile

FROM base AS build
WORKDIR /workspace/latveria-main
RUN bun run --filter '@latveria/web' build

# Keep only production dependencies in the runtime image.
FROM base AS production-dependencies
WORKDIR /workspace/latveria-main
RUN bun install --frozen-lockfile --production --filter '@latveria/api' --filter '@latveria/shared'

FROM oven/bun:1.3.14-slim AS runtime
ENV NODE_ENV=production PORT=10000 SERVE_WEB=true
WORKDIR /app
COPY --from=production-dependencies /workspace/latveria-main/package.json ./package.json
COPY --from=production-dependencies /workspace/latveria-main/bun.lock ./bun.lock
COPY --from=production-dependencies /workspace/latveria-main/bunfig.toml ./bunfig.toml
COPY --from=production-dependencies /workspace/latveria-main/node_modules ./node_modules
COPY --from=production-dependencies /workspace/latveria-main/packages/shared ./packages/shared
COPY --from=production-dependencies /workspace/latveria-main/apps/api ./apps/api
COPY --from=build /workspace/latveria-main/apps/web/dist ./apps/web/dist
WORKDIR /app/apps/api
USER bun
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD bun -e "fetch('http://127.0.0.1:10000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
# Apply safe, idempotent DB migrations and seed the initial example question bank.
CMD ["sh", "-c", "bun scripts/migrate-db.ts && bun scripts/seed-db.ts && exec bun src/index.ts"]
