# R1-10 · M10 · Quotations — Approval & Issue — Implementation Plan

**Release:** R1 — Core CRM · **Module:** `docs/modules/quotations.md` ·
**Business rules:** `docs/business/pricing-and-quotations.md` §§21-27
**Stated prerequisites:** R1-09 Quotations Draft & Calculate, R1-02 Audit Log

> **STATUS: PLAN ONLY, NO CODE.**
> Owner decision this session: stop at the dependency gate. This document is the approved design
> for R1-10.
>
> **UPDATE 2026-11-12 08:20 — R1-09 is being implemented right now in a parallel session.**
> §1.1 below recorded "R1-09 does not exist", which was true when verified at the start of this
> planning round. Within the same session, `src/modules/quotations/**`,
> `src/app/api/v1/quotations/**`, `src/app/api/v1/quotation-versions/**`,
> `db/migrations/0006_quotations.sql` and Drizzle mappings for `rfqs`, `rfqLines`, `quotations`,
> `quotationVersions`, `quotationLines`, `quotationAdjustments` all appeared, uncommitted, written
> by another session. **Read §1.3 before implementing anything — four items in §5 are now wrong.**

## 1. Context

R1-10 adds the commercial control layer on top of quotation drafting: lock a submitted version,
require an explicit Manager approval per version, record rejection and Sales withdrawal with
immutable reasons, let a rejected/withdrawn version be copied into a fresh draft revision, keep
alternatives isolated from each other's supersession, and guarantee that two conflicting decisions
can never both commit. This is what makes a quotation a legally meaningful offer rather than a
spreadsheet.

### 1.1 Verified state — why this is blocked

Checked directly against source, `db/migrations/`, `package.json`, the tracker files and the live
`seafood_crm` database:

| Prerequisite | Actual state |
|---|---|
| **R1-02 Audit Log** | **Implemented and committed.** `auditEvents` at `src/modules/access-control/infrastructure/schema.ts:189`; append-only trigger in `db/migrations/0002_audit_events_append_only.sql` (`ERRCODE '55000'`); writer/reader in `src/modules/access-control/infrastructure/audit-repository.ts`; redaction in `application/audit-safe-diff.ts`; admin read API at `src/app/api/v1/audit-events/route.ts`. **Satisfied.** |
| **R1-09 Quotations Draft & Calculate** | **DOES NOT EXIST.** No `src/modules/quotations`. No Drizzle mapping for `quotations`, `quotation_versions`, `quotation_lines`, `quotation_adjustments`, `quotation_decisions`, `rfq_acceptances`. No `/api/v1/quotations*` or `/api/v1/quotation-versions*` route. Migrations stop at `0005_price_lists`. Branch `task/R1-09` is clean — no uncommitted work. Tracker `pln_mwc3rbvujptd4k` is `done`, but that is the *plan document*, which states "No application code or specifications changed by this plan". |
| **R1-07 RFQs (M09)** | **DOES NOT EXIST.** `quotations.rfq_id` is `NOT NULL` and the approved lock order starts at the RFQ (`docs/structure/backend.md:550`). No `rfqs`/`rfq_lines` mapping, no module. |

The six quotation tables **are physically present** in `seafood_crm` — `scripts/migrate.ts:13,37-53`
applies `docs/structure/01_init_20261106.sql` as baseline `0000_r1_fresh_schema_20261106` with a
SHA-256 checksum guard. But no code path reads or writes them; R1-05's tests had to insert a
synthetic `quotation_lines` row directly.

So R1-10 has nothing to submit, lock, approve, supersede or issue. Per the task's own Constraint 1
and `docs/modules/README.md:41`'s delivery order, work pauses here.

### 1.3 Parallel R1-09 work — corrections to this plan (observed 2026-11-12 08:13–08:18)

Another session is building R1-09 on this branch. Files present and uncommitted:
`src/modules/quotations/{domain/quotation-calculation.ts(+test),application/contracts.ts,
application/quotation-service.ts,infrastructure/quotation-repository.ts,presentation/api.ts,
presentation/quotation-workspace.tsx}`; routes `quotations/route.ts`, `quotations/[id]/route.ts`,
`quotations/[id]/revisions/route.ts`, `quotation-versions/[id]/{route,calculate,readiness}.ts`,
`quotation-versions/[id]/lines/**`, `quotation-versions/[id]/adjustments/[kind]/route.ts`;
`db/migrations/0006_quotations.sql` (+ `.down.sql`); additions to
`src/modules/access-control/infrastructure/schema.ts` and `src/lib/decimal.ts`.

**Do not edit any of those files from an R1-10 session — parallel-write conflict risk.**

Concrete consequences for this plan:

