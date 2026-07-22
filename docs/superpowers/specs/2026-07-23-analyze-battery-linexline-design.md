# Battery nhánh analyze + vá giao đường×đường (Tiểu-dự án A) — Thiết kế

**Ngày:** 2026-07-23
**Thuộc chương trình:** 3-mức an toàn + trải nghiệm giáo viên (E → A → B → D → C). A củng cố lõi engine trước khi dựng lớp phân loại/UX phía trên: bịt khoảng trống test của nhánh `analyze` (chống hồi quy) và vá năng lực còn thiếu (giao đường×đường).

## Mục tiêu

1. **Battery regression cho nhánh `analyze`** — bộ Vitest xác định (không gọi model) phủ đúng các khoảng trống đã khảo sát và **pin hành vi chống-ảo-giác** (các nhánh `fail()`/`violations` + thông điệp lỗi).
2. **Vá giao đường×đường** trong kernel chính xác (exact rational), mở khoá cho translator, test đủ ca suy biến (cắt/song song/trùng/chéo).

**Ràng buộc:**
- Không đổi hợp đồng `/api/solve`; không đụng dialect numeric Phase-1 cũ.
- Battery chỉ dùng Vitest xác định (chốt: regression-only, không corpus chấm điểm E2E).
- Phải qua build gate + `npm test` xanh trước khi push (push = auto-deploy Vercel).
- **Đổi `translatorPrompt.js` ⇒ chạy lại cổng 50-ca translator (live) trước khi deploy phần prompt** (kỷ luật [translator-model-bakeoff]).

## Hiện trạng (đã khảo sát)

**Hai engine trong kernel:**
- Engine hình học chính xác: `run()` (điểm/đường/mặt, `Vec3S` số hữu tỉ chính xác).
- Engine numeric "analyze": `runAnalysis()` cho giải tích/tối ưu.
- Router `runAny(raw)` (`analysis/runAnalysis.ts:436`): `if ('analyze' in raw) return runAnalysis(raw); else return run(raw)`. Cùng discriminator lặp lại ở biên translator (`kernel-bridge/solveWithKernel.js:41`).

**6 kind của analyze** (union `AnalyzeSchema`, `runAnalysis.ts:33-49`): `optimize`, `solve`, `integrate`, `eval`, `optimize_multi`, `solve_multi`.
- `AnalysisResult` (`runAnalysis.ts:87-94`): `{ ok, parameter:{name,value}, answer:{approx,text,approximate}, violations[], errors[], geometry? }`.
- `optimize_multi` (L296-320): objective **chỉ nhận** `kind:'expr'` (L299).
- `solve_multi` (L324-368): cho query hình học; **gate** `maxResid > 1e-4 → fail` (L347-352).
- `mover` injection L130-136; `answerScale`/`answerUnit` L164-171; `concreteOpsEnv` L231-252 (hạ FunctionOps `curve_point`/`tangent_line`/`curve_extremum` xuống geometry ops).

**Khoảng trống test đã xác định** (các mặt hiện **0 test** hoặc thiếu):
- `runAny` router (analyze vs geometry) — 0 test.
- `answerScale`/`answerUnit` (đổi đơn vị + hậu tố text) — 0 test.
- Phần lớn nhánh `fail()`/chống-ảo-giác (assert sai, parameter chưa khai báo, objective non-expr, residual quá ngưỡng).
- `optimize_multi`/`solve_multi` với **≥3 biến / ≥3 ràng buộc**.
- `solve_multi` gate residual/timeout.
- `mover` **+ solve** (mover hiện chỉ test với optimize).
- `fitPoly` bậc **1** và **≥4** (hiện chỉ bậc 2–3).
- `tangent_line` hạ xuống geometry (lowering) ở dạng cô lập.

