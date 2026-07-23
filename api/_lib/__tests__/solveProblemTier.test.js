import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock callVilao (bước LLM DUY NHẤT) ⇒ deterministic, không mạng. Engine thật (kernel-dist) vẫn nạp.
vi.mock('../vilao.js', () => ({ callVilao: vi.fn() }));

import { callVilao } from '../vilao.js';
import { solveProblem } from '../kernel-bridge/solveWithKernel.js';

describe('solveProblem — gắn tier ở nhánh khước từ/lỗi (không nổ exception)', () => {
  beforeEach(() => vi.mocked(callVilao).mockReset());

  it('translator abstain → Mức 3, reason.kind=abstain, giữ lý do', async () => {
    vi.mocked(callVilao).mockResolvedValue('{"abstain": true, "abstain_reason": "thiếu số liệu"}');
    const r = await solveProblem('Một bài thiếu số liệu để giải.');
    expect(r.ok).toBe(false);
    expect(r.tier).toBeTruthy();
    expect(r.tier.level).toBe(3);
    expect(r.tier.reason.kind).toBe('abstain');
    expect(r.tier.reason.message).toContain('thiếu số liệu');
  });

  it('non-JSON → Mức 3, reason.kind=error', async () => {
    vi.mocked(callVilao).mockResolvedValue('xin chào, đây không phải JSON');
    const r = await solveProblem('Một đề bất kỳ.');
    expect(r.tier.level).toBe(3);
    expect(r.tier.reason.kind).toBe('error');
  });
});
