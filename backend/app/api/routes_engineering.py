"""Engineering endpoints: physics, simulation, planning, replanning, benchmark.

Every number returned here is produced by the deterministic engine and then
re-checked by the independent validator. The Gemini agent only contributes the
narrative, and is clearly labelled as such.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from ..agents.gemini_planner import _deterministic, is_configured, narrate_plan
from ..agents.tools import Scenario
from ..domain.models import Constraints, Plan
from ..domain.physics.drying import MODEL_VERSION, simulate
from ..domain.physics.mass_balance import compute_mass_balance
from ..services.benchmark_service import MethodResult, run_benchmark
from ..services.planning_service import (
    PlanUnavailableError,
    build_plan,
    candidate_summaries,
)
from ..services.replanning_service import apply_thermal_change, replan
from dataclasses import replace
from .envelopes import (
    MassBalanceOut,
    NarrativeOut,
    PlanEnvelopeOut,
    ReplanEnvelopeOut,
    ToolCallOut,
)
from .responses import (
    BenchmarkMethodOut,
    BenchmarkOut,
    HealthOut,
    SimulationOut,
    plan_out,
    simulation_out,
)
from .schemas import (
    BenchmarkRequest,
    PlanRequest,
    ReplanRequest,
    ScenarioIn,
    SimulationRequest,
    to_batch,
    to_constraints,
    to_phases,
    to_profile,
)

router = APIRouter()


def _scenario(body: ScenarioIn) -> Scenario:
    """Map a transport payload to domain objects, rejecting bad inputs."""
    try:
        batch = to_batch(body.batch)
        profile = to_profile(body.profile)
        constraints = to_constraints(body.constraints)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)
        ) from error
    return Scenario(batch=batch, profile=profile, constraints=constraints)


def narrative_out(scenario: Scenario, *, deterministic: bool = False) -> NarrativeOut:
    """Narration plus the tools the model actually executed, if any."""
    narrative = _deterministic(scenario) if deterministic else narrate_plan(scenario)
    return NarrativeOut(
        text=narrative.text,
        provider=narrative.provider,
        verification=narrative.verification,
        tool_calls=list(narrative.tool_calls),
        tool_trace=[
            ToolCallOut(
                name=call.name,
                arguments=call.arguments,
                ok=call.ok,
                detail=call.detail,
            )
            for call in narrative.tool_trace
        ],
    )


def _plan_envelope(
    plan: Plan, candidates: list[dict[str, object]], scenario: Scenario
) -> PlanEnvelopeOut:
    return PlanEnvelopeOut(
        plan=plan_out(plan),
        candidates=candidates,
        narrative=narrative_out(scenario),
    )


def _build(body: ScenarioIn, label: str) -> PlanEnvelopeOut:
    scenario = _scenario(body)
    try:
        plan, outcome = build_plan(
            scenario.batch, scenario.profile, scenario.constraints, label
        )
    except (ValueError, PlanUnavailableError) as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)
        ) from error
    return _plan_envelope(plan, candidate_summaries(outcome), scenario)


def _method_out(method: MethodResult) -> BenchmarkMethodOut:
    result = method.result
    return BenchmarkMethodOut(
        method=method.method,
        status=method.status,
        duration_minutes=result.duration_minutes if result else None,
        energy_kwh=round(result.energy_kwh, 6) if result else None,
        final_moisture_percent_wb=(
            round(result.final_moisture_wb * 100.0, 4) if result else None
        ),
        validated=method.validated,
        note=method.note,
    )


@router.get('/health', response_model=HealthOut, tags=['system'])
def health() -> HealthOut:
    """Liveness plus the two facts a client needs to trust the response."""
    return HealthOut(
        status='ok', model_version=MODEL_VERSION, gemini_configured=is_configured()
    )


@router.post(
    '/physics/mass-balance',
    response_model=MassBalanceOut,
    tags=['physics'],
)
def mass_balance(body: PlanRequest) -> MassBalanceOut:
    """Dry-solids bookkeeping and the thermodynamic energy floor."""
    scenario = _scenario(body)
    try:
        balance = compute_mass_balance(
            scenario.batch,
            scenario.batch.material,
            scenario.constraints.max_temperature_c,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)
        ) from error
    return MassBalanceOut(
        dry_solids_kg=round(balance.dry_solids_kg, 6),
        initial_water_kg=round(balance.initial_water_kg, 6),
        final_water_kg=round(balance.final_water_kg, 6),
        initial_mass_kg=round(balance.initial_mass_kg, 6),
        final_mass_kg=round(balance.final_mass_kg, 6),
        water_to_remove_kg=round(balance.water_to_remove_kg, 6),
        minimum_energy_kwh=round(balance.minimum_energy_kwh, 6),
        temperature_c=scenario.constraints.max_temperature_c,
    )


@router.post('/simulations', response_model=SimulationOut, tags=['simulation'])
def run_simulation(body: SimulationRequest) -> SimulationOut:
    """Integrate an explicit schedule, or the optimized one when omitted."""
    scenario = _scenario(body)
    try:
        if body.phases:
            result = simulate(
                scenario.profile,
                scenario.batch,
                scenario.constraints,
                to_phases(body.phases),
            )
        else:
            plan, _ = build_plan(
                scenario.batch, scenario.profile, scenario.constraints
            )
            result = plan.predicted
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)
        ) from error
    return simulation_out(result)


@router.post('/plans', response_model=PlanEnvelopeOut, tags=['planning'])
def create_plan(body: PlanRequest) -> PlanEnvelopeOut:
    """Optimize, validate independently, then explain the chosen schedule."""
    return _build(body, 'deterministic')


@router.post(
    '/plans/replan', response_model=ReplanEnvelopeOut, tags=['planning']
)
def replan_plan(body: ReplanRequest) -> ReplanEnvelopeOut:
    """Re-optimize the remaining window after the heat source changes."""
    scenario = _scenario(body)
    try:
        outcome = replan(
            scenario.batch,
            scenario.profile,
            scenario.constraints,
            body.changed_temperature_c,
            body.elapsed_minutes,
        )
    except (ValueError, PlanUnavailableError) as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)
        ) from error

    changed_profile = apply_thermal_change(scenario.profile, body.changed_temperature_c, body.elapsed_minutes)
    start = min(body.elapsed_minutes, changed_profile.samples[-1].minute)
    remaining_profile = replace(changed_profile, samples=tuple(
        replace(sample, minute=sample.minute - start)
        for sample in changed_profile.samples if sample.minute >= start
    ))
    updated = Scenario(
        batch=scenario.batch,
        profile=remaining_profile,
        constraints=Constraints(
            max_duration_minutes=max(outcome.remaining_minutes, 1),
            min_temperature_c=scenario.constraints.min_temperature_c,
            max_temperature_c=scenario.constraints.max_temperature_c,
            min_relative_humidity=scenario.constraints.min_relative_humidity,
            max_relative_humidity=scenario.constraints.max_relative_humidity,
        ),
    )
    return ReplanEnvelopeOut(
        plan=plan_out(outcome.plan),
        reason_codes=list(outcome.reason_codes),
        remaining_minutes=outcome.remaining_minutes,
        changed_temperature_c=outcome.changed_temperature_c,
        narrative=narrative_out(updated, deterministic=True),
    )


@router.post('/benchmark', response_model=BenchmarkOut, tags=['benchmark'])
def benchmark(body: BenchmarkRequest) -> BenchmarkOut:
    """Compare fixed, conventional adaptive and optimizer schedules."""
    scenario = _scenario(body)
    try:
        methods = run_benchmark(
            scenario.batch, scenario.profile, scenario.constraints
        )
    except (ValueError, PlanUnavailableError) as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)
        ) from error
    return BenchmarkOut(
        scenario_id=scenario.batch.batch_id,
        model_version=MODEL_VERSION,
        methods=[_method_out(method) for method in methods],
        notes=[
            'All three methods were integrated with the same engine and '
            'checked by the same independent validator.',
            'Predictions are model output, not measurements.',
        ],
    )
