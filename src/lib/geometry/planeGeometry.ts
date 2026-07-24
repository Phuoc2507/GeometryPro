import * as THREE from 'three';
import type { PointCoordinates } from '@/types/geometry';

const EPSILON = 1e-8;

export interface NormalizedPlanarPolygon {
  vertices: THREE.Vector3[];
  projected: THREE.Vector2[];
  normal: THREE.Vector3;
  center: THREE.Vector3;
  /** Index in the original input for every ordered/deduplicated vertex. */
  sourceIndices: number[];
}

export interface PlanarPolygonGeometry {
  geometry: THREE.BufferGeometry;
  edgePoints: [number, number, number][];
  vertices: THREE.Vector3[];
  normal: THREE.Vector3;
  center: THREE.Vector3;
  sourceIndices: number[];
}

/**
 * Returns an outward normal only when the polygon is a boundary face: all
 * other referenced solid points must lie on one side of its plane. Internal
 * sections return null and remain visible from both sides.
 */
export function getOutwardHullNormal(
  polygon: Pick<NormalizedPlanarPolygon, 'vertices' | 'normal' | 'center'>,
  solidPoints: readonly PointCoordinates[],
): THREE.Vector3 | null {
  const bounds = new THREE.Box3().setFromPoints(polygon.vertices);
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const tolerance = Math.max(size.length() * 1e-5, 1e-7);
  let positive = 0;
  let negative = 0;
  const relative = new THREE.Vector3();

  for (const point of solidPoints) {
    const vertex = new THREE.Vector3(point.x, point.z, point.y);
    const distance = polygon.normal.dot(relative.subVectors(vertex, polygon.center));
    if (distance > tolerance) positive++;
    else if (distance < -tolerance) negative++;
    if (positive > 0 && negative > 0) return null;
  }
  if (positive + negative === 0) return null;

  const outward = polygon.normal.clone();
  // Other solid vertices occupy the inside half-space, so point the normal in
  // the opposite direction.
  if (positive > 0) outward.negate();
  return outward;
}

