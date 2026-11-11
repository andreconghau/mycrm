# R1-05 · M06 Products — Implementation Plan

## Context

M06 Products is the next R1 master-data module after Access Control (R1-01) and Audit Log (R1-02), both confirmed implemented. The seafood export catalog (SKUs, families, units, multilingual names) must exist before Specifications (M07), Price Lists (M08) and RFQs/Quotations (M09/M10) can reference it. The historical-integrity requirement is central: once a SKU is referenced on a quotation/order line, later renames or retirement must never alter what was already quoted/accepted — `quotation_lines.product_snapshot jsonb` already exists in the baseline schema for exactly this purpose, so M06 only needs to produce a clean, versioned Product entity and server-side eligibility gate; it does not need to build its own snapshot plumbing.

The baseline schema (`docs/structure/01_init_20261106.sql`) already pre-declares `products`, `product_aliases` and `market_products`, but they don't yet match the module spec (no DRAFT lifecycle, no per-locale required names, no family/description fields). This plan closes that gap per the decisions confirmed via `/grill-me` with the owner on 2026-11-11.

## Confirmed decisions (owner, 2026-11-11)

1. **Lifecycle**: add `products.status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','INACTIVE'))`. Drop the now-redundant `active boolean` column (nothing reads it yet).
2. **Multilingual names**: keep using `product_aliases` for the canonical per-locale display name, but add a `kind text NOT NULL DEFAULT 'ALIAS' CHECK (kind IN ('NAME','ALIAS'))` column to it so the required EN/VI/KO names (`kind='NAME'`) are distinguishable from free-text search synonyms (`kind='ALIAS'`). Add `description_en`, `description_vi`, `description_ko` (nullable text) directly on `products`, since `product_aliases` has no field for descriptions.
3. **Classification scope**: `products` keeps `category`, `species_common_name`, `species_scientific_name` (already present) and gains `product_family` (nullable text). Processing form, origin/treatment, grade and packaging stay owned by M07 `specification_versions` — not duplicated on Product.
4. **Units**: `default_unit` validated against a fixed Zod enum `['KG','MT','CTN','PCS','LB']`. No unit-conversion logic, no DB reference table.
5. **market_products**: out of scope for this task. RFQ/Quotation/Price Lists don't exist yet to consume it; M06 only implements the global `products.status` eligibility gate. The table is left untouched (no code references it).
6. **Authorization**: resource `products`. `admin` and `manager`: `create`, `update`, `approve`, `retire`, `read`, scope `ALL`. `sale`: `read` only, scope `ALL`. `accountant`: no grants (consistent with R1 decisions — role not activated). No mandatory maker-checker split between create/edit and approve/retire in R1.
7. **SKU normalization**: trim, uppercase, pattern `^[A-Z0-9_-]{2,40}$`, mirroring customer identifier normalization.

Lifecycle transitions: `DRAFT → ACTIVE`, `ACTIVE → INACTIVE`, `INACTIVE → ACTIVE` (re-activation allowed — no documented exception workflow needed since any role with `approve` can reverse it); `DRAFT → INACTIVE` is not a meaningful transition (reject). Only `ACTIVE` products are eligible for new commercial line selection; `DRAFT` and `INACTIVE` are denied server-side regardless of UI state.

## Database (new migration `0003_products_catalog.sql` / `.down.sql`)

