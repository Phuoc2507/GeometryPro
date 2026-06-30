import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { Angle3D, Point3D } from '@/types/geometry';

interface Props {
  angle: Angle3D;
  points: Point3D[];
  delay: number;
  isBuilding: boolean;
}

export function AnimatedAngleArc({ angle, points, delay, isBuilding }: Props) {
  const ref = useRef<THREE.Group>(null);
  const progressRef = useRef(isBuilding ? 0 : 1);

  const vertex = points.find(p => p.id === angle.vertex);
  const p1 = points.find(p => p.id === angle.p1);
  const p2 = points.find(p => p.id === angle.p2);

  const { arcPoints, labelPos, angleDeg } = useMemo(() => {
    if (!vertex || !p1 || !p2) return { arcPoints: [] as [number, number, number][], labelPos: [0,0,0] as [number,number,number], angleDeg: 0 };
    const V = new THREE.Vector3(vertex.x, vertex.z, vertex.y);
    const A = new THREE.Vector3(p1.x, p1.z, p1.y);
    const B = new THREE.Vector3(p2.x, p2.z, p2.y);

    const vA = A.clone().sub(V).normalize();
    const vB = B.clone().sub(V).normalize();
    const dot = THREE.MathUtils.clamp(vA.dot(vB), -1, 1);
    const ad = Math.round(Math.acos(dot) * (180 / Math.PI));

    const arcRadius = 0.35;
    const segments = 24;
    const totalAngle = Math.acos(dot);

    const normal = new THREE.Vector3().crossVectors(vA, vB).normalize();
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const a = totalAngle * t;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const rotated = vA.clone().multiplyScalar(cos)
        .add(new THREE.Vector3().crossVectors(normal, vA).multiplyScalar(sin))
        .add(normal.clone().multiplyScalar(normal.dot(vA) * (1 - cos)));
      const pt = V.clone().add(rotated.multiplyScalar(arcRadius));
      pts.push([pt.x, pt.y, pt.z]);
    }

    const midIdx = Math.floor(segments / 2);
    const midPt = new THREE.Vector3(...pts[midIdx]);
    const lp = midPt.sub(V).normalize().multiplyScalar(arcRadius * 1.6).add(V);

    return { arcPoints: pts, labelPos: [lp.x, lp.y, lp.z] as [number,number,number], angleDeg: ad };
  }, [vertex, p1, p2]);

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

  if (!vertex || !p1 || !p2 || arcPoints.length === 0) return null;

  const color = angle.color || '#f39c12';

  return (
    <group ref={ref}>
      <Line points={arcPoints} color={color} lineWidth={2} />
      <Html position={labelPos} center distanceFactor={12}>
        <span className="math-label" style={{
          color, fontSize: '14px',
          background: 'rgba(0,0,0,0.6)', padding: '1px 4px', borderRadius: 3,
        }}>
          {angle.label || `${angleDeg}°`}
        </span>
      </Html>
    </group>
  );
}
