---
task: tsk_mwbzea0yykrdcx (CCA.11)
title: R1-06 · M07 · Product Specifications
release: R1 — Core CRM
prerequisite: R1-05 M06 Products (verified implemented)
---

# R1-06 · M07 Product Specifications — Implementation Plan

## 1. Context

M06 Products (R1-05) is genuinely implemented: `src/modules/products/**`, migration
`db/migrations/0003_products_catalog.sql`, 7 REST routes, OpenAPI entries, 11 real-PostgreSQL
integration tests. Product deliberately carries **identity only** — grade, processing, packaging
and weights were excluded and assigned to M07.

Today M07 does not exist. `/products/specifications` renders synthetic prototype data through
`R1RoutePage` (`src/modules/routing/r1-route-data.ts` + `src/constants/dummy/product-specifications.json`).
Without M07 there is no way to attach a technical/packaging definition to a SKU, so M08 Price
Lists and M10 Quotations cannot reference an approved revision, and the R1 invariant
*"changes to the catalog never alter an earlier offer or PDF"* has nothing to freeze.

Outcome of this task: a versioned, approvable, immutable Product Specification per SKU with a
tested snapshot contract that M10 can consume later.

### Verified facts that shape the design

| Fact | Evidence |
|---|---|
| `specifications` + `specification_versions` already exist in the baseline | `docs/structure/01_init_20261106.sql:388-425` |
| `specifications.market_id` is `NOT NULL`; `UNIQUE (market_id, code)` | same |
| `specification_versions` has `revision_no`, `status`, `grade`, `processing`, net/gross pack weight, `weight_unit`, `packs_per_carton`, `glazing_percent`, `packaging`, `requirements jsonb`, `published_at`, and a `gross >= net` CHECK | same |
| `specification_versions` is **missing** `name_en/vi/ko`, descriptions, `size_band`, `uom`, `moq`, `carton_net_weight`, `storage_temp_c`, `shelf_life`, `origin_country`, `packaging_material`, `label_languages`, `certifications`, `customer_id`, `approved_by`, `created_by` | same |
| `quotation_lines.specification_snapshot jsonb NOT NULL` and `specification_version_id` already exist — the snapshot target is defined | `01_init_20261106.sql:554-580` |
| `file_attachments.specification_version_id` already exists | `01_init_20261106.sql:850-860` |
| Storage port/adapter is **not implemented** — `files` is a 3-column Drizzle stub, no upload/download route | `src/modules/access-control/infrastructure/schema.ts:425`, no matching route under `src/app/api` |
| No decimal library and no `src/lib/decimal.ts` | `package.json` dependencies |
| `scripts/validate-migrations.ts` replays only baseline + 0001 + 0002 — it never replays 0003 | `scripts/validate-migrations.ts:23-56` |
| R1 decisions §9 requires Specifications to carry `name_en/vi/ko` + descriptions; missing translations block PDF | `docs/business/r1-decisions.md:90` |
| Market scoping pattern exists (`assertMarketAccess`, `resolveMarketId`, `?market=<code>`, `/api/v1/me/markets`) | `src/modules/contacts/infrastructure/contact-repository.ts:94`, `contact-workspace.tsx:62` |

## 2. Owner decisions (`/grill-me`, 2 rounds, 2026-11-11)

