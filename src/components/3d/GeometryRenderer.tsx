import React, { useEffect } from 'react';
import { useCameraOptional } from '@/context/CameraContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import { GeometryData, Plane3D } from '@/types/geometry';
import { projectScene } from '@/lib/advanceProject';
import { buildSolveReveal } from '@/lib/solveReveal';
import { AnimatedPoint } from './AnimatedPoint';
import { DraggablePoint } from './DraggablePoint';
import { AnimatedLine } from './AnimatedLine';
import { AnimatedSphere } from './AnimatedSphere';
import { AnimatedCircle } from './AnimatedCircle';
import { AnimatedCylinder } from './AnimatedCylinder';
import { AnimatedCone } from './AnimatedCone';
import { AnimatedPlane3D } from './AnimatedPlane3D';
import { AnimatedVector } from './AnimatedVector';
import { AnimatedAngleArc } from './AnimatedAngleArc';
import { AnimatedRightAngle } from './AnimatedRightAngle';
import { AnimatedEqualMark } from './AnimatedEqualMark';
import { AnimatedParallelMark } from './AnimatedParallelMark';
import { AnimatedDynamicPoint } from './AnimatedDynamicPoint';
import { AnimatedSurface } from './AnimatedSurface';
import { AnimatedCurve } from './AnimatedCurve';
import { useHiddenLineDetection } from '@/hooks/useHiddenLineDetection';
import { TimelineGroup } from './TimelineGroup';
import { AnimatedWater } from './AnimatedWater';
import { AnimatedAgent } from './AnimatedAgent';
import { useAnimationOptional } from '@/context/AnimationContext';

interface GeometryRendererProps {
  geometry: GeometryData | null;
  isBuilding: boolean;
}

import { DynamicCrossSection } from './DynamicCrossSection';
import { DynamicUnfolding } from './DynamicUnfolding';
import { useToolMode } from '@/context/ToolModeContext';

// Advance mode: cờ dim → mờ (giữ ngữ cảnh câu trước), highlight/không cờ → đầy.
const DIM_OPACITY = 0.25;

