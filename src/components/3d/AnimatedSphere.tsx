import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import { Billboard, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { Sphere3D } from '@/types/geometry';
import { getCssHslVar } from '@/lib/getCssHslVar';
import { splitHorizontalCircle } from '@/lib/geometry/contour';

function sanitizeLabel(label: string): string {
  if (!label) return '';
  const subscriptMap: Record<string, string> = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
    '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  };
  const superscriptMap: Record<string, string> = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
    '′': "'",
  };
  return label.replace(/./g, (ch) => subscriptMap[ch] || superscriptMap[ch] || ch);
}

/** Minimal view onto a drei fat-line for imperative per-frame updates. */
type FatLine = {
  geometry: { setPositions: (positions: number[]) => void };
  computeLineDistances: () => void;
};

const ARC = 48;
const flat = (points: THREE.Vector3[]): number[] => points.flatMap((p) => [p.x, p.y, p.z]);

interface AnimatedSphereProps {
  sphere: Sphere3D;
  delay: number;
  isBuilding: boolean;
  /** Advance mode: hệ số nhân opacity (dim → 0.25). Mặc định 1 = hành vi cũ. */
  opacityFactor?: number;
}

export function AnimatedSphere({ sphere, delay, isBuilding, opacityFactor = 1 }: AnimatedSphereProps) {
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(0);

  const sphereColor = useMemo(() => getCssHslVar('--primary'), []);
  const labelColor = useMemo(() => getCssHslVar('--foreground'), []);

  const frontRef = useRef<ComponentRef<typeof Line>>(null);
  const backRef = useRef<ComponentRef<typeof Line>>(null);

  const { center, radius, label } = sphere;

  // The apparent outline (a billboarded circle in the local x–y plane) and
  // initial equator arcs; the arcs are rewritten every frame from the camera.
  const silhouette = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 96; i++) {
      const t = (i / 96) * Math.PI * 2;
      pts.push([radius * Math.cos(t), radius * Math.sin(t), 0]);
    }
    return pts;
  }, [radius]);
  const initialArc = useMemo(
    () => splitHorizontalCircle(radius, new THREE.Vector3(0, 0, 1), ARC),
    [radius],
  );

  useEffect(() => {
    if (isBuilding) {
      const timer = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(timer);
    }
    setVisible(true);
    setScale(1);
  }, [delay, isBuilding]);

  const animCtx = useAnimationOptional();
  const geometryCtx = useGeometryOptional();
  const isManualMode = geometryCtx?.state.manualMode ?? false;

  useFrame(({ camera }, delta) => {
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

    // Split the equator into a camera-facing (solid) and a hidden (dashed) arc.
    const front = frontRef.current as FatLine | null;
    const back = backRef.current as FatLine | null;
    if (front && back && visible) {
      const viewDir = camera.position.clone().sub(new THREE.Vector3(center.x, center.z, center.y));
      const arcs = splitHorizontalCircle(radius, viewDir, ARC);
      front.geometry.setPositions(flat(arcs.front));
      back.geometry.setPositions(flat(arcs.back));
      back.computeLineDistances();
    }
  });

  const [hovered, setHovered] = useState(false);

  if (!visible) return null;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 2) return;
    if (!isManualMode || !geometryCtx) return;
    if (geometryCtx.state.manualTool === 'delete') {
      e.stopPropagation();
      geometryCtx.toggleSelection(sphere.id);
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

  const lineColor = hovered ? '#f97316' : sphereColor;

  return (
    <group
      position={[center.x, center.z, center.y]}
      scale={[scale, scale, scale]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Apparent outline — a circle that always faces the camera. */}
      <Billboard>
        <Line points={silhouette} color={lineColor} lineWidth={1.5} transparent opacity={opacityFactor} />
      </Billboard>

      {/* Equator: front arc solid, hidden arc dashed (rewritten each frame). */}
      <Line ref={frontRef} points={initialArc.front} color={lineColor} lineWidth={1.5} transparent opacity={opacityFactor} />
      <Line ref={backRef} points={initialArc.back} color={lineColor} lineWidth={1.5} dashed dashSize={0.18} gapSize={0.14} transparent opacity={opacityFactor * 0.9} />

      {/* Invisible body so manual-mode picking still works. */}
      <mesh>
        <sphereGeometry args={[radius, 16, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {label && (
        <Html position={[0, radius + 0.15, 0]} center distanceFactor={12} zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
          <span className="math-label" style={{ color: labelColor, fontSize: '16px' }}>
            {sanitizeLabel(label)}
          </span>
        </Html>
      )}
    </group>
  );
}
