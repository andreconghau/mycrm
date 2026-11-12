---
tracker_id: "pln_mwc3rbvujptd4k"
title: "Plan for TASK: R1-09 · M10 · Quotations — Draft & Calculate"
status: "done"
priority: "medium"
module: "system"
source: "nimbalyst"
source_updated_at: "2026-11-11T13:12:35.928Z"
exported_at: "2026-11-12T00:33:15.736Z"
content_hash: 6b573a4885e747ca382d57424632cbd58f7126326a320aadf3c5ae4318d42d01
schema_version: 1
---

# TASK: R1-09 · M10 · Quotations — Draft & Calculate

**Release:** R1 — Core CRM  
**Module:** `docs/modules/quotations.md`  
**Prerequisites:** R1-07 — RFQs; R1-08 — Price Lists  
**Plan state:** Proposed for owner review. No application code or specifications changed by this plan.

## 1. Goal

Deliver the R1.2 quotation drafting and calculation slice: create independent quotation alternatives for an authorized RFQ, manage isolated draft revisions and lines, reuse M08 eligible-price selection, calculate USD totals from USD/VND inputs exactly, and preserve auditable commercial snapshots.

A saved draft may be incomplete. Submission readiness requires SKU and an approved Specification Revision for every commercial line, but this task does not implement submission, approval, PDF issuance, buyer acceptance, or Sales Order conversion. Those behaviors remain governed by the existing M10 specification and require their own approved implementation scope.

## 2. Current context and evidence

- `docs/context.md` describes the repository as a partial R1 implementation; module catalog marks M09 planned, M10 planned, M08 approved but not implemented.
- `docs/modules/quotations.md`, `docs/business/pricing-and-quotations.md`, and `docs/business/r1-decisions.md` define independent alternatives/revisions, USD output, positive VND-per-USD FX, exact aggregate rounding, approved SKU/specification requirements before submission, and broader approval/issue/acceptance rules.
- `src/lib/decimal.ts` provides BigInt-scaled decimal operations and ROUND_HALF_EVEN; reuse and inspect its supported scale/operation limits rather than adding a second arithmetic implementation.
- The database design documents baseline tables `quotations`, `quotation_versions`, `quotation_lines`, `quotation_adjustments`, `quotation_decisions`, and `rfq_acceptances`; it is a design specification, not proof those tables or contracts are deployed.
- RFQ and quotation routes currently render the R1 placeholder route; no M09/M10 application API/module implementation was found during planning.
- M08 has implementation files and migration 0005 in the shared working tree, but the documentation still says approved/not implemented and those files are uncommitted. Do not overwrite, stage, or infer accepted M08 contracts from this in-progress work.
- R1-07 and R1-08 must be completed, committed, and acceptance-verified before M10 implementation consumes their contracts. The current workspace evidence does not establish either prerequisite as complete.
- Existing unrelated working-tree changes are present. Implementation must preserve them and re-check `git status` before edits.

## 3. Decisions for this plan

Owner selections recorded during planning:

1. Mixed source currencies: retain separate original USD and original VND totals; never add amounts in different currencies. The commercial/display payable total is USD.
2. VND conversion: retain exact original amounts and FX rate, compute final aggregate from exact inputs (rational/exact arithmetic), and round only the final USD total with ROUND_HALF_EVEN. Do not let a display or persisted finite-scale converted-line approximation change the payable total.
3. Freight and insurance: include them as explicit quotation adjustments in draft calculation, reusing baseline `quotation_adjustments`; each adjustment preserves its source currency and follows the same FX and exact-total rules.
4. New revision: create an independent draft cloned from the latest revision of the same alternative. Never mutate an earlier revision or another alternative.

Already-approved rules remain: one positive VND-per-USD rate per revision, rate precision `numeric(18,4)`, USD output, exact arithmetic, aggregate rounding to cents using ROUND_HALF_EVEN, and required SKU plus approved Specification Revision at submission readiness. Any conflict with executable R1-07/R1-08 contracts must be surfaced before implementation, not silently reconciled.

## 4. Assumptions and unresolved constraints

- R1-07 and R1-08 remain hard prerequisites. If they are incomplete, implementation pauses at the dependency gate.
- Reuse existing Product, Specification snapshot, authorization, audit, pagination, error, numbering, and decimal components where verified.
- No foreign keys/REFERENCES, new decimal dependency, live FX provider, floating-point monetary arithmetic, or unapproved business grant.
- The business rule does not authorize negative quantities, prices, freight, insurance, discounts, or arbitrary numeric bounds. Validate only already-approved constraints and raise remaining policies for owner decision before implementation; do not infer from schema examples.
- Exact rational conversion is the accounting source of truth. A finite decimal field for unrounded converted lines is representational only; migration/API design must state its precision and serialization without rounding the payable result.
- Approval and issuance rules already exist in product documentation, but are excluded from this task's implementation slice.

