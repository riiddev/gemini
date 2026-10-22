const configuredMode = import.meta.env.VITE_DEMO_MODE;

/**
 * This repository is a static browser demo by default.
 * Only opt out when a real API is configured with VITE_DEMO_MODE=false.
 */
export const IS_DEMO_MODE =
  configuredMode === "true" ||
  (configuredMode !== "false" && import.meta.env.PROD);
