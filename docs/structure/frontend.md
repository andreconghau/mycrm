# Frontend Architecture and Installation Plan

> **Status: Approved for implementation on 2026-11-06.**
> Prepared: 2026-11-06

## 1. Goal

Establish a maintainable Next.js 16 App Router foundation for the Seafood Export CRM, using Node.js 26, npm, strict TypeScript, Tailwind CSS, shadcn/ui, and the required `src/` source directory. This phase installs and verifies the framework foundation only. It does not implement CRM business behavior or authorize module-level permissions.

## 2. Verified repository context

- The repository currently contains project documentation and static mockups. There is no `package.json`, npm lockfile, Next.js configuration, TypeScript configuration, Docker Compose application setup, or application code under `src/`.
- `docs/context.md` defines a Next.js App Router modular monolith for the web application and REST `/api/v1` on Vercel, with strict TypeScript, Tailwind, shadcn/ui, PostgreSQL, Drizzle, and Postgres.js.
- `docs/modules/RELEASES.md` identifies 15 proposed R1 modules. They are not implemented, and business grants remain subject to approval in `docs/business/permissions.md`.
- `docs/design-system.md` contains a Notion-inspired token set marked `alpha`; the owner approved provisional use, subject to contrast verification.
- The repository instructions identify the application roles as `admin`, `manager`, `sale`, and `accountant`, and require record authorization in application services. Do not infer module grants from these role names.
- The repository has existing uncommitted/untracked work outside this plan. Preserve it.

## 3. Assumptions and decisions

### Confirmed constraints

- Next.js 16, App Router, Node.js 26, npm, TypeScript, Tailwind CSS, shadcn/ui, and application source under `src/`.
- Keep the existing repository root, documentation, and mockups. Do not move or regenerate them.
- Use Server Components by default. Add Client Components only for interactions requiring browser state, event handlers, or browser APIs.
- Keep Route Handlers and Server Actions thin. They delegate to application use cases; record authorization belongs in application services.
- Add business modules incrementally. Do not generate 32 module directories or claim planned modules are implemented.

### Approved defaults

- Runtime: Node.js `26.13.0` LTS. NVM is installed; use `source /Users/andre/.nvm/nvm.sh && nvm use 26` in shells that do not load NVM automatically. The initial shell resolved to v24.13.0; the NVM-selected runtime is v26.13.0 with npm 11.20.0.
- Framework: Next.js `16.4.5` (stable patch and peer requirements verified against npm on 2026-11-06), pinned exactly in `package.json` and `package-lock.json`. Do not silently cross to Next.js 17.
- React: React and React DOM `19.3.1`; npm metadata confirms Next.js 16.4.5 accepts React 19.
- CSS/UI: Tailwind CSS 4 with its PostCSS plugin, and shadcn/ui's `new-york` style with CSS-variable tokens. Map the approved project tokens to shadcn semantic tokens rather than keeping duplicate color definitions.
- Lint/format/type checks: ESLint CLI, Prettier, and `tsc --noEmit`, each exposed as an npm script. Next.js 16 does not run lint as part of `next build`.
- Test setup: Vitest and React Testing Library for unit/component tests; Playwright for browser smoke tests. Use RTL for client/shared components; verify Server Components through browser or integration workflows. Initial tests cover only the framework shell, not unapproved CRM behavior.
- Keep default Next.js caching behavior until a data use case is approved. Private CRM data reads must be explicitly uncached or scoped to the authenticated request; do not add shared caching for private records.
- Do not create `proxy.ts` or treat proxy/middleware as authorization. Add an authentication/session boundary only when the current security architecture and approved auth use cases are available.

## 4. Scope

### Included in approved implementation

- Node.js 26 project version declaration and local runtime verification.
- npm project manifest and lockfile.
- Next.js 16 App Router, strict TypeScript, Tailwind CSS 4, shadcn/ui configuration, and `src/` layout.
- Minimal global layout and a small, non-business root/health page to verify rendering.
- ESLint, Prettier, type-check, unit/component test, and browser smoke-test scripts.
- An approved route inventory and shared layout skeleton only. No real CRM records, mutations, role grants, or authentication enforcement.
- Local development and production build/start verification.

### Excluded

- CRM module implementation, database schema/migrations, Docker services, API contracts, real login/session flows, role grants, audit events, uploads, integrations, and production deployment.
- Generating placeholder pages for every R1 module unless the owner explicitly selects that option.
- Analytics, telemetry, third-party scripts, state-management libraries, data-fetching libraries, or other dependencies without a demonstrated need.

