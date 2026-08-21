# Physics Pack v0 (Động học 10) — Kế hoạch thực thi

> **For agentic workers:** REQUIRED SUB-SKILL: dùng superpowers:subagent-driven-development (khuyến nghị) hoặc superpowers:executing-plans để thực thi task-by-task. Các bước dùng checkbox (`- [ ]`).

**Goal:** Engine Vật lý v0 (động học lớp 10): `runPhysics(plan)` tính đáp bằng CÔNG THỨC ĐÓNG trên Scalar (exact-first, fallback recognize), TỰ KIỂM thay-ngược, xuất scene `agents + timeline parametric_path` (format frontend đã render) + dữ liệu đồ thị x-t/v-t. 10 bài contract từ spec phải ra đúng đáp tính tay.

**Architecture:** Lớp bọc ngoài kiểu `runAnalysis` nhưng KHÔNG cần gọi `run()` — mọi chuyển động lớp 10 là đa thức bậc ≤ 2 theo t mỗi trục (`Quad` hệ số Scalar) ⇒ mọi query giải đóng bằng `solveQuadratic` sẵn có. Toàn bộ code mới nằm trong `api/_lib/kernel/physics/**`.

**Tech Stack:** TS, zod 3, vitest. Tái dùng: `../scalar`, `../analysis/solver1d`, `../analysis/recognize`; `import type` từ `src/types/geometry` (type-only, bị erase).

**Spec:** `docs/superpowers/specs/2026-08-21-physics-pack-design.md` (đọc §5–§10 trước khi code — mọi số kỳ vọng trong test lấy từ đó).

**Vị trí trong chương trình:** đây là plan chi tiết cho **Phase P1** của `docs/superpowers/plans/2026-08-21-engine-pack-rollout.md` (rollout đa môn). Khác biệt so bản phác §7 của spec kiến trúc (tên file, hình dạng plan, g bắt buộc, quy tắc playback) đã đối chiếu tại spec pack §14 — thi công theo SPEC PACK; phiên phản biện chốt trước khi bắt đầu.

**Nhánh:** `claude/physics-pack`. **HỎI trước khi gộp main.**

---

## Bối cảnh cho người thực thi (đọc trước)

- **Baseline: 1072 test xanh** (`npx vitest run`). Chạy 1 file: `npx vitest run <path>`. Glob vitest ĐÃ phủ `api/_lib/kernel/**/*.test.ts` ⇒ KHÔNG sửa `vitest.config.ts`.
- **Ranh giới CỨNG:** KHÔNG sửa `run.ts`, `planSchema.ts` (gốc), `index.ts`, `package.json`, `runAnalysis.ts`, `src/**`. Vì `index.ts` không đổi nên physics CHƯA vào kernel-dist (nối dây là v1) ⇒ **không cần `npm run build:kernel`** trong plan này.
- **Scalar (`../scalar`):** `Scalar {approx, exact}`; `rat(1n,2n)` = 1/2; `fromExact(makeExact(1n,2n,3))` = (1/2)√3; các phép `add/sub/mul/div/neg/sqrt` trả exact khi ở trong trường "hữu tỉ + một căn", ngược lại `exact:null` (approx luôn đúng). `displayScalar` in "2√2", "3/2".
- **`solveQuadratic(a,b,c)` (`../analysis/solver1d`):** nghiệm Scalar của ax²+bx+c=0; a=0 xử lý tuyến tính; nghiệm (−b±√Δ)/2a với b≠0 và Δ không cùng radicand TỰ rơi về float (exact:null) — tầng recognize dựng lại dạng đẹp. ĐÚNG hành vi mong muốn (spec P10).
- **`recognizeConstant(x)` (`../analysis/recognize`):** float → "1/2 + √13/2" | "20√3" | null; tự kiểm dựng-lại EPS 1e-10.
- **Frontend (`src/components/3d/AnimatedAgent.tsx`) — 3 quirk PHẢI khớp:** (1) renderer ưu tiên `params.equations {x,y,z}` (chỉ vế phải, không split chuỗi); `params.path` là đường dự phòng (split ',' rồi '=' rồi `new Function`); `t^2` chỉ được replace MỘT lần ⇒ engine phát **`t*t`** và phát CẢ equations LẪN path; (2) sau `track.end` agent NHẢY về `initialPosition` nếu thiếu `params.landing_point` ⇒ landing_point BẮT BUỘC mọi track; (3) map geo3d (x,y,z) → Three (x,z,y) ⇒ **trục đứng vật lý ghi vào z geo3d**, y geo3d = 0.
- Playback chạy đồng hồ THẬT (không timeScale trong AnimationContext) ⇒ engine nhân sẵn hệ số k vào path (spec §8.2).
- Commit message không dấu (nếp repo), ví dụ `feat(physics): ...`.

## Bản đồ file (tất cả TẠO MỚI)

- `api/_lib/kernel/physics/planSchema.ts` — zod schema (spec §5, chép nguyên).
- `api/_lib/kernel/physics/kinematics.ts` — Quad/Motion trên Scalar: scalarFromNumber, trigOf, motionOf, evalQuadS/N, derivQuad, expandAbs, subQuad, rootsFor, mainAxis.
- `api/_lib/kernel/physics/compute.ts` — 10 query công thức đóng + certify + recognize + tự kiểm.
- `api/_lib/kernel/physics/runPhysics.ts` — entry: parse → queries → asserts → T_phys → scene → PhysicsResult.
- `api/_lib/kernel/physics/scene.ts` — GeometryData (points/lines/curves/agents/timeline) + charts data.
- `api/_lib/kernel/physics/__tests__/{kinematics,compute,runPhysics,scene,physics-contract}.test.ts`.

---

### Task 1: `planSchema.ts` + `kinematics.ts` — nền Quad/Motion exact

**Files:** Create `planSchema.ts`, `kinematics.ts`; Test `__tests__/kinematics.test.ts`

- [ ] **Step 1: Chép schema từ spec §5** vào `api/_lib/kernel/physics/planSchema.ts` (nguyên văn khối code §5, thêm 3 dòng export type cuối):

```ts
export type PhysicsOp = z.infer<typeof PhysicsOpSchema>;
export type PhysicsQuery = z.infer<typeof PhysicsQuerySchema>;
// PhysicsPlan đã export trong spec
```

