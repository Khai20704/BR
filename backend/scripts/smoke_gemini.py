"""One focused live Gemini smoke test for the planning agent.

Runs the real narrator against the documented scenario and prints what the
agent actually did: the model, the provider, the verification label, and every
tool the model executed. Exit code 0 means at least one Python tool ran end to
end and the narrative came back from Gemini.

The key itself is never printed. Placeholder values such as a single character
left over in a shell environment are ignored, so the real key stored in the
Windows user environment is used instead.

Usage, from ``backend/``:

    python scripts/smoke_gemini.py
"""

from __future__ import annotations

import logging
import os
import subprocess
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

KEY_NAMES: tuple[str, ...] = ('GEMINI_API_KEY', 'GOOGLE_API_KEY')

# A real Gemini key is far longer than this; anything shorter is a placeholder.
MIN_KEY_LENGTH = 20


def _plausible(value: str | None) -> str | None:
    """The value if it looks like a real key, otherwise None."""
    candidate = (value or '').strip()
    return candidate if len(candidate) >= MIN_KEY_LENGTH else None


def _windows_environment(name: str, scope: str) -> str | None:
    result = subprocess.run(
        [
            'powershell',
            '-NoProfile',
            '-Command',
            f'[Environment]::GetEnvironmentVariable("{name}","{scope}")',
        ],
        capture_output=True,
        text=True,
        timeout=60,
    )
    return _plausible(result.stdout)


def load_key() -> str | None:
    """Read a usable key from the process, then the Windows environment."""
    for name in KEY_NAMES:
        candidate = _plausible(os.environ.get(name))
        if candidate:
            print(f'key source: process environment ({name})')
            return candidate
    if os.name != 'nt':
        return None
    for scope in ('User', 'Machine'):
        for name in KEY_NAMES:
            candidate = _windows_environment(name, scope)
            if candidate:
                print(f'key source: Windows {scope} environment ({name})')
                return candidate
    return None


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format='%(levelname)s %(name)s: %(message)s',
    )

    from app.agents.gemini_planner import (
        LIVE_GEMINI_VERIFIED,
        model_name,
        narrate_plan,
    )
    from app.agents.tools import Scenario
    from app.services.scenarios import default_scenario

    key = load_key()
    if not key:
        print('provider: unconfigured (no usable GEMINI_API_KEY or GOOGLE_API_KEY)')
        return 1

    # Keep both names on the resolved key: the SDK reads either one and warns
    # when a stale placeholder is left in the other.
    os.environ['GEMINI_API_KEY'] = key
    os.environ['GOOGLE_API_KEY'] = key

    batch, profile, constraints = default_scenario()
    scenario = Scenario(batch=batch, profile=profile, constraints=constraints)
    narrative = narrate_plan(scenario)

    print(f'model: {model_name()}')
    print(f'provider: {narrative.provider}')
    print(f'verification: {narrative.verification}')
    print(f'tool_trace_count: {len(narrative.tool_trace)}')
    for call in narrative.tool_trace:
        print(f'  tool {call.name} ok={call.ok} args={call.arguments}')
        print(f'    detail: {call.detail[:160]}')
    print('narrative:')
    print(narrative.text)

    return 0 if narrative.verification == LIVE_GEMINI_VERIFIED else 2


if __name__ == '__main__':
    raise SystemExit(main())
