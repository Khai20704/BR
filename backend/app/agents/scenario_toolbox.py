"""Typed, scenario-bound tools for the Gemini planning agent.

Tool declarations are written out explicitly as ``FunctionDeclaration``
schemas: a name, a description and — when the tool takes arguments — an
``OBJECT`` schema of named, typed, documented properties. Nothing is inferred
from a callable's signature, so no lambda, ``*args`` or ``**kwargs`` shape can
ever reach the SDK's signature parser, and the model always sees the parameter
descriptions and types the engine actually expects.

Execution stays fully under our control: ``dispatch`` maps a declared name to
one bound Python method and validates the keyword arguments before calling it.
The tools are read-only views over the deterministic engine — the agent may
inspect the scenario and simulate a candidate, but it cannot write a phase, an
energy figure or a validation verdict.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Callable

from . import tools as engine

if TYPE_CHECKING:  # pragma: no cover - typing only
    from .tools import Scenario

ToolHandler = Callable[..., dict[str, Any]]


class UnknownToolError(LookupError):
    """Raised when the model names a tool that was never declared."""


class InvalidToolArguments(TypeError):
    """Raised when the model sends arguments a tool does not accept."""


@dataclass(frozen=True, slots=True)
class ToolParameter:
    """One declared argument of a tool."""

    name: str
    schema_type: str
    description: str
    minimum: float | None = None


@dataclass(frozen=True, slots=True)
class ToolSpec:
    """The declaration and argument rules of one tool."""

    name: str
    description: str
    parameters: tuple[ToolParameter, ...] = ()


TOOL_SPECS: tuple[ToolSpec, ...] = (
    ToolSpec(
        name='thermal_window_summary',
        description=(
            'Summarise the available waste-heat window: minimum and maximum '
            'temperature, mean available heat and window length in minutes.'
        ),
    ),
    ToolSpec(
        name='batch_summary',
        description=(
            'Summarise the batch duty: material, mass, initial and target '
            'moisture, safe temperature limit and maximum duration.'
        ),
    ),
    ToolSpec(
        name='simulate_schedule',
        description=(
            'Simulate one constant-temperature hold and return the predicted '
            'final moisture, water removed, energy use and target verdict.'
        ),
        parameters=(
            ToolParameter(
                name='temperature_c',
                schema_type='NUMBER',
                description='Hold temperature in degrees Celsius.',
                minimum=0.0,
            ),
            ToolParameter(
                name='duration_minutes',
                schema_type='INTEGER',
                description='Hold duration in whole minutes.',
                minimum=1.0,
            ),
        ),
    ),
    ToolSpec(
        name='validated_plan_summary',
        description=(
            "Return the optimizer's selected schedule with its independent "
            'validation verdict, predicted moisture and energy.'
        ),
    ),
)

TOOL_NAMES: tuple[str, ...] = tuple(spec.name for spec in TOOL_SPECS)

SPECS_BY_NAME: dict[str, ToolSpec] = {spec.name: spec for spec in TOOL_SPECS}


class ScenarioToolbox:
    """The read-only engine tools bound to one scenario."""

    __slots__ = ('_scenario',)

    def __init__(self, scenario: Scenario) -> None:
        self._scenario = scenario

    def thermal_window_summary(self) -> dict[str, Any]:
        """Summarise the waste-heat window: temperatures, heat and length."""
        return engine.thermal_window_summary(self._scenario)

    def batch_summary(self) -> dict[str, Any]:
        """Summarise the batch: mass, moisture, material and duration limits."""
        return engine.batch_summary(self._scenario)

    def simulate_schedule(
        self, temperature_c: float, duration_minutes: int
    ) -> dict[str, Any]:
        """Simulate one constant-temperature hold."""
        return engine.simulate_schedule(
            self._scenario, temperature_c, duration_minutes
        )

    def validated_plan_summary(self) -> dict[str, Any]:
        """Return the optimizer's plan with its independent validation verdict."""
        return engine.validated_plan_summary(self._scenario)

    def handlers(self) -> dict[str, ToolHandler]:
        """Map each declared tool name to its bound, typed implementation."""
        return {
            'thermal_window_summary': self.thermal_window_summary,
            'batch_summary': self.batch_summary,
            'simulate_schedule': self.simulate_schedule,
            'validated_plan_summary': self.validated_plan_summary,
        }


def _coerce(spec: ToolSpec, arguments: dict[str, Any]) -> dict[str, Any]:
    """Validate the model's keyword arguments against the declared spec."""
    declared = {parameter.name: parameter for parameter in spec.parameters}
    unexpected = sorted(set(arguments) - set(declared))
    if unexpected:
        raise InvalidToolArguments(
            f'{spec.name} does not accept {", ".join(unexpected)}'
        )
    missing = sorted(set(declared) - set(arguments))
    if missing:
        raise InvalidToolArguments(
            f'{spec.name} requires {", ".join(missing)}'
        )

    coerced: dict[str, Any] = {}
    for name, parameter in declared.items():
        raw = arguments[name]
        try:
            if parameter.schema_type == 'INTEGER':
                value: float | int = int(round(float(raw)))
            else:
                value = float(raw)
        except (TypeError, ValueError) as error:
            raise InvalidToolArguments(
                f'{spec.name}.{name} must be a number'
            ) from error
        if parameter.minimum is not None and value < parameter.minimum:
            raise InvalidToolArguments(
                f'{spec.name}.{name} must be at least {parameter.minimum:g}'
            )
        coerced[name] = value
    return coerced


def dispatch(
    toolbox: ScenarioToolbox, name: str, arguments: dict[str, Any]
) -> dict[str, Any]:
    """Run one declared tool by name with the model's keyword arguments."""
    handler = toolbox.handlers().get(name)
    spec = SPECS_BY_NAME.get(name)
    if handler is None or spec is None:
        raise UnknownToolError(f'unknown tool {name!r}')
    return handler(**_coerce(spec, arguments))


def _schema(types: Any, spec: ToolSpec) -> Any:
    """Build the OBJECT schema for a tool's declared parameters."""
    if not spec.parameters:
        return None
    properties: dict[str, Any] = {}
    required: list[str] = []
    for parameter in spec.parameters:
        properties[parameter.name] = types.Schema(
            type=getattr(types.Type, parameter.schema_type),
            description=parameter.description,
            minimum=parameter.minimum,
        )
        required.append(parameter.name)
    return types.Schema(
        type=types.Type.OBJECT,
        properties=properties,
        required=required,
    )


def build_tool(toolbox: ScenarioToolbox, client: Any, types: Any) -> Any:
    """Declare every tool explicitly from its spec.

    ``client`` and ``types`` are the Gemini client and its ``google.genai.types``
    module, passed in so this module never imports the optional SDK at load
    time. ``client`` is accepted for symmetry with the planner and is unused.
    """
    declarations = [
        types.FunctionDeclaration(
            name=spec.name,
            description=spec.description,
            parameters=_schema(types, spec),
        )
        for spec in TOOL_SPECS
    ]
    return types.Tool(function_declarations=declarations)


def function_response_part(
    types: Any, name: str, payload: dict[str, Any]
) -> Any:
    """Wrap a tool result as a function-response part for the next turn."""
    return types.Part.from_function_response(name=name, response=payload)
