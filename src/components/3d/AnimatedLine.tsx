import { useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Line3D, Point3D } from '@/types/geometry';
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
  /** Advance mode: opacity hiển thị (dim → 0.25). Mặc định 1 = hành vi cũ. */
  opacity?: number;
  /** Advance mode: đường mới ở câu hiện tại → dày hơn chút. */
  emphasize?: boolean;
}

export function AnimatedLine({ line, points, delay, isBuilding, dynamicHidden = false, highlighted = false, opacity = 1, emphasize = false }: AnimatedLineProps) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(1);
  const [targetProgress, setTargetProgress] = useState(1);

  const defaultColor = useMemo(() => getCssHslVar('--foreground'), []);

  const fromPoint = points.find((p) => p.id === line.from);
  const toPoint = points.find((p) => p.id === line.to);

  const animCtx = useAnimationOptional();
  const geometryCtx = useGeometryOptional();
  const isManualMode = geometryCtx?.state.manualMode ?? false;
  
  const isSelected = geometryCtx?.state.selectedIds.includes(line.id) ?? false;
  const [hovered, setHovered] = useState(false);
  
  const isHighlighted = highlighted || isSelected || hovered;
  const lineColor = isHighlighted ? '#f97316' : defaultColor;

  const DURATION = 600; // time to draw line

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

    // Fallback
    if (visible && progress < 1) {
      setProgress((p) => Math.min(1, p + delta * 1.5));
    }
  });

  if (!fromPoint || !toPoint) return null;

  // Swap Y and Z: Math uses Z as height (Oxyz), Three.js uses Y as height
  const start = new THREE.Vector3(fromPoint.x, fromPoint.z, fromPoint.y);
  const end = new THREE.Vector3(toPoint.x, toPoint.z, toPoint.y);
  const current = start.clone().lerp(end, progress);

  // Visibility is determined entirely by realtime raycast occlusion
  const distance = start.distanceTo(current);
  const midPoint = start.clone().lerp(current, 0.5);
  // Default cylinder is aligned with Y axis. Rotate it to match the line direction.
  const direction = current.clone().sub(start).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  const isDashed = dynamicHidden;

  const handleClick = (e: any) => {
    if (e.delta > 2) return; // ignore drags
    if (!isManualMode || !geometryCtx) return;
    // Only allow selecting lines for tools that support lines, e.g. delete
    if (geometryCtx.state.manualTool === 'delete') {
      e.stopPropagation();
      geometryCtx.toggleSelection(line.id);
    } else if (geometryCtx.state.manualTool === 'addPoint') {
      handleAddPoint(e, geometryCtx, false);
    }
  };

  const handlePointerOver = (e: any) => {
    if (!isManualMode || (geometryCtx?.state.manualTool !== 'delete' && geometryCtx?.state.manualTool !== 'addPoint')) return;
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'crosshair';
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  return (
    <group>
      <Line
        key={line.id}
        points={[
          [start.x, start.y, start.z],
          [current.x, current.y, current.z],
        ]}
        color={lineColor}
        lineWidth={isHighlighted ? 5 : (isDashed ? 1.5 : (emphasize ? 4 : 3))}
        dashed={isDashed && !isHighlighted}
        dashSize={0.3}
        dashScale={1}
        gapSize={0.4}
        frustumCulled={false}
        transparent={opacity < 1}
        opacity={opacity}
      />
      {/* Invisible hitbox for easier clicking/hovering */}
      {distance > 0 && (
        <mesh
          position={midPoint}
          quaternion={quaternion}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          userData={{ type: 'line', id: line.id }}
        >
          <cylinderGeometry args={[0.3, 0.3, distance, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
