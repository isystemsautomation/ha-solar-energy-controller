#!/usr/bin/env bash
# Bundle Lovelace card sources into single-file modules (better cache behaviour in Opera etc.)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="${ROOT}/custom_components/solar_energy_controller/frontend"

cd "${FRONTEND}"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required to bundle frontend assets" >&2
  exit 1
fi

npx --yes esbuild@0.28.2 pid-controller-mini.js \
  --bundle --format=esm \
  --outfile=pid-controller-mini.bundled.js

npx --yes esbuild@0.28.2 pid-controller-popup.js \
  --bundle --format=esm \
  --outfile=pid-controller-popup.bundled.js

echo "Bundled:"
ls -lh pid-controller-mini.bundled.js pid-controller-popup.bundled.js
