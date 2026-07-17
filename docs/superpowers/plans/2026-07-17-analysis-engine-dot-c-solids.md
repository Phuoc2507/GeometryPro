# Đợt C — Khối tròn xoay trục đứng + thể tích phần giao → Câu 8 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** LLM chỉ *khai báo* hai khối (trụ bán kính 2 cao 4; nón đáy tâm (2,0) bán kính 2, đỉnh cao 4) và hỏi *"thể tích phần chung"*; **ENGINE tự tích phân**. Đích: **Câu 8 → 7,02 dm³**.

**Architecture:** Khối tròn xoay **trục song song Oz**: tại mỗi độ cao z mặt cắt là một HÌNH TRÒN. Thể tích phần giao = **∫ diện-tích-thấu-kính(z) dz** (giao hai hình tròn — công thức đóng), dùng `quadrature` đã có. Cách này **chính xác hơn Monte Carlo nhiều bậc** (đã kiểm: hội tụ 7,020545 = `64π/9 − 512/9 + 24√3` ngay ở lưới thô). Vẫn KHÔNG sửa `run()`; khối sống ở lớp analysis, không đụng engine hình học.

**Tech Stack:** TypeScript, Zod, Vitest, esbuild. Dựa trên `quadrature.ts`, `runAnalysis.ts` (Đợt A/B).

---

## File Structure

- **Tạo:** `api/_lib/kernel/analysis/solids.ts` — `Solid` (cylinder|cone), `zRange`, `diskAt`, `lensArea`, `intersectionVolume`.
- **Sửa:** `api/_lib/kernel/analysis/runAnalysis.ts` — khối `solids`, nguồn số `solid_volume`, kiểu `analyze: eval`.
- **Sửa:** `api/_lib/kernel-bridge/translatorPrompt.js` — dạy LLM khai báo khối + hỏi thể tích giao.
- **Tạo test:** `analysis/__tests__/solids.test.ts`, `analysis/__tests__/cau8-contract.test.ts`.

---

## Task 1: `solids.ts` — khối trục đứng + thể tích giao

**Files:** Create `api/_lib/kernel/analysis/solids.ts` · Test `api/_lib/kernel/analysis/__tests__/solids.test.ts`

- [ ] **Step 1: Test đỏ**

```ts
import { describe, it, expect } from 'vitest';
import { diskAt, lensArea, intersectionVolume, type Solid } from '../solids';

const CYL: Solid = { kind: 'cylinder', cx: 0, cy: 0, radius: 2, from: 0, to: 4 };
const CONE: Solid = { kind: 'cone', cx: 2, cy: 0, baseRadius: 2, baseZ: 0, apexZ: 4 };

describe('solids', () => {
  it('diskAt: trụ không đổi; nón thu nhỏ tuyến tính về đỉnh', () => {
    expect(diskAt(CYL, 2).r).toBeCloseTo(2, 12);
    expect(diskAt(CYL, 9).r).toBe(0);          // ngoài khối
    expect(diskAt(CONE, 0).r).toBeCloseTo(2, 12);  // đáy
    expect(diskAt(CONE, 4).r).toBeCloseTo(0, 12);  // đỉnh
    expect(diskAt(CONE, 2).r).toBeCloseTo(1, 12);  // giữa
    expect(diskAt(CONE, 2).cx).toBeCloseTo(2, 12);
  });

  it('lensArea: các ca biên + ca chuẩn', () => {
    expect(lensArea(2, 2, 0)).toBeCloseTo(Math.PI * 4, 10);   // trùng tâm, bằng nhau
    expect(lensArea(2, 2, 4)).toBe(0);                        // tiếp xúc ngoài
    expect(lensArea(2, 2, 5)).toBe(0);                        // rời
    expect(lensArea(2, 1, 0.5)).toBeCloseTo(Math.PI, 10);     // tròn nhỏ nằm trọn trong
    expect(lensArea(1, 1, 1)).toBeCloseTo(2 * Math.PI / 3 - Math.sqrt(3) / 2, 10);
  });

  it('intersectionVolume: trụ lồng trụ = π·1²·4', () => {
    const inner: Solid = { kind: 'cylinder', cx: 0, cy: 0, radius: 1, from: 0, to: 4 };
    expect(intersectionVolume(CYL, inner).value).toBeCloseTo(4 * Math.PI, 6);
  });

  it('Câu 8: trụ ∩ nón = 64π/9 − 512/9 + 24√3 ≈ 7,0205', () => {
    const v = intersectionVolume(CYL, CONE).value;
    expect(v).toBeCloseTo(64 * Math.PI / 9 - 512 / 9 + 24 * Math.sqrt(3), 5);
    expect(v).toBeCloseTo(7.0205, 4);
  });

  it('không chồng độ cao → 0', () => {
    const above: Solid = { kind: 'cylinder', cx: 0, cy: 0, radius: 2, from: 10, to: 12 };
    expect(intersectionVolume(CYL, above).value).toBe(0);
  });
});
```

