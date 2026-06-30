import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION } from 'three-bvh-csg';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

// Patch THREE with BVH functions so three-bvh-csg can use them
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

export function createConvexHull(points: THREE.Vector3[]): THREE.BufferGeometry {
  if (points.length < 4) {
    return new THREE.BufferGeometry();
  }
  // Add a tiny invisible jitter to prevent QuickHull coplanar errors (which cause holes in the mesh and break Stencil Capping)
  const jitteredPoints = points.map(p => new THREE.Vector3(
    p.x + (Math.random() - 0.5) * 0.0001,
    p.y + (Math.random() - 0.5) * 0.0001,
    p.z + (Math.random() - 0.5) * 0.0001
  ));
  
  try {
    return new ConvexGeometry(jitteredPoints);
  } catch (e) {
    console.error("ConvexGeometry failed", e);
    // Fallback to original points if jitter somehow fails
    return new ConvexGeometry(points);
  }
}

export function cutGeometry(
  geometry: THREE.BufferGeometry, 
  planeNormal: THREE.Vector3, 
  planeConstant: number
): { keep: THREE.BufferGeometry } {
  const boxGeom = new THREE.BoxGeometry(200, 200, 200);
  
  boxGeom.clearGroups();
  boxGeom.addGroup(0, Infinity, 1);
  
  const brushBox = new Brush(boxGeom);
  
  // EPSILON to prevent infinite loop
  const epsilon = 0.0001 * (Math.random() > 0.5 ? 1 : -1);
  brushBox.position.copy(planeNormal).multiplyScalar(planeConstant + 100 + epsilon);
  
  brushBox.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), planeNormal.clone().normalize());
  
  // Jitter
  brushBox.rotateX(Math.random() * 0.0001);
  brushBox.rotateY(Math.random() * 0.0001);
  
  brushBox.updateMatrixWorld();
  
  const cleanGeom = geometry.clone();
  cleanGeom.clearGroups();
  cleanGeom.addGroup(0, Infinity, 0);

  const targetBrush = new Brush(cleanGeom);
  targetBrush.updateMatrixWorld();
  
  const evaluator = new Evaluator();
  evaluator.useGroups = true; 
  
  try {
    const keepResult = evaluator.evaluate(targetBrush, brushBox, SUBTRACTION);
    return { keep: keepResult.geometry };
  } catch (err) {
    console.error('CSG Error:', err);
    return { keep: geometry }; // fallback
  }
}
