import { describe, it, expect } from 'vitest';
import { describeKernelMiss, logKernelMiss } from '../kernelMissLog.js';

// "Nộp cả bài": khi engine tất định KHÔNG phục vụ được, ta phải giữ lại VÌ SAO + bài làm
// (Plan JSON của bước dịch) để trang admin / vòng tự-cải-tiến còn học được. describeKernelMiss
// là phần thuần (không I/O) nên test kỹ ở đây.
describe('describeKernelMiss', () => {
  it('nhãn abstain kèm lý do, KHÔNG kèm Plan (bước dịch từ chối trước khi ra Plan)', () => {
    const k = {
      plan: null, ok: false, geometry: null, answers: [], violations: [],
      errors: [{ message: 'translator abstained: thiếu dữ kiện độ dài cạnh' }],
    };
    const r = describeKernelMiss(k);
    expect(r.errorStage).toBe('abstain');
    expect(r.errorMessage).toBe('thiếu dữ kiện độ dài cạnh');
    expect(r.aiJson).toBeNull();
  });

  it('nhãn translate_fail khi bước dịch hỏng (không phải abstain)', () => {
    const k = {
      plan: null, ok: false, geometry: null, answers: [], violations: [],
      errors: [{ message: 'translator returned non-JSON' }],
    };
    const r = describeKernelMiss(k);
    expect(r.errorStage).toBe('translate_fail');
    expect(r.errorMessage).toBe('translator returned non-JSON');
    expect(r.aiJson).toBeNull();
  });

  it('nhãn kernel_unusable KÈM Plan JSON khi dịch được nhưng chạy vi phạm', () => {
    const plan = { solidName: 'tetra', ops: [], asserts: [], queries: [] };
    const k = {
      plan, ok: false, geometry: { points: [{ id: 'A' }] }, answers: [],
      violations: [{ message: 'perp(SA,BC) sai' }], errors: [],
    };
    const r = describeKernelMiss(k);
    expect(r.errorStage).toBe('kernel_unusable');
    expect(r.errorMessage).toContain('perp(SA,BC) sai');
    expect(r.aiJson.plan).toEqual(plan); // "nộp cả bài": Plan translator được giữ nguyên
  });

  it('nhãn kernel_unusable khi chạy ok nhưng KHÔNG có điểm vẽ được (kèm Plan + pts=0)', () => {
    const plan = { solidName: 'x', ops: [], asserts: [], queries: [] };
    const k = { plan, ok: true, geometry: { points: [] }, answers: [], violations: [], errors: [] };
    const r = describeKernelMiss(k);
    expect(r.errorStage).toBe('kernel_unusable');
    expect(r.errorMessage).toContain('pts=0');
    expect(r.aiJson.plan).toEqual(plan);
  });

  it('nhãn kernel_error khi chính engine văng ngoại lệ (vd kernel-dist chưa build)', () => {
    const r = describeKernelMiss(null, new Error('kernel-dist chưa build'));
    expect(r.errorStage).toBe('kernel_error');
    expect(r.errorMessage).toContain('kernel-dist chưa build');
    expect(r.aiJson).toBeNull();
  });

  it('trả null khi kết quả THỰC RA dùng được (không có gì để ghi)', () => {
    const k = {
      plan: { solidName: 'x', ops: [], asserts: [], queries: [] }, ok: true,
      geometry: { points: [{ id: 'A' }] }, answers: [], violations: [], errors: [],
    };
    expect(describeKernelMiss(k)).toBeNull();
  });

  it('an toàn khi errors rỗng/thiếu message ở nhánh không-Plan', () => {
    const r = describeKernelMiss({ plan: null, ok: false, geometry: null, errors: [] });
    expect(r.errorStage).toBe('translate_fail');
    expect(typeof r.errorMessage).toBe('string');
    expect(r.errorMessage.length).toBeGreaterThan(0);
  });
});

// logKernelMiss chỉ là lớp bọc bắn-rồi-quên: không có service-role key trong test nên nó bỏ qua
// im lặng. Ta chỉ cần nó KHÔNG BAO GIỜ ném (không được làm chết request chính).
describe('logKernelMiss (lớp bọc fire-and-forget)', () => {
  it('không ném khi có miss', () => {
    const k = { plan: null, ok: false, geometry: null, errors: [{ message: 'translator abstained: x' }] };
    expect(() => logKernelMiss({ endpoint: 'analyze-geometry', mode: 'quick', prompt: 'đề', userId: null, k })).not.toThrow();
  });

  it('không ném (và không làm gì) khi kết quả dùng được', () => {
    const k = { plan: { ops: [] }, ok: true, geometry: { points: [{ id: 'A' }] }, violations: [], errors: [] };
    expect(() => logKernelMiss({ endpoint: 'analyze-geometry', mode: 'quick', prompt: 'đề', k })).not.toThrow();
  });

  it('không ném khi engine văng lỗi', () => {
    expect(() => logKernelMiss({ endpoint: 'analyze-geometry', mode: 'detailed', prompt: 'đề', thrown: new Error('boom') })).not.toThrow();
  });
});
