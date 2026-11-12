# R1-07 · M09 · RFQs — Implementation Plan

Tracker: `pln_mwc3wlise7obf2` (CCA.16) · Module: `docs/modules/rfqs.md` · Release R1 — Core CRM
Prerequisites verified: R1-03 Customers (implemented), R1-06 Product Specifications (implemented)

## 1. Context

M09 RFQs is the next vertical slice in the approved R1 delivery order (`docs/modules/README.md:41`:
Customers/Contacts → Products/Specs → **RFQs** → Quotations). Today `/rfqs` only renders a dummy
prototype screen (`src/app/[locale]/(workspace)/rfqs/page.tsx` → `R1RoutePage` over
`src/constants/dummy/rfqs.json`), so sales has no way to record an inbound buyer request.

The business need: capture a buyer's **original** request verbatim (free text, grade, size,
packaging, quantity, deadline) *before* anyone knows which SKU fits, then let sales map one or more
candidate SKUs/specification revisions onto it — without ever mutating what the buyer actually
asked for. Three concepts must stay distinguishable forever: Original Requested Specification,
Mapped Specification, Offered Specification.

Verified starting state:

- `rfqs` and `rfq_lines` **already exist** in `seafood_crm` (public schema) and in the R1 baseline
  `docs/structure/01_init_20261106.sql:467-507`. `rfqs.status` has **no CHECK** — the baseline
  comment (`:1760`) defers it to open gate **G04**.
- There is **no Drizzle mapping** for them in `src/modules/access-control/infrastructure/schema.ts`
  and **no `src/modules/rfqs` directory**.
- `record_links.rfq_id`, `files`, `file_attachments`, `idempotency_records` exist; no storage
  adapter and no code uses `idempotency_records`.
- Migration precedent for extending an applied baseline table: `db/migrations/0005_price_lists.sql`
  (ALTER TABLE … ADD COLUMN / ADD CONSTRAINT CHECK / CREATE INDEX / COMMENT ON COLUMN +
  `BEFORE UPDATE` immutability trigger raising `ERRCODE '55000'`), with a matching `.down.sql`.

Intended outcome: a working, authorized, audited RFQ module (list/create/detail/lines/mapping/
alternatives/assign/close) that provably satisfies AC-01..AC-19, with AC-20 (RFQ → Quotation
end-to-end) explicitly reported as BLOCKED because M10 does not exist.

## 2. Owner-approved decisions (this session)

| # | Decision |
|---|---|
| D1 | **New table `rfq_line_offers`** carries mapping + offer alternatives (identity per alternative, SKU, specification revision, offered snapshot). **No pricing/commercial fields** — M10 Quotations keeps those. |
| D2 | **Lifecycle:** `DRAFT → IN_REVIEW → QUOTED → CLOSED`, plus `CANCELLED` from any non-terminal state. Enforced by CHECK. `WON/LOST/NO_BID/EXPIRED` are a separate `close_outcome` column, not states. This resolves gate G04 for RFQs in favour of `DRAFT` (not `NEW`) and demotes `LOST` to an outcome. |
| D3 | **Original request preservation:** immutable `original_free_text_request` + `original_requirements` columns on `rfq_lines` (write-once, DB trigger, `55000`) **plus** append-only `rfq_line_requirement_revisions` history table. |
| D4 | **Attachments:** read-only listing of `scan_state = 'CLEAN'` files via `record_links(rfq_id)` + `file_attachments`. No upload endpoint, `files.storage_key` never leaves the server. |
| D5 | **Out of scope:** idempotency / inbound-intake dedup; `POST /rfqs/:id/quotations` (per `docs/structure/backend.md:153`, alternatives are created by `POST /quotations` + `rfqId` in M10). |
| D6 | **RFQ ownership is independent** of customer ownership: scope comes from `rfqs.owner_id` / team only. Customer handover does not reassign RFQs; transfer is explicit via `POST /rfqs/:id/assign` with reason + audit. |
| D7 | **Sales Owner validation:** target user must be `users.status = 'ACTIVE'`, hold an effective `user_market_memberships` row in the market, and their role must hold an active `role_grants` row for `rfqs:create` or `rfqs:edit`. No hard-coded role name. |
| D8 | **`target_price` / `currency` field policy:** in `readFields` for admin/manager (ALL/TEAM scope) and for sale (OWN scope only). Note: the `accountant` role is deliberately **not activated in R1** (`src/modules/product-specifications/domain/specification-grants.ts:1-6`), so no accountant grant is seeded. |
| D9 | **Deadline policy:** `response_due_at` stays nullable; when present it must be `> received_at`; `received_at` must not be in the future. ISO-8601 with offset accepted, stored as UTC `timestamptz`. DB CHECK added. No new timezone column. |