- [ ] **Step 2: Viết test thất bại** `api/_lib/kernel/physics/__tests__/kinematics.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PhysicsPlanSchema } from '../planSchema';
import { scalarFromNumber, trigOf, motionOf, evalQuadS, evalQuadN, derivQuad, expandAbs, subQuad, rootsFor, mainAxis } from '../kinematics';
import { rat } from '../../scalar';

describe('planSchema', () => {
  it('nhan plan hop le, dien default (a=0, startAt=0, units m/s)', () => {
    const p = PhysicsPlanSchema.parse({
      problemName: 'x',
      ops: [{ op: 'mover1d', name: 'A', x0: 0, v0: 60 }],
      queries: [{ kind: 'position_at', of: 'A', t: 1.5 }],
    });
    expect(p.ops[0]).toMatchObject({ a: 0, startAt: 0, axis: 'x' });
    expect(p.units).toEqual({ length: 'm', time: 's' });
  });
  it('TU CHOI projectile/free_fall thieu g (khong hard-code g trong engine)', () => {
    expect(PhysicsPlanSchema.safeParse({
      problemName: 'x', ops: [{ op: 'free_fall', name: 'A', h0: 45 }],
      queries: [{ kind: 'time_to_ground', of: 'A' }],
    }).success).toBe(false);
  });
});

describe('kinematics — exact-first', () => {
  it('scalarFromNumber: 9.8 → 49/5 exact; 0.5 → 1/2', () => {
    const g = scalarFromNumber(9.8);
    expect(g.exact).toEqual({ num: 49n, den: 5n, radicand: 1 });
    expect(scalarFromNumber(0.5).exact).toEqual({ num: 1n, den: 2n, radicand: 1 });
  });
  it('trigOf goc dep EXACT: sin60=(1/2)√3, cos45=(1/2)√2; goc la → float', () => {
    expect(trigOf(60).sin.exact).toEqual({ num: 1n, den: 2n, radicand: 3 });
    expect(trigOf(45).cos.exact).toEqual({ num: 1n, den: 2n, radicand: 2 });
    const t37 = trigOf(37);
    expect(t37.cos.exact).toBeNull();
    expect(t37.cos.approx).toBeCloseTo(Math.cos((37 * Math.PI) / 180), 12);
  });
  it('motionOf projectile 45°: v0x=v0y=10√2 exact; k2 = −g/2 = −5', () => {
    const m = motionOf({ op: 'projectile', name: 'b', x0: 0, h0: 0, v0: 20, angleDeg: 45, g: 10 } as never);
    expect(m.x.k1.approx).toBeCloseTo(10 * Math.SQRT2, 10);
    expect(m.x.k1.exact?.radicand).toBe(2);
    expect(m.y.k2.exact).toEqual({ num: -5n, den: 1n, radicand: 1 });
    expect(mainAxis(m)).toBe('x');
  });
  it('motionOf mover1d a=2: k2=1 exact; free_fall mainAxis=y', () => {
    const m = motionOf({ op: 'mover1d', name: 'o', x0: 0, v0: 10, a: 2, startAt: 0, axis: 'x' } as never);
    expect(m.x.k2.exact).toEqual({ num: 1n, den: 1n, radicand: 1 });
    const f = motionOf({ op: 'free_fall', name: 'd', h0: 45, g: 10, x0: 0 } as never);
    expect(mainAxis(f)).toBe('y');
    expect(evalQuadN(f.y, 3)).toBeCloseTo(0, 12); // 45 − 5·9 = 0
  });
  it('evalQuadS/derivQuad exact: x(5)=75, v(5)=20 (bai P2)', () => {
    const m = motionOf({ op: 'mover1d', name: 'o', x0: 0, v0: 10, a: 2, startAt: 0, axis: 'x' } as never);
    const t5 = scalarFromNumber(5);
    expect(evalQuadS(m.x, t5).exact).toEqual({ num: 75n, den: 1n, radicand: 1 });
    expect(evalQuadS(derivQuad(m.x), t5).exact).toEqual({ num: 20n, den: 1n, radicand: 1 });
  });
  it('expandAbs t0=1/2 tren xe2 P8: 120 − 60(t−1/2) → {150, −60, 0} exact', () => {
    const m = motionOf({ op: 'mover1d', name: 'x2', x0: 120, v0: -60, a: 0, startAt: 0.5, axis: 'x' } as never);
    const q = expandAbs(m.x, m.t0);
    expect(q.k0.exact).toEqual({ num: 150n, den: 1n, radicand: 1 });
    expect(q.k1.exact).toEqual({ num: -60n, den: 1n, radicand: 1 });
  });
  it('rootsFor giu exact: y={0,10√2,−5} co nghiem 0 va 2√2 (bai P5)', () => {
    const m = motionOf({ op: 'projectile', name: 'b', x0: 0, h0: 0, v0: 20, angleDeg: 45, g: 10 } as never);
    const roots = rootsFor(m.y, rat(0n));
    expect(roots).toHaveLength(2);
    expect(roots[0].approx).toBeCloseTo(0, 10);
    expect(roots[1].approx).toBeCloseTo(2 * Math.SQRT2, 10);
    expect(roots[1].exact).toEqual({ num: 2n, den: 1n, radicand: 2 });
  });
  it('subQuad: hieu hai xe P7 → {−30, 20, 0}', () => {
    const a = motionOf({ op: 'mover1d', name: 'a', x0: 0, v0: 60, a: 0, startAt: 0, axis: 'x' } as never);
    const b = motionOf({ op: 'mover1d', name: 'b', x0: 30, v0: 40, a: 0, startAt: 0, axis: 'x' } as never);
    const d = subQuad(expandAbs(a.x, a.t0), expandAbs(b.x, b.t0));
    expect(d.k0.approx).toBe(-30);
    expect(d.k1.approx).toBe(20);
  });
});
```

- [ ] **Step 3: Chạy để thấy FAIL** — `npx vitest run api/_lib/kernel/physics/__tests__/kinematics.test.ts` → "Cannot find module '../planSchema'".

- [ ] **Step 4: Viết `kinematics.ts`:**

```ts
// api/_lib/kernel/physics/kinematics.ts
// THUẦN: động học lớp 10 = đa thức bậc ≤ 2 theo t trên MỖI trục, hệ số Scalar (exact-first).
// f(τ) = k0 + k1·τ + k2·τ², τ = t − t0. KHÔNG đụng run()/core — chỉ dùng scalar + solver1d.
import { type Scalar, num, rat, fromExact, makeExact, add, sub, mul, neg } from '../scalar';
import { solveQuadratic } from '../analysis/solver1d';
import type { PhysicsOp } from './planSchema';

export type Quad = { k0: Scalar; k1: Scalar; k2: Scalar };
export type Motion = { name: string; t0: Scalar; x: Quad; y: Quad; op: PhysicsOp };

// Thập phân hữu hạn (≤ 9 chữ lẻ) → hữu tỉ CHÍNH XÁC (9.8 → 49/5; 0.5 → 1/2); ngoài ra float trần.
export function scalarFromNumber(x: number): Scalar {
  if (!Number.isFinite(x)) return num(x);
  const SCALE = 1e9;
  const n = Math.round(x * SCALE);
  if (Math.abs(x * SCALE - n) < 1e-3 && Math.abs(n) <= Number.MAX_SAFE_INTEGER) {
    return fromExact(makeExact(BigInt(n), BigInt(SCALE)));
  }
  return num(x);
}

// cos/sin EXACT cho góc đẹp; góc khác rơi về float (đáp cuối qua recognize). Độ→radian là việc NỘI BỘ.
const EXACT_TRIG: Record<number, { cos: Scalar; sin: Scalar }> = {
  0: { cos: rat(1n), sin: rat(0n) },
  30: { cos: fromExact(makeExact(1n, 2n, 3)), sin: rat(1n, 2n) },
  45: { cos: fromExact(makeExact(1n, 2n, 2)), sin: fromExact(makeExact(1n, 2n, 2)) },
  60: { cos: rat(1n, 2n), sin: fromExact(makeExact(1n, 2n, 3)) },
  90: { cos: rat(0n), sin: rat(1n) },
};
export function trigOf(angleDeg: number): { cos: Scalar; sin: Scalar } {
  const hit = EXACT_TRIG[angleDeg];
  if (hit) return hit;
  const r = (angleDeg * Math.PI) / 180;
  return { cos: num(Math.cos(r)), sin: num(Math.sin(r)) };
}

const ZERO = (): Quad => ({ k0: rat(0n), k1: rat(0n), k2: rat(0n) });
const HALF = rat(1n, 2n);

export function motionOf(op: PhysicsOp): Motion {
  const S = scalarFromNumber;
  if (op.op === 'mover1d') {
    const q: Quad = { k0: S(op.x0), k1: S(op.v0), k2: mul(HALF, S(op.a)) };
    return op.axis === 'y'
      ? { name: op.name, t0: S(op.startAt), x: ZERO(), y: q, op }
      : { name: op.name, t0: S(op.startAt), x: q, y: ZERO(), op };
  }
  if (op.op === 'free_fall') {
    return {
      name: op.name, t0: rat(0n),
      x: { k0: S(op.x0), k1: rat(0n), k2: rat(0n) },
      y: { k0: S(op.h0), k1: rat(0n), k2: neg(mul(HALF, S(op.g))) }, op,
    };
  }
  const { cos, sin } = trigOf(op.angleDeg);
  const v0 = S(op.v0);
  return {
    name: op.name, t0: rat(0n),
    x: { k0: S(op.x0), k1: mul(v0, cos), k2: rat(0n) },
    y: { k0: S(op.h0), k1: mul(v0, sin), k2: neg(mul(HALF, S(op.g))) }, op,
  };
}

// Trục "chính" khi query không nói axis: mover1d → trục của nó; free_fall → y; projectile → x.
export const mainAxis = (m: Motion): 'x' | 'y' =>
  m.op.op === 'mover1d' ? m.op.axis : m.op.op === 'free_fall' ? 'y' : 'x';

export function evalQuadS(q: Quad, tau: Scalar): Scalar {
  return add(q.k0, add(mul(q.k1, tau), mul(q.k2, mul(tau, tau))));
}
// Bản FLOAT ĐỘC LẬP (đường certify — không đi qua add/mul exact).
export function evalQuadN(q: Quad, tau: number): number {
  return q.k0.approx + q.k1.approx * tau + q.k2.approx * tau * tau;
}
export function derivQuad(q: Quad): Quad {
  return { k0: q.k1, k1: mul(rat(2n), q.k2), k2: rat(0n) };
}
// Đổi hệ số theo τ=t−t0 về theo t TUYỆT ĐỐI — cần khi trừ hai vật khác t0 (meet).
export function expandAbs(q: Quad, t0: Scalar): Quad {
  const k0 = add(sub(q.k0, mul(q.k1, t0)), mul(q.k2, mul(t0, t0)));
  const k1 = sub(q.k1, mul(rat(2n), mul(q.k2, t0)));
  return { k0, k1, k2: q.k2 };
}
export function subQuad(a: Quad, b: Quad): Quad {
  return { k0: sub(a.k0, b.k0), k1: sub(a.k1, b.k1), k2: sub(a.k2, b.k2) };
}
// MỌI nghiệm của q(τ)=value, sort tăng theo approx. solveQuadratic giữ exact khi trong trường.
export function rootsFor(q: Quad, value: Scalar): Scalar[] {
  return solveQuadratic(q.k2, q.k1, sub(q.k0, value)).sort((p, r) => p.approx - r.approx);
}
```

