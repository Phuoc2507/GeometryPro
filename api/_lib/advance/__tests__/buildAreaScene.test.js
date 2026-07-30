import { describe, it, expect } from 'vitest';
import { buildAreaScene } from '../buildAreaScene.js';

describe('buildAreaScene', () => {
  const sc = buildAreaScene({
    outer: { kind: 'poly', coeffs: [0, 1] },
    inner: { kind: 'poly', coeffs: [0, 0, 1] },
    domain: [0, 1],
    fnLabel: 'y=x,\\ y=x^2',
    parts: [{ label: 'Câu 1', hoi: 'Tính diện tích' }],
  });
  it('base gắn 1 AreaRegion, qua gate points>0', () => {
    expect(sc.base.areaRegions).toHaveLength(1);
    expect(sc.base.points.length).toBeGreaterThan(0);
  });
  it('2 bước; đáp án S=1/6 verified; nhãn có "Diện tích"', () => {
    expect(sc.steps).toHaveLength(2);
    expect(sc.steps[1].answer.approx).toBeCloseTo(1 / 6, 4);
    expect(sc.steps[1].answer.verified).toBe(true);
    expect(sc.steps[1].label.toLowerCase()).toContain('diện tích');
  });

  // Vá cận vô tỉ: gợi ý cận thập phân của LLM ⇒ engine snap về giao điểm (1±√5)/2; scene phải ĐỌC LẠI
  // cận đã tinh chỉnh cho anim (tMax) & đáp án đúng S=5√5/6.
  const irr = buildAreaScene({
    outer: { kind: 'poly', coeffs: [1, 1] },      // y=x+1
    inner: { kind: 'poly', coeffs: [0, 0, 1] },   // y=x²
    domain: [-0.62, 1.62],
    parts: [{ label: 'Câu 1', hoi: 'Tính diện tích' }],
  });
  it('cận vô tỉ: region.domain snap về (1±√5)/2, anim.tMax dùng cận tinh chỉnh, S=5√5/6', () => {
    expect(irr.base.areaRegions[0].domain[0]).toBeCloseTo((1 - Math.sqrt(5)) / 2, 6);
    expect(irr.base.areaRegions[0].domain[1]).toBeCloseTo((1 + Math.sqrt(5)) / 2, 6);
    expect(irr.steps[0].anim.tMax).toBeCloseTo((1 + Math.sqrt(5)) / 2, 6);
    expect(irr.steps[1].answer.approx).toBeCloseTo((5 * Math.sqrt(5)) / 6, 4);
    expect(irr.steps[1].answer.verified).toBe(true);
  });
});
