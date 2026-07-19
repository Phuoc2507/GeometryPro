# Bộ giải đa-ràng-buộc hình học (`solve_multi`) — Design Spec

**Ngày:** 2026-07-19
**Trạng thái:** Chờ duyệt spec
**Nhánh:** `claude/solve-multi` (off main)

---

## 1. Mục tiêu

Cho engine giải được lớp bài Oxyz "dựng cấu hình thoả NHIỀU ràng buộc hình học" với **đáp VÔ HƯỚNG** —
loại mà `solve` (1 ẩn, 1 ràng buộc) và `optimize_multi` (objective phải là biểu thức, không nhận truy vấn
hình học) hiện KHÔNG làm được. Ví dụ: Câu 2 (mp qua A, ⊥(P), chắn trục OM=3ON → tính b+c), Câu 4 (đường qua
A cắt cả d1,d2 → tính a+b), Phần 4 tâm tỷ cự.

Giữ nguyên chống ảo giác: engine tính + tự kiểm; chỉ serve khi THẬT SỰ giải được (residual≈0) + assert đạt.

## 2. Ý tưởng cốt lõi (reframe)

**Giải hệ M ràng buộc hình học trên N tham số = TỐI THIỂU HOÁ tổng bình phương độ lệch:**

```
objective(xs) = Σ_i ( query_i(xs) − target_i )²
```

Tìm `xs*` làm `objective ≈ 0` ⇒ mọi ràng buộc thoả. Least-squares xử được cả hệ vuông (M=N), thừa (M>N),
và **nghiệm kép/tiếp xúc** (min chạm 0 — thứ solver đổi-dấu hay trượt). Tái dùng gần hết máy đã có.

## 3. Kiến trúc & thành phần

Tất cả ở lớp analysis (`api/_lib/kernel/analysis/`), KHÔNG đụng `run()`/core kernel.

### 3.1. Schema — analyze kind mới `solve_multi`
Thêm vào `AnalyzeSchema` (`runAnalysis.ts`):
```ts
z.object({
  kind: z.literal('solve_multi'),
  parameters: z.array(z.string()).min(2),           // N ẩn (khai domain trong plan.parameters)
  constraints: z.array(z.object({                    // M ràng buộc hình học
    of: ScalarSource,                                // truy vấn hình học HOẶC expr
    equals: NumOrExpr,                               // số hoặc căn ("sqrt(3)")
  })).min(1),
  report: ScalarSource,                              // đáp: thường {kind:'expr', expr:'a+b'} trên tham số
})
```

### 3.2. `concreteOps` + `evalQuery` mở lên NHIỀU biến (mảnh MỚI chính)
Hiện `concreteOps(value)` và `evalQuery(value, src)` nhận MỘT giá trị cho MỘT tham số. Cần bản nhận
**env nhiều biến** `{a: .., b: ..}`:
- `concreteOpsEnv(env)`: thay tham số vào ops (điểm/coeffs/ratio.t/…) như `concreteOps` nhưng từ env đa biến.
  (Tái dùng `numify` + logic hiện có; chỉ đổi nguồn giá trị từ 1 biến → env.)
- `evalQueryEnv(env, src)`: dựng ops số tại env → `run(queries:[src])` → đọc số. (Như `evalQuery` hiện tại
  nhưng env đa biến; `optimize_multi` đã dựng env cho expr — nay mở cho cả truy vấn hình học.)

### 3.3. Nhánh `solve_multi` trong `runAnalysis`
1. Đọc N tham số + domains (như optimize_multi).
2. Dựng `objective(xs)`: đặt env từ xs → `resid_i = evalQueryEnv(env, c.of) − eval(c.equals, env)` cho mỗi
   ràng buộc → trả `Σ resid_i²`. (Nếu evalQueryEnv lỗi tại xs ⇒ trả +∞ để optimizer tránh.)
3. `best = optimizeMulti(objective, los, his, 'min')` (tái dùng: lưới + multi-start + hạ toạ độ).
4. **Kiểm residual:** tại `best.xs`, tính `maxResid = max_i |resid_i|`. Nếu `maxResid > RESID_TOL` (vd 1e-4)
   ⇒ **KHÔNG giải được** ⇒ trả `ok=false` (route rơi về). *Đây là hàng rào không-serve-sai.*
