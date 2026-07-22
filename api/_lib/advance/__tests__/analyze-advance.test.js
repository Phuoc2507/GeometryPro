import { describe, it, expect, vi } from 'vitest';
import { assembleAdvance } from '../../../analyze-advance.js';

// Lõi thuần deps-injected: test 3 nhánh KHÔNG cần mạng (mirror splitProblem/buildAdvanceScene tests).
// Trọng tâm Pass -1: có ẢNH → transcribeImage chép đề ra CHỮ → chữ đó chảy vào splitProblem
// (⇒ coverageCheck soi trên đề thật). Ném/chép-rỗng → degrade sạch, không crash.

describe('assembleAdvance — Pass -1 transcribeImage (ảnh → chữ)', () => {
  it('có ảnh: transcribeImage chép đề → CHỮ chảy vào splitProblem → multi_question', async () => {
    const transcribed = 'Cho chóp S.ABCD SA=2a. a) Thể tích. b) M trung điểm SC.';
    const transcribeImage = vi.fn().mockResolvedValue(transcribed);
    const splitProblem = vi.fn().mockResolvedValue({
      type: 'multi_question', setup: 's',
      parts: [{ label: 'a', hoi: 'V', phan_tu_moi: [] }, { label: 'b', hoi: 'M', phan_tu_moi: ['M'] }],
    });
    const buildAdvanceScene = vi.fn().mockResolvedValue({ base: { points: [] }, steps: [{ id: 'a' }] });
    const solveProblem = vi.fn();

    const result = await assembleAdvance('', { splitProblem, buildAdvanceScene, solveProblem, transcribeImage }, { imageBase64: 'x' });

    // (1) transcribeImage nhận đúng ảnh 'x' (+ opts chảy qua).
    expect(transcribeImage).toHaveBeenCalledWith('x', { imageBase64: 'x' });
    // (2) CHỮ đã chép (không phải placeholder) được đưa vào splitProblem ⇒ coverageCheck soi đề thật.
    expect(splitProblem).toHaveBeenCalledTimes(1);
    expect(splitProblem.mock.calls[0][0]).toBe(transcribed);
    // (3) build ra scene → mode advance.
    expect(result.mode).toBe('advance');
    expect(solveProblem).not.toHaveBeenCalled();
  });

  it('transcribeImage NÉM → không crash, degrade sạch (fallback bài đơn)', async () => {
    const transcribeImage = vi.fn().mockRejectedValue(new Error('vision down'));
    const splitProblem = vi.fn().mockResolvedValue({ type: 'single' });
    const buildAdvanceScene = vi.fn();
    const solveProblem = vi.fn().mockResolvedValue({ ok: false, abstained: true });

    const result = await assembleAdvance('', { splitProblem, buildAdvanceScene, solveProblem, transcribeImage }, { imageBase64: 'x' });

    expect(result.degraded).toBe(true);
    expect(result.mode).toBe('kernel');
    // problem seed vẫn '' sau khi chép ném → splitProblem nhận ''.
    expect(splitProblem.mock.calls[0][0]).toBe('');
  });

  it('luồng CHỮ (không ảnh): transcribeImage KHÔNG được gọi', async () => {
    const transcribeImage = vi.fn();
    const splitProblem = vi.fn().mockResolvedValue({ type: 'single' });
    const buildAdvanceScene = vi.fn();
    const solveProblem = vi.fn().mockResolvedValue({ ok: true, geometry: { points: [] } });

    const result = await assembleAdvance('Cho chóp S.ABCD SA=2a', { splitProblem, buildAdvanceScene, solveProblem, transcribeImage }, {});

    expect(transcribeImage).not.toHaveBeenCalled();
    expect(splitProblem.mock.calls[0][0]).toBe('Cho chóp S.ABCD SA=2a');
    expect(result.degraded).toBe(true);   // single → fallback bài đơn
  });
});
