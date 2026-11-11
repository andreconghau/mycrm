# Module Catalog — 32 Proposed CRM Modules

> **Planning inventory, not implemented features.** The 32-module decomposition is a project design proposal spanning **R1 Core CRM**, **R2 Export Execution**, **R3 Supply & Financial Control**. Dependencies in later releases are not required to complete R1.

| ID | Area | Module | Release | Implementation status |
|---|---|---|---|---|
| M01 | CRM | [Customers](customers.md) | R1 | Core implemented; Customer 360 and file-history access pending |
| M02 | CRM | [Contacts](contacts.md) | R1 | Core implemented; messaging/campaign adapter honoring do-not-contact pending |
| M03 | CRM | [Leads](leads.md) | R1 | Planned |
| M04 | CRM | [Opportunities](opportunities.md) | R1 | Planned |
| M05 | CRM | [Tasks Activities](tasks-activities.md) | R1 | Planned |
| M06 | Product | [Products](products.md) | R1 | Core implemented |
| M07 | Product | [Product Specifications](product-specifications.md) | R1 | In progress — backend and draft workspace implemented; revision/detail UI and full acceptance verification pending |
| M08 | Product | [Price Lists](price-lists.md) | R1 | Planned |
| M09 | Sales | [Rfqs](rfqs.md) | R1 | Planned |
| M10 | Sales | [Quotations](quotations.md) | R1 | Planned |
| M11 | Sales | [Samples](samples.md) | R1 | Planned |
| M12 | Sales | [Sales Orders](sales-orders.md) | R1 | Planned |
| M13 | Supply & Quality | [Suppliers](suppliers.md) | R3 | Planned |
| M14 | Supply & Quality | [Purchase Orders](purchase-orders.md) | R3 | Planned |
| M15 | Supply & Quality | [Batches](batches.md) | R3 | Planned |
| M16 | Supply & Quality | [Quality Control](quality-control.md) | R3 | Planned |
| M17 | Supply & Quality | [Inventory Integration](inventory-integration.md) | R3 | Planned |
| M18 | Export | [Shipments](shipments.md) | R2 | Planned |
| M19 | Export | [Containers](containers.md) | R2 | Planned |
| M20 | Export | [Vessel Tracking](vessel-tracking.md) | R2 | Planned |
| M21 | Export | [Export Documents](export-documents.md) | R2 | Planned |
| M22 | Export | [Lc Management](lc-management.md) | R2 | Planned |
| M23 | Export | [Shipping Alerts](shipping-alerts.md) | R2 | Planned |
| M24 | Export | [Compliance](compliance.md) | R2 | Planned |
| M25 | Export | [Reefer Monitoring](reefer-monitoring.md) | R3 (optional telemetry) | Planned |
| M26 | Finance | [Receivables](receivables.md) | R3 | Planned |
| M27 | Finance | [Cost Reconciliation](cost-reconciliation.md) | R3 | Planned |
| M28 | Service | [Customer Feedback](customer-feedback.md) | R2 | Planned |
| M29 | System | [Access Control](access-control.md) | R1 | Planned |
| M30 | System | [Dashboard Reporting](dashboard-reporting.md) | R1 | Planned |
| M31 | System | [Audit Log](audit-log.md) | R1 | Planned |
| M32 | System | [Integrations](integrations.md) | R2 | Planned |

## Delivery recommendations
- **R1 minimum viable flow:** Access Control → Audit Log → Customers/Contacts → Products/Specs → RFQs → Quotations → Sales Orders → Tasks/Opportunities → Dashboard. Leads and price lists can be staged alongside this flow. M11 delivers sample dispatch with a manager notification.
- **R2 priority:** Shipments → Containers/Tracking → Documents → Alerts → L/C/Compliance → Integrations/Feedback.
- **R3 priority:** Suppliers/Purchase Orders → Batches/QC → Inventory adapter → Receivables/Cost reconciliation; Reefer Monitoring only when a reliable feed exists.

## Rules for agents
1. Read the specific module and cross-module business workflow before implementing.
2. Do **not** create every module directory just because it appears here.
3. Update `Implementation checklist` and status only when backed by tests/code evidence.
4. If implementation diverges from design, record decision and update affected specs.

## What is *not* a separate module yet
Company settings, tax/FX service, document templates, localization, notifications delivery, dashboard widgets, and approval flows may be supporting capabilities within relevant modules; split them later only if a clear boundary emerges.
