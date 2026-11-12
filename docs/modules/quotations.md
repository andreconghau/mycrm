# M10 — Quotations

> **Status: IN PROGRESS — R1-09 Draft & Calculate implementation**
> **Area:** Sales · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Create, approve and issue immutable commercial offer versions.

## R1 workflow and acceptance

- Create independent alternatives and revisions. Require SKU and specification version before submission. Display and calculate in USD; use one positive VND-per-USD rate per revision with VND inputs. Save original amounts, unrounded converted lines and both totals. Draft FX changes recompute VND lines. Sum exact decimals before rounding the total to cents using ROUND_HALF_EVEN: 20.005 → 20.00, 20.015 → 20.02, 10.004 + 10.004 → 20.01.
- Lock each submitted version. Every version requires Manager or Admin approval (explicit grant, no amount threshold); Sale cannot approve. Self-approval requires a comment of at least 10 characters after trimming whitespace and is recorded as `self_approved`. See [R1 decisions](../business/r1-decisions.md). Rejection and Sales withdrawal require reasons and immutable history. Copy a withdrawn/rejected version into a new draft. Issue PDF from approved data. Concurrent withdrawal and approval yield one outcome. A revision supersedes only its own alternative. Stale approval cannot authorize new terms.
- Accept one issued alternative per RFQ and close others with history. For partial acceptance, issue a new version for the chosen items. Store evidence, buyer acceptance time and system recording time. Concurrent selection yields one winner. Late upload of timely evidence is allowed. Late or unverifiable acceptance requires newly approved and issued terms.
- Approval binds to one version and locks its row against concurrent decisions. The approval record stores creator, approver, `self_approved`, comment, timestamp, version, total and FX rate at approval.
- The VND-per-USD rate (`numeric(18,4)`, > 0) is a reference field excluded from the submitted-version lock. Every change requires a comment and appends to `rate_history`; Sale edits only own drafts, Manager/Admin edit in any state. A rate-only change creates no new version, needs no re-approval and never changes USD totals. Creator, assigned Sale and approver receive an in-app notification.
- PDF modes: English only, English–Vietnamese, English–Korean, Vietnamese–Korean (first language primary). Default comes from customer `preferred_doc_language`; Sale may override per quotation. Product/specification translations are snapshotted at submission; a missing translation blocks PDF generation and names the missing field. No machine translation. Each issued PDF stores language, version, SHA-256, creator and timestamp. Embed Noto Sans and Noto Sans KR.
- Buyer-acceptance evidence follows the Sales Order evidence file rules in [R1 decisions §7](../business/r1-decisions.md#7-evidence-files-sales-order-confirmation-and-quotation-acceptance).

## R1-09 implementation slice: Draft & Calculate

The first M10 implementation task covers authorized quotation drafts, alternatives, draft revisions, lines, price selection, calculation and submission-readiness checks. It does not implement submission, approval/rejection/withdrawal, PDF issuance, buyer acceptance or Sales Order conversion; these remain specified above for later approved work.

Admin draft access is provided through explicit, audited `quotations` action grants for the approved R1-09 slice. `ALL` record scope remains bounded by current market membership and the module's field allowlists. It does not add submission, approval, issue, acceptance or order-conversion actions, and it does not bypass RFQ, Customer, Product, Specification or Price List authorization.

- Preserve original USD and VND totals separately. Never add original amounts across currencies; calculate the payable/display total in USD.
- Convert VND inputs using the single positive `numeric(18,4)` VND-per-USD rate on that revision. Recalculate VND-derived values from original inputs when the draft rate changes; USD-native amounts remain unchanged.
- Compute the final USD payable total from exact source amounts and rate, including explicit freight and insurance adjustments. Do not let finite-scale converted-line display/storage values affect the payable result. Round only the final aggregate to cents with `ROUND_HALF_EVEN`.
- A new revision is an independent draft cloned from the latest revision of the same alternative. Edits never change the source revision or another alternative.
- Drafts may be incomplete. Readiness requires each commercial line to have an eligible SKU and approved Specification Revision. Readiness validation does not submit or lock the draft.
- Reuse the M08 eligible-price and selection contract; preserve the immutable selection record, listed reference, reason, actor and time on each quotation line. Do not duplicate its recommendation, reference, manual-price or override policy.

Persist the exact unrounded USD aggregate as a reduced integer numerator and positive denominator. The finite 18-place converted line, adjustment and aggregate fields are display/storage approximations only; the payable amount is calculated directly from original inputs and the exact FX rate, then rounded once to cents. API decimal values are serialized as strings.

Implemented API surface for this slice: `GET/POST /api/v1/quotations`, `GET /api/v1/quotations/{id}`, `POST /api/v1/quotations/{id}/revisions`, `PATCH /api/v1/quotation-versions/{id}`, line `POST/PATCH`, adjustment `PUT`, calculation `POST`, and readiness `GET`. All mutation operations require the existing CSRF proof and optimistic version token.

## R1-10 implementation slice: Approval & Issue

Planned, not implemented. Blocked on R1-09, which is itself blocked on R1-07 — neither exists as code as of 2026-11-12. Plan: `nimbalyst-local/plans/r1-10-quotations-approval-issue.md`. Owner decisions below are confirmed and supersede the earlier proposals where they conflict.

### Confirmed state transitions

`DRAFT → SUBMITTED → APPROVED → ISSUED → ACCEPTED`, with `SUBMITTED → REJECTED`, `SUBMITTED → WITHDRAWN`, and `APPROVED|ISSUED → SUPERSEDED`. `REJECTED`, `WITHDRAWN` and `SUPERSEDED` are terminal; `REJECTED` and `WITHDRAWN` are copyable into a new draft revision.

- **Sales withdrawal is allowed only from `SUBMITTED`.** Not after approval and not after issuance; changing approved terms requires a new draft revision.
- **Supersession happens when the successor revision is approved**, in the same transaction — not when a draft revision is created and not at submission. If the successor is rejected, the alternative keeps its previously approved terms. At most one in-force revision (`APPROVED`, `ISSUED` or `ACCEPTED`) exists per alternative.

### Confirmed self-approval definition

A decision is `self_approved` when the approver is the version's `created_by` **or** the quotation's `owner_id`. When `self_approved` is true, a comment of at least 10 characters after trimming is mandatory; otherwise the comment is optional. The request body keeps `comment` optional and the rule is enforced conditionally in the application service plus a database CHECK.

Admin holds the approve grant on the same terms as Manager and has no bypass: no code path may mark a version approved without appending an `approve` decision row.

### Confirmed decision-record and concurrency contract

`quotation_decisions` is append-only and gains `comment`, `self_approved`, `decided_version`, `version_state_before`, `version_state_after`, `rounded_usd_total_at_decision`, `vnd_per_usd_at_decision` and `request_id`. Partial unique indexes allow at most one `approve`/`reject`/`withdraw` decision, one `issue` and one `submit` per version, so concurrent approve-versus-withdraw has exactly one winner at the database level and the loser receives a conflict.

Every decision runs in one transaction: lock the parent quotation, lock the version, check the version token, validate the transition, compute `self_approved` from the locked row, apply a conditional state update, append the decision, then append the mandatory audit event last so an audit failure rolls the decision back.

Retries rely on the conditional transition and these indexes; `idempotency_records` is not used by this slice.

### Deferred out of this slice

PDF issuance, private PDF download and the storage adapter remain blocked by gate G08 — no PDF library, templating engine, object-storage adapter or Noto font asset exists yet. The append-only `rate_history` table, quotation document language, translation snapshot and PDF issue metadata (language, SHA-256) are deferred to their own approved tasks, as are notifications (gate G03), buyer acceptance, partial acceptance and Sales Order conversion.

## Proposed fields

- `Quotation`: `id`, `quote_number`, `rfq_id`, `customer_id`, `owner_id`, `status`, `current_version_id?`.
- `QuotationVersion`: `id`, `quotation_id`, `revision_no`, `currency`, `incoterm`, `named_place`, `payment_terms`, `valid_until`, `freight_decimal?`, `insurance_decimal?`, `total_decimal`, `approval_state`, `issued_at?`, `pdf_object_key?`.
- Baseline schema mapping ([database design](../structure/database.md)): approvals are `quotation_decisions` rows; the FX rate is `quotation_versions.vnd_per_usd`; acceptance evidence is `rfq_acceptances.evidence_file_id` → `files`. Approved R1 decisions still need an approved migration for: `self_approved`, total and FX captured on the approval decision; `numeric(18,4)` precision for the rate; quotation document language and translation snapshot; PDF issue metadata (language, SHA-256); and an append-only `rate_history` table.
- `QuotationLine`: `quotation_version_id`, `product_snapshot`, `specification_snapshot`, `quantity_decimal`, `unit`, `unit_price_decimal`, `line_total_decimal`, `packaging_snapshot`.

## Proposed use cases and endpoints

- `CreateQuoteDraft`, `RecalculateQuote`, `RequestApproval`, `ApproveQuote`, `IssueQuoteVersion`, `RecordBuyerAcceptance`, `ConvertQuoteToOrder`.
- `GET/POST /api/v1/quotations`; `POST /api/v1/quotations/:id/revisions`; `POST /api/v1/quotation-versions/:id/issue`; `POST /api/v1/quotation-versions/:id/accept`.
