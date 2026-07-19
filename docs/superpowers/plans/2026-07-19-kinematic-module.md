# Module Kinematic (bài động) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Engine mô phỏng vật chuyển động THẲNG: tính đại lượng đề hỏi (reuse optimize/solve over time param) + xuất `agents` + `timeline` parametric_path (engine-computed) để frontend animate.

**Architecture:** Extend analysis layer. Vật M(t) = `oxyz_ratio(from,to,t)` (op có sẵn) ⇒ compute tái dùng. Thêm `mover` vào plan; khi có, engine tiêm oxyz_ratio + gắn agents/timeline vào GeometryData. KHÔNG đụng run()/core.

**Tech Stack:** TS (`api/_lib/kernel/analysis/runAnalysis.ts`), Zod, Vitest; `src/types/geometry.ts` (Agent3D, AnimationTimeline); prompt `translatorPrompt.js`. Spec: `docs/superpowers/specs/2026-07-19-kinematic-module-design.md`.

**Nhánh:** `claude/kinematic`. Rebuild kernel-dist sau khi đổi .ts. HỎI trước khi gộp main.

---

## Bối cảnh cho người thực thi (đọc trước)

- `runAnalysis(raw)` (`api/_lib/kernel/analysis/runAnalysis.ts`): parse `AnalysisPlanSchema` → `plan`, phân nhánh theo `plan.analyze.kind`. `optimize`/`solve` dùng `plan.analyze.parameter` (tham số 1-biến) + `finalize(value, src)` dựng geometry qua `entityTableToGeometryData(res.entities, name)`.
- **Vật chuyển động** = `oxyz_ratio{name, a, b, t}` = a + t·(b−a); `concreteOps` đã thay tham số vào `oxyz_ratio.t`. ⇒ M(t) là điểm tham số, query (distance…) tham chiếu được.
- `entityTableToGeometryData(et, name): GeometryData` trả `{name, points, lines, spheres, planes}` — CHƯA có agents/timeline. Toạ độ 1 điểm: `et.points.get(name)!.p.{x,y,z}.approx`.
- Type: `Agent3D {id,label,initialPosition:[x,y,z],color,radius?}`; `AnimationTimeline {duration, tracks:[{id,start,end,type,targetId,params}]}`; type track `parametric_path`, params `{path: "x(t)=…, y(t)=…, z(t)=…"}` với **t theo GIÂY** trên [start,end] (Câu 3 demo: velocity=(to−from)/durSec).
- Chạy 1 file test: `npx vitest run <path>`. Rebuild: `npm run build:kernel`.

---

## Task 1: Schema `mover` + tiêm `oxyz_ratio` + compute (reuse)

**Files:** Modify `runAnalysis.ts`; Test `api/_lib/kernel/analysis/__tests__/kinematic.test.ts`

- [ ] **Step 1: Thêm `mover` vào `AnalysisPlanSchema`** (trong `.extend({...})`):
```ts
mover: z.object({
  point: z.string(), from: z.string(), to: z.string(),
  agentId: z.string().optional(), label: z.string().optional(),
  color: z.string().optional(), radius: z.number().optional(), durationSec: z.number().optional(),
}).optional(),
```

- [ ] **Step 2: Test (đỏ)** — plan có mover, M(t) chuyển động D→E, optimize min distance(O,M).
```ts
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';
// O(0,0,0). D(4,0,0)→E(0,4,0). M(t)=D+t(E-D). min dist(O,M) tại t=0.5 → M=(2,2,0), dist=2√2≈2.828.
it('kinematic: mover D→E, min distance(O,M) = 2√2', () => {
  const r = runAnalysis({
    solidName: 'kin', parameters: [{ name: 't', domain: [0, 1] }],
    ops: [
      { op: 'oxyz_point', name: 'O', at: [0, 0, 0] },
      { op: 'oxyz_point', name: 'D', at: [4, 0, 0] },
      { op: 'oxyz_point', name: 'E', at: [0, 4, 0] },
    ],
    mover: { point: 'M', from: 'D', to: 'E', label: 'Máy bay', durationSec: 10 },
    analyze: { kind: 'optimize', parameter: 't', sense: 'min', objective: { kind: 'distance', a: 'O', b: 'M' } },
  });
  expect(r.ok).toBe(true);
  expect(r.answer.approx).toBeCloseTo(2 * Math.SQRT2, 3);
});
```
Run: `npx vitest run api/_lib/kernel/analysis/__tests__/kinematic.test.ts` → FAIL (M chưa tồn tại / schema).

