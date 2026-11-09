# M31 — Audit Log

> **Status: R1-02 FOUNDATION IMPLEMENTED LOCALLY — NOT COMMITTED**
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

R1-02 confirms administrator-role-only history access. Auditor and non-admin record-scoped access remain proposed and are not enabled.

## Dependencies / integration boundaries
Access Control

## Acceptance / UAT
- Quote approval stores actor/version and reason
- Audit cannot be silently suppressed on permission change

## Original detailed implementation proposal

> This preserves the broader proposal. Only work listed in the R1-02 implementation record below is implemented; other proposed use cases remain unimplemented.

## R1-02 implementation record

- Reuses the existing `audit_events` table and indexes from the R1 schema baseline; no duplicate audit table was added.
- Existing R1-01 auth/access mutations continue to insert audit rows in their business transaction. HTTP mutation requests propagate a validated `X-Request-ID` UUID or generate a server UUID; audit diff projection uses an explicit allowlist.
- `GET /api/v1/audit-events` is administrator-role only, validates actor/resource/action/time filters, limits pages to 100 rows, and uses a stable `(occurred_at, id)` cursor. DTOs redact reason email/phone/credential patterns and project only safe diff fields.
- `/{locale}/audit-log` reads this API's repository directly on the server and renders a read-only localized timeline. No export or retention behavior is implemented.
- Migration `0002_audit_events_append_only.sql` rejects application-level UPDATE/DELETE. The down migration removes the trigger and function; it does not change event data.
- Non-admin scoped history, business module writes, retention, export and external tamper-evidence remain out of scope. The reason redaction is pattern-based and is not a substitute for an approved controlled reason vocabulary.

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
- [x] Existing persistence contract/schema and safe database indexes reused; append-only migration replay validated.
- [x] Audit list use case, server-side Zod validation, administrator-only authorization and bounded cursor pagination implemented.
- [x] Read-only UI and API adapters implemented for the approved R1 scope.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [x] Audit module, backend contract, database notes and access-control boundary updated; local tests and migration checks pass.

Concurrency/idempotency and real authenticated admin HTTP verification remain untested. Business module audit events are deferred until those write flows exist.
