# M06 — Products

> **Status: IMPLEMENTED (R1-05)**
> **Area:** Product · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Confirmed R1 workflow and acceptance

- Maintain SKUs, units, families and eligibility for new commercial lines. Retiring a SKU removes it from new selections and preserves previous transactions.

## Purpose
Maintain searchable product catalogue for seafood export commercial offers.

## Features / use cases
- Manage seafood product identity, EN/VI/KO canonical names, search aliases and category
- Approve/retire products without altering historical quotation/order snapshots
- Search/filter by SKU, name, category and status

## Core data (implemented)
`products`: `id`, `sku` (unique), `display_name`, `category`, `species_common_name`, `species_scientific_name`, `product_family`, `default_unit`, `status`, `description_en`, `description_vi`, `description_ko`, `created_at`, `updated_at`, `version`.
`product_aliases`: `id`, `product_id`, `locale`, `label`, `kind` (`NAME` = required canonical per-locale name, one per product/locale via a partial unique index; `ALIAS` = free-text search synonym, unlimited per locale), `created_at`.

## States / lifecycle (implemented)
`DRAFT → ACTIVE ⇄ INACTIVE`. `DRAFT → INACTIVE` is not a valid transition (rejected). Only `ACTIVE` products are eligible for new commercial line selection, enforced server-side regardless of UI state. `INACTIVE → ACTIVE` reactivation is allowed; no documented-exception workflow exists in R1 since any role holding the `approve` grant can reverse it.

## Business rules and validation
- Avoid guessing scientific species/customs code from colloquial name
- Product changes (rename, attribute edit, retirement) never alter prior quotation/order snapshots — `quotation_lines.product_snapshot` (M09/M10, not yet implemented) is the historical boundary; M06 only guarantees the live record is immutable-by-reference once referenced
- EN/VI/KO canonical names are required at creation (stored as `product_aliases` rows with `kind = 'NAME'`); descriptions are optional free text per locale. No machine translation.
- SKU is normalized uppercase, pattern `^[A-Za-z0-9_-]{2,40}$`
- Processing form, origin/treatment, grade and packaging are **not** duplicated on Product — they belong to [Product Specifications (M07)](product-specifications.md); Product carries only identity-level classification (`category`, `species_common_name`, `species_scientific_name`, `product_family`)
- `default_unit` is validated against a fixed application-level enum (`KG`, `MT`, `CTN`, `PCS`, `LB`); no unit-conversion logic
- Market-level eligibility overrides (`market_products` table) are **out of scope** for R1-05 — this table exists in the baseline schema but is unclaimed until RFQ/Price Lists (M08/M09) need it

## Authorization and record scope
Resource `products`. `admin` and `manager`: `create`/`update`/`approve`/`retire`/`read`, scope `ALL`. `sale`: `read` only, scope `ALL`. `accountant`: no grant (consistent with R1 decisions — role not activated). No mandatory maker-checker separation between create/edit and approve/retire in R1. The catalog is global, not market-scoped.

## Dependencies / integration boundaries
Product Specifications, Audit Log. RFQ/Quotation/Sales Order (M09/M10/M12) are not implemented; eligibility and historical-snapshot guarantees are verified at the domain/integration level only, not against a real quotation flow.

## Acceptance / UAT
- Inactive product cannot be newly quoted without documented exception
- Historic order shows original product label

## Implementation

### Functional workflow
1. An admin/manager creates a product with a unique SKU and all three canonical names (EN/VI/KO); it starts `DRAFT`.
2. An admin/manager approves it (`DRAFT → ACTIVE`) once it is ready for commercial use.
3. Sales reads the catalog (read-only) to select eligible `ACTIVE` products; direct API calls against `DRAFT`/`INACTIVE` SKUs are denied server-side.
4. An admin/manager retires a product (`ACTIVE → INACTIVE`) without changing historic quotations/orders, and may reactivate it later.

### Implemented fields
- `Product`: `id`, `sku`, `category`, `speciesCommonName`, `speciesScientificName`, `productFamily`, `defaultUnit`, `status`, `descriptionEn/Vi/Ko`, `version`; derived `names` (`{en, vi, ko}`) and `aliases` (`[{locale, label}]`) projected from `product_aliases`.

### Use cases / endpoints (implemented)
- `CreateProduct`, `EditProduct` (`UpdateProduct`), `ApproveProduct`, `RetireProduct`/`ReactivateProduct`, `SearchProductCatalog` (`ListProducts`).
- `GET/POST /api/v1/products`; `GET/PATCH /api/v1/products/:id`; `POST /api/v1/products/:id/approve`; `POST /api/v1/products/:id/retire`; `POST /api/v1/products/:id/reactivate`.

### UI
- Catalog workspace with SKU/name search and status filter; right-side create drawer (SKU, default unit, EN/VI/KO names, classification, optional descriptions); product detail page with lifecycle action buttons gated by role.

### Verification scenarios (implemented, see tests below)
- A retired SKU cannot be placed on a new quote unless exception is approved — verified against a synthetic `quotation_lines` row since M09/M10 do not exist.
- Updating product display name cannot alter text frozen in an existing commercial snapshot.
- SKU uniqueness, DRAFT→INACTIVE rejection and role-based authorization are tested.

## Implementation checklist
- [x] Domain model, state transitions and failure cases reviewed with business owner (`/grill-me`, 2026-11-11).
- [x] Persistence contract/schema and safe database indexes approved (migration `0003_products_catalog`).
- [x] Use cases, server-side Zod validation and scoped authorization implemented.
- [x] UI implemented (catalog workspace, create drawer, detail with lifecycle actions).
- [x] Unit and integration tests cover success, negative permissions and concurrency (`product-repository.integration.test.ts`, 11 tests against real PostgreSQL).
- [x] Audit events (`product.created/updated/approved/retired/reactivated`) and OpenAPI docs updated; acceptance verified per AC-01…AC-17 except AC-08/AC-09 which are domain-level only (no RFQ/Quotation module to integrate against).
