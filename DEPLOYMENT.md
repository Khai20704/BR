# Br deployment: approval required

Status: prepared locally, NOT deployed. No cloud resources, secrets, IAM policies,
APIs or billing settings were changed during preparation. Execute the sections
below only after explicit approval. Commands assume Windows PowerShell and stop
on each reported failure. Do not paste a key into chat, an argument or source code.

## Decisions and prerequisites

- Supply Google Cloud project ID and Firebase project ID; using the same existing
  project is simplest. Enable Firebase/Hosting for that project in the console.
  Commands assume its default Hosting site (`PROJECT_ID.web.app`). A custom site
  requires its real origins and a Firebase hosting target before deployment.
- Proposed region: `asia-southeast1`. Confirm this and public unauthenticated access.
- Active billing on the Cloud project; source builds, Artifact Registry, Cloud Run,
  Secret Manager and Gemini may charge. Set budget alerts and Gemini project quotas
  before opening the demo. Alerts and max-instances are NOT hard spending caps.
- Install Google Cloud CLI, Firebase CLI, Node.js 24 and Python 3.12. These cloud
  CLIs and Docker were not found on this workstation during preparation. Docker
  is optional for source deployment; the Linux container build remains unverified.
- An administrator must authorize API enablement, service-account creation, secret
  creation and IAM bindings. Do not grant Owner/Editor to the runtime identity.
- Deployer needs Cloud Run Source Developer, Service Usage Consumer and Service
  Account User on the runtime and selected build accounts. First publication and
  secret configuration also require Cloud Run Admin/service IAM permissions.
  Firebase deployment needs Firebase Hosting Admin on the Firebase project.
  Bootstrap needs Service Usage Admin, Service Account Admin, project IAM policy
  modification, and Secret Manager administration. Scope temporary admin grants
  to the administrator; do not give them to the runtime account.
- Runtime account receives Secret Accessor on this one secret only. The dedicated
  build account gets Cloud Run Builder on the project and no secret access.
  Review inherited project/org IAM: a secret binding cannot revoke inherited access.

## 1. Select projects and authenticate (after approval)

Run from the repository root. Set real IDs; do not run with placeholders.

```powershell
Set-Location C:\Users\khait\OneDrive\Desktop\BR\BR
$CloudProject = 'YOUR_GOOGLE_CLOUD_PROJECT_ID'
$FirebaseProject = 'YOUR_FIREBASE_PROJECT_ID'
$Region = 'asia-southeast1'
$Service = 'br-api'
$SecretName = 'br-gemini-api-key'
$RuntimeAccount = "br-runtime@$CloudProject.iam.gserviceaccount.com"
$BuildAccount = "br-build@$CloudProject.iam.gserviceaccount.com"
$DeployerEmail = 'YOUR_GOOGLE_ACCOUNT_EMAIL'
function Assert-CommandSucceeded {
    if ($LASTEXITCODE -ne 0) { throw 'Command failed. Stop deployment and inspect the error.' }
}
gcloud auth login
Assert-CommandSucceeded
firebase login
Assert-CommandSucceeded
```

Use explicit `--project` on every cloud command to avoid changing another project.

## 2. Enable only required services and create identities (approval gate)

```powershell
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com iam.googleapis.com --project $CloudProject
Assert-CommandSucceeded
gcloud iam service-accounts create br-runtime --display-name 'Br runtime' --project $CloudProject
Assert-CommandSucceeded
gcloud iam service-accounts create br-build --display-name 'Br build' --project $CloudProject
Assert-CommandSucceeded
gcloud projects add-iam-policy-binding $CloudProject --member "serviceAccount:$BuildAccount" --role roles/run.builder
Assert-CommandSucceeded
gcloud iam service-accounts add-iam-policy-binding $RuntimeAccount --member "user:$DeployerEmail" --role roles/iam.serviceAccountUser --project $CloudProject
Assert-CommandSucceeded
gcloud iam service-accounts add-iam-policy-binding $BuildAccount --member "user:$DeployerEmail" --role roles/iam.serviceAccountUser --project $CloudProject
Assert-CommandSucceeded
```

