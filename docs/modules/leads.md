# M03 — Leads

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** CRM · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Confirmed R1 workflow and acceptance

- Manage source, interest, assignment and conversion. Route possible cross-owner duplicates to an authorized reviewer without exposing private records. Retry creates no duplicate. Link decision and reason are recorded separately from reassignment; linking grants no access.

## Purpose
Capture unqualified inquiries and convert them without losing attribution.

## Features / use cases
- Manual lead capture and optional website RFQ ingestion
- Dedup review, assignment, source/channel, next follow-up
- Convert to or link existing Customer/Contact/Opportunity

## Core data (proposed)
Lead: id, source, source_ref, buyer_hint, email, country, owner_id, stage, qualified_at, conversion_refs

## States / lifecycle (proposed)
`NEW → CONTACTED → QUALIFIED / NURTURE / DISQUALIFIED`

## Business rules and validation
- Conversion idempotent and audit-linked; never create duplicate customer on retry
- External ingestion requires rate limit and explicit authentication
- Keep original form source and payload reference without exposing sensitive text in logs

## Authorization and record scope
Sales OWN; Manager TEAM; Integration identity CREATE scoped only.

## Dependencies / integration boundaries
Customers, Contacts, Opportunities, Integrations (optional)

## Acceptance / UAT
- Repeat convert produces no duplicate records
- Unauthorized user cannot assign lead to outside team

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming and exact API contracts through the relevant task/ADR before coding.

### Functional workflow
1. Receive a potential buyer inquiry from manual entry, trade event, website or approved integration.
2. Normalize source and assign owner; deduplicate against open leads and existing customers without collapsing evidence.
3. Qualify interest (products, destination, estimated demand, next action) and convert atomically to Customer/Contact and optionally Opportunity or RFQ.
4. Reject/disqualify with reason; retain original source and conversion links.

### Proposed detailed fields
- `Lead`: `id`, `source`, `external_ref?`, `company_name?`, `contact_name?`, `email?`, `phone?`, `country_code?`, `product_interest[]`, `estimated_volume?`, `owner_id`, `status`, `qualification_notes?`, `next_follow_up_at?`, `converted_customer_id?`, `created_at`, `updated_at`.
- `LeadSourceEvent`: raw input reference/hash, received timestamp, consent metadata and processing result.

### Use cases / endpoints (proposed)
- `CreateLead`, `QualifyLead`, `AssignLead`, `DisqualifyLead`, `ConvertLead`, `ListLeads`.
- `GET/POST /api/v1/leads`; `PATCH /api/v1/leads/:id`; `POST /api/v1/leads/:id/convert`.

### UI / edge cases
- Lead inbox with status/age/owner filters, conversion wizard, duplicate suggestions, overdue follow-up banner.
- Website replays must not create duplicated leads: use `(source, external_ref)` unique when available or explicitly reviewed heuristic.

### Verification scenarios
- Retrying conversion creates one customer conversion result; no partial records on failure.
- Disqualified lead cannot convert without authorized reopening and reason.
- Origin channel and inbound payload reference remain accessible under retention policy.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.


## Delivery reference

See R1-14 in the [R1 task plan](../../plan-r1-task.md). Review remaining action and field grants before implementation.
