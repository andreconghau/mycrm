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
