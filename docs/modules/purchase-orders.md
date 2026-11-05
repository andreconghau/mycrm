# M14 — Purchase Orders

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Supply & Quality · **Release:** R3 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Procure goods or processing capacity against demand.

## Features / use cases
- Draft and approve supplier orders with lines, delivery dates and currency
- Link supplier PO lines to sales-order demand and receipt references
- Track amendments/partial receipts and status

## Core data (proposed)
PurchaseOrder, PurchaseOrderLine, Supplier, receipt_ref, price snapshots

## States / lifecycle (proposed)
`DRAFT → APPROVED → SENT → PARTIALLY_RECEIVED → RECEIVED / CANCELLED`

## Business rules and validation
- PO sent version stores agreed supplier cost snapshot
- PO is not physical inventory until verified receipt
- Approval of purchases must not be performed by buyer sales role by default

## Authorization and record scope
Purchasing MANAGE; approver per policy; Finance cost read; QC linked receipt read.

## Dependencies / integration boundaries
Suppliers, Sales Orders, Batches

## Acceptance / UAT
- Partial receipt accurate without overreceipt unless approved
- Sent PO price change creates controlled amendment

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming, approval thresholds and exact contracts through the relevant task/ADR before coding.

### Functional workflow
1. Purchasing creates supplier PO from expected demand, specifying product/spec, quantity, agreed delivery and purchase terms.
2. Obtain approval for financial/quantity exception; issue versioned PO.
3. Record partial receipts and supplier confirmations; link received goods to batches and QC results.
4. Close or cancel remaining quantities with reason and audit.

### Proposed detailed fields
- `PurchaseOrder`: `id`, `po_number`, `supplier_id`, `currency`, `status`, `expected_delivery_at?`, `payment_terms?`, `approved_at?`, `version`.
- `PurchaseOrderLine`: product/spec snapshot, `ordered_qty`, `received_qty`, `unit`, `unit_cost_decimal`, `line_total_decimal`.
- `Receipt`: `po_line_id`, `batch_id?`, `received_qty`, `received_at`, `warehouse_ref?`, `received_by`.

### Use cases / endpoints (proposed)
- `CreatePurchaseOrder`, `RequestPOApproval`, `IssuePurchaseOrder`, `RecordPartialReceipt`, `ClosePurchaseOrder`.
- `GET/POST /api/v1/purchase-orders`; `POST /api/v1/purchase-orders/:id/receive`.

### UI / edge cases
- Purchase order editor with receiving progress and expected/received reconciliation.
- No assumption that purchase and sales units match: approved conversions must be explicit and auditable.

### Verification scenarios
- Two concurrent receipts cannot exceed PO remaining authorized quantity.
- Issued PO unit cost cannot be changed without controlled amendment.
- Suspended supplier cannot receive new issued PO.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.

## Phase 0 review gate

Approve purchase authority, receiving tolerances and receipt ownership; classify batch linkage by implementation slice.

See [review register (F07, F09)](../architecture/documentation-review.md#findings-register). All business grants remain proposed under D06; this review does not approve new business rules.

## Open decisions
- Confirm initial field requirements, approval policy and release slice with stakeholders before coding.
- Do not interpret this planning document as proof that its schema, endpoints or permissions already exist.