- [ ] **Step 5: Chạy để thấy PASS** — `npx vitest run api/_lib/kernel/physics/__tests__/kinematics.test.ts` (10 test).

- [ ] **Step 6: Commit** — `git add api/_lib/kernel/physics && git commit -m "feat(physics): planSchema + kinematics — Quad/Motion exact-first tren Scalar"`

---

### Task 2: `compute.ts` — 10 query công thức đóng + certify + tự kiểm

**Files:** Create `compute.ts`; Test `__tests__/compute.test.ts`

- [ ] **Step 1: Viết test thất bại** (số kỳ vọng = spec §10, tính tay sẵn):

```ts
import { describe, it, expect } from 'vitest';
import { motionOf, type Motion } from '../kinematics';
import { computePhysicsQuery } from '../compute';

const U = { length: 'm', time: 's' };
const map = (...ops: unknown[]): Map<string, Motion> => {
  const m = new Map<string, Motion>();
  for (const op of ops) { const mo = motionOf(op as never); m.set(mo.name, mo); }
  return m;
};
const fall45 = () => map({ op: 'free_fall', name: 'da', h0: 45, g: 10, x0: 0 });
const nemNgang = () => map({ op: 'projectile', name: 'vat', x0: 0, h0: 80, v0: 20, angleDeg: 0, g: 10 });
const nemXien45 = () => map({ op: 'projectile', name: 'bong', x0: 0, h0: 0, v0: 20, angleDeg: 45, g: 10 });
const nemXien60 = () => map({ op: 'projectile', name: 'bong', x0: 0, h0: 0, v0: 20, angleDeg: 60, g: 10 });

describe('compute — cong thuc dong + exact + tu kiem', () => {
  it('P3a time_to_ground roi tu do 45m: 3 s exact, co check thay-nguoc pass', () => {
    const r = computePhysicsQuery(fall45(), { kind: 'time_to_ground', of: 'da' } as never, U);
    if (!r.ok) throw new Error(r.problem);
    expect(r.answer.text).toBe('3 s');
    expect(r.answer.approximate).toBe(false);
    expect(r.checks[0].pass).toBe(true);
    expect(Math.abs(r.checks[0].residual)).toBeLessThan(1e-9);
  });
  it('P3b impact_velocity roi tu do: 30 m/s', () => {
    const r = computePhysicsQuery(fall45(), { kind: 'impact_velocity', of: 'da', component: 'speed' } as never, U);
    if (!r.ok) throw new Error(r.problem);
    expect(r.answer.approx).toBeCloseTo(30, 8);
    expect(r.answer.text).toBe('30 m/s');
  });
  it('P4 nem ngang: t=4 s, range=80 m, impact=20√5 m/s ≈ 44.7214', () => {
    const t = computePhysicsQuery(nemNgang(), { kind: 'time_to_ground', of: 'vat' } as never, U);
    const rg = computePhysicsQuery(nemNgang(), { kind: 'range', of: 'vat' } as never, U);
    const iv = computePhysicsQuery(nemNgang(), { kind: 'impact_velocity', of: 'vat', component: 'speed' } as never, U);
    if (!t.ok || !rg.ok || !iv.ok) throw new Error('fail');
    expect(t.answer.text).toBe('4 s');
    expect(rg.answer.text).toBe('80 m');
    expect(iv.answer.text).toBe('20√5 m/s');
    expect(iv.answer.approx).toBeCloseTo(20 * Math.sqrt(5), 6);
  });
  it('P5 nem xien 45°: t_bay=2√2 s (LOAI nghiem t=0), range=40 m', () => {
    const t = computePhysicsQuery(nemXien45(), { kind: 'time_to_ground', of: 'bong' } as never, U);
    const rg = computePhysicsQuery(nemXien45(), { kind: 'range', of: 'bong' } as never, U);
    if (!t.ok || !rg.ok) throw new Error('fail');
    expect(t.answer.text).toBe('2√2 s');
    expect(t.answer.approx).toBeCloseTo(2 * Math.SQRT2, 8);
    expect(rg.answer.text).toBe('40 m');
  });
  it('P6a max_height 60°: 15 m + check dinh (v_y(τ*)=0) pass', () => {
    const r = computePhysicsQuery(nemXien60(), { kind: 'max_height', of: 'bong' } as never, U);
    if (!r.ok) throw new Error(r.problem);
    expect(r.answer.text).toBe('15 m');
    expect(r.checks.every((c) => c.pass)).toBe(true);
  });
  it('P6c velocity_at t=1: can LONG nhau → float trung thuc ≈12.3931, approximate:true', () => {
    const r = computePhysicsQuery(nemXien60(), { kind: 'velocity_at', of: 'bong', t: 1, component: 'speed' } as never, U);
    if (!r.ok) throw new Error(r.problem);
    expect(r.answer.approx).toBeCloseTo(12.3931, 3);
    expect(r.answer.approximate).toBe(true);
  });
  it('P7 meet hai xe: t=3/2 h, x=90 km — check "x gap bang nhau" pass', () => {
    const two = map(
      { op: 'mover1d', name: 'oto', x0: 0, v0: 60, a: 0, startAt: 0, axis: 'x' },
      { op: 'mover1d', name: 'khach', x0: 30, v0: 40, a: 0, startAt: 0, axis: 'x' },
    );
    const KM = { length: 'km', time: 'h' };
    const t = computePhysicsQuery(two, { kind: 'meet_time', a: 'oto', b: 'khach' } as never, KM);
    const x = computePhysicsQuery(two, { kind: 'meet_position', a: 'oto', b: 'khach' } as never, KM);
    if (!t.ok || !x.ok) throw new Error('fail');
    expect(t.answer.text).toBe('3/2 h');
    expect(x.answer.text).toBe('90 km');
    expect(t.checks[0].pass).toBe(true);
  });
  it('P8 meet lech gio (startAt=0.5): t=3/2 ≥ 0.5; distance_between_at t=1 = 50 km (xe 2 DA xuat phat)', () => {
    const two = map(
      { op: 'mover1d', name: 'xe1', x0: 0, v0: 40, a: 0, startAt: 0, axis: 'x' },
      { op: 'mover1d', name: 'xe2', x0: 120, v0: -60, a: 0, startAt: 0.5, axis: 'x' },
    );
    const KM = { length: 'km', time: 'h' };
    const t = computePhysicsQuery(two, { kind: 'meet_time', a: 'xe1', b: 'xe2' } as never, KM);
    const d = computePhysicsQuery(two, { kind: 'distance_between_at', a: 'xe1', b: 'xe2', t: 1 } as never, KM);
    if (!t.ok || !d.ok) throw new Error('fail');
    expect(t.answer.approx).toBeCloseTo(1.5, 10);
    expect(d.answer.text).toBe('50 km');
  });
  it('distance_between_at TRUOC khi xe 2 xuat phat: xe 2 dau tai x0 (t=0.25 → |10−120|=110)', () => {
    const two = map(
      { op: 'mover1d', name: 'xe1', x0: 0, v0: 40, a: 0, startAt: 0, axis: 'x' },
      { op: 'mover1d', name: 'xe2', x0: 120, v0: -60, a: 0, startAt: 0.5, axis: 'x' },
    );
    const d = computePhysicsQuery(two, { kind: 'distance_between_at', a: 'xe1', b: 'xe2', t: 0.25 } as never, { length: 'km', time: 'h' });
    if (!d.ok) throw new Error('fail');
    expect(d.answer.approx).toBeCloseTo(110, 10);
  });
  it('P9 time_when NDD: (1/4)t²=100 → 20 s (loai −20)', () => {
    const m = map({ op: 'mover1d', name: 'vat', x0: 0, v0: 0, a: 0.5, startAt: 0, axis: 'x' });
    const r = computePhysicsQuery(m, { kind: 'time_when', of: 'vat', position: 100 } as never, U);
    if (!r.ok) throw new Error(r.problem);
    expect(r.answer.text).toBe('20 s');
  });
  it('loi RO RANG: time_to_ground cua mover1d; max_height khi khong nem len; vat chua khai bao', () => {
    const m = map({ op: 'mover1d', name: 'oto', x0: 0, v0: 60, a: 0, startAt: 0, axis: 'x' });
    const r1 = computePhysicsQuery(m, { kind: 'time_to_ground', of: 'oto' } as never, U);
    expect(r1.ok).toBe(false);
    const r2 = computePhysicsQuery(m, { kind: 'max_height', of: 'oto' } as never, U);
    expect(r2.ok).toBe(false);
    const r3 = computePhysicsQuery(m, { kind: 'position_at', of: 'ma', t: 1 } as never, U);
    expect(r3.ok).toBe(false);
  });
});
```