## 3. Scope

In scope: RFQ CRUD + lifecycle + assign/close, requested items (original buyer requirements +
revision history), SKU/specification-revision mapping as offer alternatives, read-only attachment
listing, scoped list/search/pagination, grants, audit, OpenAPI, UI workspace, tests.

Out of scope: quotations, pricing, price lists, sales orders, lead/opportunity requirement, file
upload/scanning, inbound email/web intake, idempotency, notifications, SLA/auto-expiry.

## 4. Database — `db/migrations/0006_rfqs.sql` (+ `.down.sql`)

Extends the applied baseline. **No SQL `FOREIGN KEY` / `REFERENCES`** anywhere; logical relations
are enforced in the application layer. Integer identity PKs. All timestamps `timestamptz` (UTC).

### 4.1 `rfqs` — ALTER

```sql
ALTER TABLE rfqs ADD COLUMN team_id INTEGER;
ALTER TABLE rfqs ADD COLUMN created_by INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rfqs ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE rfqs ADD COLUMN notes text;
ALTER TABLE rfqs ADD COLUMN port_of_destination text;
ALTER TABLE rfqs ADD COLUMN close_outcome text;
ALTER TABLE rfqs ADD COLUMN close_reason text;
ALTER TABLE rfqs ADD COLUMN closed_at timestamptz;
ALTER TABLE rfqs ADD COLUMN quoted_at timestamptz;

UPDATE rfqs SET status = 'DRAFT'
WHERE status NOT IN ('DRAFT','IN_REVIEW','QUOTED','CLOSED','CANCELLED');

ALTER TABLE rfqs ADD CONSTRAINT rfqs_status_check
  CHECK (status IN ('DRAFT','IN_REVIEW','QUOTED','CLOSED','CANCELLED'));
ALTER TABLE rfqs ADD CONSTRAINT rfqs_source_check
  CHECK (source IN ('EMAIL','PHONE','MEETING','WEBSITE','EXHIBITION','REFERRAL','OTHER'));
ALTER TABLE rfqs ADD CONSTRAINT rfqs_deadline_check
  CHECK (response_due_at IS NULL OR response_due_at > received_at);
ALTER TABLE rfqs ADD CONSTRAINT rfqs_close_outcome_check
  CHECK (close_outcome IS NULL OR close_outcome IN ('WON','LOST','NO_BID','EXPIRED'));
ALTER TABLE rfqs ADD CONSTRAINT rfqs_closed_metadata_check
  CHECK (status NOT IN ('CLOSED','CANCELLED')
         OR (closed_at IS NOT NULL AND close_outcome IS NOT NULL
             AND close_reason IS NOT NULL AND btrim(close_reason) <> ''));
ALTER TABLE rfqs ADD CONSTRAINT rfqs_destination_country_check
  CHECK (destination_country IS NULL OR destination_country ~ '^[A-Z]{2}$');
ALTER TABLE rfqs ADD CONSTRAINT rfqs_number_format_check
  CHECK (number ~ '^RFQ-[0-9]{4}-[0-9]{6}$');

CREATE INDEX rfqs_status_due_idx ON rfqs (market_id, status, response_due_at);
CREATE INDEX rfqs_team_page_idx  ON rfqs (market_id, team_id, created_at DESC, id);
```

(`rfqs_owner_page`, `rfqs_parent_page`, `idx_rfqs_owner_id`,
`idx_rfqs_market_id_customer_id_contact_id` already exist in the baseline — do not recreate.)

### 4.2 `rfq_lines` — ALTER (original-request immutability, D3)