| # | Decision | Chosen |
|---|---|---|
| 1 | Market scope | Keep `market_id NOT NULL`. Specification always belongs to one market; reuse the Contacts `?market=<code>` + `assertMarketAccess` pattern |
| 2 | Buyer-specific specs | Add nullable `specifications.customer_id`. `NULL` = standard spec; set = buyer-specific spec with its own code and its own revisions. Never overwrites the standard spec |
| 3 | Technical files | **No upload/download in R1-06.** Contract + authorized read-only listing of already-linked `file_attachments` only. Storage port stays a separate approved task |
| 4 | Decimal | Write `src/lib/decimal.ts` (BigInt-scaled, ROUND_HALF_EVEN). No new dependency |
| 5 | Permissions | Mirror M06: `admin` + `manager` → create/read/update/approve/archive (scope `ALL`); `sale` → read only; `accountant` → no grant. No maker-checker |
| 6 | UI | List + create/edit drawer + detail + revision history + side-by-side compare of 2 revisions. No file-management UI |
| 7 | Approving a revision | Auto-archives the previously `APPROVED` revision in the same transaction. At most one `APPROVED` revision per specification, enforced by a partial unique index |
| 8 | Mandatory at approval | `name_en/vi/ko`, `grade`, `processing`, `net_weight_per_pack`, `weight_unit`, `packs_per_carton`, `uom`, `packaging`. Everything else optional-but-validated |
| 9 | Unit conversion | **Reject all conversions.** Only same-`weight_unit` arithmetic. Any cross-unit request → `UNSUPPORTED_UNIT_CONVERSION` |
| 10 | Specification `code` | **Auto-generated** `<SKU>-S<nn>` (e.g. `SQ-001-S01`), allocated transactionally per `(market_id, product_id)`, retried on `23505` |
| 11 | Snapshot contract | Pure domain function `buildSpecificationSnapshot()` + use case `GetApprovedSpecificationForOffer`. No duplicate snapshot table |

## 3. Scope

**In:** domain model, lifecycle, migration `0004`, Drizzle mappings, use cases, REST API,
OpenAPI, grants + operator activation, audit, decimal utility, snapshot contract, UI, tests.

**Out (explicitly not built):** file upload/download and the storage adapter; M10 Quotations
submission and PDF issue; new application roles; event-sourcing framework; unit conversion;
`market_products` eligibility overrides.

## 4. Database — migration `0004_product_specifications`

SQL-only, versioned, with a matching `.down.sql`. No `FOREIGN KEY`/`REFERENCES`.

`specifications`:
- `ADD COLUMN customer_id integer` (nullable; `NULL` = standard spec) + `COMMENT`
- `CREATE INDEX specifications_market_product_idx ON specifications (market_id, product_id)`
- `CREATE INDEX specifications_market_customer_idx ON specifications (market_id, customer_id) WHERE customer_id IS NOT NULL`
- `COMMENT` on `active`: whole-specification archive flag (AC-11); revision lifecycle lives on `specification_versions.status`

`specification_versions` — add columns:
- translations: `name_en`, `name_vi`, `name_ko`, `description_en`, `description_vi`, `description_ko`
- technical: `size_band`, `size_unit`, `treatment`, `frozen_form`
- packaging/commercial: `carton_net_weight numeric CHECK (> 0)`, `uom text`, `moq numeric CHECK (> 0)`, `moq_unit text`, `packaging_material`
- handling: `storage_temp_c numeric CHECK (BETWEEN -80 AND 60)` — **physical plausibility guard only, not a product rule**; `shelf_life_months integer CHECK (> 0)`
- provenance: `origin_country text CHECK (~ '^[A-Z]{2}$')`, `certifications text[]`, `label_languages text[]`
- buyer: `buyer_requirements text`, `notes text`
- audit columns: `created_by integer NOT NULL DEFAULT 0` (then drop default), `approved_by integer`, `archived_at timestamptz`

`specification_versions` — add constraints and indexes:
- `CHECK (status IN ('DRAFT','APPROVED','ARCHIVED'))`
- `CHECK (weight_unit IS NULL OR weight_unit IN ('KG','MT','LB'))`
- `CHECK (uom IS NULL OR uom IN ('KG','MT','CTN','PCS','LB'))`
- `CREATE UNIQUE INDEX specification_versions_one_approved ON specification_versions (market_id, specification_id) WHERE status = 'APPROVED'` → **this is the AC-16 guarantee**
- `CREATE INDEX specification_versions_market_product_status_idx ON specification_versions (market_id, product_id, status)`
- `CREATE INDEX specification_versions_history_idx ON specification_versions (market_id, specification_id, revision_no DESC)`
- `COMMENT` on `published_at`: holds the APPROVED timestamp (lifecycle has no separate PUBLISHED state)

`specification_versions` — immutability trigger (precedent: `0002_audit_events_append_only`):
- `specification_versions_immutable_after_approval` BEFORE UPDATE — if `OLD.status <> 'DRAFT'`, reject the statement unless the only changed columns are `status`, `archived_at`, `published_at`, `approved_by`, `updated_at`, `version`. This makes **AC-04 enforced at the database level**, not only in the service.

