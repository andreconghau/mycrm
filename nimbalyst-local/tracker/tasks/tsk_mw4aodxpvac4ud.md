---
tracker_id: "tsk_mw4aodxpvac4ud"
title: "RP-02 Docker development env build"
status: "done"
priority: "medium"
module: "system"
source: "nimbalyst"
source_updated_at: "2026-11-06T01:47:02.265Z"
exported_at: "2026-11-10T01:32:40.505Z"
content_hash: 8fc5f10782553773dd623447409d52a7fe49ae94949e6c2d5d4d16761344c3c8
schema_version: 1
---
# TASK: Thiết lập Docker Compose cho PostgreSQL
Bạn là **Senior DevOps Engineer**. Dựa trên đặc tả và kiến trúc hiện tại của dự án, hãy phân tích, lập kế hoạch và triển khai môi trường PostgreSQL bằng Docker Compose.
## 1. Mục tiêu
- Thiết lập PostgreSQL bằng Docker Compose.
- Tập trung toàn bộ cấu hình Docker trong thư mục `docker/`.
- Tạo `start.sh` và `stop.sh` để quản lý vòng đời services.
- Đảm bảo cấu hình an toàn, dễ bảo trì, dữ liệu được lưu trữ bền vững.
**Project root:** `/Users/andre/www/codex/ccc`
## 2. Phân tích trước khi triển khai
1. Đọc `AGENTS.md` và các tài liệu đặc tả liên quan.
2. Kiểm tra cấu trúc dự án và cấu hình Docker hiện có.
3. Xác định PostgreSQL version, database name, port và các yêu cầu kết nối.
4. Kiểm tra các ràng buộc về security, persistence và networking.
5. Sử dụng skill `/grill-me` để hỏi khi thiếu thông tin hoặc cần xác nhận giải pháp.
Không tự suy đoán những quyết định kỹ thuật chưa được xác nhận.
## 3. Yêu cầu triển khai
Tạo cấu trúc:
```javascript
docker/
├── compose.yaml
├── .env.example
├── .gitignore
├── start.sh
├── stop.sh
└── README.md
```
### Docker Compose
- Sử dụng PostgreSQL version phù hợp với đặc tả.
- Persistent storage bằng Docker named volume.
- Health check sử dụng `pg_isready`.
- Restart policy phù hợp.
- Credentials quản lý bằng environment variables.
- Không hardcode secrets.
- Giới hạn network exposure; ưu tiên localhost cho development.
- Không thêm services không cần thiết.
### start.sh
- Kiểm tra Docker và Docker Compose.
- Kiểm tra Docker daemon.
- Kiểm tra environment configuration.
- Validate Compose configuration.
- Khởi động services bằng `docker compose up -d`.
- Hiển thị trạng thái và kiểm tra PostgreSQL health.
- Xử lý lỗi với exit code phù hợp.
- Có thể chạy nhiều lần mà không làm mất dữ liệu.
### stop.sh
- Dừng services bằng `docker compose down`.
- Không sử dụng `-v` hoặc xóa volumes.
- Không làm mất dữ liệu PostgreSQL.
- Hỗ trợ chạy nhiều lần an toàn.
- Hiển thị trạng thái sau khi dừng.
### Documentation
Viết hướng dẫn trong `docker/README.md`:
- Prerequisites
- Environment configuration
- Start/stop commands
- PostgreSQL connection
- Health check
- Persistence
- Troubleshooting
## 4. Validation
Thực hiện kiểm tra:
1. `docker compose config`
2. `bash -n docker/start.sh docker/stop.sh`
3. PostgreSQL container khởi động thành công.
4. Health check trả về healthy.
5. Kết nối database thành công.
6. Dữ liệu vẫn tồn tại sau stop/start.
7. Không có secrets bị commit.
8. Không có thao tác xóa dữ liệu ngoài ý muốn.
Nếu không thể chạy Docker thực tế, báo rõ các bước chưa được kiểm chứng.
## 5. Quy trình thực hiện
**Phase 1 — Discovery:** Phân tích repository và đặc tả.
**Phase 2 — Plan:** Đề xuất cấu hình, cấu trúc file và các quyết định kỹ thuật.
**Phase 3 — Approval:** Sử dụng `/grill-me` để xác nhận những điểm còn thiếu. Chờ phê duyệt trước khi triển khai.
**Phase 4 — Implementation:** Tạo các file Docker và scripts theo kế hoạch được duyệt.
**Phase 5 — Verification:** Kiểm thử configuration, startup, shutdown và data persistence.
**Phase 6 — Report:** Tổng hợp các thay đổi, kết quả kiểm thử và những vấn đề còn tồn tại.
**Bắt đầu bằng việc đọc đặc tả dự án, lập kế hoạch triển khai và trình bày để tôi phê duyệt.**