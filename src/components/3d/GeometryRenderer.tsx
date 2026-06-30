import React, { useEffect } from 'react';
import { useCameraOptional } from '@/context/CameraContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import { GeometryData } from '@/types/geometry';
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

export function GeometryRenderer({ geometry, isBuilding }: GeometryRendererProps) {
  const cameraContext = useCameraOptional();
  const geometryContext = useGeometryOptional();
  const animCtx = useAnimationOptional();
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
      

      {points.map((point, index) => (
        isManualMode ? (
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
          />
        )
      ))}

      {lines.map((line, index) => (
        <AnimatedLine
          key={line.id}
          line={line}
          points={points}
          delay={lineStartDelay + index * lineDelay}
          isBuilding={effectiveIsBuilding}
          dynamicHidden={hiddenLines.get(line.id) ?? false}
          highlighted={highlightedIds.has(line.id)}
        />
      ))}

      {/* Render shapes only if we are NOT in cut/unfold mode */}
      {mode === 'none' && allShapes.map((shape, index) => {
        const d = shapeStartDelay + index * shapeDelay;
        switch (shape.type) {
          case 'sphere':
            return <AnimatedSphere key={`sphere-${shape.data.id}`} sphere={shape.data as any} delay={d} isBuilding={effectiveIsBuilding} />;
          case 'circle':
            return <AnimatedCircle key={`circle-${shape.data.id}`} circle={shape.data as any} delay={d} isBuilding={effectiveIsBuilding} />;
          case 'cylinder':
            return <AnimatedCylinder key={`cyl-${shape.data.id}`} cylinder={shape.data as any} delay={d} isBuilding={effectiveIsBuilding} />;
          case 'cone':
            return <AnimatedCone key={`cone-${shape.data.id}`} cone={shape.data as any} delay={d} isBuilding={effectiveIsBuilding} />;
          case 'plane':
            return <AnimatedPlane3D key={`plane-${shape.data.id}`} plane={shape.data as any} delay={d} isBuilding={effectiveIsBuilding} />;
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
      {curves.map((c, i) => (
        <AnimatedCurve key={`curve-${c.id}`} curve={c} delay={shapeStartDelay + (allShapes.length + surfaces.length + i) * shapeDelay} isBuilding={effectiveIsBuilding} />
      ))}
      </TimelineGroup>
    </group>
  );
}
