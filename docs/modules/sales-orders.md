# M12 — Sales Orders

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Sales · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Represent buyer commitment and immutable agreed commercial terms.

## R1 workflow and acceptance

- Require accepted quote even for a direct PO. Snapshot exact terms, FX, original and final amounts. Assigned Sales confirms with at least one private evidence file (image, email `.eml`/`.msg`/PDF, or signed PDF); only Admin may confirm without a file, with a mandatory source comment. Notify direct manager and quote approver in CRM atomically. One RFQ yields at most one order. Missing evidence blocks confirmation unless Admin records the no-file source comment. Retry or identical recipients produce one notification per person with independent read state.
- Keep order number and amendment history. Manager or Admin approves changed terms (self-approval comment of at least 10 characters); Sales supplies buyer evidence to confirm. Before shipment, Sales submits cancellation reason and evidence as a `cancel` amendment for Manager or Admin review. Existing terms stay effective until amendment is confirmed. Order stays CONFIRMED pending cancellation or following reasoned rejection; only approval sets CANCELLED.
- Evidence files: jpg, png, webp, pdf, eml, msg; at most 20 MB each; real MIME checked server-side. Each file stores original name, type, MIME, size, SHA-256, uploader and upload time. Files are immutable; replacement adds a new file and marks the old one `voided` with a reason. Orders with no file or image-only evidence carry a review flag. The system does not verify signatures.
- Amendment states `draft → submitted → approved / rejected`; at most one open amendment per order. Approval creates a new full-snapshot order version (previous version `superseded`), stores the before/after diff and sends notifications in one transaction. Quantity cannot drop below the quantity allocated to shipments (R2/R3).
- The order snapshot stores the VND-per-USD rate at confirmation. The rate remains an editable reference field after confirmation (comment required, Manager/Admin, appended to `rate_history`) without an amendment. See [R1 decisions](../business/r1-decisions.md).

## Proposed fields

- `SalesOrder`: `id`, `order_number`, `customer_id`, `accepted_quote_version_id`, `buyer_po_ref?`, `status`, `currency`, `incoterm`, `named_place`, `payment_terms`, `confirmed_at?`, `owner_id`, `version`.
- `SalesOrderLine`: `id`, `sales_order_id`, `line_no`, `product_snapshot`, `spec_snapshot`, `quantity_decimal`, `unit`, `unit_price_decimal`, `total_decimal`, `allocated_qty_decimal` (derived or transactional), `shipping_instructions?`.
- `SalesOrderAmendment`: prior/new version snapshot, change reason, approver, evidence reference.
- Baseline schema mapping ([database design](../structure/database.md)): versions are `order_versions` (with `vnd_per_usd` snapshot); evidence is `order_confirmation_evidence` → `files` (name, media type, size, SHA-256, uploader); amendments are `order_amendments`; cancellations currently use a separate `order_cancellation_requests` table. Approved R1 decisions still need an approved migration or design decision for: cancellation as an amendment type (or mapping it onto the existing table), file `voided` state and reason, Admin no-file confirmation comment, evidence review flags, one-open-amendment uniqueness, amendment `self_approved`/comment, and `rate_history`.

## Proposed use cases and endpoints

- `CreateOrderFromQuote`, `ConfirmOrder`, `AmendOrder`, `CancelOrder`, `GetOpenOrderQuantity`.
- `GET/POST /api/v1/sales-orders`; `POST /api/v1/sales-orders/:id/confirm`; `POST /api/v1/sales-orders/:id/amend`.
