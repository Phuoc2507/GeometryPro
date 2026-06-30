import * as THREE from 'three';

export interface UnfoldNode {
  id: number;
  triangles: { v1: THREE.Vector3; v2: THREE.Vector3; v3: THREE.Vector3 }[];
  normal: THREE.Vector3;
  children: UnfoldChild[];
}

export interface UnfoldChild {
  node: UnfoldNode;
  hingeEdge: [THREE.Vector3, THREE.Vector3];
  dihedralAngle: number;
}

/**
 * Builds a spanning tree of polygonal faces for unfolding a convex geometry.
 */
export function buildUnfoldTree(geometry: THREE.BufferGeometry): UnfoldNode | null {
  const pos = geometry.attributes.position;
  if (!pos) return null;

  // 1. Extract all triangle faces
  const triangles: { id: number; v1: THREE.Vector3; v2: THREE.Vector3; v3: THREE.Vector3; normal: THREE.Vector3; polyId: number }[] = [];
  
  const getNormal = (v1: THREE.Vector3, v2: THREE.Vector3, v3: THREE.Vector3) => {
    return new THREE.Vector3().crossVectors(v2.clone().sub(v1), v3.clone().sub(v1)).normalize();
  };

  if (geometry.index) {
    const idx = geometry.index.array;
    for (let i = 0; i < idx.length; i += 3) {
      const v1 = new THREE.Vector3().fromBufferAttribute(pos, idx[i]);
      const v2 = new THREE.Vector3().fromBufferAttribute(pos, idx[i+1]);
      const v3 = new THREE.Vector3().fromBufferAttribute(pos, idx[i+2]);
      triangles.push({ id: i/3, v1, v2, v3, normal: getNormal(v1, v2, v3), polyId: -1 });
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      const v1 = new THREE.Vector3().fromBufferAttribute(pos, i);
      const v2 = new THREE.Vector3().fromBufferAttribute(pos, i+1);
      const v3 = new THREE.Vector3().fromBufferAttribute(pos, i+2);
      triangles.push({ id: i/3, v1, v2, v3, normal: getNormal(v1, v2, v3), polyId: -1 });
    }
  }

  if (triangles.length === 0) return null;

  // 2. Build adjacency list of triangles based on shared edges
  const isSameVertex = (a: THREE.Vector3, b: THREE.Vector3) => a.distanceTo(b) < 0.001;
  const getSharedEdge = (tA: typeof triangles[0], tB: typeof triangles[0]) => {
    const vA = [tA.v1, tA.v2, tA.v3];
    const vB = [tB.v1, tB.v2, tB.v3];
    const shared: THREE.Vector3[] = [];
    for (const a of vA) {
      if (vB.some(b => isSameVertex(a, b))) shared.push(a);
    }
    if (shared.length === 2) return shared as [THREE.Vector3, THREE.Vector3];
    return null;
  };

  const triAdjacency = new Map<number, { neighborId: number; edge: [THREE.Vector3, THREE.Vector3] }[]>();
  for (let i = 0; i < triangles.length; i++) triAdjacency.set(triangles[i].id, []);

  for (let i = 0; i < triangles.length; i++) {
    for (let j = i + 1; j < triangles.length; j++) {
      const edge = getSharedEdge(triangles[i], triangles[j]);
      if (edge) {
        triAdjacency.get(triangles[i].id)!.push({ neighborId: triangles[j].id, edge });
        triAdjacency.get(triangles[j].id)!.push({ neighborId: triangles[i].id, edge });
      }
    }
  }

  // 3. Group coplanar triangles into Polygons using BFS
  let currentPolyId = 0;
  for (let i = 0; i < triangles.length; i++) {
    if (triangles[i].polyId !== -1) continue;
    
    // Start new polygon
    const queue = [triangles[i]];
    triangles[i].polyId = currentPolyId;
    
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const neighbors = triAdjacency.get(curr.id) || [];
      
      for (const n of neighbors) {
        const neighborTri = triangles.find(t => t.id === n.neighborId)!;
        if (neighborTri.polyId === -1 && curr.normal.distanceTo(neighborTri.normal) < 0.05) {
          neighborTri.polyId = currentPolyId;
          queue.push(neighborTri);
        }
      }
    }
    currentPolyId++;
  }

  // 4. Create PolygonFaces
  const polygons: { id: number; triangles: typeof triangles; normal: THREE.Vector3 }[] = [];
  for (let pid = 0; pid < currentPolyId; pid++) {
    const polyTris = triangles.filter(t => t.polyId === pid);
    if (polyTris.length > 0) {
      polygons.push({
        id: pid,
        triangles: polyTris,
        normal: polyTris[0].normal // all have roughly the same normal
      });
    }
  }

  // 5. Build Polygon Adjacency
  const polyAdjacency = new Map<number, { neighborId: number; edge: [THREE.Vector3, THREE.Vector3] }[]>();
  for (const p of polygons) polyAdjacency.set(p.id, []);

  for (let i = 0; i < polygons.length; i++) {
    for (let j = i + 1; j < polygons.length; j++) {
      // Find a shared edge between ANY triangle in poly A and ANY triangle in poly B
      let sharedEdge: [THREE.Vector3, THREE.Vector3] | null = null;
      outer: for (const tA of polygons[i].triangles) {
        for (const tB of polygons[j].triangles) {
          const edge = getSharedEdge(tA, tB);
          if (edge) {
            sharedEdge = edge;
            break outer;
          }
        }
      }
      
      if (sharedEdge) {
        polyAdjacency.get(polygons[i].id)!.push({ neighborId: polygons[j].id, edge: sharedEdge });
        polyAdjacency.get(polygons[j].id)!.push({ neighborId: polygons[i].id, edge: sharedEdge });
      }
    }
  }

  // 6. Pick root polygon (the one pointing most downwards - usually the base)
  let rootPoly = polygons[0];
  for (const p of polygons) {
    if (p.normal.y < rootPoly.normal.y) rootPoly = p;
  }

  // 7. Build Spanning Tree via BFS
  const visited = new Set<number>();
  visited.add(rootPoly.id);

  function buildNode(polyId: number): UnfoldNode {
    const poly = polygons.find(p => p.id === polyId)!;
    const node: UnfoldNode = {
      id: poly.id,
      triangles: poly.triangles,
      normal: poly.normal,
      children: []
    };

    const neighbors = polyAdjacency.get(polyId) || [];
    for (const n of neighbors) {
      if (!visited.has(n.neighborId)) {
        visited.add(n.neighborId);
        const childPoly = polygons.find(p => p.id === n.neighborId)!;
        
        // Calculate dihedral angle.
        const dot = Math.max(-1, Math.min(1, poly.normal.dot(childPoly.normal)));
        let angle = Math.acos(dot);
        
        const childNode = buildNode(n.neighborId);
        node.children.push({
          node: childNode,
          hingeEdge: n.edge,
          dihedralAngle: angle
        });
      }
    }
    return node;
  }

  return buildNode(rootPoly.id);
}