Skip creation only after verifying an existing identity has the intended ownership
and permissions. Source deployment creates its Artifact Registry repository if
needed; this is also a billable resource covered by the approval gate.

## 3. Create/import the secret (separate explicit approval)

Prefer an existing dedicated Gemini key with API restriction to the Gemini API.
Do not use browser referrer restrictions for the backend key. Restrict quotas in
its owning project. Secret Manager protects storage/access, not API expenditure.

```powershell
gcloud secrets create $SecretName --replication-policy automatic --project $CloudProject
Assert-CommandSucceeded
$SecureKey = Read-Host 'Gemini API key (hidden input)' -AsSecureString
$KeyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureKey)
try {
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR($KeyPointer) | gcloud secrets versions add $SecretName --data-file=- --project $CloudProject
    Assert-CommandSucceeded
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($KeyPointer)
    $SecureKey.Dispose()
    Remove-Variable SecureKey,KeyPointer
}
gcloud secrets add-iam-policy-binding $SecretName --member "serviceAccount:$RuntimeAccount" --role roles/secretmanager.secretAccessor --project $CloudProject
Assert-CommandSucceeded
$SecretVersion = '1'
```

Select the actual numeric version from the add command. Do not use `latest`.
For an existing secret, skip creation and import only with separate rotation
approval. Never retrieve a secret value just to confirm that it exists.

## 4. Build and deploy backend (public-service approval gate)

```powershell
$OriginList = "https://$FirebaseProject.web.app,https://$FirebaseProject.firebaseapp.com"
# JSON is valid YAML; an env file avoids Windows gcloud delimiter escaping.
$RunEnvironmentFile = [IO.Path]::GetTempFileName()
@{ BR_ENV='production'; BR_ALLOWED_ORIGINS=$OriginList; BR_GEMINI_MODEL='gemini-3.8-flash' } | ConvertTo-Json | Set-Content -LiteralPath $RunEnvironmentFile -Encoding Ascii
gcloud run deploy $Service --source ./backend --project $CloudProject --region $Region --build-service-account "projects/$CloudProject/serviceAccounts/$BuildAccount" --service-account $RuntimeAccount --allow-unauthenticated --port 8080 --cpu 1 --memory 512Mi --min-instances 0 --max-instances 1 --concurrency 4 --timeout 120 --env-vars-file $RunEnvironmentFile --set-secrets "GEMINI_API_KEY=${SecretName}:${SecretVersion}" --startup-probe 'httpGet.path=/health,httpGet.port=8080,initialDelaySeconds=0,timeoutSeconds=3,periodSeconds=10,failureThreshold=12'
Assert-CommandSucceeded
Remove-Item -LiteralPath $RunEnvironmentFile
$ApiUrl = (gcloud run services describe $Service --project $CloudProject --region $Region --format='value(status.url)').Trim()
Assert-CommandSucceeded
Invoke-RestMethod "$ApiUrl/health"
```

The Dockerfile uses Python 3.12, a non-root user, only runtime dependencies, one
Uvicorn worker, `0.0.0.0` and Cloud Run `PORT`. Upload/image contexts allow only the
application, entry point, runtime requirements and build configuration. No key
is supplied to the build. Cloud Run injects the selected secret at runtime.

Production startup rejects missing, wildcard or non-HTTPS allowed origins.
Local startup without BR_ENV=production retains localhost defaults.
Public demo guard: 30 non-health requests/minute per process, 256 KiB request
bodies, generic tool errors, and 20-second timeout per Gemini SDK request.
The existing four-round tool limit remains. At most four requests run concurrently
under the proposed service configuration. The limiter resets on restart and is
not a global quota; extra instances/revisions can increase aggregate usage.
No authentication or distributed abuse protection is claimed. Direct API clients
can call public endpoints regardless of CORS. Reassess access controls before
long-term public operation. Missing secret IAM prevents container startup; missing
or failed Gemini at application level still produces deterministic narration.

## 5. Build and publish Firebase Hosting (approval gate)

```powershell
.\scripts\build-production.ps1 -ApiBaseUrl $ApiUrl
firebase deploy --only hosting --project $FirebaseProject --config firebase.json
Assert-CommandSucceeded
```

