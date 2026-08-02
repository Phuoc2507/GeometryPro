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

  it('ẢNH-only đọc HỎNG (setup rỗng) → imageReadFailed + hoàn toàn bộ, KHÔNG chạy solveProblem (chống chồng 504)', async () => {
    // Bug 504: ảnh vào, vision hỏng/timeout ⇒ effectiveText rỗng. Nếu vẫn chạy fallback solveProblem
    // trên text RỖNG thì translator tự retry (maxAttempts:2) → chồng thời gian > 60s → 504. Phải báo thẳng.
    const splitProblem = vi.fn().mockResolvedValue({ type: 'single' });   // vision không chép được đề
    const solveProblem = vi.fn().mockResolvedValue({ ok: true, geometry: { points: [{ id: 'A' }] } });

    const result = await assembleAdvance('', { splitProblem, solveProblem }, { imageBase64: 'x' });

    expect(result.revUnsupported).toBe(true);      // hoàn TOÀN BỘ (vẽ được gì đâu)
    expect(result.imageReadFailed).toBe(true);     // phân biệt "đọc ảnh hỏng" với "kiểu quay chưa hỗ trợ"
    expect(result.mode).toBe('kernel');
    expect(result.degraded).toBe(true);
    expect(solveProblem).not.toHaveBeenCalled();   // KHÔNG chồng translator-retry → khỏi 504
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

describe('assembleAdvance — Đợt 2: thiết diện đã biết (cross-known)', () => {
  it('template cross-known → gọi buildSliceScene, trả mode advance', async () => {
    const deps = {
      splitProblem: async () => ({ type: 'single', template: 'cross-known',
        templateParams: { section: 'square', outer: { kind: 'sqrt', a: 1, b: 0 }, domain: [0, 4] } }),
      buildAdvanceScene: async () => null,
      solveProblem: async () => ({ ok: false }),
      buildRevolutionScene: () => null,
      buildSliceScene: () => ({ base: { name: 'x', points: [{ id: 'p0' }] }, steps: [] }),
    };
    const out = await assembleAdvance('đề', deps, {});
    expect(out.mode).toBe('advance');
  });

  it('đề thiết diện KHÔNG ra template → guard trả CROSS_UNSUPPORTED (hoàn credit)', async () => {
    const deps = {
      splitProblem: async () => ({ type: 'single' }),
      buildAdvanceScene: async () => null, solveProblem: async () => ({ ok: false }),
      buildRevolutionScene: () => null, buildSliceScene: () => null,
    };
    const out = await assembleAdvance('Thiết diện vuông góc Ox là hình vuông, tính thể tích', deps, {});
    expect(out.revUnsupported).toBe(true);
  });
});

describe('assembleAdvance — Đợt 2: diện tích hình phẳng (area-plane)', () => {
  it('template area-plane → gọi buildAreaScene, trả mode advance', async () => {
    const deps = {
      splitProblem: async () => ({ type: 'single', template: 'area-plane',
        templateParams: { outer: { kind: 'poly', coeffs: [0, 1] }, inner: { kind: 'poly', coeffs: [0, 0, 1] }, domain: [0, 1] } }),
      buildAdvanceScene: async () => null, solveProblem: async () => ({ ok: false }),
      buildRevolutionScene: () => null, buildSliceScene: () => null,
      buildAreaScene: () => ({ base: { name: 'x', points: [{ id: 'p0' }] }, steps: [] }),
    };
    const out = await assembleAdvance('đề', deps, {});
    expect(out.mode).toBe('advance');
  });

  it('đề diện tích KHÔNG ra template → guard trả AREA_UNSUPPORTED (hoàn credit)', async () => {
    const deps = {
      splitProblem: async () => ({ type: 'single' }),
      buildAdvanceScene: async () => null, solveProblem: async () => ({ ok: false }),
      buildRevolutionScene: () => null, buildSliceScene: () => null, buildAreaScene: () => null,
    };
    const out = await assembleAdvance('Tính diện tích hình phẳng giới hạn bởi hai đường', deps, {});
    expect(out.revUnsupported).toBe(true);
  });
});

// "NỘP CẢ BÀI" (Tầng 0): mọi nhánh Advance BÓ TAY phải đính kèm `split` (bản máy đã hiểu/tách đề) để
// route ghi vào problem_reports. Trước đây các nhánh này trả về KHÔNG kèm gì ⇒ mất trắng "bài làm".
describe('assembleAdvance — nộp cả bài: nhánh bó tay đính kèm split (+plan)', () => {
  it('guard revUnsupported KÈM split (phân loại + bản chép đề)', async () => {
    const split = { type: 'single', setup: 'Tính thể tích khối tròn xoay khi quay (H) quanh trục Ox' };
    const deps = {
      splitProblem: async () => split,
      buildRevolutionScene: () => null,
      solveProblem: async () => ({ ok: true, geometry: { name: 'lạ', points: [{ id: 'A' }] } }),
    };
    const out = await assembleAdvance('', deps, { imageBase64: 'x' });
    expect(out.revUnsupported).toBe(true);
    expect(out.split).toBe(split);            // "bài làm" của Advance được giữ nguyên để ghi log
    expect(out.split.setup).toContain('tròn xoay');
  });

  it('nhánh abstain (solveProblem NÉM) KÈM split', async () => {
    const split = { type: 'single', setup: 'Cho hình chóp S.ABCD, tính thể tích' };
    const deps = {
      splitProblem: async () => split,
      solveProblem: async () => { throw new Error('translator abstained: thiếu số liệu'); },
    };
    const out = await assembleAdvance('Cho hình chóp S.ABCD, tính thể tích', deps, {});
    expect(out.abstained).toBe(true);
    expect(out.split).toBe(split);
  });

  it('fallback bài-đơn ok:false KÈM cả split VÀ plan (Plan translator)', async () => {
    const split = { type: 'single', setup: 'Cho hình chóp S.ABCD' };
    const plan = { solidName: 'tetra', ops: [], asserts: [], queries: [] };
    const deps = {
      splitProblem: async () => split,
      solveProblem: async () => ({ ok: false, plan, violations: [{ message: 'x' }], errors: [] }),
    };
    const out = await assembleAdvance('Cho hình chóp S.ABCD', deps, {});
    expect(out.degraded).toBe(true);
    expect(out.ok).toBe(false);
    expect(out.split).toBe(split);
    expect(out.plan).toBe(plan);              // nhánh ...out giữ Plan translator để "nộp cả bài"
  });

  it('bài-đơn ok:true (vẽ được) KHÔNG bị ép ok:false (giveUp không nuốt nhánh này)', async () => {
    const split = { type: 'single', setup: 'Cho hình chóp S.ABCD' };
    const deps = {
      splitProblem: async () => split,
      solveProblem: async () => ({ ok: true, geometry: { points: [{ id: 'A' }] } }),
    };
    const out = await assembleAdvance('Cho hình chóp S.ABCD', deps, {});
    expect(out.ok).toBe(true);                // KHÔNG bị giveUp ép về false
    expect(out.degraded).toBe(true);
    expect(out.split).toBe(split);
  });
});
