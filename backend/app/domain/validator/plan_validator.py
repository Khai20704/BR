"""Independent validation of a proposed plan.

This module deliberately does not trust the optimizer's prediction. It rebuilds
the mass balance from the raw inputs and re-integrates the schedule at a finer
time step. A plan is `VALIDATED` only when every check passes; any failure
returns `NOT_VALIDATED` with machine-readable check codes.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..models import (
    Batch,
    Constraints,
    PlanStatus,
    SchedulePhase,
    SimulationResult,
    ThermalProfile,
    ValidationCheck,
    ValidationReport,
)
from ..physics.drying import simulate
from ..physics.mass_balance import compute_mass_balance

MASS_TOLERANCE_KG = 1e-6
MOISTURE_TOLERANCE = 1e-6
REINTEGRATION_STEP_MINUTES = 1
MOISTURE_AGREEMENT_WB = 0.02
ENERGY_SANITY_MULTIPLE = 12.0


@dataclass(frozen=True, slots=True)
class _Verdict:
    code: str
    passed: bool
    detail: str

    def as_check(self) -> ValidationCheck:
        return ValidationCheck(code=self.code, passed=self.passed, detail=self.detail)


def _check_mass_balance(
    batch: Batch, constraints: Constraints, claimed: SimulationResult
) -> _Verdict:
    balance = compute_mass_balance(
        batch, batch.material, constraints.max_temperature_c
    )
    expected_water = max(0.0, balance.initial_water_kg - balance.final_water_kg)
    reached = claimed.final_moisture_wb
    final_water = balance.dry_solids_kg * (reached / (1.0 - reached))
    closing_water = balance.initial_water_kg - final_water
    agrees = abs(closing_water - claimed.water_removed_kg) <= max(
        MASS_TOLERANCE_KG, expected_water * 1e-4
    )
    return _Verdict(
        code='MASS_BALANCE_CLOSED',
        passed=agrees,
        detail=(
            'Recomputed water removal '
            f'{closing_water:.6f} kg against the claimed '
            f'{claimed.water_removed_kg:.6f} kg.'
        ),
    )


def _check_target(
    profile: ThermalProfile,
    batch: Batch,
    constraints: Constraints,
    phases: tuple[SchedulePhase, ...],
) -> tuple[_Verdict, SimulationResult]:
    independent = simulate(
        profile,
        batch,
        constraints,
        phases,
        step_minutes=REINTEGRATION_STEP_MINUTES,
    )
    reached = (
        independent.final_moisture_wb
        <= batch.target_moisture_wb + MOISTURE_TOLERANCE
    )
    return (
        _Verdict(
            code='TARGET_ACHIEVED_INDEPENDENTLY',
            passed=reached,
            detail=(
                'Fine-step re-integration reached '
                f'{independent.final_moisture_wb:.4f} wet basis against a '
                f'{batch.target_moisture_wb:.4f} target.'
            ),
        ),
        independent,
    )


def _check_energy(claimed: SimulationResult) -> _Verdict:
    floor = claimed.minimum_energy_kwh
    above_floor = claimed.energy_kwh >= floor - MASS_TOLERANCE_KG
    below_cap = claimed.energy_kwh <= floor * ENERGY_SANITY_MULTIPLE
    return _Verdict(
        code='ENERGY_PLAUSIBLE',
        passed=above_floor and below_cap,
        detail=(
            f'Claimed {claimed.energy_kwh:.4f} kWh against a latent floor of '
            f'{floor:.4f} kWh.'
        ),
    )


def _check_window(
    constraints: Constraints, claimed: SimulationResult
) -> _Verdict:
    within = claimed.duration_minutes <= constraints.max_duration_minutes
    return _Verdict(
        code='WINDOW_RESPECTED',
        passed=within,
        detail=(
            f'{claimed.duration_minutes} minutes used against a '
            f'{constraints.max_duration_minutes} minute limit.'
        ),
    )


def _check_temperatures(
    batch: Batch, constraints: Constraints, phases: tuple[SchedulePhase, ...]
) -> _Verdict:
    ceiling = min(constraints.max_temperature_c, batch.material.max_safe_temperature_c)
    low = min(phase.temperature_c for phase in phases) if phases else 0.0
    high = max(phase.temperature_c for phase in phases) if phases else 0.0
    within = low >= constraints.min_temperature_c - MOISTURE_TOLERANCE and (
        high <= ceiling + MOISTURE_TOLERANCE
    )
    return _Verdict(
        code='TEMPERATURE_LIMITS',
        passed=within,
        detail=(
            f'Setpoints span {low:.1f}..{high:.1f} C inside '
            f'{constraints.min_temperature_c:.1f}..{ceiling:.1f} C.'
        ),
    )


def _check_agreement(claimed: SimulationResult, independent: SimulationResult) -> _Verdict:
    gap = abs(claimed.final_moisture_wb - independent.final_moisture_wb)
    return _Verdict(
        code='PREDICTION_AGREES',
        passed=gap <= MOISTURE_AGREEMENT_WB,
        detail=(
            f'Coarse-step prediction differs from fine-step integration by '
            f'{gap:.4f} wet basis.'
        ),
    )


def validate_plan(
    profile: ThermalProfile,
    batch: Batch,
    constraints: Constraints,
    phases: tuple[SchedulePhase, ...],
    claimed: SimulationResult,
) -> ValidationReport:
    """Rebuild every invariant from the inputs and report the verdict."""
    target_verdict, independent = _check_target(
        profile, batch, constraints, phases
    )
    verdicts = (
        _check_mass_balance(batch, constraints, claimed),
        target_verdict,
        _check_energy(claimed),
        _check_window(constraints, claimed),
        _check_temperatures(batch, constraints, phases),
        _check_agreement(claimed, independent),
    )
    checks = tuple(verdict.as_check() for verdict in verdicts)
    passed = all(check.passed for check in checks)
    failed_codes = [check.code for check in checks if not check.passed]
    summary = (
        'All independent checks passed.'
        if passed
        else 'Failed checks: ' + ', '.join(failed_codes)
    )
    return ValidationReport(
        status=PlanStatus.VALIDATED if passed else PlanStatus.NOT_VALIDATED,
        checks=checks,
        summary=summary,
    )