5. **Verify assert** tại `best.xs`: dựng hình số qua `run({ops: concreteOpsEnv(env), asserts})` → `violations`.
   Vi phạm/lỗi ⇒ `ok=false`.
6. **Report:** eval `report` tại env (expr trên tham số như "a+b", hoặc truy vấn) → `mkAnswer` (nhận-dạng-căn-đẹp,
   đơn vị — đã có).
7. **Geometry:** dựng hình tại nghiệm (`entityTableToGeometryData`/`buildAnalysisFigure` — đã có) để route vẽ hiện.

### 3.4. Prompt (translator)
Thêm ví dụ few-shot `solve_multi` (Câu 4: đường qua A, dir (a,b,1), cắt d1&d2 → constraints là "khoảng cách
điểm-đến-đường = 0" hoặc "điểm thuộc đường"; report "a+b"). Nhắc: đáp phải VÔ HƯỚNG; ràng buộc là truy vấn
hình học = giá trị.

## 4. Ngoài phạm vi (YAGNI)
- **Lớp so đáp trắc nghiệm A/B/C/D** và bài đáp là ĐIỂM/VECTƠ/PHƯƠNG TRÌNH (Câu 1/3) — hệ con riêng, không làm.
- Không đụng `run()`/core kernel; không refactor `solve`/`optimize` 1-biến hiện có.
- Không giải Newton/Jacobian (least-squares đủ).

## 5. Tiêu chí thành công
- Câu 2 (b+c), Câu 4 (a+b) + ≥1 bài Phần 4: **serve đúng đáp** (so đáp án PDF), mỗi câu **có assert kiểm**.
- Đo end-to-end (LLM thật) ≥2 lần, ổn định.
- Không hồi quy: toàn suite xanh; `solve`/`optimize`/`optimize_multi` 1-biến & đa-biến-expr cũ KHÔNG đổi.
- **Không serve-sai mới:** ca residual>ngưỡng hoặc assert vi phạm ⇒ rơi về (test riêng chứng minh).

## 6. Rủi ro & giảm thiểu
- **R1: Least-squares kẹt cực tiểu địa phương** ⇒ bỏ sót nghiệm ⇒ phủ thiếu. Giảm: multi-start nhiều restart
  (optimizeMulti đã có); domains hợp lý từ LLM. Chấp nhận "phủ thiếu nhưng không sai" (kiểm residual chặn serve-sai).
- **R2: LLM khai domains xấu** ⇒ miss nghiệm. Giảm: prompt hướng dẫn miền hợp lý; nếu miss ⇒ rơi về (an toàn).
- **R3: evalQueryEnv ném tại một số xs** (cấu hình suy biến) ⇒ objective +∞ tại đó, optimizer tránh; không crash.
- **R4: report expr tham chiếu tên tham số** ⇒ cần eval expr với env tham số (evalExpr đã hỗ trợ).
- **R5: Regression optimize_multi** (dùng chung evalQueryEnv/concreteOpsEnv) ⇒ giữ đường expr cũ nguyên, chỉ
  THÊM đường query; test optimize_multi cũ phải xanh.

## 7. Kiểm thử
- **Đơn vị (không LLM):** hand-plan `solve_multi` — hệ 2-ẩn-2-ràng-buộc có nghiệm đã biết → ok=true, đáp đúng,
  residual≈0. Ca vô nghiệm (ràng buộc mâu thuẫn) → ok=false. Ca assert vi phạm tại nghiệm → ok=false.
- **Tích phân:** concreteOpsEnv/evalQueryEnv trên env 2 biến cho kết quả đúng.
- **E2E (LLM thật):** Câu 2, Câu 4 (chép sạch từ ảnh PDF) → serve đúng, có assert; đo 2 lần.
- **Không hồi quy:** toàn suite + 10 benchmark cũ.

## 8. Ghi chú triển khai
- Nhánh `claude/solve-multi`; rebuild `kernel-dist` sau khi đổi `.ts`; **hỏi trước khi gộp main** (auto-deploy).
- Thứ tự: (a) concreteOpsEnv/evalQueryEnv + test đơn vị → (b) schema solve_multi + nhánh runAnalysis + test
  hand-plan → (c) residual/assert gate + test không-serve-sai → (d) report + geometry → (e) few-shot + đo e2e.