Also update `src/modules/access-control/infrastructure/schema.ts`: add `specifications`,
`specificationVersions`, `fileAttachments`; extend the `files` stub with the columns the
read-only document listing projects (`originalName`, `mediaType`, `byteSize`, `sha256`,
`createdAt`) — mapping only, no schema change.

Extend `scripts/validate-migrations.ts` to replay `0003` and `0004` plus both `.down.sql`
files, assert the new partial unique index and the immutability trigger, and update the
hardcoded table-count assertion.

## 5. Application code

New module `src/modules/product-specifications/`, following the M06 layout exactly:

- `domain/specification-grants.ts` — resource `specifications`, actions `create`/`read`/`update`/`approve`/`archive`; `specificationAdminGrants`, `specificationSaleGrants`, read/write field lists. Mirrors `src/modules/products/domain/product-grants.ts`.
- `domain/specification-lifecycle.ts` — `canTransitionSpecificationRevision(from,to)` for `DRAFT→APPROVED`, `APPROVED→ARCHIVED`, `DRAFT→ARCHIVED`; `approvalRequiredFields` (decision 8) and `missingApprovalFields(version)`.
- `domain/specification-snapshot.ts` — pure, no I/O:
  - `buildSpecificationSnapshot(version, product, documents)` → frozen JSON containing `specificationId`, `revisionNo`, `code`, `approvedAt`, every technical/packaging/commercial field, EN/VI/KO names + descriptions, and immutable document references (`fileId`, `sha256`, `originalName`). This is what M10 persists into `quotation_lines.specification_snapshot`.
  - `totalNetWeight({ cartons, cartonNetWeight, weightUnit })` → `{ amount, unit }` using `src/lib/decimal.ts`; throws `UnsupportedUnitConversionError` when units differ (decision 9). **AC-12.**
  - `assertPlausibleMeasurements(version)` → rejects impossible weights/percentages/MOQ. **AC-13.**
- `application/contracts.ts` — Zod: `createSpecificationSchema`, `updateSpecificationRevisionSchema` (carries `version` for optimistic concurrency), `createRevisionSchema` (`sourceRevisionNo`), `approveRevisionSchema`, `archiveSchema`, `specificationListQuerySchema` (`q`, `productId`, `customerId`, `status`, `limit`, `cursor`), plus a base64url cursor decoder copied from `products/application/contracts.ts`.
- `application/specification-service.ts` — use cases `CreateSpecificationDraft`, `UpdateSpecificationDraft`, `CreateNextRevision`, `PublishSpecificationRevision`, `ArchiveSpecification`, `ListSpecifications`, `GetSpecification`, `ListRevisions`, `CompareRevisions`, `ListApprovedSpecifications`, `GetApprovedSpecificationForOffer`, `ListRevisionDocuments`. Reuses `requireGrant` (`src/modules/access-control/application/authorization.ts`) and the `allowedFields`/`projectProduct` field-projection idiom from `products/application/product-service.ts`. Validates product compatibility: the product must exist, be `ACTIVE`, and the spec's `product_id` must match the route product (**AC-02**).
- `infrastructure/specification-repository.ts` — Drizzle + `getDatabase()`. Every mutation in one `database.transaction` with `SELECT … FOR UPDATE` and a `version` check, plus a mandatory `auditEvents` insert in the same transaction (**AC-19**). `assertMarketAccess(actor, marketId)` and `resolveMarketId(actor, marketCode)` copied from `contacts/infrastructure/contact-repository.ts`. `publish()` archives the prior `APPROVED` row and promotes the draft in a single statement pair; the partial unique index is the final arbiter under concurrency (**AC-16**). Error types: `SpecificationNotFoundError`, `SpecificationConflictError`, `SpecificationImmutableError`, `UnsupportedUnitConversionError`, `ApprovalFieldsMissingError`.
- `presentation/api.ts` — thin, mirroring `products/presentation/api.ts`: `protectedAction` wrapper, `requirePermission` + `requireCsrf` on mutations, market resolution from `?market=`, `requestCorrelationId`, and `responseFor` mapping to the project error model (`NOT_FOUND` 404, `VERSION_CONFLICT` 409, `BUSINESS_RULE_VIOLATION` 409, `IMMUTABLE_REVISION` 409, `UNSUPPORTED_UNIT_CONVERSION` 422, `VALIDATION_FAILED` 400, `ACTION_FORBIDDEN` 403).

