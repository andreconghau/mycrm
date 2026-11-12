---
plan: R1-08 · M08 Price Lists
tracker: pln_mwc2s7mtq6yht5 (CCA.12)
release: R1 — Core CRM
module: docs/modules/price-lists.md
status: plan approved — awaiting tracker task creation
---

# R1-08 · M08 — Price Lists

## 1. Context

M08 Price Lists is the first module of phase R1.2 (`docs/business/r1-decisions.md` line 17:
`M08 Price Lists → M09 RFQs → M10 Quotations → M12 Sales Orders`). Today the module is
a prototype only: `src/app/[locale]/(workspace)/price-lists/page.tsx` renders the
placeholder `R1RoutePage` over the fixture `src/constants/dummy/price-lists.json`, with no
auth, no grants and no database access. No `src/modules/price-lists/` exists.

The problem this solves: Sales currently has no controlled source of reference prices
before a bespoke quotation, and no record of which price was chosen, by whom, at what
listed amount. The business rule that drives the whole module (`docs/business/pricing-and-quotations.md`,
verbatim) is:

> Filter by SKU, unit, validity, currency and quantity. Show all eligible prices; preselect
> customer, then market, then general. Record every selection, reference amount, actor and time.
> Choosing another eligible reference at its listed price needs no reason. Manual prices and
> overrides require reasons visible to the approver.

Intended outcome: an authorized, market-scoped, auditable Price List module that returns
**every** eligible reference (not the cheapest), preselects deterministically, records every
selection append-only, and never retro-prices history. M10 Quotations is explicitly out of
scope; M08 ships the selection contract and proves it standalone.

### Verified prerequisites (checked, not assumed)

| Prerequisite | Status |
|---|---|
| R1-03 M01 Customers | Implemented — `src/modules/customers/**`, `customers` table live |
| R1-05 M06 Products | Implemented — `src/modules/products/**`, SKU + `default_unit` ∈ KG/MT/CTN/PCS/LB |
| R1-06 M07 Product Specifications | Implemented — migration `0004`, `specification_versions.status` DRAFT/APPROVED/ARCHIVED, one APPROVED per specification |
| Baseline price tables | **Already applied in dev DB** (`seafood_crm.public`): `price_lists` and `price_list_items` exist with the columns in `docs/structure/01_init_20261106.sql:427-465`. `price_selections` does **not** exist. `price_lists` has `approved_by` but **no `created_by`**. |
| M10 Quotations | Not implemented. `quotation_lines` baseline columns (`price_list_item_id`, `reference_price`, `reference_currency`, `price_reason`, `selected_by`, `selected_at`) exist and are untouched by this task. |
| Shared decimal helper | `src/lib/decimal.ts` exists and its header names M08 as an intended consumer — reuse, do not re-implement. |

## 2. Owner decisions confirmed in this planning round

| # | Decision |
|---|---|
| D1 | **Lifecycle:** store only `DRAFT → APPROVED → ARCHIVED`. `ACTIVE` / `SCHEDULED` / `EXPIRED` are **derived** at query time from `status = 'APPROVED'` + `valid_from`/`valid_to`. No scheduler, no stored state that can drift from the validity window. |
| D2 | **Selection history:** new append-only table `price_selections` (migration 0005) with explicit columns, plus a mandatory `audit_events` row in the same transaction. |
| D3 | **Grants:** mirror M07 — `admin` + `manager` get `create/read/update/approve/archive`; `sale` gets `read` + `select`; `accountant` gets nothing. No maker-checker. `override` is a **separate action granted only to admin + manager**. |
| D4 | **AC-20 tie-break:** narrowest matching quantity tier → latest `valid_from` → lowest `id`. Never "lowest price". |
| D5 | `price_list_items.specification_version_id IS NULL` = **wildcard**, eligible for any revision of the product. A non-null value is eligible only on an exact revision match. |
| D6 | **Currency:** `CHECK (currency IN ('USD','VND'))`, matching the approved Quotation input policy. Eligible lookup filters by requested currency; **never converts**. |
| D7 | **Selection scope without M10:** build the standalone selection API + UI with `context_type = 'AD_HOC'`, `context_id NULL`, so AC-07…AC-12 are provable now. M10 later only adds `context_type = 'QUOTATION_LINE'`. |
| D8 | **`price_basis`:** `CHECK (price_basis IN ('NET','GROSS','OTHER'))`. `OTHER` requires a non-empty `price_basis_note`. |
| D9 | **Quantity tier overlap:** allowed and **not blocked**. The lookup returns all overlapping eligible items; create/edit responses carry an `overlaps[]` field the drawer renders as an inline, non-blocking warning (AGENTS.md §6). |

