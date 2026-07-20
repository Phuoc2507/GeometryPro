import { useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { Circle3D } from '@/types/geometry';
import { getCssHslVar } from '@/lib/getCssHslVar';

interface AnimatedCircleProps {
  circle: Circle3D;
  delay: number;
  isBuilding: boolean;
  /** Advance mode: hệ số nhân opacity (dim → 0.25). Mặc định 1 = hành vi cũ. */
  opacityFactor?: number;
}

export function AnimatedCircle({ circle, delay, isBuilding, opacityFactor = 1 }: AnimatedCircleProps) {
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(0);
  const color = useMemo(() => circle.color || getCssHslVar('--primary'), [circle.color]);

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

  // Generate circle points in 3D, oriented by normal vector
  const circlePoints = useMemo(() => {
    const segments = 64;
    const { center, radius, normal } = circle;

    // Create a rotation quaternion to orient the circle
    const up = new THREE.Vector3(0, 1, 0); // Three.js Y-up
    // Normal: swap Y/Z for Three.js (math Z-up -> Three.js Y-up)
    const n = new THREE.Vector3(normal.x, normal.z, normal.y).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(up, n);

    const points: [number, number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const localPoint = new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
      localPoint.applyQuaternion(quat);
      // Swap Y/Z for position
      points.push([
        localPoint.x + center.x,
        localPoint.y + center.z,
        localPoint.z + center.y,
      ]);
    }
    return points;
  }, [circle]);

  const [hovered, setHovered] = useState(false);

  if (!visible) return null;

  const scaledPoints = circlePoints.map(([x, y, z]) => {
    const cx = circle.center.x;
    const cy = circle.center.z; // swapped
    const cz = circle.center.y; // swapped
    return [
      cx + (x - cx) * scale,
      cy + (y - cy) * scale,
      cz + (z - cz) * scale,
    ] as [number, number, number];
  });

  const handleClick = (e: any) => {
    if (e.delta > 2) return;
    if (!isManualMode || !geometryCtx) return;
    if (geometryCtx.state.manualTool === 'deleteLine') {
      e.stopPropagation();
      geometryCtx.toggleSelection(circle.id);
    }
  };

  const handlePointerOver = (e: any) => {
    if (!isManualMode || geometryCtx?.state.manualTool !== 'deleteLine') return;
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
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <Line
        points={scaledPoints}
        color={color}
        lineWidth={hovered ? 4 : 2}
        transparent={opacityFactor < 1}
        opacity={opacityFactor}
      />
      {/* Invisible hitbox for the outline */}
      <mesh position={[circle.center.x, circle.center.z, circle.center.y]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[circle.radius * scale - 0.2, circle.radius * scale + 0.2, 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
