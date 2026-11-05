# M18 — Shipments

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Export · **Release:** R2 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Plan and execute shipment(s) for confirmed sales orders.

## Features / use cases
- Create shipping plan with port, booking, forwarder, vessel/voyage
- Track planned/actual milestone dates and assigned operator
- Split shipment, handle exceptions and link documents/containers

## Core data (proposed)
Shipment: sales_order_id, booking_ref, carrier, pol, pod, etd_estimated/actual, eta_estimated/actual, status

## States / lifecycle (proposed)
`PLANNED → BOOKED → LOADING → DEPARTED → ARRIVED → DELIVERED → CLOSED; ON_HOLD/CANCELLED exceptions`

## Business rules and validation
- Only confirmed or authorized order may start shipment
- Sum shipped/allocated quantities <= order authorized quantity
- Preserve ETD/ETA source and port timezone; no inferred vessel movements

## Authorization and record scope
Export Ops MANAGE ASSIGNED; Sales READ own orders; Documents UPDATE doc fields; Finance READ.

## Dependencies / integration boundaries
Sales Orders, Containers, Tracking, Export Documents, Audit Log

## Acceptance / UAT
- One order split into two shipments with traceable quantities
- ETA edit does not overwrite actual arrival date

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming, approval thresholds and exact contracts through the relevant task/ADR before coding.

### Functional workflow
1. Export Operations opens shipment against a confirmed Sales Order and allocates exact order-line quantities; one order may have several shipments.
2. Set origin/loading/discharge/destination ports, booking reference, forwarder, carrier, planned ETD/ETA and operator.
3. Record booking confirmation, loading progress, sailing and arrival as **sourced** milestones, separating planned/estimated/actual timestamps.
4. Close shipment only after configured operational and document requirements are met, or record authorized exception.

### Proposed detailed fields
- `Shipment`: `id`, `shipment_number`, `sales_order_id`, `booking_reference?`, `forwarder_id?`, `carrier_code?`, `pol_code?`, `pod_code?`, `final_destination?`, `vessel_name?`, `voyage_no?`, `planned_etd?`, `estimated_etd?`, `actual_etd?`, `planned_eta?`, `estimated_eta?`, `actual_eta?`, `timezone_context`, `owner_id`, `status`.
- `ShipmentAllocation`: `id`, `shipment_id`, `sales_order_line_id`, `allocated_qty`, `unit`, `confirmed_at?`.
- `ShipmentMilestone`: `shipment_id`, `type`, `value_at`, `kind` (`planned|estimated|actual`), `source`, `observed_at`.

### Use cases / endpoints (proposed)
- `PlanShipment`, `AllocateOrderLines`, `ConfirmBooking`, `RecordMilestone`, `SplitShipment`, `CloseShipment`.
- `GET/POST /api/v1/shipments`; `POST /api/v1/shipments/:id/allocate`; `POST /api/v1/shipments/:id/milestones`.

### UI / edge cases
- Shipment board: bookings, exceptions, timeline, allocated quantities, container list, document checklist.
- Distinguish ETD estimate changes from proof of actual departure; display source and last refresh time.
- Port identifiers should use controlled code catalog where available, but avoid assuming all destinations have valid seaport codes.

### Verification scenarios
- Order with three containers and partial split across two shipments is permitted; total allocated quantity never exceeds authorized order.
- Duplicate booking request retries do not duplicate shipment allocation.
- Update to estimated ETA never erases earlier estimates or verified actual timestamp.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.

## Phase 0 review gate

The singular sales_order_id proposal does not settle multi-order consolidation. Approve cardinality, tolerances, closure gates and milestone ownership before schema design.

See [review register (F09, F10, F12)](../architecture/documentation-review.md#findings-register). All business grants remain proposed under D06; this review does not approve new business rules.

## Open decisions
- Confirm initial field requirements, approval policy and release slice with stakeholders before coding.
- Do not interpret this planning document as proof that its schema, endpoints or permissions already exist.
