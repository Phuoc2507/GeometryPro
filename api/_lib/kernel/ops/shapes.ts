import { type Vec3, vec3 } from '../vecMath';

export type TriangleDims =
  | { triangleType: 'equilateral'; edge: number }
  | { triangleType: 'right'; leg1: number; leg2: number }
  | { triangleType: 'isosceles'; base: number; legLength: number }
  | { triangleType: 'sss'; p1p2: number; p1p3: number; p2p3: number };

export function buildSquare(edge: number): Vec3[] {
  const h = edge / 2;
  return [vec3(-h, -h, 0), vec3(h, -h, 0), vec3(h, h, 0), vec3(-h, h, 0)];
}

export function buildRectangle(width: number, height: number): Vec3[] {
  const hw = width / 2;
  const hh = height / 2;
  return [vec3(-hw, -hh, 0), vec3(hw, -hh, 0), vec3(hw, hh, 0), vec3(-hw, hh, 0)];
}

export function buildRhombus(diag1: number, diag2: number): Vec3[] {
  const h1 = diag1 / 2;
  const h2 = diag2 / 2;
  return [vec3(-h1, 0, 0), vec3(0, -h2, 0), vec3(h1, 0, 0), vec3(0, h2, 0)];
}

export function buildRegPolygon(n: number, edge: number): Vec3[] {
  if (n < 3) throw new Error(`reg_polygon requires n >= 3, got ${n}`);
  const R = edge / (2 * Math.sin(Math.PI / n));
  const pts: Vec3[] = [];
  for (let k = 0; k < n; k++) {
    const theta = (2 * Math.PI * k) / n;
    pts.push(vec3(R * Math.cos(theta), R * Math.sin(theta), 0));
  }
  return pts;
}

export function buildTriangle(dims: TriangleDims): Vec3[] {
  switch (dims.triangleType) {
    case 'equilateral': {
      const a = dims.edge;
      return [vec3(0, (a * Math.sqrt(3)) / 2, 0), vec3(-a / 2, 0, 0), vec3(a / 2, 0, 0)];
    }
    case 'right': {
      const { leg1, leg2 } = dims;
      return [vec3(0, 0, 0), vec3(leg1, 0, 0), vec3(0, leg2, 0)];
    }
    case 'isosceles': {
      const { base, legLength } = dims;
      const half = base / 2;
      const hSq = legLength * legLength - half * half;
      if (hSq <= 0) {
        throw new Error(`Invalid isosceles triangle: legLength (${legLength}) too short for base (${base})`);
      }
      const h = Math.sqrt(hSq);
      return [vec3(0, h, 0), vec3(-half, 0, 0), vec3(half, 0, 0)];
    }
    case 'sss': {
      const { p1p2, p1p3, p2p3 } = dims;
      if (p1p2 + p1p3 <= p2p3 || p1p2 + p2p3 <= p1p3 || p1p3 + p2p3 <= p1p2) {
        throw new Error(`Invalid triangle sides (${p1p2}, ${p1p3}, ${p2p3}): violate the triangle inequality`);
      }
      const p1 = vec3(0, 0, 0);
      const p2 = vec3(p1p2, 0, 0);
      const cosAngle = (p1p2 * p1p2 + p1p3 * p1p3 - p2p3 * p2p3) / (2 * p1p2 * p1p3);
      const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
      const p3 = vec3(p1p3 * Math.cos(angle), p1p3 * Math.sin(angle), 0);
      return [p1, p2, p3];
    }
  }
}
