import * as THREE from 'three';
import { Point3D, Line3D } from '@/types/geometry';

export interface Face {
  vertices: THREE.Vector3[];
  normal: THREE.Vector3;
  edges: string[]; // Line IDs that form this face
  centroid: THREE.Vector3;
}

/**
 * Convert Point3D to THREE.Vector3, swapping Y and Z for Three.js coordinate system
 */
function toVector3(point: Point3D): THREE.Vector3 {
  return new THREE.Vector3(point.x, point.z, point.y);
}

/**
 * Build an adjacency map from lines (only solid lines for face detection)
 */
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

/**
 * Get line ID for an edge between two points
 */
function getLineId(from: string, to: string, lines: Line3D[]): string | null {
  const line = lines.find(
    l => (l.from === from && l.to === to) || (l.from === to && l.to === from)
  );
  return line?.id ?? null;
}

/**
 * Find triangular faces (3 connected vertices)
 */
function findTriangles(
  adjacency: Map<string, Set<string>>,
  points: Point3D[],
  lines: Line3D[]
): Face[] {
  const faces: Face[] = [];
  const foundTriangles = new Set<string>();
  const pointMap = new Map(points.map(p => [p.id, p]));
  
  for (const [a, neighborsA] of adjacency) {
    for (const b of neighborsA) {
      const neighborsB = adjacency.get(b);
      if (!neighborsB) continue;
      
      for (const c of neighborsB) {
        if (c === a) continue;
        if (!neighborsA.has(c)) continue;
        
        // Found triangle a-b-c
        const sorted = [a, b, c].sort().join('-');
        if (foundTriangles.has(sorted)) continue;
        foundTriangles.add(sorted);
        
        const pA = pointMap.get(a);
        const pB = pointMap.get(b);
        const pC = pointMap.get(c);
        if (!pA || !pB || !pC) continue;
        
        const vA = toVector3(pA);
        const vB = toVector3(pB);
        const vC = toVector3(pC);
        
        // Calculate normal using cross product (order matters for direction)
        const edge1 = vB.clone().sub(vA);
        const edge2 = vC.clone().sub(vA);
        const normal = edge1.cross(edge2).normalize();
        
        // Calculate centroid
        const centroid = vA.clone().add(vB).add(vC).divideScalar(3);
        
        // Get edge IDs
        const edges: string[] = [];
        const e1 = getLineId(a, b, lines);
        const e2 = getLineId(b, c, lines);
        const e3 = getLineId(c, a, lines);
        if (e1) edges.push(e1);
        if (e2) edges.push(e2);
        if (e3) edges.push(e3);
        
        faces.push({
          vertices: [vA, vB, vC],
          normal,
          edges,
          centroid
        });
      }
    }
  }
  
  return faces;
}

/**
 * Find quadrilateral faces (4 connected vertices forming a cycle without diagonals)
 */
function findQuads(
  adjacency: Map<string, Set<string>>,
  points: Point3D[],
  lines: Line3D[]
): Face[] {
  const faces: Face[] = [];
  const foundQuads = new Set<string>();
  const pointMap = new Map(points.map(p => [p.id, p]));
  
  for (const [a, neighborsA] of adjacency) {
    for (const b of neighborsA) {
      const neighborsB = adjacency.get(b);
      if (!neighborsB) continue;
      
      for (const c of neighborsB) {
        if (c === a) continue;
        // Skip if a-c are directly connected (that would make it a triangle, not quad edge)
        if (neighborsA.has(c)) continue;
        
        const neighborsC = adjacency.get(c);
        if (!neighborsC) continue;
        
        for (const d of neighborsC) {
          if (d === a || d === b) continue;
          if (!neighborsA.has(d)) continue;
          // Skip if b-d are directly connected (diagonal)
          if (neighborsB.has(d)) continue;
          
          // Found quad a-b-c-d (cycle: a-b-c-d-a)
          const sorted = [a, b, c, d].sort().join('-');
          if (foundQuads.has(sorted)) continue;
          foundQuads.add(sorted);
          
          const pA = pointMap.get(a);
          const pB = pointMap.get(b);
          const pC = pointMap.get(c);
          const pD = pointMap.get(d);
          if (!pA || !pB || !pC || !pD) continue;
          
          const vA = toVector3(pA);
          const vB = toVector3(pB);
          const vC = toVector3(pC);
          const vD = toVector3(pD);
          
          // Calculate normal using diagonal vectors for more stable result
          const diag1 = vC.clone().sub(vA);
          const diag2 = vD.clone().sub(vB);
          const normal = diag1.cross(diag2).normalize();
          
          // Calculate centroid
          const centroid = vA.clone().add(vB).add(vC).add(vD).divideScalar(4);
          
          // Get edge IDs (only the boundary edges, not diagonals)
          const edges: string[] = [];
          const e1 = getLineId(a, b, lines);
          const e2 = getLineId(b, c, lines);
          const e3 = getLineId(c, d, lines);
          const e4 = getLineId(d, a, lines);
          if (e1) edges.push(e1);
          if (e2) edges.push(e2);
          if (e3) edges.push(e3);
          if (e4) edges.push(e4);
          
          faces.push({
            vertices: [vA, vB, vC, vD],
            normal,
            edges,
            centroid
          });
        }
      }
    }
  }
  
  return faces;
}

/**
 * Extract faces from geometry
 * Returns triangular and quadrilateral faces found from the line graph
 */
export function extractFaces(points: Point3D[], lines: Line3D[]): Face[] {
  if (points.length < 3 || lines.length < 3) return [];
  
  // Build adjacency using only solid lines
  const adjacency = buildAdjacencyMap(lines);
  
  const triangles = findTriangles(adjacency, points, lines);
  const quads = findQuads(adjacency, points, lines);
  
  return [...triangles, ...quads];
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
    
    if (verts.length === 3) {
      // Triangle face
      triangles.push({
        a: verts[0].clone(),
        b: verts[1].clone(),
        c: verts[2].clone(),
        faceIndex
      });
    } else if (verts.length === 4) {
      // Quad face: split into 2 triangles
      // Triangle 1: A, B, C
      triangles.push({
        a: verts[0].clone(),
        b: verts[1].clone(),
        c: verts[2].clone(),
        faceIndex
      });
      // Triangle 2: A, C, D
      triangles.push({
        a: verts[0].clone(),
        b: verts[2].clone(),
        c: verts[3].clone(),
        faceIndex
      });
    }
    // Polygons with more vertices can be added if needed
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
