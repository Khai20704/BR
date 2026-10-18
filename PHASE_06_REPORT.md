# Phase 06 implementation report

Implemented and locally verified on 2026-10-18. **Hosting subsequently deployed
with explicit owner approval.** See [the live deployment report](PHASE_06_LIVE_DEPLOYMENT_REPORT.md)
for release information and the authenticated verification interruption.

## Operator journey

The sidebar has exactly four destinations: **Home**, **My Shop**, **Drying History**,
and **Settings**. Home introduces Br in plain English, offers **Create a Drying
Batch**, shows saved shop information, and links to the latest saved AI plan when
available. It does not request simulations or show technical diagnostic KPIs.

My Shop reuses the existing site form, validated autosave, explicit save, and
Firestore transactions. Shop/AC metadata and drying heat estimates are reusable.
Settings shows the signed-in account, current display units, privacy information,
and how to use the existing logout controls. It does not imply unsupported
preferences or settings have been saved.

Create a Drying Batch uses the existing draft fields and supported spent-coffee-
grounds material. It includes wet mass, initial/target wet-basis moisture,
duration, source temperature, and available heat. Additional conditions retain
temperature limits and recorded humidity. Example inputs, helpers, inline errors,
loading feedback, and retries are provided. Missing and contradictory values
are rejected before calculation. Source temperature retains the existing
persisted 20–70°C range. No new material model or backend parameter was added.

The results page is titled **Your AI Drying Plan**, with this order:

1. AI Assessment: achievable, not achievable, or cannot be determined from actual
   backend checks. Model validation remains distinct from feasibility and
   experimental validation.
2. Key Results: exact returned drying duration, final moisture, and water removed.
   An unsuccessful attempt is not described as a confirmed time to target.
3. AI Recommendations: recorded Gemini output only carries Gemini provenance
   when the response reports verified live generation and a successful tool call.
   Unavailable Gemini and deterministic explanations are explicitly labeled.
4. Moisture Prediction Chart: numeric elapsed minutes, moisture (% wet basis),
   target reference line, and an accessible table of returned samples.
5. What if your AC produces less heat?: explicit 30–45°C slider and simulation
   button, immediately below the chart.
6. View Calculation Details: collapsed thermal demand, mass balance, assumptions,
   validation checks, provenance, model version, Gemini trace, and on-demand
   benchmark evidence.

## What-if implementation and API reuse

- Baseline inputs/results are held as a separate React snapshot. What-if creates
  a new draft object changing only `sourceTemperatureC`; it does not call
  `replaceDraft`, increment the active workspace version, or replace baseline
  predictions. Slider movement submits no requests and produces no results.
- Clicking Run What-If Simulation calls `POST /api/v1/simulations` with the
  modified scenario, then displays returned duration, moisture, and feasibility
  alongside the original results. Both actual response curves can be overlaid.
- Source temperature is a supported profile-sample field. Heat power is held
  constant and the UI explicitly explains this distinction. The 42°C → 35°C
  default is used when compatible; incompatible choices show a validation message.
- `POST /api/v1/plans` requests recommendations and the optimizer's independent
  report for both original and modified scenarios. It reuses the existing Gemini
  Function Calling path. A failed recommendation does not discard the prediction.
- `POST /api/v1/plans/replan` is also reused with the original profile,
  `changed_temperature_c`, and `elapsed_minutes=0` when the window is at least
  15 minutes, as required by the existing replanning service. Its report and
  reason codes are available in adjusted calculation details and its immutable
  history record is retained. Shorter windows still use the direct simulation.
  Replan narration is currently deterministic, so the separate `/plans` request
  supplies the supported path for fresh Gemini narration of the modified
  scenario. No elapsed production progress is implied.
- `GET /api/v1/workspace/thermal-window` and `buildScenarioBody` remain the source
  request gateway. Explicit source/heat overrides describe a constant synthetic
  source over the entered duration.
- `POST /api/v1/physics/mass-balance` supplies calculation details. Target mass
  balance is clearly distinguished from actual predicted removal when the target
  is missed. `POST /api/v1/benchmark` runs only when the operator requests a
  comparison inside calculation details.

For older simulation responses that omit independent validation, the frontend
can use the existing plan report **only if both endpoint summaries match exactly**
(model version, duration, moisture, water removed, energy, and energy floor).
Otherwise the assessment remains undetermined. An existing simulation validation
report is never replaced by a more favorable plan report. No frontend drying
physics or new backend contract is introduced by Phase 06.

The tested 12 kg example at 42°C and 2 kW returned a 340-minute prediction.
The 35°C comparison returned 450 minutes. Both predictions met the 25% target
and passed the backend's checks. The interface reports that actual outcome;
it does not manufacture a failed target for dramatic effect.

## Persistence, history, and compatibility

Google sign-in, restored sessions, account isolation, workspace version checks,
immutable calculation snapshots, save retries, and logout safeguards are reused.
The existing `postScenario` recorder saves simulation, AI plan, replanning, and
requested benchmark responses. What-if simulation/plan requests retain their own temperature-adjusted
input snapshot while the active batch retains its baseline inputs. Replanning
records preserve the original profile plus the explicit temperature change;
duplicating one applies that recorded temperature to the new batch.

Drying History uses friendly record names and timestamps. Saved simulation/plan
records reopen as moisture/result summaries using their original requested
target, with raw snapshots and tool traces in a collapsed record. The latest-plan
Home link can reopen the selected record after refresh or sign-in. Existing
duplication and confirmed deletion are retained. No Firestore schema, collection,
Rules, ownership, or immutability change was made for Phase 06.

