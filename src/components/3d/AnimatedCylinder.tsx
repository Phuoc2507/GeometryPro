import { useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import * as THREE from 'three';
import { Cylinder3D } from '@/types/geometry';
import { getCssHslVar } from '@/lib/getCssHslVar';

interface AnimatedCylinderProps {
  cylinder: Cylinder3D;
  delay: number;
  isBuilding: boolean;
  /** Advance mode: hệ số nhân opacity (dim → 0.25). Mặc định 1 = hành vi cũ. */
  opacityFactor?: number;
}

export function AnimatedCylinder({ cylinder, delay, isBuilding, opacityFactor = 1 }: AnimatedCylinderProps) {
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(0);
  const color = useMemo(() => cylinder.color || getCssHslVar('--primary'), [cylinder.color]);

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

  // Calculate position, rotation, and height
  const { position, quaternion, height } = useMemo(() => {
    const { center1, center2 } = cylinder;
    // Swap Y/Z for Three.js
    const c1 = new THREE.Vector3(center1.x, center1.z, center1.y);
    const c2 = new THREE.Vector3(center2.x, center2.z, center2.y);

    const mid = c1.clone().add(c2).multiplyScalar(0.5);
    const dir = c2.clone().sub(c1);
    const h = dir.length();
    dir.normalize();

    // CylinderGeometry is aligned along Y axis by default
    const yAxis = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(yAxis, dir);

    return { position: mid, quaternion: quat, height: h };
  }, [cylinder]);

  const [hovered, setHovered] = useState(false);

  if (!visible) return null;

  const currentRadius = cylinder.radius * scale;
  const currentHeight = height * scale;

  const handleClick = (e: any) => {
    if (e.delta > 2) return;
    if (!isManualMode || !geometryCtx) return;
    if (geometryCtx.state.manualTool === 'delete') {
      e.stopPropagation();
      geometryCtx.toggleSelection(cylinder.id);
    }
  };

  const handlePointerOver = (e: any) => {
    if (!isManualMode || geometryCtx?.state.manualTool !== 'delete') return;
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'crosshair';
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  return (
    <group 
      position={position} 
      quaternion={quaternion}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Removed wireframe cylinder to reduce visual clutter */}

      {/* Semi-transparent fill (Frosted Glass) */}
      <mesh>
        <cylinderGeometry args={[currentRadius, currentRadius, currentHeight, 32, 1, true]} />
        <meshStandardMaterial color={color} transparent opacity={0.3 * opacityFactor} roughness={0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Top cap */}
      <mesh position={[0, currentHeight / 2 - 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[currentRadius, 32]} />
        <meshStandardMaterial color={color} transparent opacity={0.3 * opacityFactor} roughness={0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, currentHeight / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[currentRadius * 0.98, currentRadius, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.6 * opacityFactor} />
      </mesh>

      {/* Bottom cap */}
      <mesh position={[0, -currentHeight / 2 + 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[currentRadius, 32]} />
        <meshStandardMaterial color={color} transparent opacity={0.3 * opacityFactor} roughness={0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, -currentHeight / 2 - 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[currentRadius * 0.98, currentRadius, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.6 * opacityFactor} />
      </mesh>
    </group>
  );
}
