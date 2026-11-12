---
tracker_id: "tsk_mwbswy4ml5i41o"
title: "R1-05 M06 · Products"
status: "done"
priority: "medium"
module: "system"
source: "nimbalyst"
source_updated_at: "2026-11-11T09:02:53.491Z"
exported_at: "2026-11-12T00:33:16.049Z"
content_hash: 7e5b8a98b824b9ea407ad74e92e686528099314424d312fc54b14b0f6fea85fb
schema_version: 1
---
# TASK: R1-05 · M06 · Products
**Release:** R1 — Core CRM
**Prerequisites:** R1-01 — Access Control, R1-02 — Audit Log
**Module:** `docs/modules/products.md`
## 1. Objective
Triển khai M06 — Products để quản lý danh mục sản phẩm hải sản xuất khẩu B2B, bao gồm SKUs, product families, units, multilingual names và commercial eligibility.
**Yêu cầu trọng tâm:**
- Chỉ những SKU đủ điều kiện mới được lựa chọn cho commercial lines mới.
- Retired/Inactive SKU không được xuất hiện trong danh sách lựa chọn mới.
- Các giao dịch và commercial snapshots trước đó phải giữ nguyên dữ liệu lịch sử.
- Không xóa hoặc làm thay đổi lịch sử chỉ vì Product được cập nhật hoặc ngừng kinh doanh.
## 2. Scope
### Product & SKU Management
- Create, read, update, approve và retire Products theo lifecycle được duyệt.
- Quản lý unique SKU, product family, category và species.
- Quản lý processing form, origin và default unit.
- Hỗ trợ multilingual display names: Korean, English, Vietnamese.
- Quản lý aliases và search synonyms.
- Validate SKU uniqueness và required fields.
- Không tự suy đoán scientific species, HS codes, certifications hoặc country of origin.
### Product Classification & Units
- Phân loại theo product family, species, processing form và category.
- Hỗ trợ các đơn vị tính theo approved unit conventions.
- Validate unit compatibility khi Product được dùng trong commercial lines.
- Không tự động chuyển đổi đơn vị nếu chưa có approved conversion rules.
- Phân biệt Product identity với Product Specifications (M07).
- Không tạo duplicate product variants bằng free-text naming nếu đã có approved specification model.
### Product Lifecycle & Eligibility
Lifecycle đề xuất trong module specification:
`DRAFT → ACTIVE / INACTIVE`
Cần xác nhận các state transitions và approval rules trong `/grill-me`.
Yêu cầu:
- DRAFT chưa được phép sử dụng thương mại nếu chưa đủ điều kiện.
- ACTIVE có thể được lựa chọn cho commercial lines theo approved rules.
- INACTIVE/Retired không được sử dụng cho commercial lines mới, trừ documented exception được phê duyệt.
- Không hard-delete SKU đã được tham chiếu trong giao dịch.
- Eligibility phải được kiểm tra server-side, không chỉ ẩn trên UI.
- Xử lý concurrent retirement và commercial selection để tránh bypass.
### Historical Commercial Integrity
**Đây là yêu cầu quan trọng nhất của R1-05.**
Ví dụ:
```javascript
T1: SKU SQ-001 — ACTIVE
T2: Quotation Q-001 uses SQ-001
T3: SKU SQ-001 renamed
T4: SKU SQ-001 retired
T5: User creates Quotation Q-002
```
Kết quả:
- Q-001 giữ nguyên product label, SKU, unit và accepted commercial terms tại thời điểm phát hành/chấp nhận.
- SQ-001 không xuất hiện trong lựa chọn sản phẩm mới của Q-002.
- Direct API requests không thể thêm retired SKU vào commercial line mới.
- Historical quotations/orders vẫn truy xuất được SKU và dữ liệu snapshot gốc.
- Product update/retirement không làm thay đổi accepted transactions.
**Technical requirements:**
- Không sử dụng mutable Product data để thay thế historical commercial snapshots.
- Không cascade-delete historical references.
- Validate eligibility tại thời điểm tạo commercial line.
- Phân biệt tạo line mới với đọc giao dịch cũ.
- Reuse existing commercial snapshot contracts nếu đã triển khai.
- Nếu RFQ/Quotation/Sales Order chưa được triển khai, kiểm tra eligibility bằng domain/integration tests, không tự tạo các module đó.
### Product Search & Catalog
- Search theo SKU, tên, aliases và category.
- Filter theo family, species, form và status.
- Hỗ trợ multilingual search trong phạm vi được duyệt.
- Tách rõ catalog browsing và eligible-product selection.
- Pagination, deterministic sorting và indexes phù hợp.
- Không làm lộ unpublished Product/Specification cho unauthorized users.
### API & UI
Các endpoints được đề xuất trong specification:
- `GET /api/v1/products`
- `POST /api/v1/products`
- `GET /api/v1/products/:id`
- `PATCH /api/v1/products/:id`
Các use cases:
- `CreateProduct`
- `EditProduct`
- `ApproveProduct`
- `RetireProduct`
- `SearchProductCatalog`
Yêu cầu:
- REST `/api/v1` và OpenAPI 3.1.
- Server-side validation và authorization.
- Product Catalog UI.
- Create/Edit Product.
- Product detail và lifecycle actions.
- Search/filter với eligibility indicators.
- UI theo approved design system.
Chỉ triển khai contracts đã được duyệt trong Plan.
### Authorization & Audit
- Sales có quyền đọc theo approved grants.
- Catalog editing/approval/retirement chỉ dành cho roles hoặc permissions được phê duyệt.
- Không tự tạo role `Catalog Admin` hoặc `Purchasing` nếu chúng không thuộc bốn application roles đã xác nhận.
- Default-deny và field-level authorization khi áp dụng.
- Audit create/update/approve/retire và eligibility changes.
- Mandatory audit failure phải rollback business change.
### Database
- PostgreSQL + Drizzle/Postgres.js.
- Versioned SQL-only migrations.
- Integer auto-increment primary keys.
- Không tạo SQL `FOREIGN KEY` / `REFERENCES`.
- Logical relationships do Application Layer quản lý.
- Unique SKU theo approved normalization rules.
- Indexes cho SKU lookup, status và catalog search.
- Preserve historical references và commercial snapshots.
- Đồng bộ schema, SQL comments, ERD và dictionary.
## 3. Acceptance Criteria
| ID | Scenario | Expected Result |
| --- | --- | --- |
| AC-01 | Authorized Product creation | Success + audit |
| AC-02 | Duplicate SKU | Rejected |
| AC-03 | Invalid product/unit | Validation error |
| AC-04 | Unauthorized Product modification | Denied |
| AC-05 | DRAFT SKU in new commercial line | Denied theo policy |
| AC-06 | ACTIVE eligible SKU | Available for new selection |
| AC-07 | Retire active SKU | No longer eligible for new lines |
| AC-08 | Direct API references retired SKU | Denied without approved exception |
| AC-09 | Existing quotation/order references retired SKU | Historical reference preserved |
| AC-10 | Update Product display name | Historical commercial label unchanged |
| AC-11 | Change SKU attributes/unit | Historical snapshot unchanged |
| AC-12 | Multilingual aliases search | Correct authorized results |
| AC-13 | Concurrent retirement/selection | No invalid new commercial reference |
| AC-14 | Mandatory audit failure | Business transaction rolled back |
| AC-15 | Unauthorized catalog editing | Denied |
| AC-16 | Unpublished product/specification lookup | Enforces approved access policy |
| AC-17 | Search/filter/pagination | Correct and consistent results |
**Verification bắt buộc:**
- PostgreSQL integration tests cho SKU uniqueness và lifecycle.
- Real HTTP tests cho authorization và retirement.
- Kiểm tra new commercial selection không sử dụng retired SKU.
- Kiểm tra historical snapshot preservation.
- Kiểm tra concurrency giữa retirement và product selection.
- Kiểm tra transactional audit rollback.
- Không tự tuyên bố Quotation/Sales Order integration đã pass nếu các modules đó chưa tồn tại.
## 4. Constraints
- Xác minh R1-01 và R1-02 đã triển khai thực tế.
- Không triển khai Product Specifications (M07), Price Lists (M08) hoặc Quotations (M10) ngoài integration scope được duyệt.
- Không tự tạo application roles mới.
- Không tự suy đoán scientific names, HS codes, origins hoặc certifications.
- Không hard-delete referenced SKUs.
- Không làm thay đổi historical commercial snapshots.
- Không tự quyết định SKU reactivation, unit conversion hoặc eligibility exceptions khi specification chưa rõ.
- Không thêm external search infrastructure khi chưa được duyệt.
- Reuse existing architecture, authorization và audit infrastructure.
- Tuân thủ toàn bộ quy định trong `AGENTS.md`.
## 5. Execution
Tuân thủ **Mandatory Task Workflow** trong `AGENTS.md`.
Bắt đầu bằng `/plan`:
1. Đọc `AGENTS.md`, `docs/modules/products.md` và các tài liệu liên quan thực sự tồn tại.
2. Xác minh implementation R1-01 và R1-02.
3. Kiểm tra Product-related schema, APIs, services và existing patterns.
4. Đề xuất Product/SKU domain model, families, units và lifecycle.
5. Xác định commercial eligibility rules và historical snapshot boundaries.
6. Phân tích authorization, audit, concurrency, indexes và performance.
7. Sử dụng `/grill-me` cho các quyết định chưa xác nhận, đặc biệt là SKU lifecycle, product approval, catalog permissions, unit conventions và retirement exceptions.
8. Trình bày Implementation Plan với schema, APIs, UI, affected files, risks, tests và acceptance criteria.
**DỪNG sau khi hoàn thành Plan để chờ phê duyệt. Không sửa application code trước Implementation approval.**
Các giai đoạn Documentation Decision, Implementation, Testing, `/goal`, Development Log và Spec Update tuân thủ `AGENTS.md`.
