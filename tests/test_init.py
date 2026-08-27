"""Test the __init__ module."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigEntryError,
    ConfigEntryNotReady,
)
from homeassistant.core import CoreState, HomeAssistant

from custom_components.solar_energy_controller import (
    async_migrate_entry,
    async_remove_entry,
    async_setup,
    async_setup_entry,
    async_unload_entry,
)
from custom_components.solar_energy_controller.coordinator import SolarEnergyFlowCoordinator
from custom_components.solar_energy_controller.const import (
    CONF_GRID_POWER_ENTITY,
    CONF_OUTPUT_ENTITY,
    CONF_PROCESS_VALUE_ENTITY,
    CONF_RUNTIME_MODE,
    CONF_SETPOINT_ENTITY,
    CONFIG_ENTRY_VERSION,
    PLATFORMS,
    RUNTIME_MODE_AUTO_SP,
    RUNTIME_MODE_MANUAL_SP,
)


def _consume_async_task(coro):
    if hasattr(coro, "close"):
        coro.close()
    return MagicMock()


@pytest.fixture
def mock_hass():
    """Create a mock Home Assistant instance."""
    hass = MagicMock(spec=HomeAssistant)
    hass.states = MagicMock()
    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()
    hass.bus = MagicMock()
    hass.bus.async_listen_once = MagicMock()
    hass.config_entries = MagicMock()
    hass.config_entries.async_forward_entry_setups = AsyncMock()
    hass.config_entries.async_unload_platforms = AsyncMock(return_value=True)
    hass.state = CoreState.running
    hass.async_create_task = MagicMock(side_effect=_consume_async_task)
    hass.data = {}
    return hass


@pytest.fixture
def mock_entry():
    """Create a mock config entry."""
    entry = MagicMock(spec=ConfigEntry)
    entry.entry_id = "test_entry_123"
    entry.title = "Test Controller"
    entry.data = {
        CONF_PROCESS_VALUE_ENTITY: "sensor.pv",
        CONF_SETPOINT_ENTITY: "number.sp",
        CONF_OUTPUT_ENTITY: "number.output",
        CONF_GRID_POWER_ENTITY: "sensor.grid",
    }
    entry.options = {}
    entry.runtime_data = None
    entry.async_on_unload = MagicMock()
    entry.add_update_listener = MagicMock(return_value=MagicMock())
    return entry


async def test_async_setup(mock_hass):
    """Test async_setup function."""
    mock_hass.state = CoreState.not_running
    mock_hass.async_add_executor_job = AsyncMock(return_value=True)
    with patch(
        "custom_components.solar_energy_controller.async_register_frontend",
        new=AsyncMock(),
    ):
        result = await async_setup(mock_hass, {})

        assert result is True
        mock_hass.bus.async_listen_once.assert_called_once()


async def test_async_setup_entry_success(mock_hass, mock_entry):
    """Test successful async_setup_entry."""
    mock_hass.states.get = MagicMock(return_value=MagicMock(state="100"))
    mock_hass.bus.async_listen = MagicMock(return_value=MagicMock())
    mock_hass.async_create_task = MagicMock(side_effect=_consume_async_task)
    mock_entity_registry = MagicMock()
    mock_entity_registry.async_get = MagicMock(return_value=MagicMock(entity_id="sensor.pv"))

    with patch("custom_components.solar_energy_controller.__init__.er.async_get", return_value=mock_entity_registry):
        with patch("custom_components.solar_energy_controller.SolarEnergyFlowCoordinator") as mock_coordinator_class:
            with patch(
                "custom_components.solar_energy_controller.__init__.async_track_state_change_event",
                return_value=MagicMock(),
            ):
                mock_coordinator = MagicMock(spec=SolarEnergyFlowCoordinator)
                mock_coordinator.async_config_entry_first_refresh = AsyncMock()
                mock_coordinator_class.return_value = mock_coordinator

                with patch("custom_components.solar_energy_controller.__init__.dr.async_get") as mock_dr:
                    mock_dr_instance = MagicMock()
                    mock_dr_instance.async_get_or_create = MagicMock()
                    mock_dr.return_value = mock_dr_instance

                    result = await async_setup_entry(mock_hass, mock_entry)

                    assert result is True
                    assert mock_entry.runtime_data == mock_coordinator
                    mock_coordinator.async_config_entry_first_refresh.assert_called_once()
                    mock_hass.config_entries.async_forward_entry_setups.assert_called_once()


async def test_async_setup_entry_missing_entities(mock_hass, mock_entry):
    """Test async_setup_entry with missing entities."""
    mock_hass.states.get = MagicMock(return_value=None)
    mock_entity_registry = MagicMock()
    mock_entity_registry.async_get = MagicMock(return_value=None)
    if not hasattr(mock_hass, "data"):
        mock_hass.data = {}
    if not hasattr(mock_hass, "config"):
        mock_hass.config = MagicMock()
        mock_hass.config.config_dir = "/tmp/test_config"

    with patch("custom_components.solar_energy_controller.__init__.er.async_get", return_value=mock_entity_registry):
        with pytest.raises(ConfigEntryError, match="Required entities not found"):
            await async_setup_entry(mock_hass, mock_entry)


async def test_async_setup_entry_unavailable_entities(mock_hass, mock_entry):
    """Unavailable upstream entities must not block setup after HA restart."""
    mock_state = MagicMock()
    mock_state.state = "unavailable"
    mock_hass.states.get = MagicMock(return_value=mock_state)
    mock_hass.bus.async_listen = MagicMock(return_value=MagicMock())
    mock_hass.async_create_task = MagicMock(side_effect=_consume_async_task)
    if not hasattr(mock_hass, "data"):
        mock_hass.data = {}
    if not hasattr(mock_hass, "config"):
        mock_hass.config = MagicMock()
        mock_hass.config.config_dir = "/tmp/test_config"

    mock_entity_registry = MagicMock()
    mock_entity_registry.async_get = MagicMock(return_value=MagicMock(entity_id="sensor.pv"))

    with patch("custom_components.solar_energy_controller.__init__.er.async_get", return_value=mock_entity_registry):
        with patch("custom_components.solar_energy_controller.SolarEnergyFlowCoordinator") as mock_coordinator_class:
            with patch(
                "custom_components.solar_energy_controller.__init__.async_track_state_change_event",
                return_value=MagicMock(),
            ):
                mock_coordinator = MagicMock(spec=SolarEnergyFlowCoordinator)
                mock_coordinator.async_config_entry_first_refresh = AsyncMock()
                mock_coordinator_class.return_value = mock_coordinator

                with patch("custom_components.solar_energy_controller.__init__.dr.async_get") as mock_dr:
                    mock_dr_instance = MagicMock()
                    mock_dr_instance.async_get_or_create = MagicMock()
                    mock_dr.return_value = mock_dr_instance

                    result = await async_setup_entry(mock_hass, mock_entry)

                    assert result is True
                    mock_coordinator.async_config_entry_first_refresh.assert_called_once()
                    mock_hass.config_entries.async_forward_entry_setups.assert_called_once()


async def test_async_setup_entry_coordinator_failure(mock_hass, mock_entry):
    """Test async_setup_entry when coordinator initialization fails."""
    mock_hass.states.get = MagicMock(return_value=MagicMock(state="100"))
    mock_hass.bus.async_listen = MagicMock(return_value=MagicMock())
    mock_hass.async_create_task = MagicMock(side_effect=_consume_async_task)
    mock_entity_registry = MagicMock()
    mock_entity_registry.async_get = MagicMock(return_value=MagicMock(entity_id="sensor.pv"))

    with patch("custom_components.solar_energy_controller.__init__.er.async_get", return_value=mock_entity_registry):
        with patch("custom_components.solar_energy_controller.SolarEnergyFlowCoordinator") as mock_coordinator_class:
            with patch(
                "custom_components.solar_energy_controller.__init__.async_track_state_change_event",
                return_value=MagicMock(),
            ):
                mock_coordinator = MagicMock(spec=SolarEnergyFlowCoordinator)
                mock_coordinator.async_config_entry_first_refresh = AsyncMock(side_effect=Exception("Test error"))
                mock_coordinator_class.return_value = mock_coordinator

                with patch("custom_components.solar_energy_controller.__init__.dr.async_get"):
                    with pytest.raises(ConfigEntryNotReady, match="Failed to initialize coordinator"):
                        await async_setup_entry(mock_hass, mock_entry)


async def test_async_unload_entry(mock_hass, mock_entry):
    """Test async_unload_entry."""
    result = await async_unload_entry(mock_hass, mock_entry)
    
    assert result is True
    mock_hass.config_entries.async_unload_platforms.assert_called_once_with(mock_entry, PLATFORMS)


async def test_async_setup_frontend_path_registration(mock_hass):
    """Test that frontend static path is registered when frontend directory exists."""
    mock_hass.state = CoreState.not_running
    mock_hass.async_create_task = MagicMock(side_effect=_consume_async_task)
    mock_hass.async_add_executor_job = AsyncMock(return_value=True)
    mock_hass.http.async_register_static_paths = AsyncMock()
    with patch(
        "custom_components.solar_energy_controller.async_register_frontend",
        new=AsyncMock(),
    ):
        result = await async_setup(mock_hass, {})

        assert result is True
        mock_hass.bus.async_listen_once.assert_called_once()


async def test_async_setup_frontend_path_missing(mock_hass):
    """Test setup still schedules frontend registration when directory is missing."""
    mock_hass.state = CoreState.not_running
    mock_hass.async_add_executor_job = AsyncMock(return_value=False)
    with patch(
        "custom_components.solar_energy_controller.async_register_frontend",
        new=AsyncMock(),
    ):
        result = await async_setup(mock_hass, {})

        assert result is True
        mock_hass.bus.async_listen_once.assert_called_once()


async def test_async_migrate_entry_runtime_mode_slugs(mock_hass, mock_entry):
    """Legacy runtime mode labels are migrated to slug values."""
    mock_entry.version = 1
    mock_entry.options = {CONF_RUNTIME_MODE: "MANUAL SP"}
    mock_hass.config_entries.async_update_entry = MagicMock()

    result = await async_migrate_entry(mock_hass, mock_entry)

    assert result is True
    mock_hass.config_entries.async_update_entry.assert_called_once()
    call_kwargs = mock_hass.config_entries.async_update_entry.call_args.kwargs
    assert call_kwargs["version"] == CONFIG_ENTRY_VERSION
    assert call_kwargs["options"][CONF_RUNTIME_MODE] == RUNTIME_MODE_MANUAL_SP


async def test_async_remove_entry_skips_when_other_entries_remain(mock_hass, mock_entry):
    other_entry = MagicMock(spec=ConfigEntry)
    other_entry.entry_id = "other_entry"
    mock_hass.config_entries.async_entries = MagicMock(
        return_value=[mock_entry, other_entry]
    )

    with patch(
        "custom_components.solar_energy_controller.async_unregister_frontend",
        new_callable=AsyncMock,
    ) as mock_unregister:
        await async_remove_entry(mock_hass, mock_entry)

    mock_unregister.assert_not_awaited()


async def test_async_remove_entry_unregisters_when_last_entry(mock_hass, mock_entry):
    mock_hass.config_entries.async_entries = MagicMock(return_value=[mock_entry])

    with patch(
        "custom_components.solar_energy_controller.async_unregister_frontend",
        new_callable=AsyncMock,
    ) as mock_unregister:
        await async_remove_entry(mock_hass, mock_entry)

    mock_unregister.assert_awaited_once_with(mock_hass)