- [ ] **Step 2: FAIL** — `npx vitest run api/_lib/kernel/physics/__tests__/compute.test.ts`.

- [ ] **Step 3: Viết `compute.ts`:**

```ts
// api/_lib/kernel/physics/compute.ts
// Tầng compute: mỗi query MỘT công thức đóng trên Quad/Scalar (exact-first) + certify bằng bản float
// ĐỘC LẬP + TỰ KIỂM thay-ngược (checks). Không quét lưới — động học lớp 10 nghiệm đóng hết (spec §6–§7).
import { type Scalar, rat, add, sub, mul, div, neg, sqrt as sqrtS, displayScalar, exactToApprox } from '../scalar';
import { recognizeConstant } from '../analysis/recognize';
import {
  type Motion, type Quad, evalQuadS, evalQuadN, derivQuad, expandAbs, subQuad, rootsFor,
  scalarFromNumber, mainAxis,
} from './kinematics';
import type { PhysicsQuery } from './planSchema';

export const EPS_SELF = 1e-6; // thay-ngược: nghiệm đóng residual ~1e-12, công thức sai lệch O(1) — 1e-6 cách cả hai 6 bậc
export const EPS_T = 1e-9;    // ngưỡng miền thời gian

export type Check = { kind: string; detail: string; residual: number; pass: boolean };
export type PhysicsAnswer = { label?: string; kind: string; text: string; approx: number; unit: string; approximate: boolean };
export type QueryOutcome =
  | { ok: true; answer: PhysicsAnswer; checks: Check[]; tSolved?: number }
  | { ok: false; problem: string };
type Units = { length: string; time: string };

const unitOf = (kind: string, u: Units): string =>
  kind === 'velocity_at' || kind === 'impact_velocity' ? `${u.length}/${u.time}`
    : kind === 'time_to_ground' || kind === 'meet_time' || kind === 'time_when' ? u.time
    : u.length;

function fmtNum(x: number): string {
  if (!Number.isFinite(x)) return '(lỗi)';
  const digits = Math.abs(x) >= 1000 ? 2 : 4;
  return parseFloat(x.toFixed(digits)).toString();
}

// Đáp 3 tầng (spec §6.3): exact certify với float độc lập → displayScalar; chết exact → recognize; trượt → thập phân.
function mkAnswer(kind: string, s: Scalar, floatRef: number, unit: string, label?: string): PhysicsAnswer {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol) {
    return { label, kind, text: unit ? `${displayScalar(s)} ${unit}` : displayScalar(s), approx: exactToApprox(s.exact), unit, approximate: false };
  }
  const nice = Number.isFinite(floatRef) ? recognizeConstant(floatRef) : null;
  const numTxt = nice ? nice.text : fmtNum(floatRef);
  return { label, kind, text: unit ? `${numTxt} ${unit}` : numTxt, approx: floatRef, unit, approximate: !nice };
}

const quadOf = (m: Motion, axis: 'x' | 'y'): Quad => (axis === 'x' ? m.x : m.y);
const scaleOf = (q: Quad): number => Math.max(1, Math.abs(q.k0.approx), Math.abs(q.k1.approx), Math.abs(q.k2.approx));

// Nghiệm float ĐỘC LẬP của q(τ)=value (đường certify — không qua số học exact).
function floatRootsFor(q: Quad, value: number): number[] {
  const a = q.k2.approx, b = q.k1.approx, c = q.k0.approx - value;
  if (Math.abs(a) < 1e-15) return Math.abs(b) < 1e-15 ? [] : [-c / b];
  const d = b * b - 4 * a * c;
  if (d < 0) return [];
  const s = Math.sqrt(d);
  return [(-b - s) / (2 * a), (-b + s) / (2 * a)].sort((x, y) => x - y);
}
function pickMin(roots: Scalar[], min: number, exclusive: boolean): Scalar | null {
  for (const r of roots) if (exclusive ? r.approx > min + EPS_T : r.approx >= min - EPS_T) return r;
  return null;
}
const backsub = (kind: string, detail: string, residual: number, scale: number): Check =>
  ({ kind, detail, residual, pass: Math.abs(residual) <= EPS_SELF * scale });

// τ chạm đất: nghiệm NHỎ NHẤT > EPS_T của y(τ)=0 (loại τ=0 khi ném từ mặt đất — spec P5).
export function groundTau(m: Motion): { tau: Scalar; tauN: number } | { problem: string } {
  if (m.op.op === 'mover1d') return { problem: `"${m.name}" là mover1d — time_to_ground/range/impact chỉ dành cho free_fall/projectile` };
  const tau = pickMin(rootsFor(m.y, rat(0n)), 0, true);
  const tauN = floatRootsFor(m.y, 0).filter((t) => t > EPS_T)[0];
  if (!tau || tauN === undefined) return { problem: `"${m.name}" không chạm đất (y(τ)=0 vô nghiệm dương)` };
  return { tau, tauN };
}

// Vị trí theo t TUYỆT ĐỐI, kẹp quy ước "đứng yên tại vị trí đầu trước t0" (spec §6.2).
const posClamped = (m: Motion, axis: 'x' | 'y', tS: Scalar): { s: Scalar; n: number } => {
  const q = quadOf(m, axis);
  if (tS.approx <= m.t0.approx + EPS_T) return { s: evalQuadS(q, rat(0n)), n: evalQuadN(q, 0) };
  const tau = sub(tS, m.t0);
  return { s: evalQuadS(q, tau), n: evalQuadN(q, tau.approx) };
};

export function computePhysicsQuery(motions: Map<string, Motion>, query: PhysicsQuery, units: Units): QueryOutcome {
  const need = (name: string): Motion => {
    const m = motions.get(name);
    if (!m) throw new Error(`Vật "${name}" chưa khai báo trong ops`);
    return m;
  };
  const unit = unitOf(query.kind, units);
  try {
    switch (query.kind) {
      case 'position_at': {
        const m = need(query.of);
        if (query.t < m.t0.approx - EPS_T) return { ok: false, problem: `position_at: t=${query.t} trước lúc xuất phát của "${m.name}"` };
        const q = quadOf(m, query.axis ?? mainAxis(m));
        const tau = sub(scalarFromNumber(query.t), m.t0);
        return { ok: true, answer: mkAnswer(query.kind, evalQuadS(q, tau), evalQuadN(q, tau.approx), unit, query.label), checks: [] };
      }
      case 'velocity_at':
      case 'impact_velocity': {
        const m = need(query.of);
        const checks: Check[] = [];
        let tau: Scalar, tauN: number;
        if (query.kind === 'impact_velocity') {
          const g = groundTau(m);
          if ('problem' in g) return { ok: false, problem: g.problem };
          tau = g.tau; tauN = g.tauN;
          checks.push(backsub('backsub', `y(t_đất)=0 của "${m.name}"`, evalQuadN(m.y, tauN), scaleOf(m.y)));
        } else {
          if (query.t < m.t0.approx - EPS_T) return { ok: false, problem: `velocity_at: t=${query.t} trước lúc xuất phát của "${m.name}"` };
          tau = sub(scalarFromNumber(query.t), m.t0); tauN = tau.approx;
        }
        const dx = derivQuad(m.x), dy = derivQuad(m.y);
        if (query.component === 'x') return { ok: true, answer: mkAnswer(query.kind, evalQuadS(dx, tau), evalQuadN(dx, tauN), unit, query.label), checks };
        if (query.component === 'y') return { ok: true, answer: mkAnswer(query.kind, evalQuadS(dy, tau), evalQuadN(dy, tauN), unit, query.label), checks };
        const vx = evalQuadS(dx, tau), vy = evalQuadS(dy, tau);
        const speed = sqrtS(add(mul(vx, vx), mul(vy, vy)));
        const speedN = Math.hypot(evalQuadN(dx, tauN), evalQuadN(dy, tauN));
        return { ok: true, answer: mkAnswer(query.kind, speed, speedN, unit, query.label), checks };
      }
      case 'time_to_ground': {
        const m = need(query.of);
        const g = groundTau(m);
        if ('problem' in g) return { ok: false, problem: g.problem };
        const checks = [backsub('backsub', `y(t_đất)=0 của "${m.name}"`, evalQuadN(m.y, g.tauN), scaleOf(m.y))];
        return { ok: true, answer: mkAnswer(query.kind, add(m.t0, g.tau), m.t0.approx + g.tauN, unit, query.label), checks, tSolved: m.t0.approx + g.tauN };
      }
      case 'range': {
        const m = need(query.of);
        const g = groundTau(m);
        if ('problem' in g) return { ok: false, problem: g.problem };
        const r = sub(evalQuadS(m.x, g.tau), evalQuadS(m.x, rat(0n)));
        const rN = evalQuadN(m.x, g.tauN) - evalQuadN(m.x, 0);
        const checks = [backsub('backsub', `y(t_đất)=0 của "${m.name}"`, evalQuadN(m.y, g.tauN), scaleOf(m.y))];
        return { ok: true, answer: mkAnswer(query.kind, r, rN, unit, query.label), checks, tSolved: m.t0.approx + g.tauN };
      }
      case 'max_height': {
        const m = need(query.of);
        if (m.y.k2.approx >= -EPS_T) return { ok: false, problem: `max_height: "${m.name}" không có đỉnh (y không phải parabol mở xuống)` };
        const tauStar = neg(div(m.y.k1, mul(rat(2n), m.y.k2)));   // nghiệm v_y(τ*)=0
        if (tauStar.approx < -EPS_T) return { ok: false, problem: 'max_height: đỉnh trước lúc xuất phát (vật không đi lên)' };
        const H = evalQuadS(m.y, tauStar);
        const HN = evalQuadN(m.y, tauStar.approx);
        const dy = derivQuad(m.y);
        const h = Math.max(1e-3, Math.abs(tauStar.approx) * 1e-3);
        const isPeak = HN >= evalQuadN(m.y, tauStar.approx - h) && HN >= evalQuadN(m.y, tauStar.approx + h);
        const checks = [
          backsub('vertex', `v_y(τ*)=0 của "${m.name}"`, evalQuadN(dy, tauStar.approx), scaleOf(dy)),
          { kind: 'peak', detail: 'y(τ*) ≥ y(τ*±h)', residual: isPeak ? 0 : 1, pass: isPeak },
        ];
        return { ok: true, answer: mkAnswer(query.kind, H, HN, unit, query.label), checks, tSolved: m.t0.approx + tauStar.approx };
      }
      case 'meet_time':
      case 'meet_position': {
        const ma = need(query.a), mb = need(query.b);
        const axis: 'x' | 'y' = mainAxis(ma) === 'y' && mainAxis(mb) === 'y' ? 'y' : 'x';
        const qa = expandAbs(quadOf(ma, axis), ma.t0);
        const qb = expandAbs(quadOf(mb, axis), mb.t0);
        const tMin = Math.max(ma.t0.approx, mb.t0.approx);
        const t = pickMin(rootsFor(subQuad(qa, qb), rat(0n)), tMin, false);
        const tN = floatRootsFor(subQuad(qa, qb), 0).filter((r) => r >= tMin - EPS_T)[0];
        if (!t || tN === undefined) return { ok: false, problem: `"${query.a}" và "${query.b}" không gặp nhau sau khi cả hai xuất phát` };
        const resid = evalQuadN(qa, tN) - evalQuadN(qb, tN); // "x gặp của 2 xe bằng nhau"
        const checks = [backsub('backsub', `pos_${query.a}(t_gặp) = pos_${query.b}(t_gặp)`, resid, Math.max(scaleOf(qa), scaleOf(qb)))];
        if (query.kind === 'meet_time') return { ok: true, answer: mkAnswer(query.kind, t, tN, unit, query.label), checks, tSolved: tN };
        return { ok: true, answer: mkAnswer(query.kind, evalQuadS(qa, t), evalQuadN(qa, tN), unit, query.label), checks, tSolved: tN };
      }
      case 'distance_between_at': {
        const ma = need(query.a), mb = need(query.b);
        const tS = scalarFromNumber(query.t);
        const ax = posClamped(ma, 'x', tS), bx = posClamped(mb, 'x', tS);
        const ay = posClamped(ma, 'y', tS), by = posClamped(mb, 'y', tS);
        const dxS = sub(ax.s, bx.s), dyS = sub(ay.s, by.s);
        const dist = sqrtS(add(mul(dxS, dxS), mul(dyS, dyS)));
        return { ok: true, answer: mkAnswer(query.kind, dist, Math.hypot(ax.n - bx.n, ay.n - by.n), unit, query.label), checks: [] };
      }
      case 'time_when': {
        const m = need(query.of);
        const q = quadOf(m, query.axis ?? mainAxis(m));
        const tau = pickMin(rootsFor(q, scalarFromNumber(query.position)), 0, false);
        const tauN = floatRootsFor(q, query.position).filter((r) => r >= -EPS_T)[0];
        if (!tau || tauN === undefined) return { ok: false, problem: `time_when: "${m.name}" không bao giờ tới vị trí ${query.position}` };
        const checks = [backsub('backsub', `coord(t) = ${query.position} của "${m.name}"`, evalQuadN(q, tauN) - query.position, scaleOf(q))];
        return { ok: true, answer: mkAnswer(query.kind, add(m.t0, tau), m.t0.approx + tauN, unit, query.label), checks, tSolved: m.t0.approx + tauN };
      }
    }
  } catch (e) {
    return { ok: false, problem: (e as Error).message };
  }
}
```

