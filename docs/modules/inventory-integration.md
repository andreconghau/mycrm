# M17 — Inventory Integration

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Supply & Quality · **Release:** R3 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Synchronize stock positions while preserving an external inventory system as source when applicable.

## Features / use cases
- Import stock by SKU/spec/lot/location with mapping
- Detect conflicts, retry failures and reconcile counts
- Expose available/reserved/in-transit signals for shipment planning

## Core data (proposed)
InventorySnapshot, SyncJob, SKUMap, reservation_ref, provider_external_id

## States / lifecycle (proposed)
`SYNC_PENDING → SYNCED / FAILED / CONFLICT`

## Business rules and validation
- Define source-of-truth and sync direction before writeback
- Idempotent imports and reservation updates with unique external IDs
- Do not implement full WMS or assume near-real-time stock without integration SLA

## Authorization and record scope
Purchasing/Operations VIEW; Inventory integration identity narrow writes; Admin diagnostics.

## Dependencies / integration boundaries
Batches, Product Specifications, Integrations

## Acceptance / UAT
- Retry does not double-reserve stock
- Missing sync shows stale timestamp and warns user

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming, approval thresholds and exact contracts through the relevant task/ADR before coding.

### Functional workflow
1. Configure external ERP/WMS mapping for SKU, batch, warehouse and quantity units.
2. Import inventory snapshots or signed movement events into staging; validate format, completeness and sequence.
3. Reconcile source quantity versus CRM availability projection and report discrepancies.
4. Allocate/confirm reservation only through agreed system-of-record protocol; CRM must not pretend it owns stock when ERP does.

### Proposed detailed fields
- `InventorySource`: `id`, `provider`, `warehouse_code`, `sync_policy`, `status`.
- `InventorySnapshot`: `source_id`, `source_version`, `sku`, `batch_ref?`, `on_hand_qty`, `reserved_qty?`, `unit`, `observed_at`, `received_at`.
- `InventorySyncRun`: cursor, started/finished, counts, errors and reconciliation status.

### Use cases / endpoints (proposed)
- `SyncInventorySnapshot`, `ValidateInventoryMapping`, `GetAvailableStock`, `ReconcileInventory`, `ReserveStock` (only if ERP capability exists).
- `GET /api/v1/inventory/availability`; `POST /api/v1/inventory/sync` (service-only).

### UI / edge cases
- Inventory availability panel clearly labeled as-of timestamp and upstream source.
- Missing/stale feed displays UNKNOWN rather than zero inventory.
- Protect against duplicate/reordered events and negative available stock due to race.

### Verification scenarios
- Replay of inventory snapshot does not double stock.
- Unauthorized users cannot invoke manual sync or mutate upstream reservations.
- Stale source is highlighted and order promising does not use falsely current stock.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.

## Phase 0 review gate

Approve authoritative inventory source, reservation protocol, stale-data policy and reconciliation responsibilities before writeback.

See [review register (F09, F12, F13)](../architecture/documentation-review.md#findings-register). All business grants remain proposed under D06; this review does not approve new business rules.

## Open decisions
- Confirm initial field requirements, approval policy and release slice with stakeholders before coding.
- Do not interpret this planning document as proof that its schema, endpoints or permissions already exist.
