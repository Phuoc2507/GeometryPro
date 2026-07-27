import { describe, it, expect, vi } from 'vitest';
import { assembleAdvance } from '../../../analyze-advance.js';

describe('assembleAdvance · nhánh template rev-ox', () => {
  it('split có template ⇒ gọi buildRevolutionScene, trả mode advance', async () => {
    const fakeScene = { base: { points: [{ id: 'x' }] }, steps: [{ id: 's0', label: 'a', visibleIds: ['x'] }] };
    const deps = {
      splitProblem: vi.fn().mockResolvedValue({
        type: 'multi_question',
        template: 'rev-ox',
        templateParams: { outer: { kind: 'sqrt', a: 1, b: 0 }, domain: [0, 4], parts: [] },
        setup: '', parts: [],
      }),
      buildRevolutionScene: vi.fn().mockReturnValue(fakeScene),
      buildAdvanceScene: vi.fn(),
      solveProblem: vi.fn(),
    };
    const out = await assembleAdvance('đề', deps, {});
    expect(deps.buildRevolutionScene).toHaveBeenCalledOnce();
    expect(deps.buildAdvanceScene).not.toHaveBeenCalled();
    expect(out).toEqual({ mode: 'advance', scene: fakeScene });
  });

  it('không có template ⇒ giữ nhánh multi_question cũ', async () => {
    const deps = {
      splitProblem: vi.fn().mockResolvedValue({ type: 'multi_question', setup: '', parts: [] }),
      buildRevolutionScene: vi.fn(),
      buildAdvanceScene: vi.fn().mockResolvedValue({ base: {}, steps: [] }),
      solveProblem: vi.fn(),
    };
    const out = await assembleAdvance('đề', deps, {});
    expect(deps.buildRevolutionScene).not.toHaveBeenCalled();
    expect(deps.buildAdvanceScene).toHaveBeenCalledOnce();
    expect(out.mode).toBe('advance');
  });
});
