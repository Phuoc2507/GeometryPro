import React, { useMemo, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { Curve3D } from '@/types/geometry';
import { getCssHslVar } from '@/lib/getCssHslVar';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import { computeCurveRenderData } from '@/lib/geometry/curveRender';

interface AnimatedCurveProps {
  curve: Curve3D;
  delay: number;
  isBuilding: boolean;
  /** Advance mode: hệ số nhân opacity (dim → 0.25). Mặc định 1 = hành vi cũ. */
  opacityFactor?: number;
}

export function AnimatedCurve({ curve, delay, isBuilding, opacityFactor = 1 }: AnimatedCurveProps) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(1);
  const [hovered, setHovered] = useState(false);
  const defaultColor = useMemo(() => getCssHslVar('--foreground'), []);

  const animCtx = useAnimationOptional();
  const geometryCtx = useGeometryOptional();
  const isManualMode = geometryCtx?.state.manualMode ?? false;
  const DURATION = 1000;

  useFrame((_, delta) => {
    if (animCtx && !isManualMode && isBuilding) {
      const t = animCtx.globalTimeRef.current;
      const p = Math.max(0, Math.min(1, (t - delay) / DURATION));
      if (progress !== p) setProgress(p);
      if (visible !== (t >= delay)) setVisible(t >= delay);
      return;
    }
    if (!isBuilding) {
      if (progress !== 1) setProgress(1);
      if (!visible) setVisible(true);
      return;
    }
    if (visible && progress < 1) {
      setProgress((p) => Math.min(1, p + delta * 1.5));
    }
  });

  // Toàn bộ toán dựng điểm/mesh nằm ở module thuần (test được ở node). Trả null = đường KHÔNG vẽ được
  // (type lạ / 'expr' thiếu samples) ⇒ BỎ render, tránh <Line> nhận mảng rỗng → Float32Array(-6) sập canvas.
  const renderData = useMemo(() => computeCurveRenderData(curve, progress), [curve, progress]);

  if (!visible || !renderData) return null;
  const { points, shapeGeometry } = renderData;

  let rotation: [number, number, number] = [0, 0, 0];
  const plane = curve.plane || 'xy';
  if (plane === 'xy') {
    rotation = [-Math.PI / 2, 0, 0]; // rot[−π/2]: (x,0,y) → (x,+y,0) — đồ thị TRÊN trục, trùng miền tô
  } else if (plane === 'xz') {
    rotation = [0, 0, 0]; // Math (x, z) -> Three (x, y, 0)
  } else if (plane === 'yz') {
    rotation = [0, -Math.PI / 2, 0]; // Math (y, z) -> Three (0, y, x)
  }

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 2) return;
    if (!isManualMode || !geometryCtx) return;
    if (geometryCtx.state.manualTool === 'delete') {
      e.stopPropagation();
      geometryCtx.toggleSelection(curve.id);
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
      rotation={rotation}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {shapeGeometry && (
        <mesh geometry={shapeGeometry}>
          <meshBasicMaterial
            color={curve.color || defaultColor}
            transparent
            opacity={(curve.fillOpacity || 0.2) * opacityFactor}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
      {points.length >= 2 && (
        <Line
          points={points}
          color={curve.color || defaultColor}
          lineWidth={3}
          frustumCulled={false}
          dashed={curve.style === 'dashed'}
          dashSize={0.2}
          gapSize={0.1}
          transparent={opacityFactor < 1}
          opacity={opacityFactor}
        />
      )}
    </group>
  );
}
