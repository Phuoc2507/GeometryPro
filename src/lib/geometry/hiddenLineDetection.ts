import * as THREE from 'three';
import { GeometryData, Point3D } from '@/types/geometry';
import { extractFaces, triangulateFaces } from './extractFaces';

const SAMPLE_T_VALUES = [0.2, 0.4, 0.6, 0.8];

function toThreeVector(point: Point3D): THREE.Vector3 {
  return new THREE.Vector3(point.x, point.z, point.y);
}

/**
 * Builds an inexpensive, reusable visibility detector for a projected export.
 * It deliberately has no React or WebGL dependency, so an export preview can
 * update its own dashed edges without publishing camera changes to the canvas.
 */
export function createHiddenLineDetector(geometry: GeometryData) {
  const faces = extractFaces(geometry.points, geometry.lines);
  const triangles = triangulateFaces(faces);
  const pointMap = new Map(geometry.points.map((point) => [point.id, toThreeVector(point)]));
  const edgeToFaceIndices = new Map<string, Set<number>>();
  const bounds = new THREE.Box3();

  for (const point of pointMap.values()) bounds.expandByPoint(point);
  const boundsSize = new THREE.Vector3();
  bounds.getSize(boundsSize);
  const epsilon = Math.max(boundsSize.x, boundsSize.y, boundsSize.z, 0.1) * 1e-2;

  faces.forEach((face, faceIndex) => {
    face.edges.forEach((edgeId) => {
      const indices = edgeToFaceIndices.get(edgeId) ?? new Set<number>();
      indices.add(faceIndex);
      edgeToFaceIndices.set(edgeId, indices);
    });
  });

  const ray = new THREE.Ray();
  const samplePoint = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const intersection = new THREE.Vector3();
  const camera = new THREE.Vector3();

  return {
    detect(cameraPosition: [number, number, number]): Map<string, boolean> {
      // Face extraction is not available for all free-form drawings. Preserve
      // their explicit line styles by returning no dynamic overrides.
      if (triangles.length === 0) return new Map();

      camera.set(...cameraPosition);
      const hiddenLines = new Map<string, boolean>();

      for (const line of geometry.lines) {
        const from = pointMap.get(line.from);
        const to = pointMap.get(line.to);
        if (!from || !to) continue;

        const adjacentFaceIndices = edgeToFaceIndices.get(line.id) ?? new Set<number>();
        let occludedSamples = 0;

        for (const t of SAMPLE_T_VALUES) {
          samplePoint.lerpVectors(from, to, t);
          direction.subVectors(samplePoint, camera);
          const distanceToSample = direction.length();
          if (distanceToSample === 0) continue;
          direction.multiplyScalar(1 / distanceToSample);
          ray.set(camera, direction);

          let occluded = false;
          for (const triangle of triangles) {
            if (adjacentFaceIndices.has(triangle.faceIndex)) continue;
            const hit = ray.intersectTriangle(triangle.a, triangle.b, triangle.c, false, intersection);
            if (hit && camera.distanceTo(intersection) < distanceToSample - epsilon) {
              occluded = true;
              break;
            }
          }
          if (occluded) occludedSamples++;
        }

        hiddenLines.set(
          line.id,
          line.style === 'dashed' || occludedSamples / SAMPLE_T_VALUES.length >= 0.5,
        );
      }

      return hiddenLines;
    },
  };
}