- [ ] **Step 4: PASS** — `npx vitest run api/_lib/kernel/physics/__tests__/compute.test.ts` (12 test). Nếu text căn lệch (vd "2√2" vs "2√2 s"): sửa TEST theo format engine CHỈ khi đối chiếu tay xác nhận trị số đúng — không nới công thức.

- [ ] **Step 5: Commit** — `git add -A api/_lib/kernel/physics && git commit -m "feat(physics): compute — 10 query cong thuc dong + certify + tu kiem thay-nguoc"`

---

### Task 3: `runPhysics.ts` — entry + asserts khai báo (chưa scene)

**Files:** Create `runPhysics.ts`; Test `__tests__/runPhysics.test.ts`

- [ ] **Step 1: Test thất bại:**

```ts
import { describe, it, expect } from 'vitest';
import { runPhysics } from '../runPhysics';

const planP7 = (extra: object = {}) => ({
  problemName: 'hai-xe', units: { length: 'km', time: 'h' },
  ops: [
    { op: 'mover1d', name: 'oto', x0: 0, v0: 60 },
    { op: 'mover1d', name: 'khach', x0: 30, v0: 40 },
  ],
  queries: [
    { kind: 'meet_time', a: 'oto', b: 'khach', label: 'a' },
    { kind: 'meet_position', a: 'oto', b: 'khach', label: 'b' },
  ],
  ...extra,
});

describe('runPhysics', () => {
  it('P7: 2 dap theo thu tu queries, don vi dung, ok:true, checks pass', () => {
    const r = runPhysics(planP7());
    expect(r.ok).toBe(true);
    expect(r.answers.map((a) => a.text)).toEqual(['3/2 h', '90 km']);
    expect(r.answers[0].label).toBe('a');
    expect(r.checks.length).toBeGreaterThan(0);
    expect(r.checks.every((c) => c.pass)).toBe(true);
    expect(r.meta.tPhys).toBeCloseTo(1.5, 10);
  });
  it('assert du kien DU khop → ok giu true; sai → violations + ok:false (khong serve dap sai)', () => {
    const good = runPhysics(planP7({ asserts: [{ query: { kind: 'position_at', of: 'oto', t: 1 }, equals: 60 }] }));
    expect(good.ok).toBe(true);
    expect(good.violations).toHaveLength(0);
    const bad = runPhysics(planP7({ asserts: [{ query: { kind: 'position_at', of: 'oto', t: 1 }, equals: 75 }] }));
    expect(bad.ok).toBe(false);
    expect(bad.violations).toHaveLength(1);
    expect(bad.violations[0]).toMatchObject({ expected: 75 });
  });
  it('query khong tinh duoc → errors + ok:false, cac query khac van tra dap', () => {
    const r = runPhysics(planP7({ queries: [
      { kind: 'meet_time', a: 'oto', b: 'khach' },
      { kind: 'time_to_ground', of: 'oto' },   // mover1d không có
    ] }));
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.answers).toHaveLength(1);
  });
  it('plan sai schema → ok:false + message ro (khong nem)', () => {
    const r = runPhysics({ problemName: 'x', ops: [], queries: [] });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toContain('Invalid physics plan');
  });
  it('hai vat trung ten → error', () => {
    const r = runPhysics(planP7({ ops: [
      { op: 'mover1d', name: 'oto', x0: 0, v0: 60 },
      { op: 'mover1d', name: 'oto', x0: 30, v0: 40 },
    ] }));
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: FAIL** — `npx vitest run api/_lib/kernel/physics/__tests__/runPhysics.test.ts`.

- [ ] **Step 3: Viết `runPhysics.ts`** (Task 4 sẽ gắn scene — chỗ đó để placeholder có chú thích):

```ts
// api/_lib/kernel/physics/runPhysics.ts
// Entry Vật lý — soi gương runAnalysis: schema riêng, compute riêng, KHÔNG đụng run()/core.
// LLM chỉ DỊCH đề → plan; engine TÍNH đóng + TỰ KIỂM; sai mô hình → violations, không bịa đáp.
import { PhysicsPlanSchema } from './planSchema';
import { motionOf, type Motion } from './kinematics';
import { computePhysicsQuery, groundTau, type Check, type PhysicsAnswer } from './compute';