| # | What changed | Effect on §5 |
|---|---|---|
| C1 | **Migration `0006` is taken.** | R1-10's migration becomes **`0007_quotations_approval.sql`**, not `00NN` chosen freely. |
| C2 | **`quotation_lines` and `quotation_adjustments` draft-only immutability already exists** — trigger `enforce_quotation_child_draft` on `BEFORE INSERT OR UPDATE OR DELETE`, raising `55000` when the parent version is not `DRAFT`, plus a reassignment guard. | **§5.3 is already done. Delete it from R1-10's migration** — do not add a second trigger on the same tables. |
| C3 | **`quotation_versions` already has a draft-only trigger** `quotation_versions_draft_only` / `enforce_quotation_version_draft`, which raises `55000` on any update where the stored state **or `NEW.state`** is not `'DRAFT'`, and forbids all deletes and identity changes. | **BLOCKER for every R1-10 transition.** `DRAFT → SUBMITTED` sets `NEW.state = 'SUBMITTED'` and would be rejected, as would approve, reject, withdraw and supersede. R1-10's migration must `CREATE OR REPLACE FUNCTION enforce_quotation_version_draft()` to allow exactly the §4 transitions while still freezing commercial columns once the state leaves `DRAFT` — **replacing** the R1-09 body, not adding a second trigger. Its identity guard and delete ban should be preserved. |
| C4 | **FX precision is enforced by CHECK, not column type** — `quotation_versions_fx_rate_check`: `vnd_per_usd > 0 AND scale(vnd_per_usd) <= 4 AND vnd_per_usd < 100000000000000`. | **Drop `ALTER COLUMN vnd_per_usd TYPE numeric(18,4)` from §5.2.** The approved precision is already enforced. Keep `vnd_per_usd_at_decision numeric(18,4)` on the decision row. |
| C5 | **Gate G06 was resolved by storing the exact unrounded total as a rational pair** — `quotation_versions.unrounded_usd_numerator` / `unrounded_usd_denominator` (text, digit-pattern CHECKed), alongside the existing `rounded_usd_total`. | The approval snapshot should capture **both** the rounded total and the exact rational pair, so add `unrounded_usd_numerator_at_decision` / `unrounded_usd_denominator_at_decision` to `quotation_decisions` in §5.1. Reproducing an approved total must not depend on re-deriving it. |
| C6 | **`quotation_lines` commercial columns were made nullable** so drafts may be incomplete (`product_id`, `specification_version_id`, `quantity`, `unit`, `input_currency`, `input_unit_price`, `original_line_amount`, `converted_usd_amount`, `product_snapshot`, `specification_snapshot`, `selected_by`, `selected_at`). | The database no longer guarantees completeness. `assertSubmittable` in §6 must check every one of those columns is non-null at submit time, and the integration suite must prove a half-filled line cannot be submitted. |
| C7 | **`quotationDecisions` is still NOT mapped** in `schema.ts`, and `rfq_acceptances` is not mapped either. | §5.4 stands unchanged: adding the `quotationDecisions` Drizzle mapping remains R1-10's job. |
| C8 | `rfqs` and `rfqLines` Drizzle mappings now exist, but there is still **no `src/modules/rfqs` module, no RFQ routes and no RFQ migration**. | The R1-07 gate is still open. R1-09's own task body states R1-07 is a hard prerequisite. |

Gate 0 is therefore partly clearing, but is not clear: R1-09 is uncommitted and unverified, and R1-07
remains absent. Re-verify both before starting §13.

### 1.2 Open gates that independently block parts of §2

From `docs/structure/backend.md:613-621`:

- **G08 (Missing)** — file size/type/scan, orphan cleanup, production storage, backup/restore.
  Blocks the entire PDF path. There is **no PDF library, no templating engine, no object-storage
  SDK and no Noto fonts** in `package.json` (deps are only: class-variance-authority, clsx,
  drizzle-orm, jose, lucide-react, next, postgres, react, react-dom, swagger-ui-dist,
  tailwind-merge, tw-animate-css, zod). `files` carries an explicit comment at
  `schema.ts:429-433`: *"No storage adapter exists yet … nothing in R1-06 writes to `files`."*
  `docs/business/r1-decisions.md:137` lists "PDF library (after template)" as **Open**.
- **G06 (Missing)** — decimal precision and representation of repeating per-line FX conversions,
  annotated onto `quotation_lines.converted_usd_amount` (`01_init:1834`). The approval record must
  capture a total, so this touches R1-10 — **but it is largely mitigated**: `src/lib/decimal.ts`
  already provides exact `Rational` arithmetic (`rational`, `addRational`, `multiplyRational`,
  `divideRational`, `rationalToExactDecimalString`, `roundRationalHalfEven`) alongside scaled-bigint
  `Decimal` with `roundHalfEven`. R1-10 consumes the already-persisted totals; it does not
  re-derive them.
- **G01 (Partially resolved)** — business-module grants are default-deny. `docs/structure/backend.md:146`
  records M10 as "grants Pending". R1-10 must seed a new `quotations.*` grant matrix.
- **G03 (Missing)** — mandatory approver/manager notification recipients. No `notifications` writer
  exists. R1-10 therefore does **not** implement notifications.

## 2. Owner-approved decisions (this session)

| # | Decision |
|---|---|
| **D1** | **Stop at the dependency gate.** Deliver this plan; write no application code. Report R1-10 as BLOCKED on R1-07 + R1-09. |
| **D2** | **PDF issuance is split into a separate task, gated on G08.** R1-10 covers submission locking, approve / reject / withdraw, copy-to-draft, revision isolation, supersession and concurrency. `issue`, `GET …/pdf` and acceptance are designed here but marked BLOCKED. |
| **D3** | **Self-approval** = approver id equals `quotation_versions.created_by` **OR** `quotations.owner_id`. When true, a comment of **≥ 10 characters after trimming** is mandatory; when false the comment is optional. This resolves the conflict between `docs/modules/quotations.md:12` (mandatory ≥10) and `docs/structure/backend.md` (`{comment?}`) at the service layer: the wire contract keeps `comment?` optional, the service rejects a blank/short comment when `self_approved`. |
| **D4** | **Migration scope: only what R1-10 uses.** Add the decision-record columns, tighten the FX rate precision, make `quotation_decisions` append-only, and add the conditional uniqueness that protects state consistency. **Defer** PDF language / SHA-256 / translation snapshot and the `rate_history` table to their own tasks. |
| **D5** | **Sales withdrawal is allowed only from `SUBMITTED`.** Not after `APPROVED`, not after `ISSUED` — changing approved terms requires a new Draft Revision. This matches the task's own concurrency example (approve vs withdraw on a SUBMITTED V1) and avoids inventing an unapproved authority. |
| **D6** | **Supersession happens when the successor revision is APPROVED**, in the same transaction — not when a draft is created, nor at submit. Creating Draft Revision 2 leaves Revision 1 untouched and still in force; if Revision 2 is rejected, Alternative A keeps its previously approved terms. |
| **D7** | **Idempotency via conditional state transitions + partial unique indexes.** No use of the existing-but-unused `idempotency_records` table in R1-10; a retry of a committed decision returns `409`, never a second decision row. Wiring `idempotency_records` + an `Idempotency-Key` header is shared infrastructure (`r1-decisions.md:24`) and belongs in its own task. |

