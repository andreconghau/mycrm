# M13 — Suppliers

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Supply & Quality · **Release:** R3 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Manage approved sourcing and processing partners.

## Features / use cases
- Create suppliers and approved facility/location information
- Track certification, commercial terms, contact and evaluation
- Restrict costs and source identities from unauthorized sales views

## Core data (proposed)
Supplier: id, legal_name, location, supplier_type, status, certificates, approval_history, owner

## States / lifecycle (proposed)
`PROSPECT → UNDER_REVIEW → APPROVED / SUSPENDED / ARCHIVED`

## Business rules and validation
- Do not source from suspended supplier without documented exception
- Certificate expiry requires review, not fabricated regulatory validation
- Supplier price/contract data confidential

## Authorization and record scope
Purchasing MANAGE; QC approve scope; Finance cost read; Sales normally NONE.

## Dependencies / integration boundaries
Access Control, Purchase Orders, Audit Log

## Acceptance / UAT
- Suspended supplier purchase request is blocked
- Sales buyer API never leaks supplier margin

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming, approval thresholds and exact contracts through the relevant task/ADR before coding.

### Functional workflow
1. Purchasing registers approved seafood supplier with site, categories, lead time and commercial contacts.
2. Capture onboarding review and document evidence; qualify for specific product/spec range.
3. Block purchasing from suspended supplier unless approved exception; preserve historic POs and lot traceability.

### Proposed detailed fields
- `Supplier`: `id`, `supplier_code`, `legal_name`, `country_code`, `status`, `lead_time_days?`, `payment_terms?`, `currency?`, `owner_id`, `created_at`, `updated_at`.
- `SupplierSite`: facility address, site identifier, approval status and certificates (as references with validity dates).
- `SupplierProductCapability`: supplier/product/spec association, approval scope, capacity/notes, effective dates.

### Use cases / endpoints (proposed)
- `OnboardSupplier`, `ReviewSupplier`, `ApproveSupplier`, `SuspendSupplier`, `ListSupplierCapabilities`.
- `GET/POST /api/v1/suppliers`; `POST /api/v1/suppliers/:id/approve`.

### UI / edge cases
- Supplier list, site/compliance tabs, approved product capabilities, document expiry reminders.
- Supplier price/cost must not appear in general Sales customer-facing views.

### Verification scenarios
- Suspended supplier cannot be selected for new PO; old batch lineage remains available.
- Expired certificate creates review task but does not automatically claim a legal violation.
- Sales user cannot enumerate supplier cost fields via API projections.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.

## Phase 0 review gate

Approve eligibility and suspension exceptions; reconcile unconditional blocking UAT with any explicitly approved exception path.

See [review register (F04, F08)](../architecture/documentation-review.md#findings-register). All business grants remain proposed under D06; this review does not approve new business rules.

## Open decisions
- Confirm initial field requirements, approval policy and release slice with stakeholders before coding.
- Do not interpret this planning document as proof that its schema, endpoints or permissions already exist.