export const TOL_ASSERT = 1e-3; // dữ kiện đề làm tròn 2–3 chữ số có nghĩa (spec §7.3); LLM override được qua asserts[].tol

export type PhysicsResult = {
  ok: boolean;
  answers: PhysicsAnswer[];
  checks: Check[];
  violations: { assert: string; expected: number; got: number; delta: number }[];
  errors: { message: string }[];
  geometry: unknown | null;
  charts: unknown[];
  meta: { tPhys: number; playback: { durationSec: number; timeScale: number }; units: { length: string; time: string } };
};

export function runPhysics(raw: unknown): PhysicsResult {
  const parsed = PhysicsPlanSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, answers: [], checks: [], violations: [],
      errors: [{ message: `Invalid physics plan: ${parsed.error.issues[0]?.message ?? 'schema'}` }],
      geometry: null, charts: [], meta: { tPhys: 0, playback: { durationSec: 0, timeScale: 0 }, units: { length: 'm', time: 's' } } };
  }
  const plan = parsed.data;
  const errors: { message: string }[] = [];
  const motions = new Map<string, Motion>();
  for (const op of plan.ops) {
    if (motions.has(op.name)) errors.push({ message: `Vật "${op.name}" khai báo 2 lần` });
    else motions.set(op.name, motionOf(op));
  }

  // 1) Queries — công thức đóng + tự kiểm thay-ngược; check fail cũng đổ vào errors (không serve-sai)
  const answers: PhysicsAnswer[] = [];
  const checks: Check[] = [];
  const events: { t: number; label: string }[] = [];
  for (const q of plan.queries) {
    const r = computePhysicsQuery(motions, q, plan.units);
    if (!r.ok) { errors.push({ message: `query ${q.kind}: ${r.problem}` }); continue; }
    answers.push(r.answer);
    checks.push(...r.checks);
    if (r.tSolved !== undefined) events.push({ t: r.tSolved, label: ('label' in q && q.label) || q.kind });
    for (const c of r.checks) if (!c.pass) errors.push({ message: `tự kiểm FAIL: ${c.detail} (residual ${c.residual.toExponential(2)})` });
  }

  // 2) Asserts khai báo (dữ kiện DƯ của đề) → lệch quá tol ⇒ violations (mô hình dịch sai đề)
  const violations: PhysicsResult['violations'] = [];
  for (const a of plan.asserts) {
    const r = computePhysicsQuery(motions, a.query, plan.units);
    if (!r.ok) { errors.push({ message: `assert ${a.query.kind}: ${r.problem}` }); continue; }
    const tol = (a.tol ?? TOL_ASSERT) * Math.max(1, Math.abs(a.equals));
    const delta = Math.abs(r.answer.approx - a.equals);
    if (delta > tol) violations.push({ assert: a.query.kind, expected: a.equals, got: r.answer.approx, delta });
  }

  // 3) Chân trời vật lý T_phys (spec §8.2): mọi t trong queries + đáp thời gian + t_đất mỗi vật rơi; tối thiểu 1
  let tPhys = 1;
  for (const q of plan.queries) if ('t' in q && typeof (q as { t?: number }).t === 'number') tPhys = Math.max(tPhys, (q as { t: number }).t);
  for (const e of events) tPhys = Math.max(tPhys, e.t);
  motions.forEach((m) => {
    if (m.op.op !== 'mover1d') {
      const g = groundTau(m);
      if (!('problem' in g)) tPhys = Math.max(tPhys, m.t0.approx + g.tauN);
    }
  });

  // 4) Scene + charts — Task 4 gắn buildScene/buildCharts vào đây (placeholder để test Task 3 xanh)
  const geometry: unknown | null = null;
  const charts: unknown[] = [];
  const playback = { durationSec: 0, timeScale: 0 };

  const ok = violations.length === 0 && errors.length === 0
    && answers.length === plan.queries.length && answers.every((a) => Number.isFinite(a.approx));
  return { ok, answers, checks, violations, errors, geometry, charts, meta: { tPhys, playback, units: plan.units } };
}
```

- [ ] **Step 4: PASS** — `npx vitest run api/_lib/kernel/physics/__tests__/runPhysics.test.ts` (5 test).

- [ ] **Step 5: Commit** — `git add -A api/_lib/kernel/physics && git commit -m "feat(physics): runPhysics — entry + asserts du kien du + T_phys"`

---

### Task 4: `scene.ts` — agents/timeline/quỹ đạo + charts, gắn vào runPhysics

**Files:** Create `scene.ts`; Modify `runPhysics.ts` (mục 4); Test `__tests__/scene.test.ts`

- [ ] **Step 1: Test thất bại** (khoá đúng 3 quirk AnimatedAgent + quy tắc playback spec §8):

```ts
import { describe, it, expect } from 'vitest';
import { runPhysics } from '../runPhysics';
import type { GeometryData } from '../../../../../src/types/geometry';

const planP6 = {
  problemName: 'nem-xien-60', ops: [{ op: 'projectile', name: 'bong', h0: 0, v0: 20, angleDeg: 60, g: 10 }],
  queries: [{ kind: 'range', of: 'bong' }],
  scene: { labels: { bong: 'Quả bóng' } },
};
const planP8 = {
  problemName: 'hai-xe-nguoc', units: { length: 'km', time: 'h' },
  ops: [
    { op: 'mover1d', name: 'xe1', x0: 0, v0: 40 },
    { op: 'mover1d', name: 'xe2', x0: 120, v0: -60, startAt: 0.5 },
  ],
  queries: [{ kind: 'meet_time', a: 'xe1', b: 'xe2' }],
};

describe('scene — khop AnimatedAgent + quy tac playback', () => {
  it('P6: T=2√3∈[3,15] va don vi s → k=1, duration=T; path dung t*t; landing_point = cham dat', () => {
    const r = runPhysics(planP6);
    const g = r.geometry as GeometryData;
    expect(r.meta.playback.timeScale).toBeCloseTo(1, 10);
    expect(g.timeline!.duration).toBeCloseTo(2 * Math.sqrt(3), 4);
    const tr = g.timeline!.tracks[0];
    expect(tr.type).toBe('parametric_path');
    expect(tr.targetId).toBe('bong');
    const eq = tr.params.equations as { x: string; y: string; z: string };
    expect(eq.x).toBe('0 + 10*t');            // AnimatedAgent ưu tiên equations (không split chuỗi)
    expect(eq.y).toBe('0');                   // geo3d: y=0, độ cao nằm ở z
    expect(eq.z).toContain('t*t');            // KHÔNG t^2 (AnimatedAgent replace 1 lần)
    expect(eq.z).not.toContain('t^2');
    const path = tr.params.path as string;    // path dự phòng vẫn phát, cùng nội dung
    expect(path).toContain('x(t) = 0 + 10*t');
    expect(path).toContain('t*t');
    const lp = tr.params.landing_point as number[];
    expect(lp[0]).toBeCloseTo(20 * Math.sqrt(3), 3);
    expect(lp[1]).toBe(0);
    expect(lp[2]).toBeCloseTo(0, 6);
    expect(g.agents![0]).toMatchObject({ id: 'bong', label: 'Quả bóng', initialPosition: [0, 0, 0] });
  });
  it('P6: co quy dao dashed plane xz, mau dau = (0,0), mau cuoi ≈ (20√3, 0), dinh ≈ 15', () => {
    const g = runPhysics(planP6).geometry as GeometryData;
    const c = g.curves!.find((x) => x.id === 'traj_bong')!;
    expect(c.plane).toBe('xz');
    expect(c.style).toBe('dashed');
    const s = c.samples!;
    expect(s[0]).toEqual({ x: 0, y: 0 });
    expect(s[s.length - 1].x).toBeCloseTo(20 * Math.sqrt(3), 3);
    expect(Math.max(...s.map((p) => p.y))).toBeCloseTo(15, 1);
  });
  it('P8: gio → nen ve 10 s: k=0.15, track xe2 start=0.5/0.15≈3.333, he so path nhan k (40·0.15=6)', () => {
    const r = runPhysics(planP8);
    const g = r.geometry as GeometryData;
    expect(r.meta.playback).toMatchObject({ durationSec: 10 });
    expect(r.meta.playback.timeScale).toBeCloseTo(0.15, 10);
    const t2 = g.timeline!.tracks.find((t) => t.targetId === 'xe2')!;
    expect(t2.start).toBeCloseTo(0.5 / 0.15, 3);
    const t1 = g.timeline!.tracks.find((t) => t.targetId === 'xe1')!;
    expect(t1.params.path).toContain('x(t) = 0 + 6*t');
    expect(t1.params.landing_point).toBeDefined();  // mover1d cũng phải có (chống nhảy-về-đầu)
    expect(g.axisUnit).toBe('km');
    expect(g.tags).toContain('physics');
  });
  it('charts x_t/v_t: du lieu mau + events (khong dung chart UI)', () => {
    const r = runPhysics({ ...planP8, charts: [{ kind: 'x_t', of: ['xe1', 'xe2'] }, { kind: 'v_t', of: ['xe1'] }] });
    const xt = (r.charts as { kind: string; series: { name: string; samples: [number, number][] }[]; events: { t: number }[] }[])
      .find((c) => c.kind === 'x_t')!;
    const xe1 = xt.series.find((s) => s.name === 'xe1')!;
    expect(xe1.samples[0]).toEqual([0, 0]);
    expect(xe1.samples[xe1.samples.length - 1][0]).toBeCloseTo(1.5, 6);  // tới T_phys = t_gặp
    expect(xe1.samples[xe1.samples.length - 1][1]).toBeCloseTo(60, 6);   // x(1.5)=60
    const xe2 = xt.series.find((s) => s.name === 'xe2')!;
    expect(xe2.samples[0][0]).toBeCloseTo(0.5, 10);                       // xe 2 vẽ từ lúc xuất phát
    expect(xt.events.some((e) => Math.abs(e.t - 1.5) < 1e-6)).toBe(true);
    const vt = (r.charts as { kind: string; series: { samples: [number, number][] }[] }[]).find((c) => c.kind === 'v_t')!;
    expect(vt.series[0].samples).toHaveLength(2);                         // v hằng → 2 mẫu
    expect(vt.series[0].samples[0][1]).toBeCloseTo(40, 10);
  });
});
```

- [ ] **Step 2: FAIL** — `npx vitest run api/_lib/kernel/physics/__tests__/scene.test.ts`.

- [ ] **Step 3: Viết `scene.ts`:**

```ts
// api/_lib/kernel/physics/scene.ts
// Trình bày (không ảnh hưởng đáp): Motion[] → GeometryData (mốc + mặt đất + quỹ đạo + agents +
// timeline parametric_path) + dữ liệu đồ thị x-t/v-t. 3 quy ước khớp AnimatedAgent.tsx (spec §8):
// (1) path dùng `t*t`; (2) landing_point BẮT BUỘC mọi track; (3) trục đứng vật lý → z geo3d, y geo3d = 0.
// Path theo GIÂY PLAYBACK kể từ track.start: hệ số bậc 1 nhân k, bậc 2 nhân k² (k = timeScale).
import type { GeometryData, Point3D, Line3D, Curve3D, Agent3D, AnimationTimeline } from '../../../../src/types/geometry';
import { type Motion, type Quad, evalQuadN, derivQuad, mainAxis } from './kinematics';
import { groundTau } from './compute';
import type { PhysicsPlan } from './planSchema';

