# Testing Levels Explained

## Simple Explanation: What Needs Mocking?

---

## 🟢 Level 1: Pure Functions (NO Mocking Needed)

**What it means:** Functions that don't use Home Assistant objects at all.

### Example from your code:

```python
# pid.py - PID class
def step(self, pv: float, error: float, ...) -> PIDStepResult:
    p = self.cfg.kp * error  # Just math!
    i = self._integral
    # ... calculations only
```

**Test it like:**
```python
def test_pid_step():
    pid = PID(cfg)
    result = pid.step(100.0, 10.0, None, ...)
    assert result.output > 0
```

**No mocking needed** ✅ - Just math and logic!

---

## 🟡 Level 2: Simple Mocks (Easy Mocking)

**What it means:** Uses HA objects but you can easily fake them.

### Example from your code:

```python
# coordinator.py - Static helper
def _coerce_float(value, default: float) -> float:
    try:
        return float(value)  # Doesn't need HA at all!
    except (TypeError, ValueError):
        return default
```

**Test it like:**
```python
def test_coerce_float():
    assert _coerce_float("123", 0.0) == 123.0
    assert _coerce_float("invalid", 99.0) == 99.0
```

**No mocking needed** ✅ - Pure function!

---

## 🟠 Level 3: Needs HA Objects (Mock Required)

**What it means:** Code that reads from `hass.states` or calls `hass.services`.

### Example from your code:

```python
# consumer_bindings.py
async def async_set_enabled(self, hass: HomeAssistant, desired_enabled: bool):
    # This needs hass.services!
    await hass.services.async_call(
        "button", "press", {"entity_id": self.enable_target_entity_id}
    )
```

**Test it like:**
```python
@pytest.mark.asyncio
async def test_async_set_enabled():
    # Create a fake "hass" object
    mock_hass = MagicMock()
    mock_hass.services.async_call = AsyncMock()
    
    binding = ConsumerBinding(consumer)
    await binding.async_set_enabled(mock_hass, True)
    
    # Verify it called the service
    mock_hass.services.async_call.assert_called_once()
```

**Mocking needed** 🟠 - You create a fake `hass` object

---

## 🔴 Level 4: Complex Integration (Many Mocks)

**What it means:** Uses multiple HA systems together.

### Example from your code:

```python
# coordinator.py - _async_update_data()
async def _async_update_data(self) -> FlowState:
    # Reads from hass.states
    pv = _state_to_float(self.hass.states.get(pv_ent), pv_ent)
    
    # Uses self.entry (ConfigEntry)
    consumers = self.entry.options.get(CONF_CONSUMERS, [])
    
    # Calls hass.services
    await hass.services.async_call(...)
    
    # Uses hass.data
    runtime = get_consumer_runtime(self.hass, self.entry.entry_id, ...)
```

**Test it like:**
```python
@pytest.mark.asyncio
async def test_async_update_data():
    # Mock everything
    mock_hass = MagicMock()
    mock_hass.states.get.return_value = Mock(state="100.0")
    mock_hass.data = {}
    mock_entry = MagicMock()
    mock_entry.options = {...}
    
    coordinator = SolarEnergyFlowCoordinator(mock_hass, mock_entry)
    result = await coordinator._async_update_data()
    
    assert result.pv == 100.0
```

**Many mocks needed** 🔴 - You fake the entire HA environment

---

## 📊 Summary Table

| Level | Example | Mocking Needed? | Difficulty |
|-------|---------|-----------------|------------|
| 🟢 Pure Function | `PID.step()` | ❌ No | Easy |
| 🟢 Static Helper | `_coerce_float()` | ❌ No | Easy |
| 🟡 Simple Logic | `_get_next_priority()` | ❌ No* | Medium |
| 🟠 Uses hass | `async_set_enabled()` | ✅ Yes (hass) | Medium |
| 🔴 Full Integration | `_async_update_data()` | ✅ Yes (hass + entry + data) | Hard |

\* May need simple mocks for consumers list, but no HA objects

---

## 🎯 Real Examples from Your Code

### ✅ NO Mocking Needed:

1. **PID Controller** (`pid.py`)
   - Pure calculations
   - Just numbers in, numbers out

2. **Static Functions** (`coordinator.py`)
   - `_compute_controlled_consumer_step()`
   - `_format_timer_remaining()`
   - `_is_at_max()`

### 🟠 Needs Simple Mocks:

3. **Rate Limiting** (`consumer_bindings.py`)
   - Uses `time.monotonic()` → Mock time
   - But no HA objects!

4. **Priority Logic** (`coordinator.py`)
   - Uses consumer dictionaries → Just Python dicts
   - No HA objects needed

### 🔴 Needs Full HA Mocks:

5. **Consumer Binding** (`consumer_bindings.py`)
   - Calls `hass.services.async_call()` → Mock `hass`
   - Reads `hass.states.get()` → Mock `hass.states`

6. **Coordinator** (`coordinator.py`)
   - Uses `self.hass` → Mock `hass`
   - Uses `self.entry` → Mock `ConfigEntry`
   - Uses `hass.data` → Mock data structure
   - Calls services → Mock `hass.services`

---

## 💡 Key Insight

**"Need Full HA Mocks"** = Your code talks to Home Assistant's runtime

- `hass.states.get()` = Reading entity states
- `hass.services.async_call()` = Calling services
- `hass.data` = Using HA's internal data storage
- `ConfigEntry` = Using HA's configuration system

To test these, you create **fake versions** (mocks) that pretend to be HA objects, but you control what they return.

---

## 🔍 In Your Specific Code

**Complex examples that need mocks:**

1. `_async_command_consumer_power()` - Needs `hass` mock (for services)
2. `async_set_enabled()` - Needs `hass` mock (for services)  
3. `_async_update_data()` - Needs `hass`, `entry`, and `hass.data` mocks
4. `read_physical_device_state()` - Needs `hass.states` mock

**Simple examples that DON'T need mocks:**

1. `PID.step()` - Just math
2. `_compute_controlled_consumer_step()` - Just calculations
3. `_is_at_max()` - Just comparison
4. `_format_timer_remaining()` - Just subtraction


