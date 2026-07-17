# Đợt A (phần 1) — Lõi số + giao đường–cầu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vá giao đường–cầu để **Câu 3 chạy trọn qua `run()`**, và dựng 2 module số học thuần (`solver1d`, `recognize`) đã kiểm — nền cho engine giải tích; chứng minh chúng ghép lại ra đáp số **Câu 9 = 10−2√7**.

**Architecture:** Thêm nhánh line–sphere vào tầng compute hình học sẵn có (đường đi qua `run()` không đổi). Thêm thư mục **mới, cô lập** `api/_lib/kernel/analysis/` chứa module số thuần — CHƯA nối vào `run()` (việc nối + DSL cho LLM là plan phần 2). Triết lý số: tính số; giữ exact khi phép tính ở trong trường một-căn; nhị thức căn (vd `10−2√7`) do `recognize` sinh ra.

**Tech Stack:** TypeScript, Zod (đã có), Vitest, esbuild (build kernel). Số học dựa trên `Scalar` sẵn có (`api/_lib/kernel/scalar.ts`).

---

## File Structure

- **Sửa:** `api/_lib/kernel/compute/intersect.ts` — thêm `iLineSphere` + mở rộng `IntersectionAnswer` (`result:'segment'`, `point2`, `chord`).
- **Tạo:** `api/_lib/kernel/compute/__tests__/intersect-linesphere.test.ts` — test đơn vị giao đường–cầu.
- **Tạo:** `api/_lib/kernel/analysis/solver1d.ts` — `solveQuadratic` (gồm suy biến tuyến tính).
- **Tạo:** `api/_lib/kernel/analysis/__tests__/solver1d.test.ts`.
- **Tạo:** `api/_lib/kernel/analysis/recognize.ts` — nhận dạng hằng: hữu tỉ, `a√b/c`, `p+q√r`.
- **Tạo:** `api/_lib/kernel/analysis/__tests__/recognize.test.ts`.
- **Tạo:** `api/_lib/kernel/analysis/__tests__/cau9-integration.test.ts` — ghép circumcenter (hình học) + `solveQuadratic` + `recognize` → `10 − 2√7`.
- **Sửa:** `api/_lib/kernel/__tests__/translator-contract.test.ts` — thêm ca Câu 3 (ý d chạy qua `run()`).

Mỗi file một trách nhiệm; `analysis/` cô lập hoàn toàn khỏi tầng hình học (chỉ dùng chung `scalar.ts`).

---

## Task 1: Giao đường–cầu + chord (Câu 3 ý d)

**Files:**
- Modify: `api/_lib/kernel/compute/intersect.ts`
- Test: `api/_lib/kernel/compute/__tests__/intersect-linesphere.test.ts`
- Test: `api/_lib/kernel/__tests__/translator-contract.test.ts`

- [ ] **Step 1: Viết test đỏ (đơn vị)**

Tạo `api/_lib/kernel/compute/__tests__/intersect-linesphere.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeIntersection } from '../intersect';
import { lineFromTwoPoints, lineFromPointDir, sphereFromCenterRadius2 } from '../../entities';
import { vec3s } from '../../vec3s';
import { rat, displayScalar } from '../../scalar';

const V = (x: number, y: number, z: number) => vec3s(rat(BigInt(x)), rat(BigInt(y)), rat(BigInt(z)));

describe('giao đường–cầu (line ∩ sphere)', () => {
  it('cắt tại 2 điểm hữu tỉ → chord đúng', () => {
    // Đường Ox qua (-5,0,0), cầu tâm O bán kính² 4 ⇒ cắt (-2,0,0),(2,0,0), chord 4.
    const line = lineFromPointDir(V(-5, 0, 0), V(1, 0, 0));
    const sph = sphereFromCenterRadius2(V(0, 0, 0), rat(4n));
    const r = computeIntersection(line, sph);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.answer.result).toBe('segment');
    expect(r.answer.chord!.approx).toBeCloseTo(4, 9);
    expect(displayScalar(r.answer.chord!)).toBe('4');
  });

  it('tiếp xúc → tangent-point', () => {
    const line = lineFromPointDir(V(0, 0, 2), V(1, 0, 0)); // z=2 tiếp xúc cầu bán kính 2
    const sph = sphereFromCenterRadius2(V(0, 0, 0), rat(4n));
    const r = computeIntersection(line, sph);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.answer.result).toBe('tangent-point');
    expect(r.answer.point!.p.z.approx).toBeCloseTo(2, 9);
  });

  it('không cắt → none', () => {
    const line = lineFromPointDir(V(0, 0, 3), V(1, 0, 0));
    const sph = sphereFromCenterRadius2(V(0, 0, 0), rat(4n));
    const r = computeIntersection(line, sph);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.answer.result).toBe('none');
  });

  it('Câu 3: đường bay DE cắt biên radar, chord = 584√665/665', () => {
    // D(20,0,9), E(0,16,12), cầu tâm O bán kính 20 (r²=400).
    const line = lineFromTwoPoints(V(20, 0, 9), V(0, 16, 12));
    const sph = sphereFromCenterRadius2(V(0, 0, 0), rat(400n));
    const r = computeIntersection(line, sph);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.answer.result).toBe('segment');
    expect(displayScalar(r.answer.chord!)).toBe('584√665/665');
    expect(r.answer.chord!.approx).toBeCloseTo(22.6459, 3); // ×1000 ≈ 22646 → làm tròn 22600 m
  });
});
```

