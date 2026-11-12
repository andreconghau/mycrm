---
tracker_id: "pln_mwc2s7mtq6yht5"
title: "Plan for TASK: R1-08 · M08 · Price Lists"
status: "in-development"
priority: "medium"
module: "CLAUDE"
source: "nimbalyst"
source_updated_at: "2026-11-11T12:36:12.668Z"
exported_at: "2026-11-12T00:33:15.924Z"
content_hash: 8ba376ef3a7e070d799249040c91e98dbafb4ef0de729b01a739ddd6c0210d6a
schema_version: 1
---
# TASK: R1-08 · M08 · Price Lists
**Release:** R1 — Core CRM
**Prerequisites:** R1-03 — Customers, R1-05 — Products, R1-06 — Product Specifications
**Module:** `docs/modules/price-lists.md`
## 1. Objective
Triển khai M08 — Price Lists để quản lý bảng giá sản phẩm B2B theo Customer, Market và General, hỗ trợ lựa chọn giá tham chiếu cho Quotations.
**Yêu cầu trọng tâm:**
- Hiển thị tất cả mức giá đủ điều kiện (eligible prices).
- Ưu tiên đề xuất Customer → Market → General.
- Cho phép Sales chọn bất kỳ eligible reference nào tại đúng listed price mà không cần reason.
- Manual prices và price overrides bắt buộc có reason, hiển thị cho approver.
- Ghi nhận mọi lần lựa chọn giá, reference amount, actor và timestamp.
- Thay đổi Price List không được làm thay đổi historical quotations.
## 2. Scope
### A. Price List Management
- Create, read, update, approve và expire Price Lists.
- Quản lý Customer-specific, Market-specific và General price lists.
- Quản lý SKU, Specification Revision, currency, unit, price basis và quantity tiers.
- Quản lý validity windows và effective dates.
- Sử dụng fixed-precision decimals cho monetary values.
- Validate logical relationships với Customers, Products và Specifications.
- Không tự động áp dụng expired, unapproved hoặc ineligible prices.
Lifecycle đề xuất:
`DRAFT → APPROVED → ACTIVE → EXPIRED / ARCHIVED`
Xác minh state transitions và approval policy trước implementation.
### B. Eligible Price Matching
Filter eligible prices theo:
1. SKU/Product.
2. Specification Revision khi áp dụng.
3. Unit of Measurement.
4. Effective validity window.
5. Currency.
6. Quantity và quantity tiers.
7. Customer/Market/General scope.
8. Approval và active status.
**Matching rules:**
- Trả về tất cả eligible prices, không chỉ giá thấp nhất.
- Không tự động loại bỏ các mức giá hợp lệ có overlapping ranges.
- Không tự động convert currency hoặc units.
- Không chọn expired hoặc inactive price.
- Kiểm tra eligibility server-side.
**Preselection priority:**
`Customer → Market → General`
Priority chỉ xác định giá được đề xuất mặc định, không giới hạn các lựa chọn hợp lệ khác.
Nếu nhiều eligible prices cùng priority, sử dụng deterministic ordering theo policy được duyệt.
Không tự chọn giá thấp nhất nếu chưa được xác nhận.
### C. Price Selection & Reason Policy
**Đây là business rule quan trọng nhất của R1-08.**
| Scenario | Reason required |
| --- | --- |
| Chọn giá Customer mặc định tại listed price | No |
| Chọn giá Market đủ điều kiện tại listed price | No |
| Chọn giá General đủ điều kiện tại listed price | No |
| Chọn eligible reference khác tại đúng listed price | No |
| Nhập giá thủ công không dựa trên eligible reference | Yes |
| Thay đổi amount của eligible reference | Yes |
| Price override theo policy | Yes |
Yêu cầu:
- Không yêu cầu reason chỉ vì Sales chọn reference khác giá mặc định.
- Không coi việc chọn giá tham chiếu thấp hơn là manual override nếu vẫn dùng đúng listed price hợp lệ.
- Không cho phép bỏ qua reason bằng direct API requests.
- Manual/override reason phải được lưu bền vững và hiển thị cho approver.
- Không tự thiết lập approval thresholds hoặc price floors khi chưa được duyệt.
### D. Price Selection Audit & Traceability
Mỗi price selection phải ghi nhận:
- Selected reference ID và Price List Item ID, nếu có.
- Listed reference amount.
- Selected amount.
- Currency, unit và quantity basis.
- Selection type: eligible reference, manual hoặc override.
- Actor.
- Timestamp.
- Reason khi bắt buộc.
- Related commercial draft/line khi có.
- Applicable revision/source metadata.
Yêu cầu:
- Ghi nhận cả khi chọn lại một eligible reference khác.
- Không overwrite selection history.
- Không chỉ lưu reference ID mà làm mất listed amount tại thời điểm chọn.
- Mandatory audit phải transactionally consistent với business operation.
- Không tự động repricing historical transactions khi Price List thay đổi.
### E. Commercial Snapshot & Integration
- Tích hợp với Products và approved Specification Revisions.
- Thiết kế contract cung cấp eligible prices cho M10 Quotations.
- Quotation phải xác nhận lựa chọn giá rõ ràng.
- Lưu selected reference, listed amount và accepted commercial price theo approved snapshot contract.
- Price List changes không làm thay đổi issued/accepted quotations.
- Không dùng mutable Price List joins để render historical commercial terms.
**Boundary:** Không triển khai toàn bộ M10 Quotations trong R1-08.
Nếu M10 chưa tồn tại, triển khai Price List selection contract và kiểm thử độc lập. Không tuyên bố quotation approval/PDF integration đã hoàn thành.
### F. API & UI
Chức năng dự kiến:
- Price List CRUD.
- Price List Items và quantity tiers.
- Approval/status management.
- Eligible price lookup.
- Price selection.
- Price selection history.
- Manual/override reason capture.
API theo REST `/api/v1`, OpenAPI 3.1.
UI:
- Price List Grid.
- Create/Edit Price List.
- Price List Details.
- Eligible Prices Selection.
- Highlight recommended reference.
- Display all other eligible references.
- Manual/Override Reason Input.
- Selection History.
Yêu cầu:
- Server-side validation và authorization.
- Safe DTO projection.
- Pagination/filtering và deterministic sorting.
- Không expose restricted cost-only fields.
- Reuse approved design system.
Chỉ triển khai endpoints/UI đã được duyệt trong Plan.
### G. Database, Security & Performance
- PostgreSQL + Drizzle/Postgres.js.
- Versioned SQL-only migrations.
- Integer auto-increment primary keys.
- Không tạo SQL `FOREIGN KEY` / `REFERENCES`.
- Logical relationships được enforce tại Application Layer.
- Fixed-precision decimal prices.
- Không implicit currency conversion.
- Indexes cho eligible price queries và validity windows.
- Server-side RBAC và record scope.
- Pricing approval chỉ dành cho approved permissions.
- Mandatory audit failure phải rollback business changes.
- Xử lý concurrent approval, expiry và price selection.
- Đồng bộ schema, comments, ERD và dictionary.
Không bổ sung external pricing engine hoặc infrastructure khi chưa được duyệt.
## 3. Acceptance Criteria
| ID | Scenario | Expected Result |
| --- | --- | --- |
| AC-01 | Authorized Price List creation | Success + audit |
| AC-02 | Filter by SKU/unit/currency/quantity/date | Only eligible prices returned |
| AC-03 | Multiple eligible prices | All displayed |
| AC-04 | Customer price exists | Preselected first |
| AC-05 | No Customer price, Market exists | Market preselected |
| AC-06 | No Customer/Market price | General preselected |
| AC-07 | Select another eligible reference | Allowed without reason |
| AC-08 | Use exact listed reference amount | No override reason |
| AC-09 | Enter manual price | Reason required |
| AC-10 | Override listed amount | Reason required |
| AC-11 | Manual/override reason | Persisted and visible to approver |
| AC-12 | Every price selection | Reference amount, actor, time recorded |
| AC-13 | Expired/unapproved price | Not eligible |
| AC-14 | Invalid currency/unit/quantity basis | Rejected |
| AC-15 | Unauthorized price modification | Denied |
| AC-16 | Price List updated after quotation issue | Historical quotation unchanged |
| AC-17 | Concurrent approval/selection | Consistent eligibility |
| AC-18 | Mandatory audit failure | Business transaction rolled back |
| AC-19 | Price search/filter/pagination | No unauthorized data exposure |
| AC-20 | Multiple same-priority eligible references | Deterministic preselection |
**Verification bắt buộc:**
- PostgreSQL integration tests cho eligibility matching.
- Real HTTP authorization tests.
- Kiểm tra priority Customer → Market → General.
- Kiểm tra tất cả eligible references được trả về.
- Chứng minh alternate eligible reference không cần reason.
- Chứng minh manual/override bắt buộc có reason.
- Kiểm tra selection history gồm actor, reference amount và timestamp.
- Kiểm tra fixed-precision decimals và validity boundaries.
- Kiểm tra transactional audit rollback.
- Không giả định M10 end-to-end tests PASS khi M10 chưa triển khai.
## 4. Constraints
- Xác minh thực tế R1-03, R1-05 và R1-06.
- Tái sử dụng Customer, Product, Specification, Authorization và Audit infrastructure.
- Không tự tạo application roles mới.
- Không tự quyết định price floor, approval thresholds hoặc currency conversion.
- Không bắt buộc reason khi chọn eligible reference khác tại đúng listed price.
- Không tự động ghi đè historical commercial prices.
- Không triển khai toàn bộ Quotations.
- Không tự thay đổi approved business rules.
- Tuân thủ architecture, database và security constraints trong `AGENTS.md`.
## 5. Execution & Tracker Integration
Tuân thủ **Mandatory Task Workflow** trong `AGENTS.md`, bổ sung Tracker Decision Gate cho task này.
### Phase A — Planning
Bắt đầu bằng `/plan`:
1. Đọc `AGENTS.md`, `docs/modules/price-lists.md`, tài liệu pricing/business và các specifications liên quan thực sự tồn tại.
2. Xác minh R1-03, R1-05 và R1-06 từ source code, database và tests.
3. Phân tích Product/SKU, Specification Revision, Customer scope và Audit infrastructure.
4. Thiết kế Price List domain model, price items, validity windows và quantity tiers.
5. Đề xuất eligible matching và deterministic preselection.
6. Thiết kế price selection history và reason policy.
7. Xác định integration contract với M10 Quotations.
8. Phân tích authorization, decimal precision, concurrency, indexes và performance.
9. Sử dụng `/grill-me` cho các quyết định chưa được xác nhận.
10. Trình bày Plan gồm architecture, schema, APIs, UI, affected files, implementation steps, risks, tests và acceptance criteria.
**STOP — Chờ Plan Approval. Không sửa application code.**
### Phase B — Tracker Decision (Bổ sung)
**Ngay sau khi Plan được phê duyệt, trước Documentation Decision và Implementation Approval**, hỏi:
**"Bạn có muốn tôi tạo task R1-08 — M08 Price Lists trong Nimbalyst Tracker dựa trên Plan vừa được duyệt không?"**
**STOP — Chờ xác nhận.**
Nếu đồng ý:
1. Kiểm tra Nimbalyst Tracker hiện có.
2. Tìm task R1-08 để tránh duplicate.
3. Sử dụng Tracker integration/tool hiện có để tạo task hoặc cập nhật task phù hợp.
4. Ghi đầy đủ Plan đã được phê duyệt vào task, gồm:
   - Task ID/title/module.
   - Objective.
   - Prerequisites.
   - Scope và out-of-scope.
   - Architecture/design decisions.
   - Database/API/UI changes.
   - Implementation subtasks và thứ tự dependencies.
   - Acceptance criteria.
   - Verification/test checklist.
   - Security/performance risks.
   - Blockers và pending decisions.
5. Chia subtasks thành các đơn vị triển khai có thể kiểm chứng.
6. Giữ trạng thái `Planned` hoặc trạng thái tương ứng; không tự đánh dấu In Progress/Completed.
7. Trả về task ID/reference và tóm tắt những gì đã tạo.
Nếu task đã tồn tại, đối chiếu nội dung trước khi cập nhật; bảo toàn lịch sử và không ghi đè dữ liệu ngoài scope.
Nếu Tracker không khả dụng, báo rõ và dừng thao tác Tracker. Không tự tạo tracker thay thế.
Nếu không đồng ý, bỏ qua Tracker creation và tiếp tục workflow theo `AGENTS.md`.
**Tracker approval chỉ cho phép tạo/cập nhật task planning records, không đồng nghĩa với Implementation Approval.**
### Phase C — Continue Standard Workflow
Sau Tracker Decision:
1. Documentation Decision.
2. Implementation Approval.
3. Implementation.
4. Testing và `/goal`.
5. Development Log Decision.
6. Specification Update Decision.
7. Final Report.
Mỗi approval gate vẫn phải độc lập theo `AGENTS.md`.
**Không sửa application code trước Implementation Approval.**
