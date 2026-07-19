# Module Kinematic (bài động) — Design Spec

**Ngày:** 2026-07-19
**Trạng thái:** Chờ duyệt spec
**Nhánh:** `claude/kinematic` (off main)

---

## 1. Mục tiêu

Cho engine **mô phỏng bài động**: vật chuyển động **thẳng** (from→to) theo thời gian. Engine TÍNH chính xác
đại lượng đề hỏi (khoảng cách nhỏ nhất tới một điểm, khi nào vào vùng, góc…) + **xuất animation** (agent +
quỹ đạo) để frontend animate vật bay/chạy. Giữ chống ảo giác: **vị trí + quỹ đạo do ENGINE tính** (không để
LLM bịa toạ độ/công thức). Bài mẫu: Câu 3 (Máy bay & Radar).

## 2. Ý tưởng cốt lõi (tái dùng gần hết)

- **Vật chuyển động** M(t) = from + t·(to−from) **chính là `oxyz_ratio{name:M, a:from, b:to, t}`** — op ĐÃ CÓ,
  đã thay-tham-số trong `concreteOps`. ⇒ compute (khoảng cách/góc/min-max theo t) **tái dùng trọn** `optimize`/
  `solve`/`eval` của analysis engine.
- **Phần MỚI duy nhất:** engine XUẤT `agents` + `timeline` (parametric_path) vào GeometryData — vật + quỹ đạo,
  hệ số do engine tính từ toạ độ from/to. Frontend (đã hỗ trợ agent + parametric_path — xem Câu 3 demo) animate.

Format đích (từ Câu 3 demo, frontend đã render):
```
agents: [{ id:"plane", label, initialPosition:[x,y,z], color, radius }]
timeline: { duration, tracks:[{ id, start, end, type:"parametric_path", targetId:"plane",
             params:{ path:"x(t)=…, y(t)=…, z(t)=…" } }] }
```

## 3. Kiến trúc & thành phần (tất cả ở lớp analysis, KHÔNG đụng run()/core)

### 3.1. Schema — thêm `mover` (tuỳ chọn) vào `AnalysisPlanSchema`
```ts
mover: z.object({
  point: z.string(),                 // tên điểm chuyển động (dùng trong queries), vd "M"
  from: z.string(), to: z.string(),  // 2 điểm mốc (đã khai trong ops), vd "D","E"
  agentId: z.string().optional(),    // id agent (mặc định = point)
  label: z.string().optional(),
  color: z.string().optional(),      // mặc định "#FFA500"
  radius: z.number().optional(),     // mặc định 0.1
  durationSec: z.number().optional(),// mặc định 10
}).optional(),
```
`analyze.parameter` (của optimize/solve) = tham số THỜI GIAN t (domain nên [0,1]).

### 3.2. Engine (`runAnalysis`) — khi có `mover`
1. **Tiêm điểm chuyển động:** thêm `oxyz_ratio{name: mover.point, a: mover.from, b: mover.to, t: analyze.parameter}`
   vào `plan.ops` (nếu chưa có) ⇒ M(t) là điểm tham số, queries tham chiếu được. (KHÔNG bắt LLM tự tính toạ độ M.)
2. **Compute:** chạy `optimize`/`solve`/`eval` theo t như thường (đã có) → đáp số + t* + hình tĩnh tại nghiệm.
3. **Xuất animation:** giải toạ độ from/to (từ entities), rồi gắn vào GeometryData:
   - `agents`: `[{ id: agentId||point, label, initialPosition: toạ-độ-from, color, radius }]`
   - `timeline`: `{ duration: durationSec, tracks:[{ id:"mv", start:0, end:durationSec, type:"parametric_path",
     targetId: agentId||point, params:{ path: "x(t)=Fx+(Tx−Fx)*t, y(t)=…, z(t)=…" } }] }`
     — **hệ số Fx, (Tx−Fx)… engine TỰ TÍNH** từ from/to. `path` dùng biến `t` chuẩn hoá 0→1 (khớp cách frontend đọc).
4. Trả GeometryData có đủ points/lines + **agents + timeline**.

