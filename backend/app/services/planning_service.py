"""Plan assembly: optimize, validate independently, then attach rationale.

The planner never invents numbers. The Gemini agent may only read a computed
scenario through tools and produce narrative text; phases, energies and
moisture values always come from the deterministic engine.
"""

from __future__ import annotations

from dataclasses import replace
from uuid import uuid4

from ..domain.models import (
    Batch,
    Constraints,
    Plan,
    PlanStatus,
    ThermalProfile,
)
from ..domain.optimizer.optimizer import OptimizationOutcome, optimize
from ..domain.validator.plan_validator import validate_plan


class PlanUnavailableError(ValueError):
    """Raised when the inputs cannot produce even a best-effort plan."""


def _new_plan_id() -> str:
    return f'plan-{uuid4().hex[:12]}'


def build_plan(
    batch: Batch,
    profile: ThermalProfile,
    constraints: Constraints,
    planner_label: str = 'deterministic',
) -> tuple[Plan, OptimizationOutcome]:
    """Optimize a schedule and validate it independently."""
    outcome = optimize(profile, batch, constraints)

    if outcome.best is not None:
        chosen = outcome.best
    elif outcome.candidates:
        chosen = outcome.candidates[0]
    else:
        raise PlanUnavailableError(
            'No candidate schedule could be evaluated for this scenario.'
        )

    report = validate_plan(
        profile, batch, constraints, chosen.schedule.phases, chosen.result
    )
    if not chosen.feasible:
        report = replace(
            report,
            status=PlanStatus.NO_FEASIBLE_PLAN,
            summary=(
                'Target moisture was not reached; independent checks are '
                'reported for the best available attempt.'
            ),
        )

    rationale = list(outcome.rationale)
    if report.status is PlanStatus.VALIDATED:
        rationale.append(
            'An independent fine-step re-integration confirmed the target with '
            'the reported energy.'
        )

    plan = Plan(
        plan_id=_new_plan_id(),
        batch_id=batch.batch_id,
        phases=chosen.schedule.phases,
        predicted=chosen.result,
        validation=report,
        rationale=tuple(rationale),
        metadata={
            'planner': planner_label,
            'strategy': chosen.schedule.name,
            'objective': 'energy_kwh',
            'model_version': chosen.result.model_version,
            'material': batch.material.name,
        },
    )
    return plan, outcome


def candidate_summaries(outcome: OptimizationOutcome) -> list[dict[str, object]]:
    """Compact view of every evaluated candidate for API consumers."""
    return [
        {
            'name': item.schedule.name,
            'rationale': item.schedule.rationale,
            'feasible': item.feasible,
            'energy_kwh': round(item.result.energy_kwh, 6),
            'final_moisture_percent_wb': round(
                item.result.final_moisture_wb * 100.0, 4
            ),
        }
        for item in outcome.candidates
    ]
