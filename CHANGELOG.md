# Changelog

## 1.1.4

### Fixed
- Chart history uses step-hold (like HA), not linear interpolation between unrelated timestamps — removes phantom slopes and axis spikes
- Chart legend and axis titles show units; caption lists the three source sensors (`*_pv_value`, `*_effective_sp`, `*_output`)

## 1.1.3

### Fixed
- Popup Limiters section: Grid Limiter + Grid Limit on one row, Rate Limiter + Rate Limit on the next

## 1.1.2

### Fixed
- Popup editor: number fields show rounded values (e.g. Manual Output `9.0` instead of full float from HA)
- Popup editor: smaller dialog (680px), tighter layout, no duplicate title when opened from the mini card

## 1.1.1

### Fixed
- CI JavaScript test step could pass with zero tests when the `tests/js/**/*.test.mjs` glob did not expand under bash without `globstar` on Node 20

## 1.1.0

### Changed
- PID rate limiter uses the configured update interval on the first step after `reset()` and caps elapsed time after long pauses (HA restart, sleep)
- Bumpless transfer keeps output steady when `Ki = 0` by preserving the integral offset
- Coordinator inherits `TimestampDataUpdateCoordinator`; diagnostics report `last_update_success_time`
- Integration sensors expose `state_class` and source units where available; `device_class: power` only for W/kW/mW

### Fixed
- Non-finite PV/SP/grid values (`nan`, `inf`) no longer normalize to 0%/100% and drive output to min/max
- Diagnostics download no longer crashes on missing `last_update_time` or non-finite coordinator values
- Popup editor no longer sends `null` to `number.set_value` when a field is cleared; save errors clear dirty state
- Popup errors use `persistent_notification` instead of browser `alert()`
- Config flow rejects infinite range bounds; update interval coerced safely up to 86400 s
- Chart interpolation, history parsing, runtime mode prototype pollution, `formatValue`, `getEntityIds` (from 1.0.24 work)
- Output no longer jumps to maximum when a sensor returns NaN

### Added
- JavaScript unit tests (`tests/js/chart-utils.test.mjs`) in CI

## 1.0.24

### Fixed
- Rewrite `interpolateToTimeAxis` — first/last segment interpolation, hold after last point, duplicate timestamps
- Sort history series before interpolation; skip invalid states on the shared time axis
- Reject NaN/Inf sensor values in coordinator (`_state_to_float`, `_normalize_value`, `_denormalize_value`)
- PID ignores non-finite PV/error without poisoning derivative state
- `formatValue` shows em dash for non-finite numbers; normalize `-0.0` to `0.0`
- `normalizeRuntimeMode` / `runtimeModeLabel` use `Object.hasOwn` (prototype pollution)
- `getEntityIds` returns null for non-`sensor.` PID entities

### Security
- Block prototype-pollution keys (`constructor`, `__proto__`, etc.) in runtime mode normalization

### Added
- JavaScript unit tests (`tests/js/chart-utils.test.mjs`) in CI via `node --test`

## 1.0.23

- Fix chart extrapolating history values far beyond real range — off-by-one in `interpolateToTimeAxis`
- Skip unavailable/unknown history states on the shared time axis; sort series before interpolation
- Add `scripts/check_interpolation.mjs` regression tests in CI

## 1.0.22

- Remove Lovelace JS resources when the last config entry is deleted (`async_remove_entry`)
- Move `lovelace` to `after_dependencies` (optional card registration, no hard dependency)
- Extract shared chart helpers into `chart-utils.js` (mini card + popup)
- Drop redundant popup `hass` polling interval; sync via mini card `updated()` instead
- Rename `coordinator.build_runtime_options()` to public API
- README: recorder exclusion guidance for the Status sensor

## 1.0.21

- Fix Runtime Mode select not switching: remove `preventDefault` on selection event
- Support new HA `ha-select` `.options` API (2026+) for labels and `detail.value`
- Keep legacy `mwc-list-item` fallback for older Home Assistant frontends

## 1.0.20

- Fix PID Controller Editor popup: wait for lazy-loaded HA web components before render
- Add `ha-components.js` loader (`loadCardHelpers` + `getConfigElement`) via relative import
- Native `<input>` / `<select>` fallback when HA components are unavailable
- Runtime Mode shows human-readable label (`MANUAL SP`) even before `mwc-list-item` loads

## 1.0.19

- Fix double-load of pid-controller-popup (dynamic import with ?v= cache-busting)
- Version chart.umd.min.js loads; guard customElements.define; mini Lit lifecycle fixes
- Replace graph error innerHTML with textContent
- Validate min_output < max_output on number entities (ServiceValidationError)
- Narrow config_flow entity validation except; strengthen entity action tests
- Remove unused duplicate images from images/

## 1.0.18

- README: document runtime mode slug values (`auto_sp`, etc.) for automations
- README: anti-windup description, diagnostic sensors note, limiter state values
- Code hygiene: remove unused imports, fix E402, narrow `except` in number entities
- Tests: use `MagicMock` for synchronous `async_update_entry` (no RuntimeWarning)

## 1.0.17

- Fix hassfest translation errors: remove quoted placeholders, select `state` slugs, sync `strings.json`/`en.json`
- Migrate runtime mode values to slugs (`auto_sp`, `manual_sp`, `hold`, `manual_out`) with config entry v2 migration
- Fix dead entity translations: remove `_attr_name` from sensor/number entities that use `translation_key`

## 1.0.16

- HACS/default readiness: MIT LICENSE, repo topics, validate CI, sorted manifest, `iot_class`
- Minimum Home Assistant version raised to **2024.7.0**
- Fix `output_epsilon` / `max_output_step` blocking writes in HOLD, MANUAL OUT, and disabled modes
- Fix hassfest translation errors; move `strings.json` to integration root
- Use `async_track_state_change_event` instead of global `state_changed` listener
- Use `async_get_loaded_integration()` for Lovelace resource version (no blocking I/O)
- Pass `config_entry` to `DataUpdateCoordinator`; use `Platform` enum for `PLATFORMS`
- Fix entity translations (`translation_key` without conflicting `_attr_name`)
- PID: remove dead anti-windup back-calculation; align reported I term with output step
- Fix failing init tests; update TESTING.md

## 1.0.15

- Fix popup editor manual SP/OUT sync (runtime mode strings now match Python: `AUTO SP`, not `AUTO_SP`)
- Fix Lovelace card script auto-registration reliability (v1.0.12–v1.0.14 startup bug)
- Add number entities for **Max output step** and **Output epsilon**
- Guard Manual SP/OUT number entities against `None` values
- Remove dead ha-dialog code path; popup uses native `<dialog>`
- Add `iot_class: local_polling` to manifest (HACS)
- CI: verify git tag matches `manifest.json` version before release
- README aligned with actual sensor units and setup requirements

## 1.0.14

- Reliable automatic Lovelace resource registration with retries
- HomeMaster brand icons in `brand/`
