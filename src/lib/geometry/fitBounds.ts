// src/lib/geometry/fitBounds.ts
// Toán bao khung camera cho hình có samples (đường cong expr, miền tô, khối tròn xoay) — THUẦN (không
// THREE/React) để test node + renderer import ngược. Toạ độ Three (math z-up → three y-up).
import type { GeometryData } from '@/types/geometry';

export type XYZ = { x: number; y: number; z: number };
const fin = (v: number) => Number.isFinite(v);

// Đường cong: mẫu {x,y} (toạ độ toán) → toạ độ Three theo mặt phẳng vẽ, cắt tới progress (0..1).
export function curveThreePoints(
  samples: { x: number; y: number }[] | undefined,
  plane: 'xy' | 'xz' | 'yz' = 'xy',
  progress = 1,
): XYZ[] {
  if (!Array.isArray(samples)) return [];
  const out: XYZ[] = [];
  const n = samples.length;
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    if (t > progress) break;
    const { x, y } = samples[i];
    if (!fin(x) || !fin(y)) continue;
    if (plane === 'xy') out.push({ x, y: 0, z: y });
    else if (plane === 'xz') out.push({ x, y, z: 0 });
    else out.push({ x: 0, y, z: x }); // yz
  }
  return out;
}

// Đường cong SAU khi <group rotation> của AnimatedCurve xoay điểm về không gian THẾ GIỚI (camera thấy).
// AnimatedCurve dựng điểm PRE-rotation qua curveThreePoints rồi bọc trong <group> xoay theo mặt phẳng:
//   xy → rot[−π/2,0,0]: (x,0,y) → (x,+y,0)  |  xz → rot[0,0,0]: (x,y,0) giữ nguyên  |
//   yz → rot[0,−π/2,0]: (0,y,x) → (−x,y,0).
// xy dùng +y (KHÔNG −y) để đồ thị y=f(x) nằm TRÊN trục, TRÙNG hướng miền tô (areaThreePoints cũng +y) —
// nếu lệch dấu, đường cong và miền tô nó viền thành ẢNH GƯƠNG qua Ox. Camera phải bao theo toạ độ SAU
// xoay này (không thì đồ thị bị lệch/khuất). Bản đồ đóng:
export function curveWorldPoints(
  samples: { x: number; y: number }[] | undefined,
  plane: 'xy' | 'xz' | 'yz' = 'xy',
  progress = 1,
): XYZ[] {
  if (!Array.isArray(samples)) return [];
  const out: XYZ[] = [];
  const n = samples.length;
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    if (t > progress) break;
    const { x, y } = samples[i];
    if (!fin(x) || !fin(y)) continue;
    if (plane === 'xy') out.push({ x, y, z: 0 });
    else if (plane === 'xz') out.push({ x, y, z: 0 });
    else out.push({ x: -x, y, z: 0 }); // yz
  }
  return out;
}

// Khối tròn xoay: hộp bao AN TOÀN (hơi rộng chút cũng chấp nhận — camera không mất hình). Ox: trục ∥
// Three-X trên [x0,x1], bán kính ±R quanh Three-Y=axisY & Three-Z=0. Oy: trục ∥ Three-Y, bán kính ±R.
export function revolutionThreePoints(solid: {
  samples?: { x: number; r: number }[];
  innerSamples?: { x: number; r: number }[];
  axis?: 'Ox' | 'Oy';
  axisY?: number;
}): XYZ[] {
  const all = [...(solid.samples ?? []), ...(solid.innerSamples ?? [])].filter((s) => fin(s.x) && fin(s.r));
  if (all.length < 1) return [];
  const axisY = solid.axisY ?? 0;
  const xs = all.map((s) => s.x);
  const R = Math.max(0, ...all.map((s) => Math.abs(s.r)));
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (solid.axis === 'Oy') {
    const ax = Math.max(Math.abs(x0), Math.abs(x1), R);
    return [
      { x: R, y: 0, z: 0 }, { x: -R, y: 0, z: 0 },
      { x: 0, y: ax, z: 0 }, { x: 0, y: -ax, z: 0 },
      { x: 0, y: 0, z: R }, { x: 0, y: 0, z: -R },
    ];
  }
  const mid = (x0 + x1) / 2;
  return [
    { x: x0, y: axisY, z: 0 }, { x: x1, y: axisY, z: 0 },
    { x: x0, y: axisY + R, z: 0 }, { x: x0, y: axisY - R, z: 0 },
    { x: x1, y: axisY + R, z: 0 }, { x: x1, y: axisY - R, z: 0 },
    { x: mid, y: axisY, z: R }, { x: mid, y: axisY, z: -R },
  ];
}

// Miền tô: mẫu {x,top,bot} → Three (mesh KHÔNG xoay: shape (x,y) ⇒ Three-X=x, Three-Y=top/bot, Three-Z=0).
export function areaThreePoints(area: { samples?: { x: number; top: number; bot: number }[] }): XYZ[] {
  if (!Array.isArray(area.samples)) return [];
  const out: XYZ[] = [];
  for (const s of area.samples) {
    if (!fin(s.x)) continue;
    if (fin(s.top)) out.push({ x: s.x, y: s.top, z: 0 });
    if (fin(s.bot)) out.push({ x: s.x, y: s.bot, z: 0 });
  }
  return out;
}

// Gộp mọi điểm bao (Three) từ curves/areaRegions/revolutionSolids (points xử lý riêng ở computeFitBounds).
export function extraFitPoints(geometry: GeometryData | null): XYZ[] {
  if (!geometry) return [];
  const pts: XYZ[] = [];
  for (const c of geometry.curves ?? []) pts.push(...curveWorldPoints(c.samples, c.plane, 1));
  for (const a of geometry.areaRegions ?? []) pts.push(...areaThreePoints(a));
  for (const s of geometry.revolutionSolids ?? []) pts.push(...revolutionThreePoints(s));
  return pts;
}

// Bao khung (toạ độ Three) từ CẢ points lẫn samples. Trả null nếu không có điểm hữu hạn nào.
export function computeFitBounds(geometry: GeometryData | null):
  { cx: number; cy: number; cz: number; size: number; R: number } | null {
  if (!geometry) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  const add = (x: number, y: number, z: number) => {
    if (fin(x)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
    if (fin(y)) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    if (fin(z)) { minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  };
  for (const p of geometry.points ?? []) add(Number(p.x), Number(p.z), Number(p.y)); // math z-up → three y-up
  for (const q of extraFitPoints(geometry)) add(q.x, q.y, q.z);                        // đã ở toạ độ Three
  if (!fin(minX) || !fin(maxX)) return null;
  const spanX = maxX - minX, spanY = maxY - minY, spanZ = maxZ - minZ;
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    cz: (minZ + maxZ) / 2,
    size: Math.max(spanX, spanY, spanZ, 2),
    R: 0.5 * Math.hypot(spanX, spanY, spanZ) || 1,
  };
}
