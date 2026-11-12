---
tracker_id: "pln_mwc3wlise7obf2"
title: "Plan for TASK: R1-07 · M09 · RFQs"
status: "in-review"
priority: "medium"
module: "system"
source: "nimbalyst"
source_updated_at: "2026-11-11T13:05:08.227Z"
exported_at: "2026-11-12T00:33:15.799Z"
content_hash: 112b0aee8c3f2188655a838af6a0b28af01a25ac43b9a52a58b748936c069293
schema_version: 1
---
# TASK: R1-07 · M09 · RFQs
**Release:** R1 — Core CRM
**Prerequisites:** R1-03 — Customers, R1-06 — Product Specifications
**Module:** `docs/modules/rfqs.md`
## 1. Objective
Triển khai M09 — RFQs (Request for Quotation) để tiếp nhận, quản lý và xử lý yêu cầu báo giá của khách hàng B2B.
**Yêu cầu trọng tâm:**
- Mỗi RFQ bắt buộc có Customer và Sales Owner.
- Cho phép tạo Customer Prospect trực tiếp, không cần Lead.
- Ghi nhận nguyên bản yêu cầu buyer bằng free-text và response deadline trước khi mapping SKU.
- Phân biệt rõ Original Requested Specification và Offered Specification.
- Một RFQ có thể phát sinh nhiều offer alternatives độc lập.
- Bảo toàn yêu cầu ban đầu, lịch sử chỉnh sửa và khả năng truy vết.
## 2. Scope
### A. RFQ Management
- Create, read, update và quản lý RFQs.
- Bắt buộc Customer và Sales Owner hợp lệ.
- Validate Customer lifecycle và authorization.
- Cho phép tạo Prospect trực tiếp từ RFQ workflow.
- Không bắt buộc Lead hoặc Opportunity.
- Quản lý RFQ reference, source, received date và response deadline theo specification.
- Một RFQ có thể chứa nhiều requested items.
- Audit các thay đổi nghiệp vụ quan trọng.
### B. Original Buyer Requirements
**Không bắt buộc SKU khi tạo RFQ.**
Cho phép ghi nhận:
- Original product description (free-text).
- Requested species/product.
- Grade, size và processing requirements.
- Quantity và unit.
- Packaging requirements.
- Technical requirements.
- Destination/market khi có.
- Special instructions.
- Response deadline.
- Supporting files nếu được duyệt.
Yêu cầu:
- Preserve buyer requirements nguyên bản.
- Không tự động thay thế free-text bằng Product Catalog.
- Không tự suy đoán SKU, grade, species hoặc technical specification.
- Cho phép mapping SKU ở giai đoạn sau.
- Nếu buyer requirements thay đổi, giữ version/history theo approved policy.
- Validate required fields nhưng không bắt buộc thông tin kỹ thuật chưa được buyer cung cấp.
### C. Product & Specification Mapping
Hỗ trợ mapping:
`RFQ Requested Item → Product/SKU → Specification Revision`
Yêu cầu:
- Một requested item có thể chưa được mapping.
- Chỉ sử dụng eligible Products theo R1-05.
- Validate Product/Specification compatibility.
- Reference đúng approved Specification Revision từ R1-06.
- Mapping không được overwrite original buyer requirements.
- Không dùng mutable current specification để thay đổi offered history.
**Phân biệt ba khái niệm:**
| Concept | Meaning |
| --- | --- |
| Original Requested Specification | Buyer thực sự yêu cầu gì |
| Mapped Specification | SKU/Spec được Sales xác định là phù hợp |
| Offered Specification | Thông số doanh nghiệp thực tế đề xuất chào bán |
Không tự đồng nhất ba loại dữ liệu này.
### D. Multiple Offer Alternatives
**Một RFQ có thể tạo nhiều offer alternatives.**
Ví dụ:
```javascript
RFQ-001
Customer: ABC Seafood
Sales Owner: Sales A

Original Buyer Request:
- Frozen squid
- Size: 100–200 g
- Packaging: 10 kg/carton
- Quantity: 5,000 kg

Alternative A:
- SKU: SQ-001
- Specification Revision: V2
- Size: 100–200 g

Alternative B:
- SKU: SQ-002
- Specification Revision: V1
- Size: 150–250 g
```
Expected behavior:
- Original Buyer Request không thay đổi.
- Alternative A và B có identity riêng.
- Mỗi alternative có Product/Specification Revision riêng.
- Có thể nhận biết sự khác biệt so với yêu cầu gốc.
- Không tự động merge hoặc overwrite alternatives.
- Không tự động xem alternative là đã được buyer chấp nhận.
- Multiple Quotation Alternatives có thể phát sinh từ một RFQ theo integration contract được duyệt.
**Integration boundary:**
- M09 quản lý buyer requests và mapping/alternative references trong phạm vi được duyệt.
- M10 Quotations quản lý commercial alternatives, revisions, pricing và submission.
- Không triển khai toàn bộ M10 trong R1-07.
- Không tạo trùng quotation alternative model nếu M10 đã có contract được duyệt.
### E. Specification Traceability & History
Đảm bảo truy vết:
`Original Request → Requested Item → SKU Mapping → Offered Specification Revision → Quotation Alternative`
Yêu cầu:
- Preserve nguyên bản buyer requirements.
- Preserve mapping history khi cần.
- Không làm thay đổi original request khi Product/Spec được cập nhật.
- Offered Specification phải được gắn với đúng immutable revision tại thời điểm nghiệp vụ được duyệt.
- Không hard-delete historical references.
- Audit mọi thay đổi bắt buộc.
Phải xác nhận snapshot timing và revision policy trong Plan, tránh tự quyết định commercial submission behavior.
### F. RFQ Ownership & Authorization
- Mỗi RFQ bắt buộc có Sales Owner hợp lệ.
- Validate Customer parent scope.
- Không cho unauthorized users đọc/sửa RFQ thuộc Customer khác.
- Direct API lookup phải enforce record-level authorization.
- Customer handover phải tuân thủ approved historical access policy từ R1-03.
- Không tiết lộ buyer requirements, alternatives hoặc files qua search, filters, counts hay direct URLs.
- Ownership changes phải transactionally consistent với mandatory audit.
Không tự suy diễn RFQ ownership transfer rules từ Customer nếu specification có quy tắc riêng.
### G. RFQ Deadline & Lifecycle
- Ghi nhận response deadline.
- Validate date/time và timezone theo approved policy.
- Store UTC timestamps và preserve business timezone context.
- Áp dụng RFQ lifecycle và state transitions đã được phê duyệt.
- Audit các state changes quan trọng.
- Không tự triển khai automatic expiration, notifications hoặc SLA ngoài scope.
### H. API & UI
Chức năng dự kiến:
- RFQ List/Search.
- Create/Edit RFQ.
- RFQ Detail.
- Requested Items.
- Buyer Requirements.
- SKU/Specification Mapping.
- Offer Alternatives.
- Deadline Tracking.
- RFQ History.
Yêu cầu:
- REST `/api/v1`, OpenAPI 3.1.
- Server-side validation và authorization.
- Scoped queries và safe DTO projections.
- Pagination, filtering và deterministic sorting.
- Optimistic concurrency khi phù hợp.
- Consistent error handling.
- Reuse approved design system.
Xác minh endpoints và use cases từ module specification trước khi thiết kế implementation.
### I. Database & Audit
- PostgreSQL + Drizzle/Postgres.js.
- Versioned SQL-only migrations.
- Integer auto-increment primary keys.
- Không tạo SQL `FOREIGN KEY` / `REFERENCES`.
- Logical relationships do Application Layer quản lý.
- Preserve original requirements và specification references.
- Hỗ trợ multiple items và alternatives.
- Indexes phù hợp với Customer, Sales Owner, status và deadlines.
- Transactions cho multi-record operations.
- Mandatory audit failure phải rollback associated business changes.
- Đồng bộ schema, comments, ERD và dictionary.
## 3. Acceptance Criteria
| ID | Scenario | Expected Result |
| --- | --- | --- |
| AC-01 | Create RFQ with Customer and Sales Owner | Success + audit |
| AC-02 | Create RFQ without Customer | Rejected |
| AC-03 | Create RFQ without Sales Owner | Rejected |
| AC-04 | Create RFQ using Prospect without Lead | Allowed |
| AC-05 | Create RFQ with free-text only | Allowed before SKU mapping |
| AC-06 | Capture Original Buyer Requirements | Preserved |
| AC-07 | Map requested item to SKU | Original request unchanged |
| AC-08 | Map approved Spec Revision | Correct version reference |
| AC-09 | One RFQ creates multiple alternatives | Independent identities |
| AC-10 | Offered Spec differs from requested Spec | Differences remain visible |
| AC-11 | Update Product/Spec after mapping | Historical committed data preserved |
| AC-12 | Select retired/ineligible SKU for new line | Denied |
| AC-13 | Unauthorized RFQ access | Denied |
| AC-14 | Direct RFQ lookup | Customer/record scope enforced |
| AC-15 | Customer ownership handover | Approved historical scope enforced |
| AC-16 | Concurrent RFQ updates | No silent lost updates |
| AC-17 | Mandatory audit failure | Entire business transaction rolled back |
| AC-18 | Invalid deadline | Rejected according to approved policy |
| AC-19 | Search/filter/pagination | No unauthorized data leakage |
| AC-20 | RFQ → Quotation alternatives | Traceability preserved when integration exists |
**Verification bắt buộc:**
- PostgreSQL integration tests cho RFQs, requested items và alternatives.
- Real HTTP authorization tests.
- Kiểm tra Prospect creation không cần Lead.
- Kiểm tra free-text requirements trước SKU mapping.
- Kiểm tra Original Request không bị overwrite.
- Kiểm tra multiple alternatives.
- Kiểm tra immutable Specification Revision references.
- Kiểm tra ownership scope, concurrent updates và audit rollback.
- Nếu M10 chưa tồn tại, không đánh dấu RFQ → Quotation end-to-end là PASS.
## 4. Constraints
- Xác minh R1-03 Customers và R1-06 Product Specifications đã triển khai thực tế.
- Reuse Authentication, Authorization, Audit, Customer History và Product Specification Versioning.
- Không bắt buộc Lead/Opportunity.
- Không bắt buộc SKU tại RFQ creation.
- Không tự động merge hoặc overwrite buyer requests.
- Không triển khai full Quotations, Price Lists hoặc Sales Orders.
- Không tự quyết định pricing, quotation approval hoặc submission policies.
- Không tự suy đoán technical requirements.
- Không thay đổi ownership/historical access policies khi chưa được duyệt.
- Không thêm dependencies/infrastructure ngoài approved scope.
- Tuân thủ toàn bộ constraints trong `AGENTS.md`.
## 5. Execution & Tracker Integration
Tuân thủ toàn bộ **Mandatory Task Workflow** trong `AGENTS.md`.
### Phase A — Planning
Bắt đầu bằng `/plan`:
1. Đọc `AGENTS.md`, `docs/modules/rfqs.md`, Customer/Product Specification specs và các tài liệu liên quan thực sự tồn tại.
2. Xác minh implementation R1-03 và R1-06 bằng source code, database, APIs và tests.
3. Kiểm tra Customer ownership, Sales Owner permissions, Product eligibility, Specification Revisions và Audit infrastructure.
4. Đề xuất RFQ domain model, requested items, original free-text requirements và deadlines.
5. Thiết kế SKU mapping và mối quan hệ giữa Requested Specification và Offered Specification.
6. Xác định cardinality và ownership của multiple alternatives.
7. Xác định snapshot/traceability boundaries với M10 Quotations.
8. Phân tích security, concurrency, database indexes và performance.
9. Sử dụng `/grill-me` với các quyết định chưa rõ:
   - RFQ lifecycle.
   - Original request versioning.
   - Multiple alternatives ownership/cardinality.
   - Customer/RFQ ownership handover.
   - Deadline/timezone policy.
   - Snapshot timing.
   - RFQ → Quotation integration contract.
