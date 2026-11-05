# M15 — Batches

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Supply & Quality · **Release:** R3 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Ensure traceability from sourced seafood to fulfilled order.

## Features / use cases
- Register lot with source, species/spec, production date and weight
- Link batch receipts to supplier/PO and QC results
- Allocate approved batch quantity to order/shipment

## Core data (proposed)
Batch: id, lot_number, supplier_id, product_spec_id, source_ref, produced_at, expiry, qty, uom, qc_status

## States / lifecycle (proposed)
`REGISTERED → IN_QC → AVAILABLE / ON_HOLD / REJECTED → CONSUMED / CLOSED`

## Business rules and validation
- Quantity allocation conserves available stock; corrections auditable
- Hold/reject cannot be allocated to shipment without explicit release
- Lot identity should survive repacking/relabeling lineage

## Authorization and record scope
Purchasing/QC edit; Export Ops may view allocation only; Sales limited provenance.

## Dependencies / integration boundaries
Purchase Orders, Quality Control, Inventory Integration, Shipments

## Acceptance / UAT
- Double allocation over available balance rejected
- Rejected batch cannot be consumed by spoofed API

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming, approval thresholds and exact contracts through the relevant task/ADR before coding.

### Functional workflow
1. Register seafood lot/batch from supplier receipt or production lot; record source, date, product, quantity and handling data.
2. Link material inputs to processed outputs, where applicable, preserving one-to-many and many-to-one lot genealogy.
3. Put batch on HOLD until required QC disposition; prevent unapproved allocation to export lots.
4. Execute trace-back and trace-forward for complaint or recall simulation.

### Proposed detailed fields
- `Batch`: `id`, `batch_code`, `supplier_id?`, `supplier_lot_ref?`, `product_id`, `spec_id?`, `received_at?`, `processed_at?`, `production_site?`, `origin_country?`, `quantity_decimal`, `unit`, `status`.
- `BatchGenealogy`: `input_batch_id`, `output_batch_id`, `input_qty`, `output_qty`, `process_ref?`.
- `BatchAllocation`: link sales order/shipment line and quantity with immutable origin reference.

### Use cases / endpoints (proposed)
- `RegisterBatch`, `RecordBatchTransformation`, `HoldBatch`, `ReleaseBatch`, `TraceBatchLineage`.
- `GET/POST /api/v1/batches`; `GET /api/v1/batches/:id/trace`.

### UI / edge cases
- Batch card, genealogy visualization, movement history, hold reason, genealogy export.
- Keep units and actual/nominal yields explicit; do not assume weight conserved without process losses.

### Verification scenarios
- Circular genealogy references rejected; transform output cannot point back to ancestor.
- Batch HOLD prevents shipment allocation, including through direct API.
- Trace from shipped carton/lot reaches source receipt and QC evidence.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.

## Phase 0 review gate

Resolve authoritative ReleaseBatch ownership with M16 and inventory reservation authority with M17; approve genealogy and allocation policy.

See [review register (F09, F12)](../architecture/documentation-review.md#findings-register). All business grants remain proposed under D06; this review does not approve new business rules.

## Open decisions
- Confirm initial field requirements, approval policy and release slice with stakeholders before coding.
- Do not interpret this planning document as proof that its schema, endpoints or permissions already exist.
