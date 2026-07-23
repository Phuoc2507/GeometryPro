# VSGeo-Bench

**Vietnamese Solid-Geometry Benchmark** — bộ chuẩn & máy chấm tự động đánh giá năng lực suy luận **hình học không gian** của các mô hình AI trên đề Toán THPT tiếng Việt.

> *"AI có 'nhìn' được hình không gian?"*

Đề tài Nghiên cứu Khoa học Kỹ thuật (ViSEF) — dự án tập thể 2 học sinh THPT.
**Trạng thái:** 🟡 giai đoạn thiết kế (chưa triển khai code).

---

## Đây là gì?

Học sinh Việt đang dùng AI để học Toán, nhưng chưa có cách đo khách quan xem AI giải hình không gian **đúng đến đâu, sai ở đâu, có đáng tin không**. VSGeo-Bench cung cấp:

1. **Bộ dữ liệu** ~300 bài hình không gian tiếng Việt, phân loại nhiều chiều, có đáp án chuẩn.
2. **Máy chấm tự động (oracle)** dựa trên engine ký hiệu chính xác — xác minh được *đáp án mở* (căn thức, tọa độ, tỉ số) ở quy mô lớn.
3. **Bộ đánh giá & phân tích** — xếp hạng model, bộ biến đổi đo độ bền (suy luận hay dò mẫu), bảng phân loại lỗi, chỉ số "tự tin nhưng sai", và khảo sát giáo viên.

📄 **Thiết kế chi tiết:** [`docs/design.md`](docs/design.md)

---

## Bản đồ thư mục

| Thư mục | Nội dung |
|---------|----------|
| [`docs/`](docs/) | Bản thiết kế (spec), tài liệu, kế hoạch |
| `data/seeds/` | ~300 bài hạt giống (JSON theo schema) |
| `data/schema/` | Định nghĩa schema + kiểm tra hợp lệ |
| `grader/` | Máy chấm oracle (dùng lại engine ký hiệu) |
| `harness/` | Pipeline gọi model + trích đáp án |
| `perturbations/` | Bộ biến đổi có kiểm soát (robustness) |
| `analysis/` | Thống kê + bảng phân loại lỗi |
| `survey/` | Phiếu & dữ liệu khảo sát giáo viên |
| `dashboard/` | UI xếp hạng (có thể tái dùng frontend web) |

## Quan hệ với web app

Dự án này **tách riêng** khỏi web app (`src/`, `api/` ở gốc repo). Nó **dùng lại** engine ký hiệu tại `api/_lib/kernel/` làm *công cụ máy chấm* (ghi nguồn minh bạch). Khi công bố công khai, các phần engine cần thiết sẽ được sao chép (vendor) vào `grader/` để repo con tự đứng được. Xem §14 trong [thiết kế](docs/design.md).

## Nhóm

- **Em 1 — Dữ liệu & Taxonomy:** nguồn đề, chuẩn hóa, đáp án chuẩn, phân loại lỗi.
- **Em 2 — Harness & Phân tích:** pipeline eval, oracle, thống kê, dashboard.

## Lộ trình

Xem §11 (chia việc & tiến độ 5–6 tháng) trong [thiết kế](docs/design.md). Kế hoạch triển khai chi tiết sẽ nằm trong `docs/` sau bước lập kế hoạch.
