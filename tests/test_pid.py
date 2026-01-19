"""Test the PID controller."""
from __future__ import annotations

import time

import pytest

from custom_components.solar_energy_controller.pid import PID, PIDConfig, PIDStepResult


def test_pid_initialization():
    """Test PID controller initialization."""
    cfg = PIDConfig(kp=1.0, ki=0.1, kd=0.0, min_output=0.0, max_output=100.0)
    pid = PID(cfg, entry_id="test_entry")
    
    assert pid.cfg == cfg
    assert pid._integral == 0.0
    assert pid._prev_pv is None
    assert pid._prev_t is None
    assert pid._prev_error is None


def test_pid_reset():
    """Test PID reset."""
    cfg = PIDConfig(kp=1.0, ki=0.1, kd=0.0, min_output=0.0, max_output=100.0)
    pid = PID(cfg)
    
    # Run a step to accumulate state
    pid.step(pv=50.0, error=10.0, last_output=None, rate_limiter_enabled=False, rate_limit=0.0)
    
    # Reset
    pid.reset()
    
    assert pid._integral == 0.0
    assert pid._prev_pv is None
    assert pid._prev_t is None
    assert pid._prev_error is None


def test_pid_step_basic():
    """Test basic PID step calculation."""
    cfg = PIDConfig(kp=1.0, ki=0.1, kd=0.0, min_output=0.0, max_output=100.0)
    pid = PID(cfg)
    
    # First step
    result = pid.step(pv=50.0, error=10.0, last_output=None, rate_limiter_enabled=False, rate_limit=0.0)
    
    assert isinstance(result, PIDStepResult)
    assert result.error == 10.0
    assert result.p_term == 10.0  # kp * error
    assert result.d_term == 0.0  # kd = 0
    assert 0.0 <= result.output <= 100.0


def test_pid_step_with_integral():
    """Test PID step with integral term."""
    cfg = PIDConfig(kp=1.0, ki=0.1, kd=0.0, min_output=0.0, max_output=100.0)
    pid = PID(cfg)
    
    # First step
    result1 = pid.step(pv=50.0, error=10.0, last_output=None, rate_limiter_enabled=False, rate_limit=0.0)
    
    # Small delay
    time.sleep(0.01)
    
    # Second step - integral should accumulate
    result2 = pid.step(pv=50.0, error=10.0, last_output=result1.output, rate_limiter_enabled=False, rate_limit=0.0)
    
    assert result2.i_term > result1.i_term  # Integral should increase


def test_pid_step_with_derivative():
    """Test PID step with derivative term."""
    cfg = PIDConfig(kp=1.0, ki=0.0, kd=1.0, min_output=0.0, max_output=100.0)
    pid = PID(cfg)
    
    # First step
    result1 = pid.step(pv=50.0, error=10.0, last_output=None, rate_limiter_enabled=False, rate_limit=0.0)
    
    time.sleep(0.01)
    
    # Second step with changing PV
    result2 = pid.step(pv=60.0, error=10.0, last_output=result1.output, rate_limiter_enabled=False, rate_limit=0.0)
    
    assert result2.d_term != 0.0  # Derivative should be non-zero


def test_pid_output_saturation():
    """Test PID output saturation."""
    cfg = PIDConfig(kp=10.0, ki=1.0, kd=0.0, min_output=0.0, max_output=100.0)
    pid = PID(cfg)
    
    # Large error should saturate
    result = pid.step(pv=0.0, error=50.0, last_output=None, rate_limiter_enabled=False, rate_limit=0.0)
    
    assert result.output == 100.0  # Should be clamped to max


def test_pid_rate_limiting():
    """Test PID rate limiting."""
    cfg = PIDConfig(kp=10.0, ki=0.0, kd=0.0, min_output=0.0, max_output=100.0)
    pid = PID(cfg)
    
    # First step
    result1 = pid.step(pv=0.0, error=10.0, last_output=0.0, rate_limiter_enabled=True, rate_limit=10.0)
    
    time.sleep(0.1)
    
    # Second step with rate limiting
    result2 = pid.step(pv=0.0, error=10.0, last_output=result1.output, rate_limiter_enabled=True, rate_limit=10.0)
    
    # Output change should be limited
    max_change = 10.0 * 0.1  # rate_limit * dt
    assert abs(result2.output - result1.output) <= max_change + 0.1  # Allow small tolerance


