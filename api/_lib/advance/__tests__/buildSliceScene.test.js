import { describe, it, expect } from 'vitest';
import { buildSliceScene } from '../buildSliceScene.js';

describe('buildSliceScene', () => {
  const sc = buildSliceScene({
    section: 'square',
    outer: { kind: 'sqrt', a: 1, b: 0 },
    domain: [0, 4],
    fnLabel: 'y=\\sqrt{x}',
    parts: [{ label: 'Câu 1', hoi: 'Tính thể tích' }],
  });

  it('base gắn đúng 1 SliceStack, qua gate points>0', () => {
    expect(sc.base.sliceStacks).toHaveLength(1);
    expect(sc.base.points.length).toBeGreaterThan(0);
  });
  it('2 bước; Câu a anim sweep autoplay; Câu b đáp án V=8 verified', () => {
    expect(sc.steps).toHaveLength(2);
    expect(sc.steps[0].anim).toMatchObject({ param: 'sweep', autoplay: true });
    expect(sc.steps[1].answer.verified).toBe(true);
    expect(sc.steps[1].answer.approx).toBeCloseTo(8, 4);
  });
  it('bước không mang solution dạng chuỗi', () => {
    for (const s of sc.steps) expect(typeof s.solution).not.toBe('string');
  });
  it('nửa tròn ⇒ V=π', () => {
    const s = buildSliceScene({ section: 'semicircle', outer: { kind: 'sqrt', a: 1, b: 0 }, domain: [0, 4] });
    expect(s.steps[1].answer.approx).toBeCloseTo(Math.PI, 4);
  });
});
