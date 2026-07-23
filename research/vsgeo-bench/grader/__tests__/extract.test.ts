import { describe, it, expect } from 'vitest';
import { extractBoxed } from '../extract';

describe('extractBoxed — trích đáp án cuối cùng', () => {
  it('lấy nội dung trong \\boxed{...} đơn giản', () => {
    expect(extractBoxed('Vậy đáp số là \\boxed{√6/3}.')).toBe('√6/3');
  });

  it('lấy \\boxed CUỐI CÙNG khi có nhiều cái', () => {
    const raw = 'Thử \\boxed{1/2} nhưng sai. Tính lại: \\boxed{√6/3}';
    expect(extractBoxed(raw)).toBe('√6/3');
  });

  it('đếm đúng ngoặc lồng nhau trong LaTeX', () => {
    const raw = 'Kết quả \\boxed{\\dfrac{\\sqrt{6}}{3}} là đáp án.';
    expect(extractBoxed(raw)).toBe('\\dfrac{\\sqrt{6}}{3}');
  });

  it('không có boxed → fallback dòng "Đáp án:"', () => {
    const raw = 'Lời giải dài...\nĐáp án: (1, 2, 3)\nHết.';
    expect(extractBoxed(raw)).toBe('(1, 2, 3)');
  });

  it('fallback nhận cả "Kết luận:" và "Answer:"', () => {
    expect(extractBoxed('...\nKết luận: đúng')).toBe('đúng');
    expect(extractBoxed('...\nAnswer: C')).toBe('C');
  });

  it('không tìm thấy gì → null', () => {
    expect(extractBoxed('Một đoạn văn không có đáp án rõ ràng.')).toBeNull();
    expect(extractBoxed('')).toBeNull();
  });

  it('boxed thiếu ngoặc đóng → coi như không hợp lệ, trả null', () => {
    expect(extractBoxed('Hỏng \\boxed{√6/3')).toBeNull();
  });
});
