// api/_lib/kernel/analysis/sectionCut.ts
// Lõi tất định Đợt 3: thiết diện = mặt phẳng ∩ khối đa diện lồi. LLM chỉ trích tham số; engine dựng & kiểm.
import type {
  SectionPointSpec, PolyhedronKind, SectionCut, Verified,
} from '../../../../src/types/geometry';

export type Vec3 = [number, number, number];
export type Poly = {
  vertices: Record<string, Vec3>;
  edges: [string, string][];
  faces: string[][];
};

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0],
];
const norm = (a: Vec3): number => Math.sqrt(dot(a, a));

// Sinh cạnh từ chu trình đỉnh (khép kín).
function ring(names: string[]): [string, string][] {
  return names.map((n, i) => [n, names[(i + 1) % names.length]] as [string, string]);
}

export function buildPolyhedron(kind: PolyhedronKind, dims: { a?: number; b?: number; c?: number; h?: number }): Poly {
  const a = dims.a ?? 1;
  if (kind === 'cube' || kind === 'box') {
    const bx = kind === 'cube' ? a : (dims.b ?? a);
    const cz = kind === 'cube' ? a : (dims.c ?? a);
    const vertices: Record<string, Vec3> = {
      A: [0, 0, 0], B: [a, 0, 0], C: [a, bx, 0], D: [0, bx, 0],
      "A'": [0, 0, cz], "B'": [a, 0, cz], "C'": [a, bx, cz], "D'": [0, bx, cz],
    };
    const bottom = ['A', 'B', 'C', 'D']; const top = ["A'", "B'", "C'", "D'"];
    const edges: [string, string][] = [
      ...ring(bottom), ...ring(top),
      ['A', "A'"], ['B', "B'"], ['C', "C'"], ['D', "D'"],
    ];
    const faces = [
      bottom, top,
      ['A', 'B', "B'", "A'"], ['B', 'C', "C'", "B'"],
      ['C', 'D', "D'", "C'"], ['D', 'A', "A'", "D'"],
    ];
    return { vertices, edges, faces };
  }
  if (kind === 'pyramid-quad') {
    const bx = dims.b ?? a; const h = dims.h ?? a;
    const vertices: Record<string, Vec3> = {
      A: [0, 0, 0], B: [a, 0, 0], C: [a, bx, 0], D: [0, bx, 0], S: [a / 2, bx / 2, h],
    };
    const base = ['A', 'B', 'C', 'D'];
    const edges: [string, string][] = [
      ...ring(base), ['S', 'A'], ['S', 'B'], ['S', 'C'], ['S', 'D'],
    ];
    const faces = [base, ['A', 'B', 'S'], ['B', 'C', 'S'], ['C', 'D', 'S'], ['D', 'A', 'S']];
    return { vertices, edges, faces };
  }
  // prism-tri: đáy tam giác đều cạnh a, cao h.
  const h = dims.h ?? a; const cy = (Math.sqrt(3) / 2) * a;
  const vertices: Record<string, Vec3> = {
    A: [0, 0, 0], B: [a, 0, 0], C: [a / 2, cy, 0],
    "A'": [0, 0, h], "B'": [a, 0, h], "C'": [a / 2, cy, h],
  };
  const bottom = ['A', 'B', 'C']; const top = ["A'", "B'", "C'"];
  const edges: [string, string][] = [
    ...ring(bottom), ...ring(top), ['A', "A'"], ['B', "B'"], ['C', "C'"],
  ];
  const faces = [
    bottom, top,
    ['A', 'B', "B'", "A'"], ['B', 'C', "C'", "B'"], ['C', 'A', "A'", "C'"],
  ];
  return { vertices, edges, faces };
}

export function resolveSectionPoint(poly: Poly, spec: SectionPointSpec): Vec3 {
  if ('vertex' in spec) {
    const v = poly.vertices[spec.vertex];
    if (!v) throw new Error(`Đỉnh không tồn tại: ${spec.vertex}`);
    return v;
  }
  const [n1, n2] = spec.onEdge;
  const v1 = poly.vertices[n1]; const v2 = poly.vertices[n2];
  if (!v1 || !v2) throw new Error(`Cạnh không hợp lệ: ${n1}${n2}`);
  return add(v1, scale(sub(v2, v1), spec.t));
}

