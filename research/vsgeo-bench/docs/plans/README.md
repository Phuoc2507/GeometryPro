# Lộ trình VSGeo-Bench — Bản đồ 8 kế hoạch

Chào hai em! Đây là **bản đồ tổng** cho toàn bộ dự án VSGeo-Bench (bộ đo năng lực giải Hình học không gian THPT của các mô hình AI, cho ViSEF). Tám file kế hoạch `00`–`07` trong thư mục này là "công thức nấu ăn" từng bước. File README này giúp hai em biết **đọc theo thứ tự nào, ai làm phần nào, làm vào tháng nào, và phần nào phải xong trước phần nào**.

> Đọc README này **trước tiên**. Sau đó mở kế hoạch `00` và làm tuần tự. Mỗi kế hoạch tự nó có đầy đủ các bước (Task) và lệnh chạy — em cứ bám sát. Đừng nhảy cóc: các kế hoạch dựa lên nhau.

## Tái khung — máy chấm ra mặt tiền

**Sản phẩm chính của đề tài = MÁY CHẤM tự động (oracle/grader).** Nó xác minh đáp án **mở** (căn thức, toạ độ, tỉ số, phương trình mặt phẳng/đường thẳng) ở quy mô lớn — việc trước đây phải chấm tay. Bảng **benchmark xếp hạng model** chỉ là **ứng dụng đầu tiên** của máy chấm, đóng vai **bằng chứng**, không phải mục tiêu tối thượng. **Điểm nhấn** khi trưng bày/phỏng vấn là **demo sống "Kiểm tra lời giải AI"**: dán đề + lời giải AI → máy chấm phán **Đúng / Sai / Không chắc** kèm đáp án chuẩn. Lĩnh vực đăng ký: **Phần mềm hệ thống** (Systems Software). Khảo sát giáo viên là **kiểm chứng phụ**, không phải trục chính.

## Thứ tự đọc (đường đi ngắn nhất)

`00` (dựng môi trường) → `01` (schema + dữ liệu) → `02` (máy chấm oracle) → `03` (harness gọi model) → rồi rẽ hai nhánh chạy song song: `04` (robustness) và `06` (khảo sát) → gộp về `05` (phân tích) → cuối cùng `07` (dashboard + công bố).

## Bảng 8 kế hoạch

| # | Tên | Em phụ trách (gợi ý) | Tháng (lõi 3 tháng) | Phụ thuộc (phải xong trước) | File |
|---|-----|----------------------|---------------------|------------------------------|------|
| 00 | Khởi động môi trường | Cả hai (làm chung) | Tháng 1 | — | `00-khoi-dong-moi-truong.md` |
| 01 | Schema & dữ liệu (~150 lõi → 300 mở rộng) | Em A (chủ dữ liệu) | T1 (~20 mẫu) → T2 (~150) | 00 | `01-schema-va-du-lieu.md` |
| 02 | Máy chấm oracle | Em B (chủ code) | Tháng 1 | 01 | `02-may-cham-oracle.md` |
| 03 | Harness gọi model | Em B | T1 (1–2 model) → T2 (k=3) | 02 (và 01) | `03-harness-goi-model.md` |
| 04 | Bộ biến đổi (robustness) | Em B | Tháng 2 | 01, 02 | `04-bo-bien-doi-robustness.md` |
| 05 | Phân tích & taxonomy (κ) | Em A | Tháng 3 | 03, 04 | `05-phan-tich-va-taxonomy.md` |
| 06 | Khảo sát giáo viên | Em A | Tháng 3 (mini-pilot 3–5 GV) | 02, 03 | `06-khao-sat-giao-vien.md` |
| 07 | Dashboard & công bố | Cả hai (B: dashboard, A: datasheet/báo cáo) | T2 (demo sống) → T3 (dashboard/poster) | 03, 05 | `07-dashboard-va-cong-bo.md` |

> Cột "Em phụ trách" chỉ là **gợi ý chia việc** cho hai người — không phải luật. Cứ đổi nếu thấy hợp hơn. Điều bắt buộc là **thứ tự phụ thuộc** ở cột kế bên.

## Sơ đồ phụ thuộc

```
00  Khởi động môi trường
│
└─▶ 01  Schema & dữ liệu
     │
     └─▶ 02  Oracle
          │
          ├─▶ 03  Harness ──┬──▶ 05  Phân tích ──▶ 07  Dashboard & công bố
          │                 │        ▲
          └─▶ 04  Robustness ┘────────┘
          │
          └─▶ 06  Khảo sát giáo viên  (cần 02 + 03)
```