Legacy `/site` redirects to `/shop`. `/batch`, `/thermal-profile`, `/simulation`,
`/ai-planning`, `/replanning`, and `/benchmark` redirect to `/drying/new`.
The original engineering components and service adapters remain in source for
reuse. Their functionality is consolidated into the new operator flow rather
than exposed as sidebar destinations. No Engineering Mode control is present.

## Files changed for Phase 06

| Area | Files |
| --- | --- |
| Navigation and pages | `frontend/src/app/navigation/nav-items.ts`, `router/AppLayout.tsx`, `router/HomePage.tsx`, `router/SettingsPage.tsx`, `router/routes.tsx` |
| Flow and assessment | `frontend/src/app/drying/DryingFlowPage.tsx`, `DryingBatchForm.tsx`, `DryingResults.tsx`, `assessment.ts`, `types.ts` |
| Recommendations and comparison | `frontend/src/app/drying/Recommendations.tsx`, `WhatIfSimulation.tsx`, `CalculationDetails.tsx` |
| API composition | `frontend/src/app/preview-services.ts` |
| Shop and history | `frontend/src/features/site/presentation/pages/SiteSetupPage.tsx`, `frontend/src/app/history/HistoryPage.tsx`, `saved-prediction.ts` |
| Reusable UI | `frontend/src/shared/components/DraftForm.tsx`, `PreviewChart.tsx`, `PreviewChartCanvas.tsx`, `frontend/src/index.css` |
| Retained component labels | `frontend/src/features/simulation/presentation/pages/SimulationPage.tsx`, `frontend/src/features/benchmark/presentation/pages/BenchmarkPage.tsx` now label modeled values as Estimated Thermal Energy |
| Tests | `frontend/src/app/Navigation.test.tsx`, `app/drying/assessment.test.ts`, `app/drying/DryingFlowPage.test.tsx`, `app/history/saved-prediction.test.ts`, `frontend/e2e/workspace.spec.ts` |
| Delivery | This report, `PHASE_06_DEPLOYMENT.md`, and `docs/screenshots/phase-06-*.png` |

The earlier Thermal Interactive Upgrade changes were already present in the
working tree and were preserved. Backend edits visible in the combined working
tree belong to that earlier upgrade; Phase 06 did not further edit backend
formulas, endpoints, optimizer, Gemini code, or Firestore Rules.

## Verification

| Check | Result |
| --- | --- |
| Frontend Vitest | 58 passed across 20 files |
| Backend pytest, including Gemini tool regressions | 33 passed |
| Firestore Rules/predeployment emulator tests | 23 passed |
| Production configuration tests | 24 passed |
| Playwright | 5 passed in the final complete run |
| TypeScript | Passed |
| ESLint | Passed, zero warnings |
| Production build | Passed; existing large-bundle warning remains |
| Git whitespace check | Passed |

Browser tests used Edge, local FastAPI with Gemini disabled, and real Firebase
Auth/Firestore emulators under the existing hardcoded demo project. They covered
Google popup sign-in, all four destinations, shop persistence, Home-to-batch
navigation, validation, actual backend values, 42°C → 35°C request mapping,
baseline preservation, error/retry, history after refresh/logout/login,
cross-account isolation, duplicate/delete actions, benchmark retrieval, legacy
bookmarks, mobile navigation, and horizontal overflow at 1440px/390px.

The initial mobile assertion was corrected to count the navigation links while
the mobile menu is collapsed. Component tests mock only chart rendering to keep
behavior checks independent of chart startup; E2E screenshots use real charts.

No live Google OAuth, production Firestore access, live Gemini request, measured
savings, physical dryer calibration, or experimental validation is claimed.
Existing Python dependency deprecation warnings remain.

## Screenshots

| View | Screenshot |
| --- | --- |
| Home, desktop | [Home](docs/screenshots/phase-06-home-desktop.png) |
| Batch form, desktop | [Create a Drying Batch](docs/screenshots/phase-06-batch-desktop.png) |
| Results and comparison, desktop | [Your AI Drying Plan](docs/screenshots/phase-06-plan-desktop.png) |
| Batch form, mobile | [Mobile batch](docs/screenshots/phase-06-batch-mobile.png) |
| Results and comparison, mobile | [Mobile plan](docs/screenshots/phase-06-plan-mobile.png) |

## Known limitations

- The current physics engine is an uncalibrated model. Sample humidity is saved
  for context and does not affect drying; the fixed 85% maximum humidity
  constraint remains unchanged.
- What-if reduces source temperature, not available kW. It is a new full-window
  scenario, not a live sensor event or an in-progress drying control action.
- The active UI result snapshot lasts for the current page visit. Refresh or
  navigation returns to the saved input form; completed results remain available
  in Drying History. A what-if does not change those saved baseline inputs.
- Simulation, AI plan, and replanning snapshots are separate immutable records under the
  existing schema. They are not given a fabricated relationship or server
  attestation. Existing history size limits and in-memory save retries remain.
- Live Gemini is supported through the existing backend but was disabled for
  local regression tests; screenshots intentionally show deterministic fallback.
- Only the backend-supported spent-coffee-grounds material is offered. Settings
  describes the existing display/account behavior rather than introducing a new
  preference storage schema.

**Implementation and regression verification complete. The authorized Hosting
release is live; authenticated production verification remains incomplete as
documented in the live deployment report.**
