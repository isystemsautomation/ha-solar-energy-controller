"""Consumer management module for Solar Energy Flow integration.

This module provides the ConsumerManager class which handles all consumer-related
operations including state management, priority handling, and validation.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Mapping

from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers import entity_registry as er

from .const import (
    DOMAIN,
    CONSUMER_ID,
    CONSUMER_NAME,
    CONSUMER_PRIORITY,
    CONSUMER_TYPE,
    CONSUMER_TYPE_BINARY,
    CONSUMER_TYPE_CONTROLLED,
    CONSUMER_POWER_TARGET_ENTITY_ID,
    CONSUMER_STATE_ENTITY_ID,
    CONSUMER_MAX_POWER_W,
    CONSUMER_STEP_W,
    CONSUMER_PID_DEADBAND_PCT,
    CONSUMER_THRESHOLD_W,
    CONSUMER_DEFAULT_START_DELAY_S,
    CONSUMER_DEFAULT_STOP_DELAY_S,
    CONSUMER_DEFAULT_STEP_W,
    CONSUMER_DEFAULT_PID_DEADBAND_PCT,
    CONSUMER_DEFAULT_THRESHOLD_W,
)
from .helpers import (
    RUNTIME_FIELD_ENABLED,
    RUNTIME_FIELD_IS_ACTIVE,
    RUNTIME_FIELD_STEP_CHANGE_REQUEST,
    RUNTIME_FIELD_CMD_W,
    RUNTIME_FIELD_IS_ON,
    RUNTIME_FIELD_REASON,
    get_consumer_runtime,
)

_LOGGER = logging.getLogger(__name__)


def _coerce_float(value: Any, default: float = 0.0) -> float:
    """Coerce a value to float, returning default if conversion fails."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


