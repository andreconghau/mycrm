# BUS-09 — Roles, Permissions, Data Scope and Approval Authority

> **Status:** Draft permission matrix; management approval required before implementation  
> **Release:** R1 foundation; extended for R2/R3  
> **Related modules:** [M29 Access Control](../modules/access-control.md), [M31 Audit Log](../modules/audit-log.md), and all business modules  
> **Business owner:** Management + Department Heads (to confirm)  
> **Updated:** 2026-11-04

> **R1-01 implementation note (2026-11-07):** The confirmed application roles are `admin`, `manager`, `sale` and `accountant`. The broader candidate-role matrix below is retained as unapproved historical business-policy input and is not seeded or translated into grants. R1-01 bootstraps only M29 access-administration grants for `admin`; every CRM business resource remains default-deny.

## 1. Objective

Prevent unauthorized access and unauthorized business state changes across customer relationships, commercial pricing, shipment operations, export documents, supplier costs and finance. Authentication answers **who** the actor is; authorization answers **what action** the actor may perform **on which record and fields**, at the **current business state**.

D01 confirms a **single operating company** for R1, with multiple employees and teams. Independent tenants and a buyer portal are outside R1. The business grants below remain proposed. If multiple independent legal organizations/tenants are later introduced, a separate ADR and isolation policy are required.

## Phase 0 approval boundary

**D06:** default-deny resource/action/scope/field authorization, audit and SoD enforcement are approved mechanisms. The matrix below is **not approved production policy**. Business grants remain denied until each module’s concrete action/field matrix is signed off. Broad `M`, “safe” and “limited” entries require expansion before implementation; role bootstrap and grant authorizers remain open.

Apply [employee sessions and application authorization](../architecture/security.md). R1 Managers and Admins may approve their own quotation version only with a comment of at least 10 characters after trimming. Sales confirms accepted orders with evidence; Manager or Admin approval is required for amendments and cancellations.

> **R1 approved policy (owner, 2026-11-10):** See [R1 decisions](r1-decisions.md).
> - Record scopes used in R1: Sale `OWN`; time-bounded, audited `ASSIGNED` for peer support; Manager `ALL`. `TEAM` is not a data scope in R1; teams serve broadcast, notification and support.
> - Admin holds an **explicit, audited approval grant** for quotation versions and Sales Order amendments/cancellations, and is the only role that may confirm a Sales Order without an evidence file (source comment required). This is a granted action, not a bypass; Admin still cannot approve anything without that grant.
> - Self-approval by a Manager or Admin is a controlled Separation of Duties exception with compensating controls (mandatory comment, append-only audit, dashboard review filter). Sale cannot approve quotations.
> - Accountant is not activated in R1 (default deny).
> - These rules supersede the matching cells in the §5 proposal matrix for R1; the remaining matrix stays unapproved.

> **Admin module-access clarification (owner, 2026-11-12):** Admin receives explicit, audited grants for every R1 module whose action and field policy is approved and active. These grants use `ALL` record scope within the Admin's current market memberships and the module's approved field allowlists. This is an enumerated grant set, not an `isAdmin` bypass. It does not activate unapproved modules or add approval, payment-posting, reversal or other restricted actions beyond their separately approved policy. Credential and token secrets remain unavailable through business APIs.

## 2. Authorization model

A business permission decision should consider:

`actor + role/permission + resource + action + record scope + state/approval policy + field sensitivity`.

- **RBAC:** permissions attached to roles rather than uncontrolled `isAdmin` flags.
- **Administrator coverage:** broad module coverage is composed from explicit module grants; it does not bypass resource/action checks, current market membership, field allowlists or state/approval policy.
- **Record-level scope:** `OWN`, `TEAM`, `ASSIGNED`, `ALL` or `NONE`. `ALL` is an explicit grant, not the absence of a filter.
- **Action-level grants:** view/list/create/edit/approve/confirm/cancel/allocate/export/download/post/reverse/manage-users are distinct.
- **Field-level restrictions:** supplier cost, margin, bank account and contact personal information require narrow disclosure.
- **State/amount constraints:** an approver must have both an action grant and policy eligibility for the specific transaction/version.
- **Default deny:** new roles, resources, actions and unmapped scopes are denied unless permitted explicitly.

User interface hiding is not authorization. Every Server Action, API route, server-rendered data access and background job must apply appropriate checks.

## 3. Candidate roles

