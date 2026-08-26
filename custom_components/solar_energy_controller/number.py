from __future__ import annotations

from homeassistant.components.number import NumberEntity, NumberMode
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity import EntityCategory
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import (
    CONF_ENABLED,
    CONF_KD,
    CONF_KI,
    CONF_KP,
    CONF_MAX_OUTPUT,
    CONF_MIN_OUTPUT,
    CONF_GRID_LIMITER_LIMIT_W,
    CONF_GRID_LIMITER_DEADBAND_W,
    CONF_PID_DEADBAND,
    CONF_RATE_LIMIT,
    CONF_RUNTIME_MODE,
    CONF_MANUAL_SP_VALUE,
    CONF_MANUAL_OUT_VALUE,
    CONF_MAX_OUTPUT_STEP,
    CONF_OUTPUT_EPSILON,
    DEFAULT_ENABLED,
    DEFAULT_KD,
    DEFAULT_KI,
    DEFAULT_KP,
    DEFAULT_MAX_OUTPUT,
    DEFAULT_MIN_OUTPUT,
    DEFAULT_GRID_LIMITER_LIMIT_W,
    DEFAULT_GRID_LIMITER_DEADBAND_W,
    DEFAULT_PID_DEADBAND,
    DEFAULT_RATE_LIMIT,
    DEFAULT_MANUAL_SP_VALUE,
    DEFAULT_MANUAL_OUT_VALUE,
    DEFAULT_MAX_OUTPUT_STEP,
    DEFAULT_OUTPUT_EPSILON,
    DOMAIN,
    RUNTIME_MODE_MANUAL_OUT,
    RUNTIME_MODE_MANUAL_SP,
)
from .coordinator import SolarEnergyFlowCoordinator

type SolarEnergyControllerConfigEntry = ConfigEntry[SolarEnergyFlowCoordinator]

# Coordinator is used to centralize the data updates
# Action calls update Home Assistant config entries, no need to limit parallel updates
PARALLEL_UPDATES = 0


