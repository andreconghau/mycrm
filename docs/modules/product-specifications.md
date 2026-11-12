# M07 — Product Specifications

> **Status: IMPLEMENTED (R1-06)** — migration `0004`, scoped API, core workspace flows and positive authenticated HTTP verification are complete. Technical-file upload/download and M10 quotation/PDF flows remain outside this task and are blocked until their owning capabilities exist.
> **Area:** Product · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Confirmed R1 workflow and acceptance

- Version SKU grades, processing, weights, packaging and technical files. Capture the offered version at submission. Changes to the catalog never alter an earlier offer or PDF.

## Purpose
Define exact product grades, processing, packaging and quantity/weight basis.

## Features / use cases
- Maintain grade/size, treatment, frozen form, packaging, net/gross weight and unit
- Record MOQ, labels/certificates and buyer-specific spec notes
- Validate compatible product/spec combinations

## Core data (implemented in migration 0004; applied to the development database)
ProductSpec: product_id, grade, processing, size_range, packing_type, net_weight, gross_weight, uom, moq, revision

## States / lifecycle (implemented)
`DRAFT → APPROVED → ARCHIVED`

## Business rules and validation
- Use consistent UoM conversion with explicit pack weights
- Spec revision is immutable once referenced by issued quote unless cloned
- Buyer-specific customization linked without overwriting standard spec
- EN/VI/KO names and descriptions are snapshotted into the quotation version at submission; missing translations block PDF issue ([R1 decisions §9](../business/r1-decisions.md#9-quotation-pdf))

## Authorization and record scope
Sales read; Product/Purchasing/QC specialists edit; approval by configured role.

## Dependencies / integration boundaries
Products

## Acceptance / UAT
- 10 cartons with specified net kg/carton produces correct total weight
- Wrong product/spec combination rejected

## Detailed Implementation Contract

> The following contract remains the intended scope. See the implementation progress section and checklist for verified delivery versus remaining work.

### Functional workflow
1. Define a versioned specification tied to product and intended buyer/market where necessary.
2. Record grade/size, processing, glazing, packaging, storage temperature and label requirements; review by authorized owner.
3. Attach controlled specification PDF/image and translate approved market-facing text.
4. Quotation/Order references an exact approved specification revision rather than the mutable current draft.

### Proposed detailed fields
- `ProductSpecification`: `id`, `product_id`, `version`, `grade?`, `size_band?`, `size_unit?`, `net_weight_per_pack?`, `gross_weight_per_pack?`, `glazing_percent?`, `packs_per_carton?`, `carton_net_weight?`, `storage_temp_c?`, `shelf_life?`, `origin_country?`, `packaging_material?`, `label_language[]`, `name_en`, `name_vi`, `name_ko`, `description_en/vi/ko`, `legacy_ref?`, `status`, `approved_at?`.
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
- [x] Domain model, state transitions and failure cases reviewed with business owner (`/grill-me`, 2026-11-11).
- [x] Persistence contract/schema and indexes implemented in migration `0004_product_specifications`; isolated replay passed.
- [x] Use cases, Zod boundaries, scoped authorization, transactional audit and REST/OpenAPI adapters implemented.
- [x] Core UI: workspace supports market/search/status filters, authorized buyer search, draft creation/editing, optional technical fields, revision history, successor creation, approval and compare, with focus/dirty-state protections.
- [ ] Approved-document upload/download UX remains blocked by the missing private storage adapter.
- [x] Verification: 119 unit tests, 6 PostgreSQL integration tests in an isolated schema, 2 anonymous and 2 authenticated HTTP E2E cases, migration replay/rollback validation in an isolated schema, development migration `0004`, typecheck, targeted lint and Webpack production build.
- [ ] Technical-file upload/download and M10 quotation/PDF scenarios remain blocked by their approved module boundary.
- [ ] Review and commit before closing the task.

### Implemented API boundary

`GET /api/v1/specifications`, `GET/POST /api/v1/products/:id/specifications`, specification detail and revision routes, publish, archive, compare, snapshot, and metadata-only document listing are implemented under `/api/v1`. Database authorization and audit are enforced server-side. Migration `0004` extends the baseline tables, adds revision guards, and supplies the `DRAFT → APPROVED → ARCHIVED` lifecycle.

No upload/download adapter is implemented. M10 quotation submission and PDF issue are also outside this task; AC-09/AC-10 and file-level AC-18 remain blocked until their owning capabilities exist.
