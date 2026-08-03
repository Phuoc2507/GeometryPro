# Tầng 2 — Khối lăng trụ (prism) cho engine: thiết kế

**Ngày:** 2026-08-03
**Bối cảnh:** Đây là đòn bẩy cải tiến ĐẦU TIÊN của Tầng 2, chọn từ bằng chứng do cổng phanh (bench:gate) và bước soi-mắt golden phát hiện.

## Vấn đề (2 bằng chứng đã ghi ở `bench/golden/README.md`)
Engine trả SAI thể tích cả họ khối-hộp:
- "lập phương cạnh 3" → `9, 9, 9` (LLM xẻ khối thành 3 chóp) thay vì `27`.
- "hình hộp chữ nhật 2×3×4" → `8` thay vì `24`.

**Gốc rễ (chẩn xong):** đây KHÔNG phải lỗi tính toán — toán tứ diện/chóp trong `compute/volume.ts` vẫn đúng. Đây là **THIẾU NĂNG LỰC**: dialect oxyz (đường sống của app) không có route thể tích tất định cho khối lăng trụ / hình hộp. Chỉ có `sphere`, `tetrahedron`, `pyramid`. Không có primitive nào khớp "khối hộp" nên translator phải chế cháo (chóp sai → 8; hoặc xẻ-3-chóp → 9,9,9) hoặc bó tay.

## Hướng đã duyệt: A — Thêm khối lăng trụ vào engine
Thêm primitive **`solid:'prism'`** (đáy `base[]` + nắp `top[]`) vào volume query của dialect oxyz. Tính thể tích **CHÍNH XÁC** bằng xẻ tứ diện, tái dùng số học Scalar exact sẵn có. Phủ: lập phương, hình hộp chữ nhật, hộp xiên (oblique), và lăng trụ đáy đa giác bất kỳ.

### Vì sao A (không phải B "chỉ sửa prompt" hay C "chỉ khối hộp")
Biến một lỗ hổng thành **năng lực tất định** mà cổng phanh (rổ 16 bài) canh giữ miễn phí — đúng tinh thần Tầng 1. B để engine "đoán" (không tất định, dễ tái phát). C hẹp, bỏ lỡ lăng trụ tam giác/lục giác vốn cùng một phép toán.

## Toán học (đã kiểm tay)
Lăng trụ = đáy đa giác `b0..b_{n-1}` + nắp `t0..t_{n-1}` với `t_i = b_i + v` (v = vector tịnh tiến CHUNG).
1. Xẻ đáy thành **quạt tam giác**: `(b0, b_i, b_{i+1})` cho `i = 1..n-2`.
2. Mỗi tam giác đáy + tam giác nắp tương ứng = **lăng trụ tam giác** = **3 tứ diện**:
   - `(b0, b_i, b_{i+1}, t0)`
   - `(b_i, b_{i+1}, t0, t_i)`
   - `(b_{i+1}, t0, t_i, t_{i+1})`
3. Thể tích = `|Σ tất cả tích-hỗn-tạp-có-dấu| / 6`. Lấy `abs` của TỔNG (không phải tổng của abs) để bền hướng — y hệt `pyramidVolumeScalar`.

Đã kiểm với lăng trụ tam giác vuông (a=(0,0,0),b=(1,0,0),c=(0,1,0), nắp z=h): tổng 3 tứ diện = `h/2` = diện-tích-đáy × cao ✓. Lập phương đơn vị (2 lăng trụ tam giác) = `1` ✓.

## Bất biến an toàn (KHÔNG đoán số sai)
Trả `ok:false` (bó tay, KHÔNG bịa số) khi:
- `base.length < 3` hoặc `top.length !== base.length`.
- Đáy KHÔNG phẳng, hoặc nắp KHÔNG phẳng (`coplanarityProblem`).
- **Nắp KHÔNG phải đáy tịnh tiến** (`t_i - b_i` không bằng nhau mọi i) ⇒ không phải lăng trụ (vd chóp cụt) ⇒ từ chối. Dùng `isZeroS` trên hiệu vector (exact khi có).

## Phạm vi thay đổi
1. `api/_lib/kernel/compute/volume.ts` — thêm `prismVolumeScalar`, `fPrism`, `computePrismVolume`, helper `sameVec`/`translationMismatch`.
2. `api/_lib/kernel/compute/query.ts` — thêm biến thể schema `{kind:'volume', solid:'prism', base, top}`; route trong case `'volume'` TRƯỚC nhánh `asPoints(query.points)`.
3. `api/_lib/kernel/compute/__tests__/volume.test.ts` — test đơn vị (lập phương 27, hộp 2×3×4 = 24, lăng trụ tam giác, từ chối chóp-cụt, từ chối lệch-số-đỉnh).
4. `api/_lib/kernel-bridge/translatorPrompt.js` — thêm dòng ví dụ prism ở mục QUERIES + 1 ví dụ có lời giải để LLM biết phát ra.
5. `bench/golden/*` + `bench/seed-problems.json` — gặt golden lập phương/hộp/lăng trụ qua `bench:capture` (sau khi build:kernel để engine + prompt cùng sống), `bench:gate` xanh.

## Bắt buộc sau khi xong (đụng kernel)
`npm run build:kernel` + commit `api/_lib/kernel-dist/index.mjs`. Không bump `ENGINE_FIGURE_VERSION` (không đổi cấu trúc HÌNH, chỉ thêm route số học).

## Ngoài phạm vi (YAGNI)
- KHÔNG thêm prism vào `volume_ratio`/`SolidSpec` (chưa có nhu cầu).
- KHÔNG đụng dialect analyze (route tích phân cho lăng trụ vẫn chạy song song, không xoá).
- KHÔNG sửa renderer/hình.