- `ALTER TABLE products ADD COLUMN status ...`, backfill existing rows (none expected pre-launch) `DROP COLUMN active`.
- `ALTER TABLE products ADD COLUMN product_family text, description_en text, description_ko text`; `description_vi` similarly (3 columns).
- `ALTER TABLE product_aliases ADD COLUMN kind text NOT NULL DEFAULT 'ALIAS' CHECK (kind IN ('NAME','ALIAS'))`; adjust the existing `UNIQUE (product_id, locale, label)` — add a partial unique index `UNIQUE (product_id, locale) WHERE kind = 'NAME'` so each product has at most one official name per locale, while still allowing many `ALIAS` rows per locale.
- Index: `CREATE INDEX ON products (status)`, `CREATE INDEX ON products (sku)` already unique so covered; add `CREATE INDEX ON products USING gin (to_tsvector('simple', display_name))` only if plain `ILIKE` search proves insufficient — default to `ILIKE` + btree on `sku`/`category`/`status` first (matches customers' approach), skip full-text unless needed.
- No SQL `FOREIGN KEY`s, per AGENTS.md — `product_aliases.product_id` stays an application-enforced reference.
- Update `docs/structure/01_init_20261106.sql` comments/dictionary is **not** touched (that's the frozen baseline fingerprinted by `scripts/migrate.ts`); schema docs sync happens in versioned migration + a dictionary note in `docs/modules/products.md` checklist, not by editing the baseline file.

## Domain / Application (`src/modules/products/`, mirroring `src/modules/customers/`)

- `domain/product-grants.ts` — `productAdminGrants` (admin+manager: create/update/approve/retire/read ALL) and `productSaleGrants` (sale: read ALL), following `customer-admin-grants.ts` shape.
- `application/contracts.ts` — Zod schemas: `createProductSchema` (sku, names `{en, vi, ko}` required, category, speciesCommonName, speciesScientificName?, productFamily?, defaultUnit enum, descriptions optional, aliases optional), `updateProductSchema` (version + partial fields, no sku/status changes here), `transitionProductSchema` (version + target status + optional reason), `productListQuerySchema` (q, category, status, limit, cursor — cursor-based pagination like customers), plus `canTransitionProduct(from, to)` and `normalizeSku`.
- `application/product-service.ts` — `list`, `get`, `create`, `update`, `transition` (covers approve DRAFT→ACTIVE and retire ACTIVE/INACTIVE↔ACTIVE), each calling `requireGrant(grants, 'products', action)` then the repository, field-projecting the response via `policy.readFields`/`writeFields` exactly like `CustomerService`.
- `infrastructure/product-repository.ts` — `list` (status/category/q filters + keyset pagination), `get`, `create` (insert `products` + `product_aliases` rows with `kind='NAME'` for en/vi/ko inside one transaction + `audit_events` insert), `update` (optimistic `version` check, row lock `for('update')`, audit insert), `transition` (locked read, `canTransitionProduct` check, update + audit insert in one transaction — mandatory audit failure rolls back the whole transaction per AGENTS.md §4). Reuses `getDatabase()` from `access-control/infrastructure/database`.
- Add `products`, `productAliases` Drizzle tables to the shared `src/modules/access-control/infrastructure/schema.ts` (same file customers/contacts use) rather than a separate schema module, to match existing convention.
- `presentation/api.ts` — `listProducts`, `createProduct`, `getProduct`, `updateProduct`, `transitionProduct(action: 'approve'|'retire'|'reactivate')`, wired through `requirePermission('products', action)` + `requireCsrf` for mutations, same `protectedAction` pattern as `customers/presentation/api.ts` (no market resolution — Products is a global, non-market-scoped catalog, unlike Customers).

## API routes (`src/app/api/v1/products/...`)

- `GET/POST /api/v1/products`
- `GET/PATCH /api/v1/products/:id`
- `POST /api/v1/products/:id/approve` (DRAFT→ACTIVE)
- `POST /api/v1/products/:id/retire` (ACTIVE→INACTIVE)
- `POST /api/v1/products/:id/reactivate` (INACTIVE→ACTIVE)

Each route file is a thin re-export calling into `presentation/api.ts`, exactly like `src/app/api/v1/customers/route.ts`. Register all 5 paths in `src/modules/api-docs/openapi.ts` next to the existing `/api/v1/customers` block, and extend `src/modules/api-docs/openapi.test.ts` coverage if it asserts path count.

## UI (`src/app/[locale]/(workspace)/products/`)

- Replace the current `R1RoutePage` placeholder with a real catalog workspace: list with search/filter (status, category, q) + cursor pagination, following the shadcn/ui patterns and the right-side create drawer pattern already used by `src/modules/customers/presentation/customer-create-drawer.tsx` (per AGENTS.md §6 form UX — create flow is multi-field, so it belongs in a drawer, not inline).
- `product-create-drawer.tsx`, `product-workspace.tsx`, `product-detail.tsx` mirroring the customer presentation components; detail page shows lifecycle actions (Approve/Retire/Reactivate) gated by grant presence from `/api/v1/me/permissions`.
- After successful creation, navigate to the product detail page per AGENTS.md §6.
- No searchable picker needed within M06 itself (Products doesn't reference another entity by ID); the picker requirement in AGENTS.md §6 applies to consumers of Products in later modules (RFQ/Quotation), not here.

## Authorization wiring

- Extend `scripts/access-control.ts` to seed/reconcile `productAdminGrants` (admin, manager) and the sale read grant into `role_grants`, following the existing `customerAdminGrants` reconciliation block (upsert with version bump), and the `grants` bootstrap loop for the `admin` bootstrap path.
- No new roles. `accountant` gets no products grants (explicit deny by absence, matches R1 decisions).

## Audit

- `product.created`, `product.updated`, `product.approved`, `product.retired`, `product.reactivated` audit events, each inside the same DB transaction as the business write, `safeDiff` limited to non-sensitive fields (status transitions, changed field names) — no raw description/name diff dumping beyond field names, matching the `customer.updated` pattern (`changedFields` list, not full before/after payloads).

## Tests

- `contracts.test.ts` — schema validation incl. SKU normalization, unit enum, name-required-trio, status transition matrix (valid/invalid incl. DRAFT→INACTIVE rejection).
- `product-service.test.ts` — authorization denial paths per role (AC-04, AC-15), field projection.
- Integration (real Postgres, like other modules' repository tests) covering:
  - AC-01/02/03: create success+audit, duplicate SKU rejected (unique violation → 409), invalid unit/missing name → validation error.
  - AC-05/06/07/08/09: DRAFT not eligible, ACTIVE eligible, retire removes eligibility for new selection, direct API call against a retired SKU denied, a pre-existing reference (simulated via a stub consumer / direct snapshot insert into `quotation_lines` since M09/M10 don't exist) still readable unaffected by later product changes — do **not** claim RFQ/Quotation integration passed; this is validated purely via a DB-level snapshot check (insert a synthetic historical row referencing the product, then retire/rename the product, assert the snapshot row is untouched).
  - AC-10/11: rename/attribute change leaves prior synthetic snapshot untouched.
  - AC-13: concurrency — two concurrent transition attempts against the same version; one must get `CustomerConflictError`-equivalent (`ProductConflictError`) via the `version` optimistic check.
  - AC-14: forced audit insert failure (e.g., violate a NOT NULL/constraint in a test harness hook) rolls back the product write — reuse whatever mechanism existing customer/contact tests use to simulate this, if any; otherwise verify the transaction wraps both statements and document as inspected-by-code-review if no injection harness exists.
  - AC-16/17: unpublished (DRAFT) product not exposed to `sale` role search results; pagination/filter determinism.
- Run `npm run lint` and `npm run build` after implementation, per AGENTS.md.

## Risks / open edges to flag in the completion report (not blocking)

- `product_aliases` reuse for names is a deliberate compromise (owner-confirmed) — slightly more complex query to fetch "the" display name per locale (`WHERE kind='NAME'`) than a flat column; documented here so future readers don't mistake it for an oversight.
- `market_products` remains unclaimed/unused after this task; flag it explicitly in the completion report so whichever task implements RFQ/Price Lists knows it still needs a decision.
- AC-14's literal "mandatory audit failure rolls back transaction" is structurally guaranteed by wrapping both writes in one DB transaction; whether a dedicated fault-injection test is feasible depends on what pattern (if any) existing modules use — will check `access-control` or `customers` test suites for a precedent before implementation and report if a true fault-injection test isn't feasible.

## Documentation

- `docs/modules/products.md`: update status from "PLANNED — NOT IMPLEMENTED" to reflect what's actually built, correct the proposed field list to match the real schema (status enum, product_aliases kind, product_family, description_en/vi/ko), and check off the implementation checklist items actually completed. **Per AGENTS.md, this requires a separate Documentation Decision STOP before editing** — will ask before touching this file.
- `docs/modules/README.md`: update M06 status cell from "Planned" to "Core implemented" (or similar), same STOP applies.

## Acceptance criteria mapping

All AC-01..AC-17 from the tracker item are covered by the Tests section above; AC-08 and AC-09 are validated at the domain/integration level only (no RFQ/Quotation module exists to test against), consistent with the task's explicit instruction not to claim integration with unimplemented modules.
