# Engine Giải tích (Analysis Engine) — Thiết kế

**Ngày:** 2026-07-17
**Nhánh:** claude/project-reading-e990ce (worktree, không đụng production)
**Trạng thái:** Spec đã được duyệt hướng; chi tiết cho **Đợt A**.

## 1. Mục tiêu

Cho phép hệ thống "phụ" các đề thi mà lõi là **giải tích / tối ưu / mặt cong** — nhóm 10 bài khó
(đống rơm, đèn lồng, nón∩trụ, quả cầu 3 cột…) mà engine hình học tất định hiện tại KHÔNG kham được.

Xây **một engine thứ hai — Giải tích (số) — chạy song song** engine hình học, **giữ nguyên triết lý
chống ảo giác**: LLM chỉ *dịch/mô hình hoá*, một bộ giải tất định *tính + tự kiểm*.

**Không mục tiêu (YAGNI):** không xây một CAS đầy đủ (Mathematica). Chỉ đủ để giải các dạng đề thi
THPT/HSA: đạo hàm, tiếp tuyến, nghiệm, tích phân xác định, diện tích/thể tích, tối ưu 1 biến.

## 2. Triết lý số: "Số-trước, nhận-dạng-căn-đẹp"

Đáp số giải tích phần lớn là số siêu việt (12,95 L; 16,52 m²) — không phải căn đẹp. Quy tắc:

1. **Tính số ở độ chính xác cao** cho mọi thứ (nền robust, đồng nhất).
2. **Ưu tiên đường exact khi phép tính vốn chính xác được:**
   - Nghiệm đa thức bậc ≤ 2 (công thức nghiệm trong trường Scalar hữu-tỉ+một-căn của kernel) → **căn đẹp có bảo chứng** (vd Câu 9 → `10−2√7`).
   - Tích phân đa thức (nguyên hàm đa thức, cận hữu tỉ) → hữu tỉ chính xác.
3. **Khi buộc phải số → chạy Bộ nhận dạng hằng số:** thử khớp số thập phân (≥ 12 chữ số) với các dạng
   `a√b/c`, `p+q√r`, `k·π/m`, phân số… Khớp → hiển thị dạng đẹp, **ghi rõ "nhận dạng (khớp N chữ số)"**;
   không khớp → `≈ <số>` kèm nhãn "đã kiểm".
4. **Không bao giờ tuyên bố "chính xác" trừ khi thật sự exact hoặc nhận-dạng-khớp-rồi-thay-lại-đúng.**

## 3. Kiến trúc

### 3.1. Analysis Plan (cách LLM đặt bài)

Giống Geometry Plan: LLM xuất JSON mô hình hoá, **không giải**. Các khối:

- `define`: khai báo hàm/hằng.
  - Hàm tường minh: `{ name, expr }` (đa thức/hữu tỉ, biến 1 chiều), vd `f = -x^3 + 3x^2`.
  - Hàm-qua-điểm (fit): `{ name, form: 'poly', degree, through: [[x0,y0],…] }` → engine khớp hệ số.
  - Hằng số từ hình học: tham chiếu kết quả Geometry Plan (§3.4).
- `ops`: phép giải tích, mỗi op tạo một giá trị/đối tượng có tên.
  - `derivative` (đạo hàm), `tangent_at` (tiếp tuyến tại điểm),
  - `solve` (nghiệm f=0 trên miền), `integrate` (tích phân [a,b]),
  - `area_between` (diện tích giữa 2 đường), `volume_cross_section` / `volume_revolution` (Đợt B/C).
- `optimize`: `{ objective: <expr theo 1 biến>, sense: 'max'|'min', domain: [lo,hi] }`.
- `asserts`: ràng buộc đề CHO, để engine tự kiểm mô hình (§3.3).
- `queries`: những gì đề hỏi.

### 3.2. Bộ giải tất định (Solver core)

- **Root finder:** đường exact cho đa thức bậc ≤ 2 (bậc 3 nếu khả thi); numeric (bisection + Newton lai,
  có bracketing) cho phần còn lại. Trả **mọi** nghiệm trong miền.
- **Optimizer 1 biến:** tìm điểm dừng qua nghiệm đạo hàm + kiểm biên miền; đối chiếu bằng golden-section
  như phương pháp độc lập.
- **Quadrature:** Simpson/Gauss thích ứng (Đợt B).

### 3.3. Chống ảo giác — 3 lớp

Rủi ro chuyển từ "tính sai" sang "**mô hình hoá sai**" (LLM đặt cận/biến sai). Ba lớp chặn:

1. **Ràng buộc đề (asserts):** đề cho số ("chi phí 295 triệu", "chiều cao 4,5", "mọi cạnh 20") →
   engine **tính lại từ mô hình LLM dựng** và đối chiếu. Lệch quá dung sai → ghi **violation**, không trả bừa.
2. **Tự kiểm bằng phương pháp độc lập:** tích phân kiểm 2 mức lưới (Simpson n vs 2n phải hội tụ);
   cực trị kiểm bằng lấy mẫu lân cận (điểm tối ưu phải ≥/≤ hàng xóm); nghiệm thay ngược lại f(x*)≈0.
3. **Miền & tính hợp lệ:** nghiệm ∈ miền, mẫu số ≠ 0 trên [a,b], hàm liên tục trên cận tích phân.

Kết quả `run()` luôn kèm `{ answers, violations, checks, errors }` — người dùng thấy rõ mức tin cậy.

