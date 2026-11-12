# R1-07 · M09 · RFQs — Implementation Plan

Tracker: `pln_mwc3wlise7obf2` (CCA.16) · Module: `docs/modules/rfqs.md` · Release R1 — Core CRM
Prerequisites verified implemented: R1-03 Customers, R1-06 Product Specifications

> **Plan approved 2026-11-11.** Implementation approval NOT granted — no code written.

## 1. Context

M09 RFQs is the next vertical slice in the approved R1 delivery order (`docs/modules/README.md:41`:
Customers/Contacts → Products/Specs → **RFQs** → Quotations). Today `/rfqs` only renders a dummy
prototype (`src/app/[locale]/(workspace)/rfqs/page.tsx` → `R1RoutePage` over
`src/constants/dummy/rfqs.json`), so sales has no way to record an inbound buyer request.

The business need: capture a buyer's **original** request verbatim (free text, grade, size,
packaging, quantity, deadline) *before* anyone knows which SKU fits, then let sales map one or more
candidate SKUs / specification revisions onto it — without ever mutating what the buyer asked for.
Three concepts must stay distinguishable forever: Original Requested Specification, Mapped
Specification, Offered Specification.

Verified starting state (checked against source, `db/migrations/` and the live `seafood_crm` DB):

- `rfqs` and `rfq_lines` **already exist** in `seafood_crm` (public schema, both empty) and in the R1
  baseline `docs/structure/01_init_20261106.sql:467-507`. `rfqs.status` has **no CHECK** — the
  baseline comment (`:1760`) defers it to open gate **G04**.
- There is **no Drizzle mapping** for them in `src/modules/access-control/infrastructure/schema.ts`
  and **no `src/modules/rfqs` directory**. `opportunities` likewise exists in the baseline with no
  Drizzle mapping.
- `record_links.rfq_id`, `files`, `file_attachments`, `idempotency_records` exist; there is no
  storage adapter and no code uses `idempotency_records`.
- Migration precedent for extending an applied baseline table: `db/migrations/0005_price_lists.sql`
  (`ALTER TABLE … ADD COLUMN` / `ADD CONSTRAINT CHECK` / `CREATE INDEX` / `COMMENT ON COLUMN` +
  `BEFORE UPDATE` immutability trigger raising `ERRCODE '55000'`) with a matching `.down.sql`, and
  `scripts/validate-migrations.ts` (435 lines) which applies and then reverses every migration.

Intended outcome: a working, authorized, audited RFQ module (list / create / detail / lines /
mapping / alternatives / transitions / reassign) that provably satisfies the acceptance criteria,
with RFQ → Quotation end-to-end explicitly reported **BLOCKED** because M10 does not exist.

## 2. Owner-approved decisions

