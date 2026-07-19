# Surface Câu 4/8/5 — hoàn tất #4 (đáp giải tích còn lại nổi lên) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps `- [ ]`.

**Bối cảnh:** Câu 1/9/10 (solve/optimize có op hình học) đã nổi lên trong route vẽ. Nhưng **Câu 4c (integrate),
Câu 8 (eval/solid_volume), Câu 5 (optimize_multi)** trả `geometry: null` → route đòi `points>0` nên vẫn rơi
về luồng cũ. Đây là plan sinh HÌNH cho 3 nhánh đó để chúng nổi lên.

**⚠️ RÀNG BUỘC:** Làm trên nhánh `claude/engine-improvements` (worktree F:/geo3dnew/geo3d/.claude/worktrees/integration-engine).
**KHÔNG push `main`** (main auto-deploy prod). Giữ ≥411 test xanh. KHÔNG sửa `run()`/Scalar lõi.

**Thiết kế:** một module thuần `analysisFigure.ts` dựng `GeometryData` từ hàm (→ curve + điểm mẫu),
khối (→ khung dây), và op điểm — để 3 nhánh analysis gọi. GeometryData đã hỗ trợ `curves`
(type parabola/cubic/rational) như benchmarkDemos.

---

## Task 1: `analysisFigure.ts` — dựng hình cho bài giải tích thuần

**Files:** Create `api/_lib/kernel/analysis/analysisFigure.ts` · Test `api/_lib/kernel/analysis/__tests__/analysisFigure.test.ts`

**Hợp đồng:**
```ts
export type FigureInput = {
  polys: Record<string, number[]>;   // tên hàm → hệ số [c0..cn]
  polyDomains: Record<string, [number, number]>; // miền x để vẽ (suy từ through)
  points: { id: string; x: number; y: number; z: number }[]; // điểm tường minh (đã số hoá)
  solids: Record<string, import('./solids').Solid>;
};
export function buildAnalysisFigure(name: string, inp: FigureInput): GeometryData;
```
Sinh:
- Mỗi poly → một `curve` (bậc 2 → `parabola {a,b,c}`, bậc 3 → `cubic {a,b,c,d}`, khác → `poly {coeffs}`)
  kèm `xMin,xMax`; VÀ ~24 điểm mẫu dọc curve (để qua được gate `points>0` + fallback vẽ).
- Mỗi solid → khung dây: đường tròn đáy trên + đáy dưới (mỗi vòng 16 điểm nối thành lines) + vài đường sinh.
  cylinder: 2 vòng bán kính `radius` ở `from`/`to`. cone: vòng đáy bán kính `baseRadius` ở `baseZ` + 1 điểm đỉnh ở `apexZ`.
- Các điểm tường minh `points` thêm vào.
- Trả `{ name, points, lines, curves, spheres: [], planes: [] }`.

- [ ] **Step 1: Test đỏ** (`analysisFigure.test.ts`):
```ts
import { describe, it, expect } from 'vitest';
import { buildAnalysisFigure } from '../analysisFigure';
describe('buildAnalysisFigure', () => {
  it('poly → curve + điểm mẫu (qua gate points>0)', () => {
    const g = buildAnalysisFigure('f', { polys: { f: [0, 0, -0.01, 0.008].slice(0,3) }, polyDomains: { f: [0, 40] }, points: [], solids: {} });
    expect(g.curves.length).toBe(1);
    expect(g.curves[0].type).toBe('parabola');
    expect(g.points.length).toBeGreaterThan(10); // có điểm mẫu
  });
  it('cylinder → khung dây có điểm + đường', () => {
    const g = buildAnalysisFigure('cyl', { polys: {}, polyDomains: {}, points: [], solids: { T: { kind: 'cylinder', cx: 0, cy: 0, radius: 2, from: 0, to: 4 } } });
    expect(g.points.length).toBeGreaterThan(20); // 2 vòng × 16
    expect(g.lines.length).toBeGreaterThan(0);
  });
  it('cone → có đỉnh + vòng đáy', () => {
    const g = buildAnalysisFigure('cone', { polys: {}, polyDomains: {}, points: [], solids: { N: { kind: 'cone', cx: 2, cy: 0, baseRadius: 2, baseZ: 0, apexZ: 4 } } });
    const apex = g.points.find((p) => Math.abs(p.z - 4) < 1e-6);
    expect(apex).toBeDefined();
  });
  it('điểm tường minh được giữ', () => {
    const g = buildAnalysisFigure('x', { polys: {}, polyDomains: {}, points: [{ id: 'M', x: 1, y: 2, z: 0 }], solids: {} });
    expect(g.points.find((p) => p.id === 'M')).toBeDefined();
  });
});
```

- [ ] **Step 2: Chạy — ĐỎ.**
- [ ] **Step 3: Cài đặt `analysisFigure.ts`** theo hợp đồng trên. Dùng `evalPoly` từ `./polyfit` để lấy y của điểm mẫu.
  Đường tròn: `x=cx+r·cos(θ), y=cy+r·sin(θ), z=<độ cao>`, θ = 2πk/16. Lines nối các điểm liên tiếp trên vòng.
  Import `GeometryData` type từ `'../../../../src/types/geometry'` (đường dẫn tương đối từ analysis/); nếu tsc phàn nàn
  đường dẫn, dùng cùng đường mà `entityToGeometry.ts` đang import.
- [ ] **Step 4: XANH + tsc + eslint + full suite (≥411).**
- [ ] **Step 5: Commit** `feat(engine): analysisFigure — dựng hình cho bài giải tích thuần (curve/khối/điểm)`

---

## Task 2: Nối `analysisFigure` vào runAnalysis (integrate/eval/optimize_multi)

**Files:** Modify `api/_lib/kernel/analysis/runAnalysis.ts` · Test `api/_lib/kernel/analysis/__tests__/runAnalysis.test.ts`

Trong 3 nhánh `integrate`, `eval`, `optimize_multi` (hiện trả `geometry` ngầm null): dựng
`FigureInput` rồi gọi `buildAnalysisFigure`, gán vào kết quả trả về.
- `polys` = `fitAt(env).coeffs` (env = {} cho integrate/eval; env = nghiệm cho optimize_multi).
- `polyDomains` = suy từ `plan.functions[i].through` (min/max x sau evalExpr).
- `points` = op `oxyz_point` trong `plan.ops` đã số hoá tại env (nếu có).
- `solids` = `buildSolids(env)`.
Với `optimize_multi`: env = { param_i: best.xs[i] }.

- [ ] **Step 1: Test đỏ** — thêm vào runAnalysis.test.ts: một `eval solid_volume` (2 trụ) phải trả `geometry.points>0`;
  một `optimize_multi` với 1 function phải trả `geometry.curves.length>0`.
- [ ] **Step 2: ĐỎ** (hiện geometry null).
- [ ] **Step 3: Cài đặt** — thêm `geometry` vào return của 3 nhánh (dùng buildAnalysisFigure). Giữ nguyên phần tính số.
- [ ] **Step 4: XANH + tsc + eslint + full suite + rebuild kernel** (`node scripts/build-kernel.mjs`).
- [ ] **Step 5: Commit** `feat(engine): integrate/eval/optimize_multi trả hình → Câu 4,8,5 nổi lên route`

---

## Self-review
- Module thuần + nối 3 nhánh; KHÔNG đụng run()/Scalar. Câu 1/9/10 không hồi quy.
- Điểm mẫu bảo đảm gate `points>0` của route. Curve cho fallback vẽ mượt.
- Controller sẽ tự đo end-to-end (LLM thật) Câu 4/8/5 sau, + rà chọn-nghiệm.
