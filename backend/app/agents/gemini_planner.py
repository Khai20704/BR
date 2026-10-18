"""Gemini planning narrator with tool calling and an execution trace.

The agent is an explainer, never a decision maker: it may call read-only tools
that run the deterministic engine, then write a short rationale. Every tool the
model actually invoked is recorded, so a caller can tell a real live Gemini run
from local deterministic narration. Fallback narration is never labelled live.

Tool calling is explicit: declarations come from typed ``FunctionDeclaration``
schemas in :mod:`app.agents.scenario_toolbox` and every requested call is
dispatched there by name, so no lambda or bare ``*args`` signature ever reaches
the SDK, and every execution lands in the trace.

Two protocol details matter for Gemini:

* A tool result is returned in a ``user`` turn. Gemini accepts only ``user`` and
  ``model`` roles, so a ``tool`` role is rejected with a 400 before the model
  ever sees the result.
* The trace is owned by the caller, not by the request loop, so tools that ran
  before a later failure are still reported.
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from .scenario_toolbox import (
    ScenarioToolbox,
    build_tool,
    dispatch,
    function_response_part,
)
from .tools import (
    Scenario,
    batch_summary,
    thermal_window_summary,
    validated_plan_summary,
)

logger = logging.getLogger(__name__)

DEFAULT_MODEL_NAME = 'gemini-3.8-flash'
MODEL_ENV_VAR = 'BR_GEMINI_MODEL'

MAX_NARRATIVE_CHARS = 900
MAX_TRACE_DETAIL_CHARS = 240
MAX_TOOL_ROUNDS = 4

GEMINI_DISABLED = 'GEMINI_DISABLED'
LIVE_GEMINI_VERIFIED = 'LIVE_GEMINI_VERIFIED'
LIVE_GEMINI_NOT_VERIFIED = 'LIVE_GEMINI_NOT_VERIFIED'

SYSTEM_INSTRUCTION = (
    'You are a thermal drying engineering assistant. Always call at least one '
    'tool to read the computed scenario before answering. Never invent '
    'moisture, energy or validation values: quote only what the tools return. '
    'Answer in at most four sentences and state explicitly that the plan is a '
    'prediction, not a measurement.'
)


def model_name() -> str:
    """The Gemini model to call, configurable through ``BR_GEMINI_MODEL``."""
    configured = os.environ.get(MODEL_ENV_VAR, '').strip()
    return configured or DEFAULT_MODEL_NAME


# Read at import for callers that want to display the configured model; every
# request resolves the name again so a late environment change still applies.
MODEL_NAME = model_name()


@dataclass(frozen=True, slots=True)
class ToolCall:
    """One tool invocation actually made by the model."""

    name: str
    arguments: str
    ok: bool
    detail: str


@dataclass(frozen=True, slots=True)
class AgentNarrative:
    """Narrative attached to a plan, with its provenance and tool trace."""

    text: str
    provider: str
    tool_calls: tuple[str, ...]
    tool_trace: tuple[ToolCall, ...] = ()
    verification: str = GEMINI_DISABLED


class ToolLoopExceeded(RuntimeError):
    """The model kept requesting tools past the round budget."""


# A real Gemini key is far longer than this; anything shorter is a placeholder
# left behind by a shell and must never shadow a usable key.
MIN_KEY_LENGTH = 20

KEY_NAMES: tuple[str, ...] = ('GEMINI_API_KEY', 'GOOGLE_API_KEY')


def _plausible(value: str | None) -> str | None:
    """The value if it looks like a real key, otherwise None."""
    candidate = (value or '').strip()
    return candidate if len(candidate) >= MIN_KEY_LENGTH else None


@lru_cache(maxsize=1)
def _windows_key() -> str | None:
    """The key stored in the Windows user or machine environment.

    A backend started from a shell that only carries a placeholder would
    otherwise appear unconfigured even though a valid key is installed.
    """
    if sys.platform != 'win32':
        return None
    for scope in ('User', 'Machine'):
        for name in KEY_NAMES:
            try:
                result = subprocess.run(
                    [
                        'powershell',
                        '-NoProfile',
                        '-Command',
                        f'[Environment]::GetEnvironmentVariable("{name}","{scope}")',
                    ],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
            except (OSError, subprocess.SubprocessError):
                continue
            candidate = _plausible(result.stdout)
            if candidate:
                return candidate
    return None


def api_key() -> str | None:
    """The Gemini key, read only on the backend."""
    for name in KEY_NAMES:
        candidate = _plausible(os.environ.get(name))
        if candidate:
            return candidate
    return _windows_key()


def is_configured() -> bool:
    """True when a key is present; the SDK may still be missing."""
    return bool(api_key())


def _sanitize(message: str) -> str:
    """Remove anything key-shaped from text that may be logged or returned."""
    key = api_key()
    if key:
        message = message.replace(key, '[REDACTED]')
    return message


def _describe(result: Any) -> str:
    """A short, safe summary of a tool result for the trace."""
    try:
        text = json.dumps(result, default=str, sort_keys=True)
    except (TypeError, ValueError):
        text = str(result)
    if len(text) > MAX_TRACE_DETAIL_CHARS:
        return text[:MAX_TRACE_DETAIL_CHARS] + '...'
    return text


def _describe_arguments(arguments: dict[str, Any]) -> str:
    """A short, stable rendering of the keyword arguments the model sent."""
    if not arguments:
        return '(no arguments)'
    try:
        return json.dumps(arguments, default=str, sort_keys=True)
    except (TypeError, ValueError):
        return str(arguments)


def _deterministic(scenario: Scenario) -> AgentNarrative:
    """Explanatory text assembled from the engine's own outputs."""
    plan = validated_plan_summary(scenario)
    window = thermal_window_summary(scenario)
    batch = batch_summary(scenario)
    phases = ', '.join(
        f"{phase['temperature_c']:.0f} C for {phase['duration_minutes']} min"
        for phase in plan['phases']
    )
    text = (
        f"The {batch['material']} batch of {batch['mass_kg']} kg starts at "
        f"{batch['initial_moisture_percent_wb']}% wet basis against a "
        f"{batch['target_moisture_percent_wb']}% target. The waste-heat window "
        f"provides {window['min_temperature_c']:.0f}-"
        f"{window['max_temperature_c']:.0f} C over "
        f"{window['window_minutes']} minutes. The selected schedule holds "
        f"{phases}, predicting {plan['final_moisture_percent_wb']}% wet basis "
        f"for {plan['energy_kwh']} kWh. Independent validation reports "
        f"{plan['validation_status']}. This is a model prediction, not a "
        f"measurement."
    )
    return AgentNarrative(
        text=text,
        provider='deterministic',
        tool_calls=(),
        tool_trace=(),
        # Narration is local. Live Gemini did not run, so it is not verified.
        verification=LIVE_GEMINI_NOT_VERIFIED,
    )


