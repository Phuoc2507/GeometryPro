import { describe, it, expect } from 'vitest';
import { projectScene } from '../advanceProject';
import type { GeometryData, AdvanceStep } from '@/types/geometry';

const base = {
  name: 't', points: [], lines: [],
  sliceStacks: [{ id: 'sl1', axis: 'Ox', domain: [0, 4], outer: { kind: 'sqrt', a: 1, b: 0 }, section: 'square' }],
  areaRegions: [{ id: 'ar1', outer: { kind: 'poly', coeffs: [0, 1] }, inner: { kind: 'poly', coeffs: [0, 0, 1] }, domain: [0, 1] }],
} as unknown as GeometryData;

const steps: AdvanceStep[] = [
  { id: 's0', label: 'a', visibleIds: ['sl1'] },
  { id: 's1', label: 'b', visibleIds: ['sl1', 'ar1'] },
];

describe('projectScene — Đợt 2 element', () => {
  it('câu 0: sl1 hiện (highlight), ar1 ẩn', () => {
    const g = projectScene(base, steps, 0);
    expect(g.sliceStacks![0]).toMatchObject({ hidden: false, highlight: true });
    expect(g.areaRegions![0]).toMatchObject({ hidden: true });
  });
  it('câu 1: ar1 mới hiện (highlight), sl1 dim', () => {
    const g = projectScene(base, steps, 1);
    expect(g.areaRegions![0]).toMatchObject({ hidden: false, highlight: true });
    expect(g.sliceStacks![0]).toMatchObject({ hidden: false, dim: true });
  });
});