## 3. Scope

**In scope (design):** submission validation and version locking; Manager approval with
self-approval comment rule; rejection and Sales withdrawal with mandatory reasons and append-only
history; copy-to-draft from rejected/withdrawn; alternative-scoped supersession; concurrency and
state integrity; decision-history read API; grants; audit; OpenAPI; UI; tests.

**Out of scope:** PDF rendering/storage/download and `issue` (D2, G08); buyer acceptance, partial
acceptance, Sales Order conversion (task Constraint); any change to approved money/FX/rounding
policy; `rate_history`; notifications (G03); `idempotency_records` infrastructure (D7); approval
delegation; PDF legal/commercial wording.

## 4. State machine (confirmed)

`quotation_versions.state` already has the full CHECK in the baseline
(`01_init_20261106.sql:551`): `DRAFT, SUBMITTED, APPROVED, REJECTED, WITHDRAWN, ISSUED,
SUPERSEDED, ACCEPTED`. R1-10 fixes the transitions:

```
DRAFT      → SUBMITTED                      (submit, author/Sale)
SUBMITTED  → APPROVED                       (approve, Manager/Admin grant)
SUBMITTED  → REJECTED                       (reject, Manager/Admin, reason required)
SUBMITTED  → WITHDRAWN                      (withdraw, Sale, reason required)   ← D5: only here
APPROVED   → ISSUED                         (issue — BLOCKED on G08, D2)
APPROVED   → SUPERSEDED                     (successor revision approved, D6)
ISSUED     → SUPERSEDED                     (successor revision approved, D6)
ISSUED     → ACCEPTED                       (out of scope — later task)
REJECTED   → (terminal)
WITHDRAWN  → (terminal)
SUPERSEDED → (terminal)
```

`REJECTED` and `WITHDRAWN` are terminal but **copyable**: `copy-to-draft` creates a *new* revision
row in `DRAFT`, never reopens the original.

Supersession is alternative-scoped: approving Alternative A Revision 2 supersedes only rows with
the **same `quotation_id`** (one `quotations` row = one alternative, per
`01_init:1782` *"Independent alternative for a buyer RFQ"*). Alternative B has a different
`quotation_id` and is untouched.

## 5. Database — `db/migrations/00NN_quotations_approval.sql` (+ `.down.sql`)

Extends the applied baseline, following `db/migrations/0005_price_lists.sql` exactly (ALTER +
CHECK + partial unique index + `COMMENT ON` + `BEFORE UPDATE/DELETE` trigger raising `55000`).
**No SQL `FOREIGN KEY` / `REFERENCES`.** The migration number depends on what R1-07/R1-09 consume
first.

### 5.1 `quotation_decisions` — the main gap

The baseline table is only `id, market_id, quotation_version_id, action, reason, actor_id,
created_at`. `docs/modules/quotations.md:14` requires the approval record to store creator,
approver, `self_approved`, comment, timestamp, version, total and FX rate at approval. Add:

```sql
ALTER TABLE quotation_decisions ADD COLUMN comment text;
ALTER TABLE quotation_decisions ADD COLUMN self_approved boolean NOT NULL DEFAULT false;
ALTER TABLE quotation_decisions ADD COLUMN decided_version integer;
ALTER TABLE quotation_decisions ADD COLUMN version_state_before text;
ALTER TABLE quotation_decisions ADD COLUMN version_state_after text;
ALTER TABLE quotation_decisions ADD COLUMN rounded_usd_total_at_decision numeric;
ALTER TABLE quotation_decisions ADD COLUMN vnd_per_usd_at_decision numeric(18,4);
ALTER TABLE quotation_decisions ADD COLUMN request_id uuid;

ALTER TABLE quotation_decisions ADD CONSTRAINT quotation_decisions_action_check
  CHECK (action IN ('submit','approve','reject','withdraw','issue','supersede','accept'));
-- 01_init:1790-ish comment: "Nonblank for rejection, withdrawal and manager self-approval."
ALTER TABLE quotation_decisions ADD CONSTRAINT quotation_decisions_reason_check
  CHECK (action NOT IN ('reject','withdraw')
         OR (reason IS NOT NULL AND btrim(reason) <> ''));
ALTER TABLE quotation_decisions ADD CONSTRAINT quotation_decisions_self_approval_comment_check
  CHECK (NOT self_approved OR length(btrim(coalesce(comment,''))) >= 10);
ALTER TABLE quotation_decisions ADD CONSTRAINT quotation_decisions_self_approved_action_check
  CHECK (NOT self_approved OR action = 'approve');
ALTER TABLE quotation_decisions ADD CONSTRAINT quotation_decisions_approval_snapshot_check
  CHECK (action <> 'approve'
         OR (rounded_usd_total_at_decision IS NOT NULL AND decided_version IS NOT NULL));
```

**Conditional uniqueness — the state-integrity backstop (AC-16, AC-17, AC-21):**

```sql
CREATE UNIQUE INDEX quotation_decisions_one_terminal_decision
  ON quotation_decisions (market_id, quotation_version_id)
  WHERE action IN ('approve','reject','withdraw');
CREATE UNIQUE INDEX quotation_decisions_one_issue
  ON quotation_decisions (market_id, quotation_version_id)
  WHERE action = 'issue';
CREATE UNIQUE INDEX quotation_decisions_one_submit
  ON quotation_decisions (market_id, quotation_version_id)
  WHERE action = 'submit';
```

