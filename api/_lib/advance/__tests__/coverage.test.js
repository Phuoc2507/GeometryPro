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
  it('ok khi token (kích thước 2a) nằm ở SETUP, không trong câu hỏi', () => {
    // đề: kích thước "2a" ở phần dựng hình chung; câu hỏi chỉ "thể tích"/"khoảng cách"
    const orig = 'Cho chóp S.ABCD cạnh 2a, SA=2a. a) thể tích. b) khoảng cách A đến (SBC).';
    const setup = 'chóp S.ABCD cạnh 2a, SA=2a';
    const parts = [{ hoi: 'thể tích khối chóp' }, { hoi: 'khoảng cách A đến (SBC)' }];
    expect(coverageCheck(orig, parts).ok).toBe(false);            // chỉ soi parts → loại oan
    expect(coverageCheck(orig, parts, setup).ok).toBe(true);      // soi cả setup → đúng
  });
});
