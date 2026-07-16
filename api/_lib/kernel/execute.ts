import type { ConstructionOp, Plan } from './planSchema';
import type { SymbolTable, Vec3 } from './types';
import { resolveEntity } from './resolve';
import { buildSquare, buildRectangle, buildRhombus, buildRegPolygon, buildTriangle } from './ops/shapes';
import type { TriangleDims } from './ops/shapes';
import { extrudePrism, extrudePyramidApex } from './ops/extrude';
import {
  midpoint, centroidPoint, ratioPoint, reflectPoint,
  perpPointFromPlane, footOnPlane, footOnLine,
  intersectLineLine, intersectLinePlane,
} from './ops/points';

export function createEmptySymbolTable(): SymbolTable {
  return { points: new Map(), namedPlanes: new Map(), edges: new Set(), derivedPoints: new Set() };
}

function requirePoint(symtab: SymbolTable, name: string): Vec3 {
  const p = symtab.points.get(name);
  if (!p) throw new Error(`Unknown point "${name}" referenced before it was defined`);
  return p;
}

function setPoint(symtab: SymbolTable, name: string, pos: Vec3) {
  if (symtab.points.has(name)) {
    throw new Error(`Point "${name}" is already defined`);
  }
  symtab.points.set(name, pos);
}

/** Register a computed helper point. Same as setPoint, but marks the name as derived so
 * degeneracy detection tolerates it coinciding with an existing point. */
function setDerivedPoint(symtab: SymbolTable, name: string, pos: Vec3) {
  setPoint(symtab, name, pos);
  (symtab.derivedPoints ??= new Set()).add(name);
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function addEdge(symtab: SymbolTable, a: string, b: string) {
  symtab.edges.add(edgeKey(a, b));
}

function addCyclicEdges(symtab: SymbolTable, verts: string[]) {
  for (let i = 0; i < verts.length; i++) {
    addEdge(symtab, verts[i], verts[(i + 1) % verts.length]);
  }
}

export function executeOp(op: ConstructionOp, symtab: SymbolTable): void {
  switch (op.op) {
    case 'base': {
      let positions: Vec3[];
      switch (op.shape) {
        case 'square':
          positions = buildSquare((op.dims as { edge: number }).edge);
          break;
        case 'rectangle': {
          const d = op.dims as { width: number; height: number };
          positions = buildRectangle(d.width, d.height);
          break;
        }
        case 'rhombus': {
          const d = op.dims as { diag1: number; diag2: number };
          positions = buildRhombus(d.diag1, d.diag2);
          break;
        }
        case 'reg_polygon': {
          const d = op.dims as { n: number; edge: number };
          positions = buildRegPolygon(d.n, d.edge);
          break;
        }
        case 'triangle':
          positions = buildTriangle(op.dims as TriangleDims);
          break;
      }
      op.vertices.forEach((name, i) => setPoint(symtab, name, positions[i]));
      symtab.namedPlanes.set(op.vertices.join(''), op.vertices);
      addCyclicEdges(symtab, op.vertices);
      break;
    }
    case 'prism': {
      const basePositions = op.base.map((n) => requirePoint(symtab, n));
      const topPositions = extrudePrism(basePositions, op.height);
      op.top.forEach((name, i) => setPoint(symtab, name, topPositions[i]));
      symtab.namedPlanes.set(op.top.join(''), op.top);
      addCyclicEdges(symtab, op.top);
      op.base.forEach((baseName, i) => addEdge(symtab, baseName, op.top[i]));
      break;
    }
    case 'pyramid': {
      const basePositions = op.base.map((n) => requirePoint(symtab, n));
      const apexPos = extrudePyramidApex(basePositions, op.height);
      setPoint(symtab, op.apex, apexPos);
      op.base.forEach((baseName) => addEdge(symtab, op.apex, baseName));
      break;
    }
    case 'point': {
      let pos: Vec3;
      switch (op.def.kind) {
        case 'midpoint':
          pos = midpoint(requirePoint(symtab, op.def.of[0]), requirePoint(symtab, op.def.of[1]));
          break;
        case 'centroid':
          pos = centroidPoint(op.def.of.map((n) => requirePoint(symtab, n)));
          break;
        case 'ratio':
          pos = ratioPoint(requirePoint(symtab, op.def.from), requirePoint(symtab, op.def.to), op.def.t);
          break;
        case 'reflect':
          pos = reflectPoint(requirePoint(symtab, op.def.point), requirePoint(symtab, op.def.about));
          break;
      }
      setDerivedPoint(symtab, op.name, pos);
      break;
    }
    case 'perp_point': {
      const fromPos = requirePoint(symtab, op.from);
      const plane = resolveEntity(op.target, symtab);
      if (plane.type !== 'plane') {
        throw new Error(`perp_point target "${op.target}" must resolve to a plane, got "${plane.type}"`);
      }
      setDerivedPoint(symtab, op.name, perpPointFromPlane(fromPos, plane.positions.slice(0, 3), op.length));
      break;
    }
    case 'foot': {
      const fromPos = requirePoint(symtab, op.from);
      const target = resolveEntity(op.target, symtab);
      let pos: Vec3;
      if (op.onto === 'plane') {
        if (target.type !== 'plane') throw new Error(`foot onto plane: "${op.target}" must resolve to a plane`);
        pos = footOnPlane(fromPos, target.positions.slice(0, 3));
      } else {
        if (target.type !== 'line') throw new Error(`foot onto line: "${op.target}" must resolve to a line`);
        pos = footOnLine(fromPos, target.posA, target.posB);
      }
      setDerivedPoint(symtab, op.name, pos);
      break;
    }
    case 'intersect': {
      const a = resolveEntity(op.a, symtab);
      const b = resolveEntity(op.b, symtab);
      let pos: Vec3;
      if (a.type === 'line' && b.type === 'line') {
        pos = intersectLineLine(a.posA, a.posB, b.posA, b.posB);
      } else if (a.type === 'line' && b.type === 'plane') {
        pos = intersectLinePlane(a.posA, a.posB, b.positions.slice(0, 3));
      } else if (a.type === 'plane' && b.type === 'line') {
        pos = intersectLinePlane(b.posA, b.posB, a.positions.slice(0, 3));
      } else {
        throw new Error(
          `intersect: unsupported combination "${a.type}" x "${b.type}" (plane-plane intersection is out of scope for Phase 1)`
        );
      }
      setDerivedPoint(symtab, op.name, pos);
      break;
    }
    case 'edge': {
      requirePoint(symtab, op.from);
      requirePoint(symtab, op.to);
      addEdge(symtab, op.from, op.to);
      break;
    }
  }
}

export function executePlan(plan: Plan): SymbolTable {
  const symtab = createEmptySymbolTable();
  for (const op of plan.ops) {
    executeOp(op, symtab);
  }
  return symtab;
}
