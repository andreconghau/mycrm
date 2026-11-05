# M01 — Customers

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** CRM · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Confirmed R1 workflow and acceptance

- Manage buyer identities, prospect creation, duplicate review, addresses and assignments. Preserve time-bounded access to historical versions, notes and files. After handover the new owner sees all history. Former owner sees only records they handled as they existed at transfer, including search, detail and file access.

## Purpose
Manage B2B buyer organizations as the authoritative commercial account.

## Features / use cases
- Create/update/archive buyer with legal/trading names, country and identifiers
- Assign Sales owner and team; list with scoped search and duplicate candidates
- Show account 360°: contacts, RFQs, quotations, orders, tasks and activity

## Core data (proposed)
Customer: id, name, legal_name, country_code, identifiers, owner_id, team_id, status, created_at, updated_at

## States / lifecycle (proposed)
`PROSPECT → ACTIVE → ON_HOLD / INACTIVE / ARCHIVED`

## Business rules and validation
- Customer cannot silently merge with another merely by name
- Blocked/archived customer cannot confirm new orders without policy
- Owner reassignment is audited; retain linked order history

## Authorization and record scope
Sales OWN; Sales Manager TEAM; Management read-safe; Admin management; other roles read only when assigned.

## Dependencies / integration boundaries
Access Control, Contacts, Audit Log

## Acceptance / UAT
- Sales A cannot GET/PATCH Sales B private customer through direct API
- Candidate duplicate is flagged for review rather than auto-merged
- Buyer archive retains past orders and quote snapshots

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming and exact API contracts through the relevant task/ADR before coding.

### Functional workflow
1. Sales creates a buyer organization with country, primary contact and assigned owner; system checks candidate duplicates.
2. Sales Manager may reassign owner with a reason; ownership change propagates to *access scope*, not by rewriting all historical sales records.
3. Customer 360° shows contact timeline, RFQs, quotations, confirmed orders and outstanding follow-ups in a consistent time order.
4. Archiving blocks new commercial activity per approved policy but preserves all links, snapshots and audit evidence.

### Proposed detailed fields
- `Customer`: `id`, `code`, `legal_name`, `trade_name`, `country_code`, `preferred_language`, `preferred_currency`, `website`, `business_registration_id?`, `tax_id?`, `status`, `owner_user_id`, `team_id?`, `created_at`, `updated_at`, `version`.
- `CustomerAddress`: `id`, `customer_id`, `kind` (`billing|shipping|office`), `address_lines`, `city`, `region?`, `postal_code?`, `country_code`, `is_default`.
- `CustomerIdentifier`: `(customer_id, type, value, issuing_country?)`; normalize for duplicate suggestions rather than automatically merging.

### Use cases / endpoints (proposed)
- `CreateCustomer`, `UpdateCustomer`, `AssignCustomerOwner`, `ArchiveCustomer`, `GetCustomer360`, `ListCustomers`.
- `GET/POST /api/v1/customers`; `GET/PATCH /api/v1/customers/:id`; `POST /api/v1/customers/:id/archive` (privileged command).
- Query filters: `q`, `country`, `status`, `owner`, stable cursor/page, deterministic secondary sort by ID. Restrict server-side by owner/team scope *before* pagination.

### UI / edge cases
- Buyer list, create/edit drawer, detail tabs (`Overview`, `Contacts`, `Activities`, `RFQs`, `Quotations`, `Orders`).
- Handle different legal/trading names, duplicate names in different countries, company ownership change and concurrent edits (`version` / conflict response).

### Verification scenarios
- Two Sales users cannot enumerate each other's private buyers even through guessed IDs, search or export.
- Same identifier produces a duplicate warning; reviewer decides merge. Archived buyer still appears on historical orders.
- Two stale updates must not silently overwrite one another.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.
