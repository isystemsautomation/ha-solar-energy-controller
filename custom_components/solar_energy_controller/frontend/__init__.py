"""Lovelace JavaScript module registration for Solar Energy Controller."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import async_call_later
from homeassistant.loader import async_get_loaded_integration

from ..const import DOMAIN

_LOGGER = logging.getLogger(__name__)

URL_BASE = f"/{DOMAIN}/frontend"
JSMODULES = (
    {"name": "PID Controller Mini", "filename": "pid-controller-mini.js"},
    {"name": "PID Controller Popup", "filename": "pid-controller-popup.js"},
)

_REGISTER_LOCK = asyncio.Lock()
_MAX_ATTEMPTS = 30


def _get_lovelace(hass: HomeAssistant) -> Any | None:
    return hass.data.get("lovelace") or getattr(hass, "lovelace", None)


def _url_path(url: str) -> str:
    return url.split("?", 1)[0]


def _url_version(url: str) -> str:
    if "?v=" not in url:
        return ""
    return url.split("?v=", 1)[1]


class JSModuleRegistration:
    """Register dashboard card scripts in Lovelace storage resources."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._version = ""

    async def async_register(self) -> bool:
        """Ensure both card modules are present in Lovelace resources."""
        async with _REGISTER_LOCK:
            integration = async_get_loaded_integration(self.hass, DOMAIN)
            self._version = integration.version
            return await self._async_register_with_retries()

    async def _async_register_with_retries(self, attempt: int = 0) -> bool:
        lovelace = _get_lovelace(self.hass)
        if lovelace is None:
            if attempt >= _MAX_ATTEMPTS:
                _LOGGER.error(
                    "Lovelace is unavailable; PID card scripts were not registered"
                )
                return False
            _schedule_retry(self.hass, attempt + 1)
            return False

        mode = getattr(lovelace, "mode", getattr(lovelace, "resource_mode", "yaml"))
        if mode != "storage":
            _LOGGER.info(
                "Lovelace is in %s mode; automatic card registration is not supported",
                mode,
            )
            return False

        resources_api = lovelace.resources
        if not getattr(resources_api, "loaded", False):
            try:
                await resources_api.async_load()
            except (OSError, RuntimeError, AttributeError, TypeError, ValueError) as err:
                _LOGGER.debug("Could not load Lovelace resources collection: %s", err)

        if not getattr(resources_api, "loaded", False):
            if attempt >= _MAX_ATTEMPTS:
                _LOGGER.error(
                    "Lovelace resources collection did not load; PID card scripts were not registered"
                )
                return False
            _schedule_retry(self.hass, attempt + 1)
            return False

        existing = [
            item
            for item in resources_api.async_items()
            if isinstance(item, dict) and item.get("url", "").startswith(URL_BASE)
        ]

        registered = 0
        updated = 0
        for module in JSMODULES:
            url = f"{URL_BASE}/{module['filename']}"
            target_url = f"{url}?v={self._version}"
            matched = next(
                (resource for resource in existing if _url_path(resource["url"]) == url),
                None,
            )

            if matched is None:
                try:
                    await resources_api.async_create_item(
                        {"res_type": "module", "url": target_url}
                    )
                    registered += 1
                    _LOGGER.info(
                        "Registered Lovelace resource %s v%s",
                        module["name"],
                        self._version,
                    )
                except (OSError, RuntimeError, AttributeError, TypeError, ValueError) as err:
                    _LOGGER.warning(
                        "Failed to register Lovelace resource %s: %s", target_url, err
                    )
                continue

            if _url_version(matched["url"]) != self._version:
                try:
                    await resources_api.async_update_item(
                        matched["id"],
                        {"res_type": "module", "url": target_url},
                    )
                    updated += 1
                    _LOGGER.info(
                        "Updated Lovelace resource %s to v%s",
                        module["name"],
                        self._version,
                    )
                except (OSError, RuntimeError, AttributeError, TypeError, ValueError) as err:
                    _LOGGER.warning(
                        "Failed to update Lovelace resource %s: %s", target_url, err
                    )

        if registered or updated:
            _LOGGER.info(
                "Solar Energy Controller Lovelace resources ready "
                "(registered=%d, updated=%d, version=%s)",
                registered,
                updated,
                self._version,
            )
            return True

        if self._resources_complete(existing):
            _LOGGER.debug(
                "Solar Energy Controller Lovelace resources already present (v%s)",
                self._version,
            )
            return True

        if attempt >= _MAX_ATTEMPTS:
            _LOGGER.error(
                "PID card scripts are still missing from Lovelace resources after retries"
            )
            return False

        _schedule_retry(self.hass, attempt + 1)
        return False

    def _resources_complete(self, existing: list[dict[str, Any]]) -> bool:
        paths = {_url_path(item["url"]) for item in existing}
        required = {f"{URL_BASE}/{module['filename']}" for module in JSMODULES}
        if paths != required:
            return False
        return all(_url_version(item["url"]) == self._version for item in existing)


def _schedule_retry(hass: HomeAssistant, attempt: int) -> None:
    _LOGGER.debug(
        "Retrying Lovelace resource registration for %s (attempt %d/%d)",
        DOMAIN,
        attempt,
        _MAX_ATTEMPTS,
    )

    async def _retry(_now: Any) -> None:
        await JSModuleRegistration(hass).async_register()

    async_call_later(hass, 5, _retry)


async def async_register_frontend(hass: HomeAssistant) -> None:
    """Register card JavaScript after Home Assistant is ready."""
    await JSModuleRegistration(hass).async_register()


async def async_unregister_frontend(hass: HomeAssistant) -> None:
    """Remove our Lovelace resources when the last config entry is gone."""
    lovelace = _get_lovelace(hass)
    if lovelace is None:
        return

    mode = getattr(lovelace, "mode", getattr(lovelace, "resource_mode", "yaml"))
    if mode != "storage":
        return

    resources_api = lovelace.resources
    ours = [
        item
        for item in resources_api.async_items()
        if isinstance(item, dict) and item.get("url", "").startswith(URL_BASE)
    ]
    for item in ours:
        try:
            await resources_api.async_delete_item(item["id"])
            _LOGGER.info("Removed Lovelace resource %s", item["url"])
        except (
            OSError,
            RuntimeError,
            AttributeError,
            TypeError,
            ValueError,
            KeyError,
            HomeAssistantError,
        ) as err:
            _LOGGER.warning("Failed to remove Lovelace resource %s: %s", item["url"], err)
