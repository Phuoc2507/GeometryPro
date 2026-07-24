import * as THREE from 'three';
import type { PointCoordinates } from '@/types/geometry';

const EPSILON = 1e-8;

export interface PlanarPolygonGeometry {
  geometry: THREE.BufferGeometry;
  edgePoints: [number, number, number][];
}

export function buildPlanarPolygonGeometry(points: PointCoordinates[]): PlanarPolygonGeometry | null {
  const vertices: THREE.Vector3[] = [];
  for (const point of points) {
    const candidate = new THREE.Vector3(point.x, point.z, point.y);
    if (!vertices.some((existing) => existing.distanceToSquared(candidate) <= EPSILON * EPSILON)) {
      vertices.push(candidate);
    }
  }
  if (vertices.length < 3) return null;

  const center = vertices.reduce((sum, vertex) => sum.add(vertex), new THREE.Vector3())
    .multiplyScalar(1 / vertices.length);
  const normal = new THREE.Vector3();
  for (let index = 0; index < vertices.length; index++) {
    const current = vertices[index];
    const next = vertices[(index + 1) % vertices.length];
    normal.x += (current.y - next.y) * (current.z + next.z);
    normal.y += (current.z - next.z) * (current.x + next.x);
    normal.z += (current.x - next.x) * (current.y + next.y);
  }
  if (normal.lengthSq() <= EPSILON * EPSILON) return null;
  normal.normalize();

  const basisU = vertices[0].clone().sub(center);
  if (basisU.lengthSq() <= EPSILON * EPSILON) return null;
  basisU.normalize();
  const basisV = new THREE.Vector3().crossVectors(normal, basisU).normalize();
  const projected = vertices.map((vertex) => {
    const relative = vertex.clone().sub(center);
    return new THREE.Vector2(relative.dot(basisU), relative.dot(basisV));
  });
  const triangles = THREE.ShapeUtils.triangulateShape(projected, []);
  if (triangles.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices.flatMap((vertex) => [vertex.x, vertex.y, vertex.z]), 3),
  );
  geometry.setIndex(triangles.flat());
  geometry.computeVertexNormals();

  const edgePoints = vertices.map((vertex) => [vertex.x, vertex.y, vertex.z] as [number, number, number]);
  edgePoints.push([...edgePoints[0]] as [number, number, number]);
  return { geometry, edgePoints };
}
