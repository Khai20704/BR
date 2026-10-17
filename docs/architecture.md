# Frontend architecture

Br uses feature folders with lightweight Clean Architecture. The project root is the BR subfolder inside the supplied workspace; frontend, backend and docs live directly inside that project root.

## Dependency direction

Presentation -> application -> domain repository interface.
Infrastructure -> domain repository interface.
App composition -> infrastructure factories + application factories.

The site example contains Site (id, name), SiteRepository, createGetSiteById and createHttpSiteRepository. The application validates a nonempty ID and calls the injected interface. The adapter performs HTTP, validates unknown response data with Zod, and translates transport failures to ApiError. app/composition.ts explicitly wires these factories. No DI framework, global service locator or implicit singleton repository is used.

createSiteServices requires a pathForId function. Supply it only after agreeing a backend contract, including URL-encoding identifiers. The shell deliberately does not instantiate site services or send requests.

## Boundaries

- Domain contains plain TypeScript models and interfaces; no React, Axios, Firebase or UI dependencies.
- Application imports domain contracts and its own application code.
- Infrastructure implements contracts; it cannot import presentation or application.
- Presentation calls injected use cases. It cannot call Axios, Gemini or infrastructure.
- Core and shared never import app or features. Features do not import app or another feature.
- App is the composition root. Cross-feature coordination belongs there.
- Features expose their public API through index.ts; internal modules use direct imports, avoiding their own barrel.
- ESLint checks layer boundaries and circular imports. TypeScript strict mode and noUncheckedIndexedAccess are enabled. @/ resolves to src in TypeScript, Vite, tests and lint resolution.
- PascalCase names identify models/components; createX names identify explicit factories. Empty features contain only directories, .gitkeep files and a public entry placeholder.

## Runtime responsibilities

React Router owns / and the catch-all route. QueryClientProvider owns server-state caching; queries have a 30-second stale time and automatic retries are disabled. Zustand is installed for future local UI state; no speculative store is created. Lucide is available but unused. Charts and Recharts are deferred.

The optional VITE_API_BASE_URL is the only application environment variable. Zod validates a public HTTP(S) URL; absent/empty is supported. Invalid configuration renders the app error boundary. Never place credentials or Gemini keys in any VITE variable or frontend file.

Axios uses a 15-second timeout. An unconfigured client rejects before sending a request. ApiError distinguishes unconfigured, network (including possible CORS failure), timeout, cancellation, HTTP, invalid-response and unknown errors. Raw backend error bodies are not shown to users. The placeholder works without a backend. Future feature views must render pending/error/empty states from query results; an error boundary does not catch asynchronous request failures.

All physics, engineering outcomes and AI planning belong to the future backend. No calculated outcomes or simulated successful AI results are included.

## Tooling adjustments

The current create-vite template uses Oxlint; it has been replaced with ESLint as requested. Tailwind 4 uses @tailwindcss/vite and a CSS @import, without legacy Tailwind 3 directives/configuration. React Router uses the current react-router package in declarative mode.

Official setup references:
- https://tailwindcss.com/docs/installation/using-vite
- https://reactrouter.com/start/declarative/installation
- https://vite.dev/guide/

## Verification

Vitest and React Testing Library cover the app smoke path and the injected use case. Additional transport/configuration checks protect offline and validation behavior. npm run lint checks imports; npm run build checks strict types and the production bundle. Browser deployment will require SPA fallback to index.html.

ESLint is pinned to major 9 with matching @eslint/js: npm rejected ESLint 10 because the TypeScript import resolver's optional eslint-plugin-import peer currently supports ESLint only through 9. No forced or legacy peer resolution is used.


## Phase 02 extension

See phase-02-report.md for UI architecture and adapter selection. VITE_DATA_MODE is now an explicitly permitted public setting in addition to VITE_API_BASE_URL. Production always forces HTTP mode. Development fixtures are isolated in feature infrastructure and injected through app/preview-services.ts. Forms review local drafts only. Recharts is lazy-loaded.
