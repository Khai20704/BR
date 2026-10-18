# Br — Break the Rules

AI Thermal Engineer for adaptive waste-heat drying of spent coffee grounds.

Phase 01 initialized the frontend foundation. Phase 02 added the workspace UI with explicitly labeled synthetic previews. The backend now implements the deterministic thermal engine, an independent validator and optional Gemini narration; the eight-page frontend is wired to it in HTTP mode. No authentication or Firebase is implemented.

## Windows PowerShell

Use Node.js 24 LTS (validated with 24.20.0) and npm. From this repository root:

```powershell
Set-Location .\frontend
npm ci
Copy-Item .env.example .env.local
npm run dev -- --host 127.0.0.1
```

Open the local URL printed by Vite. Stop with Ctrl+C. The placeholder previews work offline with VITE_API_BASE_URL empty. The variable is a public backend URL, never a secret.

```powershell
npm run build
npm run lint
npm run test -- --run
npm run format:check
npm run preview -- --host 127.0.0.1
```

Use npm run test for watch mode and npm run format to format frontend files. Commit package-lock.json and use npm ci for repeatable installations.

## Layout

- frontend/: React 19, Vite, strict TypeScript, Tailwind, routing and providers.
- backend/: FastAPI thermal-drying engine, independent validator, Gemini narrator and pytest suite. See backend/README.md.
- docs/architecture.md: dependency rules, composition and data flow.
- docs/api-contract.md: implemented endpoints, request/response schemas, units and error codes.
- docs/initialization-report.md: dependency versions, complete source tree and verification results.

Features: site, batch, thermal-profile, simulation, ai-planning, replanning and benchmark. Each has domain/models, domain/repositories, application/use-cases, infrastructure/repositories and presentation/{components,hooks,pages}, plus index.ts. Only site contains an architecture example.

Runtime dependencies include React, React DOM, React Router, Zustand, TanStack Query, Axios, Zod and Lucide React. Zustand and Lucide are installed for future use without speculative UI or state. Recharts is deferred.

## Backend

```powershell
Set-Location .\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m pytest -q
uvicorn app.main:app --reload --port 8000
```

OpenAPI is at http://127.0.0.1:8000/docs. Mass balance, simulation, planning, replanning and benchmark endpoints plus read-only workspace snapshots are documented in docs/api-contract.md. Gemini narration needs GEMINI_API_KEY on the backend only and falls back to deterministic text without it. CORS defaults to the Vite dev origin; override with BR_ALLOWED_ORIGINS.

## Phase 03 local MVP

Use two PowerShell terminals (dependencies are already installed):

```powershell
Set-Location C:\Users\khait\OneDrive\Desktop\BR\BR\backend
$env:BR_ALLOWED_ORIGINS = 'http://127.0.0.1:5173,http://localhost:5173'
$env:BR_GEMINI_MODEL = 'gemini-3.8-flash'
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```powershell
Set-Location C:\Users\khait\OneDrive\Desktop\BR\BR\frontend
$env:VITE_DATA_MODE = 'http'
$env:VITE_API_BASE_URL = 'http://127.0.0.1:8000'
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open http://127.0.0.1:5173. The backend reads the existing server-side Gemini
credential; never put it in a VITE variable. Missing/unavailable Gemini uses
explicitly unverified deterministic narration. HTTP failures show errors and
never substitute fixtures. If choosing a different Vite port, include its exact
origin in BR_ALLOWED_ORIGINS before starting the backend.

Site Setup applies constant source temperature and recoverable heat to the
session scenario. Batch Setup sends mass/moisture inputs to Python. Thermal
Digital Twin, AI Planning and Benchmark use that same scenario. Adaptive
Replanning computes a baseline at the configured source temperature (42 C when
unset), then recomputes at the selected temperature. Replanning narration is
local and deterministic; live Gemini narration and tool traces appear in AI
Planning. Query results are reused for unchanged session inputs.

Limits: inputs are synthetic scenarios, not measured data; no experimental
calibration is claimed. Session source/batch settings reset on reload. Site
metadata is a local form draft, with no persistence or sensors. Replanning runs
from minute zero; the UI does not accept elapsed drying or measured batch
progress. Benchmark compares strategies on the current source/batch, not on a
previous replan result; change Site Setup to benchmark another heat condition.

Verification (2026-10-18): one production build, one consolidated deterministic
API smoke, and one Edge walkthrough covering all eight pages passed. Exactly one
live planning request returned LIVE_GEMINI_VERIFIED and a successful
validated_plan_summary invocation. With 42 C / 2 kW source and the default batch,
the plan was VALIDATED. Replanning to 35 C changed predicted final moisture from
24.9544 to 24.9810 percent wet basis and energy from 7.185737 to 7.232551 kWh.
These are model outputs, not measured performance improvements. CORS and a forced
browser disconnect were verified. No dependency installation or broad test suite
was run.

## Phase 02 UI

Eight responsive workspace pages are implemented. See [Phase 02 report](docs/phase-02-report.md) for architecture, tests and screenshots. Run npm run dev from frontend for the explicitly labeled synthetic preview selected by .env.development. To inspect disconnected development behavior, set VITE_DATA_MODE=http in .env.local and restart Vite. Production always disables fixtures. Site metadata remains a local draft; Phase 03 source and batch inputs drive backend computations. Run npm run build then npm run test:e2e for Edge desktop/mobile and production-isolation checks. This section describes the earlier fixture-only phase; use the Phase 03 commands above for the connected MVP.

Browser verification: keep npm run dev -- --host 127.0.0.1 --port 5173 and npm run preview -- --host 127.0.0.1 --port 4173 running in separate PowerShell terminals before npm run test:e2e. Stop them with Ctrl+C afterward.


## Phase 04 deployment preparation

Prepared locally; no public deployment has been performed. See
[deployment commands and approval gates](DEPLOYMENT.md), the
[2-3 minute demo](DEMO_SCRIPT.md), and [submission copy/publishing checklist](SUBMISSION.md).

Architecture: React/Vite on Firebase Hosting calls FastAPI on Cloud Run over HTTPS.
FastAPI runs the deterministic physics engine, optimizer and independent validator.
Gemini on the backend calls read-only Python tools and explains computed output;
Secret Manager supplies its key only to the runtime service identity. No Firebase
SDK, database, authentication provider or additional AI service is introduced.

Production additions: a non-root Python container with PORT-aware entry point,
separate runtime requirements, allow-listed cloud build contexts, explicit HTTPS
CORS, bounded public-demo requests, sanitized Gemini failures, and Hosting SPA
routing/security headers. Local development retains localhost CORS and docs.
The rate limit is per process, not authentication or a hard budget. Deployment
requires confirmed project IDs, billing/IAM prerequisites, installed cloud CLIs,
and explicit approval. Container/cloud behavior still needs deployment verification.