## 3. Scope

### In scope
- Price List CRUD + items + approve/archive, market-scoped, `?market=<code>` mandatory.
- Eligible price lookup returning **all** eligible references with a deterministic preselection.
- Price selection recording (reference / manual / override) with reason policy and append-only history.
- UI: Price List grid, create/edit drawer, detail page with items, Eligible Prices selection panel, selection history.
- Grants, OpenAPI, migration 0005 + down, tests.

### Out of scope (explicitly)
- Any part of M10 Quotations — no quotation routes, no PDF, no FX conversion, no `quotation_lines` writes.
- Currency conversion, price floors, approval amount thresholds — none are approved.
- Bulk CSV import / dry run (module doc lists it as proposed; not approved for R1-08).
- New roles, new dependencies, new infrastructure.
- Retroactive repricing of anything.

## 4. Design

### 4.1 Database — `db/migrations/0005_price_lists.sql` (+ `.down.sql`)

Pure `ALTER`-style extension of the baseline, in the style of `0004_product_specifications.sql`:
leading block comment naming R1-08/M08 and the AC ids, section banners, `COMMENT ON COLUMN`
for every added column, **no `FOREIGN KEY` / `REFERENCES`**.

`price_lists`:
- `ADD COLUMN created_by INTEGER NOT NULL DEFAULT 0` then `DROP DEFAULT` (the 0004 backfill-then-tighten pattern).
- `ADD COLUMN approved_at timestamptz`, `ADD COLUMN archived_at timestamptz`, `ADD COLUMN archive_reason text`.
- `CHECK (status IN ('DRAFT','APPROVED','ARCHIVED'))` after an `UPDATE ... WHERE status NOT IN (...)` cleanup.
- `CHECK (currency IN ('USD','VND'))` (D6).
- `CHECK (status <> 'APPROVED' OR (approved_at IS NOT NULL AND approved_by IS NOT NULL))`.
- `CHECK (status <> 'ARCHIVED' OR (archived_at IS NOT NULL AND archive_reason IS NOT NULL))`.
- Index `price_lists_eligibility_idx ON price_lists (market_id, status, tier, valid_from, valid_to)`.
  The baseline `price_eligibility` index leads with `customer_id` and does not serve the
  tier-ordered scan; a comment records why it is not reused.

`price_list_items`:
- `ADD COLUMN price_basis_note text`.
- `CHECK (unit IN ('KG','MT','CTN','PCS','LB'))` — same fixed set as `products.default_unit`.
- `CHECK (price_basis IN ('NET','GROSS','OTHER'))` and
  `CHECK (price_basis <> 'OTHER' OR (price_basis_note IS NOT NULL AND btrim(price_basis_note) <> ''))` (D8).
- Index `price_list_items_lookup_idx ON price_list_items (market_id, product_id, unit, valid_from, valid_to)`.
- `BEFORE UPDATE` trigger `price_list_items_immutable_after_approval` + function
  `reject_price_list_item_change_after_approval()` raising `ERRCODE '55000'`: once the parent
  list is not `DRAFT`, the commercial columns (`product_id`, `specification_version_id`, `unit`,
  `price_basis`, `unit_price`, `min_quantity`, `max_quantity`, `valid_from`, `valid_to`) are
  frozen — the database-level guarantee behind AC-16. Only `updated_at`/`version` may move.
  Same `ROW(NEW...) IS DISTINCT FROM ROW(OLD...)` shape as `reject_specification_version_content_change()`.