const COLORS = ['#FFA500', '#38BDF8', '#F472B6', '#4ADE80'];
const fmt = (n: number): string => parseFloat(n.toFixed(6)).toString();

export type PhysicsChart = {
  kind: 'x_t' | 'v_t'; tUnit: string; vUnit: string;
  series: { name: string; samples: [number, number][] }[];
  events: { t: number; label: string }[];
};

// Quy tắc playback (spec §8.2): giây thật khi units.time='s' và 3 ≤ T ≤ 15; ngoài ra nén/kéo về 10 s.
export function playbackOf(plan: PhysicsPlan, tPhys: number): { durationSec: number; timeScale: number } {
  if (plan.scene.durationSec) return { durationSec: plan.scene.durationSec, timeScale: tPhys / plan.scene.durationSec };
  if (plan.units.time === 's' && tPhys >= 3 && tPhys <= 15) return { durationSec: tPhys, timeScale: 1 };
  return { durationSec: 10, timeScale: tPhys / 10 };
}

export function buildScene(
  plan: PhysicsPlan, motions: Map<string, Motion>, tPhys: number,
): { geometry: GeometryData | null; playback: { durationSec: number; timeScale: number } } {
  const playback = playbackOf(plan, tPhys);
  if (motions.size === 0) return { geometry: null, playback };
  const k = playback.timeScale;

  type Item = { m: Motion; tEnd: number; falling: boolean; x0: number; y0: number; xEnd: number; yEnd: number };
  const items: Item[] = [];
  motions.forEach((m) => {
    const g = m.op.op === 'mover1d' ? null : groundTau(m);
    const falling = g !== null && !('problem' in g);
    const tauEnd = falling ? (g as { tauN: number }).tauN : Math.max(0, tPhys - m.t0.approx);
    items.push({
      m, falling, tEnd: m.t0.approx + tauEnd,
      x0: evalQuadN(m.x, 0), y0: evalQuadN(m.y, 0),
      xEnd: evalQuadN(m.x, tauEnd), yEnd: evalQuadN(m.y, tauEnd),
    });
  });

  // Khung cảnh: gom mốc x/y (kể cả đỉnh parabol) → span, mặt đất, bán kính agent
  let xMin = Infinity, xMax = -Infinity, yTop = 0;
  for (const it of items) {
    xMin = Math.min(xMin, it.x0, it.xEnd); xMax = Math.max(xMax, it.x0, it.xEnd);
    yTop = Math.max(yTop, it.y0, it.yEnd);
    if (it.m.y.k2.approx < 0) {
      const tauStar = -it.m.y.k1.approx / (2 * it.m.y.k2.approx);
      if (tauStar > 0 && it.m.t0.approx + tauStar <= it.tEnd + 1e-9) yTop = Math.max(yTop, evalQuadN(it.m.y, tauStar));
    }
  }
  const span = Math.max(1, xMax - xMin, yTop);
  const margin = Math.max(0.5, 0.05 * span);
  const radius = Math.max(0.12, 0.02 * span);

  const points: Point3D[] = [
    { id: 'G0', label: '', x: xMin - margin, y: 0, z: 0 },
    { id: 'G1', label: '', x: xMax + margin, y: 0, z: 0 },
  ];
  const lines: Line3D[] = [{ id: 'ground', from: 'G0', to: 'G1', style: 'solid', color: '#8B8B8B' }];
  const curves: Curve3D[] = [];
  const agents: Agent3D[] = [];
  const tracks: AnimationTimeline['tracks'] = [];

  let ci = 0;
  for (const it of items) {
    const { m } = it;
    const color = COLORS[ci++ % COLORS.length];
    const label = plan.scene.labels?.[m.name] ?? m.name;
    points.push({ id: `${m.name}0`, label: `${label} (xuất phát)`, x: it.x0, y: 0, z: it.y0 });
    if (it.falling) {
      points.push({ id: `${m.name}_dat`, label: 'Chạm đất', x: it.xEnd, y: 0, z: 0 });
      const N = 32, tauEnd = it.tEnd - m.t0.approx;
      const samples: { x: number; y: number }[] = [];
      for (let i = 0; i <= N; i++) {
        const tau = (tauEnd * i) / N;
        samples.push({ x: evalQuadN(m.x, tau), y: evalQuadN(m.y, tau) });
      }
      curves.push({ id: `traj_${m.name}`, type: 'expr', plane: 'xz', style: 'dashed', color, samples });
    }
    agents.push({ id: m.name, label, initialPosition: [it.x0, 0, it.y0], color, radius });
    // VẾ PHẢI biểu thức theo GIÂY PLAYBACK kể từ track.start: bậc 1 nhân k, bậc 2 nhân k². t*t — KHÔNG t^2.
    const rhs = (q: Quad): string => {
      const c0 = q.k0.approx, c1 = q.k1.approx * k, c2 = q.k2.approx * k * k;
      let s = fmt(c0);
      if (c1 !== 0) s += ` + ${fmt(c1)}*t`;
      if (c2 !== 0) s += ` + ${fmt(c2)}*t*t`;
      return s;
    };
    tracks.push({
      id: `mv_${m.name}`, start: m.t0.approx / k, end: it.tEnd / k, type: 'parametric_path', targetId: m.name,
      params: {
        // AnimatedAgent ưu tiên equations (không split chuỗi); path giữ làm dự phòng + debug (format kinematic đã render).
        equations: { x: rhs(m.x), y: '0', z: rhs(m.y) },
        path: `x(t) = ${rhs(m.x)}, y(t) = 0, z(t) = ${rhs(m.y)}`,
        landing_point: [it.xEnd, 0, it.yEnd],   // BẮT BUỘC: thiếu là agent nhảy về vị trí đầu sau track.end
        timeScale: k,
      },
    });
  }

  const geometry: GeometryData = {
    name: plan.problemName, axisUnit: plan.units.length,
    tags: ['physics', `timeScale:${fmt(k)}`],
    points, lines, curves, agents,
    timeline: { duration: playback.durationSec, tracks },
  };
  return { geometry, playback };
}

