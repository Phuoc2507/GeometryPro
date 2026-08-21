import { describe, it, expect } from 'vitest';
import { compareCase, answerText } from '../compareCase.js';

const golden = (over = {}) => ({
  id: 't', plan: {},
  expect: { ok: true, answers: [{ kind: 'distance', text: '√2' }, { kind: 'volume', text: '8/3' }] },
  ...over,
});

describe('compareCase', () => {
  it('pass khi ok:true và mọi đáp khớp SỐ (√2 == 1.4142…, 8/3 == 2.666…)', () => {
    const result = { ok: true, answers: [{ text: '1.4142135' }, { text: '2.6666667' }] };
    expect(compareCase(golden(), result).verdict).toBe('pass');
  });

  it('regress-status khi kỳ vọng ok:true nhưng nay ok:false', () => {
    const r = compareCase(golden(), { ok: false, answers: [] });
    expect(r.verdict).toBe('regress-status');
  });

  it('regress-status khi ok:true nhưng KHÔNG ra đáp nào', () => {
    expect(compareCase(golden(), { ok: true, answers: [] }).verdict).toBe('regress-status');
  });

  it('regress-answer khi một đáp số LỆCH', () => {
    const result = { ok: true, answers: [{ text: '√2' }, { text: '3' }] }; // 3 ≠ 8/3
    const r = compareCase(golden(), result);
    expect(r.verdict).toBe('regress-answer');
    expect(r.detail).toContain('#2');
  });

  it('regress-answer khi SỐ LƯỢNG đáp khác', () => {
    expect(compareCase(golden(), { ok: true, answers: [{ text: '√2' }] }).verdict).toBe('regress-answer');
  });

  it('error khi engine văng lỗi (__throw)', () => {
    expect(compareCase(golden(), { __throw: 'kernel-dist lỗi' }).verdict).toBe('error');
  });

  it('pass khi kỳ vọng ok:false và nay cũng ok:false', () => {
    const r = compareCase(golden({ expect: { ok: false } }), { ok: false, answers: [] });
    expect(r.verdict).toBe('pass');
  });

  // Không phải đáp nào cũng có `.text`: relative_position trả {relation},
  // intersection trả {result, point}. Trước đây hai loại truy vấn ĐÃ SHIP này
  // không thể canh hồi quy vì text luôn undefined.
  describe('đáp không phải số', () => {
    it('answerText đọc được relation và intersection', () => {
      expect(answerText({ kind: 'relative_position', relation: 'rời nhau' })).toBe('rời nhau');
      expect(answerText({
        kind: 'intersection', result: 'point',
        point: { p: { x: { approx: 1 }, y: { approx: 2 }, z: { approx: 0 } } },
      })).toBe('point (1,2,0)');
      expect(answerText(null)).toBe('');
      expect(answerText({ kind: 'gì đó' })).toBe('');
    });

    it('pass khi kỳ vọng là chuỗi và đáp khớp (bỏ qua hoa/thường, khoảng trắng)', () => {
      const g = { id: 't', plan: {}, expect: { ok: true, answers: [{ text: 'rời nhau' }] } };
      const r = { ok: true, answers: [{ kind: 'relative_position', relation: '  Rời   nhau ' }] };
      expect(compareCase(g, r).verdict).toBe('pass');
    });

    it('regress-answer khi chuỗi khác', () => {
      const g = { id: 't', plan: {}, expect: { ok: true, answers: [{ text: 'rời nhau' }] } };
      const r = { ok: true, answers: [{ kind: 'relative_position', relation: 'tiếp xúc' }] };
      expect(compareCase(g, r).verdict).toBe('regress-answer');
    });

    it('đáp rỗng KHÔNG được coi là khớp với kỳ vọng rỗng', () => {
      const g = { id: 't', plan: {}, expect: { ok: true, answers: [{ text: '' }] } };
      expect(compareCase(g, { ok: true, answers: [{ kind: 'x' }] }).verdict).toBe('regress-answer');
    });
  });
});
