"""Pytest configuration for Solar Energy Controller tests."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

pytest_plugins = "pytest_homeassistant_custom_component"


async def _noop_register_frontend(_hass):
    """No-op frontend registration for tests."""
    return None


def _consume_async_task(coro):
    """Close coroutines passed to hass.async_create_task in unit tests."""
    if hasattr(coro, "close"):
        coro.close()
    return MagicMock()


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Automatically enable custom integrations for all tests."""
    return enable_custom_integrations


@pytest.fixture(autouse=True)
def mock_hass_frontend():
    """Mock hass_frontend module since it's not available in test environment.

    The frontend component requires hass_frontend, which is not available as
    a pip package. We mock it here so frontend can be set up in tests.
    """
    with patch.dict("sys.modules", {"hass_frontend": MagicMock()}):
        yield


@pytest.fixture(autouse=True)
def disable_lovelace_registration():
    """Prevent Lovelace retry timers from lingering after HA test teardown."""
    with patch(
        "custom_components.solar_energy_controller.async_register_frontend",
        side_effect=_noop_register_frontend,
    ):
        yield

