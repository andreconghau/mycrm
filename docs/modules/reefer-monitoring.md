# M25 — Reefer Monitoring

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Export · **Release:** R3 (optional telemetry) · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Monitor refrigerated container temperatures when trustworthy sensor/provider data exists.

## Features / use cases
- Configure requested setpoint/allowed deviation with units
- Ingest timestamped measurements and show freshness/gaps
- Flag excursions and track escalation/acknowledgement

## Core data (proposed)
ReeferConfig, TemperatureReading, ExcursionAlert, provider/source metadata

## States / lifecycle (proposed)
`NO_DATA / NORMAL / WARNING / EXCURSION / STALE (derived state)`

## Business rules and validation
- Never infer safe cargo from missing sensor readings
- Store measurement source, calibration/quality flags if provided
- No automatic product-safety decisions; QC must review exceptions
- Module may remain disabled when no telemetry is contracted

## Authorization and record scope
Export Ops/QC VIEW and ACK; provider identity APPEND measurements; config by authorized role.

## Dependencies / integration boundaries
Containers, Shipping Alerts, Integrations

## Acceptance / UAT
- Stale readings show NO_DATA/STALE rather than green compliance
- Duplicate sensor sample not double-counted

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming, approval thresholds and exact contracts through the relevant task/ADR before coding.

### Functional workflow
1. Operator enables monitoring on selected reefer container only after reliable telemetry source and permitted unit definitions exist.
2. Receive temperature samples with provider timestamps, calibration/quality flags and ingestion timestamps.
3. Compare samples with approved product-specific target range and record excursions; notify QC/Export per policy.
4. Require explicit acknowledgement and investigation; missing/stale samples are shown as UNKNOWN/STALE, never compliant by inference.

### Proposed detailed fields
- `ReeferProfile`: `container_assignment_id`, `requested_setpoint_c`, `allowed_min_c?`, `allowed_max_c?`, `monitoring_start_at`, `monitoring_end_at?`, `approved_by`.
- `TemperatureReading`: `id`, `container_assignment_id`, `sensor_id`, `provider_event_id?`, `measured_at`, `received_at`, `temperature_c`, `quality_flag?`, `source`.
- `TemperatureExcursion`: first/last outside-range time, max deviation, severity, acknowledgement, QC disposition.

### Use cases / endpoints (proposed)
- `ConfigureReeferMonitoring`, `IngestReeferReadings`, `DetectExcursion`, `AcknowledgeExcursion`, `ReviewQCDisposition`.
- `GET /api/v1/containers/:id/reefer`; service-only `POST /api/v1/integrations/reefer-readings`.

### UI / edge cases
- Time series visualization, setpoint overlay, stale/coverage badge and exception investigation detail.
- Optional R3 module should remain disabled in installations without contracted/verified sensor feed.
- Temperature alone is not proof of seafood safety; QC evaluates handling/measurement context.

### Verification scenarios
- Duplicate provider reading does not inflate sample count; out-of-order readings are placed by measured time.
- 6-hour gap (threshold configurable) shows STALE, not green/normal.
- Sensor excursion does not automatically approve or reject cargo without QC review.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.

## Phase 0 review gate

Optional R3 capability: require verified provider/coverage, approved thresholds and QC disposition rules. Example stale intervals are not approved defaults.

See [review register (F09, F13)](../architecture/documentation-review.md#findings-register). All business grants remain proposed under D06; this review does not approve new business rules.

## Open decisions
- Confirm initial field requirements, approval policy and release slice with stakeholders before coding.
- Do not interpret this planning document as proof that its schema, endpoints or permissions already exist.
