import { useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Plane3D } from '@/types/geometry';
import { getCssHslVar } from '@/lib/getCssHslVar';
import { Line } from '@react-three/drei';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useGeometryOptional } from '@/context/GeometryContext';
import { handleAddPoint } from './ClickToPlacePoint';

interface AnimatedPlane3DProps {
  plane: Plane3D;
  delay: number;
  isBuilding: boolean;
  /** Advance mode: hệ số nhân opacity (dim → 0.25). Mặc định 1 = hành vi cũ. */
  opacityFactor?: number;
  /** Advance mode: mặt mới ở câu hiện tại → viền dày hơn chút. */
  emphasize?: boolean;
}

export function AnimatedPlane3D({ plane, delay, isBuilding, opacityFactor = 1, emphasize = false }: AnimatedPlane3DProps) {
  const [visible, setVisible] = useState(false);
  const [opacity, setOpacity] = useState(0);
  const [matrix, setMatrix] = useState(() => new THREE.Matrix4());
  
  const animCtx = useAnimationOptional();
  const geometryCtx = useGeometryOptional();
  
  const autoColor = geometryCtx?.state.autoColor ?? false;
  const color = useMemo(() => {
    if (autoColor) {
      return plane.color || getCssHslVar('--accent');
    }
    return '#94a3b8'; // neutral gray
  }, [plane.color, autoColor]);

  const isManualMode = geometryCtx?.state.manualMode ?? false;
  const isVideoMode = geometryCtx?.state.videoMode ?? false;
  
  const isSelected = geometryCtx?.state.selectedIds.includes(plane.id) ?? false;
  const [hovered, setHovered] = useState(false);
  const isHighlighted = isSelected || hovered;
  const displayColor = isHighlighted ? '#f97316' : color;

  const DURATION = 500;
  
  // Find tracks targeting this plane
  const tracks = useMemo(() => {
    if (!geometryCtx?.state.geometry?.timeline?.tracks) return [];
    return geometryCtx.state.geometry.timeline.tracks.filter(t => t.targetId === plane.id);
  }, [geometryCtx?.state.geometry?.timeline, plane.id]);

  useFrame((_, delta) => {
    if (animCtx && !isManualMode) {
      const t = animCtx.globalTimeRef.current;
      const tSec = t / 1000;

      let newOpacity = 1;
      let newVisible = true;
      let newMatrix = new THREE.Matrix4();

      if (isVideoMode) {
        // Video mode: Use timeline tracks completely
        if (tracks.length > 0) {
          for (const track of tracks) {
            const p = Math.max(0, Math.min(1, (tSec - track.start) / (track.end - track.start)));
            
            if (track.type === 'fade') {
              const startOpacity = track.params.opacityStart ?? 1;
              const endOpacity = track.params.opacityEnd ?? 0;
              newOpacity = startOpacity + (endOpacity - startOpacity) * p;
            }
            
            if (track.type === 'fold') {
              const startAngle = track.params.angleStart ?? 0;
              const endAngle = track.params.angleEnd ?? 0;
              const currentAngle = startAngle + (endAngle - startAngle) * p;
              
              if (track.params.axisPoint && track.params.axisDir) {
                const {x: px, y: py, z: pz} = track.params.axisPoint;
                const {x: dx, y: dy, z: dz} = track.params.axisDir;
                const pt = new THREE.Vector3(px, pz, py);
                const dir = new THREE.Vector3(dx, dz, dy).normalize();
                const rot = new THREE.Matrix4().makeRotationAxis(dir, currentAngle);
                const trans1 = new THREE.Matrix4().makeTranslation(-pt.x, -pt.y, -pt.z);
                const trans2 = new THREE.Matrix4().makeTranslation(pt.x, pt.y, pt.z);
                newMatrix = trans2.multiply(rot).multiply(trans1);
              }
            }
          }
          if (newOpacity <= 0.01) newVisible = false;
        }
      } else {
        // Normal interactive mode: use build-in animation
        if (isBuilding) {
          newOpacity = Math.max(0, Math.min(1, (t - delay) / DURATION));
          newVisible = t >= delay;
        }
      }

      if (opacity !== newOpacity) setOpacity(newOpacity);
      if (visible !== newVisible) setVisible(newVisible);
      setMatrix(newMatrix);
    } else {
      // Manual mode or not building
      if (!isBuilding || isManualMode) {
        if (!visible) setVisible(true);
        if (opacity < 1) setOpacity((prev) => Math.min(prev + delta * 4, 1));
      }
    }
  });

  const { vertices, edgePoints } = useMemo(() => {
    if (!plane.points || plane.points.length < 3) return { vertices: null, edgePoints: null };

    // Swap Y/Z for Three.js
    const pts = plane.points.map(p => new THREE.Vector3(p.x, p.z, p.y));

    // Create geometry from points
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];

    if (pts.length === 3) {
      positions.push(pts[0].x, pts[0].y, pts[0].z);
      positions.push(pts[1].x, pts[1].y, pts[1].z);
      positions.push(pts[2].x, pts[2].y, pts[2].z);
    } else if (pts.length >= 4) {
      // Two triangles for quad
      positions.push(pts[0].x, pts[0].y, pts[0].z);
      positions.push(pts[1].x, pts[1].y, pts[1].z);
      positions.push(pts[2].x, pts[2].y, pts[2].z);
      positions.push(pts[0].x, pts[0].y, pts[0].z);
      positions.push(pts[2].x, pts[2].y, pts[2].z);
      positions.push(pts[3].x, pts[3].y, pts[3].z);
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();

    // Edge points for outline
    const edges: [number, number, number][] = pts.map(p => [p.x, p.y, p.z]);
    edges.push([pts[0].x, pts[0].y, pts[0].z]); // close the loop

    return { vertices: geo, edgePoints: edges };
  }, [plane.points]);

  if (!visible || !vertices || !edgePoints) return null;

  const finalOpacity = (plane.opacity ?? 0.2) * opacity * opacityFactor;

  return (
    <group matrixAutoUpdate={false} matrix={matrix}>
      {/* Main Plane Mesh */}
      <mesh
        geometry={vertices}
        onClick={(e) => {
          if (!isManualMode || !geometryCtx) return;

          // Check if there is a line under the cursor. If so, yield to it.
          const hasLine = e.intersections.some(x => x.object.userData?.type === 'line');
          if (hasLine && geometryCtx.state.manualTool === 'delete') {
            return; // Let the line handle the click
          }

          if (geometryCtx.state.manualTool === 'delete') {
            e.stopPropagation();
            geometryCtx.toggleSelection(plane.id);
          } else if (geometryCtx.state.manualTool === 'addPoint') {
            handleAddPoint(e, geometryCtx, false);
          }
        }}
        onPointerOver={(e) => {
          if (!isManualMode || (geometryCtx?.state.manualTool !== 'delete' && geometryCtx?.state.manualTool !== 'addPoint')) return;

          // If deleting and hovering over a line, don't highlight the plane
          const hasLine = e.intersections.some(x => x.object.userData?.type === 'line');
          if (hasLine && geometryCtx?.state.manualTool === 'delete') return;

          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'crosshair';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <meshStandardMaterial
          color={displayColor}
          transparent
          opacity={isHighlighted ? finalOpacity * 2 : finalOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
          polygonOffset={true}
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      {/* Edge outline */}
      <Line
        points={edgePoints}
        color={displayColor}
        lineWidth={isHighlighted ? 3 : (emphasize ? 2.5 : 1.5)}
        transparent
        opacity={isHighlighted ? 1 : opacity * 0.6 * opacityFactor}
      />
    </group>
  );
}
