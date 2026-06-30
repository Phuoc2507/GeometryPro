import { useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Line3D, Point3D } from '@/types/geometry';
import { Line } from '@react-three/drei';
import { getCssHslVar } from '@/lib/getCssHslVar';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';

interface AnimatedLineProps {
  line: Line3D;
  points: Point3D[];
  delay: number;
  isBuilding: boolean;
  dynamicHidden?: boolean;
  highlighted?: boolean;
}

export function AnimatedLine({ line, points, delay, isBuilding, dynamicHidden = false, highlighted = false }: AnimatedLineProps) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(1);
  const [targetProgress, setTargetProgress] = useState(1);

  // Use theme foreground for on-screen visibility (dark mode => light lines).
  const defaultColor = useMemo(() => getCssHslVar('--foreground'), []);
  const lineColor = highlighted ? '#f97316' : defaultColor;

  const fromPoint = points.find((p) => p.id === line.from);
  const toPoint = points.find((p) => p.id === line.to);

  const animCtx = useAnimationOptional();
  const geometryCtx = useGeometryOptional();
  const isManualMode = geometryCtx?.state.manualMode ?? false;
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
  const isDashed = dynamicHidden;

  return (
    <Line
      key={`${line.id}-${isDashed ? 'dashed' : 'solid'}-${highlighted ? 'hl' : ''}`}
      points={[
        [start.x, start.y, start.z],
        [current.x, current.y, current.z],
      ]}
      color={lineColor}
      lineWidth={highlighted ? 5 : (isDashed ? 1.5 : 3)}
      dashed={isDashed && !highlighted}
      dashSize={0.3}
      dashScale={1}
      gapSize={0.4}
      frustumCulled={false}
    />
  );
}
