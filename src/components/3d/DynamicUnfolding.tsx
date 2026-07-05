import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useToolMode } from '@/context/ToolModeContext';
import { Point3D } from '@/types/geometry';
import { createConvexHull } from '@/lib/csgHelpers';
import { buildUnfoldTree, computeUnfoldMatrices } from '@/lib/unfoldHelpers';

interface DynamicUnfoldingProps {
  points: Point3D[];
}

export function DynamicUnfolding({ points }: DynamicUnfoldingProps) {
  const { mode, sliderValue } = useToolMode();

  if (mode !== 'unfold' || points.length < 4) return null;

  const { tree, flatFaces } = useMemo(() => {
    // 1. Swap Y and Z for Three.js coordinates
    const vecPoints = points.map(p => new THREE.Vector3(p.x, p.z, p.y));
    const geom = createConvexHull(vecPoints);
    
    // 2. Build the Spanning Tree for unfolding
    const tree = buildUnfoldTree(geom);
    
    // 3. Extract flat faces for rendering
    const flatFaces: { id: number; geom: THREE.BufferGeometry }[] = [];
    if (tree) {
      // Flatten tree to get all nodes
      const queue = [tree];
      while (queue.length > 0) {
        const node = queue.shift()!;
        for (const child of node.children) queue.push(child.node);
        
        // Build geometry from all triangles in the polygon
        const pts: THREE.Vector3[] = [];
        for (const t of node.triangles) {
          pts.push(t.v1, t.v2, t.v3);
        }
        const faceGeom = new THREE.BufferGeometry().setFromPoints(pts);
        faceGeom.computeVertexNormals();
        flatFaces.push({ id: node.id, geom: faceGeom });
      }
    }
    
    return { tree, flatFaces };
  }, [points]);

  const matrices = useMemo(() => {
    if (!tree) return new Map<number, THREE.Matrix4>();
    const t = sliderValue / 100;
    return computeUnfoldMatrices(tree, t);
  }, [tree, sliderValue]);

  if (!tree) return null;

  return (
    <group>
      {flatFaces.map((face) => {
        const matrix = matrices.get(face.id) || new THREE.Matrix4();
        
        return (
          <mesh 
            key={`unfold-face-${face.id}`}
            geometry={face.geom}
            matrix={matrix}
            matrixAutoUpdate={false}
          >
            <meshStandardMaterial 
              color="#3b82f6" 
              transparent 
              opacity={0.6} 
              roughness={0.2}
              metalness={0.1}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
            {/* Outline the face to see the individual pieces clearly */}
            <lineSegments>
              <edgesGeometry args={[face.geom]} />
              <lineBasicMaterial color="#ffffff" linewidth={2} />
            </lineSegments>
          </mesh>
        );
      })}
    </group>
  );
}