**Khoảng trống line×line (giao đường×đường):**
- `compute/intersect.ts computeIntersection` switch trên `${a.kind}-${b.kind}` (L85-99): có line-plane, plane-plane, sphere-plane, line-sphere; **KHÔNG có line-line** → default (L97) trả `{ok:false, problem:'intersection not supported for line-line'}`.
- `dialects/oxyz.ts` `oxyz_intersect` (L248-255) ném `r.problem` (L250) khi không hỗ trợ.
- Union kết quả `IntersectionAnswer.result` **đã có sẵn** `'point'|'none'|'coincident'|'parallel'` (L8-16) → **không cần đổi type**, chỉ thêm hàm compute + case switch.
- `iPlanePlane` (L32-45) là mẫu để mô phỏng: trả cấu trúc `'coincident'`/`'parallel'` rõ ràng bằng số hữu tỉ chính xác.
- Translator **đang cấm** line×line: `translatorPrompt.js` dòng 37, 94, 125-126, 336-337 ("đường×đường không hỗ trợ ⇒ KHÔNG dùng oxyz_intersect"). Dòng 239 ("đồng quy 3 đường: dựng giao 2 đường rồi assert ∈ đường thứ 3") hiện **bất khả thi** vì thiếu chính năng lực này.
- `resolveEntityE` (`resolveE.ts:40-42`) đã dựng LineE từ token hai điểm 'AB' → translator **có thể** phát ra hai đường.

**Quy ước test hiện có:**
- Test analyze ở `api/_lib/kernel/analysis/__tests__/*.test.ts` (23 file), plan object inline, `toBeCloseTo(value, digits)`; số chính xác dùng `makeExact(num,den,radicand) + toEqual`; mô tả `it()` tiếng Việt; **không** golden/JSON corpus, **không** `it.each`.
- Test line×line thuộc `api/_lib/kernel/compute/__tests__/*.test.ts`.
- Template: `cau1-contract.test.ts`, `runAnalysis-multiopt.test.ts`, `intersect.test.ts`.
- Constructor cho compute test: `lineFromPointDir(pt,dir)`, `planeFromCoeffs(a,b,c,d)`; scalar `rat(bigint)`/`makeExact`; vector `ratVec(bigint,bigint,bigint)`/`toApproxVec`.
- Câu 5 = 7.49 pin bởi `cau5-contract.test.ts`.
- Vitest 4.1.10, env `node`, không setupFiles, import tường minh `{describe,it,expect}`; glob include phủ `api/_lib/kernel/**/*.test.ts`.

## Kiến trúc — ba đơn vị

### Đơn vị 1 — Vá line×line trong kernel chính xác

**File:** sửa `api/_lib/kernel/compute/intersect.ts`.

- Thêm hàm `iLineLine(a, b): IntersectionAnswer` — `a`, `b` là hai line entity mà switch truyền vào (cùng dạng `iLinePlane` nhận: có `.p` điểm và `.dir` vector) — bằng số hữu tỉ chính xác (tái dùng `cross`, `dot`, `sub`, `isZeroS`, và phép nhân/chia Scalar của `Vec3S` — **không** dùng float):
  1. `cross = d1 × d2`.
  2. Nếu `cross` = vector 0 (cả ba thành phần `isZeroS`) → hai đường **song song hoặc trùng**:
     - xét `(p2 − p1) × d1`: nếu = 0 → `{ ok:true, result:'coincident' }`; ngược lại → `{ ok:true, result:'parallel' }`.
  3. Ngược lại (`cross ≠ 0`) → xét **đồng phẳng** qua tích hỗn tạp `(p2 − p1) · cross`:
     - nếu ≠ 0 → **chéo nhau** → `{ ok:true, result:'none' }` (trong không gian 3D; ở mặt phẳng z=0 trường hợp này không xảy ra vì cross ⟂ mặt phẳng và `(p2−p1)·cross` luôn = 0).
     - nếu = 0 → **cắt nhau tại một điểm**: `t = ((p2 − p1) × d2) · cross / (cross · cross)`; điểm giao `P = p1 + t·d1`; trả `{ ok:true, result:'point', point:P }`.
