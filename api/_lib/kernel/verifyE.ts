// api/_lib/kernel/verifyE.ts
import type { AssertOp } from './planSchema';
import type { EntityTable } from './entityTable';
import type { Violation } from './types';
import type { PointE } from './entities';
import { resolveEntityE } from './resolveE';
import { computeDistance } from './compute/distance';
import { computeAngle } from './compute/angle';
import { coplanarityProblem } from './compute/answer';

const DIST_TOL = 1e-6;
const ANGLE_TOL = 1e-3;

function fail(relation: string, args: string[], message: string): Violation {
  return { kind: 'assert_failed', relation, args, message };
}

// Kiểm một assert trên EntityTable, tái dùng compute layer. Trả Violation | null.
// Có thể ném nếu token không giải được — caller (run) bọc try/catch.
export function verifyAssertE(assert: AssertOp, et: EntityTable): Violation | null {
  const args = assert.args;
  switch (assert.relation) {
    case 'on': {
      const r = computeDistance(resolveEntityE(args[0], et), resolveEntityE(args[1], et));
      const tol = assert.tolerance ?? DIST_TOL;
      if (!r.ok) return fail('on', args, r.problem);
      return r.answer.approx < tol ? null : fail('on', args, `${args[0]} not on ${args[1]} (distance ${r.answer.approx.toFixed(6)})`);
    }
    case 'dist': {
      const r = computeDistance(resolveEntityE(args[0], et), resolveEntityE(args[1], et));
      const tol = assert.tolerance ?? DIST_TOL;
      if (!r.ok) return fail('dist', args, r.problem);
      return Math.abs(r.answer.approx - assert.value!) < tol ? null : fail('dist', args, `dist(${args[0]},${args[1]})=${r.answer.approx.toFixed(6)}, expected ${assert.value}`);
    }
    case 'perp': {
      const r = computeAngle(resolveEntityE(args[0], et), resolveEntityE(args[1], et));
      const tol = assert.tolerance ?? ANGLE_TOL;
      if (!r.ok) return fail('perp', args, r.problem);
      return Math.abs(r.answer.degrees - 90) < tol ? null : fail('perp', args, `${args[0]} not perpendicular to ${args[1]} (angle ${r.answer.degrees.toFixed(4)}°)`);
    }
    case 'parallel': {
      const r = computeAngle(resolveEntityE(args[0], et), resolveEntityE(args[1], et));
      const tol = assert.tolerance ?? ANGLE_TOL;
      if (!r.ok) return fail('parallel', args, r.problem);
      return Math.abs(r.answer.degrees) < tol ? null : fail('parallel', args, `${args[0]} not parallel to ${args[1]} (angle ${r.answer.degrees.toFixed(4)}°)`);
    }
    case 'angle': {
      const r = computeAngle(resolveEntityE(args[0], et), resolveEntityE(args[1], et));
      const tol = assert.tolerance ?? ANGLE_TOL;
      if (!r.ok) return fail('angle', args, r.problem);
      return Math.abs(r.answer.degrees - assert.value!) < tol ? null : fail('angle', args, `angle(${args[0]},${args[1]})=${r.answer.degrees.toFixed(4)}°, expected ${assert.value}°`);
    }
    case 'coplanar': {
      const pts = args.map((t) => resolveEntityE(t, et));
      if (pts.some((p) => p.kind !== 'point')) return fail('coplanar', args, 'coplanar requires point arguments');
      const cp = coplanarityProblem(pts.map((p) => (p as PointE).p), 'points');
      return cp ? fail('coplanar', args, cp) : null;
    }
  }
}
