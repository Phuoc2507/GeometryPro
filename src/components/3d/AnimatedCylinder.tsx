import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import * as THREE from 'three';
import { Cylinder3D } from '@/types/geometry';
import { getCssHslVar } from '@/lib/getCssHslVar';
import { ContourCircle, SilhouetteGenerators } from './CurvedContour';

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
  const groupRef = useRef<THREE.Group>(null);

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
    } else if (!isBuilding) {
      if (scale !== 1) setScale(1);
      if (!visible) setVisible(true);
    } else if (visible && scale < 1) {
      setScale((prev) => Math.min(prev + delta * 2, 1));
    }
  });

  const { position, quaternion, height } = useMemo(() => {
    const { center1, center2 } = cylinder;
    const c1 = new THREE.Vector3(center1.x, center1.z, center1.y);
    const c2 = new THREE.Vector3(center2.x, center2.z, center2.y);
    const mid = c1.clone().add(c2).multiplyScalar(0.5);
    const dir = c2.clone().sub(c1);
    const h = dir.length();
    dir.normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return { position: mid, quaternion: quat, height: h };
  }, [cylinder]);

  const [hovered, setHovered] = useState(false);

  if (!visible) return null;

  const currentRadius = cylinder.radius * scale;
  const halfHeight = (height * scale) / 2;
  const lineColor = hovered ? '#f97316' : color;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 2) return;
    if (!isManualMode || !geometryCtx) return;
    if (geometryCtx.state.manualTool === 'delete') {
      e.stopPropagation();
      geometryCtx.toggleSelection(cylinder.id);
    }
  };
  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
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
      ref={groupRef}
      position={position}
      quaternion={quaternion}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Top base: hidden (dashed) far arc only when the camera sits below it. */}
      <ContourCircle
        groupRef={groupRef} radius={currentRadius} y={halfHeight}
        color={lineColor} opacity={opacityFactor}
        hiddenWhen={(cam) => cam.y < halfHeight}
      />
      {/* Bottom base: far arc hidden when the camera sits above it. */}
      <ContourCircle
        groupRef={groupRef} radius={currentRadius} y={-halfHeight}
        color={lineColor} opacity={opacityFactor}
        hiddenWhen={(cam) => cam.y > -halfHeight}
      />
      <SilhouetteGenerators
        groupRef={groupRef} radius={currentRadius} yBottom={-halfHeight} yTop={halfHeight}
        color={lineColor} opacity={opacityFactor}
      />

      {/* Invisible body so manual-mode picking still works. */}
      <mesh>
        <cylinderGeometry args={[currentRadius, currentRadius, halfHeight * 2, 24, 1, true]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
