# M08 — Price Lists

> **Status: APPROVED FOR IMPLEMENTATION — NOT IMPLEMENTED**
> **Area:** Product · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Objective and boundary

Provide authorized, market-scoped reference pricing that returns every eligible price, preselects deterministically, records each selection append-only, and never retro-prices history. M08 ships standalone with `context_type = 'AD_HOC'`; M10 Quotations integration remains out of scope.

Prerequisites verified for R1-08: M01 Customers, M06 Products, M07 Product Specifications, baseline `price_lists` and `price_list_items`, and `src/lib/decimal.ts`. M10 Quotations is not implemented. Migration 0005 adds `price_selections` and extends the baseline tables.

## Confirmed decisions

- Store lifecycle as `DRAFT → APPROVED → ARCHIVED`. Derive `ACTIVE`, `SCHEDULED`, and `EXPIRED` at query time from approval status and validity bounds.
- List and item validity is UTC, inclusive at `valid_from` and exclusive at `valid_to`.
- Specification version `NULL` on an item means wildcard; otherwise the requested version must match exactly.
- Supported currency is USD or VND. Eligibility requires an exact currency match; no conversion is performed.
- Units are KG, MT, CTN, PCS, or LB. No unit conversion is performed.
- Price basis is NET, GROSS, or OTHER. OTHER requires a non-empty note.
- Quantity tier overlaps are allowed. Create/edit responses include `overlaps[]` as a non-blocking warning.
- Eligible options are ordered by scope priority (CUSTOMER, MARKET, GENERAL), then narrowest matching quantity tier, latest `valid_from`, and lowest item id. Return every eligible option; never rank by cheapest price.
- Grants use resource `price_lists`: admin and manager receive create/read/update/approve/archive/select/override; sale receives read/select; accountant receives none. No maker-checker rule applies.
- Standalone selections use `context_type = 'AD_HOC'`, `context_id = NULL`. M10 may later add `QUOTATION_LINE`.
- Every selection is append-only and has a mandatory `audit_events` row in the same transaction. Audit diffs contain identifiers and safe field names, never monetary amounts.

## Scope

- Market-scoped Price List CRUD, item CRUD, approval and archive. `?market=<code>` is mandatory on every operation.
- Eligible price lookup and deterministic recommendation.
- Reference, manual, and override selection capture with reason policy and history.
- Price List grid, create/edit drawer, detail view, eligible price panel, and selection history.
- Grants, OpenAPI, migration 0005 and down migration, and unit/integration/e2e coverage.

Excluded: M10 quotation routes, PDF, FX conversion, quotation line writes, price floors, approval amount thresholds, bulk CSV, new roles/dependencies/infrastructure, and retroactive repricing.

## Selection policy

- Selecting any eligible item at its listed amount is `REFERENCE`; no reason is required, whether or not it is the recommended item.
- Selecting an eligible item at a different amount is `OVERRIDE`; admin/manager override grant and a reason of at least 10 trimmed characters are required.
- Selecting without a list item is `MANUAL`; admin/manager override grant and a reason of at least 10 trimmed characters are required.
- The server recomputes eligibility for every selection. A supplied item outside that set is rejected with `BUSINESS_RULE_VIOLATION` (409).
- Persist listed and selected amount, currency, unit, basis, quantity, actor, timestamp, context, reason, and source metadata. Database constraints enforce reason and reference-amount policy as a second gate.

## API contract

All operations use `/api/v1`, require an authorized market, return private no-store responses, and follow the Product Specifications envelope/error/CSRF conventions.

| Method | Path | Grant |
|---|---|---|
| GET/POST | `/price-lists` | read / create |
| GET/PATCH | `/price-lists/{id}` | read / update |
| GET/POST | `/price-lists/{id}/items` | read / update |
| PATCH | `/price-lists/{id}/items/{itemId}` | update |
| POST | `/price-lists/{id}/approve` | approve |
| POST | `/price-lists/{id}/archive` | archive |
| GET | `/price-lists/applicable` | read |
| POST | `/price-selections` | select; override additionally for MANUAL/OVERRIDE |
| GET | `/price-selections` | read |

List and history endpoints are market-scoped and paginated. Applicable lookup accepts product, optional specification revision/customer/price basis, quantity, unit, currency, and optional evaluation instant; it returns `{ options[], suggestedItemId }`. Mutations use CSRF protection and optimistic version checks where applicable.

## Data and audit contract

Migration `0005_price_lists.sql` extends the applied baseline with list creator and lifecycle timestamps/reason, status/currency/lifecycle checks, item price-basis note and checks, lookup indexes, and database guards that freeze item commercial terms once the parent leaves DRAFT. It creates append-only `price_selections` with integer identity, no foreign keys, reason/reference checks, mutation rejection triggers, and market-scoped indexes. The down migration removes only these M08 additions.

Business writes and their `audit_events` entry share one transaction; audit failure rolls back the write. Selection history cannot be updated or deleted. Changes to an approved list never alter a prior selection or any future quotation snapshot.

## UI behavior

The grid shows derived effective state and loading, empty, error, and access-denied states. Create/edit uses the accessible right-side drawer pattern with searchable customer/product pickers, sticky actions, dirty-discard handling, and inline non-blocking `overlaps[]` warnings. Successful creation opens the new detail page. The eligible panel shows all options grouped by tier and highlights the recommendation. Reason entry appears only for manual/override selections and only to roles with override permission. Selection history shows the reason to authorized approvers.

## Acceptance criteria

- Authorized CRUD/approval/archive is market-scoped, transactional, audited, and denies unauthorized writes.
- Lookup filters product, exact/wildcard specification, unit, currency, basis, validity, tier, and inclusive quantity bounds; expired and unapproved prices are excluded.
- Every eligible price is returned. Preselection follows CUSTOMER → MARKET → GENERAL, then the deterministic tie-break above.
- Reference selection needs no reason; manual and override require a reason and persist it with actor, amounts, timestamp, and provenance.
- Concurrent approval permits one approved winner; selection observes consistent eligibility.
- Mandatory audit failure rolls back; append-only history and database guards preserve past commercial terms.
- Search, filters, and pagination reveal no cross-market or unauthorized records.
- M10 quotation end-to-end, quotation approval, and PDF integration are explicitly **NOT IMPLEMENTED** by this module.

## Verification plan

Run `npm run lint`, `npm run build`, `npm run typecheck`, and `npm run db:validate-migrations`; run focused unit tests, isolated-schema integration tests, and desktop/mobile Chromium e2e. Check OpenAPI parity, database append-only/no-FK behavior, and browser keyboard/focus/Escape/dirty-discard/reason visibility. Report local, browser, database and provider evidence separately; no M10 behavior may be claimed.
