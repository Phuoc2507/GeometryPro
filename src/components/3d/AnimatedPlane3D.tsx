import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Plane3D } from '@/types/geometry';
import { getCssHslVar } from '@/lib/getCssHslVar';
import { loadPreferences } from '@/lib/preferences';
import { planeSgkName } from '@/lib/geometry/planeSgkLabel';
import { Line, Html } from '@react-three/drei';
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

/** Độ mờ lớp kính (khi bật "tô màu mặt phẳng"), đọc từ Settings và cập nhật ngay khi đổi. */
function usePlaneGlassOpacity(): number {
  const [v, setV] = useState(() => loadPreferences().planeGlassOpacity);
  useEffect(() => {
    const update = () => setV(loadPreferences().planeGlassOpacity);
    window.addEventListener('geometrypro:prefs', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('geometrypro:prefs', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return v;
}

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
  const glassOpacity = usePlaneGlassOpacity();
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

  // Kiểu SGK: mặt phẳng có 4 đỉnh ẩn danh (P', P''…) chỉ hiện MỘT nhãn "(P)" cạnh
  // một góc; nhãn của các đỉnh đó bị ẩn (xem GeometryRenderer). null nếu là điểm tên thật.
  const sgkName = useMemo(() => {
    const pts = geometryCtx?.state.geometry?.points;
    if (!plane.pointIds?.length || !pts) return null;
    const byId = new Map(pts.map((p) => [p.id, p]));
    return planeSgkName(plane.pointIds.map((id) => byId.get(id)?.label));
  }, [geometryCtx?.state.geometry?.points, plane.pointIds]);

  // Vị trí nhãn: một góc, đẩy nhẹ ra ngoài tâm cho giống SGK (ghi ngoài mép mặt).
  const labelPos = useMemo(() => {
    const v = polygon?.vertices?.[0];
    const c = polygon?.center;
    if (!sgkName || !v || !c) return null;
    return new THREE.Vector3().subVectors(v, c).multiplyScalar(0.16).add(v);
  }, [polygon, sgkName]);

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

    // Mặc định mặt phẳng vẽ SUỐT (chỉ còn viền do AnimatedLine vẽ). Khi bật
    // "tô màu mặt phẳng" (autoColor) → phủ một LỚP KÍNH MỜ với độ mờ chỉnh trong
    // Settings. Cross-section động (fold/fade) luôn giữ fill để thấy animation.
    if (tracks.length > 0) {
      const baseOpacity = (plane.opacity ?? 0.2) * nextOpacity * opacityFactor;
      material.opacity = isHighlighted ? Math.min(1, baseOpacity * 2) : baseOpacity;
    } else if (autoColor) {
      const baseOpacity = glassOpacity * nextOpacity * opacityFactor;
      material.opacity = isHighlighted ? Math.min(0.85, baseOpacity * 1.8) : baseOpacity;
    } else {
      material.opacity = 0;
    }
    material.needsUpdate = false;
    const outlineMaterial = (outlineRef.current as { material?: OpacityMaterial } | null)?.material;
    if (outlineMaterial) {
      // AnimatedLine already draws every edge (solid when visible, dashed when
      // hidden). A transparent surface face must NOT also stroke its boundary,
      // or a hidden edge shows a faint SOLID outline layered under the dashes
      // ("vừa liền mờ vừa đứt"). Keep the outline only for animated (filled)
      // sections and while this plane is highlighted.
      outlineMaterial.opacity = isHighlighted
        ? 1
        : (tracks.length > 0 ? nextOpacity * 0.6 * opacityFactor : 0);
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
          opacity={tracks.length > 0 ? (plane.opacity ?? 0.2) * opacityFactor : (autoColor ? glassOpacity * opacityFactor : 0)}
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
        opacity={tracks.length > 0 ? opacityFactor * 0.6 : 0}
      />

      {/* Nhãn mặt phẳng kiểu SGK — "(P)" cạnh một góc (thay cho 4 nhãn P', P''…). */}
      {sgkName && labelPos && (
        <Html
          position={[labelPos.x, labelPos.y, labelPos.z]}
          center
          distanceFactor={12}
          zIndexRange={[30, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <span
            className="math-label"
            style={{
              color: 'hsl(var(--foreground))',
              fontSize: '18px',
              fontStyle: 'italic',
              WebkitTextStroke: '3px hsl(var(--background))',
              paintOrder: 'stroke fill',
              whiteSpace: 'nowrap',
            }}
          >
            ({sgkName})
          </span>
        </Html>
      )}
    </group>
  );
}