Diễn giải bằng lời:
- **00 → 01 → 02 → 03**: xương sống. Không có môi trường thì không viết được test; không có schema thì oracle không biết chấm cái gì; không có oracle thì harness không biết đúng/sai; harness là nơi chạy model thật.
- **04 cần 01 + 02**: biến đổi bài phải dựa trên schema (01) và phải chấm lại được bằng oracle (02).
- **05 cần 03 + 04**: phân tích ăn kết quả eval (03) và số liệu robustness (04).
- **06 cần 02 + 03**: phiếu khảo sát cho giáo viên xem **lời giải model (03)** và dùng **nhãn đúng/sai của oracle (02)** để biết bài nào model sai.
- **07 cần 03 + 05**: dashboard đọc file tổng hợp do phân tích (05) sinh ra, và cần dữ liệu eval (03).

## Lộ trình 3 tháng (lõi) + Mở rộng

**LÕI — 3 tháng** (từ nay → khoảng tháng 10), kịp vòng trường ~tháng 11. Mục tiêu: một đường ống **chạy thật** từ đề → model → trích → chấm → thống kê, với **máy chấm** làm ngôi sao và **demo sống "Kiểm tra lời giải AI"** làm điểm nhấn.

| Tháng | Mục tiêu | Kế hoạch chạy trong tháng |
|-------|----------|----------------------------|
| **Tháng 1** | *Bộ xương đi được xuyên suốt.* Dựng môi trường + schema + ~20 bài mẫu + máy chấm oracle MVP (rational/surd/point) + harness gọi 1–2 model. Chạy end-to-end trên ~20 bài: đề → model → trích → chấm → JSONL. Chứng minh đường ống chạy thật. | 00, 01 (schema + ~20 mẫu), 02 (oracle MVP), 03 (1–2 model) |
| **Tháng 2** | *Nội dung + đánh giá đầy đủ + demo sống.* Mở rộng dữ liệu lên ~120–150 bài · harness đủ dàn model mục tiêu, k=3 · bộ biến đổi robustness (rename/rescale/paraphrase) · dựng **demo sống "Kiểm tra lời giải AI"** trên dashboard (ưu tiên cao). | 01 (~150 bài), 03 (k=3, đủ dàn), 04 (rename/rescale/paraphrase), 07 (demo sống) |
| **Tháng 3** | *Thống kê + taxonomy + đóng băng cho vòng trường.* Thống kê lỗi (accuracy, bootstrap CI, McNemar, calibration "tự tin nhưng sai", κ trên tập nhãn nhỏ) + bảng phân loại lỗi · dashboard + poster + báo cáo · mini-pilot 3–5 giáo viên (kiểm chứng phụ) · chốt bản demo trình vòng trường. | 05 (thống kê + taxonomy), 07 (dashboard/poster/báo cáo), 06 (mini-pilot 3–5 GV) |

**MỞ RỘNG — sau vòng trường → vòng thành phố (tháng 12) và xa hơn:**

- Dữ liệu lên ~300 bài, taxonomy đầy đủ hơn (Plan 01 scale).
- Bộ biến đổi đủ 5 loại + số biến thể lớn, distractor/reflect breadth (Plan 04 scale).
- Khảo sát giáo viên đầy đủ N người với quy trình đạo đức/đồng thuận chính thức (Plan 06 scale) · hồi quy logistic (Plan 05 scale) · phân tích **H4 hybrid** LLM+engine (hướng mở rộng, hạ từ giả thuyết lõi).
- Công khai bộ dữ liệu + máy chấm (tách repo), viết preprint (Plan 07 scale).

## Ánh xạ tới giả thuyết H1–H4 (design §1)

| Giả thuyết | Nội dung | Kế hoạch trả lời |
|------------|----------|-------------------|
| **H1** | Bài cần **kẻ thêm hình phụ** khó hơn với model | Nhãn `hình phụ` gắn ở **01**, phân tích `byAuxiliary` ở **05** |
| **H2** | Model **dò mẫu** chứ không suy luận (rớt khi đổi biến thể) | Bộ biến đổi **04** + `robustnessReport` phân tích ở **05** (báo cáo chéo-model) |
| **H3** | Model **tự tin nhưng sai**, và **đánh lừa được giáo viên** | Calibration (`isConfident`) ở **05** + khảo sát GV **06** |
| **H4** | Kết hợp **LLM + engine** nâng được trần điểm (hybrid topline) | 🔭 **Hướng mở rộng** (sau vòng trường) — hạ khỏi phần lõi 3 tháng; xem "Lộ trình 3 tháng (lõi) + Mở rộng" |

## Các mối nối giữa kế hoạch — ĐÃ TÍCH HỢP (changelog v2)

Trước đây phần này liệt kê các chỗ ráp nối **cần chốt trước khi build**. Bản **v2** đã gộp cả **8 mối nối** vào đúng kế hoạch. Giữ lại đây làm **changelog** để hai em biết mỗi chỗ đã xử lý ra sao (đọc để hiểu, không phải việc phải làm lại):

