import { useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGeometryOptional } from '@/context/GeometryContext';

/**
 * Invisible plane on y=0 (Three.js coords) that captures clicks
 * to place points when manual mode + addPoint tool is active.
 * Converts Three.js coords (y-up) back to math coords (z-up).
 */
export function ClickToPlacePoint() {
  const context = useGeometryOptional();
  const planeRef = useRef<THREE.Mesh>(null);

  const handleClick = useCallback((e: any) => {
    if (!context) return;
    const { state, addPoint } = context;
    if (!state.manualMode || state.manualTool !== 'addPoint') return;

    e.stopPropagation();

    const point = e.point as THREE.Vector3;

    // Three.js (x, y, z) -> Math coords (x, z, y) because we swap y<->z
    const mathX = Math.round(point.x * 2) / 2; // snap to 0.5 grid
    const mathY = Math.round(point.z * 2) / 2; // three.z -> math.y
    const mathZ = Math.round(point.y * 2) / 2; // three.y -> math.z

    // Generate next label
    const existingLabels = new Set((state.geometry?.points || []).map(p => p.label));
    let label = '';
    for (let i = 0; i < 26; i++) {
      const ch = String.fromCharCode(65 + i);
      if (!existingLabels.has(ch)) { label = ch; break; }
    }
    if (!label) label = `P${(state.geometry?.points?.length || 0) + 1}`;

    addPoint(label, mathX, mathY, mathZ);
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
