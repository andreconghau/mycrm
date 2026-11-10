---
tracker_id: "tsk_mw4huorcafqjax"
title: "RP-04 Backend API router"
status: "done"
priority: "critical"
module: "ALL, R1"
source: "nimbalyst"
source_updated_at: "2026-11-09T06:38:31.813Z"
exported_at: "2026-11-10T01:32:37.879Z"
content_hash: eb8153b90ab9fc07b648a8587979541ca5150f3ef05a42d19148b05cbddfb88b
schema_version: 1
---
# TASK: Thiết kế Backend API Architecture và Database Schema cho Release 1 (R1)
Bạn là **Senior Backend Architect & Database Engineer**, có kinh nghiệm thiết kế RESTful APIs, Clean Architecture, PostgreSQL, Database Modeling, Security, Scalability và Performance Optimization.
## 1. Mục tiêu
Dựa trên Frontend Routing đã được xác định và đặc tả nghiệp vụ các modules thuộc Release 1 (R1), hãy phân tích và xây dựng kế hoạch thiết kế:
1. Backend Architecture.
2. Backend API Routing.
3. API Contracts và Request/Response Schemas.
4. Database Architecture.
5. PostgreSQL Database Schema.
6. SQL DDL cho các entities thuộc R1.
7. Entity Relationship Diagram (ERD).
8. Mối quan hệ giữa Frontend Routes → APIs → Database Entities.
**Project root:** `/Users/andre/www/codex/ccc`
**Technical documentation:**
- `docs/structure/frontend.md`
- `docs/structure/backend.md`
- `docs/structure/database.md`
**Skills bắt buộc:**
- `/grill-me` — Làm rõ yêu cầu và xác nhận quyết định.
- `database-migrations` — Thiết kế database schema, constraints, indexes và migration strategy.
**Bắt đầu trong Plan Mode. Không chuyển sang Implementation khi chưa được tôi xác nhận.**
## 2. Phase 1 — Discovery & Requirement Analysis
Trước khi đề xuất kiến trúc:
1. Đọc `AGENTS.md` và toàn bộ project instructions liên quan.
2. Đọc `docs/structure/frontend.md` để xác định Frontend Routes hiện tại.
3. Phân tích các module và business features thuộc R1.
4. Đọc tài liệu architecture, business workflows, permissions và các ADR đã được phê duyệt.
5. Kiểm tra backend architecture và database schema hiện có (nếu có).
6. Xác định các entities, business rules và relationships đã được mô tả.
7. Kiểm tra technology stack và các quyết định kỹ thuật đã được xác nhận.
### Requirement Traceability
Thiết lập mapping:
`R1 Feature → Frontend Route → Business Operation → Backend API → Database Entity`
Phân loại:
- **Confirmed:** Đã có đặc tả rõ ràng.
- **Proposed:** Giải pháp đề xuất, cần xác nhận.
- **Missing:** Thiếu đặc tả.
- **Conflict:** Có xung đột giữa các tài liệu.
- **Out of Scope:** Không thuộc R1.
Không tự suy đoán business rules hoặc bổ sung features ngoài phạm vi R1.
## 3. Phase 2 — Backend Architecture & API Design
### 3.1 Backend Architecture
Phân tích và đề xuất kiến trúc backend phù hợp với quy mô dự án.
Bao gồm:
- Backend framework và runtime.
- API architecture và routing conventions.
- Module-based architecture.
- Controller / Handler Layer.
- Service / Application Layer.
- Domain / Business Logic Layer.
- Repository / Data Access Layer.
- Database integration.
- Authentication và Authorization.
- Request validation.
- Error handling.
- Logging và Observability.
- Configuration và Environment Management.
- Transaction management.
- Performance và Scalability.
- Testing strategy.
Ưu tiên kiến trúc đơn giản, dễ bảo trì và phù hợp với các quyết định kỹ thuật đã được phê duyệt.
Nếu có nhiều giải pháp, so sánh ưu/nhược điểm và đề xuất phương án phù hợp nhất.
### 3.2 Backend API Routing
Dựa trên Frontend Routes và Business Features R1, thiết kế danh sách API endpoints cần thiết.
Với mỗi API, xác định:
| Field | Description |
| --- | --- |
| Module | Business module |
| Method | GET / POST / PUT / PATCH / DELETE |
| Endpoint | API URL |
| Purpose | Business operation |
| Frontend Route | Page sử dụng API |
| Authentication | Authentication requirement |
| Permission | Authorization requirement |
| Request | Params / Query / Body |
| Response | Response contract |
| Database Entity | Entities liên quan |
| Status | Confirmed / Proposed / Pending |
### 3.3 API Design Standards
Thiết kế và tài liệu hóa:
1. API URL naming conventions.
2. API versioning strategy.
3. Request/Response schema.
4. HTTP status codes.
5. Standard error response.
6. Pagination và sorting.
7. Filtering và search.
8. Data validation.
9. Authentication và permission enforcement.
10. Transaction boundaries.
11. Concurrency handling.
12. Idempotency cho các operations cần thiết.
13. API documentation strategy.
Đối với các nghiệp vụ create/update/delete, cần xác định rõ:
- Input validation.
- Business rules.
- Permission requirements.
- Transaction requirements.
- Database constraints.
- Error scenarios.
Không tạo API chỉ dựa trên giả định rằng mỗi frontend page cần một endpoint riêng.
Ưu tiên thiết kế API theo business resources và use cases, tránh duplicated endpoints.
### 3.4 API Coverage Analysis
Đối chiếu:
`R1 Features ↔ Frontend Routes ↔ Backend APIs`
Xác định:
- Frontend Routes chưa có API.
- APIs có thể tái sử dụng giữa nhiều pages.
- Business operations thiếu đặc tả.
- Các API yêu cầu authentication hoặc permissions chưa được xác nhận.
- Dependencies giữa các modules.
Đảm bảo API Inventory bao phủ đầy đủ nghiệp vụ R1.
## 4. Phase 3 — Database Architecture & Schema Design
Sử dụng skill **`database-migrations`** để phân tích và thiết kế PostgreSQL Database Schema.
### 4.1 Entity Identification
Dựa trên đặc tả R1, xác định:
- Core business entities.
- Supporting entities.
- Relationships giữa các entities.
- Ownership và lifecycle của dữ liệu.
- Business constraints.
- Unique constraints.
- Referential integrity.
- Audit requirements.
Không tự tạo entity hoặc business fields chưa có cơ sở từ đặc tả.
### 4.2 Database Schema
Với mỗi entity, cần xác định:
| Field | Description |
| --- | --- |
| Table | Database table name |
| Column | Column name |
| Type | PostgreSQL data type |
| Nullable | NULL / NOT NULL |
| Default | Default value |
| Primary Key | PK |
| Foreign Key | FK |
| Unique | Unique constraint |
| Index | Index requirements |
| Description | Business meaning |
Phân tích các quyết định thiết kế:
1. Primary key strategy.
2. Foreign key relationships.
3. One-to-One / One-to-Many / Many-to-Many.
4. Normalization.
5. Data types.
6. Indexing strategy.
7. Unique và Check constraints.
8. Referential actions.
9. Soft delete hoặc hard delete.
10. Created/Updated timestamps.
11. Audit trails.
12. Transaction boundaries.
13. Database security và RLS nếu kiến trúc yêu cầu.
14. Data retention và migration considerations.
Với các lựa chọn có ảnh hưởng lớn đến schema hoặc nghiệp vụ, sử dụng `/grill-me` để xác nhận.
### 4.3 SQL DDL
Chuẩn bị PostgreSQL SQL DDL cho toàn bộ schema thuộc R1.
Bao gồm khi phù hợp:
- `CREATE TABLE`
- `PRIMARY KEY`
- `FOREIGN KEY`
- `UNIQUE`
- `CHECK`
- `NOT NULL`
- `DEFAULT`
- `CREATE INDEX`
- `CREATE UNIQUE INDEX`
- Các database objects khác thực sự cần thiết.
Yêu cầu:
- SQL phải phù hợp với PostgreSQL version đã xác nhận.
- Đảm bảo đúng dependency order giữa các tables.
- Các foreign keys phải đảm bảo referential integrity.
- Indexes phải dựa trên access patterns và query requirements.
- Tránh redundant indexes.
- Không sử dụng `CASCADE` cho delete nếu chưa xác định rõ business behavior.
- Không tạo schema có khả năng gây mất dữ liệu hiện tại.
- Phân biệt schema thiết kế mới với migration thay đổi schema hiện có.
### 4.4 ERD & Entity Relationships
Thiết kế ERD cho toàn bộ R1.
Sử dụng Mermaid `erDiagram` và lưu trong Markdown để dễ review và bảo trì.
ERD cần thể hiện:
- Entities.
- Primary keys.
- Foreign keys.
- Relationships.
- Cardinality.
- Join tables.
- Optional và required relationships.
Với từng entity, mô tả:
1. Business purpose.
2. Core attributes.
3. Relationships.
4. Business constraints.
5. Lifecycle.
6. Modules sử dụng entity.
7. APIs truy cập entity.
Nếu ERD quá lớn, chia thành nhiều diagram theo business domain và bổ sung một sơ đồ tổng quan thể hiện các quan hệ liên module.
### 4.5 Database Performance
Phân tích:
- Indexing theo API query patterns.
- Pagination strategy.
- Filtering và sorting.
- Transaction isolation khi cần thiết.
- N+1 query prevention.
- Referential integrity.
- Concurrent updates.
- Query performance.
- Schema extensibility cho các release tiếp theo.
Không tối ưu hóa quá mức hoặc bổ sung index khi chưa có access pattern rõ ràng.
## 5. Phase 4 — Clarification bằng `/grill-me`
Sau khi hoàn tất phân tích và có phương án thiết kế ban đầu, sử dụng skill `/grill-me` để xác nhận những vấn đề chưa rõ.
Tập trung vào:
**Backend:**
- Backend framework và architecture.
- API conventions và versioning.
- Authentication và Authorization.
- Business workflows.
- API integration strategy.
- Transaction và concurrency requirements.
**Database:**
- Entity relationships.
- Primary key strategy.
- Data types.
- Unique và foreign key constraints.
- Delete behavior.
- Audit và history requirements.
- Migration strategy.
- Data ownership và security.
Với mỗi vấn đề:
1. Giải thích vấn đề cần quyết định.
2. Đưa ra các phương án khả thi.
3. Phân tích trade-offs về performance, scalability, security và maintainability.
4. Đề xuất phương án tối ưu và giải thích lý do.
5. Chờ tôi xác nhận.
Sau khi hoàn thành `/grill-me`:
- Tổng hợp các quyết định đã xác nhận.
- Hoàn thiện Final Backend Architecture Plan.
- Hoàn thiện Final API Inventory.
- Hoàn thiện Final Database Schema Plan.
- Trình bày các thay đổi tài liệu dự kiến.
**Chỉ chuyển sang Implementation khi tôi phê duyệt rõ ràng toàn bộ kế hoạch.**
## 6. Phase 5 — Technical Documentation
Sau khi kế hoạch được phê duyệt, tiến hành cập nhật hai tài liệu.
### 6.1 Backend Technical Specification
File: `docs/structure/backend.md`
Nội dung bao gồm:
1. Backend Architecture Overview.
2. Technology Stack.
3. Architectural Layers.
4. Module Structure.
5. API Design Conventions.
6. Complete R1 API Route Inventory.
7. API Request/Response Contracts.
8. Authentication và Authorization.
9. Validation và Error Handling.
10. Transaction và Concurrency Strategy.
11. Database Integration.
12. Logging và Observability.
13. Security Considerations.
14. Performance và Scalability.
15. Testing Strategy.
16. Frontend-to-API Mapping.
17. Architecture Decisions.
Mọi API trong danh sách phải truy xuất được về business requirements hoặc frontend use cases tương ứng.
### 6.2 Database Technical Specification
File: `docs/structure/database.md`
Nội dung bao gồm:
1. Database Architecture Overview.
2. PostgreSQL Version và Extensions.
3. Schema Design Conventions.
4. Entity Inventory.
5. Entity Definitions.
6. Table/Column Specifications.
7. Primary Keys và Foreign Keys.
8. Relationships và Cardinality.
9. ERD bằng Mermaid.
10. SQL DDL cho R1.
11. Indexing Strategy.
12. Data Integrity Constraints.
13. Transactions và Concurrency.
14. Data Security và Access Control.
15. Migration Strategy.
16. Performance Considerations.
17. Future Release Compatibility.
18. Database Design Decisions.
Đảm bảo DDL, ERD và Entity Definitions nhất quán với nhau.
**Documentation requirements:**
- Viết technical documentation bằng tiếng Anh.
- Giữ lại các nội dung hiện có còn hợp lệ.
- Không ghi đè các quyết định đã được phê duyệt.
- Không chỉnh sửa `docs/structure/frontend.md` trừ khi có yêu cầu và được phê duyệt.
- Backend và Database Specifications phải thống nhất với nhau.
## 7. Phase 6 — Validation & Consistency Review
Sau khi cập nhật tài liệu:
### Backend Validation
1. Tất cả R1 features đều được kiểm tra API coverage.
2. Frontend-to-API mapping đầy đủ.
3. API naming nhất quán.
4. Không có duplicated hoặc conflicting endpoints.
5. Request/Response contracts nhất quán.
6. Authentication và Authorization requirements được phản ánh đúng theo đặc tả.
### Database Validation
1. SQL DDL hợp lệ với PostgreSQL.
2. Foreign keys tham chiếu đúng tables/columns.
3. Không có conflicting constraints.
4. Relationships trong ERD khớp với DDL.
5. Indexes phù hợp với API query patterns.
6. Database entities hỗ trợ đầy đủ business operations thuộc R1.
7. Không có missing entities hoặc circular dependencies chưa xử lý.
8. Không có destructive migrations không được phê duyệt.
Nếu có PostgreSQL environment phù hợp, có thể thực hiện DDL validation trên database tạm, cô lập với dữ liệu dự án, theo phạm vi đã phê duyệt.
Không áp dụng migrations lên database hiện tại hoặc production database trong task này.
Nếu không thể chạy validation thực tế, phải ghi rõ những bước chưa được kiểm chứng.
## 8. Expected Deliverables
### A. Backend Architecture Plan
- Proposed Architecture.
- Module Responsibilities.
- API Design Strategy.
- Integration Boundaries.
### B. API Specification
- Complete R1 API Inventory.
- Frontend Route → API Mapping.
- Request/Response Contracts.
- Authentication & Permission Matrix.
### C. Database Design
- Entity Inventory.
- Entity Relationships.
- Database Schema.
- ERD.
- SQL DDL.
- Indexing Strategy.
### D. Confirmed Decisions
- Những quyết định được xác nhận qua `/grill-me`.
- Các vấn đề còn tồn đọng.
### E. Updated Documentation
- `docs/structure/backend.md`
- `docs/structure/database.md`
### F. Validation Report
- API Coverage.
- Database Schema Consistency.
- DDL Validation.
- Outstanding Issues.
## 9. Execution Workflow
**PLAN → DISCOVERY → ARCHITECTURE DESIGN → /grill-me → CONFIRMATION → DOCUMENTATION UPDATE → VALIDATION → REPORT**
Bắt đầu bằng việc đọc `docs/structure/frontend.md`, đặc tả các modules R1 và tài liệu kiến trúc hiện tại.
Thiết kế sơ bộ Backend APIs và Database Schema, xác định những điểm cần xác nhận, sau đó sử dụng `/grill-me` để thảo luận với tôi.
Sau khi tôi xác nhận, hoàn thiện kế hoạch và chờ phê duyệt cuối cùng.
**Chỉ sau khi được phê duyệt mới cập nhật `docs/structure/backend.md` và `docs/structure/database.md`.**
Phạm vi Implementation của task này là hoàn thiện technical specifications, ERD và SQL DDL trong tài liệu. Chưa triển khai backend source code, API handlers hoặc thực thi database migrations.
