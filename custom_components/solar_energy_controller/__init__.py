from __future__ import annotations

import logging
import os
from typing import Any

from homeassistant.config_entries import ConfigEntry, ConfigEntryError, ConfigEntryNotReady
from homeassistant.core import CoreState, HomeAssistant, Event, callback
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device_registry import DeviceEntryType
from homeassistant.helpers.event import async_call_later
from homeassistant.components.http import StaticPathConfig

from .const import DOMAIN, PLATFORMS
from .coordinator import SolarEnergyFlowCoordinator

_LOGGER = logging.getLogger(__name__)

type SolarEnergyControllerConfigEntry = ConfigEntry[SolarEnergyFlowCoordinator]

_LOVELACE_RESOURCE_URLS = (
    f"/{DOMAIN}/frontend/pid-controller-mini.js",
    f"/{DOMAIN}/frontend/pid-controller-popup.js",
)
_MAX_RESOURCE_REGISTER_ATTEMPTS = 24


def _get_integration_version() -> str:
    version = "1.0.13"
    try:
        import json

        manifest_path = os.path.join(os.path.dirname(__file__), "manifest.json")
        if os.path.exists(manifest_path):
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            version = manifest.get("version", version)
    except Exception:
        pass
    return version


def _get_lovelace(hass: HomeAssistant) -> Any | None:
    if "lovelace" in hass.data:
        return hass.data["lovelace"]
    return getattr(hass, "lovelace", None)


async def _async_register_lovelace_resources(
    hass: HomeAssistant, *, attempt: int = 0
) -> None:
    """Register custom-card JS modules in Lovelace (storage mode)."""
    version = _get_integration_version()
    resources = [
        {
            "url": f"{url}?v={version}",
            "res_type": "module",
        }
        for url in _LOVELACE_RESOURCE_URLS
    ]

    lovelace_obj = _get_lovelace(hass)
    if not lovelace_obj:
        if attempt < _MAX_RESOURCE_REGISTER_ATTEMPTS:
            _LOGGER.debug(
                "Lovelace not ready yet for %s (attempt %d/%d)",
                DOMAIN,
                attempt + 1,
                _MAX_RESOURCE_REGISTER_ATTEMPTS,
            )
            async_call_later(
                hass,
                5,
                lambda _now: hass.async_create_task(
                    _async_register_lovelace_resources(hass, attempt=attempt + 1)
                ),
            )
            return
        _LOGGER.warning(
            "Lovelace not available after retries. Add resources manually: "
            "Settings → Dashboards → Resources. URLs: %s",
            [r["url"] for r in resources],
        )
        return

    lovelace_mode = getattr(lovelace_obj, "mode", None)
    if lovelace_mode != "storage":
        _LOGGER.info(
            "Lovelace is in %s mode. Auto-registration only works in storage mode. "
            "Add resources manually: %s",
            lovelace_mode,
            [r["url"] for r in resources],
        )
        return

    resources_api = lovelace_obj.resources
    if not getattr(resources_api, "loaded", False):
        if attempt < _MAX_RESOURCE_REGISTER_ATTEMPTS:
            _LOGGER.debug(
                "Lovelace resources collection not loaded yet for %s (attempt %d/%d)",
                DOMAIN,
                attempt + 1,
                _MAX_RESOURCE_REGISTER_ATTEMPTS,
            )
            async_call_later(
                hass,
                5,
                lambda _now: hass.async_create_task(
                    _async_register_lovelace_resources(hass, attempt=attempt + 1)
                ),
            )
            return
        _LOGGER.warning(
            "Lovelace resources collection never loaded. Add resources manually: %s",
            [r["url"] for r in resources],
        )
        return

    existing_resources: list[str] = []
    try:
        existing_resources = [
            item.get("url", "") if isinstance(item, dict) else str(item)
            for item in resources_api.async_items()
            if item
        ]
    except Exception as err:
        _LOGGER.warning("Could not read Lovelace resources: %s", err)
        return

    registered_count = 0
    for resource in resources:
        resource_url = resource["url"]
        url_base = resource_url.split("?")[0]
        if any(url_base in existing for existing in existing_resources):
            _LOGGER.debug("Lovelace resource already exists: %s", url_base)
            continue

        try:
            await resources_api.async_create_item(
                {"url": resource_url, "res_type": resource["res_type"]}
            )
            _LOGGER.info(
                "Registered Lovelace resource: %s (%s)",
                resource_url,
                resource["res_type"],
            )
            registered_count += 1
        except Exception as err:
            _LOGGER.warning(
                "Failed to register Lovelace resource %s: %s", resource_url, err
            )

    if registered_count:
        _LOGGER.info(
            "Registered %d Lovelace resource(s) for %s", registered_count, DOMAIN
        )


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    _LOGGER.info("Solar Energy Controller: Initializing integration")

    frontend_path = os.path.join(os.path.dirname(__file__), "frontend")
    if os.path.isdir(frontend_path):
        await hass.http.async_register_static_paths([
            StaticPathConfig(
                url_path=f"/{DOMAIN}/frontend",
                path=frontend_path,
                cache_headers=False,
            )
        ])
        _LOGGER.info(
            "Solar Energy Controller: Registered static path: /%s/frontend -> %s",
            DOMAIN,
            frontend_path,
        )
    else:
        _LOGGER.warning(
            "Solar Energy Controller: Frontend directory not found: %s", frontend_path
        )

    async def register_resources_on_start(_event: Event) -> None:
        await _async_register_lovelace_resources(hass)

    hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, register_resources_on_start)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: SolarEnergyControllerConfigEntry) -> bool:
    """Set up Solar Energy Controller from a config entry."""
    from .const import (
        CONF_PROCESS_VALUE_ENTITY,
        CONF_SETPOINT_ENTITY,
        CONF_OUTPUT_ENTITY,
        CONF_GRID_POWER_ENTITY,
    )

    entity_registry = er.async_get(hass)

    # Validate configured entities exist in the registry. Do not block setup when
    # upstream integrations (for example an inverter) are still starting and report
    # unavailable — the coordinator already runs in missing_input until data arrives.
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

    tracked_entities = {entity_id for entity_id in required_entities.values() if entity_id}

    @callback
    def _handle_entity_state_change(event: Event) -> None:
        entity_id = event.data.get("entity_id")
        if entity_id not in tracked_entities:
            return
        new_state = event.data.get("new_state")
        if new_state is None or new_state.state in ("unavailable", "unknown"):
            return
        hass.async_create_task(coordinator.async_request_refresh())

    entry.async_on_unload(hass.bus.async_listen("state_changed", _handle_entity_state_change))

    try:
        await coordinator.async_config_entry_first_refresh()
    except Exception as err:
        raise ConfigEntryNotReady(f"Failed to initialize coordinator: {err}") from err

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_update_listener))

    if hass.state == CoreState.running:
        hass.async_create_task(_async_register_lovelace_resources(hass))

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
