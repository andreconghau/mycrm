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

Date → 2026-11-11
Task → M01 customer creation form UX (no tracker task)
Topic → Responsive right-side customer creation drawer on `/vi/customers`
Status → Implemented and runtime-validated locally; uncommitted
Implemented → Replaced the inline create form with an accessible portal-backed right drawer; added desktop expand/collapse, mobile full-screen layout, three field groups, sticky actions, focus trapping and restoration, unsaved-change confirmation, in-panel duplicate review, localized error/loading states, and navigation to the created customer detail. Added focused UI tests. Preserved existing API, authorization, market scope and persistence contracts. Aligned the default `npm run dev` hostname with `APP_ORIGIN` and documented the local origin requirement.
Not Implemented → No API, database, schema, permission, cookie, JWT, session, CSRF, customer-edit or list redesign changes.
Decisions → Use an expandable right drawer; show all fields in Company information, Primary address and Identifier groups; open the customer detail after successful creation; do not update module specifications because the existing spec already calls for a create/edit drawer.
Verification → PASS: targeted ESLint; `npm test` (16 files, 63 tests); `npx next build --webpack`; `git diff --check`; Graphify update. PASS runtime: the updated `npm run dev -- --webpack` bound to `127.0.0.1`; login and retained session succeeded; `/vi/customers` and its APIs returned 200; desktop drawer, expand/collapse, mobile full-screen layout, sticky actions and unsaved-change confirmation were verified. No customer record was created during runtime validation. BLOCKED: default Turbopack build by sandbox port binding. FAIL (pre-existing, outside scope): full `npm run lint` on auth-layout raw links.
Risks → Local development is intentionally bound to loopback `127.0.0.1`; a future `APP_ORIGIN` change must keep the dev hostname aligned. Existing unrelated worktree changes remain present.
Next Steps → Review and commit only the customer drawer, dev-script, approved wiki and intentional Graphify changes.
#

Date → 2026-11-11
Task → M02 contact creation form UX (no tracker task)
Topic → Responsive contact creation drawer and reusable form UX standard
Status → Implemented and runtime-validated locally; uncommitted
Implemented → Replaced the inline Contacts create form with an accessible right drawer; added desktop expand/collapse, mobile full-screen layout, authorized buyer search by name/code, grouped identity/channel fields, sticky actions, focus trapping/restoration, unsaved-change confirmation, in-panel duplicate review, localized states and navigation to the created contact detail. Added focused UI tests, documented the form pattern in `AGENTS.md`, aligned the Contacts module document and updated Graphify.
Not Implemented → No database, API contract, authorization policy, Contact detail/list redesign, non-email/phone channel UI, deployment or commit changes. Runtime validation did not create a Contact record.
Decisions → Use authorized searchable buyer selection instead of numeric IDs; show only email and phone in this create form; open Contact detail after successful creation; use the approved drawer pattern as the default for medium/long create forms while allowing approved short-form exceptions.
Verification → PASS: targeted ESLint; `npm test -- --run` (17 files, 66 tests); `npx next build --webpack`; `git diff --check`; Graphify update. PASS runtime: login/session retained; drawer opened; buyer name/code results loaded; expanded width was 1024px in a 1200px viewport; mobile drawer matched the 390×844px viewport; dirty-close confirmation appeared. FAIL (pre-existing, outside scope): full `npm run lint` reports four raw-link errors in the auth layout. NOT TESTED: real Contact creation and duplicate matching against persisted runtime data.
Risks → The supplied Admin account receives HTTP 403 for the Contacts list while the role-based UI still exposes Create contact; authorization/UI capability alignment requires a separate task. Existing unrelated dirty-worktree changes remain present.
Next Steps → Review and commit only the approved Contacts drawer, documentation and intentional Graphify changes; separately reconcile Contacts grants with the create-button capability check.
#