- [ ] **Step 3: Tiêm oxyz_ratio khi có mover** — sau `const plan = parsed.data;` (chỉ khi analyze có `parameter`):
```ts
if (plan.mover && 'parameter' in plan.analyze) {
  const mv = plan.mover;
  const exists = plan.ops.some((o) => (o as { name?: string }).name === mv.point);
  if (!exists) {
    plan.ops = [...plan.ops, { op: 'oxyz_ratio', name: mv.point, a: mv.from, b: mv.to, t: plan.analyze.parameter } as unknown as (typeof plan.ops)[number]];
  }
}
```

- [ ] **Step 4: Test xanh** — `npx vitest run .../kinematic.test.ts` → PASS (min dist = 2√2). Compute tái dùng optimize.

- [ ] **Step 5: Không hồi quy** — `npx vitest run` → tất cả xanh.

- [ ] **Step 6: Commit** — `feat(analysis): mover schema + tiem oxyz_ratio cho vat chuyen dong (compute reuse)`

---

## Task 2: Xuất `agents` + `timeline` (animation) vào GeometryData

**Files:** Modify `runAnalysis.ts` (+ helper); Test `.../kinematic.test.ts`

- [ ] **Step 1: Test (đỏ)** — geometry có agents + timeline đúng.
```ts
it('kinematic: geometry co agent (initialPos=from) + parametric_path path dung', () => {
  const r = runAnalysis({ /* như Task1 test */ });
  const g = r.geometry as any;
  expect(g.agents?.[0]?.id).toBe('M');
  expect(g.agents[0].initialPosition).toEqual([4, 0, 0]);           // = D
  expect(g.timeline?.tracks?.[0]?.type).toBe('parametric_path');
  // velocity=(E-D)/dur=( -4,4,0)/10 ⇒ path chứa "-0.4" và "0.4"
  const path = g.timeline.tracks[0].params.path;
  expect(path).toContain('x(t)'); expect(path).toMatch(/-0\.4|0\.4/);
});
it('KHONG mover -> KHONG co agents/timeline (khong hoi quy)', () => {
  const r = runAnalysis({ solidName:'x', parameters:[{name:'t',domain:[0,10]}],
    ops:[{op:'oxyz_point',name:'O',at:[0,0,0]},{op:'oxyz_point',name:'P',at:['t',0,0]}],
    analyze:{kind:'solve',parameter:'t',constraint:{of:{kind:'distance',a:'O',b:'P'},equals:3},report:{kind:'distance',a:'O',b:'P'}} });
  expect((r.geometry as any)?.agents).toBeUndefined();
});
```

- [ ] **Step 2: Helper `attachMoverAnimation`** (trong runAnalysis.ts, cạnh các helper khác):
```ts
const attachMoverAnimation = (geo: unknown, mv: NonNullable<typeof plan.mover>, et: import('../entityTable').EntityTable): unknown => {
  const coord = (name: string): [number, number, number] | null => {
    const p = et.points.get(name); if (!p) return null;
    return [p.p.x.approx, p.p.y.approx, p.p.z.approx];
  };
  const from = coord(mv.from), to = coord(mv.to);
  if (!geo || !from || !to) return geo;
  const dur = mv.durationSec ?? 10;
  const id = mv.agentId ?? mv.point;
  const v = [ (to[0]-from[0])/dur, (to[1]-from[1])/dur, (to[2]-from[2])/dur ];
  const fmt = (n: number) => parseFloat(n.toFixed(6)).toString();
  const path = `x(t) = ${fmt(from[0])} + ${fmt(v[0])}*t, y(t) = ${fmt(from[1])} + ${fmt(v[1])}*t, z(t) = ${fmt(from[2])} + ${fmt(v[2])}*t`;
  return { ...(geo as object),
    agents: [{ id, label: mv.label ?? id, initialPosition: from, color: mv.color ?? '#FFA500', radius: mv.radius ?? 0.1 }],
    timeline: { duration: dur, tracks: [{ id: 'mv', start: 0, end: dur, type: 'parametric_path', targetId: id, params: { path } }] },
  };
};
```

- [ ] **Step 3: Gắn vào geometry ở `finalize`** — sau khi dựng `geometry` (từ entityTableToGeometryData), trước `return`:
```ts
if (plan.mover && geometry) geometry = attachMoverAnimation(geometry, plan.mover, res.entities);
```
(Nếu `finalize` có 2 nhánh dựng geometry, gắn ở nhánh có `res.entities`. Với optimize/solve dùng query hình học, `res.entities` có sẵn.)

- [ ] **Step 4: Test xanh** — `npx vitest run .../kinematic.test.ts` → agents/timeline đúng; bài không-mover không có agents.

- [ ] **Step 5: Không hồi quy** — `npx vitest run` → xanh.

- [ ] **Step 6: Commit** — `feat(analysis): xuat agents + timeline parametric_path cho mover (animation engine-computed)`