- A matching `BEFORE DELETE` guard so items cannot be deleted out from under an approved list.

New table `price_selections` (D2) — append-only, integer identity PK, no FKs:

```
id, market_id NOT NULL, context_type NOT NULL, context_id,
product_id NOT NULL, specification_version_id,
price_list_id, price_list_item_id,
selection_type NOT NULL,            -- REFERENCE | MANUAL | OVERRIDE
listed_amount numeric,              -- listed price at selection time; NULL only for MANUAL
selected_amount numeric NOT NULL CHECK (selected_amount >= 0),
currency NOT NULL, unit NOT NULL, price_basis NOT NULL,
quantity numeric NOT NULL CHECK (quantity > 0),
reason text,
source_metadata jsonb NOT NULL DEFAULT '{}',   -- tier, listPriceCode, specRevisionNo, eligibleAt
selected_by INTEGER NOT NULL, selected_at timestamptz NOT NULL DEFAULT now(),
request_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
CHECK (context_type IN ('AD_HOC','QUOTATION_LINE'))
CHECK (selection_type IN ('REFERENCE','MANUAL','OVERRIDE'))
CHECK (currency IN ('USD','VND'))
CHECK (unit IN ('KG','MT','CTN','PCS','LB'))
CHECK (price_basis IN ('NET','GROSS','OTHER'))
-- Reason policy, enforced in the database as well as the service (AC-09/AC-10):
CHECK (selection_type = 'REFERENCE' OR (reason IS NOT NULL AND length(btrim(reason)) >= 10))
-- A REFERENCE selection must name its item and use exactly the listed amount (AC-08):
CHECK (selection_type <> 'REFERENCE'
       OR (price_list_item_id IS NOT NULL AND listed_amount IS NOT NULL
           AND selected_amount = listed_amount))
-- An OVERRIDE must name the reference it departs from:
CHECK (selection_type <> 'OVERRIDE'
       OR (price_list_item_id IS NOT NULL AND listed_amount IS NOT NULL))
```
Plus function `reject_price_selection_mutation()` + `BEFORE UPDATE OR DELETE` trigger —
same append-only mechanism as `0002_audit_events_append_only.sql` (AC-12: history is never
overwritten). Indexes: `(market_id, context_type, context_id)`, `(market_id, product_id, selected_at DESC)`,
`(market_id, price_list_item_id)`.

`CHECK (selected_amount = listed_amount)` compares `numeric` values, so `100.00` and `100`
compare equal — intentional; the service additionally normalizes both sides through
`src/lib/decimal.ts` before writing.

Also: new assertions block in `scripts/validate-migrations.ts` (status CHECK rejects a bad
value; approved-item content frozen with SQLSTATE 55000; `price_selections` UPDATE/DELETE
rejected; reason CHECK rejects a reasonless MANUAL row; down migration removes the guard
objects), and a dated entry appended to `db/operation/sql_history.md`.

### 4.2 Drizzle schema

Append `priceLists`, `priceListItems`, `priceSelections` to the single shared file
`src/modules/access-control/infrastructure/schema.ts`, after `specificationVersions`, using the
existing `identity()` helper, bare `numeric(...)` for money/quantity, `text()` + domain `as const`
arrays for enums (never `pgEnum`), `timestamp(..., { withTimezone: true })`, and the index
callback form.

### 4.3 Module layout — `src/modules/price-lists/`

Mirrors `src/modules/product-specifications/` exactly.