## 5. Recommended architecture

```mermaid
flowchart TD
  Browser --> AppRouter[Next.js App Router]
  AppRouter --> UI[Shared layouts and accessible UI]
  AppRouter --> ServerActions[Thin Server Actions]
  AppRouter --> REST[Thin /api/v1 Route Handlers]
  ServerActions --> UseCases[Application use cases]
  REST --> UseCases
  UseCases --> Authz[Authorization and domain rules]
  UseCases --> Ports[Repository ports]
  Ports --> Adapters[Infrastructure adapters]
```

The router owns URL structure, layouts, loading/error/not-found boundaries, and request validation/orchestration. Business logic stays in module application/domain layers. UI visibility is never an authorization boundary. External clients use documented REST endpoints; the first-party web UI may call Server Actions or shared application use cases according to the approved feature design, without duplicating business rules.

## 6. Proposed source directory

```text
src/
  app/
    (auth)/
      login/page.tsx                 # Proposed route; no authentication behavior in scaffold
    (workspace)/
      layout.tsx                     # Shared workspace shell, once approved
      dashboard/page.tsx             # Proposed R1 landing route
    api/v1/                          # Add Route Handlers only with approved API contracts
    error.tsx                        # Root error boundary
    global-error.tsx                 # Root layout error boundary
    globals.css                      # Tailwind import and approved design tokens
    layout.tsx                       # HTML shell, fonts, metadata
    not-found.tsx
    page.tsx                         # Minimal framework smoke page or agreed redirect
  components/
    ui/                              # shadcn/ui generated primitives actually used
    layout/                          # Shared navigation/shell components when approved
  modules/                           # Add one module at a time; no empty module folders
  lib/
    config/                          # Validated environment/config helpers
    server/                          # Server-only composition and utilities
  test/                              # Test setup and shared fixtures
```

Each implemented business module can add `src/modules/<module>/{application,domain,infrastructure,presentation}` following the project dependency direction. App Router files remain adapters, not repositories or business-rule containers. Keep server-only modules out of client component imports.

## 7. Proposed routing inventory

All business routes below are **proposals** derived from the R1 module list, not currently implemented routes or approved access grants. The route files should be created only if this inventory is approved. Route access labels describe intended authentication boundary, not final module permissions.

| URL | Route file | Module | Layout | Access / rendering | Status |
|---|---|---|---|---|---|
| `/login` | `src/app/(auth)/login/page.tsx` | Access Control | Auth layout | Public entry; Server Component shell with client form only when needed | Proposed |
| `/dashboard` | `src/app/(workspace)/dashboard/page.tsx` | Dashboard Reporting | Workspace layout | Authenticated; server-rendered; data grants pending | Proposed |
| `/customers` | `src/app/(workspace)/customers/page.tsx` | Customers | Workspace layout | Authenticated; server-rendered; grants pending | Proposed |
| `/contacts` | `src/app/(workspace)/contacts/page.tsx` | Contacts | Workspace layout | Authenticated; server-rendered; grants pending | Proposed |
| `/leads` | `src/app/(workspace)/leads/page.tsx` | Leads | Workspace layout | Authenticated; server-rendered; grants pending | Proposed |
| `/opportunities` | `src/app/(workspace)/opportunities/page.tsx` | Opportunities | Workspace layout | Authenticated; server-rendered; grants pending | Proposed |
| `/tasks` | `src/app/(workspace)/tasks/page.tsx` | Tasks & Activities | Workspace layout | Authenticated; server-rendered; grants pending | Proposed |
| `/products` | `src/app/(workspace)/products/page.tsx` | Products | Workspace layout | Authenticated; server-rendered; grants pending | Proposed |
| `/products/specifications` | `src/app/(workspace)/products/specifications/page.tsx` | Product Specifications | Workspace layout | Authenticated; server-rendered; grants pending | Proposed |
| `/price-lists` | `src/app/(workspace)/price-lists/page.tsx` | Price Lists | Workspace layout | Authenticated; server-rendered; grants pending | Proposed |
| `/rfqs` | `src/app/(workspace)/rfqs/page.tsx` | RFQs | Workspace layout | Authenticated; server-rendered; grants pending | Proposed |
| `/quotations` | `src/app/(workspace)/quotations/page.tsx` | Quotations | Workspace layout | Authenticated; server-rendered; grants pending | Proposed |
| `/samples` | `src/app/(workspace)/samples/page.tsx` | Samples | Workspace layout | Authenticated; server-rendered; grants pending | Proposed |
| `/sales-orders` | `src/app/(workspace)/sales-orders/page.tsx` | Sales Orders | Workspace layout | Authenticated; server-rendered; grants pending | Proposed |
| `/admin/users` | `src/app/(workspace)/admin/users/page.tsx` | Access Control | Workspace layout | Authenticated; server-rendered; grants pending | Proposed |
| `/audit-log` | `src/app/(workspace)/audit-log/page.tsx` | Audit Log | Workspace layout | Authenticated; server-rendered; grants pending | Proposed |