10. Trình bày Implementation Plan gồm architecture, schema, APIs, UI, detailed subtasks, dependencies, risks, verification và acceptance criteria.
### Phase B — Plan Approval & Tracker Decision
**Ngay trong phản hồi trình bày Plan, bắt buộc hỏi hai câu riêng biệt:**
1. **"Bạn có phê duyệt Implementation Plan R1-07 — RFQs không?"**
2. **"Bạn có muốn tôi tạo task R1-07 trong Nimbalyst Tracker với đầy đủ subtasks, dependencies và acceptance criteria theo Plan này không?"**
**Không kết thúc phản hồi Plan nếu thiếu câu hỏi về Tracker.**
Chờ xác nhận.
Chỉ tạo/cập nhật Tracker khi:
- Plan đã được phê duyệt.
- Người dùng đồng ý tạo Tracker.
Khi được phép:
1. Kiểm tra task R1-07 hiện có để tránh duplicate.
2. Tạo/cập nhật task bằng Nimbalyst Tracker integration hiện có.
3. Ghi đầy đủ:
   - Task ID/title/module.
   - Objective và approved scope.
   - Prerequisites/dependencies.
   - Architecture/design decisions.
   - Database/API/UI changes.
   - Implementation subtasks theo thứ tự.
   - Acceptance criteria.
   - Test/verification checklist.
   - Security, data integrity và concurrency risks.
   - Blockers và pending decisions.
4. Chia subtasks thành các đơn vị có thể kiểm chứng.
5. Giữ trạng thái Planned hoặc trạng thái tương ứng.
6. Trả về Tracker task ID và trạng thái thực tế.
Nếu Tracker không khả dụng, báo rõ; không giả vờ đã tạo task.
**Tracker approval không đồng nghĩa với Implementation approval.**
### Phase C — Standard Workflow
Sau Tracker Decision, tiếp tục:
1. Documentation Decision.
2. Implementation Approval.
3. Implementation.
4. Testing và `/goal`.
5. Development Log Decision.
6. Specification Update Decision.
7. Final Report.
Các approval gates vẫn độc lập theo `AGENTS.md`.
**DỪNG sau khi trình bày Plan và hai câu hỏi xác nhận. Không sửa application code trước Implementation Approval.**
