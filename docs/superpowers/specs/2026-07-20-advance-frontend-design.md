# Chế độ "Advance" — Frontend (Plan B) Design Spec

**Ngày:** 2026-07-20
**Trạng thái:** Chờ duyệt spec
**Nhánh:** off `main` (= claude/kinematic). HỎI trước khi gộp/deploy.

---

## 1. Mục tiêu & phạm vi

Frontend cho mode **Advance**: người dùng chọn "Advance" → gửi đề → nhận `AdvanceScene { base, steps[] }` từ
`/api/analyze-advance` (Plan A, đã xong) → hiển thị **bài đa-câu cùng hình** với **bộ chuyển câu (stepper)**,
mỗi câu **bóc lớp** (hiện phần mới, mờ phần cũ, nổi phần của câu này) + **đáp số** (badge đã-kiểm-chứng /
chưa-kiểm-chứng). Bài `continuous_animation` (1 step có timeline) → dùng `TimelinePlayer` sẵn có.

Phạm vi = frontend tiêu thụ `AdvanceScene`. Backend đã xong (Plan A). **Lưu trữ/chia-sẻ URL cho AdvanceScene =
HOÃN** (v1 render trong phiên).

## 2. Bối cảnh code (đọc trước)

- **Luồng vẽ hiện tại** (`src/context/GeometryContext.tsx`): `analyzeText(prompt, mode)` → POST
  `/api/analyze-geometry {prompt, mode}` (qua `invokeLocalApiStream`) → `data.geometry` → `SET_GEOMETRY`. State
  giữ **một** `GeometryData`. Hard-code 2 mode: `speedMultiplier = mode==='quick'?1:0.5` (GeometryContext.tsx:547),
  `modeLabels = {quick, detailed}` (:621, :737).
- **Render**: `src/components/3d/GeometryRenderer.tsx` render `geometry.points/lines/planes/...`. `Point3D` đã có
  `hidden?` (`src/types/geometry.ts:8`).
- **Mode UI**: `src/components/DrawModeSelector.tsx` (`DrawMode = 'quick'|'detailed'`, icon `Sparkles` bỏ không).
- **Overlay control**: `TimelinePlayer` (`src/components/layout/TimelinePlayer.tsx`) render khi `state.videoMode`;
  `AnimationContext` 1 `globalTimeRef`.
- **Load geometry**: `TeacherMode`/`StudentMode` load từ `?id` (history `geo3d_anonymous_history`) → `loadGeometry`.

## 3. State (đã chốt: slice riêng + hình dẫn xuất)

Thêm vào `GeometryState`:
```ts
advanceScene?: AdvanceScene | null;   // null khi không phải bài advance
currentStep: number;                  // chỉ số câu đang xem (mặc định 0)
```
Type mới (`src/types/geometry.ts`): `AdvanceScene { base: GeometryData; steps: Step[] }`,
`Step { id, label, visibleIds: string[], highlightIds?: string[], answer?: {text?, approx?, verified: boolean}, timeline?: AnimationTimeline }`.

Reducer (`GeometryAction`) thêm:
- `SET_ADVANCE_SCENE { scene }` → `advanceScene = scene; currentStep = 0` (+ clear undo/redo như SET_GEOMETRY).
- `SET_STEP { index }` → `currentStep = clamp(index, 0, steps.length-1)`.
- `SET_GEOMETRY` và `CLEAR_GEOMETRY` → set `advanceScene = null` (rời chế độ advance).

## 4. Hình dẫn xuất + render (đã chốt: đầy đủ hiện/mờ/nổi)

**`projectScene(base, steps, currentStep): GeometryData`** (`src/lib/advanceProject.ts`, thuần, memo theo
`currentStep`): trả một `GeometryData` = `base` với mỗi phần tử (điểm/đường/mặt…) gắn cờ theo câu hiện tại:
- **ẩn**: id ∉ `visibleIds[cur]` → `hidden = true`.
- **nổi** (mới ở câu này): id ∈ `visibleIds[cur] \ visibleIds[cur-1]` → `highlight = true`.
- **mờ** (cũ): id ∈ `visibleIds[cur] ∩ visibleIds[cur-1]` → `dim = true`.
- **Giữ nguyên** `base.timeline` / `base.agents` (đừng cắt — bài lai câu-động cần; nhớ bài học normalize).