```
application/
  contracts.ts                  zod .strict() schemas, decimal-as-string regex,
                                keyset cursor codec (copy decodeSpecificationCursor shape)
  price-list-service.ts         use cases; parse → requireGrant → allowedFields → repository → project
  price-list-service.test.ts
domain/
  price-list-grants.ts          readFields/writeFields + priceListAdminGrants / priceListSaleGrants
  price-list-lifecycle.ts       statuses, transition table, derived effective state (D1)
  price-list-eligibility.ts     pure eligibility filter + ordering + preselection (D4, D5)
  price-list-selection.ts       reason policy + selection-type classification (D3, AC-07..AC-10)
infrastructure/
  price-list-repository.ts      Drizzle adapter, transactions, private audit() helper
  price-list-repository.integration.test.ts
presentation/
  api.ts                        protectedAction gate + responseFor error map
  price-list-workspace.tsx      grid + create drawer
  price-list-detail.tsx         detail drawer: items, approve/archive, selection history
  eligible-prices-panel.tsx     lookup + selection + reason capture
```

Reuse without modification: `requirePermission`, `requireCsrf`, `authErrorResponse`,
`currentPrincipal` (`access-control/application/request-auth.ts`); `requireGrant`
(`access-control/application/authorization.ts`); `requestCorrelationId`; `positiveIdSchema`
(`access-control/application/api-contracts.ts`); `getDatabase`; `auditEvents` table;
`src/lib/decimal.ts`; `useMarket()` from `src/modules/markets/market-context.tsx`.

**`price-list-eligibility.ts` — the core pure function.** Signature:
`selectEligiblePrices(candidates, criteria) → { options: EligibleOption[]; suggestedItemId: number | null }`.
Filter predicate (all server-side, AC-02/AC-13/AC-14):
1. `product_id` matches.
2. `specification_version_id IS NULL` **or** equals the requested revision (D5).
3. `unit` equals requested unit exactly — no conversion.
4. `currency` equals requested currency exactly — no conversion.
5. `price_basis` matches when the caller constrains it.
6. List is `APPROVED` **and** `valid_from <= at < valid_to` (inclusive/exclusive, UTC).
7. Item validity window passes the same test.
8. Tier scope: `GENERAL`/`MARKET` always; `CUSTOMER` only when `customer_id` equals the requested customer.
9. `quantity` inside `[min_quantity, max_quantity]` (both inclusive, both optional).

Ordering: group by tier rank `CUSTOMER=0, MARKET=1, GENERAL=2`, then within rank apply D4
(narrowest `max_quantity - min_quantity` span, treating an open bound as infinite → latest
`valid_from` → lowest `id`). `options` is returned fully ordered so the UI shows **all** of
them; `suggestedItemId` is simply `options[0]?.id`. Priority never filters.

**`price-list-selection.ts` — the reason policy (AC-07…AC-10).** Given a selection request,
classify:
- `price_list_item_id` present, is in the eligible set, and `selected_amount` equals that
  item's listed amount (decimal-normalized) → `REFERENCE`, **reason not required**, and it
  does not matter whether the item was the suggested one or cheaper than it.
- `price_list_item_id` present, in the eligible set, amount differs → `OVERRIDE`, reason
  required (≥10 chars trimmed), and the `override` grant required.
- No `price_list_item_id` → `MANUAL`, reason required, `override` grant required.
- `price_list_item_id` present but **not** in the server-recomputed eligible set → reject
  `BUSINESS_RULE_VIOLATION` 409. Eligibility is always recomputed server-side from the
  request, never trusted from the client (closes the "bypass reason via direct API" hole).

### 4.4 API — `/api/v1`, thin route files delegating to `presentation/api.ts`

