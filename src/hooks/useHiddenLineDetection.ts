import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GeometryData, Point3D } from '@/types/geometry';
import { 
  extractFaces, 
  Face, 
  isInternalDiagonal,
  triangulateFaces,
  buildOcclusionMesh,
  Triangle
} from '@/lib/geometry/extractFaces';

// Sample points along edge at these t values
const SAMPLE_T_VALUES = [0.2, 0.4, 0.6, 0.8];
// Minimum fraction of occluded samples to mark line as hidden
const OCCLUSION_THRESHOLD = 0.5;

/**
 * Convert Point3D to THREE.Vector3, swapping Y and Z for Three.js coordinate system
 */
function toVector3(point: Point3D): THREE.Vector3 {
  return new THREE.Vector3(point.x, point.z, point.y);
}

/**
 * Hook to detect which lines should be hidden (dashed) based on camera position
 * Uses raycast occlusion test for accurate visibility detection
 */
export function useHiddenLineDetection(
  geometry: GeometryData | null
): Map<string, boolean> {
  const [hiddenLines, setHiddenLines] = useState<Map<string, boolean>>(new Map());
  const lastCameraPosRef = useRef(new THREE.Vector3());
  const lastCameraQuatRef = useRef(new THREE.Quaternion());
  const raycasterRef = useRef(new THREE.Raycaster());

  // Extract faces from geometry (memoized)
  const faces = useMemo(() => {
    if (!geometry) return [];
    return extractFaces(geometry.points, geometry.lines);
  }, [geometry]);

  // Triangulate faces for raycasting (memoized)
  const triangles = useMemo(() => {
    return triangulateFaces(faces);
  }, [faces]);

  // Build occlusion mesh (memoized)
  const occlusionMesh = useMemo(() => {
    return buildOcclusionMesh(triangles);
  }, [triangles]);

  // Build edge-to-faces map (memoized)
  const edgeToFaces = useMemo(() => {
    const map = new Map<string, Face[]>();
    for (const face of faces) {
      for (const edge of face.edges) {
        if (!map.has(edge)) map.set(edge, []);
        map.get(edge)!.push(face);
      }
    }
    return map;
  }, [faces]);

  // Build edge-to-faceIndices map for quick lookup during raycast
  const edgeToFaceIndices = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const face of faces) {
      const faceIndex = faces.indexOf(face);
      for (const edge of face.edges) {
        if (!map.has(edge)) map.set(edge, new Set());
        map.get(edge)!.add(faceIndex);
      }
    }
    return map;
  }, [faces]);

  // Build point map for quick lookup
  const pointMap = useMemo(() => {
    if (!geometry) return new Map<string, THREE.Vector3>();
    const map = new Map<string, THREE.Vector3>();
    for (const point of geometry.points) {
      map.set(point.id, toVector3(point));
    }
    return map;
  }, [geometry]);

  // Calculate bounding box size for adaptive epsilon
  const bboxSize = useMemo(() => {
    if (!geometry || geometry.points.length === 0) return 1;
    const box = new THREE.Box3();
    for (const point of geometry.points) {
      box.expandByPoint(toVector3(point));
    }
    const size = new THREE.Vector3();
    box.getSize(size);
    return Math.max(size.x, size.y, size.z, 0.1);
  }, [geometry]);

  // Update hidden lines every frame based on camera position
  useFrame(({ camera }) => {
    if (!geometry || faces.length === 0 || !occlusionMesh) return;

    const cameraPos = camera.position;
    const cameraQuat = camera.quaternion;
    
    // Threshold to avoid recalculating on tiny movements
    const posThreshold = 0.01;
    const quatThreshold = 0.01; // ~0.5 degrees
    
    const posDiff = lastCameraPosRef.current.distanceTo(cameraPos);
    const quatDiff = 1 - Math.abs(lastCameraQuatRef.current.dot(cameraQuat));
    
    if (posDiff < posThreshold && quatDiff < quatThreshold) {
      return;
    }
    
    lastCameraPosRef.current.copy(cameraPos);
    lastCameraQuatRef.current.copy(cameraQuat);
    
    const newHiddenLines = new Map<string, boolean>();
    const raycaster = raycasterRef.current;
    const eps = bboxSize * 1e-2;
    
    // Check each line for occlusion
    for (const line of geometry.lines) {
      
      // Get endpoint positions
      const fromPoint = pointMap.get(line.from);
      const toPoint = pointMap.get(line.to);
      
      if (!fromPoint || !toPoint) {
        newHiddenLines.set(line.id, false);
        continue;
      }
      
      // Get face indices that contain this edge (to skip self-intersection)
      const adjacentFaceIndices = edgeToFaceIndices.get(line.id) || new Set<number>();
      
      // Sample points along the edge and check occlusion
      let occludedCount = 0;
      
      for (const t of SAMPLE_T_VALUES) {
        // Sample point on edge
        const samplePoint = fromPoint.clone().lerp(toPoint, t);
        
        // Direction from camera to sample point
        const direction = samplePoint.clone().sub(cameraPos);
        const distToPoint = direction.length();
        direction.normalize();
        
        // Set up raycaster
        raycaster.set(cameraPos, direction);
        raycaster.far = distToPoint + eps;
        
        // Check for intersections
        const intersections = raycaster.intersectObject(occlusionMesh, false);
        
        // Check if any intersection is in front of the sample point
        // and NOT from an adjacent face
        let isOccluded = false;
        
        for (const intersection of intersections) {
          // Get the triangle index from the intersection
          const triIndex = intersection.faceIndex;
          if (triIndex === undefined) continue;
          
          // Get the face index from the triangle
          const faceIndex = triangles[triIndex]?.faceIndex;
          
          // Skip if this is an adjacent face
          if (faceIndex !== undefined && adjacentFaceIndices.has(faceIndex)) {
            continue;
          }
          
          // Check if intersection is in front of the sample point
          if (intersection.distance < distToPoint - eps) {
            isOccluded = true;
            break;
          }
        }
        
        if (isOccluded) {
          occludedCount++;
        }
      }
      
      // Line is hidden if majority of sample points are occluded
      const isHidden = occludedCount / SAMPLE_T_VALUES.length >= OCCLUSION_THRESHOLD;
      newHiddenLines.set(line.id, isHidden);
    }
    
    // Only update state if there are actual changes
    setHiddenLines(prev => {
      let changed = false;
      if (prev.size !== newHiddenLines.size) {
        changed = true;
      } else {
        for (const [key, value] of newHiddenLines) {
          if (prev.get(key) !== value) {
            changed = true;
            break;
          }
        }
      }
      return changed ? newHiddenLines : prev;
    });
  });

  return hiddenLines;
}
