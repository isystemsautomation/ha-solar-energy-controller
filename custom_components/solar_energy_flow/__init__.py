from __future__ import annotations

import logging
import os

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, Event
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.helpers import device_registry as dr
from homeassistant.components import lovelace

from .const import DOMAIN, PLATFORMS
from .coordinator import SolarEnergyFlowCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up via YAML (not supported) or allow config flow to run."""
    # Register static path for frontend resources
    frontend_path = os.path.join(os.path.dirname(__file__), "frontend")
    if os.path.isdir(frontend_path):
        hass.http.register_static_path(
            f"/{DOMAIN}/frontend", frontend_path, cache_headers=False
        )

    # Auto-register Lovelace resources on HA start
    async def register_resources(_event: Event) -> None:
        """Register custom card resources automatically."""
        # Get version from manifest
        version = "0.1.2"
        try:
            import json
            manifest_path = os.path.join(os.path.dirname(__file__), "manifest.json")
            if os.path.exists(manifest_path):
                with open(manifest_path, "r", encoding="utf-8") as f:
                    manifest = json.load(f)
                    version = manifest.get("version", version)
        except Exception:
            pass

        resources = [
            {
                "url": f"/{DOMAIN}/frontend/pid-controller-mini.js?v={version}",
                "type": "module",
            },
            {
                "url": f"/{DOMAIN}/frontend/pid-controller-popup.js?v={version}",
                "type": "module",
            },
        ]

        # Check if Lovelace resources component is available
        if not hasattr(lovelace, "resources") or not hasattr(
            lovelace.resources, "async_create_item"
        ):
            _LOGGER.warning(
                "Lovelace resources API not available. Cards must be added manually via Settings → Dashboards → Resources"
            )
            return

        # Get existing resources to avoid duplicates
        existing_resources = []
        try:
            existing_resources_list = await lovelace.resources.async_get_info(hass)
            existing_resources = [
                item.get("url", "") for item in existing_resources_list if item
            ]
        except Exception:
            pass

        # Register resources if not already present
        for resource in resources:
            if resource["url"] in existing_resources:
                _LOGGER.debug(
                    "Lovelace resource already exists: %s", resource["url"]
                )
                continue

            try:
                await lovelace.resources.async_create_item(
                    hass, {"url": resource["url"], "type": resource["type"]}
                )
                _LOGGER.info(
                    "Registered Lovelace resource: %s (%s)", resource["url"], resource["type"]
                )
            except Exception as err:
                _LOGGER.warning(
                    "Failed to register Lovelace resource %s: %s", resource["url"], err
                )

    hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, register_resources)

    # No YAML configuration is supported; return True so the config flow can be used.
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    coordinator = SolarEnergyFlowCoordinator(hass, entry)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = coordinator

    device_registry = dr.async_get(hass)
    device_registry.async_get_or_create(
        config_entry_id=entry.entry_id,
        identifiers={(DOMAIN, entry.entry_id)},
        name=entry.title,
        manufacturer="Solar Energy Flow",
        model="PID Controller",
    )

    await coordinator.async_config_entry_first_refresh()

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_update_listener))
    return True


async def _update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    coordinator: SolarEnergyFlowCoordinator = hass.data[DOMAIN][entry.entry_id]
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


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unload_ok
