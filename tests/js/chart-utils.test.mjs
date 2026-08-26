import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  interpolateToTimeAxis,
  parseHistory,
  formatValue,
  getEntityIds,
} from "../../custom_components/solar_energy_controller/frontend/chart-utils.js";
import {
  normalizeRuntimeMode,
  runtimeModeLabel,
  RUNTIME_MODE_AUTO_SP,
  RUNTIME_MODE_MANUAL_SP,
  RUNTIME_MODE_HOLD,
  RUNTIME_MODE_MANUAL_OUT,
} from "../../custom_components/solar_energy_controller/frontend/runtime-modes.js";

describe("interpolateToTimeAxis", () => {
  it("matches both endpoint times exactly", () => {
    assert.deepEqual(
      interpolateToTimeAxis(
        [
          { time: 0, value: 10 },
          { time: 10, value: 20 },
        ],
        [0, 10]
      ),
      [10, 20]
    );
  });

  it("interpolates midpoint", () => {
    assert.deepEqual(
      interpolateToTimeAxis(
        [
          { time: 0, value: 0 },
          { time: 10, value: 100 },
        ],
        [5]
      ),
      [50]
    );
  });

  it("holds last value after the series ends", () => {
    assert.deepEqual(
      interpolateToTimeAxis(
        [
          { time: 0, value: 5 },
          { time: 1000, value: 250 },
        ],
        [0, 1000, 60000, 360000]
      ),
      [5, 250, 250, 250]
    );
  });

  it("holds first value before the series starts", () => {
    assert.deepEqual(
      interpolateToTimeAxis(
        [
          { time: 1000, value: 42 },
          { time: 2000, value: 43 },
        ],
        [0, 500, 1000]
      ),
      [42, 42, 42]
    );
  });

  it("returns nulls for empty points", () => {
    assert.deepEqual(interpolateToTimeAxis([], [1, 2, 3]), [null, null, null]);
  });

  it("repeats a single point", () => {
    assert.deepEqual(
      interpolateToTimeAxis([{ time: 5000, value: 6 }], [0, 5000, 99999]),
      [6, 6, 6]
    );
  });

  it("handles duplicate timestamps without NaN or Infinity", () => {
    const out = interpolateToTimeAxis(
      [
        { time: 0, value: 1 },
        { time: 0, value: 2 },
      ],
      [0, 1]
    );
    assert.ok(out.every((v) => Number.isFinite(v)));
    assert.deepEqual(out, [1, 2]);
  });

  it("keeps sparse series within the data range", () => {
    const axis = [];
    for (let t = 0; t <= 3600000; t += 10000) {
      axis.push(t);
    }
    const series = interpolateToTimeAxis(
      [
        { time: 0, value: -500 },
        { time: 10000, value: -499 },
      ],
      axis
    );
    for (const v of series) {
      assert.ok(v >= -500 && v <= -499, `out of range: ${v}`);
    }
  });
});

describe("parseHistory", () => {
  const entityIds = {
    pv: "sensor.test_pv_value",
    sp: "sensor.test_effective_sp",
    output: "sensor.test_output",
  };

  it("sorts unsorted entity history", () => {
    const history = [
      [
        { entity_id: entityIds.pv, state: "30", last_changed: "2020-01-01T00:00:30.000Z" },
        { entity_id: entityIds.pv, state: "10", last_changed: "2020-01-01T00:00:10.000Z" },
        { entity_id: entityIds.pv, state: "20", last_changed: "2020-01-01T00:00:20.000Z" },
      ],
      [
        { entity_id: entityIds.sp, state: "0", last_changed: "2020-01-01T00:00:10.000Z" },
      ],
      [
        { entity_id: entityIds.output, state: "0", last_changed: "2020-01-01T00:00:10.000Z" },
      ],
    ];
    const result = parseHistory(history, entityIds);
    assert.ok(result);
    assert.deepEqual(result.datasets[0].data, [10, 20, 30]);
  });

  it("ignores unavailable states on the shared axis", () => {
    const history = [
      [
        { entity_id: entityIds.pv, state: "5", last_changed: "2020-01-01T00:00:00.000Z" },
        { entity_id: entityIds.pv, state: "unavailable", last_changed: "2020-01-01T00:01:00.000Z" },
      ],
      [
        { entity_id: entityIds.sp, state: "1", last_changed: "2020-01-01T00:00:00.000Z" },
      ],
      [
        { entity_id: entityIds.output, state: "2", last_changed: "2020-01-01T00:00:00.000Z" },
      ],
    ];
    const result = parseHistory(history, entityIds);
    assert.ok(result);
    assert.equal(result.labels.length, 1);
  });

  it("returns null for empty history", () => {
    assert.equal(parseHistory([], entityIds), null);
  });
});

describe("formatValue", () => {
  it("formats edge cases", () => {
    assert.equal(formatValue(null), "—");
    assert.equal(formatValue(undefined), "—");
    assert.equal(formatValue(Number.NaN), "—");
    assert.equal(formatValue(Number.POSITIVE_INFINITY), "—");
    assert.equal(formatValue(-0.04), "0.0");
    assert.equal(formatValue(0), "0.0");
    assert.equal(formatValue(5.55), "5.5");
    assert.equal(formatValue("ok"), "ok");
  });
});

describe("normalizeRuntimeMode", () => {
  it("rejects prototype pollution keys", () => {
    assert.equal(normalizeRuntimeMode("constructor"), RUNTIME_MODE_AUTO_SP);
    assert.equal(normalizeRuntimeMode("toString"), RUNTIME_MODE_AUTO_SP);
    assert.equal(normalizeRuntimeMode("__proto__"), RUNTIME_MODE_AUTO_SP);
    assert.equal(normalizeRuntimeMode("valueOf"), RUNTIME_MODE_AUTO_SP);
  });

  it("accepts slugs and legacy labels", () => {
    assert.equal(normalizeRuntimeMode(null), RUNTIME_MODE_AUTO_SP);
    assert.equal(normalizeRuntimeMode(undefined), RUNTIME_MODE_AUTO_SP);
    assert.equal(normalizeRuntimeMode("garbage"), RUNTIME_MODE_AUTO_SP);
    assert.equal(normalizeRuntimeMode("MANUAL SP"), RUNTIME_MODE_MANUAL_SP);
    assert.equal(normalizeRuntimeMode(RUNTIME_MODE_HOLD), RUNTIME_MODE_HOLD);
    assert.equal(normalizeRuntimeMode(RUNTIME_MODE_MANUAL_OUT), RUNTIME_MODE_MANUAL_OUT);
    assert.equal(normalizeRuntimeMode(RUNTIME_MODE_AUTO_SP), RUNTIME_MODE_AUTO_SP);
  });

  it("labels normalized modes safely", () => {
    assert.equal(runtimeModeLabel(RUNTIME_MODE_MANUAL_SP), "MANUAL SP");
    assert.equal(runtimeModeLabel("constructor"), "AUTO SP");
  });
});

describe("getEntityIds", () => {
  it("builds sensor entity ids", () => {
    assert.deepEqual(getEntityIds({}, "sensor.charger_status"), {
      pv: "sensor.charger_pv_value",
      sp: "sensor.charger_effective_sp",
      output: "sensor.charger_output",
    });
  });

  it("rejects non-sensor pid entities", () => {
    assert.equal(getEntityIds({}, "binary_sensor.x_status"), null);
    assert.equal(getEntityIds({}, null), null);
  });
});
