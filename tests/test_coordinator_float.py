"""Tests for non-finite float handling in the coordinator."""

from __future__ import annotations

import math
from dataclasses import dataclass
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from custom_components.solar_energy_controller.const import (
    CONF_ENABLED,
    CONF_GRID_POWER_ENTITY,
    CONF_KD,
    CONF_KI,
    CONF_KP,
    CONF_MAX_OUTPUT,
    CONF_MIN_OUTPUT,
    CONF_OUTPUT_ENTITY,
    CONF_PROCESS_VALUE_ENTITY,
    CONF_RUNTIME_MODE,
    CONF_SETPOINT_ENTITY,
    DEFAULT_ENABLED,
    DEFAULT_KD,
    DEFAULT_KI,
    DEFAULT_KP,
    DEFAULT_MAX_OUTPUT,
    DEFAULT_MIN_OUTPUT,
    RUNTIME_MODE_AUTO_SP,
)
from custom_components.solar_energy_controller.coordinator import (
    GRID_LIMITER_STATE_NORMAL,
    InputValues,
    LimiterResult,
    SetpointContext,
    SolarEnergyFlowCoordinator,
    _denormalize_value,
    _normalize_value,
    _state_to_float,
)


@dataclass
class MockState:
    state: str = "100.0"


@pytest.fixture
def mock_hass():
    hass = MagicMock(spec=HomeAssistant)
    hass.states = MagicMock()
    hass.states.get = MagicMock(return_value=MockState("100.0"))
    hass.states.__contains__ = MagicMock(return_value=True)
    hass.services = MagicMock()
    return hass


@pytest.fixture
def mock_entry():
    entry = MagicMock(spec=ConfigEntry)
    entry.entry_id = "test_entry_123"
    entry.options = {
        CONF_PROCESS_VALUE_ENTITY: "sensor.pv",
        CONF_SETPOINT_ENTITY: "number.sp",
        CONF_OUTPUT_ENTITY: "number.output",
        CONF_GRID_POWER_ENTITY: "sensor.grid",
        CONF_KP: DEFAULT_KP,
        CONF_KI: DEFAULT_KI,
        CONF_KD: DEFAULT_KD,
        CONF_MIN_OUTPUT: DEFAULT_MIN_OUTPUT,
        CONF_MAX_OUTPUT: DEFAULT_MAX_OUTPUT,
        CONF_ENABLED: DEFAULT_ENABLED,
        CONF_RUNTIME_MODE: RUNTIME_MODE_AUTO_SP,
    }
    entry.data = {}
    return entry


@pytest.mark.parametrize(
    ("raw",),
    [
        ("nan",),
        ("NaN",),
        ("inf",),
        ("-inf",),
    ],
)
def test_state_to_float_rejects_non_finite(raw: str) -> None:
    state = SimpleNamespace(state=raw)
    assert _state_to_float(state, "sensor.test") is None


@pytest.mark.parametrize(
    ("value",),
    [
        (float("nan"),),
        (float("inf"),),
        (float("-inf"),),
    ],
)
def test_normalize_value_rejects_non_finite(value: float) -> None:
    assert _normalize_value(value, 0.0, 100.0) is None
    assert _denormalize_value(value, 0.0, 100.0) is None


def test_coordinator_missing_input_when_pv_is_nan(mock_hass, mock_entry) -> None:
    coordinator = SolarEnergyFlowCoordinator(mock_hass, mock_entry)

    options = coordinator.build_runtime_options()
    inputs = InputValues(pv=float("nan"), sp=50.0, grid_power=0.0)
    setpoint = SetpointContext(
        runtime_mode=options.runtime_mode,
        manual_sp_value=None,
        manual_sp_display_value=None,
        pv_for_pid=None,
        sp_for_pid=50.0,
        status="running",
        mode_changed=False,
    )
    limiter_result = LimiterResult(
        pv_for_pid=None,
        sp_for_pid=50.0,
        pv_pct=None,
        sp_pct=50.0,
        limiter_state=GRID_LIMITER_STATE_NORMAL,
        status="running",
    )

    plan = coordinator._calculate_output_plan(
        options=options,
        inputs=inputs,
        setpoint=setpoint,
        limiter_result=limiter_result,
        prev_runtime_mode=options.runtime_mode,
        prev_limiter_state=GRID_LIMITER_STATE_NORMAL,
        prev_sp_for_pid=50.0,
        prev_pv_for_pid=None,
    )

    assert plan.status == "missing_input"
    assert plan.output is None


def test_read_inputs_treats_nan_pv_as_missing(mock_hass, mock_entry) -> None:
    coordinator = SolarEnergyFlowCoordinator(mock_hass, mock_entry)

    def mock_get(entity_id):
        if entity_id == "sensor.pv":
            return SimpleNamespace(state="nan")
        return SimpleNamespace(state="50.0")

    mock_hass.states.get = MagicMock(side_effect=mock_get)

    inputs = coordinator._read_inputs(coordinator.build_runtime_options())

    assert inputs.pv is None
    assert math.isfinite(inputs.sp)
