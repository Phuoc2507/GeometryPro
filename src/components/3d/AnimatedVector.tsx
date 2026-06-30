import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Vector3D, Point3D } from '@/types/geometry';

interface AnimatedVectorProps {
  vector: Vector3D;
  points: Point3D[];
  delay: number;
  isBuilding: boolean;
}

export function AnimatedVector({ vector, points, delay, isBuilding }: AnimatedVectorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(isBuilding ? 0 : 1);

  const fromPt = points.find(p => p.id === vector.from);
  const toPt = points.find(p => p.id === vector.to);
  if (!fromPt || !toPt) return null;

  // Math coords → Three.js (swap Y/Z)
  const origin = useMemo(() => new THREE.Vector3(fromPt.x, fromPt.z, fromPt.y), [fromPt]);
  const target = useMemo(() => new THREE.Vector3(toPt.x, toPt.z, toPt.y), [toPt]);
  const direction = useMemo(() => target.clone().sub(origin), [origin, target]);
  const length = useMemo(() => direction.length(), [direction]);
  const dirNorm = useMemo(() => direction.clone().normalize(), [direction]);

  const color = vector.color || '#e74c3c';
  const headLength = Math.min(0.3, length * 0.2);
  const headRadius = 0.08;
  const shaftRadius = 0.025;

  // Shaft geometry (cylinder along Y, then rotated)
  const { shaftGeo, coneGeo, quaternion, midpoint } = useMemo(() => {
    const shaftLen = length - headLength;
    const sg = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLen, 8);
    sg.translate(0, shaftLen / 2, 0);
    const cg = new THREE.ConeGeometry(headRadius, headLength, 12);
    cg.translate(0, shaftLen + headLength / 2, 0);

    // Quaternion to rotate from Y-up to direction
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNorm);

    const mid = origin.clone().add(target).multiplyScalar(0.5);

    return { shaftGeo: sg, coneGeo: cg, quaternion: q, midpoint: mid };
  }, [origin, dirNorm, length, headLength]);

  const animCtx = useAnimationOptional();
  const geometryCtx = useGeometryOptional();
  const isManualMode = geometryCtx?.state.manualMode ?? false;

  useFrame((_, delta) => {
    if (animCtx && !isManualMode && isBuilding) {
      const t = animCtx.globalTimeRef.current;
      progressRef.current = Math.max(0, Math.min(1, (t - delay) / 300));
      if (groupRef.current) groupRef.current.scale.setScalar(progressRef.current);
      return;
    }

    if (!isBuilding) { 
      if (progressRef.current !== 1) {
        progressRef.current = 1; 
        if (groupRef.current) groupRef.current.scale.setScalar(1);
      }
      return; 
    }
    
    // Fallback
    if (progressRef.current < 1) {
      progressRef.current = Math.min(1, progressRef.current + delta * 3);
      if (groupRef.current) groupRef.current.scale.setScalar(progressRef.current);
    }
  });

  return (
    <group ref={groupRef} position={origin} quaternion={quaternion}>
      <mesh geometry={shaftGeo}>
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh geometry={coneGeo}>
        <meshStandardMaterial color={color} />
      </mesh>
      {vector.label && (
        <Html position={[midpoint.x - origin.x, midpoint.y - origin.y, midpoint.z - origin.z]} center distanceFactor={12}>
          <span className="math-label" style={{
            color, fontSize: '15px',
            background: 'rgba(0,0,0,0.6)', padding: '1px 4px', borderRadius: 3,
          }}>
            {vector.label}
          </span>
        </Html>
      )}
    </group>
  );
}