The first index is the hard guarantee that approve-vs-withdraw-vs-reject on one version has
**exactly one winner at the database level**, independent of application logic. The loser gets
`23505` → `409`.

**Append-only**, mirroring `0002_audit_events_append_only.sql`:

```sql
CREATE OR REPLACE FUNCTION reject_quotation_decision_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'quotation_decisions is append-only' USING ERRCODE = '55000';
END; $$;

CREATE TRIGGER quotation_decisions_append_only
BEFORE UPDATE OR DELETE ON quotation_decisions
FOR EACH ROW EXECUTE FUNCTION reject_quotation_decision_mutation();
```

Indexes: the baseline already has `quotation_decisions_parent_page (market_id,
quotation_version_id, created_at DESC, id)` and `idx_quotation_decisions_actor_id` — reuse, do not
recreate.

### 5.2 `quotation_versions` — lock the submitted content

```sql
ALTER TABLE quotation_versions ALTER COLUMN vnd_per_usd TYPE numeric(18,4);
ALTER TABLE quotation_versions ADD COLUMN approved_at timestamptz;
ALTER TABLE quotation_versions ADD COLUMN approved_by INTEGER;
ALTER TABLE quotation_versions ADD COLUMN decided_at timestamptz;
ALTER TABLE quotation_versions ADD COLUMN superseded_at timestamptz;
ALTER TABLE quotation_versions ADD COLUMN superseded_by_version_id INTEGER;
ALTER TABLE quotation_versions ADD COLUMN source_version_id INTEGER;

ALTER TABLE quotation_versions ADD CONSTRAINT quotation_versions_submitted_metadata_check
  CHECK (state = 'DRAFT' OR submitted_at IS NOT NULL);
ALTER TABLE quotation_versions ADD CONSTRAINT quotation_versions_approved_metadata_check
  CHECK (state NOT IN ('APPROVED','ISSUED','SUPERSEDED','ACCEPTED')
         OR (approved_at IS NOT NULL AND approved_by IS NOT NULL
             AND rounded_usd_total IS NOT NULL));
ALTER TABLE quotation_versions ADD CONSTRAINT quotation_versions_superseded_metadata_check
  CHECK (state <> 'SUPERSEDED'
         OR (superseded_at IS NOT NULL AND superseded_by_version_id IS NOT NULL));

CREATE INDEX quotation_versions_state_idx
  ON quotation_versions (market_id, quotation_id, state, revision_no DESC);
CREATE UNIQUE INDEX quotation_versions_one_open_draft
  ON quotation_versions (market_id, quotation_id) WHERE state = 'DRAFT';
CREATE UNIQUE INDEX quotation_versions_one_effective
  ON quotation_versions (market_id, quotation_id)
  WHERE state IN ('APPROVED','ISSUED','ACCEPTED');
```

`quotation_versions_one_effective` is the alternative-scoped invariant from D6: at most one
in-force revision per alternative, so approving a successor **must** supersede the predecessor in
the same transaction or the index rejects the commit. `quotation_versions_one_open_draft` mirrors
M07's "an open draft already exists" rule
(`src/modules/product-specifications/infrastructure/specification-repository.ts` `createRevision`).

**Content immutability after submit** — `reject_quotation_version_change_after_submit`,
`BEFORE UPDATE`, `55000`, modelled on `0005_price_lists.sql`'s
`reject_price_list_item_change_after_approval`. When `OLD.state <> 'DRAFT'` it freezes every
commercial column — `currency, incoterm, incoterm_place, incoterm_year, payment_terms, valid_until,
original_usd_total, original_vnd_total, unrounded_usd_total, rounded_usd_total, revision_no,
quotation_id, rfq_id, created_by` — and forbids returning to `DRAFT` from any state.
**`vnd_per_usd`, `fx_source`, `fx_at` are deliberately excluded** from the freeze:
`docs/modules/quotations.md:15` makes the FX rate a reference field outside the submitted-version
lock that never changes USD totals. Append-only `rate_history` for those edits is deferred (D4).

### 5.3 `quotation_lines` / `quotation_adjustments` — freeze after submit

Both get a `BEFORE UPDATE OR DELETE` trigger rejecting any change when the parent
`quotation_versions.state <> 'DRAFT'` (`55000`). This is what makes AC-03 and AC-20 hold:
snapshots in `product_snapshot` / `specification_snapshot` are value copies, so later catalogue,
price-list or specification changes cannot reach an approved version.

### 5.4 Drizzle mapping

R1-09 owns the mappings for `quotations`, `quotationVersions`, `quotationLines`,
`quotationAdjustments`. R1-10 adds `quotationDecisions` plus the new columns above, appended to
`src/modules/access-control/infrastructure/schema.ts` with the existing conventions (`identity()`,
snake_case SQL names, `timestamp(..., { withTimezone: true })`, `version` last, indexes in the
array-returning third argument, no `references()`).

## 6. Module — extends `src/modules/quotations` (created by R1-09)

Layering copies `src/modules/product-specifications` and `src/modules/price-lists`:
`application/` · `domain/` · `infrastructure/` · `presentation/`; repository injected via a
defaulted constructor parameter; `import 'server-only'` at the top of services and repositories.

### `domain/quotation-approval-lifecycle.ts`
`quotationVersionStates`, `quotationDecisionActions`, `quotationTransitions` (§4 table),
`canTransitionQuotationVersion(from, to)`, `isSubmittedLocked(state)`, `isTerminalState`,
`isEffectiveState` (APPROVED | ISSUED | ACCEPTED), `isCopyableState` (REJECTED | WITHDRAWN);
`QuotationTransitionError` (carries `from`, `to`), `QuotationStaleApprovalError`.
`submissionRequiredFields` + `missingSubmissionFields(version, lines)` +
`assertSubmittable(...)` → `QuotationNotSubmittableError` (carries `fields`, `lineNumbers`),
mirroring `specification-lifecycle.ts`'s `approvalRequiredFields` / `assertApprovable`. Submission
readiness = every commercial line has an eligible SKU and an **APPROVED** specification revision,
plus required commercial terms and a computed `rounded_usd_total`.

