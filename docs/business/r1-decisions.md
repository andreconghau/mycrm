# R1 Owner Decisions — Core CRM (2026-11-10)

> **Status:** Approved by the owner on 2026-11-10 for R1 documentation. Not an implementation claim; each item is built only through an approved Nimbalyst task.
> **Source:** Owner review "R1 decisions & improvements" (2026-11-09) reconciled against the repository on 2026-11-10.
> **Related:** [Permissions](permissions.md) · [Pricing and Quotations](pricing-and-quotations.md) · [Sales Workflow](sales-workflow.md) · [Security](../architecture/security.md)

This record lists approved R1 decisions and the **controlled exceptions** that intentionally differ from general principles. Treat the exceptions in §3 as approved behavior, not defects.

## 1. R1 phasing

R1 focuses on the core flow **Customer → RFQ → Quotation → Sales Order**.

| Phase | Scope |
|---|---|
| R1.0 Foundation | Scaffold, Docker Compose, migrations, CI; authentication and sessions; M29 Access Control; M31 Audit Log; shared components (§2) |
| R1.1 Master data | M01 Customers, M02 Contacts, M06 Products, M07 Specifications (versioned, EN/VI/KO names) |
| R1.2 Core flow | M08 Price Lists → M09 RFQs → M10 Quotations → M12 Sales Orders |
| R1.3 After core is stable | M03 Leads, M04 Opportunities, M05 Tasks, M11 Samples, M30 Dashboard |

Deferred beyond R1: legacy data import, email/Zalo integration, the full Accountant permission matrix, all R2/R3 modules.

## 2. Shared R1.0 components

Decimal arithmetic with ROUND_HALF_EVEN; explicit state machines; commercial snapshot helper; idempotency keys for create/approve/confirm; document numbering (`RFQ-`, `QT-`, `SO-`); standard pagination; record-scope filters inside repositories; a common error model; OpenAPI; a storage port/adapter; in-app notifications; `rate_history`.

## 3. Controlled exceptions

### 3.1 Quotation and amendment self-approval (Separation of Duties exception)

The general rule "Admin cannot automatically bypass business/financial approvals" (AGENTS.md, [Permissions](permissions.md)) still holds. Admin receives an **explicit, audited approval grant** for quotation versions and Sales Order amendments; this is not a bypass.

A Manager or Admin may approve a version they authored (`self_approved = true`). This is accepted because the company is small and accountability is established through the audit trail. Compensating controls:

- Mandatory self-approval comment: at least 10 characters after trimming; empty or whitespace-only is rejected.
- Append-only audit of every approval.
- Dashboard review filter for self-approved quotations (R1.3).

### 3.2 Editable FX reference rate

The VND-per-USD rate is a **reference field** excluded from the submitted-version and confirmed-order lock rules. Every change is recorded in an immutable `rate_history`. Changing only the rate never creates a new version and never requires re-approval.

## 4. Quotation approval

- Every submitted version requires approval by a Manager or Admin. No amount threshold.
- No cross-approval requirement; Manager/Admin may approve any quotation, including their own (§3.1).
- Sale cannot approve, including their own quotations.
- The approval record stores: creator, approver, `self_approved`, comment, timestamp, version, total amount and FX rate at approval.
- Approval binds to exactly one version. Content changes create a new version that requires new approval.
- Approval locks the version row to prevent concurrent decisions.

## 5. VND/USD exchange rate

- Entered manually per quotation and per Sales Order. Direction: **VND per 1 USD**, decimal `numeric(18,4)`, must be > 0.
- Reference only; it never changes USD totals.
- The UI shows the latest value; opening it shows history from `rate_history` (append-only): old value, new value, comment, actor, timestamp.
- Each change requires a comment. Sale may change it on their own drafts; Manager/Admin may change it in any state, including after Sales Order confirmation (no amendment required).
- The Sales Order snapshot stores the rate at confirmation; the current value comes from `rate_history`.
- A rate change sends an in-app notification to the creator, the assigned Sale and the approver.
- Deferred after R1: deviation warning when a rate differs from a reference by more than X %.
- The bank rate at payment receipt is a separate field with its own history, entered by Accountant; designed now, implemented in R3.

## 6. Rounding

Unchanged from the approved rule: sum exact (unrounded) line decimals, then apply ROUND_HALF_EVEN only to the final total in cents (10.004 + 10.004 → 20.01). Store unrounded line amounts and the rounded total. Per-line rounding was considered and **rejected**.

## 7. Evidence files (Sales Order confirmation and quotation acceptance)

- Accepted types: images, email (`.eml`, `.msg` or PDF) and signed PDF. Allowed extensions: jpg, png, webp, pdf, eml, msg. Limit 20 MB per file. The server checks the real MIME type, not only the extension.
- Quotation buyer-acceptance evidence follows the same rules.
- Default requirement: at least one file. Each file stores original name, type, MIME, size, SHA-256, uploader and upload time.
- Files are immutable. Replacement adds a new file and marks the old one `voided` with a reason.
- **Only Admin** may confirm a Sales Order without a file, with a mandatory comment stating the source (for example, buyer commitment by Telegram voice message, date and time).
- Review flags: orders confirmed with no file, and orders with image-only evidence.
- The system does not verify signatures; the SHA-256 only proves the file was not modified after storage.

