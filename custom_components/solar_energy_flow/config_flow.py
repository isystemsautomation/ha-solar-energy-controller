from __future__ import annotations

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback

from .const import (
    DOMAIN,
    CONF_PROCESS_VALUE_ENTITY,
    CONF_SETPOINT_ENTITY,
    CONF_OUTPUT_ENTITY,
)
from .options_flow import SolarEnergyFlowOptionsFlow


class SolarEnergyFlowConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(
                title="Solar Energy Flow Controller",
                data=user_input,
            )

        schema = vol.Schema(
            {
                vol.Required(CONF_PROCESS_VALUE_ENTITY): str,
                vol.Required(CONF_SETPOINT_ENTITY): str,
                vol.Required(CONF_OUTPUT_ENTITY): str,
            }
        )

        return self.async_show_form(step_id="user", data_schema=schema)

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return SolarEnergyFlowOptionsFlow(config_entry)
