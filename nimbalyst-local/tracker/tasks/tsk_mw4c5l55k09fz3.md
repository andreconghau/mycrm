---
tracker_id: "tsk_mw4c5l55k09fz3"
title: "RP-03 Front Router build"
status: "done"
priority: "high"
module: "Front"
source: "nimbalyst"
source_updated_at: "2026-11-06T04:25:15.157Z"
exported_at: "2026-11-10T01:32:39.476Z"
content_hash: 975aa529dfe5710ecfa0602ed1dd15d3906d0e383711bedd8e408377a02918f8
schema_version: 1
---

## 10. Approved scope extension — session record, 2026-11-06

The owner approved extending RP-03 beyond the initial route build with the workspace components, bilingual UI, JSON fixture contracts and market context below. These decisions supplement the original task; real backend workflows remain deferred.

### Workspace shell and localization

- Implement EN/VI routes under `src/app/[locale]`, with root redirect to `/vi/login`.
- Provide shared workspace navigation, desktop sidebar expand/collapse with persistence, and mobile off-canvas navigation.
- Add top-menu global search with suggestions and a search-results page.
- Add a profile drawer for editing the demo display name and avatar initials; show email, role and team as read-only. Profile edits are session-only prototype state.
- Add language switching, notifications and help panels. Preserve the current route and query parameters when switching locale.
- Keep authentication and live business mutations disconnected; detail/create/edit business routes remain deferred.

### Confirmed market business rules

1. Initial markets: South Korea (KR), Japan (JP) and United States (US), extensible later.
2. Market represents a sales responsibility unit, independently of customer country, shipping destination or UI language.
3. Customer/contact records are independent per market, even for the same legal company. Duplicate checks stay within a market; no global customer identity or cross-market duplicate disclosure.
4. Product identities are global. Specifications, eligibility, availability and pricing are market-specific.
5. Application roles remain global: `admin`, `manager`, `sale`, `accountant`. Explicit market memberships constrain selectable markets in addition to resource/action/record permissions.
6. No “All markets” option. An admin role does not automatically grant access to every market's business data.
7. Membership changes/revocation belong to a central access administrator with an explicit grant permission and audit requirements. This administration workflow is a future backend deliverable.
8. Remember the last selected market per user, independently of EN/VI. Server-side preference persistence is the eventual requirement; the UI prototype currently uses browser storage keyed by the demo user.
9. Suggested default currencies: KRW / JPY / USD. Transaction currencies remain explicit; no automatic FX conversion.
10. Assign market at creation. No cross-market record transfer in this release.
11. Build from zero: synthetic fixtures may be reset during UI refinement. Finalize the UI first, then use its reviewed contract to design the fresh database schema/migrations; no legacy backfill or SQL execution in RP-03.

### Implemented market behavior

- Top-menu market selector exposes only active fixture memberships.
- One shared market context scopes customers, contacts, leads, opportunities, tasks/activities, products/specifications, price lists, RFQs, quotations, samples and sales orders.
- Search suggestions/results, dashboard/report rows and counts, and recipient notifications follow the same selected market.
- Search indexes an explicit allowlist of display fields; it excludes contact details, financial values, access-control records and audit records.
- Market changes clear top-menu suggestions and close notification popovers. Selection persists through navigation, reload and locale switching.
- Invalid stored selections fall back to an available market; users without membership receive no business content.
- Audit/access-control screens retain their independent administrative prototype scope. This feature does not grant new audit access.

### JSON fixtures and frontend structure

- Development business data lives as JSON under `src/constants/dummy`.
- Added market, membership and market-product eligibility fixtures; normalized market ownership and relevant record references.
- Canonical module JSON supplies list rows and dashboard counts. `r1-route-data.json` now contains presentation metadata instead of duplicated business rows.
- Shared implementation: `src/modules/markets`, `src/modules/routing` and `src/components/layout/workspace-shell.tsx`.
- Market context remains a UI demonstration: all bundled fixtures are readable in the browser, so client filtering is not authorization.
- The US sales market deliberately includes a German customer to demonstrate that market and country are separate concepts.

## 11. Specification and backend follow-up

Updated:
- `docs/structure/frontend.md` — locale routing, shell and market extension.
- `docs/structure/market-ui-plan.md` — approved business decisions, 12-section plan, acceptance criteria, conceptual data relationships and verification record.

The market plan records proposed market/membership/preference structures, global products, market-owned records, same-market relationship constraints, API scope validation, cache/index considerations and future authorization requirements.

Deferred until UI review and backend design approval:
- Physical DB schema, versioned SQL migrations, ERD and data dictionary.
- Real authentication, service/repository authorization, server-side preferences and membership administration/revocation.
- Authorized exports/downloads/aggregates and positive/negative backend security verification.
- Cross-market transfer, consolidated reporting, FX conversion and production deployment.
- Reconcile architecture/R1 document links that are absent at their referenced paths in this checkout.

## 12. Verification evidence — 2026-11-06

- **PASS:** lint and TypeScript on Node 26.13.0 / npm 11.20.0.
- **PASS:** 6 Vitest tests: 5 market contract checks plus the existing utility test. Coverage includes membership fallback/no access, market-isolated lists/search, excluded search fields, same-market parent references and market-specific price/specification eligibility.
- **PASS:** production build using `npm run build -- --webpack`, including EN/VI routes.
- **BLOCKED in sandbox:** default `npm run build` with Turbopack cannot bind its internal CSS-worker port (`EPERM`). Webpack success does not mean the default build passed.
- **PASS:** Playwright after installing Chromium and permitting localhost/browser execution: **16 passed, 2 intentionally skipped** for viewport-specific sidebar checks. Covered locale routing, global search, profile edits, desktop/mobile navigation, market-scoped lists/dashboard/search, reload/locale persistence, query preservation and invalid stored market fallback.
- **PASS:** `git diff --check` and `graphify update .`.
- **NOT RUN / not implemented:** live backend authorization, DB migrations, server preference storage, operational revocation and production deployment.

Skill use: approved `frontend-patterns` informed component/context separation. The requested `/grill-me` entry delegated to an unavailable Skill dispatcher; business clarification and explicit plan approval were completed through Nimbalyst interactive prompts.

## 13. Review and completion boundary

Implementation and the specification extension are ready for review. Current status remains **in-review** because these session changes have not been committed. Under the tracker workflow, transition to **done** follows the user-approved commit. No production readiness or backend security completion is implied.
