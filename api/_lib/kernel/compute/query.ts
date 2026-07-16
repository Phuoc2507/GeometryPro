// api/_lib/kernel/compute/query.ts
import { z } from 'zod';
import type { EntityTable } from '../entityTable';
import type { Entity, PointE } from '../entities';
import { resolveEntityE } from '../resolveE';
import { type ComputeOutcome, type DistanceAnswer, type AngleAnswer, type ScalarAnswer } from './answer';
import { computeDistance } from './distance';
import { computeAngle } from './angle';
import { computeTetraVolume, computePyramidVolume } from './volume';
import { computeTriangleArea, computePolygonArea } from './area';
import { computeRelativePosition, type RelPosAnswer } from './relative';
import { computeIntersection, type IntersectionAnswer } from './intersect';
import { planeEquationText, sphereEquationText, lineEquationText } from './equation';

const Tok = z.string().min(1);

export const QueryESchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('distance'), a: Tok, b: Tok }),
  z.object({ kind: z.literal('angle'), a: Tok, b: Tok }),
  z.object({ kind: z.literal('relative_position'), a: Tok, b: Tok }),
  z.object({ kind: z.literal('intersection'), a: Tok, b: Tok }),
  z.object({ kind: z.literal('equation'), target: Tok }),
  z.object({ kind: z.literal('volume'), solid: z.enum(['tetrahedron', 'pyramid']), points: z.array(Tok).min(3), apex: Tok.optional() }),
  z.object({ kind: z.literal('area'), shape: z.enum(['triangle', 'polygon']), points: z.array(Tok).min(3) }),
]);

export type QueryE = z.infer<typeof QueryESchema>;

export type EquationAnswer = { kind: 'equation'; text: string };
export type QueryAnswer =
  | DistanceAnswer | AngleAnswer | ScalarAnswer | RelPosAnswer | IntersectionAnswer | EquationAnswer;

function asPoints(tokens: string[], et: EntityTable): PointE[] {
  return tokens.map((t) => {
    const e: Entity = resolveEntityE(t, et);
    if (e.kind !== 'point') throw new Error(`"${t}" must be a point`);
    return e;
  });
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
        return { ok: true, answer: { kind: 'equation', text } };
      }
      case 'volume': {
        const pts = asPoints(query.points, et);
        if (query.solid === 'tetrahedron') {
          if (pts.length !== 4) return { ok: false, problem: 'tetrahedron needs exactly 4 points' };
          return computeTetraVolume(pts[0], pts[1], pts[2], pts[3]);
        }
        if (!query.apex) return { ok: false, problem: 'pyramid needs an apex' };
        return computePyramidVolume(pts, asPoints([query.apex], et)[0]);
      }
      case 'area': {
        const pts = asPoints(query.points, et);
        return query.shape === 'triangle' && pts.length === 3
          ? computeTriangleArea(pts[0], pts[1], pts[2])
          : computePolygonArea(pts);
      }
    }
  } catch (e) {
    return { ok: false, problem: (e as Error).message };
  }
}
