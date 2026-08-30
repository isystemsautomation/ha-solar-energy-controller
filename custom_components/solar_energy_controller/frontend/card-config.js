/** Shared Lovelace card config normalization for PID cards. */

export function resolvePidEntity(config) {
  if (!config || typeof config !== "object") {
    return "";
  }
  const raw = config.pid_entity ?? config.entity;
  return typeof raw === "string" ? raw.trim() : "";
}

export function validatePidCardConfig(config) {
  const pid_entity = resolvePidEntity(config);
  if (!pid_entity) {
    return {
      ok: false,
      error:
        "pid_entity is required — choose the sensor.*_status entity from Solar Energy Controller.",
    };
  }
  if (!pid_entity.startsWith("sensor.")) {
    return {
      ok: false,
      error: `pid_entity must be a sensor (got "${pid_entity}").`,
    };
  }
  return { ok: true, pid_entity };
}
