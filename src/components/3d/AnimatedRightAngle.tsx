import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { RightAngle3D, Point3D } from '@/types/geometry';

interface Props {
  rightAngle: RightAngle3D;
  points: Point3D[];
  delay: number;
  isBuilding: boolean;
}

export function AnimatedRightAngle({ rightAngle, points, delay, isBuilding }: Props) {
  const ref = useRef<THREE.Group>(null);
  const progressRef = useRef(isBuilding ? 0 : 1);

  const vertex = points.find(p => p.id === rightAngle.vertex);
  const p1 = points.find(p => p.id === rightAngle.p1);
  const p2 = points.find(p => p.id === rightAngle.p2);

  const squarePoints = useMemo(() => {
    if (!vertex || !p1 || !p2) return null;
    const V = new THREE.Vector3(vertex.x, vertex.z, vertex.y);
    const A = new THREE.Vector3(p1.x, p1.z, p1.y);
    const B = new THREE.Vector3(p2.x, p2.z, p2.y);

    const size = 0.25;
    const vA = A.clone().sub(V).normalize().multiplyScalar(size);
    const vB = B.clone().sub(V).normalize().multiplyScalar(size);

    const corner1 = V.clone().add(vA);
    const corner2 = V.clone().add(vA).add(vB);
    const corner3 = V.clone().add(vB);

    return [
      [corner1.x, corner1.y, corner1.z] as [number, number, number],
      [corner2.x, corner2.y, corner2.z] as [number, number, number],
      [corner3.x, corner3.y, corner3.z] as [number, number, number],
    ];
  }, [vertex, p1, p2]);

  const animCtx = useAnimationOptional();
  const geometryCtx = useGeometryOptional();
  const isManualMode = geometryCtx?.state.manualMode ?? false;

  useFrame((_, delta) => {
    if (animCtx && !isManualMode && isBuilding) {
      const t = animCtx.globalTimeRef.current;
      const DURATION = 300;
      let scale = Math.max(0, Math.min(1, (t - delay) / DURATION));
      
      if (t > delay + DURATION) {
        const timeSinceDone = t - (delay + DURATION);
        if (timeSinceDone < 600) {
          scale = 1 + 0.4 * Math.sin(timeSinceDone * Math.PI / 150) * Math.exp(-timeSinceDone / 200);
        } else {
          scale = 1;
        }
      }
      
      progressRef.current = scale;
      if (ref.current) ref.current.scale.setScalar(scale);
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

  if (!squarePoints) return null;

  return (
    <group ref={ref}>
      <Line points={squarePoints} color="#3498db" lineWidth={2} />
    </group>
  );
}
