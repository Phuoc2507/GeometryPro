// api/_lib/kernel/physics/kinematics.ts
// THUẦN: động học lớp 10 = đa thức bậc ≤ 2 theo t trên MỖI trục, hệ số Scalar (exact-first).
// f(τ) = k0 + k1·τ + k2·τ², τ = t − t0. KHÔNG đụng run()/core — chỉ dùng scalar + solver1d.
import { type Scalar, num, rat, fromExact, makeExact, add, sub, mul, div, neg } from '../scalar';
import { solveQuadratic } from '../analysis/solver1d';
import type { PhysicsOp } from './planSchema';

export type Quad = { k0: Scalar; k1: Scalar; k2: Scalar };
export type Motion = { name: string; t0: Scalar; x: Quad; y: Quad; op: PhysicsOp };
export type BaseUnits = { length: string; time: string };

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

// ── F2/D1: đổi đơn vị per-quantity → hệ nền, HỮU TỈ EXACT ─────────────────────
// Bảng factor unit→SI: value_nền = value × factor(unit) ÷ factor(nền), toàn bộ trên Rational
// (54 km/h nền m/s → 54·(5/18) = 15 EXACT; 30 min nền h → 30·60/3600 = 1/2 EXACT).
// Không khai unit ⇒ số hiểu theo hệ nền (không đổi). Unit/nền ngoài bảng ⇒ throw thông điệp
// rõ — computePhysicsQuery/runPhysics bắt thành lỗi có cấu trúc, KHÔNG đoán.
const LEN_TO_SI: Record<string, Scalar> = { m: rat(1n), km: rat(1000n) };
const TIME_TO_SI: Record<string, Scalar> = { s: rat(1n), min: rat(60n), h: rat(3600n) };
const VEL_TO_SI: Record<string, Scalar> = { 'm/s': rat(1n), 'km/h': rat(5n, 18n) };

function convertQty(
  value: number, unit: string | undefined, baseUnit: string,
  table: Record<string, Scalar>, dim: string,
): Scalar {
  const v = scalarFromNumber(value);
  if (unit === undefined || unit === baseUnit) return v; // không khai / trùng nền ⇒ giữ nguyên
  const fu = table[unit];
  if (!fu) throw new Error(`đơn vị ${dim} "${unit}" ngoài bảng đổi (${Object.keys(table).join(', ')})`);
  const fb = table[baseUnit];
  if (!fb) {
    throw new Error(
      `hệ nền ${dim} "${baseUnit}" ngoài bảng đổi (${Object.keys(table).join(', ')}) — không đổi được "${unit}"`,
    );
  }
  return mul(v, div(fu, fb));
}

export const qtyLength = (value: number, unit: string | undefined, base: BaseUnits): Scalar =>
  convertQty(value, unit, base.length, LEN_TO_SI, 'độ dài');
export const qtyTime = (value: number, unit: string | undefined, base: BaseUnits): Scalar =>
  convertQty(value, unit, base.time, TIME_TO_SI, 'thời gian');
export const qtyVelocity = (value: number, unit: string | undefined, base: BaseUnits): Scalar =>
  convertQty(value, unit, `${base.length}/${base.time}`, VEL_TO_SI, 'vận tốc');

// cos/sin EXACT cho góc đẹp; góc khác rơi về float (đáp cuối qua recognize). Độ→radian là việc NỘI BỘ.
// F11/C8: góc âm {−30,−45,−60,−90} qua đối xứng sin(−θ) = −sin θ, cos(−θ) = cos θ trên bảng góc dương;
// cos(±90) = 0 EXACT (không phải float ~6e-17 của Math.cos).
const EXACT_TRIG: Record<number, { cos: Scalar; sin: Scalar }> = {
  0: { cos: rat(1n), sin: rat(0n) },
  30: { cos: fromExact(makeExact(1n, 2n, 3)), sin: rat(1n, 2n) },
  45: { cos: fromExact(makeExact(1n, 2n, 2)), sin: fromExact(makeExact(1n, 2n, 2)) },
  60: { cos: rat(1n, 2n), sin: fromExact(makeExact(1n, 2n, 3)) },
  90: { cos: rat(0n), sin: rat(1n) },
};
export function trigOf(angleDeg: number): { cos: Scalar; sin: Scalar } {
  const hit = EXACT_TRIG[Math.abs(angleDeg)];
  if (hit) return angleDeg < 0 ? { cos: hit.cos, sin: neg(hit.sin) } : hit;
  const r = (angleDeg * Math.PI) / 180;
  return { cos: num(Math.cos(r)), sin: num(Math.sin(r)) };
}

const ZERO = (): Quad => ({ k0: rat(0n), k1: rat(0n), k2: rat(0n) });
const HALF = rat(1n, 2n);
const SI: BaseUnits = { length: 'm', time: 's' };

// Chuẩn hoá op → Motion; đổi đơn vị per-quantity về hệ nền `base` ngay tại đây (F2 — chỗ duy nhất
// số của đề thành Scalar, nên đổi ở đây giữ trọn exact; a/g LUÔN theo hệ nền, aUnit/gUnit → v1).
export function motionOf(op: PhysicsOp, base: BaseUnits = SI): Motion {
  const S = scalarFromNumber;
  if (op.op === 'mover1d') {
    const q: Quad = {
      k0: qtyLength(op.x0, op.xUnit, base),
      k1: qtyVelocity(op.v0, op.v0Unit, base),
      k2: mul(HALF, S(op.a)),
    };
    const t0 = qtyTime(op.startAt, op.tUnit, base);
    return op.axis === 'y'
      ? { name: op.name, t0, x: ZERO(), y: q, op }
      : { name: op.name, t0, x: q, y: ZERO(), op };
  }
  if (op.op === 'free_fall') {
    return {
      name: op.name, t0: rat(0n),
      x: { k0: qtyLength(op.x0, op.xUnit, base), k1: rat(0n), k2: rat(0n) },
      y: { k0: qtyLength(op.h0, op.xUnit, base), k1: rat(0n), k2: neg(mul(HALF, S(op.g))) }, op,
    };
  }
  const { cos, sin } = trigOf(op.angleDeg);
  const v0 = qtyVelocity(op.v0, op.v0Unit, base);
  return {
    name: op.name, t0: rat(0n),
    x: { k0: qtyLength(op.x0, op.xUnit, base), k1: mul(v0, cos), k2: rat(0n) },
    y: { k0: qtyLength(op.h0, op.xUnit, base), k1: mul(v0, sin), k2: neg(mul(HALF, S(op.g))) }, op,
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
