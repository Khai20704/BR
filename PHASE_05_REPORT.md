# Phase 05 implementation report

Date: 2026-10-18. Status: implemented and locally verified; production deployment and live verification pending approval.

Security hardening update: both pre-deployment findings are fixed. Profile mirrors now match Firebase Auth token claims, including safe null/missing handling; production guards enforce the approved app/API and HTTP data mode. Final regression results: **113 tests passed, 0 failed**. See `PHASE_05_SECURITY_REVIEW.md`. Production approval and live verification remain pending.

## Delivered

- Google sign-in popup, explicit redirect fallback, restored Firebase Auth sessions, loading/error screens, account name/photo/email, logout, and protected workspace routes.
- Firestore workspace scoped to the authenticated UID. Site metadata uses validated debounced autosave; source and batch forms use explicit save/apply. Workspace loading blocks editing until restoration succeeds.
- Atomic workspace transactions with revision checks reject stale writes from another tab. Save failures remain visible with retry; failed history writes can retry without rerunning calculations. Account changes remount workspace and query caches; auth listeners and history recorders are cleaned up.
- Simulation, AI planning, replanning, and benchmark history: full request/result snapshots, model version, server timestamps, bounded queries of 20 records, detail view, scenario duplication, and confirmed deletion. Historical documents cannot be updated through client rules.
- Default-deny Firestore Rules enforce UID ownership, field allowlists, numeric ranges, server timestamps, version increments, bounded history payloads, immutable historical records, and owner-only deletion.
- Public Firebase configuration is read from environment variables. The supplied real web configuration is in ignored `frontend/.env.production.local`; no backend secret is required by the browser. Production builds validate required configuration and reject emulator mode.

## Verification

| Check | Result |
| --- | --- |
| TypeScript (`tsc -b`, included in build) | Passed |
| Production build | Passed; existing large-bundle warning remains |
| ESLint | Passed, zero warnings |
| Production configuration regression tests | 24 passed |
| Vitest unit/component tests | 33 passed across 14 files |
| Backend pytest | 29 passed; two dependency/deprecation warnings |
| Firestore Emulator security tests | 23 tests passed across both suites, including expected denial assertions |
| Playwright browser tests | 4 passed: persistence/history/isolation, eight pages at 1440px and 390px, unauthenticated deep-link redirect |
| Dependency audit after patched gRPC override | 0 reported vulnerabilities |

Browser tests exercised Firebase SDK Google popup login against **Auth Emulator**, real Firestore Emulator reads/writes, and a local FastAPI server with Gemini disabled. They created site/batch/source data, refreshed, restored inputs, saved all four history types, reopened/duplicated/deleted records, logged out/in, and verified a second user's history was empty. Rules tests separately attempted cross-user reads/writes/deletes, anonymous access, invalid data, history updates, and oversized/unbounded requests. The security test setup clears only the hardcoded demo emulator database before running, so reruns are independent.

**Not claimed:** live Google OAuth, production Firestore access, live Gemini generation in this test run, redirect fallback across browser privacy modes, or production deployment. Those require the approved release and live verification described in `PHASE_05_DEPLOYMENT.md`.

## Implementation boundaries and limitations

- The backend physics formulas, optimizer, Gemini tool flow, and API contracts were not changed for Phase 05. FastAPI remains the calculation service; this phase secures Firestore storage, not the existing public calculation API. No cross-project IAM or service-account access was added.
- One active site/batch/scenario per user is supported. Independent experiments are preserved as history snapshots; duplication replaces the active draft and gives it a new batch identifier. There is no multi-site management UI.
- History saves every successful validated HTTP calculation response, including fallback/no-feasible-plan responses. Entering a calculation page can trigger such a request under existing query behavior. A saved AI history record does not itself mean Gemini generated a recommendation.
- Full snapshots use bounded JSON strings. Rules validate the envelope, size, ownership, and immutability; they cannot validate the engineering contents inside JSON. Client-owned history is **not server-attested**, and an authorized owner could submit fabricated contents through another client. Never present these records as verified measurements.
- Snapshots contain actual request inputs, material parameters, source profile, returned results/tool traces, and physics model version when exposed. The API does not expose the exact Gemini model name, so it is explicitly recorded as `backend-configured (not exposed by API)`. Exact reproduction of nondeterministic AI wording is not guaranteed. No false simulation-to-plan foreign-key relationship is invented.
- Failed saves remain in memory for retry; they do not survive tab closure. Offline database persistence is not enabled. Logout warns when workspace/history saves are pending or failed. Site edits inside the debounce window should be saved before leaving the form.
- Cross-tab revision conflicts require reload; there is no automatic merge. History details currently show structured JSON, including predicted drying duration/thermal energy and tool outputs, rather than specialized historical charts.
- Synthetic and manual/unverified source provenance remain distinct. The legacy measured label explicitly says verification pending; no verified sensor-ingestion pipeline was added. Thermal energy is a model prediction, **not measured electricity savings**.
- Firebase adds browser bundle weight (main bundle approximately 1.09 MB uncompressed / 331 KB gzip). A narrow `@grpc/grpc-js` 1.13.6 override patches the Node-side transitive dependency; revisit when Firebase updates its dependency.

## Main files

| Area | Files |
| --- | --- |
| Auth/config | `frontend/src/core/auth/*`, `frontend/src/core/firebase/client.ts`, `frontend/src/app/auth/*` |
| Persistence | `frontend/src/core/workspace/*`, `frontend/src/core/scenario/ScenarioProvider.tsx`, `frontend/src/core/scenario/scenario-gateway.ts` |
| UI integration | `frontend/src/app/providers/AppProviders.tsx`, `frontend/src/app/router/*`, `frontend/src/app/history/HistoryPage.tsx`, site/batch/benchmark pages, `DraftForm.tsx` |
| Rules/config | `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `frontend/.env.production.example`, `frontend/scripts/validate-production.mjs` |
| Tests | `frontend/security/firestore.test.mjs`, `frontend/e2e/workspace.spec.ts`, workspace repository/model tests, auth/navigation component tests, `sync-profile.test.ts`, `security/predeployment.test.mjs`, `security/production-config.test.mjs` |
| Documentation | `docs/phase-05-data-model.md`, `PHASE_05_DEPLOYMENT.md` |

Existing unrelated working-tree changes were preserved. Live Firestore deny-all rules, Firebase providers, production URLs, and cloud resources remain unchanged. Stop here pending deployment approval.