### `domain/quotation-self-approval.ts`
```ts
export const selfApprovalCommentMinLength = 10

export function isSelfApproval(input: {
  approverId: number
  versionCreatedBy: number
  quotationOwnerId: number
}): boolean   // D3: created_by OR owner_id

export class SelfApprovalCommentRequiredError extends Error {}

export function assertApprovalComment(input: {
  selfApproved: boolean
  comment?: string | null
}): string | null   // trims; throws when selfApproved and trimmed length < 10
```
Pure, unit-testable, no I/O — this is the AC-05 / AC-06 unit.

### `domain/quotation-grants.ts`
`quotationReadFields`, `quotationVersionReadFields`, `quotationLineReadFields`,
`quotationDecisionReadFields`, `quotationAllReadFields`, `quotationAdminGrants`,
`quotationManagerGrants`, `quotationSaleGrants`, `quotationAccountantGrants = [] as const`
(accountant is not activated in R1 — `docs/business/r1-decisions.md:108`). Shape per
`src/modules/product-specifications/domain/specification-grants.ts`.

### `application/approval-contracts.ts`
`submitQuotationVersionSchema` (`{ version }`),
`approveQuotationVersionSchema` (`{ version, comment? }`),
`rejectQuotationVersionSchema` (`{ version, reason }` min 10 / max 1000),
`withdrawQuotationVersionSchema` (`{ version, reason }` min 10 / max 1000),
`copyToDraftSchema` (`{ version }`),
`decisionHistoryQuerySchema` (cursor + limit).
All `.strict()`; `version: positiveId` required everywhere (optimistic concurrency); reasons and
comments trimmed before validation so whitespace-only input fails (AC-05, AC-08, AC-10).

### `application/quotation-approval-service.ts`
`class QuotationApprovalService` — `submit`, `approve`, `reject`, `withdraw`, `copyToDraft`,
`listDecisions`. Each method: *parse → `requireGrant` → `allowedFields` → repository → project*,
exactly as `specification-service.ts`. Signature shape
`(actor: Principal, grants: EffectiveGrant[], marketId: number, versionId: number, raw: unknown,
requestId: string)`.

`approve` additionally, **before** calling the repository, resolves nothing itself — the
`self_approved` determination must happen **inside the transaction** against the locked row, so the
service passes the raw `comment` through and the repository computes `isSelfApproval` and calls
`assertApprovalComment`. This is deliberate: deciding self-approval from a pre-transaction read
would be a stale-read bug.

**Admin does not bypass approval** (task Constraint): `admin` holds the `quotations:approve` grant
like `manager`, but there is no code path that marks a version APPROVED without inserting an
`approve` decision row. There is no "force" flag.

### `infrastructure/quotation-approval-repository.ts`
Errors: `QuotationVersionNotFoundError`, `QuotationConflictError` (409 `VERSION_CONFLICT`),
`QuotationImmutableError` (409, also SQLSTATE `55000`),
`QuotationDecisionConflictError` (409 `DECISION_CONFLICT`, SQLSTATE `23505` on the partial unique
indexes), `QuotationLineNotEligibleError`, `QuotationSpecificationNotApprovedError`.

`scopeCondition(scope, actor)` over `quotations.ownerId` / `quotations.teamId`, copied from
`src/modules/customers/infrastructure/customer-repository.ts:57-63`, failing closed. Version-level
reads re-derive scope by joining the parent `quotations` row — a version id is never trusted alone
(AC-07, AC-22).

`audit(...)` is the **last statement inside every transaction** (pattern from
`specification-repository.ts`), so a failing mandatory audit rolls the decision back (AC-23).

## 7. Transactions, locking, concurrency

Lock order is fixed by `docs/structure/backend.md:550`: **RFQ → quotation version → order →
opportunity**, `READ COMMITTED` plus explicit row locks, and *"never hold DB locks while
uploading/scanning/rendering PDFs"*.

Every decision is one transaction with the same skeleton:

1. `SELECT … FROM quotations … FOR UPDATE` under `scopeCondition` (parent first) → 404 if invisible.
2. `SELECT … FROM quotation_versions WHERE id = $1 AND market_id = $2 AND quotation_id = $3 FOR UPDATE`.
3. `if (current.version !== input.version) throw new QuotationConflictError()`.
4. `canTransitionQuotationVersion(current.state, target)` else `QuotationTransitionError` → 409.
5. Business validation **inside the transaction** (submit: re-read lines + specification revision
   status; approve: compute `isSelfApproval` from the locked `created_by` / `owner_id` and run
   `assertApprovalComment`).
6. `UPDATE quotation_versions SET state = $target, …, version = version + 1
   WHERE id = $1 AND version = $2 AND state = $expectedState` — a **conditional** transition.
   Empty `returning()` → `QuotationConflictError`.
7. `INSERT INTO quotation_decisions (…)` — the partial unique index is the second, independent
   guarantee. `23505` → `QuotationDecisionConflictError` → 409.
8. `INSERT INTO audit_events (…)` last.

