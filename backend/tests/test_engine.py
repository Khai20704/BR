"""Engine tests: conservation, simulation sanity and validator independence."""

from __future__ import annotations

from dataclasses import replace

import pytest

from app.agents.gemini_planner import narrate_plan
from app.agents.tools import Scenario
from app.domain.models import (
    PlanStatus,
    SchedulePhase,
    ThermalProfile,
    ThermalSample,
)
from app.domain.optimizer.schedules import candidate_schedules
from app.domain.physics.drying import simulate
from app.domain.physics.mass_balance import (
    compute_mass_balance,
    dry_to_wet_basis,
    wet_to_dry_basis,
)
from app.domain.validator.plan_validator import validate_plan
from app.services.planning_service import build_plan
from app.services.replanning_service import replan
from app.services.scenarios import default_scenario


@pytest.fixture()
def scenario() -> Scenario:
    batch, profile, constraints = default_scenario()
    return Scenario(batch=batch, profile=profile, constraints=constraints)


def test_wet_dry_basis_round_trip() -> None:
    for moisture_wb in (0.05, 0.25, 0.62, 0.9):
        assert dry_to_wet_basis(wet_to_dry_basis(moisture_wb)) == pytest.approx(
            moisture_wb
        )


def test_wet_basis_rejects_invalid_fraction() -> None:
    with pytest.raises(ValueError):
        wet_to_dry_basis(1.0)
    with pytest.raises(ValueError):
        wet_to_dry_basis(-0.1)


def test_mass_balance_closes(scenario: Scenario) -> None:
    balance = compute_mass_balance(
        scenario.batch,
        scenario.batch.material,
        scenario.constraints.max_temperature_c,
    )
    assert balance.dry_solids_kg + balance.initial_water_kg == pytest.approx(
        scenario.batch.mass_kg
    )
    assert balance.dry_solids_kg + balance.final_water_kg == pytest.approx(
        balance.final_mass_kg
    )
    assert balance.initial_water_kg - balance.final_water_kg == pytest.approx(
        balance.water_to_remove_kg
    )


def test_simulation_water_accounting_is_consistent(scenario: Scenario) -> None:
    plan, _ = build_plan(
        scenario.batch, scenario.profile, scenario.constraints
    )
    result = plan.predicted
    dry_solids = scenario.batch.mass_kg * (1.0 - scenario.batch.initial_moisture_wb)
    remaining_water = dry_solids * (
        result.final_moisture_wb / (1.0 - result.final_moisture_wb)
    )
    removed = scenario.batch.mass_kg - dry_solids - remaining_water
    assert result.water_removed_kg == pytest.approx(removed, abs=1e-9)


def test_simulation_never_exceeds_material_ceiling(scenario: Scenario) -> None:
    phases = (SchedulePhase(temperature_c=95.0, duration_minutes=120),)
    result = simulate(
        scenario.profile, scenario.batch, scenario.constraints, phases
    )
    ceiling = min(
        scenario.constraints.max_temperature_c,
        scenario.batch.material.max_safe_temperature_c,
    )
    assert all(point.temperature_c <= ceiling + 1e-9 for point in result.points)


def test_simulation_stops_when_source_cools_below_minimum(
    scenario: Scenario,
) -> None:
    cold_profile = replace(
        scenario.profile,
        samples=tuple(
            replace(sample, temperature_c=10.0)
            for sample in scenario.profile.samples
        ),
    )
    result = simulate(
        cold_profile,
        scenario.batch,
        scenario.constraints,
        (SchedulePhase(temperature_c=45.0, duration_minutes=480),),
    )
    assert result.points == ()
    assert result.water_removed_kg == 0.0
    assert any('below the minimum' in note for note in result.notes)


def test_validator_rejects_inflated_energy(scenario: Scenario) -> None:
    plan, _ = build_plan(
        scenario.batch, scenario.profile, scenario.constraints
    )
    tampered = replace(
        plan.predicted,
        energy_kwh=plan.predicted.minimum_energy_kwh * 50.0,
    )
    report = validate_plan(
        scenario.profile,
        scenario.batch,
        scenario.constraints,
        plan.phases,
        tampered,
    )
    assert report.status is PlanStatus.NOT_VALIDATED
    assert 'ENERGY_PLAUSIBLE' in report.summary


def test_validator_rejects_impossible_water_removal(scenario: Scenario) -> None:
    plan, _ = build_plan(
        scenario.batch, scenario.profile, scenario.constraints
    )
    tampered = replace(
        plan.predicted, water_removed_kg=plan.predicted.water_removed_kg + 5.0
    )
    report = validate_plan(
        scenario.profile,
        scenario.batch,
        scenario.constraints,
        plan.phases,
        tampered,
    )
    assert report.status is PlanStatus.NOT_VALIDATED
    assert 'MASS_BALANCE_CLOSED' in report.summary


def test_optimizer_prefers_feasible_plan(scenario: Scenario) -> None:
    plan, outcome = build_plan(
        scenario.batch, scenario.profile, scenario.constraints
    )
    assert plan.phases
    assert outcome.candidates
    assert any(candidate.feasible for candidate in outcome.candidates)


def test_narrative_falls_back_without_credentials(
    scenario: Scenario, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv('GEMINI_API_KEY', raising=False)
    monkeypatch.delenv('GOOGLE_API_KEY', raising=False)
    narrative = narrate_plan(scenario)
    assert narrative.provider == 'deterministic'
    assert 'not a measurement' in narrative.text
    assert narrative.tool_calls == ()
def _sparse_profile() -> ThermalProfile:
    """A profile whose samples do not start at minute zero."""
    return ThermalProfile(
        source_id='sparse',
        name='Sparse window',
        samples=(
            ThermalSample(
                minute=0, temperature_c=34.0, available_heat_kw=1.2, relative_humidity=0.58
            ),
            ThermalSample(
                minute=120, temperature_c=43.0, available_heat_kw=2.4, relative_humidity=0.53
            ),
            ThermalSample(
                minute=240, temperature_c=48.0, available_heat_kw=3.1, relative_humidity=0.48
            ),
            ThermalSample(
                minute=480, temperature_c=39.0, available_heat_kw=1.7, relative_humidity=0.52
            ),
        ),
    )


def test_window_uses_last_sample_minute(scenario: Scenario) -> None:
    """Trimming a profile's start must not shorten the usable horizon."""
    schedules = candidate_schedules(
        _sparse_profile(), scenario.constraints, scenario.batch.material
    )
    longest = max(
        sum(phase.duration_minutes for phase in schedule.phases)
        for schedule in schedules
    )
    assert longest == scenario.constraints.max_duration_minutes


def test_replan_reaches_target_on_sparse_profile(scenario: Scenario) -> None:
    """A replanned window is re-based and re-optimized over its full length."""
    outcome = replan(
        scenario.batch, _sparse_profile(), scenario.constraints, 40.0, 60
    )
    assert 'PLAN_RECALCULATED' in outcome.reason_codes
    assert 'TARGET_UNREACHABLE' not in outcome.reason_codes
    assert outcome.plan.predicted.final_moisture_wb <= scenario.batch.target_moisture_wb
    used = sum(phase.duration_minutes for phase in outcome.plan.phases)
    assert used <= outcome.remaining_minutes == 420


def test_replan_reports_exhausted_window(scenario: Scenario) -> None:
    """A replan requested after the window closes must say so."""
    outcome = replan(
        scenario.batch, _sparse_profile(), scenario.constraints, 40.0, 600
    )
    assert 'WINDOW_EXHAUSTED' in outcome.reason_codes
    assert outcome.remaining_minutes == 0
