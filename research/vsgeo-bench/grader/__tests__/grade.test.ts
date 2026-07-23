import { describe, it, expect } from 'vitest';
import { grade } from '../grade';
import type { Answer } from '../types';

const surd: Answer = { canonical: '√6/3', type: 'surd' };
const plane: Answer = { canonical: 'x+2y-2z+3=0', type: 'plane_eq' };
const point: Answer = { canonical: '(1,2,3)', type: 'point' };

describe('grade — điều phối toàn máy chấm', () => {
  it('output có \\boxed đúng → correct', () => {
    const r = grade('Tính toán... Vậy \\boxed{sqrt(6)/3}.', surd);
    expect(r.verdict).toBe('correct');
    expect(r.canonicalModel).toBe('√6/3');
    expect(r.canonicalTruth).toBe('√6/3');
  });

  it('output thập phân xấp xỉ → vẫn correct', () => {
    expect(grade('\\boxed{0.8164}', surd).verdict).toBe('correct');
  });

  it('đáp án sai rõ → incorrect', () => {
    expect(grade('\\boxed{5}', surd).verdict).toBe('incorrect');
  });

  it('không có đáp án trích được → unsure', () => {
    const r = grade('Một lời giải bỏ ngỏ, không kết luận.', surd);
    expect(r.verdict).toBe('unsure');
    expect(r.reason).toMatch(/không.*trích|boxed/i);
  });

  it('mặt phẳng tương đương nhân đôi → correct', () => {
    expect(grade('\\boxed{2x+4y-4z+6=0}', plane).verdict).toBe('correct');
  });

  it('điểm khớp → correct', () => {
    expect(grade('Đáp án: (1, 2, 3)', point).verdict).toBe('correct');
  });

  it('reason luôn là chuỗi không rỗng', () => {
    expect(grade('\\boxed{5}', surd).reason.length).toBeGreaterThan(0);
  });
});
