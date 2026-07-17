// api/_lib/kernel/compute/query.ts
import { z } from 'zod';
import type { EntityTable } from '../entityTable';
import type { Entity, PointE } from '../entities';
import { resolveEntityE } from '../resolveE';
import { type ComputeOutcome, type DistanceAnswer, type AngleAnswer, type ScalarAnswer, certifyScalar } from './answer';
import type { Scalar } from '../scalar';
import { computeDistance } from './distance';
import { computeAngle } from './angle';
import { computeTetraVolume, computePyramidVolume, volumeRatio, computeSphereVolume } from './volume';
import { computeTriangleArea, computePolygonArea, computeSphereArea } from './area';
import { computeRelativePosition, type RelPosAnswer } from './relative';
import { computeIntersection, type IntersectionAnswer } from './intersect';
import { planeEquationText, sphereEquationText, lineEquationText } from './equation';

const Tok = z.string().min(1);
const SolidSpec = z.object({ solid: z.enum(['tetrahedron', 'pyramid']), points: z.array(Tok).min(3), apex: Tok.optional() });

export const QueryESchema = z.union([
  z.object({ kind: z.literal('distance'), a: Tok, b: Tok }),
  z.object({ kind: z.literal('angle'), a: Tok, b: Tok }),
  z.object({ kind: z.literal('relative_position'), a: Tok, b: Tok }),
  z.object({ kind: z.literal('intersection'), a: Tok, b: Tok }),
  z.object({ kind: z.literal('equation'), target: Tok }),
  z.object({ kind: z.literal('volume'), solid: z.literal('sphere'), target: Tok }),
  z.object({ kind: z.literal('volume'), solid: z.enum(['tetrahedron', 'pyramid']), points: z.array(Tok).min(3), apex: Tok.optional() }),
  z.object({ kind: z.literal('volume_ratio'), a: SolidSpec, b: SolidSpec }),
  z.object({ kind: z.literal('area'), shape: z.literal('sphere'), target: Tok }),
  z.object({ kind: z.literal('area'), shape: z.enum(['triangle', 'polygon']), points: z.array(Tok).min(3) }),
  z.object({ kind: z.literal('sphere_metric'), target: Tok, what: z.enum(['radius', 'top_z', 'bottom_z']) }),
  z.object({ kind: z.literal('point_coord'), target: Tok, axis: z.enum(['x', 'y', 'z']) }),
]);

type SolidSpecT = z.infer<typeof SolidSpec>;

export type QueryE = z.infer<typeof QueryESchema>;

export type EquationAnswer = { kind: 'equation'; text: string; approximate: boolean };
export type QueryAnswer =
  | DistanceAnswer | AngleAnswer | ScalarAnswer | RelPosAnswer | IntersectionAnswer | EquationAnswer;

function asPoints(tokens: string[], et: EntityTable): PointE[] {
  return tokens.map((t) => {
    const e: Entity = resolveEntityE(t, et);
    if (e.kind !== 'point') throw new Error(`"${t}" must be a point`);
    return e;
  });
}

// Entity có bất kỳ hệ số nền nào chỉ là float (exact=null) ⇒ phương trình chỉ gần đúng.
function entityIsApprox(e: Entity): boolean {
  const anyNull = (ss: Scalar[]) => ss.some((s) => s.exact === null);
  if (e.kind === 'plane') return anyNull([e.n.x, e.n.y, e.n.z, e.d]);
  if (e.kind === 'sphere') return anyNull([e.center.x, e.center.y, e.center.z, e.r2]);
  if (e.kind === 'line') return anyNull([e.p.x, e.p.y, e.p.z, e.dir.x, e.dir.y, e.dir.z]);
  return false;
}

