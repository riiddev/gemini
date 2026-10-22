const configuredMode = import.meta.env.VITE_DEMO_MODE;
const isVercelHost =
  typeof window !== "undefined" && window.location.hostname.endsWith(".vercel.app");

/** Vercel preview runs as a browser-only experiment until a real API is attached. */
export const IS_DEMO_MODE =
  configuredMode === "true" ||
  (configuredMode !== "false" && import.meta.env.PROD && isVercelHost);