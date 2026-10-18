# Submission copy

**Br - Self-Adapting Waste Heat Intelligence**

Br explores reuse of low-grade AC condenser heat to dry spent coffee grounds.
Operators configure a thermal source and batch, inspect deterministic drying
predictions, and compare optimized schedules checked by an independent validator.
Gemini 3.8 Flash calls Python engineering tools and explains their results with
an inspectable execution trace. When source temperature changes, Br recalculates
and compares drying plans rather than inventing a response. A common-input
benchmark compares three strategies without claiming experimentally proven savings.

The MVP uses React/Vite and FastAPI, with deployment prepared for Firebase Hosting,
Cloud Run and Secret Manager. Inputs are synthetic scenarios, outputs are model
predictions, and live Gemini verification requires an actual response plus a
successful tool call. No real sensors, experimental calibration, persistent batch
storage or hardware control are provided; replanning starts at minute zero.

Public demo URL: pending approved deployment and verification.
Repository URL: pending publishing review.
Video URL: pending recording.

## GitHub publishing checklist

- Review `git status --short` and diffs; Phase 03 has many uncommitted/untracked
  files. Preserve intended changes and review duplicate `*-khai` files separately.
- Include backend/app and required frontend scenario/adapters: they are currently
  untracked. Do not publish just the new deployment files without the application.
- Exclude .env files, caches, local credentials, service-account JSON, private keys,
  logs, node_modules, dist, screenshots with secrets and local test artifacts.
- Run a secret scanner across the intended commit AND Git history before making
  the repository public. The local targeted scan is not a history audit. If a key
  was ever committed, rotate it; deleting the current file is insufficient.
- Inspect `git diff --cached` after staging explicit paths; do not blindly stage
  the whole dirty workspace. Verify requirements-runtime and package-lock changes.
- Confirm third-party asset rights and choose a repository license before publishing.
- Read DEPLOYMENT.md and verify billing, project IDs, region, secret version, IAM,
  Hosting origins, public access and cloud quotas with the project owner.
- After approval, deploy, verify both URLs and one authentic Gemini trace, record
  the 2-3 minute demo, then replace pending links above.
- Check current hackathon rules and submission fields in the organizer's portal;
  this document does not claim eligibility or that a submission has been sent.
