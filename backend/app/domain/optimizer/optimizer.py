"""Deterministic schedule optimization.

Every candidate is simulated with the same engine the API exposes, then ranked
on consumed energy. Feasibility means the predicted final moisture reaches the
target inside the operating window. The optimizer never validates its own
output: that belongs to the independent validator.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..models import (
    Batch,
    Constraints,
    PlanStatus,
    SimulationResult,
    ThermalProfile,
)
from ..physics.drying import simulate
from .schedules import CandidateSchedule, candidate_schedules

MOISTURE_TOLERANCE = 1e-6
OBJECTIVE_NAME = 'energy_kwh'


@dataclass(frozen=True, slots=True)
class EvaluatedCandidate:
    """One candidate with its prediction and feasibility verdict."""

    schedule: CandidateSchedule
    result: SimulationResult
    feasible: bool

    @property
    def objective_value(self) -> float:
        """Lower is better. Infeasible candidates rank last."""
        return self.result.energy_kwh if self.feasible else float('inf')


@dataclass(frozen=True, slots=True)
class OptimizationOutcome:
    """The complete candidate evaluation, with the chosen schedule if any."""

    status: PlanStatus
    best: EvaluatedCandidate | None
    candidates: tuple[EvaluatedCandidate, ...]
    rationale: tuple[str, ...]


def _is_feasible(result: SimulationResult, batch: Batch) -> bool:
    reached_target = (
        result.final_moisture_wb <= batch.target_moisture_wb + MOISTURE_TOLERANCE
    )
    return reached_target


def evaluate_candidates(
    profile: ThermalProfile,
    batch: Batch,
    constraints: Constraints,
    schedules: tuple[CandidateSchedule, ...] | None = None,
) -> tuple[EvaluatedCandidate, ...]:
    """Simulate each candidate schedule once."""
    chosen = schedules or candidate_schedules(
        profile, constraints, batch.material
    )
    return tuple(
        EvaluatedCandidate(
            schedule=schedule,
            result=simulate(profile, batch, constraints, schedule.phases),
            feasible=False,
        )
        for schedule in chosen
    )


def optimize(
    profile: ThermalProfile,
    batch: Batch,
    constraints: Constraints,
) -> OptimizationOutcome:
    """Rank candidates on energy and return the best feasible schedule."""
    if not profile.samples:
        return OptimizationOutcome(
            status=PlanStatus.NEED_MORE_DATA,
            best=None,
            candidates=(),
            rationale=('No thermal profile samples were supplied.',),
        )

    raw = evaluate_candidates(profile, batch, constraints)
    evaluated = tuple(
        EvaluatedCandidate(
            schedule=item.schedule,
            result=item.result,
            feasible=_is_feasible(item.result, batch),
        )
        for item in raw
    )
    ranked = tuple(
        sorted(evaluated, key=lambda item: (item.objective_value, item.result.duration_minutes))
    )

    feasible = tuple(item for item in ranked if item.feasible)
    if not feasible:
        best_effort = ranked[0] if ranked else None
        detail = (
            f' best attempt reached {best_effort.result.final_moisture_wb:.3f} '
            f'wet basis against a {batch.target_moisture_wb:.3f} target.'
            if best_effort
            else ''
        )
        return OptimizationOutcome(
            status=PlanStatus.NO_FEASIBLE_PLAN,
            best=None,
            candidates=ranked,
            rationale=(
                'No candidate reached the target moisture inside the window.' + detail,
            ),
        )

    best = feasible[0]
    rationale = [
        best.schedule.rationale,
        (
            f'Lowest predicted energy among {len(feasible)} feasible candidate(s): '
            f'{best.result.energy_kwh:.3f} kWh, {best.result.duration_minutes} minutes.'
        ),
    ]
    if best.result.minimum_energy_kwh > 0.0:
        ratio = best.result.energy_kwh / best.result.minimum_energy_kwh
        rationale.append(
            'Predicted energy is '
            f'{ratio:.2f}x the latent-heat floor of '
            f'{best.result.minimum_energy_kwh:.3f} kWh.'
        )
    return OptimizationOutcome(
        status=PlanStatus.NOT_VALIDATED,
        best=best,
        candidates=ranked,
        rationale=tuple(rationale),
    )