- Thêm case `'line-line'` vào switch `computeIntersection` (L85-99), gọi `iLineLine`.
- **Không** đổi kiểu `IntersectionAnswer` (union đã đủ).

**Ghi chú độ chặt:** dùng phép thử "bằng 0" **chính xác** (`isZeroS`), không dung sai — phù hợp bản chất exact rational của kernel; đồng phẳng/song song/trùng đều là mệnh đề đại số hữu tỉ chính xác.

### Đơn vị 2 — Nối `oxyz_intersect` (và query intersection) suy biến an toàn

**File:** sửa `api/_lib/kernel/dialects/oxyz.ts` (handler L248-255).

- `oxyz_intersect` yêu cầu kết quả là **một điểm**. Sau khi Đơn vị 1 khiến `computeIntersection` "toàn phần" cho line-line:
  - `result:'point'` → dựng điểm như hiện tại.
  - `result:'parallel'` → ném lỗi tiếng Việt: *"Hai đường song song — không có giao điểm."*
  - `result:'coincident'` → ném lỗi: *"Hai đường trùng nhau — có vô số giao điểm, không xác định được một điểm."*
  - `result:'none'` (chéo) → ném lỗi: *"Hai đường chéo nhau — không cắt nhau."*
- Đây là hành vi **chống-ảo-giác**: engine **không bịa** điểm giao khi không tồn tại/không duy nhất; thông điệp nêu đúng lý do.
- Query `intersection` (`compute/query.ts` L23/L80) **tự hưởng lợi** vì cùng gọi `computeIntersection`; với line×line nó trả structured `result` (point/parallel/coincident/none) cho tầng answer diễn giải. Không cần sửa thêm, chỉ thêm test xác nhận.

### Đơn vị 3 — Mở khoá translator cho line×line

**File:** sửa `api/_lib/kernel-bridge/translatorPrompt.js`.

- Bỏ/đảo các câu cấm "đường×đường không hỗ trợ" (dòng 37, 94, 125-126, 336-337).
- Sửa mô tả `oxyz_intersect`: *"giao đường×mặt **hoặc** đường×đường → 1 điểm; nếu song song/trùng/chéo, engine sẽ báo lỗi và bài bị từ chối (không bịa điểm)."*
- Giữ nguyên **mặt×mặt** vẫn là `query` (ra một đường, không phải điểm).
- Bảo đảm mẫu **đồng quy 3 đường** (dòng 239) giờ chạy thật; thêm một ví dụ ngắn "giao hai đường AB và CD → điểm I".
- ⚠️ **Cổng bắt buộc:** vì đây là thay đổi prompt, phải chạy lại **cổng 50-ca translator** (live, dùng `VILAO_API_KEY` cho gemini) và đạt như baseline (gate 15/15, không có đáp án sai) **trước khi push** phần prompt.

## Battery regression (thuộc Đơn vị 1–3, gom theo chủ đề)

File Vitest mới, tự nhận qua glob; `it()` inline tiếng Việt; `toBeCloseTo`/`makeExact` theo convention. Đề xuất tách theo chủ đề để mỗi file một trách nhiệm:

- `analysis/__tests__/analyze-router.test.ts` — `runAny` phân luồng: input có `analyze` → `runAnalysis`; input hình học (`entities`) → `run`.
- `analysis/__tests__/analyze-answer-scale.test.ts` — `answerScale`/`answerUnit`: giá trị nhân thang đúng + `answer.text` mang hậu tố đơn vị.
- `analysis/__tests__/analyze-guards.test.ts` — các nhánh chống-ảo-giác: assert sai → `ok:false` + `violations`; parameter chưa khai báo; `optimize_multi` objective non-expr; `solve_multi` residual vượt `1e-4`. **Pin cả thông điệp lỗi.**
- `analysis/__tests__/analyze-multivar.test.ts` — `optimize_multi`/`solve_multi` ≥3 biến/≥3 ràng buộc hội tụ; gate residual/timeout của `solve_multi`.
- `analysis/__tests__/analyze-mover-solve.test.ts` — `mover` + `solve` (bổ sung mặt còn thiếu so với mover+optimize).
- `analysis/__tests__/analyze-polyfit-degrees.test.ts` — `fitPoly` bậc 1 và ≥4 (khớp `#through + #slopeAt == #unknowns`); một ca `tangent_line` lowering cô lập.
- `compute/__tests__/intersect-line-line.test.ts` — 5 ca hình học: 2D cắt · 3D cắt đồng phẳng · song song · trùng · chéo→none; **+** `oxyz_intersect` ném lỗi đúng thông điệp khi song song/trùng/chéo; **+** query `intersection` line×line trả structured result.

