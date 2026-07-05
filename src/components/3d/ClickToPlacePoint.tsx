import { useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGeometryOptional } from '@/context/GeometryContext';

/**
 * Invisible plane on y=0 (Three.js coords) that captures clicks
 * to place points when manual mode + addPoint tool is active.
 * Converts Three.js coords (y-up) back to math coords (z-up).
 */
export function handleAddPoint(e: any, context: any, snapToGrid: boolean = false) {
  if (!context) return;
  const { state, addPoint } = context;
  if (!state.manualMode || state.manualTool !== 'addPoint') return;
  
  // If the pointer moved more than a small threshold, it was a drag (e.g., rotating the camera), not a click
  if (e.delta > 2) return;

  e.stopPropagation();

  const point = e.point as THREE.Vector3;

  let mathX = point.x;
  let mathY = point.z;
  let mathZ = point.y;

  if (snapToGrid) {
    mathX = Math.round(mathX * 2) / 2;
    mathY = Math.round(mathY * 2) / 2;
    mathZ = Math.round(mathZ * 2) / 2;
  } else {
    // Round to 3 decimal places to keep it clean but accurate enough for planes
    mathX = Math.round(mathX * 1000) / 1000;
    mathY = Math.round(mathY * 1000) / 1000;
    mathZ = Math.round(mathZ * 1000) / 1000;
  }

  // Generate next label
  const existingLabels = new Set((state.geometry?.points || []).map((p: any) => p.label));
  let label = '';
  for (let i = 0; i < 26; i++) {
    const ch = String.fromCharCode(65 + i);
    if (!existingLabels.has(ch)) { label = ch; break; }
  }
  if (!label) label = `P${(state.geometry?.points?.length || 0) + 1}`;

  addPoint(label, mathX, mathY, mathZ);
}

export function ClickToPlacePoint() {
  const context = useGeometryOptional();
  const planeRef = useRef<THREE.Mesh>(null);

  const handleClick = useCallback((e: any) => {
    handleAddPoint(e, context, true); // Snap to grid for the background plane
  }, [context]);

  if (!context?.state.manualMode || context.state.manualTool !== 'addPoint') {
    return null;
  }

  return (
    <mesh
      ref={planeRef}
      position={[0, 0, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={handleClick}
      visible={false}
    >
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );
}
