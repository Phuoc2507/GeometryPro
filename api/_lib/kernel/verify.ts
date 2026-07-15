import type { AssertOp, Plan } from './planSchema';
import type { SymbolTable, Violation, VerifyResult, ResolvedEntity } from './types';
import { resolveEntity } from './resolve';
import {
  type Vec3, sub, dot, cross, length, normalize, distance,
  distancePointToLine, distancePointToPlane, planeNormal,
  angleBetween, arePointsCoplanar, areCollinear, EPS,
} from './vecMath';

const DEFAULT_DIST_TOLERANCE = 1e-6;
const DEFAULT_ANGLE_TOLERANCE_DEG = 1e-3;

function directionOf(entity: ResolvedEntity): Vec3 {
  if (entity.type === 'line') return sub(entity.posB, entity.posA);
  if (entity.type === 'plane') return planeNormal(entity.positions[0], entity.positions[1], entity.positions[2]);
  throw new Error(`Cannot get a direction/normal for entity of type "${entity.type}"`);
}

export function verifyAssert(assertOp: AssertOp, symtab: SymbolTable): Violation | null {
  const tol = assertOp.tolerance ?? DEFAULT_DIST_TOLERANCE;
  const angleTol = assertOp.tolerance ?? DEFAULT_ANGLE_TOLERANCE_DEG;
  const [argA, argB] = assertOp.args;

  switch (assertOp.relation) {
    case 'perp': {
      const a = resolveEntity(argA, symtab);
      const b = resolveEntity(argB, symtab);
      const rawDot = Math.abs(dot(normalize(directionOf(a)), normalize(directionOf(b))));
      // For a line-vs-plane check, directionOf(plane) is the plane's NORMAL, so a line
      // perpendicular to the plane is *parallel* to that normal (|dot| ≈ 1, not ≈ 0).
      const isLinePlane = (a.type === 'line' && b.type === 'plane') || (a.type === 'plane' && b.type === 'line');
      const actual = isLinePlane ? 1 - rawDot : rawDot;
      if (actual < tol) return null;
      return {
        kind: 'assert_failed', relation: 'perp', args: assertOp.args, expected: 0, actual,
        message: `Expected ${argA} ⊥ ${argB}, but |cos angle| = ${rawDot.toFixed(6)}`,
      };
    }
    case 'parallel': {
      const a = resolveEntity(argA, symtab);
      const b = resolveEntity(argB, symtab);
      const actual = length(cross(normalize(directionOf(a)), normalize(directionOf(b))));
      if (actual < tol) return null;
      return {
        kind: 'assert_failed', relation: 'parallel', args: assertOp.args, expected: 0, actual,
        message: `Expected ${argA} ∥ ${argB}, but |cross product| = ${actual.toFixed(6)}`,
      };
    }
    case 'coplanar': {
      const positions = assertOp.args.map((tok) => {
        const e = resolveEntity(tok, symtab);
        if (e.type !== 'point') throw new Error(`coplanar assert requires point args, got "${e.type}" for "${tok}"`);
        return e.pos;
      });
      if (arePointsCoplanar(positions, tol)) return null;
      return {
        kind: 'assert_failed', relation: 'coplanar', args: assertOp.args,
        message: `Points ${assertOp.args.join(', ')} are not coplanar`,
      };
    }
    case 'on': {
      const [pointTok, entityTok] = assertOp.args;
      const p = resolveEntity(pointTok, symtab);
      const e = resolveEntity(entityTok, symtab);
      if (p.type !== 'point') throw new Error(`"on" assert requires first arg to be a point, got "${p.type}"`);
      let actual: number;
      if (e.type === 'line') actual = distancePointToLine(p.pos, e.posA, e.posB);
      else if (e.type === 'plane') actual = distancePointToPlane(p.pos, e.positions[0], planeNormal(e.positions[0], e.positions[1], e.positions[2]));
      else throw new Error(`"on" assert requires second arg to be a line or plane, got "${e.type}"`);
      if (actual < tol) return null;
      return {
        kind: 'assert_failed', relation: 'on', args: assertOp.args, expected: 0, actual,
        message: `Expected ${pointTok} on ${entityTok}, but distance = ${actual.toFixed(6)}`,
      };
    }
    case 'dist': {
      const a = resolveEntity(argA, symtab);
      const b = resolveEntity(argB, symtab);
      const expected = assertOp.value!;
      let actual: number;
      if (a.type === 'point' && b.type === 'point') actual = distance(a.pos, b.pos);
      else if (a.type === 'point' && b.type === 'line') actual = distancePointToLine(a.pos, b.posA, b.posB);
      else if (a.type === 'line' && b.type === 'point') actual = distancePointToLine(b.pos, a.posA, a.posB);
      else if (a.type === 'point' && b.type === 'plane') actual = distancePointToPlane(a.pos, b.positions[0], planeNormal(b.positions[0], b.positions[1], b.positions[2]));
      else if (a.type === 'plane' && b.type === 'point') actual = distancePointToPlane(b.pos, a.positions[0], planeNormal(a.positions[0], a.positions[1], a.positions[2]));
      else throw new Error(`Unsupported dist combination: "${a.type}" x "${b.type}"`);
      if (Math.abs(actual - expected) < tol) return null;
      return {
        kind: 'assert_failed', relation: 'dist', args: assertOp.args, expected, actual,
        message: `Expected dist(${argA}, ${argB}) = ${expected}, got ${actual.toFixed(6)}`,
      };
    }
    case 'angle': {
      const a = resolveEntity(argA, symtab);
      const b = resolveEntity(argB, symtab);
      const expected = assertOp.value!;
      let actual = angleBetween(directionOf(a), directionOf(b));
      const isLinePlane = (a.type === 'line' && b.type === 'plane') || (a.type === 'plane' && b.type === 'line');
      if (isLinePlane) {
        actual = 90 - actual;
      } else if (actual > 90) {
        actual = 180 - actual;
      }
      if (Math.abs(actual - expected) < angleTol) return null;
      return {
        kind: 'assert_failed', relation: 'angle', args: assertOp.args, expected, actual,
        message: `Expected angle(${argA}, ${argB}) = ${expected}°, got ${actual.toFixed(4)}°`,
      };
    }
  }
}

