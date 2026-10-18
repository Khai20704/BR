"""Pure domain models. Units are part of every field name: kg, kW, kWh,
minutes, degrees Celsius, wet-basis moisture fraction (0..1). No I/O here."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class PlanStatus(StrEnum):
    """Decision state reported to a client. Never implies physical validation."""

    VALIDATED = "VALIDATED"
    NEED_MORE_DATA = "NEED_MORE_DATA"
    NO_FEASIBLE_PLAN = "NO_FEASIBLE_PLAN"
    NOT_VALIDATED = "NOT_VALIDATED"


@dataclass(frozen=True, slots=True)
class Material:
    """Thin-layer drying properties. Values are property data, not results."""

    material_id: str
    name: str
    reference_rate_per_hour: float
    activation_energy_j_per_mol: float
    equilibrium_moisture_wb: float
    max_safe_temperature_c: float
    specific_heat_j_per_kgk: float


@dataclass(frozen=True, slots=True)
class Batch:
    """A batch of wet material to be dried."""

    batch_id: str
    material: Material
    mass_kg: float
    initial_moisture_wb: float
    target_moisture_wb: float


@dataclass(frozen=True, slots=True)
class ThermalSample:
    """One interval of available waste heat."""

    minute: int
    temperature_c: float
    available_heat_kw: float
    relative_humidity: float


@dataclass(frozen=True, slots=True)
class ThermalProfile:
    """A measured or supplied heat source window, sampled in order."""

    source_id: str
    name: str
    samples: tuple[ThermalSample, ...]


@dataclass(frozen=True, slots=True)
class Constraints:
    """Operating limits that any plan must respect."""

    max_duration_minutes: int
    min_temperature_c: float
    max_temperature_c: float
    min_relative_humidity: float = 0.2
    max_relative_humidity: float = 0.85


@dataclass(frozen=True, slots=True)
class SchedulePhase:
    """A constant-temperature hold within a drying schedule."""

    temperature_c: float
    duration_minutes: int


@dataclass(frozen=True, slots=True)
class DryingPoint:
    """A sampled trajectory point; produced only by the simulation engine."""

    minute: int
    moisture_wb: float
    temperature_c: float
    water_removed_kg: float
    energy_kwh: float


@dataclass(frozen=True, slots=True)
class SimulationResult:
    """Outcome of integrating a schedule against a thermal window."""

    points: tuple[DryingPoint, ...]
    final_moisture_wb: float
    duration_minutes: int
    water_removed_kg: float
    energy_kwh: float
    minimum_energy_kwh: float
    model_version: str
    notes: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class ValidationCheck:
    """One independently recomputed invariant."""

    code: str
    passed: bool
    detail: str


@dataclass(frozen=True, slots=True)
class ValidationReport:
    """Result of the independent validator, separate from the optimizer."""

    status: PlanStatus
    checks: tuple[ValidationCheck, ...]
    summary: str

    @property
    def passed(self) -> bool:
        return self.status is PlanStatus.VALIDATED


@dataclass(frozen=True, slots=True)
class Plan:
    """A proposed schedule plus its prediction and independent validation."""

    plan_id: str
    batch_id: str
    phases: tuple[SchedulePhase, ...]
    predicted: SimulationResult
    validation: ValidationReport
    rationale: tuple[str, ...] = ()
    metadata: dict[str, str] = field(default_factory=dict)