| # | Decision |
|---|---|
| D1 | **New table `rfq_line_offers`** carries mapping + offer alternatives (own identity per alternative, SKU, specification revision, frozen offered snapshot). **No pricing / commercial fields** — M10 Quotations owns those. |
| D2 | **Lifecycle:** `DRAFT → IN_REVIEW → QUOTED → CLOSED`, plus `CANCELLED` from any non-terminal state, enforced by CHECK. `WON/LOST/NO_BID/EXPIRED` live in a separate `close_outcome` column, not in the status vocabulary. This resolves gate G04 **for RFQs only**, in favour of `DRAFT` (not `NEW`), demoting `LOST` to an outcome. |
| D3 | **Original request preservation:** immutable `original_*` columns on `rfq_lines` (write-once, DB trigger, `55000`) **plus** an append-only `rfq_line_requirement_revisions` table. |
| D4 | **Attachments:** read-only listing of `scan_state = 'CLEAN'` files via `record_links(rfq_id)` + `file_attachments`. No upload endpoint; `files.storage_key` never leaves the server. |
| D5 | **Out of scope:** idempotency / inbound-intake dedup; `POST /rfqs/:id/quotations` (`docs/structure/backend.md:153` fixes alternatives creation at `POST /quotations` + `rfqId` in M10). |
| D6 | **RFQ ownership is independent** of customer ownership, in both directions. Customer handover never reassigns RFQs; RFQ reassignment never touches the customer. Transfer is explicit via `POST /rfqs/:id/reassign` with reason + audit. |
| D7 | **Sales Owner validation:** target user must be `users.status = 'ACTIVE'`, hold an effective `user_market_memberships` row in the market, and their role must hold an active `role_grants` row for `rfqs:create` or `rfqs:update`. No hard-coded role name. |
| D8 | **`target_price` / `currency` field policy:** present in `readFields` for admin and manager (ALL scope) and for sale (OWN scope only). `accountant` gets **no grant at all** — `docs/business/r1-decisions.md:108` "Accountant is not activated in R1 (default deny)". |
| D9 | **Deadline policy:** `response_due_at` stays nullable; when present it must be `> received_at`. ISO-8601 with offset accepted, stored as UTC `timestamptz`. DB CHECK added. No new timezone column. |
| D10 | **Record scopes:** Sale `OWN`, Manager `ALL`, Admin `ALL`, per `docs/business/r1-decisions.md:99` (which also records M01's `TEAM` as a known implementation gap at `:102`). This supersedes `docs/modules/rfqs.md:30` "Manager TEAM". `scopeCondition` still implements `TEAM`, so a later change is a seed-only change. |
| D11 | **`ASSIGNED` scope (time-bounded peer support, `r1-decisions.md:99`) is NOT implemented in R1-07.** `scopeCondition` fails closed (`sql\`false\``) for it. Reported as NOT IMPLEMENTED; separate task. |

### Corrections to earlier assumptions (verified in source)

1. **`buildOfferSnapshot` must not be reused.** It is a *repository method*
   (`src/modules/product-specifications/infrastructure/specification-repository.ts:414`) reading
   through `this.database`, i.e. **outside** the caller's transaction. Confirming an alternative must
   instead load the revision / specification / product rows **through the transaction executor** and
   call the pure `buildSpecificationSnapshot`
   (`src/modules/product-specifications/domain/specification-snapshot.ts:182`) directly — otherwise a
   concurrent `publishRevision` can race the snapshot.
2. **`rfqs` has no `team_id` column** in the baseline. Migration 0006 must add it, or `TEAM` record
   scope is unimplementable.
3. **`scripts/validate-migrations.ts` must be extended** or `npm run db:validate-migrations` will not
   cover 0006 at all.
4. `rfqs.opportunity_id` must be validated, so a minimal read-only `opportunities` Drizzle mapping is
   needed.

## 3. Scope

In: RFQ CRUD + lifecycle + reassign, requested items (immutable original + revision history),
SKU/specification-revision mapping as offer alternatives, request-vs-offer comparison, read-only
attachment listing, scoped list/search/pagination, grants, audit, OpenAPI, UI workspace, tests.

Out: quotations, pricing, price lists, sales orders, lead/opportunity requirement, file
upload/scanning, inbound email/web intake, idempotency, notifications, SLA / auto-expiry,
`ASSIGNED` scope.

## 4. Database — `db/migrations/0006_rfqs.sql` (+ `.down.sql`)

Extends the applied baseline. **No SQL `FOREIGN KEY` / `REFERENCES`** anywhere; logical relations are
enforced in the application layer inside the transaction. Integer identity PKs, `timestamptz` UTC,
`COMMENT ON` for every new object. `.down.sql` reverses only what 0006 created (the baseline's
`UNIQUE (market_id, customer_id, id)` / `UNIQUE (market_id, rfq_id, id)` are never touched).

### 4.1 `rfqs` — ALTER

Add `created_by INTEGER NOT NULL` (via `DEFAULT 0` then `DROP DEFAULT`, documented as
"pre-migration row with no recorded actor", same as `price_lists.created_by`), `team_id INTEGER`,
`notes text`, `close_outcome text`, `close_reason text`, `closed_at timestamptz`.

Normalise then constrain:

```sql
UPDATE rfqs SET status = 'DRAFT'
WHERE status NOT IN ('DRAFT','IN_REVIEW','QUOTED','CLOSED','CANCELLED');

ALTER TABLE rfqs ADD CONSTRAINT rfqs_status_check
  CHECK (status IN ('DRAFT','IN_REVIEW','QUOTED','CLOSED','CANCELLED'));
ALTER TABLE rfqs ADD CONSTRAINT rfqs_source_check
  CHECK (source IN ('EMAIL','PHONE','MEETING','MESSAGING','WEB_FORM','TRADE_SHOW','OTHER'));
ALTER TABLE rfqs ADD CONSTRAINT rfqs_number_format_check
  CHECK (number ~ '^RFQ-[0-9]{4}-[0-9]{6}$');
ALTER TABLE rfqs ADD CONSTRAINT rfqs_destination_country_check
  CHECK (destination_country IS NULL OR destination_country ~ '^[A-Z]{2}$');
ALTER TABLE rfqs ADD CONSTRAINT rfqs_response_due_after_received_check
  CHECK (response_due_at IS NULL OR response_due_at > received_at);
ALTER TABLE rfqs ADD CONSTRAINT rfqs_close_outcome_check
  CHECK (close_outcome IS NULL OR close_outcome IN ('WON','LOST','NO_BID','EXPIRED'));
ALTER TABLE rfqs ADD CONSTRAINT rfqs_closed_metadata_check
  CHECK (status <> 'CLOSED' OR (closed_at IS NOT NULL AND close_outcome IS NOT NULL
    AND close_reason IS NOT NULL AND btrim(close_reason) <> ''));
ALTER TABLE rfqs ADD CONSTRAINT rfqs_cancelled_metadata_check
  CHECK (status <> 'CANCELLED' OR (closed_at IS NOT NULL AND close_outcome IS NULL
    AND close_reason IS NOT NULL AND btrim(close_reason) <> ''));
ALTER TABLE rfqs ADD CONSTRAINT rfqs_open_metadata_check
  CHECK (status IN ('CLOSED','CANCELLED')
    OR (closed_at IS NULL AND close_outcome IS NULL AND close_reason IS NULL));

CREATE INDEX rfqs_status_due_idx ON rfqs (market_id, status, response_due_at);
CREATE INDEX rfqs_team_page_idx  ON rfqs (market_id, team_id, created_at DESC, id);
```

(`rfqs_owner_page`, `rfqs_parent_page`, `idx_rfqs_owner_id`,
`idx_rfqs_market_id_customer_id_contact_id` already exist — do not recreate.)

### 4.2 `rfq_lines` — ALTER (immutable original request, D3)

Add `original_product_id INTEGER`, `original_free_text_request text`,
`original_requirements jsonb NOT NULL DEFAULT '{}'`,
`requirements_revision_no integer NOT NULL DEFAULT 0` (0 = original only), backfilled from the
current values. CHECKs: at least one of `original_product_id` / non-blank
`original_free_text_request`; `requirements_revision_no >= 0`; `unit IN ('KG','MT','CTN','PCS','LB')`;
`currency IN ('USD','VND')`; `jsonb_typeof(requirements) = 'object'` for both jsonb columns.

Trigger `rfq_lines_original_immutable` (`BEFORE UPDATE`, function
`reject_rfq_line_original_change`) raises `55000` when any of `market_id`, `rfq_id`, `line_no`,
`original_product_id`, `original_free_text_request`, `original_requirements` changes, or when
`requirements_revision_no` is rewound.

### 4.3 `rfq_line_requirement_revisions` — CREATE (append-only)

```sql
CREATE TABLE rfq_line_requirement_revisions (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  market_id INTEGER NOT NULL,
  rfq_id INTEGER NOT NULL,
  rfq_line_id INTEGER NOT NULL,
  revision_no integer NOT NULL CHECK (revision_no > 0),
  product_id INTEGER,
  free_text_request text,
  requirements jsonb NOT NULL DEFAULT '{}',
  quantity numeric CHECK (quantity IS NULL OR quantity > 0),
  unit text,
  target_price numeric CHECK (target_price IS NULL OR target_price >= 0),
  currency text,
  reason text NOT NULL,
  changed_by INTEGER NOT NULL,
  request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (market_id, rfq_line_id, revision_no),
  CHECK (jsonb_typeof(requirements) = 'object'),
  CHECK (length(btrim(reason)) >= 10),
  CHECK (unit IS NULL OR unit IN ('KG','MT','CTN','PCS','LB')),
  CHECK (currency IS NULL OR currency IN ('USD','VND')),
  CHECK ((quantity IS NULL) = (unit IS NULL)),
  CHECK ((target_price IS NULL) = (currency IS NULL)),
  CHECK (product_id IS NOT NULL OR nullif(btrim(free_text_request), '') IS NOT NULL)
);
CREATE INDEX rfq_line_requirement_revisions_line_idx
  ON rfq_line_requirement_revisions (market_id, rfq_line_id, revision_no DESC);
CREATE INDEX rfq_line_requirement_revisions_rfq_idx
  ON rfq_line_requirement_revisions (market_id, rfq_id);
```

Append-only enforced like `audit_events` (migration 0002): `BEFORE UPDATE OR DELETE` trigger
`rfq_line_requirement_revisions_append_only` raising `55000`.

### 4.4 `rfq_line_offers` — CREATE (mapping + alternatives, D1)

```sql
CREATE TABLE rfq_line_offers (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  market_id INTEGER NOT NULL,
  rfq_id INTEGER NOT NULL,
  rfq_line_id INTEGER NOT NULL,
  alternative_code text NOT NULL,
  product_id INTEGER NOT NULL,
  specification_id INTEGER NOT NULL,
  specification_version_id INTEGER,
  offered_snapshot jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'DRAFT',
  mapping_note text,
  confirmed_at timestamptz,
  confirmed_by INTEGER,
  withdrawn_at timestamptz,
  withdraw_reason text,
  created_by INTEGER NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (market_id, rfq_line_id, alternative_code),
  UNIQUE (market_id, rfq_id, id),
  CHECK (alternative_code ~ '^[A-Z]{1,2}$'),
  CHECK (status IN ('DRAFT','CONFIRMED','WITHDRAWN')),
  CHECK (jsonb_typeof(offered_snapshot) = 'object'),
  CHECK (status <> 'DRAFT' OR (offered_snapshot = '{}'::jsonb
    AND confirmed_at IS NULL AND confirmed_by IS NULL
    AND withdrawn_at IS NULL AND withdraw_reason IS NULL)),
  CHECK (status <> 'CONFIRMED' OR (specification_version_id IS NOT NULL
    AND offered_snapshot <> '{}'::jsonb
    AND confirmed_at IS NOT NULL AND confirmed_by IS NOT NULL
    AND withdrawn_at IS NULL AND withdraw_reason IS NULL)),
  CHECK (status <> 'WITHDRAWN' OR (withdrawn_at IS NOT NULL
    AND withdraw_reason IS NOT NULL AND btrim(withdraw_reason) <> ''))
);
CREATE INDEX rfq_line_offers_line_idx          ON rfq_line_offers (market_id, rfq_line_id, alternative_code);
CREATE INDEX rfq_line_offers_rfq_status_idx    ON rfq_line_offers (market_id, rfq_id, status);
CREATE INDEX rfq_line_offers_specification_idx ON rfq_line_offers (market_id, specification_version_id);
CREATE INDEX rfq_line_offers_product_idx       ON rfq_line_offers (market_id, product_id);
```

Two more triggers: `rfq_line_offers_immutable_after_confirm` (`BEFORE UPDATE`) freezes
`product_id`, `specification_id`, `specification_version_id`, `offered_snapshot`, `confirmed_at`,
`confirmed_by` once `status = 'CONFIRMED'`, forbids returning to `DRAFT` and forbids leaving
`WITHDRAWN`; `rfq_line_offers_delete_after_confirm` (`BEFORE DELETE`) rejects deleting a
non-`DRAFT` row. Both raise `55000`. **This is what makes "historical committed data preserved" hold
when the product/spec later changes.**

### 4.5 Drizzle mapping

Append `opportunities` (read-only validation mapping), `rfqs`, `rfqLines`,
`rfqLineRequirementRevisions`, `rfqLineOffers` to
`src/modules/access-control/infrastructure/schema.ts` after `priceSelections` (~line 823), using the
existing conventions: `identity()` helper, snake_case SQL names,
`timestamp(..., { withTimezone: true })`, `version` last, indexes in the array-returning third
argument, no `references()`. No new imports are required.

## 5. Module — `src/modules/rfqs`

Layering copies `src/modules/product-specifications` exactly (`application/` · `domain/` ·
`infrastructure/` · `presentation/`); repository injected through a defaulted constructor parameter;
`import 'server-only'` at the top of services and repositories.

### `domain/rfq-lifecycle.ts`
`rfqStatuses`, `rfqCloseOutcomes`, `rfqSources`, `rfqOfferStatuses`; `canTransitionRfq`,
`canTransitionRfqOffer`, `isEditableRfqStatus` (DRAFT | IN_REVIEW), `isTerminalRfqStatus`;
`RfqTransitionError`, `RfqNotQuotableError` (carries `lineNumbers`), `unquotableLines`,
`assertQuotable` — mirrors `specification-lifecycle.ts`'s `approvalRequiredFields` /
`assertApprovable`.
RFQ transitions: `DRAFT → IN_REVIEW | CANCELLED`; `IN_REVIEW → QUOTED | DRAFT | CANCELLED`;
`QUOTED → CLOSED | CANCELLED`; `CLOSED`, `CANCELLED` terminal.
Offer transitions: `DRAFT → CONFIRMED | WITHDRAWN`; `CONFIRMED → WITHDRAWN`; `WITHDRAWN` terminal.
`assertQuotable` blocks `IN_REVIEW → QUOTED` while any line lacks quantity/unit or a CONFIRMED
alternative (`docs/modules/rfqs.md:64`).

### `domain/rfq-numbering.ts`
`rfqNumberPattern`, `formatRfqNumber(year, sequence)` → `RFQ-2026-000042`, `parseRfqNumber`,
`highestSequence(numbers, year)`, `nextRfqNumber(numbers, receivedAt)` (year from `received_at` in
UTC; restarts at `000001` each year), `RfqNumberAllocationError`, `MAX_RFQ_NUMBER_ATTEMPTS = 5`.

### `domain/rfq-grants.ts`
`rfqReadFields`, `rfqLineReadFields`, `rfqOfferReadFields`, `rfqAllReadFields`, `rfqWriteFields`,
`rfqCreateWriteFields`, `rfqLineWriteFields`, `rfqOfferWriteFields`, `rfqAdminGrants`,
`rfqManagerGrants`, `rfqSaleGrants`, `rfqAccountantGrants = [] as const` — shape per
`src/modules/product-specifications/domain/specification-grants.ts`, with a header comment
recording D8/D10/D11.

### `domain/rfq-offer-snapshot.ts`
`rfqOfferSnapshotVersion = 1`, `RfqOfferSnapshot` (= `SpecificationSnapshot` + `rfqLineId`,
`alternativeCode`, `requestedAtCapture`), `buildRfqOfferSnapshot(input)` — a **pure** wrapper over
`buildSpecificationSnapshot` with `capturedAt` injected, freezing the request side alongside the
offer; `RfqOfferNotConfirmableError` when the chosen revision is not `APPROVED` (an `ARCHIVED`
revision may be read back but never newly confirmed); `compareRequestToOffer(requested, offer,
fields)` → `RequestOfferDifference[]`, reusing `compareRevisionFields`.

### `application/contracts.ts`
`marketCodeSchema` (copied verbatim), `rfqLineInputSchema`, `createRfqSchema` (lines `.min(1).max(100)`),
`updateRfqSchema`, `addRfqLineSchema`, `reviseRfqLineRequirementsSchema` (`reason` min 10),
`transitionRfqSchema`, `closeRfqSchema`, `cancelRfqSchema`, `reassignRfqSchema`,
`createRfqOfferSchema`, `updateRfqOfferSchema`, `confirmRfqOfferSchema`, `withdrawRfqOfferSchema`,
`rfqListQuerySchema`, `rfqComparisonQuerySchema`, `decodeRfqCursor`, `comparableRequestFields`,
plus `type …Input` exports. All `.strict()`; patch schemas use the `.refine(keys > 1)` pattern;
decimals as strings with the existing `/^-?\d{1,18}(?:\.\d{1,6})?$/` guard; `version: positiveId`
required on every mutation. Deadlines: `z.string().trim().datetime({ offset: true }).transform(v =>
new Date(v))`; `.superRefine` enforces D9 and the per-line all-or-nothing pairs so the 400 precedes
the DB CHECK.

### `application/rfq-service.ts`
`class RfqService` — `resolveMarketId`, `list`, `get`, `listAttachments`, `comparison`,
`listLineRequirementRevisions`, `create`, `update`, `addLine`, `reviseLineRequirements`,
`submitForReview`, `returnToDraft`, `markQuoted`, `close`, `cancel`, `reassign`, `createOffer`,
`updateOffer`, `confirmOffer`, `withdrawOffer`. Every method runs
*parse → `requireGrant` → `allowedFields` → repository → project*. Module-private `controlKeys`
(`version`, `lineVersion`, `reason`, `outcome`, `revisionNo`, `lines`), `writableFields`,
`allowedFields` → `AccessDeniedError`, and `projectRfq` / `projectRfqLine` / `projectRfqOffer`
(nested `lines[].offers[]` and `lines[].requirementRevisions[]` projected through their own field
lists, so `offeredSnapshot` and `targetPrice` never leak without their grant).
`create` mirrors `customer-service.ts:164`: `const ownerId = value.ownerId ?? actor.userId`, and
`if (policy.scope === 'OWN' && ownerId !== actor.userId) throw new AccessDeniedError()`.

### `infrastructure/rfq-repository.ts`
`class RfqRepository` with module-level

```ts
function scopeCondition(scope: RecordScope, actor: Principal): SQL {
  if (scope === 'ALL') return sql`true`
  if (scope === 'OWN') return eq(rfqs.ownerId, actor.userId)
  if (scope === 'TEAM' && actor.teamIds.length) return inArray(rfqs.teamId, actor.teamIds)
  return sql`false`
}
```

(fails closed for `NONE`/`ASSIGNED` — D11). Child reads re-derive scope by joining the parent RFQ;
a child id is never trusted alone.

Errors: `RfqNotFoundError`, `RfqConflictError`, `RfqImmutableError`,
`RfqCustomerNotEligibleError`, `RfqContactNotEligibleError`, `RfqOpportunityNotEligibleError`,
`RfqOwnerNotEligibleError`, `RfqProductNotEligibleError`, `RfqSpecificationNotEligibleError`,
`RfqNumberAllocationFailedError`, `RfqOfferCodeAllocationError`.

Private internals: `assertMarketAccess`, `resolveMarketId`, `lockRfq` / `lockLine` / `lockOffer`
(`.for('update')`), `allocateNumber`, `allocateAlternativeCode`, `requireEligibleCustomer` (same
market, `status <> 'ARCHIVED'`, **plus** the customer's own `scopeCondition` per
`docs/modules/rfqs.md:25`), `requireEligibleContact`, `requireEligibleOpportunity`,
`requireEligibleProduct` (`products.status = 'ACTIVE'`),
`assertOwnerAssignment` (D7 — `customer-repository.ts:771-807` plus an `EXISTS` over
`user_roles ⋈ role_grants` for `resource='rfqs' AND action IN ('create','update') AND active`),
`loadApprovedRevisionForOffer` (**reads through the transaction executor**, see §2 correction 1),
`composedRfq` / `composeLine` / `composeOffer` (derives `dueState`, `lineCount`,
`confirmedOfferCount`), `lineColumns` / `lineContent(patch)` column allowlist, `safeSearch`,
`postgresErrorCode` / `isImmutabilityViolation` (`55000`) / `isUniqueViolation` (`23505`), and
`audit(...)` — copied verbatim from `specification-repository.ts`.

`listAttachments` joins `record_links` on `eq(recordLinks.rfqId, id)` → `file_attachments` →
`files`, filters `files.scanState = 'CLEAN'`, and selects only `fileId`, `purpose`, `originalName`,
`mediaType`, `byteSize`, `sha256`, `createdAt` — **never `storage_key`** (same rule as
`listRevisionDocuments`, `specification-repository.ts:366-406`).

### `presentation/api.ts`
`protectedAction` gate copied from `product-specifications/presentation/api.ts:151-183`
(`requirePermission('rfqs', action)` → `requireCsrf` on mutations → `marketCodeSchema` on
`?market=` → `resolveMarketId` → `Response.json({ data }, { headers: { 'Cache-Control':
'private, no-store' } })`), plus `listQuery`, `jsonBody`, and `responseFor`:

| Error | Status / code |
|---|---|
| `z.ZodError` | 400 `VALIDATION_FAILED` |
| `AuthenticationError` | 401 `UNAUTHENTICATED` |
| `AccessDeniedError` (incl. CSRF, market) | 403 `ACTION_FORBIDDEN` |
| `Rfq*NotFoundError` | 404 `NOT_FOUND` |
| `RfqConflictError` | 409 `VERSION_CONFLICT` |
| `RfqImmutableError`, SQLSTATE `55000` | 409 `IMMUTABLE_RFQ` |
| `RfqTransitionError` (+`from`,`to`) | 409 `INVALID_RFQ_TRANSITION` |
| `RfqOfferNotConfirmableError` | 409 `SPECIFICATION_NOT_APPROVED` |
| `Rfq*NotEligibleError` | 409 `BUSINESS_RULE_VIOLATION` |
| allocation errors, SQLSTATE `23505` | 409 `CONFLICT` |
| `RfqNotQuotableError` (+`lineNumbers`) | 422 `RFQ_NOT_QUOTABLE` |
| fallback | `authErrorResponse(error)` / 500 `INTERNAL_ERROR` |

Exported handlers: `listRfqs`, `createRfq`, `getRfq`, `updateRfq`, `listRfqAttachments`,
`getRfqComparison`, `submitRfqForReview`, `returnRfqToDraft`, `markRfqQuoted`, `closeRfq`,
`cancelRfq`, `reassignRfq`, `listRfqLines`, `addRfqLine`, `reviseRfqLineRequirements`,
`listRfqLineRequirementRevisions`, `listRfqLineOffers`, `createRfqLineOffer`, `updateRfqLineOffer`,
`confirmRfqLineOffer`, `withdrawRfqLineOffer`, `rfqApiErrors = responseFor`.

## 6. API routes (thin delegations under `src/app/api/v1/rfqs/**`)

| Method + path | Grant |
|---|---|
| `GET` / `POST` `/api/v1/rfqs` | `rfqs:read` / `rfqs:create` |
| `GET` / `PATCH` `/api/v1/rfqs/{id}` | `rfqs:read` / `rfqs:update` |
| `GET` `/api/v1/rfqs/{id}/comparison` (`?lineId`) | `rfqs:read` |
| `GET` `/api/v1/rfqs/{id}/attachments` | `rfqs:read` |
| `GET` / `POST` `/api/v1/rfqs/{id}/lines` | `rfqs:read` / `rfqs:update` |
| `PATCH` `/api/v1/rfqs/{id}/lines/{lineId}` (revise requirements) | `rfqs:update` |
| `GET` `…/lines/{lineId}/requirement-revisions` | `rfqs:read` |
| `GET` / `POST` `…/lines/{lineId}/offers` | `rfqs:read` / `rfqs:offer` |
| `PATCH` `…/offers/{offerId}` | `rfqs:offer` |
| `POST` `…/offers/{offerId}/confirm` · `…/withdraw` | `rfqs:offer` |
| `POST` `/api/v1/rfqs/{id}/submit-for-review` · `/return-to-draft` · `/mark-quoted` | `rfqs:transition` |
| `POST` `/api/v1/rfqs/{id}/close` · `/cancel` | `rfqs:close` |
| `POST` `/api/v1/rfqs/{id}/reassign` | `rfqs:reassign` |

Route files are 3–9 line delegations with `await context.params` (Next 16 style, cf.
`src/app/api/v1/specifications/[id]/revisions/[revisionNo]/publish/route.ts`). All require
`?market=`; all mutations require `x-csrf-token`. Lists are keyset-paginated
(`base64url({ createdAt, id })`, `desc(createdAt), desc(id)`, `limit + 1`) with filters `q`,
`status`, `source`, `ownerId`, `customerId`, `dueState` (`OVERDUE`/`DUE_SOON`/`OPEN`), `dueBefore`,
`incompleteOnly`.

## 7. Transactions, locking, audit rollback

Every write is one `this.database.transaction(...)` and **the audit insert is the last statement**,
so a failing mandatory audit rolls the business change back. Lock order is always
**`rfqs` → `rfq_lines` → `rfq_line_offers` → advisory lock → audit**
(`docs/structure/backend.md:550`).

| Operation | Plan |
|---|---|
| `create` | eligibility + `assertOwnerAssignment` → transaction: `pg_advisory_xact_lock(hashtext('rfq:' \|\| marketId))` → read existing numbers for the year → `nextRfqNumber` → insert `rfqs` → insert `rfq_lines` (`line_no` 1..n, `original_*` mirrored at insert) → insert `record_links (market_id, rfq_id)` → audit. `UNIQUE (market_id, number)` is the arbiter; bounded retry on `23505`, then `RfqNumberAllocationFailedError` → 409. The advisory lock is transaction-scoped, so it cannot leak. |
| `update` | `lockRfq` (scope) → version check → `isEditableRfqStatus` → re-validate changed `contactId`/`opportunityId` **in the tx** → `UPDATE … WHERE id AND version` with `version = version + 1`; empty `returning()` → `RfqConflictError` → audit. |
| `addLine` | `lockRfq` → rfq version check → `SELECT max(line_no) … FOR UPDATE` → insert with `line_no = max + 1` → bump rfq version → audit. `UNIQUE (market_id, rfq_id, line_no)` arbitrates races. |
| `reviseLineRequirements` | `lockRfq` → `lockLine` → line version check → insert revision `revision_no = requirements_revision_no + 1` → `UPDATE rfq_lines` current values + `requirements_revision_no` (originals untouched; trigger enforces) → bump rfq version → audit. `UNIQUE (market_id, rfq_line_id, revision_no)` serialises concurrent revisions. |
| transitions | `lockRfq` → version check → `canTransitionRfq` else `RfqTransitionError`; for `QUOTED` load lines + confirmed-offer counts **in the tx** then `assertQuotable` → update → audit. |
| `close` / `cancel` | `lockRfq` → version check → `canTransitionRfq` → set `status`, `closed_at`, `close_outcome`, `close_reason` → audit; DB metadata CHECKs are the backstop. |
| `reassign` | `assertOwnerAssignment(new owner/team)` → `lockRfq` → version check → not terminal → update `owner_id` / `team_id` → audit. **No customer or contact row is touched** (D6). |
| `createOffer` | `lockRfq` → `lockLine` → line version check → validate specification is in-market and product `ACTIVE` → `allocateAlternativeCode` under `FOR UPDATE` → insert `status='DRAFT'`, `offered_snapshot='{}'` → audit. |
| `confirmOffer` | `lockRfq` → `lockLine` → `lockOffer` → offer version check → `canTransitionRfqOffer` → `loadApprovedRevisionForOffer` **through the transaction** (must be `APPROVED`, else `RfqOfferNotConfirmableError`) → `buildRfqOfferSnapshot({ …, capturedAt })` → update snapshot + `specification_version_id` + `CONFIRMED` + `confirmed_at/by` → audit. A concurrent `publishRevision` either commits first or blocks, so the snapshot can never be half-written; the trigger then freezes it. |
| `withdrawOffer` | `lockRfq` → `lockOffer` → version check → `canTransitionRfqOffer` → set `status`, `withdrawn_at`, `withdraw_reason` → audit. |

Reads are single non-transactional statements under `scopeCondition`, so an out-of-scope RFQ is
invisible (404), never merely unreadable (403).

## 8. Audit events

`resourceType: 'rfq'`, `resourceId` = `rfqs.id` for every event (one query returns the whole
aggregate's trail), `resourceVersion` = post-write `rfqs.version`, `requestId` =
`requestCorrelationId(request)`.

| Action | `reason` | `safeDiff` |
|---|---|---|
| `rfq.created` | — | `{ number, customerId, contactId, opportunityId, source, receivedAt, responseDueAt, destinationCountry, ownerId, teamId, lineCount }` |
| `rfq.updated` | — | `{ number, changedFields }` |
| `rfq.line_added` | — | `{ number, lineNo, productId, hasFreeText, quantity, unit }` |
| `rfq.line_requirements_revised` | input | `{ number, lineNo, revisionNo, previousRevisionNo, changedFields }` |
| `rfq.transitioned` | input | `{ number, from, to }` |
| `rfq.closed` | input | `{ number, from, outcome, lineCount, confirmedOfferCount }` |
| `rfq.cancelled` | input | `{ number, from }` |
| `rfq.owner_reassigned` | input | `{ number, formerOwnerId, newOwnerId, formerTeamId, newTeamId }` |
| `rfq.offer_created` | — | `{ number, lineNo, alternativeCode, specificationId, specificationCode, productId }` |
| `rfq.offer_updated` | — | `{ number, lineNo, alternativeCode, changedFields }` |
| `rfq.offer_confirmed` | `mappingNote` | `{ number, lineNo, alternativeCode, specificationId, specificationVersionId, revisionNo, snapshotVersion, requirementsRevisionNoAtCapture, capturedAt }` |
| `rfq.offer_withdrawn` | input | `{ number, lineNo, alternativeCode, previousStatus }` |

`safeDiff` never contains free-text buyer requirement bodies, target prices, `files.storage_key` or
the full `offered_snapshot` — only identifiers, codes and changed-field **names**.

## 9. Grants activation

| Role | Actions | Scope | Notes |
|---|---|---|---|
| `admin` | `create`, `read`, `update`, `transition`, `close`, `reassign`, `offer` | `ALL` | full field sets |
| `manager` | same 7 | `ALL` | D10 |
| `sale` | `create`, `read`, `update`, `transition`, `close`, `offer` | `OWN` | create write fields exclude `ownerId` → a sale cannot create for someone else; **no `reassign`** |
| `accountant` | — | — | no grant, default deny (D8) |

`scripts/access-control.ts`: import the three grant constants, add `grantRfqs()` cloning
`grantPriceLists()` (`:721+`) — same `ON CONFLICT (role_code, resource, action, record_scope) DO
UPDATE … WHERE … IS DISTINCT FROM` upsert and an `access.rfq_grants_activated` audit row with
`safeDiff: { grantBoundary: 'M09_RFQS_APPROVED' }` — then register `grant-rfqs` in the dispatcher
(`:805`) and the usage string (`:809`).
Run: `npm run access:operator -- grant-rfqs --actor-email <admin>`.

## 10. OpenAPI

`src/modules/api-docs/openapi.ts`: new `rfqPaths` const after `priceListPaths`, spread into `paths`,
`{ name: 'RFQs' }` added to `tags`, `info.description` updated, and new `components.schemas`:
`Rfq`, `RfqLine`, `RfqLineOffer` (`offeredSnapshot` → `schemaRef('SpecificationSnapshot')`, reusing
the existing M07 schema), `RfqLineRequirementRevision`, `RfqRequestOfferComparison`,
`RfqAttachment` (**no `storageKey`**, `additionalProperties: false`), plus the request schemas via
`fromZod`. Enums imported from `@/modules/rfqs/domain/rfq-lifecycle`. Every description begins
``Requires `rfqs:<action>` ``. **`src/modules/api-docs/openapi.test.ts` hard-codes an expected
operation list and must be updated in the same change.**

## 11. UI — `src/modules/rfqs/presentation`

Replace the dummy page: `src/app/[locale]/(workspace)/rfqs/page.tsx` becomes the thin server entry
(`await params` → `currentPrincipal()` → `<RfqWorkspace locale roles />`, like
`products/page.tsx`), and `src/app/[locale]/(workspace)/rfqs/[id]/page.tsx` is added copying
`products/[id]/page.tsx` (`notFound()` on a non-positive-integer id). `/rfqs` is already labelled in
the shell nav (`src/components/layout/workspace-shell.tsx:30`).

| File | Copies / content |
|---|---|
| `record-picker.tsx` | Generic debounced typeahead extracted from `specification-workspace.tsx:156-189` (250 ms + `AbortController`), `role="listbox"`/`role="option"`, loading/empty rows ≥48px. Instantiated for buyer (`/api/v1/customers`), contact (`/api/v1/contacts?customerId=`, disabled until a buyer is picked), product (`/api/v1/products?status=ACTIVE`) and specification (`/api/v1/specifications?productId=&status=APPROVED`). **No internal numeric IDs are ever typed** (AGENTS §6). |
| `rfq-workspace.tsx` | `products/presentation/product-workspace.tsx` + the real market loader from `customer-workspace.tsx:43-67` (`GET /api/v1/me/markets`) — **not** the dummy `useMarket()`. Filters (search, status, `dueState`, "incomplete only"); columns Number / Buyer / Contact / Source / Received / Due / Status / Lines / Alternatives with due-soon + overdue badges and an incomplete-spec flag; loading / error / 403 / empty states; cursor "Load more". |
| `rfq-create-drawer.tsx` | `products/presentation/product-create-drawer.tsx` shell: `createPortal`, `role="dialog"`, `aria-modal`, expand/collapse, focus trap + restore, Escape + overlay close, body-scroll lock, inline dirty-discard footer (never `window.confirm`), sticky footer ≥40px targets, `csrfToken()`. Sections: Buyer & contact · Request details · Requested lines (repeatable). Inline 409/422 handling. On 201 → `router.push(\`/${locale}/rfqs/${id}\`)` (AGENTS §6). |
| `rfq-detail.tsx` | `specification-detail.tsx`. Header (number, status pill, due countdown, owner, buyer/contact links), lifecycle action bar gated per grant and per `canTransitionRfq` with explanatory disabled states, 422 `lineNumbers` rendered inline. Tabs: Lines · Comparison · Requirement history · Attachments. |
| `rfq-line-comparison.tsx` | Two columns: **Original Request** (frozen `original_*`, labelled "as received, immutable") vs **Alternatives** (one card per code A, B, … showing `offeredSnapshot` and a `differences` list highlighting each deviation). Withdrawn alternatives are struck through, never hidden. States "pricing is produced in M10". |
| `rfq-offer-drawer.tsx` | Same drawer shell: product → specification (APPROVED only) → revision → mapping note; create (DRAFT) then confirm, with an explicit "confirming freezes this revision and cannot be edited" warning. |
| `rfq-attachments-panel.tsx` | Read-only table of CLEAN files (name, media type, size, sha256 prefix, attached at). No download link, no upload control; empty state explains that upload arrives with the approved storage adapter. |

Client `fetch` with `{ 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() }`; bilingual
strings via the existing `const vi = locale === 'vi'` inline pattern;
`src/constants/messages/{en,vi}.json` only if shell chrome needs a new key.
The `impeccable` skill is **not** pre-approved — request approval before applying it to these forms.

## 12. Verification

```
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run db:validate-migrations
npm run db:migrate
npm run build
npm run test:e2e
npm run format:check
npm run access:operator -- grant-rfqs --actor-email <admin-email>
```

**Unit** — `domain/rfq-lifecycle.test.ts` (transition tables both ways, terminal states,
`assertQuotable`), `domain/rfq-numbering.test.ts` (format round-trip, zero-padding, year rollover,
malformed numbers ignored), `domain/rfq-offer-snapshot.test.ts` (purity + deep freeze, DRAFT
revision rejected, mutating the source afterwards does not change the snapshot,
`compareRequestToOffer` returns only differing fields), `application/contracts.test.ts` (deadline
refine, all-or-nothing pairs, neither-product-nor-free-text rejected, `.strict()`, reason ≥10,
tampered cursor), `application/rfq-service.test.ts` with a stubbed repository (exact
`('rfqs', action)` pair per method, field-allowlist denial before any repository call, OWN-scope
owner guard, strict nested projection).

**Integration** — `infrastructure/rfq-repository.integration.test.ts`, throwaway schema
`rfqs_it_<8 hex>` with the regex guard, baseline + migrations `0003`–`0006`, lazy
`await import` of the repository after `DATABASE_URL` is rewritten (harness copied from
`specification-repository.integration.test.ts:1-116`), two markets to prove isolation. Covers:
create with mirrored originals + `record_links` + audit; concurrent creates produce distinct
sequential numbers; direct `UPDATE` of `original_*` raises `55000`; revisions append 1 then 2 while
originals stay byte-identical; `UPDATE`/`DELETE` on the revision table raise `55000`; confirm
freezes the snapshot and a later revision approval does not change it; updating or deleting a
confirmed offer raises `55000`; two independent alternatives A and B coexist with no code collision
under concurrency; confirming a DRAFT revision throws; `markQuoted` blocked then allowed;
concurrent `submitForReview` → one 409; `scope: 'OWN'` hides another owner's RFQ from list/get/update
(404); cross-market customer and wrong-customer contact rejected; reassign to a user without active
market membership rejected and a successful reassign leaves `customers.owner_id` untouched;
reassigning the *customer* leaves `rfqs.owner_id` untouched; `listAttachments` returns only CLEAN
rows and no `storageKey` key; a forced audit failure (temporary rejecting trigger on `audit_events`)
leaves no `rfqs` row — the audit-rollback guarantee; close without reason/outcome rejected.

**Migration validation** — extend `scripts/validate-migrations.ts` to read `0006_rfqs.sql` /
`.down.sql`, apply it after `0005`, assert the four new triggers exist, assert `0` FOREIGN KEY
constraints on the two new tables, probe each `55000` path and each metadata CHECK, then apply the
down migration and assert the new tables, triggers and `rfqs.created_by` are gone.

**E2E / HTTP authorization** — `e2e/rfqs.spec.ts` on the `e2e/product-specifications.spec.ts`
template: anonymous `GET /api/v1/rfqs?market=…`, `GET /api/v1/rfqs/1` and `POST /api/v1/rfqs` → 401
and `/en/rfqs` redirects to `/en/login`; an authenticated `POST` without `x-csrf-token` → 403; an
authenticated admin list → 200 with `data.items` an array; a sale cannot read another owner's RFQ
(404, not 403); search/filter/pagination leak nothing.

**Browser verification** — sign in through the UI with `ADMIN_ROLE_USER` / `ADMIN_ROLE_PASS` from
`.env` (never printed, logged or committed), create a clearly synthetic prospect + RFQ with
free-text only, map two alternatives, confirm the original stays unchanged, then clean up.

**`/goal`** — check availability; if unavailable, report the limitation and walk the acceptance
criteria manually.

Expected result: the acceptance criteria for RFQ capture, preservation, mapping, alternatives,
authorization, concurrency and audit all PASS. **AC-20 (RFQ → Quotation end-to-end) BLOCKED** — M10
does not exist, so traceability is verified only at the M09 boundary (`rfq_line_offers` identity +
immutable `specification_version_id` + frozen snapshot).

## 13. Ordered subtasks (each independently verifiable)

1. `db/migrations/0006_rfqs.sql` + `.down.sql`.
2. Extend `scripts/validate-migrations.ts`; `npm run db:validate-migrations`; `npm run db:migrate` twice (idempotent).
3. Drizzle mappings in `schema.ts`; `npm run typecheck`.
4. `domain/` (lifecycle, numbering, grants, offer-snapshot) + three unit test files.
5. `application/contracts.ts` + `contracts.test.ts`.
6. `infrastructure/rfq-repository.ts`.
7. `application/rfq-service.ts` + `rfq-service.test.ts`.
8. `rfq-repository.integration.test.ts`; `npm run test:integration`.
9. `presentation/api.ts` + the route files; `npm run build`; manual 401 / CSRF-less 403 checks.
10. `grantRfqs` + `grant-rfqs` command; activate in dev; verify via `GET /api/v1/me/permissions`.
11. OpenAPI paths/schemas + `openapi.test.ts`; `/api-docs` renders the RFQs tag.
12. UI: `record-picker` → `rfq-create-drawer` → `rfq-workspace` → `rfq-detail` → `rfq-line-comparison` → `rfq-offer-drawer` → `rfq-attachments-panel` + the two page files; lint/build; browser verification.
13. `e2e/rfqs.spec.ts`; `npm run test:e2e`.
14. **STOP for the documentation approval gate**, then sync docs (§15).

## 14. Risks

| Risk | Mitigation |
|---|---|
| Snapshot built outside the transaction would let a concurrent revision approval corrupt a confirmation | `loadApprovedRevisionForOffer` reads through the transaction executor after locking the offer; integration test asserts a later approval does not change a stored snapshot |
| `rfq_line_offers` could duplicate M10's model | no pricing/currency/validity/approval fields; M10's approved `QuoteLine` DTO already carries `rfqLineId`, so it references rather than duplicates. Re-confirm at R1-09/R1-10 |
| G04 still formally open | D2 is recorded as the owner's resolution for RFQs only; other G04 modules untouched; divergence recorded in the Spec Update step |
| `docs/modules/rfqs.md:30` says Manager `TEAM` | D10 follows the newer `r1-decisions.md:99`; `scopeCondition` implements `TEAM` too, so reverting is a seed-only change |
| `created_by NOT NULL DEFAULT 0` backfill | dev `rfqs`/`rfq_lines` are empty (verified); `0` documented as "pre-migration row with no recorded actor", exactly as `price_lists.created_by` |
| Dev `rfqs.status` could hold out-of-enum values | migration `UPDATE`s non-conforming rows to `DRAFT` before adding the CHECK, as `0005` does for `price_lists.status` |
| No SQL foreign keys → orphan rows | every reference column indexed, existence validated in-transaction, one integration test per relationship |
| Advisory lock serialises RFQ creation per market | transaction-scoped, held for a few statements; acceptable at this company's scale and the only concurrency-safe option without a sequence table |
| No storage adapter → attachments list is always empty in R1 | explicit empty-state copy; no upload endpoint; `storage_key` never projected |
| `openapi.test.ts` hard-codes an operation list | updated in the same change as the paths |
| Added `rfqs`/`rfq_lines` columns diverge from the baseline file | `docs/structure/database.md` + ERD/dictionary updated in the Docs step |

## 15. Approval gates (AGENTS.md §2)

1. **Plan approval** — granted 2026-11-11.
2. **Documentation decision** — not answered. Targets: `docs/modules/rfqs.md` (status, confirmed
   lifecycle, entities, endpoints, Manager scope), `docs/modules/README.md` (M09 status),
   `docs/structure/database.md`, `docs/structure/backend.md` (G04 resolution note for RFQs).
3. **Implementation approval** — **NOT granted. No code written.**
4. Dev-log decision (`nimbalyst-local/wiki/develop-process.md`) and spec-update decision
   (`nimbalyst-local/wiki/spec-updating-v1.md`) after implementation.
