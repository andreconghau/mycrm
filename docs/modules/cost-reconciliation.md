# M27 — Cost Reconciliation

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Finance · **Release:** R3 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Compare estimated vs actual order/shipment costs and explain margin variances.

## Features / use cases
- Capture cost categories and budgeted/actual items
- Allocate logistics costs across orders/shipments by explicit policy
- Calculate variance with currency/date/FX traceability

## Core data (proposed)
CostEstimate, ActualCost, CostAllocation, VarianceReport, supplier_invoice_ref

## States / lifecycle (proposed)
`ESTIMATED → REVIEWED → ACTUAL_POSTED → RECONCILED / ADJUSTED`

## Business rules and validation
- Keep estimated/actual separated and never silently overwrite posted cost
- Document allocation basis (weight, carton, shipment or fixed)
- Profit/margin not trusted until data coverage and FX policy confirmed
- Manager/Finance approvals for write-off and adjustments

## Authorization and record scope
Finance MANAGE; Management READ approved; Sales cannot see supplier-only cost by default.

## Dependencies / integration boundaries
Sales Orders, Shipments, Suppliers, Receivables

## Acceptance / UAT
- Cost rerun with same source ID is idempotent
- Read-only Sales quote page never leaks true purchase margin

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming, approval thresholds and exact contracts through the relevant task/ADR before coding.

### Functional workflow
1. Define expected cost lines from order/quotation assumptions (product cost, freight, insurance, documentation, handling).
2. Collect actual vendor charges/invoice references by shipment and cost category.
3. Reconcile expected versus actual amounts using currency-consistent conversions; flag variances requiring review.
4. Lock approved reconciliation snapshots, allow corrections through audit-backed adjustments and publish margin view to authorized roles.

### Proposed detailed fields
- `CostEstimate`: `sales_order_id`, `shipment_id?`, `cost_type`, `amount_decimal`, `currency`, `source_version`, `estimated_at`.
- `ActualCost`: `shipment_id`, `supplier_id?`, `vendor_invoice_ref?`, `cost_type`, `amount_decimal`, `currency`, `incurred_at`, `evidence_ref?`, `status`.
- `CostReconciliation`: `id`, `shipment_id`, `currency`, `fx_rate_snapshot?`, `expected_total`, `actual_total`, `variance_amount`, `status`, `reviewed_by?`.

### Use cases / endpoints (proposed)
- `RecordCostEstimate`, `ImportVendorCost`, `ReconcileShipmentCosts`, `ApproveReconciliation`, `ReverseCostEntry`.
- `GET /api/v1/shipments/:id/costs`; `POST /api/v1/shipments/:id/reconcile`.

### UI / edge cases
- By-shipment variance dashboard, line-level supporting invoices, role-restricted gross margin projection.
- Costs belong to correct commercial basis; a quote under FOB vs CIF may include different seller obligations and expected freight/insurance.
- Store FX source, effective timestamp and rounding precision; do not compare currencies directly.

### Verification scenarios
- Large freight invoice appears as variance and does not overwrite quote snapshot.
- Incorrect duplicate vendor invoice is flagged/reversed, not simply erased.
- Users without cost privilege cannot access supplier cost via report download or direct API.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.

## Phase 0 review gate

Approve allocation basis, duplicate invoice rules, FX and margin definitions; retain estimates versus immutable posted actuals.

See [review register (F07, F13)](../architecture/documentation-review.md#findings-register). All business grants remain proposed under D06; this review does not approve new business rules.

## Open decisions
- Confirm initial field requirements, approval policy and release slice with stakeholders before coding.
- Do not interpret this planning document as proof that its schema, endpoints or permissions already exist.
