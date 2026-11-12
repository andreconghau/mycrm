---
tracker_id: "tsk_mwbf98k854m21t"
title: "R1-04 M02 · Contacts"
status: "approved"
priority: "medium"
module: "system"
source: "nimbalyst"
source_updated_at: "2026-11-12T00:29:37.064Z"
exported_at: "2026-11-12T00:33:15.356Z"
content_hash: 0469eaaffce813751c259d37b1b967837e8777d11b3d4d7377e19ea81d8d6cfa
schema_version: 1
---
# TASK: R1-04 · M02 · Contacts
**Release:** R1 — Core CRM
**Prerequisite:** R1-03 — Customers
**Module:** `docs/modules/contacts.md`
## 1. Objective
Triển khai M02 — Contacts để quản lý người liên hệ thuộc các doanh nghiệp mua hàng B2B.
Hỗ trợ recipient roles, communication channels, primary contacts, preferences và deactivation.
**Yêu cầu trọng tâm:**
- Hai người tại cùng một Customer có thể sử dụng chung email sau khi được cảnh báo duplicate.
- Mỗi Contact phải giữ ID và lịch sử riêng biệt.
- Mọi truy cập Contact phải tuân thủ authorization và historical access của Customer cha.
## 2. Scope
### Contact Management
- Create, read, update và deactivate Contacts.
- Mỗi Contact thuộc một Customer hợp lệ.
- Quản lý họ tên, chức danh, phòng ban và thông tin liên hệ.
- Hỗ trợ các vai trò như purchasing, logistics, finance và management.
- Quản lý preferred language và timezone nếu được specification phê duyệt.
- Không hard-delete Contact đã có historical references.
- Không tự động thay đổi Contact identity khi email thay đổi.
### Communication Channels & Preferences
- Hỗ trợ nhiều communication channels: email, phone, WhatsApp, KakaoTalk, LINE và các loại được duyệt.
- Quản lý preferred channel theo Contact.
- Quản lý consent, do-not-contact và communication preferences.
- Không suy diễn consent từ email hoặc số điện thoại.
- Không tự động gửi tin nhắn/email nếu chưa có integration được duyệt.
- Bảo vệ contact information theo field-level permissions.
### Primary Contacts
- Hỗ trợ primary contacts theo business context: procurement, invoicing, consignee.
- Các vai trò primary có thể thuộc những người khác nhau.
- Thay đổi primary contact không được xóa historical references hoặc correspondence.
- Validate và audit primary contact changes.
- Không tự áp đặt một primary contact duy nhất cho toàn Customer nếu specification không yêu cầu.
### Duplicate Email Detection
- Normalize email để tìm duplicate candidates theo quy tắc được duyệt.
- Hiển thị cảnh báo khi email đã tồn tại.
- Cho phép tạo Contact mới sau cảnh báo.
- Không tự động merge Contacts.
- Không áp dụng UNIQUE constraint trên normalized email nếu điều đó ngăn các Contact hợp lệ dùng chung email.
- Không xem email là định danh duy nhất của một người.
- Không tiết lộ thông tin Contacts ngoài authorization scope qua duplicate suggestions.
**Ví dụ:**
```javascript
Customer: ABC Seafood

Contact #101
Name: Kim Min-su
Email: purchasing@abc.com

Contact #102
Name: Lee Ji-hoon
Email: purchasing@abc.com
```
Kết quả:
- Cả hai Contacts đều hợp lệ.
- Hệ thống cảnh báo duplicate email.
- Hai Contacts giữ ID độc lập.
- Notes, activities, audit và historical references không bị gộp.
- Thay đổi Contact #101 không làm thay đổi Contact #102.
### Customer Parent Authorization
**Đây là yêu cầu bảo mật quan trọng nhất của R1-04.**
- Contact access phải kế thừa Customer parent scope.
- Server phải kiểm tra quyền với Customer cha khi list, search, detail, update, deactivate và direct lookup.
- Không cho phép truy cập Contact qua ID nếu Customer cha không được phép truy cập.
- Contact reassignment yêu cầu authorization đối với cả Customer nguồn và đích.
- Không cho phép client thay đổi `customer_id` để bypass ownership.
- Áp dụng field-level permissions khi trả về contact information.
- Không rò rỉ dữ liệu qua search, pagination, counts hoặc duplicate suggestions.
**Historical Access:**
Tích hợp với ownership/version policy đã được duyệt trong R1-03:
- Current Customer owner xem Contacts theo quyền hiện hành.
- Former owner chỉ được xem Contact data/version hợp lệ tại historical cutoff.
- Không trả về thay đổi Contact sau handover nếu actor chỉ có historical ownership permission.
- Direct lookup phải áp dụng cùng historical authorization với Customer detail.
- Không dùng mutable current Contact data để dựng historical view cho former owner.
Tái sử dụng cơ chế historical access của R1-03; chỉ mở rộng versioning khi thực sự cần và được duyệt.
### Contact Lifecycle & Relationships
- Hỗ trợ `ACTIVE / INACTIVE` theo approved lifecycle.
- Deactivation không xóa historical references.
- Contact đã inactive vẫn có thể xuất hiện trong historical RFQs, quotations, orders hoặc communication history theo quyền được cấp.
- Contact transfer giữa Customers phải được authorize và audit.
- Không tự động sửa accepted commercial snapshots.
- Không triển khai các business modules chưa tồn tại.
### API & UI
Các API đề xuất trong specification:
- `GET /api/v1/customers/:customerId/contacts`
- `POST /api/v1/customers/:customerId/contacts`
- `GET /api/v1/contacts/:id`
- `PATCH /api/v1/contacts/:id`
Các use cases:
- `CreateContact`
- `UpdateContact`
- `SetPrimaryContact`
- `DeactivateContact`
- `ListCustomerContacts`
- `GetContactTimeline`
Yêu cầu:
- REST `/api/v1` và OpenAPI 3.1.
- Server-side validation và authorization.
- Safe DTO projection.
- Scoped queries trước pagination.
- Consistent error handling.
- Optimistic concurrency khi cần.
- Contact panel trong Customer Details.
- Contact profile, channels, preferences và primary-role management.
- Tuân thủ approved design system.
Chỉ triển khai endpoints/UI được phê duyệt trong Plan.
### Database & Audit
- Sử dụng PostgreSQL + Drizzle/Postgres.js.
- Versioned SQL-only migrations.
- Không tạo SQL `FOREIGN KEY` / `REFERENCES`.
- Logical relationships do Application Layer quản lý.
- Giữ independent integer auto-increment Contact IDs.
- Thiết kế normalized email index phục vụ duplicate lookup, không cưỡng chế uniqueness nếu email có thể trùng.
- Preserve Contact identity và historical references.
- Audit create/update/deactivate, primary changes và Customer transfer khi bắt buộc.
- Mandatory audit failure phải rollback associated business transaction.
- Đồng bộ schema, comments, ERD và dictionary.
## 3. Acceptance Criteria
| ID | Scenario | Expected Result |
| --- | --- | --- |
| AC-01 | Authorized Contact creation | Success + audit |
| AC-02 | Unauthorized Customer access | Cannot create/read Contact |
| AC-03 | Two Contacts share email | Warning, creation allowed |
| AC-04 | Duplicate email | Distinct Contact IDs |
| AC-05 | Update one duplicate Contact | Other Contact unchanged |
| AC-06 | Duplicate Contacts history | Independent history preserved |
| AC-07 | Direct `/contacts/:id` lookup | Enforces parent Customer scope |
| AC-08 | Unauthorized Contact update | Denied |
| AC-09 | Move Contact to inaccessible Customer | Denied |
| AC-10 | Change primary contact | Correct assignment + audit |
| AC-11 | Multiple primary contexts | Independent procurement/invoice/consignee contacts |
| AC-12 | Deactivate Contact | Historical references preserved |
| AC-13 | Contact read after Customer handover | Historical scope enforced |
| AC-14 | Former owner reads post-transfer updates | Denied without independent grant |
| AC-15 | Search/filter/duplicate suggestions | No unauthorized data leakage |
| AC-16 | Do-not-contact preference | Honored by applicable existing adapters |
| AC-17 | Mandatory audit failure | Business transaction rolled back |
| AC-18 | Concurrent updates | No silent lost updates |
| AC-19 | Disabled/revoked employee | Access denied per R1-01 |
**Verification bắt buộc:**
- PostgreSQL integration tests cho duplicate emails, distinct IDs và historical references.
- Real HTTP endpoint tests cho parent Customer authorization.
- Kiểm tra direct lookup bằng guessed Contact IDs.
- Kiểm tra Customer handover A → B và historical Contact access.
- Kiểm tra primary contact changes và deactivation.
- Kiểm tra authorization đối với source/destination Customer khi chuyển Contact.
- Kiểm tra mandatory audit rollback.
- Không dùng mock-only tests để chứng minh parent scope hoặc historical data integrity.
## 4. Constraints
- Xác minh R1-03 đã được triển khai thực tế trước khi phụ thuộc vào Customer APIs và historical access.
- Tái sử dụng authentication, authorization, audit và customer history infrastructure hiện có.
- Không tự động merge Contacts có email trùng.
- Không dùng email làm unique person identity.
- Không sửa Customer ownership/historical access policies khi chưa được duyệt.
- Không phá vỡ historical RFQ/order/contact references.
- Không tự triển khai messaging integrations hoặc campaign automation.
- Không tự suy diễn consent/communication preferences.
- Không bổ sung infrastructure/dependencies ngoài scope đã duyệt.
- Tuân thủ architecture, database và security constraints trong `AGENTS.md`.
## 5. Execution
Tuân thủ toàn bộ **Mandatory Task Workflow** trong `AGENTS.md`.
Bắt đầu bằng `/plan`:
1. Đọc `AGENTS.md`, `docs/modules/contacts.md`, `docs/modules/customers.md` và tài liệu liên quan thực sự tồn tại.
2. Xác minh R1-03 từ source code, database, APIs và tests.
3. Phân tích Customer authorization, ownership history và audit infrastructure.
4. Đề xuất Contact domain model, channels, preferences, recipient roles và primary contact strategy.
5. Thiết kế normalized email duplicate detection không ngăn email hợp lệ trùng nhau.
6. Xác định parent-scope authorization cho list, search, detail, update và Contact transfer.
7. Phân tích historical access, data integrity, concurrency và performance.
8. Sử dụng `/grill-me` với các quyết định chưa được xác nhận, đặc biệt là Contact transfer, primary-role uniqueness và historical visibility.
9. Trình bày Implementation Plan với schema, APIs, UI, affected files, security risks, tests và acceptance criteria.
**DỪNG sau khi hoàn thành Plan để chờ phê duyệt. Không sửa application code trước Implementation approval.**
Các giai đoạn Documentation Decision, Implementation, Testing, `/goal`, Development Log và Spec Update tuân thủ `AGENTS.md`.
