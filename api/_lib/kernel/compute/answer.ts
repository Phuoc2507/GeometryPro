// api/_lib/kernel/compute/answer.ts
import { type Exact, type Scalar, displayScalar, exactToApprox, makeExact } from '../scalar';
import { type Vec3S, subV, dotV, crossV, lenSqV } from '../vec3s';
import type { Entity } from '../entities';

// Ngưỡng float cho suy biến / song song (so trên đại lượng bình-phương).
export const EPS = 1e-9;

export type ComputeOutcome<T> = { ok: true; answer: T } | { ok: false; problem: string };

export type DistanceAnswer = {
  kind: 'distance';
  exact: Exact | null;
  approx: number;
  text: string;
  approximate: boolean;
};

export type AngleAnswer = {
  kind: 'angle';
  exactDegrees: number | null; // góc đẹp nếu nhận diện được
  degrees: number;
  exactCos: Exact | null; // |cos| (đường-đường/nhị diện) hoặc |sin| (đường-mặt) đã chứng nhận
  text: string;
  approximate: boolean;
};

// Trả thông điệp suy biến đầu tiên (không ném), để compute trả {ok:false} có cấu trúc.
export function firstDegenerate(entities: Entity[]): string | null {
  for (const e of entities) {
    if (e.kind === 'plane' && lenSqV(e.n).approx < EPS) return 'Degenerate plane (zero normal vector)';
    if (e.kind === 'line' && lenSqV(e.dir).approx < EPS) return 'Degenerate line (zero direction vector)';
    if (e.kind === 'sphere' && e.r2.approx <= EPS) return 'Degenerate sphere (radius squared <= 0)';
  }
  return null;
}

// So GIÁ TRỊ EXACT (exactToApprox) với một float tính ĐỘC LẬP; lệch quá dung sai ⇒ bỏ
// exact, dùng float. So exact (không phải bóng .approx) nên bắt được cả lỗi tầng số-học
// exact lẫn lỗi chép công thức.
export function certifyDistance(s: Scalar, floatRef: number): DistanceAnswer {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol) {
    return { kind: 'distance', exact: s.exact, approx: exactToApprox(s.exact), text: displayScalar(s), approximate: false };
  }
  return { kind: 'distance', exact: null, approx: floatRef, text: floatRef.toFixed(4), approximate: true };
}

const NICE_DEGREES = [0, 30, 45, 60, 90];

export function recognizeDegree(deg: number): number | null {
  for (const d of NICE_DEGREES) if (Math.abs(deg - d) < 1e-4) return d;
  return null;
}

// |cos φ| exact của các góc đẹp φ ∈ {0,30,45,60,90} giữa hai vector.
const NICE_ABSCOS: { phi: number; m: Exact }[] = [
  { phi: 0, m: makeExact(1n, 1n, 1) },
  { phi: 30, m: makeExact(1n, 2n, 3) },
  { phi: 45, m: makeExact(1n, 2n, 2) },
  { phi: 60, m: makeExact(1n, 2n, 1) },
  { phi: 90, m: makeExact(0n, 1n, 1) },
];
const exactEq = (a: Exact, b: Exact) => a.num === b.num && a.den === b.den && a.radicand === b.radicand;

// metric = |cos φ| giữa hai vector (exact khi ở trong trường); floatMetric = |cos φ| tính
// ĐỘC LẬP; complement=true cho góc đường–mặt (góc = 90 − φ). Chỉ khẳng định "góc đẹp" khi
// metric EXACT khớp đúng |cos| của một góc đẹp — KHÔNG dựa vào float snap; và exact phải qua
// cross-check với float độc lập (như certifyDistance).
export function certifyAngle(metric: Scalar, floatMetric: number, complement: boolean): AngleAnswer {
  let exactM: Exact | null = metric.exact;
  if (exactM !== null && Math.abs(exactToApprox(exactM) - floatMetric) > 1e-6) exactM = null;
  const phi = (Math.acos(Math.min(1, Math.abs(floatMetric))) * 180) / Math.PI;
  const angleValue = complement ? 90 - phi : phi;
  let niceDeg: number | null = null;
  if (exactM !== null) {
    const hit = NICE_ABSCOS.find((e) => exactEq(exactM as Exact, e.m));
    if (hit) niceDeg = complement ? 90 - hit.phi : hit.phi;
  }
  return {
    kind: 'angle',
    exactDegrees: niceDeg,
    degrees: niceDeg !== null ? niceDeg : angleValue,
    exactCos: exactM,
    text: niceDeg !== null ? `${niceDeg}°` : `≈ ${angleValue.toFixed(2)}°`,
    approximate: niceDeg === null,
  };
}

// Kiểm đồng phẳng cho polygon/đáy (tiền-điều-kiện của area/volume). Trả thông điệp nếu có
// đỉnh không nằm trên mặt của bộ ba không thẳng hàng đầu tiên; null nếu đồng phẳng (hoặc
// suy biến toàn thẳng hàng). Dùng isZeroS (exact khi có).
export function coplanarityProblem(pts: Vec3S[], what: string): string | null {
  if (pts.length <= 3) return null;
  const p0 = pts[0];
  let normal: Vec3S | null = null;
  for (let i = 1; i < pts.length && normal === null; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const n = crossV(subV(pts[i], p0), subV(pts[j], p0));
      if (!isZeroS(lenSqV(n))) { normal = n; break; }
    }
  }
  if (normal === null) return null; // mọi điểm thẳng hàng ⇒ đồng phẳng tầm thường
  for (const p of pts) {
    if (!isZeroS(dotV(subV(p, p0), normal))) return `${what} vertices are not coplanar`;
  }
  return null;
}

// Đáp số vô hướng tổng quát (volume/area/ratio…) + self-certificate như certifyDistance.
export type ScalarAnswer = {
  kind: string;
  exact: Exact | null;
  approx: number;
  text: string;
  approximate: boolean;
};

export function certifyScalar(kind: string, s: Scalar, floatRef: number): ScalarAnswer {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol) {
    return { kind, exact: s.exact, approx: exactToApprox(s.exact), text: displayScalar(s), approximate: false };
  }
  return { kind, exact: null, approx: floatRef, text: floatRef.toFixed(4), approximate: true };
}

// Kiểm một Scalar bằng 0 (exact chính xác khi có, ngược lại ngưỡng float).
export function isZeroS(s: Scalar): boolean {
  return s.exact !== null ? s.exact.num === 0n : Math.abs(s.approx) < EPS;
}

// So sánh hai Scalar: -1 / 0 / 1. Chính xác khi cả hai exact cùng radicand (gồm hữu tỷ
// radicand 1); ngược lại dùng float. So (num/den)√r ⇔ so num·den chéo (√r>0, den>0).
export function cmpScalar(a: Scalar, b: Scalar): number {
  if (a.exact !== null && b.exact !== null && a.exact.radicand === b.exact.radicand) {
    const lhs = a.exact.num * b.exact.den;
    const rhs = b.exact.num * a.exact.den;
    return lhs < rhs ? -1 : lhs > rhs ? 1 : 0;
  }
  const d = a.approx - b.approx;
  return Math.abs(d) < EPS ? 0 : d < 0 ? -1 : 1;
}
