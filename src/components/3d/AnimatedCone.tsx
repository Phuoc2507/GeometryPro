import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import * as THREE from 'three';
import { Cone3D } from '@/types/geometry';
import { getCssHslVar } from '@/lib/getCssHslVar';
import { ContourCircle, SilhouetteGenerators } from './CurvedContour';

interface AnimatedConeProps {
  cone: Cone3D;
  delay: number;
  isBuilding: boolean;
  /** Advance mode: hệ số nhân opacity (dim → 0.25). Mặc định 1 = hành vi cũ. */
  opacityFactor?: number;
}

export function AnimatedCone({ cone, delay, isBuilding, opacityFactor = 1 }: AnimatedConeProps) {
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(0);
  const color = useMemo(() => cone.color || getCssHslVar('--primary'), [cone.color]);
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
    const { apex, baseCenter } = cone;
    const a = new THREE.Vector3(apex.x, apex.z, apex.y);
    const b = new THREE.Vector3(baseCenter.x, baseCenter.z, baseCenter.y);
    const dir = a.clone().sub(b).normalize();
    const h = a.distanceTo(b);
    const mid = b.clone().add(a).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return { position: mid, quaternion: quat, height: h };
  }, [cone]);

  const [hovered, setHovered] = useState(false);

  if (!visible) return null;

  const currentRadius = cone.radius * scale;
  const halfHeight = (height * scale) / 2;
  const lineColor = hovered ? '#f97316' : color;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 2) return;
    if (!isManualMode || !geometryCtx) return;
    if (geometryCtx.state.manualTool === 'delete') {
      e.stopPropagation();
      geometryCtx.toggleSelection(cone.id);
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
      {/* Base circle: far arc hidden (dashed) when the camera sits above the
          base plane (the apex side), which hides it behind the cone. */}
      <ContourCircle
        groupRef={groupRef} radius={currentRadius} y={-halfHeight}
        color={lineColor} opacity={opacityFactor}
        hiddenWhen={(cam) => cam.y > -halfHeight}
      />
      {/* Two slant generators from the base rim up to the apex. */}
      <SilhouetteGenerators
        groupRef={groupRef} radius={currentRadius} yBottom={-halfHeight} yTop={halfHeight}
        converge color={lineColor} opacity={opacityFactor}
      />

      {/* Invisible body so manual-mode picking still works. */}
      <mesh>
        <coneGeometry args={[currentRadius, halfHeight * 2, 24, 1, true]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
