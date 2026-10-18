"""Adaptive replanning when the available heat changes.

The service rebuilds the thermal window from the requested minute onward, then
re-optimizes the remaining time. It reports machine-readable reason codes so a
caller can distinguish a real recalculation from an unchanged scenario.
"""

from __future__ import annotations

from dataclasses import dataclass, replace

from ..domain.models import (
    Batch,
    Constraints,
    Plan,
    PlanStatus,
    ThermalProfile,
    ThermalSample,
)
from .planning_service import build_plan

TEMPERATURE_CHANGE_THRESHOLD_C = 0.5
MINIMUM_REMAINING_MINUTES = 15


@dataclass(frozen=True, slots=True)
class ReplanOutcome:
    """The replanned schedule plus the reasons it differs from the baseline."""

    plan: Plan
    reason_codes: tuple[str, ...]
    remaining_minutes: int
    changed_temperature_c: float


def apply_thermal_change(
    profile: ThermalProfile, changed_temperature_c: float, elapsed_minutes: int
) -> ThermalProfile:
    """Rewrite the source temperature from the change minute onward."""
    samples = tuple(
        ThermalSample(
            minute=sample.minute,
            temperature_c=(
                changed_temperature_c
                if sample.minute >= elapsed_minutes
                else sample.temperature_c
            ),
            available_heat_kw=sample.available_heat_kw,
            relative_humidity=sample.relative_humidity,
        )
        for sample in profile.samples
    )
    return replace(profile, samples=samples)


def replan(
    batch: Batch,
    profile: ThermalProfile,
    constraints: Constraints,
    changed_temperature_c: float,
    elapsed_minutes: int = 0,
) -> ReplanOutcome:
    """Re-optimize the remaining window after a thermal change."""
    updated = apply_thermal_change(profile, changed_temperature_c, elapsed_minutes)
    remaining = max(0, constraints.max_duration_minutes - elapsed_minutes)
    last_minute = updated.samples[-1].minute
    start_minute = min(elapsed_minutes, last_minute)
    # The engine always integrates from minute zero, so the surviving part of
    # the window is rebased onto a fresh timeline. Keeping absolute minutes
    # would leave a gap the simulator silently fills with stale conditions.
    remaining_profile = replace(
        updated,
        samples=tuple(
            replace(sample, minute=sample.minute - start_minute)
            for sample in updated.samples
            if sample.minute >= start_minute
        ),
    )

    reason_codes: list[str] = ['THERMAL_INPUT_CHANGED']

    baseline_ceiling = max(sample.temperature_c for sample in profile.samples)
    if abs(changed_temperature_c - baseline_ceiling) < TEMPERATURE_CHANGE_THRESHOLD_C:
        reason_codes.append('NO_MEANINGFUL_CHANGE')

    if remaining < MINIMUM_REMAINING_MINUTES or not remaining_profile.samples:
        reason_codes.append('WINDOW_EXHAUSTED')
        plan, _ = build_plan(batch, profile, constraints)
        return ReplanOutcome(
            plan=replace(
                plan,
                validation=replace(
                    plan.validation,
                    status=PlanStatus.NO_FEASIBLE_PLAN,
                    summary='The operating window has already elapsed.',
                ),
            ),
            reason_codes=tuple(reason_codes),
            remaining_minutes=remaining,
            changed_temperature_c=changed_temperature_c,
        )

    remaining_constraints = replace(constraints, max_duration_minutes=remaining)
    plan, outcome = build_plan(batch, remaining_profile, remaining_constraints)

    if outcome.best is None:
        reason_codes.append('TARGET_UNREACHABLE')
    else:
        reason_codes.append('PLAN_RECALCULATED')
    if plan.validation.status is not PlanStatus.VALIDATED:
        reason_codes.append('VALIDATION_FAILED')

    rationale = list(plan.rationale)
    rationale.append(
        f'Replanned from minute {elapsed_minutes} with a source temperature of '
        f'{changed_temperature_c:.1f} C. Batch progress is not measured.'
    )
    return ReplanOutcome(
        plan=replace(
            plan,
            rationale=tuple(rationale),
            metadata={
                **plan.metadata,
                'replanned_from_minute': str(elapsed_minutes),
            },
        ),
        reason_codes=tuple(reason_codes),
        remaining_minutes=remaining,
        changed_temperature_c=changed_temperature_c,
    )
