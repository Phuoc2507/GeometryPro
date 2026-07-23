# VSGeo — Máy chấm tự động lời giải hình học không gian

**Máy chấm tự động (oracle/grader)** xác minh *đáp án mở* của lời giải **hình học không gian** — căn thức, tọa độ, tỉ số, phương trình mặt phẳng/đường thẳng — ở quy mô lớn, để **bảo vệ học sinh tự học Toán** khỏi lời giải AI "trôi chảy nhưng sai". Bộ dữ liệu **VSGeo-Bench** (đề Toán THPT tiếng Việt) là bộ bằng chứng đầu tiên máy chấm chạy trên đó.

> *"AI có 'nhìn' được hình không gian?"* — câu hỏi phụ mà máy chấm giúp trả lời bằng số liệu.

Đề tài Nghiên cứu Khoa học Kỹ thuật (ViSEF) — dự án tập thể 2 học sinh THPT.
**Lĩnh vực dự kiến:** Phần mềm hệ thống (Systems Software).
**Trạng thái:** 🟡 giai đoạn thiết kế, khởi động triển khai.

---

## Đây là gì?

Học sinh Việt đang dùng AI để tự học Toán, nhưng AI có thể cho lời giải "trôi chảy nhưng sai" mà các em khó tự phát hiện. Người hưởng lợi: **giáo viên Toán và học sinh tự học**. VSGeo cung cấp:

1. **Máy chấm tự động (oracle) — ngôi sao của dự án.** Dựa trên engine ký hiệu chính xác (ghi nguồn minh bạch như *công cụ*, không nhận là phát minh), máy chấm xác minh *đáp án mở* — căn thức, tọa độ, tỉ số, phương trình mặt phẳng/đường thẳng — ở quy mô lớn, thay cho việc trước đây phải chấm tay.
2. **Demo sống "Kiểm tra lời giải AI".** Dán đề + lời giải AI → máy chấm phán **Đúng / Sai / Không chắc** kèm đáp án chuẩn. Đây là điểm nhấn trưng bày & phỏng vấn.
3. **Bộ dữ liệu VSGeo-Bench (bằng chứng).** Đề hình không gian tiếng Việt, phân loại nhiều chiều, có đáp án chuẩn; dùng để xếp hạng model — ứng dụng đầu tiên của máy chấm, minh chứng nó chạy thật ở quy mô.
4. **Phân tích & kiểm chứng phụ.** Bộ biến đổi đo độ bền (suy luận hay dò mẫu), bảng phân loại lỗi, chỉ số "tự tin nhưng sai", và mini-pilot khảo sát giáo viên (kiểm chứng phụ).

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

**Cốt lõi — 3 tháng** (nay → ~tháng 10), kịp vòng trường ~tháng 11:
- **Tháng 1 — Bộ xương đi được xuyên suốt:** môi trường (Plan 00) + schema & ~20 bài mẫu (Plan 01) + máy chấm oracle MVP rational/surd/point (Plan 02) + harness gọi 1–2 model (Plan 03). Chạy end-to-end trên ~20 bài: đề → model → trích → chấm → JSONL.
- **Tháng 2 — Nội dung + đánh giá đầy đủ + demo sống:** mở rộng dữ liệu lên ~120–150 bài (Plan 01) · harness đủ dàn model mục tiêu, k=3 (Plan 03) · bộ biến đổi robustness rename/rescale/paraphrase (Plan 04) · dựng **demo sống "Kiểm tra lời giải AI"** (Plan 07, ưu tiên cao).
- **Tháng 3 — Thống kê + taxonomy + đóng băng:** accuracy, bootstrap CI, McNemar, calibration "tự tin nhưng sai", kappa tập nhỏ + bảng phân loại lỗi (Plan 05) · dashboard + poster + báo cáo (Plan 07) · mini-pilot 3–5 giáo viên (Plan 06) · chốt bản demo trình vòng trường.

**Mở rộng — sau vòng trường** (→ vòng thành phố ~tháng 12 và xa hơn): dữ liệu lên ~300 bài + taxonomy đầy đủ hơn (Plan 01) · bộ biến đổi đủ 5 loại + distractor/reflect (Plan 04) · khảo sát giáo viên đầy đủ N người với quy trình đạo đức/đồng thuận chính thức (Plan 06) · hồi quy logistic + phân tích H4 hybrid LLM+engine (Plan 05) · công khai bộ dữ liệu + máy chấm (tách repo), viết preprint.

Chi tiết chia việc & tiến độ: xem §11 trong [thiết kế](docs/design.md). Kế hoạch triển khai chi tiết sẽ nằm trong `docs/` sau bước lập kế hoạch.
