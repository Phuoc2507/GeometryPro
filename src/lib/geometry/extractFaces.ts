import * as THREE from 'three';
import { Point3D, Line3D, Plane3D } from '@/types/geometry';
import { deriveSurfaceFaces } from './surfaceFaces';

export interface Face {
  vertices: THREE.Vector3[];
  normal: THREE.Vector3;
  edges: string[]; // Line IDs that form this face
  centroid: THREE.Vector3;
  /** Vertex ids around the face boundary, when derived from identified points. */
  pointIds?: string[];
}

/**
 * Extract the solid's surface faces from geometry.
 *
 * Faces are derived from the edge graph and the supplied planes together, then
 * filtered down to the genuine outer hull (see `deriveSurfaceFaces`). The
 * occlusion mesh built here and the rendered planes therefore share one face
 * set, so hidden-line dashing and the shaded planes can never disagree.
 */
export function extractFaces(points: Point3D[], lines: Line3D[], planes: Plane3D[] = []): Face[] {
  return deriveSurfaceFaces({ points, lines, planes });
}

/**
 * Get all line IDs that are part of at least one face (external edges)
 */
export function getExternalEdges(faces: Face[]): Set<string> {
  const edgeSet = new Set<string>();
  for (const face of faces) {
    for (const edge of face.edges) {
      edgeSet.add(edge);
    }
  }
  return edgeSet;
}

/**
 * Check if a line is an internal diagonal (not part of any face)
 */
export function isInternalDiagonal(lineId: string, faces: Face[]): boolean {
  for (const face of faces) {
    if (face.edges.includes(lineId)) {
      return false;
    }
  }
  return true;
}

/**
 * Triangle data for raycasting
 */
export interface Triangle {
  a: THREE.Vector3;
  b: THREE.Vector3;
  c: THREE.Vector3;
  faceIndex: number;
}

/**
 * Triangulate faces for raycasting
 * - Triangle faces: 1 triangle
 * - Quad faces: 2 triangles (A,B,C) and (A,C,D)
 */
export function triangulateFaces(faces: Face[]): Triangle[] {
  const triangles: Triangle[] = [];

  for (let faceIndex = 0; faceIndex < faces.length; faceIndex++) {
    const face = faces[faceIndex];
    const verts = face.vertices;

    if (verts.length < 3) continue;
    const center = verts.reduce((sum, vertex) => sum.add(vertex), new THREE.Vector3())
      .multiplyScalar(1 / verts.length);
    const basisU = verts[0].clone().sub(center).normalize();
    const basisV = new THREE.Vector3().crossVectors(face.normal, basisU).normalize();
    const contour = verts.map((vertex) => {
      const relative = vertex.clone().sub(center);
      return new THREE.Vector2(relative.dot(basisU), relative.dot(basisV));
    });
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(contour, [])) {
      triangles.push({
        a: verts[a].clone(),
        b: verts[b].clone(),
        c: verts[c].clone(),
        faceIndex,
      });
    }
  }

  return triangles;
}

/**
 * Build a THREE.Mesh from triangles for raycasting
 */
export function buildOcclusionMesh(triangles: Triangle[]): THREE.Mesh | null {
  if (triangles.length === 0) return null;

  const positions: number[] = [];

  for (const tri of triangles) {
    positions.push(tri.a.x, tri.a.y, tri.a.z);
    positions.push(tri.b.x, tri.b.y, tri.b.z);
    positions.push(tri.c.x, tri.c.y, tri.c.z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    visible: false // Don't render, just for raycasting
  });

  return new THREE.Mesh(geometry, material);
}
