// api/_lib/kernel/__tests__/g2-5-sphere.test.ts
import { describe, it, expect } from 'vitest';
import { sphereFromFourPoints } from '../entities';
import { ratVec, toApproxVec } from '../vec3s';
import { makeExact } from '../scalar';
import { executeOxyzPlan } from '../dialects/oxyz';

describe('sphereFromFourPoints', () => {
  it('cầu qua (0,0,0),(2,0,0),(0,2,0),(0,0,2) → tâm (1,1,1), R²=3', () => {
    const s = sphereFromFourPoints(ratVec(0n, 0n, 0n), ratVec(2n, 0n, 0n), ratVec(0n, 2n, 0n), ratVec(0n, 0n, 2n));
    expect(toApproxVec(s.center)).toEqual({ x: 1, y: 1, z: 1 });
    expect(s.r2.exact).toEqual(makeExact(3n, 1n, 1));
  });
  it('4 điểm đồng phẳng → ném', () => {
    expect(() => sphereFromFourPoints(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n), ratVec(0n, 1n, 0n), ratVec(1n, 1n, 0n))).toThrow();
  });
});

describe('Oxyz sphere form four_points', () => {
  it('dựng cầu ngoại tiếp từ 4 điểm', () => {
    const et = executeOxyzPlan([
      { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
      { op: 'oxyz_point', name: 'B', at: [2, 0, 0] },
      { op: 'oxyz_point', name: 'C', at: [0, 2, 0] },
      { op: 'oxyz_point', name: 'D', at: [0, 0, 2] },
      { op: 'oxyz_sphere', name: 'S', by: { form: 'four_points', a: 'A', b: 'B', c: 'C', d: 'D' } },
    ]);
    const S = et.spheres.get('S')!;
    expect(toApproxVec(S.center)).toEqual({ x: 1, y: 1, z: 1 });
    expect(S.r2.exact).toEqual(makeExact(3n, 1n, 1));
  });
});

import { run } from '../run';

describe('diện tích mặt cầu / thể tích khối cầu qua run()', () => {
  const ops = [
    { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
    { op: 'oxyz_sphere', name: 'S', by: { form: 'center_radius', center: 'A', radius: 2 } }, // R=2, R²=4
  ];
  it('diện tích 4πR² = 16π (DẠNG π chính xác)', () => {
    const res = run({ solidName: 't', ops, queries: [{ kind: 'area', shape: 'sphere', target: 'S' }] });
    const a = res.answers.find((x) => x.kind === 'area');
    expect(a).toBeDefined();
    if (a && a.kind === 'area') {
      expect(a.approx).toBeCloseTo(16 * Math.PI, 6);
      expect(a.text).toBe('16π');
      expect(a.approximate).toBe(false);
    }
  });
  it('thể tích (4/3)πR³ = 32π/3 (DẠNG π chính xác)', () => {
    const res = run({ solidName: 't', ops, queries: [{ kind: 'volume', solid: 'sphere', target: 'S' }] });
    const v = res.answers.find((x) => x.kind === 'volume');
    expect(v).toBeDefined();
    if (v && v.kind === 'volume') {
      expect(v.approx).toBeCloseTo((32 / 3) * Math.PI, 6);
      expect(v.text).toBe('32π/3');
      expect(v.approximate).toBe(false);
    }
  });
  it('bán kính = 2 và đường kính = 4 (căn chính xác)', () => {
    const res = run({ solidName: 't', ops, queries: [
      { kind: 'sphere_metric', target: 'S', what: 'radius' },
      { kind: 'sphere_metric', target: 'S', what: 'diameter' },
    ] });
    expect(res.answers[0]?.text).toBe('2');
    expect(res.answers[1]?.text).toBe('4');
  });
  it('R²=2 ⇒ diện tích 8π, thể tích 8√2π/3, bán kính √2', () => {
    const ops2 = [
      { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
      { op: 'oxyz_sphere', name: 'S', by: { form: 'center_radius', center: 'A', radius: 'sqrt(2)' } },
    ];
    const res = run({ solidName: 't', ops: ops2, queries: [
      { kind: 'area', shape: 'sphere', target: 'S' },
      { kind: 'volume', solid: 'sphere', target: 'S' },
      { kind: 'sphere_metric', target: 'S', what: 'radius' },
    ] });
    expect(res.answers.find((x) => x.kind === 'area')?.text).toBe('8π');
    expect(res.answers.find((x) => x.kind === 'volume')?.text).toBe('8√2π/3');
    expect(res.answers.find((x) => x.kind === 'sphere_metric')?.text).toBe('√2');
  });
});