Do not add R2/R3 paths in this phase. Add details, nested routes, filters, and mutation routes alongside approved module/API specifications. Use route groups to share layout without adding URL prefixes. Add `loading.tsx`, `error.tsx`, and empty states to feature segments when real data views are implemented.

## 8. Layout, components, and design system

- Root layout owns `<html>`, `<body>`, metadata, global CSS, and font loading. It must remain small and server-rendered.
- Auth and workspace layouts are separate route groups. Workspace navigation is a reusable component, not duplicated across pages.
- Add shadcn/ui components on demand. Do not generate the entire registry. Keep components composable and typed; prefer composition over inheritance.
- Use semantic HTML, visible keyboard focus, labels, accessible names, and responsive behavior. Respect reduced-motion preferences if motion is introduced.
- `docs/design-system.md` is labelled `alpha`; confirm it is the intended source of palette, typography, spacing, and radius tokens before turning it into CSS variables. If approved, translate it to accessible semantic light/dark tokens and shadcn variables; test contrast rather than copying raw colors without validation.
- No dashboard widgets or sample business data in the framework shell.

## 9. API integration, environment, and rendering

- REST remains under `/api/v1`. Route Handlers validate request DTOs, call use cases, and return consistent errors; implementation must follow each approved module contract.
- Do not invent a separate backend service or let connection modules depend on routes/views. Keep PostgreSQL/Drizzle composition server-side.
- Read secrets only on the server. Validate environment variables at startup/use boundaries. Commit only an `.env.example` with synthetic names and no credentials.
- Render private CRM views on the server after authentication/authorization is implemented. Do not statically generate private records, expose secrets through `NEXT_PUBLIC_*`, or enable shared caches for user-specific data.
- Keep the initial shell independent of a live database so the framework build can be validated without production credentials.

## 10. Dependency and installation plan

Run these as the approved implementation:

| Step | Command/action | Expected files/result | Verification |
|---|---|---|---|
| 1. Runtime | Use the installed NVM to select Node 26; add `.nvmrc` with `26` and `"engines": { "node": ">=26 <27" }` | Runtime declaration; no Homebrew/global runtime change | `node --version` shows `v26.x`; `npm --version` recorded |
| 2. Manifest | Create root `package.json` and install exact stable Next 16 + peer-compatible React/React DOM; commit `package-lock.json` | Reproducible dependency graph | `npm ci`; inspect `npm ls next react react-dom` |
| 3. Framework | Add scripts: `dev`, `build`, `start`, `lint`, `format:check`, `typecheck`, `test`, `test:e2e` | Next config, strict `tsconfig.json`, ESLint flat config, Prettier config | Run lint, format check, type check |
| 4. Tailwind/UI | Install Tailwind 4 PostCSS integration and initialize shadcn/ui for Next.js, `src/`, alias `@/*`, `new-york`, CSS variables | `postcss.config.mjs`, `components.json`, `src/app/globals.css`, approved tokens | Build CSS; add only a minimal accessible Button if needed for smoke page |
| 5. App shell | Create root layout, not-found/error boundaries and minimal home smoke page; add only owner-approved route/layout skeleton | `src/app/**`, no business logic or generated R2/R3 modules | Start dev server and verify route returns/rendered UI |
| 6. Tests | Configure Vitest + React Testing Library and Playwright; test root shell and an accessible navigation/login shell only if approved | Test config, one unit/component test, one browser smoke test | `npm run test`; `npm run test:e2e` |
| 7. Production check | Install from lockfile and build/start on Node 26 | Production build output | `npm ci`, `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run start` smoke check |

