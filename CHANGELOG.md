# Changelog

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
- Thinner chart trend lines

## 1.0.9–1.0.13

- Startup tolerance for unavailable upstream entities
- Native dialog popup for HA 2026.3+
- Lovelace resource registration fixes
