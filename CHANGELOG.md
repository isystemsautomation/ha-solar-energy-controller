# Changelog

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