export function planeFrom3(p: Vec3[]): { point: Vec3; normal: Vec3 } | null {
  if (p.length < 3) return null;
  const n = cross(sub(p[1], p[0]), sub(p[2], p[0]));
  const len = norm(n);
  if (len < 1e-9) return null;                 // 3 điểm thẳng hàng
  return { point: p[0], normal: scale(n, 1 / len) };
}

const EPS = 1e-7;
const roundKey = (v: Vec3): string => v.map((x) => (Math.abs(x) < 1e-9 ? 0 : x).toFixed(6)).join(',');

// Sắp các điểm đồng phẳng theo vòng quanh trọng tâm (dùng 2 vector trực chuẩn trong mp).
function orderRing(pts: Vec3[], normal: Vec3): Vec3[] {
  if (pts.length < 3) return pts;
  const c = scale(pts.reduce((s, p) => add(s, p), [0, 0, 0] as Vec3), 1 / pts.length);
  const u0 = sub(pts[0], c);
  const uLen = norm(u0);
  const u = uLen < EPS ? ([1, 0, 0] as Vec3) : scale(u0, 1 / uLen);
  const v = cross(normal, u);
  return [...pts].sort((p, q) => {
    const ap = Math.atan2(dot(sub(p, c), v), dot(sub(p, c), u));
    const aq = Math.atan2(dot(sub(q, c), v), dot(sub(q, c), u));
    return ap - aq;
  });
}

export function sliceConvexPolyhedron(poly: Poly, point: Vec3, normal: Vec3): Vec3[] {
  const d = (v: Vec3): number => dot(sub(v, point), normal);
  const seen = new Set<string>();
  const pts: Vec3[] = [];
  const push = (v: Vec3): void => { const k = roundKey(v); if (!seen.has(k)) { seen.add(k); pts.push(v); } };
  for (const [n1, n2] of poly.edges) {
    const v1 = poly.vertices[n1]; const v2 = poly.vertices[n2];
    const d1 = d(v1); const d2 = d(v2);
    if (Math.abs(d1) < EPS) push(v1);
    if (Math.abs(d2) < EPS) push(v2);
    if (d1 * d2 < -EPS * EPS) {                     // cắt hẳn qua cạnh
      const t = d1 / (d1 - d2);
      push(add(v1, scale(sub(v2, v1), t)));
    }
  }
  if (pts.length < 3) return [];
  return orderRing(pts, normal);
}

// Diện tích đa giác phẳng 3D (Newell): ½‖Σ vi × vi+1‖.
export function polygonArea3D(pts: Vec3[]): number {
  if (pts.length < 3) return 0;
  let n: Vec3 = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) n = add(n, cross(pts[i], pts[(i + 1) % pts.length]));
  return norm(n) / 2;
}

// Diện tích bằng quạt tam giác từ đỉnh 0 (độc lập với Newell) — dùng cross-check thứ tự vòng.
function fanArea(pts: Vec3[]): number {
  let s = 0;
  for (let i = 1; i < pts.length - 1; i++) s += norm(cross(sub(pts[i], pts[0]), sub(pts[i + 1], pts[0]))) / 2;
  return s;
}

export function buildSectionCut(
  id: string, kind: PolyhedronKind, dims: { a?: number; b?: number; c?: number; h?: number },
  specs: SectionPointSpec[], color = '#f59e0b',
): { sectionCut: SectionCut; poly: Poly } | null {
  if (!specs || specs.length < 3) return null;
  const poly = buildPolyhedron(kind, dims);
  let resolved: Vec3[];
  try { resolved = specs.slice(0, 3).map((s) => resolveSectionPoint(poly, s)); }
  catch { return null; }
  const pl = planeFrom3(resolved);
  if (!pl) return null;
  const polygon = sliceConvexPolyhedron(poly, pl.point, pl.normal);
  if (polygon.length < 3) return null;
  const aNewell = polygonArea3D(polygon);
  const aFan = fanArea(polygon);
  const verified = Math.abs(aNewell - aFan) <= 1e-9 * Math.max(1, aNewell) && aNewell > EPS;
  const latex = `S_{\\text{thiết diện}}=${aNewell.toFixed(4)}`;
  const area: Verified<number> = { value: aNewell, latex, verified, estimatedError: Math.abs(aNewell - aFan) };
  return {
    sectionCut: {
      id, targetKind: kind, polygon: polygon as [number, number, number][],
      plane: { point: pl.point, normal: pl.normal }, area, color,
    },
    poly,
  };
}
