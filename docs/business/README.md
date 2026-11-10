# Seafood Export CRM — Business Knowledge Index

**Project:** Seafood Export CRM  
**Document Type:** Business Knowledge Index  
**Status:** Initial Specification  
**Last Updated:** 2026-11-04

---

## 1. Purpose

This directory contains the business knowledge, operational workflows, business rules, and cross-functional processes required to develop the Seafood Export CRM.

The CRM supports B2B seafood export operations, from customer acquisition and quotation through sales order processing, shipment execution, export documentation, payment collection, and after-sales service.

These documents define **how the business operates**, independently of technical implementation.

AI development agents, including Codex, must understand the relevant business requirements before implementing or modifying CRM features.

### Primary Objectives

1. Centralize seafood export business knowledge.
2. Standardize customer, sales, logistics, and financial workflows.
3. Ensure consistent business rules across CRM modules.
4. Reduce duplicated or conflicting business logic.
5. Support incremental development across three releases.
6. Preserve business context across AI development sessions.

---

## 2. Business Documentation Catalog

| Document                                              | Description                                                                          | Related Modules   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------- |
| [Customer Lifecycle](customer-lifecycle.md)           | Customer acquisition, qualification, ownership, retention, and customer history      | M01–M05           |
| [Sales Workflow](sales-workflow.md)                   | Lead-to-order process, opportunities, RFQs, quotations, samples, and sales orders    | M03–M12           |
| [Pricing and Quotations](pricing-and-quotations.md)   | Product pricing, quotation revisions, currencies, Incoterms, and commercial approval | M06–M10           |
| [Export Workflow](export-workflow.md)                 | End-to-end operational process from confirmed sales order to export completion       | M12, M18–M24      |
| [Shipping and Containers](shipping-and-containers.md) | Container allocation, vessel schedules, shipment milestones, ETD/ETA, and tracking   | M18–M20, M23, M25 |
| [Export Documents](export-documents.md)               | Commercial invoice, packing list, B/L, C/O, certificates, and document verification  | M21, M22, M24     |
| [Finance Workflow](finance-workflow.md)               | Payment terms, receivables, outstanding balances, and cost reconciliation            | M22, M26, M27     |
| [Supply and Quality](supply-and-quality.md)           | Suppliers, procurement, production batches, inspection, and inventory                | M13–M17           |
| [Permissions](permissions.md)                         | Roles, access scope, approval responsibilities, and data authorization               | M29, M31          |
| [Alerts and Integrations](alerts-and-integrations.md) | Notifications, business reminders, external systems, and integration workflows       | M20, M23, M32     |
| [R1 Decisions](r1-decisions.md)                       | Approved R1 phasing, controlled exceptions, FX, evidence, amendment and PDF rules    | M01–M12, M29–M31  |

### Related Documentation

- [Project Context](../context.md) — Project objectives, scope, and development status.
- [Architecture Overview](../architecture/overview.md) — System architecture and module boundaries.
- [Module Catalog](../modules/README.md) — All 32 proposed CRM modules.
- [Release Roadmap](../modules/RELEASES.md) — Release scope and implementation priorities.
- [Security Architecture](../architecture/security.md) — Authentication, authorization, and data protection.

---

## 3. Business Scope

The system is designed for a Vietnamese B2B seafood export company serving international customers.

### 3.1 Customer and Sales Management

- Manage international buyers and business contacts.
- Track leads and sales opportunities.
- Receive and manage Requests for Quotation (RFQs).
- Maintain product catalogs and specifications.
- Create, revise, and approve quotations.
- Manage customer sample requests.
- Convert accepted quotations into sales orders.
- Record customer interactions and sales activities.

### 3.2 Seafood Product Management

Product management may include:

- Squid
- Octopus
- Cuttlefish
- Shrimp
- Fish
- Shellfish
- Other processed or frozen seafood products

Product specifications may include:

- Scientific and commercial names
- Product form and processing method
- Size and grading
- Net weight and gross weight
- Packaging configuration
- Storage conditions
- Country of origin
- Product certifications
- MOQ and commercial requirements

Product-specific requirements must be maintained in the appropriate module specifications.

### 3.3 Export and Logistics

- Manage export shipments and bookings.
- Allocate sales orders to shipments.
- Manage containers and shipment cargo.
- Record vessel schedules and ETD/ETA changes.
- Track shipment milestones.
- Prepare and verify export documents.
- Monitor document deadlines.
- Track shipment exceptions and customer notifications.

The system should support small initial export volumes while allowing future expansion.

### 3.4 Finance

- Manage agreed payment terms.
- Track customer receivables and payment status.
- Monitor L/C-related obligations where applicable.
- Reconcile planned and actual shipment costs.
- Support reporting on revenue, costs, and receivables.

