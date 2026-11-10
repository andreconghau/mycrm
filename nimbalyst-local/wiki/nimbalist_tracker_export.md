---
id: 2d56c919-8ab5-42a2-863a-0fc0a7c9f1e6
order: 4072
---
Bạn có thể lưu prompt sau để dùng ở session khác:

```text
Tôi đang tiếp tục phát triển tính năng export Nimbalyst Tracker.

Repository dùng chung:
git@github.com:andreconghau/nimbalyst-tracker-export.git

Commit hiện tại:
d30e91b feat: add reusable Nimbalyst tracker exporter

Mục tiêu:
Export toàn bộ tracker từ Nimbalyst ra các file Markdown local để backup, commit Git và có thể import/reconstruct lại nội dung nhất quán sau này.

Tính năng đã có:

1. Package reusable

Package nằm ở repository root:

- src/backup.ts
- src/validator.ts
- src/export.ts
- src/cli.ts
- src/index.ts
- README.md
- package.json
- tsconfig.json

2. Export động từ Nimbalyst

CLI tự lấy danh sách tracker mỗi lần chạy bằng Nimbalyst CLI:

- Không hard-code tracker ID.
- Mặc định đọc từ local read-only Nimbalyst database bằng `nim --offline`.
- Có tùy chọn `--live`.
- Hỗ trợ chỉ định workspace và đường dẫn output.

3. Markdown snapshot

Mỗi tracker được lưu thành một file:

```text
nimbalyst-local/tracker/tasks/<tracker_id>.md
```

Có front matter:

- tracker_id
- title
- status
- priority
- module
- source
- source_updated_at
- exported_at
- content_hash
- schema_version

Nội dung Markdown phải giữ nguyên:

- Line breaks
- Heading
- Bullet list
- Markdown table
- Code fence
- Nội dung tiếng Việt
- Backticks

Nimbalyst trả body dạng JSON-encoded string nên CLI phải decode body trước khi ghi file. Không được để literal `\n` trong file Markdown.

4. Manifest

Cập nhật file:

```text
nimbalyst-local/tracker/manifest.json
```

Manifest chứa danh sách tracker, đường dẫn file, content hash, thời gian source update và thời gian export.

5. Conflict handling

Không được âm thầm ghi đè snapshot local đã thay đổi.

Khi phát hiện conflict:

- Snapshot local cũ được giữ lại trong thư mục temporary history.
- Snapshot mới từ Nimbalyst được promote thành file canonical.
- Manifest được cập nhật lại.

6. CLI hiện tại

Build package:

```bash
npm install
npm run build
```

Export tracker:

```bash
node dist/cli.js --workspace /absolute/path/to/project
```

Dùng live mode:

```bash
node dist/cli.js \
  --workspace /absolute/path/to/project \
  --live
```

Các option:

```text
--workspace <path>
--tasks-dir <path>
--manifest <path>
--nim <path>
--live
```

7. Tích hợp vào project CRM hiện tại

Project CRM hiện có:

```bash
npm run tracker:package:build
npm run tracker:export
./tracker_export.sh
npm run tracker:validate
```

`tracker_export.sh` là wrapper để chạy package CLI trong project CRM.

Các việc cần làm tiếp:

1. Kiểm tra và hoàn thiện cơ chế import snapshot Markdown ngược lại Nimbalyst.
2. Xác định import policy:
  - overwrite trực tiếp,
  - dry-run trước,
  - hoặc yêu cầu approval khi có conflict.
3. Thêm CLI command riêng:

```bash
nimbalyst-tracker-export validate
nimbalyst-tracker-export import
nimbalyst-tracker-export diff
```

4. Thêm test cho:
  - JSON-encoded body.
  - Markdown nhiều dòng.
  - Code fence.
  - Table.
  - Unicode/Vietnamese.
  - Conflict.
  - Stale source timestamp.
  - Missing tracker.
  - Duplicate tracker ID.
5. Cân nhắc publish package lên npm private registry hoặc dùng Git dependency.
6. Cân nhắc thêm GitHub Actions để:
  - Build package.
  - Chạy test.
  - Validate package.
  - Tạo release/tag.
7. Kiểm tra compatibility giữa version của `nim` CLI và schema database Nimbalyst.
8. Không hard-code tracker ID.
9. Không đưa các thay đổi riêng của project CRM vào repository package dùng chung.
10. Trước khi sửa code, đọc README và kiểm tra Git status hiện tại.