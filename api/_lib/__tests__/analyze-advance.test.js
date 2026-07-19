import { describe, it, expect, vi } from 'vitest';
import { assembleAdvance } from '../../analyze-advance.js'; // export named tu route file
import { CREDIT_COST } from '../entitlements.js';

const geo = { name: 'g', points: [{ id: 'A' }, { id: 'B' }], lines: [], timeline: { duration: 5, tracks: [{}] } };

describe('assembleAdvance — 3 nhánh (không cần mạng)', () => {
  it('multi_question + scene ok → mode advance', async () => {
    const deps = {
      splitProblem: vi.fn().mockResolvedValue({ type: 'multi_question', setup: 's', parts: [{}, {}] }),
      buildAdvanceScene: vi.fn().mockResolvedValue({ base: geo, steps: [{ id: 'a' }, { id: 'b' }] }),
      solveProblem: vi.fn(),
    };
    const r = await assembleAdvance('...', deps);
    expect(r.mode).toBe('advance');
    expect(r.scene.steps).toHaveLength(2);
    expect(r.degraded).toBeFalsy();
    expect(deps.solveProblem).not.toHaveBeenCalled();
  });

  it('continuous_animation → scene 1 step co timeline', async () => {
    const deps = {
      splitProblem: vi.fn().mockResolvedValue({ type: 'continuous_animation' }),
      buildAdvanceScene: vi.fn(),
      solveProblem: vi.fn().mockResolvedValue({ ok: true, geometry: geo, answers: [] }),
    };
    const r = await assembleAdvance('...', deps);
    expect(r.mode).toBe('advance');
    expect(r.scene.steps).toHaveLength(1);
    expect(r.scene.steps[0].timeline).toBeDefined();
    expect(r.scene.steps[0].visibleIds).toEqual(['A', 'B']);
    expect(r.degraded).toBeFalsy();
  });

  it('single → fallback kernel + degraded=true', async () => {
    const deps = {
      splitProblem: vi.fn().mockResolvedValue({ type: 'single' }),
      buildAdvanceScene: vi.fn(),
      solveProblem: vi.fn().mockResolvedValue({ ok: true, geometry: geo, answers: [] }),
    };
    const r = await assembleAdvance('...', deps);
    expect(r.mode).toBe('kernel');
    expect(r.degraded).toBe(true);
    expect(r.geometry).toBe(geo);
    expect(deps.buildAdvanceScene).not.toHaveBeenCalled();
  });

  it('multi_question nhung build fail (null) → fallback degraded', async () => {
    const deps = {
      splitProblem: vi.fn().mockResolvedValue({ type: 'multi_question', setup: 's', parts: [{}, {}] }),
      buildAdvanceScene: vi.fn().mockResolvedValue(null),
      solveProblem: vi.fn().mockResolvedValue({ ok: true, geometry: geo, answers: [] }),
    };
    const r = await assembleAdvance('...', deps);
    expect(r.mode).toBe('kernel');
    expect(r.degraded).toBe(true);
    expect(deps.buildAdvanceScene).toHaveBeenCalledOnce();
    expect(deps.solveProblem).toHaveBeenCalledOnce();
  });

  it('continuous_animation nhung engine fail → fallback degraded', async () => {
    const deps = {
      splitProblem: vi.fn().mockResolvedValue({ type: 'continuous_animation' }),
      buildAdvanceScene: vi.fn(),
      solveProblem: vi.fn().mockResolvedValue({ ok: false }),
    };
    const r = await assembleAdvance('...', deps);
    expect(r.mode).toBe('kernel');
    expect(r.degraded).toBe(true);
  });
});

// Step 1: phí credit cho Advance. CREDIT_COST khai ở entitlements.js (credits.js dùng lại
// qua creditCostFor), nên test khẳng định trực tiếp trên nguồn khai báo đó.
describe('credit draw_advance', () => {
  it('draw_advance cao hơn draw_detailed', () => {
    expect(CREDIT_COST.draw_advance).toBeGreaterThan(CREDIT_COST.draw_detailed ?? 2);
  });
  it('draw_advance = 3', () => {
    expect(CREDIT_COST.draw_advance).toBe(3);
  });
});
