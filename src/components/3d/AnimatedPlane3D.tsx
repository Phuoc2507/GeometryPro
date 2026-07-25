import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Plane3D } from '@/types/geometry';
import { getCssHslVar } from '@/lib/getCssHslVar';
import { Line } from '@react-three/drei';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import { handleAddPoint } from './ClickToPlacePoint';
import { buildPlanarPolygonGeometry } from '@/lib/geometry/planeGeometry';

interface AnimatedPlane3DProps {
  plane: Plane3D;
  delay: number;
  isBuilding: boolean;
  opacityFactor?: number;
  emphasize?: boolean;
}

type OpacityMaterial = THREE.Material & { opacity: number };

export function AnimatedPlane3D({
  plane,
  delay,
  isBuilding,
  opacityFactor = 1,
  emphasize = false,
}: AnimatedPlane3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const outlineRef = useRef<ComponentRef<typeof Line>>(null);
  const animationOpacityRef = useRef(isBuilding ? 0 : 1);
  const [hovered, setHovered] = useState(false);
  const animCtx = useAnimationOptional();
  const geometryCtx = useGeometryOptional();

  const autoColor = geometryCtx?.state.autoColor ?? false;
  const color = useMemo(
    () => autoColor ? (plane.color || getCssHslVar('--accent')) : '#94a3b8',
    [autoColor, plane.color],
  );
  const isManualMode = geometryCtx?.state.manualMode ?? false;
  const isVideoMode = geometryCtx?.state.videoMode ?? false;
  const isSelected = geometryCtx?.state.selectedIds.includes(plane.id) ?? false;
  const isHighlighted = isSelected || hovered;
  const displayColor = isHighlighted ? '#f97316' : color;

  const tracks = useMemo(
    () => geometryCtx?.state.geometry?.timeline?.tracks?.filter((track) => track.targetId === plane.id) ?? [],
    [geometryCtx?.state.geometry?.timeline?.tracks, plane.id],
  );
  const resolvedPlanePoints = useMemo(() => {
    const geometryPoints = geometryCtx?.state.geometry?.points;
    if (!plane.pointIds?.length || !geometryPoints) return plane.points || [];
    const pointMap = new Map(geometryPoints.map((point) => [point.id, point]));
    const resolved = plane.pointIds.map((id) => pointMap.get(id));
    const valid = resolved.filter((point) => point !== undefined);
    return valid.length === plane.pointIds.length
      ? valid
      : plane.points || [];
  }, [geometryCtx?.state.geometry?.points, plane.pointIds, plane.points]);
  const polygon = useMemo(
    () => buildPlanarPolygonGeometry(resolvedPlanePoints),
    [resolvedPlanePoints],
  );
  useEffect(() => () => polygon?.geometry.dispose(), [polygon]);

  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    rotation: new THREE.Matrix4(),
    translateToOrigin: new THREE.Matrix4(),
    translateBack: new THREE.Matrix4(),
    point: new THREE.Vector3(),
    direction: new THREE.Vector3(),
  }), []);

  useFrame((_state, delta) => {
    const group = groupRef.current;
    const material = materialRef.current;
    if (!group || !material) return;

    let nextOpacity = 1;
    let nextVisible = true;
    scratch.matrix.identity();

    if (animCtx && !isManualMode) {
      const timeMs = animCtx.globalTimeRef.current;
      const timeSeconds = timeMs / 1000;
      if (isVideoMode && tracks.length > 0) {
        for (const track of tracks) {
          const duration = Math.max(1e-6, track.end - track.start);
          const progress = THREE.MathUtils.clamp((timeSeconds - track.start) / duration, 0, 1);
          if (track.type === 'fade') {
            const from = track.params.opacityStart ?? 1;
            const to = track.params.opacityEnd ?? 0;
            nextOpacity = THREE.MathUtils.lerp(from, to, progress);
          } else if (track.type === 'fold' && track.params.axisPoint && track.params.axisDir) {
            const angle = THREE.MathUtils.lerp(
              track.params.angleStart ?? 0,
              track.params.angleEnd ?? 0,
              progress,
            );
            const { x: px, y: py, z: pz } = track.params.axisPoint;
            const { x: dx, y: dy, z: dz } = track.params.axisDir;
            scratch.point.set(px, pz, py);
            scratch.direction.set(dx, dz, dy).normalize();
            scratch.rotation.makeRotationAxis(scratch.direction, angle);
            scratch.translateToOrigin.makeTranslation(-scratch.point.x, -scratch.point.y, -scratch.point.z);
            scratch.translateBack.makeTranslation(scratch.point.x, scratch.point.y, scratch.point.z);
            scratch.matrix.copy(scratch.translateBack)
              .multiply(scratch.rotation)
              .multiply(scratch.translateToOrigin);
          }
        }
        nextVisible = nextOpacity > 0.01;
      } else if (isBuilding) {
        nextOpacity = THREE.MathUtils.clamp((timeMs - delay) / 500, 0, 1);
        nextVisible = timeMs >= delay;
      }
    } else if (isBuilding && !isManualMode) {
      animationOpacityRef.current = Math.min(1, animationOpacityRef.current + delta * 4);
      nextOpacity = animationOpacityRef.current;
    }
    animationOpacityRef.current = nextOpacity;

    // Surface faces are now derived from geometry (see deriveSurfaceFaces), so a
    // rendered plane is always a genuine outer face. Keep it visible from every
    // angle instead of fading the side that faces away from the camera.
    group.visible = nextVisible && nextOpacity > 0.01;
    if (!group.matrix.equals(scratch.matrix)) {
      group.matrix.copy(scratch.matrix);
      group.matrixWorldNeedsUpdate = true;
    }

    const baseOpacity = (plane.opacity ?? 0.2) * nextOpacity * opacityFactor;
    material.opacity = isHighlighted ? Math.min(1, baseOpacity * 2) : baseOpacity;
    material.needsUpdate = false;
    const outlineMaterial = (outlineRef.current as { material?: OpacityMaterial } | null)?.material;
    if (outlineMaterial) {
      outlineMaterial.opacity = isHighlighted ? 1 : nextOpacity * 0.6 * opacityFactor;
    }
  });

  if (!polygon) return null;

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!isManualMode || !geometryCtx) return;
    const hasLine = event.intersections.some((intersection) => intersection.object.userData?.type === 'line');
    if (hasLine && geometryCtx.state.manualTool === 'delete') return;
    if (geometryCtx.state.manualTool === 'delete') {
      event.stopPropagation();
      geometryCtx.toggleSelection(plane.id);
    } else if (geometryCtx.state.manualTool === 'addPoint') {
      handleAddPoint(event, geometryCtx, false);
    }
  };

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    if (!isManualMode || (geometryCtx?.state.manualTool !== 'delete' && geometryCtx?.state.manualTool !== 'addPoint')) return;
    const hasLine = event.intersections.some((intersection) => intersection.object.userData?.type === 'line');
    if (hasLine && geometryCtx?.state.manualTool === 'delete') return;
    event.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'crosshair';
  };

  return (
    <group ref={groupRef} matrixAutoUpdate={false} visible={!isBuilding}>
      <mesh
        geometry={polygon.geometry}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <meshBasicMaterial
          ref={materialRef}
          color={displayColor}
          transparent
          opacity={(plane.opacity ?? 0.2) * opacityFactor}
          side={THREE.DoubleSide}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      <Line
        ref={outlineRef}
        points={polygon.edgePoints}
        color={displayColor}
        lineWidth={isHighlighted ? 3 : (emphasize ? 2.5 : 1.5)}
        transparent
        opacity={opacityFactor * 0.6}
      />
    </group>
  );
}
