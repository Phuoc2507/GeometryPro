import { beforeEach, describe, expect, it, vi } from 'vitest';

// Engine "vẽ lại kỹ hơn": kernel trước → Pass1 lấy ràng buộc → LLM vẽ → tự chấm.
// Mock toàn bộ phụ thuộc nặng để kiểm ĐÚNG luồng quyết định.
const mocks = vi.hoisted(() => ({
  solveProblem: vi.fn(),
  callVilao: vi.fn(),
  parseJson: vi.fn(),
  verify: vi.fn(),
}));

vi.mock('../kernel-bridge/solveWithKernel.js', () => ({ solveProblem: mocks.solveProblem }));
vi.mock('../vilao.js', () => ({ callVilao: mocks.callVilao }));
vi.mock('../jsonHelpers.js', () => ({ parseJsonResponseWithAiRepair: mocks.parseJson }));
vi.mock('../kernelVerify.js', () => ({ verifyWithKernel: mocks.verify }));
vi.mock('../normalizeGeometry.js', () => ({ normalizeGeometryData: (g) => g }));
vi.mock('../flatGuard.js', () => ({
  isLikely3DPrompt: () => false,
  isLikelyFlatGeometry: () => false,
  applyApexLiftFallback: (g) => g,
}));

async function load() {
  vi.resetModules();
  return (await import('../redrawProblem.js')).redrawProblem;
}

describe('redrawProblem', () => {
  beforeEach(() => {
    mocks.solveProblem.mockReset();
    mocks.callVilao.mockReset();
    mocks.parseJson.mockReset();
    mocks.verify.mockReset();
  });

  it('đề rỗng → source "none", không gọi gì', async () => {
    const fn = await load();
    const r = await fn('   ');
    expect(r.source).toBe('none');
    expect(mocks.solveProblem).not.toHaveBeenCalled();
    expect(mocks.callVilao).not.toHaveBeenCalled();
  });

  it('KERNEL dựng được → verified, source "kernel", KHÔNG gọi LLM', async () => {
    mocks.solveProblem.mockResolvedValue({ ok: true, geometry: { points: [{ id: 'A' }, { id: 'B' }] }, violations: [], errors: [] });
    const fn = await load();
    const r = await fn('Cho hình chóp S.ABCD');
    expect(r.source).toBe('kernel');
    expect(r.verified).toBe(true);
    expect(r.confidence).toBe(1);
    expect(r.geometry.points).toHaveLength(2);
    expect(mocks.callVilao).not.toHaveBeenCalled();
  });

  it('kernel hỏng → LLM vẽ + TỰ CHẤM đạt → verified, source "llm"', async () => {
    mocks.solveProblem.mockResolvedValue({ ok: false });
    mocks.callVilao.mockResolvedValueOnce('pass1').mockResolvedValueOnce('draw');
    mocks.parseJson
      .mockResolvedValueOnce({ constraints_structured: [{ relation: 'perp', args: ['SA', 'ABCD'] }] })
      .mockResolvedValueOnce({ geometry: { points: [{ id: 'S' }, { id: 'A' }] } });
    mocks.verify.mockResolvedValue({ verified: true, ok: true, confidence: 1, violations: [], checked: 1 });

    const fn = await load();
    const r = await fn('Cho hình chóp S.ABCD, SA vuông góc đáy');
    expect(r.source).toBe('llm');
    expect(r.verified).toBe(true);
    expect(r.checkedConstraints).toBe(1);
    expect(r.geometry.points).toHaveLength(2);
  });

  it('LLM vẽ nhưng TỰ CHẤM còn vi phạm → verified=false, giữ bản + note "vi phạm"', async () => {
    mocks.solveProblem.mockResolvedValue({ ok: false });
    mocks.callVilao.mockResolvedValueOnce('pass1').mockResolvedValueOnce('draw');
    mocks.parseJson
      .mockResolvedValueOnce({ constraints_structured: [{ relation: 'perp', args: ['SA', 'ABCD'] }] })
      .mockResolvedValueOnce({ geometry: { points: [{ id: 'A' }] } });
    mocks.verify.mockResolvedValue({ verified: true, ok: false, confidence: 0.3, violations: [{ message: 'SA không vuông góc' }], checked: 2 });

    const fn = await load();
    const r = await fn('đề khó');
    expect(r.verified).toBe(false);
    expect(r.violations).toHaveLength(1);
    expect(r.note).toMatch(/vi phạm/i);
    expect(r.geometry).not.toBeNull();
  });

  it('không có ràng buộc cấu trúc → chưa tự chấm được (checkedConstraints=0)', async () => {
    mocks.solveProblem.mockResolvedValue({ ok: false });
    mocks.callVilao.mockResolvedValueOnce('pass1').mockResolvedValueOnce('draw');
    mocks.parseJson
      .mockResolvedValueOnce({ constraints_structured: [] })
      .mockResolvedValueOnce({ geometry: { points: [{ id: 'A' }] } });

    const fn = await load();
    const r = await fn('đề không có điều kiện máy hiểu');
    expect(r.verified).toBe(false);
    expect(r.checkedConstraints).toBe(0);
    expect(r.note).toMatch(/chưa tự chấm/i);
    expect(mocks.verify).not.toHaveBeenCalled();
  });
});
