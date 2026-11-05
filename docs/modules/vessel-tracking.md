# M20 — Vessel Tracking

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Export · **Release:** R2 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Capture trustworthy events and ETA/ETD history, manually or via carrier.

## Features / use cases
- Append tracking timeline per shipment and/or container
- Separate planned, estimated and verified actual milestones
- Support provider feed adapters and corrections with provenance

## Core data (proposed)
TrackingEvent: shipment_id, container_id?, event_code, occurred_at, source, source_id, received_at, supersedes_id

## States / lifecycle (proposed)
`EVENT facts immutable; verification state UNVERIFIED → VERIFIED / CORRECTED`

## Business rules and validation
- Dedup events and track provider timestamp vs ingestion timestamp
- Do not invent delivery events or mark status based on unsourced data
- Carrier corrections retain previous event reference and explain displayed current event

## Authorization and record scope
Export Ops ADD/VERIFY; integration identity APPEND; Sales/Management READ safe.

## Dependencies / integration boundaries
Shipments, Containers, Integrations

## Acceptance / UAT
- Duplicate carrier webhook produces one logical event
- Manual ETA and carrier ETA each retain source

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming, approval thresholds and exact contracts through the relevant task/ADR before coding.

### Functional workflow
1. Ingest carrier/provider events or allow manual entry with actor and evidence, linked to shipment/container.
2. Normalize provider codes into internal event catalog without discarding raw payload reference.
3. Deduplicate by provider-event ID or stable composite fingerprint; retain arrival timestamp, event timestamp, source timezone and confidence/verification.
4. Derive current milestone view from selected verified/most credible sources while preserving conflicting ETA versions and corrections.

### Proposed detailed fields
- `TrackingEvent`: `id`, `shipment_id`, `container_id?`, `normalized_code`, `raw_code?`, `event_at`, `event_timezone?`, `recorded_at`, `source_type`, `source_id?`, `source_event_id?`, `raw_payload_ref?`, `verification_state`, `supersedes_event_id?`.
- `TrackingProjection`: latest reviewed milestones, source priority and freshness; rebuildable from immutable events.

### Use cases / endpoints (proposed)
- `AppendTrackingEvent`, `VerifyTrackingEvent`, `CorrectTrackingEvent`, `GetShipmentTimeline`, `RebuildTrackingProjection`.
- `GET /api/v1/shipments/:id/tracking`; `POST /api/v1/shipments/:id/tracking-events` (authorized actor/provider).

### UI / edge cases
- Timeline with source badge, planned/estimated/actual distinction, stale feed indicator and manual correction note.
- Automatic provider synchronization is *optional* and requires confirmed API capability/contract; manual entry remains useful for R2 MVP.
- Vessel position is not synonymous with cargo delivery; never infer proof of discharge from a map position alone.

### Verification scenarios
- Retried provider webhook creates one logical event and one alert evaluation.
- Event received late but occurred earlier appears at correct timeline timestamp without losing ingestion provenance.
- Conflicting ETAs show selected source and full historical estimates.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.

## Phase 0 review gate

Manual entry remains the R2 baseline. Resolve authoritative milestone/projection ownership with M18/M19 and source precedence before automatic feeds.

See [review register (F09, F12)](../architecture/documentation-review.md#findings-register). All business grants remain proposed under D06; this review does not approve new business rules.

## Open decisions
- Confirm initial field requirements, approval policy and release slice with stakeholders before coding.
- Do not interpret this planning document as proof that its schema, endpoints or permissions already exist.
