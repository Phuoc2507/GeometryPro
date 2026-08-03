// api/_lib/kernel/compute/__tests__/query.test.ts
import { describe, it, expect } from 'vitest';
import { QueryESchema, computeQuery } from '../query';
import { createEmptyEntityTable } from '../../entityTable';
import { pointFromCoords, planeFromCoeffs } from '../../entities';
import { ratVec } from '../../vec3s';
import { rat, makeExact } from '../../scalar';

function scene() {
  const et = createEmptyEntityTable();
  et.points.set('A', pointFromCoords(ratVec(0n, 0n, 0n)));
  et.points.set('B', pointFromCoords(ratVec(2n, 1n, 2n)));
  et.points.set('S', pointFromCoords(ratVec(0n, 0n, 3n)));
  et.planes.set('P', planeFromCoeffs(rat(0n), rat(0n), rat(1n), rat(0n))); // z=0
  return et;
}

describe('QueryESchema', () => {
  it('nhận query hợp lệ, từ chối kind lạ', () => {
    expect(QueryESchema.safeParse({ kind: 'distance', a: 'A', b: 'B' }).success).toBe(true);
    expect(QueryESchema.safeParse({ kind: 'nope', a: 'A', b: 'B' }).success).toBe(false);
  });
});

describe('computeQuery', () => {
  it('distance điểm-điểm = 3', () => {
    const r = computeQuery({ kind: 'distance', a: 'A', b: 'B' }, scene());
    expect(r.ok).toBe(true);
    if (r.ok && r.answer.kind === 'distance') expect(r.answer.exact).toEqual(makeExact(3n, 1n, 1));
  });
  it('distance điểm-mặt (S tới z=0) = 3', () => {
    const r = computeQuery({ kind: 'distance', a: 'S', b: 'P' }, scene());
    expect(r.ok && r.answer.kind === 'distance' && r.answer.approx).toBeCloseTo(3, 9);
  });
  it('equation của mặt P', () => {
    const r = computeQuery({ kind: 'equation', target: 'P' }, scene());
    expect(r.ok && r.answer.kind === 'equation' && r.answer.text).toBe('z = 0');
  });
  it('volume tứ diện = 1/6', () => {
    const et = scene();
    et.points.set('X', pointFromCoords(ratVec(1n, 0n, 0n)));
    et.points.set('Y', pointFromCoords(ratVec(0n, 1n, 0n)));
    et.points.set('Z', pointFromCoords(ratVec(0n, 0n, 1n)));
    const r = computeQuery({ kind: 'volume', solid: 'tetrahedron', points: ['A', 'X', 'Y', 'Z'] }, et);
    expect(r.ok && r.answer.kind === 'volume' && r.answer.exact).toEqual(makeExact(1n, 6n, 1));
  });
  it('volume lăng trụ (hộp 2×3×4) = 24, qua schema + route', () => {
    const et = createEmptyEntityTable();
    const box: [string, bigint, bigint, bigint][] = [
      ['A', 0n, 0n, 0n], ['B', 2n, 0n, 0n], ['C', 2n, 3n, 0n], ['D', 0n, 3n, 0n],
      ['A1', 0n, 0n, 4n], ['B1', 2n, 0n, 4n], ['C1', 2n, 3n, 4n], ['D1', 0n, 3n, 4n],
    ];
    for (const [n, x, y, z] of box) et.points.set(n, pointFromCoords(ratVec(x, y, z)));
    const q = { kind: 'volume', solid: 'prism', base: ['A', 'B', 'C', 'D'], top: ['A1', 'B1', 'C1', 'D1'] };
    expect(QueryESchema.safeParse(q).success).toBe(true);
    const r = computeQuery(QueryESchema.parse(q), et);
    expect(r.ok && r.answer.kind === 'volume' && r.answer.exact).toEqual(makeExact(24n, 1n, 1));
  });
  it('token không giải được → {ok:false}, không ném', () => {
    const r = computeQuery({ kind: 'distance', a: 'A', b: 'NOPE' }, scene());
    expect(r.ok).toBe(false);
  });
});
