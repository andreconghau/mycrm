# M04 — Opportunities

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** CRM · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Confirmed R1 workflow and acceptance

- Track owner, stage, forecast, currency, next action and loss reason. Mark WON on the first confirmed related order. Record winning order and time once. Acceptance alone and subsequent orders do not increase won counts.

## Purpose
Manage qualified potential business and forecast pipeline with accountable owners.

## Features / use cases
- Create from lead/customer/RFQ; stage and probability
- Estimate amount/currency, expected close, next action and lost reason
- Pipeline view grouped by stage/owner/team

## Core data (proposed)
Opportunity: customer_id, owner_id, stage, expected_value, currency, probability, close_date, lost_reason

## States / lifecycle (proposed)
`OPEN → NEEDS_ANALYSIS → PROPOSAL → NEGOTIATION → WON / LOST`

## Business rules and validation
- Pipeline forecast derived from authorized opportunities only
- Stage transitions preserve history; WON requires the first confirmed linked order
- Sensitive margins excluded from unprivileged dashboards

## Authorization and record scope
Sales OWN; Manager TEAM; Management read as authorized.

## Dependencies / integration boundaries
Customers, Leads, RFQs, Tasks & Activities

## Acceptance / UAT
- Won opportunity links legitimate order; missing order prevents WON
- Team-scoped counts match visible rows

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming and exact API contracts through the relevant task/ADR before coding.

### Functional workflow
1. Sales opens opportunity for a qualified buyer need; specify products, expected value/currency, target date and sales owner.
2. Move across configured sales stages; record evidence and next action at each stage.
3. Link one or more RFQs/quotations; mark WON on the first confirmed linked order, LOST with reason, or ON_HOLD.
4. Keep estimated revenue distinct from confirmed order amount and from future actual margin.

### Proposed detailed fields
- `Opportunity`: `id`, `customer_id`, `lead_id?`, `name`, `owner_id`, `team_id?`, `stage`, `probability?`, `expected_amount?`, `currency?`, `expected_close_date?`, `won_at?`, `lost_reason?`, `created_at`, `updated_at`.
- `OpportunityStageHistory`: `opportunity_id`, `from_stage`, `to_stage`, `changed_by`, `changed_at`, `reason?`.

### Use cases / endpoints (proposed)
- `CreateOpportunity`, `AdvanceOpportunityStage`, `CloseOpportunityWon`, `CloseOpportunityLost`, `ListPipeline`, `GetOpportunityDetails`.
- `GET/POST /api/v1/opportunities`; `PATCH /api/v1/opportunities/:id`; `POST /api/v1/opportunities/:id/transitions`.

### UI / edge cases
- Pipeline kanban plus list/table view; stage age, amount by currency, upcoming activities.
- Do not sum different currencies without explicitly selected FX rate/date.
- Stage probabilities are configured assumptions, never guaranteed sales forecasts.

### Verification scenarios
- Unauthorized cross-team stage update fails even from API.
- Closing LOST requires reason; WON has a confirmed order reference.
- Pipeline totals count only scoped records and label FX assumptions.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.


## Delivery reference

See R1-15 in the [R1 task plan](../../plan-r1-task.md). Review remaining action and field grants before implementation.
