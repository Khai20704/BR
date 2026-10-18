"""Three-way benchmark on one shared scenario.

The comparison is only meaningful because every method is simulated with the
same engine and validated by the same independent validator. No savings claim is
made when the methods are not comparable.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..domain.models import (
    Batch,
    Constraints,
    PlanStatus,
    SimulationResult,
    ThermalProfile,
)
from ..domain.models import SchedulePhase
from ..domain.optimizer.schedules import CandidateSchedule
from ..domain.physics.drying import simulate
from ..domain.validator.plan_validator import validate_plan
from .planning_service import build_plan


@dataclass(frozen=True, slots=True)
class MethodResult:
    """One approach evaluated on the shared scenario."""

    method: str
    status: PlanStatus
    result: SimulationResult | None
    validated: bool
    note: str


def _fixed_schedule(
    profile: ThermalProfile, constraints: Constraints
) -> CandidateSchedule:
    """A fixed setpoint: the mean available temperature, held all day."""
    mean_temperature = sum(
        sample.temperature_c for sample in profile.samples
    ) / len(profile.samples)
    return CandidateSchedule(
        name='Fixed schedule',
        phases=(
            SchedulePhase(
                temperature_c=min(mean_temperature, constraints.max_temperature_c),
                duration_minutes=constraints.max_duration_minutes,
            ),
        ),
        rationale='Constant setpoint at the mean available temperature.',
    )


def _conventional_adaptive(
    profile: ThermalProfile,
    constraints: Constraints,
    buffer_c: float = 3.0,
) -> CandidateSchedule:
    """Tracks the source with a fixed safety buffer below the hottest sample."""
    hottest = max(sample.temperature_c for sample in profile.samples)
    return CandidateSchedule(
        name='Conventional adaptive',
        phases=(
            SchedulePhase(
                temperature_c=max(
                    constraints.min_temperature_c, hottest - buffer_c
                ),
                duration_minutes=constraints.max_duration_minutes,
            ),
        ),
        rationale=f'Follows the source ceiling minus {buffer_c:.0f} C of margin.',
    )


def _evaluate(
    schedule: CandidateSchedule,
    batch: Batch,
    profile: ThermalProfile,
    constraints: Constraints,
) -> MethodResult:
    result = simulate(profile, batch, constraints, schedule.phases)
    report = validate_plan(profile, batch, constraints, schedule.phases, result)
    status = report.status
    if result.final_moisture_wb > batch.target_moisture_wb:
        status = PlanStatus.NO_FEASIBLE_PLAN
    note = report.summary
    return MethodResult(
        method=schedule.name,
        status=status,
        result=result,
        validated=report.passed,
        note=note,
    )


def run_benchmark(
    batch: Batch, profile: ThermalProfile, constraints: Constraints
) -> tuple[MethodResult, ...]:
    """Evaluate fixed, conventional adaptive and Br AI planning."""
    methods: list[MethodResult] = [
        _evaluate(_fixed_schedule(profile, constraints), batch, profile, constraints),
        _evaluate(
            _conventional_adaptive(profile, constraints), batch, profile, constraints
        ),
    ]

    plan, outcome = build_plan(batch, profile, constraints, planner_label='optimizer')
    if outcome.best is not None:
        methods.append(
            MethodResult(
                method='Br AI',
                status=plan.validation.status,
                result=plan.predicted,
                validated=plan.validation.passed,
                note=plan.validation.summary,
            )
        )
    else:
        methods.append(
            MethodResult(
                method='Br AI',
                status=PlanStatus.NO_FEASIBLE_PLAN,
                result=plan.predicted,
                validated=False,
                note=plan.validation.summary,
            )
        )
    return tuple(methods)
