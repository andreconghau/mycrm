---
tracker_id: "tsk_mwbzea0yykrdcx"
title: "R1-06 M07 · Product Specifications"
status: "approved"
priority: "medium"
module: "system"
source: "nimbalyst"
source_updated_at: "2026-11-12T00:29:30.264Z"
exported_at: "2026-11-12T00:33:15.546Z"
content_hash: 9c2e3a5e984dbd7a53506cedc8c98a1f5ec699cdfad14c413fd7a04fc1e5cffd
schema_version: 1
---
# TASK: R1-06 · M07 · Product Specifications
**Release:** R1 — Core CRM
**Prerequisite:** R1-05 — Products
**Module:** `docs/modules/product-specifications.md`
## 1. Objective
Triển khai M07 — Product Specifications để quản lý các thông số kỹ thuật và phiên bản của từng SKU hải sản xuất khẩu B2B.
Hỗ trợ grades, processing, weights, packaging, technical documents và buyer-specific specifications.
**Yêu cầu trọng tâm:**
- Mỗi Specification có revision độc lập, có thể truy vết.
- Approved Specification không được chỉnh sửa trực tiếp sau khi được sử dụng trong issued quotation.
- Quotation phải lưu chính xác Specification Revision tại thời điểm submission.
- Thay đổi Product hoặc Specification sau đó không được ảnh hưởng đến quotation, accepted terms hoặc PDF đã phát hành.
## 2. Scope
### A. Product Specification Management
- Create, read, update và quản lý Product Specifications theo SKU.
- Mỗi Specification phải thuộc một Product hợp lệ.
- Quản lý:
  - Grade và size range.
  - Processing method và treatment.
  - Frozen form và glazing percentage.
  - Net/gross weight.
  - Packaging type và material.
  - Packs per carton.
  - Carton net weight.
  - Unit of measurement.
  - Minimum Order Quantity (MOQ).
  - Storage temperature và shelf life.
  - Label language và requirements.
  - Origin và certifications nếu có dữ liệu được xác minh.
  - Buyer-specific requirements và notes.