### 3.4. Ghép với Engine Hình học

Nhiều bài lai. Analysis Plan **dùng lại** kết quả Geometry Plan:
- Câu 9: hình học cho **tâm ngoại tiếp Q + bán kính ngoại tiếp** (đã có op ở G2-6) → giải tích **giải
  1 phương trình** `(Q_z + t) + R(t) = 14` cho t.
- Câu 10: hình học dựng **bóng đổ = giao đường-mặt** (đã có) theo tham số góc → giải tích **tối ưu** góc.

Cùng một `run()` điều phối: các op hình học chạy trên kernel hình học, op giải tích chạy trên solver,
giá trị số/căn truyền qua lại bằng lớp Scalar chung.

## 4. Đợt A — Nền (spec chi tiết)

**Mục tiêu Đợt A:** xử lý **TRỌN Câu 3 và Câu 9**, đồng thời dựng lõi tái dùng cho B/C.

### A1. Vá giao đường–cầu (engine hình học)
- `computeIntersection` hiện báo lỗi `line-sphere intersection not supported`.
- Thêm nhánh line–sphere: thế tham số đường vào phương trình cầu → bậc 2 `at²+bt+c=0` →
  0/1/2 giao điểm (rời/tiếp xúc/cắt). Trả điểm + phân loại.
- Toạ độ giao điểm nói chung là **nhị thức căn** (rational + rational·√Δ) → ngoài trường một-căn đơn-thức
  của Scalar hiện tại ⇒ phần `exact` = null (số), **đúng theo triết lý §2**. Trường hợp Δ chính phương
  (vd Câu 3: Δ=584²) → giao điểm hữu tỉ, exact.
- Mở khoá Câu 3 ý d (khoảng cách vào–ra vùng radar).

### A2. Solver 1 biến (module mới `analysis/solver1d`)
- `solvePoly(coeffs, domain)`: nghiệm đa thức; bậc ≤ 2 dùng **công thức nghiệm exact** trong Scalar →
  giữ căn đẹp; bậc cao numeric.
- `optimize1d(f, sense, domain)`: điểm dừng (nghiệm f') + biên; kiểm chéo golden-section.
- Mọi kết quả kèm **self-check** (thay lại / lấy mẫu lân cận).

### A3. Bộ nhận dạng hằng số (module mới `analysis/recognize`)
- Vào: số thực (độ chính xác cao). Ra: dạng đẹp `p+q√r`, `a√b/c`, `k·π/m` nếu khớp ≥ 12 chữ số; else null.
- **Bắt buộc thay-lại-kiểm** trước khi chấp nhận (tránh khớp giả).

### A4. Analysis Plan (tối thiểu cho A) + tích hợp `run()`
- Schema Zod: `define` (hằng/tham chiếu hình học), `ops: solve`, `optimize`, `asserts`, `queries`.
- Nối vào `run()` hợp nhất: op hình học ↔ op giải tích chia sẻ Scalar; asserts kiểm chéo.

### A5. Nối đầu-cuối Câu 3 & Câu 9 + test
- **Câu 3:** Oxyz thuần; ý a/b/c đã chạy được, ý d dùng A1. Đối chiếu S–Đ–Đ–Đ, ý d = `584/√665×1000 ≈ 22 646 → 22 600 m`.
- **Câu 9:** hình học (tâm/bán kính ngoại tiếp) + A2 giải bậc 2 `9t²+60t−152=0` → **R = 10−2√7 ≈ 4,71 m** (exact, căn đẹp).
- Cập nhật prompt Translator dạy khối `analysis` + ví dụ Câu 9.

### Tiêu chí Đợt A "xong"
- Câu 3 (cả 4 ý) và Câu 9 chạy đúng qua `run()`; Câu 9 ra dạng `10−2√7` (exact).
- Toàn bộ test cũ vẫn xanh; tsc/eslint sạch; kernel rebuild.
- 0 lần "trả bừa": khi asserts/self-check thất bại → có violation, không trả đáp bịa.

## 5. Đợt B & C (phác thảo — chưa chi tiết)

- **Đợt B · Giải tích:** hàm số + quadrature + fit-qua-điểm → Câu 1 (parabol+tiếp tuyến+đỉnh),
  Câu 4 (thể tích tích phân + fit + tối ưu bóng đèn), Câu 5 (diện tích giữa đường cong + khoảng cách 2 đường),
  Câu 10 (bóng đổ + tối ưu góc).
- **Đợt C · Khối cong:** nón/trụ/paraboloid như KHỐI + thể tích giao (numeric) → Câu 8. Khó nhất.
- **Ngoài phạm vi hiện tại:** Câu 7 (đường đi ngắn nhất unfolding) — ca đặc thù, cân nhắc sau.

## 6. Chiến lược test (TDD)

- Mỗi module (solver1d, recognize, line-sphere) có test đơn vị với **golden truy vết tay**
  (vd nghiệm `9t²+60t−152=0` = `(−10±6√7)/3`; nhận dạng `4.7085…` = `10−2√7`; giao đường-cầu Câu 3 Δ=584²).
- Test hợp đồng Câu 3, Câu 9 chạy qua `run()` end-to-end.
- Test chống-ảo-giác: cố tình đưa mô hình sai (cận tích phân sai / assert không thoả) → engine phải
  báo violation, KHÔNG trả đáp bịa.
