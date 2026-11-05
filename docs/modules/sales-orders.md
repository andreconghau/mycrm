# M12 — Sales Orders

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Sales · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Represent buyer commitment and immutable agreed commercial terms.

## R1 workflow and acceptance

- Require accepted quote even for a direct PO. Snapshot exact terms, FX, original and final amounts. Assigned Sales confirms with at least one private image or scan. Notify direct manager and quote approver in CRM atomically. One RFQ yields at most one order. Missing evidence blocks confirmation. Retry or identical recipients produce one notification per person with independent read state.
- Keep order number and amendment history. Manager approves changed terms; Sales supplies buyer evidence to confirm. Before shipment, Sales submits cancellation reason and evidence for manager review. Existing terms stay effective until amendment is confirmed. Order stays CONFIRMED pending cancellation or following reasoned rejection; only approval sets CANCELLED.

## Proposed fields

- `SalesOrder`: `id`, `order_number`, `customer_id`, `accepted_quote_version_id`, `buyer_po_ref?`, `status`, `currency`, `incoterm`, `named_place`, `payment_terms`, `confirmed_at?`, `owner_id`, `version`.
- `SalesOrderLine`: `id`, `sales_order_id`, `line_no`, `product_snapshot`, `spec_snapshot`, `quantity_decimal`, `unit`, `unit_price_decimal`, `total_decimal`, `allocated_qty_decimal` (derived or transactional), `shipping_instructions?`.
- `SalesOrderAmendment`: prior/new version snapshot, change reason, approver, evidence reference.

## Proposed use cases and endpoints

- `CreateOrderFromQuote`, `ConfirmOrder`, `AmendOrder`, `CancelOrder`, `GetOpenOrderQuantity`.
- `GET/POST /api/v1/sales-orders`; `POST /api/v1/sales-orders/:id/confirm`; `POST /api/v1/sales-orders/:id/amend`.

## Delivery reference

See R1-12, R1-13 in the [R1 task plan](../../plan-r1-task.md). Review remaining action and field grants before implementation.
