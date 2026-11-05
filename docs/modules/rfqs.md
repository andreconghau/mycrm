# M09 — Rfqs

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Sales · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Confirmed R1 workflow and acceptance

- Require a customer and sales owner. Allow prospect creation without a lead. Capture free-text buyer requirements and deadline before SKU mapping. The original requested specification and the offered specification remain distinguishable. Multiple alternatives may originate from one RFQ.

## Purpose
Handle buyer requests with product-level scope and an accountable due date.

## Features / use cases
- Capture inbound/manual RFQ with multiple product lines and attachments
- Assign owner, priority, status and need-by date
- Convert RFQ into one or multiple versioned quotations

## Core data (proposed)
RFQ: customer_id, contact_id, source, due_at, status, owner_id; RFQLine: spec_snapshot, quantity, uom, destination

## States / lifecycle (proposed)
`NEW → IN_REVIEW → QUOTED → CLOSED / CANCELLED`

## Business rules and validation
- Require customer/contact access; no unsourced implicit buyer creation
- RFQ line preserves original buyer requested specification and comments
- Retries and duplicate external source IDs do not duplicate inquiries

## Authorization and record scope
Sales OWN; Manager TEAM; Integration CREATE only via authenticated intake.

## Dependencies / integration boundaries
Customers, Contacts, Product Specifications, Quotations

## Acceptance / UAT
- Multiple RFQs from same buyer remain distinct
- Unauthorized team cannot export RFQ attachments
- Duplicate website payload creates at most one RFQ

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming and exact API contracts through the relevant task/ADR before coding.

### Functional workflow
1. Receive customer Request for Quotation via manual entry or approved inbox/web intake; link buyer, contact, source, expected reply date.
2. Add requested product lines with grades, package, destination, volume, temperature requirements and attachments.
3. Sales clarifies missing information, assigns product owners and generates one or more commercial quotations.
4. Close RFQ as QUOTED, CANCELLED or LOST with reason; retain quote relationships.

### Proposed detailed fields
- `RFQ`: `id`, `rfq_number`, `customer_id`, `contact_id?`, `source`, `external_message_ref?`, `received_at`, `response_due_at?`, `owner_id`, `status`, `destination_country?`, `port_of_destination?`, `notes?`.
- `RFQLine`: `id`, `rfq_id`, `product_id?`, `free_text_request?`, `spec_requirements_json`, `requested_quantity`, `quantity_unit`, `target_price?`, `currency?`.

### Use cases / endpoints (proposed)
- `CreateRFQ`, `AddRFQLine`, `RequestRFQClarification`, `AssignRFQ`, `MarkRFQQuoted`, `CloseRFQ`.
- `GET/POST /api/v1/rfqs`; `GET/PATCH /api/v1/rfqs/:id`; `POST /api/v1/rfqs/:id/quotations`.

### UI / edge cases
- RFQ inbox with due-soon, incomplete-spec flags, quick quote creation.
- Multiple quotation versions may respond to one RFQ; RFQ amount is not an invoice/receivable.
- Input email attachments must be scanned and access-checked before display.

### Verification scenarios
- Incomplete quantity/unit or unknown product can save as DRAFT but not be quoted without permitted clarification.
- Direct RFQ API respects customer owner/team scope; cross-team leakage rejected.
- Duplicated inbound reference does not create a second RFQ.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.
