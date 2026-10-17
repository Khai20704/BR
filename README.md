# Br — Break the Rules

AI Thermal Engineer for adaptive waste-heat drying of spent coffee grounds.

Phase 01 initializes the frontend foundation only. The home page displays “Br — AI Thermal Engineer”. No dashboard, charts, feature forms, authentication, Firebase, backend or engineering calculations are implemented.

## Windows PowerShell

Use Node.js 24 LTS (validated with 24.20.0) and npm. From this repository root:

```powershell
Set-Location .\frontend
npm ci
Copy-Item .env.example .env.local
npm run dev -- --host 127.0.0.1
```

Open the local URL printed by Vite. Stop with Ctrl+C. Leave VITE_API_BASE_URL empty until a backend exists; the placeholder works offline. The variable is a public backend URL, never a secret. No site endpoint is configured.

```powershell
npm run build
npm run lint
npm run test -- --run
npm run format:check
npm run preview -- --host 127.0.0.1
```

Use npm run test for watch mode and npm run format to format frontend files. Commit package-lock.json and use npm ci for repeatable installations.

## Layout

- frontend/: React 19, Vite, strict TypeScript, Tailwind, routing and providers.
- backend/: README placeholder only.
- docs/architecture.md: dependency rules, composition and data flow.
- docs/api-contract.md: intended contract workflow and provisional site DTO.
- docs/initialization-report.md: dependency versions, complete source tree and verification results.

Features: site, batch, thermal-profile, simulation, ai-planning, replanning and benchmark. Each has domain/models, domain/repositories, application/use-cases, infrastructure/repositories and presentation/{components,hooks,pages}, plus index.ts. Only site contains an architecture example.

Runtime dependencies include React, React DOM, React Router, Zustand, TanStack Query, Axios, Zod and Lucide React. Zustand and Lucide are installed for future use without speculative UI or state. Recharts is deferred.

Phase 02 UI development requires approval.


## Phase 02 UI

Eight responsive workspace pages are implemented. See [Phase 02 report](docs/phase-02-report.md) for architecture, tests and screenshots. Run npm run dev from frontend for the explicitly labeled synthetic preview selected by .env.development. To inspect disconnected development behavior, set VITE_DATA_MODE=http in .env.local and restart Vite. Production always disables fixtures. Forms are local drafts only. Run npm run build then npm run test:e2e for Edge desktop/mobile and production-isolation checks. Backend integration still requires approval.

Browser verification: keep npm run dev -- --host 127.0.0.1 --port 5173 and npm run preview -- --host 127.0.0.1 --port 4173 running in separate PowerShell terminals before npm run test:e2e. Stop them with Ctrl+C afterward.
