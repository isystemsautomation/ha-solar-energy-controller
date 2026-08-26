from __future__ import annotations

from dataclasses import dataclass
import logging
import math
import time


_LOGGER = logging.getLogger(__name__)


@dataclass
class PIDConfig:
    kp: float
    ki: float
    kd: float
    min_output: float
    max_output: float
    nominal_dt: float = 1.0


@dataclass
class PIDStepResult:
    output: float
    error: float
    p_term: float
    i_term: float
    d_term: float
    output_pre_rate_limit: float


class PID:
    """PID controller with anti-windup and derivative on measurement."""

    def __init__(self, cfg: PIDConfig, *, entry_id: str | None = None) -> None:
        self.cfg = cfg
        self._integral = 0.0
        self._prev_pv: float | None = None
        self._prev_t: float | None = None
        if entry_id:
            _LOGGER.debug("PIDController created entry_id=%s", entry_id)

    def update_config(self, cfg: PIDConfig) -> None:
        self.cfg = cfg

    def reset(self) -> None:
        self._integral = 0.0
        self._prev_pv = None
        self._prev_t = None

    def apply_options(self, cfg: PIDConfig) -> None:
        """Apply new tuning without resetting accumulated state."""
        self.update_config(cfg)

    def _effective_dt(self) -> tuple[float, float]:
        """Return (dt_seconds, monotonic_now)."""
        now = time.monotonic()
        if self._prev_t is None:
            dt = self.cfg.nominal_dt
        else:
            dt = max(1e-6, now - self._prev_t)
        max_dt = max(self.cfg.nominal_dt * 5, 1.0)
        return min(dt, max_dt), now

    def step(
        self,
        pv: float,
        error: float,
        last_output: float | None,
        *,
        rate_limiter_enabled: bool,
        rate_limit: float,
    ) -> PIDStepResult:
        """Return the latest PID step details."""
        if not math.isfinite(pv) or not math.isfinite(error):
            hold = last_output if last_output is not None else self.cfg.min_output
            if not math.isfinite(hold):
                hold = self.cfg.min_output
            return PIDStepResult(
                output=hold,
                error=error if math.isfinite(error) else 0.0,
                p_term=0.0,
                i_term=self._integral,
                d_term=0.0,
                output_pre_rate_limit=hold,
            )

        dt, now = self._effective_dt()

        if self._prev_pv is None or dt < 1e-4:
            d_pv = 0.0
        else:
            d_pv = (pv - self._prev_pv) / dt

        p = self.cfg.kp * error
        i = self._integral
        d = -self.cfg.kd * d_pv

        u_pid = p + i + d
        u_sat = max(self.cfg.min_output, min(self.cfg.max_output, u_pid))

        if rate_limiter_enabled and rate_limit > 0 and last_output is not None:
            max_delta = rate_limit * dt
            u_out = max(last_output - max_delta, min(last_output + max_delta, u_sat))
        else:
            u_out = u_sat

        output_saturated = (u_pid < self.cfg.min_output) or (u_pid > self.cfg.max_output)
        rate_limited = (
            rate_limiter_enabled
            and rate_limit > 0
            and last_output is not None
            and u_out != u_sat
        )

        if output_saturated or rate_limited:
            integral_update = 0.0
        else:
            integral_update = self.cfg.ki * error * dt

        output_range = abs(self.cfg.max_output - self.cfg.min_output)
        if output_range > 0:
            max_integral = output_range * 2.0
            new_integral = self._integral + integral_update
            self._integral = max(-max_integral, min(max_integral, new_integral))
        else:
            self._integral += integral_update

        self._prev_pv = pv
        self._prev_t = now
        return PIDStepResult(
            output=u_out,
            error=error,
            p_term=p,
            i_term=i,
            d_term=d,
            output_pre_rate_limit=u_sat,
        )

    def bumpless_transfer(self, current_output: float, error: float, pv: float | None) -> None:
        """Adjust integral to avoid output jumps when mode/setpoint changes."""

        dt, now = self._effective_dt()

        if pv is None or self._prev_pv is None or dt == 0.0:
            d_term = 0.0
        else:
            d_term = -self.cfg.kd * (pv - self._prev_pv) / dt

        self._integral = current_output - self.cfg.kp * error - d_term

        self._prev_pv = pv
        self._prev_t = now