- [ ] **Step 2: Chạy test — kỳ vọng ĐỎ**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/intersect-linesphere.test.ts`
Expected: FAIL (`intersection not supported for line-sphere`, và `result` không phải `'segment'`).

- [ ] **Step 3: Cài đặt — mở rộng type + thêm `iLineSphere`**

Trong `api/_lib/kernel/compute/intersect.ts`:

(a) Sửa dòng import scalar (thêm `rat, sqrt`):
```ts
import { type Scalar, add, sub, mul, neg, div, rat, sqrt } from '../scalar';
```

(b) Mở rộng `IntersectionAnswer` (thêm `'segment'`, `point2`, `chord`):
```ts
export type IntersectionAnswer = {
  kind: 'intersection';
  result: 'point' | 'line' | 'circle' | 'tangent-point' | 'segment' | 'none' | 'coincident' | 'parallel';
  point?: PointE;
  point2?: PointE;
  line?: LineE;
  circle?: { center: PointE; r2: Scalar };
  chord?: Scalar; // độ dài dây cung line∩sphere (exact khi ở trong trường)
};
```

(c) Thêm hàm `iLineSphere` (trước `computeIntersection`):
```ts
// Đường P(t)=A+t·dir cắt cầu (tâm C, r²). Thế vào |P−C|²=r²:
//   a·t² + b·t + c = 0, a=|dir|², b=2(w·dir), c=|w|²−r², w=A−C.
// Δ<0 rời · Δ=0 tiếp xúc · Δ>0 cắt (2 điểm). Toạ độ giao điểm nói chung là nhị thức căn
// (rời trường một-căn ⇒ exact=null, số) NHƯNG chord=√(Δ/a) là số dưới một căn ⇒ exact được.
function iLineSphere(l: LineE, s: SphereE): IntersectionAnswer {
  const w = subV(l.p, s.center);
  const a = lenSqV(l.dir);
  const b = mul(rat(2n), dotV(w, l.dir));
  const c = sub(lenSqV(w), s.r2);
  const disc = sub(mul(b, b), mul(mul(rat(4n), a), c));
  const cmp = cmpScalar(disc, rat(0n));
  if (cmp < 0) return { kind: 'intersection', result: 'none' };
  const twoA = mul(rat(2n), a);
  if (cmp === 0) {
    const t = neg(div(b, twoA));
    return { kind: 'intersection', result: 'tangent-point', point: pointFromCoords(addV(l.p, scaleV(l.dir, t))) };
  }
  const sq = sqrt(disc);
  const t1 = div(sub(neg(b), sq), twoA);
  const t2 = div(add(neg(b), sq), twoA);
  return {
    kind: 'intersection', result: 'segment',
    point: pointFromCoords(addV(l.p, scaleV(l.dir, t1))),
    point2: pointFromCoords(addV(l.p, scaleV(l.dir, t2))),
    chord: sqrt(div(disc, a)),
  };
}
```

(d) Thêm 2 case vào `switch` trong `computeIntersection` (trước `default`):
```ts
    case 'line-sphere': return { ok: true, answer: iLineSphere(a as LineE, b as SphereE) };
    case 'sphere-line': return { ok: true, answer: iLineSphere(b as LineE, a as SphereE) };
