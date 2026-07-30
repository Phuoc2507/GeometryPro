import { describe, it, expect } from 'vitest';
import { expandExprCurve, expandExprArea, expandExprSolid, expandExprGeometry } from '../exprExpand.js';

describe('expandExprCurve', () => {
  it('exp(x/2)*sqrt(x) trên [1,2] → ≥2 mẫu hữu hạn, x tăng dần', () => {
    const c = expandExprCurve({ id: 'c1', type: 'expr', expr: 'exp(x/2)*sqrt(x)', params: { xMin: 1, xMax: 2 }, plane: 'xy' });
    expect(c.samples.length).toBeGreaterThanOrEqual(2);
    expect(c.samples.every((s) => Number.isFinite(s.x) && Number.isFinite(s.y))).toBe(true);
    expect(c.samples[0].x).toBeCloseTo(1, 9);
    expect(c.samples[c.samples.length - 1].x).toBeCloseTo(2, 9);
    // exp(1/2)*sqrt(1) = e^0.5 ≈ 1.6487
    expect(c.samples[0].y).toBeCloseTo(Math.exp(0.5), 6);
  });
  it('loại điểm non-finite (ln(x) qua x≤0 trên [-1,1])', () => {
    const c = expandExprCurve({ id: 'c2', type: 'expr', expr: 'ln(x)', params: { xMin: -1, xMax: 1 } });
    expect(c.samples.every((s) => Number.isFinite(s.y))).toBe(true);
  });
  it('curve analytic (parabola) không bị đụng', () => {
    const p = { id: 'c3', type: 'parabola', params: { a: 1, b: 0, c: 0, xMin: -1, xMax: 1 } };
    expect(expandExprCurve(p)).toBe(p);
  });
  it('idempotent: đã có samples thì trả nguyên', () => {
    const c = { id: 'c4', type: 'expr', expr: 'x', params: { xMin: 0, xMax: 1 }, samples: [{ x: 0, y: 0 }, { x: 1, y: 1 }] };
    expect(expandExprCurve(c)).toBe(c);
  });
  it('expr rác → null (fail-safe, không ném)', () => {
    expect(expandExprCurve({ id: 'c5', type: 'expr', expr: '@@@', params: { xMin: 0, xMax: 1 } })).toBeNull();
  });
});

describe('expandExprArea', () => {
  it('miền giữa x^2 (dưới) và x (trên) trên [0,1] → top≥bot', () => {
    const a = expandExprArea({ id: 'a1', outer: { kind: 'expr', expr: 'x' }, inner: { kind: 'expr', expr: 'x^2' }, domain: [0, 1] });
    expect(a.samples.length).toBeGreaterThanOrEqual(2);
    expect(a.samples.every((s) => s.top >= s.bot)).toBe(true);
  });
});

describe('expandExprSolid', () => {
  it('quay expr → có samples + translucent, KHÔNG có volume', () => {
    const s = expandExprSolid({ id: 's1', outer: { kind: 'expr', expr: 'exp(x/2)*sqrt(x)' }, domain: [1, 2], axis: 'Ox', method: 'disk' });
    expect(s.samples.length).toBeGreaterThanOrEqual(2);
    expect(s.translucent).toBe(true);
    expect(s.volume).toBeUndefined();
  });
  it('washer: có inner → innerSamples', () => {
    const s = expandExprSolid({ id: 's2', outer: { kind: 'poly', coeffs: [0, 0, 1] }, inner: { kind: 'const', c: 0 }, domain: [0, 2], axis: 'Ox', method: 'washer' });
    expect(Array.isArray(s.innerSamples)).toBe(true);
  });
});

describe('expandExprGeometry', () => {
  it('map cả curves/areaRegions/revolutionSolids, bỏ null', () => {
    const g = expandExprGeometry({
      name: 'x',
      points: [],
      curves: [{ id: 'c', type: 'expr', expr: 'x', params: { xMin: 0, xMax: 1 } }, { id: 'bad', type: 'expr', expr: '@', params: { xMin: 0, xMax: 1 } }],
      revolutionSolids: [{ id: 's', outer: { kind: 'expr', expr: 'x' }, domain: [0, 1], axis: 'Ox', method: 'disk' }],
    });
    expect(g.curves).toHaveLength(1);          // 'bad' bị drop
    expect(g.curves[0].samples.length).toBeGreaterThanOrEqual(2);
    expect(g.revolutionSolids[0].translucent).toBe(true);
  });
  it('geometry không có gì để nở → trả về nguyên trạng an toàn', () => {
    const g = { name: 'x', points: [{ id: 'A', label: 'A', x: 0, y: 0, z: 0 }], lines: [] };
    expect(expandExprGeometry(g).points).toHaveLength(1);
  });
});
