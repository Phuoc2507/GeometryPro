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
  it('CHỐT AN TOÀN: volume LLM nhét vào bị XOÁ (nở mới)', () => {
    const s = expandExprSolid({ id: 's3', outer: { kind: 'expr', expr: 'x' }, domain: [0, 2], axis: 'Ox', method: 'disk', volume: { value: 8.377, verified: true } });
    expect(s.samples.length).toBeGreaterThanOrEqual(2);
    expect(s.volume).toBeUndefined();
  });
  it('CHỐT AN TOÀN: volume bị XOÁ cả ở nhánh idempotent (đã translucent)', () => {
    const pre = { id: 's4', outer: { kind: 'expr', expr: 'x' }, domain: [0, 2], axis: 'Ox', method: 'disk', translucent: true, samples: [{ x: 0, r: 0 }, { x: 2, r: 2 }], volume: { value: 8.377, verified: true } };
    expect(expandExprSolid(pre).volume).toBeUndefined();
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

describe('expandExprGeometry · dọn điểm/đường lệch mặt phẳng (hình đồ-thị-phẳng)', () => {
  it('hình có khối tròn xoay: bỏ point off-trục (y≠0) + line trỏ tới nó; giữ thứ TRÊN trục', () => {
    const g = expandExprGeometry({
      name: 'Vật thể tròn xoay quanh Ox',
      points: [
        { id: 'O', label: 'O', x: 0, y: 0, z: 0 },
        { id: 'A', label: '1', x: 1, y: 0, z: 0 },
        { id: 'E', label: 'x', x: 3.5, y: 0, z: 0 },
        { id: 'C', label: 'C', x: 1, y: 1.6487, z: 0 }, // đỉnh đường cong: chiều cao nhét vào math-Y ⇒ lệch mặt phẳng
        { id: 'D', label: 'D', x: 2, y: 3.8442, z: 0 },
      ],
      lines: [
        { id: 'l_axis', from: 'O', to: 'E' },
        { id: 'l_left', from: 'A', to: 'C' },
        { id: 'l_right', from: 'B', to: 'D' },
      ],
      revolutionSolids: [{ id: 's', outer: { kind: 'expr', expr: 'exp(x/2)*sqrt(x)' }, domain: [1, 2], axis: 'Ox', method: 'disk' }],
    });
    expect(g.points.map((p) => p.id).sort()).toEqual(['A', 'E', 'O']); // C, D bị bỏ
    expect(g.lines.map((l) => l.id)).toEqual(['l_axis']);              // l_left(→C), l_right(→D) bị bỏ
  });

  it('KHÔNG đụng hình 3D thường (không có đường expr/miền tô/khối): điểm off-trục GIỮ nguyên', () => {
    const g = expandExprGeometry({
      name: 'Hình chóp S.ABC',
      points: [{ id: 'S', label: 'S', x: 1, y: 2, z: 3 }, { id: 'A', label: 'A', x: 0, y: 0, z: 0 }],
      lines: [{ id: 'SA', from: 'S', to: 'A' }],
    });
    expect(g.points).toHaveLength(2); // không có mảng phẳng ⇒ không trigger ⇒ giữ S(1,2,3)
    expect(g.lines).toHaveLength(1);
  });

  it('đường expr cũng trigger dọn (không chỉ khối tròn xoay)', () => {
    const g = expandExprGeometry({
      name: 'Đồ thị',
      points: [{ id: 'V', label: 'V', x: 0, y: 5, z: 0 }, { id: 'O', label: 'O', x: 0, y: 0, z: 0 }],
      lines: [],
      curves: [{ id: 'c', type: 'expr', expr: 'x^2', params: { xMin: -2, xMax: 2 }, plane: 'xy' }],
    });
    expect(g.points.map((p) => p.id)).toEqual(['O']); // V(0,5,0) off-trục bị bỏ
  });
});
