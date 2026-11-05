# M30 — Dashboard Reporting

> **Status: PLANNED — NOT IMPLEMENTED**  
> **Area:** System · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Confirmed R1 workflow and acceptance

- Provide scoped pending RFQs, quote approvals, confirmed orders, pipeline and overdue work. Define each metric and drill-down. Totals reconcile with authorized lists under identical filters; distinguish forecasts from orders and count each won opportunity once.

## Purpose
Provide team-safe commercial KPIs and later export/finance visibility.

## Features / use cases
- R1 RFQ pipeline, pending tasks, quote conversion and order summary
- R2 on-time milestone and missing document widgets
- R3 aged receivables, supplier/QC performance and cost variance

## Core data (proposed)
Aggregated query/report definitions; optional precomputed summaries after measurements

## States / lifecycle (proposed)
`N/A (report date/as-of time and filter state explicit)`

## Business rules and validation
- Aggregate queries must apply row/field-level scope before aggregation
- Display source and last refresh time
- Never promise 100% real-time or accurate profit without complete finance data
- Paginate/drill-down with authorization

## Authorization and record scope
Sales OWN; Manager TEAM; Management org-wide safe reports; Finance sensitive financial reporting.

## Dependencies / integration boundaries
Access Control, RFQs, Quotations, Sales Orders; R2 and R3 modules as added

## Acceptance / UAT
- Sales cannot infer other-team revenue via totals
- Counts reconcile to accessible underlying records

## Detailed Implementation Contract (proposed)

> These are proposed use cases, API routes and fields for implementation planning; they are **not implemented**. Confirm database naming and exact API contracts through the relevant task/ADR before coding.

### Functional workflow
1. Build role-scoped KPI projections for active leads, open RFQs, quotations, confirmed orders, shipment deadlines and aged receivables (only when R3 exists).
2. Use explicit metric definitions (status membership, time window, currency/FX assumptions) and source timestamp.
3. Support filtered drill-down to authorized underlying records; export only when user has export permission.
4. Label unavailable future-release metrics as not enabled, not as misleading zero.

### Proposed detailed fields
- `DashboardWidgetConfig`: `user_id|role_id`, `widget_code`, `filters`, `position`, `visibility`.
- `ReportDefinition`: `code`, metric formula, allowed filters, required permission and sensitive fields.
- `ReportRun` (if asynchronous): requester, params, generated_at, expiry and storage key.

### Use cases / endpoints (proposed)
- `GetSalesPipelineSummary`, `GetRFQConversionReport`, `GetShipmentExceptionSummary`, `GetARAgeingSummary`, `ExportAuthorizedReport`.
- `GET /api/v1/dashboard/summary`; `GET /api/v1/reports/:code` (permission/row scoped).

### UI / edge cases
- R1: pipeline funnel, overdue follow-ups, RFQs awaiting quote, quote conversion, order totals by currency.
- R2: ETA/ETD exceptions, missing docs and shipment alerts. R3: receivables, cost variance and margins for Finance/Management only.
- Prefer indexed database queries and explicit caching strategy keyed by identity/scope; avoid broad table scans or cache cross-user leakage.

### Verification scenarios
- Dashboard count equals accessible list total for scoped user.
- Summed USD and KRW are separated unless explicit FX normalization shown.
- No supplier cost/margin fields appear in Sales reports or exports without permission.

## Implementation checklist
- [ ] Domain model, state transitions and failure cases reviewed with business owner.
- [ ] Persistence contract/schema and safe database indexes approved.
- [ ] Use cases, server-side Zod validation and scoped authorization implemented.
- [ ] UI or API adapters implemented only where needed.
- [ ] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [ ] Audit/observability/docs updated; acceptance verified.
