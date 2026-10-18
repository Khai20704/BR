"""Read-only workspace endpoints over the documented demo scenario.

These routes let the UI fetch one coherent, engine-computed snapshot of the
spent-coffee-grounds scenario. The values describe a documented default
scenario, not a measurement of any real dryer, and every payload says so.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from ..agents.tools import Scenario
from ..domain.models import Constraints
from ..domain.physics.drying import MODEL_VERSION
from ..domain.physics.mass_balance import compute_mass_balance
from ..services.benchmark_service import MethodResult, run_benchmark
from ..services.planning_service import PlanUnavailableError, build_plan
from ..services.replanning_service import replan
from ..services.scenarios import default_scenario
from .envelopes import NarrativeOut
from .responses import (
    BenchmarkMethodOut,
    BenchmarkOut,
    PlanOut,
    SimulationOut,
    plan_out,
    simulation_out,
)
from .routes_engineering import narrative_out

router = APIRouter()

PROVENANCE: dict[str, str | bool] = {
    'source': 'documented-default-scenario',
    'model_version': MODEL_VERSION,
    'is_measurement': False,
}


class ThermalWindowPointOut(BaseModel):
    minute: int
    temperature_c: float
    available_heat_kw: float


class ThermalWindowOut(BaseModel):
    source_id: str
    name: str
    points: list[ThermalWindowPointOut]
    provenance: dict[str, str | bool]


class MassBalanceSummaryOut(BaseModel):
    dry_solids_kg: float
    initial_water_kg: float
    final_water_kg: float
    initial_mass_kg: float
    final_mass_kg: float
    water_to_remove_kg: float
    minimum_energy_kwh: float
    temperature_c: float
    provenance: dict[str, str | bool]


class PlanSnapshotOut(BaseModel):
    plan: PlanOut
    narrative: NarrativeOut
    provenance: dict[str, str | bool]


class ReplanSummaryOut(BaseModel):
    reason_codes: list[str]
    remaining_minutes: int
    changed_temperature_c: float
    plan: PlanOut
    narrative: NarrativeOut
    provenance: dict[str, str | bool]


def _unavailable(error: Exception) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)
    )


def _scenario() -> Scenario:
    batch, profile, constraints = default_scenario()
    return Scenario(batch=batch, profile=profile, constraints=constraints)


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


@router.get('/thermal-window', response_model=ThermalWindowOut)
def thermal_window() -> ThermalWindowOut:
    """The demo waste-heat window, one interval per hour."""
    _, profile, _ = default_scenario()
    return ThermalWindowOut(
        source_id=profile.source_id,
        name=profile.name,
        points=[
            ThermalWindowPointOut(
                minute=sample.minute,
                temperature_c=sample.temperature_c,
                available_heat_kw=sample.available_heat_kw,
            )
            for sample in profile.samples
        ],
        provenance=dict(PROVENANCE),
    )


@router.get('/mass-balance', response_model=MassBalanceSummaryOut)
def mass_balance_summary() -> MassBalanceSummaryOut:
    """Water duty and energy floor for the demo batch."""
    batch, _, constraints = default_scenario()
    try:
        balance = compute_mass_balance(
            batch, batch.material, constraints.max_temperature_c
        )
    except ValueError as error:
        raise _unavailable(error) from error
    return MassBalanceSummaryOut(
        dry_solids_kg=round(balance.dry_solids_kg, 6),
        initial_water_kg=round(balance.initial_water_kg, 6),
        final_water_kg=round(balance.final_water_kg, 6),
        initial_mass_kg=round(balance.initial_mass_kg, 6),
        final_mass_kg=round(balance.final_mass_kg, 6),
        water_to_remove_kg=round(balance.water_to_remove_kg, 6),
        minimum_energy_kwh=round(balance.minimum_energy_kwh, 6),
        temperature_c=constraints.max_temperature_c,
        provenance=dict(PROVENANCE),
    )


@router.get('/simulation', response_model=SimulationOut)
def default_simulation() -> SimulationOut:
    """Trajectory of the optimized schedule for the demo scenario."""
    batch, profile, constraints = default_scenario()
    try:
        plan, _ = build_plan(batch, profile, constraints)
    except (ValueError, PlanUnavailableError) as error:
        raise _unavailable(error) from error
    return simulation_out(plan.predicted)


@router.get('/plan', response_model=PlanSnapshotOut)
def default_plan() -> PlanSnapshotOut:
    """The demo plan with its validation verdict and narrative trace."""
    scenario = _scenario()
    try:
        plan, _ = build_plan(
            scenario.batch, scenario.profile, scenario.constraints
        )
    except (ValueError, PlanUnavailableError) as error:
        raise _unavailable(error) from error
    return PlanSnapshotOut(
        plan=plan_out(plan),
        narrative=narrative_out(scenario),
        provenance=dict(PROVENANCE),
    )


@router.get('/replanning', response_model=ReplanSummaryOut)
def default_replanning(temperature_c: float = 42.0) -> ReplanSummaryOut:
    """Replan the demo scenario as if the source settled at another temperature."""
    scenario = _scenario()
    try:
        outcome = replan(
            scenario.batch,
            scenario.profile,
            scenario.constraints,
            temperature_c,
        )
    except (ValueError, PlanUnavailableError) as error:
        raise _unavailable(error) from error

    replanned = Scenario(
        batch=scenario.batch,
        profile=scenario.profile,
        constraints=Constraints(
            max_duration_minutes=max(outcome.remaining_minutes, 1),
            min_temperature_c=scenario.constraints.min_temperature_c,
            max_temperature_c=scenario.constraints.max_temperature_c,
            min_relative_humidity=scenario.constraints.min_relative_humidity,
            max_relative_humidity=scenario.constraints.max_relative_humidity,
        ),
    )
    return ReplanSummaryOut(
        reason_codes=list(outcome.reason_codes),
        remaining_minutes=outcome.remaining_minutes,
        changed_temperature_c=outcome.changed_temperature_c,
        plan=plan_out(outcome.plan),
        narrative=narrative_out(replanned),
        provenance=dict(PROVENANCE),
    )


@router.get('/benchmark', response_model=BenchmarkOut)
def default_benchmark() -> BenchmarkOut:
    """Three-way comparison on the demo scenario."""
    batch, profile, constraints = default_scenario()
    try:
        methods = run_benchmark(batch, profile, constraints)
    except (ValueError, PlanUnavailableError) as error:
        raise _unavailable(error) from error
    return BenchmarkOut(
        scenario_id=batch.batch_id,
        model_version=MODEL_VERSION,
        methods=[_method_out(method) for method in methods],
        notes=[
            'Shared scenario: every method used the same engine and validator.',
            'Model predictions, not measurements.',
        ],
    )
