# M22 — Lc Management

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Export · **Release:** R2 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Monitor Letter of Credit terms, amendments and documentary deadlines.

## Features / use cases
- Store L/C bank/amount/currency and linked sales order
- Track expiry, latest shipment, presentation period and document conditions
- Record amendments, discrepancy review and settlement evidence

## Core data (proposed)
LetterOfCredit, LCAmendment, LCCondition, LCDiscrepancy, linked_document_ids

## States / lifecycle (proposed)
`EXPECTED → RECEIVED → UNDER_REVIEW → CONFIRMED → PRESENTED → ACCEPTED / DISCREPANT → SETTLED`

## Business rules and validation
- Never assert bank acceptance or compliance automatically
- Authorized Finance/Documents reviewers required; sensitive bank fields restricted
- Amendment preserves earlier deadlines and terms; alerts recalculated with audit

## Authorization and record scope
Finance MANAGE; Documents REVIEW assigned docs; Sales READ limited dates/status.

## Dependencies / integration boundaries
Sales Orders, Export Documents, Shipping Alerts

## Acceptance / UAT
- Changing latest shipment date creates amendment history
- Sales user cannot view bank account attachments

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming, approval thresholds and exact contracts through the relevant task/ADR before coding.

### Functional workflow
1. Finance/Documents register expected or received Letter of Credit linked to buyer, bank and Sales Order.
2. Capture L/C face amount, currency, issuing/advising banks, issue/expiry dates, latest shipment date, presentation period and condition checklist.
3. Review documentary terms against order/shipment plan, record discrepancies, propose amendments and obtain authorized signoff.
4. Track document presentation, bank response, settlement/rejection with evidence; link R3 receivable when implemented.

### Proposed detailed fields
- `LetterOfCredit`: `id`, `lc_number`, `sales_order_id`, `issuing_bank`, `advising_bank?`, `beneficiary?`, `amount_decimal`, `currency`, `issue_date?`, `expiry_date`, `latest_shipment_date?`, `presentation_period_days?`, `status`, `restricted_bank_data_ref?`.
- `LCVersion` / `LCAmendment`: version, effective timestamp, prior/current terms, approval, bank document ref.
- `LCCondition`: condition type, documentary text/reference, due date/rule, evidence, reviewer and discrepancy status.

### Use cases / endpoints (proposed)
- `RegisterLC`, `ReviewLCTerms`, `ProposeLCAmendment`, `ApproveLCAmendment`, `RecordPresentation`, `RecordBankOutcome`.
- `GET/POST /api/v1/letters-of-credit`; `POST /api/v1/letters-of-credit/:id/amendments`.

### UI / edge cases
- Restricted L/C detail screen with timeline, conditions, upcoming deadlines and document links.
- Applicability of UCP 600/ISBP or another ruleset depends on actual L/C text and banking practice; the CRM tracks facts but does not certify compliance.
- Calendar-day/business-day rules and presentation deadlines require human validation; never silently calculate ambiguous banking cutoffs.

### Verification scenarios
- Amendment creates immutable history; prior dates remain retrievable.
- A Sales user sees allowed deadline/status only, not bank attachments or account details.
- Bank acceptance is recorded only from operator-entered or sourced bank evidence.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.

## Phase 0 review gate

Confirm bank terminology, evidence for acceptance/settlement, presentation cutoffs and deadline calendars; R3 receivable linkage remains optional until implemented.

See [review register (F08, F09, F13)](../architecture/documentation-review.md#findings-register). All business grants remain proposed under D06; this review does not approve new business rules.

## Open decisions
- Confirm initial field requirements, approval policy and release slice with stakeholders before coding.
- Do not interpret this planning document as proof that its schema, endpoints or permissions already exist.
