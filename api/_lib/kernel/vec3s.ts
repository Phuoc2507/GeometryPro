// api/_lib/kernel/vec3s.ts
import { type Scalar, rat, add, sub, mul, neg } from './scalar';

export type Vec3S = { x: Scalar; y: Scalar; z: Scalar };

export function vec3s(x: Scalar, y: Scalar, z: Scalar): Vec3S {
  return { x, y, z };
}

export function ratVec(x: bigint, y: bigint, z: bigint): Vec3S {
  return { x: rat(x), y: rat(y), z: rat(z) };
}

export function addV(a: Vec3S, b: Vec3S): Vec3S {
  return { x: add(a.x, b.x), y: add(a.y, b.y), z: add(a.z, b.z) };
}

export function subV(a: Vec3S, b: Vec3S): Vec3S {
  return { x: sub(a.x, b.x), y: sub(a.y, b.y), z: sub(a.z, b.z) };
}

export function scaleV(a: Vec3S, s: Scalar): Vec3S {
  return { x: mul(a.x, s), y: mul(a.y, s), z: mul(a.z, s) };
}

export function dotV(a: Vec3S, b: Vec3S): Scalar {
  return add(add(mul(a.x, b.x), mul(a.y, b.y)), mul(a.z, b.z));
}

export function crossV(a: Vec3S, b: Vec3S): Vec3S {
  return {
    x: sub(mul(a.y, b.z), mul(a.z, b.y)),
    y: sub(mul(a.z, b.x), mul(a.x, b.z)),
    z: sub(mul(a.x, b.y), mul(a.y, b.x)),
  };
}

export function lenSqV(a: Vec3S): Scalar {
  return dotV(a, a);
}

export function negV(a: Vec3S): Vec3S {
  return { x: neg(a.x), y: neg(a.y), z: neg(a.z) };
}

export function toApproxVec(a: Vec3S): { x: number; y: number; z: number } {
  return { x: a.x.approx, y: a.y.approx, z: a.z.approx };
}