```sql
ALTER TABLE rfq_lines ADD COLUMN original_free_text_request text;
ALTER TABLE rfq_lines ADD COLUMN original_requirements jsonb NOT NULL DEFAULT '{}';
ALTER TABLE rfq_lines ADD COLUMN original_quantity numeric;
ALTER TABLE rfq_lines ADD COLUMN original_unit text;
ALTER TABLE rfq_lines ADD COLUMN requirement_revision_no integer NOT NULL DEFAULT 1;
ALTER TABLE rfq_lines ADD COLUMN created_by INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rfq_lines ALTER COLUMN created_by DROP DEFAULT;

UPDATE rfq_lines SET original_free_text_request = free_text_request,
                     original_requirements      = requirements,
                     original_quantity          = quantity,
                     original_unit              = unit;

ALTER TABLE rfq_lines ADD CONSTRAINT rfq_lines_original_present_check
  CHECK (nullif(btrim(original_free_text_request),'') IS NOT NULL
         OR original_requirements <> '{}'::jsonb);
ALTER TABLE rfq_lines ADD CONSTRAINT rfq_lines_requirement_revision_check
  CHECK (requirement_revision_no > 0);
ALTER TABLE rfq_lines ADD CONSTRAINT rfq_lines_unit_check
  CHECK (unit IS NULL OR unit IN ('KG','MT','CTN','PCS','LB'));
ALTER TABLE rfq_lines ADD CONSTRAINT rfq_lines_currency_check
  CHECK (currency IS NULL OR currency IN ('USD','VND'));

CREATE OR REPLACE FUNCTION reject_rfq_line_original_change() RETURNS trigger AS $$
BEGIN
  IF ROW(NEW.original_free_text_request, NEW.original_requirements,
         NEW.original_quantity, NEW.original_unit, NEW.rfq_id, NEW.market_id, NEW.line_no)
     IS DISTINCT FROM
     ROW(OLD.original_free_text_request, OLD.original_requirements,
         OLD.original_quantity, OLD.original_unit, OLD.rfq_id, OLD.market_id, OLD.line_no)
  THEN
    RAISE EXCEPTION 'The original buyer request on an RFQ line is immutable'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rfq_lines_original_immutable
  BEFORE UPDATE ON rfq_lines
  FOR EACH ROW EXECUTE FUNCTION reject_rfq_line_original_change();
```

### 4.3 `rfq_line_requirement_revisions` — CREATE (append-only history)

```sql
CREATE TABLE rfq_line_requirement_revisions (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  market_id INTEGER NOT NULL,
  rfq_id INTEGER NOT NULL,
  rfq_line_id INTEGER NOT NULL,
  revision_no integer NOT NULL CHECK (revision_no > 0),
  free_text_request text,
  requirements jsonb NOT NULL DEFAULT '{}',
  quantity numeric CHECK (quantity > 0),
  unit text,
  source text NOT NULL CHECK (source IN ('ORIGINAL','BUYER_UPDATE','SALES_CLARIFICATION')),
  reason text,
  changed_by INTEGER NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (market_id, rfq_line_id, revision_no),
  CHECK (revision_no = 1 OR (reason IS NOT NULL AND btrim(reason) <> '')),
  CHECK ((quantity IS NULL) = (unit IS NULL))
);
CREATE INDEX rfq_line_requirement_revisions_line_idx
  ON rfq_line_requirement_revisions (market_id, rfq_line_id, revision_no);
```

Append-only enforced the same way as `audit_events` (migration `0002`): `BEFORE UPDATE OR DELETE`
trigger raising `ERRCODE '55000'`.

### 4.4 `rfq_line_offers` — CREATE (mapping + offer alternatives, D1)

```sql
CREATE TABLE rfq_line_offers (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  market_id INTEGER NOT NULL,
  rfq_id INTEGER NOT NULL,
  rfq_line_id INTEGER NOT NULL,
  alternative_code text NOT NULL CHECK (alternative_code ~ '^[A-Z]{1,2}$'),
  product_id INTEGER NOT NULL,
  specification_id INTEGER,
  specification_version_id INTEGER,
  offered_snapshot jsonb,
  status text NOT NULL CHECK (status IN ('DRAFT','CONFIRMED','WITHDRAWN')),
  notes text,
  created_by INTEGER NOT NULL,
  confirmed_by INTEGER,
  confirmed_at timestamptz,
  withdrawn_at timestamptz,
  withdraw_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (market_id, rfq_line_id, alternative_code),
  UNIQUE (market_id, rfq_id, id),
  CHECK (status <> 'CONFIRMED'
         OR (specification_version_id IS NOT NULL AND offered_snapshot IS NOT NULL
             AND confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL)),
  CHECK (status <> 'WITHDRAWN'
         OR (withdrawn_at IS NOT NULL AND withdraw_reason IS NOT NULL
             AND btrim(withdraw_reason) <> ''))
);
CREATE INDEX rfq_line_offers_line_idx    ON rfq_line_offers (market_id, rfq_line_id, status);
CREATE INDEX rfq_line_offers_rfq_idx     ON rfq_line_offers (market_id, rfq_id, status);
CREATE INDEX rfq_line_offers_product_idx ON rfq_line_offers (market_id, product_id);
CREATE INDEX rfq_line_offers_spec_idx    ON rfq_line_offers (market_id, specification_version_id);
```

