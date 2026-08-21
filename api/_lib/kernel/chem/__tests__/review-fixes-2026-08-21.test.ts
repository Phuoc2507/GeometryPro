// Test khoá cho các finding review đã DUYỆT (docs/superpowers/reviews/2026-08-21-chem-code-review.md):
//   CAO-1 spectator ẩn, CAO-2 axit đặc trao đổi, VỪA-5 volume_gas(H2O),
//   VỪA-6 chia-0 thật (Na+H2O hỏi CM), THẤP-7 G2 câu chữ, THẤP-8 tol chuỗi.
// TDD: mỗi lỗi khoá TRƯỚC (đỏ) rồi vá (xanh).
import { describe, it, expect } from 'vitest';
import { runChem } from '../runChem';

const answerOf = (r: ReturnType<typeof runChem>, i = 0) => r.answers[i];

describe('CAO-1 — spectator ẩn: species ngoài record phải chứng minh TRƠ', () => {
  it('Al + Fe + CuSO4 dư: Al KHÔNG trơ (Al đẩy Cu) → error ngoài phạm vi, KHÔNG trả 6,4g', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Al', amount: { grams: '2,7' } },
        { op: 'species', formula: 'Fe', amount: { grams: '5,6' } },
        { op: 'species', formula: 'CuSO4', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'mass', of: 'Cu' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/ngoài phạm vi/);
    // TUYỆT ĐỐI không được trả 6,4g Cu như thể Al là khán giả trơ
    expect(r.answers).toEqual([]);
  });

  it('P4 — Fe + CuSO4 dư + NaCl (NaCl trơ THẬT): vẫn ra 6,4g Cu (spectator hợp lệ không bị chặn oan)', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Fe', amount: { grams: '5,6' } },
        { op: 'species', formula: 'CuSO4', amount: { excess: true }, state: 'solution' },
        { op: 'species', formula: 'NaCl', amount: { grams: 5 }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'mass', of: 'Cu' }],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R20');
    expect(answerOf(r).exact).toBe('32/5');
    expect(answerOf(r).text).toContain('6,4');
  });

  it('Cu + Fe + HCl dư (Cu đứng sau H — spectator kim loại TRƠ): ra V(H2), KHÔNG chặn oan', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Cu', amount: { grams: '6,4' } },
        { op: 'species', formula: 'Fe', amount: { grams: '5,6' } },
        { op: 'species', formula: 'HCl', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      molarVolume: 22.4,
      queries: [{ kind: 'volume_gas', of: 'H2' }],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R14');
    expect(answerOf(r).exact).toBe('56/25'); // n(Fe)=0,1 → n(H2)=0,1 → 2,24 L
    expect(answerOf(r).text).toContain('2,24');
  });
});

describe('CAO-2 — axit đặc trong nhánh trao đổi: KHÔNG phán "không phản ứng"', () => {
  it('NaCl (r) + H2SO4 đặc, t° → error ngoài phạm vi (điều chế HCl), KHÔNG "không phản ứng"', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'NaCl', amount: { grams: 10 }, state: 'solid' },
        { op: 'species', formula: 'H2SO4', amount: { excess: true }, variant: 'đặc' },
        { op: 'mix', heated: true },
      ],
      queries: [{ kind: 'phenomena' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/ngoài phạm vi/);
    expect(r.noReaction).toBeUndefined();
  });

  it('KNO3 (r) + H2SO4 đặc, t° → error ngoài phạm vi (điều chế HNO3), KHÔNG "không phản ứng"', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'KNO3', amount: { grams: 10 }, state: 'solid' },
        { op: 'species', formula: 'H2SO4', amount: { excess: true }, variant: 'đặc' },
        { op: 'mix', heated: true },
      ],
      queries: [{ kind: 'phenomena' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/ngoài phạm vi/);
    expect(r.noReaction).toBeUndefined();
  });
});

describe('VỪA-5 — volume_gas dùng GAS_SET (H2O không phải khí đktc)', () => {
  it('CuO + H2 dư (t°) hỏi V(H2O): error "H2O không phải chất khí ở điều kiện thường"', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'CuO', amount: { grams: 16 } },
        { op: 'species', formula: 'H2', amount: { excess: true }, state: 'gas' },
        { op: 'mix', heated: true },
      ],
      molarVolume: 22.4,
      queries: [{ kind: 'volume_gas', of: 'H2O' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/H2O không phải chất khí ở điều kiện thường/);
  });
});

describe('VỪA-6 — chia-0 THẬT: Na + H2O hỏi CM (không có dung dịch nào góp thể tích)', () => {
  it('Na + H2O dư hỏi CM(NaOH) → error nhánh chặn chia-0 (F21), KHÔNG nhánh "không rõ thể tích"', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Na', amount: { mol: '0,2' } },
        { op: 'species', formula: 'H2O', amount: { excess: true } },
        { op: 'mix' },
      ],
      queries: [{ kind: 'concentration', of: 'NaOH', as: 'CM' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/chia 0|thể tích dung dịch bằng 0/);
    expect(r.errors[0].message).not.toMatch(/không rõ thể tích/);
  });
});

describe('THẤP-8 — tol assert nhận cả chuỗi "0,001" như Qty', () => {
  it('given_mol với tol chuỗi "0,001": khớp trong dung sai → ok, không nổ violation oan', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Mg', amount: { mol: '0,15' } },
        { op: 'species', formula: 'HCl', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'volume_gas', of: 'H2' }],
      asserts: [{ kind: 'given_mol', of: 'H2', mol: '0,15006', tol: '0,001' }],
    });
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
  });
});