1. **Glob test của vitest — ĐÃ TÍCH HỢP (v2) vào kế hoạch 00.** File `vitest.config.ts` ở gốc repo phải liệt kê `research/vsgeo-bench/**/*.test.ts` từ SỚM, kẻo test của 01 (chạy trước 02) bị bỏ qua. → Việc thêm glob đã **dời lên kế hoạch 00** (hạ tầng trước), nên từ 01 trở đi `npm test` thấy test.
2. **Đường import schema `seed` → `problem` — ĐÃ TÍCH HỢP (v2) vào kế hoạch 04.** Kế hoạch 01 tạo file `problem.ts` (không có `seed.ts`). → Kế hoạch 04 đổi import thành `../data/schema/problem`.
3. **`robustnessReport` — ĐÃ TÍCH HỢP (v2) vào kế hoạch 04 + 05.** Tách rõ hai hàm: `robustnessGap(accGoc, accBienThe): number` là hàm **scalar** (hai số) ở 04; thêm `robustnessReport(base, variants)` trả `{overall, byKind}` để **05 import đúng hàm này** cho báo cáo chéo-model H2.
4. **`BenchmarkSummary` chuẩn hoá — ĐÃ TÍCH HỢP (v2) tại `analysis/types.ts`.** Chốt **một** schema tổng hợp dùng chung: `BenchmarkSummary` (mảng `models[]` lồng `overall/byTopic/byDifficulty/robustness`) đặt tập trung ở `analysis/types.ts`; 05 sinh đúng hình 07 đọc, kèm test kiểm output 05 hợp lệ với reader của 07.
5. **Barrel `grader/index.ts` — ĐÃ TÍCH HỢP (v2) vào kế hoạch 02.** Kế hoạch 02 thêm `grader/index.ts` re-export `grade`, `GradeResult`, `Verdict`, để 03 import gọn `from '../grader'`.
6. **Quy ước `sqrt(22)` thay `√22` — ĐÃ TÍCH HỢP (v2) vào kế hoạch 04.** `answer.canonical` bắt buộc viết `sqrt(22)`, **cấm** `√22`. → Fixture 04 đã sửa về `sqrt(...)`.
7. **Đường chạy test có tiền tố `research/vsgeo-bench/` — ĐÃ TÍCH HỢP (v2) vào kế hoạch 06.** Các lệnh test chạy theo đường dẫn con, ví dụ `npm test -- research/vsgeo-bench/survey/__tests__/analyze.test.ts`, cho khớp cấu trúc thư mục đề tài.
8. **Ghi chú độ sâu import (import-depth) — ĐÃ TÍCH HỢP (v2).** Các file trong thư mục con phải đếm đúng số cấp `../` khi trỏ tới `data/`, `grader/`, hay engine `api/_lib/kernel/` (ví dụ từ `data/schema/__tests__/` là `../../schema/problem`). → Các kế hoạch ghi chú rõ độ sâu `../` chuẩn để tránh lệch đường dẫn.

> **H4 (hybrid LLM + engine) không còn là mối nối chặn build.** Theo lộ trình 3 tháng, H4 **hạ xuống hướng mở rộng** (sau vòng trường) — xem mục "Lộ trình 3 tháng (lõi) + Mở rộng". Không cần thêm Task hybrid cho vòng trường; chỉ ghi H4 là "hướng phát triển" trong báo cáo cho khớp giả thuyết.

## Nhắc nhở vàng (đọc lại mỗi tuần)

- **TDD — test trước, code sau.** Mọi kế hoạch đều theo nhịp đỏ → xanh: viết test thất bại trước, rồi viết code tối thiểu cho xanh. Đừng bỏ bước này; nó là thứ giúp em tự tin sửa code mà không sợ hỏng.
- **Commit thường xuyên, mỗi Task một commit.** Message theo kiểu conventional (`feat(...)`, `docs(...)`, `chore(...)`). Commit nhỏ = dễ quay lui, dễ review.
- **TUYỆT ĐỐI không commit khoá API.** Khoá chỉ để trong `.env` ở máy (đã bị `.gitignore` chặn); chỉ commit `.env.example` (chỉ có TÊN biến, không có giá trị). Trước khi công bố, chạy `scan-secrets.ts` (kế hoạch 07). Nếu lỡ commit khoá → **xoay (revoke) khoá ngay** ở nhà cung cấp.
- **Ranh giới liêm chính (§4.4, §9.3, §14).** Engine ký hiệu ở `api/_lib/kernel/` là **công cụ có sẵn** của thành viên nhóm — phải **ghi nguồn minh bạch** (vendor + LICENSE-engine), **không** được nói là hai em tự phát minh. Phần **của hai em** là: 300 bài toán, nhãn lỗi, harness, taxonomy, khảo sát giáo viên, và cách diễn giải kết quả — đây mới là thứ hội đồng chấm. Không viết sẵn nội dung khoa học; để nó phản ánh công sức thật.
- **Đây là dự án Vite + React + TypeScript** (không phải Next.js). Test bằng `vitest` (`npm test`), chạy CLI bằng `npx tsx <file>.ts`.

Chúc hai em làm tốt. Cứ đi từ `00`, mỗi lần một Task, xanh rồi mới đi tiếp. 💪
