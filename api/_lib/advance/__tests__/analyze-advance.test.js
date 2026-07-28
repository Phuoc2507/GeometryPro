import { describe, it, expect, vi } from 'vitest';
import { assembleAdvance, looksLikeRevolution } from '../../../analyze-advance.js';

// Lõi thuần deps-injected: test các nhánh KHÔNG cần mạng (mirror splitProblem/buildAdvanceScene tests).
// GỘP đọc-ảnh + tách-đề: có ẢNH → đẩy THẲNG ảnh xuống splitProblem (1 lượt vision vừa chép đề vào
// `setup` vừa phân loại). `effectiveText` = problem (chữ) HOẶC split.setup (bản chép từ ảnh) → dùng cho
// nhận-diện tròn-xoay + fallback bài đơn khi đề vào bằng ảnh (`problem` rỗng).

describe('assembleAdvance — GỘP đọc-ảnh + tách-đề (ảnh → splitProblem 1 lượt)', () => {
  it('có ảnh: ảnh chảy THẲNG vào splitProblem (opts.imageBase64) → multi_question → mode advance', async () => {
    const splitProblem = vi.fn().mockResolvedValue({
      type: 'multi_question', setup: 'Cho chóp S.ABCD SA=2a',
      parts: [{ label: 'a', hoi: 'V', phan_tu_moi: [] }, { label: 'b', hoi: 'M', phan_tu_moi: ['M'] }],
    });
    const buildAdvanceScene = vi.fn().mockResolvedValue({ base: { points: [] }, steps: [{ id: 'a' }] });
    const solveProblem = vi.fn();

    const result = await assembleAdvance('', { splitProblem, buildAdvanceScene, solveProblem }, { imageBase64: 'x' });

    // (1) splitProblem nhận problem='' + opts.imageBase64='x' (tự đọc ảnh trong 1 lượt vision).
    expect(splitProblem).toHaveBeenCalledTimes(1);
    expect(splitProblem.mock.calls[0][0]).toBe('');
    expect(splitProblem.mock.calls[0][1]).toEqual({ imageBase64: 'x' });
    // (2) build ra scene → mode advance.
    expect(result.mode).toBe('advance');
    expect(solveProblem).not.toHaveBeenCalled();
  });

  it('ảnh + split rỗng (đọc hỏng) → degrade sạch, không crash', async () => {
    const splitProblem = vi.fn().mockResolvedValue({ type: 'single' });
    const buildAdvanceScene = vi.fn();
    const solveProblem = vi.fn().mockResolvedValue({ ok: false, abstained: true });

    const result = await assembleAdvance('', { splitProblem, buildAdvanceScene, solveProblem }, { imageBase64: 'x' });

    expect(result.degraded).toBe(true);
    expect(result.mode).toBe('kernel');
  });

  it('ảnh: đề tròn xoay chép vào split.setup nhưng KHÔNG có template ⇒ revUnsupported (dùng effectiveText từ setup)', async () => {
    // problem rỗng (ảnh); classifier trượt template. effectiveText phải lấy từ split.setup để looksLikeRevolution bắt được.
    const splitProblem = vi.fn().mockResolvedValue({
      type: 'single', setup: 'Tính thể tích khối tròn xoay khi quay (H) quanh trục Ox',
    });
    const buildRevolutionScene = vi.fn();
    const solveProblem = vi.fn().mockResolvedValue({ ok: true, geometry: { name: 'lạ', points: [{ id: 'A' }] } });

    const result = await assembleAdvance('', { splitProblem, buildRevolutionScene, solveProblem }, { imageBase64: 'x' });

    expect(result.revUnsupported).toBe(true);
    expect(solveProblem).not.toHaveBeenCalled();   // KHÔNG vẽ bừa hình 3D lạ
  });

  it('luồng CHỮ (không ảnh): splitProblem nhận đúng chữ, không kèm imageBase64', async () => {
    const splitProblem = vi.fn().mockResolvedValue({ type: 'single' });
    const buildAdvanceScene = vi.fn();
    const solveProblem = vi.fn().mockResolvedValue({ ok: true, geometry: { points: [] } });

    const result = await assembleAdvance('Cho chóp S.ABCD SA=2a', { splitProblem, buildAdvanceScene, solveProblem }, {});

    expect(splitProblem.mock.calls[0][0]).toBe('Cho chóp S.ABCD SA=2a');
    expect(result.degraded).toBe(true);   // single → fallback bài đơn
  });
});

describe('looksLikeRevolution (nhận diện đề tròn xoay tất định)', () => {
  it('bắt đúng các cách ra đề tròn xoay', () => {
    expect(looksLikeRevolution('Tính thể tích khối tròn xoay khi quay quanh Ox')).toBe(true);
    expect(looksLikeRevolution('Cho (H) giới hạn bởi y=x². Quay (H) quanh trục Ox')).toBe(true);
    expect(looksLikeRevolution('quay hình phẳng quanh trục hoành')).toBe(true);
    expect(looksLikeRevolution('xoay quanh trục Oy')).toBe(true);
  });
  it('KHÔNG bắt nhầm đề hình học không gian thường', () => {
    expect(looksLikeRevolution('Cho hình chóp S.ABCD có SA vuông góc đáy')).toBe(false);
    expect(looksLikeRevolution('Tính khoảng cách từ A đến mặt phẳng (SBC)')).toBe(false);
    expect(looksLikeRevolution('')).toBe(false);
  });
});

describe('assembleAdvance — đề tròn xoay không dựng được ⇒ báo trung thực (KHÔNG vẽ bừa)', () => {
  it('rev-intent + không có template ⇒ revUnsupported, KHÔNG gọi solveProblem vẽ hình lạ', async () => {
    const splitProblem = vi.fn().mockResolvedValue({ type: 'single' }); // classifier trượt / OCR mờ
    const buildRevolutionScene = vi.fn();
    const solveProblem = vi.fn().mockResolvedValue({ ok: true, geometry: { name: 'chóp lạ', points: [{ id: 'A' }] } });

    const result = await assembleAdvance(
      'Tính thể tích khối tròn xoay khi quay hình phẳng quanh trục Ox',
      { splitProblem, buildRevolutionScene, solveProblem },
      {},
    );

    expect(result.revUnsupported).toBe(true);
    expect(result.degraded).toBe(true);
    expect(result.mode).toBe('kernel');
    expect(result.geometry).toBeUndefined();     // KHÔNG kèm hình 3D không liên quan
    expect(solveProblem).not.toHaveBeenCalled();  // không phí công vẽ bừa
  });

  it('đề KHÔNG phải tròn xoay vẫn fallback bài đơn như cũ (không đụng)', async () => {
    const splitProblem = vi.fn().mockResolvedValue({ type: 'single' });
    const solveProblem = vi.fn().mockResolvedValue({ ok: true, geometry: { points: [] } });

    const result = await assembleAdvance('Cho hình chóp S.ABCD, tính thể tích', { splitProblem, solveProblem }, {});

    expect(result.revUnsupported).toBeUndefined();
    expect(result.degraded).toBe(true);
    expect(solveProblem).toHaveBeenCalledTimes(1);
  });
});
