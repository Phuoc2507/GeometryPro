# Advance Mode — Frontend (Plan B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Frontend cho mode "Advance": chọn Advance → gửi đề → nhận `AdvanceScene` từ `/api/analyze-advance` (Plan A, xong) → hiện **stepper** đa-câu; mỗi câu **bóc lớp** (ẩn/mờ-cũ/nổi-mới per-element) + đáp + badge kiểm-chứng. Bài `continuous_animation` → TimelinePlayer.

**Architecture:** State slice `advanceScene`+`currentStep` (không đụng path `geometry` cũ). Hàm thuần `projectScene(base, steps, cur)` sinh **hình dẫn xuất** (base + cờ hidden/dim/highlight per phần tử) — memo theo currentStep ⇒ bấm câu tức thì, KHÔNG SET_GEOMETRY. `GeometryRenderer` đọc cờ → opacity. `AdvanceStepper` overlay đổi `currentStep`.

**Tech Stack:** Vite+React+TS, Vitest (unit cho lib thuần), R3F/three. **KHÔNG Next.js** (dùng React Router). Verify UI qua dev-server :8080 + browser (repo chưa có React component test — theo tiền lệ kinematic).

**Spec:** `docs/superpowers/specs/2026-07-20-advance-frontend-design.md`. **Nhánh:** `claude/kinematic`. **HỎI trước khi gộp/deploy.**

---

## Bối cảnh cho người thực thi (đọc trước)

- `src/types/geometry.ts`: `GeometryData`, `Point3D` (đã có `hidden?`), `AnimationTimeline`, `GeometryState`, `GeometryAction`.
- `src/context/GeometryContext.tsx`: reducer (`SET_GEOMETRY` :178, `CLEAR_GEOMETRY`), `analyzeText`/`queueAnalyzeText` gọi POST `/api/analyze-geometry` qua `invokeLocalApiStream`; hard-code mode: `speedMultiplier=mode==='quick'?1:0.5` (:547), `modeLabels` (:621,:737).
- `src/components/3d/GeometryRenderer.tsx`: render `geometry.points/lines/planes/...`.
- `src/components/DrawModeSelector.tsx`: `DrawMode='quick'|'detailed'`, icon `Sparkles` chưa dùng.
- `src/components/layout/TimelinePlayer.tsx`: overlay render khi `state.videoMode`. `src/pages/TeacherMode.tsx`/`StudentMode.tsx` có `TimelineContainer`.
- Backend trả: `{mode:'advance', scene:{base:GeometryData, steps:[{id,label,visibleIds,answer?}]}}` HOẶC `{mode:'kernel', degraded:true, ...solveProblemResult}` (có `geometry` hoặc `abstained:true`).
- Chạy 1 test: `npx vitest run <path>`. Dev server: `npm run dev` (:8080).

---

## Task 1: Types — AdvanceScene/Step + cờ dim/highlight

**Files:** Modify `src/types/geometry.ts`

- [ ] **Step 1: Thêm cờ hiển thị** vào `Point3D` (đã có `hidden?`), `Line3D`, `Plane3D`:
```ts
  dim?: boolean;        // ∈ visibleIds nhưng thuộc câu trước → mờ
  highlight?: boolean;  // mới ở câu hiện tại → nổi
```

- [ ] **Step 2: Thêm type AdvanceScene/Step** (cuối types, cạnh AnimationTimeline):
```ts
export interface AdvanceStep {
  id: string;
  label: string;               // "Câu a"
  visibleIds: string[];
  highlightIds?: string[];
  answer?: { text?: string; approx?: number; verified: boolean };
  timeline?: AnimationTimeline;
}
export interface AdvanceScene {
  base: GeometryData;
  steps: AdvanceStep[];
}
```

- [ ] **Step 3: `GeometryState`** — thêm `advanceScene?: AdvanceScene | null;` và `currentStep: number;`. Trong khởi tạo state mặc định (tìm nơi tạo initial state trong GeometryContext) đặt `advanceScene: null, currentStep: 0`.

- [ ] **Step 4: `GeometryAction`** — thêm union:
```ts
  | { type: 'SET_ADVANCE_SCENE'; scene: import('@/types/geometry').AdvanceScene }
  | { type: 'SET_STEP'; index: number }
```

- [ ] **Step 5: tsc** — `npx tsc --noEmit` không lỗi mới (tsc KHÔNG phải build gate nhưng không được thêm lỗi type ở file này).

- [ ] **Step 6: Commit** — `feat(advance-fe): types AdvanceScene/Step + co dim/highlight`

---

## Task 2: `projectScene` (hình dẫn xuất) — TDD

**Files:** Create `src/lib/advanceProject.ts`; Test `src/lib/__tests__/advanceProject.test.ts`