Kiểu: thêm optional `dim?: boolean`, `highlight?: boolean` vào `Point3D` (đã có `hidden?`) và các phần tử
đường/mặt cần bóc lớp (`Line3D`, `Plane3D`). `GeometryRenderer` đọc các cờ này → set **opacity** (ẩn = không
render; mờ = opacity thấp ~0.25; nổi = opacity đầy + màu nhấn) cho từng phần tử.

**Chọn hình để render**: nơi render (GeometryRenderer hoặc cha) dùng
`const shown = advanceScene ? projectScene(advanceScene.base, advanceScene.steps, currentStep) : geometry;`
→ đổi `currentStep` chỉ re-tính `projectScene` (memo) → **tức thì, KHÔNG SET_GEOMETRY** (không replay build).

## 5. Gọi API + xử lý trả về + dọn mode

- `DrawMode = 'quick'|'detailed'|'advance'`; `DrawModeSelector` thêm nút thứ 3 (icon `Sparkles`, nhãn "Advance",
  credit 3). Sửa `speedMultiplier` + `modeLabels` sang **map** `{ quick, detailed, advance }` (advance dùng
  giá trị hợp lý, vd 0.4).
- **`analyzeAdvance(prompt)`** (GeometryContext): POST `/api/analyze-advance {prompt}` → theo `data.mode`:
  - `'advance'` → `dispatch(SET_ADVANCE_SCENE, { scene: data.scene })`.
  - `'kernel'` (degraded/single/abstain) → như bài đơn: `SET_GEOMETRY` với `data.geometry` (nếu có), hoặc toast
    "chưa dựng được" nếu `abstained`. KHÔNG stepper.
- Khi `mode === 'advance'` được chọn ở UI, luồng gửi đề gọi `analyzeAdvance` thay vì `analyzeText`.

## 6. Stepper UI + đáp số

**`AdvanceStepper`** (`src/components/layout/AdvanceStepper.tsx`) — overlay giống `TimelinePlayer`, render khi
`state.advanceScene && steps.length > 1`:
- Tab `Câu a │ b │ c` (nhảy) **+** nút ◀ ▶ (tuần tự) → `dispatch(SET_STEP)`.
- Hiện **đáp câu hiện tại**: `steps[currentStep].answer.text` + badge **✓ đã kiểm chứng** (verified) hoặc
  **⚠ chưa kiểm chứng** (verified=false). Câu không có `answer.text` → chỉ hiện hình.
- Rendered trong `TeacherMode`/`StudentMode` cạnh `TimelinePlayer`.

Bài `continuous_animation` (scene 1 step, `base.timeline`) → **không** stepper; `projectScene` cho hình đầy đủ
mang timeline → `TimelinePlayer` sẵn có chạy (như kinematic).

## 7. Lưu trữ (HOÃN cho v1)

v1: `analyzeAdvance` set `advanceScene` **trong phiên**, render ngay; **không** lưu history / không chia sẻ URL.
Lưu + `?id` reload + share cho `AdvanceScene` (shape mới, khác `geometry_data`) = **follow-up**.

## 8. Ngoài phạm vi (YAGNI)
- Lưu trữ/chia-sẻ AdvanceScene (§7).
- Animation "vẽ dần" khi bóc lớp (v1 đổi trạng thái tức thì; stagger reveal = polish sau).
- I2/I3/I4 backend (đã ghi ở plan backend).

## 9. Tiêu chí thành công
- Chọn Advance + gửi đề đa-câu → hiện stepper, bấm câu **tức thì, mượt** (không giật/không gọi lại API), mỗi câu:
  hiện phần mới (nổi) + giữ phần cũ (mờ) + ẩn phần chưa tới, kèm đáp + badge kiểm-chứng.
- Bài degraded/single → rơi về hiển thị bài đơn bình thường (không stepper), không lỗi.
- Bài continuous_animation → animate qua TimelinePlayer.
- Không hồi quy: Vẽ nhanh/Vẽ kỹ không đổi.

## 10. Rủi ro & giảm thiểu
- **`projectScene` bỏ sót timeline/agents** → bài lai mất animation. Giảm: test projectScene giữ nguyên các field đó.
- **Renderer chưa hỗ trợ opacity/màu per-element** → phải thêm; giảm rủi ro bằng cách chỉ thêm đọc cờ
  `hidden/dim/highlight`, không đổi hình học.
- **'advance' âm thầm kế thừa hành vi 'detailed'/rơi 0.5** → map tường minh mọi chỗ nhị-phân.
- **Chuyển câu qua SET_STEP re-render nặng** nếu base lớn → `projectScene` memo hoá + chỉ đổi cờ (không dựng lại
  hình học), re-render R3F rẻ.
