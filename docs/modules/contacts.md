# M02 — Contacts

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** CRM · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Confirmed R1 workflow and acceptance

- Manage recipient roles, channels, primary contacts and deactivation. Suggest duplicates using normalized email. Two people at one buyer can share email after a warning and retain distinct IDs and history. Direct lookup enforces parent scope.

## Purpose
Track people, roles and preferences at buyer companies.

## Features / use cases
- Create/edit contact under authorized customer
- Store buyer roles, preferred language/channel and commercial communication history links
- Primary procurement, invoicing and consignee contacts may differ

## Core data (proposed)
Contact: id, customer_id, name, email, phone, title, role, locale, contact_preferences, is_primary

## States / lifecycle (proposed)
`ACTIVE / INACTIVE`

## Business rules and validation
- Validate customer ownership before linking/moving contact
- Consent/channel preferences must not be inferred
- Duplicate email does not always imply same person across companies

## Authorization and record scope
Sales OWN via customer scope; Manager TEAM; Documents/Finance access limited recipient details as assigned.

## Dependencies / integration boundaries
Customers, Access Control

## Acceptance / UAT
- Cannot move contact to an inaccessible customer
- Primary contact change recorded and old orders unaffected

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming and exact API contracts through the relevant task/ADR before coding.

### Functional workflow
1. User adds named people under a customer (purchasing, logistics, finance, management), each with role, preferred channel and consent/preferences.
2. Multiple contacts can be linked to RFQs/shipments, but one may be designated primary per context; changing a primary does not delete prior correspondence.
3. User records an interaction against the contact; visibility inherits the associated customer and explicit collaboration rules.

### Proposed detailed fields
- `Contact`: `id`, `customer_id`, `first_name`, `last_name`, `display_name`, `job_title?`, `department?`, `email?`, `phone?`, `country_code?`, `preferred_language?`, `timezone?`, `status`, `owner_user_id?`, `created_at`, `updated_at`.
- `ContactChannel`: `contact_id`, `type` (`email|phone|whatsapp|kakao|line|other`), `handle`, `is_primary`, `verified_at?`.
- `ContactPreference`: allowed communication purposes, do-not-contact flag, consent/evidence metadata where legally required.

### Use cases / endpoints (proposed)
- `CreateContact`, `UpdateContact`, `SetPrimaryContact`, `DeactivateContact`, `ListCustomerContacts`, `GetContactTimeline`.
- `GET/POST /api/v1/customers/:customerId/contacts`; `GET/PATCH /api/v1/contacts/:id`.

### UI / edge cases
- Contact panel on customer details, contact profile, outbound channel shortcuts (no automatic messaging without integration approval).
- Company changes require explicit transfer and authorization; preserve previous customer relationship if business policy requires history.
- Warn on a normalized email match and allow a distinct person at the same customer to share that address.

### Verification scenarios
- Contact can be read only when parent customer is accessible; direct `/contacts/:id` cannot bypass parent scope.
- Primary contact change and deactivation retain historical RFQ references and audit trail.
- Do-not-contact preference is honored by notification/campaign adapters.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.
