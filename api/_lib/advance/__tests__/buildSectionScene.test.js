import { describe, it, expect } from 'vitest';
import { buildSectionScene } from '../buildSectionScene.js';

const cubeMidParams = {
  kind: 'cube', dims: { a: 1 },
  points: [{ onEdge: ['A', 'B'], t: 0.5 }, { onEdge: ['A', 'D'], t: 0.5 }, { onEdge: ['A', "A'"], t: 0.5 }],
};

describe('buildSectionScene', () => {
  it('dựng base có đỉnh khối + cạnh + 3 điểm + sectionCuts', () => {
    const scene = buildSectionScene(cubeMidParams);
    expect(scene).not.toBeNull();
    expect(scene.base.sectionCuts).toHaveLength(1);
    expect(scene.base.points.length).toBeGreaterThanOrEqual(8 + 3); // 8 đỉnh + 3 điểm mp
    expect(scene.base.lines.length).toBe(12);                        // 12 cạnh lập phương
    expect(scene.base.sectionCuts[0].area.verified).toBe(true);
  });
  it('2 bước: dựng mp (highlight 3 điểm) → thiết diện (anim reveal + answer)', () => {
    const { steps } = buildSectionScene(cubeMidParams);
    expect(steps).toHaveLength(2);
    expect(steps[1].visibleIds).toContain('sec1');
    expect(steps[1].anim.param).toBe('reveal');
    expect(steps[1].answer.verified).toBe(true);
  });
  it('kind lạ ⇒ null', () => {
    expect(buildSectionScene({ kind: 'sphere', dims: {}, points: cubeMidParams.points })).toBeNull();
  });
  it('3 điểm suy biến (thẳng hàng) ⇒ null', () => {
    expect(buildSectionScene({ kind: 'cube', dims: { a: 1 },
      points: [{ vertex: 'A' }, { onEdge: ['A', 'B'], t: 0.5 }, { vertex: 'B' }] })).toBeNull();
  });
});