```

- [ ] **Step 4: Chạy test — kỳ vọng XANH**

Run: `npx vitest run api/_lib/kernel/compute/__tests__/intersect-linesphere.test.ts`
Expected: PASS 4/4.

- [ ] **Step 5: Test hợp đồng Câu 3 qua `run()`**

Thêm vào cuối `describe(...)` trong `api/_lib/kernel/__tests__/translator-contract.test.ts`:

```ts
  it('Câu 3 (máy bay/radar) — giao đường bay với biên radar qua run()', () => {
    const res = solve({
      solidName: 'flight',
      ops: [
        { op: 'oxyz_point', name: 'O', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'D', at: [20, 0, 9] },
        { op: 'oxyz_point', name: 'E', at: [0, 16, 12] },
        { op: 'oxyz_point', name: 'P', at: [16, '16/5', '48/5'] },
        { op: 'oxyz_midpoint', name: 'M', a: 'D', b: 'E' },
        { op: 'oxyz_line', name: 'DE', by: { form: 'two_points', a: 'D', b: 'E' } },
        { op: 'oxyz_sphere', name: 'R', by: { form: 'center_radius', center: 'O', radius: 20 } },
      ],
      asserts: [{ relation: 'on', args: ['P', 'DE'] }], // ý c: P thuộc đường bay
      queries: [
        { kind: 'distance', a: 'O', b: 'D' },     // ý a: √481 (≈21932 m, ⇒ "25000" là Sai)
        { kind: 'intersection', a: 'DE', b: 'R' }, // ý d: chord
      ],
    });
    expect(res.ok).toBe(true);
    expect(res.violations).toHaveLength(0); // assert ý c thoả
    expect((res.answers[0] as { text: string }).text).toBe('√481'); // ý a
    const inter = res.answers[1] as { result: string; chord?: { approx: number } };
    expect(inter.result).toBe('segment');
    expect(inter.chord!.approx).toBeCloseTo(22.6459, 3); // ý d → ×1000 ≈ 22600 m
    const M = res.entities.points.get('M');
    expect(M!.p.z.approx).toBeCloseTo(10.5, 9); // ý b: chính giữa DE cao 10,5
  });
```

- [ ] **Step 6: Chạy full suite + rebuild kernel (line-sphere nằm trong bundle)**

Run: `npx vitest run` → Expected: tất cả xanh (bao gồm ca mới).
Run: `node scripts/build-kernel.mjs` → Expected: ghi `api/_lib/kernel-dist/index.mjs` không lỗi.

- [ ] **Step 7: Commit**

```bash
git add api/_lib/kernel/compute/intersect.ts api/_lib/kernel/compute/__tests__/intersect-linesphere.test.ts api/_lib/kernel/__tests__/translator-contract.test.ts
git commit -m "feat(engine): line-sphere intersection + chord (Câu 3 giải trọn qua run)"
```

---

## Task 2: Module `solver1d` — giải phương trình bậc ≤ 2

**Files:**
- Create: `api/_lib/kernel/analysis/solver1d.ts`
- Test: `api/_lib/kernel/analysis/__tests__/solver1d.test.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `api/_lib/kernel/analysis/__tests__/solver1d.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { solveQuadratic } from '../solver1d';
import { rat, displayScalar } from '../../scalar';

describe('solveQuadratic', () => {
  it('tuyến tính 2x−6=0 → x=3 (exact)', () => {
    const r = solveQuadratic(rat(0n), rat(2n), rat(-6n));
    expect(r).toHaveLength(1);
    expect(displayScalar(r[0])).toBe('3');
  });

  it('x²−7=0 → ±√7 (exact, căn thuần)', () => {
    const r = solveQuadratic(rat(1n), rat(0n), rat(-7n));
    const texts = r.map(displayScalar).sort();
    expect(texts).toEqual(['-√7', '√7']);
  });

  it('vô nghiệm thực (Δ<0) → []', () => {
    expect(solveQuadratic(rat(1n), rat(0n), rat(1n))).toHaveLength(0);
  });

  it('Câu 9: 9s²+60s−152=0 → nghiệm nhị thức căn (số, exact=null)', () => {
    const r = solveQuadratic(rat(9n), rat(60n), rat(-152n));
    expect(r).toHaveLength(2);
    const approx = r.map((s) => s.approx).sort((a, b) => a - b);
    expect(approx[0]).toBeCloseTo(-8.6249, 3);
    expect(approx[1]).toBeCloseTo(1.9582, 3);
    // nghiệm (−10±6√7)/3 là nhị thức ⇒ rời trường một-căn ⇒ exact=null
    expect(r[0].exact).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test — ĐỎ**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/solver1d.test.ts`
