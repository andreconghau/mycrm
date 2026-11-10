---
tracker_id: "tsk_mw6b36jpb923xl"
title: "R1-02 Audit Log"
status: "approved"
priority: "high"
module: "BACKEND, R1"
source: "nimbalyst"
source_updated_at: "2026-11-09T06:38:05.768Z"
exported_at: "2026-11-10T01:32:38.405Z"
content_hash: 5a92a011442e56204da3f5125f9e499cf1d1e324ce211590d3b0e9115c8d0e65
schema_version: 1
---
# TASK: R1-02 · M31 · Audit Log
**Release:** R1 — Core CRM
**Prerequisite:** R1-01 — Access Control
**Module:** `docs/modules/audit-log.md`
## 1. Objective
Triển khai M31 — Audit Log nhằm bảo đảm các thay đổi nghiệp vụ quan trọng được ghi nhận đầy đủ, an toàn, có thể truy vết và nhất quán với database transaction.
## 2. Scope
### Audit Recording
- Ghi nhận actor, timestamp, action, resource ID/version, reason và safe before/after diff.
- Lưu request/correlation ID và event source khi phù hợp.
- Tích hợp với Authentication/Authorization từ R1-01.
- Tái sử dụng audit infrastructure hiện có, tránh duplicate implementation.
### Transactional Integrity
- Mandatory audit event phải được ghi trong cùng database transaction với business change.
- Audit failure phải rollback toàn bộ business change.
- Không dùng fire-and-forget hoặc asynchronous logging cho mandatory audit.
- Đảm bảo tính nhất quán khi có concurrency, failure hoặc retry.
### Audit Security
- Audit events phải tuân thủ nguyên tắc append-only.
- Ordinary users không được sửa/xóa audit events.
- Audit history chỉ được truy cập theo approved permissions và record scope.
- Không cho phép đọc unrelated history qua direct API, search, filters hoặc exports.
- Không ghi passwords, tokens, secrets hoặc unredacted sensitive data.
- Safe diff phải sử dụng cơ chế redaction/allowlist phù hợp.
### API & UI
- Xây dựng audit read APIs theo REST `/api/v1` và OpenAPI 3.1.
- Hỗ trợ tra cứu theo actor, resource, action và date range.
- Áp dụng server-side authorization, pagination và safe DTO projection.
- Xây dựng read-only audit timeline/UI theo scope đã duyệt.
- Không tự triển khai audit export, retention jobs hoặc external audit infrastructure nếu chưa được phê duyệt.
### Database
- Tuân thủ PostgreSQL + Drizzle/Postgres.js và SQL-only migrations.
- Không tạo SQL `FOREIGN KEY` / `REFERENCES`.
- Dùng approved integer auto-increment primary keys.
- Thiết kế indexes phù hợp với audit write và scoped history queries.
- Đồng bộ schema, SQL comments, ERD và data dictionary.
## 3. Acceptance Criteria
| ID | Scenario | Expected Result |
| --- | --- | --- |
| AC-01 | Authorized business change | Audit event được ghi đầy đủ |
| AC-02 | Mandatory audit insert failure | Business transaction rollback |
| AC-03 | Business transaction failure | Không commit mandatory audit event |
| AC-04 | Ordinary user UPDATE/DELETE audit | Denied |
| AC-05 | Unauthorized audit history read | Denied |
| AC-06 | Cross-owner/cross-team audit access | Denied |
| AC-07 | Authorized scoped history read | Chỉ trả về dữ liệu được phép |
| AC-08 | Sensitive field changes | Safe diff, không lộ secrets/PII |
| AC-09 | Role/permission changes từ R1-01 | Audit nhất quán với business change |
| AC-10 | Concurrent writes/retries | Audit lineage chính xác theo approved policy |
| AC-11 | Search/filter/pagination | Không bypass authorization |
| AC-12 | Audit database failure | Không có silent business success |
**Verification bắt buộc:**
- Có PostgreSQL integration test chứng minh mandatory audit failure thực sự rollback business change.
- Kiểm tra authorization qua real HTTP endpoints, không chỉ mock.
- Kiểm tra append-only restrictions, safe diff và sensitive data protection.
- Kiểm tra không làm thay đổi authentication/session behavior của R1-01.
## 4. Constraints
- Chỉ triển khai M31 và các thay đổi tích hợp tối thiểu cần thiết với R1-01.
- Không triển khai business modules chưa tồn tại.
- Không tự mở rộng business grants.
- Không thay đổi authentication/session policies.
- Không giả định Audit Log thay thế hoàn toàn business version history.
- Không tự quyết định retention, export hoặc tamper-evidence policies chưa được phê duyệt.
- Không thêm infrastructure/dependencies khi chưa được duyệt.
- Ưu tiên transactional correctness, security và maintainability.
## 5. Execution
Tuân thủ toàn bộ **Mandatory Task Workflow** trong `AGENTS.md`.
Bắt đầu bằng `/plan`:
1. Đọc module specification và tài liệu liên quan đang tồn tại.
2. Xác minh implementation thực tế của R1-01.
3. Kiểm tra audit infrastructure và transaction patterns hiện có.
4. Xác định các phần cần tái sử dụng, thay đổi hoặc bổ sung.
5. Phân tích transaction atomicity, authorization, safe diff và failure handling.
6. Sử dụng `/grill-me` nếu còn quyết định hoặc trade-off quan trọng cần xác nhận.
7. Trình bày Implementation Plan với architecture, schema, APIs, tests, risks và acceptance criteria.
**DỪNG sau khi hoàn thành Plan để chờ phê duyệt. Không sửa application code trước Implementation approval.**
Các giai đoạn Documentation Decision, Implementation, Testing, `/goal`, Development Log và Spec Update tuân thủ `AGENTS.md`, không cần nhắc lại trong task này.