// Thể tích một khối (đã kiểm đồng phẳng qua compute) dưới dạng Scalar để tính tỉ số.
function solidVolumeScalar(spec: SolidSpecT, et: EntityTable): Scalar {
  const pts = asPoints(spec.points, et);
  let r;
  if (spec.solid === 'tetrahedron') {
    if (pts.length !== 4) throw new Error('tetrahedron needs exactly 4 points');
    r = computeTetraVolume(pts[0], pts[1], pts[2], pts[3]);
  } else {
    if (!spec.apex) throw new Error('pyramid needs an apex');
    r = computePyramidVolume(pts, asPoints([spec.apex], et)[0]);
  }
  if (!r.ok) throw new Error(r.problem);
  return { approx: r.answer.approx, exact: r.answer.exact };
}

export function computeQuery(query: QueryE, et: EntityTable): ComputeOutcome<QueryAnswer> {
  try {
    switch (query.kind) {
      case 'distance': return computeDistance(resolveEntityE(query.a, et), resolveEntityE(query.b, et));
      case 'angle': return computeAngle(resolveEntityE(query.a, et), resolveEntityE(query.b, et));
      case 'relative_position': return computeRelativePosition(resolveEntityE(query.a, et), resolveEntityE(query.b, et));
      case 'intersection': return computeIntersection(resolveEntityE(query.a, et), resolveEntityE(query.b, et));
      case 'equation': {
        const e = resolveEntityE(query.target, et);
        const text = e.kind === 'plane' ? planeEquationText(e)
          : e.kind === 'sphere' ? sphereEquationText(e)
          : e.kind === 'line' ? lineEquationText(e)
          : null;
        if (text === null) return { ok: false, problem: `no equation for a ${e.kind}` };
        return { ok: true, answer: { kind: 'equation', text, approximate: entityIsApprox(e) } };
      }
      case 'volume': {
        if (query.solid === 'sphere') {
          const e = resolveEntityE(query.target, et);
          if (e.kind !== 'sphere') return { ok: false, problem: 'volume(sphere) needs a sphere' };
          return { ok: true, answer: computeSphereVolume(e) };
        }
        const pts = asPoints(query.points, et);
        if (query.solid === 'tetrahedron') {
          if (pts.length !== 4) return { ok: false, problem: 'tetrahedron needs exactly 4 points' };
          return computeTetraVolume(pts[0], pts[1], pts[2], pts[3]);
        }
        if (!query.apex) return { ok: false, problem: 'pyramid needs an apex' };
        return computePyramidVolume(pts, asPoints([query.apex], et)[0]);
      }
      case 'volume_ratio':
        return volumeRatio(solidVolumeScalar(query.a, et), solidVolumeScalar(query.b, et));
      case 'area': {
        if (query.shape === 'sphere') {
          const e = resolveEntityE(query.target, et);
          if (e.kind !== 'sphere') return { ok: false, problem: 'area(sphere) needs a sphere' };
          return { ok: true, answer: computeSphereArea(e) };
        }
        const pts = asPoints(query.points, et);
        if (query.shape === 'triangle') {
          if (pts.length !== 3) return { ok: false, problem: 'triangle area needs exactly 3 points' };
          return computeTriangleArea(pts[0], pts[1], pts[2]);
        }
        return computePolygonArea(pts);
      }
      case 'sphere_metric': {
        const e = resolveEntityE(query.target, et);
        if (e.kind !== 'sphere') return { ok: false, problem: 'sphere_metric needs a sphere' };
        const R = Math.sqrt(e.r2.approx);
        const val = query.what === 'radius' ? R
          : query.what === 'top_z' ? e.center.z.approx + R
          : e.center.z.approx - R;
        return { ok: true, answer: { kind: 'sphere_metric', exact: null, approx: val, text: val.toFixed(4), approximate: true } };
      }
      case 'point_coord': {
        const e = resolveEntityE(query.target, et);
        if (e.kind !== 'point') return { ok: false, problem: 'point_coord needs a point' };
        const s = query.axis === 'x' ? e.p.x : query.axis === 'y' ? e.p.y : e.p.z;
        return { ok: true, answer: certifyScalar('point_coord', s, s.approx) };
      }
    }
  } catch (e) {
    return { ok: false, problem: (e as Error).message };
  }
}