The CRM is not intended to replace a complete accounting or ERP system in its initial releases.

### 3.5 Supply and Quality

- Manage seafood suppliers.
- Track purchase orders.
- Manage product batches.
- Record quality inspections.
- Associate supplier and batch information with orders or shipments.
- Integrate inventory data when required.

---

## 4. End-to-End Business Workflow

The following is the reference high-level business workflow.

```text
Lead / Customer Inquiry
        |
        v
Customer Qualification
        |
        v
RFQ Received
        |
        v
Product Specification Review
        |
        v
Price Calculation
        |
        v
Quotation Preparation
        |
        v
Manager/Admin Approval for Each Quotation Version
        |
        v
Customer Acceptance
        |
        v
Sales Order Confirmation
        |
        v
Supply / Production Arrangement
        |
        v
Quality Inspection
        |
        v
Shipment Booking
        |
        v
Container Loading
        |
        v
Export Document Preparation
        |
        v
Customs / Shipping Execution
        |
        v
Shipment Tracking
        |
        v
Payment Reconciliation
        |
        v
Order Closure / Customer Feedback
```

This flow represents a conceptual lifecycle, not a rigid sequential process.

Activities may overlap, occur conditionally, or follow different sequences depending on payment terms, Incoterms, customer requirements, shipping arrangements, and destination-market regulations.

Refer to the corresponding workflow documents for detailed requirements.

---

## 5. Business Principles

The following principles guide all CRM modules.

### 5.1 Single Source of Business Data

- Customer information should be managed centrally.
- Contacts must be associated with the correct customer.
- Quotations must reference identifiable customers and products.
- Sales orders must preserve agreed commercial terms.
- Shipments must reference the sales orders or cargo allocations they fulfill.
- Documents should be associated with their relevant business records.

Avoid unnecessary duplication of operational data.

### 5.2 Business Traceability

Important operations must remain traceable.

Examples include:

- Customer ownership changes
- Quotation revisions and approvals
- Sales order confirmation
- Shipment schedule changes
- Export document revisions
- Payment status adjustments

Critical historical records must not be silently overwritten.

### 5.3 Commercial Data Integrity

- Monetary amounts must use appropriate decimal precision.
- Currency must be explicitly identified.
- Units of measurement must be recorded.
- Product specifications must be unambiguous.
- Confirmed commercial terms must remain historically traceable.
- Financial changes should have an identifiable actor and reason.

R1 prices offers in USD with one entered VND/USD rate per revision. Sum unrounded line amounts before ROUND_HALF_EVEN on the final total. Every submitted version requires Manager or Admin approval. See the [pricing workflow](pricing-and-quotations.md) and [R1 decisions](r1-decisions.md).

### 5.4 Role-Based Business Access

Users must only access records and operations permitted by their role and data scope.

Authorization may depend on:

- User role
- Assigned customer ownership
- Sales team
- Department
- Business operation
- Approval authority

All sensitive operations require server-side authorization.

Refer to [Permissions](permissions.md).

### 5.5 Exception Handling

Operational exceptions must be identifiable and actionable.

Examples:

- Expired quotation
- Delayed shipment
- Changed vessel ETA
- Missing export document
- Failed quality inspection
- Overdue payment
- Approaching L/C deadline

An exception may generate a task, alert, escalation, or approval requirement according to the relevant business specification.

---

## 6. Cross-Module Business Relationships

| Source Module   | Related Module         | Business Relationship                                  |
| --------------- | ---------------------- | ------------------------------------------------------ |
| Customers       | Contacts               | One customer may have multiple contacts                |
| Customers       | Opportunities          | Customer-related potential sales                       |
| Opportunities   | RFQs                   | Potential sales may lead to quotation requests         |
| RFQs            | Quotations             | A request may generate quotation revisions             |
| Quotations      | Sales Orders           | Accepted commercial terms may be converted into orders |
| Products        | Product Specifications | Products have commercial and technical specifications  |
| Sales Orders    | Shipments              | Orders may be allocated across shipments               |
| Shipments       | Containers             | Shipments may involve one or multiple containers       |
| Shipments       | Export Documents       | Required documents depend on shipment context          |
| Sales Orders    | Receivables            | Commercial obligations generate payment tracking       |
| Suppliers       | Purchase Orders        | Procurement from suppliers                             |
| Purchase Orders | Batches                | Procured products may be tracked by batch              |
| Batches         | Quality Control        | Product batches may require inspection                 |
| Shipments       | Shipping Alerts        | Shipment events may trigger operational alerts         |

These are logical business relationships.

