"""Tests for Lovelace JavaScript module registration."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from custom_components.solar_energy_controller.frontend import (
    URL_BASE,
    JSModuleRegistration,
    async_unregister_frontend,
)


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


@pytest.fixture
def mock_integration_version():
    integration = MagicMock()
    integration.version = "1.0.17"
    with patch(
        "custom_components.solar_energy_controller.frontend.async_get_loaded_integration",
        return_value=integration,
    ):
        yield integration


async def test_registers_missing_modules(
    mock_hass, mock_lovelace_resources, mock_integration_version
):
    registrar = JSModuleRegistration(mock_hass)

    result = await registrar.async_register()

    assert result is True
    assert mock_lovelace_resources.async_create_item.await_count == 2
    first_call = mock_lovelace_resources.async_create_item.await_args_list[0].args[0]
    assert first_call["res_type"] == "module"
    assert first_call["url"] == f"{URL_BASE}/pid-controller-mini.js?v=1.0.17"


async def test_updates_stale_module_version(
    mock_hass, mock_lovelace_resources, mock_integration_version
):
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


async def test_unregister_removes_only_our_resources(mock_hass, mock_lovelace_resources):
    mock_lovelace_resources.async_items.return_value = [
        {"id": "ours-mini", "url": f"{URL_BASE}/pid-controller-mini.js?v=1.0.22"},
        {"id": "foreign", "url": "/local/other-card.js"},
        {"id": "ours-popup", "url": f"{URL_BASE}/pid-controller-popup.js?v=1.0.22"},
    ]
    mock_lovelace_resources.async_delete_item = AsyncMock()

    await async_unregister_frontend(mock_hass)

    assert mock_lovelace_resources.async_delete_item.await_count == 2
    deleted_ids = {
        call.args[0] for call in mock_lovelace_resources.async_delete_item.await_args_list
    }
    assert deleted_ids == {"ours-mini", "ours-popup"}


async def test_unregister_skips_yaml_mode(mock_hass, mock_lovelace_resources):
    mock_hass.data["lovelace"].mode = "yaml"
    mock_lovelace_resources.async_delete_item = AsyncMock()

    await async_unregister_frontend(mock_hass)

    mock_lovelace_resources.async_delete_item.assert_not_called()


async def test_unregister_noop_when_lovelace_missing():
    hass = MagicMock()
    hass.data = {}

    await async_unregister_frontend(hass)


async def test_unregister_logs_delete_failure(mock_hass, mock_lovelace_resources):
    mock_lovelace_resources.async_items.return_value = [
        {"id": "ours-mini", "url": f"{URL_BASE}/pid-controller-mini.js?v=1.0.22"},
    ]
    mock_lovelace_resources.async_delete_item = AsyncMock(side_effect=RuntimeError("boom"))

    await async_unregister_frontend(mock_hass)

    mock_lovelace_resources.async_delete_item.assert_awaited_once_with("ours-mini")
