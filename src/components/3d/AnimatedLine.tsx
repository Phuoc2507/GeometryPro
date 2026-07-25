import React, { useMemo, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Line3D, Point3D } from '@/types/geometry';
import { Line } from '@react-three/drei';
import { getCssHslVar } from '@/lib/getCssHslVar';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import { handleAddPoint } from './ClickToPlacePoint';

interface AnimatedLineProps {
  line: Line3D;
  points: Point3D[];
  delay: number;
  isBuilding: boolean;
  dynamicHidden?: boolean;
  highlighted?: boolean;
  opacity?: number;
  emphasize?: boolean;
}

function AnimatedLineComponent({
  line,
  points,
  delay,
  isBuilding,
  dynamicHidden = false,
  highlighted = false,
  opacity = 1,
  emphasize = false,
}: AnimatedLineProps) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(1);
  const [hovered, setHovered] = useState(false);
  const defaultColor = useMemo(() => getCssHslVar('--foreground'), []);
  const fromPoint = points.find((point) => point.id === line.from);
  const toPoint = points.find((point) => point.id === line.to);
  const animCtx = useAnimationOptional();
  const geometryCtx = useGeometryOptional();
  const isManualMode = geometryCtx?.state.manualMode ?? false;
  const isSelected = geometryCtx?.state.selectedIds.includes(line.id) ?? false;
  const isHighlighted = highlighted || isSelected || hovered;
  // The dashed/solid decision is made upstream by hidden-line detection
  // (see isLineDashed / effectiveDashMap) and passed in already resolved, so
  // geometry — not the producer's style guess — drives it.
  const isDashed = dynamicHidden;
  const lineColor = isHighlighted ? '#f97316' : defaultColor;

  useFrame((_, delta) => {
    if (animCtx && !isManualMode && isBuilding) {
      const time = animCtx.globalTimeRef.current;
      const nextProgress = THREE.MathUtils.clamp((time - delay) / 600, 0, 1);
      if (Math.abs(progress - nextProgress) > 1e-4) setProgress(nextProgress);
      const nextVisible = time >= delay;
      if (visible !== nextVisible) setVisible(nextVisible);
      return;
    }
    if (!isBuilding) {
      if (progress !== 1) setProgress(1);
      if (!visible) setVisible(true);
    } else if (visible && progress < 1) {
      setProgress((value) => Math.min(1, value + delta * 1.5));
    }
  });

  const shape = useMemo(() => {
    if (!fromPoint || !toPoint) return null;
    const start = new THREE.Vector3(fromPoint.x, fromPoint.z, fromPoint.y);
    const end = new THREE.Vector3(toPoint.x, toPoint.z, toPoint.y);
    const current = start.clone().lerp(end, progress);
    const distance = start.distanceTo(current);
    const midpoint = start.clone().lerp(current, 0.5);
    const direction = current.clone().sub(start);
    const quaternion = direction.lengthSq() > 1e-12
      ? new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize(),
      )
      : new THREE.Quaternion();
    const linePoints: [number, number, number][] = [
      [start.x, start.y, start.z],
      [current.x, current.y, current.z],
    ];
    return { distance, linePoints, midpoint, quaternion };
  }, [fromPoint, progress, toPoint]);

  if (!shape || !visible) return null;

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 2 || !isManualMode || !geometryCtx) return;
    if (geometryCtx.state.manualTool === 'delete') {
      event.stopPropagation();
      geometryCtx.toggleSelection(line.id);
    } else if (geometryCtx.state.manualTool === 'addPoint') {
      handleAddPoint(event, geometryCtx, false);
    }
  };

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    if (!isManualMode || (geometryCtx?.state.manualTool !== 'delete' && geometryCtx?.state.manualTool !== 'addPoint')) return;
    event.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'crosshair';
  };

  return (
    <group>
      <Line
        points={shape.linePoints}
        color={lineColor}
        lineWidth={isHighlighted ? 5 : (isDashed ? 1.5 : (emphasize ? 4 : 3))}
        // Keep USE_DASH compiled for both states. A huge dash with no gap is
        // visually solid and avoids a shader recompile/remount at face changes.
        dashed
        dashSize={isDashed ? 0.3 : 1e6}
        dashScale={1}
        gapSize={isDashed ? 0.4 : 0}
        frustumCulled={false}
        transparent={opacity < 1}
        opacity={opacity}
        userData={{ type: 'geometry-line', lineId: line.id }}
      />
      {shape.distance > 0 && (
        <mesh
          position={shape.midpoint}
          quaternion={shape.quaternion}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = 'auto';
          }}
          userData={{ type: 'line', id: line.id }}
        >
          <cylinderGeometry args={[0.3, 0.3, shape.distance, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

export const AnimatedLine = React.memo(AnimatedLineComponent);
