"""Tool functions exposed to the Gemini agent.

Every tool is a thin, read-only wrapper over the deterministic engine. The agent
can inspect the scenario, simulate a candidate and read the plan verdict, but it
cannot write a phase, an energy figure or a validation status itself.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

from ..domain.models import (
    Batch,
    Constraints,
    SchedulePhase,
    ThermalProfile,
)
from ..domain.physics.drying import simulate
from ..services.planning_service import build_plan


@dataclass(frozen=True, slots=True)
class Scenario:
    """The scenario a single agent session may inspect."""

    batch: Batch
    profile: ThermalProfile
    constraints: Constraints


def thermal_window_summary(scenario: Scenario) -> dict[str, Any]:
    """Summarise the available waste heat: temperatures, heat and window length."""
    samples = scenario.profile.samples
    temperatures = [sample.temperature_c for sample in samples]
    heats = [sample.available_heat_kw for sample in samples]
    return {
        'source_id': scenario.profile.source_id,
        'name': scenario.profile.name,
        'window_minutes': samples[-1].minute - samples[0].minute,
        'min_temperature_c': min(temperatures),
        'max_temperature_c': max(temperatures),
        'mean_heat_kw': round(sum(heats) / len(heats), 4),
    }


def batch_summary(scenario: Scenario) -> dict[str, Any]:
    """Summarise the batch duty: mass, moisture and material limits."""
    batch = scenario.batch
    return {
        'batch_id': batch.batch_id,
        'material': batch.material.name,
        'mass_kg': batch.mass_kg,
        'initial_moisture_percent_wb': round(
            batch.initial_moisture_wb * 100.0, 3
        ),
        'target_moisture_percent_wb': round(
            batch.target_moisture_wb * 100.0, 3
        ),
        'max_safe_temperature_c': batch.material.max_safe_temperature_c,
        'max_duration_minutes': scenario.constraints.max_duration_minutes,
    }


def simulate_schedule(
    scenario: Scenario, temperature_c: float, duration_minutes: int
) -> dict[str, Any]:
    """Simulate one constant-temperature hold and return the predicted result."""
    phases = (
        SchedulePhase(
            temperature_c=temperature_c,
            duration_minutes=duration_minutes,
        ),
    )
    result = simulate(scenario.profile, scenario.batch, scenario.constraints, phases)
    return {
        'temperature_c': temperature_c,
        'duration_minutes': result.duration_minutes,
        'final_moisture_percent_wb': round(result.final_moisture_wb * 100.0, 4),
        'water_removed_kg': round(result.water_removed_kg, 6),
        'energy_kwh': round(result.energy_kwh, 6),
        'target_reached': result.final_moisture_wb
        <= scenario.batch.target_moisture_wb,
        'notes': list(result.notes),
    }


def validated_plan_summary(scenario: Scenario) -> dict[str, Any]:
    """Return the optimizer's plan with its independent validation verdict."""
    plan, _ = build_plan(scenario.batch, scenario.profile, scenario.constraints)
    return {
        'plan_id': plan.plan_id,
        'validation_status': str(plan.validation.status),
        'summary': plan.validation.summary,
        'phases': [
            {
                'temperature_c': phase.temperature_c,
                'duration_minutes': phase.duration_minutes,
            }
            for phase in plan.phases
        ],
        'energy_kwh': round(plan.predicted.energy_kwh, 6),
        'final_moisture_percent_wb': round(
            plan.predicted.final_moisture_wb * 100.0, 4
        ),
        'rationale': list(plan.rationale),
    }


def build_tool_table(scenario: Scenario) -> dict[str, Callable[..., dict[str, Any]]]:
    """Bind the typed tools to one scenario for an agent session.

    The table is built from ``ScenarioToolbox`` so that the agent has exactly
    one tool definition path: lambdas have no annotations, and the Gemini SDK
    rejects them with "Failed to parse the parameter ..." at declaration time.
    The import is local because the toolbox wraps this module.
    """
    from .scenario_toolbox import ScenarioToolbox

    return ScenarioToolbox(scenario).handlers()
