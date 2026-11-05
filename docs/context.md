# Project Context — Seafood Export CRM

> **Status: documentation baseline for a clean rebuild; all CRM modules planned.** [R1 task plan](../plan-r1-task.md).
> Owner of scope: project team. Updated: **2026-11-04**. Start here; consult linked specs for detail.

## 1. Product vision
An internal **B2B CRM for seafood export**: trace a buyer inquiry through quotation, confirmed order, shipment, export documents and payment, without losing context across email, spreadsheets and departments. Start with sales execution for shipments commonly around 1–2 containers, **without hardcoding that limit**. The company exports products such as squid, octopus, cuttlefish, shrimp and other processed/frozen seafood to international markets; Korea is an important buyer market, but buyer countries and currencies must be configurable.

## 2. Business outcomes
1. Single source of truth for buyer companies, contacts and interaction history.
2. Every RFQ is assigned, followed up, converted to a versioned quotation and linked to orders.
3. Sales and export teams can see shipment ETD/ETA, container events, document deadlines and responsibilities.
4. Finance can identify invoices/receivables and differences between expected and realized costs.
5. Role/scope enforcement, audit trail, and reliable imports/integrations.

## 3. Delivery strategy
| Release | Objective | Core scope | Gate |
|---|---|---|---|
| **R1 — Core CRM** | Inquiry to confirmed sales order | Customers, Contacts, Leads, Opportunities, Tasks, Products/specs, Price Lists, RFQs, Quotations, Samples, Sales Orders, Access Control, Audit, Dashboard | Demonstrable RFQ → Quote → Sales Order with role-safe data |
| **R2 — Export Execution** | Plan and follow exports | Shipments, Containers, Vessel/Event Timeline, Documents, L/C, Shipping Alerts, Compliance, Customer Feedback, Integrations | Shipment timeline + document checklist + notification workflow verified |
| **R3 — Supply & Financial Control** | Trace supply, quality, receivables and margins | Suppliers, Purchase Orders, Batches, QC, Inventory Integration, Receivables, Cost Reconciliation, Reefer Monitoring (when telemetry exists) | Order → Batch/QC → Shipment → Receivable reconciliation verified |

**Catalog:** [32 module specifications](modules/README.md). These modules are a **proposed planning breakdown**, not evidence that each module is required immediately. R1 should be implemented in incremental vertical slices; don't build all 32 at once.

## 4. Actors and boundaries
- **Admin**: config, users and access management; not an automatic exemption from finance approval separation.
- **Sales / Sales Manager**: buyers, RFQs, quotations, sales orders; scope varies by owner/team.
- **Export Operations / Documents**: shipment events and export paperwork.
- **Purchasing / QC**: suppliers, batches and inspections.
- **Finance**: receivables, cost posting, settlement.
- **Management**: read-level and approved reports with scoped sensitive fields.
- **System Integration**: narrow service identities with scoped permissions and auditable actions.

See [permission matrix](business/permissions.md); permissions should be modeled as **action + resource + record scope**, not a UI menu flag.

## 5. Remake decisions

One Next.js App Router modular monolith serves web and REST /api/v1 on Vercel. Use strict TypeScript, Tailwind, shadcn/ui and OpenAPI 3.1. Develop with fresh PostgreSQL in Docker Compose, Drizzle + Postgres.js and SQL migrations. The application enforces record scope and serves private development files from a volume outside public/.

Invite-only employee login uses email/password and JWT in HttpOnly cookies. Use a one-hour access token, seven-day absolute and three-day idle session, no MFA and next-request revocation. Production DB/storage and module-level business grants remain open. See the [architecture overview](architecture/overview.md).

## 6. R1 execution

Use the [task plan](../plan-r1-task.md) for the 15 modules, priorities, approved business rules and measurable completion criteria. Nimbalyst holds live status.

## 8. Shared invariants
- **No destructive overwrite of accepted commercial terms**: quote/order line snapshots preserve price, pack, grade, currency, incoterm and version.
- **Money**: decimal/fixed precision and ISO currency codes; FX rate captured with source, date/time and conversion context. No JS floating-point accumulation for money.
- **States**: allow only explicitly defined transitions; role-based confirmation/approval and audit events.
- **Dates**: UTC database timestamps; ETD/ETA timezone and source retained; planned and actual dates separate.
- **Documents**: private development volume, authorized downloads; production storage provider unresolved, lifecycle/retention and version history.
- **Ownership**: team/assigned scopes checked at data access; not client filters alone.
- **Imports/webhooks**: deduplication key, idempotent processing, retry policy and traceability.
- **External data**: shipment events and reefer telemetry are third-party facts; retain source/time, never invent ETA/status.

## 9. Critical workflow (scope across releases)
RFQ received → assign Sales → qualify → issue versioned quote → negotiate → accept → confirm order → plan shipment → book container → track ETD/ETA → complete export document checklist → reconcile payments/costs → collect buyer feedback.

**R1 ends at a confirmed order; R2 adds actual logistics; R3 adds supply and finance.** A module does not implicitly depend on future-release features to be usable in R1.

## 10. Non-functional requirements (targets to validate; not claims)
- Reliable writes, transactional state changes, server-side authorization and auditable sensitive operations.
- Initial server-side pagination, indexed search by buyer name/country/status/owner and business identifiers.
- Backups with restore drill, environment isolation, structured logging, request/correlation IDs and CI checks.
- Define p95/API throughput SLO only after baseline measurements; no unsupported numeric SLA claim.
- Accessibility, responsive back-office UI, timezone/currency-aware presentation.

## 11. Remaining decisions

Sign off business grants per module and select production DB, storage, regions and recovery controls before deployment. See the [architecture overview](architecture/overview.md), [business workflows](business/README.md) and [module catalog](modules/README.md).