/**
 * Recursively computes the transformation matrix for each face based on the unfold progress `t`.
 */
export function computeUnfoldMatrices(
  node: UnfoldNode,
  t: number,
  parentMatrix: THREE.Matrix4 = new THREE.Matrix4(),
  result: Map<number, THREE.Matrix4> = new Map()
) {
  result.set(node.id, parentMatrix);

  for (const child of node.children) {
    // 1. Transform original normals and hinge point by the parent's matrix
    const nA = node.normal.clone().transformDirection(parentMatrix).normalize();
    const nB = child.node.normal.clone().transformDirection(parentMatrix).normalize();
    const pivot = child.hingeEdge[0].clone().applyMatrix4(parentMatrix);

    // 2. The axis of rotation that aligns nB to nA is (nB x nA).
    // If nB and nA are parallel, axis length is 0, so no rotation needed.
    const axis = new THREE.Vector3().crossVectors(nB, nA);
    const length = axis.length();
    
    let childMatrix = parentMatrix.clone();

    if (length > 0.0001) {
      axis.normalize();
      // angle is already computed in the tree, but let's use it from the child
      // Actually child.dihedralAngle is the total angle. We rotate by t * angle.
      const rotAngle = t * child.dihedralAngle;

      const toOrigin = new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z);
      const rot = new THREE.Matrix4().makeRotationAxis(axis, rotAngle);
      const back = new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z);

      const localTransform = new THREE.Matrix4().multiply(back).multiply(rot).multiply(toOrigin);
      childMatrix = localTransform.multiply(parentMatrix);
    }

    computeUnfoldMatrices(child.node, t, childMatrix, result);
  }

  return result;
}