- [ ] **Step 1: Test (đỏ)**:
```ts
import { describe, it, expect } from 'vitest';
import { projectScene } from '../advanceProject';

const base = {
  name: 'g',
  points: [{ id: 'A', label: 'A', x: 0, y: 0, z: 0 }, { id: 'B', label: 'B', x: 1, y: 0, z: 0 },
           { id: 'M', label: 'M', x: 0, y: 1, z: 0 }],
  lines: [], timeline: { duration: 5, tracks: [{ id: 't', start: 0, end: 5, type: 'parametric_path', params: {} }] },
  agents: [{ id: 'X', label: 'x', initialPosition: [0, 0, 0], color: '#f00' }],
} as any;
const steps = [
  { id: 'a', label: 'Câu a', visibleIds: ['A', 'B'] },
  { id: 'b', label: 'Câu b', visibleIds: ['A', 'B', 'M'] },
] as any;

it('câu 0: A,B hiện (mới=nổi); M ẩn', () => {
  const g = projectScene(base, steps, 0);
  const p = Object.fromEntries(g.points.map((x: any) => [x.id, x]));
  expect(p.A.hidden).toBeFalsy(); expect(p.A.highlight).toBe(true);   // câu đầu: tất cả là "mới"
  expect(p.M.hidden).toBe(true);
});
it('câu 1: A,B mờ (cũ); M nổi (mới)', () => {
  const g = projectScene(base, steps, 1);
  const p = Object.fromEntries(g.points.map((x: any) => [x.id, x]));
  expect(p.A.dim).toBe(true); expect(p.A.highlight).toBeFalsy();
  expect(p.M.highlight).toBe(true); expect(p.M.hidden).toBeFalsy();
});
it('GIỮ timeline + agents (bài lai câu-động)', () => {
  const g = projectScene(base, steps, 0);
  expect(g.timeline).toBeDefined();
  expect(g.agents).toHaveLength(1);
});
```

- [ ] **Step 2: Chạy (đỏ)** → FAIL.

- [ ] **Step 3: Implement** — `src/lib/advanceProject.ts`:
```ts
import type { AdvanceStep, GeometryData } from '@/types/geometry';

// Sinh hình dẫn xuất: base + cờ hidden/dim/highlight cho từng phần tử theo câu hiện tại.
// hidden = id ∉ visible; highlight = id ∈ (visible[cur] \ visible[cur-1]); dim = còn lại trong visible.
export function projectScene(base: GeometryData, steps: AdvanceStep[], cur: number): GeometryData {
  const c = Math.max(0, Math.min(cur, steps.length - 1));
  const visible = new Set(steps[c]?.visibleIds || []);
  const prev = new Set(c > 0 ? steps[c - 1]?.visibleIds || [] : []);
  const flag = <T extends { id: string }>(el: T) => {
    const shown = visible.has(el.id);
    return { ...el, hidden: !shown, dim: shown && prev.has(el.id), highlight: shown && !prev.has(el.id) };
  };
  return {
    ...base, // GIỮ timeline/agents/latexCode… nguyên (đừng cắt)
    points: (base.points || []).map(flag),
    lines: (base.lines || []).map(flag),
    planes: (base.planes || []).map(flag as any),
  };
}
```

- [ ] **Step 4: Chạy (xanh)** → PASS (3/3).

- [ ] **Step 5: Commit** — `feat(advance-fe): projectScene hinh dan xuat (an/mo/noi + giu timeline)`

---

## Task 3: State slice + reducer + `analyzeAdvance`

**Files:** Modify `src/context/GeometryContext.tsx`

- [ ] **Step 1: Reducer** — thêm case:
```ts
    case 'SET_ADVANCE_SCENE':
      return { ...state, advanceScene: action.scene, currentStep: 0,
               geometry: action.scene.base, undoStack: [], redoStack: [] };
    case 'SET_STEP':
      return { ...state, currentStep: Math.max(0, Math.min(action.index, (state.advanceScene?.steps.length ?? 1) - 1)) };
```
Và trong `SET_GEOMETRY` + `CLEAR_GEOMETRY`: thêm `advanceScene: null` vào object trả (rời chế độ advance khi vẽ bài khác).