## 5. Scope

- Create/read/update authorized quotation drafts from a valid, in-scope RFQ.
- Support multiple alternatives for one RFQ, each with its own identity and revision sequence.
- Clone a selected alternative's latest revision into a new editable draft while preserving historical revisions.
- Create and edit draft lines and freight/insurance adjustments; recalculate totals server-side.
- Integrate eligible price lookup and selection through the completed M08 contract. Preserve selected reference, listed amount/currency, actor, time, and required manual/override reason; do not create a second pricing engine.
- Preserve original source amounts/currencies, one FX snapshot per revision, exact calculation provenance, line inputs, product/specification snapshots as available, and rounded/unrounded aggregate results.
- Provide submission-readiness validation for SKU and approved immutable Specification Revision without implementing submission itself.
- Enforce record authorization, validation, optimistic concurrency, safe DTOs, consistent errors, and mandatory audit in the same transaction as business writes.
- Add REST `/api/v1` and OpenAPI 3.1 contracts only after prerequisite contracts are verified.
- Draft list/create/edit workflow using existing UI patterns; include loading, empty, error, access-denied, and success states. Use authorized searchable pickers with human-readable customer, RFQ, SKU, and specification identifiers.
- SQL-only versioned migration(s), rollback companion, indexes/checks, and synchronized approved database design artifacts if schema changes are approved.

## 6. Non-scope

Full approval/rejection/withdrawal lifecycle, version locking on submission, PDF generation/issuance/translations, buyer acceptance/evidence, quotation-to-order conversion, live FX sourcing, notifications for post-draft rate changes, price floors, and unrelated R1 modules. No changes to customer business grants or broad authorization policy.

## 7. Recommended architecture

Follow `Route → Application Use Case → Domain/Repository Port → Infrastructure Adapter`.

- Thin route adapters parse/validate requests, authenticate, authorize, invoke use cases, and map the shared error envelope.
- Application use cases own record-scope checks, draft lifecycle, transaction boundaries, concurrency preconditions, mandatory audit, and orchestration of RFQ/Product/Specification/M08 ports.
- Domain calculation accepts canonical decimal strings/decimal values and calculates from original USD/VND amounts, quantities, unit prices, FX, and adjustments without JS `number`.
- Repository adapter persists alternatives, revisions, lines, adjustments, snapshots, and calculation metadata atomically; relationships are validated in application/repository code without SQL foreign keys.
- API serializes all monetary/quantity decimals as deterministic strings.
- UI consumes the explicit API contract and never supplies authoritative totals.

## 8. Data/API/UI design tasks

1. Inspect approved baseline schema and prerequisite repository contracts; determine additive SQL-only migration needs. Verify integer identities, uniqueness per alternative/revision, draft-only mutability, indexes for RFQ/alternative/revision/owner, checks, and no FK/REFERENCES.
2. Design stable alternative identity and revision sequence. Prevent duplicate concurrent revision numbers with a database uniqueness guard and transaction/locking strategy.
3. Define line and adjustment inputs, original currency totals, exact aggregate algorithm, persisted representation of converted line values, and deterministic JSON strings. Keep display approximations out of payable calculation.
4. Define API endpoints from actual contract needs: quotation list/create/detail/update, alternative creation, revision clone, line/adjustment mutations, calculation preview, and readiness validation. Do not assume the proposed routes in module docs are approved.
5. Reuse M08 eligible-price and selection API only after it is verified/committed. Ensure quotation-line selection has a stable context link and reason policy matches M08.
6. Define draft UI workflow around RFQ/customer context, alternative/revision selection, SKU/specification pickers, price choice, FX/adjustment inputs, calculation preview, and actionable readiness errors.

## 9. Implementation breakdown

- **A. Dependency gate:** Verify R1-07 and R1-08 tracker/code/test/commit status; inspect customer/product/specification ownership and audit contracts. Record exact API/schema dependencies. Stop if prerequisites or shared working-tree changes conflict.
- **B. Domain contracts:** Define alternative/revision identity, draft transitions, clone semantics, line/adjustment DTOs, exact currency aggregation, validation, and concurrency behavior.
- **C. Persistence:** Implement approved versioned SQL migration and rollback; repository operations and transaction-level tests for alternatives, revision isolation, cloning, snapshots, and uniqueness.
- **D. Calculation:** Implement/reuse exact decimal/rational arithmetic; input parsing and limits; VND recalculation from original values; freight/insurance; half-even final total. Add unit and property/boundary tests.
- **E. Application/API/security:** Use cases, server validation, scoped authorization, M08 integration, concurrency guards, transactional mandatory audit, error mapping, OpenAPI, and negative authorization tests.
- **F. UI:** Draft list and accessible create/edit flow, relationship pickers, alternatives/revisions, line/adjustment entry, preview, readiness states, keyboard/focus and responsive behavior.
- **G. Acceptance review:** Review diff for unrelated changes, confirm schema/design synchronization decisions, run approved validation gates, and report local/database/API/browser evidence separately.

