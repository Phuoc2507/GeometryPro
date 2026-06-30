import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { DynamicPoint, Point3D } from '@/types/geometry';

interface Props {
  dp: DynamicPoint;
  points: Point3D[];
  delay: number;
  isBuilding: boolean;
}

export function AnimatedDynamicPoint({ dp, points, delay, isBuilding }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(isBuilding ? 0 : 1);

  const fromPt = points.find(p => p.id === dp.from);
  const toPt = points.find(p => p.id === dp.to);

  const position = useMemo((): [number, number, number] => {
    if (!fromPt || !toPt) return [0, 0, 0];
    // Interpolate: M = A + k*(B-A), then swap Y/Z for Three.js
    const x = fromPt.x + dp.k * (toPt.x - fromPt.x);
    const y = fromPt.y + dp.k * (toPt.y - fromPt.y);
    const z = fromPt.z + dp.k * (toPt.z - fromPt.z);
    return [x, z, y]; // swap y/z
  }, [fromPt, toPt, dp.k]);

  const color = dp.color || '#e74c3c';

  const animCtx = useAnimationOptional();
  const geometryCtx = useGeometryOptional();
  const isManualMode = geometryCtx?.state.manualMode ?? false;

  useFrame((_, delta) => {
    if (animCtx && !isManualMode && isBuilding) {
      const t = animCtx.globalTimeRef.current;
      progressRef.current = Math.max(0, Math.min(1, (t - delay) / 300));
      if (meshRef.current) meshRef.current.scale.setScalar(progressRef.current);
      return;
    }

    if (!isBuilding) { 
      if (progressRef.current !== 1) {
        progressRef.current = 1; 
        if (meshRef.current) meshRef.current.scale.setScalar(1);
      }
      return; 
    }
    
    // Fallback
    if (progressRef.current < 1) {
      progressRef.current = Math.min(1, progressRef.current + delta * 3);
      if (meshRef.current) meshRef.current.scale.setScalar(progressRef.current);
    }
  });

  if (!fromPt || !toPt) return null;

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      {/* Pulsing ring to indicate it's dynamic */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.16, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <Html center distanceFactor={10}>
        <span className="math-label" style={{
          color,
          fontSize: '16px',
          transform: 'translateY(-14px)',
          display: 'block',
        }}>
          {dp.label}
        </span>
      </Html>
    </group>
  );
}
