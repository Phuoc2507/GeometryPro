import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useGeometry } from '@/context/GeometryContext';
import type { SectionCut } from '@/types/geometry';

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vlen = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// Cơ sở trực chuẩn (u,v) TRONG mặt phẳng thiết diện + gốc = đỉnh 0. Export để test thuần.
// eslint-disable-next-line react-refresh/only-export-components
export function sectionBasis(polygon: V3[], normal: V3): { origin: V3; u: V3; v: V3; n: V3 } {
  const n = unit(normal);
  const origin = polygon[0];
  const ref = polygon.length > 1 ? sub(polygon[1], origin) : ([1, 0, 0] as V3);
  const proj = dot(ref, n);
  let u = unit([ref[0] - n[0] * proj, ref[1] - n[1] * proj, ref[2] - n[2] * proj]);
  if (!Number.isFinite(u[0]) || vlen(u) < 1e-6) u = unit(Math.abs(n[0]) < 0.9 ? cross(n, [1, 0, 0]) : cross(n, [0, 1, 0]));
  const v = cross(n, u);
  return { origin, u, v, n };
}

// eslint-disable-next-line react-refresh/only-export-components
export function projectTo2D(polygon: V3[], basis: { origin: V3; u: V3; v: V3 }): [number, number][] {
  return polygon.map((p) => { const r = sub(p, basis.origin); return [dot(r, basis.u), dot(r, basis.v)] as [number, number]; });
}

export default function AnimatedSectionCut({ cut }: { cut: SectionCut }) {
  const { state } = useGeometry();
  const advanceT = state.advanceT ?? 0;
  const { gl } = useThree();
  useEffect(() => { gl.localClippingEnabled = true; }, [gl]);

  const color = cut.color ?? '#f59e0b';
  const polygon = cut.polygon as V3[];

  // Dựng SẴN geometry đa giác 1 lần (chiếu vào mp → ShapeGeometry → đặt lại 3D bằng ma trận cơ sở).
  const { geometry, matrix, sweep } = useMemo(() => {
    const basis = sectionBasis(polygon, cut.plane.normal);
    const pts2d = projectTo2D(polygon, basis);
    const shape = new THREE.Shape(pts2d.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ShapeGeometry(shape);
    const { origin, u, v, n } = basis;
    const m = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(...u), new THREE.Vector3(...v), new THREE.Vector3(...n),
    ).setPosition(origin[0], origin[1], origin[2]);
    const projU = polygon.map((p) => dot(p, u));
    return { geometry: geo, matrix: m, sweep: { u, min: Math.min(...projU), max: Math.max(...projU) } };
  }, [polygon, cut.plane.normal]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Clip-plane lộ dần theo advanceT: giữ điểm có (p·u) ≤ constant.
  const clip = useMemo(() => {
    const nrm = new THREE.Vector3(-sweep.u[0], -sweep.u[1], -sweep.u[2]);
    return [new THREE.Plane(nrm, 0)];
  }, [sweep]);
  clip[0].constant = sweep.min + (sweep.max - sweep.min) * advanceT + 1e-3;

  const outlineGeo = useMemo(() => {
    const pts = polygon.map((p) => new THREE.Vector3(...p));
    pts.push(pts[0].clone());
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [polygon]);
  useEffect(() => () => outlineGeo.dispose(), [outlineGeo]);

  if (cut.hidden) return null;
  const opacity = cut.dim ? 0.2 : 0.55;

  return (
    <group>
      <mesh geometry={geometry} matrix={matrix} matrixAutoUpdate={false}>
        <meshStandardMaterial
          color={color} side={THREE.DoubleSide} transparent opacity={opacity}
          roughness={0.4} metalness={0.0} clippingPlanes={clip}
          emissive={cut.highlight ? new THREE.Color(color) : new THREE.Color('#000000')}
          emissiveIntensity={cut.highlight ? 0.25 : 0}
        />
      </mesh>
      <lineLoop>
        <primitive object={outlineGeo} attach="geometry" />
        <lineBasicMaterial color={color} />
      </lineLoop>
    </group>
  );
}
