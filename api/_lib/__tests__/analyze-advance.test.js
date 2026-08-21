import { describe, it, expect, vi } from 'vitest';
import { assembleAdvance, looksLikeSection } from '../../analyze-advance.js'; // export named tu route file

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

  it('I1: fallback solveProblem NÉM (translator abstain) → degraded sạch, KHÔNG ném (không 500)', async () => {
    const deps = {
      splitProblem: vi.fn().mockResolvedValue({ type: 'single' }),
      buildAdvanceScene: vi.fn(),
      solveProblem: vi.fn().mockRejectedValue(new Error('translator abstained')),
    };
    const r = await assembleAdvance('...', deps);
    expect(r.mode).toBe('kernel');
    expect(r.degraded).toBe(true);
    expect(r.ok).toBe(false);
    expect(r.abstained).toBe(true);
  });
});

// Đợt 3: thiết diện khối đa diện (section-poly).
describe('assembleAdvance — section-poly (Đợt 3)', () => {
  it('section-poly + scene ok → mode advance', async () => {
    const scene = { base: geo, steps: [{ id: 'sec' }] };
    const deps = {
      splitProblem: vi.fn().mockResolvedValue({
        type: 'single',
        template: 'section-poly',
        templateParams: { kind: 'cube', dims: { a: 1 }, points: [{ vertex: 'A' }] },
      }),
      buildSectionScene: vi.fn().mockReturnValue(scene),
      buildAdvanceScene: vi.fn(),
      solveProblem: vi.fn(),
    };
    const r = await assembleAdvance('...', deps);
    expect(r.mode).toBe('advance');
    expect(r.scene).toBe(scene);
    expect(deps.buildSectionScene).toHaveBeenCalledOnce();
    expect(deps.solveProblem).not.toHaveBeenCalled();
  });

  it('looksLikeSection: đề thiết diện khối = true, diện tích hình phẳng = false', () => {
    expect(looksLikeSection('thiết diện của hình chóp S.ABCD cắt bởi mặt phẳng (MNP)')).toBe(true);
    expect(looksLikeSection('tính diện tích hình phẳng giới hạn bởi y=x')).toBe(false);
  });

  it('looksLikeSection: bắt được "lập phương" (cụm nguyên âm ươ)', () => {
    expect(looksLikeSection('cho hình lập phương ABCD.A\'B\'C\'D\' cạnh a, tính diện tích thiết diện')).toBe(true);
  });

  it('đề rõ thiết diện khối nhưng không dựng được → guard revUnsupported (full refund)', async () => {
    const deps = {
      // classifier KHÔNG ra section-poly → không có builder chạy; guard tất định bắt.
      splitProblem: vi.fn().mockResolvedValue({ type: 'single', setup: 's' }),
      buildSectionScene: vi.fn().mockReturnValue(null),
      buildAdvanceScene: vi.fn(),
      solveProblem: vi.fn(),
    };
    const text = 'Cho hình chóp S.ABCD. Tính diện tích thiết diện cắt bởi mặt phẳng (MNP).';
    const r = await assembleAdvance(text, deps);
    expect(r.mode).toBe('kernel');
    expect(r.degraded).toBe(true);
    expect(r.ok).toBe(false);
    expect(r.revUnsupported).toBe(true);
    expect(deps.solveProblem).not.toHaveBeenCalled();
  });
});