| Method | Path | Action grant | Notes |
|---|---|---|---|
| GET | `/price-lists` | `read` | keyset pagination, filters `q`, `tier`, `status`, `effectiveState`, `customerId`, `currency` |
| POST | `/price-lists` | `create` | 201, CSRF |
| GET | `/price-lists/{id}` | `read` | includes items + derived `effectiveState` |
| PATCH | `/price-lists/{id}` | `update` | DRAFT only; `expectedVersion` required |
| GET | `/price-lists/{id}/items` | `read` | |
| POST | `/price-lists/{id}/items` | `update` | 201; response carries `overlaps[]` (D9) |
| PATCH | `/price-lists/{id}/items/{itemId}` | `update` | DRAFT parent only; `overlaps[]` |
| POST | `/price-lists/{id}/approve` | `approve` | CSRF, `expectedVersion` |
| POST | `/price-lists/{id}/archive` | `archive` | CSRF, reason required |
| GET | `/price-lists/applicable` | `read` | params `productId`, `specificationVersionId?`, `customerId?`, `quantity`, `unit`, `currency`, `priceBasis?`, `at?`; returns `{ options[], suggestedItemId }` |
| POST | `/price-selections` | `select` (+ `override` when MANUAL/OVERRIDE) | 201, CSRF, records history |
| GET | `/price-selections` | `read` | filters `contextType`, `contextId`, `productId`; `(selected_at DESC, id DESC)` |

Response envelope, headers, error codes and the `protectedAction` gate are copied verbatim
from `src/modules/product-specifications/presentation/api.ts`: `{ data }` / `{ error: { code, message } }`,
`Cache-Control: private, no-store`, mandatory `?market=<code>`, CSRF on every mutation,
`responseFor()` mapping domain errors plus SQLSTATE `55000`/`23505` sniffing through the
`cause` chain.

Field-level projection happens in the service against the grant's `readFields`. `price_list_items.unit_price`
is in `readFields` for all granted roles — it is the reference selling price, not a supplier
cost; no cost-only field exists on these tables, so nothing needs restricting beyond the
allowlist itself.

Register every operation in `src/modules/api-docs/openapi.ts` (paths + `fromZod` schemas) and
add them to `expectedOperations` in `src/modules/api-docs/openapi.test.ts`.

### 4.5 Grants — `domain/price-list-grants.ts` + `scripts/access-control.ts`

Resource string `'price_lists'` (code convention; `docs/structure/backend.md` uses a dotted
`price-lists.<verb>` docs-level naming — the implemented `{resource, action}` convention wins
and the doc gets corrected in the Documentation step).

- `priceListAdminGrants` (assigned to `admin` **and** `manager`): `create`, `read`, `update`,
  `approve`, `archive`, `select`, `override` — all `recordScope: 'ALL'`.
- `priceListSaleGrants` (assigned to `sale`): `read`, `select` — `recordScope: 'ALL'`,
  `writeFields: []` on `read`, and the selection write fields on `select`.
- `accountant`: no grant (not activated in R1).

New operator command `grant-price-lists` in `scripts/access-control.ts`, copying the
`grant-products`/`grant-specifications` block: actor must be an active `admin` holding
`access.grants:manage`, upsert `ON CONFLICT (role_code, resource, action, record_scope) DO UPDATE ... WHERE ... IS DISTINCT FROM`,
one `access.price_list_grants_activated` audit event with `grantBoundary: 'M08_PRICE_LISTS_APPROVED'`.

### 4.6 Audit

Private `audit()` helper on `PriceListRepository`, inserting into `auditEvents` **inside the
caller's transaction** so a failing audit rolls the business write back (AC-18). Action names
follow the `<singular>.<past_tense>` scheme already in use:
`price_list.created`, `price_list.updated`, `price_list.item_added`, `price_list.item_updated`,
`price_list.approved`, `price_list.archived`, `price_selection.recorded`.
`resourceType` is `'price_list'` / `'price_selection'`. `safeDiff` carries only identifiers,
changed-field names, tier, currency, unit and selection type — the monetary amounts live in
`price_selections` columns, not in the audit jsonb.

### 4.7 UI

Replace the placeholder at `src/app/[locale]/(workspace)/price-lists/page.tsx` with the
`SpecificationWorkspace` pattern: thin server component reading `currentPrincipal()` and
rendering `<PriceListWorkspace locale roles />`.

