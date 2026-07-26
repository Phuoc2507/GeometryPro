import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import * as THREE from 'three';
import { Surface3D } from '@/types/geometry';
import { handleAddPoint } from './ClickToPlacePoint';
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry.js';
import { ContourCircle, ProfileMeridians } from './CurvedContour';

interface Props {
  surface: Surface3D;
  delay: number;
  isBuilding: boolean;
}

/** Radius and height of the generating profile as a function of t ∈ [0, 1],
 *  in three-space (vertical axis = y), for each surface-of-revolution type. */
function profileOf(surface: Surface3D): (t: number) => { radius: number; y: number } {
  const p = surface.params;
  switch (surface.type) {
    case 'paraboloid': {
      const a = p.a || 2;
      const h = p.h || 4;
      return (t) => ({ radius: a * t, y: h * t * t });
    }
    case 'hyperboloid': {
      const a = p.a || 1;
      const c = p.c || 2;
      const vMin = p.vMin ?? -2;
      const vMax = p.vMax ?? 2;
      return (t) => {
        const v = vMin + t * (vMax - vMin);
        return { radius: a * Math.cosh(v), y: c * Math.sinh(v) };
      };
    }
    case 'torus': {
      const R = p.R || 2;
      const r = p.r || 0.5;
      return (t) => {
        const angle = t * Math.PI * 2;
        return { radius: R + r * Math.cos(angle), y: r * Math.sin(angle) };
      };
    }
    case 'revolution':
    default: {
      const r0 = p.r0 || 1;
      const h = p.h || 4;
      const taper = p.taper || 0;
      return (t) => ({ radius: r0 * (1 - t * taper), y: h * t });
    }
  }
}

const PARALLEL_COUNT = 6;

export function AnimatedSurface({ surface, delay, isBuilding }: Props) {
  const animCtx = useAnimationOptional();
  const geometryCtx = useGeometryOptional();

  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(isBuilding ? 0 : 1);

  const autoColor = geometryCtx?.state.autoColor ?? false;
  const color = useMemo(
    () => (autoColor ? (surface.color || '#8b5cf6') : '#94a3b8'),
    [surface.color, autoColor],
  );
  const opacity = surface.opacity ?? 1;
  const { x: cx, y: cy, z: cz } = surface.center;

  const profile = useMemo(() => profileOf(surface), [surface]);

  // Pickable (invisible) body so manual-mode delete / add-point still work.
  const pickGeometry = useMemo(() => {
    const segments = 24;
    return new ParametricGeometry((u, v, target) => {
      const angle = u * Math.PI * 2;
      const { radius, y } = profile(v);
      target.set(radius * Math.cos(angle), y, radius * Math.sin(angle));
    }, segments, segments);
  }, [profile]);

  // A few parallels (horizontal circles) sampled along the profile.
  const parallels = useMemo(() => {
    const rings: { radius: number; y: number }[] = [];
    for (let i = 0; i < PARALLEL_COUNT; i++) {
      const t = i / (PARALLEL_COUNT - 1);
      const ring = profile(t);
      if (ring.radius > 0.05) rings.push(ring);
    }
    return rings;
  }, [profile]);

  const isManualMode = geometryCtx?.state.manualMode ?? false;

  useFrame((_, delta) => {
    if (animCtx && !isManualMode && isBuilding) {
      const t = animCtx.globalTimeRef.current;
      progressRef.current = Math.max(0, Math.min(1, (t - delay) / 300));
      groupRef.current?.scale.setScalar(progressRef.current);
    } else if (!isBuilding) {
      if (progressRef.current !== 1) {
        progressRef.current = 1;
        groupRef.current?.scale.setScalar(1);
      }
    } else if (progressRef.current < 1) {
      progressRef.current = Math.min(1, progressRef.current + delta * 3);
      groupRef.current?.scale.setScalar(progressRef.current);
    }
  });

  return (
    <group ref={groupRef} position={[cx, cz, cy]}>
      {/* Outline meridians (left/right edges of the apparent contour). */}
      <ProfileMeridians groupRef={groupRef} profile={profile} color={color} opacity={opacity} />

      {/* Parallels: front arc solid, arc behind the surface dashed. */}
      {parallels.map((ring, i) => (
        <ContourCircle
          key={`parallel-${i}`}
          groupRef={groupRef}
          radius={ring.radius}
          y={ring.y}
          color={color}
          opacity={opacity * 0.9}
          hiddenWhen={() => true}
        />
      ))}

      <mesh
        geometry={pickGeometry}
        onClick={(e) => {
          if (!geometryCtx) return;
          const { manualMode, manualTool } = geometryCtx.state;
          if (!manualMode) return;
          if (manualTool === 'delete') {
            e.stopPropagation();
            geometryCtx.toggleSelection(surface.id);
          } else if (manualTool === 'addPoint') {
            handleAddPoint(e, geometryCtx, false);
          }
        }}
        onPointerOver={(e) => {
          if (!geometryCtx) return;
          const { manualMode, manualTool } = geometryCtx.state;
          if (!manualMode || (manualTool !== 'delete' && manualTool !== 'addPoint')) return;
          e.stopPropagation();
          document.body.style.cursor = 'crosshair';
        }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