**Chính sách dung sai:** theo convention hiện có (chọn `digits` per-assertion cho numeric; `makeExact + toEqual` cho exact). **Không** thêm hằng tolerance chung (YAGNI).

## Luồng dữ liệu

- **line×line:** translator phát `oxyz_intersect{a,b}` → `resolveEntityE` dựng 2 `LineE` → `computeIntersection('line-line')` → `iLineLine` (exact) → point ⇒ dựng điểm; else ⇒ lỗi tiếng Việt (bài bị từ chối, không bịa).
- **battery:** thuần Vitest gọi trực tiếp `run`/`runAnalysis`/`runAny`/`computeIntersection` với plan object inline; không mạng, không model.

## Xử lý lỗi & suy biến

- Song song / trùng / chéo ở `oxyz_intersect` → ném lỗi tiếng Việt rõ (đã liệt kê ở Đơn vị 2); không tạo điểm.
- `computeIntersection` cho line-line luôn `ok:true` với `result` phân loại (point/parallel/coincident/none); tầng gọi quyết định coi loại nào là lỗi.
- Các gate analyze giữ nguyên (residual `>1e-4` → fail; assert sai → `violations`).

## Kiểm thử & cổng

- `npm test` (Vitest) xanh — battery mới nằm ở đây.
- `npm run build` exit 0.
- **Trình tự deploy tách 2 nhịp:**
  1. **Nhịp 1 (deploy được ngay):** Đơn vị 1 + 2 + battery. An toàn: thêm năng lực + test; translator chưa được bảo dùng nên **không đổi hành vi bài cũ**. Qua build gate → push → deploy.
  2. **Nhịp 2:** Đơn vị 3 (prompt). Chạy lại cổng 50-ca translator (live) → đạt baseline mới push phần prompt → deploy.
- `tsc` **không** phải cổng build của repo (chỉ tham khảo).

## Ngoài phạm vi (YAGNI)

- Không đụng đường numeric Phase-1 (`ops/points.ts intersectLineLine`) — dialect cũ, translator không dùng; giữ nguyên.
- Không dựng corpus chấm điểm E2E (đã chốt regression-only).
- Không thêm hạ tầng tolerance chung.
- Không mở `optimize_multi` nhận objective geometry-query (giữ asymmetry hiện tại giữa optimize_multi và solve_multi).
- Không đổi kiểu `IntersectionAnswer` (union đã đủ).

## Rủi ro & lưu ý

- **Rủi ro chính:** đổi `translatorPrompt.js` có thể ảnh hưởng phân loại các bài khác → **bắt buộc** cổng 50-ca translator; vì vậy tách Nhịp 2 khỏi Nhịp 1.
- Cổng 50-ca là **live-model run** (cần `VILAO_API_KEY` trong `.env.local`); phi tất định — so với baseline (gate 15/15, 0 đáp án sai) chứ không đòi trùng khít.
- Exact intersection: chia `/(cross·cross)` phải là phép hữu tỉ chính xác — dùng đúng Scalar ops (`isZeroS`, `cross`, `dot`, `div`); `cross·cross ≠ 0` được bảo đảm ở nhánh point (vì đã loại `cross=0`).
- Mặt phẳng z=0 (bài Oxy): nhánh "chéo" không thể xảy ra — test 2D chỉ cần cắt/song song/trùng; test "chéo→none" đặt ở 3D.