| Role | Typical responsibility |
|---|---|
| `SALES` | Own customers/leads/RFQs/quotes/orders within allocated scope |
| `SALES_MANAGER` | Team pipeline and defined commercial approvals |
| `EXPORT_OPS` | Shipping plans, container assignments, operational milestones |
| `DOCUMENTS` | Document checklist, uploads, review, submission, version history |
| `FINANCE` | L/C review, receivables, payment posting and reconciliation |
| `PROCUREMENT_QC` | Suppliers, purchase orders, batches and inspections |
| `MANAGEMENT` | Strategic reports, approved elevated actions and oversight |
| `ADMIN` | Organization-wide access to approved active module policies through explicit grants; restricted business actions remain separately granted |
| `AUDITOR` (optional) | Read-only scoped access to audit and relevant records |
| `INTEGRATION_SERVICE` | Narrow machine identity for a particular provider/operation |

One person may hold multiple roles, but conflict-of-interest and segregation-of-duties constraints still apply. Roles and memberships should be granted by named authorizer and reviewed periodically.

## 4. Access scope definitions

| Scope | Meaning | Important control |
|---|---|---|
| `NONE` | No access | Default on mismatch |
| `OWN` | Actor owns record/account/opportunity | Validate authoritative ownership server-side |
| `TEAM` | Actor's approved team can access | Team membership changes affect visibility |
| `ASSIGNED` | Actor is directly assigned to operational case/document/shipment | Can differ from Sales owner |
| `ALL` | Explicit organization-wide permission | Must be granted and audited |

Nested record scope: a Sales Order may derive visibility from its Customer/assigned Sales owner, but sensitive document/finance fields require **independent** checks. Avoid data leaks through joins, list counts, filters, exports or error details.

## 5. Initial permission matrix (proposal, not production policy)

Legend: `R` read permitted fields, `C/E` create/edit, `A` approve, `P` post, `M` manage; scope in parentheses. Blank/`—` = deny. Approval and amount thresholds must still be satisfied.

| Resource / action | Sales | Sales Mgr | Export Ops | Documents | Finance | Procurement/QC | Mgmt | Admin |
|---|---|---|---|---|---|---|---|---|
| Customers/contacts read | R(OWN) | R(TEAM) | R(ASSIGNED-safe) | R(ASSIGNED-safe) | R(ASSIGNED-safe) | — | R(ALL-safe) | M(ALL) |
| Customers/contacts edit | C/E(OWN) | C/E(TEAM) | — | — | — | — | — | M(ALL) |
| Leads/opportunities/tasks | C/E(OWN) | C/E(TEAM) | R(ASSIGNED task) | R(ASSIGNED task) | — | — | R(ALL-safe) | M(ALL) |
| RFQs | C/E(OWN) | C/E(TEAM) | R(ASSIGNED-safe) | — | — | — | R(ALL-safe) | M(ALL) |
| Quotation draft/issue | C/E(OWN) | C/E(TEAM) | — | — | R(limited) | — | R(ALL-safe) | M(ALL, not approval) |
| Quotation version approval | — | A(TEAM; comment required on self-approval) | — | — | — | — | — | — |
| Sales Order draft/confirm | C/E(assigned; confirm with evidence) | R(TEAM) | R(ASSIGNED-safe) | R(ASSIGNED-safe) | R(assigned financial fields) | — | R(ALL-safe) | — |
| Shipment/container write | R(OWN-linked) | R(TEAM-linked) | C/E(ASSIGNED) | E(doc fields only) | R(safe) | R(affected lots) | R(ALL-safe) | M(ALL, not sign-off) |
| Document upload/review | R(OWN-safe) | R(TEAM-safe) | C(ASSIGNED) | C/E/A(ASSIGNED + policy) | R/A(bank documents per policy) | R(QC subset) | R(safe) | M(not sign-off) |
| L/C and bank detail | — | R(limited) | R(assigned-safe) | R(assigned requirements) | C/E/A(assigned) | — | R(approved) | — |
| Receivable/payment posting | — | — | — | — | P / reversal by separate grant | — | R(approved) | — |
| Supplier costs / margins | — | R(policy-limited) | — | — | R(ALL financial) | R(assigned procurement) | R(approved) | — |
| Users/roles/permission grants | — | — | — | — | — | — | A(policy) | M(ALL) |
| Audit log read | R(OWN-safe) | R(TEAM-safe) | R(ASSIGNED-safe) | R(ASSIGNED-safe) | R(finance scope) | R(QC scope) | R(ALL-approved) | R(system scope) |