## 8. Sales Order amendment and cancellation

- A confirmed Sales Order is locked (except the FX reference rate, §3.2). Changes go through an amendment request containing content, reason and buyer-consent evidence.
- Manager/Admin approves amendments under the same rules as §4 (self-approval comment ≥ 10 characters).
- Amendment states: `draft → submitted → approved / rejected`. Rejection leaves the order unchanged.
- At most **one open amendment** per Sales Order.
- Approval creates a new full-snapshot order version (v2, v3 …); the previous version becomes `superseded`. The amendment stores the before/after diff.
- Approval, new version creation and notification occur in **one transaction**.
- Cancellation is an amendment of type `cancel`.
- R2/R3 constraint: quantity cannot be reduced below the quantity already allocated to shipments.

## 9. Quotation PDF

- Language modes: **English only, English–Vietnamese, English–Korean, Vietnamese–Korean**. The first language is primary; labels are bilingual, for example "Unit Price / 단가".
- Products and Specifications carry `name_en`, `name_vi`, `name_ko` and matching descriptions. Missing translations block PDF generation and report where they are missing. No machine translation.
- Customer has `preferred_doc_language`; Sale may override per quotation.
- Translations are snapshotted into the quotation version at submission.
- Each issued PDF stores language, version, SHA-256, creator and timestamp. PDFs are issued only from approved data.
- Embed Noto Sans and Noto Sans KR. The PDF library is selected after the owner provides the template.

## 10. Teams and data scope

- One internal team (~5 people); each user belongs to one team. Team is used for **broadcast, notification and support**, not as a data scope in R1.
- R1 record scopes: Sale `OWN`; peer support through time-bounded, audited `ASSIGNED`; Manager `ALL`; Admin per explicit grants.
- The existing `teams` and `team_memberships` tables are reused (`starts_at`/`ends_at` cover join/leave; memberships are ended, never hard-deleted). A team-lead marker is a future approved migration; `users.direct_manager_id` already exists.
- Duplicate customers: warn on similar customers without exposing other owners' details; never auto-merge.
- **Implementation gap:** M01 Customers currently implements Manager `TEAM` scope. Aligning it to `ALL` requires a separate approved task.

## 11. Access and accounts

- Password hashing remains Node.js scrypt as documented in [Security](../architecture/security.md); Argon2id is not adopted.
- Initial password handover reuses `invitations`: a one-time set-password link valid for 24 hours, stored only as a token hash, delivered by Admin through a separate channel. This matches the existing operator CLI.
- Accountant is **not activated** in R1 (default deny).

## 12. Technical risk controls

| Risk | Control |
|---|---|
| No SQL foreign keys → orphan records | Existence/ownership guards in repositories; index every reference column; integration test per relationship; periodic orphan check; soft delete |
| Audit log is the only accountability evidence | Database append-only (implemented in R1-02); consider hash chain or off-site audit copy |
| Concurrent approval/edit | Row lock or optimistic locking; one open amendment per order |
| Retries create duplicates | Idempotency keys for create/approve/confirm |
| Departing staff leave orphaned ownership | Customer transfer with history; no record outside Manager visibility |
| Edited chat screenshots | Source/date/sender note; image-only flag; real MIME check; malware scanning when feasible |
| Korean/Vietnamese glyph errors in PDF | Embedded Noto fonts; layout space for bilingual labels |
| USD-only in R1 | Keep a `currency` column on every money table |
| Legacy import later | Add `legacy_ref` to master tables so import needs no schema change |

## 13. Definition of Done per module

1. Use cases with business tests (money, state, scope).
2. Negative authorization tests (out-of-scope user denied in API, export and reports).
3. Audit events for sensitive actions.
4. Schema, ERD, data dictionary and OpenAPI synchronized.
5. `lint`, `typecheck`, tests and `build` pass.

Dashboard (R1.3) applies scope before aggregation and provides filters for self-approved quotations, orders without files and orders with image-only evidence.

## 14. Not adopted or still open

- **Not adopted:** per-line rounding; Argon2id; self-managed VPS stack (Caddy/Nginx, self-run backups) — hosting remains Vercel per [context](../context.md); a new `team_members` table.
- **Open:** production database, storage, backup/restore owner, off-site copy location and key management (decide before deployment); PDF library (after template); schema alignment with the baseline design in [database design](../structure/database.md) (`notifications`, `files`, `quotation_decisions`, `order_amendments` and `order_cancellation_requests` already exist; `rate_history`, approval `self_approved`/FX capture, file voiding, review flags and the team-lead marker need approved migrations), including whether cancellation reuses `order_cancellation_requests` or becomes an `order_amendments` type; CI additions (typecheck, SCA, SAST, secret scanning).
