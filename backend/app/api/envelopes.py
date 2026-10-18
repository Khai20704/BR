"""Envelope schemas that wrap plans together with their supporting evidence."""

from __future__ import annotations

from pydantic import BaseModel, Field

from .responses import CandidateOut, PlanOut


class MassBalanceOut(BaseModel):
    dry_solids_kg: float
    initial_water_kg: float
    final_water_kg: float
    initial_mass_kg: float
    final_mass_kg: float
    water_to_remove_kg: float
    minimum_energy_kwh: float
    temperature_c: float


class ToolCallOut(BaseModel):
    """One tool invocation actually performed by the model."""

    name: str
    arguments: str
    ok: bool
    detail: str


class NarrativeOut(BaseModel):
    text: str
    provider: str
    verification: str
    tool_calls: list[str] = Field(default_factory=list)
    tool_trace: list[ToolCallOut] = Field(default_factory=list)


class PlanEnvelopeOut(BaseModel):
    plan: PlanOut
    candidates: list[CandidateOut]
    narrative: NarrativeOut


class ReplanEnvelopeOut(BaseModel):
    plan: PlanOut
    reason_codes: list[str]
    remaining_minutes: int
    changed_temperature_c: float
    narrative: NarrativeOut
