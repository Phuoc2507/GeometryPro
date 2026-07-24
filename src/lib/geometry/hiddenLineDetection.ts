import * as THREE from 'three';
import type { GeometryData, Line3D, Point3D } from '@/types/geometry';
import {
  extractFaces,
  triangulateFaces,
  type Face,
  type Triangle,
} from './extractFaces';

export const HIDDEN_LINE_SAMPLE_T_VALUES = [0.2, 0.4, 0.6, 0.8] as const;
const EMPTY_FACE_SET = new Set<number>();

function toThreeVector(point: Point3D): THREE.Vector3 {
  return new THREE.Vector3(point.x, point.z, point.y);
}

export interface OcclusionModel {
  faces: Face[];
  triangles: Triangle[];
  pointMap: Map<string, THREE.Vector3>;
  edgeToFaceIndices: Map<string, Set<number>>;
  epsilon: number;
}

export function getOcclusionEpsilon(boundsSize: number): number {
  // A percentage of the whole model as large as 1% hides legitimate thin
  // gaps. 1e-4 is still comfortably above floating-point noise while remaining
  // scale-independent for normal geometry coordinates.
  return Math.max(boundsSize, 0.1) * 1e-4;
}

export function getDesiredHiddenState(
  currentlyHidden: boolean,
  occludedSamples: number,
  sampleCount = HIDDEN_LINE_SAMPLE_T_VALUES.length,
): boolean {
  const hideAt = Math.ceil(sampleCount * 0.75);
  const showAt = Math.floor(sampleCount * 0.25);
  if (!currentlyHidden && occludedSamples >= hideAt) return true;
  if (currentlyHidden && occludedSamples <= showAt) return false;
  return currentlyHidden;
}

/** A semantic dashed style must never be cancelled by a dynamic `false`. */
export function isLineDashed(
  line: Pick<Line3D, 'id' | 'style'>,
  dynamicallyHidden?: ReadonlyMap<string, boolean>,
): boolean {
  return line.style === 'dashed' || dynamicallyHidden?.get(line.id) === true;
}

/** Build the effective dash map consumed by previews and WebGL capture. */
export function mergeLineDashStyles(
  lines: readonly Line3D[],
  dynamicallyHidden: ReadonlyMap<string, boolean>,
): Map<string, boolean> {
  return new Map(lines.map((line) => [line.id, isLineDashed(line, dynamicallyHidden)]));
}

export function createOcclusionModel(geometry: GeometryData): OcclusionModel {
  const faces = extractFaces(geometry.points, geometry.lines, geometry.planes ?? []);
  const triangles = triangulateFaces(faces);
  const pointMap = new Map(geometry.points.map((point) => [point.id, toThreeVector(point)]));
  const edgeToFaceIndices = new Map<string, Set<number>>();
  const bounds = new THREE.Box3();

  for (const point of pointMap.values()) bounds.expandByPoint(point);
  const boundsSize = new THREE.Vector3();
  bounds.getSize(boundsSize);

  faces.forEach((face, faceIndex) => {
    face.edges.forEach((edgeId) => {
      const indices = edgeToFaceIndices.get(edgeId) ?? new Set<number>();
      indices.add(faceIndex);
      edgeToFaceIndices.set(edgeId, indices);
    });
  });

  return {
    faces,
    triangles,
    pointMap,
    edgeToFaceIndices,
    epsilon: getOcclusionEpsilon(Math.max(boundsSize.x, boundsSize.y, boundsSize.z)),
  };
}

/**
 * Builds an inexpensive, reusable visibility detector for a projected export.
 * It deliberately has no React or WebGL dependency, so an export preview can
 * update its own dashed edges without publishing camera changes to the canvas.
 */
export function createHiddenLineDetector(geometry: GeometryData) {
  const model = createOcclusionModel(geometry);

  const ray = new THREE.Ray();
  const samplePoint = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const intersection = new THREE.Vector3();
  const camera = new THREE.Vector3();

  return {
    detect(cameraPosition: [number, number, number]): Map<string, boolean> {
      // Face extraction is not available for all free-form drawings. Preserve
      // their explicit line styles by returning no dynamic overrides.
      if (model.triangles.length === 0) return new Map();

      camera.set(...cameraPosition);
      const hiddenLines = new Map<string, boolean>();

      for (const line of geometry.lines) {
        const from = model.pointMap.get(line.from);
        const to = model.pointMap.get(line.to);
        if (!from || !to) continue;

        const adjacentFaceIndices = model.edgeToFaceIndices.get(line.id) ?? EMPTY_FACE_SET;
        let occludedSamples = 0;

        for (const t of HIDDEN_LINE_SAMPLE_T_VALUES) {
          samplePoint.lerpVectors(from, to, t);
          direction.subVectors(samplePoint, camera);
          const distanceToSample = direction.length();
          if (distanceToSample === 0) continue;
          direction.multiplyScalar(1 / distanceToSample);
          ray.set(camera, direction);

          let occluded = false;
          for (const triangle of model.triangles) {
            if (adjacentFaceIndices.has(triangle.faceIndex)) continue;
            const hit = ray.intersectTriangle(triangle.a, triangle.b, triangle.c, false, intersection);
            if (hit && camera.distanceTo(intersection) < distanceToSample - model.epsilon) {
              occluded = true;
              break;
            }
          }
          if (occluded) occludedSamples++;
          // Export detection starts from the visible state. Once the hide
          // threshold is met, later samples cannot change the result.
          if (getDesiredHiddenState(false, occludedSamples)) break;
        }

        hiddenLines.set(line.id, getDesiredHiddenState(false, occludedSamples));
      }

      return hiddenLines;
    },
  };
}