export function checkDegeneracy(symtab: SymbolTable): Violation[] {
  const violations: Violation[] = [];
  const names = Array.from(symtab.points.keys());

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const pi = symtab.points.get(names[i])!;
      const pj = symtab.points.get(names[j])!;
      const d = distance(pi, pj);
      if (d < EPS) {
        violations.push({
          kind: 'degenerate',
          message: `Points "${names[i]}" and "${names[j]}" coincide (distance ${d.toExponential(2)})`,
        });
      }
    }
  }

  for (const [key, verts] of symtab.namedPlanes.entries()) {
    if (verts.length < 3) continue;
    const positions = verts.map((n) => symtab.points.get(n)!);
    const [p0, p1, p2] = positions;
    if (areCollinear(p0, p1, p2)) {
      violations.push({ kind: 'degenerate', message: `Face "${key}" (${verts.join(',')}) is degenerate: first three vertices are collinear` });
    } else if (!arePointsCoplanar(positions)) {
      violations.push({ kind: 'degenerate', message: `Face "${key}" (${verts.join(',')}) is not planar` });
    }
  }

  return violations;
}

export function verifyPlan(plan: Plan, symtab: SymbolTable): VerifyResult {
  const violations: Violation[] = [];
  for (const assertOp of plan.asserts) {
    const v = verifyAssert(assertOp, symtab);
    if (v) violations.push(v);
  }
  violations.push(...checkDegeneracy(symtab));
  return { ok: violations.length === 0, violations };
}
