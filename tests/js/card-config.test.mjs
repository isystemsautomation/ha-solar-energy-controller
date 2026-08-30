import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  resolvePidEntity,
  validatePidCardConfig,
} from "../../custom_components/solar_energy_controller/frontend/runtime-modes.js";

describe("validatePidCardConfig", () => {
  it("accepts pid_entity", () => {
    const result = validatePidCardConfig({ pid_entity: "sensor.charger_status" });
    assert.equal(result.ok, true);
    assert.equal(result.pid_entity, "sensor.charger_status");
  });

  it("accepts legacy entity key", () => {
    const result = validatePidCardConfig({ entity: "sensor.charger_status" });
    assert.equal(result.ok, true);
    assert.equal(result.pid_entity, "sensor.charger_status");
  });

  it("rejects missing entity", () => {
    const result = validatePidCardConfig({ title: "Battery" });
    assert.equal(result.ok, false);
    assert.match(result.error, /pid_entity is required/);
  });

  it("rejects non-sensor domain", () => {
    const result = validatePidCardConfig({ pid_entity: "number.charger_output" });
    assert.equal(result.ok, false);
    assert.match(result.error, /must be a sensor/);
  });
});

describe("resolvePidEntity", () => {
  it("trims whitespace", () => {
    assert.equal(resolvePidEntity({ pid_entity: "  sensor.x_status  " }), "sensor.x_status");
  });
});
