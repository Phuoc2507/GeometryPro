import * as THREE from 'three';
import type { GeometryData, Line3D, Plane3D, Point3D } from '@/types/geometry';
import type { Face } from './extractFaces';
import { normalizePlanarPolygon } from './planeGeometry';

/**
 * Derive a solid's *surface* faces from its geometry instead of trusting the
 * raw `planes` list that the backend / LLM emits.
 *
 * The same face set feeds two consumers that must never disagree: the
 * translucent plane meshes we render, and the occlusion mesh that decides which
 * edges are drawn dashed (hidden). When the two drifted apart — because a plane
 * was picked that is not actually on the hull, or a hull face was missing — the
 * drawing showed "the face you need is gone, the face you don't need is there".
 *
 * Approach: gather candidate faces from the edge graph *and* the supplied
 * planes, then keep only those that are genuinely on the outside of the solid.
 */

interface SurfaceCandidate {
  /** Ordered vertex ids around the face boundary. */
  pointIds: string[];
  vertices: THREE.Vector3[];
  normal: THREE.Vector3;
  centroid: THREE.Vector3;
  /** Line ids for the boundary edges that exist in the drawing. */
  edges: string[];
  /** The originating plane, when this face came from (or matched) one. */
  plane?: Plane3D;
}

type FaceClass = 'boundary' | 'isolated' | 'interior';

const KEY_SEPARATOR = '|';

function toVector3(point: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(point.x, point.z, point.y);
}

function edgeKey(from: string, to: string): string {
  return from < to
    ? `${from}${KEY_SEPARATOR}${to}`
    : `${to}${KEY_SEPARATOR}${from}`;
}

function buildEdgeIndex(lines: Line3D[]): Map<string, string> {
  return new Map(lines.map((line) => [edgeKey(line.from, line.to), line.id]));
}

function getLineId(from: string, to: string, edgeIndex: ReadonlyMap<string, string>): string | null {
  return edgeIndex.get(edgeKey(from, to)) ?? null;
}

function buildAdjacencyMap(lines: Line3D[]): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();
  for (const line of lines) {
    if (!adjacency.has(line.from)) adjacency.set(line.from, new Set());
    if (!adjacency.has(line.to)) adjacency.set(line.to, new Set());
    adjacency.get(line.from)!.add(line.to);
    adjacency.get(line.to)!.add(line.from);
  }
  return adjacency;
}

/** Sorted-id key so the same face found via different routes deduplicates. */
function faceKey(pointIds: readonly string[]): string {
  return [...pointIds].sort().join(KEY_SEPARATOR);
}

function boundaryEdges(
  pointIds: readonly string[],
  edgeIndex: ReadonlyMap<string, string>,
): string[] {
  const edges: string[] = [];
  for (let index = 0; index < pointIds.length; index++) {
    const lineId = getLineId(pointIds[index], pointIds[(index + 1) % pointIds.length], edgeIndex);
    if (lineId) edges.push(lineId);
  }
  return edges;
}

function faceFromIds(
  pointIds: string[],
  pointMap: ReadonlyMap<string, Point3D>,
  edgeIndex: ReadonlyMap<string, string>,
): SurfaceCandidate | null {
  const coordinates = pointIds.map((id) => pointMap.get(id)).filter((point): point is Point3D => !!point);
  if (coordinates.length !== pointIds.length) return null;
  const polygon = normalizePlanarPolygon(coordinates);
  if (!polygon) return null;
  const orderedIds = polygon.sourceIndices.map((sourceIndex) => pointIds[sourceIndex]);
  return {
    pointIds: orderedIds,
    vertices: polygon.vertices,
    normal: polygon.normal,
    centroid: polygon.center,
    edges: boundaryEdges(orderedIds, edgeIndex),
  };
}

/** Triangles (3-cliques) in the edge graph. */
function findGraphTriangles(
  adjacency: Map<string, Set<string>>,
  pointMap: ReadonlyMap<string, Point3D>,
  edgeIndex: ReadonlyMap<string, string>,
): SurfaceCandidate[] {
  const faces: SurfaceCandidate[] = [];
  const seen = new Set<string>();
  for (const [a, neighborsA] of adjacency) {
    for (const b of neighborsA) {
      const neighborsB = adjacency.get(b);
      if (!neighborsB) continue;
      for (const c of neighborsB) {
        if (c === a || !neighborsA.has(c)) continue;
        const key = faceKey([a, b, c]);
        if (seen.has(key)) continue;
        seen.add(key);
        const face = faceFromIds([a, b, c], pointMap, edgeIndex);
        if (face) faces.push(face);
      }
    }
  }
  return faces;
}

