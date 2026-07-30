import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import * as THREE from 'three';
import { Surface3D } from '@/types/geometry';
import { handleAddPoint } from './ClickToPlacePoint';
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry.js';
import { ContourCircle, ProfileMeridians } from './CurvedContour';
import { profileOf, surfaceIsHorizontalAxis } from '@/lib/geometry/surfaceProfile';

// Re-export để các test/consumer cũ vẫn import từ đây; logic thuần sống ở surfaceProfile.ts (dùng
// chung cho cả trình xuất TikZ). Xem [[verifying-frontend-geo3d]].
export { profileOf, surfaceIsHorizontalAxis };

interface Props {
  surface: Surface3D;
  delay: number;
  isBuilding: boolean;
}

/** Độ mờ của ĐƯỜNG viền mặt tròn xoay. Mặt chỉ vẽ bằng kinh/vĩ tuyến (không tô mesh), nên opacity
 *  thấp từ LLM (vd 0.15) làm đường gần như vô hình trên nền tối. Nâng sàn để luôn đủ rõ mà vẫn nhạt
 *  hơn nét khối đặc (opacity=1). */
export function surfaceLineOpacity(surface: Surface3D): number {
  return Math.max(0.6, surface.opacity ?? 1);
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
  const lineOpacity = surfaceLineOpacity(surface);
  // center/params BẮT BUỘC theo type, nhưng dữ liệu runtime (LLM/geometry đã lưu) có thể thiếu ⇒ mặc định
  // gốc toạ độ thay vì destructure undefined làm CRASH cả canvas (THREE mất context → màn hình trắng).
  const { x: cx, y: cy, z: cz } = surface.center ?? { x: 0, y: 0, z: 0 };

  const profile = useMemo(() => profileOf(surface), [surface]);
  // Trục quay của profile là local +Y (thẳng đứng). Với axis='Ox' xoay cả group −90° quanh trục Z
  // three (= math +Y) để local +Y trỏ theo math +X ⇒ khối tròn xoay NẰM NGANG mở dọc Ox. Mọi contour
  // (kinh tuyến/vĩ tuyến) dùng frame local nên xoay theo group là nhất quán.
  const rotation = useMemo<[number, number, number]>(
    () => (surfaceIsHorizontalAxis(surface) ? [0, 0, -Math.PI / 2] : [0, 0, 0]),
    [surface],
  );

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
    <group ref={groupRef} position={[cx, cz, cy]} rotation={rotation}>
      {/* Outline meridians (left/right edges of the apparent contour) — nét đậm nhất, định hình bao. */}
      <ProfileMeridians groupRef={groupRef} profile={profile} color={color} opacity={lineOpacity} lineWidth={2.2} />

      {/* Parallels: front arc solid, arc behind the surface dashed. */}
      {parallels.map((ring, i) => (
        <ContourCircle
          key={`parallel-${i}`}
          groupRef={groupRef}
          radius={ring.radius}
          y={ring.y}
          color={color}
          opacity={lineOpacity * 0.85}
          lineWidth={1.8}
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