Plus a `BEFORE UPDATE` trigger (`reject_rfq_line_offer_change_after_confirm`, `ERRCODE '55000'`)
freezing `product_id`, `specification_id`, `specification_version_id` and `offered_snapshot` once
`status = 'CONFIRMED'` — this is what makes AC-11 hold when the product/spec later changes.
`offered_snapshot` is produced by the existing
`buildOfferSnapshot` / `buildSpecificationSnapshot` in
`src/modules/product-specifications/domain/specification-snapshot.ts` (reuse, do not reimplement);
it already refuses non-APPROVED revisions with `ProductNotEligibleError`.

`COMMENT ON TABLE/COLUMN` for every new object; `docs/structure/database.md` updated in the Docs
step. `.down.sql` drops triggers/functions/tables and the added columns/constraints/indexes in
reverse order.

### 4.5 Drizzle mapping

Append `rfqs`, `rfqLines`, `rfqLineRequirementRevisions`, `rfqLineOffers` to
`src/modules/access-control/infrastructure/schema.ts` using the existing conventions: `identity()`
helper, snake_case SQL names, `timestamp(..., { withTimezone: true })`, `version` last, indexes in
the array-returning third argument, no `references()`.

## 5. Module — `src/modules/rfqs`

Layering copies `src/modules/product-specifications` exactly (`application/` · `domain/` ·
`infrastructure/` · `presentation/`), repository injected through a defaulted constructor
parameter, `import 'server-only'` at the top of services/repositories.