---

## Task 3: Few-shot kinematic + đo e2e + kiểm animate trên browser

**Files:** Modify `translatorPrompt.js`; Create `scripts/e2e-kinematic.mjs`

- [ ] **Step 1: Few-shot VÍ DỤ H (kinematic, Câu 3 Radar)** — khai O,C,B,D,E bằng oxyz_point; `mover{point:"M",from:"D",to:"E",label:"Máy bay",durationSec:10}`; `parameters:[{name:"t",domain:[0,1]}]`; `analyze` optimize min `distance(O,M)`. Nhắc: quỹ đạo là ĐƯỜNG THẲNG from→to; **KHÔNG tự tính toạ độ M** (dùng mover); đáp là SỐ. Chèn plan đã kiểm chạy được (chạy thử trước khi chốt).

- [ ] **Step 2: node --check + rebuild** — `node --check .../translatorPrompt.js`; `npm run build:kernel`.

- [ ] **Step 3: Script e2e** — nạp `.env.local`, chạy Câu 3 (chép sạch từ demo) qua `planFromProblem`+`solvePlan` 2 lần; in: có mover? đáp số? có agents + timeline không?

- [ ] **Step 4: Đối chiếu** — Câu 3 serve đáp (đại lượng) + geometry có agents + parametric_path; đáp khớp benchmark. Ghi Findings.

- [ ] **Step 5: Kiểm ANIMATE trên browser** — nạp geometry engine-sinh cho Câu 3 vào localStorage (`geo3d_anonymous_history`) → mở `/teacher?id=local_...` → xác nhận máy bay (agent) animate D→E (đọc DOM/agent + timeline; screenshot WebGL có thể treo → kiểm qua JS state).

- [ ] **Step 6: Không hồi quy** — `npx vitest run` xanh; 10 benchmark không đổi.

- [ ] **Step 7: Commit** — `feat(prompt): few-shot kinematic (Cau 3) + e2e + kiem animate`

---

## Kiểm cuối + gộp
- [ ] Toàn suite xanh; kernel-dist rebuild & commit; bài không-mover không đổi.
- [ ] Cập nhật memory (module kinematic).
- [ ] **HỎI trước khi gộp main** (auto-deploy). Verify prod: Câu 3 serve + animate.

## Findings

**KIN-T1 (mover schema + tiêm oxyz_ratio):** DONE (80487d2). Plan có `mover{point,from,to}` ⇒ engine tiêm
`oxyz_ratio(M, from, to, t)`; optimize min distance(O,M) với D(4,0,0)→E(0,4,0) cho **2√2 ≈ 2.828** (t=0.5). 435 test xanh.

**KIN-T2 (agents + timeline):** DONE (9f55536). Helper `attachMoverAnimation` đọc toạ độ from/to từ entities,
velocity=(to−from)/durSec, xuất `agents:[{id,label,initialPosition:from,color,radius}]` +
`timeline{duration, tracks:[{type:'parametric_path', targetId, params:{path}}]}`. Bài KHÔNG mover ⇒ không có
agents/timeline (không hồi quy). 437 test xanh.

**KIN-T3 (few-shot + e2e + browser):**
- *Hand-plan Câu 3* (Radar O(0,0,0), máy bay D(2,0,0.9)→E(0,1.6,1.2), dur 10s): engine serve **min-dist=1.6486**,
  agent tại D, path `x(t)=2 + -0.2*t, y(t)=0 + 0.16*t, z(t)=0.9 + 0.03*t` (velocity=(E−D)/10). ✅
- *E2E (LLM thật)* 2/2: LLM khai `mover`, engine SERVE 1.6486 + agents + timeline. ✅
- *Frontend parser (deterministic replication)*: chạy ĐÚNG code `AnimatedAgent.tsx` (split ',' → split '=' →
  `new Function`) trên path engine ⇒ M(0)=D(2,0,0.9), M(5)=mid(1,0.8,1.05), M(10)=E(0,1.6,1.2). Quirk `+ -0.2`
  là JS hợp lệ. ✅
- *Browser live* (`/teacher?id=local_kin`, inject localStorage): route load, WebGL render, nhãn "May bay" trong
  DOM, **0 lỗi**; dispatch `playAnimation` quét t=0→10s ⇒ **0 lỗi eval parametric-path** mỗi frame. ✅
  (Không chụp được pixel chuyển động: WebGL screenshot treo + r3f mesh không với tới qua fiber — nhưng chuỗi
  bằng chứng deterministic đã đủ.)

**Kết luận:** Module kinematic hoạt động trọn: engine TÍNH đúng đại lượng + XUẤT animation engine-computed;
frontend animate sạch. Câu 3 serve 1.6486 + máy bay bay D→E.