- [ ] **Step 2: Chạy — ĐỎ** (`npx vitest run api/_lib/kernel/analysis/__tests__/solids.test.ts` → module not found)

- [ ] **Step 3: Cài đặt `solids.ts`**

```ts
// api/_lib/kernel/analysis/solids.ts
// Khối tròn xoay có TRỤC SONG SONG Oz: tại mỗi độ cao z, mặt cắt là một HÌNH TRÒN.
// Đủ cho các dạng đề phổ thông (trụ, nón). Thể tích phần GIAO của hai khối = tích phân theo z của
// diện tích "thấu kính" (giao hai hình tròn, có công thức đóng) — chính xác hơn Monte Carlo nhiều bậc.
import { integrate } from './quadrature';

export type Disk = { cx: number; cy: number; r: number };
export type Solid =
  | { kind: 'cylinder'; cx: number; cy: number; radius: number; from: number; to: number }
  | { kind: 'cone'; cx: number; cy: number; baseRadius: number; baseZ: number; apexZ: number };

// Khoảng độ cao [zMin, zMax] mà khối tồn tại.
export function zRange(s: Solid): [number, number] {
  if (s.kind === 'cylinder') return [Math.min(s.from, s.to), Math.max(s.from, s.to)];
  return [Math.min(s.baseZ, s.apexZ), Math.max(s.baseZ, s.apexZ)];
}

// Mặt cắt tròn tại độ cao z (bán kính 0 nếu z ngoài khối).
export function diskAt(s: Solid, z: number): Disk {
  const [lo, hi] = zRange(s);
  if (z < lo || z > hi) return { cx: 0, cy: 0, r: 0 };
  if (s.kind === 'cylinder') return { cx: s.cx, cy: s.cy, r: s.radius };
  const t = (s.apexZ - z) / (s.apexZ - s.baseZ); // 1 ở đáy → 0 ở đỉnh
  return { cx: s.cx, cy: s.cy, r: s.baseRadius * Math.max(0, t) };
}

// Diện tích phần chung của hai hình tròn bán kính r1, r2, tâm cách nhau d.
export function lensArea(r1: number, r2: number, d: number): number {
  if (r1 <= 0 || r2 <= 0) return 0;
  if (d >= r1 + r2) return 0;                                  // rời / tiếp xúc ngoài
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2; // lồng trọn
  const a1 = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
  const a2 = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  const tri = 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
  return a1 + a2 - tri;
}

// Thể tích phần chung hai khối = ∫ diện-tích-thấu-kính(z) dz trên đoạn độ cao chung.
export function intersectionVolume(a: Solid, b: Solid): { value: number; estimatedError: number } {
  const [aLo, aHi] = zRange(a);
  const [bLo, bHi] = zRange(b);
  const lo = Math.max(aLo, bLo);
  const hi = Math.min(aHi, bHi);
  if (hi <= lo) return { value: 0, estimatedError: 0 };
  const f = (z: number): number => {
    const d1 = diskAt(a, z);
    const d2 = diskAt(b, z);
    return lensArea(d1.r, d2.r, Math.hypot(d1.cx - d2.cx, d1.cy - d2.cy));
  };
  return integrate(f, lo, hi);
}
```

- [ ] **Step 4: XANH + lint** (`npx vitest run .../solids.test.ts` → PASS 5/5; `npx eslint api/_lib/kernel/analysis/solids.ts` → 0)