### 3.3. Xuất geometry mang agents/timeline
`entityTableToGeometryData` / `buildAnalysisFigure` hiện KHÔNG xuất agents/timeline. Thêm một bước "gắn
animation" (nhận mover + entities → agents + timeline) rồi hợp vào GeometryData trả về. Chỉ khi có `mover`.

### 3.4. Prompt (translator)
Thêm few-shot kinematic (Câu 3): khai điểm cố định (O,C,B,D,E) bằng oxyz_point; `mover{point:"M",from:"D",to:"E",…}`;
`parameters:[{name:"t",domain:[0,1]}]`; `analyze` optimize min `distance(O,M)` (hoặc solve dist=range). Nhắc:
quỹ đạo là ĐƯỜNG THẲNG from→to; KHÔNG tự tính toạ độ M; đáp là SỐ (đại lượng đề hỏi).

## 4. Ngoài phạm vi (YAGNI)
- **Quỹ đạo cong** (parametric_path phi tuyến), **nhiều vật**, **va chạm/tương tác**, tăng-tốc/gia-tốc — follow-up.
- Không đụng `run()`/core kernel; không refactor optimize/solve.
- Không sinh animation cho bài KHÔNG có `mover` (giữ nguyên).

## 5. Tiêu chí thành công
- Câu 3 (Radar): engine tính đúng đại lượng (vd k/c radar–máy bay nhỏ nhất, hoặc thời điểm vào vùng) + xuất
  **agent máy bay + parametric_path D→E** → frontend animate. So đáp benchmark.
- Vị trí/quỹ đạo engine-computed (test: path formulas khớp from/to; M(0)=from, M(1)=to).
- Không hồi quy: toàn suite xanh; bài không-mover không đổi (không có agents/timeline thừa).
- Đáp verified (assert/optimize như thường); không serve-sai.

## 6. Rủi ro & giảm thiểu
- **R1: LLM không dùng `mover`** (tự bịa oxyz_point M với toạ độ tính tay) ⇒ ảo giác. Giảm: few-shot rõ + nhắc
  "KHÔNG tự tính toạ độ M, dùng mover". Nếu LLM bịa ⇒ vẫn chạy nhưng không có animation (hoặc sai) — chấp nhận,
  không tệ hơn hiện tại (rơi về LLM cinematic).
- **R2: format `path`/agent không khớp frontend** ⇒ animate hỏng. Giảm: bám **đúng** format Câu 3 demo (đã render
  được); kiểm bằng cách nạp geometry engine-sinh vào frontend (browser) khi thực thi.
- **R3: `oxyz_ratio` tiêm trùng tên** nếu LLM đã khai M. Giảm: chỉ tiêm nếu chưa có op nào tên = mover.point.
- **R4: entityTableToGeometryData bỏ agents/timeline** ở các consumer khác. Giảm: chỉ thêm khi có mover; test
  bài cũ (không mover) không đổi output.

## 7. Kiểm thử
- **Đơn vị:** plan có mover → GeometryData có `agents` (initialPosition=from) + `timeline.tracks[0].type=parametric_path`,
  `path` chứa hệ số đúng (M(0)=from, M(1)=to). Compute (min distance) đúng.
- **Không-mover:** plan cũ → KHÔNG có agents/timeline (không hồi quy).
- **E2E (LLM thật):** Câu 3 (chép sạch từ demo/ảnh) → LLM khai mover → engine serve đáp + agents + timeline; đo 2 lần.
- **Frontend (browser):** nạp geometry engine-sinh cho Câu 3 vào /teacher → xác nhận máy bay animate bay D→E.
- **Không hồi quy:** toàn suite + 10 benchmark.

## 8. Ghi chú triển khai
- Nhánh `claude/kinematic`; rebuild kernel-dist sau khi đổi .ts; **hỏi trước khi gộp main**.
- Thứ tự: (a) schema mover + tiêm oxyz_ratio + compute (test) → (b) xuất agents/timeline vào GeometryData (test
  format) → (c) few-shot + e2e → (d) kiểm animate trên browser.
