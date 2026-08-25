DOMAIN = "solar_energy_controller"

from homeassistant.const import Platform

CONF_PROCESS_VALUE_ENTITY = "process_value_entity"
CONF_SETPOINT_ENTITY = "setpoint_entity"
CONF_OUTPUT_ENTITY = "output_entity"
CONF_GRID_POWER_ENTITY = "grid_power_entity"
CONF_NAME = "name"
CONF_PV_MIN = "pv_min"
CONF_PV_MAX = "pv_max"
CONF_SP_MIN = "sp_min"
CONF_SP_MAX = "sp_max"
CONF_GRID_MIN = "grid_min"
CONF_GRID_MAX = "grid_max"

# Options (PID tuning)
CONF_KP = "kp"
CONF_KI = "ki"
CONF_KD = "kd"
CONF_MIN_OUTPUT = "min_output"
CONF_MAX_OUTPUT = "max_output"
CONF_UPDATE_INTERVAL = "update_interval"
CONF_ENABLED = "enabled"
CONF_INVERT_PV = "invert_pv"
CONF_INVERT_SP = "invert_sp"
CONF_GRID_POWER_INVERT = "grid_power_invert"
CONF_PID_MODE = "pid_mode"
CONF_GRID_LIMITER_ENABLED = "grid_limiter_enabled"
CONF_GRID_LIMITER_TYPE = "grid_limiter_type"
CONF_GRID_LIMITER_LIMIT_W = "grid_limiter_limit_w"
CONF_GRID_LIMITER_DEADBAND_W = "grid_limiter_deadband_w"
CONF_PID_DEADBAND = "pid_deadband"
CONF_RATE_LIMITER_ENABLED = "rate_limiter_enabled"
CONF_RATE_LIMIT = "rate_limit"
CONF_RUNTIME_MODE = "runtime_mode"
CONF_MANUAL_SP_VALUE = "manual_sp_value"
CONF_MANUAL_OUT_VALUE = "manual_out_value"
CONF_MAX_OUTPUT_STEP = "max_output_step"
CONF_OUTPUT_EPSILON = "output_epsilon"

PID_MODE_DIRECT = "direct"
PID_MODE_REVERSE = "reverse"

GRID_LIMITER_TYPE_IMPORT = "import"
GRID_LIMITER_TYPE_EXPORT = "export"

GRID_LIMITER_STATE_NORMAL = "normal"
GRID_LIMITER_STATE_LIMITING_IMPORT = "limiting_import"
GRID_LIMITER_STATE_LIMITING_EXPORT = "limiting_export"

DEFAULT_KP = 1.0
DEFAULT_KI = 0.1
DEFAULT_KD = 0.0
DEFAULT_MIN_OUTPUT = 0.0
DEFAULT_MAX_OUTPUT = 11000.0
DEFAULT_UPDATE_INTERVAL = 10
DEFAULT_ENABLED = True
DEFAULT_INVERT_PV = False
DEFAULT_INVERT_SP = False
DEFAULT_GRID_POWER_INVERT = False
DEFAULT_PID_MODE = PID_MODE_DIRECT
DEFAULT_GRID_LIMITER_ENABLED = False
DEFAULT_GRID_LIMITER_TYPE = GRID_LIMITER_TYPE_IMPORT
DEFAULT_GRID_LIMITER_LIMIT_W = 1000.0
DEFAULT_GRID_LIMITER_DEADBAND_W = 50.0
DEFAULT_PID_DEADBAND = 0.0
DEFAULT_RATE_LIMITER_ENABLED = False
DEFAULT_RATE_LIMIT = 0.0
DEFAULT_RUNTIME_MODE = "auto_sp"
DEFAULT_MANUAL_SP_VALUE = 0.0
DEFAULT_MANUAL_OUT_VALUE = 0.0
DEFAULT_MAX_OUTPUT_STEP = 0.0
DEFAULT_OUTPUT_EPSILON = 0.0
DEFAULT_PV_MIN = -5000.0
DEFAULT_PV_MAX = 5000.0
DEFAULT_SP_MIN = -5000.0
DEFAULT_SP_MAX = 5000.0
DEFAULT_GRID_MIN = -5000.0
DEFAULT_GRID_MAX = 5000.0

RUNTIME_MODE_AUTO_SP = "auto_sp"
RUNTIME_MODE_MANUAL_SP = "manual_sp"
RUNTIME_MODE_HOLD = "hold"
RUNTIME_MODE_MANUAL_OUT = "manual_out"

_LEGACY_RUNTIME_MODES: dict[str, str] = {
    "AUTO SP": RUNTIME_MODE_AUTO_SP,
    "MANUAL SP": RUNTIME_MODE_MANUAL_SP,
    "HOLD": RUNTIME_MODE_HOLD,
    "MANUAL OUT": RUNTIME_MODE_MANUAL_OUT,
}

_VALID_RUNTIME_MODES = frozenset(
    {
        RUNTIME_MODE_AUTO_SP,
        RUNTIME_MODE_MANUAL_SP,
        RUNTIME_MODE_HOLD,
        RUNTIME_MODE_MANUAL_OUT,
    }
)


def normalize_runtime_mode(mode: str | None) -> str:
    """Return a slug runtime mode, migrating legacy spaced labels if needed."""
    if not mode:
        return DEFAULT_RUNTIME_MODE
    if mode in _LEGACY_RUNTIME_MODES:
        return _LEGACY_RUNTIME_MODES[mode]
    if mode in _VALID_RUNTIME_MODES:
        return mode
    return DEFAULT_RUNTIME_MODE


CONFIG_ENTRY_VERSION = 2

PLATFORMS = [Platform.SENSOR, Platform.SWITCH, Platform.NUMBER, Platform.SELECT]