| Scenario | Outcome |
|---|---|
| **Approve vs Withdraw on the same SUBMITTED version (AC-16)** | Both lock the same row in step 2; the second waits. The winner moves `SUBMITTED → APPROVED` (or `WITHDRAWN`) and bumps `version`. The loser's step 3 version check, step 6 `state = 'SUBMITTED'` predicate **and** step 7 unique index all fail → `409`. Exactly one decision row, one audit trail. |
| **Two concurrent approvals (AC-17)** | Same mechanism; `quotation_decisions_one_terminal_decision` makes a double-approve impossible even if application logic were wrong. |
| **Stale approval of a superseded version (AC-15)** | Step 4 rejects: `SUPERSEDED` has no outgoing transition. Approval is bound to `quotation_version_id` + the `version` token + `decided_version` recorded on the decision row — never to `quotation_id` or a status read outside the transaction. |
| **Approving successor Revision 2 (AC-14, D6)** | One transaction: lock the parent `quotations` row → lock Revision 2 → lock the currently effective revision of **the same `quotation_id`** → set it `SUPERSEDED` + `superseded_by_version_id` + append a `supersede` decision → set Revision 2 `APPROVED` + append the `approve` decision → audit. `quotation_versions_one_effective` enforces the invariant. Alternative B has a different `quotation_id`, so it is outside every predicate. |
| **Copy-to-draft from REJECTED/WITHDRAWN (AC-12, AC-13)** | Lock parent → verify `isCopyableState` → `SELECT max(revision_no) … FOR UPDATE` → insert a **new** `quotation_versions` row `state='DRAFT'`, `revision_no = max + 1`, `source_version_id = <origin>`, `approved_at/approved_by/submitted_at/issued_at/pdf_file_id` all NULL → copy `quotation_lines` and `quotation_adjustments` as value copies → audit. The origin row is never updated, so its decision history and immutability hold. No approval state and no PDF state is inherited (AC-25). |
| **Retry of a committed decision (AC-21)** | Deterministic `409` from the version predicate plus the unique index. No second decision row, no contradictory audit (D7). |

## 8. API

Endpoints follow the approved contracts in `docs/structure/backend.md:322-348` (all rows currently
`Proposed`). Route files are thin delegations under `src/app/api/v1/quotation-versions/[id]/**`
with `await context.params`; all require `?market=` and all mutations require `x-csrf-token`, via
the `protectedAction` gate copied from
`src/modules/product-specifications/presentation/api.ts:151-183`.

| Method + path | Grant | Body | Status |
|---|---|---|---|
| `POST /api/v1/quotation-versions/{id}/submit` | `quotations:submit` | `{ version }` | in scope |
| `POST /api/v1/quotation-versions/{id}/approve` | `quotations:approve` | `{ version, comment? }` | in scope |
| `POST /api/v1/quotation-versions/{id}/reject` | `quotations:reject` | `{ version, reason }` | in scope |
| `POST /api/v1/quotation-versions/{id}/withdraw` | `quotations:withdraw` | `{ version, reason }` | in scope |
| `POST /api/v1/quotation-versions/{id}/copy-to-draft` | `quotations:edit` | `{ version }` | in scope |
| `GET /api/v1/quotation-versions/{id}/decisions` | `quotations:read` | — (cursor) | in scope |
| `POST /api/v1/quotation-versions/{id}/issue` | `quotations:issue` | `{ version }` | **BLOCKED — G08** |
| `GET /api/v1/quotation-versions/{id}/pdf` | `quotations:download` | — | **BLOCKED — G08** |
| `POST /api/v1/quotation-versions/{id}/accept` | `quotations:accept` | `{ evidenceFileId, buyerAcceptedAt }` | out of scope |

Note: `GET …/decisions` is not in the current `backend.md` table; it is required by AC-26
("historical decision lookup, reasons/comments preserved and scoped") and is recorded as a
divergence for the Spec Update step.

`responseFor` error mapping, extending the existing table:

| Error | Status / code |
|---|---|
| `z.ZodError` | 400 `VALIDATION_FAILED` |
| `AuthenticationError` | 401 `UNAUTHENTICATED` |
| `AccessDeniedError` (incl. CSRF, market) | 403 `ACTION_FORBIDDEN` |
| `QuotationVersionNotFoundError` | 404 `NOT_FOUND` |
| `QuotationConflictError` | 409 `VERSION_CONFLICT` |
| `QuotationTransitionError` (+`from`,`to`) | 409 `INVALID_QUOTATION_TRANSITION` |
| `QuotationDecisionConflictError`, SQLSTATE `23505` | 409 `DECISION_CONFLICT` |
| `QuotationImmutableError`, SQLSTATE `55000` | 409 `IMMUTABLE_QUOTATION_VERSION` |
| `QuotationLineNotEligibleError`, `QuotationSpecificationNotApprovedError` | 409 `BUSINESS_RULE_VIOLATION` |
| `SelfApprovalCommentRequiredError` | 422 `SELF_APPROVAL_COMMENT_REQUIRED` |
| `QuotationNotSubmittableError` (+`fields`,`lineNumbers`) | 422 `QUOTATION_NOT_SUBMITTABLE` |

## 9. Grants

| Role | Actions | Scope |
|---|---|---|
| `admin` | `read`, `edit`, `submit`, `approve`, `reject`, `withdraw`, `issue`, `download` | `ALL` |
| `manager` | same as admin | `ALL` (`docs/business/r1-decisions.md:99`) |
| `sale` | `read`, `edit`, `submit`, `withdraw`, `download` | `OWN` — **no `approve`, no `reject`** (`docs/modules/quotations.md:12` "Sale cannot approve") |
| `accountant` | — | no grant, default deny |

`scripts/access-control.ts`: add `quotationGrantPolicy` + `grantQuotations()` cloning
`grantPriceLists()`, with an `access.quotation_grants_activated` audit row carrying
`safeDiff: { grantBoundary: 'M10_QUOTATIONS_APPROVAL_APPROVED' }`; register `grant-quotations` in
the dispatcher and usage string. This closes G01 for M10.

Extend `src/modules/access-control/application/audit-safe-diff.ts` with the quotation field
allowlist, as every prior module did.

## 10. Audit events

`resourceType: 'quotation_version'`, `resourceId` = `quotation_versions.id`, `resourceVersion` =
post-write version, `requestId` = `requestCorrelationId(request)`.