Reproduce the hand-rolled drawer machinery from `specification-workspace.tsx` (no shadcn
components are actually installed; `src/components/ui` is empty): fixed overlay,
`role="dialog" aria-modal="true"`, focus save/trap/restore, Escape + overlay close, dirty
tracking with an in-form "Discard unsaved changes?" footer prompt (never `window.confirm`),
sticky footer with Cancel + pending-aware submit, `min-h-10`/`min-h-11` touch targets,
Tailwind theme tokens, bilingual strings via `const vi = locale === 'vi'`, `X-CSRF-Token`
header on mutations, and open the new record's detail on success.

Screens:
1. **Price List grid** — code, tier, customer, currency, validity, item count, status + derived
   effective state badge; filters; explicit loading (`role="status"`) / empty / error / access-denied states.
2. **Create/Edit drawer** — sections: Identity & scope (code, tier, customer picker), Currency &
   validity, then Items. Customer and product use the debounced `AbortController` searchable
   picker from `specification-workspace.tsx` — human-readable name + code, never a raw numeric id.
   Overlap warnings render inline from `overlaps[]`, labelled explicitly as a warning that does
   not block saving (D9, AGENTS.md §6).
3. **Detail drawer** — items table, approve / archive actions (reason input for archive),
   derived effective state, and the selection history list for the list's items.
4. **Eligible Prices panel** (`eligible-prices-panel.tsx`) — inputs product / spec revision /
   customer / quantity / unit / currency; renders **all** returned options grouped by tier with
   the suggested one visually highlighted and labelled "Recommended"; selecting any option at its
   listed amount submits with no reason field shown; editing the amount or choosing "Enter price
   manually" reveals a required reason textarea (≥10 chars) and is hidden entirely for roles
   without the `override` grant. Below it, the append-only selection history shows actor, listed
   amount, selected amount, type, reason and timestamp.

## 5. Files

**New**
- `db/migrations/0005_price_lists.sql`, `db/migrations/0005_price_lists.down.sql`
- `src/modules/price-lists/**` (11 files listed in §4.3)
- `src/app/api/v1/price-lists/route.ts`, `[id]/route.ts`, `[id]/items/route.ts`,
  `[id]/items/[itemId]/route.ts`, `[id]/approve/route.ts`, `[id]/archive/route.ts`,
  `applicable/route.ts`, and `src/app/api/v1/price-selections/route.ts`
  (each 5–10 lines, delegating only)
- `e2e/price-lists.spec.ts`

**Modified**
- `src/modules/access-control/infrastructure/schema.ts` — three table declarations
- `scripts/access-control.ts` — `grant-price-lists` command
- `scripts/validate-migrations.ts` — M08 assertions + down-migration assertions
- `db/operation/sql_history.md` — dated entry
- `src/modules/api-docs/openapi.ts`, `src/modules/api-docs/openapi.test.ts`
- `src/app/[locale]/(workspace)/price-lists/page.tsx` — replace `R1RoutePage`
- `e2e/global-setup.ts` — add a `price_lists:read` + `price_lists:select` grant for the e2e sale user
- `src/modules/routing/r1-route-data.ts` — drop `/price-lists` from the prototype route table
  (the fixture `src/constants/dummy/price-lists.json` and `src/modules/markets/market-data.test.ts`
  reference it; the fixture stays, the route entry goes)

## 6. Implementation order

1. Migration 0005 + down + `validate-migrations.ts` assertions + `sql_history.md`; run `npm run db:validate-migrations`.
2. Drizzle schema declarations.
3. Domain: `price-list-lifecycle.ts`, `price-list-eligibility.ts`, `price-list-selection.ts`, `price-list-grants.ts` + their unit tests (pure, fastest feedback).
4. `application/contracts.ts`, then `price-list-service.ts` + grant-denial unit test.
5. `infrastructure/price-list-repository.ts` + integration test.
6. `presentation/api.ts` + thin route files + OpenAPI + parity test.
7. `scripts/access-control.ts` grant command; activate grants in dev.
8. UI: workspace → detail → eligible-prices panel; replace the placeholder page.
9. e2e spec + `global-setup.ts` grants.

