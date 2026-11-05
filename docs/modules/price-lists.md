# M08 — Price Lists

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Product · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Confirmed R1 workflow and acceptance

- Filter by SKU, unit, validity, currency and quantity. Show all eligible prices; preselect customer, then market, then general. Record every selection, reference amount, actor and time. Choosing another eligible reference at its listed price needs no reason. Manual prices and overrides require reasons visible to the approver.

## Purpose
Provide controlled starting prices before bespoke quotations.

## Features / use cases
- Maintain buyer/region price tiers with start/end dates
- Manage currency, UoM, MOQ and approval state
- Suggest current list price but require explicit quote confirmation

## Core data (proposed)
PriceList: id, currency, market, valid_from/to, status; PriceListItem: spec_id, min_qty, unit_price

## States / lifecycle (proposed)
`DRAFT → APPROVED → ACTIVE → EXPIRED / ARCHIVED`

## Business rules and validation
- Rank eligible prices by customer, market, then general scope. Show overlapping eligible options and retain the actual selection.
- Unit price decimal; no mixing currency without FX snapshot
- Never overwrite issued quotation from changed list price

## Authorization and record scope
Sales READ allowed prices; Manager/authorized Pricing role UPDATE/APPROVE; cost-only fields restricted.

## Dependencies / integration boundaries
Products, Product Specifications, Quotations

## Acceptance / UAT
- Expired list not silently applied
- Historical quote retains accepted price even after tier update

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming and exact API contracts through the relevant task/ADR before coding.

### Functional workflow
1. Create currency- and market-specific list with validity window and optional buyer tier/customer pricing.
2. Set prices for exact product/spec/unit basis; draft and approve effective rows according to policy.
3. At quote creation, suggest eligible effective list price and allow authorized negotiated overrides with reason.
4. Maintain list revision and pricing source for later margin analysis without retroactive repricing.

### Proposed detailed fields
- `PriceList`: `id`, `code`, `currency`, `market_country?`, `customer_id?`, `valid_from`, `valid_to?`, `status`, `approved_by?`.
- `PriceListItem`: `price_list_id`, `product_id`, `specification_id?`, `unit`, `unit_price_decimal`, `min_quantity?`, `max_quantity?`, `price_basis` (`net|gross|other`), `effective_from`, `effective_to?`.

### Use cases / endpoints (proposed)
- `CreatePriceList`, `AddPriceItem`, `ApprovePriceList`, `FindApplicablePrice`, `ExpirePriceList`.
- `GET/POST /api/v1/price-lists`; `GET /api/v1/price-lists/applicable`.

### UI / edge cases
- Price grid, version history, overlapping ranges detector and bulk import with dry run.
- Multiple eligible prices need deterministic rule or manual selection; never silently choose arbitrary lowest price.
- Currency conversion is not implicit; quote must state applied FX rate and source if conversion requested.

### Verification scenarios
- Price valid until a specific time is not applied outside the configured window/timezone.
- Price override remains visible on approved quotation; only allowed role can override below-policy floor.
- Updating list does not alter historical quote line snapshots.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.


## Delivery reference

See R1-08 in the [R1 task plan](../../plan-r1-task.md). Review remaining action and field grants before implementation.
