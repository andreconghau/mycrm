# M11 — Samples

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** Sales · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Track buyer sample requests and outcomes before mass production.

## R1 workflow and acceptance

- Record requested SKU/spec, quantity, recipient, dispatches, tracking and feedback. Sales can dispatch directly and notify their direct manager in CRM. Retrying a dispatch creates one notification. Manager can open the authorized sample detail. Feedback identifies the dispatched sample.

## Proposed fields

- `SampleRequest`: `id`, `customer_id`, `contact_id?`, `opportunity_id?`, `requested_at`, `requested_by`, `status`, `shipment_address_snapshot`, `cost_budget?`, `currency?`.
- `SampleItem`: `sample_request_id`, `product_id`, `spec_id?`, `quantity`, `unit`, `packaging_notes?`.
- `SampleDispatch`: `carrier?`, `tracking_ref?`, `dispatched_at?`, `received_at?`, `dispatch_cost?`, `external_reference?`.

## Proposed use cases and endpoints

- `CreateSampleRequest`, `DispatchSample`, `RecordSampleFeedback`, `CloseSample`.
- `GET/POST /api/v1/samples`; `POST /api/v1/samples/:id/dispatch`; `POST /api/v1/samples/:id/feedback`.