| Action | `reason` | `safeDiff` |
|---|---|---|
| `quotation.version_submitted` | — | `{ quotationNumber, revisionNo, lineCount, roundedUsdTotal, vndPerUsd }` |
| `quotation.version_approved` | `comment` | `{ quotationNumber, revisionNo, selfApproved, approverId, roundedUsdTotalAtDecision, vndPerUsdAtDecision, decidedVersion }` |
| `quotation.version_rejected` | `reason` | `{ quotationNumber, revisionNo, fromState }` |
| `quotation.version_withdrawn` | `reason` | `{ quotationNumber, revisionNo, fromState }` |
| `quotation.version_superseded` | — | `{ quotationNumber, revisionNo, supersededByRevisionNo, supersededByVersionId }` |
| `quotation.version_copied_to_draft` | — | `{ quotationNumber, sourceRevisionNo, newRevisionNo, sourceState }` |

`safeDiff` carries totals and the FX rate (needed for AC-26 traceability) but never buyer-facing
free text, `files.storage_key`, or full line snapshots.

## 11. UI

Extends the R1-09 workspace under `src/modules/quotations/presentation`; the `/quotations` route is
currently the `R1RoutePage` placeholder (`src/app/[locale]/(workspace)/quotations/page.tsx`).

- **Version header** — state pill, revision number, alternative label, effective/superseded badge,
  totals, FX rate.
- **Action bar** — Submit / Approve / Reject / Withdraw / Copy to new draft, each gated on the
  grant **and** on `canTransitionQuotationVersion`, disabled with an explanatory tooltip.
  Server-side enforcement is independent of the UI (task §H).
- **Approval dialog** — when `isSelfApproval` is true for the signed-in user, the comment field is
  required with a live ≥10-character counter and an explicit "you are approving your own
  quotation" notice. Reject / Withdraw dialogs require a reason. Drawer shell copied from
  `src/modules/products/presentation/product-create-drawer.tsx` (portal, focus trap, Escape,
  dirty-discard footer, ≥40px targets) — never `window.confirm`.
- **Decision history panel** — append-only timeline from `GET …/decisions`: actor, action,
  timestamp, `self_approved` badge, reason/comment, total and FX at decision.
