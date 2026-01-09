# What You Can Test in Solar Energy Flow Integration

This document outlines testable components in your codebase, organized by difficulty and importance.

---

## 🟢 Easy to Test (Pure Functions - No Dependencies)

### 1. **PID Controller (`pid.py`)**
**Why:** Self-contained logic with clear inputs/outputs

**Testable:**
- ✅ `PID.step()` - PID calculations (P, I, D terms)
- ✅ `PID.reset()` - State reset
- ✅ `PID.bumpless_transfer()` - Mode switching
- ✅ `PID._compute_kaw()` - Anti-windup gain calculation
- ✅ `PIDConfig` dataclass validation
- ✅ `PIDStepResult` dataclass

**Example test cases:**
- Proportional term calculation (P = Kp * error)
- Integral accumulation over time
- Derivative term with changing PV
- Output clamping (min/max limits)
- Rate limiting behavior
- Anti-windup (integral clamping)
- Bumpless transfer when switching modes

---

### 2. **Static Helper Functions (`coordinator.py`)**

#### `_coerce_float(value, default)`
**Test cases:**
- Valid float strings → float
- Invalid strings → default
- None → default
- Already float → float

#### `_compute_controlled_consumer_step(pid_pct, pid_deadband_pct, max_step_w)`
**Test cases:**
- pid_pct = 50.0 → step = 0.0 (deadband)
- pid_pct = 75.0 → positive step (want increase)
- pid_pct = 25.0 → negative step (want decrease)
- Small steps < 1.0 → clamped to ±1.0
- Deadband boundary conditions
- Quadratic scaling behavior

#### `_format_timer_remaining(total, elapsed)`
**Test cases:**
- elapsed < total → positive remaining
- elapsed >= total → 0.0
- elapsed = 0 → returns total

#### `_is_at_max(cmd, maximum)` (static method)
**Test cases:**
- cmd == maximum → True
- cmd ≈ maximum (within 0.5) → True
- cmd < maximum - 0.5 → False

---

### 3. **Consumer Bindings Rate Limiting (`consumer_bindings.py`)**

#### `ConsumerBinding._rate_limited(last_time)`
**Test cases:**
- last_time = None → False (not rate limited)
- last_time very recent (< 5 seconds) → True (rate limited)
- last_time old (> 5 seconds) → False (not rate limited)
- Boundary: exactly 5 seconds ago

**Note:** Use `time.monotonic()` mocking to control time in tests

---

## 🟡 Medium Difficulty (Logic Functions - Need Mocks)

### 4. **Consumer Manager (`consumer_manager.py`)**

#### `ConsumerManager.get_priority(consumer)`
**Test cases:**
- Valid priority number → returns priority
- Missing priority → returns 999.0 (default)
- Invalid priority → coerced to default

#### `ConsumerManager.get_consumers_hash(consumers)`
**Test cases:**
- Same consumers → same hash
- Different enabled states → different hash
- Different priorities → different hash
- Empty list → consistent hash

#### `ConsumerManager.collect_enabled_priorities(consumers)`
**Test cases:**
- Only enabled consumers included
- Duplicate priorities (with tolerance) → deduplicated
- Empty list → empty result
- Cache behavior (same input → cached result)
- Cache invalidation on consumer change

---

### 5. **Priority Logic (`coordinator.py`)**

#### `_get_next_priority(consumers, current_priority)`
**Test cases:**
- Current priority = 1, next enabled = 2 → returns 2
- Current priority = 5, next enabled = 7 → returns 7
- Current priority = highest → returns None
- No enabled consumers → returns None

#### `_get_previous_priority(consumers, current_priority)`
**Test cases:**
- Current priority = 5, previous enabled = 3 → returns 3
- Current priority = 2, previous enabled = 1 → returns 1
- Current priority = lowest → returns None
- No enabled consumers → returns None

---

### 6. **Value Conversion Functions (`coordinator.py`)**

#### `_normalize_value(value, minimum, maximum)`
**Test cases:**
- Value at minimum → 0.0
- Value at maximum → 100.0
- Value in middle → proportional
- Value outside range → clamped
- None input → None output

#### `_denormalize_value(percent, minimum, maximum)`
**Test cases:**
- 0% → minimum
- 100% → maximum
- 50% → midpoint
- Values outside 0-100 → clamped

---

## 🟠 Complex (Integration Logic - Need Full HA Mocks)

### 7. **Consumer Binding State Management (`consumer_bindings.py`)**

#### `ConsumerBinding.get_effective_enabled(hass)`
**Test cases:**
- State entity available → uses actual state
- State entity unavailable → uses assumed state
- No state entity → uses assumed state

#### `ConsumerBinding.set_desired_power(value)` / `async_push_power()`
**Test cases:**
- Power change > deadband → sends command
- Power change < deadband → skips (no command)
- Rate limited → skips command
- Device disabled → sends 0.0 regardless

---

### 8. **Coordinator Step Calculations**

#### Controlled Consumer Step Logic
**Test cases:**
- PID wants increase, at min → step up
- PID wants increase, at max → stay at max, signal "next"
- PID wants decrease, at min + delta_w<0 → start stop timer
- PID wants decrease, at min + timer expired → set to 0, signal "previous"
- Deadband behavior (small PID changes → no step)

#### Binary Consumer State Logic
**Test cases:**
- delta_w >= threshold, OFF → start timer
- delta_w >= threshold, timer expired → turn ON, signal "next"
- delta_w < 0, ON → start stop timer
- delta_w < 0, timer expired → turn OFF, signal "previous"
- delta_w becomes positive during stop timer → reset timer

---

## 🔴 Advanced (Full Integration Tests - Need HA Running/Mocks)

### 9. **Coordinator Update Cycle**
**Test cases:**
- Divider priority assignment
- Active consumer selection
- Step change request processing
- Priority transitions (next/previous)

### 10. **Config Flow (`config_flow.py`)**
**Test cases:**
- Form validation
- Entity domain validation
- Range validation (min < max)
- Consumer CRUD operations
- Options persistence

---

## 📊 Recommended Testing Priority

### **High Priority** (Start Here)
1. ✅ **PID Controller** - Core control logic, pure functions
2. ✅ **Step calculations** (`_compute_controlled_consumer_step`)
3. ✅ **Rate limiting** (`_rate_limited`)
4. ✅ **Priority logic** (`_get_next_priority`, `_get_previous_priority`)

### **Medium Priority**
5. ✅ **Helper functions** (`_coerce_float`, `_format_timer_remaining`, `_is_at_max`)
6. ✅ **Consumer Manager** (priority collection, hashing)
7. ✅ **Value conversions** (normalize/denormalize)

### **Lower Priority** (But Still Valuable)
8. ✅ **Consumer Binding** (state management, power commands)
9. ✅ **Coordinator integration** (full update cycle)
10. ✅ **Config Flow** (form validation)

---

## 🎯 Test Coverage Goals

Aim for:
- **80%+ coverage** on pure functions (PID, helpers)
- **60%+ coverage** on logic functions (priority, consumer manager)
- **40%+ coverage** on integration code (coordinator, config flow)

This gives you confidence in core logic while keeping test maintenance reasonable.

---

## 💡 Testing Strategy Tips

1. **Start with PID**: It's pure, well-defined, and critical
2. **Use fixtures**: Create reusable test data (mock consumers, hass, etc.)
3. **Mock time**: Use `time.monotonic()` mocking for rate limiting tests
4. **Test edge cases**: Boundary values, None inputs, empty lists
5. **Test error handling**: Invalid inputs, missing entities, unavailable states


