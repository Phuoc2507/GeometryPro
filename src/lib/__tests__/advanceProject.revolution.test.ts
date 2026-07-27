import { describe, it, expect } from 'vitest';
import { projectScene } from '../advanceProject';
import type { GeometryData, AdvanceStep } from '@/types/geometry';

const base: GeometryData = {
  name: 't',
  points: [{ id: 'A', label: 'A', x: 0, y: 0, z: 0 }],
  lines: [],
  planes: [],
  revolutionSolids: [
    { id: 'rev1', outer: { kind: 'sqrt', a: 1, b: 0 }, axis: 'Ox', domain: [0, 4], method: 'disk' },
  ],
};
const steps: AdvanceStep[] = [
  { id: 's0', label: 'Câu a', visibleIds: ['A'] },
  { id: 's1', label: 'Câu b', visibleIds: ['A', 'rev1'] },
];

describe('projectScene · revolutionSolids', () => {
  it('ẩn khi id chưa thuộc bước', () => {
    const g = projectScene(base, steps, 0);
    expect(g.revolutionSolids?.[0].hidden).toBe(true);
  });
  it('highlight khi id vừa xuất hiện ở bước hiện tại', () => {
    const g = projectScene(base, steps, 1);
    expect(g.revolutionSolids?.[0].hidden).toBe(false);
    expect(g.revolutionSolids?.[0].highlight).toBe(true);
  });
});