/** Chordless 4-cycles in the edge graph. */
function findGraphQuads(
  adjacency: Map<string, Set<string>>,
  pointMap: ReadonlyMap<string, Point3D>,
  edgeIndex: ReadonlyMap<string, string>,
): SurfaceCandidate[] {
  const faces: SurfaceCandidate[] = [];
  const seen = new Set<string>();
  for (const [a, neighborsA] of adjacency) {
    for (const b of neighborsA) {
      const neighborsB = adjacency.get(b);
      if (!neighborsB) continue;
      for (const c of neighborsB) {
        if (c === a || neighborsA.has(c)) continue;
        const neighborsC = adjacency.get(c);
        if (!neighborsC) continue;
        for (const d of neighborsC) {
          if (d === a || d === b || !neighborsA.has(d) || neighborsB.has(d)) continue;
          const key = faceKey([a, b, c, d]);
          if (seen.has(key)) continue;
          seen.add(key);
          // Preserve the cycle order a-b-c-d for a valid boundary.
          const face = faceFromIds([a, b, c, d], pointMap, edgeIndex);
          if (face) faces.push(face);
        }
      }
    }
  }
  return faces;
}

/** N-gon candidates taken straight from the supplied planes. */
function findPlaneCandidates(
  planes: Plane3D[],
  points: Point3D[],
  pointMap: ReadonlyMap<string, Point3D>,
  edgeIndex: ReadonlyMap<string, string>,
): SurfaceCandidate[] {
  return planes.flatMap((plane) => {
    let ids = plane.pointIds?.filter((id) => pointMap.has(id)) ?? [];
    if (ids.length < 3) {
      ids = plane.points.map((coordinate) => {
        const match = points.find((point) =>
          Math.abs(point.x - coordinate.x) <= 1e-6
          && Math.abs(point.y - coordinate.y) <= 1e-6
          && Math.abs(point.z - coordinate.z) <= 1e-6);
        return match?.id ?? '';
      }).filter(Boolean);
    }
    const coordinates = ids.length >= 3
      ? ids.map((id) => pointMap.get(id)!)
      : plane.points;
    const polygon = normalizePlanarPolygon(coordinates);
    if (!polygon) return [];
    const orderedIds = ids.length >= 3
      ? polygon.sourceIndices.map((sourceIndex) => ids[sourceIndex])
      : [];
    return [{
      pointIds: orderedIds,
      vertices: polygon.vertices,
      normal: polygon.normal,
      centroid: polygon.center,
      edges: orderedIds.length === polygon.vertices.length
        ? boundaryEdges(orderedIds, edgeIndex)
        : [],
      plane,
    }];
  });
}

/**
 * Deduplicate faces that describe the same vertex set, preferring the variant
 * that carries an originating plane (so we keep its id / colour / animation).
 */
function dedupeCandidates(candidates: SurfaceCandidate[]): SurfaceCandidate[] {
  const byKey = new Map<string, SurfaceCandidate>();
  for (const candidate of candidates) {
    if (candidate.pointIds.length < 3) continue;
    const key = faceKey(candidate.pointIds);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, candidate);
    } else if (!existing.plane && candidate.plane) {
      byKey.set(key, candidate);
    }
  }
  return [...byKey.values()];
}