**Important:** `Admin` is not automatically a business super-approver. Bootstrap support/emergency privileges require logged and controlled break-glass procedures.

## 6. Segregation of duties (SoD)

| Sensitive operation | Separation rule to confirm |
|---|---|
| Quotation approval | Every version requires a Manager or Admin (explicit grant). Self-approval by its author requires a recorded comment of at least 10 characters; approved R1 SoD exception, see [R1 decisions §3.1](r1-decisions.md#31-quotation-and-amendment-self-approval-separation-of-duties-exception). |
| Sales Order confirmation | Assigned Sales confirms with evidence; only Admin may confirm without a file (source comment required). Notify direct manager and quotation approver in CRM. Manager or Admin approval governs later amendments and cancellations. |
| Supplier approval and purchase-order approval | Distinct responsibilities where risk/policy warrants |
| QC hold release | Cannot be granted by ordinary Sales or by changing status manually |
| Payment write-off/reversal | Separate right, independent review and durable correction trail |
| Role elevation | Identity administrator cannot silently self-elevate to financial approver |
| Document acceptance | Document reviewer cannot claim bank/authority acceptance without external evidence |

SoD constraints apply even to users holding multiple roles and to background automation. Machine accounts should not be able to approve human-controlled business events.

## 7. Sensitive field classes

| Classification | Examples | Expected handling |
|---|---|---|
| Public/Internal | Non-sensitive catalog, high-level shipment milestones | Read by approved business scope |
| Restricted Commercial | Supplier costs, margins, pricing floors, negotiated exceptions | Field-level restricted DTO/export |
| Restricted Finance | Bank accounts, remittances, L/C details, debt and write-offs | Finance/approved oversight only |
| Personal/Confidential | Contact emails/phones, personal IDs, uploaded customer files | Minimal necessary access, purpose/retention rules |
| Security Secret | Tokens, API credentials, password material | Never expose via business UI/API/logs |

Database query scoping and API projections must both be enforced. A hidden button or frontend data mask is insufficient if the server returns raw sensitive fields.

## 8. Audit and access review

High-value events include: login/security anomalies, role grant/revoke, record transfer/merge, quote approval/rejection, order amendment, shipment cancellation, document release, L/C updates, QC release, payment postings/corrections, export/download of sensitive data, and use of break-glass access.

Minimum audit dimensions: actor identity, action, resource ID/type, timestamp, before/after business-relevant changes or safe diff, reason/evidence, correlation/request ID and source (human/integration). Never log passwords, secrets or raw bank credentials. Audit events should be resistant to silent editing.

## 9. Authorization test matrix

1. Sales A cannot retrieve Sales B's `OWN` customer through direct URL, query parameter or bulk export.
2. Sales Manager can access own team only; former team membership is not a permanent grant.
3. Export Ops can record shipment events but cannot change Sales Order prices.
4. Documents can upload certificates but cannot post customer payments.
5. Finance can post a payment but not bypass required reversal/write-off approval.
6. Admin can manage identities but cannot self-approve a commercial exception without explicit business grant.
7. A user with multiple roles cannot self-approve when SoD policy forbids it.
8. Customer-safe shipment DTO does not include bank, supplier cost, internal risk note or sensitive attachments.
9. Background integration cannot perform UI-only administrator actions.
10. Missing role/scope/action policy results in denial with safely logged reason.

## 10. Open decisions

- [ ] Final role list, departmental ownership and cross-team access policy.
- [ ] Approval threshold amounts, currencies, delegated authority and conflict-of-interest constraints.
- [ ] Record owner rules for Customers, Orders, Shipments and Docs.
- [ ] Manager view of margins, Finance view of customer contact information.
- [ ] Sensitive data export controls, masking, retention and audit-review schedule.
- [ ] Temporary access/break-glass approval and periodic recertification.
- [ ] Any future multi-organization or external customer-portal access requires a new decision; D01 confirms both are outside R1.

## 11. Cross references

[Customer Lifecycle](customer-lifecycle.md) · [Sales Workflow](sales-workflow.md) · [Export Documents](export-documents.md) · [Finance Workflow](finance-workflow.md) · [Security Architecture](../architecture/security.md) · [M29 Access Control](../modules/access-control.md)
