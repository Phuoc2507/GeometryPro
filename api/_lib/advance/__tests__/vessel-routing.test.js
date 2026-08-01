import { describe, it, expect, vi } from 'vitest';
import { assembleAdvance, looksLikeVessel } from '../../../analyze-advance.js';

describe('looksLikeVessel — nhận diện vật thật tròn xoay', () => {
  it('bắt bình/lu/chậu có ngữ cảnh tròn xoay / thiết diện qua trục', () => {
    expect(looksLikeVessel('Một chiếc bình, thiết diện qua trục như hình vẽ...')).toBe(true);
    expect(looksLikeVessel('Cái lu tròn xoay đựng nước, tính thể tích')).toBe(true);
    expect(looksLikeVessel('Cái chậu, dung tích bao nhiêu lít?')).toBe(true);
  });
  it('KHÔNG bắt nhầm đề không phải vật thật', () => {
    expect(looksLikeVessel('Cho hình chóp S.ABCD đáy hình vuông')).toBe(false);
    expect(looksLikeVessel('Bình thường học sinh hay nhầm chỗ này')).toBe(false); // 'bình' nhưng không có ngữ cảnh
  });
});

describe('assembleAdvance — nhánh rev-vessel', () => {
  it('template rev-vessel + params → gọi buildVesselScene → mode advance', async () => {
    const templateParams = { segments: [{ type: 'cylinder', x0: 0, x1: 10, r: 4 }] };
    const splitProblem = vi.fn().mockResolvedValue({ type: 'single', setup: 'Bình...', template: 'rev-vessel', templateParams });
    const buildVesselScene = vi.fn().mockReturnValue({ base: { points: [{ id: 'r0' }] }, steps: [{ id: 's0' }, { id: 's1' }] });
    const solveProblem = vi.fn();

    const result = await assembleAdvance('Bình... tròn xoay', { splitProblem, buildVesselScene, solveProblem }, {});
    expect(buildVesselScene).toHaveBeenCalledWith(templateParams);
    expect(result.mode).toBe('advance');
  });

  it('không dựng được (buildVesselScene=null) + đề là vật thật → guard báo revUnsupported (hoàn credit)', async () => {
    const splitProblem = vi.fn().mockResolvedValue({ type: 'single', setup: 'Bình rượu tròn xoay' });
    const buildVesselScene = vi.fn().mockReturnValue(null);
    const solveProblem = vi.fn().mockResolvedValue({ ok: false });

    const result = await assembleAdvance('Một chiếc bình, thiết diện qua trục, tính thể tích', { splitProblem, buildVesselScene, solveProblem }, {});
    expect(result.revUnsupported).toBe(true);
  });
});
