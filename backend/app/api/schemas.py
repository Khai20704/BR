"""Transport schemas (Pydantic) and their mapping to domain types.

Field names carry units. Moisture crosses the wire as a percentage on a wet
basis for readability and is converted to a fraction at the boundary.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from ..domain.models import (
    Batch,
    Constraints,
    Material,
    SchedulePhase,
    ThermalProfile,
    ThermalSample,
)


class MaterialIn(BaseModel):
    material_id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=120)
    reference_rate_per_hour: float = Field(gt=0.0, le=50.0)
    activation_energy_j_per_mol: float = Field(gt=0.0, le=200_000.0)
    equilibrium_moisture_percent_wb: float = Field(ge=0.0, lt=100.0)
    max_safe_temperature_c: float = Field(ge=0.0, le=200.0)
    specific_heat_j_per_kgk: float = Field(gt=0.0, le=10_000.0)


class BatchIn(BaseModel):
    batch_id: str = Field(min_length=1, max_length=64)
    material: MaterialIn
    mass_kg: float = Field(gt=0.0, le=100_000.0)
    initial_moisture_percent_wb: float = Field(gt=0.0, lt=100.0)
    target_moisture_percent_wb: float = Field(gt=0.0, lt=100.0)


class ThermalSampleIn(BaseModel):
    minute: int = Field(ge=0, le=100_000)
    temperature_c: float = Field(ge=-20.0, le=200.0)
    available_heat_kw: float = Field(ge=0.0, le=10_000.0)
    relative_humidity: float = Field(ge=0.0, le=1.0)


class ThermalProfileIn(BaseModel):
    source_id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=120)
    samples: list[ThermalSampleIn] = Field(min_length=1)


class ConstraintsIn(BaseModel):
    max_duration_minutes: int = Field(ge=1, le=10_080)
    min_temperature_c: float = Field(ge=0.0, le=200.0)
    max_temperature_c: float = Field(ge=0.0, le=200.0)
    max_relative_humidity: float = Field(default=0.85, ge=0.0, le=1.0)


class SchedulePhaseIn(BaseModel):
    temperature_c: float = Field(ge=0.0, le=200.0)
    duration_minutes: int = Field(ge=1, le=10_080)


class ScenarioIn(BaseModel):
    batch: BatchIn
    profile: ThermalProfileIn
    constraints: ConstraintsIn


class SimulationRequest(ScenarioIn):
    phases: list[SchedulePhaseIn] | None = None


class PlanRequest(ScenarioIn):
    pass


class ReplanRequest(ScenarioIn):
    changed_temperature_c: float = Field(ge=-20.0, le=200.0)
    elapsed_minutes: int = Field(default=0, ge=0, le=10_080)


class BenchmarkRequest(ScenarioIn):
    pass


def to_material(model: MaterialIn) -> Material:
    return Material(
        material_id=model.material_id,
        name=model.name,
        reference_rate_per_hour=model.reference_rate_per_hour,
        activation_energy_j_per_mol=model.activation_energy_j_per_mol,
        equilibrium_moisture_wb=model.equilibrium_moisture_percent_wb / 100.0,
        max_safe_temperature_c=model.max_safe_temperature_c,
        specific_heat_j_per_kgk=model.specific_heat_j_per_kgk,
    )


def to_batch(model: BatchIn) -> Batch:
    return Batch(
        batch_id=model.batch_id,
        material=to_material(model.material),
        mass_kg=model.mass_kg,
        initial_moisture_wb=model.initial_moisture_percent_wb / 100.0,
        target_moisture_wb=model.target_moisture_percent_wb / 100.0,
    )


def to_profile(model: ThermalProfileIn) -> ThermalProfile:
    ordered = sorted(model.samples, key=lambda sample: sample.minute)
    return ThermalProfile(
        source_id=model.source_id,
        name=model.name,
        samples=tuple(
            ThermalSample(
                minute=sample.minute,
                temperature_c=sample.temperature_c,
                available_heat_kw=sample.available_heat_kw,
                relative_humidity=sample.relative_humidity,
            )
            for sample in ordered
        ),
    )


def to_constraints(model: ConstraintsIn) -> Constraints:
    if model.min_temperature_c >= model.max_temperature_c:
        raise ValueError('min_temperature_c must be below max_temperature_c.')
    return Constraints(
        max_duration_minutes=model.max_duration_minutes,
        min_temperature_c=model.min_temperature_c,
        max_temperature_c=model.max_temperature_c,
        max_relative_humidity=model.max_relative_humidity,
    )


def to_phases(items: list[SchedulePhaseIn]) -> tuple[SchedulePhase, ...]:
    return tuple(
        SchedulePhase(
            temperature_c=item.temperature_c,
            duration_minutes=item.duration_minutes,
        )
        for item in items
    )
