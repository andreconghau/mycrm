# M26 — Receivables

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Finance · **Release:** R3 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Track amounts owed by buyers, due dates and partial settlements.

## Features / use cases
- Create authorized receivable from commercial terms/invoice
- Record payment imports and allocate across obligations
- Report outstanding, due/overdue and adjustment history

## Core data (proposed)
Receivable, Payment, PaymentAllocation, CreditAdjustment, currency and FX snapshot

## States / lifecycle (proposed)
`DRAFT → POSTED → PARTIALLY_PAID → PAID / OVERDUE; VOID via reversal`

## Business rules and validation
- Amounts use decimal, no cross-currency allocation without FX policy
- Posting/reversal gated by Finance privileges and append history
- Provider refs unique per source to prevent double booking
- General ledger system of record must be decided before sync

## Authorization and record scope
Finance MANAGE; Management READ-approved; Sales READ limited balance when granted.

## Dependencies / integration boundaries
Sales Orders, L/C Management, Integrations

## Acceptance / UAT
- Two partial receipts reconcile to exact balance
- Retried payment does not double-post
- Sales cannot use direct API to reverse finance entry

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming, approval thresholds and exact contracts through the relevant task/ADR before coding.

### Functional workflow
1. Finance creates receivable from confirmed order and invoice/payment milestone, recording agreed due date and currency.
2. Import or manually record buyer receipts with provider/bank reference and evidence; allocate receipt to one or more receivables.
3. Show open, partially paid and overdue amounts; support credit/adjustment/reversal through authorized, audited commands.
4. Reconcile to accounting system-of-record once an integration is approved; do not present CRM projection as bank ledger.

### Proposed detailed fields
- `Receivable`: `id`, `sales_order_id`, `invoice_ref?`, `currency`, `original_amount_decimal`, `due_at`, `posted_at?`, `status`, `balance_decimal` (derived/transactional).
- `Payment`: `id`, `payer_customer_id`, `currency`, `amount_decimal`, `received_at`, `bank_reference?`, `source`, `source_event_id?`, `evidence_ref?`, `status`.
- `PaymentAllocation`: `payment_id`, `receivable_id`, `allocated_amount_decimal`, `exchange_rate_snapshot?`.
- `ReceivableAdjustment`: type, amount, reason, approver, reversal linkage.

### Use cases / endpoints (proposed)
- `PostReceivable`, `RecordPayment`, `AllocatePayment`, `ReversePayment`, `ApplyCreditAdjustment`, `GetARAgeing`.
- `GET /api/v1/receivables`; `POST /api/v1/payments`; `POST /api/v1/payments/:id/allocations`.

### UI / edge cases
- Accounts receivable ledger, ageing buckets, buyer statement, reconciliation exceptions.
- Do not silently net USD against KRW or VND; FX conversions require approved rate source/date and rounding.
- Financial posting should be immutable or reversible via compensating transaction; do not hard delete entries.

### Verification scenarios
- Two partial allocations produce exact remaining balance with decimal precision.
- Retried bank webhook records one receipt and one allocation, never double-posts.
- Sales account sees only permitted non-sensitive balance summary.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.

## Phase 0 review gate

Approve posting/FX/aging/reversal policies. OVERDUE is a derived dimension under BUS-07, not a replacement for financial posting state.

See [review register (F08, F13)](../architecture/documentation-review.md#findings-register). All business grants remain proposed under D06; this review does not approve new business rules.

## Open decisions
- Confirm initial field requirements, approval policy and release slice with stakeholders before coding.
- Do not interpret this planning document as proof that its schema, endpoints or permissions already exist.
