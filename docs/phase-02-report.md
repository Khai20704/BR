# Phase 02 — Frontend UI

## Scope and pages

The existing React/Vite project was extended in place. Backend files were not changed.

| Route | Implemented |
| --- | --- |
| / | Overview with site/source context, batch placeholders, thermal preview, simulation state, readiness navigation and session activity |
| /site | Controlled site/AC/source form, Zod validation, declared provenance and disconnected sensor state |
| /batch | Controlled material, pressed mass, wet-basis moisture and duration form; required/range/cross-field validation |
| /thermal-profile | Temperature/heat chart toggle, explicit synthetic provenance, uncertainty disclosure and accessible data table |
| /simulation | Synthetic moisture curve, empty mass balance, assumptions and unvalidated feasibility |
| /ai-planning | Scenario option cards, reasoning placeholder, non-executed workflow outline, safety status and explicitly labeled response-state preview |
| /replanning | Controlled temperature slider, explicit loading button, disconnected/error states, stale-input notice, reason codes and empty before/after metrics |
| /benchmark | Common scenario form, three-method comparison and unavailable metrics without invented performance claims |

Dark navy surfaces, emerald/teal accents, Lucide icons, shared controls, responsive cards and mobile navigation form a consistent visual system. Keyboard focus, Escape dismissal, focus restoration, background inertness, skip link, reduced-motion support, field error associations and chart data tables are included.

## Architecture and data

Phase 01 domain contracts, HTTP client, composition factory, error boundary, query provider and tests remain. Existing lint rules are preserved.

Feature-owned preview models and repository interfaces are plain TypeScript. LoadPreview use cases depend on repository contracts. Infrastructure provides separate fixture and HTTP-boundary adapters. App composition injects use cases into pages, which use TanStack Query hooks. Shared UI imports no feature code. Form draft review is local UI state, not a server mutation.

The HTTP-boundary adapters intentionally fail with a typed unconfigured error until real endpoint contracts exist. They do not invent endpoints or production API responses. The existing site HTTP adapter remains available for future integration.

VITE_DATA_MODE is the new public adapter selector. The checked-in .env.development explicitly selects fixture for local development. .env.local can override it with http. Only DEV plus explicit fixture enables fixtures; production forces HTTP regardless of the variable. Conditional imports and build-time guards remove fixture adapters from production. VITE_API_BASE_URL remains the only backend URL setting. No secrets are introduced.

Fixture curves are static illustration data, not predictions. They are labeled SYNTHETIC / UI PREVIEW. Workflow items are NOT EXECUTED and PREVIEW DATA, with no tool IDs, timings or fabricated successful executions. NEED_MORE_DATA, NO_FEASIBLE_PLAN and NOT_VALIDATED have explicit UI states. Benchmark values and engineering outputs remain unavailable.

Recharts was added and lazy-loaded to separate chart code from the initial bundle. Playwright was added for repeatable browser checks using installed Microsoft Edge.

## Validation

- Production build passed with strict TypeScript; initial JS approximately 425 kB and chart chunk 355 kB before gzip.
- All 25 unit/component tests passed across 10 files, including all 14 Phase 01 tests.
- Final formatting check passed.
- ESLint, circular-import and architecture checks passed.
- All 5 Playwright browser tests passed: eight pages at desktop/mobile widths, mobile focus/navigation, explicit replanning, and production disconnected isolation. Screenshots were saved and visually inspected.
- Desktop (1440 x 1000) and mobile (390 x 844) checks covered every page, chart rendering, no horizontal overflow and no page JavaScript errors.
- Tests found and prompted fixes for required-field error precedence, Zod coercion typing, Unicode text encoding and mobile focus restoration.
- Concurrent validation initially exceeded available machine memory. Vitest is limited to two workers; checks can be run sequentially.

Commands:

```powershell
Set-Location .\BR\frontend # from the supplied workspace; use .\frontend from project root
npm run build
npm run lint
npm run test -- --run
npm run format:check
npm run test:e2e
npm run dev
```

Run build before test:e2e. Start npm run dev -- --host 127.0.0.1 --port 5173 and npm run preview -- --host 127.0.0.1 --port 4173 in two separate PowerShell terminals, then run npm run test:e2e in a third. Playwright uses local Edge. Explicit server ownership avoids a Windows child-process teardown hang seen with automatic webServer management. The browser channel can be adjusted in playwright.config.ts on machines without Edge.

## Screenshots

- [Desktop overview](phase-02-desktop.png)
- [Mobile overview](phase-02-mobile.png)
- [Mobile form](phase-02-mobile-form.png)
- [Production disconnected state](phase-02-production.png)

## Known limitations

No backend, AI, physics engine, optimizer, validator, authentication or hardware control is implemented. Forms are reviewed only in local component state and reset when their page unmounts. There is no persistence or live data. User-declared measured provenance is never treated as verified.

Preview replanning returns only an unvalidated UI state; temperature changes do not calculate a new curve or schedule. The short loading delay demonstrates an asynchronous request, not tool execution time. Production reports pending integration even if a public URL is supplied because endpoints are not agreed.

Uncertainty remains unquantified. No successful drying, feasible plan, energy savings or method superiority is asserted. Workspace readiness is a static onboarding guide, not measured project completion. ESLint 9 remains the Phase 01 peer-compatible version.

Phase 02 stops here. Backend integration requires approval.

Final verification: production build, lint (zero warnings), 25 Vitest tests, formatting, and all 5 Playwright tests completed successfully. The final browser command exited with code 0; test-results/.last-run.json records passed with no failed tests.
