from __future__ import annotations

import voluptuous as vol
from homeassistant import config_entries

from .const import (
    CONF_ENABLED,
    CONF_KP,
    CONF_KI,
    CONF_KD,
    CONF_MIN_OUTPUT,
    CONF_MAX_OUTPUT,
    CONF_UPDATE_INTERVAL,
    DEFAULT_ENABLED,
    DEFAULT_KP,
    DEFAULT_KI,
    DEFAULT_KD,
    DEFAULT_MIN_OUTPUT,
    DEFAULT_MAX_OUTPUT,
    DEFAULT_UPDATE_INTERVAL,
)


class SolarEnergyFlowOptionsFlowHandler(config_entries.OptionsFlow):
    """Handle options (PID tuning) via the UI."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self.config_entry = config_entry

    async def async_step_init(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        o = self.config_entry.options

        schema = vol.Schema(
            {
                vol.Optional(CONF_ENABLED, default=o.get(CONF_ENABLED, DEFAULT_ENABLED)): bool,
                vol.Optional(CONF_KP, default=o.get(CONF_KP, DEFAULT_KP)): vol.Coerce(float),
                vol.Optional(CONF_KI, default=o.get(CONF_KI, DEFAULT_KI)): vol.Coerce(float),
                vol.Optional(CONF_KD, default=o.get(CONF_KD, DEFAULT_KD)): vol.Coerce(float),
                vol.Optional(CONF_MIN_OUTPUT, default=o.get(CONF_MIN_OUTPUT, DEFAULT_MIN_OUTPUT)): vol.Coerce(float),
                vol.Optional(CONF_MAX_OUTPUT, default=o.get(CONF_MAX_OUTPUT, DEFAULT_MAX_OUTPUT)): vol.Coerce(float),
                vol.Optional(CONF_UPDATE_INTERVAL, default=o.get(CONF_UPDATE_INTERVAL, DEFAULT_UPDATE_INTERVAL)): vol.Coerce(int),
            }
        )

        return self.async_show_form(step_id="init", data_schema=schema)
