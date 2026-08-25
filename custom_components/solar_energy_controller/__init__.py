from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigEntryError,
    ConfigEntryNotReady,
)
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import CoreState, Event, HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device_registry import DeviceEntryType
from homeassistant.helpers.event import async_track_state_change_event

from .const import DOMAIN, PLATFORMS
from .coordinator import SolarEnergyFlowCoordinator
from .frontend import async_register_frontend

_LOGGER = logging.getLogger(__name__)

type SolarEnergyControllerConfigEntry = ConfigEntry[SolarEnergyFlowCoordinator]

_FRONTEND_PATH = Path(__file__).parent / "frontend"


async def _async_setup_frontend(hass: HomeAssistant) -> None:
    if await hass.async_add_executor_job(_FRONTEND_PATH.is_dir):
        await hass.http.async_register_static_paths([
            StaticPathConfig(
                url_path=f"/{DOMAIN}/frontend",
                path=_FRONTEND_PATH,
                cache_headers=False,
            )
        ])
        _LOGGER.info(
            "Solar Energy Controller: Registered static path /%s/frontend",
            DOMAIN,
        )
    else:
        _LOGGER.warning(
            "Solar Energy Controller: Frontend directory not found: %s", _FRONTEND_PATH
        )

    await async_register_frontend(hass)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    _LOGGER.info("Solar Energy Controller: Initializing integration")

    async def register_on_start(_event: Event) -> None:
        await _async_setup_frontend(hass)

    if hass.state == CoreState.running:
        hass.async_create_task(_async_setup_frontend(hass))
    else:
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, register_on_start)

    return True


async def async_setup_entry(hass: HomeAssistant, entry: SolarEnergyControllerConfigEntry) -> bool:
    """Set up Solar Energy Controller from a config entry."""
    from .const import (
        CONF_GRID_POWER_ENTITY,
        CONF_OUTPUT_ENTITY,
        CONF_PROCESS_VALUE_ENTITY,
        CONF_SETPOINT_ENTITY,
    )

    entity_registry = er.async_get(hass)

    required_entities = {
        CONF_PROCESS_VALUE_ENTITY: entry.options.get(CONF_PROCESS_VALUE_ENTITY) or entry.data.get(CONF_PROCESS_VALUE_ENTITY),
        CONF_SETPOINT_ENTITY: entry.options.get(CONF_SETPOINT_ENTITY) or entry.data.get(CONF_SETPOINT_ENTITY),
        CONF_OUTPUT_ENTITY: entry.options.get(CONF_OUTPUT_ENTITY) or entry.data.get(CONF_OUTPUT_ENTITY),
        CONF_GRID_POWER_ENTITY: entry.options.get(CONF_GRID_POWER_ENTITY) or entry.data.get(CONF_GRID_POWER_ENTITY),
    }

    missing_entities = []
    waiting_entities: list[str] = []

    for key, entity_id in required_entities.items():
        if not entity_id:
            missing_entities.append(key)
            continue

        if entity_registry.async_get(entity_id) is None:
            missing_entities.append(key)
            continue

        state = hass.states.get(entity_id)
        if state is None or state.state in ("unavailable", "unknown"):
            waiting_entities.append(entity_id)

    if missing_entities:
        entity_names = {
            CONF_PROCESS_VALUE_ENTITY: "Process Value",
            CONF_SETPOINT_ENTITY: "Setpoint",
            CONF_OUTPUT_ENTITY: "Output",
            CONF_GRID_POWER_ENTITY: "Grid Power",
        }
        missing_names = [entity_names[key] for key in missing_entities]
        raise ConfigEntryError(
            f"Required entities not found: {', '.join(missing_names)}. "
            "Please check your configuration and ensure all entities exist."
        )

    if waiting_entities:
        _LOGGER.info(
            "Solar Energy Controller %s starting while upstream entities are not ready yet: %s",
            entry.title,
            ", ".join(waiting_entities),
        )

    coordinator = SolarEnergyFlowCoordinator(hass, entry)
    entry.runtime_data = coordinator

    device_registry = dr.async_get(hass)
    device_registry.async_get_or_create(
        config_entry_id=entry.entry_id,
        identifiers={(DOMAIN, entry.entry_id)},
        name=entry.title,
        manufacturer="HomeMaster",
        model="PID Controller",
        entry_type=DeviceEntryType.SERVICE,
    )

    tracked_entities = tuple(
        entity_id for entity_id in required_entities.values() if entity_id
    )

    @callback
    def _handle_entity_state_change(event: Event) -> None:
        new_state = event.data.get("new_state")
        if new_state is None or new_state.state in ("unavailable", "unknown"):
            return
        hass.async_create_task(coordinator.async_request_refresh())

    if tracked_entities:
        entry.async_on_unload(
            async_track_state_change_event(hass, tracked_entities, _handle_entity_state_change)
        )

    try:
        await coordinator.async_config_entry_first_refresh()
    except Exception as err:
        raise ConfigEntryNotReady(f"Failed to initialize coordinator: {err}") from err

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_update_listener))

    if hass.state == CoreState.running:
        hass.async_create_task(async_register_frontend(hass))

    return True


async def _update_listener(hass: HomeAssistant, entry: SolarEnergyControllerConfigEntry) -> None:
    coordinator = entry.runtime_data
    new_options = dict(entry.options)
    old_options = coordinator.options_cache

    if old_options == new_options:
        _LOGGER.debug("Options unchanged for %s; skipping handling", entry.entry_id)
        return

    coordinator.options_cache = new_options

    if coordinator.options_require_reload(old_options, new_options):
        _LOGGER.warning("Wiring change detected for %s; reloading entry", entry.entry_id)
        await hass.config_entries.async_reload(entry.entry_id)
        return

    coordinator.apply_options(new_options)
    await coordinator.async_request_refresh()


async def async_unload_entry(hass: HomeAssistant, entry: SolarEnergyControllerConfigEntry) -> bool:
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    return unload_ok