Steps 1–2 and 3–5 are the dependency spine; 6 depends on 5; 8 depends on 6.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Reason policy bypassed via direct API | Eligibility is recomputed server-side on every selection; `selection_type` is derived by the service, never accepted from the client; the DB `CHECK` on `price_selections` is a second, independent gate. |
| A client sends `selected_amount` that differs only in trailing zeros and is misclassified as OVERRIDE | Both sides normalized through `src/lib/decimal.ts` before comparison; `numeric` equality in the DB CHECK agrees. Covered by an explicit test (`100` vs `100.00` vs `100.000`). |
| Concurrent approve / concurrent selection (AC-17) | Row lock (`FOR UPDATE`) + `expectedVersion` conditional UPDATE on approve; `Promise.allSettled` double-approve integration test asserting exactly one winner; selections recompute eligibility inside their own transaction. |
| Validity-window off-by-one across timezones | `valid_from` inclusive / `valid_to` exclusive, documented in `COMMENT ON COLUMN`, all comparisons in UTC `timestamptz`; boundary tests at exactly `valid_from`, `valid_to - 1ms` and `valid_to`. |
| Baseline index `price_eligibility` leads with `customer_id` and will not serve the tier scan | New `price_lists_eligibility_idx`; `EXPLAIN` checked in the integration test environment rather than assumed. |
| Doc/schema naming conflict (`specification_id` vs `specification_version_id`, `effective_from` vs `valid_from`, `market_country` vs `market_id`+`tier`) | SQL baseline wins; `docs/modules/price-lists.md` is corrected in the Documentation Decision step, not silently. |
| `created_by` backfilled with `0` on existing rows | Dev DB currently has zero `price_lists` rows (verified), so the backfill touches nothing; the `0` = "unknown historical actor" convention from 0004 is preserved and commented. |
| M08 UI/API read as "quotations done" | The plan ships `context_type = 'AD_HOC'` only; the final report will state M10 integration as NOT IMPLEMENTED. |

## 8. Verification

Per `docs/architecture/testing.md`, each check reported PASS / FAIL / BLOCKED / NOT TESTED with evidence.

**Mandatory gates**
- `npm run lint`
- `npm run build`
- `npm run typecheck`
- `npm run db:validate-migrations` (replays baseline + 0001–0005 in a random isolated schema, asserts the new guards, then replays every `.down.sql`)

**Unit — `npm test`**
- `price-list-eligibility.test.ts`: AC-02 (filter by SKU/unit/currency/quantity/date), AC-03 (all eligible returned, not just cheapest), AC-04/05/06 (CUSTOMER → MARKET → GENERAL preselection), AC-13 (expired and non-APPROVED excluded), AC-20 (D4 tie-break, including two same-tier items differing only in quantity span), D5 wildcard revision matching, and an explicit assertion that a cheaper option is **not** auto-selected.
- `price-list-selection.test.ts`: AC-07 (alternate eligible reference, no reason), AC-08 (exact listed amount, no reason), AC-09 (manual → reason required), AC-10 (amount changed → reason required), decimal-normalization equivalence, and rejection of an item id outside the eligible set.
- `price-list-lifecycle.test.ts`: allowed/denied transitions; derived `ACTIVE`/`SCHEDULED`/`EXPIRED` at the three window boundaries.
- `price-list-service.test.ts`: AC-15 — a `sale` principal's `update`/`approve`/`override` attempts throw `AccessDeniedError` and the stub repository is never called.

**Integration — `npm run test:integration`** (`price-list-repository.integration.test.ts`, isolated
schema `price_lists_it_<hex>`, baseline + migrations replayed from disk, `TRUNCATE ... RESTART IDENTITY CASCADE` per test)
- AC-01: authorized create writes the row **and** the audit event in one transaction.
- AC-11/AC-12: every selection persists item id, listed amount, selected amount, currency, unit,
  quantity, type, actor, timestamp and reason; re-selecting a different eligible reference appends
  a second row and leaves the first intact; raw `UPDATE`/`DELETE` on `price_selections` fails with SQLSTATE `55000`.
