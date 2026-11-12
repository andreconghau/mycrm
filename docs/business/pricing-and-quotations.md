# BUS-03 — Product Specifications, Price Lists and Quotations

R1 pricing and approval policy.

### Price Lists

Filter by SKU, unit, validity, currency and quantity. Show all eligible prices; preselect customer, then market, then general. Record every selection, reference amount, actor and time.

Acceptance: Choosing another eligible reference at its listed price needs no reason. Manual prices and overrides require reasons visible to the approver.

### Quotations — draft and calculate

Create independent alternatives and revisions. Require SKU and specification version before submission. Display and calculate in USD; use one positive VND-per-USD rate per revision with VND inputs. Save original amounts, unrounded converted lines and both totals.

Acceptance: Draft FX changes recompute VND lines. Sum exact decimals before rounding the total to cents using ROUND_HALF_EVEN: 20.005 → 20.00, 20.015 → 20.02, 10.004 + 10.004 → 20.01.

For mixed-currency drafts, retain original USD and VND totals separately and never add across currencies; the payable total is USD. Calculate that final total from exact source amounts and the revision's rate, including freight and insurance as explicit adjustments, and round only the aggregate. A new revision clones the latest revision of its own alternative into an independent draft. Drafts may be incomplete; readiness checks require an eligible SKU and approved Specification Revision per commercial line without submitting or locking it. M08 price selection is reused after its contract is implemented and verified.

The R1-09 Draft & Calculate implementation slice excludes submission, approval/rejection/withdrawal, PDF issue, buyer acceptance and Sales Order conversion. The approved rules below remain the specification for those later slices. The representation of repeating converted line decimals must not affect exact payable-total calculation; its persisted precision and serialization remain to be designed before migration approval.

### Quotations — approval and issue

Lock each submitted version. Every version requires Manager or Admin approval (explicit grant, no amount threshold); Sale cannot approve. Self-approval requires a comment of at least 10 characters after trimming whitespace and is recorded as `self_approved`. See [R1 decisions](r1-decisions.md). Rejection and Sales withdrawal require reasons and immutable history. Copy a withdrawn/rejected version into a new draft. Issue PDF from approved data.

Acceptance: Concurrent withdrawal and approval yield one outcome. A revision supersedes only its own alternative. Stale approval cannot authorize new terms.

The VND/USD rate is a reference field with append-only history; it is excluded from the submitted-version lock and never changes USD totals. Quotation PDFs support English only, English–Vietnamese, English–Korean and Vietnamese–Korean; missing translations block issue. Details and controlled exceptions: [R1 decisions](r1-decisions.md).

### Quotations — acceptance

Accept one issued alternative per RFQ and close others with history. For partial acceptance, issue a new version for the chosen items. Store evidence, buyer acceptance time and system recording time.

Acceptance: Concurrent selection yields one winner. Late upload of timely evidence is allowed. Late or unverifiable acceptance requires newly approved and issued terms.

## 6. Incoterms and trade-term validation

Store **rule + named place/port + year** as distinct fields. Different rules allocate costs, risks and obligations differently. Do not infer freight/insurance responsibilities solely from `FOB`, `CFR` or `CIF` without understanding the agreed rule and commercial contract.

For reference, Incoterms® 2020 has seven rules for any mode of transport and four for sea/inland waterway; the ICC identifies the named place/port as essential to interpretation. Source: [ICC Incoterms® 2020](https://iccwbo.org/business-solutions/incoterms-rules/incoterms-2020/) and [ICC explanatory Q&A](https://library.iccwbo.org/clp/clp-incoterms-qa-2020.htm?AGENT=ICC_HQ).

The CRM does not itself determine legal transfer of title, payment obligations or the full sales contract from an Incoterms value.
