# Phase 05 security hardening and release readiness

Date: 2026-10-18. Status: both review findings remediated and regression-tested locally. Ready for production approval; **not deployed**. Live Google OAuth and production persistence verification remain pending the approved release.

## Identity fix

`firestore.rules` now compares every profile create/update against Firebase Auth token claims: `email` -> `email`, `displayName` -> `name`, `photoURL` -> `picture`. Missing/null claims normalize to empty strings. Clients cannot substitute invented values when claims are absent. Field allowlists, UID ownership, immutable creation timestamps, server request-time updates, and default-deny access remain enforced.

`frontend/src/core/auth/sync-profile.ts` reads a freshly refreshed ID token and builds the profile from its signed claims rather than potentially stale `User` or provider metadata. `ScenarioProvider.tsx` invokes this helper and stops before writing if the session ended. A permission-denied race gets at most one retry with another refreshed token; persistent errors stay visible. No token is saved in Firestore. Legitimate refreshed Auth identity can update the mirror while preserving `createdAt`.

Auth remains authoritative. Auth display names/photos may themselves be user-editable: matching them establishes consistency with the authenticated account, not independent real-world identity verification. Already-issued tokens can carry older claims until expiry/refresh; Rules validate the signed token on the request, not a live lookup of the Auth user database. Forced refresh at profile synchronization reduces stale mirrors but cannot make issued tokens instantly revocable. No email-based authorization or privilege was introduced.

Emulator regressions cover six formerly accepted spoof writes, valid claim-matched creation/update, absent/null identity claims, refreshed identity changes, extra privilege-field rejection, all mutable timestamps, UID isolation, anonymous access, all four bounded history queries, history immutability, and default-deny paths.

## Production guard fix

`frontend/scripts/validate-production.mjs` loads Vite production environment files and applies process environment overrides, then validates the effective configuration before compilation. It requires:

- Project: `breake-the-rules`.
- Auth domain: `breake-the-rules.firebaseapp.com`.
- App ID: `1:330692718529:web:a9b24b70cdfe2a7c980940`.
- Messaging sender ID: `330692718529`.
- API origin: `https://br-api-916064977717.asia-southeast1.run.app` (exact match).
- Data mode: `http`.
- Emulator flag: absent/empty or exactly `false`.
- Firebase public API key: present, valid format, not an obvious placeholder.

Wrong identities, fixture/preview mode, missing/placeholder values, HTTP/localhost/wrong HTTPS origins, and API paths are rejected. The public release identifiers are allowlisted in validation only; Firebase runtime configuration still comes from environment variables. No Gemini key or service-account credential was added. API-key format checking is offline validation, not proof that Google accepts that key.

`scripts/build-production.ps1` requires the approved API origin, uses `npm.cmd`, and invokes the same validated build. It no longer silently overrides a fixture data mode. The build restores the caller's API environment afterward. Runtime emulator connections remain gated by Vite development mode and the explicit emulator flag.

Configuration tests exercise Vite `.env.production`, `.env.production.local` precedence and process overrides using a temporary directory, as well as all formerly failing configuration cases. Both direct npm build and the PowerShell production build entry point succeeded with the real local public configuration.

## Final verification results

| Check | Passed | Failed |
| --- | ---: | ---: |
| Firestore Emulator: original suite | 4 | 0 |
| Firestore Emulator: expanded security suite | 19 | 0 |
| Production configuration | 24 | 0 |
| Frontend Vitest (14 files) | 33 | 0 |
| Backend pytest | 29 | 0 |
| Playwright E2E | 4 | 0 |
| **Total automated tests** | **113** | **0** |

TypeScript typecheck, ESLint, npm production build, and PowerShell production build also passed. Build still reports the large-bundle advisory; backend reports two deprecation warnings. The six previously failing identity tests and five previously failing configuration tests now pass.

`npm.cmd run test:rules` now runs both Rules suites sequentially (23 tests); `npm.cmd run test:config` runs the 24 configuration tests. The Rules suites clear only the hardcoded local demo emulator database; do not run them concurrently with E2E. Logs are local ignored files: `frontend/rules-hardening.log` and `frontend/config-hardening.log`.

The four browser tests verify Google-provider login through Firebase Auth Emulator, session/workspace restoration after refresh and re-login, simulation/AI planning/replanning/benchmark history, history actions, account separation, protected routes, and eight pages at desktop/mobile sizes. The local backend disables Gemini, so saved AI history includes deterministic planner behavior; this is not a claim of live Gemini or real Google OAuth verification.

## Preservation and release boundary

No Physics Engine, optimization formula, Gemini Function Calling implementation, API response contract, or business calculation logic was changed. Backend tests remain green. Historical results stay client-owned, immutable through Rules but not server-attested engineering measurements. Thermal energy remains a model prediction, not measured electricity savings.

No Firebase Hosting deployment, live Firestore Rules update, provider change, IAM change, backend deployment, or other cloud-resource modification was performed. Production approval is still required before following `PHASE_05_DEPLOYMENT.md`. Live OAuth, browser-specific redirect behavior, and production save/restore should be verified after that approved release.
