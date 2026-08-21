import { describe, expect, it } from 'vitest';
import { normalizePrompt } from '../promptNormalize.js';

describe('normalizePrompt', () => {
  it('bỏ khác biệt hoa/thường + khoảng trắng thừa', () => {
    expect(normalizePrompt('  Cho hình   chóp  S.ABCD\n\t ')).toBe('cho hình chóp s.abcd');
  });

  it('hai đề chỉ khác định dạng → cùng khoá', () => {
    const a = normalizePrompt('Cho hình chóp S.ABCD.');
    const b = normalizePrompt('cho   hình chóp s.abcd.');
    expect(a).toBe(b);
  });

  it('GIỮ NGUYÊN số — "cạnh 3" và "cạnh 5" là hai khoá khác nhau', () => {
    expect(normalizePrompt('cạnh 3')).not.toBe(normalizePrompt('cạnh 5'));
    expect(normalizePrompt('cạnh 3')).toContain('3');
  });

  it('đầu vào không phải chuỗi / rỗng → ""', () => {
    expect(normalizePrompt(null)).toBe('');
    expect(normalizePrompt(undefined)).toBe('');
    expect(normalizePrompt(123)).toBe('');
    expect(normalizePrompt('   ')).toBe('');
  });

  it('tất định — gọi nhiều lần cho cùng kết quả', () => {
    const p = 'Tính THỂ TÍCH khối chóp   đều';
    expect(normalizePrompt(p)).toBe(normalizePrompt(p));
  });

  // Fix #1 (/api/solve): guard tái dùng đáp engine dùng đúng normalizePrompt để so khớp
  // geometry.engineProblem với đề hiện tại. Test khoá HAI đầu của hợp đồng đó:
  describe('hợp đồng guard tái dùng đáp engine ở /api/solve', () => {
    it('CÙNG một hình, ĐỔI câu hỏi → khoá KHÁC ⇒ guard phải giải lại (không dùng đáp cũ)', () => {
      const drawn = 'Cho hình chóp S.ABCD. Tính khoảng cách từ A đến mặt phẳng (SBC).';
      const edited = 'Cho hình chóp S.ABCD. Tính thể tích khối chóp.';
      expect(normalizePrompt(drawn)).not.toBe(normalizePrompt(edited));
    });
    it('đề GIỐNG (chỉ khác hoa/thường/khoảng trắng) → khoá TRÙNG ⇒ guard cho tái dùng (không dịch lại)', () => {
      const drawn = 'Cho hình chóp S.ABCD. Tính khoảng cách từ A đến (SBC).';
      const resent = '  cho hình chóp s.abcd.  tính khoảng cách từ a đến (SBC). ';
      expect(normalizePrompt(drawn)).toBe(normalizePrompt(resent));
    });
  });
});
