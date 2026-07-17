// api/_lib/kernel/__tests__/translator-contract.test.ts
// Chứng minh HỢP ĐỒNG của LLM Translator: các Plan JSON viết đúng định dạng đã dạy AI
// (translatorPrompt.js) đều được engine giải đúng. Đây là điều kiện cần để phần AI hoạt động
// (dù AI thật cần chạy riêng với API key). Mỗi ca mô phỏng AI dịch một dạng đề thi khác nhau.
import { describe, it, expect } from 'vitest';
import { run } from '../run';

function solve(plan: unknown) {
  const res = run(plan);
  return res;
}

describe('LLM Translator contract — the plan format solves real exam problems', () => {
  it('viết phương trình mặt phẳng qua 3 điểm (Oxyz)', () => {
    const res = solve({
      solidName: 'ABC',
      ops: [
        { op: 'oxyz_point', name: 'A', at: [1, 0, 0] },
        { op: 'oxyz_point', name: 'B', at: [0, 2, 0] },
        { op: 'oxyz_point', name: 'C', at: [0, 0, 3] },
        { op: 'oxyz_plane', name: 'ABC', by: { form: 'three_points', a: 'A', b: 'B', c: 'C' } },
      ],
      queries: [{ kind: 'equation', target: 'ABC' }],
    });
    expect(res.ok).toBe(true);
    expect(res.answers[0]).toMatchObject({ kind: 'equation', text: '6x + 3y + 2z - 6 = 0' });
  });

  it('mặt cầu ngoại tiếp tứ diện (qua 4 điểm)', () => {
    const res = solve({
      solidName: 'OABC',
      ops: [
        { op: 'oxyz_point', name: 'O', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'A', at: [2, 0, 0] },
        { op: 'oxyz_point', name: 'B', at: [0, 2, 0] },
        { op: 'oxyz_point', name: 'C', at: [0, 0, 2] },
        { op: 'oxyz_sphere', name: 'S', by: { form: 'four_points', a: 'O', b: 'A', c: 'B', d: 'C' } },
      ],
      queries: [{ kind: 'equation', target: 'S' }],
    });
    expect(res.ok).toBe(true);
    expect((res.answers[0] as { text: string }).text).toBe('(x - 1)² + (y - 1)² + (z - 1)² = 3');
  });

  it('góc nhị diện 45° + thể tích tứ diện 1/6, với assert được kiểm', () => {
    const res = solve({
      solidName: 'test',
      ops: [
        { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'B', at: [1, 0, 0] },
        { op: 'oxyz_point', name: 'C', at: [0, 1, 0] },
        { op: 'oxyz_point', name: 'D', at: [0, 0, 1] },
        { op: 'oxyz_plane', name: 'P1', by: { form: 'coeffs', a: 0, b: 0, c: 1, d: 0 } },
        { op: 'oxyz_plane', name: 'P2', by: { form: 'coeffs', a: 0, b: 1, c: 1, d: 0 } },
      ],
      asserts: [{ relation: 'perp', args: ['AB', 'AC'] }],
      queries: [
        { kind: 'angle', a: 'P1', b: 'P2' },
        { kind: 'volume', solid: 'tetrahedron', points: ['A', 'B', 'C', 'D'] },
      ],
    });
    expect(res.ok).toBe(true);
    expect(res.violations).toHaveLength(0);
    expect((res.answers[0] as { exactDegrees: number | null }).exactDegrees).toBe(45);
    expect((res.answers[1] as { text: string }).text).toBe('1/6');
  });

  it('chóp tam giác đều (toạ độ CĂN) → khoảng cách exact 2√39/13', () => {
    // Đáy đều cạnh 2, SA⊥đáy, góc(SB,đáy)=60° ⇒ SA=2√3. d(B,(SMC)) = 2√39/13.
    const res = solve({
      solidName: 'S.ABC',
      ops: [
        { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'B', at: [2, 0, 0] },
        { op: 'oxyz_point', name: 'C', at: [1, 'sqrt(3)', 0] },
        { op: 'oxyz_point', name: 'S', at: [0, 0, '2*sqrt(3)'] },
        { op: 'oxyz_midpoint', name: 'M', a: 'A', b: 'B' },
        { op: 'oxyz_plane', name: 'SMC', by: { form: 'three_points', a: 'S', b: 'M', c: 'C' } },
      ],
      asserts: [
        { relation: 'angle', args: ['SB', 'ABC'], value: 60, tolerance: 1e-6 },
        { relation: 'dist', args: ['A', 'B'], value: 2 },
      ],
      queries: [{ kind: 'distance', a: 'B', b: 'SMC' }],
    });
    expect(res.errors).toHaveLength(0);
    expect((res.answers[0] as { text: string; approximate: boolean }).text).toBe('2√39/13');
    expect((res.answers[0] as { approximate: boolean }).approximate).toBe(false);
  });

  it('khoảng cách 2 đường chéo nhau = 1 (Oxyz)', () => {
    const res = solve({
      solidName: 'skew',
      ops: [
        { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
        { op: 'oxyz_point', name: 'B', at: [1, 0, 0] },
        { op: 'oxyz_point', name: 'C', at: [0, 0, 1] },
        { op: 'oxyz_point', name: 'D', at: [0, 1, 1] },
        { op: 'oxyz_line', name: 'd1', by: { form: 'two_points', a: 'A', b: 'B' } },
        { op: 'oxyz_line', name: 'd2', by: { form: 'two_points', a: 'C', b: 'D' } },
      ],
      queries: [{ kind: 'distance', a: 'd1', b: 'd2' }],
    });
    expect(res.ok).toBe(true);
    expect((res.answers[0] as { text: string }).text).toBe('1');
  });
});