- Validate Product/Specification compatibility.
- Không tự suy đoán technical values, certifications, shelf life hoặc storage temperature.
### B. Specification Versioning & Lifecycle
Lifecycle đề xuất trong specification:
`DRAFT → APPROVED → ARCHIVED`
Yêu cầu:
- DRAFT có thể chỉnh sửa theo quyền được duyệt.
- APPROVED revision phải được bảo vệ khỏi thay đổi ngoài chính sách.
- Thay đổi nội dung approved/published specification phải tạo revision mới.
- ARCHIVED revision không được sử dụng cho commercial selections mới theo policy được duyệt.
- Không hard-delete revisions đã có historical references.
- Revision number phải nhất quán và không bị trùng.
- Validate concurrent editing, approval và publishing.
- Tích hợp authorization và mandatory audit.
Phân biệt:
- `Product ID`: Định danh SKU.
- `Specification ID`: Định danh specification.
- `Revision/Version`: Phiên bản nội dung kỹ thuật.
- `Document Version`: Phiên bản technical file.
Không dùng mutable current specification để thay thế dữ liệu của revision cũ.
### C. Immutable Commercial Snapshot
**Đây là yêu cầu quan trọng nhất của R1-06.**
Ví dụ:
```javascript
T1: SKU SQ-001 has Spec V1
T2: Spec V1 approved
T3: Quotation Q-001 submitted using Spec V1
T4: Spec V2 created with new packaging/weight
T5: Spec V2 approved
T6: Quotation Q-002 submitted using Spec V2
```
**Expected Result:**
- Q-001 luôn giữ Spec V1 và thông số tại thời điểm submission.
- Q-002 sử dụng Spec V2 nếu được lựa chọn hợp lệ.
- Spec V2 không làm thay đổi Q-001.
- PDF của Q-001 không được thay đổi khi Product/Spec được cập nhật.
- Historical technical files vẫn truy xuất được theo authorization.
- Retire SKU hoặc archive Spec không làm mất historical commercial references.
**Technical Requirements:**
- Quotation lines phải tham chiếu chính xác approved Specification Revision.
- Khi submission, lưu immutable specification snapshot trong Quotation Version theo contract được duyệt.
- Snapshot bao gồm technical/commercial fields cần thiết để tái hiện offer.
- Preserve original units, pack quantities và relevant packaging data.
- Không sử dụng mutable database joins để render lại historical offer.
- Technical document references phải trỏ đến immutable file versions.
- Không overwrite object storage files đã được sử dụng trong issued documents.
- Không cho phép stale/concurrent updates thay đổi approved revision.
**Integration boundary:**
M10 — Quotations chịu trách nhiệm thực hiện submission và phát hành quotation PDF.
Trong R1-06:
- Thiết kế contract cung cấp approved immutable Specification Revision cho M10.
- Không tự triển khai toàn bộ Quotation workflow.
- Nếu M10 chưa tồn tại, kiểm thử revision/snapshot contract bằng isolated integration tests.
- Không tuyên bố PDF integration đã được xác minh nếu chưa có implementation thực tế.
### D. Technical Files & Documents
- Attach specification PDF/image và các technical documents được duyệt.
- Quản lý file version, metadata, checksum và storage references.
- Lưu files trong private storage theo approved infrastructure.
- Authorization bắt buộc khi upload, read hoặc download.
- Không expose private object keys hoặc unrestricted URLs.
- Preserve historical file versions.
- Không replace/delete files được tham chiếu bởi historical offers.
- Buyer-facing documents phải sử dụng đúng approved revision.
- Không tự triển khai document generation service ngoài approved scope.
### E. Weight, Packaging & Unit Validation
Validate:
- Net weight và gross weight.
- Pack weight và carton weight.
- Packs per carton.
- Quantity và Unit of Measurement.
- Size range/grade.
- Glazing percentage.
- MOQ.
- Product/Specification compatibility.
Ví dụ:
```javascript
Specification:
- Net weight: 10 kg/carton
- Quantity: 10 cartons

Expected total net weight:
- 100 kg
```
Yêu cầu:
- Gross weight không nhỏ hơn net weight khi cùng basis.
- Không chấp nhận impossible weights/percentages.
- Không tự chuyển đổi units khi thiếu explicit conversion rules.
- Phân biệt net, gross, glazing và commercial pricing basis.
- Sử dụng fixed-precision decimals, không dùng JS floating-point cho tính toán thương mại.
- Xác nhận rounding/conversion policy khi chưa được định nghĩa.
### F. Buyer-Specific Specifications
- Hỗ trợ buyer/market-specific requirements theo specification.
- Buyer customization không được overwrite standard specification.
- Giữ independent revisions khi cần.
- Bảo vệ buyer-specific notes theo approved authorization scope.
- Không tự tạo Customer-specific approval workflow ngoài scope đã duyệt.
### G. API & UI
Các proposed endpoints:
- `GET /api/v1/products/:id/specifications`
- `POST /api/v1/products/:id/specifications`
- `POST /api/v1/specifications/:id/publish`
Các use cases:
- `CreateSpecificationDraft`
- `ReviewSpecification`
- `PublishSpecificationRevision`
- `ListApprovedSpecifications`
UI:
- Product Specification List.
- Create/Edit Specification.
- Specification Details.
- Revision History.
- Side-by-side Revision Comparison.
- Technical File Management.
- Approval/Publish actions theo quyền được duyệt.
Yêu cầu:
- REST `/api/v1`, OpenAPI 3.1.
- Server-side validation và authorization.
- Scoped queries và safe DTO projections.
- Consistent error handling.
- Tuân thủ approved design system.
Chỉ triển khai endpoints và UI đã được phê duyệt trong Plan.
### H. Database & Audit
- PostgreSQL + Drizzle/Postgres.js.
- Versioned SQL-only migrations.
- Integer auto-increment primary keys.
- Không tạo SQL `FOREIGN KEY` / `REFERENCES`.
- Logical relationships do Application Layer quản lý.
- Preserve immutable approved revisions.
- Unique revision identity theo approved schema.
- Indexes cho Product/Specification lookup và revision history.
- Transactions cho publish/approval và mandatory audit.
- Audit create, update, approve, publish và archive.
- Audit failure phải rollback associated business changes.
- Đồng bộ schema, comments, ERD và dictionary.
## 3. Acceptance Criteria
| ID | Scenario | Expected Result |
| --- | --- | --- |
| AC-01 | Authorized specification creation | Success + audit |
| AC-02 | Invalid Product/Spec combination | Rejected |
| AC-03 | Valid Specification approval | Approved revision persisted |
| AC-04 | Edit approved immutable revision | Denied; new revision required |
| AC-05 | Create V2 from V1 | V1 unchanged |
| AC-06 | Quote submitted using V1 | Exact V1 snapshot preserved |
| AC-07 | V2 approved after prior offer | Earlier offer unchanged |
| AC-08 | Catalog attributes updated | Historical specification unchanged |
| AC-09 | Technical PDF updated | Historical file version preserved |
| AC-10 | Previously issued quotation PDF | Content unchanged |
| AC-11 | Retired SKU or archived Spec | Historical references preserved |
| AC-12 | 10 cartons × 10 kg net/carton | Correct total: 100 kg |
| AC-13 | Impossible weight/glazing values | Validation error |
| AC-14 | Missing required approved fields | Approval rejected |
| AC-15 | Unsupported unit conversion | Rejected |
| AC-16 | Concurrent revision publishing | No duplicate/inconsistent revision |
| AC-17 | Unauthorized approval/edit | Denied |
| AC-18 | Private technical file lookup | Authorization enforced |
| AC-19 | Mandatory audit failure | Associated transaction rolled back |
| AC-20 | Buyer-specific customization | Standard revision unchanged |
**Verification bắt buộc:**
- PostgreSQL integration tests cho specification revisions và immutability.
- Real HTTP authorization tests.
- Kiểm tra Product/Spec compatibility.
- Kiểm tra weight/unit/packaging calculations với fixed-precision decimals.
- Kiểm tra concurrent revision publishing.
- Kiểm tra technical file version preservation.
- Kiểm tra mandatory audit rollback.
- Kiểm tra immutable offer snapshot contract.
- Nếu Quotation/PDF module chưa tồn tại, đánh dấu các end-to-end PDF scenarios là `BLOCKED` hoặc `NOT TESTED`, không giả định PASS.
## 4. Constraints
- Xác minh R1-05 Products đã triển khai thực tế.
- Tái sử dụng Product, Authentication, Authorization, Audit và private storage infrastructure hiện có.
- Không triển khai toàn bộ M10 Quotations hoặc M11 Sales Orders.
- Không thay đổi historical commercial snapshots.
- Không overwrite referenced approved revisions hoặc technical files.
- Không tự suy đoán certification, origin, HS codes hoặc technical values.
- Không hardcode universal freezing temperature hoặc shelf life.
- Không tự tạo application roles mới.
- Không bổ sung external storage, document generator hoặc infrastructure khi chưa được duyệt.
- Không triển khai generic event-sourcing/versioning framework nếu không cần thiết.
- Tuân thủ toàn bộ architecture, database và security constraints trong `AGENTS.md`.
## 5. Execution
Tuân thủ **Mandatory Task Workflow** trong `AGENTS.md`.
Bắt đầu bằng `/plan`:
1. Đọc `AGENTS.md`, `docs/modules/product-specifications.md`, `docs/modules/products.md` và các tài liệu liên quan thực sự tồn tại.
2. Xác minh implementation R1-05 từ source code, database, APIs và tests.
3. Kiểm tra Product domain, approved SKU eligibility, authorization, audit và private storage.
4. Đề xuất Specification domain model, revision lifecycle và technical document versioning.
5. Thiết kế immutable specification snapshot contract cho Quotation submission.
6. Phân tích weight/packaging calculations, unit conversion, concurrency, indexes và performance.
7. Sử dụng `/grill-me` cho quyết định chưa xác nhận, đặc biệt:
   - Revision lifecycle và approval permissions.
   - Immutable revision boundaries.
   - Quotation snapshot fields.
   - Packaging/weight/pricing basis.
   - Buyer-specific revisions.
   - Technical file retention.
8. Trình bày Implementation Plan với schema, APIs, UI, affected files, security risks, tests và acceptance criteria.
**DỪNG sau khi hoàn thành Plan để chờ phê duyệt. Không sửa application code trước Implementation approval.**
Các giai đoạn Documentation Decision, Implementation, Testing, `/goal`, Development Log và Spec Update tuân thủ `AGENTS.md`.
