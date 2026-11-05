# M23 — Shipping Alerts

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Export · **Release:** R2 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Prevent missed shipment, document and payment deadlines with auditable notifications.

## Features / use cases
- Configure due event, recipient and escalation rules
- Create in-app reminders and optional email notifications
- Acknowledge, snooze or resolve alert with history

## Core data (proposed)
AlertRule, AlertInstance, NotificationAttempt, assignee_id, due_at, acknowledged_at

## States / lifecycle (proposed)
`PENDING → TRIGGERED → ACKNOWLEDGED / RESOLVED / SNOOZED`

## Business rules and validation
- Idempotent alert generation avoids repeated floods
- Use correct port/user timezone and source data freshness
- Do not send external buyer notices without policy/consent
- Outbox/worker when delivery reliability required

## Authorization and record scope
Export Ops/Documents/Finance configure relevant alerts; assignees see assigned instances.

## Dependencies / integration boundaries
Shipments, Export Documents, L/C Management, Integrations

## Acceptance / UAT
- Repeated schedule run triggers single alert per policy/window
- Late ETA source indicates stale data instead of false certainty

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming, approval thresholds and exact contracts through the relevant task/ADR before coding.

### Functional workflow
1. Configure alert rules for late booking, ETD/ETA change, document deadline, L/C expiry and missing milestone.
2. Scheduler evaluates persisted source timestamps with data freshness checks, creates idempotent alert instances and assigns accountable owner.
3. Notify through approved channels, tracking delivery attempts/retries; allow acknowledge, snooze or resolve with audit.
4. Escalate unresolved alerts by policy, avoiding unbounded repeat notifications.

### Proposed detailed fields
- `AlertRule`: `id`, `code`, `module`, `condition_config`, `severity`, `recipient_policy`, `cooldown_minutes?`, `active`.
- `AlertInstance`: `id`, `rule_id`, `entity_type`, `entity_id`, `window_key`, `triggered_at`, `due_at?`, `status`, `assignee_id?`, `acknowledged_at?`, `resolved_at?`.
- `NotificationAttempt`: `alert_id`, `channel`, `recipient`, `attempt_no`, `status`, `provider_ref?`, `next_retry_at?`.

### Use cases / endpoints (proposed)
- `EvaluateAlertRules`, `AcknowledgeAlert`, `SnoozeAlert`, `ResolveAlert`, `RetryNotificationDelivery`.
- `GET /api/v1/alerts`; `POST /api/v1/alerts/:id/acknowledge`; `POST /api/v1/alerts/:id/resolve`.

### UI / edge cases
- Alert inbox with severity, affected shipment, age, owner, resolution link and source timestamp.
- R2 may begin with in-app alerts and deterministic scheduled checks before introducing complex message broker.
- Do not notify customers automatically without approved recipients, templates and business authorization.

### Verification scenarios
- Two concurrent scheduler runs produce one alert for same `(rule, entity, window)`.
- Stale tracking feed generates **data freshness** warning rather than false definitive late-arrival alert.
- Failed email is retryable and does not change business alert to RESOLVED.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.

## Phase 0 review gate

Resolve lifecycle differences with BUS-10, escalation policy and notification delivery guarantees; distinguish alert resolution from delivery status.

See [review register (F08, F12, F13)](../architecture/documentation-review.md#findings-register). All business grants remain proposed under D06; this review does not approve new business rules.

## Open decisions
- Confirm initial field requirements, approval policy and release slice with stakeholders before coding.
- Do not interpret this planning document as proof that its schema, endpoints or permissions already exist.
