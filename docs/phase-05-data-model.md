# Phase 05 Firestore data model

All paths are rooted at `users/{authenticatedUid}`. UID comes from Firebase Auth, not a form field. All persisted timestamps use Firestore server timestamps. Ownership is determined by path; no editable owner field is accepted.

| Path | Contents |
| --- | --- |
| `users/{uid}` | displayName, email, photoURL, createdAt, updatedAt |
| `sites/active` | name, location, acModel, capacity (kW), source, provenance, createdAt, updatedAt |
| `batches/active` | siteId, materialType, wetMassKg, initialMoisture and targetMoisture (% wet basis), maxDurationMin, timestamps |
| `thermal_scenarios/active` | full ScenarioDraft, site metadata snapshot or null, siteId, dataProvenance, monotonically increasing version, timestamps |
| `simulations/{uuid}` | immutable history envelope below |
| `ai_plans/{uuid}` | same envelope; result includes API planning recommendation and tool results |
| `replanning_runs/{uuid}` | same envelope; request contains changed conditions |
| `benchmarks/{uuid}` | same envelope; result contains comparisons |

The scenario document is the authoritative restoration snapshot. The repository transaction updates it together with the active batch and, when present, active site. Expected version checks prevent a stale browser session from overwriting newer data. Creation time is preserved across updates.

History envelope: `inputSnapshot`, `result` (JSON strings, each at most 180,000 UTF-8 bytes in the repository), `modelVersion`, `modelName`, `dataProvenance: MODEL_PREDICTION`, `siteId/batchId/scenarioId: active`, `createdAt`. Rules additionally bound string sizes and reject extra fields. The snapshot contains `{request, draft, site}` captured for the run; the complete API request is authoritative for reproducing calculations. IDs reference the active workspace, not a frozen relational entity; snapshots preserve previous values after subsequent edits.

AI/replanning histories do not invent simulation IDs: those endpoints currently calculate independently. Actual response structures are retained in `result` rather than duplicated into incompatible renamed fields. Gemini model name is explicitly marked unavailable where the API does not expose it. Model versions absent from a response are marked `unreported`.

Queries order by `createdAt` descending with a 20-record limit and document cursor. Existing single-field indexes suffice; `firestore.indexes.json` contains no composite indexes. Historical documents allow create/read/delete by owner, never updates. Stable UUIDs make retry idempotent. The UI confirms deletion.

Rules default deny all other paths. They enforce numeric/schema constraints on workspace data and bounded envelopes on historical data. JSON internals are not a trusted or attested engineering record. No Google access tokens, Firebase ID tokens, or backend keys are passed to the persistence repository. The client encoder also rejects known credential field names; this is defense in depth, not general secret detection.

Migration: Phase 04 session-only drafts have no durable database to migrate. First login creates the profile and starts from documented synthetic defaults until a workspace is saved. Users with an important currently open draft should record its parameters before upgrading. There is no silent import of another account's browser data and no automatic upgrade of incompatible existing Firestore documents; restoration fails visibly rather than overwriting them.
