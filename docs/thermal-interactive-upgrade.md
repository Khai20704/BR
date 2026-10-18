# Thermal interactive upgrade

Implemented and locally verified on 2026-10-18. No deployment performed.

## Behavior

- Thermal Profile now has editable source temperature, waste heat, operating
  duration, humidity, and minimum/maximum drying temperature controls.
- Apply & Simulate validates and saves the scenario through the existing
  per-user workspace transaction, refreshes the source chart, and calls the
  FastAPI simulation engine. Digital Twin results appear on the same page and
  share the revision-keyed query with the dedicated Digital Twin page.
- Entered temperature and heat define a constant synthetic source with samples
  at minute zero and the requested duration. Demo curves retain their supplied
  shape, are clipped to shorter windows, and are never extrapolated.
- Reset to Demo restores the complete documented draft, including batch mass
  and moisture targets, removes source overrides, and simulates the demo curve.
- Save errors have a retry action. Engine errors have a separate retry. Pending
  requests hide previous results. History-save failures retain the existing
  retry mechanism without calling the physics engine again.
- Humidity is converted from percent to the API's 0–1 sample fraction. It is
  persisted but does not affect current physics; the UI states this explicitly.
  The existing fixed maximum humidity constraint remains 0.85.
- Source controls retain the existing persisted range of 20–70°C. Constraint
  temperatures use the existing 0–200°C contract; the material safety ceiling
  remains 70°C. Cross-field minimum/maximum validation is enforced.
- Removed the dash from the overview heading, browser title, and preview shell.

## Target achievement investigation

The documented scenario computes **24.9846588444% wet-basis at minute 420**,
against a **25% target**. All six existing independent checks pass. The
fine-step integration reports approximately 24.97% wet-basis. The original
numbers were consistent; the UI did not show the target or expose the
independent assessment returned by the planning service.

The simulation POST now adds the requested target, a target-achievement boolean,
and the existing validator's report. The boolean requires both the coarse
prediction and independent target check to pass. Overall feasibility remains
separate and includes mass balance, energy, time, temperature, and agreement
checks. Coarse crossing notes are explicitly labelled as predictions. Older
responses without these fields show unverified achievement.

Integration now clips the final step to the duration, phase, and source horizon
and includes the terminal trajectory point for a nonzero run. This prevents a
7-minute request from running for 10 minutes or omitting its final chart point.
The optimizer selection and Gemini Function Calling code were not changed.

## Persistence and provenance

Existing Firestore schema and rules are unchanged. The controls use fields
already accepted by the draft schema and existing scenario API. Workspace
version checks, immutable simulation snapshots, per-user isolation, and history
retries remain in place. Predictions are labelled as model output, source
inputs as synthetic, and no data is represented as experimentally validated.

## Verification

| Suite | Result |
| --- | --- |
| Frontend Vitest | 41 passed |
| Backend pytest, including agent tools | 33 passed |
| Firestore Rules and predeployment emulator suites | 23 passed |
| Production configuration tests | 24 passed |
| Playwright | 5 scenarios passed (4 existing plus the new thermal scenario rerun) |
| ESLint | Passed, zero warnings |
| TypeScript and production build | Passed |
| Git whitespace check | Passed |

The browser tests used local FastAPI with Gemini disabled, Firebase Auth and
Firestore emulators, and Edge. Coverage includes workspace restoration,
simulation history, account isolation, mobile/desktop layouts, exact request
mapping, invalid temperature constraints, simulation failure/retry, zero heat,
and demo reset. An obsolete login-heading test assertion was updated to match
the existing login page. The new reset assertion was corrected to expect the
rounded display value of 55% before its successful rerun.

The first sandboxed browser attempt could not open Firebase's Google popup;
the approved unrestricted test run succeeded. No live OAuth, production
Firestore, or live Gemini verification is claimed. Existing large-bundle and
Python dependency deprecation warnings remain.

Deployment requires approval. Release backend and frontend together to expose
the new assessment; the frontend safely labels older backend responses as
unverified. There are no Firestore Rules changes to deploy for this upgrade.
