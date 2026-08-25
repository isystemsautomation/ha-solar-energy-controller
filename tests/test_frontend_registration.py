"""Tests for Lovelace JavaScript module registration."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from custom_components.solar_energy_controller.frontend import JSModuleRegistration, URL_BASE


@pytest.fixture
def mock_lovelace_resources():
    resources = MagicMock()
    resources.loaded = True
    resources.async_items = MagicMock(return_value=[])
    resources.async_create_item = AsyncMock()
    resources.async_update_item = AsyncMock()
    resources.async_load = AsyncMock()
    return resources


@pytest.fixture
def mock_hass(mock_lovelace_resources):
    hass = MagicMock()
    lovelace = MagicMock()
    lovelace.mode = "storage"
    lovelace.resources = mock_lovelace_resources
    hass.data = {"lovelace": lovelace}
    return hass


async def test_registers_missing_modules(mock_hass, mock_lovelace_resources):
    registrar = JSModuleRegistration(mock_hass)

    result = await registrar.async_register()

    assert result is True
    assert mock_lovelace_resources.async_create_item.await_count == 2
    first_call = mock_lovelace_resources.async_create_item.await_args_list[0].args[0]
    assert first_call["res_type"] == "module"
    assert first_call["url"].startswith(f"{URL_BASE}/pid-controller-mini.js?v=")


async def test_updates_stale_module_version(mock_hass, mock_lovelace_resources):
    mock_lovelace_resources.async_items.return_value = [
        {
            "id": "abc",
            "url": f"{URL_BASE}/pid-controller-mini.js?v=1.0.0",
        },
        {
            "id": "def",
            "url": f"{URL_BASE}/pid-controller-popup.js?v=1.0.0",
        },
    ]

    registrar = JSModuleRegistration(mock_hass)
    result = await registrar.async_register()

    assert result is True
    mock_lovelace_resources.async_create_item.assert_not_called()
    assert mock_lovelace_resources.async_update_item.await_count == 2
