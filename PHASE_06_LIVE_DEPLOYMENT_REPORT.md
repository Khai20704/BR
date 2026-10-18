# Phase 06 production deployment and live verification

Date: 2026-10-18, Asia/Bangkok. The owner explicitly authorized production
deployment in this session. **Firebase Hosting deployment succeeded. Live
authenticated verification stopped when the verification browser closed during
the Google sign-in step.** No infrastructure repair or automatic rollback was
attempted.

## Deployment

| Item | Recorded value |
| --- | --- |
| Production URL | https://breake-the-rules.web.app |
| Firebase project/site | `breake-the-rules` |
| Deployment scope | Hosting only |
| Live release | `1792326402007000` |
| Live Hosting version | `63151e68a7f7fe5b` |
| Release status | `FINALIZED` |
| Release time | 2026-10-18 19:26:42.007 Asia/Bangkok (12:26:42.007 UTC) |
| Previous release for rollback | `1792319888766000` |
| Previous Hosting version | `bd7929e21ff1a2b9` |
| Existing API, unchanged | https://br-api-916064977717.asia-southeast1.run.app |

The deployment command was exactly:

```powershell
firebase.cmd deploy --only hosting --project breake-the-rules
```

Cloud Run, Firestore Rules/indexes, and Firebase Authentication configuration
were not modified or redeployed. The earlier pending backend changes were not
deployed.

The source was the completed Phase 06 **uncommitted working tree on `main`**,
with base commit `77b18fa11fb79f0c834532c748632ff56321b5b7`.
No commit was created as part of deployment.

## Fresh predeployment verification

All 143 tests passed again before release:

- 58 frontend tests across 20 files.
- 33 backend tests.
- 23 Firestore Rules/predeployment emulator tests.
- 24 production configuration tests.
- Five complete browser scenarios using Auth/Firestore emulators and local
  FastAPI, including the 42°C → 35°C flow, history, and mobile layouts.

Typecheck and ESLint passed. The existing validated production build script was
executed with the approved API URL and completed successfully. The existing
large-bundle warning remains.

Effective production configuration was verified:

- Firebase project: `breake-the-rules`.
- Auth domain: `breake-the-rules.firebaseapp.com`.
- Firebase app: `1:330692718529:web:a9b24b70cdfe2a7c980940`.
- Messaging sender: `330692718529`.
- API: `https://br-api-916064977717.asia-southeast1.run.app`.
- `VITE_DATA_MODE=http`; emulators disabled.

The production page's HTML, main JavaScript, CSS, and lazy chart JavaScript were
downloaded from Hosting and independently matched the built files by SHA-256.
The deployed artifact is the verified Phase 06 build, not a localhost preview.

## Live results

| Check | Result |
| --- | --- |
| Production Hosting assets and checksums | Passed; all four application artifacts matched |
| Deployed login page | Passed on production origin |
| Google OAuth popup | Reached `https://accounts.google.com`; completed sign-in unverified |
| Public production mobile login layout | Passed at 390px, no horizontal overflow |
| Cloud Run health | HTTP 200, `thin-layer-1.0`, Gemini configured |
| Production-origin API/CORS and real simulation calls | Passed |
| Real 42°C → 35°C backend comparison | Passed through public API calls originating from the deployed page |
| Four-item authenticated sidebar | Verified in released source/build and emulator E2E; runtime production check incomplete |
| Home → Create a Drying Batch → Your AI Drying Plan | Emulator E2E passed; authenticated production UI check incomplete |
| Production Firestore persistence and Drying History | Incomplete; requires completed owner sign-in |
| Production refresh/session restoration | Incomplete; requires completed owner sign-in |
| Authenticated production mobile results/what-if layout | Incomplete; emulator mobile E2E passed |
| Live Gemini Function Calling | Attempted, not verified; deterministic fallback returned |

Real production backend results for the same 12 kg, 62% → 25% wet-basis example
with 2 kW available heat and a 480-minute window:

| Source temperature | Predicted duration | Predicted final moisture | Predicted water removed | Modeled thermal demand |
| --- | --- | --- | --- | --- |
| 42°C | 340 minutes | 24.9544% wet basis | 5.923697 kg | 7.185737 kWh |
| 35°C | 450 minutes | 24.981% wet basis | 5.921543 kg | 7.232551 kWh |

These are real backend model predictions, not measurements or experimental
validation. The existing production simulation endpoint omits the added target
assessment fields; the frontend's matching-plan compatibility path handles this.
The production plan response reported `VALIDATED` numerical model checks.

Both live recommendation requests returned:

```text
provider: deterministic-after-error
verification: LIVE_GEMINI_NOT_VERIFIED
successful recorded tool calls: none
```

Although health reports Gemini configured, this does not establish a successful
Gemini request. No genuine live Gemini Function Calling success is claimed.
Backend settings were left untouched.

## Verification interruption and stop

The owner was asked only to complete Google sign-in in the newly opened
production verification browser, and replied that they were signing in. During
that step the browser/page closed. The verifier stopped with:

```text
locator.isVisible: Target page, context or browser has been closed
```

This occurred at 2026-10-18 19:31:17.711 Asia/Bangkok. The verifier did not reach
the signed-in application workflow and did not create production batch/history
records through that workflow. Public engineering API requests were exercised
without treating them as proof of authenticated UI or Firestore behavior.

Following the owner's explicit stop-on-critical-error instruction, no additional
live verification or infrastructure modifications were attempted after the
browser interruption. The successful Hosting release remains live. Completing
the remaining checks requires a stable signed-in production browser session.

## Evidence

- [Previous release](docs/phase-06-hosting-before.json)
- [Deployed release](docs/phase-06-hosting-after.json)
- [Build configuration and artifact hashes](docs/phase-06-production-build.json)
- [Live verification results](docs/phase-06-live-verification.json)
- [Production login, desktop](docs/screenshots/production/login-desktop.png)
- [Production login, mobile](docs/screenshots/production/login-mobile.png)
- Verifier: `frontend/scripts/verify-production.mjs`.

Browser credentials and session files are confined to the ignored
`.firebase/phase-06-live-browser` profile. They were not extracted, printed, or
added to the report. No Google password was entered by the agent.
