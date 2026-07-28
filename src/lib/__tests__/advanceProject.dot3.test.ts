import { describe, it, expect } from 'vitest';
import { projectScene } from '../advanceProject';
import type { AdvanceScene, SectionCut } from '@/types/geometry';

function sceneWithSection(): AdvanceScene {
  const sec: SectionCut = {
    id: 'sec1', targetKind: 'cube',
    polygon: [[0.5, 0, 0], [0, 0.5, 0], [0, 0, 0.5]],
    plane: { point: [0.5, 0, 0], normal: [1, 1, 1] },
    area: { value: 0.2165, latex: 'S=…', verified: true },
  };
  return {
    base: { name: 't', points: [], lines: [], sectionCuts: [sec] },
    steps: [
      { id: 's0', label: 'mp', visibleIds: [] },
      { id: 's1', label: 'thiết diện', visibleIds: ['sec1'], highlightIds: ['sec1'] },
    ],
  };
}

describe('advanceProject — SectionCut (Đợt 3)', () => {
  it('ẩn khi ∉ visibleIds', () => {
    const s = sceneWithSection();
    const g = projectScene(s.base, s.steps, 0);
    expect(g.sectionCuts![0].hidden).toBe(true);
  });
  it('nổi khi mới xuất hiện ở câu hiện tại', () => {
    const s = sceneWithSection();
    const g = projectScene(s.base, s.steps, 1);
    expect(g.sectionCuts![0].hidden).toBe(false);
    expect(g.sectionCuts![0].highlight).toBe(true);
  });
});
