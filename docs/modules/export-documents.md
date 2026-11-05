# M21 — Export Documents

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Export · **Release:** R2 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Manage secure shipment document checklists, versions and approvals.

## Features / use cases
- Generate configurable checklist from shipment/order context
- Upload, preview, review/approve documents and maintain revisions
- Track issuer, issue/expiry, cutoffs, original/copy and submission status

## Core data (proposed)
DocumentRequirement, Document, DocumentVersion, Approval, private_storage_key

## States / lifecycle (proposed)
`REQUIRED → DRAFT → UNDER_REVIEW → APPROVED → ISSUED / REJECTED / EXPIRED`

## Business rules and validation
- Checklist is a draft until export compliance expert verifies destination needs
- S3/private storage, short expiry signed URLs, access-checked downloads
- Version replaces active document but never overwrites historical object
- Scanning and size/type limits required

## Authorization and record scope
Documents role MANAGE; Export Ops UPLOAD/READ; Finance bank subset; Sales limited approved copies.

## Dependencies / integration boundaries
Shipments, Compliance, L/C Management, Shipping Alerts

## Acceptance / UAT
- Replacing PDF creates second version with reviewer history
- Unauthorized user cannot download guessed object key

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming, approval thresholds and exact contracts through the relevant task/ADR before coding.

### Functional workflow
1. For each shipment, select an approved versioned document checklist derived from customer, product, destination and trade terms.
2. Prepare/upload commercial invoice, packing list and other context-specific paperwork (e.g. B/L, C/O, health certificate) **only when applicable**.
3. Review, approve, issue or reject each document version; track document reference numbers, issuer, deadlines, originality and handover.
4. Publish approved copy to authorized parties through short-lived signed URL with audit and revocation strategy.

### Proposed detailed fields
- `DocumentRequirement`: `id`, `checklist_version_id`, `type`, `required`, `due_rule?`, `issuer_role?`, `approval_role?`.
- `ExportDocument`: `id`, `shipment_id`, `type`, `status`, `current_version_id?`, `required_by?`, `issued_at?`, `expires_at?`, `external_document_number?`.
- `DocumentVersion`: `id`, `document_id`, `revision_no`, `storage_key`, `mime_type`, `byte_size`, `sha256`, `uploaded_by`, `reviewed_by?`, `reviewed_at?`, `rejection_reason?`.

### Use cases / endpoints (proposed)
- `InitializeDocumentChecklist`, `UploadDocumentVersion`, `ReviewDocument`, `ApproveDocument`, `IssueDocument`, `GetAuthorizedDownloadUrl`.
- `GET /api/v1/shipments/:id/documents`; `POST /api/v1/documents/:id/versions`; `POST /api/v1/documents/:id/review`.

### UI / edge cases
- Shipment checklist with assignee and deadline, version history/diff metadata, missing/expired reminders.
- Use private object storage; enforce server-side authorization before signing each download; scan uploads, limit file types/sizes and never accept client-provided object paths as authority.
- Bill of Lading type (original/sea waybill/telex release), local export formalities and required certificate list are business-configured and reviewed per destination.

### Verification scenarios
- Guessing an object key yields no access; signed URL expires as configured.
- Rejected file cannot be presented as approved; previous version remains for audit.
- A new checklist version does not silently change historic fulfilled requirements.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.

## Phase 0 review gate

The combined lifecycle below is not an approved state machine: BUS-06 separates requirement/checklist state from document-file state and external acceptance. Resolve checklist ownership with M24.

See [review register (F08, F11, F12)](../architecture/documentation-review.md#findings-register). All business grants remain proposed under D06; this review does not approve new business rules.

## Open decisions
- Confirm initial field requirements, approval policy and release slice with stakeholders before coding.
- Do not interpret this planning document as proof that its schema, endpoints or permissions already exist.