class ConsumerManager:
    """Manages consumer operations including state, priorities, and validation."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize the ConsumerManager."""
        self.hass = hass
        self.entry = entry
        self.entry_id = entry.entry_id
        self._cached_enabled_priorities: list[float] | None = None
        self._cached_consumers_hash: int | None = None
        self._cached_consumer_lookups: dict[str, dict[str, Any]] = {}
        self._last_update_time: float = 0.0
        self._update_count: int = 0

    def is_enabled(self, consumer: Mapping[str, Any]) -> bool:
        """Check if consumer is enabled (internal control, not physical device state)."""
        consumer_id = consumer.get(CONSUMER_ID)
        if consumer_id is None:
            return False
        runtime = get_consumer_runtime(self.hass, self.entry_id, consumer_id)
        return bool(runtime.get(RUNTIME_FIELD_ENABLED, True))

    def is_available(self, consumer: Mapping[str, Any]) -> bool:
        """Check if consumer's power target entity is available."""
        power_target = consumer.get(CONSUMER_POWER_TARGET_ENTITY_ID)
        if power_target:
            state = self.hass.states.get(power_target)
            if state is None or state.state in ("unavailable", "unknown"):
                return False
        return True

    def get_consumer_number_entity_id(self, consumer_id: str, suffix: str) -> str | None:
        """Get consumer number entity ID from entity registry."""
        unique_id = f"{DOMAIN}_{self.entry_id}_{consumer_id}_{suffix}"
        entity_registry = er.async_get(self.hass)
        return entity_registry.async_get_entity_id("number", DOMAIN, unique_id)

    def _read_number_entity_value(self, entity_id: str | None, default: float) -> float:
        """Read number entity value, returning default if unavailable."""
        if not entity_id:
            return default
        state = self.hass.states.get(entity_id)
        if state is None or state.state in ("unknown", "unavailable"):
            return default
        try:
            return float(state.state)
        except (TypeError, ValueError):
            return default

    def get_consumer_delay_seconds(self, consumer_id: str, is_start: bool) -> float:
        """Get consumer start or stop delay in seconds."""
        suffix = "start_delay_s" if is_start else "stop_delay_s"
        default = CONSUMER_DEFAULT_START_DELAY_S if is_start else CONSUMER_DEFAULT_STOP_DELAY_S
        entity_id = self.get_consumer_number_entity_id(consumer_id, suffix)
        return self._read_number_entity_value(entity_id, default)

    def get_consumer_step_w(self, consumer_id: str, consumer: Mapping[str, Any]) -> float:
        """Get consumer step size in watts."""
        entity_id = self.get_consumer_number_entity_id(consumer_id, "step_w")
        default = float(consumer.get(CONSUMER_STEP_W, CONSUMER_DEFAULT_STEP_W))
        return self._read_number_entity_value(entity_id, default)

    def get_consumer_pid_deadband_pct(self, consumer_id: str, consumer: Mapping[str, Any]) -> float:
        """Get consumer PID deadband in percent."""
        entity_id = self.get_consumer_number_entity_id(consumer_id, "pid_deadband_pct")
        default = float(consumer.get(CONSUMER_PID_DEADBAND_PCT, CONSUMER_DEFAULT_PID_DEADBAND_PCT))
        return self._read_number_entity_value(entity_id, default)

    def get_consumer_threshold_w(self, consumer_id: str, consumer: Mapping[str, Any]) -> float:
        """Get consumer threshold in watts (for binary consumers)."""
        entity_id = self.get_consumer_number_entity_id(consumer_id, CONSUMER_THRESHOLD_W)
        default = float(consumer.get(CONSUMER_THRESHOLD_W, CONSUMER_DEFAULT_THRESHOLD_W))
        return self._read_number_entity_value(entity_id, default)

    def read_physical_device_state(self, consumer: Mapping[str, Any]) -> bool | None:
        """Read the actual physical device state from state_entity_id.
        
        Returns:
            True if device is ON/RUNNING, False if OFF, None if unavailable/not configured.
        """
        state_entity_id = consumer.get(CONSUMER_STATE_ENTITY_ID)
        if not state_entity_id:
            return None
        
        state_obj = self.hass.states.get(state_entity_id)
        if state_obj is None or state_obj.state in ("unknown", "unavailable"):
            return None
        
        value = state_obj.state
        if isinstance(value, str):
            lowered = value.lower()
            if lowered in ("on", "true", "home", "open", "1", "enabled"):
                return True
            if lowered in ("off", "false", "not_home", "closed", "0", "disabled"):
                return False
        
        # For numeric values, treat > 0 as ON
        try:
            num = float(value)
            return num > 0
        except (TypeError, ValueError):
            return None

    def read_physical_device_power(self, consumer: Mapping[str, Any]) -> float | None:
        """Read the actual physical device power from power_target_entity_id.
        
        Returns:
            Power in watts, or None if unavailable/not configured.
        """
        power_entity_id = consumer.get(CONSUMER_POWER_TARGET_ENTITY_ID)
        if not power_entity_id:
            return None
        
        state_obj = self.hass.states.get(power_entity_id)
        if state_obj is None or state_obj.state in ("unknown", "unavailable"):
            return None
        
        try:
            return float(state_obj.state)
        except (TypeError, ValueError):
            return None

    def is_consumer_finished_starting(
        self, consumer: Mapping[str, Any], is_at_max
    ) -> bool:
        """Check if consumer has finished starting based on physical device state.
        
        For controlled consumers: device must be ON and at MAX power.
        For binary consumers: device must be ON.
        
        Args:
            consumer: Consumer configuration dict
            is_at_max: Function(cmd: float, maximum: float) -> bool to check if at max
            
        Returns:
            True if consumer has finished starting, False otherwise
        """
        consumer_type = consumer.get(CONSUMER_TYPE)
        device_on = self.read_physical_device_state(consumer)
        
        if device_on is None:
            # Fallback to runtime state if physical state unavailable
            consumer_id = consumer.get(CONSUMER_ID)
            if consumer_id is None:
                return False
            runtime = get_consumer_runtime(self.hass, self.entry_id, consumer_id)
            
            if consumer_type == CONSUMER_TYPE_CONTROLLED:
                cmd_w = float(runtime.get(RUNTIME_FIELD_CMD_W, 0.0))
                max_power = float(consumer.get(CONSUMER_MAX_POWER_W, 0.0))
                return is_at_max(cmd_w, max_power)
            else:  # binary
                return bool(runtime.get(RUNTIME_FIELD_IS_ON, False))
        
        if not device_on:
            return False  # Device is OFF, not finished starting
        
        if consumer_type == CONSUMER_TYPE_CONTROLLED:
            # For controlled consumers, also check if at max power
            actual_power = self.read_physical_device_power(consumer)
            max_power = float(consumer.get(CONSUMER_MAX_POWER_W, 0.0))
            if actual_power is not None and max_power > 0:
                return is_at_max(actual_power, max_power)
            # Fallback to runtime cmd_w if power entity unavailable
            consumer_id = consumer.get(CONSUMER_ID)
            if consumer_id is None:
                return False
            runtime = get_consumer_runtime(self.hass, self.entry_id, consumer_id)
            cmd_w = float(runtime.get(RUNTIME_FIELD_CMD_W, 0.0))
            return is_at_max(cmd_w, max_power)
        
        # Binary consumer is ON
        return True

    def is_consumer_finished_stopping(self, consumer: Mapping[str, Any]) -> bool:
        """Check if consumer has finished stopping based on physical device state.
        
        Device must be OFF.
        
        Returns:
            True if consumer has finished stopping, False otherwise
        """
        device_on = self.read_physical_device_state(consumer)
        
        if device_on is None:
            # Fallback to runtime state if physical state unavailable
            consumer_id = consumer.get(CONSUMER_ID)
            if consumer_id is None:
                return True  # Assume finished if can't determine
            runtime = get_consumer_runtime(self.hass, self.entry_id, consumer_id)
            consumer_type = consumer.get(CONSUMER_TYPE)
            
            if consumer_type == CONSUMER_TYPE_CONTROLLED:
                cmd_w = float(runtime.get(RUNTIME_FIELD_CMD_W, 0.0))
                return cmd_w <= 0.0
            else:  # binary
                return not bool(runtime.get(RUNTIME_FIELD_IS_ON, False))
        
        # Device is OFF, finished stopping
        return not device_on

    def set_consumer_reason(self, consumer_id: str, reason: str | None) -> None:
        """Set consumer reason string in runtime data."""
        runtime = get_consumer_runtime(self.hass, self.entry_id, consumer_id)
        runtime[RUNTIME_FIELD_REASON] = reason or ""

    def get_priority(self, consumer: Mapping[str, Any]) -> float:
        """Get consumer priority, defaulting to 999.0 if not set."""
        return _coerce_float(consumer.get(CONSUMER_PRIORITY), 999.0)

    def get_consumers_hash(self, consumers: list[Mapping[str, Any]]) -> int:
        """Calculate a hash of consumers list to detect changes.
        
        Returns a hash based on consumer IDs, enabled status, and priorities.
        """
        consumer_signatures = []
        for consumer in consumers:
            consumer_id = consumer.get(CONSUMER_ID)
            if consumer_id:
                enabled = self.is_enabled(consumer)
                priority = self.get_priority(consumer)
                consumer_signatures.append((consumer_id, enabled, priority))
        return hash(tuple(sorted(consumer_signatures)))

    def collect_enabled_priorities(
        self, consumers: list[Mapping[str, Any]], use_cache: bool = True
    ) -> list[float]:
        """Collect unique enabled consumer priorities.
        
        Returns a list of unique priority values from enabled consumers.
        Uses tolerance for float comparison to avoid duplicates.
        Optionally caches the result until consumers change.
        
        Args:
            consumers: List of consumer configuration dictionaries
            use_cache: Whether to use cached results if consumers haven't changed
            
        Returns:
            List of unique enabled priority values
        """
        # Check cache
        if use_cache and self._cached_enabled_priorities is not None:
            current_hash = self.get_consumers_hash(consumers)
            if self._cached_consumers_hash == current_hash:
                _LOGGER.debug(
                    f"Using cached enabled priorities: {self._cached_enabled_priorities}"
                )
                return self._cached_enabled_priorities

        # Calculate enabled priorities
        start_time = time.monotonic()
        enabled_priorities = []
        for consumer in consumers:
            if not self.is_enabled(consumer):
                continue
            priority = self.get_priority(consumer)
            if priority > 0:
                # Use tolerance check for float comparison to avoid duplicates
                found = False
                for ep in enabled_priorities:
                    if abs(ep - priority) < 0.01:
                        found = True
                        break
                if not found:
                    enabled_priorities.append(priority)
        
        elapsed = (time.monotonic() - start_time) * 1000  # Convert to ms
        if len(consumers) > 10:
            _LOGGER.debug(
                f"Collected {len(enabled_priorities)} enabled priorities from {len(consumers)} consumers "
                f"in {elapsed:.2f}ms"
            )

        # Update cache
        if use_cache:
            self._cached_enabled_priorities = enabled_priorities
            self._cached_consumers_hash = self.get_consumers_hash(consumers)

        return enabled_priorities

    def invalidate_cache(self) -> None:
        """Invalidate cached consumer data when consumers change."""
        self._cached_enabled_priorities = None
        self._cached_consumers_hash = None
        self._cached_consumer_lookups.clear()

    def validate_consumers(
        self, consumers: list[Mapping[str, Any]]
    ) -> tuple[bool, list[str]]:
        """Validate consumer configurations.
        
        Checks for:
        - Missing required fields
        - Duplicate consumer IDs
        - Invalid priority values
        - Circular dependencies in priorities (if applicable)
        
        Returns:
            Tuple of (is_valid, list_of_error_messages)
        """
        errors: list[str] = []
        consumer_ids: set[str] = set()
        priorities: dict[str, float] = {}

        for idx, consumer in enumerate(consumers):
            consumer_id = consumer.get(CONSUMER_ID)
            if not consumer_id:
                errors.append(f"Consumer at index {idx} is missing {CONSUMER_ID}")
                continue

            if consumer_id in consumer_ids:
                errors.append(f"Duplicate consumer ID: {consumer_id}")
                continue
            consumer_ids.add(consumer_id)

            priority = self.get_priority(consumer)
            if priority <= 0:
                errors.append(
                    f"Consumer {consumer_id} has invalid priority: {priority} (must be > 0)"
                )
            priorities[consumer_id] = priority

            consumer_type = consumer.get(CONSUMER_TYPE)
            if consumer_type not in (CONSUMER_TYPE_CONTROLLED, CONSUMER_TYPE_BINARY):
                errors.append(
                    f"Consumer {consumer_id} has invalid type: {consumer_type}"
                )

        is_valid = len(errors) == 0
        if not is_valid:
            _LOGGER.warning(
                f"Consumer validation found {len(errors)} error(s): {errors}"
            )
        else:
            _LOGGER.debug(f"Validated {len(consumers)} consumers successfully")

        return is_valid, errors

    def validate_entity_accessibility(
        self, consumers: list[Mapping[str, Any]]
    ) -> tuple[bool, list[str]]:
        """Validate that consumer entity IDs are accessible.
        
        Checks if entities referenced by consumers exist and are accessible.
        
        Returns:
            Tuple of (all_accessible, list_of_warnings)
        """
        warnings: list[str] = []

        for consumer in consumers:
            consumer_id = consumer.get(CONSUMER_ID)
            if not consumer_id:
                continue

            # Check power target entity
            power_target = consumer.get(CONSUMER_POWER_TARGET_ENTITY_ID)
            if power_target:
                state = self.hass.states.get(power_target)
                if state is None:
                    warnings.append(
                        f"Consumer {consumer_id}: Power target entity {power_target} not found"
                    )
                elif state.state in ("unavailable", "unknown"):
                    warnings.append(
                        f"Consumer {consumer_id}: Power target entity {power_target} is {state.state}"
                    )

            # Check state entity
            state_entity = consumer.get(CONSUMER_STATE_ENTITY_ID)
            if state_entity:
                state = self.hass.states.get(state_entity)
                if state is None:
                    warnings.append(
                        f"Consumer {consumer_id}: State entity {state_entity} not found"
                    )

        all_accessible = len(warnings) == 0
        if warnings:
            _LOGGER.warning(
                f"Entity accessibility check found {len(warnings)} warning(s): {warnings[:5]}"
                + (f" (and {len(warnings) - 5} more)" if len(warnings) > 5 else "")
            )
        else:
            _LOGGER.debug(f"All entities accessible for {len(consumers)} consumers")

        return all_accessible, warnings

    def log_performance_metrics(
        self, consumers: list[Mapping[str, Any]], operation: str, duration_ms: float
    ) -> None:
        """Log performance metrics for consumer operations.
        
        Args:
            consumers: List of consumers processed
            operation: Name of the operation (e.g., "update_controlled", "collect_priorities")
            duration_ms: Operation duration in milliseconds
        """
        num_consumers = len(consumers)
        if num_consumers > 10 or duration_ms > 10.0:
            _LOGGER.debug(
                f"Performance: {operation} processed {num_consumers} consumers in {duration_ms:.2f}ms "
                f"(avg: {duration_ms / max(num_consumers, 1):.3f}ms per consumer)"
            )

    def get_consumer_by_id(
        self, consumers: list[Mapping[str, Any]], consumer_id: str
    ) -> Mapping[str, Any] | None:
        """Get consumer configuration by ID with caching.
        
        Args:
            consumers: List of consumer configurations
            consumer_id: ID of consumer to find
            
        Returns:
            Consumer configuration dict or None if not found
        """
        # Check cache first
        if consumer_id in self._cached_consumer_lookups:
            cached = self._cached_consumer_lookups[consumer_id]
            # Verify it's still in the current consumers list
            if cached in consumers:
                return cached

        # Not in cache or cache invalid, find it
        for consumer in consumers:
            if consumer.get(CONSUMER_ID) == consumer_id:
                # Cache it
                self._cached_consumer_lookups[consumer_id] = consumer
                return consumer

        return None

