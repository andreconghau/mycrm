# M06 — Products

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Product · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Confirmed R1 workflow and acceptance

- Maintain SKUs, units, families and eligibility for new commercial lines. Retiring a SKU removes it from new selections and preserves previous transactions.

## Purpose
Maintain searchable product catalogue for seafood export commercial offers.

## Features / use cases
- Manage seafood product identity, bilingual/Korean aliases and category
- Archive products without altering historical quotation lines
- Search/filter by type, source, processing and availability indicator

## Core data (proposed)
Product: id, code, display_name, category, species_name, aliases, status, origin

## States / lifecycle (proposed)
`DRAFT → ACTIVE / INACTIVE`

## Business rules and validation
- Avoid guessing scientific species/customs code from colloquial name
- Product changes do not update accepted commercial snapshots
- Only verified product records can be referenced in sent quote per chosen rule

## Authorization and record scope
Sales read; Catalog Admin/Purchasing edit; Admin policy-managed.

## Dependencies / integration boundaries
Product Specifications, Audit Log

## Acceptance / UAT
- Inactive product cannot be newly quoted without documented exception
- Historic order shows original product label

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming and exact API contracts through the relevant task/ADR before coding.

### Functional workflow
1. Product manager defines commercial product family/SKU (e.g. cuttlefish, octopus, squid, whiteleg shrimp) with consistent multilingual names.
2. Classify species, origin/treatment and forms; define active variants via Product Specifications rather than duplicating names in free text.
3. Sales selects an approved product for RFQ/quotation and captures a snapshot on the commercial document.
4. Retire SKU without changing historic quotations and orders.

### Proposed detailed fields
- `Product`: `id`, `sku`, `category`, `species_common_name`, `species_scientific_name?`, `display_name`, `name_ko?`, `name_en?`, `name_vi?`, `form` (`whole|cleaned|cut|flower|other`), `processing_type?`, `default_unit`, `status`, `created_at`, `updated_at`.
- `ProductAlias`: locale, external catalog code and search synonyms. Avoid treating localized marketing names as biological taxonomy.

### Use cases / endpoints (proposed)
- `CreateProduct`, `EditProduct`, `ApproveProduct`, `RetireProduct`, `SearchProductCatalog`.
- `GET/POST /api/v1/products`; `GET/PATCH /api/v1/products/:id`.

### UI / edge cases
- Searchable catalog with category, species, processing form, language filters and active status.
- Product image is optional and stored privately/publicly according to marketing usage policy.
- Do not infer food safety certification or source origin from product category alone.

### Verification scenarios
- A retired SKU cannot be placed on a new quote unless exception is approved.
- Updating product display name cannot alter text frozen in already issued quotations.
- SKU uniqueness and secure access to unpublished specifications tested.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.
