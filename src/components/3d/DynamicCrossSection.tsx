import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useToolMode } from '@/context/ToolModeContext';
import { Point3D } from '@/types/geometry';
import { createConvexHull } from '@/lib/csgHelpers';

interface DynamicCrossSectionProps {
  points: Point3D[];
}

export function DynamicCrossSection({ points }: DynamicCrossSectionProps) {
  const { mode, sliderValue } = useToolMode();
  
  const baseGeometry = useMemo(() => {
    if (points.length < 4) return null;
    // Math uses Z as height, Three.js uses Y. Must swap Y and Z!
    const vecPoints = points.map(p => new THREE.Vector3(p.x, p.z, p.y));
    const geom = createConvexHull(vecPoints);
    geom.computeBoundingBox();
    geom.computeVertexNormals();
    return geom;
  }, [points]);

  const yBounds = useMemo(() => {
    if (!baseGeometry?.boundingBox) return { min: -5, max: 5 };
    return { min: baseGeometry.boundingBox.min.y, max: baseGeometry.boundingBox.max.y };
  }, [baseGeometry]);

  // The actual clipping plane (points UP so it cuts everything ABOVE it)
  // Wait, if it points UP (0, 1, 0), it clips things in the direction of the normal.
  // Wait! Three.js clippingPlane clips pixels if: dot(pixel, normal) > constant
  // So if normal is (0, -1, 0) (points DOWN), it clips pixels below it.
  // Let's test normal = (0, 1, 0).
  const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  useMemo(() => {
    const t = sliderValue / 100;
    const planeY = yBounds.max - t * (yBounds.max - yBounds.min);
    
    // If normal is (0, 1, 0), it clips everything where Y > constant.
    // So if planeY is 5, constant is 5.
    clipPlane.constant = planeY;
  }, [sliderValue, yBounds, clipPlane]);

  // Setup Stencil Materials
  const { baseMat, backMat, frontMat, capMat } = useMemo(() => {
    const plane = clipPlane;
    const color = new THREE.Color(0x3b82f6); // Blue glassy
    const capColor = new THREE.Color(0xf97316); // Orange solid

    const base = new THREE.MeshPhysicalMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      roughness: 0.2,
      metalness: 0.1,
      side: THREE.DoubleSide,
      clippingPlanes: [plane],
      depthWrite: false
    });

    const back = new THREE.MeshBasicMaterial({
      color,
      clippingPlanes: [plane],
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      colorWrite: false,
      stencilWrite: true,
      stencilFunc: THREE.AlwaysStencilFunc,
      stencilFail: THREE.KeepStencilOp,
      stencilZFail: THREE.KeepStencilOp,
      stencilZPass: THREE.IncrementWrapStencilOp,
    });

    const front = new THREE.MeshBasicMaterial({
      color,
      clippingPlanes: [plane],
      side: THREE.FrontSide,
      depthWrite: false,
      depthTest: false,
      colorWrite: false,
      stencilWrite: true,
      stencilFunc: THREE.AlwaysStencilFunc,
      stencilFail: THREE.KeepStencilOp,
      stencilZFail: THREE.KeepStencilOp,
      stencilZPass: THREE.DecrementWrapStencilOp,
    });

    const cap = new THREE.MeshStandardMaterial({
      color: capColor,
      side: THREE.DoubleSide,
      stencilWrite: true,
      stencilFunc: THREE.NotEqualStencilFunc,
      stencilRef: 0,
      stencilFail: THREE.KeepStencilOp,
      stencilZFail: THREE.KeepStencilOp,
      stencilZPass: THREE.KeepStencilOp,
    });

    return { baseMat: base, backMat: back, frontMat: front, capMat: cap };
  }, [clipPlane]);

  if (mode !== 'cut' || points.length < 4 || !baseGeometry) return null;

  return (
    <group>
      {/* 1. Render the outer blue shell */}
      <mesh geometry={baseGeometry} material={baseMat} renderOrder={4} />
      
      {/* 2. Increment stencil buffer for back faces */}
      <mesh geometry={baseGeometry} material={backMat} renderOrder={1} />
      
      {/* 3. Decrement stencil buffer for front faces */}
      <mesh geometry={baseGeometry} material={frontMat} renderOrder={2} />
      
      {/* 4. Draw the orange cap plane exactly at the cut height, using stencil */}
      {/* If normal is (0,1,0) and constant=planeY, then plane equation: y = planeY */}
      {/* We rotate the plane so it lies flat on XZ. A plane args=[width, height] lies on XY by default. */}
      {/* Rotating around X by -90 deg puts it on XZ. */}
      <mesh 
        position={[0, clipPlane.constant - 0.001, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
        material={capMat}
        renderOrder={3}
      >
        <planeGeometry args={[200, 200]} />
      </mesh>
    </group>
  );
}
