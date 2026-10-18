"""Focused tests for the typed agent tools used in Gemini function calling."""

from __future__ import annotations

import pytest
from google import genai
from google.genai import types

from app.agents.scenario_toolbox import (
    TOOL_NAMES,
    ScenarioToolbox,
    UnknownToolError,
    build_tool,
    dispatch,
)
from app.agents.tools import Scenario, build_tool_table
from app.services.scenarios import default_scenario


@pytest.fixture()
def scenario() -> Scenario:
    batch, profile, constraints = default_scenario()
    return Scenario(batch=batch, profile=profile, constraints=constraints)


@pytest.fixture()
def toolbox(scenario: Scenario) -> ScenarioToolbox:
    return ScenarioToolbox(scenario)


def _declarations(toolbox: ScenarioToolbox) -> dict[str, types.FunctionDeclaration]:
    client = genai.Client(api_key='declaration-only-test-key')
    tool = build_tool(toolbox, client, types)
    return {declaration.name: declaration for declaration in tool.function_declarations}


def test_every_tool_declares_without_a_parse_error(
    toolbox: ScenarioToolbox,
) -> None:
    """Regression: untyped lambdas made the SDK fail on temperature_c."""
    declarations = _declarations(toolbox)

    assert tuple(declarations) == TOOL_NAMES
    for declaration in declarations.values():
        assert declaration.description

    simulate = declarations['simulate_schedule']
    assert simulate.parameters is not None
    assert set(simulate.parameters.properties or {}) == {
        'temperature_c',
        'duration_minutes',
    }
    assert set(simulate.parameters.required or []) == {
        'temperature_c',
        'duration_minutes',
    }
    assert (
        simulate.parameters.properties['temperature_c'].type is types.Type.NUMBER
    )
    assert (
        simulate.parameters.properties['duration_minutes'].type
        is types.Type.INTEGER
    )

    for name in ('thermal_window_summary', 'batch_summary', 'validated_plan_summary'):
        parameters = declarations[name].parameters
        assert parameters is None or not (parameters.properties or {})


def test_dispatch_runs_the_deterministic_engine(
    toolbox: ScenarioToolbox,
) -> None:
    batch = dispatch(toolbox, 'batch_summary', {})
    assert batch['batch_id']
    assert batch['max_duration_minutes'] > 0

    simulated = dispatch(
        toolbox,
        'simulate_schedule',
        {'temperature_c': 50.0, 'duration_minutes': 120},
    )
    assert simulated['temperature_c'] == 50.0
    assert simulated['duration_minutes'] == 120
    assert simulated['energy_kwh'] > 0

    plan = dispatch(toolbox, 'validated_plan_summary', {})
    assert plan['phases']
    assert plan['validation_status']


def test_dispatch_rejects_an_undeclared_tool(toolbox: ScenarioToolbox) -> None:
    with pytest.raises(UnknownToolError):
        dispatch(toolbox, 'drop_everything', {})


def test_tool_table_uses_the_typed_definitions(scenario: Scenario) -> None:
    table = build_tool_table(scenario)

    assert tuple(table) == TOOL_NAMES
    assert all(callable(handler) for handler in table.values())
    assert table['batch_summary']()['batch_id']
