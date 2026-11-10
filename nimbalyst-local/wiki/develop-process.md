---
id: 6902457f-331f-49f0-82f1-fbd7b86f55e0
order: 1000
---

Date → 2026-11-08
Task → R1-02 Audit Log (`tsk_mw6b36jpb923xl`)
Topic → Transactional audit history, admin-only read API and timeline
Status → Implemented locally; in-review; uncommitted
Implemented → Reused `audit_events`; added admin-only cursor-paginated API and localized read-only timeline; propagated request correlation IDs to existing HTTP auth/access audit writes; allowlisted safe diffs and redacted common sensitive patterns in reasons; added append-only trigger migration and rollback/down-migration validation; updated OpenAPI and approved module/backend/database docs.
Not Implemented → Auditor/non-admin scoped access, audit events for business modules without database writes, retention, export, external tamper evidence, concurrency/idempotency verification and authenticated admin HTTP E2E.
Decisions → R1-02 history access is admin-only. Reuse the existing audit schema. Do not deploy or apply the migration to a shared database.
Verification → PASS: `npm run lint`, `npm run typecheck`, `npm test` (28 tests), `npm run build -- --webpack`, `git diff --check`, isolated PostgreSQL migration replay/append-only/rollback/down checks. PASS: built API returned HTTP 401 without an active session. Authenticated admin HTTP access was not tested.
Risks → Reason redaction uses patterns and cannot identify every sensitive value; business audit coverage expands when business write flows exist.
Next Steps → Review and commit the uncommitted changes; keep the tracker in-review until commit.
#

Date → 2026-11-10
Task → R1 owner decisions documentation (no tracker task; session branch `task/tsk_mw8nm06oxowxdv`)
Topic → Record approved R1 decisions and controlled exceptions in project documentation
Status → Documentation updated locally; uncommitted
Implemented → Added `docs/business/r1-decisions.md`; aligned quotation/sales-order business and module docs (Manager or Admin approval, self-approval comment ≥ 10 characters, FX reference rate with history, evidence file rules, amendment lifecycle, PDF language modes); added R1 policy note to permissions; R1 phasing in context and release map; evidence upload rules in security; shared components pointer in architecture overview; EN/VI/KO and `legacy_ref` fields for products/specifications; `preferred_doc_language` and Manager `ALL` target for customers; baseline-schema mapping notes for quotations and sales orders; spec delta entry.
Not Implemented → Code, migrations, schema/ERD/data-dictionary updates, M01 Manager `ALL` grant change, `rate_history`, file voiding/review flags, cancellation-as-amendment schema decision, PDF library, CI additions, R1 task breakdown.
Decisions → Keep scrypt; keep Vercel; reuse `team_memberships`; keep final-total rounding; Admin approval is an explicit grant with a controlled SoD exception; Manager `ALL`; Accountant inactive in R1; 20 MB evidence files (jpg, png, webp, pdf, eml, msg); four PDF language modes.
Verification → PASS: `git diff --check`; relative links and anchors resolve; no `src/` or `db/` changes. NOT TESTED: `npm run lint`/`build` (documentation-only change).
Risks → Admin/Manager self-approval weakens SoD and relies on audit and review filters; `docs/structure` baseline schema (`order_cancellation_requests`, `quotation_decisions`, unbounded `numeric` FX) diverges from approved decisions until a migration task aligns it; production backup ownership remains open.
Next Steps → Owner review and commit; plan schema alignment and the M01 Manager scope change as separate tasks; prepare the R1 task breakdown.
#