Expected: FAIL (`Cannot find module '../solver1d'`).

- [ ] **Step 3: Cài đặt `solver1d.ts`**

Tạo `api/_lib/kernel/analysis/solver1d.ts`:

```ts
// api/_lib/kernel/analysis/solver1d.ts
// Bộ giải phương trình một biến — Đợt A chỉ cần bậc ≤ 2 (đủ cho các bài quy về bậc hai như Câu 9).
// Giữ EXACT khi kết quả ở trong trường một-căn của Scalar (vd ±√7, hữu tỉ); nghiệm nhị thức căn
// (−b±√Δ)/2a với b≠0 tự động rơi về số (exact=null) — tầng recognize sẽ nhận dạng lại dạng đẹp.
import { type Scalar, add, sub, mul, neg, div, rat, sqrt } from '../scalar';
import { cmpScalar, isZeroS } from '../compute/answer';

// Giải a·x² + b·x + c = 0 trên tập số thực. Trả 0/1/2 nghiệm (Scalar). a=0 ⇒ tuyến tính.
export function solveQuadratic(a: Scalar, b: Scalar, c: Scalar): Scalar[] {
  if (isZeroS(a)) {
    if (isZeroS(b)) return []; // c=0: vô số / c≠0: vô nghiệm — cả hai trả []
    return [neg(div(c, b))];
  }
  const disc = sub(mul(b, b), mul(mul(rat(4n), a), c));
  const cmp = cmpScalar(disc, rat(0n));
  if (cmp < 0) return [];
  const twoA = mul(rat(2n), a);
  if (cmp === 0) return [neg(div(b, twoA))];
  const sq = sqrt(disc);
  return [div(sub(neg(b), sq), twoA), div(add(neg(b), sq), twoA)];
}
```

- [ ] **Step 4: Chạy test — XANH + lint**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/solver1d.test.ts` → PASS 4/4.
Run: `npx eslint api/_lib/kernel/analysis/solver1d.ts` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/analysis/solver1d.ts api/_lib/kernel/analysis/__tests__/solver1d.test.ts
git commit -m "feat(engine): analysis solver1d — solveQuadratic (exact khi ở trong trường)"
```

---

## Task 3: Module `recognize` — nhận dạng hằng số về căn đẹp

**Files:**
- Create: `api/_lib/kernel/analysis/recognize.ts`
- Test: `api/_lib/kernel/analysis/__tests__/recognize.test.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `api/_lib/kernel/analysis/__tests__/recognize.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { recognizeConstant } from '../recognize';