async def async_setup_entry(hass: HomeAssistant, entry: SolarEnergyControllerConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    coordinator = entry.runtime_data

    entities: list[NumberEntity] = [
        SolarEnergyFlowNumber(
            coordinator,
            entry,
            CONF_KP,
            "Kp",
            DEFAULT_KP,
            0.001,
            0.0,
            1000.0,
            EntityCategory.CONFIG,
        ),
        SolarEnergyFlowNumber(
            coordinator,
            entry,
            CONF_KI,
            "Ki",
            DEFAULT_KI,
            0.001,
            0.0,
            1000.0,
            EntityCategory.CONFIG,
        ),
        SolarEnergyFlowNumber(
            coordinator,
            entry,
            CONF_KD,
            "Kd",
            DEFAULT_KD,
            0.001,
            0.0,
            1000.0,
            EntityCategory.CONFIG,
        ),
        SolarEnergyFlowNumber(
            coordinator,
            entry,
            CONF_MIN_OUTPUT,
            "Min output",
            DEFAULT_MIN_OUTPUT,
            1.0,
            -20000.0,
            20000.0,
            EntityCategory.CONFIG,
        ),
        SolarEnergyFlowNumber(
            coordinator,
            entry,
            CONF_MAX_OUTPUT,
            "Max output",
            DEFAULT_MAX_OUTPUT,
            1.0,
            -20000.0,
            20000.0,
            EntityCategory.CONFIG,
        ),
        SolarEnergyFlowNumber(
            coordinator,
            entry,
            CONF_GRID_LIMITER_LIMIT_W,
            "Grid limiter limit",
            DEFAULT_GRID_LIMITER_LIMIT_W,
            10.0,
            0.0,
            20000.0,
            EntityCategory.CONFIG,
        ),
        SolarEnergyFlowNumber(
            coordinator,
            entry,
            CONF_GRID_LIMITER_DEADBAND_W,
            "Grid limiter deadband",
            DEFAULT_GRID_LIMITER_DEADBAND_W,
            10.0,
            0.0,
            20000.0,
            EntityCategory.CONFIG,
        ),
        SolarEnergyFlowNumber(
            coordinator,
            entry,
            CONF_PID_DEADBAND,
            "PID deadband",
            DEFAULT_PID_DEADBAND,
            1.0,
            0.0,
            2000.0,
            None,
        ),
        SolarEnergyFlowNumber(
            coordinator,
            entry,
            CONF_RATE_LIMIT,
            "Rate limit",
            DEFAULT_RATE_LIMIT,
            0.1,
            0.0,
            10000.0,
            EntityCategory.CONFIG,
            translation_key="solar_energy_controller_rate_limit",
        ),
        SolarEnergyFlowManualNumber(
            coordinator,
            entry,
            CONF_MANUAL_SP_VALUE,
            DEFAULT_MANUAL_SP_VALUE,
            1.0,
            -20000.0,
            20000.0,
            translation_key="solar_energy_controller_manual_sp_value",
        ),
        SolarEnergyFlowManualNumber(
            coordinator,
            entry,
            CONF_MANUAL_OUT_VALUE,
            DEFAULT_MANUAL_OUT_VALUE,
            1.0,
            -20000.0,
            20000.0,
            translation_key="solar_energy_controller_manual_out_value",
        ),
        SolarEnergyFlowNumber(
            coordinator,
            entry,
            CONF_MAX_OUTPUT_STEP,
            "Max output step",
            DEFAULT_MAX_OUTPUT_STEP,
            1.0,
            0.0,
            20000.0,
            EntityCategory.CONFIG,
            translation_key="solar_energy_controller_max_output_step",
        ),
        SolarEnergyFlowNumber(
            coordinator,
            entry,
            CONF_OUTPUT_EPSILON,
            "Output epsilon",
            DEFAULT_OUTPUT_EPSILON,
            0.1,
            0.0,
            20000.0,
            EntityCategory.CONFIG,
            translation_key="solar_energy_controller_output_epsilon",
        ),
    ]

    async_add_entities(entities)


class SolarEnergyFlowNumber(CoordinatorEntity, NumberEntity):
    _attr_has_entity_name = True
    _attr_mode = NumberMode.BOX

    def __init__(
        self,
        coordinator: SolarEnergyFlowCoordinator,
        entry: ConfigEntry,
        option_key: str,
        name: str,
        default: float,
        step: float,
        min_value: float | None,
        max_value: float | None,
        entity_category: EntityCategory | None,
        native_unit: str | None = None,
        translation_key: str | None = None,
    ) -> None:
        super().__init__(coordinator)
        self._entry = entry
        self._option_key = option_key
        self._default = default
        self._display_name = name
        if translation_key:
            self._attr_translation_key = translation_key
        else:
            self._attr_name = name
        self._attr_unique_id = f"{DOMAIN}_{entry.entry_id}_{option_key}"
        self._attr_native_step = step
        self._attr_native_min_value = min_value
        self._attr_native_max_value = max_value
        self._attr_entity_category = entity_category
        self._attr_native_unit_of_measurement = native_unit
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=entry.title,
            manufacturer="HomeMaster",
            model="PID Controller",
            entry_type=DeviceEntryType.SERVICE,
        )

    @property
    def native_value(self) -> float:
        try:
            return float(self._entry.options.get(self._option_key, self._default))
        except (TypeError, ValueError):
            return self._default

    async def async_set_native_value(self, value: float) -> None:
        if self._option_key == CONF_MIN_OUTPUT:
            min_output = float(value)
            max_output = float(self._entry.options.get(CONF_MAX_OUTPUT, DEFAULT_MAX_OUTPUT))
        elif self._option_key == CONF_MAX_OUTPUT:
            min_output = float(self._entry.options.get(CONF_MIN_OUTPUT, DEFAULT_MIN_OUTPUT))
            max_output = float(value)
        else:
            min_output = max_output = None

        if (
            min_output is not None
            and max_output is not None
            and max_output <= min_output
        ):
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="invalid_output_range",
                translation_placeholders={
                    "min_output": str(min_output),
                    "max_output": str(max_output),
                },
            )

        try:
            options = dict(self._entry.options)

            # Keep existing values intact if they were never set before.
            options.setdefault(CONF_ENABLED, DEFAULT_ENABLED)
            options.setdefault(CONF_KP, DEFAULT_KP)
            options.setdefault(CONF_KI, DEFAULT_KI)
            options.setdefault(CONF_KD, DEFAULT_KD)
            options.setdefault(CONF_MIN_OUTPUT, DEFAULT_MIN_OUTPUT)
            options.setdefault(CONF_MAX_OUTPUT, DEFAULT_MAX_OUTPUT)
            options.setdefault(CONF_GRID_LIMITER_LIMIT_W, DEFAULT_GRID_LIMITER_LIMIT_W)
            options.setdefault(CONF_GRID_LIMITER_DEADBAND_W, DEFAULT_GRID_LIMITER_DEADBAND_W)
            options.setdefault(CONF_PID_DEADBAND, DEFAULT_PID_DEADBAND)
            options.setdefault(CONF_RATE_LIMIT, DEFAULT_RATE_LIMIT)
            options.setdefault(CONF_MAX_OUTPUT_STEP, DEFAULT_MAX_OUTPUT_STEP)
            options.setdefault(CONF_OUTPUT_EPSILON, DEFAULT_OUTPUT_EPSILON)

            options[self._option_key] = value

            self.coordinator.apply_options(options)
            self.hass.config_entries.async_update_entry(self._entry, options=options)
            await self.coordinator.async_request_refresh()
        except (ValueError, TypeError, KeyError, HomeAssistantError) as err:
            raise HomeAssistantError(
                translation_domain=DOMAIN,
                translation_key="number_failed_set_value",
                translation_placeholders={"name": self._display_name},
            ) from err