- [ ] **Step 5: Commit**
```bash
git add api/_lib/kernel/analysis/solids.ts api/_lib/kernel/analysis/__tests__/solids.test.ts
git commit -m "feat(engine): analysis solids — trụ/nón trục đứng + thể tích phần giao (thấu kính + tích phân)"
```

---

## Task 2: `runAnalysis` — khối `solids`, nguồn `solid_volume`, kiểu `analyze: eval`

**Files:** Modify `api/_lib/kernel/analysis/runAnalysis.ts` · Test `api/_lib/kernel/analysis/__tests__/runAnalysis-solids.test.ts`

- [ ] **Step 1: Test đỏ** — tạo `api/_lib/kernel/analysis/__tests__/runAnalysis-solids.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('runAnalysis — khối tròn xoay', () => {
  it('eval + solid_volume: trụ lồng trụ = 4π', () => {
    const r = runAnalysis({
      solidName: 'two-cyl',
      solids: [
        { name: 'A', kind: 'cylinder', center: [0, 0], radius: 2, from: 0, to: 4 },
        { name: 'B', kind: 'cylinder', center: [0, 0], radius: 1, from: 0, to: 4 },
      ],
      analyze: { kind: 'eval', of: { kind: 'solid_volume', of: ['A', 'B'], mode: 'intersection' } },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(4 * Math.PI, 5);
  });

  it('khối chưa khai báo → ok=false', () => {
    const r = runAnalysis({
      solidName: 'x',
      solids: [{ name: 'A', kind: 'cylinder', center: [0, 0], radius: 1, from: 0, to: 1 }],
      analyze: { kind: 'eval', of: { kind: 'solid_volume', of: ['A', 'Z'], mode: 'intersection' } },
    });
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy — ĐỎ** (`Invalid analysis plan` — chưa có `solids`/`solid_volume`/`eval`)

- [ ] **Step 3: Cài đặt** — sửa `api/_lib/kernel/analysis/runAnalysis.ts`:

(a) Thêm import:
```ts
import { intersectionVolume, type Solid } from './solids';
```
(b) Ngay TRƯỚC `const ScalarSource = ...`, thêm khai báo khối:
```ts
// Khối tròn xoay trục đứng — chỉ sống ở lớp analysis (engine hình học không đổi).
const SolidDeclSchema = z.union([
  z.object({ name: z.string(), kind: z.literal('cylinder'), center: z.tuple([NumOrExpr, NumOrExpr]), radius: NumOrExpr, from: NumOrExpr, to: NumOrExpr }),
  z.object({ name: z.string(), kind: z.literal('cone'), center: z.tuple([NumOrExpr, NumOrExpr]), baseRadius: NumOrExpr, baseZ: NumOrExpr, apexZ: NumOrExpr }),
]);
```
(c) THÊM thành viên vào `ScalarSource` (giữ hai thành viên cũ):
```ts
const ScalarSource = z.union([
  QueryESchema,
  z.object({ kind: z.literal('expr'), expr: z.string() }),
  z.object({ kind: z.literal('solid_volume'), of: z.tuple([z.string(), z.string()]), mode: z.literal('intersection') }),
]);
```
(d) THÊM kiểu `eval` vào `AnalyzeSchema` (giữ optimize/solve/integrate):
```ts
  z.object({ kind: z.literal('eval'), of: ScalarSource }),
```
(e) THÊM `solids` vào `AnalysisPlanSchema.extend({...})`:
```ts
  solids: z.array(SolidDeclSchema).default([]),
