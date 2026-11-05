# M19 — Containers

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Export · **Release:** R2 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Track container assignments, seals and load details per shipment.

## Features / use cases
- Add one or more containers with number/type/seal
- Track loading, gate-in and departure relevant to each container
- Store reefer setpoint and inspections when applicable

## Core data (proposed)
ContainerAssignment: shipment_id, container_number, type, seal_number, load_qty, setpoint, status

## States / lifecycle (proposed)
`ASSIGNED → LOADED → GATE_IN → ON_BOARD → DISCHARGED → RELEASED`

## Business rules and validation
- Container identifier format/check-digit validation where applicable and verified
- Do not impose maximum two containers
- Container must belong to authorized shipment; reassignment audited

## Authorization and record scope
Export Ops MANAGE; Sales READ limited; Documents READ relevant number/seal.

## Dependencies / integration boundaries
Shipments, Vessel Tracking, Reefer Monitoring

## Acceptance / UAT
- Three containers accepted for a large shipment
- Same shipment/container duplicate assignment rejected

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming, approval thresholds and exact contracts through the relevant task/ADR before coding.

### Functional workflow
1. Export operator assigns containers to an existing shipment and records size/type, equipment ID, seal, load plan and settings.
2. Record loading weights/quantities and verified seal/number at stuffing; capture events like gate-in, on-board and discharge.
3. For reefer units, store requested temperature setpoint but mark telemetry as unavailable until an actual provider exists.
4. Control reassignment to another shipment with reversal/history and quantity reconciliation.

### Proposed detailed fields
- `ContainerAssignment`: `id`, `shipment_id`, `container_number`, `container_type`, `seal_number?`, `seal_verified_at?`, `gross_weight_kg?`, `net_cargo_weight_kg?`, `temperature_setpoint_c?`, `ventilation_setting?`, `status`, `assigned_at`, `released_at?`.
- `ContainerLoadLine`: `container_id`, `sales_order_line_id`, `product_snapshot`, `loaded_qty`, `unit`, `batch_id?` (R3).
- `ContainerEvent`: event code, timestamp, source, actor, evidence.

### Use cases / endpoints (proposed)
- `AssignContainer`, `UpdateContainerSeal`, `RecordContainerLoading`, `RecordContainerEvent`, `ReassignContainer`.
- `GET/POST /api/v1/shipments/:shipmentId/containers`; `PATCH /api/v1/containers/:id`.

### UI / edge cases
- One shipment may have 0..N containers; never hardcode two-container limit.
- ISO 6346 check digit can be supported for standard freight container IDs; manually flag and review exceptional equipment rather than blindly reject all cases.
- Loaded weights should be validated against operational rules/equipment limits supplied by logistics team, not guessed constants.

### Verification scenarios
- Same container cannot have overlapping active assignments without a documented legitimate exception.
- Unauthorized user cannot edit seal after verified gate-in without controlled correction.
- Container remains traceable in prior shipment after reassignment/cancellation.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.

## Phase 0 review gate

M25 reefer telemetry is an optional R3 extension, not a hard R2 prerequisite. Approve active-assignment exceptions, loading reconciliation and event ownership.

See [review register (F09, F12)](../architecture/documentation-review.md#findings-register). All business grants remain proposed under D06; this review does not approve new business rules.

## Open decisions
- Confirm initial field requirements, approval policy and release slice with stakeholders before coding.
- Do not interpret this planning document as proof that its schema, endpoints or permissions already exist.
