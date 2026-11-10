---
tracker_id: "tsk_mw3ao3fzsjwy5i"
title: "RP-01 install NextJS 16"
status: "done"
priority: "high"
module: "Module 0"
source: "nimbalyst"
source_updated_at: "2026-11-06T02:08:22.241Z"
exported_at: "2026-11-10T01:32:39.997Z"
content_hash: 35b050bcd7777d4b64aa5c3aadc97f90d5e9a6643ef2484bb5c04e64d89ae603
schema_version: 1
---
# TASK: Lập kế hoạch khởi tạo Frontend với Next.js 16
## 1. Mục tiêu
Phân tích dự án hiện tại và xây dựng kế hoạch khởi tạo source code frontend theo hướng production-ready, dễ bảo trì, có khả năng mở rộng và tuân thủ kiến trúc dự án.
**Technology Stack bắt buộc:**
- Framework: Next.js 16 (App Router)
- Runtime: Node.js 26
- Package Manager: npm
- Language: TypeScript
- Styling: Tailwind CSS
- UI Components: shadcn/ui
- Source Code Directory: `/src`
**Project Root:**
`/Users/andre/www/codex/ccc`
**Technical Specification:**
`/Users/andre/www/codex/ccc/docs/structure/frontend.md`
**Chế độ thực hiện: PLAN FIRST.**
Chưa được cài đặt dependencies, khởi tạo source code hoặc triển khai tính năng trước khi kế hoạch được phê duyệt.
## 2. Skills bắt buộc
### Skill `/grill-me`
Sử dụng `/grill-me` khi:
- Yêu cầu chưa đầy đủ hoặc chưa rõ ràng.
- Cần xác nhận quyết định kiến trúc.
- Có nhiều giải pháp với trade-off khác nhau.
- Phát hiện xung đột với tài liệu hiện tại.
- Chưa xác định rõ business module, router hoặc permission.
Nguyên tắc:
1. Đặt câu hỏi ngắn gọn, rõ ràng.
2. Đưa ra các lựa chọn khả thi.
3. Đề xuất phương án tối ưu kèm lý do.
4. Nhóm các câu hỏi liên quan để tránh hỏi nhiều lần.
5. Không tự suy đoán các yêu cầu nghiệp vụ.
6. Không triển khai khi còn quyết định quan trọng chưa được xác nhận.
### Skill `frontend-patterns`
Đọc và áp dụng skill `frontend-patterns` trong quá trình thiết kế và phát triển:
- Frontend architecture
- Component patterns
- Routing và layouts
- State management
- Forms và validation
- API integration
- Loading và error handling
- Responsive design
- Accessibility
- Performance optimization
Đối với backend, chỉ áp dụng những pattern phù hợp, không sử dụng frontend patterns để thay thế nguyên tắc kiến trúc backend.
Phải kiểm tra skill có tồn tại trước khi sử dụng. Nếu không tìm thấy, báo lại thay vì tự ý thay thế.
## 3. Phase 1 — Phân tích dự án hiện tại
Trước khi đề xuất giải pháp:
1. Đọc `AGENTS.md` và các project instructions liên quan.
2. Kiểm tra cấu trúc thư mục hiện tại.
3. Đọc các tài liệu requirements, architecture và technical specification.
4. Kiểm tra `package.json`, dependencies và cấu hình hiện có.
5. Xác định những chức năng, module và routes đã được định nghĩa.
6. Kiểm tra những quyết định kiến trúc đã được phê duyệt.
7. Xác định các ràng buộc kỹ thuật, vấn đề còn thiếu hoặc xung đột.
Không ghi đè hoặc thay đổi cấu trúc dự án hiện tại khi chưa có lý do rõ ràng và được phê duyệt.
**Kết quả:** Báo cáo hiện trạng, các ràng buộc và những vấn đề cần làm rõ.
## 4. Phase 2 — Thiết kế Frontend Architecture
Thiết kế kiến trúc Next.js 16 theo nguyên tắc đơn giản, dễ bảo trì và có thể mở rộng.
Các thành phần cần phân tích:
- Next.js App Router
- Server Components và Client Components
- SSR, SSG và caching strategy
- Route Groups và Shared Layouts
- Feature-based architecture
- Reusable UI Components
- shadcn/ui integration
- Tailwind CSS configuration
- Design Tokens và Theme
- API integration
- Environment configuration
- Forms và Validation
- Authentication và Authorization (nếu được yêu cầu)
- Loading, Error và Not Found
- Responsive và Accessibility
- Testing strategy
- Performance optimization
Ưu tiên khả năng có sẵn của Next.js trước khi bổ sung thư viện bên ngoài.
Không overengineering hoặc tạo abstraction không cần thiết.
Phải phân biệt frontend, backend và các integration boundaries. Không tự giả định backend sử dụng Next.js Route Handlers hay một service riêng.
## 5. Phase 3 — Thiết kế Frontend Routing
Phân tích tài liệu nghiệp vụ hiện tại và chuẩn bị toàn bộ routing architecture cần sử dụng.
Sử dụng Next.js 16 App Router.
Với mỗi route, cần xác định:
| Thành phần | Yêu cầu |
| --- | --- |
| URL | Đường dẫn truy cập |
| Route File | Đường dẫn trong `src/app` |
| Module | Module nghiệp vụ |
| Purpose | Chức năng của trang |
| Layout | Layout sử dụng |
| Access | Public / Authenticated / Permission |
| Rendering | Server / Client / Hybrid |
| Data Dependencies | API hoặc dữ liệu cần sử dụng |
| Status | Confirmed / Proposed / Pending Approval |
Ngoài ra cần thiết kế:
1. Route Groups.
2. Nested Routes.
3. Dynamic Routes.
4. Shared Layouts.
5. Navigation và Sidebar.
6. Protected Routes nếu cần.
7. Loading và Error Boundaries.
8. Not Found Pages.
9. Route naming conventions.
10. Deep Linking.
11. Khả năng mở rộng routes trong tương lai.
**Quy tắc quan trọng:**
- Chỉ xác định business routes dựa trên requirements đã có.
- Không tự tạo module hoặc permission chưa được định nghĩa.
- Phân biệt routes đã xác nhận và routes đề xuất.
- Sử dụng `/grill-me` để xác nhận những routes chưa rõ.
- Không bổ sung React Router hoặc thư viện routing khác nếu không có nhu cầu thực tế.
## 6. Phase 4 — Thiết kế Source Directory
Đề xuất cấu trúc thư mục frontend production-ready.
Yêu cầu:
- Toàn bộ application source code nằm trong `/src`.
- Tuân thủ Next.js App Router conventions.
- Phân tách rõ routing, UI components, business features, utilities và integration code.
- Có cấu trúc module dễ mở rộng.
- Tránh duplicated components.
- Không tạo quá nhiều abstraction hoặc folder không cần thiết.
Trình bày directory tree đề xuất và giải thích trách nhiệm từng thư mục chính.
Không tạo business modules giả định.
## 7. Phase 5 — Technical Specification
Cập nhật tài liệu:
`/Users/andre/www/codex/ccc/docs/structure/frontend.md`
Nội dung cần bao gồm:
1. Technology Stack và version requirements.
2. Architecture Overview.
3. Source Directory Structure.
4. Routing Architecture.
5. Route Inventory.
6. Layout và Navigation Strategy.
7. Component Organization.
8. Styling và Design System.
9. API Integration.
10. Rendering và Caching Strategy.
11. Security và Access Control.
12. Performance và Scalability.
13. Development Conventions.
14. Testing Strategy.
15. Installation Plan.
16. Open Questions và Pending Decisions.
Yêu cầu:
- Kiểm tra nội dung hiện tại trước khi cập nhật.
- Giữ nguyên những quyết định hợp lệ đã có.
- Không ghi đè thông tin quan trọng.
- Phân biệt các quyết định đã xác nhận và các đề xuất đang chờ duyệt.
- Nội dung tài liệu kỹ thuật viết bằng tiếng Anh.
- Giao tiếp và giải thích cho người dùng bằng tiếng Việt.
Trong Plan Mode, chuẩn bị nội dung thay đổi dự kiến; chỉ thực hiện chỉnh sửa file khi đã được phép.
## 8. Phase 6 — Lập kế hoạch Installation
Chuẩn bị kế hoạch triển khai theo thứ tự:
1. Kiểm tra môi trường Node.js 26 và npm.
2. Xác minh compatibility giữa Node.js, Next.js 16 và các dependencies.
3. Khởi tạo hoặc tích hợp Next.js vào repository hiện tại.
4. Cấu hình TypeScript.
5. Cấu hình Tailwind CSS.
6. Cài đặt shadcn/ui.
7. Thiết lập cấu trúc `/src`.
8. Xây dựng route skeleton và shared layouts đã được phê duyệt.
9. Thiết lập linting, formatting và type checking.
10. Chuẩn bị testing infrastructure.
11. Kiểm tra development và production build.
Với mỗi bước, cung cấp:
- Lệnh cần thực hiện.
- File cần tạo hoặc chỉnh sửa.
- Dependencies liên quan.
- Kết quả mong đợi.
- Cách kiểm tra.
- Rủi ro có thể phát sinh.
Không chạy installation commands trong giai đoạn lập kế hoạch.
## 9. Kết quả cần bàn giao
### A. Repository Assessment
- Hiện trạng dự án.
- Các ràng buộc.
- Những vấn đề cần giải quyết.
### B. Frontend Architecture
- Kiến trúc đề xuất.
- Directory tree.
- Giải thích các quyết định quan trọng.
- Phân tích trade-offs.
### C. Routing Specification
- Route Inventory.
- Route Groups.
- Layout Hierarchy.
- Access Strategy.
- Navigation Structure.
### D. Installation Plan
- Các bước triển khai theo thứ tự.
- Dependencies.
- Validation Checklist.
### E. Technical Documentation
- Nội dung cần cập nhật trong `docs/structure/frontend.md`.
- Các quyết định đã xác nhận.
- Những quyết định chưa được phê duyệt.
### F. Approval Questions
- Sử dụng `/grill-me` để làm rõ những vấn đề còn thiếu.
## 10. Quy tắc thực thi
1. Chỉ làm việc trong Plan Mode.
2. Đọc và hiểu dự án trước khi đề xuất kiến trúc.
3. Tuân thủ các quyết định đã được phê duyệt.
4. Không tự suy đoán yêu cầu chưa xác định.
5. Không cài đặt hoặc chỉnh sửa application source code.
6. Không tạo business routes không có cơ sở.
7. Ưu tiên giải pháp đơn giản, ổn định, production-ready.
8. Hạn chế dependencies không cần thiết.
9. Không thay đổi phạm vi công việc khi chưa được phê duyệt.
10. Trình bày kế hoạch hoàn chỉnh để review trước khi implement.
## 11. Bắt đầu thực hiện
Thực hiện theo thứ tự:
**Bước 1:** Kiểm tra repository và đọc tài liệu hiện có.
**Bước 2:** Sử dụng `/grill-me` để xác nhận những quyết định chưa rõ.
**Bước 3:** Thiết kế frontend architecture, directory structure và routing specification.
**Bước 4:** Chuẩn bị bản cập nhật cho `docs/structure/frontend.md`.
**Bước 5:** Trình bày installation plan và chờ phê duyệt.
**Không triển khai source code trước khi tôi xác nhận.**