```
(f) Ngay SAU hàm `fitAt` (đã có), thêm bộ dựng khối + tính thể tích giao:
```ts
  // Dựng khối tại env (số hoá mọi trường).
  const buildSolids = (env: Env): Record<string, Solid> => {
    const out: Record<string, Solid> = {};
    for (const sd of plan.solids) {
      const n = (v: number | string): number => evalExpr(String(v), env);
      out[sd.name] = sd.kind === 'cylinder'
        ? { kind: 'cylinder', cx: n(sd.center[0]), cy: n(sd.center[1]), radius: n(sd.radius), from: n(sd.from), to: n(sd.to) }
        : { kind: 'cone', cx: n(sd.center[0]), cy: n(sd.center[1]), baseRadius: n(sd.baseRadius), baseZ: n(sd.baseZ), apexZ: n(sd.apexZ) };
    }
    return out;
  };
  const isSolidVolSrc = (s: unknown): s is { kind: 'solid_volume'; of: [string, string]; mode: 'intersection' } =>
    !!s && typeof s === 'object' && (s as { kind?: string }).kind === 'solid_volume';
  const solidVolumeAt = (env: Env, src: { of: [string, string] }): number => {
    const built = buildSolids(env);
    const a = built[src.of[0]], b = built[src.of[1]];
    if (!a) throw new Error(`Khối "${src.of[0]}" chưa khai báo trong solids`);
    if (!b) throw new Error(`Khối "${src.of[1]}" chưa khai báo trong solids`);
    return intersectionVolume(a, b).value;
  };
```
(g) Ngay SAU nhánh `if (plan.analyze.kind === 'integrate') {...}`, thêm nhánh `eval`:
```ts
  // ---- eval: tính thẳng một nguồn số (không cần tham số/hình học) ----
  if (plan.analyze.kind === 'eval') {
    const src = plan.analyze.of;
    try {
      let val: number;
      if (isSolidVolSrc(src)) val = solidVolumeAt({}, src);
      else if (isExprSrc(src)) val = evalExpr(src.expr, {}, fitAt({}).funcs);
      else return fail('-', 'analyze.eval chỉ nhận nguồn "expr" hoặc "solid_volume"');
      const nice = recognizeConstant(val);
      return {
        ok: Number.isFinite(val), parameter: { name: '-', value: NaN },
        answer: { approx: val, text: nice ? nice.text : val.toFixed(4), approximate: !nice },
        violations: [], errors: [],
      };
    } catch (e) { return fail('-', (e as Error).message); }
  }
```
LƯU Ý: `isExprSrc` hiện được khai báo BÊN DƯỚI (cạnh evalQuery). Hãy DI CHUYỂN khai báo `isExprSrc` lên trên — đặt ngay cạnh `isSolidVolSrc` ở mục (f) — để nhánh `eval` dùng được. Giữ nguyên phần thân còn lại.

(h) Trong `evalQuery`, thêm nhánh khối (đặt ngay sau nhánh `isExprSrc`):
```ts
    if (isSolidVolSrc(src)) {
      try { return solidVolumeAt(env, src); } catch { return null; }
    }
