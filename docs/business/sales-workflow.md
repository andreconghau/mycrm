# BUS-02 — Sales Workflow: Inquiry, RFQ, Quotation and Sales Order

R1 commercial workflow.

### RFQs

Require a customer and sales owner. Allow prospect creation without a lead. Capture free-text buyer requirements and deadline before SKU mapping.

Acceptance: The original requested specification and the offered specification remain distinguishable. Multiple alternatives may originate from one RFQ.

### Quotations — approval and issue

Lock each submitted version. Every version requires manager approval. Manager self-approval requires a nonblank comment. Rejection and Sales withdrawal require reasons and immutable history. Copy a withdrawn/rejected version into a new draft. Issue PDF from approved data.

Acceptance: Concurrent withdrawal and approval yield one outcome. A revision supersedes only its own alternative. Stale approval cannot authorize new terms.

### Quotations — acceptance

Accept one issued alternative per RFQ and close others with history. For partial acceptance, issue a new version for the chosen items. Store evidence, buyer acceptance time and system recording time.

Acceptance: Concurrent selection yields one winner. Late upload of timely evidence is allowed. Late or unverifiable acceptance requires newly approved and issued terms.

### Sales Orders — confirm

Require accepted quote even for a direct PO. Snapshot exact terms, FX, original and final amounts. Assigned Sales confirms with at least one private image or scan. Notify direct manager and quote approver in CRM atomically.

Acceptance: One RFQ yields at most one order. Missing evidence blocks confirmation. Retry or identical recipients produce one notification per person with independent read state.

### Sales Orders — amend and cancel

Keep order number and amendment history. Manager approves changed terms; Sales supplies buyer evidence to confirm. Before shipment, Sales submits cancellation reason and evidence for manager review.

Acceptance: Existing terms stay effective until amendment is confirmed. Order stays CONFIRMED pending cancellation or following reasoned rejection; only approval sets CANCELLED.

## 8. R1 / R2 / R3 handoffs

- **R1 output:** confirmed Sales Order with its commercial snapshot and readiness facts.
- **R2 input:** shipment allocations, booking, document checklist, L/C monitoring, actual movement evidence.
- **R3 input:** procurement/production need, cost plan, invoices/receivables, inventory and QC linkage.

Sales staff can view operational progress according to scope, but must not directly overwrite vessel event, QC result, receivable posting or payment status.
