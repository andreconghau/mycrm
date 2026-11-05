# M07 — Product Specifications

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Product · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Confirmed R1 workflow and acceptance

- Version SKU grades, processing, weights, packaging and technical files. Capture the offered version at submission. Changes to the catalog never alter an earlier offer or PDF.

## Purpose
Define exact product grades, processing, packaging and quantity/weight basis.

## Features / use cases
- Maintain grade/size, treatment, frozen form, packaging, net/gross weight and unit
- Record MOQ, labels/certificates and buyer-specific spec notes
- Validate compatible product/spec combinations

## Core data (proposed)
ProductSpec: product_id, grade, processing, size_range, packing_type, net_weight, gross_weight, uom, moq, revision

## States / lifecycle (proposed)
`DRAFT → APPROVED → ARCHIVED`

## Business rules and validation
- Use consistent UoM conversion with explicit pack weights
- Spec revision is immutable once referenced by issued quote unless cloned
- Buyer-specific customization linked without overwriting standard spec

## Authorization and record scope
Sales read; Product/Purchasing/QC specialists edit; approval by configured role.

## Dependencies / integration boundaries
Products

## Acceptance / UAT
- 10 cartons with specified net kg/carton produces correct total weight
- Wrong product/spec combination rejected

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming and exact API contracts through the relevant task/ADR before coding.

### Functional workflow
1. Define a versioned specification tied to product and intended buyer/market where necessary.
2. Record grade/size, processing, glazing, packaging, storage temperature and label requirements; review by authorized owner.
3. Attach controlled specification PDF/image and translate approved market-facing text.
4. Quotation/Order references an exact approved specification revision rather than the mutable current draft.

### Proposed detailed fields
- `ProductSpecification`: `id`, `product_id`, `version`, `grade?`, `size_band?`, `size_unit?`, `net_weight_per_pack?`, `gross_weight_per_pack?`, `glazing_percent?`, `packs_per_carton?`, `carton_net_weight?`, `storage_temp_c?`, `shelf_life?`, `origin_country?`, `packaging_material?`, `label_language[]`, `status`, `approved_at?`.
- `SpecificationDocument`: secure object key, checksum, version and reviewer metadata.

### Use cases / endpoints (proposed)
- `CreateSpecificationDraft`, `ReviewSpecification`, `PublishSpecificationRevision`, `ListApprovedSpecifications`.
- `GET/POST /api/v1/products/:id/specifications`; `POST /api/v1/specifications/:id/publish`.

### UI / edge cases
- Side-by-side revision comparison, exportable buyer-facing spec sheet, validation of units.
- Glazing %, net/gross weight and pricing basis must be explicitly defined to prevent wrong commercial calculations.
- No universal freezer temperature or shelf-life is hardcoded; require product-specific review.

### Verification scenarios
- Published revision cannot be overwritten; later updates create a successor version.
- Quote v1 still reads spec v1 after spec v2 goes live.
- Invalid impossible weights/percentages and missing mandatory approved fields rejected.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.


## Delivery reference

See R1-06 in the [R1 task plan](../../plan-r1-task.md). Review remaining action and field grants before implementation.