New shared utility `src/lib/decimal.ts` (approved R1.0 shared component, R1 decisions §2):
BigInt-scaled decimal with `fromString`, `add`, `sub`, `mulByInteger`, `compare`, `roundHalfEven(scale)`, `toString`. No floating point anywhere.

## 6. REST API (`/api/v1`, OpenAPI 3.1)

All routes require `?market=<code>` and are authorized server-side.

| Method | Path | Grant |
|---|---|---|
| GET | `/api/v1/specifications` | `specifications:read` |
| GET | `/api/v1/products/{id}/specifications` | `specifications:read` |
| POST | `/api/v1/products/{id}/specifications` | `specifications:create` + CSRF |
| GET | `/api/v1/specifications/{id}` | `specifications:read` |
| GET | `/api/v1/specifications/{id}/revisions` | `specifications:read` |
| POST | `/api/v1/specifications/{id}/revisions` | `specifications:create` + CSRF |
| PATCH | `/api/v1/specifications/{id}/revisions/{revisionId}` | `specifications:update` + CSRF (DRAFT only) |
| POST | `/api/v1/specifications/{id}/revisions/{revisionId}/publish` | `specifications:approve` + CSRF |
| GET | `/api/v1/specifications/{id}/revisions/{revisionId}/snapshot` | `specifications:read` (APPROVED/ARCHIVED only) |
| GET | `/api/v1/specifications/{id}/revisions/{revisionId}/documents` | `specifications:read` (metadata only — no object keys, no URLs) |
| POST | `/api/v1/specifications/{id}/archive` | `specifications:archive` + CSRF |

Route handlers under `src/app/api/v1/…` stay 3–8 lines each, delegating to `presentation/api.ts`.
Register all paths in `src/modules/api-docs/openapi.ts` and extend the implemented-path list in
`src/modules/api-docs/openapi.test.ts`.

## 7. Grants and audit

- Add `grantSpecifications()` to `scripts/access-control.ts`, copying `grantProducts()` (lines 450–520), with audit action `access.specification_grants_activated` and boundary `M07_SPECIFICATIONS_APPROVED`.
- Audit actions, all written inside the business transaction: `specification.created`, `specification.revision_created`, `specification.revision_updated`, `specification.revision_approved`, `specification.revision_archived`, `specification.archived`. `safe_diff` carries changed field names, revision numbers and status transitions — never buyer-sensitive free text.

## 8. UI

Replace the dummy page at `src/app/[locale]/(workspace)/products/specifications/page.tsx`
(currently `R1RoutePage`) with a real workspace. Reuse the M06 components as templates and
honour AGENTS.md §6 Form UX Pattern.

- `presentation/specification-workspace.tsx` — market selector fed by `/api/v1/me/markets` (pattern from `contact-workspace.tsx:62`), search, product filter, status filter, standard/buyer-specific filter, cursor pagination, explicit loading/error/empty states, `Create` button gated by role.
- `presentation/specification-create-drawer.tsx` — right-side drawer, focus trap + Escape + overlay close + dirty-state confirm, sticky footer, ≥40px targets, grouped sections: *Product & buyer* (searchable product picker by SKU/name and optional customer picker — human-readable, never raw IDs) · *Identity & translations* (EN/VI/KO names + descriptions) · *Grade & processing* · *Weight & packaging* (live total-net-weight preview computed server-side rules mirrored by `totalNetWeight`) · *Storage & labelling* · *Buyer requirements*. Missing-approval-field warnings shown inline, non-blocking for DRAFT.
- `presentation/specification-detail.tsx` — header with code/status/revision, current revision fields, lifecycle actions (`Edit draft`, `New revision`, `Publish`, `Archive`) gated by role, read-only linked-documents list, and a revision-history table.
- `presentation/specification-revision-compare.tsx` — side-by-side diff of two revisions with changed values highlighted.
- Remove `/products/specifications` from the dummy routing table in `src/modules/routing/r1-route-data.ts` (keep `src/constants/dummy/product-specifications.json` only if `src/modules/markets/market-data.test.ts` still needs it — verify before deleting).

