import { describe, it, expect } from 'vitest';
import { buildRevolutionScene } from '../buildRevolutionScene.js';

const params = {
  outer: { kind: 'sqrt', a: 1, b: 0 },
  domain: [0, 4],
  fnLabel: 'y=\\sqrt{x}',
  parts: [
    { label: 'Câu a', hoi: 'Vẽ khối tròn xoay quanh Ox' },
    { label: 'Câu b', hoi: 'Tính thể tích' },
  ],
};

describe('buildRevolutionScene', () => {
  const scene = buildRevolutionScene(params);

  it('base có điểm mẫu (qua gate points>0)', () => {
    expect(scene.base.points.length).toBeGreaterThan(0);
  });
  it('base gắn đúng 1 khối tròn xoay', () => {
    expect(scene.base.revolutionSolids).toHaveLength(1);
    expect(scene.base.revolutionSolids[0].axis).toBe('Ox');
  });
  it('2 bước, cumulative visibleIds gồm id khối từ Câu a', () => {
    expect(scene.steps).toHaveLength(2);
    const revId = scene.base.revolutionSolids[0].id;
    expect(scene.steps[0].visibleIds).toContain(revId);
    expect(scene.steps[1].visibleIds).toContain(revId);
  });
  it('Câu a có anim sweep autoplay; Câu b có đáp án thể tích verified', () => {
    expect(scene.steps[0].anim).toMatchObject({ param: 'sweep', autoplay: true });
    expect(scene.steps[1].answer.verified).toBe(true);
    expect(scene.steps[1].answer.approx).toBeCloseTo(8 * Math.PI, 4);
  });
  it('bước KHÔNG mang solution dạng chuỗi (solution phải là SolveResult hoặc vắng)', () => {
    // Regression: solution:string làm AdvanceSolutionPanel hydrate rồi SolveResultView crash.
    for (const s of scene.steps) {
      expect(typeof s.solution).not.toBe('string');
    }
  });
});
