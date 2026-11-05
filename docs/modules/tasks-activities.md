# M05 — Tasks Activities

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** CRM · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Confirmed R1 workflow and acceptance

- Assign, reschedule and complete follow-ups. Preserve call, meeting and communication history. Overdue derives from due time and state. Task assignment does not grant parent access; earlier activities remain intact.

## Purpose
Provide follow-ups and an audit-friendly interaction timeline.

## Features / use cases
- Create task, due date, assignee, priority and reminders
- Link tasks and notes to buyer, lead, opportunity, RFQ or shipment
- Record call/meeting/email summary with owner and timestamps

## Core data (proposed)
Task: id, entity_ref, assignee_id, due_at, state, priority; Activity: actor, kind, note, happened_at

## States / lifecycle (proposed)
`OPEN → IN_PROGRESS → DONE / CANCELLED / OVERDUE-derived`

## Business rules and validation
- Overdue is derived from time and state rather than arbitrary write
- A task cannot grant access to its parent record
- Restrict note visibility and prevent log injection/unsafe HTML

## Authorization and record scope
Assignee or team scope; parent record authorization required.

## Dependencies / integration boundaries
Access Control, Customers, Opportunities

## Acceptance / UAT
- A user assigned a reminder cannot view an unrelated restricted parent
- Deadline uses actor timezone correctly

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming and exact API contracts through the relevant task/ADR before coding.

### Functional workflow
1. Create action item from customer, lead, opportunity, RFQ, quotation or order, with owner, due time and priority.
2. User completes, reschedules or delegates task; reminders are triggered by persisted due date and policy.
3. Record calls/meetings/emails as timestamped activities; links preserve actor, related entity and outcome.
4. Convert activity follow-up into a new task without mutating earlier activity evidence.

### Proposed detailed fields
- `CrmTask`: `id`, `subject`, `description?`, `assignee_id`, `created_by`, `priority`, `due_at?`, `status`, `related_type`, `related_id`, `completed_at?`, `created_at`, `updated_at`.
- `Activity`: `id`, `type`, `summary`, `occurred_at`, `actor_id`, `related_type`, `related_id`, `visibility`, `external_message_ref?`.
- `TaskReminder`: task reference, scheduled time, delivery status and dedup key; separate from Nimbalyst development tasks.

### Use cases / endpoints (proposed)
- `CreateCrmTask`, `AssignTask`, `CompleteTask`, `RescheduleTask`, `RecordActivity`, `GetTimeline`.
- `GET/POST /api/v1/tasks`; `PATCH /api/v1/tasks/:id`; `GET/POST /api/v1/activities`.

### UI / edge cases
- My tasks / Team tasks / Calendar views, overdue indicators, activity timeline on related records.
- CRM customer tasks are **business data**; they are not the repository development tracker in `nimbalyst-local/tracker`.
- Entity deletion/archive must not produce orphaned visible activities.

### Verification scenarios
- Two reminder scheduler executions produce a single logical reminder per task/window.
- Assignee cannot read hidden customer details through a task subject/link.
- Task completes once and retains completion actor/time; updates audited.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.
