# M24 — Compliance

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Export · **Release:** R2 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Track export requirement checklists and evidence without claiming to be a legal rule engine.

## Features / use cases
- Version requirements by destination, product, Incoterm and shipping context
- Assign compliance reviews and evidence links
- Block shipment/doc approval when configured mandatory requirement is unresolved

## Core data (proposed)
ComplianceRequirement, ChecklistVersion, ComplianceReview, EvidenceReference

## States / lifecycle (proposed)
`DRAFT → VERIFIED → APPLICABLE → SATISFIED / WAIVED / NONCOMPLIANT`

## Business rules and validation
- Qualified operator validates applicable regulations and document requirements
- Waiver restricted, reasoned and audited; no automatic legal certification
- Effective-date version recorded per shipment

## Authorization and record scope
Documents/Compliance REVIEW; Export Ops VIEW; Management READ; Admin manages policy not legal correctness.

## Dependencies / integration boundaries
Export Documents, Product Specifications, Shipments

## Acceptance / UAT
- New compliance rule does not retroactively erase prior review evidence
- Unauthorized user cannot waive mandatory checklist item

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming, approval thresholds and exact contracts through the relevant task/ADR before coding.

### Functional workflow
1. Compliance owner authors requirement templates by destination market, product attributes, route and effective dates.
2. Authorized reviewer verifies the source, responsible authority and applicable shipment; publish checklist version.
3. Generate shipment requirement instances with evidence links and completion review.
4. Block configured operational/document gates for unresolved mandatory checks; allow exceptional waiver only through separate privilege and reason.

### Proposed detailed fields
- `ComplianceRuleSet`: `id`, `destination_country`, `product_scope`, `valid_from`, `valid_to?`, `version`, `status`, `source_reference?`, `reviewed_by?`.
- `ComplianceRequirement`: `rule_set_id`, `code`, `description`, `required_evidence_type?`, `deadline_rule?`, `mandatory`, `reviewer_role`.
- `ComplianceCheck`: `shipment_id`, `requirement_version_id`, `status`, `evidence_ref?`, `reviewer_id?`, `waiver_reason?`, `waived_by?`.

### Use cases / endpoints (proposed)
- `DraftRuleSet`, `VerifyRuleSet`, `GenerateShipmentChecks`, `ReviewComplianceCheck`, `WaiveComplianceCheck`.
- `GET /api/v1/shipments/:id/compliance`; `POST /api/v1/compliance/checks/:id/review`.

### UI / edge cases
- Checklist grouped by buyer market/product/shipment with source, effective date and human-reviewed status.
- No blanket assumption that all markets require exactly the same C/O, health certificates or labels; legal/compliance advisor confirms each rule.
- Historical rules remain versioned so prior shipment evidence is not retroactively invalidated.

### Verification scenarios
- User cannot create a verified rule without the required reviewer privilege.
- Missing required evidence blocks only the configured controlled gate; no silent partial approval.
- Waiver records actor, reason, timestamp and does not remove original failed check.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.

## Phase 0 review gate

Resolve requirement/checklist ownership with M21 and approve reviewers and waiver limits; do not imply company approval can waive an applicable legal obligation.

See [review register (F04, F12, F13)](../architecture/documentation-review.md#findings-register). All business grants remain proposed under D06; this review does not approve new business rules.

## Open decisions
- Confirm initial field requirements, approval policy and release slice with stakeholders before coding.
- Do not interpret this planning document as proof that its schema, endpoints or permissions already exist.