def _run_tool_call(
    toolbox: ScenarioToolbox,
    name: str,
    arguments: dict[str, Any],
    trace: list[ToolCall],
) -> dict[str, Any]:
    """Execute one requested tool and record the outcome in the trace.

    A failing tool is reported back to the model instead of aborting the run,
    but its trace entry is marked ``ok=False`` so it can never count as proof
    that a live tool executed.
    """
    shown = _describe_arguments(arguments)
    try:
        result = dispatch(toolbox, name, arguments)
    except Exception as error:
        detail = f'{type(error).__name__}: tool execution failed'
        trace.append(
            ToolCall(
                name=name,
                arguments=shown,
                ok=False,
                detail=_sanitize(detail),
            )
        )
        return {'error': _sanitize(detail)}
    trace.append(
        ToolCall(
            name=name,
            arguments=shown,
            ok=True,
            detail=_describe(result),
        )
    )
    return result


def _response_text(response: Any) -> str:
    """The text of a response, or an empty string when it carries none.

    A response that holds only function calls has no text; the SDK raises while
    concatenating text parts in that case, so the parts are inspected directly.
    """
    try:
        return (response.text or '').strip()
    except Exception:  # noqa: BLE001 - text access is best effort
        return ''


def _requested_calls(response: Any) -> list[Any]:
    """The function calls a response asked for, if any."""
    calls = getattr(response, 'function_calls', None)
    return list(calls or ())