export function GeometryRenderer({ geometry: geometryProp, isBuilding }: GeometryRendererProps) {
  const cameraContext = useCameraOptional();
  const geometryContext = useGeometryOptional();
  const animCtx = useAnimationOptional();

  // ═══ Advance mode (đa-câu) ═══
  // Khi có advanceScene: render "hình dẫn xuất" của câu hiện tại = base + cờ
  // hidden/dim/highlight per phần tử (projectScene). Ta chiếu cờ lên chính
  // geometry đã scale (prop) để GIỮ toạ độ đã co giãn — SET_ADVANCE_SCENE đặt
  // state.geometry = base nên prop chính là base (đã scale, cùng id).
  const advanceScene = geometryContext?.state.advanceScene ?? null;
  const currentStep = geometryContext?.state.currentStep ?? 0;
  // Bóc-lớp theo bước LỜI GIẢI: ẩn các điểm dựng CHƯA tới bước hiện tại. Nhấn mạnh
  // điểm vừa dựng đi qua kênh highlightedIds sẵn có (không đụng dim của advance).
  const revealVisibleIds = cameraContext?.revealVisibleIds ?? null;

  // Lời giải + reveal của CÂU hiện tại — tách ra memo riêng để dùng lại cho cả
  // render (geometry memo) lẫn orchestrator focus (đọc toạ độ điểm dựng đã scale).
  const solution = advanceScene?.steps?.[currentStep]?.solution ?? null;
  const reveal = React.useMemo(
    () => (advanceScene && geometryProp && solution) ? buildSolveReveal(geometryProp, solution.steps) : null,
    [advanceScene, geometryProp, solution]
  );

  const geometry = React.useMemo(() => {
    if (advanceScene && geometryProp) {
      // Câu hiện tại có LỜI GIẢI: dựng điểm mà lời giải giới thiệu TỪ chính hình đang render
      // (geometryProp đã scale, cùng id với base) rồi ghép vào trước khi bóc-lớp. Điểm dựng của
      // lời giải LUÔN hiện + nhấn mạnh (v1: cả câu; đồng bộ theo bước-trong-câu để Task C).
      if (reveal) {
        const projected = projectScene(reveal.mergedGeometry, advanceScene.steps, currentStep);
        if (reveal.newPoints.length > 0) {
          const constructIds = new Set(reveal.newPoints.map(p => p.id));
          return {
            ...projected,
            points: projected.points.map(p =>
              constructIds.has(p.id) ? { ...p, hidden: false, dim: false, highlight: true } : p),
          };
        }
        return projected;
      }
      return projectScene(geometryProp, advanceScene.steps, currentStep);
    }
    if (revealVisibleIds && geometryProp) {
      const vis = (id: string) => revealVisibleIds.has(id);
      return {
        ...geometryProp,
        points: (geometryProp.points || []).map(p => (vis(p.id) ? p : { ...p, hidden: true })),
        lines: (geometryProp.lines || []).map(l =>
          (vis(l.id) && vis(l.from) && vis(l.to)) ? l : { ...l, hidden: true }),
      };
    }
    return geometryProp;
  }, [advanceScene, currentStep, geometryProp, revealVisibleIds, reveal]);

  // ═══ Orchestrator (Task C2): đồng bộ camera-fly theo CÂU (outer) + BƯỚC LỜI GIẢI (inner) ═══
  // 1 effect duy nhất — không đua. Giải id → toạ độ math (base/merged đã scale, khớp thế giới
  // CameraFlyer) rồi requestFocus. Bài thường (advanceScene null) → return sớm, không đụng camera.
  const requestFocus = cameraContext?.requestFocus;
  const solutionStep = cameraContext?.solutionStep ?? 0;

  const prevCauRef = React.useRef<number | null>(null);
  const prevSolRef = React.useRef<number>(0);

  React.useEffect(() => {
    if (!advanceScene || !requestFocus) return;
    const steps = advanceScene.steps;

    // giải id -> toạ độ math từ một geometry (base đã scale, hoặc merged đã scale)
    const ptsFromIds = (ids: string[], geom: any) => {
      const byId = new Map<string, any>((geom?.points || []).map((p: any) => [p.id, p]));
      return ids.map((id) => byId.get(id)).filter(Boolean)
        .map((p: any) => ({ x: Number(p.x), y: Number(p.y), z: Number(p.z) }))
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
    };

    const cau = currentStep;

    // Lần đầu (mount / scene mới): KHÔNG bay — để CameraFitter fit ban đầu. Chỉ init refs.
    if (prevCauRef.current === null) {
      prevCauRef.current = cau;
      prevSolRef.current = solutionStep;
      return;
    }

    // Đổi CÂU → bay tới phần tử MỚI của câu (visibleIds[cau] \ visibleIds[cau-1]); rỗng → cả câu.
    if (prevCauRef.current !== cau) {
      prevCauRef.current = cau;
      prevSolRef.current = 0; // đổi câu => inner reset về 0; đồng bộ để KHÔNG double-fire inner
      const cur = steps[cau]?.visibleIds ?? [];
      const prev = steps[cau - 1]?.visibleIds ?? [];
      const prevSet = new Set(prev);
      let ids = cur.filter((id: string) => !prevSet.has(id));
      if (ids.length === 0) ids = cur;
      const pts = ptsFromIds(ids, geometryProp);
      if (pts.length) requestFocus(pts);
      return;
    }

    // Cùng câu, đổi BƯỚC LỜI GIẢI → bay tới điểm dựng của bước đó (id trong reveal.mergedGeometry).
    if (solutionStep !== prevSolRef.current) {
      prevSolRef.current = solutionStep;
      const constructIds = reveal?.stepConstructIds?.[solutionStep] ?? [];
      let pts = reveal ? ptsFromIds(constructIds, reveal.mergedGeometry) : [];
      if (pts.length === 0) {
        // fallback: id highlight của bước (nếu là điểm base) — nếu vẫn rỗng thì thôi, không bay.
        const hl = solution?.steps?.[solutionStep]?.highlight ?? [];
        pts = ptsFromIds(hl, reveal?.mergedGeometry ?? geometryProp);
      }
      if (pts.length) requestFocus(pts);
    }
  }, [currentStep, solutionStep, advanceScene, reveal, solution, geometryProp, requestFocus]);

  const hiddenLines = useHiddenLineDetection(geometry);
  const isManualMode = geometryContext?.state.manualMode ?? false;
  const highlightedIds = cameraContext?.highlightedIds ?? new Set<string>();
  
  // Might be undefined if rendered outside App (e.g. test environments)
  const toolModeCtx = useToolMode();
  const mode = toolModeCtx?.mode || 'none';

  useEffect(() => {
    if (cameraContext && hiddenLines.size > 0) {
      cameraContext.setHiddenLines(new Map(hiddenLines));
    }
  }, [hiddenLines]);

  const computedTotalDuration = React.useMemo(() => {
    if (!geometry) return 5000;
    const {
      points, lines,
      spheres = [], circles = [], cylinders = [], cones = [], planes = [],
      vectors = [], angles = [], rightAngles = [], equalMarks = [], parallelMarks = [],
      dynamicPoints = [], surfaces = [], curves = []
    } = geometry;

    const pointDelay = 200;
    const lineStartDelay = points.length * pointDelay + 300;
    const lineDelay = 300;
    const shapeStartDelay = lineStartDelay + lines.length * lineDelay + 500;
    const shapeDelay = 300;

    const allShapesLength = spheres.length + circles.length + cylinders.length + cones.length + planes.length;
    const annotationStartDelay = shapeStartDelay + allShapesLength * shapeDelay + 200;
    const annotationDelay = 100;

    const totalAnnotationCount = vectors.length + angles.length + rightAngles.length + equalMarks.length + parallelMarks.length + dynamicPoints.length;
    return annotationStartDelay + totalAnnotationCount * annotationDelay + 1000; // 1s buffer
  }, [geometry]);

  useEffect(() => {
    if (animCtx && geometry) {
      if (geometry.timeline?.tracks?.length > 0) {
        // timeline.duration is in seconds, setTotalDuration expects ms
        animCtx.setTotalDuration(geometry.timeline.duration * 1000);
      } else {
        animCtx.setTotalDuration(computedTotalDuration);
      }
    }
  }, [computedTotalDuration, animCtx, geometry]);

  const effectiveIsBuilding = !(geometry?.timeline?.tracks?.length > 0);

  const solidPoints = React.useMemo(() => {
    if (!geometry) return [];
    const planes = geometry.planes || [];
    if (planes.length > 0) {
      const solidPointIds = new Set<string>();
      planes.forEach(plane => {
        plane.points.forEach(pid => solidPointIds.add(pid));
      });
      return geometry.points.filter(p => solidPointIds.has(p.id));
    }
    return geometry.points;
  }, [geometry]);

  if (!geometry) return null;

  const {
    points, lines,
    spheres = [], circles = [], cylinders = [], cones = [], planes = [],
    vectors = [], angles = [], rightAngles = [], equalMarks = [], parallelMarks = [],
    dynamicPoints = [], surfaces = [], curves = [],
    timeline, agents = [],
  } = geometry;

  // Calculate delays for build animation
  const isPrebuilt = geometry.name?.includes('LOD 4') || false;
  const pointDelay = isPrebuilt ? 0 : 200;
  const lineStartDelay = isPrebuilt ? 0 : points.length * pointDelay + 300;
  const lineDelay = isPrebuilt ? 0 : 300;
  const shapeStartDelay = isPrebuilt ? 0 : lineStartDelay + lines.length * lineDelay + 500;
  const shapeDelay = isPrebuilt ? 0 : 300;

  const allShapes = [
    ...spheres.map((s, i) => ({ type: 'sphere' as const, data: s, i })),
    ...circles.map((c, i) => ({ type: 'circle' as const, data: c, i })),
    ...cylinders.map((c, i) => ({ type: 'cylinder' as const, data: c, i })),
    ...cones.map((c, i) => ({ type: 'cone' as const, data: c, i })),
    ...planes.map((p, i) => ({ type: 'plane' as const, data: p, i })),
  ];

  const annotationStartDelay = isPrebuilt ? 0 : shapeStartDelay + allShapes.length * shapeDelay + 200;
  const annotationDelay = isPrebuilt ? 0 : 100;

  return (
    <group>
      {agents.map(agent => (
        <AnimatedAgent key={agent.id} agent={agent} tracks={timeline?.tracks || []} />
      ))}

      <TimelineGroup tracks={timeline?.tracks || []}>
      {timeline && <AnimatedWater tracks={timeline.tracks} />}
      

      {points.map((point, index) => {
        if (point.hidden) return null; // advance: phần tử ẩn ở câu này → không render
        return isManualMode ? (
          <DraggablePoint
            key={point.id}
            point={point}
            allPoints={points}
            allLines={lines}
            delay={index * pointDelay}
            isBuilding={effectiveIsBuilding}
          />
        ) : (
          <AnimatedPoint
            key={point.id}
            point={point}
            delay={index * pointDelay}
            isBuilding={effectiveIsBuilding}
            highlighted={highlightedIds.has(point.id) || highlightedIds.has(point.label)}
            opacity={point.dim ? DIM_OPACITY : 1}
            emphasize={!!point.highlight}
          />
        );
      })}

      {lines.map((line, index) => {
        if (line.hidden) return null; // advance: đường ẩn ở câu này → không render
        return (
          <AnimatedLine
            key={line.id}
            line={line}
            points={points}
            delay={lineStartDelay + index * lineDelay}
            isBuilding={effectiveIsBuilding}
            dynamicHidden={hiddenLines.get(line.id) ?? false}
            highlighted={highlightedIds.has(line.id)}
            opacity={line.dim ? DIM_OPACITY : 1}
            emphasize={!!line.highlight}
          />
        );
      })}

      {/* Render shapes only if we are NOT in cut/unfold mode */}
      {mode === 'none' && allShapes.map((shape, index) => {
        const d = shapeStartDelay + index * shapeDelay;
        // advance: phần tử ẩn ở câu này → không render; dim → mờ (giữ ngữ cảnh câu trước).
        const f = shape.data as { hidden?: boolean; dim?: boolean };
        if (f.hidden) return null;
        const opacityFactor = f.dim ? DIM_OPACITY : 1;
        switch (shape.type) {
          case 'sphere':
            return <AnimatedSphere key={`sphere-${shape.data.id}`} sphere={shape.data as any} delay={d} isBuilding={effectiveIsBuilding} opacityFactor={opacityFactor} />;
          case 'circle':
            return <AnimatedCircle key={`circle-${shape.data.id}`} circle={shape.data as any} delay={d} isBuilding={effectiveIsBuilding} opacityFactor={opacityFactor} />;
          case 'cylinder':
            return <AnimatedCylinder key={`cyl-${shape.data.id}`} cylinder={shape.data as any} delay={d} isBuilding={effectiveIsBuilding} opacityFactor={opacityFactor} />;
          case 'cone':
            return <AnimatedCone key={`cone-${shape.data.id}`} cone={shape.data as any} delay={d} isBuilding={effectiveIsBuilding} opacityFactor={opacityFactor} />;
          case 'plane': {
            const pl = shape.data as Plane3D;
            return <AnimatedPlane3D key={`plane-${pl.id}`} plane={pl} delay={d} isBuilding={effectiveIsBuilding} opacityFactor={opacityFactor} emphasize={!!pl.highlight} />;
          }
        }
      })}

      {/* Render the Dynamic Cross Section if mode is cut */}
      {mode === 'cut' && (
        <DynamicCrossSection points={solidPoints} />
      )}

      {/* Render the Dynamic Unfolding if mode is unfold */}
      {mode === 'unfold' && (
        <DynamicUnfolding points={solidPoints} />
      )}

      {/* ═══ Annotations ═══ */}
      {vectors.map((v, i) => (
        <AnimatedVector key={`vec-${v.id}`} vector={v} points={points} delay={annotationStartDelay + i * annotationDelay} isBuilding={effectiveIsBuilding} />
      ))}

      {angles.map((a, i) => (
        <AnimatedAngleArc key={`angle-${a.id}`} angle={a} points={points} delay={annotationStartDelay + (vectors.length + i) * annotationDelay} isBuilding={effectiveIsBuilding} />
      ))}

      {rightAngles.map((ra, i) => (
        <AnimatedRightAngle key={`ra-${ra.id}`} rightAngle={ra} points={points} delay={annotationStartDelay + (vectors.length + angles.length + i) * annotationDelay} isBuilding={effectiveIsBuilding} />
      ))}

      {equalMarks.map((em, i) => (
        <AnimatedEqualMark key={`eq-${em.id}`} mark={em} lines={lines} points={points} delay={annotationStartDelay + (vectors.length + angles.length + rightAngles.length + i) * annotationDelay} isBuilding={effectiveIsBuilding} />
      ))}

      {parallelMarks.map((pm, i) => (
        <AnimatedParallelMark key={`pm-${pm.id}`} mark={pm} lines={lines} points={points} delay={annotationStartDelay + (vectors.length + angles.length + rightAngles.length + equalMarks.length + i) * annotationDelay} isBuilding={effectiveIsBuilding} />
      ))}

      {/* ═══ Dynamic Points ═══ */}
      {dynamicPoints.map((dp, i) => (
        <AnimatedDynamicPoint key={`dp-${dp.id}`} dp={dp} points={points} delay={annotationStartDelay + i * annotationDelay} isBuilding={effectiveIsBuilding} />
      ))}

      {/* ═══ Surfaces of Revolution ═══ */}
      {surfaces.map((s, i) => (
        <AnimatedSurface key={`surf-${s.id}`} surface={s} delay={shapeStartDelay + (allShapes.length + i) * shapeDelay} isBuilding={effectiveIsBuilding} />
      ))}

      {/* ═══ Curves ═══ */}
      {curves.map((c, i) => {
        if (c.hidden) return null; // advance: đường cong ẩn ở câu này → không render
        return (
          <AnimatedCurve key={`curve-${c.id}`} curve={c} delay={shapeStartDelay + (allShapes.length + surfaces.length + i) * shapeDelay} isBuilding={effectiveIsBuilding} opacityFactor={c.dim ? DIM_OPACITY : 1} />
        );
      })}
      </TimelineGroup>
    </group>
  );
}
