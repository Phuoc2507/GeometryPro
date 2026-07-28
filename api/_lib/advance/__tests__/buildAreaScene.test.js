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
});
