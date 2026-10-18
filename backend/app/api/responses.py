"""Response schemas and domain-to-wire mapping."""

from __future__ import annotations

from pydantic import BaseModel

from ..domain.models import (
    DryingPoint,
    Plan,
    PlanStatus,
    SimulationResult,
    ValidationReport,
)


class DryingPointOut(BaseModel):
    minute: int
    moisture_percent_wb: float
    temperature_c: float
    water_removed_kg: float
    energy_kwh: float


class SimulationOut(BaseModel):
    final_moisture_percent_wb: float
    duration_minutes: int
    water_removed_kg: float
    energy_kwh: float
    minimum_energy_kwh: float
    model_version: str
    notes: list[str]
    points: list[DryingPointOut]
    target_moisture_percent_wb: float | None = None
    target_achieved: bool | None = None
    validation: ValidationOut | None = None


class ValidationCheckOut(BaseModel):
    code: str
    passed: bool
    detail: str


class ValidationOut(BaseModel):
    status: PlanStatus
    summary: str
    checks: list[ValidationCheckOut]


class PhaseOut(BaseModel):
    temperature_c: float
    duration_minutes: int


class PlanOut(BaseModel):
    plan_id: str
    batch_id: str
    status: PlanStatus
    phases: list[PhaseOut]
    predicted: SimulationOut | None
    validation: ValidationOut
    rationale: list[str]
    metadata: dict[str, str]


class CandidateOut(BaseModel):
    name: str
    rationale: str
    feasible: bool
    energy_kwh: float | None
    final_moisture_percent_wb: float


class BenchmarkMethodOut(BaseModel):
    method: str
    status: PlanStatus
    duration_minutes: int | None
    energy_kwh: float | None
    final_moisture_percent_wb: float | None
    validated: bool
    note: str


class BenchmarkOut(BaseModel):
    scenario_id: str
    model_version: str
    methods: list[BenchmarkMethodOut]
    notes: list[str]


class HealthOut(BaseModel):
    status: str
    model_version: str
    gemini_configured: bool


class ThermalSeriesPointOut(BaseModel):
    minute: int
    temperature_c: float
    available_heat_kw: float


class ThermalSeriesOut(BaseModel):
    source_id: str
    name: str
    points: list[ThermalSeriesPointOut]


def point_out(point: DryingPoint) -> DryingPointOut:
    return DryingPointOut(
        minute=point.minute,
        moisture_percent_wb=round(point.moisture_wb * 100.0, 4),
        temperature_c=round(point.temperature_c, 3),
        water_removed_kg=round(point.water_removed_kg, 6),
        energy_kwh=round(point.energy_kwh, 6),
    )


def simulation_out(result: SimulationResult) -> SimulationOut:
    return SimulationOut(
        final_moisture_percent_wb=round(result.final_moisture_wb * 100.0, 4),
        duration_minutes=result.duration_minutes,
        water_removed_kg=round(result.water_removed_kg, 6),
        energy_kwh=round(result.energy_kwh, 6),
        minimum_energy_kwh=round(result.minimum_energy_kwh, 6),
        model_version=result.model_version,
        notes=list(result.notes),
        points=[point_out(point) for point in result.points],
    )


def validation_out(report: ValidationReport) -> ValidationOut:
    return ValidationOut(
        status=report.status,
        summary=report.summary,
        checks=[
            ValidationCheckOut(
                code=check.code, passed=check.passed, detail=check.detail
            )
            for check in report.checks
        ],
    )


def plan_out(plan: Plan) -> PlanOut:
    return PlanOut(
        plan_id=plan.plan_id,
        batch_id=plan.batch_id,
        status=plan.validation.status,
        phases=[
            PhaseOut(
                temperature_c=phase.temperature_c,
                duration_minutes=phase.duration_minutes,
            )
            for phase in plan.phases
        ],
        predicted=simulation_out(plan.predicted) if plan.predicted else None,
        validation=validation_out(plan.validation),
        rationale=list(plan.rationale),
        metadata=dict(plan.metadata),
    )


def thermal_series_out(
    source_id: str, name: str, samples: list[ThermalSeriesPointOut]
) -> ThermalSeriesOut:
    return ThermalSeriesOut(source_id=source_id, name=name, points=samples)