Dependencies are already installed locally. On a clean checkout run `npm ci` in
frontend first. The script requires an actual HTTPS origin and forces HTTP mode.
Alternatively copy frontend/.env.production.example to .env.production.local and
replace its placeholder, then build; never add private values to any VITE variable.
Firebase uploads only frontend/dist with SPA rewrites and basic security headers.
The verification build used an intentionally unreachable `.invalid` API URL; it is
NOT a release artifact. Rebuild with the returned Cloud Run URL before deployment.
No Firebase browser SDK/config or frontend API key is needed for static Hosting.

## 6. Verify public URLs before claiming deployment

```powershell
$SiteUrl = "https://$FirebaseProject.web.app"
(Invoke-WebRequest $SiteUrl -UseBasicParsing).StatusCode
(Invoke-WebRequest "$SiteUrl/ai-planning" -UseBasicParsing).StatusCode
$Preflight = Invoke-WebRequest "$ApiUrl/api/v1/plans" -Method Options -Headers @{ Origin=$SiteUrl; 'Access-Control-Request-Method'='POST'; 'Access-Control-Request-Headers'='content-type' } -UseBasicParsing
$Preflight.Headers['Access-Control-Allow-Origin']
Start-Process $SiteUrl
```

The preflight header must equal SiteUrl. Follow DEMO_SCRIPT.md in the browser,
verify the actual API hostname in Network, eight routes, and a real recorded tool
call. One live Gemini request suffices. Verify that unavailable backend produces
an error, not fixtures. Record both public URLs and revision only after success.
If the key/model is unavailable, report deterministic fallback honestly.

## Recovery

For a frontend-only failure, Firebase console supports reverting to a previous
Hosting release. For backend rollback, list revisions and explicitly approve
routing to the chosen known-good revision; do not guess a revision name. Rebuild
frontend whenever the backend URL changes. Secret rotation requires a new numeric
version and a Cloud Run revision pointing to it. Do not delete resources or revoke
shared permissions as an automatic cleanup step.

## References

- [Cloud Run source deployment and IAM](https://docs.cloud.google.com/run/docs/deploying-source-code)
- [Cloud Run secrets and numeric version guidance](https://docs.cloud.google.com/run/docs/configuring/services/secrets)
- [Cloud Run deploy flags](https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy)
- [Firebase Hosting rewrites and headers](https://firebase.google.com/docs/hosting/full-config)


## Local verification record - 2026-10-18

- One production frontend build passed using https://br-api.example.invalid.
  This intentionally disconnected build must be replaced before publishing.
- One startup/health check passed using serve.py with BR_ENV=production and a
  dynamically supplied PORT. Its temporary server was stopped afterward.
- One targeted check (`python backend/scripts/check_production.py`) passed:
  exact production origins, blocked untrusted preflight, localhost development,
  413/429 guards, health exemption, production docs disabled, Hosting rewrite,
  runtime dependency split, context allow-lists, and current-file/bundle scan for
  common Google keys/private-key markers. No credential values were printed.
- Existing Phase 03 browser/demo and live Gemini evidence remains the workflow
  baseline. No new browser walkthrough, live Gemini call, cloud operation, package
  installation or broad test suite was performed. Physics/validation algorithms
  and frontend source were unchanged in Phase 04.
- Linux image build, cloud IAM/billing, model access under the deployment key,
  Firebase project setup and public URL verification remain pending. This scan
  is not a full secret/history or vulnerability audit.

## Phase 04 file inventory

Created: backend/Dockerfile, backend/.dockerignore, backend/.gcloudignore,
backend/requirements-runtime.txt, backend/serve.py,
backend/app/api/public_limits.py, backend/scripts/check_production.py,
firebase.json, .firebaserc.example, frontend/.env.production.example,
scripts/build-production.ps1, DEPLOYMENT.md, DEMO_SCRIPT.md and SUBMISSION.md.

Modified: .gitignore, README.md, backend/app/main.py and
backend/app/agents/gemini_planner.py. Other dirty files predate Phase 04 and were
preserved. No commits, pushes or publication were performed.
