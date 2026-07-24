import { useEffect, useRef, useMemo, type ComponentRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useGeometryOptional } from '@/context/GeometryContext';
import type { Point3D } from '@/types/geometry';
import { buildPlanarPolygonGeometry } from '@/lib/geometry/planeGeometry';

export function ToolPreviewRenderer() {
  const context = useGeometryOptional();
  const { camera, mouse, raycaster } = useThree();
  const previewLineRef = useRef<ComponentRef<typeof Line>>(null);

  const dragPlane = useMemo(() => new THREE.Plane(), []);
  
  const tool = context?.state.manualTool;
  
  const selectedPoints = useMemo(() => {
    const selectedIds = context?.state.selectedIds ?? [];
    const points = context?.state.geometry?.points ?? [];
    return selectedIds
      .map(id => points.find(p => p.id === id))
      .filter((point): point is Point3D => point !== undefined);
  }, [context?.state.geometry?.points, context?.state.selectedIds]);
  const planePolygon = useMemo(
    () => tool === 'addPlane' && selectedPoints.length >= 3
      ? buildPlanarPolygonGeometry(selectedPoints)
      : null,
    [selectedPoints, tool],
  );
  useEffect(() => () => planePolygon?.geometry.dispose(), [planePolygon]);
  const invalidPlaneEdges = useMemo(() => {
    if (tool !== 'addPlane' || selectedPoints.length < 2 || planePolygon) return null;
    const edges = selectedPoints.map(
      (point) => [point.x, point.z, point.y] as [number, number, number],
    );
    if (selectedPoints.length >= 3) edges.push([...edges[0]]);
    return edges;
  }, [planePolygon, selectedPoints, tool]);

  useFrame(() => {
    if (!context || !context.state.manualMode) return;
    if (tool !== 'addLine' && tool !== 'midpoint') return;
    if (selectedPoints.length === 0) return;
    if (!previewLineRef.current) return;

    // Get the last selected point as the anchor
    const lastPoint = selectedPoints[selectedPoints.length - 1];
    const pos = new THREE.Vector3(lastPoint.x, lastPoint.z, lastPoint.y); // math -> three

    // Create a plane facing the camera at the last point's position
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    dragPlane.setFromNormalAndCoplanarPoint(camDir, pos);

    // Raycast from mouse
    raycaster.setFromCamera(mouse, camera);
    const intersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, intersect);

    if (intersect) {
      // Draw rubber band line from the selected point to mouse.
      const p1 = selectedPoints[0];
      previewLineRef.current.geometry.setPositions([
        p1.x, p1.z, p1.y,
        intersect.x, intersect.y, intersect.z,
      ]);
    }
  });

  if (!context || !context.state.manualMode) return null;
  if (tool !== 'addLine' && tool !== 'midpoint' && tool !== 'addPlane') return null;
  if (selectedPoints.length === 0) return null;

  if (tool === 'addLine' || tool === 'midpoint') {
    if (selectedPoints.length !== 1) return null;
    return (
      <Line
        ref={previewLineRef}
        points={[[0,0,0], [0,0,0]]} // dummy points, updated in useFrame
        color={tool === 'addLine' ? '#60a5fa' : '#34d399'}
        lineWidth={2}
        dashed={true}
        dashScale={5}
        dashSize={0.5}
        gapSize={0.2}
        transparent
        opacity={0.6}
        depthTest={false}
      />
    );
  }

  if (tool === 'addPlane') {
    if (planePolygon) {
      return (
        <group>
          <mesh geometry={planePolygon.geometry} renderOrder={20}>
            <meshBasicMaterial
              color="#a78bfa"
              transparent
              opacity={0.22}
              depthWrite={false}
              depthTest={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <Line
            points={planePolygon.edgePoints}
            color="#c4b5fd"
            lineWidth={2.5}
            transparent
            opacity={0.95}
            depthTest={false}
            renderOrder={21}
          />
        </group>
      );
    }
    if (!invalidPlaneEdges) return null;
    return (
      <Line
        points={invalidPlaneEdges}
        color={selectedPoints.length >= 3 ? '#ef4444' : '#a78bfa'}
        lineWidth={2}
        dashed
        dashScale={5}
        dashSize={0.5}
        gapSize={0.2}
        transparent
        opacity={0.8}
        depthTest={false}
      />
    );
  }

  return null;
}
