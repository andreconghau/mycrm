# M28 — Customer Feedback

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Service · **Release:** R2 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Capture buyer satisfaction, claims and post-delivery resolution.

## Features / use cases
- Record feedback linked to buyer/order/shipment/sample
- Classify complaint, evidence, owner, response deadlines and resolution
- Provide corrective action, closure and repeat-order insight

## Core data (proposed)
FeedbackCase: customer_id, order_id?, shipment_id?, category, priority, owner, evidence, status

## States / lifecycle (proposed)
`NEW → TRIAGED → INVESTIGATING → RESOLVED → CLOSED / REOPENED`

## Business rules and validation
- Claims and replacements do not automatically alter invoices/orders; governed follow-on action
- Sensitive complaints restricted to assigned owners
- Track resolution evidence/time and product/batch link when available

## Authorization and record scope
Sales OWN; Service/Manager TEAM; QC linked claims read; Management READ.

## Dependencies / integration boundaries
Customers, Sales Orders, Shipments, Batches (R3)

## Acceptance / UAT
- Claim after delivery links correct shipment
- Unauthorized user cannot read buyer complaint attachments

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming, approval thresholds and exact contracts through the relevant task/ADR before coding.

### Functional workflow
1. Sales or Service records shipment/order-related buyer feedback with channel, category, severity and supporting evidence.
2. Assign case owner, investigate against product/lot/shipping evidence, and log next steps.
3. Link corrective action to QC/Supplier modules once available; decide compensation only through approved commercial/finance rules.
4. Close with customer response and resolution evidence; optionally reopen with reason.

### Proposed detailed fields
- `CustomerFeedback`: `id`, `customer_id`, `contact_id?`, `sales_order_id?`, `shipment_id?`, `type` (`complaint|compliment|request|other`), `category`, `severity`, `received_at`, `owner_id`, `status`, `summary`.
- `FeedbackAction`: `feedback_id`, `assignee_id`, `action`, `due_at?`, `completed_at?`, `outcome?`, `evidence_ref?`.
- `FeedbackResolution`: resolution code, compensation/credit reference if approved, customer acknowledgement.

### Use cases / endpoints (proposed)
- `OpenFeedbackCase`, `AssignFeedbackCase`, `RecordInvestigation`, `ProposeResolution`, `CloseFeedbackCase`, `ReopenFeedbackCase`.
- `GET/POST /api/v1/feedback`; `POST /api/v1/feedback/:id/resolve`.

### UI / edge cases
- Feedback inbox and linked shipment detail, severity/age filters, action history.
- No automatic credit note, refund or legal admission from feedback classification alone.
- Sensitive photos and buyer communications inherit document-level authorization policy.

### Verification scenarios
- Closed case retains product/spec and shipment references after later edits.
- Complaint owner without finance role cannot issue compensation directly.
- SLA/response targets are configurable policy, not invented numeric defaults.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.

## Phase 0 review gate

Approve Service role grants, response targets and compensation handoff; later QC/batch linkage must not block the R2 case-management slice.

See [review register (F04, F09, F13)](../architecture/documentation-review.md#findings-register). All business grants remain proposed under D06; this review does not approve new business rules.

## Open decisions
- Confirm initial field requirements, approval policy and release slice with stakeholders before coding.
- Do not interpret this planning document as proof that its schema, endpoints or permissions already exist.