- AC-13/AC-14: expired, unapproved and wrong-currency/unit/quantity-basis candidates are excluded; invalid basis rejected.
- AC-16: a `price_list_items` row snapshot read before an approve, then an attempted edit after
  approval, fails with `55000`; and a `price_selections` row's `listed_amount` is unchanged after
  the parent list is archived and a new list supersedes it — proving historical terms do not move.
- AC-17: `Promise.allSettled` on two concurrent approves → exactly one APPROVED; concurrent
  selection against a list being approved yields a consistent eligible set.
- AC-18: a temporary rejecting trigger on `audit_events` makes the business write roll back — zero surviving rows.
- AC-19: keyset pagination returns stable, market-scoped pages; a cursor minted in market A is
  rejected in market B; cross-market customer scope rejected.

**HTTP / authorization — real requests**
- `e2e/price-lists.spec.ts`: anonymous `GET /api/v1/price-lists` → 401 and `/price-lists` redirects
  to `/en/login`; after login the granted `sale` user gets 200 with `data.items` an array;
  `POST /api/v1/price-lists` as `sale` → 403 `ACTION_FORBIDDEN`; mutation without `X-CSRF-Token` → 403;
  `POST /api/v1/price-selections` with a manual price and no reason → 422/400, and with a reason → 201.
  Run on both `desktop-chromium` and `mobile-chromium`.
- `openapi.test.ts` path/method parity for all 12 operations.

**Manual / MCP**
- `postgres` MCP (read-only) after a dev run: inspect `price_selections` rows to confirm listed vs
  selected amounts, actor and timestamps; confirm no SQL `FOREIGN KEY` was created on the new table
  (`information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY'`).
- Browser pass over the four screens for keyboard-only operation, visible focus, Escape close,
  dirty-discard prompt, and the reason field appearing only for manual/override.

**Explicitly not claimable**
- M10 Quotations end-to-end, quotation approval and PDF integration → **NOT IMPLEMENTED**. AC-16 is
  proven at the price-list/selection layer (approved item content frozen, recorded listed amount
  immutable), not through an issued quotation.

## 9. Acceptance criteria coverage

| AC | Covered by |
|---|---|
| AC-01 | integration: create + audit in one transaction |
| AC-02 | unit eligibility filter + integration query |
| AC-03 | unit: all eligible returned |
| AC-04 / 05 / 06 | unit: tier preselection |
| AC-07 / AC-08 | unit selection policy + e2e HTTP |
| AC-09 / AC-10 | unit selection policy + DB CHECK + e2e HTTP |
| AC-11 | integration: reason persisted and returned by `GET /price-selections` |
| AC-12 | integration: full selection row + append-only trigger |
| AC-13 | unit + integration |
| AC-14 | contracts unit test + DB CHECKs |
| AC-15 | service unit test + e2e 403 |
| AC-16 | integration: approved item frozen; recorded listed amount unchanged after list changes. **Quotation-level proof deferred to M10.** |
| AC-17 | integration concurrency tests |
| AC-18 | integration: rejecting audit trigger rolls back |
| AC-19 | integration pagination/scope + e2e 401/403 |
| AC-20 | unit tie-break test |

## 10. Workflow gates still ahead (AGENTS.md §2, and the tracker's Phase B)

1. **This plan → approval** (current gate).
2. **Tracker Decision** — ask whether to create/update the R1-08 task in Nimbalyst from the approved plan.
3. **Documentation Decision** — ask before editing `docs/modules/price-lists.md` (field naming, lifecycle
   D1, currency D6, basis D8), `docs/modules/README.md` (M08 status), `docs/structure/backend.md`
   (permission naming, `price-selections` routes), `docs/structure/database.md` (ERD + dictionary for the
   new columns and `price_selections`).
4. **Implementation Approval** — separate and explicit; no application code before it.
5. Code → Verification → Development Log Decision → Specification Update Decision → Final Report.