These are logical business relationships. Technical specifications define their intended cardinality and logical reference fields. Per the approved R1 design, SQL foreign-key constraints are not used; application services validate existence, authorization, market/parent consistency, lifecycle, concurrency and delete behavior within transactions.

---

## 7. Release-Based Business Priorities

### Release 1 — Core CRM

**Primary objective:** Establish a reliable customer-to-sales-order workflow.

Business capabilities:

- Customer and contact management
- Leads and opportunities
- Product catalog and specifications
- Price lists
- RFQs and quotations
- Sales orders
- Sales activities
- Access control
- Audit logging
- Operational dashboard

R1 includes lightweight sample dispatch and feedback.

### Release 2 — Export Execution

**Primary objective:** Manage export operations, shipping visibility, and documentation.

Business capabilities:

- Shipments
- Containers
- Vessel tracking
- Export documentation
- L/C management
- Shipping alerts
- Compliance
- Customer feedback
- External integrations

### Release 3 — Supply and Financial Control

**Primary objective:** Improve procurement visibility, quality traceability, and financial control.

Business capabilities:

- Suppliers and purchase orders
- Batches and quality control
- Inventory integration
- Receivables
- Cost reconciliation
- Optional reefer monitoring

The authoritative module-to-release mapping is maintained in [RELEASES.md](../modules/RELEASES.md).

---

## 8. Business Rules vs Technical Implementation

Business requirements and technical implementation must remain separate.

### Business Documentation Defines

- Business workflows
- Operational responsibilities
- Business constraints
- Approval conditions
- Commercial policies
- Business exceptions
- Compliance requirements

### Module Specifications Define

- Functional features
- Data models
- Application use cases
- API contracts
- UI requirements
- Module permissions
- Acceptance criteria

### Architecture Documentation Defines

- Technology choices
- Database architecture
- Backend organization
- Frontend architecture
- Infrastructure
- Security implementation
- Testing strategy

Business documents should not contain implementation-specific source code unless needed to clarify a business rule.

---

## 9. Rules for AI Development Agents

Before implementing a CRM feature:

1. Read `AGENTS.md`.
2. Read `docs/context.md`.
3. Read this Business Knowledge Index.
4. Identify the relevant business workflows.
5. Read the corresponding business documentation.
6. Read the target module specification under `docs/modules/`.
7. Review relevant architecture decisions.
8. Inspect existing source code and tests.
9. Implement only the approved scope.

### Business Rule Changes

If implementation requires changing an existing business rule:

1. Identify the existing rule.
2. Explain why a change is needed.
3. Identify impacted modules.
4. Describe compatibility and data-migration implications.
5. Request approval when changing agreed business behavior.
6. Update the affected business documentation.
7. Update module specifications and tests.

Do not silently change established business rules to simplify implementation.

### Conflicting Requirements

If two documents contradict each other:

1. Report the conflicting requirements and file paths.
2. Determine whether one is an older or explicitly superseded decision.
3. Do not assume the most recently edited document is automatically authoritative.
4. Obtain clarification for material unresolved conflicts.
5. Update affected documents after the decision.

---

## 10. Documentation Maintenance

Business documentation must evolve with confirmed business requirements.

Update the relevant files when:

- A business workflow is approved or changed.
- A new operational requirement is introduced.
- A business rule is clarified.
- A new module affects an existing workflow.
- An approval process changes.
- An integration changes operational responsibilities.
- A compliance requirement is verified and adopted.

Do not update business documents for purely technical refactoring unless the business behavior or contractual requirements change.

### Documentation Status

The initial business documentation represents the proposed CRM business model.

Business policies that require confirmation must be identified as `Proposed`, `Pending Confirmation`, or `Open Decision` in their respective documents.

Do not interpret proposed workflows, sample status values, approval thresholds, or unverified regulatory requirements as finalized company policy.

---

## 11. Definition of Business Readiness

A module is ready for implementation when:

- [ ] Business purpose is defined.
- [ ] Main workflow is documented.
- [ ] Required inputs and outputs are identified.
- [ ] Business entities and relationships are understood.
- [ ] Roles and data scopes are identified.
- [ ] Critical business rules are documented.
- [ ] Error and exception scenarios are identified.
- [ ] Dependencies are known.
- [ ] Acceptance criteria are testable.
- [ ] Blocking business decisions are resolved or the affected functionality is explicitly excluded.

A module must not be marked implemented simply because its documentation is complete.

---

## 12. Document Ownership

**Business knowledge:** `docs/business/`  
**Functional specifications:** `docs/modules/`  
**Technical architecture:** `docs/architecture/`  
**Project context:** `docs/context.md`  
**Development task status:** Nimbalyst Tracker  
**AI development rules:** `AGENTS.md`

This directory serves as the shared business knowledge base for the Seafood Export CRM project.
