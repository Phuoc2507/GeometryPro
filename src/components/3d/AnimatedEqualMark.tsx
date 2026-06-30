import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { EqualMark, Line3D, Point3D } from '@/types/geometry';

interface Props {
  mark: EqualMark;
  lines: Line3D[];
  points: Point3D[];
  delay: number;
  isBuilding: boolean;
}

export function AnimatedEqualMark({ mark, lines, points, delay, isBuilding }: Props) {
  const ref = useRef<THREE.Group>(null);
  const progressRef = useRef(isBuilding ? 0 : 1);

  const line = lines.find(l => l.id === mark.lineId);
  const fromPt = line ? points.find(p => p.id === line.from) : undefined;
  const toPt = line ? points.find(p => p.id === line.to) : undefined;

  const ticks = useMemo(() => {
    if (!fromPt || !toPt) return null;
    const A = new THREE.Vector3(fromPt.x, fromPt.z, fromPt.y);
    const B = new THREE.Vector3(toPt.x, toPt.z, toPt.y);
    const mid = A.clone().add(B).multiplyScalar(0.5);
    const dir = B.clone().sub(A).normalize();

    const up = new THREE.Vector3(0, 1, 0);
    let perp = new THREE.Vector3().crossVectors(dir, up);
    if (perp.length() < 0.001) {
      perp = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(1, 0, 0));
    }
    perp.normalize();

    const tickLen = 0.12;
    const spacing = 0.08;
    const result: [number, number, number][][] = [];

    for (let i = 0; i < mark.count; i++) {
      const offset = (i - (mark.count - 1) / 2) * spacing;
      const center = mid.clone().add(dir.clone().multiplyScalar(offset));
      const p1 = center.clone().add(perp.clone().multiplyScalar(tickLen));
      const p2 = center.clone().sub(perp.clone().multiplyScalar(tickLen));
      result.push([
        [p1.x, p1.y, p1.z],
        [p2.x, p2.y, p2.z],
      ]);
    }
    return result;
  }, [fromPt, toPt, mark.count]);

  const animCtx = useAnimationOptional();
  const geometryCtx = useGeometryOptional();
  const isManualMode = geometryCtx?.state.manualMode ?? false;

  useFrame((_, delta) => {
    if (animCtx && !isManualMode && isBuilding) {
      const t = animCtx.globalTimeRef.current;
      progressRef.current = Math.max(0, Math.min(1, (t - delay) / 300));
      if (ref.current) ref.current.scale.setScalar(progressRef.current);
      return;
    }

    if (!isBuilding) { 
      if (progressRef.current !== 1) {
        progressRef.current = 1; 
        if (ref.current) ref.current.scale.setScalar(1);
      }
      return; 
    }
    
    // Fallback
    if (progressRef.current < 1) {
      progressRef.current = Math.min(1, progressRef.current + delta * 3);
      if (ref.current) ref.current.scale.setScalar(progressRef.current);
    }
  });

  if (!ticks) return null;

  return (
    <group ref={ref}>
      {ticks.map((pts, i) => (
        <Line key={i} points={pts} color="#2ecc71" lineWidth={2} />
      ))}
    </group>
  );
}
