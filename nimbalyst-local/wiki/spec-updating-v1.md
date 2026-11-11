---
id: 0245df32-c23e-4948-913b-584c65660b10
order: 2024
---

## 2026-11-08 — R1-02 Audit Log implementation delta

Compared the M31 requirements in `CRM-Spec.md` (sections 4.1, 7 and 9) with the approved R1-02 task and local implementation.

### Approved implementation boundary

- For the R1-02 slice, audit history reads are restricted to the `admin` role. The optional `AUDITOR` role and scoped non-admin history reads in `CRM-Spec.md` remain proposed; no business grant or new role was approved.
- The implemented list supports actor, resource type/id, action and time filters with bounded cursor pagination. The product-level audit goals for future business actions remain unchanged; modules without database write flows are not represented by synthetic audit events.
- Export, retention and external tamper-evidence remain outside R1-02. This records implementation scope and does not remove those product-level proposals from `CRM-Spec.md`.

### Spec disposition

No change was made to `CRM-Spec.md`. The admin-only read rule is limited to this approved implementation slice; broader auditor/scoped access requires a separate business-grant decision.


## 2026-11-10 — M29 administrator account policy

Compared `CRM-Spec.md` sections 2.4, 7 and 10 with the owner's approved M29 policy request in this session (2026-11-10).

### Approved policy delta

- Admin role retains all application permissions, including managing permissions and role assignments for non-admin users.
- An Admin may edit only their own profile, limited to `displayName`; self-service email changes are excluded.
- Application endpoints cannot disable an Admin account, change any role assignment on an Admin account, or grant the Admin role. Disabling or changing an Admin role requires a manual database operation. This applies when there are multiple Admin users as well.

### Spec disposition

No change was made to `CRM-Spec.md`. This policy refines the existing Admin candidate role and the pending role/action authorization policy. M29 implementation remains pending separate implementation approval.


## 2026-11-10 — R1 owner decisions (Core CRM)

Compared `CRM-Spec.md` sections 4.1 (M10, M12, M29), 5 (W1), 7 and 10 with the owner-approved R1 decisions recorded in `docs/business/r1-decisions.md` (2026-11-10).

### Approved deltas

- **Approval authority (M10, M12, W1):** Every quotation version and every Sales Order amendment/cancellation requires Manager **or Admin** approval, with no amount threshold. Admin holds an explicit, audited approval grant; this is not an automatic bypass. Sale cannot approve.
- **Separation of Duties exception (§7.1, §10 item 2):** Manager/Admin self-approval is permitted as a controlled exception with a mandatory comment of at least 10 characters after trimming, `self_approved` recorded on the approval, append-only audit and a dashboard review filter.
- **Record scope (M29, §10 item 2):** R1 uses `OWN` (Sale), time-bounded audited `ASSIGNED` (peer support) and `ALL` (Manager). `TEAM` is not a data scope in R1; teams serve broadcast, notification and support. The `TEAM` scope remains in the model for later use.
- **FX reference rate (§7.3, §10 item 6):** VND per 1 USD, `numeric(18,4)`, > 0, entered manually per quotation and Sales Order. It is reference-only (never changes USD totals), excluded from the submitted-version and confirmed-order lock, and every change requires a comment and appends to an immutable `rate_history`. The Sales Order snapshot keeps the rate at confirmation. Rate-only changes create no version and need no re-approval. The bank rate at payment receipt is a separate R3 field.
- **Confirmation and acceptance evidence (M12, §10 item 4):** jpg, png, webp, pdf, eml, msg; 20 MB per file; server-side real MIME check; SHA-256 and uploader metadata; immutable files with `voided` replacement. Only Admin may confirm an order without a file, with a mandatory source comment. Review flags mark orders with no file or image-only evidence. Quotation acceptance evidence follows the same rules.
- **Amendments (M12):** States `draft → submitted → approved / rejected`; one open amendment per order; approval creates a full-snapshot order version and supersedes the previous one in one transaction with notifications; cancellation is an amendment of type `cancel`.
- **Quotation PDF (M10):** Language modes English only, English–Vietnamese, English–Korean and Vietnamese–Korean. Product/specification EN/VI/KO names are snapshotted at submission; missing translations block issue; no machine translation. Each issued PDF stores language, version, SHA-256, creator and timestamp.
- **Release sequencing (§3):** R1 is built in phases R1.0 Foundation, R1.1 Master data, R1.2 Price Lists/RFQs/Quotations/Sales Orders and R1.3 Leads, Opportunities, Tasks, Samples, Dashboard. All 15 R1 modules remain in R1.

### Not adopted

Per-line rounding (the final-total ROUND_HALF_EVEN rule stands), Argon2id (scrypt stands), a self-managed VPS stack (hosting remains Vercel) and a new `team_members` table (`team_memberships` is reused).

### Spec disposition

No change was made to `CRM-Spec.md`. Schema alignment with the baseline design (`docs/structure/database.md`), the Manager `ALL` change to the implemented M01 `TEAM` grant, production storage/backup decisions and the PDF library remain separate approved tasks. These deltas record approved policy, not implementation.

## 2026-11-11 — M02 Contacts create-form interaction delta

Compared `CRM-Spec.md` section 4.1 M02 with the owner-approved Contacts create-form implementation in this session (2026-11-11).

### Approved interaction delta

- The Contacts list uses a responsive right-side create drawer that can expand on desktop and occupies the full viewport on mobile.
- The parent buyer is selected through an authorized search by legal name, trading name or buyer code; users are not asked to enter an internal numeric ID.
- The R1 create form exposes contact identity, preferred language, email and phone. Other supported channel types remain outside this UI slice.
- Duplicate email/phone candidates are reviewed inside the drawer. A match is a warning, not an automatic merge; the user may explicitly create a separate Contact with independent identity and history.
- Successful creation opens the new Contact profile. The form protects dirty state, traps and restores focus, and keeps actions visible in a sticky footer.

### Spec disposition

No change was made to `CRM-Spec.md`. The interaction details refine how the existing M02 requirements are delivered without changing its business purpose, core records or duplicate-preservation rule. Broader communication preferences, roles and non-email/phone channels remain in the product specification and require separate approved UI slices.
