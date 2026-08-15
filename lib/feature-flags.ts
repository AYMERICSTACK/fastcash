import "server-only";

function enabled(value: string | undefined, defaultValue = false) {
  if (value == null || value.trim() === "") return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function isHeyLightEnabled() {
  return enabled(process.env.HEYLIGHT_ENABLED, false);
}