export function buildCharts(
  plan: PhysicsPlan, motions: Map<string, Motion>, tPhys: number, events: { t: number; label: string }[],
): PhysicsChart[] {
  const out: PhysicsChart[] = [];
  for (const ch of plan.charts) {
    const series: PhysicsChart['series'] = [];
    for (const name of ch.of) {
      const m = motions.get(name);
      if (!m) continue;
      const base = mainAxis(m) === 'y' ? m.y : m.x;
      const q = ch.kind === 'x_t' ? base : derivQuad(base);
      const t0 = m.t0.approx;
      const N = Math.abs(q.k2.approx) < 1e-15 ? 1 : 64;   // tuyến tính → 2 mẫu là đủ
      const samples: [number, number][] = [];
      for (let i = 0; i <= N; i++) {
        const t = t0 + ((tPhys - t0) * i) / N;
        samples.push([t, evalQuadN(q, t - t0)]);
      }
      series.push({ name, samples });
    }
    out.push({
      kind: ch.kind, tUnit: plan.units.time,
      vUnit: ch.kind === 'x_t' ? plan.units.length : `${plan.units.length}/${plan.units.time}`,
      series, events,
    });
  }
  return out;
}
```

- [ ] **Step 4: Gắn vào `runPhysics.ts`** — thay khối placeholder mục 4 bằng:

```ts
import { buildScene, buildCharts } from './scene';   // (đưa lên đầu file)
// ...
const { geometry, playback } = buildScene(plan, motions, tPhys);
const charts = buildCharts(plan, motions, tPhys, events);
```
và dùng `playback` trong `meta` (bỏ placeholder `{durationSec: 0, timeScale: 0}`).

- [ ] **Step 5: PASS** — `npx vitest run api/_lib/kernel/physics/__tests__/scene.test.ts` (4 test) rồi `npx vitest run api/_lib/kernel/physics` (toàn bộ physics xanh — test Task 3 không được vỡ vì meta.playback đổi: test đó không assert playback).

- [ ] **Step 6: Commit** — `git add -A api/_lib/kernel/physics && git commit -m "feat(physics): scene — agents/timeline/quy dao + charts x-t v-t (khop AnimatedAgent)"`

---

### Task 5: Contract 10 bài SGK (spec §10) — khoá đáp tính tay

**Files:** Test `__tests__/physics-contract.test.ts`

- [ ] **Step 1: Viết 10 test từ spec §10** — MỖI bài một `it`, plan CHÉP NGUYÊN từ spec, expect đúng bảng "Kỳ vọng". Khung + 3 bài mẫu (P1, P6, P10) — 7 bài còn lại (P2,P3,P4,P5,P7,P8,P9) làm y hệt theo spec:

```ts
import { describe, it, expect } from 'vitest';
import { runPhysics } from '../runPhysics';

const texts = (r: ReturnType<typeof runPhysics>) => r.answers.map((a) => a.text);

describe('Physics contract — 10 bai SGK (spec §10, dap tinh tay)', () => {
  it('P1 thang deu: 90 km; 5/2 h', () => {
    const r = runPhysics({
      problemName: 'oto-thang-deu', units: { length: 'km', time: 'h' },
      ops: [{ op: 'mover1d', name: 'oto', x0: 0, v0: 60 }],
      queries: [
        { kind: 'position_at', of: 'oto', t: 1.5, label: 'a' },
        { kind: 'time_when', of: 'oto', position: 150, label: 'b' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['90 km', '5/2 h']);
    expect(r.answers[1].approx).toBeCloseTo(2.5, 10);
  });

  it('P6 nem xien 60° KET HOP: 15 m; 20√3 m; ≈12.3931 m/s (approximate)', () => {
    const r = runPhysics({
      problemName: 'nem-xien-60-ket-hop',
      ops: [{ op: 'projectile', name: 'bong', h0: 0, v0: 20, angleDeg: 60, g: 10 }],
      queries: [
        { kind: 'max_height', of: 'bong', label: 'a' },
        { kind: 'range', of: 'bong', label: 'b' },
        { kind: 'velocity_at', of: 'bong', t: 1, label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.answers[0].text).toBe('15 m');
    expect(r.answers[1].text).toBe('20√3 m');
    expect(r.answers[1].approx).toBeCloseTo(20 * Math.sqrt(3), 6);
    expect(r.answers[2].approx).toBeCloseTo(12.3931, 3);
    expect(r.answers[2].approximate).toBe(true);
    expect(r.checks.every((c) => c.pass)).toBe(true);
  });

  it('P10 nem xien tu do cao 15 m: (1+√13)/2 s qua recognize; ≈19.9426 m float; impact 20 m/s', () => {
    const r = runPhysics({
      problemName: 'nem-xien-tu-do-cao',
      ops: [{ op: 'projectile', name: 'bong', x0: 0, h0: 15, v0: 10, angleDeg: 30, g: 10 }],
      queries: [
        { kind: 'time_to_ground', of: 'bong', label: 'a' },
        { kind: 'range', of: 'bong', label: 'b' },
        { kind: 'impact_velocity', of: 'bong', label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.answers[0].approx).toBeCloseTo((1 + Math.sqrt(13)) / 2, 6);
    expect(r.answers[0].text).toBe('1/2 + √13/2 s');   // solver rơi float → recognize dựng lại dạng đẹp
    expect(r.answers[0].approximate).toBe(false);
    expect(r.answers[1].approx).toBeCloseTo(19.9426, 3);
    expect(r.answers[1].approximate).toBe(true);       // (5√3+5√39)/2 — hai căn, thập phân trung thực
    expect(r.answers[2].text).toBe('20 m/s');          // √(75+325)=20 — recognize bắt lại từ float
  });

  // ... P2, P3, P4, P5, P7, P8, P9 — chép plan + kỳ vọng từ spec §10:
  // P2: ['20 m/s', '75 m']   P3: ['3 s', '30 m/s']   P4: ['4 s', '80 m', '20√5 m/s']
  // P5: ['2√2 s', '40 m']    P7: ['3/2 h', '90 km']  P8: ['3/2 h', '60 km', '50 km']
  // P9: ['20 s']
});
```

- [ ] **Step 2: Chạy** — `npx vitest run api/_lib/kernel/physics/__tests__/physics-contract.test.ts` → 10 test PASS. Bài nào lệch: đối chiếu lại "Tính tay" trong spec §10 TRƯỚC, sửa code (không sửa đáp kỳ vọng — đáp là hợp đồng).

- [ ] **Step 3: Commit** — `git add -A api/_lib/kernel/physics && git commit -m "test(physics): contract 10 bai SGK dong hoc — dap tinh tay tu spec"`

---

### Task 6: Chốt — toàn suite + kiểm ranh giới

- [ ] **Step 1: Toàn bộ test** — `npx vitest run 2>&1 | tail -5` → kỳ vọng **1072 cũ + ~41 mới ≈ 1113, tất cả xanh** (số mới: T1=10, T2=12, T3=5, T4=4, T5=10).

- [ ] **Step 2: Kiểm ranh giới additive** — `git status --short` + `git diff --stat main...HEAD` chỉ được thấy:
  - `api/_lib/kernel/physics/**` (mới) và 2 file docs (spec + plan này).
  - KHÔNG có `run.ts`, `planSchema.ts` gốc, `index.ts`, `package.json`, `vitest.config.ts`, `src/**`, `kernel-dist`.
  (Không cần `npm run build:kernel` — index.ts không đổi nên kernel-dist không đổi.)

- [ ] **Step 3: Smoke tay 1 bài qua node** (kiểm import path ESM/TS chạy ngoài vitest không cần — engine v0 chỉ sống trong test; ghi nhận vào Findings là đủ).

- [ ] **Step 4: Cập nhật Findings** (cuối file này): đáp 10 bài, số test, lệch gì so spec (nếu có).

- [ ] **Step 5: HỎI user trước khi gộp main.** Việc v1 (KHÔNG tự làm): export `runPhysics` qua `index.ts`, bridge + few-shot translator (`physicsPrompt`), route, chart UI.

---

## Self-Review (điền khi xong)

- **Spec coverage:** schema §5 / compute §6 / tự kiểm §7 / scene §8 / 10 bài §10 — mỗi mục chỉ ra task phủ.
- **Placeholder scan:** không TBD; mọi step có code/lệnh thật; 7 bài contract còn lại phải CHÉP TỪ SPEC, không tự chế số.
- **Type consistency:** `motionOf/evalQuadS/rootsFor` (kinematics) ↔ `computePhysicsQuery` (compute) ↔ `runPhysics` ↔ `buildScene/buildCharts` (scene) — chữ ký khớp giữa các task; `Check/PhysicsAnswer` dùng chung từ compute.
- **Ranh giới:** git diff chỉ có `physics/**` + docs.

## Findings

(để trống — người thực thi điền)
