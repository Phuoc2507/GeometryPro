import { useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useGeometry } from '@/context/GeometryContext';
import type { ProfileFn, RevolutionSolid } from '@/types/geometry';

const SEGMENTS = 96;   // đủ mịn để mặt cong bóng liền
const AXIAL_STEPS = 64;
const DISK_COUNT = 14;

function evalProfile(f: ProfileFn, x: number): number {
  switch (f.kind) {
    case 'poly': return f.coeffs.reduce((a, c, i) => a + c * x ** i, 0);
    case 'sqrt': return f.a * Math.sqrt(x) + f.b;
    case 'const': return f.c;
  }
}

// Export riêng để test thuần (không dựng canvas).
export function profileSamplesForTest(outer: ProfileFn, domain: [number, number], steps: number) {
  const [a, b] = domain;
  const out: { radius: number; axial: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = a + ((b - a) * i) / steps;
    out.push({ radius: Math.max(0, evalProfile(outer, x)), axial: x });
  }
  return out;
}

export default function AnimatedRevolutionSolid({ solid }: { solid: RevolutionSolid }) {
  const { state } = useGeometry();
  const advanceT = state.advanceT ?? 0;
  const { gl } = useThree();
  gl.localClippingEnabled = true; // bật cắt cục bộ để lộ dần

  const [a, b] = solid.domain;

  const geometry = useMemo(() => {
    const pts = profileSamplesForTest(solid.outer, solid.domain, AXIAL_STEPS).map(
      (p) => new THREE.Vector2(p.radius, p.axial),
    );
    return new THREE.LatheGeometry(pts, SEGMENTS);
  }, [solid.outer, a, b]);

  const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), []);

  const disks = useMemo(() => {
    const arr: { x: number; r: number }[] = [];
    for (let i = 0; i < DISK_COUNT; i++) {
      const x = a + ((b - a) * (i + 0.5)) / DISK_COUNT;
      arr.push({ x, r: Math.max(1e-3, evalProfile(solid.outer, x)) });
    }
    return arr;
  }, [solid.outer, a, b]);

  if (solid.hidden) return null;

  const xCut = a + (b - a) * advanceT;
  clipPlane.constant = xCut;

  const baseColor = solid.color ?? '#6366f1';
  const dim = !!solid.dim;
  const opacity = dim ? 0.25 : 1;
  const diskOpacity = Math.max(0, 1 - advanceT) * 0.35;

  return (
    <group>
      {/* Khối bóng liền — xoay để trục lathe trùng Ox, cắt lộ dần theo xCut */}
      <mesh geometry={geometry} rotation={[0, 0, -Math.PI / 2]} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={baseColor}
          roughness={0.25}
          metalness={0.0}
          clearcoat={1}
          clearcoatRoughness={0.2}
          side={THREE.DoubleSide}
          transparent={dim}
          opacity={opacity}
          emissive={solid.highlight ? new THREE.Color(baseColor) : new THREE.Color('#000000')}
          emissiveIntensity={solid.highlight ? 0.25 : 0}
          clippingPlanes={[clipPlane]}
        />
      </mesh>

      {/* Lát mờ minh hoạ tích phân (biến mất khi kết đông) */}
      {diskOpacity > 0.01 &&
        disks
          .filter((d) => d.x <= xCut)
          .map((d, i) => (
            <mesh key={i} position={[d.x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[d.r, d.r, ((b - a) / DISK_COUNT) * 0.85, 40]} />
              <meshBasicMaterial color="#f59e0b" transparent opacity={diskOpacity} />
            </mesh>
          ))}
    </group>
  );
}
