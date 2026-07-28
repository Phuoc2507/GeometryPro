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

// (Task 3 sẽ thêm sliceConvexPolyhedron, polygonArea3D, buildSectionCut, và các re-export.)
export const __vecHelpers = { sub, add, scale, dot, cross, norm };
