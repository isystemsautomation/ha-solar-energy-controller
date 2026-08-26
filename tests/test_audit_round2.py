"""Additional tests from audit round 2."""

from __future__ import annotations

import json
import math

import pytest

from custom_components.solar_energy_controller.config_flow import (
    SolarEnergyFlowOptionsFlowHandler,
    _extract_domain,
)
from custom_components.solar_energy_controller.coordinator import _normalize_value
from custom_components.solar_energy_controller.diagnostics import _sanitize


def test_extract_domain_rejects_leading_dot() -> None:
    assert _extract_domain(".x") is None
    assert _extract_domain("sensor.pv") == "sensor"


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (float("inf"), 7),
        (10**20, 86400),
        ("3600", 3600),
    ],
)
def test_coerce_int_clamps_and_handles_non_finite(value, expected) -> None:
    assert SolarEnergyFlowOptionsFlowHandler._coerce_int(value, 7) == expected


@pytest.mark.parametrize(
    ("min_val", "max_val", "expected"),
    [
        (0, float("inf"), False),
        (float("-inf"), float("inf"), False),
        (0, 100, True),
    ],
)
def test_validate_range_rejects_non_finite_bounds(min_val, max_val, expected) -> None:
    assert SolarEnergyFlowOptionsFlowHandler._validate_range(min_val, max_val) is expected


def test_normalize_value_rejects_non_finite_bounds() -> None:
    assert _normalize_value(50.0, 0.0, float("inf")) is None
    assert _normalize_value(50.0, float("-inf"), float("inf")) is None
    assert _normalize_value(float("nan"), 0.0, 100.0) is None


def test_diagnostics_sanitize_produces_valid_json() -> None:
    payload = _sanitize(
        {
            "current_state": {"pv": float("nan"), "out": float("inf")},
            "pid_state": {"integral": float("-inf"), "prev_pv": 1.0},
        }
    )
    encoded = json.dumps(payload, allow_nan=False)
    decoded = json.loads(encoded)
    assert decoded["current_state"]["pv"] is None
    assert decoded["current_state"]["out"] is None
    assert decoded["pid_state"]["integral"] is None
    assert decoded["pid_state"]["prev_pv"] == 1.0
