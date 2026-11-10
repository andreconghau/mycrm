# M10 — Quotations

> **Status: PLANNED — NOT IMPLEMENTED**  
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

## Proposed fields

- `Quotation`: `id`, `quote_number`, `rfq_id`, `customer_id`, `owner_id`, `status`, `current_version_id?`.
- `QuotationVersion`: `id`, `quotation_id`, `revision_no`, `currency`, `incoterm`, `named_place`, `payment_terms`, `valid_until`, `freight_decimal?`, `insurance_decimal?`, `total_decimal`, `approval_state`, `issued_at?`, `pdf_object_key?`.
- Baseline schema mapping ([database design](../structure/database.md)): approvals are `quotation_decisions` rows; the FX rate is `quotation_versions.vnd_per_usd`; acceptance evidence is `rfq_acceptances.evidence_file_id` → `files`. Approved R1 decisions still need an approved migration for: `self_approved`, total and FX captured on the approval decision; `numeric(18,4)` precision for the rate; quotation document language and translation snapshot; PDF issue metadata (language, SHA-256); and an append-only `rate_history` table.
- `QuotationLine`: `quotation_version_id`, `product_snapshot`, `specification_snapshot`, `quantity_decimal`, `unit`, `unit_price_decimal`, `line_total_decimal`, `packaging_snapshot`.

## Proposed use cases and endpoints

- `CreateQuoteDraft`, `RecalculateQuote`, `RequestApproval`, `ApproveQuote`, `IssueQuoteVersion`, `RecordBuyerAcceptance`, `ConvertQuoteToOrder`.
- `GET/POST /api/v1/quotations`; `POST /api/v1/quotations/:id/revisions`; `POST /api/v1/quotation-versions/:id/issue`; `POST /api/v1/quotation-versions/:id/accept`.
