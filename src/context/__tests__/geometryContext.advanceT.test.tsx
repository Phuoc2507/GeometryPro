import { describe, it, expect } from 'vitest';
import { rawGeometryReducer, initialGeometryState } from '../GeometryContext';
import type { AdvanceScene } from '@/types/geometry';

describe('advanceT trong reducer', () => {
  it('khởi tạo = 0', () => {
    expect(initialGeometryState.advanceT).toBe(0);
  });

  it('ADVANCE_SET_T đặt & kẹp [0,1]', () => {
    const s1 = rawGeometryReducer(initialGeometryState, { type: 'ADVANCE_SET_T', payload: 0.5 });
    expect(s1.advanceT).toBe(0.5);
    const s2 = rawGeometryReducer(initialGeometryState, { type: 'ADVANCE_SET_T', payload: 9 });
    expect(s2.advanceT).toBe(1);
    const s3 = rawGeometryReducer(initialGeometryState, { type: 'ADVANCE_SET_T', payload: -9 });
    expect(s3.advanceT).toBe(0);
  });

  it('đổi bước reset advanceT=0', () => {
    const scene = {
      base: { name: 'x', points: [], lines: [] },
      steps: [
        { id: 'a', label: '', visibleIds: [] },
        { id: 'b', label: '', visibleIds: [] },
      ],
    } as unknown as AdvanceScene;
    const primed = { ...initialGeometryState, advanceT: 0.7, advanceScene: scene };
    const out = rawGeometryReducer(primed, { type: 'SET_STEP', index: 1 });
    expect(out.advanceT).toBe(0);
  });

  it('nạp scene mới reset advanceT=0', () => {
    const scene = {
      base: { name: 'x', points: [], lines: [] },
      steps: [{ id: 'a', label: '', visibleIds: [] }],
    } as unknown as AdvanceScene;
    const primed = { ...initialGeometryState, advanceT: 0.9 };
    const out = rawGeometryReducer(primed, { type: 'SET_ADVANCE_SCENE', scene });
    expect(out.advanceT).toBe(0);
  });
});
