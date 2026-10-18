# Phase 06 deployment preparation

**The owner explicitly authorized deployment, and Hosting was released on
2026-10-18.** See [the live deployment report](PHASE_06_LIVE_DEPLOYMENT_REPORT.md).
Cloud Run, Firestore Rules, and Firebase Authentication configuration were not
modified or redeployed. The procedures below remain the release runbook.

## Release scope

Phase 06 is a frontend refactor. It requires no Firestore migration, security
rule change, new collection, additional credential, or backend endpoint. Existing
Firebase Auth and per-user workspace/history storage remain in use.

Production targets remain those documented in Phase 05:

- Firebase project: `breake-the-rules`
- Hosting: `https://breake-the-rules.web.app`
- Existing API: `https://br-api-916064977717.asia-southeast1.run.app`

The working tree also contains the earlier, separately reported Thermal
Interactive Upgrade. Its pending backend changes must be included explicitly
in any release review; Phase 06 does not authorize their deployment. When an
older API omits simulation validation, the new UI uses a matching plan's
existing independent report, or shows an undetermined assessment.

## Completed local verification

See [PHASE_06_REPORT.md](PHASE_06_REPORT.md) for results and screenshots. The final
checks passed: 58 frontend tests, 33 backend tests, 23 Rules tests, 24 production
configuration tests, five browser scenarios, typecheck, lint, and production
build. Existing bundle-size and Python deprecation warnings remain.

### Reproduce locally

Use separate PowerShell terminals and the existing dependencies. Emulator
commands use only `demo-br-phase05`, not the production project. Rules tests
clear this demo database; finish them before browser tests.

From repository root:

```powershell
firebase.cmd emulators:start --only auth,firestore --project demo-br-phase05
```

From `backend`:

```powershell
python -m pytest -q
$env:BR_ALLOWED_ORIGINS='http://127.0.0.1:5206'
python -c "from app.agents import gemini_planner; gemini_planner.api_key=lambda: None; import uvicorn; uvicorn.run('app.main:app',host='127.0.0.1',port=8016)"
```

From `frontend`, start the local app with emulator-only public configuration:

```powershell
$env:VITE_FIREBASE_API_KEY='demo-key'
$env:VITE_FIREBASE_AUTH_DOMAIN='demo-br-phase05.firebaseapp.com'
$env:VITE_FIREBASE_PROJECT_ID='demo-br-phase05'
$env:VITE_FIREBASE_APP_ID='demo-app'
$env:VITE_FIREBASE_MESSAGING_SENDER_ID='123'
$env:VITE_FIREBASE_EMULATORS='true'
$env:VITE_DATA_MODE='http'
$env:VITE_API_BASE_URL='http://127.0.0.1:8016'
npm.cmd run dev -- --host 127.0.0.1 --port 5206 --strictPort
```

From another `frontend` terminal:

```powershell
npm.cmd test -- --run
npm.cmd run test:rules
npm.cmd run test:config
npm.cmd run typecheck
npm.cmd run lint
$env:BR_E2E_BASE_URL='http://127.0.0.1:5206'
npm.cmd run test:e2e
```

Browser tests use Firebase's Google popup helper and may require network access
to Google's script host even with Auth Emulator. They do not authenticate a
real Google account or establish that live OAuth works.

From a **clean terminal without emulator environment overrides**, build the
production artifact using the existing ignored production public configuration:

```powershell
npm.cmd run build
```

The production guard rejects emulator builds, placeholder app configuration,
fixture mode, or an unexpected API origin. Never copy a demo-configured build
to production.

## After owner approval only

1. Review the Phase 06 diff, screenshots, tests, and any earlier pending changes.
   Confirm the approved release scope and record the current Hosting release
   identifier for rollback.
2. Build `frontend/dist` using the real production public configuration in a
   clean terminal. No backend secret belongs in this build.
3. If the approved scope is this frontend refactor, publish **Hosting only** from
   repository root:

   ```powershell
   firebase.cmd deploy --only hosting --project breake-the-rules
   ```

4. Do not publish Firestore Rules/indexes or Cloud Run as part of Phase 06. If
   earlier pending work is separately approved, follow its reviewed release
   procedure and record it as a distinct production action.
5. With an approved test account, verify live Google login/session restoration,
   the four navigation links, shop save, batch validation, plan generation,
   42°C → 35°C comparison, original-input preservation, saved records, and mobile
   interaction. Verify actual response provenance before claiming a live Gemini
   recommendation; a local deterministic fallback is not live verification.
6. Record live verification results and the released Hosting version.

## Rollback

Restore the recorded prior Firebase Hosting release if acceptance fails. No
schema migration is required for this refactor. Preserve user documents and
historical snapshots; do not delete data or reset accounts to roll back the UI.
Keep the existing Firestore Rules and backend deployment in place.

**The authorized Hosting deployment has been performed. Live authenticated
verification stopped when the browser closed during sign-in; see the live
deployment report for the remaining checks.**
