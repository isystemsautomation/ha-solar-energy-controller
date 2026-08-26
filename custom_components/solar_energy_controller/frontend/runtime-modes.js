export const RUNTIME_MODE_AUTO_SP = "auto_sp";
export const RUNTIME_MODE_MANUAL_SP = "manual_sp";
export const RUNTIME_MODE_HOLD = "hold";
export const RUNTIME_MODE_MANUAL_OUT = "manual_out";

export const RUNTIME_MODES = [
  RUNTIME_MODE_AUTO_SP,
  RUNTIME_MODE_MANUAL_SP,
  RUNTIME_MODE_HOLD,
  RUNTIME_MODE_MANUAL_OUT,
];

const LEGACY_RUNTIME_MODES = {
  "AUTO SP": RUNTIME_MODE_AUTO_SP,
  "MANUAL SP": RUNTIME_MODE_MANUAL_SP,
  HOLD: RUNTIME_MODE_HOLD,
  "MANUAL OUT": RUNTIME_MODE_MANUAL_OUT,
};

export const RUNTIME_MODE_LABELS = {
  [RUNTIME_MODE_AUTO_SP]: "AUTO SP",
  [RUNTIME_MODE_MANUAL_SP]: "MANUAL SP",
  [RUNTIME_MODE_HOLD]: "HOLD",
  [RUNTIME_MODE_MANUAL_OUT]: "MANUAL OUT",
};

export function normalizeRuntimeMode(mode) {
  if (!mode) {
    return RUNTIME_MODE_AUTO_SP;
  }
  const value = String(mode);
  if (Object.hasOwn(LEGACY_RUNTIME_MODES, value)) {
    return LEGACY_RUNTIME_MODES[value];
  }
  if (RUNTIME_MODES.includes(value)) {
    return value;
  }
  return RUNTIME_MODE_AUTO_SP;
}

export function runtimeModeLabel(mode) {
  const normalized = normalizeRuntimeMode(mode);
  if (Object.hasOwn(RUNTIME_MODE_LABELS, normalized)) {
    return RUNTIME_MODE_LABELS[normalized];
  }
  return normalized;
}

export function isManualSpMode(mode) {
  return normalizeRuntimeMode(mode) === RUNTIME_MODE_MANUAL_SP;
}

export function isManualOutMode(mode) {
  return normalizeRuntimeMode(mode) === RUNTIME_MODE_MANUAL_OUT;
}
