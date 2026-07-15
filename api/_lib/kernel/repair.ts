import type { Violation, SymbolTable } from './types';
import { resolveEntity } from './resolve';
import { add, sub, scale, planeNormal, projectPointOntoPlane, projectPointOntoLine, length } from './vecMath';

/** Beyond this fraction of the shape's own scale, an "on"/"perp" miss is treated as a
 * likely semantic construction error, not numeric noise — repair is declined so the
 * violation surfaces for LLM-targeted repair instead of being silently papered over. */
export const REPAIR_MAX_RELATIVE_ERROR = 0.01;

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
  const scale_ = referenceScale(symtab);
  if (violation.actual !== undefined && violation.actual / scale_ > REPAIR_MAX_RELATIVE_ERROR) {
    return { repaired: false, reason: 'Error exceeds the deterministic-repair threshold; likely a semantic mistake, not numeric noise' };
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

  // relation === 'perp': re-anchor the second point of the "line" arg so the line
  // becomes exactly perpendicular to the "other" plane, preserving distance from the anchor.
  const [lineTok, otherTok] = violation.args;
  const lineEntity = resolveEntity(lineTok, symtab);
  const otherEntity = resolveEntity(otherTok, symtab);
  if (lineEntity.type !== 'line') {
    return { repaired: false, reason: `Deterministic perp-repair requires the first arg to be a line, got "${lineEntity.type}"` };
  }
  if (otherEntity.type !== 'plane') {
    return { repaired: false, reason: 'Deterministic perp-repair for line-vs-line is not implemented in Phase 1' };
  }
  const anchorLen = length(sub(lineEntity.posB, lineEntity.posA));
  const normal = planeNormal(otherEntity.positions[0], otherEntity.positions[1], otherEntity.positions[2]);
  const newB = add(lineEntity.posA, scale(normal, anchorLen));
  symtab.points.set(lineEntity.b, newB);
  return { repaired: true };
}
