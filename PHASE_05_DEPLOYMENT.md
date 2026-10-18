# Phase 05 release and verification

Prepared only. **Do not execute production deployment commands until the project owner approves.** No deployment or live rules update was performed during implementation.

## Targets

- Firebase Authentication, Firestore, Hosting: `breake-the-rules`.
- Hosting URL: `https://breake-the-rules.web.app`.
- Existing Cloud Run project: `project-7edd11d1-184a-4628-bfc`; service `br-api`, region `asia-southeast1`.
- Existing API: `https://br-api-916064977717.asia-southeast1.run.app`.

These are separate Google Cloud projects. This client-persistence release needs no backend deployment, service-account key, cross-project IAM change, or authentication-provider modification.

## Build configuration

Use the actual registered Firebase web app values in ignored `frontend/.env.production.local` or CI build environment. The local file has already been populated from the owner's supplied public config. Never commit backend secrets.

Required: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_API_BASE_URL`. Set `VITE_DATA_MODE=http`. Leave `VITE_FIREBASE_EMULATORS` absent or false. See `.env.production.example` for the public project and API values. Storage/Analytics are not used in this phase.

`npm.cmd run build` validates the exact approved app identifiers/API origin, requires HTTP data mode, rejects emulator/placeholder configuration, type-checks, and builds `frontend/dist`. Vite public configuration is intentionally embedded in the browser bundle; it is not a backend secret. Firestore access protection comes from Firebase Auth and Rules.

## Repeat local verification (PowerShell)

Run commands from the indicated directories in separate terminals. Use Node/npm, Python with `backend/requirements.txt`, Firebase CLI, Java, and Playwright's Edge channel installed locally. Install locked frontend dependencies with `npm.cmd ci`. Security and browser tests use only `demo-br-phase05`, never the production project. Rules tests clear the demo database, so do not run them concurrently with browser tests.

From repository root:

```powershell
firebase.cmd emulators:start --only auth,firestore --project demo-br-phase05
```

From `backend`, run a deterministic test server without live Gemini calls:

```powershell
$env:BR_ALLOWED_ORIGINS='http://127.0.0.1:5205'
python -c "from app.agents import gemini_planner; gemini_planner.api_key=lambda: None; import uvicorn; uvicorn.run('app.main:app',host='127.0.0.1',port=8015)"
```

From `frontend`, start a dedicated development terminal:

```powershell
$env:VITE_FIREBASE_API_KEY='demo-key'
$env:VITE_FIREBASE_AUTH_DOMAIN='demo-br-phase05.firebaseapp.com'
$env:VITE_FIREBASE_PROJECT_ID='demo-br-phase05'
$env:VITE_FIREBASE_APP_ID='demo-app'
$env:VITE_FIREBASE_MESSAGING_SENDER_ID='123'
$env:VITE_FIREBASE_EMULATORS='true'
$env:VITE_DATA_MODE='http'
$env:VITE_API_BASE_URL='http://127.0.0.1:8015'
npm.cmd run dev -- --host 127.0.0.1 --port 5205 --strictPort
```

From another `frontend` terminal:

```powershell
npm.cmd run test:rules
npm.cmd run test:config
npm.cmd run test:e2e
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- --run
```

The browser test uses the Google-provider popup in Auth Emulator. Firebase's popup helper may need access to Google's script host. It does not validate real Google credentials. From a clean terminal without emulator environment overrides, run `npm.cmd run build` in `frontend`. Run `python -m pytest tests -q` from `backend`. Build/test commands do not deploy anything.

## Approved release procedure (not executed)

1. Review `PHASE_05_REPORT.md`, the exact Rules file, diff, and test results. Preserve the currently deployed Hosting release identifier and the current deny-all rules in release records. Obtain explicit owner approval.
2. Build the frontend with real public production config. Existing `scripts/build-production.ps1` invokes the same validated build; use `npm.cmd run build` directly if PowerShell script execution is restricted.
3. Publish only reviewed Firestore Rules/index configuration to the explicitly named Firebase project:

   ```powershell
   firebase.cmd deploy --only firestore:rules,firestore:indexes --project breake-the-rules
   ```

4. Publish the prepared static frontend:

   ```powershell
   firebase.cmd deploy --only hosting --project breake-the-rules
   ```

5. Verify live Google popup login, logout, refresh/session restoration, and private workspace persistence with an approved test account. Verify the redirect option on intended desktop/mobile browsers; the configured `firebaseapp.com` auth domain can interact with third-party storage restrictions. Do not assume emulator success proves that redirect works in every browser. Any auth-domain/provider changes require separate review.
6. Run a simulation and a real Gemini-backed plan if authorized, reopen their saved records after logout/login, and check returned planner mode/tool trace. Confirm another account sees only its own records. Keep synthetic/manual labels accurate; do not call model thermal energy electricity savings.
7. Record live results and any failures. Production acceptance remains pending until these checks pass. Remove approved test records through the owner's history controls if desired.

## Migration and rollback

There is no durable Phase 04 data migration. See `docs/phase-05-data-model.md` for first-login behavior and schema adaptation. The current implementation supports one active workspace per user plus immutable run history.

If a release fails, roll Hosting back to the recorded previous release through Firebase Hosting release history. If access needs to be closed, restore the prior reviewed deny-all Firestore Rules through the approved release process. This prevents client access but does not erase stored records. Do not delete the Firestore database, user accounts, or history to roll back. Existing backend deployment remains untouched. Correct and emulator-test the issue before requesting another production release.
