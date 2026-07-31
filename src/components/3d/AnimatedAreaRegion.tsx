import { useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useGeometry } from '@/context/GeometryContext';
import type { AreaRegion } from '@/types/geometry';

// Viền miền kín: biên trên (a→b) rồi biên dưới (b→a). Export riêng để test thuần.
// eslint-disable-next-line react-refresh/only-export-components
export function areaLoopForTest(samples: { x: number; top: number; bot: number }[]) {
  const top = samples.map((s) => ({ x: s.x, y: s.top }));
  const bot = samples.slice().reverse().map((s) => ({ x: s.x, y: s.bot }));
  return [...top, ...bot];
}

export default function AnimatedAreaRegion({ region }: { region: AreaRegion }) {
  const { state } = useGeometry();
  const advanceT = state.advanceT ?? 0;
  const { gl } = useThree();
  gl.localClippingEnabled = true;

  const [a, b] = region.domain;
  const depth = region.slabDepth ?? 0.15;
  const samples = useMemo(() => region.samples || [], [region.samples]);

  const geometry = useMemo(() => {
    if (samples.length < 2) return null;
    const shape = new THREE.Shape();
    const loop = areaLoopForTest(samples);
    shape.moveTo(loop[0].x, loop[0].y);
    for (let i = 1; i < loop.length; i++) shape.lineTo(loop[i].x, loop[i].y);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 });
    geo.translate(0, 0, -depth / 2);
    return geo;
  }, [samples, depth]);

  const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), []);
  clipPlane.constant = a + (b - a) * advanceT;   // lộ dần trái→phải

  if (region.hidden || !geometry) return null;
  const color = region.color ?? '#22c55e';
  const opacity = region.dim ? 0.2 : 0.7;   // tấm bán trong suốt (là DIỆN TÍCH, không phải khối đặc)

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial
        color={color} roughness={0.3} metalness={0.0} side={THREE.DoubleSide}
        transparent opacity={opacity}
        emissive={region.highlight ? new THREE.Color(color) : new THREE.Color('#000000')}
        emissiveIntensity={region.highlight ? 0.2 : 0}
        clippingPlanes={[clipPlane]}
      />
    </mesh>
  );
}