function signedArea(points: readonly THREE.Vector2[]): number {
  let area = 0;
  for (let index = 0; index < points.length; index++) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

function orientation(a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentsIntersect(
  a: THREE.Vector2,
  b: THREE.Vector2,
  c: THREE.Vector2,
  d: THREE.Vector2,
  epsilon: number,
): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return ((o1 > epsilon && o2 < -epsilon) || (o1 < -epsilon && o2 > epsilon))
    && ((o3 > epsilon && o4 < -epsilon) || (o3 < -epsilon && o4 > epsilon));
}

function isSimplePolygon(points: readonly THREE.Vector2[], epsilon: number): boolean {
  const count = points.length;
  for (let first = 0; first < count; first++) {
    const firstNext = (first + 1) % count;
    for (let second = first + 1; second < count; second++) {
      const secondNext = (second + 1) % count;
      if (first === second || firstNext === second || secondNext === first) continue;
      if (segmentsIntersect(
        points[first],
        points[firstNext],
        points[second],
        points[secondNext],
        epsilon,
      )) {
        return false;
      }
    }
  }
  return true;
}

export function normalizePlanarPolygon(
  points: readonly PointCoordinates[],
): NormalizedPlanarPolygon | null {
  const unique: Array<{ vertex: THREE.Vector3; sourceIndex: number }> = [];
  for (let sourceIndex = 0; sourceIndex < points.length; sourceIndex++) {
    const point = points[sourceIndex];
    if (![point.x, point.y, point.z].every(Number.isFinite)) continue;
    const candidate = new THREE.Vector3(point.x, point.z, point.y);
    if (!unique.some(({ vertex }) => vertex.distanceToSquared(candidate) <= EPSILON * EPSILON)) {
      unique.push({ vertex: candidate, sourceIndex });
    }
  }
  const vertices = unique.map(({ vertex }) => vertex);
  if (vertices.length < 3) return null;

  const bounds = new THREE.Box3().setFromPoints(vertices);
  const boundsSize = new THREE.Vector3();
  bounds.getSize(boundsSize);
  const extent = Math.max(boundsSize.x, boundsSize.y, boundsSize.z);
  if (extent <= EPSILON) return null;

  // Find the most stable plane from the maximum-area triangle instead of
  // trusting the incoming polygon order (LLM/manual selections may be shuffled).
  const normal = new THREE.Vector3();
  const candidateNormal = new THREE.Vector3();
  const edgeA = new THREE.Vector3();
  const edgeB = new THREE.Vector3();
  let planeOrigin = vertices[0];
  let bestAreaSquared = 0;
  for (let first = 0; first < vertices.length - 2; first++) {
    for (let second = first + 1; second < vertices.length - 1; second++) {
      for (let third = second + 1; third < vertices.length; third++) {
        edgeA.subVectors(vertices[second], vertices[first]);
        edgeB.subVectors(vertices[third], vertices[first]);
        candidateNormal.crossVectors(edgeA, edgeB);
        if (candidateNormal.lengthSq() > bestAreaSquared) {
          bestAreaSquared = candidateNormal.lengthSq();
          normal.copy(candidateNormal);
          planeOrigin = vertices[first];
        }
      }
    }
  }
  const degeneracyTolerance = Math.max(extent * 1e-8, EPSILON);
  if (bestAreaSquared <= degeneracyTolerance ** 4) return null;
  normal.normalize();

  const coplanarTolerance = Math.max(extent * 1e-5, 1e-7);
  if (vertices.some((vertex) =>
    Math.abs(normal.dot(edgeA.subVectors(vertex, planeOrigin))) > coplanarTolerance)) {
    return null;
  }

  const center = vertices.reduce((sum, vertex) => sum.add(vertex), new THREE.Vector3())
    .multiplyScalar(1 / vertices.length);
  let basisU = new THREE.Vector3();
  let longestRadiusSquared = 0;
  for (const vertex of vertices) {
    const radius = vertex.clone().sub(center);
    radius.addScaledVector(normal, -radius.dot(normal));
    if (radius.lengthSq() > longestRadiusSquared) {
      longestRadiusSquared = radius.lengthSq();
      basisU = radius;
    }
  }
  if (longestRadiusSquared <= degeneracyTolerance ** 2) return null;
  basisU.normalize();
  const basisV = new THREE.Vector3().crossVectors(normal, basisU).normalize();
  const projectedInput = vertices.map((vertex) => {
    const relative = vertex.clone().sub(center);
    return new THREE.Vector2(relative.dot(basisU), relative.dot(basisV));
  });

  const intersectionTolerance = Math.max(extent * extent * 1e-10, 1e-12);
  let order = vertices.map((_, index) => index);
  if (!isSimplePolygon(projectedInput, intersectionTolerance)) {
    order = order.sort((left, right) =>
      Math.atan2(projectedInput[left].y, projectedInput[left].x)
      - Math.atan2(projectedInput[right].y, projectedInput[right].x));
  }

  const orderedVertices = order.map((index) => vertices[index]);
  const projected = order.map((index) => projectedInput[index]);
  if (!isSimplePolygon(projected, intersectionTolerance)
    || Math.abs(signedArea(projected)) <= intersectionTolerance) {
    return null;
  }

  return {
    vertices: orderedVertices,
    projected,
    normal,
    center,
    sourceIndices: order.map((index) => unique[index].sourceIndex),
  };
}

export function buildPlanarPolygonGeometry(points: PointCoordinates[]): PlanarPolygonGeometry | null {
  const polygon = normalizePlanarPolygon(points);
  if (!polygon) return null;

  const triangles = THREE.ShapeUtils.triangulateShape(polygon.projected, []);
  if (triangles.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      polygon.vertices.flatMap((vertex) => [vertex.x, vertex.y, vertex.z]),
      3,
    ),
  );
  geometry.setIndex(triangles.flat());
  geometry.computeVertexNormals();

  const edgePoints = polygon.vertices.map(
    (vertex) => [vertex.x, vertex.y, vertex.z] as [number, number, number],
  );
  edgePoints.push([...edgePoints[0]] as [number, number, number]);
  return {
    geometry,
    edgePoints,
    vertices: polygon.vertices,
    normal: polygon.normal,
    center: polygon.center,
    sourceIndices: polygon.sourceIndices,
  };
}
