// api/_lib/kernel/compute/answer.ts
import { type Exact, type Scalar, displayScalar } from '../scalar';
import { lenSqV } from '../vec3s';
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

// So đường exact với một float tính ĐỘC LẬP; lệch quá dung sai ⇒ bỏ exact (không hiện
// đáp số chưa chứng nhận), dùng float.
export function certifyDistance(s: Scalar, floatRef: number): DistanceAnswer {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(s.approx - floatRef) <= tol) {
    return { kind: 'distance', exact: s.exact, approx: s.approx, text: displayScalar(s), approximate: false };
  }
  return { kind: 'distance', exact: null, approx: floatRef, text: floatRef.toFixed(4), approximate: true };
}

const NICE_DEGREES = [0, 30, 45, 60, 90];

export function recognizeDegree(deg: number): number | null {
  for (const d of NICE_DEGREES) if (Math.abs(deg - d) < 1e-4) return d;
  return null;
}

// Dùng cos/sin exact + độ float để tạo AngleAnswer. Góc đẹp ⇒ exactDegrees; ngược lại
// approximate nhưng vẫn giữ cos/sin exact làm giá trị chứng nhận.
export function certifyAngle(metric: Scalar, degrees: number): AngleAnswer {
  const nice = recognizeDegree(degrees);
  return {
    kind: 'angle',
    exactDegrees: nice,
    degrees: nice ?? degrees,
    exactCos: metric.exact,
    text: nice !== null ? `${nice}°` : `≈ ${degrees.toFixed(2)}°`,
    approximate: nice === null,
  };
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
  if (s.exact !== null && Math.abs(s.approx - floatRef) <= tol) {
    return { kind, exact: s.exact, approx: s.approx, text: displayScalar(s), approximate: false };
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
