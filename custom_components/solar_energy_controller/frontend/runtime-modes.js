export const RUNTIME_MODES = ["AUTO SP", "MANUAL SP", "HOLD", "MANUAL OUT"];
export const RUNTIME_MODE_AUTO_SP = "AUTO SP";
export const RUNTIME_MODE_MANUAL_SP = "MANUAL SP";
export const RUNTIME_MODE_HOLD = "HOLD";
export const RUNTIME_MODE_MANUAL_OUT = "MANUAL OUT";

export function normalizeRuntimeMode(mode) {
  if (!mode) {
    return RUNTIME_MODE_AUTO_SP;
  }
  return String(mode).replace(/_/g, " ");
}

export function isManualSpMode(mode) {
  return normalizeRuntimeMode(mode) === RUNTIME_MODE_MANUAL_SP;
}

export function isManualOutMode(mode) {
  return normalizeRuntimeMode(mode) === RUNTIME_MODE_MANUAL_OUT;
}
