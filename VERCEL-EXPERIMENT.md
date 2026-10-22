# Latveria experiment on GitHub + Vercel

This repository is an independent experiment copy. The Vercel build intentionally enables browser demo mode until a real API is configured.

- The learning zone opens without an online account.
- Sample drilling packages and questions are available.
- Practice history and demo progress are stored in the current browser with localStorage.
- Data is local to that browser/device; it is not shared, backed up, or synchronized.
- Real account authentication, cross-device profiles, multiplayer/WebSocket features, saved server-side questions/results, avatar uploads, and production TeX rendering are not connected in this demo.

The mode can be explicitly enabled with VITE_DEMO_MODE=true. Do not disable demo mode on a static Vercel deployment until a working API is available.

To reset local demo data, clear this site's browser storage.

The one-time unpack workflow is kept separate from the app source files so it can finish without changing workflow permissions.

## Deploy settings

For the Vercel project, use the repository root as the Root Directory, the Bun lockfile install command, the web workspace build command, and `apps/web/dist` as the output directory.

- Install: `bun install --frozen-lockfile`
- Build: `bun run --filter '@latveria/web' build`
- Output: `apps/web/dist`