### `domain/rfq-lifecycle.ts`
`rfqStatuses`, `rfqCloseOutcomes`, `rfqSources`, `rfqTransitions` table, `canTransitionRfq`,
`isEditableRfqStatus` (DRAFT | IN_REVIEW), `quoteReadyRequiredFields` +
`missingQuoteReadyFields(rfq, lines)` and `assertQuotable()` → `RfqNotQuotableError`
(mirrors `specification-lifecycle.ts`'s `approvalRequiredFields` / `assertApprovable`).

### `domain/rfq-grants.ts`
`rfqReadFields`, `rfqWriteFields`, `rfqCreateWriteFields`, `rfqLineReadFields`,
`rfqLineWriteFields`, `rfqOfferReadFields`, `rfqOfferWriteFields`, `rfqAdminGrants`,
`rfqManagerGrants`, `rfqSaleGrants` — shape per
`src/modules/product-specifications/domain/specification-grants.ts`.

Grant matrix (`docs/business/permissions.md:83`):

| role | resource:action | scope |
|---|---|---|
| admin | `rfqs:create/read/edit/assign/close` | ALL |
| manager | `rfqs:create/read/edit/assign/close` | TEAM |
| sale | `rfqs:create/read/edit` | OWN |
| accountant | — | not activated in R1 (D8) |

### `application/contracts.ts`
`rfqMarketCodeSchema`, `createRfqSchema`, `updateRfqSchema`, `transitionRfqSchema`,
`assignRfqSchema` (`{ version, ownerId, teamId?, reason }`), `closeRfqSchema`
(`{ version, outcome, reason }`), `createRfqLineSchema`, `updateRfqLineSchema`,
`reviseRfqLineRequirementsSchema` (`{ version, reason, ... }`), `createRfqOfferSchema`,
`updateRfqOfferSchema`, `confirmRfqOfferSchema`, `withdrawRfqOfferSchema`,
`rfqListQuerySchema`, `rfqLineListQuerySchema`, cursor codec `encodeRfqCursor/decodeRfqCursor`.
All `.strict()`; patch schemas use the `.refine(keys > 1)` pattern; decimals as strings with the
existing `/^-?\d{1,18}(?:\.\d{1,6})?$/` guard; `version: positiveId` required on every mutation.
Deadlines: `z.string().datetime({ offset: true })` → `new Date()`, with the D9 cross-field
`.refine`.

### `application/rfq-service.ts`
`class RfqService` — methods, all following *parse → requireGrant → allowedFields → repository →
project*:

`list`, `get`, `create`, `update`, `transition`, `assign`, `close`,
`listLines`, `createLine`, `updateLine`, `reviseLineRequirements`, `listLineRequirementRevisions`,
`listOffers`, `createOffer`, `updateOffer`, `confirmOffer`, `withdrawOffer`,
`listAttachments`, `resolveMarketId`.

Signature shape: `(actor: Principal, grants: EffectiveGrant[], marketId: number, id?, childId?, raw: unknown, requestId: string)`.
Local `allowedFields` + `projectRfq` / `projectRfqLine` / `projectRfqOffer` whitelists, with
`targetPrice` / `currency` riding on their own read-field grant (D8).

### `infrastructure/rfq-repository.ts`
`class RfqRepository` with `resolveMarketId`, `assertMarketAccess`, and a `scopeCondition(scope,
actor)` copied from `src/modules/customers/infrastructure/customer-repository.ts:57-63` but over
`rfqs.ownerId` / `rfqs.teamId` (fails closed to `sql\`false\``). Child reads re-derive scope by
joining the parent RFQ — never trust a child id alone (AC-14).

Helpers:
- `assertOwnerAssignment(executor, marketId, ownerId, teamId)` — D7; modelled on
  `customer-repository.ts:771-807` plus an `EXISTS` over `user_roles` ⋈ `role_grants` for
  `resource='rfqs' AND action IN ('create','edit') AND active`. Errors
  `RFQ_OWNER_NOT_ELIGIBLE`, `RFQ_TEAM_ASSIGNMENT_INVALID`.
- `requireEligibleCustomer(executor, marketId, customerId, scope, actor)` — same market, status
  `<> 'ARCHIVED'`, **and** passing the customer's own `scopeCondition` (stronger than M07's
  `requireEligibleCustomer`, per `docs/modules/rfqs.md:25`).
- `requireEligibleContact` — contact belongs to that customer and market.
- `requireEligibleProduct(executor, productId)` — `status = 'ACTIVE'`; reuse
  `ProductNotEligibleError` semantics (AC-12).
- `requireApprovedRevision(executor, marketId, specificationId, revisionNo)` → the
  `specification_versions` row with `status='APPROVED'`, then `buildOfferSnapshot(...)`.
- `allocateNumber(transaction, marketId)` — `pg_advisory_xact_lock(hashtext('rfq'), marketId)`
  then `MAX` suffix for the current year → `RFQ-YYYY-NNNNNN`; `UNIQUE (market_id, number)` is the
  backstop, bounded retry on `23505` → `RfqNumberAllocationError`. (Satisfies
  `docs/structure/backend.md:459` "concurrency-safe, never `MAX(number)+1`".)

Errors: `RfqNotFoundError`, `RfqConflictError`, `RfqLineNotFoundError`, `RfqOfferNotFoundError`,
`RfqImmutableError`, `RfqNotQuotableError`, `RfqNumberAllocationError`,
`RfqOwnerNotEligibleError`, `RfqCustomerNotEligibleError`, `RfqContactNotEligibleError`.

Concurrency: `version` + `.for('update')` three-step protocol exactly as
`product-repository.ts:181-205`. Lock order **RFQ → line → offer** (parent first), matching
`docs/structure/backend.md:550`.

Audit: `private async audit(transaction, {...})` as the **last statement inside the business
transaction** (`specification-repository.ts:1024-1053` pattern), so a failing audit insert rolls
the business change back (AC-17). Actions:

| action | `resourceType` | `safeDiff` |
|---|---|---|
| `rfq.created` | `rfq` | `{ number, customerId, ownerId, source, status }` |
| `rfq.updated` | `rfq` | `{ changedFields }` |
| `rfq.status_changed` | `rfq` | `{ fromStatus, toStatus }` |
| `rfq.reassigned` | `rfq` | `{ formerOwnerId, newOwnerId, formerTeamId, newTeamId }` + `reason` |
| `rfq.closed` | `rfq` | `{ outcome }` + `reason` |
| `rfq.line_created` | `rfq_line` | `{ lineNo, mapped: boolean }` |
| `rfq.line_updated` | `rfq_line` | `{ lineNo, changedFields }` |
| `rfq.line_requirements_revised` | `rfq_line` | `{ lineNo, revisionNo, changedFields }` + `reason` |
| `rfq.offer_created` | `rfq_line_offer` | `{ lineNo, alternativeCode, productId }` |
| `rfq.offer_confirmed` | `rfq_line_offer` | `{ alternativeCode, specificationId, revisionNo }` |
| `rfq.offer_withdrawn` | `rfq_line_offer` | `{ alternativeCode }` + `reason` |

### `presentation/api.ts`
`protectedAction` gate copied from
`src/modules/product-specifications/presentation/api.ts:151-183`
(`requirePermission('rfqs', action)` → `requireCsrf` on mutations → `rfqMarketCodeSchema` on
`?market=` → `resolveMarketId` → `Response.json({ data }, { headers: { 'Cache-Control':
'private, no-store' } })`), plus `responseFor` mapping the errors above onto the existing code
table (`VALIDATION_FAILED` 400, `UNAUTHENTICATED` 401, `ACTION_FORBIDDEN` 403, `NOT_FOUND` 404,
`VERSION_CONFLICT` 409, `BUSINESS_RULE_VIOLATION` 409, `IMMUTABLE_RFQ_REQUEST` 409 (also SQLSTATE
`55000`), `CONFLICT` 409, `QUOTE_READY_FIELDS_MISSING` 422). Exported handlers: `listRfqs`,
`createRfq`, `getRfq`, `updateRfq`, `transitionRfq`, `assignRfq`, `closeRfq`, `listRfqLines`,
`createRfqLine`, `updateRfqLine`, `reviseRfqLineRequirements`, `listRfqLineRequirementRevisions`,
`listRfqLineOffers`, `createRfqLineOffer`, `updateRfqLineOffer`, `confirmRfqLineOffer`,
`withdrawRfqLineOffer`, `listRfqAttachments`.

## 6. API routes (thin delegations under `src/app/api/v1/rfqs/**`)

| Method | Path | Grant |
|---|---|---|
| GET / POST | `/api/v1/rfqs` | `rfqs:read` / `rfqs:create` |
| GET / PATCH | `/api/v1/rfqs/{id}` | `rfqs:read` / `rfqs:edit` |
| POST | `/api/v1/rfqs/{id}/transition` | `rfqs:edit` |
| POST | `/api/v1/rfqs/{id}/assign` | `rfqs:assign` |
| POST | `/api/v1/rfqs/{id}/close` | `rfqs:close` |
| GET / POST | `/api/v1/rfqs/{id}/lines` | `rfqs:read` / `rfqs:edit` |
| PATCH | `/api/v1/rfqs/{id}/lines/{lineId}` | `rfqs:edit` |
| POST | `/api/v1/rfqs/{id}/lines/{lineId}/requirement-revisions` | `rfqs:edit` |
| GET | `/api/v1/rfqs/{id}/lines/{lineId}/requirement-revisions` | `rfqs:read` |
| GET / POST | `/api/v1/rfqs/{id}/lines/{lineId}/offers` | `rfqs:read` / `rfqs:edit` |
| PATCH | `/api/v1/rfqs/{id}/lines/{lineId}/offers/{offerId}` | `rfqs:edit` |
| POST | `.../offers/{offerId}/confirm` · `.../offers/{offerId}/withdraw` | `rfqs:edit` |
| GET | `/api/v1/rfqs/{id}/attachments` | `rfqs:read` |

Route files are 3–9 line delegations with `await context.params` (Next 16 style, see
`src/app/api/v1/specifications/[id]/revisions/[revisionNo]/publish/route.ts`). All require
`?market=`. Lists are keyset-paginated (`base64url({ createdAt, id })`, `desc(createdAt), desc(id)`,
`limit + 1`) with filters `q`, `status`, `ownerId`, `customerId`, `dueBefore`, `receivedFrom/To`.

## 7. Grants activation

