// api/_lib/kernel/constructions.ts
import { type Scalar, add, sub, mul, div, rat } from './scalar';
import { type Vec3S, vec3s, subV, addV, scaleV, dotV, crossV, lenSqV } from './vec3s';
import type { PlaneE, LineE } from './entities';

function det3(u: Vec3S, v: Vec3S, w: Vec3S): Scalar {
  return dotV(u, crossV(v, w));
}

// Chuẩn hoá -0 (số 0 âm dấu do float) về +0 để khớp golden; exact vẫn giữ nguyên.
function normZeroS(s: Scalar): Scalar {
  return s.approx === 0 ? { approx: 0, exact: s.exact } : s;
}

// Giải hệ 3 phương trình H·rᵢ = bᵢ (i=1,2,3) bằng Cramer. Ném nếu suy biến (det = 0).
export function solve3(r1: Vec3S, r2: Vec3S, r3: Vec3S, b: Vec3S): Vec3S {
  const c0 = vec3s(r1.x, r2.x, r3.x);
  const c1 = vec3s(r1.y, r2.y, r3.y);
  const c2 = vec3s(r1.z, r2.z, r3.z);
  const detM = det3(c0, c1, c2);
  if (detM.approx === 0 || (detM.exact !== null && detM.exact.num === 0n)) {
    throw new Error('Degenerate construction: linear system has no unique solution');
  }
  return vec3s(
    normZeroS(div(det3(b, c1, c2), detM)),
    normZeroS(div(det3(c0, b, c2), detM)),
    normZeroS(div(det3(c0, c1, b), detM)),
  );
}

// Chân đường vuông góc từ p xuống mặt: p − ((n·p + d)/|n|²)·n.
export function footOnPlaneE(p: Vec3S, pl: PlaneE): Vec3S {
  const t = div(add(dotV(pl.n, p), pl.d), lenSqV(pl.n));
  return subV(p, scaleV(pl.n, t));
}
// Chân đường vuông góc từ p xuống đường: a + (((p−a)·dir)/|dir|²)·dir.
export function footOnLineE(p: Vec3S, l: LineE): Vec3S {
  const t = div(dotV(subV(p, l.p), l.dir), lenSqV(l.dir));
  return addV(l.p, scaleV(l.dir, t));
}
export function reflectAcrossPlaneE(p: Vec3S, pl: PlaneE): Vec3S {
  return subV(scaleV(footOnPlaneE(p, pl), rat(2n)), p); // 2·foot − p
}
export function reflectAcrossLineE(p: Vec3S, l: LineE): Vec3S {
  return subV(scaleV(footOnLineE(p, l), rat(2n)), p);
}

// Trực tâm: H thoả (H−A)·(C−B)=0, (H−B)·(C−A)=0, và H thuộc mặt (ABC).
export function orthocenterE(a: Vec3S, b: Vec3S, c: Vec3S): Vec3S {
  const n = crossV(subV(b, a), subV(c, a));
  const r1 = subV(c, b);
  const r2 = subV(c, a);
  return solve3(r1, r2, n, vec3s(dotV(a, r1), dotV(b, r2), dotV(a, n)));
}
// Tâm ngoại tiếp: |O−A|=|O−B|=|O−C| ⇒ O·(B−A)=(|B|²−|A|²)/2, O·(C−A)=(|C|²−|A|²)/2, O∈(ABC).
export function circumcenterE(a: Vec3S, b: Vec3S, c: Vec3S): Vec3S {
  const n = crossV(subV(b, a), subV(c, a));
  const half = rat(1n, 2n);
  const r1 = subV(b, a);
  const r2 = subV(c, a);
  const b1 = mul(sub(lenSqV(b), lenSqV(a)), half);
  const b2 = mul(sub(lenSqV(c), lenSqV(a)), half);
  return solve3(r1, r2, n, vec3s(b1, b2, dotV(a, n)));
}
