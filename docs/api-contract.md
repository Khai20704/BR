# API contract

Implemented in `BR/backend` (FastAPI). Base prefix `/api/v1`; OpenAPI is served
at `/openapi.json`. JSON in, JSON out, UTF-8.

## Conventions

- Every field name carries its unit: `_c`, `_kwh`, `_kw`, `_kg`, `_minutes`.
- Moisture crosses the wire as a percentage on a wet basis
  (`*_percent_wb`, 0–100) and is stored internally as a fraction (0–1).
- `PlanStatus` is one of `VALIDATED`, `NEED_MORE_DATA`, `NO_FEASIBLE_PLAN`,
  `NOT_VALIDATED`. `VALIDATED` means an independent validator reproduced the
  prediction — never that a physical dryer was measured.
- No envelope is wrapped: each endpoint returns the resource directly.

## Scenario request body

Accepted by every engineering `POST`.

```json
{
  "batch": {
    "batch_id": "demo-batch",
    "material": {
      "material_id": "spent-coffee-grounds",
      "name": "Spent coffee grounds",
      "reference_rate_per_hour": 0.6,
      "activation_energy_j_per_mol": 35000.0,
      "equilibrium_moisture_percent_wb": 6.0,
      "max_safe_temperature_c": 70.0,
      "specific_heat_j_per_kgk": 1600.0
    },
    "mass_kg": 12.0,
    "initial_moisture_percent_wb": 62.0,
    "target_moisture_percent_wb": 25.0
  },
  "profile": {
    "source_id": "ac-condenser-1",
    "name": "AC condenser waste heat",
    "samples": [
      {"minute": 0, "temperature_c": 34.0, "available_heat_kw": 1.2, "relative_humidity": 0.58},
      {"minute": 120, "temperature_c": 43.0, "available_heat_kw": 2.4, "relative_humidity": 0.53}
    ]
  },
  "constraints": {
    "max_duration_minutes": 480,
    "min_temperature_c": 30.0,
    "max_temperature_c": 60.0,
    "max_relative_humidity": 0.85
  }
}
```

`profile.samples` must be given in ascending `minute`; the server sorts them
defensively. The schedule is integrated from minute 0, and a minute before the
first sample is treated as having that sample's conditions, so the usable
horizon is the minute of the last sample.

## Endpoints

### `GET /api/v1/health`

```json
{"status": "ok", "model_version": "thin-layer-1.0", "gemini_configured": false}
```

### `POST /api/v1/physics/mass-balance`

Returns `dry_solids_kg`, `initial_water_kg`, `final_water_kg`,
`initial_mass_kg`, `final_mass_kg`, `water_to_remove_kg`,
`minimum_energy_kwh`, `temperature_c`.

### `POST /api/v1/simulations`

Optional `phases: [{temperature_c, duration_minutes}]`. Without phases the
optimized schedule is simulated. Returns `final_moisture_percent_wb`,
`duration_minutes`, `water_removed_kg`, `energy_kwh`, `minimum_energy_kwh`,
`model_version`, `notes`, and `points[]` of
`{minute, moisture_percent_wb, temperature_c, water_removed_kg, energy_kwh}`.

### `POST /api/v1/plans`

Returns `{plan, candidates, narrative}`.

- `plan.phases[]`: the chosen setpoints.
- `plan.validation.checks[]`: `{code, passed, detail}` for
  `MASS_BALANCE_CLOSED`, `TARGET_ACHIEVED_INDEPENDENTLY`, `ENERGY_PLAUSIBLE`,
  `WINDOW_RESPECTED`, `TEMPERATURE_LIMITS`, `PREDICTION_AGREES`.
- `candidates[]`: every evaluated schedule with its feasibility and energy.
- `narrative.provider`: `gemini`, `deterministic`, or a
  `deterministic-after-*` variant.
- `narrative.verification`: `LIVE_GEMINI_VERIFIED`, `LIVE_GEMINI_NOT_VERIFIED`
  or `GEMINI_DISABLED`. Only a completed live Gemini call is
  `LIVE_GEMINI_VERIFIED`; local fallback narration never is.