- **Revision/alternative tree** — mirrors the task's §E diagram, so supersession scope is visible.
- 409/422 responses render inline next to the triggering action (stale version → "reload and
  retry"; not-submittable → the missing fields and line numbers).

The `impeccable` skill is **not** pre-approved; request approval before editing these forms.

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
npm run access:operator -- grant-quotations --actor-email <admin-email>
```

**Unit** — `domain/quotation-approval-lifecycle.test.ts` (every allowed transition and a sweep of
every rejected pair; terminal and copyable predicates; `assertSubmittable`);
`domain/quotation-self-approval.test.ts` (**AC-05/AC-06**: `isSelfApproval` true for both
`created_by` and `owner_id`; empty, whitespace-only and 9-character comments rejected; 10-character
accepted; non-self approval with no comment accepted);
`application/approval-contracts.test.ts` (`.strict()`, trimmed reasons, required `version`);
`application/quotation-approval-service.test.ts` with a stubbed repository (exact
`('quotations', action)` grant pair per method; `sale` denied `approve`/`reject`; strict
projection).

**Integration** (the only acceptable proof of concurrency and transactional correctness — task
§Verification forbids mock-only tests) —
`infrastructure/quotation-approval-repository.integration.test.ts`, throwaway schema
`quotations_it_<8 hex>` with the regex guard, baseline + all migrations, lazy `await import` of the
repository after `DATABASE_URL` is rewritten, harness copied from
`src/modules/product-specifications/infrastructure/specification-repository.integration.test.ts:1-116`,
two markets to prove isolation. **Concurrency tests use independent `postgres()` clients**, not two
calls on one pooled connection:

- AC-01/AC-02 submit locks the version and audits; submit with a line lacking an APPROVED
  specification revision is rejected.
- AC-03 direct `UPDATE quotation_lines`/`quotation_versions` commercial columns on a non-DRAFT
  version raises `55000`.
- AC-04/AC-09/AC-11 approve, reject and withdraw each append exactly one decision row; `UPDATE` and
  `DELETE` on `quotation_decisions` both raise `55000`.
- AC-05/AC-06 self-approval without a comment is rejected at both the service and the DB CHECK.
- AC-07 a `sale`-scoped actor cannot approve, and another owner's version is a 404 not a 403.
- AC-08/AC-10 whitespace-only reason rejected.
- AC-12/AC-13/AC-25 copy-to-draft creates an independent DRAFT with `source_version_id`, inherits
  no approval or PDF state, and leaves the origin row byte-identical.
- AC-14 approving Alternative A Revision 2 supersedes only Alternative A; Alternative B unchanged.
- AC-15 approving a SUPERSEDED or REJECTED version is denied.
- **AC-16 concurrent approve vs withdraw across two connections: exactly one commits, the loser
  gets a conflict, and `quotation_decisions` holds one terminal decision row.**
- AC-17 two concurrent approvals: one commits, no contradictory state.
- AC-20 publishing a new specification revision and changing a price list after approval leaves the
  approved version's snapshots and totals unchanged.
- AC-21 replaying a committed decision returns a conflict and creates no second row.
- AC-23 a temporary rejecting trigger on `audit_events` makes the whole decision roll back — no
  state change, no decision row.
- AC-26 decision history returns reasons, comments, `self_approved`, total and FX, scoped.

**Migration validation** — extend `scripts/validate-migrations.ts` to apply and then reverse the
new migration: assert the triggers exist, assert `0` FOREIGN KEY constraints on the touched tables,
probe each `55000` path and each partial unique index, verify `vnd_per_usd` is `numeric(18,4)`,
then apply the down migration and assert the added columns, indexes and triggers are gone.

**E2E / HTTP authorization** — `e2e/quotations-approval.spec.ts` on the
`e2e/product-specifications.spec.ts` template: anonymous calls to every endpoint → 401; an
authenticated mutation without `x-csrf-token` → 403; a `sale` user calling `approve` → 403; a
`sale` reading another owner's version → 404.

**Browser verification** — sign in through the UI with `ADMIN_ROLE_USER` / `ADMIN_ROLE_PASS` from
`.env` (never printed, logged or committed) on clearly synthetic records; walk submit → self-approve
(comment required) → copy-to-draft → approve successor → confirm the predecessor shows
SUPERSEDED; clean up afterwards.

**`/goal`** — check availability; if unavailable, report the limitation and walk AC-01..AC-26
manually.

**Expected AC outcome:** AC-01..AC-17, AC-20, AC-21, AC-23, AC-25, AC-26 → PASS once R1-07/R1-09
exist. **AC-18, AC-19, AC-22, AC-24 → BLOCKED** (PDF issuance and private download, G08 + D2).

## 13. Ordered subtasks — gated, not startable yet

**Gate 0 (blocking):** R1-07 RFQs and R1-09 Quotations Draft & Calculate implemented, committed and
acceptance-verified. Nothing below starts before that.

1. Migration `00NN_quotations_approval.sql` + `.down.sql`.
2. Extend `scripts/validate-migrations.ts`; `db:validate-migrations`; `db:migrate` twice.
3. `quotationDecisions` Drizzle mapping + the new columns; `typecheck`.
4. `domain/quotation-approval-lifecycle.ts` + `domain/quotation-self-approval.ts` + unit tests.
5. `domain/quotation-grants.ts`.
6. `application/approval-contracts.ts` + tests.
7. `infrastructure/quotation-approval-repository.ts` (submit, approve, reject, withdraw,
   copy-to-draft, supersede, decision history).
8. `application/quotation-approval-service.ts` + tests.
9. Integration tests incl. the two-connection concurrency suite; `test:integration`.
10. `presentation/api.ts` handlers + route files; `build`; manual 401 / 403 probes.
11. `grantQuotations` + `grant-quotations`; extend `audit-safe-diff.ts`; activate in dev.
12. OpenAPI paths/schemas + `openapi.test.ts` (its expected-operation list is hard-coded).
13. UI: action bar, approval/reject/withdraw dialogs, decision-history panel, revision tree.
14. `e2e/quotations-approval.spec.ts`; `test:e2e`.
15. **STOP for the documentation approval gate**, then sync docs (§15).

**Separate follow-up tasks (not R1-10):** PDF issuance + storage adapter + Noto fonts (needs G08
and a dependency approval); `rate_history` + FX edit workflow; `idempotency_records` infrastructure;
notifications (needs G03); buyer acceptance and Sales Order conversion.

## 14. Risks

| Risk | Mitigation |
|---|---|
| **R1-09 and R1-07 do not exist** — nothing to approve | Plan only; implementation gated. This is the headline finding, not a mitigable risk. |
| Determining `self_approved` from a pre-transaction read would be a stale-read bug | The repository computes it inside the transaction from the locked `created_by` / `owner_id`; the service only forwards the raw comment. |
| Application-only concurrency control could still double-decide | Three independent layers: the `FOR UPDATE` row lock, the conditional `UPDATE … WHERE version AND state`, and the partial unique indexes. The DB is the final arbiter. |
| Supersession could void in-force terms prematurely | D6 defers it to successor approval, inside the same transaction, guarded by `quotation_versions_one_effective`. |
| `backend.md` approve row says `{comment?}` while `quotations.md:12` demands ≥10 chars | D3 keeps the wire contract optional and enforces conditionally at the service + a DB CHECK; recorded as a divergence for the Spec Update step. |
| `GET …/decisions` is not in the approved endpoint table | Required by AC-26; recorded as an approved divergence rather than silently added. |
| `rfq_acceptances` has both `UNIQUE (market_id, rfq_id)` and `UNIQUE (market_id, rfq_id, quotation_version_id)` — the first forbids a second acceptance row, which collides with the partial-acceptance flow in `quotations.md:13` | Out of R1-10 scope; flagged now so the acceptance task resolves it before coding. |
| G06 (repeating FX conversion representation) still open | R1-10 consumes already-persisted totals and never re-derives them; `src/lib/decimal.ts` already offers exact `Rational` arithmetic plus `roundHalfEven`, so no new rounding policy is introduced. |
| Admin could be assumed to bypass approval | No code path sets APPROVED without an `approve` decision row; no force flag; explicitly asserted in tests. |
| Freezing `vnd_per_usd` would contradict the approved FX policy | It is deliberately excluded from the immutability trigger, per `quotations.md:15`; the append-only `rate_history` that should accompany it is an explicit follow-up task. |

## 15. Approval gates (AGENTS.md §2)

1. **Plan approval** for this document.
2. **Tracker decision** — there is currently **no R1-10 tracker task**. Existing related items:
   `task_1794402402004_2pexdp` (R1-07, approved), `task_1794403118796_wgxj7o` (R1-09, in-progress),
   `pln_mwc3wlise7obf2` (R1-07 plan, in-review), `pln_mwc3rbvujptd4k` (R1-09 plan, done).
3. **Documentation decision** — `docs/modules/quotations.md` (confirmed transitions, self-approval
   definition, decision-record fields), `docs/structure/backend.md` (the `{comment?}` divergence,
   the new `GET …/decisions` endpoint, M10 grant rows), `docs/structure/database.md` (schema delta).
4. **Implementation approval** — cannot be exercised until Gate 0 clears.
5. Dev-log decision (`nimbalyst-local/wiki/develop-process.md` — note it has **no entry for R1-07,
   R1-08 or R1-09**; the last entry is R1-06) and spec-update decision
   (`nimbalyst-local/wiki/spec-updating-v1.md`).
