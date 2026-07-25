import * as THREE from 'three';
import type { GeometryData, Line3D, Point3D } from '@/types/geometry';
import {
  extractFaces,
  triangulateFaces,
  type Face,
  type Triangle,
} from './extractFaces';
import { deriveSectionFaces } from './surfaceFaces';

export const HIDDEN_LINE_SAMPLE_T_VALUES = [0.2, 0.4, 0.6, 0.8] as const;
const EMPTY_FACE_SET = new Set<number>();

function toThreeVector(point: Point3D): THREE.Vector3 {
  return new THREE.Vector3(point.x, point.z, point.y);
}

/** Coordinate swap: model (x, y, z) → three.js (x, z, y). */
function toThreeCoord(coordinate: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(coordinate.x, coordinate.z, coordinate.y);
}

/** Pull world-space triangles out of a positioned buffer geometry. */
function readTriangles(geometry: THREE.BufferGeometry, faceIndex: number): Triangle[] {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const triangles: Triangle[] = [];
  const vertex = (i: number) => new THREE.Vector3().fromBufferAttribute(position, i);
  const count = index ? index.count : position.count;
  for (let i = 0; i < count; i += 3) {
    const [ia, ib, ic] = index
      ? [index.getX(i), index.getX(i + 1), index.getX(i + 2)]
      : [i, i + 1, i + 2];
    triangles.push({ a: vertex(ia), b: vertex(ib), c: vertex(ic), faceIndex });
  }
  geometry.dispose();
  return triangles;
}

/** Orient a +Y-aligned primitive onto `axis`, centred at `center`. */
function alignY(geometry: THREE.BufferGeometry, axis: THREE.Vector3, center: THREE.Vector3): void {
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    axis.clone().normalize(),
  );
  geometry.applyMatrix4(new THREE.Matrix4().compose(center, quaternion, new THREE.Vector3(1, 1, 1)));
}

/**
 * Curved solids (sphere / cylinder / cone) tessellated into occluder triangles
 * so an edge passing behind them is dashed, exactly like behind a flat face.
 * Each surface is given a face index past the flat faces, so no edge is ever
 * treated as belonging to (and therefore exempt from) a curved occluder.
 */
function buildCurvedOccluders(geometry: GeometryData, startFaceIndex: number): Triangle[] {
  const triangles: Triangle[] = [];
  let faceIndex = startFaceIndex;

  for (const sphere of geometry.spheres ?? []) {
    if (!(sphere.radius > 0)) continue;
    const mesh = new THREE.SphereGeometry(sphere.radius, 16, 12);
    const center = toThreeCoord(sphere.center);
    mesh.translate(center.x, center.y, center.z);
    triangles.push(...readTriangles(mesh, faceIndex++));
  }

  for (const cylinder of geometry.cylinders ?? []) {
    const bottom = toThreeCoord(cylinder.center1);
    const top = toThreeCoord(cylinder.center2);
    const axis = top.clone().sub(bottom);
    const height = axis.length();
    if (!(cylinder.radius > 0) || height < 1e-9) continue;
    const mesh = new THREE.CylinderGeometry(cylinder.radius, cylinder.radius, height, 20);
    alignY(mesh, axis, bottom.clone().add(top).multiplyScalar(0.5));
    triangles.push(...readTriangles(mesh, faceIndex++));
  }

  for (const cone of geometry.cones ?? []) {
    const apex = toThreeCoord(cone.apex);
    const base = toThreeCoord(cone.baseCenter);
    const axis = apex.clone().sub(base);
    const height = axis.length();
    if (!(cone.radius > 0) || height < 1e-9) continue;
    const mesh = new THREE.ConeGeometry(cone.radius, height, 20);
    alignY(mesh, axis, apex.clone().add(base).multiplyScalar(0.5));
    triangles.push(...readTriangles(mesh, faceIndex++));
  }

  return triangles;
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
  // Outer hull faces + cross-sections both occlude. A thiết diện is a real
  // visible surface, so edges behind it are dashed; its own boundary edges are
  // forced solid elsewhere (deriveSectionEdgeIds), so they stay clear.
  const faces = [
    ...extractFaces(geometry.points, geometry.lines, geometry.planes ?? []),
    ...deriveSectionFaces(geometry),
  ];
  // Flat faces + tessellated curved solids all occlude edges behind them.
  const triangles = [
    ...triangulateFaces(faces),
    ...buildCurvedOccluders(geometry, faces.length),
  ];
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
