import { describe, it, expect } from 'vitest';
import { extractTokens, coverageCheck } from '../coverage.js';

describe('coverage gate', () => {
  it('extractTokens lấy số + tên điểm + nhãn câu', () => {
    const t = extractTokens('Cho chóp S.ABCD, SA=2a. a) tính V. b) trung điểm M của SC.');
    expect(t).toEqual(expect.arrayContaining(['S', 'A', 'B', 'C', 'D', 'M', '2']));
  });
  it('ok khi mọi token có mặt trong parts', () => {
    const orig = 'A(1;2). a) d(A,P). b) góc M.';
    const parts = [{ hoi: 'khoảng cách A đến P, A(1;2)' }, { hoi: 'góc tại M' }];
    expect(coverageCheck(orig, parts).ok).toBe(true);
  });
  it('fail khi part nuốt mất token (số 5)', () => {
    const orig = 'A(1;2), B(5;0). a) d(A,B).';
    const parts = [{ hoi: 'khoảng cách A(1;2) đến B' }]; // thiếu 5
    const r = coverageCheck(orig, parts);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('5');
  });
});