- [ ] **Step 2: `analyzeAdvance`** — hàm mới (cạnh `analyzeText`), POST `/api/analyze-advance`:
```ts
  const analyzeAdvance = useCallback(async (prompt: string) => {
    dispatch({ type: 'START_SCANNING' });
    try {
      const { data, error } = await invokeLocalApi('/api/analyze-advance', { prompt });
      if (error) throw new Error(error);
      if (data?.mode === 'advance' && data.scene) {
        dispatch({ type: 'SET_ADVANCE_SCENE', scene: data.scene });
      } else if (data?.geometry) {
        dispatch({ type: 'SET_GEOMETRY', geometry: data.geometry });    // degraded/single → bài đơn
      } else {
        toast({ title: 'Chưa dựng được hình cho đề này', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Lỗi Advance', description: String((e as Error).message), variant: 'destructive' });
    } finally {
      dispatch({ type: 'STOP_SCANNING' });
    }
  }, []);
```
(Dùng `invokeLocalApi` — hàm gọi API non-stream đã có ở đầu file, dòng ~19. Nếu chỉ có bản stream, dùng nó + gom chunk cuối.)

- [ ] **Step 3: Expose** `analyzeAdvance` + (nếu cần) `setStep: (i:number)=>void` qua context value + interface (cạnh `analyzeText`).

- [ ] **Step 4: tsc** sạch (không lỗi mới).

- [ ] **Step 5: Commit** — `feat(advance-fe): state slice + reducer SET_ADVANCE_SCENE/SET_STEP + analyzeAdvance`

---

## Task 4: DrawMode 'advance' + dọn hard-code mode

**Files:** Modify `src/components/DrawModeSelector.tsx`, `src/context/GeometryContext.tsx`, nơi gọi analyze theo mode

- [ ] **Step 1: DrawMode** — `export type DrawMode = 'quick' | 'detailed' | 'advance';`. Thêm mục thứ 3 vào mảng `modes` (icon `Sparkles`, label 'Advance', time '~30s', desc 'đa-câu / động', credits 3).

- [ ] **Step 2: Dọn nhị-phân → map** trong GeometryContext.tsx:
  - `speedMultiplier`: `{ quick: 1, detailed: 0.5, advance: 0.4 }[mode] ?? 0.5`.
  - `modeLabels`: `{ quick: 'Nhanh', detailed: 'Kỹ', advance: 'Advance' }`.

- [ ] **Step 3: Định tuyến gửi đề** — nơi UI submit đề (component dùng DrawModeSelector, vd DropZone/RightPanel/Landing): khi `mode==='advance'` gọi `analyzeAdvance(prompt)` thay vì `analyzeText/queueAnalyzeText`. (Tìm chỗ gọi `analyzeText`/`queueAnalyzeText` theo mode.)

- [ ] **Step 4: tsc** sạch; app chạy (`npm run dev`) không lỗi console mode.

- [ ] **Step 5: Commit** — `feat(advance-fe): DrawMode advance + map hoa cac cho hard-code 2-mode`

---

## Task 5: GeometryRenderer đọc cờ + render hình dẫn xuất

**Files:** Modify `src/components/3d/GeometryRenderer.tsx` (+ có thể nơi cha chọn geometry)

- [ ] **Step 1: Chọn hình để render** — nơi lấy `geometry` để render, nếu có `state.advanceScene` thì dùng `projectScene(advanceScene.base, advanceScene.steps, currentStep)` (memo `useMemo` theo `[advanceScene, currentStep]`), else `state.geometry`.

- [ ] **Step 2: Áp cờ → opacity** — khi render từng điểm/đường/mặt, đọc `el.hidden`/`el.dim`/`el.highlight`:
  - `hidden` → không render (return null).
  - `dim` → opacity ~0.25 (điểm mờ, đường mảnh mờ).
  - `highlight` → opacity 1 + màu/viền nhấn.
  - không cờ → như thường.
  Theo pattern render hiện có (mỗi loại phần tử là một component con); truyền prop opacity/màu.

- [ ] **Step 3: Verify (browser)** — `npm run dev`; nạp một AdvanceScene thử (Task 7 chuẩn bị dữ liệu) → đổi currentStep bằng tay (tạm nút) → thấy ẩn/mờ/nổi đúng. (Kiểm mắt + DOM/JS như kinematic.)

- [ ] **Step 4: Không hồi quy** — bài thường (không advanceScene) render y như cũ.

- [ ] **Step 5: Commit** — `feat(advance-fe): GeometryRenderer doc hidden/dim/highlight + render hinh dan xuat`

---

## Task 6: AdvanceStepper + wire vào Teacher/Student

**Files:** Create `src/components/layout/AdvanceStepper.tsx`; Modify `src/pages/TeacherMode.tsx`, `StudentMode.tsx`

- [ ] **Step 1: Component** — `AdvanceStepper`: đọc `state.advanceScene`, `state.currentStep`; render khi `advanceScene && steps.length>1`. Overlay (giống TimelinePlayer, absolute bottom). Tab `Câu a │ b │ c` (map `steps[i].label`) + nút ◀ ▶ → `dispatch(SET_STEP)` (hoặc `setStep`). Hiện `steps[currentStep].answer?.text` + badge: `verified` → "✓ đã kiểm chứng" (xanh), else "⚠ chưa kiểm chứng" (vàng). Không có answer.text → ẩn phần đáp.

