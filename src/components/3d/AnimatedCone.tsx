import { useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import * as THREE from 'three';
import { Cone3D } from '@/types/geometry';
import { getCssHslVar } from '@/lib/getCssHslVar';

interface AnimatedConeProps {
  cone: Cone3D;
  delay: number;
  isBuilding: boolean;
}

export function AnimatedCone({ cone, delay, isBuilding }: AnimatedConeProps) {
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(0);
  const color = useMemo(() => cone.color || getCssHslVar('--primary'), [cone.color]);

  useEffect(() => {
    if (!isBuilding) {
      setVisible(true);
      setScale(1);
      return;
    }
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay, isBuilding]);

  const animCtx = useAnimationOptional();
  const geometryCtx = useGeometryOptional();
  const isManualMode = geometryCtx?.state.manualMode ?? false;

  useFrame((_, delta) => {
    if (animCtx && !isManualMode && isBuilding) {
      const t = animCtx.globalTimeRef.current;
      const s = Math.max(0, Math.min(1, (t - delay) / 500));
      if (scale !== s) setScale(s);
      if (visible !== (t >= delay)) setVisible(t >= delay);
      return;
    }

    if (!isBuilding) {
      if (scale !== 1) setScale(1);
      if (!visible) setVisible(true);
      return;
    }

    if (visible && scale < 1) {
      setScale((prev) => Math.min(prev + delta * 2, 1));
    }
  });

  const { position, quaternion, height } = useMemo(() => {
    const { apex, baseCenter } = cone;
    // Swap Y/Z for Three.js
    const a = new THREE.Vector3(apex.x, apex.z, apex.y);
    const b = new THREE.Vector3(baseCenter.x, baseCenter.z, baseCenter.y);

    // ConeGeometry tip is at top (+Y), base at bottom (-Y)
    // We want apex at 'a' and base at 'b'
    const dir = a.clone().sub(b).normalize();
    const h = a.distanceTo(b);
    // Position at midpoint
    const mid = b.clone().add(a).multiplyScalar(0.5);

    const yAxis = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(yAxis, dir);

    return { position: mid, quaternion: quat, height: h };
  }, [cone]);

  if (!visible) return null;

  const currentRadius = cone.radius * scale;
  const currentHeight = height * scale;

  return (
    <group position={position} quaternion={quaternion}>
      {/* Removed wireframe cone to reduce visual clutter */}

      {/* Semi-transparent fill (Frosted Glass) */}
      <mesh>
        <coneGeometry args={[currentRadius, currentHeight, 32, 1, true]} />
        <meshPhysicalMaterial color={color} transparent opacity={0.3} roughness={0.2} transmission={0.8} thickness={0.5} clearcoat={1.0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Base cap to replace native cap, avoiding Z-fighting */}
      <mesh position={[0, -currentHeight / 2 + 0.002, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[currentRadius, 32]} />
        <meshPhysicalMaterial color={color} transparent opacity={0.3} roughness={0.2} transmission={0.8} thickness={0.5} clearcoat={1.0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Base ring outline - slightly offset to avoid z-fighting with the base cap */}
      <mesh position={[0, -currentHeight / 2 - 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[currentRadius * 0.98, currentRadius, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
