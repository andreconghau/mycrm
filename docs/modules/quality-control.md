# M16 — Quality Control

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Supply & Quality · **Release:** R3 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Document inspections, pass/hold/reject and disposition decisions.

## Features / use cases
- Define inspection checklist/version per product/spec
- Capture measurements, evidence, inspector and deviation
- Approve release/rework/reject with traceable decision

## Core data (proposed)
QCInspection, QCResult, Disposition, document/evidence reference, batch_id

## States / lifecycle (proposed)
`PENDING → IN_PROGRESS → PASS / HOLD / FAIL → REVIEWED`

## Business rules and validation
- Submitted QC record not silently rewritten
- Separation between inspector and override reviewer where needed
- No automatic compliance assertions from incomplete samples or telemetry

## Authorization and record scope
QC inspector CREATE; QC manager REVIEW; Purchasing view; Export Ops sees release status.

## Dependencies / integration boundaries
Batches, Product Specifications, Audit Log

## Acceptance / UAT
- QC FAIL blocks allocation
- Review records identity/time/evidence and reversal history

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming, approval thresholds and exact contracts through the relevant task/ADR before coding.

### Functional workflow
1. QC creates inspection against batch, product or production stage using approved check template revision.
2. Record measurements, test methods, lab documents and nonconformity disposition.
3. Authorized QC reviewer releases/holds/rejects material with signed rationale.
4. Link certificate/inspection result to shipment export documents without implying regulatory certification.

### Proposed detailed fields
- `QCTestTemplate`: `id`, `product_scope`, `revision`, `test_definitions`, `effective_at`, `status`.
- `QCInspection`: `id`, `batch_id`, `template_revision_id`, `inspector_id`, `sampled_at`, `status`, `reviewed_by?`, `reviewed_at?`.
- `QCMeasurement`: `inspection_id`, `parameter`, `value`, `unit`, `method?`, `limit_snapshot`, `pass_fail?`, `evidence_ref?`.
- `NonConformity`: severity, corrective action, disposition and release approval trail.

### Use cases / endpoints (proposed)
- `ScheduleQC`, `RecordMeasurement`, `SubmitQCReview`, `ReleaseBatch`, `RejectBatch`, `RecordCorrectiveAction`.
- `GET/POST /api/v1/qc/inspections`; `POST /api/v1/qc/inspections/:id/review`.

### UI / edge cases
- QC queue, inspection forms, deviation worklist and history of methods/limits.
- Acceptance limits are product/market/customer-specific; no universal value baked into code.

### Verification scenarios
- Release attempt with open critical nonconformity fails under approved policy.
- Inspector cannot self-review where segregation is required.
- Changing template version does not rewrite old inspection thresholds.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.

## Phase 0 review gate

Resolve ReleaseBatch ownership with M15, canonical inspection/disposition states, reviewer separation and approved limits.

See [review register (F08, F12)](../architecture/documentation-review.md#findings-register). All business grants remain proposed under D06; this review does not approve new business rules.

## Open decisions
- Confirm initial field requirements, approval policy and release slice with stakeholders before coding.
- Do not interpret this planning document as proof that its schema, endpoints or permissions already exist.
