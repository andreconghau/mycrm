# M31 — Audit Log

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** System · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Confirmed R1 workflow and acceptance

- Record actor, time, action, resource/version, reason and safe diff in the business transaction. Mandatory audit failure rolls back the change. Ordinary users cannot edit events or inspect unrelated history.

## Purpose
Record sensitive business actions for traceability and incident review.

## Features / use cases
- Append structured events for owner/permission/price/status/doc/finance actions
- Provide restricted search by actor, resource, date and correlationId
- Retention/export policy and integrity monitoring

## Core data (proposed)
AuditEvent: id, actor_id, action, resource_type/id, timestamp, request_id, redacted_diff, source

## States / lifecycle (proposed)
`APPEND_ONLY (logical); retention according to legal/company policy`

## Business rules and validation
- Do not log passwords, tokens, full bank payloads or unredacted PII
- Business write and critical audit event should be transactionally coupled where possible
- Audit delete/edit prohibited for ordinary users; retention process documented

## Authorization and record scope
Admin/Auditor READ by policy; other roles see scoped history only; no normal UPDATE/DELETE.

## Dependencies / integration boundaries
Access Control

## Acceptance / UAT
- Quote approval stores actor/version and reason
- Audit cannot be silently suppressed on permission change

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming and exact API contracts through the relevant task/ADR before coding.

### Functional workflow
1. Sensitive command executes with authenticated actor, record identity, change intent and request correlation identifier.
2. In the same reliable write boundary (or transactional outbox), append immutable audit event with policy-safe before/after values or field diffs.
3. Authorized reviewer searches by entity, actor, event type and time, while preserving tamper-evident access controls.
4. Retention, export and redaction follow approved privacy/business policy; never store secrets/raw payment credentials.

### Proposed detailed fields
- `AuditEvent`: `id`, `request_id`, `actor_user_id?`, `service_identity?`, `resource`, `resource_id`, `action`, `occurred_at`, `reason?`, `before_redacted_json?`, `after_redacted_json?`, `ip_hash_or_metadata?`, `result`.
- `AuditExport`: requester, filter, purpose, created_at, expiry, access log.

### Use cases / endpoints (proposed)
- `RecordAuditEvent`, `ListAuditEvents`, `GetEntityAuditHistory`, `ExportAuditTrail`.
- `GET /api/v1/audit-events` (restricted); `GET /api/v1/entities/:type/:id/audit` (scope checked).

### UI / edge cases
- Read-only auditor timeline, event diff preview, filters and access-controlled export.
- Required for owner reassignment, quote approval, order amendment, L/C change, payment reversal, role grants and waivers.
- Avoid unconditional logging of PII, documents, full webhook payloads or credentials; make recorded diff policy explicit.

### Verification scenarios
- Business transaction cannot silently succeed with missing mandatory audit evidence.
- Ordinary Sales cannot edit/delete audit events or query company-wide private audit history.
- Audit export itself is auditable and respects retention policy.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.


## Delivery reference

See R1-02 in the [R1 task plan](../../plan-r1-task.md). Review remaining action and field grants before implementation.