def test_pid_integral_windup_prevention():
    """Test that integral doesn't accumulate when output is saturated."""
    cfg = PIDConfig(kp=1.0, ki=1.0, kd=0.0, min_output=0.0, max_output=100.0)
    pid = PID(cfg)
    
    # First step - should saturate
    result1 = pid.step(pv=0.0, error=200.0, last_output=None, rate_limiter_enabled=False, rate_limit=0.0)
    integral1 = pid._integral
    
    time.sleep(0.01)
    
    # Second step - still saturated, integral should not accumulate
    result2 = pid.step(pv=0.0, error=200.0, last_output=result1.output, rate_limiter_enabled=False, rate_limit=0.0)
    integral2 = pid._integral
    
    # Integral should not increase when saturated
    assert integral2 == integral1


def test_pid_integral_clamping():
    """Test that integral is clamped to reasonable values."""
    cfg = PIDConfig(kp=1.0, ki=100.0, kd=0.0, min_output=0.0, max_output=100.0)
    pid = PID(cfg)
    
    # Run many steps with error
    for _ in range(100):
        time.sleep(0.001)
        pid.step(pv=0.0, error=10.0, last_output=None, rate_limiter_enabled=False, rate_limit=0.0)
    
    # Integral should be clamped to 2x output range
    max_integral = 2.0 * (cfg.max_output - cfg.min_output)
    assert abs(pid._integral) <= max_integral


def test_pid_update_config():
    """Test updating PID configuration."""
    cfg1 = PIDConfig(kp=1.0, ki=0.1, kd=0.0, min_output=0.0, max_output=100.0)
    pid = PID(cfg1)
    
    cfg2 = PIDConfig(kp=2.0, ki=0.2, kd=0.1, min_output=0.0, max_output=100.0)
    pid.update_config(cfg2)
    
    assert pid.cfg == cfg2


def test_pid_apply_options():
    """Test applying options without reset."""
    cfg1 = PIDConfig(kp=1.0, ki=0.1, kd=0.0, min_output=0.0, max_output=100.0)
    pid = PID(cfg1)
    
    # Accumulate some state
    pid.step(pv=50.0, error=10.0, last_output=None, rate_limiter_enabled=False, rate_limit=0.0)
    integral_before = pid._integral
    
    # Apply new options
    cfg2 = PIDConfig(kp=2.0, ki=0.2, kd=0.1, min_output=0.0, max_output=100.0)
    pid.apply_options(cfg2)
    
    # State should be preserved
    assert pid._integral == integral_before
    assert pid.cfg == cfg2


def test_pid_bumpless_transfer():
    """Test bumpless transfer."""
    cfg = PIDConfig(kp=1.0, ki=0.1, kd=0.0, min_output=0.0, max_output=100.0)
    pid = PID(cfg)
    
    # Set up some state
    pid.step(pv=50.0, error=10.0, last_output=None, rate_limiter_enabled=False, rate_limit=0.0)
    
    # Bumpless transfer
    pid.bumpless_transfer(current_output=50.0, error=5.0, pv=55.0)
    
    # Integral should be adjusted
    assert pid._prev_pv == 55.0
    assert pid._prev_error == 5.0


def test_pid_bumpless_transfer_no_ki():
    """Test bumpless transfer when Ki is zero."""
    cfg = PIDConfig(kp=1.0, ki=0.0, kd=0.0, min_output=0.0, max_output=100.0)
    pid = PID(cfg)
    
    pid.bumpless_transfer(current_output=50.0, error=5.0, pv=55.0)
    
    # Integral should be zero when Ki is zero
    assert pid._integral == 0.0