Install `next@16.4.5` and `react@19.3.1` / `react-dom@19.3.1` with exact versions. npm metadata confirms Next.js 16.4.5 accepts React 19. Tailwind CSS `4.3.4` is the latest stable 4.x patch observed on 2026-11-06. Pin every direct dependency exactly and keep `package-lock.json` authoritative. Next.js 16 uses Turbopack by default for dev and build; keep the default unless a verified incompatibility requires a documented choice. Add a separate `lint` script because `next build` no longer runs lint.

## 11. Testing and verification

- Unit/component: validate basic shared UI behavior and loading/error/empty patterns when present; use synthetic data only.
- Browser: confirm the approved shell routes load at desktop and mobile viewport sizes; verify keyboard access and no console/build errors.
- Runtime/build: verify Node/npm versions, clean `npm ci`, lint, format, typecheck, tests, production build, and local production start.
- API/database/auth: **not run and not in scope** for this installation phase; there are no application APIs or database implementations in the checkout.
- Do not claim deployment, production auth, authorization grants, database integration, or browser workflows beyond the tests actually run.

## 12. Deployment plan

No deployment in this task. The context document targets Vercel, but production project settings, environment variables, PostgreSQL, storage, regions, and release gates are not present in this checkout. After a later deployment approval, verify those settings separately; local build success does not prove deployment readiness.

## 13. Risks and rollback

- **Node version on shell startup:** the terminal starts with Node 24.13.0, but NVM can select Node 26.13.0. Use the NVM initialization command for all install and verification commands in this session.
- **Fresh repo has no application manifest:** preserve all docs/mockups and initialize at repository root without using a generator that overwrites existing files.
- **Next 16 breaking changes:** async request APIs are required; avoid deprecated `next lint`, old `middleware` naming for new boundary code, or unsupported config options.
- **Tailwind/shadcn token mismatch:** design file is alpha; do not finalize tokens until approved and contrast checked.
- **Unapproved module permissions:** keep module pages as non-functional skeletons or omit them, as selected; no role enforcement may be guessed.
- **Rollback:** revert only the files introduced by the approved installation commit, restore the prior `docs/structure/frontend.md` draft if rejected, and leave existing documentation/mockups untouched. Lockfile and package manifest are reverted together.

## 14. Acceptance criteria

- Owner approved the specification, the framework shell + `/login` + `/dashboard` scope, provisional alpha design tokens after contrast review, and Vitest/RTL + Playwright setup on 2026-11-06.
- Node 26 and npm are declared and verified.
- Next.js 16 App Router, strict TypeScript, Tailwind CSS 4, and shadcn/ui are installed with exact compatible versions and a committed npm lockfile.
- App source is contained in `src/`; existing docs and mockups remain intact; no unapproved business feature or permission is implemented.
- Lint, format, typecheck, test, build, and local production-start checks pass on Node 26.
- Final diff contains only the approved installation changes plus this approved specification; verification evidence distinguishes checks run from checks not applicable.

## 15. Owner decisions recorded

1. **Initial routes:** Approved: framework shell plus `/login` and `/dashboard`; other R1 routes stay as proposed inventory only.
2. **Design tokens:** Approved for provisional use: `docs/design-system.md`; check contrast before applying the token colors.
3. **Test tooling:** Approved: Vitest/React Testing Library and Playwright, limited to the scaffold.
4. **Runtime manager:** Owner confirmed NVM is installed and Node 26 is available; do not install Node through Homebrew.

## Sources checked 2026-11-06

- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16) — Node 20.9 minimum, TypeScript minimum, Turbopack defaults, and Next.js 16 migration changes.
- [Next.js installation guide](https://nextjs.org/docs/app/getting-started/installation) — App Router and manual installation guidance; lint is separate from build.
- [Next.js 16.4 release](https://nextjs.org/blog/next-16-4) and [Next.js npm package](https://www.npmjs.com/package/next) — stable patch observed as 16.4.5.
- [React npm package](https://www.npmjs.com/package/react) and npm peer metadata for `next@16.4.5` — React 19.3.1 available and accepted.
- [shadcn/ui Tailwind v4 guide](https://ui.shadcn.com/docs/tailwind-v4) — `new-york` style, Tailwind v4 and React 19 support.
- [Node.js release status](https://nodejs.org/en/about/previous-releases) — Node.js 26 LTS status.
- [Tailwind CSS with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs) and [shadcn/ui Tailwind v4 setup](https://ui.shadcn.com/docs/tailwind-v4) — current integration approach.