## 10. Verification and acceptance criteria

- One valid RFQ can have multiple alternatives; each has independent revisions.
- Cloning a revision creates a new draft; changes never alter its source revision or another alternative.
- Concurrent clone/update cannot create duplicate revision numbers or silently lose updates; stale writes receive a deterministic conflict response.
- Drafts can be saved incomplete; readiness fails with specific actionable errors when required SKU or approved Specification Revision is missing, invalid, retired, or out of scope.
- Every line/adjustment preserves original amount and currency; original USD and VND totals remain distinct.
- VND rate must be positive and is one `numeric(18,4)` value per revision. Changing draft FX recalculates all VND-derived results from original inputs; USD-native inputs stay unchanged.
- Exact calculation uses no JS floating point. Final-only ROUND_HALF_EVEN tests: 20.005 → 20.00; 20.015 → 20.02; 10.004 + 10.004 → 20.01.
- Mixed USD/VND source inputs never get directly summed. Freight/insurance VND adjustments recalculate with FX and USD adjustments do not.
- M08 reference selection at listed amount needs no reason; manual/override reason and grant behavior match verified M08 contract.
- Historical price, product/specification, original input, and FX snapshots are not changed by later source-data changes.
- Unauthorized cross-owner/customer/RFQ reads or writes are denied; safe DTOs expose no internal/private fields.
- Mandatory audit failure rolls back the business write. Integration tests cover transaction behavior and relationship ownership.
- API decimal serialization preserves exact strings. OpenAPI matches actual route behavior.
- Approval, PDF issue, buyer acceptance, and order conversion are explicitly NOT TESTED / NOT IMPLEMENTED by this task.

## 11. Test plan

- Decimal unit tests: exact addition/multiplication/division or rational aggregation, HALF_EVEN tie cases, scale/range guards, zero/negative FX, large inputs, repeating quotients, no line-rounding.
- Use-case tests: alternative/revision isolation, cloning, incomplete draft save, readiness failures, FX recalculation, price-selection reason rules, authorization, stale version conflicts, and safe errors.
- PostgreSQL isolated-schema integration tests: migration + down migration, uniqueness/identity/index/CHECK constraints, no foreign keys, snapshot preservation, concurrent revision clone, transaction rollback when mandatory audit fails.
- Real HTTP tests: cookie authentication, CSRF on mutations, grants and record-scope positive/negative cases, validation/error envelopes, decimal-string round trips, OpenAPI parity.
- E2E UI tests: synthetic RFQ draft flow, alternatives/revisions, manual/reference pricing, mixed-currency totals, loading/empty/error/denied states, keyboard focus and responsive layout.
- Run repository-mandated `npm run lint` and `npm run build` after application-code changes plus relevant typecheck/migration/unit/integration/API/UI checks. No tests were run as part of this planning update.

## 12. Documentation, deployment, risks, rollback

**Documentation decision required before any specification edit.** Candidate files: `docs/modules/quotations.md` (scope/API/data details), `docs/business/pricing-and-quotations.md` (confirmed Draft calculation rules), `docs/structure/database.md` (approved physical schema/migration mapping), `docs/modules/README.md` (status only after evidence). This plan itself changes only the tracker item.

Deploy only through the repository's approved migration/application release process after prerequisite and implementation approvals; no deployment is in scope here. Rollback uses the reviewed down migration and application rollback, subject to preserving any created commercial records; destructive data rollback policy must be defined before release.

Primary risks: unbounded/repeating decimal division, precision drift from materialized line fields, concurrent revision numbering, incomplete prerequisite integration, audit failure, record-scope leakage, and current uncommitted M08/shared-worktree changes. Controls: exact rational final calculation, explicit serialization/precision contract, DB uniqueness plus transactional locking, hard prerequisite gate, audit in transaction, negative authorization tests, and narrow diffs.

## 13. Acceptance of this plan

Owner approved this plan on 2026-11-11, including the recommended architecture, task boundary, and owner decisions in §3. This planning tracker item is complete. Specification edits remain pending a separate documentation decision; implementation still requires its own approval. No application implementation, migration, test run, or deployment has been authorized by this planning work.
