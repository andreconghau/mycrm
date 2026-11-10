---
tracker_id: "tsk_mw5x2mq5wanj82"
title: "R1-00 Foundation & R1-01 Access Control"
status: "done"
priority: "critical"
module: "R1, BACKEND"
source: "nimbalyst"
source_updated_at: "2026-11-07T12:17:36.529Z"
exported_at: "2026-11-10T01:32:38.955Z"
content_hash: 8e23060a11809cfdae32a508a9197ee31c014f184731f2b55ffc98242864d23b
schema_version: 1
---
# TASK: R1-00 + R1-01 · Foundation & Access Control
**Release:** R1 — Core CRM
**Prerequisites:** None
**Modules:** Foundation + M29 Access Control
**Specification:** `docs/modules/access-control.md`
## 1. Objective
Xây dựng nền tảng Fullstack và hệ thống Access Control cho Seafood Export CRM.
Đảm bảo ứng dụng có thể khởi động từ fresh checkout, database migrations hoạt động chính xác, authentication/session bảo mật và mọi API được bảo vệ bởi server-side authorization.
Triển khai hai phần trong cùng một task, theo thứ tự:
1. **R1-00 — Foundation**
2. **R1-01 — M29 Access Control**
Không bắt đầu implementation Access Control trước khi xác minh Foundation hoạt động.
## 2. Scope
### A. Foundation
**Application**
- Next.js App Router, strict TypeScript.
- React, Tailwind, shadcn/ui theo design system.
- Modular Monolith + Clean Architecture.
- REST `/api/v1` và OpenAPI 3.1.
- HTTP health/smoke endpoint.
- Development scripts và environment configuration.
**Database**
- PostgreSQL bằng Docker Compose.
- Drizzle + Postgres.js.
- Versioned SQL-only migrations.
- Migration replay từ empty database.
- Approved integer auto-increment primary keys.
- Không sử dụng SQL `FOREIGN KEY` / `REFERENCES`.
- Logical relationships do Application Layer quản lý.
- Đồng bộ schema, SQL comments, ERD và data dictionary.
**Storage**
- Private attachment volume bên ngoài `public/`.
- Persistent storage qua container restart.
- Không expose private files qua static URLs.
- Không tự chọn production storage provider.
**Testing**
- Unit/integration test infrastructure.
- Isolated test database.
- HTTP smoke tests.
- Migration validation tests.
- Lint/build và CI configuration.
### B. Access Control — M29
**Employee Management**
- Invite-only employee accounts.
- Employee activation/disable.
- Email uniqueness.
- Không cho phép public self-registration.
- Xác nhận invitation/activation policy nếu chưa được duyệt.
**Teams & Direct Managers**
- Create/update teams.
- Manage team memberships.
- Assign/change direct managers.
- Validate logical relationships.
- Ngăn invalid hoặc cyclic manager relationships.
- Audit các thay đổi quan trọng.
**Authentication & Sessions**
- Email/password login.
- Secure password hashing.
- JWT HttpOnly cookies.
- Access JWT: 1 giờ.
- Absolute session lifetime: 7 ngày.
- Idle timeout: 3 ngày.
- Không MFA.
- Login/logout và session revocation.
- Server-side session validation.
- Cookie/CSRF protection và login rate limiting.
- Không phụ thuộc process-local session state.
**Roles & Permissions**
Application roles:
- `admin`
- `manager`
- `sale`
- `accountant`
Chức năng:
- Assign/revoke roles.
- Manage approved application grants.
- Retrieve effective permissions.
- Enforce server-side authorization.
- Prevent privilege escalation.
- Apply permission changes from the next request.
Authorization model:
`Actor + Resource + Action + Record Scope + Field/State Policy`
Record scopes theo approved policy:
`NONE`, `OWN`, `TEAM`, `ASSIGNED`, `ALL`
Yêu cầu:
- Default deny.
- Record-level authorization.
- Không bypass bằng direct API requests.
- Không dùng JWT claims làm nguồn duy nhất cho effective permissions.
- Admin không tự động được phê duyệt nghiệp vụ/tài chính.
- Business grants phải được phê duyệt trước khi áp dụng.
**API & UI**
- Authentication/session endpoints.
- Employee management.
- Team/direct manager management.
- Role assignment/revocation.
- Effective permissions endpoint.
- Login và administration UI tối thiểu.
- REST `/api/v1`, OpenAPI 3.1.
- Server-side validation và safe DTOs.
**Audit Integration**
- Role grant/revoke.
- Account disable/enable.
- Team/manager changes.
- Session revocation.
- Security-sensitive operations.
- Mandatory audit transactionally consistent với business changes.
Chỉ xây dựng audit infrastructure tối thiểu cho Access Control. Full Audit Log thuộc task R1-02.
## 3. Acceptance Criteria
### Foundation
| ID | Scenario | Expected Result |
| --- | --- | --- |
| F-01 | Fresh checkout | Application khởi động theo hướng dẫn |
| F-02 | Docker Compose | PostgreSQL chạy thành công |
| F-03 | Database connection | Drizzle/Postgres.js hoạt động |
| F-04 | Empty database | SQL migrations replay thành công |
| F-05 | Schema validation | Khớp approved database catalog |
| F-06 | HTTP smoke | Endpoint trả về expected response |
| F-07 | Private attachments | Không thể truy cập công khai |
| F-08 | Container restart | Database/files giữ dữ liệu |
| F-09 | Test isolation | Không ảnh hưởng development database |
| F-10 | Lint/build | Hoàn thành theo verification policy |
### Access Control
| ID | Scenario | Expected Result |
| --- | --- | --- |
| A-01 | Anonymous request | Denied |
| A-02 | Expired token, no valid renewal | Denied |
| A-03 | Absolute session expired | Denied |
| A-04 | Idle timeout exceeded | Denied |
| A-05 | Disabled employee | Denied |
| A-06 | Revoked session | Denied |
| A-07 | Role removal | Effective next request |
| A-08 | Wrong-owner access | Denied |
| A-09 | Unauthorized cross-team access | Denied |
| A-10 | Privilege escalation attempt | Denied |
| A-11 | Authorized request | Allowed within approved scope |
| A-12 | Role/permission modification | Audit recorded |
| A-13 | Mandatory audit failure | Associated transaction rolled back |
| A-14 | Sensitive fields without grant | Not disclosed |
| A-15 | Concurrent/multi-instance requests | Consistent authorization |
| A-16 | Invalid team/manager relationship | Rejected |
| A-17 | Public self-registration | Not allowed |
**Verification bắt buộc:**
- Fresh checkout và migration replay.
- Real HTTP endpoint tests.
- PostgreSQL integration tests.
- Positive/negative authorization tests.
- Session expiration/revocation tests.
- Next-request permission revocation.
- Security audit consistency.
- Không chỉ sử dụng mocks để chứng minh authentication/authorization correctness.
## 4. Constraints
- Đây là **một task duy nhất**, không tách thành hai approval workflows.
- Dùng một Implementation Plan chung, chia thành Foundation và Access Control.
- Triển khai và xác minh Foundation trước khi coding Access Control.
- Nếu Foundation chưa đạt các điều kiện cần thiết, dừng phần Access Control bị ảnh hưởng và báo blocker.
- Không triển khai các business modules khác.
- Không mở rộng sang toàn bộ M31 Audit Log.
- Không tự tạo business grants chưa được duyệt.
- Không thay đổi approved authentication/session policies.
- Không tự ý bổ sung framework, dependency hoặc infrastructure.
- Tái sử dụng existing code; không xây dựng lại những phần đã hoàn thành.
- Tuân thủ toàn bộ architecture, security và database constraints trong `AGENTS.md`.
## 5. Execution
Tuân thủ toàn bộ **Mandatory Task Workflow** trong `AGENTS.md`.
Bắt đầu bằng `/plan`:
1. Đọc `AGENTS.md`, `docs/context.md`, `docs/modules/access-control.md` và tài liệu liên quan đang tồn tại.
2. Kiểm tra repository, Foundation infrastructure và Access Control implementation hiện tại.
3. Phân biệt chức năng đã hoàn thành, còn thiếu và cần điều chỉnh.
4. Xác minh database conventions, existing migrations và test infrastructure.
5. Phân tích authentication, session, roles, teams, permission grants và security risks.
6. Xác định dependencies giữa Foundation và Access Control.
7. Sử dụng `/grill-me` để xác nhận các quyết định chưa rõ, đặc biệt là business grants, session strategy và admin bootstrap.
8. Xây dựng **một Implementation Plan thống nhất**, chia thành hai implementation phases:
  - Phase 1: Foundation.
  - Phase 2: Access Control.
9. Xác định acceptance criteria, testing strategy, affected files và risks cho cả hai phases.
10. Trình bày Plan chung để tôi phê duyệt.
**DỪNG sau khi hoàn thành Plan để chờ phê duyệt. Không sửa application code trước Implementation approval.**
Các giai đoạn Documentation Decision, Implementation, Testing, `/goal`, Development Log và Spec Update thực hiện **một lần cho task tổng hợp** theo `AGENTS.md`.
Báo cáo kết quả Foundation và Access Control riêng biệt để xác định chính xác phần nào đã PASS, FAIL, BLOCKED hoặc NOT TESTED.