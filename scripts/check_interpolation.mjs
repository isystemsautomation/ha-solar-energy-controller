#!/usr/bin/env node
/**
 * Regression tests for chart-utils interpolateToTimeAxis().
 * Run: node scripts/check_interpolation.mjs
 */

import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const chartUtilsUrl = pathToFileURL(
  join(__dirname, "../custom_components/solar_energy_controller/frontend/chart-utils.js")
).href;

const { interpolateToTimeAxis } = await import(chartUtilsUrl);

let passed = 0;
let failed = 0;

function assert(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    return;
  }
  failed += 1;
  console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
}

function assertArrayClose(name, actual, expected, epsilon = 1e-9) {
  if (actual.length !== expected.length) {
    failed += 1;
    console.error(
      `FAIL: ${name} — length ${actual.length} !== ${expected.length}\n  got: ${JSON.stringify(actual)}\n  exp: ${JSON.stringify(expected)}`
    );
    return;
  }
  for (let i = 0; i < actual.length; i += 1) {
    const a = actual[i];
    const e = expected[i];
    if (a === null && e === null) continue;
    if (typeof a === "number" && typeof e === "number" && Math.abs(a - e) <= epsilon) {
      continue;
    }
    failed += 1;
    console.error(
      `FAIL: ${name} — index ${i}: ${a} !== ${e}\n  got: ${JSON.stringify(actual)}\n  exp: ${JSON.stringify(expected)}`
    );
    return;
  }
  passed += 1;
}

function assertAllInRange(name, values, min, max) {
  for (const v of values) {
    if (v === null) continue;
    if (v < min || v > max) {
      failed += 1;
      console.error(`FAIL: ${name} — value ${v} outside [${min}, ${max}]`);
      return;
    }
  }
  passed += 1;
}

// a) exact time match
assertArrayClose(
  "exact time match",
  interpolateToTimeAxis(
    [
      { time: 0, value: 10 },
      { time: 100, value: 20 },
    ],
    [100]
  ),
  [20]
);

// b) midpoint interpolation
assertArrayClose(
  "midpoint interpolation",
  interpolateToTimeAxis(
    [
      { time: 0, value: 0 },
      { time: 10, value: 100 },
    ],
    [5]
  ),
  [50]
);

// c) after last point — hold last value (regression for extrapolation bug)
assertArrayClose(
  "hold after last point",
  interpolateToTimeAxis(
    [
      { time: 0, value: 5 },
      { time: 1000, value: 250 },
    ],
    [0, 1000, 60000, 360000]
  ),
  [5, 250, 250, 250]
);

// d) before first point — hold first value
assertArrayClose(
  "hold before first point",
  interpolateToTimeAxis(
    [
      { time: 1000, value: 42 },
      { time: 2000, value: 43 },
    ],
    [0, 500, 1000]
  ),
  [42, 42, 42]
);

// e) sparse series — no drift over an hour at 10 s steps
{
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
  assertAllInRange("sparse series in range", series, -500, -499);
}

// f) empty points
assertArrayClose("empty points", interpolateToTimeAxis([], [1, 2, 3]), [null, null, null]);

// g) duplicate time — no NaN/Infinity
{
  const out = interpolateToTimeAxis(
    [
      { time: 100, value: 1 },
      { time: 100, value: 2 },
    ],
    [100]
  );
  assert("duplicate time finite", out.every((v) => Number.isFinite(v)), String(out));
}

// h) single point — all values equal
assertArrayClose(
  "single point",
  interpolateToTimeAxis([{ time: 5000, value: 6 }], [0, 5000, 99999]),
  [6, 6, 6]
);

if (failed > 0) {
  console.error(`\n${failed} failed, ${passed} passed`);
  process.exit(1);
}

console.log(`All ${passed} interpolation checks passed.`);
