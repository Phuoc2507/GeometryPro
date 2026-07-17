// api/_lib/kernel/verifyE.ts
import type { AssertOp } from './planSchema';
import type { EntityTable } from './entityTable';
import type { Violation } from './types';
import type { PointE } from './entities';
import { resolveEntityE } from './resolveE';
import { computeDistance } from './compute/distance';
import { computeAngle } from './compute/angle';
import { computeRelativePosition } from './compute/relative';
import { type ComputeOutcome, coplanarityProblem, EPS } from './compute/answer';

const DIST_TOL = 1e-6;
const ANGLE_TOL = 1e-3;

function fail(relation: string, args: string[], message: string): Violation {
  return { kind: 'assert_failed', relation, args, message };
}

// compute {ok:false} nghĩa là "không đánh giá được assert" (tổ hợp không hỗ trợ / suy biến) →
// ném để run() xếp vào `errors`, KHÔNG phải `violations` (vốn dành cho vi phạm hình học).
function mustOk<T>(r: ComputeOutcome<T>): T {
  if (!r.ok) throw new Error(r.problem);
  return r.answer;
}

// Kiểm một assert trên EntityTable, tái dùng compute layer. Trả Violation | null.
// Ném (→ run() bọc thành error) khi token không giải được hoặc assert không đánh giá được.
export function verifyAssertE(assert: AssertOp, et: EntityTable): Violation | null {
  const args = assert.args;
  switch (assert.relation) {
    case 'on': {
      const a = resolveEntityE(args[0], et);
      const b = resolveEntityE(args[1], et);
      if (a.kind === 'point') {
        // điểm thuộc đường/mặt ⇔ khoảng cách = 0
        const ans = mustOk(computeDistance(a, b));
        const tol = assert.tolerance ?? DIST_TOL;
        return ans.approx < tol ? null : fail('on', args, `${args[0]} not on ${args[1]} (distance ${ans.approx.toFixed(6)})`);
      }
      // đường/mặt "nằm trong / trùng" — KHÔNG dùng distance (compute quy ước cắt-nhau ⇒ 0);
      // phải dùng vị trí tương đối để phân biệt "chứa nhau" với "chỉ cắt nhau".
      const rel = mustOk(computeRelativePosition(a, b)).relation;
      const contained = rel === 'đường nằm trên mặt' || rel === 'trùng nhau';
      return contained ? null : fail('on', args, `${args[0]} not contained in ${args[1]} (${rel})`);
    }
    case 'dist': {
      const ans = mustOk(computeDistance(resolveEntityE(args[0], et), resolveEntityE(args[1], et)));
      const tol = assert.tolerance ?? DIST_TOL;
      return Math.abs(ans.approx - assert.value!) < tol ? null : fail('dist', args, `dist(${args[0]},${args[1]})=${ans.approx.toFixed(6)}, expected ${assert.value}`);
    }
    case 'perp': {
      const ans = mustOk(computeAngle(resolveEntityE(args[0], et), resolveEntityE(args[1], et)));
      const tol = assert.tolerance ?? ANGLE_TOL;
      return Math.abs(ans.degrees - 90) < tol ? null : fail('perp', args, `${args[0]} not perpendicular to ${args[1]} (angle ${ans.degrees.toFixed(4)}°)`);
    }
    case 'parallel': {
      const ans = mustOk(computeAngle(resolveEntityE(args[0], et), resolveEntityE(args[1], et)));
      const tol = assert.tolerance ?? ANGLE_TOL;
      return Math.abs(ans.degrees) < tol ? null : fail('parallel', args, `${args[0]} not parallel to ${args[1]} (angle ${ans.degrees.toFixed(4)}°)`);
    }
    case 'angle': {
      const ans = mustOk(computeAngle(resolveEntityE(args[0], et), resolveEntityE(args[1], et)));
      const tol = assert.tolerance ?? ANGLE_TOL;
      return Math.abs(ans.degrees - assert.value!) < tol ? null : fail('angle', args, `angle(${args[0]},${args[1]})=${ans.degrees.toFixed(4)}°, expected ${assert.value}°`);
    }
    case 'coplanar': {
      const pts = args.map((t) => resolveEntityE(t, et));
      if (pts.some((p) => p.kind !== 'point')) throw new Error('coplanar requires point arguments');
      const cp = coplanarityProblem(pts.map((p) => (p as PointE).p), 'points', assert.tolerance ?? EPS);
      return cp ? fail('coplanar', args, cp) : null;
    }
  }
}
