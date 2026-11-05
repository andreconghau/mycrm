# M10 — Quotations

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Sales · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Create, approve and issue immutable commercial offer versions.

## R1 workflow and acceptance

- Create independent alternatives and revisions. Require SKU and specification version before submission. Display and calculate in USD; use one positive VND-per-USD rate per revision with VND inputs. Save original amounts, unrounded converted lines and both totals. Draft FX changes recompute VND lines. Sum exact decimals before rounding the total to cents using ROUND_HALF_EVEN: 20.005 → 20.00, 20.015 → 20.02, 10.004 + 10.004 → 20.01.
- Lock each submitted version. Every version requires manager approval. Manager self-approval requires a nonblank comment. Rejection and Sales withdrawal require reasons and immutable history. Copy a withdrawn/rejected version into a new draft. Issue PDF from approved data. Concurrent withdrawal and approval yield one outcome. A revision supersedes only its own alternative. Stale approval cannot authorize new terms.
- Accept one issued alternative per RFQ and close others with history. For partial acceptance, issue a new version for the chosen items. Store evidence, buyer acceptance time and system recording time. Concurrent selection yields one winner. Late upload of timely evidence is allowed. Late or unverifiable acceptance requires newly approved and issued terms.

## Proposed fields

- `Quotation`: `id`, `quote_number`, `rfq_id`, `customer_id`, `owner_id`, `status`, `current_version_id?`.
- `QuotationVersion`: `id`, `quotation_id`, `revision_no`, `currency`, `incoterm`, `named_place`, `payment_terms`, `valid_until`, `freight_decimal?`, `insurance_decimal?`, `total_decimal`, `approval_state`, `issued_at?`, `pdf_object_key?`.
- `QuotationLine`: `quotation_version_id`, `product_snapshot`, `specification_snapshot`, `quantity_decimal`, `unit`, `unit_price_decimal`, `line_total_decimal`, `packaging_snapshot`.

## Proposed use cases and endpoints

- `CreateQuoteDraft`, `RecalculateQuote`, `RequestApproval`, `ApproveQuote`, `IssueQuoteVersion`, `RecordBuyerAcceptance`, `ConvertQuoteToOrder`.
- `GET/POST /api/v1/quotations`; `POST /api/v1/quotations/:id/revisions`; `POST /api/v1/quotation-versions/:id/issue`; `POST /api/v1/quotation-versions/:id/accept`.
