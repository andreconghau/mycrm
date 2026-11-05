# M32 — Integrations

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** System · **Release:** R2 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Connect controlled external data sources without coupling domain rules to providers.

## Features / use cases
- Inbound public website RFQ intake, optional mail and carrier adapters
- Credential/config management, mapping, webhook verification
- Retry, dead-letter/reconciliation and integration health diagnostics

## Core data (proposed)
IntegrationConnection, ExternalMapping, IntegrationEvent, OutboxEvent, IdempotencyKey, SyncRun

## States / lifecycle (proposed)
`DISABLED → ACTIVE → DEGRADED / ERROR / REVOKED`

## Business rules and validation
- Credentials encrypted and never logged or client-exposed
- Each provider gets scoped identity, replay protection and event provenance
- No promise that carrier/API, Kakao/LINE or existing public website share databases
- Paid/contracted integrations need approval and operational readiness

## Authorization and record scope
Admin/Integration Operator MANAGE; other roles READ their safe integration outcome only.

## Dependencies / integration boundaries
Access Control, Audit Log; connects to Leads, RFQs, Tracking, Alerts, Inventory

## Acceptance / UAT
- Webhook signature invalid returns no writes
- Replay produces one event and one business effect
- Worker crash retries with preserved state

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming, approval thresholds and exact contracts through the relevant task/ADR before coding.

### Functional workflow
1. Admin registers approved connector (website RFQ, email, carrier, accounting/ERP or notifications) with least-privilege credentials and callback configuration.
2. Inbound event is authenticated/verified, validated, stored with source ID and idempotency key, then mapped to a business command.
3. Outbound events use a durable outbox where reliability matters, with retry, exponential backoff, dead-letter/replay and reconciliation UI.
4. Operator monitors sync health, rate limits, last success and mapping errors; credentials can be rotated without product-domain code change.

### Proposed detailed fields
- `IntegrationConnection`: `id`, `provider`, `purpose`, `status`, `credential_ref`, `scope_config`, `created_at`, `last_success_at?`.
- `IntegrationEvent`: `id`, `connection_id`, `external_event_id?`, `payload_hash`, `received_at`, `processed_at?`, `status`, `error_code?`, `raw_payload_storage_ref?`.
- `IntegrationMapping`: local entity ID, external key, provider, version.
- `OutboxEvent`: `id`, `aggregate_type`, `aggregate_id`, `event_type`, `payload_ref`, `created_at`, `published_at?`, `attempt_count`.

### Use cases / endpoints (proposed)
- `RegisterConnection`, `RotateCredentials`, `VerifyWebhook`, `ProcessInboundEvent`, `RetryFailedSync`, `GetConnectorHealth`.
- `POST /api/v1/webhooks/:provider` (verified and rate-limited); `GET /api/v1/admin/integrations`; service-only sync commands.

### UI / edge cases
- Connector status page, last sync, failed events, mapped resources, manual replay with audit.
- Website lead/RFQ intake may be implemented independently in R1 as simple authenticated form; M32 hardens external integrations in R2.
- No assumption carrier API is available or free; check contracts, rate limits and source reliability before enabling automatic tracking.

### Verification scenarios
- Bad webhook signature and replayed request produce no duplicate business changes.
- Retry after worker crash yields one business effect; DLQ record is visible and safely replayable.
- Secrets are never exposed to client bundles, logs or admin API responses.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.

## Phase 0 review gate

Webhook path is unresolved: ADR-0002 shows /api/webhooks while this proposal uses /api/v1/webhooks. Preserve the Accepted ADR until a decision; approve per-connector credentials, contracts and recovery guarantees.

See [review register (F05, F09, F13)](../architecture/documentation-review.md#findings-register). All business grants remain proposed under D06; this review does not approve new business rules.

## Open decisions
- Confirm initial field requirements, approval policy and release slice with stakeholders before coding.
- Do not interpret this planning document as proof that its schema, endpoints or permissions already exist.