- `src/modules/rfqs/domain/rfq-grants.ts` holds the field lists + admin set.
- `scripts/access-control.ts`: add `rfqGrantPolicy` (role × action × scope × read × write, per the
  matrix above) and `grantRfqs()` copying `grantCustomers()` (`:326-390`) — same
  `ON CONFLICT (role_code, resource, action, record_scope) DO UPDATE … WHERE … IS DISTINCT FROM`
  upsert and the `access.rfq_grants_activated` audit row with
  `safeDiff: { grantBoundary: 'M09_RFQS_APPROVED' }`. Register `grant-rfqs` in the command
  dispatch and usage string (`:801-810`).

## 8. OpenAPI

`src/modules/api-docs/openapi.ts`: import the rfq contracts, add a `{ name: 'RFQs' }` tag, the
`/api/v1/rfqs*` path keys with `operationId`s matching the presentation function names, and
`components.schemas` `CreateRfqRequest`, `UpdateRfqRequest`, `TransitionRfqRequest`,
`AssignRfqRequest`, `CloseRfqRequest`, `CreateRfqLineRequest`, `UpdateRfqLineRequest`,
`ReviseRfqLineRequirementsRequest`, `CreateRfqOfferRequest`, `ConfirmRfqOfferRequest`,
`WithdrawRfqOfferRequest`, `Rfq`, `RfqLine`, `RfqLineRequirementRevision`, `RfqLineOffer`,
`RfqAttachment` (via the existing `fromZod` / `dataEnvelope` / `commonErrors` helpers). Every
description begins `Requires \`rfqs:<action>\``. `src/modules/api-docs/openapi.test.ts` is
extended.

## 9. UI — `src/modules/rfqs/presentation`

Replace the dummy page: `src/app/[locale]/(workspace)/rfqs/page.tsx` becomes the thin server
entry (`await params` → `currentPrincipal()` → `<RfqWorkspace locale roles />`), and
`src/app/[locale]/(workspace)/rfqs/[id]/page.tsx` is added for the detail route (same shape as
`customers/[id]/page.tsx`, with the `Number.isInteger` → `notFound()` guard). `/rfqs` is already
in the shell nav (`src/components/layout/workspace-shell.tsx:30`).

| File | Copies |
|---|---|
| `rfq-workspace.tsx` | `products/presentation/product-workspace.tsx` + the real market loader from `customers/presentation/customer-workspace.tsx:43-67` (`GET /api/v1/me/markets`) — **not** the dummy `useMarket()` |
| `rfq-create-drawer.tsx` | `products/presentation/product-create-drawer.tsx` (portal, `role="dialog"`, focus trap, Escape, expand/collapse, dirty-discard footer, `min-h-11` targets) — satisfies AGENTS.md §6 |
| `rfq-detail.tsx` | `product-specifications/presentation/specification-detail.tsx`; sections: Buyer request (original, read-only) · Requested items · Requirement history · Offer alternatives · Deadline · Attachments · Activity |
| `rfq-line-offer-panel.tsx` | Alternatives A/B side-by-side against the original, with explicit "differs from requested" markers (AC-10) |
| `entity-picker.tsx` (module-local) | the debounced typeahead in `specification-workspace.tsx:156-189` (250 ms + `AbortController`), used for Customer, Contact, Product and Specification-revision pickers — no numeric IDs typed by hand (AGENTS.md §6) |

Client `fetch('/api/v1/...')` with `{ 'Content-Type': 'application/json', 'x-csrf-token':
csrfToken() }`; bilingual strings via the existing `const vi = locale === 'vi'` inline pattern;
`src/constants/messages/{en,vi}.json` only if shell chrome needs a new key. Loading / empty /
error / 403 states handled per the existing workspaces.

## 10. Verification

Commands: `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`,
`npm run test:integration`, `npm run test:e2e`, `npm run db:validate-migrations`,
`npm run db:migrate`.

- **Unit** — `src/modules/rfqs/application/contracts.test.ts` (schemas, cursor, deadline refine),
  `domain/rfq-lifecycle.test.ts` (transition table, quote-ready fields),
  `application/rfq-service.test.ts` (grant denial per action, field-allowlist denial, OWN-scope
  owner guard) with a mocked repository.