/** Count how many candidate faces share each undirected boundary edge. */
function buildEdgeFaceCounts(candidates: SurfaceCandidate[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const candidate of candidates) {
    const ids = candidate.pointIds;
    for (let index = 0; index < ids.length; index++) {
      const key = edgeKey(ids[index], ids[(index + 1) % ids.length]);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Where do the *other* solid vertices sit relative to this face's plane?
 * - boundary: all on one side  → outer hull face (exact for convex solids).
 * - isolated: none off the plane → a standalone flat figure, keep it.
 * - interior: vertices on both sides → a cut through the solid, drop it.
 */
function classifyFace(
  candidate: SurfaceCandidate,
  solidVertices: ReadonlyArray<{ id: string; vertex: THREE.Vector3 }>,
  tolerance: number,
): FaceClass {
  const own = new Set(candidate.pointIds);
  let positive = 0;
  let negative = 0;
  const relative = new THREE.Vector3();
  for (const { id, vertex } of solidVertices) {
    if (own.has(id)) continue;
    const distance = candidate.normal.dot(relative.subVectors(vertex, candidate.centroid));
    if (distance > tolerance) positive++;
    else if (distance < -tolerance) negative++;
  }
  if (positive > 0 && negative > 0) return 'interior';
  if (positive === 0 && negative === 0) return 'isolated';
  return 'boundary';
}

/**
 * A concave (reflex) solid has genuine hull faces that fail the half-space test
 * because the body wraps around them. They are still real faces: every one of
 * their edges is shared by exactly two candidate faces (a manifold seam). A true
 * internal cut instead has at least one edge shared by three or more faces, so
 * this rescue keeps reflex hull faces without readmitting cross-sections.
 */
function isManifoldFace(
  candidate: SurfaceCandidate,
  edgeFaceCounts: ReadonlyMap<string, number>,
): boolean {
  const ids = candidate.pointIds;
  if (ids.length < 3) return false;
  for (let index = 0; index < ids.length; index++) {
    const key = edgeKey(ids[index], ids[(index + 1) % ids.length]);
    if ((edgeFaceCounts.get(key) ?? 0) !== 2) return false;
  }
  return true;
}

/**
 * Drop a face whose vertices are wholly contained in a larger kept face — e.g.
 * the diagonal triangle ABC that sits inside the base quad ABCD.
 */
function removeContainedFaces(faces: SurfaceCandidate[]): SurfaceCandidate[] {
  const idSets = faces.map((face) => new Set(face.pointIds));
  return faces.filter((face, index) => {
    const mine = idSets[index];
    return !faces.some((other, otherIndex) => {
      if (otherIndex === index) return false;
      const theirs = idSets[otherIndex];
      if (theirs.size <= mine.size) return false;
      for (const id of mine) if (!theirs.has(id)) return false;
      return true;
    });
  });
}

function toFace(candidate: SurfaceCandidate): Face {
  return {
    vertices: candidate.vertices,
    normal: candidate.normal,
    centroid: candidate.centroid,
    edges: candidate.edges,
    pointIds: candidate.pointIds,
  };
}

type SurfaceScene = Pick<GeometryData, 'points' | 'lines'> & { planes?: Plane3D[] };

/** Kept surface faces as rich candidates (used by both public entry points). */
function deriveSurfaceCandidates(geometry: SurfaceScene): SurfaceCandidate[] {
  const points = geometry.points ?? [];
  const lines = geometry.lines ?? [];
  const planes = geometry.planes ?? [];
  if (points.length < 3) return [];

  const pointMap = new Map(points.map((point) => [point.id, point]));
  const edgeIndex = buildEdgeIndex(lines);
  const adjacency = buildAdjacencyMap(lines);

  const candidates = dedupeCandidates([
    ...findGraphTriangles(adjacency, pointMap, edgeIndex),
    ...findGraphQuads(adjacency, pointMap, edgeIndex),
    ...findPlaneCandidates(planes, points, pointMap, edgeIndex),
  ]);
  if (candidates.length === 0) return [];

  // The solid's vertex cloud is exactly the points that take part in a face.
  const solidIds = new Set<string>();
  for (const candidate of candidates) for (const id of candidate.pointIds) solidIds.add(id);
  const solidVertices = [...solidIds]
    .map((id) => pointMap.get(id))
    .filter((point): point is Point3D => !!point)
    .map((point) => ({ id: point.id, vertex: toVector3(point) }));

  const bounds = new THREE.Box3();
  for (const { vertex } of solidVertices) bounds.expandByPoint(vertex);
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const tolerance = Math.max(size.length() * 1e-5, 1e-7);

  const edgeFaceCounts = buildEdgeFaceCounts(candidates);

  const kept = candidates.filter((candidate) => {
    const classification = classifyFace(candidate, solidVertices, tolerance);
    if (classification !== 'interior') return true;
    // Reflex-face rescue: an interior-looking face that is a clean manifold seam.
    return isManifoldFace(candidate, edgeFaceCounts);
  });

  return removeContainedFaces(kept);
}

/**
 * Faces that make up the solid's outer surface. This is the single source of
 * truth for hidden-line occlusion (`extractFaces`) and plane rendering
 * (`deriveSurfacePlanes`).
 */
export function deriveSurfaceFaces(geometry: SurfaceScene): Face[] {
  return deriveSurfaceCandidates(geometry).map(toFace);
}

/**
 * The surface faces expressed as renderable planes. Faces that matched a
 * supplied plane keep its id / colour / opacity / animation target; faces the
 * producer missed are emitted with a fresh, deterministic id.
 */
export function deriveSurfacePlanes(geometry: SurfaceScene): Plane3D[] {
  const pointMap = new Map((geometry.points ?? []).map((point) => [point.id, point]));
  return deriveSurfaceCandidates(geometry).map((candidate) => {
    if (candidate.plane) return candidate.plane;
    const points = candidate.pointIds
      .map((id) => pointMap.get(id))
      .filter((point): point is Point3D => !!point)
      .map(({ x, y, z }) => ({ x, y, z }));
    return {
      id: `surface-${[...candidate.pointIds].sort().join('-')}`,
      points,
      pointIds: candidate.pointIds,
    };
  });
}
