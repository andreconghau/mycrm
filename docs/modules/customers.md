# M01 — Customers

> **Status: Core CRUD implemented; Customer 360 and file-history access pending**
> **Area:** CRM · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Confirmed R1 workflow and acceptance

- Manage buyer identities, prospect creation, duplicate review, addresses and assignments. Preserve time-bounded access to historical versions, notes and files. After handover the new owner sees all history. Former owner sees only records they handled as they existed at transfer, including search, detail and file access.

## Purpose
Manage B2B buyer organizations as the authoritative commercial account.

## Features / use cases
- Create/update/archive buyer with legal/trading names, country, addresses and identifiers
- Assign Sales owner and team; list with market-scoped search and duplicate candidates
- Preserve transfer-time snapshots for former owners and expose historical records only through explicit entitlements
- Customer 360° links to contacts, RFQs, quotations, orders, tasks and activity are deferred until those modules are implemented

## Core data
Customer: id, name, legal_name, country_code, identifiers, owner_id, team_id, status, created_at, updated_at

## States / lifecycle
`PROSPECT → ACTIVE → ON_HOLD / INACTIVE / ARCHIVED`

## Business rules and validation
- Customer cannot silently merge with another merely by name
- Blocked/archived customer cannot confirm new orders without policy
- Owner reassignment is audited; retain linked order history

## Authorization and record scope
Market membership is checked server-side before record access; a selected market is not authorization. Implemented Customer grants are Sales OWN and Manager TEAM; Admin may manage all records. Other roles, including Accountant, are denied unless a separately approved grant is added. Manager reassignment requires a reason and is limited to the manager's team. The Management read-safe grant remains deferred.

## Dependencies / integration boundaries
Access Control, Audit Log, market membership, Contacts, and the future commercial modules. Contact/RFQ/quotation/order/task/activity aggregation and history file delivery are not implemented by M01 core.

## Acceptance / UAT
- Sales A cannot GET/PATCH Sales B private customer through direct API
- Candidate duplicate is flagged for review rather than auto-merged
- Buyer archive retains past orders and quote snapshots

## Implemented API and operator setup

- `GET/POST /api/v1/customers?market=KR` — market-scoped list/create with cursor pagination, filtering, duplicate suggestions, and server-side grants.
- `GET/PATCH /api/v1/customers/:id?market=KR` — scoped detail/update with optimistic version checks.
- `POST /api/v1/customers/:id/archive?market=KR` and `POST /api/v1/customers/:id/reassign?market=KR` — audited state/owner actions requiring reasons.
- `POST /api/v1/customers/duplicate-candidates?market=KR` — scoped candidate warnings; no automatic merge.
- `GET /api/v1/me/markets` — only the authenticated user's active market memberships.
- `npm run access:operator -- seed-initial-markets --actor-email <admin>` seeds KR/South Korea/KRW, JP/Japan/JPY, and US/United States/USD. It is idempotent for matching active rows, audits inserts, and does not grant memberships.
- `npm run access:operator -- grant-customers --actor-email <admin>` installs the approved Customer grants transactionally and audits the change. Operators must still assign users through M29 market memberships. Neither command was run during implementation.

## Deferred scope

Customer 360 aggregation, contacts, cross-module commercial blocking for archived customers, history/file authorization and delivery, Management read-safe grants, and interactive editing of customer addresses/identifiers remain pending. Existing baseline tables support customer core and snapshots; no schema migration was required or applied.

## Detailed Implementation Contract (proposed)

> The implemented API above is the current contract. The remaining items below describe deferred cross-module behavior and acceptance work.

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
- [x] Domain model, state transitions and failure cases reviewed with business owner.
- [x] Existing persistence contract reused; no schema migration required for M01 core.
- [x] Use cases, server-side Zod validation, market membership and scoped authorization implemented.
- [x] Core list/create/detail/update/archive/reassign/duplicate API and customer workspace implemented.
- [x] Unit tests cover contracts, field projection, OWN scope and missing grants.
- [x] Mandatory audit events are written in the same transaction as core mutations.
- [ ] Integration tests against PostgreSQL cover transaction rollback, TEAM scope, transfer entitlements and concurrency.
- [ ] Customer 360 links, archived-customer commercial blocking, history file access, and address/identifier editing UI.