class SolarEnergyFlowManualNumber(CoordinatorEntity, NumberEntity):
    _attr_has_entity_name = True
    _attr_mode = NumberMode.BOX

    def __init__(
        self,
        coordinator: SolarEnergyFlowCoordinator,
        entry: ConfigEntry,
        option_key: str,
        default: float,
        step: float,
        min_value: float | None,
        max_value: float | None,
        translation_key: str,
    ) -> None:
        super().__init__(coordinator)
        self._entry = entry
        self._option_key = option_key
        self._default = default
        self._display_name = "Manual SP" if option_key == CONF_MANUAL_SP_VALUE else "Manual OUT"
        self._attr_translation_key = translation_key
        self._attr_unique_id = f"{DOMAIN}_{entry.entry_id}_{option_key}"
        self._attr_native_step = step
        self._attr_native_min_value = min_value
        self._attr_native_max_value = max_value
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=entry.title,
            manufacturer="HomeMaster",
            model="PID Controller",
            entry_type=DeviceEntryType.SERVICE,
        )

    @property
    def native_value(self) -> float:
        data = getattr(self.coordinator, "data", None)
        if data is not None:
            if self._option_key == CONF_MANUAL_SP_VALUE:
                display_value = getattr(data, "manual_sp_display_value", None)
                if display_value is not None:
                    return round(display_value, 1)
                raw_value = getattr(data, "manual_sp_value", None)
                if raw_value is not None:
                    return round(raw_value, 1)
            elif self._option_key == CONF_MANUAL_OUT_VALUE:
                display_value = getattr(data, "manual_out_display_value", None)
                if display_value is not None:
                    return round(display_value, 1)
                raw_value = getattr(data, "manual_out_value", None)
                if raw_value is not None:
                    return round(raw_value, 1)
        try:
            return round(float(self._entry.options.get(self._option_key, self._default)), 1)
        except (TypeError, ValueError):
            return round(self._default, 1)

    def _runtime_mode(self) -> str:
        return self.coordinator.get_runtime_mode()

    async def async_set_native_value(self, value: float) -> None:
        runtime_mode = self._runtime_mode()
        allowed = False
        if self._option_key == CONF_MANUAL_SP_VALUE:
            allowed = runtime_mode == RUNTIME_MODE_MANUAL_SP
        elif self._option_key == CONF_MANUAL_OUT_VALUE:
            allowed = runtime_mode == RUNTIME_MODE_MANUAL_OUT

        if not allowed:
            mode_name = "Manual SP" if self._option_key == CONF_MANUAL_SP_VALUE else "Manual OUT"
            required_mode = RUNTIME_MODE_MANUAL_SP if self._option_key == CONF_MANUAL_SP_VALUE else RUNTIME_MODE_MANUAL_OUT
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="manual_value_wrong_mode",
                translation_placeholders={
                    "name": mode_name,
                    "runtime_mode": runtime_mode,
                    "required_mode": required_mode,
                },
            )

        try:
            options = dict(self._entry.options)

            options.setdefault(CONF_ENABLED, DEFAULT_ENABLED)
            options.setdefault(CONF_RUNTIME_MODE, runtime_mode)
            options.setdefault(CONF_MANUAL_SP_VALUE, self.coordinator.get_manual_sp_value())
            options.setdefault(CONF_MANUAL_OUT_VALUE, self.coordinator.get_manual_out_value())
            options[self._option_key] = value

            # Always save the value - it will be used when the mode is switched
            if self._option_key == CONF_MANUAL_SP_VALUE:
                await self.coordinator.async_set_manual_sp(value)
            else:
                await self.coordinator.async_set_manual_out(value)

            self.coordinator.apply_options(options)
            self.hass.config_entries.async_update_entry(self._entry, options=options)
            await self.coordinator.async_request_refresh()
        except (ValueError, TypeError, KeyError, HomeAssistantError) as err:
            raise HomeAssistantError(
                translation_domain=DOMAIN,
                translation_key="number_failed_set_value",
                translation_placeholders={"name": self._display_name},
            ) from err
