from __future__ import annotations

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DEFAULT_NAME, DOMAIN


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(
        [
            SolarEnergyFlowOutputSensor(coordinator, entry),
            SolarEnergyFlowErrorSensor(coordinator, entry),
            SolarEnergyFlowStatusSensor(coordinator, entry),
        ]
    )


class _BaseFlowSensor(CoordinatorEntity, SensorEntity):
    def __init__(self, coordinator, entry: ConfigEntry, name: str, unique_suffix: str) -> None:
        super().__init__(coordinator)
        self._entry = entry
        self._attr_name = name
        self._attr_unique_id = f"{DOMAIN}_{entry.entry_id}_{unique_suffix}"

    @property
    def device_info(self) -> DeviceInfo:
        return DeviceInfo(
            identifiers={(DOMAIN, self._entry.entry_id)},
            name=self._entry.title or DEFAULT_NAME,
            entry_type=DeviceEntryType.SERVICE,
        )


class SolarEnergyFlowOutputSensor(_BaseFlowSensor):
    _attr_icon = "mdi:tune-vertical"

    def __init__(self, coordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry, "Solar Energy Flow Output", "output")

    @property
    def native_value(self):
        return self.coordinator.data.out


class SolarEnergyFlowErrorSensor(_BaseFlowSensor):
    _attr_icon = "mdi:delta"

    def __init__(self, coordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry, "Solar Energy Flow Error", "error")

    @property
    def native_value(self):
        return self.coordinator.data.error


class SolarEnergyFlowStatusSensor(_BaseFlowSensor):
    _attr_icon = "mdi:information-outline"

    def __init__(self, coordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry, "Solar Energy Flow Status", "status")

    @property
    def native_value(self):
        return self.coordinator.data.status