describe('recognizeConstant', () => {
  it('hữu tỉ', () => {
    expect(recognizeConstant(1.5)!.text).toBe('3/2');
    expect(recognizeConstant(4)!.text).toBe('4');
  });

  it('một căn a√b/c', () => {
    expect(recognizeConstant(Math.sqrt(7))!.text).toBe('√7');
    expect(recognizeConstant(Math.sqrt(3) / 2)!.text).toBe('√3/2');
    expect(recognizeConstant(2 * Math.sqrt(3))!.text).toBe('2√3');
  });

  it('nhị thức p+q√r (Câu 9: 10−2√7)', () => {
    const r = recognizeConstant(10 - 2 * Math.sqrt(7));
    expect(r).not.toBeNull();
    expect(r!.text).toBe('10 - 2√7');
    expect(r!.value).toBeCloseTo(4.7085, 4);
  });

  it('số không nhận dạng được → null', () => {
    expect(recognizeConstant(Math.PI * 1.234567)).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test — ĐỎ**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/recognize.test.ts`
Expected: FAIL (`Cannot find module '../recognize'`).

- [ ] **Step 3: Cài đặt `recognize.ts`**

Tạo `api/_lib/kernel/analysis/recognize.ts`:

```ts
// api/_lib/kernel/analysis/recognize.ts
// Nhận dạng một số thực về dạng "căn đẹp": hữu tỉ, a√b/c, hoặc p+q√r.
// CHỈ chấp nhận khi dựng-lại khớp x tới EPS (chặn khớp giả). Ưu tiên dạng đơn giản trước.
const EPS = 1e-9;
// Các radicand square-free thường gặp trong đề thi.
const SQUAREFREE = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23, 26, 29, 30, 31, 33, 34, 35, 37, 38, 39, 41, 42, 43, 46, 47];
const MAX_DEN = 64;

export type Recognized = { text: string; value: number };

function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a || 1;
}

// Xấp xỉ x bằng phân số p/q (|q|≤maxDen) nếu khớp EPS; trả dạng rút gọn.
function asRational(x: number, maxDen: number): { p: number; q: number } | null {
  for (let q = 1; q <= maxDen; q++) {
    const p = Math.round(x * q);
    if (Math.abs(x - p / q) < EPS) {
      const g = gcd(p, q);
      return { p: p / g, q: q / g };
    }
  }
  return null;
}

function fmtRational(p: number, q: number): string {
  return q === 1 ? `${p}` : `${p}/${q}`;
}

// Định dạng số hạng căn (num/den)·√rad với num>0 giả định; caller lo dấu.
function fmtSurdTerm(num: number, den: number, rad: number): string {
  const coeff = num === 1 ? `√${rad}` : `${num}√${rad}`;
  return den === 1 ? coeff : `${coeff}/${den}`;
}

export function recognizeConstant(x: number): Recognized | null {
  // 1) Hữu tỉ
  const q0 = asRational(x, MAX_DEN);
  if (q0) return { text: fmtRational(q0.p, q0.q), value: q0.p / q0.q };

  // 2) a√b/c  (x = (p/q)·√b)
  for (const b of SQUAREFREE) {
    const s = x / Math.sqrt(b);
    const r = asRational(s, MAX_DEN);
    if (r && r.p !== 0) {
      const val = (r.p / r.q) * Math.sqrt(b);
      if (Math.abs(val - x) < EPS) {
        const sign = r.p < 0 ? '-' : '';
        return { text: sign + fmtSurdTerm(Math.abs(r.p), r.q, b), value: val };
      }
    }
  }

  // 3) p + q√r  (nhị thức). Quét r và q hữu tỉ nhỏ; suy p rồi kiểm p hữu tỉ.
  for (const r of SQUAREFREE) {
    const root = Math.sqrt(r);
    for (let qd = 1; qd <= 8; qd++) {
      for (let qn = -8; qn <= 8; qn++) {
        if (qn === 0) continue;
        const qv = qn / qd;
        const p = asRational(x - qv * root, 16);
        if (!p) continue;
        const val = p.p / p.q + qv * root;
        if (Math.abs(val - x) < EPS) {
          const qAbsNum = Math.abs(qn);
          const g = gcd(qAbsNum, qd);
          const surd = fmtSurdTerm(qAbsNum / g, qd / g, r);
          const op = qn < 0 ? '-' : '+';
          return { text: `${fmtRational(p.p, p.q)} ${op} ${surd}`, value: val };
        }
      }
    }
  }

  return null;
}
```

- [ ] **Step 4: Chạy test — XANH + lint**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/recognize.test.ts` → PASS 4/4.
Run: `npx eslint api/_lib/kernel/analysis/recognize.ts` → exit 0.

Ghi chú nếu ĐỎ: kiểm định dạng `'√3/2'` (num=1 ⇒ bỏ hệ số 1) và `'10 - 2√7'` (dấu cách quanh toán tử). Sửa `fmtSurdTerm`/chuỗi cho khớp golden, KHÔNG đổi thuật toán.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/analysis/recognize.ts api/_lib/kernel/analysis/__tests__/recognize.test.ts
git commit -m "feat(engine): analysis recognize — nhận dạng hằng (hữu tỉ, a√b/c, p+q√r)"
```

---

## Task 4: Ghép chứng minh Câu 9 (circumcenter + solveQuadratic + recognize)

**Files:**
- Test: `api/_lib/kernel/analysis/__tests__/cau9-integration.test.ts`

Chứng minh 3 mảnh ghép lại ra đáp số Câu 9 (chưa qua DSL LLM — đó là plan phần 2). Dùng:
tâm ngoại tiếp 3 đỉnh cột (hình học, op G2-6) → K=14−Q_z, r_c²=|Q−A'|² → phương trình
`(K−s)² = r_c² + 3s²` ⇔ `2s² + 2K·s + (r_c²−K²) = 0` → `solveQuadratic` → R=K−s → `recognize`.

- [ ] **Step 1: Viết test (đỏ vì file chưa có; các API import đã tồn tại)**

Tạo `api/_lib/kernel/analysis/__tests__/cau9-integration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { circumcenterE } from '../../constructions';
import { vec3s } from '../../vec3s';
import { rat, sub, mul, add } from '../../scalar';
import { lenSqV, subV } from '../../vec3s';
import { solveQuadratic } from '../solver1d';
import { recognizeConstant } from '../recognize';

const V = (x: number, y: number, z: number) => vec3s(rat(BigInt(x)), rat(BigInt(y)), rat(BigInt(z)));

describe('Câu 9 — quả cầu tựa 3 cột (ghép hình học + giải tích)', () => {
  it('R = 10 − 2√7 ≈ 4,71 m', () => {
    // Đỉnh 3 cột: A'(0,0,10), B'(4,0,6), C'(0,4,6).
    const Ap = V(0, 0, 10), Bp = V(4, 0, 6), Cp = V(0, 4, 6);
    const Q = circumcenterE(Ap, Bp, Cp);               // tâm ngoại tiếp (hình học)
    const rc2 = lenSqV(subV(Q, Ap));                    // bán kính ngoại tiếp²
    const K = sub(rat(14n), Q.z);                       // 14 − Q_z
    // 2s² + 2K·s + (r_c² − K²) = 0
    const a = rat(2n);
    const b = mul(rat(2n), K);
    const c = sub(rc2, mul(K, K));
    const roots = solveQuadratic(a, b, c);
    // Nghiệm hình học hợp lệ: s cho tâm cầu phía trên (s lớn hơn)
    const s = Math.max(...roots.map((r) => r.approx));
    const R = K.approx - s;                             // R = K − s
    expect(R).toBeCloseTo(4.7085, 4);
    const nice = recognizeConstant(R);
    expect(nice).not.toBeNull();
    expect(nice!.text).toBe('10 - 2√7');
    // Q chính xác = (4/3,4/3,22/3)
    expect(Q.x.approx).toBeCloseTo(4 / 3, 9);
    expect(Q.z.approx).toBeCloseTo(22 / 3, 9);
  });
});
```

- [ ] **Step 2: Chạy — kỳ vọng XANH ngay (các API đã có; đây là test ghép)**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/cau9-integration.test.ts`
Expected: PASS 1/1. Nếu `recognizeConstant(R)` trả null hoặc sai chuỗi → xem lại Task 3 (nhánh nhị thức), KHÔNG sửa test.

- [ ] **Step 3: Commit**

```bash
git add api/_lib/kernel/analysis/__tests__/cau9-integration.test.ts
git commit -m "test(engine): Câu 9 giải được bằng ghép circumcenter + solveQuadratic + recognize (→ 10−2√7)"
```

---

## Task 5: Kiểm chứng toàn cục + rebuild + mốc

**Files:** (không sửa mã nguồn — chỉ kiểm chứng)

- [ ] **Step 1: Full suite**

Run: `npx vitest run` → Expected: mọi test xanh (333 cũ + các ca mới), 0 fail.

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit -p tsconfig.json` → sạch.
Run: `npx eslint api/_lib/kernel --ext .ts` → sạch.

- [ ] **Step 3: Rebuild kernel (đảm bảo bundle có line-sphere)**

Run: `node scripts/build-kernel.mjs` → ghi `api/_lib/kernel-dist/index.mjs` không lỗi.

- [ ] **Step 4: Commit mốc**

```bash
git commit --allow-empty -m "chore(engine): Đợt A phần 1 xong — line-sphere (Câu 3 trọn) + lõi số (solver1d, recognize) + chứng minh Câu 9"
```

---

## Self-Review (đã rà)

- **Phủ spec:** Task 1 = A1 (vá giao đường–cầu, Câu 3). Task 2/3 = A2/A3 (solver1d + recognize). Task 4 = mảnh A5 cho Câu 9 (mức ghép nội bộ; DSL cho LLM = plan phần 2). Phần 2 (Analysis Plan schema + `run()` wiring + prompt) tách riêng vì là subsystem độc lập.
- **Không placeholder:** mọi bước có mã đầy đủ + lệnh chạy + kỳ vọng.
- **Nhất quán kiểu:** `solveQuadratic(a,b,c: Scalar): Scalar[]`, `recognizeConstant(x: number): Recognized | null`, `IntersectionAnswer.chord?: Scalar`, `circumcenterE(a,b,c: Vec3S): Vec3S` (đã tồn tại từ G2-6). Golden đã truy vết tay: chord Câu 3 = `584√665/665`; nghiệm `9s²+60s−152=0` ≈ −8,625 & 1,958; `recognize(10−2√7)`.
- **An toàn:** `analysis/` cô lập, CHƯA nối `run()`; chỉ tầng hình học (line-sphere) đổi đường chạy + được rebuild.