- **Integration** (real Postgres, throwaway schema `rfqs_it_<8 hex>` with the regex guard, baseline
  `docs/structure/01_init_20261106.sql` + migration `0006`, lazy `await import` of the repository
  after `DATABASE_URL` is rewritten — pattern from
  `specification-repository.integration.test.ts:1-116`) —
  `src/modules/rfqs/infrastructure/rfq-repository.integration.test.ts`: AC-01..AC-12, AC-16..AC-19,
  including two markets to prove cross-market isolation, a `SAVEPOINT`-free forced audit failure to
  prove rollback (AC-17), and a direct `UPDATE` attempt on `original_*` to prove the `55000`
  trigger (AC-06/AC-07).
- **E2E / HTTP authorization** — `e2e/rfqs.spec.ts` on the `e2e/product-specifications.spec.ts`
  template: anonymous `GET /api/v1/rfqs?market=…` → 401 and UI redirect to `/en/login`; sale user
  cannot read another owner's RFQ (404, not 403); `?ownerId=` filter and search leak nothing
  (AC-13, AC-14, AC-19).
- **Browser verification** — sign in through the UI with `ADMIN_ROLE_USER` / `ADMIN_ROLE_PASS` from
  `.env` (never printed or committed), create a clearly synthetic prospect + RFQ with free-text only,
  then map two alternatives and confirm the original stays unchanged; clean up afterwards.
- `/goal` — check availability; if unavailable, report the limitation and walk AC-01..AC-20 manually.

Expected AC results: AC-01..AC-19 PASS. **AC-20 BLOCKED** — M10 Quotations does not exist, so
RFQ → Quotation traceability is only verified at the M09 boundary (`rfq_line_offers` identity +
immutable `specification_version_id` + snapshot), not end to end.

## 11. Ordered subtasks

1. Migration `0006_rfqs.sql` + `.down.sql`; `npm run db:validate-migrations`; apply to dev.
2. Drizzle tables in `schema.ts`.
3. `domain/rfq-lifecycle.ts` + `domain/rfq-grants.ts` + their unit tests.
4. `application/contracts.ts` + tests.
5. `infrastructure/rfq-repository.ts` — RFQ CRUD, number allocation, scope, owner validation, audit.
6. `application/rfq-service.ts` + tests; `presentation/api.ts`; RFQ route files.
7. Lines + requirement revisions (repository → service → API → routes).
8. Offers / alternatives incl. `buildOfferSnapshot` reuse and the confirm-freeze trigger path.
9. Attachments read-only listing.
10. `scripts/access-control.ts` → `grantRfqs` + `grant-rfqs` command; activate in dev.
11. OpenAPI additions + `openapi.test.ts`.
12. UI: workspace, create drawer, detail, offer panel, pickers; replace the dummy `/rfqs` page.
13. Integration tests, e2e test, lint/typecheck/build, browser verification.

## 12. Risks

| Risk | Mitigation |
|---|---|
| `rfq_line_offers` could duplicate M10's model | No pricing/currency/validity/approval fields; M10's approved `QuoteLine` DTO already carries `rfqLineId`, so it references rather than duplicates. Re-confirm at R1-08. |
| G04 still formally open | D2 is recorded as the owner's resolution for RFQs only; the Spec Update step records the divergence. Other G04 modules untouched. |
| `created_by NOT NULL DEFAULT 0` backfill on existing rows | Dev `rfqs`/`rfq_lines` are empty (verified); `0` documented in a column comment as "pre-migration row with no recorded actor", same as `price_lists.created_by`. |
| No storage adapter → attachments list is always empty in R1 | Documented; endpoint still proves the authorization path, `storage_key` never projected. |
| `accountant` grants intentionally absent | Matches the M06/M07 boundary; noted in `rfq-grants.ts` header comment. |
| Added `rfqs`/`rfq_lines` columns diverge from the baseline file | `docs/structure/database.md` + ERD/dictionary updated in the Docs step. |

## 13. Approval gates still pending (AGENTS.md §2)

1. **Plan approval** for this document.
2. **Documentation decision** — update `docs/modules/rfqs.md` (status, confirmed lifecycle,
   entities, endpoints), `docs/modules/README.md` (M09 status), `docs/structure/database.md` and
   `docs/structure/backend.md` (G04 note for RFQs).
3. **Implementation approval** (separate).
4. Dev-log decision (`nimbalyst-local/wiki/develop-process.md`) and spec-update decision
   (`nimbalyst-local/wiki/spec-updating-v1.md`) after implementation.