- `narrative.tool_trace[]`: `{name, arguments, ok, detail}` for each tool the
  model actually invoked. Empty when no tool ran.
- `narrative.tool_calls[]`: the names from the trace.

### `POST /api/v1/plans/replan`

Adds `changed_temperature_c` and optional `elapsed_minutes`. Returns
`{plan, reason_codes, remaining_minutes, changed_temperature_c, narrative}`.
Reason codes: `THERMAL_INPUT_CHANGED`, `NO_MEANINGFUL_CHANGE`,
`PLAN_RECALCULATED`, `TARGET_UNREACHABLE`, `VALIDATION_FAILED`,
`WINDOW_EXHAUSTED`.

### `POST /api/v1/benchmark`

Returns `{scenario_id, model_version, methods[], notes[]}` where each method is
`Fixed schedule`, `Conventional adaptive` or `Br AI`, with its status, energy
and validation verdict.

### Workspace snapshots

`GET /api/v1/workspace/{thermal-window,mass-balance,simulation,plan,replanning,benchmark}`
return the same shapes for the documented demo scenario.
`/workspace/replanning` takes an optional `temperature_c` query parameter.
Payloads that describe the scenario itself include an explicit provenance block:

```json
{"source": "documented-default-scenario", "model_version": "thin-layer-1.0", "is_measurement": false}
```

## Errors

- `422` with `{"detail": "<human readable reason>"}` for inputs that cannot
  describe physical drying (target at or above initial moisture, minimum
  temperature not below maximum, batch mass ≤ 0, …).
- `422` with FastAPI's validation detail array for malformed or out-of-range
  fields.
- No endpoint substitutes a fallback response for a failed computation.

## Frontend status

`src/app/preview-services.ts` composes the real HTTP adapters. The thermal
window and the batch mass balance are read/reused as documented inputs; the
scenario-dependent pages `POST` the scenario the operator is editing:

- `POST /api/v1/plans` → AI planning (plan, candidates, narrative, tool trace)
- `POST /api/v1/plans/replan` with `changed_temperature_c` → adaptive replanning
- `POST /api/v1/simulations` → thermal digital twin
- `POST /api/v1/benchmark` → three-method comparison

`src/core/scenario/ScenarioProvider.tsx` holds the edited batch in one place:
Batch Setup publishes the entered batch, Benchmark publishes mass and window,
and every scenario page re-requests when it changes. The backend source window
is always read first (`GET /api/v1/workspace/thermal-window`) so a batch is
never paired with heat data invented by the browser. Responses are validated
with zod schemas in `src/core/api/backend-schemas.ts` before any component sees
them.

Fixtures remain only for explicit preview mode (`VITE_DATA_MODE=fixture`, which
is disabled in production). Every payload carries a provenance label:
`SYNTHETIC` for fixtures, `SCENARIO_INPUT` for the documented source window,
`MODEL_PREDICTION` for engine output, and `MEASURED` for verified sensor data
(nothing produces it yet). No view describes a prediction as experimentally
validated.


## Phase 03 browser integration

HTTP mode sends the active session batch and thermal profile to engineering POST
endpoints. Site Setup optionally overrides temperature and recoverable heat at
all source-window samples; these remain synthetic inputs. The thermal views
show that same profile. Source and batch edits are session-only, not server saves.
The replan UI sends elapsed_minutes=0 and compares a computed configured-source
baseline with the requested changed_temperature_c. POST replan narration uses
the changed profile deterministically, with no additional Gemini request.
AI Planning alone requests live Gemini narration; LIVE_GEMINI_VERIFIED requires
both model text and a successful recorded Python tool invocation.
HTTP errors never fall back to fixtures. Default CORS permits localhost/127.0.0.1
on port 5173; custom Vite ports require BR_ALLOWED_ORIGINS. See README for commands
and the verification record. The model is not experimentally calibrated.