## 9. Tests

| File | Covers |
|---|---|
| `src/lib/decimal.test.ts` | ROUND_HALF_EVEN cases from R1 decisions §6: `20.005→20.00`, `20.015→20.02`, `10.004+10.004→20.01`; no float drift |
| `src/modules/product-specifications/domain/specification-snapshot.test.ts` | **AC-12** (10 CTN × 10 kg = 100 kg), **AC-13** (impossible weight/glazing/MOQ), **AC-15** (`UNSUPPORTED_UNIT_CONVERSION`), snapshot shape and frozenness |
| `…/domain/specification-lifecycle.test.ts` | valid/invalid transitions, **AC-14** missing-approval-fields |
| `…/application/contracts.test.ts` | Zod boundaries, cursor decode, uppercase/pattern normalization |
| `…/application/specification-service.test.ts` | **AC-02** product/spec incompatibility, **AC-17** missing-grant denial, field projection and write-field denial |
| `…/infrastructure/specification-repository.integration.test.ts` | Real PostgreSQL, throwaway schema from baseline + `0003` + `0004`: **AC-01**, **AC-03**, **AC-04** (trigger denies the update), **AC-05** (V2 created, V1 byte-identical), **AC-06/AC-07** (synthetic `quotation_lines` row holds the V1 snapshot after V2 is approved), **AC-08** (product rename leaves the snapshot unchanged), **AC-11** (archived spec / retired SKU keeps historical references), **AC-16** (two concurrent publishes → exactly one winner), **AC-19** (forced audit failure rolls the business change back) |
| `e2e/product-specifications.spec.ts` | Real HTTP: anonymous `401`, `sale` write `403`, admin create→publish→compare browser workflow, **AC-18** document listing denied without grant |

Verification commands: `npm run lint`, `npm run build`, `npm run typecheck`, `npm test`,
`npm run db:validate-migrations`, `npm run db:migrate`, `npm run test:integration`,
`npm run test:e2e`. `/goal` will be attempted; if unavailable I will report that and review the
acceptance criteria manually.

**Acceptance criteria that cannot PASS in this task** — will be reported as `BLOCKED`, never as PASS:
- **AC-09** (technical PDF version preserved) and **AC-18** file-level authorization beyond metadata listing — no storage adapter exists (decision 3).
- **AC-10** (previously issued quotation PDF unchanged) — M10 Quotations and PDF issue do not exist.

## 10. Documentation

Pending the `DOCS DECISION` stop, the files that need updating are:
- `docs/modules/product-specifications.md` — flip `PLANNED` → `IMPLEMENTED (R1-06)`, record the 11 owner decisions, implemented fields/endpoints, and tick the implementation checklist.
- `docs/modules/products.md` — point the M07 cross-reference at the implemented module.
- `db/operation/sql_history.md` — append migration `0004`.
- `docs/architecture/overview.md` — note that the decimal shared component is now implemented and the storage port is still not.

Then the separate `DEV LOG DECISION` and `SPEC UPDATE DECISION` stops for
`nimbalyst-local/wiki/develop-process.md` and `nimbalyst-local/wiki/spec-updating-v1.md`.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Baseline `specification_versions` constraints may conflict with the new CHECKs on existing dev rows | Migration replays in an isolated schema first; the dev DB is inspected read-only before `db:migrate` |
| `created_by NOT NULL` on a populated table | Added with `DEFAULT 0`, then the default dropped; existing rows are flagged in the dev-DB report |
| Auto-generated `code` under concurrency | Allocation inside the transaction + `UNIQUE (market_id, code)` + bounded retry on `23505` |
| The immutability trigger could block a legitimate future migration | Trigger scoped to column-level changes only and shipped with a tested `.down.sql` |
| Snapshot contract drifts when M10 is built | Contract is a pure function with its own unit tests; M10 consumes it rather than re-reading tables |
| UI scope is large (workspace + drawer + detail + history + compare) | Built by extending the proven M06 components; file-management UI excluded |
