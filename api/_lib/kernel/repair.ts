import type { Violation, SymbolTable } from './types';
import { resolveEntity } from './resolve';
import {
  add, sub, scale, dot, planeNormal, projectPointOntoPlane, projectPointOntoLine,
  distancePointToPlane, length,
} from './vecMath';

/** Beyond this fraction of the shape's own scale, an "on" miss is treated as a likely
 * semantic construction error, not numeric noise — repair is declined so the violation
 * surfaces for LLM-targeted repair instead of being silently papered over. */
export const REPAIR_MAX_RELATIVE_ERROR = 0.01;

/** For "perp", the violation metric is a dimensionless 1 - |cos φ| (scale-independent), so
 * it must be gated by an absolute angular bound, NOT divided by the figure scale. 1e-3
 * corresponds to ≈2.56° of drift — beyond that, the miss is a semantic error, not noise. */
export const REPAIR_MAX_PERP_ERROR = 1e-3;

export type RepairResult = { repaired: boolean; reason?: string };

function referenceScale(symtab: SymbolTable): number {
  const positions = Array.from(symtab.points.values());
  let maxDist = 0;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      maxDist = Math.max(maxDist, length(sub(positions[i], positions[j])));
    }
  }
  return maxDist || 1;
}

export function attemptDeterministicRepair(violation: Violation, symtab: SymbolTable): RepairResult {
  if (violation.kind !== 'assert_failed') {
    return { repaired: false, reason: 'Only assert_failed violations are eligible for deterministic repair' };
  }
  if (violation.relation !== 'on' && violation.relation !== 'perp') {
    return { repaired: false, reason: `Deterministic repair is not implemented for relation "${violation.relation}"` };
  }
  if (!violation.args || violation.args.length !== 2) {
    return { repaired: false, reason: 'Expected exactly 2 args for on/perp repair' };
  }
  if (violation.actual !== undefined) {
    if (violation.relation === 'on') {
      // "on" actual is a genuine distance ⇒ compare as a fraction of the figure scale.
      const scale_ = referenceScale(symtab);
      if (violation.actual / scale_ > REPAIR_MAX_RELATIVE_ERROR) {
        return { repaired: false, reason: 'Error exceeds the deterministic-repair threshold; likely a semantic mistake, not numeric noise' };
      }
    } else if (violation.actual > REPAIR_MAX_PERP_ERROR) {
      // "perp" actual is dimensionless (1 - |cos φ|) ⇒ absolute angular bound, scale-free.
      return { repaired: false, reason: 'Angular error exceeds the deterministic-repair threshold; likely a semantic mistake, not numeric noise' };
    }
  }

  if (violation.relation === 'on') {
    const [pointTok, entityTok] = violation.args;
    const point = resolveEntity(pointTok, symtab);
    const entity = resolveEntity(entityTok, symtab);
    if (point.type !== 'point') return { repaired: false, reason: `"${pointTok}" is not a point` };
    if (entity.type === 'plane') {
      const n = planeNormal(entity.positions[0], entity.positions[1], entity.positions[2]);
      symtab.points.set(point.name, projectPointOntoPlane(point.pos, entity.positions[0], n));
      return { repaired: true };
    }
    if (entity.type === 'line') {
      symtab.points.set(point.name, projectPointOntoLine(point.pos, entity.posA, entity.posB));
      return { repaired: true };
    }
    return { repaired: false, reason: `Cannot project onto entity of type "${entity.type}"` };
  }

  // relation === 'perp': make the line exactly perpendicular to the plane by keeping the
  // endpoint that lies IN the plane fixed (the true anchor) and moving the other one along
  // the plane normal. Which endpoint moves is decided by geometry (distance to the plane),
  // NOT by token order — otherwise "SA" (apex-first) would move the base vertex A and wreck
  // the base, while "AS" would move the apex; both must behave identically.
  const [lineTok, otherTok] = violation.args;
  const lineEntity = resolveEntity(lineTok, symtab);
  const otherEntity = resolveEntity(otherTok, symtab);
  if (lineEntity.type !== 'line') {
    return { repaired: false, reason: `Deterministic perp-repair requires the first arg to be a line, got "${lineEntity.type}"` };
  }
  if (otherEntity.type !== 'plane') {
    return { repaired: false, reason: 'Deterministic perp-repair for line-vs-line is not implemented in Phase 1' };
  }
  const normal = planeNormal(otherEntity.positions[0], otherEntity.positions[1], otherEntity.positions[2]);
  const planePoint = otherEntity.positions[0];
  const distA = distancePointToPlane(lineEntity.posA, planePoint, normal);
  const distB = distancePointToPlane(lineEntity.posB, planePoint, normal);
  // The endpoint closer to the plane is the anchor; move the far one.
  const anchor = distA <= distB
    ? { name: lineEntity.a, pos: lineEntity.posA }
    : { name: lineEntity.b, pos: lineEntity.posB };
  const moved = distA <= distB
    ? { name: lineEntity.b, pos: lineEntity.posB }
    : { name: lineEntity.a, pos: lineEntity.posA };
  const segLen = length(sub(moved.pos, anchor.pos));
  // Preserve which side of the plane the moved point was on.
  const side = dot(sub(moved.pos, anchor.pos), normal) >= 0 ? 1 : -1;
  const newMoved = add(anchor.pos, scale(normal, side * segLen));
  symtab.points.set(moved.name, newMoved);
  return { repaired: true };
}