def _run_gemini(
    client: Any,
    types: Any,
    scenario: Scenario,
    question: str,
    trace: list[ToolCall],
) -> str:
    """Drive the explicit tool-calling loop; return Gemini's final answer.

    ``trace`` belongs to the caller and is appended to as tools run, so a tool
    that executed successfully is reported even if a later round fails.
    """
    toolbox = ScenarioToolbox(scenario)
    tool = build_tool(toolbox, client, types)
    config = types.GenerateContentConfig(
        tools=[tool],
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.2,
    )
    model = model_name()

    contents: list[Any] = [question]

    for _round in range(MAX_TOOL_ROUNDS):
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )

        requested = _requested_calls(response)
        if not requested:
            return _response_text(response)

        parts = []
        for call in requested:
            name = call.name or ''
            arguments = dict(call.args or {})
            result = _run_tool_call(toolbox, name, arguments, trace)
            parts.append(function_response_part(types, name, {'result': result}))

        # A function response is delivered in a user turn: Gemini accepts only
        # the `user` and `model` roles and rejects a `tool` role with a 400.
        contents = [
            *contents,
            response.candidates[0].content,
            types.Content(role='user', parts=parts),
        ]

    raise ToolLoopExceeded(f'no final answer after {MAX_TOOL_ROUNDS} tool rounds')


def _narrative_from_trace(
    scenario: Scenario,
    provider: str,
    trace: list[ToolCall],
    text: str | None,
) -> AgentNarrative:
    """Assemble the result of a run, labelling verification honestly.

    Live verification requires a real Gemini answer *and* at least one Python
    tool that executed successfully; a text-only Gemini response proves the
    model ran but not that it read the engine, so it stays unverified.
    """
    successful_tools = any(call.ok for call in trace)
    if text:
        return AgentNarrative(
            text=text[:MAX_NARRATIVE_CHARS],
            provider=provider,
            tool_calls=tuple(call.name for call in trace),
            tool_trace=tuple(trace),
            verification=(
                LIVE_GEMINI_VERIFIED
                if successful_tools
                else LIVE_GEMINI_NOT_VERIFIED
            ),
        )

    fallback = _deterministic(scenario)
    return AgentNarrative(
        text=fallback.text,
        provider=provider,
        tool_calls=tuple(call.name for call in trace),
        tool_trace=tuple(trace),
        verification=LIVE_GEMINI_NOT_VERIFIED,
    )


def narrate_plan(scenario: Scenario, prompt: str | None = None) -> AgentNarrative:
    """Explain a plan with Gemini when available, otherwise deterministically."""
    key = api_key()
    if not key:
        return _deterministic(scenario)

    try:
        from google import genai
        from google.genai import types
    except ImportError as error:
        logger.error("Gemini SDK import failed: %s", type(error).__name__)
        return _deterministic(scenario)

    question = prompt or (
        'Explain the selected drying schedule, the energy used and the '
        'validation verdict for this batch.'
    )

    # The trace belongs to this function, so tools that executed before a later
    # failure are still reported to the caller.
    trace: list[ToolCall] = []

    try:
        client = genai.Client(api_key=key, http_options=types.HttpOptions(timeout=20_000))
        text = _run_gemini(client, types, scenario, question, trace)
    except Exception as error:
        logger.error(
            "Gemini execution failed: %s",
            type(error).__name__,
        )
        return _narrative_from_trace(
            scenario, 'deterministic-after-error', trace, None
        )

    if not text:
        return _narrative_from_trace(
            scenario, 'deterministic-empty-response', trace, None
        )

    return _narrative_from_trace(scenario, 'gemini', trace, text)