- [ ] **Step 2: Wire** — trong `TeacherMode`/`StudentMode`, render `<AdvanceStepper />` (cạnh `TimelinePlayer`). Bài continuous_animation (steps.length===1, base.timeline) → stepper không hiện; TimelinePlayer lo.

- [ ] **Step 3: Verify (browser)** — bấm tab/◀▶ → đổi câu tức thì (hình bóc lớp + đáp đổi), badge đúng.

- [ ] **Step 4: Commit** — `feat(advance-fe): AdvanceStepper (tab+prev/next+dap+badge) + wire Teacher/Student`

---

## Task 7: E2E browser + no-regression

**Files:** (script tạm inject scene)

- [ ] **Step 1: Lấy AdvanceScene thật** — chạy backend e2e (`scripts/e2e-advance.mjs` với ADVANCE_MODEL/KEY inline) HOẶC dựng một AdvanceScene mẫu (chóp S.ABCD 3 câu) → JSON. Inject vào app qua `window`/state tạm hoặc gọi `analyzeAdvance` thật (nếu có key).

- [ ] **Step 2: Verify end-to-end (browser :8080)** — chọn Advance (hoặc inject scene) → stepper hiện 3 câu; bấm qua từng câu: câu a hiện phần đầu (nổi), câu b thêm M (M nổi, phần cũ mờ), câu c…; đáp + badge đúng mỗi câu; **bấm câu tức thì, không giật** (không gọi lại API). 0 lỗi console.

- [ ] **Step 3: Không hồi quy** — `npx vitest run` xanh; Vẽ nhanh/Vẽ kỹ vẽ bài thường không đổi (không stepper).

- [ ] **Step 4: Commit** — `test(advance-fe): e2e browser stepper boc lop + no-regression`

---

## Kiểm cuối + gộp
- [ ] Toàn suite xanh; bài thường không đổi; app không lỗi console.
- [ ] Cập nhật memory (Advance frontend xong).
- [ ] **HỎI trước khi gộp main** (auto-deploy). Sau đó deploy CẢ backend (Plan A) + frontend một thể; verify prod: gửi đề đa-câu → stepper + đáp verified.

## Findings

**Thực thi 2026-07-20 (subagent-driven, 470 tests xanh, tsc sạch):**
- **T1+T2** types AdvanceScene/Step + cờ dim/highlight; `projectScene` (TDD 3/3, giữ timeline/agents) — commits 760b8b6, 1ed86f7. *(Mở `vitest.config.ts` include `src/**/*.test.ts` để test src chạy.)*
- **T3** reducer SET_ADVANCE_SCENE/SET_STEP + analyzeAdvance (3 nhánh) + expose — commit c30a5b0. *(invokeLocalApi trả error dạng object → dùng error.message.)*
- **T4** DrawMode 'advance' + nút 3 + map hoá 2-mode + định tuyến submit (DropZone→analyzeAdvance) — commit 4c63278.
- **T5** GeometryRenderer chọn projectScene khi advanceScene + đọc hidden/dim/highlight → opacity (Point/Line/Plane); nhánh thường byte-identical (không hồi quy) — commit bd29a6c. *(Chiếu lên geometry ĐÃ scale để giữ scaling.)*
- **T6** AdvanceStepper (tab + ◀▶ + đáp + badge, tự ẩn ≤1 câu) + wire Teacher/Student — commit 0d35a7b.

**T7 — E2E browser (dev :8081, scene THẬT gpt-5.6-sol chóp S.ABCD 3 câu, inject qua hook dev tạm rồi REVERT):**
- Stepper hiện **3 tab Câu a/b/c** + đáp câu hiện tại (**8/3**) + badge **"đã kiểm chứng"** ✅; canvas 3D render ✅.
- **Bấm "Câu b" → đáp đổi (không còn 8/3), re-render tức thì** (chuỗi stepper→SET_STEP→reducer→projectScene) ✅.
- **0 lỗi console.** Hook dev tạm (`window.__geoDispatch`) đã revert (git sạch, không commit).
- Bóc lớp ẩn/mờ/nổi = logic `projectScene` (unit-test 3/3) + currentStep đổi (đã chứng minh qua đáp đổi).
- ✅ **Frontend Advance hoạt động end-to-end.** Không hồi quy: bài thường (advanceScene=null) đi đường cũ, byte-identical.

**Ghi chú:** app KHÔNG gọi được `/api/analyze-advance` cục bộ (vite dev không chạy serverless) → verify qua inject scene thật. Luồng thật (chọn Advance → API) sẽ test khi deploy (backend+frontend một thể).
