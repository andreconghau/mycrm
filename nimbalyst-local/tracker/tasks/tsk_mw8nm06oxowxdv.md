---
tracker_id: "tsk_mw8nm06oxowxdv"
title: "R1-03 M01 · Customers"
status: "in-review"
priority: "high"
module: "BACKEND, R1"
source: "nimbalyst"
source_updated_at: "2026-11-09T09:05:34.125Z"
exported_at: "2026-11-10T01:32:37.296Z"
content_hash: 41328a1811b476318933a536580ab3cd874e718d3a29b73ad0bcfc33f3265891
schema_version: 1
---
# TASK: R1-03 · M01 · Customers
**Release:** R1 — Core CRM
**Prerequisites:** R1-01 — Access Control, R1-02 — Audit Log
**Module:** `docs/modules/customers.md`
## 1. Objective
Triển khai M01 — Customers để quản lý khách hàng B2B, thông tin doanh nghiệp, prospects, địa chỉ, duplicate review và phân công Sales Owner.
**Yêu cầu trọng tâm:** Bảo toàn lịch sử Customer và kiểm soát quyền truy cập theo thời gian sở hữu (time-bounded historical access), kể cả sau khi chuyển giao cho nhân viên khác.
## 2. Scope
### Customer Management
- Create, read, update và archive Customers.
- Quản lý buyer identity, legal/trading name và business information.
- Tạo Customer ở trạng thái Prospect.
- Quản lý Customer lifecycle theo approved specification.
- Quản lý nhiều địa chỉ: office, billing, shipping.
- Validate dữ liệu và logical relationships.
- Bảo toàn historical references và commercial snapshots.
### Duplicate Detection & Review
- Phát hiện Customer có khả năng trùng dựa trên các identifiers được duyệt.
- Hỗ trợ duplicate candidates và review.
- Không tự động merge chỉ dựa vào tên tương tự.
- Không tiết lộ thông tin Customer ngoài authorization scope.
### Ownership & Assignments
- Assign/reassign Sales Owner và Team.
- Ghi nhận ownership history, effective timestamps và transfer reason.
- Validate quyền thực hiện assignment.
- Ownership transfer và mandatory audit phải transactionally consistent.
- Ngăn concurrent updates gây mất dữ liệu hoặc sai lệch lịch sử.
### Historical Access Control
**Đây là yêu cầu quan trọng nhất của R1-03.**
Ví dụ:
```javascript
T1: Sales A owns Customer C
T2: Sales A updates Customer C
T3: Sales A creates Note N1 and File F1
T4: Customer C transferred from A to B
T5: Sales B updates Customer C
T6: Sales B creates Note N2 and File F2
```
**Sales B — New Owner:**
- Truy cập Customer hiện tại.
- Xem toàn bộ authorized history trước và sau handover.
- Truy cập historical versions, notes và files theo approved permissions.
**Sales A — Former Owner:**
- Chỉ xem dữ liệu đã quản lý như trạng thái tồn tại tại thời điểm chuyển giao T4.
- Được truy cập historical versions, N1 và F1 trong phạm vi đã được duyệt.
- Không được xem những thay đổi, N2 hoặc F2 sau T4 chỉ dựa vào ownership cũ.
- Không được chỉnh sửa Customer dựa vào quyền sở hữu đã kết thúc.
**Áp dụng nhất quán cho:**
- Customer list/search.
- Customer detail.
- Historical versions.
- Notes.
- File metadata/download.
- Related records trong phạm vi module.
Yêu cầu kỹ thuật:
- Authorization server-side theo actor, role, scope, ownership period và record version.
- Không trả current data khi actor chỉ có historical access.
- Không bypass bằng direct API, search, filters hoặc file URLs.
- Default deny khi thiếu bằng chứng historical ownership.
- Xử lý repeated transfers (A → B → C, A → B → A) theo policy được duyệt.
- Quyền độc lập từ role/manager/explicit grants phải được đánh giá riêng, không suy diễn từ previous ownership.
### Customer History, Notes & Files
- Preserve customer versions và ownership history.
- Bảo toàn notes/files theo historical visibility rules.
- Tích hợp private attachment storage hiện có.
- Không expose files qua public URLs.
- File download phải kiểm tra authorization tại thời điểm request.
- Audit các thay đổi nghiệp vụ quan trọng.
- Không dùng Audit Log thay thế historical snapshots nếu không thể tái hiện dữ liệu chính xác.
### API & UI
- Customer list/search/create/update/detail/archive.
- Address management.
- Duplicate review.
- Owner/team assignment.
- Customer history.
- Notes và attachments theo scope được duyệt.
- REST `/api/v1`, OpenAPI 3.1.
- Server-side validation, scoped queries và safe DTO projection.
- UI tuân thủ approved design system.
## 3. Acceptance Criteria
| ID | Scenario | Expected Result |
| --- | --- | --- |
| AC-01 | Authorized Customer creation | Success + audit |
| AC-02 | Unauthorized Customer access | Denied |
| AC-03 | Duplicate candidate | Review warning, no automatic merge |
| AC-04 | Authorized ownership transfer A → B | Atomic update + audit |
| AC-05 | New owner B views history | All authorized history visible |
| AC-06 | Former owner A views pre-transfer data | Historical snapshot visible |
| AC-07 | Former owner A views post-transfer data | Denied without independent grant |
| AC-08 | Former owner searches Customer | Historical-safe results |
| AC-09 | Former owner opens Customer detail | No post-transfer data leakage |
| AC-10 | Former owner accesses pre-transfer notes/files | Allowed within approved scope |
| AC-11 | Former owner accesses post-transfer notes/files | Denied without independent grant |
| AC-12 | Direct file URL or API bypass | Denied |
| AC-13 | Repeated ownership transfers | Historical visibility remains correct |
| AC-14 | Concurrent ownership/update operations | No lost updates or inconsistent history |
| AC-15 | Mandatory audit failure | Business transaction rolled back |
| AC-16 | Disabled/revoked employee | Access denied per R1-01 |
| AC-17 | Archive Customer | Historical records preserved |
| AC-18 | Search/filter/pagination/counts | No unauthorized data leakage |
| AC-19 | Invalid owner/address relationship | Rejected |
| AC-20 | Historical record version | Correct data at authorized cutoff |
**Verification bắt buộc:**
- PostgreSQL integration tests cho ownership transfer và version history.
- Real HTTP endpoint tests cho authorization.
- End-to-end scenario A → B: kiểm tra search, detail, notes, file access trước và sau handover.
- Kiểm tra repeated transfers và concurrent updates.
- Kiểm tra transactional audit rollback.
- Không dùng mock-only tests để chứng minh historical access correctness.
## 4. Constraints
- Xác minh R1-01 và R1-02 đã triển khai thực tế.
- Không thay đổi authentication, session hoặc approved permission policies.
- Không triển khai Contacts, Leads, Opportunities hoặc các business modules khác ngoài scope.
- Không tự động merge Customers.
- Không phá vỡ commercial snapshots hoặc historical references.
- Không tự ý quyết định retention, note/file visibility hoặc team historical access khi specification chưa rõ.
- Không thêm external search/storage infrastructure khi chưa được duyệt.
- Không tạo generic event-sourcing framework nếu giải pháp đơn giản hơn đáp ứng yêu cầu.
- Tuân thủ database, architecture và security constraints trong `AGENTS.md`.
## 5. Execution
Tuân thủ toàn bộ **Mandatory Task Workflow** trong `AGENTS.md`.
Bắt đầu bằng `/plan`:
1. Đọc `AGENTS.md`, `docs/modules/customers.md` và các tài liệu liên quan thực sự tồn tại.
2. Xác minh R1-01 và R1-02 từ source code, database và tests.
3. Phân tích Customer domain, ownership, audit và file storage hiện có.
4. Đề xuất database design cho Customer, Addresses, Ownership History và Version History.
5. Đề xuất historical authorization strategy bảo đảm search, detail, notes và files không rò rỉ dữ liệu.
6. Phân tích transaction consistency, concurrency, indexes và performance.
7. Sử dụng `/grill-me` cho các quyết định chưa được xác nhận, đặc biệt là historical visibility và repeated transfers.
8. Trình bày Plan với architecture, schema, APIs, UI, affected files, risks, tests và acceptance criteria.
**DỪNG sau khi hoàn thành Plan để chờ phê duyệt. Không sửa application code trước Implementation approval.**
Các giai đoạn Documentation Decision, Implementation, Testing, `/goal`, Development Log và Spec Update tuân thủ `AGENTS.md`.