```
và trong `finalize`, ở nhánh không-phải-query-hình-học, xử lý tương tự: nếu `isSolidVolSrc(src)` thì `val = solidVolumeAt(env, src)` (bọc try/catch trả `fail`), phần asserts giữ như nhánh `expr`.

- [ ] **Step 4: XANH + tsc + lint + full suite** (Câu 1/4/9/10 KHÔNG hồi quy)

- [ ] **Step 5: Commit**
```bash
git add api/_lib/kernel/analysis/runAnalysis.ts api/_lib/kernel/analysis/__tests__/runAnalysis-solids.test.ts
git commit -m "feat(engine): runAnalysis — khối solids + nguồn solid_volume + kiểu analyze eval"
```

---

## Task 3: Hợp đồng Câu 8 + prompt + rebuild + mốc

**Files:** Test `api/_lib/kernel/analysis/__tests__/cau8-contract.test.ts` · Modify `api/_lib/kernel-bridge/translatorPrompt.js`

- [ ] **Step 1: Test hợp đồng Câu 8**

```ts
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('Câu 8 (nón ∩ trụ) qua runAnalysis', () => {
  it('cùng cao 4, bán kính 2; trục nón là một đường sinh của trụ → V ≈ 7,02 dm³', () => {
    const r = runAnalysis({
      solidName: 'cone-cyl',
      solids: [
        // Trụ: tâm đáy (0,0), bán kính 2, cao 4.
        { name: 'T', kind: 'cylinder', center: [0, 0], radius: 2, from: 0, to: 4 },
        // Nón: tâm đáy (2,0) NẰM TRÊN đường tròn đáy trụ; đỉnh ở độ cao 4 ⇒ trục nón là đường sinh của trụ.
        { name: 'N', kind: 'cone', center: [2, 0], baseRadius: 2, baseZ: 0, apexZ: 4 },
      ],
      analyze: { kind: 'eval', of: { kind: 'solid_volume', of: ['T', 'N'], mode: 'intersection' } },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(7.0205, 3);
    expect(Number(r.answer.approx.toFixed(2))).toBe(7.02); // làm tròn phần trăm
  });
});
```

- [ ] **Step 2: Chạy — kỳ vọng XANH**

- [ ] **Step 3: Dạy LLM** — chèn vào `TRANSLATOR_PROMPT` (ngay trước dòng "CHỈ trả về JSON"):

```
## KHỐI TRÒN XOAY (TRỤ / NÓN) — engine tự tích phân thể tích phần giao
Chỉ KHAI BÁO khối, đừng tự tính tích phân/diện tích thấu kính. Trục khối phải SONG SONG Oz.
- "solids": [
    { "name":"T", "kind":"cylinder", "center":[0,0], "radius":2, "from":0, "to":4 },
    { "name":"N", "kind":"cone", "center":[2,0], "baseRadius":2, "baseZ":0, "apexZ":4 }
  ]
  · cylinder: center = tâm đáy (x,y); from/to = độ cao đáy/nắp.
  · cone: center = tâm đáy; baseZ = độ cao đáy; apexZ = độ cao ĐỈNH (trục nón là đường thẳng đứng qua center).
- Thể tích PHẦN CHUNG hai khối:
  "analyze": { "kind":"eval", "of": { "kind":"solid_volume", "of":["T","N"], "mode":"intersection" } }
- Mẹo đặt hình: "trục nón là một đường sinh của trụ" ⇒ tâm đáy nón nằm TRÊN đường tròn đáy trụ
  (vd trụ tâm (0,0) bán kính 2 ⇒ tâm đáy nón (2,0)).
```

- [ ] **Step 4: Kiểm chứng toàn cục + rebuild**

Run: `npx vitest run` → toàn bộ xanh. `npx tsc --noEmit -p tsconfig.json` sạch. `npx eslint api/_lib/kernel --ext .ts` sạch. `node scripts/build-kernel.mjs` không lỗi.

- [ ] **Step 5: Commit mốc**
```bash
git add -A
git commit -m "feat(engine): Đợt C xong — khối tròn xoay + thể tích giao, Câu 8 giải trọn (7,02 dm³)"
```

---

## Self-Review (đã rà)

- **Phủ mục tiêu:** solids + thể tích giao = Task 1; nối vào runAnalysis (`solids`/`solid_volume`/`eval`) = Task 2; Câu 8 + prompt = Task 3.
- **Chống ảo giác:** LLM chỉ khai báo kích thước khối đọc từ đề; engine tự dựng mặt cắt, tự tính diện tích thấu kính, tự tích phân (có ước lượng sai số của `integrate`).
- **An toàn:** `run()` KHÔNG đổi; `solids` chỉ ở AnalysisPlanSchema; nhánh `eval` không chạm hình học; Câu 1/4/9/10 phải còn xanh (Step 4 Task 2 + Task 3).
- **Nhất quán kiểu:** `Solid = cylinder|cone` (trường phẳng, không lồng); `diskAt(s,z) → Disk`; `lensArea(r1,r2,d) → number`; `intersectionVolume(a,b) → {value,estimatedError}`; ScalarSource thêm `solid_volume`. Golden truy vết tay/đã chạy: `lensArea(1,1,1)=2π/3−√3/2`; trụ∩trụ = 4π; **Câu 8 = 64π/9 − 512/9 + 24√3 = 7,020545** (đã kiểm hội tụ ở n=200).
- **Giới hạn có chủ ý:** chỉ trục SONG SONG Oz (đủ cho Câu 8 và dạng đề phổ thông); `eval` chỉ nhận `expr`/`solid_volume`.
- **Không placeholder:** solids.ts có mã đầy đủ; runAnalysis có snippet + vị trí chèn chính xác.
