// Mức 2 — "minh hoạ đại diện" cho bài THANG CHỮ.
// Bài cho cỡ bằng MỘT CHỮ (cạnh a) chỉ xác định TỚI ĐỒNG DẠNG ⇒ engine buộc chọn thang a=1 để dựng
// hình. Đáp CHỮ ('a·√3/3') vẫn đúng tổng quát, nhưng số ĐO TRÊN HÌNH chỉ đúng ở thang đó.
// Trước tiểu-dự án C, các bài này rơi vào Mức 3 ("chưa chứng thực") dù engine giải ĐÚNG — nhánh Mức 2
// không ai kích hoạt. Bộ test này khoá hành vi mới: solvePlan bật cờ `representative`, classifyTier
// trả level 2 kèm số đo được.
//
// Mock callVilao (bước LLM duy nhất) ⇒ tất định, không mạng. Engine thật (kernel-dist) vẫn chạy.
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../vilao.js', () => ({ callVilao: vi.fn() }));

import { callVilao } from '../vilao.js';
import { solveProblem, solvePlan } from '../kernel-bridge/solveWithKernel.js';
import { classifyTier } from '../kernel-bridge/classifyTier.js';

// VÍ DỤ M của translatorPrompt: lập phương cạnh a, khoảng cách A → mp(A'BD). Tại a=1 ⇒ √3/3.
const cubePlan = {
  solidName: "ABCD.A'B'C'D'",
  scaleSymbol: 'a',
  ops: [
    { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
    { op: 'oxyz_point', name: 'B', at: [1, 0, 0] },
    { op: 'oxyz_point', name: 'D', at: [0, 1, 0] },
    { op: 'oxyz_point', name: 'A1', at: [0, 0, 1] },
    { op: 'oxyz_plane', name: 'A1BD', by: { form: 'three_points', a: 'A1', b: 'B', c: 'D' } },
  ],
  asserts: [],
  queries: [{ kind: 'distance', a: 'A', b: 'A1BD' }],
};
// Cùng hình, cùng câu hỏi, nhưng KHÔNG có scaleSymbol (cạnh = 1 tuyệt đối) ⇒ phải ở lại Mức 1.
const cubePlanNoSymbol = { ...cubePlan, scaleSymbol: undefined };

const SQRT3_OVER_3 = Math.sqrt(3) / 3;

describe('solvePlan — cờ representative cho bài THANG CHỮ', () => {
  it('bật representative + giữ số đo ở thang a=1, đáp vẫn là chữ', () => {
    const r = solvePlan(cubePlan);
    expect(r.ok).toBe(true);
    expect(r.representative).toBe(true);

    const a = r.answers[0];
    expect(a.text).toContain('a');           // đáp CHỮ, tổng quát
    expect(a.approx).toBeNull();             // KHÔNG hiện số trần (sẽ bị hiểu là số tuyệt đối)
    expect(a.scaleSymbol).toBe('a');
    expect(a.approxAtScale).toBeCloseTo(SQRT3_OVER_3, 9); // số đo được trên hình đang vẽ
  });

  it('hình vẫn được dựng (Mức 2 phải CÓ hình để mà minh hoạ)', () => {
    const r = solvePlan(cubePlan);
    expect(r.geometry).toBeTruthy();
    expect(r.geometry.points.length).toBeGreaterThan(0);
  });

  it('KHÔNG có scaleSymbol ⇒ không representative (không hạ nhầm Mức 1 xuống Mức 2)', () => {
    const r = solvePlan(cubePlanNoSymbol);
    expect(r.representative).toBe(false);
    expect(r.answers[0].approx).toBeCloseTo(SQRT3_OVER_3, 9);
    expect(classifyTier({ plan: cubePlanNoSymbol, ...r }).level).toBe(1);
  });
});

describe('classifyTier — THANG CHỮ nay là Mức 2, kèm số đo', () => {
  it('level 2 + illustration mô tả đúng thang', () => {
    const r = solvePlan(cubePlan);
    const t = classifyTier({ plan: cubePlan, ...r });

    expect(t.level).toBe(2);
    expect(t.problemType).toBe('Khoảng cách');
    expect(t.exactness).toBeNull();
    expect(t.reason).toBeNull();
    expect(t.illustration.approxAtScale).toBeCloseTo(SQRT3_OVER_3, 9);
    expect(t.illustration.scaleSymbol).toBe('a');
    expect(t.illustration.note).toBe('đo ở hình vẽ với a = 1');
  });

  it('representative nhưng KHÔNG có số đo ⇒ vẫn Mức 2, illustration = null', () => {
    const t = classifyTier({
      representative: true,
      plan: { queries: [{ kind: 'distance', a: 'A', b: 'B' }] },
      ok: true,
      answers: [{ kind: 'distance', text: 'a·√3', approx: null }], // thiếu approxAtScale
      violations: [], errors: [],
    });
    expect(t.level).toBe(2);
    expect(t.illustration).toBeNull();
  });
});

describe('solveProblem — đường ống đầy đủ gắn tier Mức 2', () => {
  beforeEach(() => vi.mocked(callVilao).mockReset());

  it('đề lập phương cạnh a → tier Mức 2, không phải Mức 3', async () => {
    vi.mocked(callVilao).mockResolvedValue(JSON.stringify(cubePlan));
    const r = await solveProblem('Cho hình lập phương ABCD.A\'B\'C\'D\' cạnh a. Tính khoảng cách từ A đến (A\'BD).');

    expect(r.ok).toBe(true);
    expect(r.tier.level).toBe(2);
    expect(r.tier.illustration.approxAtScale).toBeCloseTo(SQRT3_OVER_3, 9);
    expect(r.answers[0].text).toContain('a');
  });
});
