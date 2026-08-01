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
});
