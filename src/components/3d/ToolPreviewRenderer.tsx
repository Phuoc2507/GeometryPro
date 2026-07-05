import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useGeometryOptional } from '@/context/GeometryContext';

export function ToolPreviewRenderer() {
  const context = useGeometryOptional();
  const { camera, mouse, raycaster } = useThree();
  const previewLineRef = useRef<any>(null);
  const previewPlaneRef = useRef<any>(null);

  const dragPlane = useMemo(() => new THREE.Plane(), []);
  
  const tool = context?.state.manualTool;
  const selectedIds = context?.state.selectedIds || [];
  const points = context?.state.geometry?.points || [];
  
  const selectedPoints = useMemo(() => {
    return selectedIds
      .map(id => points.find(p => p.id === id))
      .filter(Boolean) as any[];
  }, [selectedIds, points]);

  useFrame(() => {
    if (!context || !context.state.manualMode) return;
    if (tool !== 'addLine' && tool !== 'midpoint' && tool !== 'addPlane') return;
    if (selectedPoints.length === 0) return;
    if (!previewLineRef.current && !previewPlaneRef.current) return;

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
      if ((tool === 'addLine' || tool === 'midpoint') && previewLineRef.current) {
        // Draw rubber band line from the selected point to mouse
        const p1 = selectedPoints[0];
        previewLineRef.current.geometry.setPositions([
          p1.x, p1.z, p1.y,
          intersect.x, intersect.y, intersect.z
        ]);
      } else if (tool === 'addPlane' && previewPlaneRef.current && selectedPoints.length >= 2) {
        // Draw a preview polygon for the plane
        // Build an array of vertices: all selected points + current mouse position
        const vertices = [];
        for (const p of selectedPoints) {
          vertices.push(p.x, p.z, p.y);
        }
        vertices.push(intersect.x, intersect.y, intersect.z);
        // also close the loop back to the first point
        vertices.push(selectedPoints[0].x, selectedPoints[0].z, selectedPoints[0].y);
        
        previewPlaneRef.current.geometry.setPositions(vertices);
      }
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
    if (selectedPoints.length < 2) return null;
    return (
      <group>
        <Line
          ref={previewPlaneRef}
          points={[[0,0,0], [0,0,0]]} // dummy points, updated in useFrame
          color="#a78bfa"
          lineWidth={2}
          dashed={true}
          dashScale={5}
          dashSize={0.5}
          gapSize={0.2}
          transparent
          opacity={0.6}
          depthTest={false}
        />
      </group>
    );
  }

  return null;
}
