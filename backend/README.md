# Backend — thermal drying engine

Deterministic engineering engine plus an optional Gemini narrator, exposed over
HTTP. The engine computes every number; Gemini only writes prose and is labelled
as such in each response.

## Run

```bash
cd BR/backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

OpenAPI is served at `/docs` and `/openapi.json`.

## Environment

| Variable | Purpose | Default |
| --- | --- | --- |
| `BR_ALLOWED_ORIGINS` | Comma-separated CORS allow-list | `http://localhost:5173,http://127.0.0.1:5173` |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | Enables the Gemini narrator | unset → deterministic text |
| `BR_GEMINI_MODEL` | Model used for narration | `gemini-3.8-flash` |

Keys are read only on the server. Without a key, or without the `google-genai`
package, plans still carry a full deterministic narrative.

## Test

```bash
python -m pytest -q
```

## Verify the Gemini narrator

The narrator declares its tools explicitly from typed methods in
`app/agents/scenario_toolbox.py` and dispatches every call itself in
`app/agents/gemini_planner.py`. Lambdas cannot be declared — the SDK rejects
them with "Failed to parse the parameter ..." — so tools must stay named
functions with annotations and docstrings.

One focused live smoke test, which prints the provider, the verification label
and every tool the model actually executed:

```bash
python scripts/smoke_gemini.py
```

`LIVE_GEMINI_VERIFIED` is reported only when at least one Python tool executed
successfully during that run. A missing key, an auth failure or an empty answer
falls back to deterministic narration and reports `LIVE_GEMINI_NOT_VERIFIED`.

## Engineering endpoints

All engineering endpoints accept the same scenario body
(`batch`, `profile`, `constraints`) and return 422 with a human-readable
`detail` when the inputs cannot describe a physical drying duty.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/health` | Liveness, model version, whether Gemini is configured |
| POST | `/api/v1/physics/mass-balance` | Dry-solids bookkeeping and latent energy floor |
| POST | `/api/v1/simulations` | Integrate an explicit schedule, or the optimized one |
| POST | `/api/v1/plans` | Optimize, validate independently, then explain |
| POST | `/api/v1/plans/replan` | Re-optimize the remaining window after a heat change |
| POST | `/api/v1/benchmark` | Fixed vs conventional adaptive vs optimizer |

## Workspace endpoints

Read-only snapshots of the documented demo scenario (spent coffee grounds,
AC condenser waste heat). Every payload carries a `provenance` block stating
`is_measurement: false`. These are inputs and predictions, not measurements of
any real dryer.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/workspace/thermal-window` | Source temperature and available heat |
| GET | `/api/v1/workspace/mass-balance` | Water duty and energy floor |
| GET | `/api/v1/workspace/simulation` | Optimized trajectory |
| GET | `/api/v1/workspace/plan` | Plan with its validation verdict |
| GET | `/api/v1/workspace/replanning?temperature_c=42` | Replan after a heat change |
| GET | `/api/v1/workspace/benchmark` | Three-way comparison |

## Guarantees and limits

- Dry solids are conserved and water removed is closed against mass balance.
- A plan is `VALIDATED` only when an independent validator, which re-integrates
  the schedule at a one-minute step, agrees with the prediction within 0.02
  wet-basis points.
- The drying model is lumped and thin-layer; it does not model airflow, pressure
  drop, weather or batch heterogeneity. Every output is a prediction.

POST replanning uses deterministic narration of the changed thermal scenario; it does not invoke Gemini. The browser compares two computed scenarios from minute zero. No measured batch progress is inferred.
