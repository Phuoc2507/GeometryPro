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
  const clamp1 = (v: number): number => (v < -1 ? -1 : v > 1 ? 1 : v);
  const a1 = r1 * r1 * Math.acos(clamp1((d * d + r1 * r1 - r2 * r2) / (2 * d * r1)));
  const a2 = r2 * r2 * Math.acos(clamp1((d * d + r2 * r2 - r1 * r1) / (2 * d * r2)));
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
