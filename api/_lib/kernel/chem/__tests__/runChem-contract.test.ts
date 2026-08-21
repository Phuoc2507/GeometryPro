// Task 6 — contract 10 bài SGK (spec §13) + bài 11 chống ảo giác + các ca biên,
// cộng toàn bộ finding review phải thấy được ở tầng runChem:
// F1/F2 (4 ca G2), F8 (C% trừ chất rắn dư), F19 (thụ động hóa), F21–F27, §16 (R38),
// và 3 bài "giải SAI phải bị chặn" (Phần F review — domain guard end-to-end).
import { describe, it, expect } from 'vitest';
import { runChem } from '../runChem';

const answerOf = (r: ReturnType<typeof runChem>, i = 0) => r.answers[i];

describe('contract 10 bài SGK (đáp số tính tay trong spec §13)', () => {
  it('Bài 1: 5,6g Fe + CuSO4 dư → 6,4g Cu (exact 32/5)', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Fe', amount: { grams: '5,6' } },
        { op: 'species', formula: 'CuSO4', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'mass', of: 'Cu' }],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R20');
    expect(answerOf(r).exact).toBe('32/5');
    expect(answerOf(r).approx).toBeCloseTo(6.4, 12);
    expect(answerOf(r).text).toContain('6,4');
  });
  it('Bài 2: 13g Zn + HCl dư, đktc 22,4 → V(H2) = 4,48 L (112/25)', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Zn', amount: { grams: 13 } },
        { op: 'species', formula: 'HCl', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      molarVolume: 22.4,
      queries: [{ kind: 'volume_gas', of: 'H2' }],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R13');
    expect(answerOf(r).exact).toBe('112/25');
    expect(answerOf(r).approx).toBeCloseTo(4.48, 12);
    expect(answerOf(r).text).toContain('4,48');
    expect(answerOf(r).text).toContain('22,4'); // luôn ghi mốc thể tích mol
  });
  it('Bài 3: 2,4g Mg + HCl dư, đkc 24,79 (default) → V(H2) = 2,479 L (2479/1000)', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Mg', amount: { grams: '2,4' } },
        { op: 'species', formula: 'HCl', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'volume_gas', of: 'H2' }],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R11');
    expect(answerOf(r).exact).toBe('2479/1000');
    expect(answerOf(r).text).toContain('2,479');
    expect(answerOf(r).text).toContain('24,79');
  });
  it('Bài 4: 200ml NaOH 1M + 200ml HCl 1,5M → CM NaCl 0,5M (1/2); HCl dư 0,25M (1/4)', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'NaOH', amount: { solution: { molarity: 1, liters: '0,2' } } },
        { op: 'species', formula: 'HCl', amount: { solution: { molarity: '1,5', liters: '0,2' } } },
        { op: 'mix' },
      ],
      queries: [
        { kind: 'concentration', of: 'NaCl', as: 'CM' },
        { kind: 'concentration', of: 'HCl', as: 'CM' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R31');
    expect(answerOf(r, 0).exact).toBe('1/2');
    expect(answerOf(r, 0).approx).toBeCloseTo(0.5, 12);
    expect(answerOf(r, 1).exact).toBe('1/4');
    expect(answerOf(r, 1).approx).toBeCloseTo(0.25, 12);
  });
  it('Bài 5: 20,8g BaCl2 + Na2SO4 dư → m(BaSO4) = 23,3 g (233/10)', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'BaCl2', amount: { grams: '20,8' }, state: 'solution' },
        { op: 'species', formula: 'Na2SO4', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'mass', of: 'BaSO4' }],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R42');
    expect(answerOf(r).exact).toBe('233/10');
    expect(answerOf(r).text).toContain('23,3');
  });
  it('Bài 6: 5,6g Fe + 200ml HCl 1,5M → HCl dư 1/10 mol (3,65 g); V(H2)=2,24 L; m(FeCl2)=12,7 g', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Fe', amount: { grams: '5,6' } },
        { op: 'species', formula: 'HCl', amount: { solution: { molarity: '1,5', liters: '0,2' } } },
        { op: 'mix' },
      ],
      molarVolume: 22.4,
      queries: [
        { kind: 'remaining', of: 'HCl' },
        { kind: 'volume_gas', of: 'H2' },
        { kind: 'mass', of: 'FeCl2' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R14');
    expect(answerOf(r, 0).exact).toBe('1/10');
    expect(answerOf(r, 0).text).toContain('3,65');
    expect(answerOf(r, 1).exact).toBe('56/25'); // 2,24 L
    expect(answerOf(r, 1).approx).toBeCloseTo(2.24, 12);
    expect(answerOf(r, 2).exact).toBe('127/10');
    expect(answerOf(r, 2).text).toContain('12,7');
  });
  it('Bài 7: nung 50g CaCO3 → 28g CaO + 11,2 L CO2 (đktc)', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'CaCO3', amount: { grams: 50 } },
        { op: 'mix', heated: true },
      ],
      molarVolume: 22.4,
      queries: [
        { kind: 'mass', of: 'CaO' },
        { kind: 'volume_gas', of: 'CO2' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R43');
    expect(answerOf(r, 0).exact).toBe('28');
    expect(answerOf(r, 1).exact).toBe('56/5');
    expect(answerOf(r, 1).approx).toBeCloseTo(11.2, 12);
  });
  it('Bài 8: NaOH dư + 200g dd CuSO4 8% → 9,8g Cu(OH)2 (49/5)', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'CuSO4', amount: { solution_percent: { massGrams: 200, percent: 8 } } },
        { op: 'species', formula: 'NaOH', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'mass', of: 'Cu(OH)2' }],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R35');
    expect(answerOf(r).exact).toBe('49/5');
    expect(answerOf(r).text).toContain('9,8');
  });
  it('Bài 9 (định tính): FeCl3 + NaOH → phenomena "kết tủa nâu đỏ" + equation R36', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'FeCl3', state: 'solution' },
        { op: 'species', formula: 'NaOH', state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'phenomena' }, { kind: 'equation' }],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R36');
    expect(r.answers[0].text).toMatch(/kết tủa nâu đỏ/);
    expect(r.answers[1].text).toMatch(/FeCl3 \+ 3NaOH/);
    expect(r.answers[1].text).toContain('Fe(OH)3↓');
  });
  it('Bài 10: 16g Fe2O3 + CO dư (t°) → 11,2g Fe; 6,72 L CO2 (đktc)', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Fe2O3', amount: { grams: 16 } },
        { op: 'species', formula: 'CO', amount: { excess: true }, state: 'gas' },
        { op: 'mix', heated: true },
      ],
      molarVolume: 22.4,
      queries: [
        { kind: 'mass', of: 'Fe' },
        { kind: 'volume_gas', of: 'CO2' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R49');
    expect(answerOf(r, 0).exact).toBe('56/5');
    expect(answerOf(r, 0).text).toContain('11,2');
    expect(answerOf(r, 1).exact).toBe('168/25');
    expect(answerOf(r, 1).approx).toBeCloseTo(6.72, 12);
  });
});

describe('chống ảo giác & biên (plan Task 6)', () => {
  it('Bài 11: assert given_mass Cu=7g (đề bịa) với bài 1 → ok:false + violation, KHÔNG trả 6,4 êm ru', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Fe', amount: { grams: '5,6' } },
        { op: 'species', formula: 'CuSO4', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'mass', of: 'Cu' }],
      asserts: [{ kind: 'given_mass', of: 'Cu', grams: 7 }],
    });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => /given_mass/.test(v.law))).toBe(true);
    expect(r.answers).toEqual([]); // không trả đáp số khi mô hình lệch đề
  });
  it('F10: assert khớp trong tol tương đối 1e-3 thì PASS (đề GDPT làm tròn 3,72 lít)', () => {
    // 0,15 mol khí đkc: engine tính 3,7185 L; đề in "3,72 lít" — không được nổ violation oan.
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Mg', amount: { mol: '0,15' } },
        { op: 'species', formula: 'HCl', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'volume_gas', of: 'H2' }],
      asserts: [{ kind: 'given_mol', of: 'H2', mol: '0,15006' }], // lệch ~4e-4 < 1e-3
    });
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
  });
  it('Cu + HCl → noReaction có LÝ DO (dãy hoạt động), không lỗi mù', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Cu', amount: { grams: '6,4' } },
        { op: 'species', formula: 'HCl', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'phenomena' }],
    });
    expect(r.reactions).toEqual([]);
    expect(r.noReaction?.reason).toMatch(/sau.*H/i);
    expect(r.answers[0].text).toMatch(/không có phản ứng/);
  });
  it('cặp chất DB không biết & guard không giải thích được → error "ngoài phạm vi DB v0"', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'KMnO4', amount: { grams: 1 }, state: 'solution' },
        { op: 'species', formula: 'HCl', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'phenomena' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/ngoài phạm vi DB v0/);
  });
  it('query định lượng đụng chất định tính (không amount) → lỗi rõ ràng', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'FeCl3', state: 'solution' },
        { op: 'species', formula: 'NaOH', state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'mass', of: 'Fe(OH)3' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/định tính|không khai lượng/);
  });
});

describe('F1+F2 — guard G2 viết lại (4 ca bắt buộc của review)', () => {
  const mk = (m1: string, m2: string) =>
    runChem({
      ops: [
        { op: 'species', formula: m1, amount: { grams: 10 } },
        { op: 'species', formula: m2, amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'phenomena' }],
    });
  it('Cu + FeCl3: KHÔNG "không phản ứng", KHÔNG đáp số → error ngoài phạm vi', () => {
    const r = mk('Cu', 'FeCl3');
    expect(r.noReaction).toBeUndefined();
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/ngoài phạm vi/);
    expect(r.errors[0].message).toMatch(/Fe³⁺|FeCl3/);
    expect(r.answers).toEqual([]);
  });
  it('Fe + FeCl3: KHÔNG "không phản ứng" → error ngoài phạm vi', () => {
    const r = mk('Fe', 'FeCl3');
    expect(r.noReaction).toBeUndefined();
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/ngoài phạm vi/);
    expect(r.answers).toEqual([]);
  });
  it('K + CuSO4: "kim loại kiềm phản ứng với nước trước — ngoài phạm vi v0"', () => {
    const r = mk('K', 'CuSO4');
    expect(r.noReaction).toBeUndefined();
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/nước trước/);
    expect(r.errors[0].message).toMatch(/ngoài phạm vi/);
    expect(r.answers).toEqual([]);
  });
  it('Cu + FeSO4: ĐƯỢC trả "không phản ứng" đúng (muối Fe²⁺ hóa trị thấp nhất)', () => {
    const r = mk('Cu', 'FeSO4');
    expect(r.ok).toBe(true);
    expect(r.reactions).toEqual([]);
    expect(r.noReaction?.reason).toMatch(/đứng sau/);
  });
});

describe('3 bài đề VN "giải SAI phải bị chặn" (Phần F review — domain guard end-to-end)', () => {
  it('1) 5,6g Fe + 0,25 mol AgNO3 → error ngoài phạm vi (KHÔNG trả 21,6 g)', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Fe', amount: { grams: '5,6' } },
        { op: 'species', formula: 'AgNO3', amount: { mol: '0,25' }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'mass', of: 'Ag' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/ngoài phạm vi/);
    expect(r.answers).toEqual([]);
  });
  it('2) 6,72 L CO2 (đktc) + 200 ml Ca(OH)2 1M → error ngoài phạm vi (KHÔNG trả 20 g)', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'CO2', amount: { liters_gas: '6,72' } },
        { op: 'species', formula: 'Ca(OH)2', amount: { solution: { molarity: 1, liters: '0,2' } } },
        { op: 'mix' },
      ],
      molarVolume: 22.4,
      queries: [{ kind: 'mass', of: 'CaCO3' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/ngoài phạm vi/);
    expect(r.answers).toEqual([]);
  });
  it('3) nhỏ từ từ 100 ml HCl 1M vào 100 ml Na2CO3 0,6M → error ngoài phạm vi (KHÔNG trả 1,12 L)', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'HCl', amount: { solution: { molarity: 1, liters: '0,1' } } },
        { op: 'species', formula: 'Na2CO3', amount: { solution: { molarity: '0,6', liters: '0,1' } } },
        { op: 'mix' },
      ],
      molarVolume: 22.4,
      queries: [{ kind: 'volume_gas', of: 'CO2' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/ngoài phạm vi/);
    expect(r.answers).toEqual([]);
  });
  it('đối chứng: CO2 0,15 mol + Ca(OH)2 0,2 mol (CO2 hết trước) → 15 g CaCO3, guard KHÔNG chặn oan', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'CO2', amount: { mol: '0,15' } },
        { op: 'species', formula: 'Ca(OH)2', amount: { solution: { molarity: 1, liters: '0,2' } } },
        { op: 'mix' },
      ],
      queries: [{ kind: 'mass', of: 'CaCO3' }],
    });
    expect(r.ok).toBe(true);
    expect(answerOf(r).exact).toBe('15');
  });
});

describe('F8 — C% sau phản ứng trừ cả CHẤT RẮN DƯ', () => {
  it('16,8g Fe + 200g dd HCl 7,3% → C%(FeCl2) = 12,05% (exact 6350/527)', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Fe', amount: { grams: '16,8' } },
        { op: 'species', formula: 'HCl', amount: { solution_percent: { massGrams: 200, percent: '7,3' } } },
        { op: 'mix' },
      ],
      queries: [{ kind: 'concentration', of: 'FeCl2', as: 'C%' }],
    });
    expect(r.ok).toBe(true);
    expect(answerOf(r).exact).toBe('6350/527');
    expect(answerOf(r).approx).toBeCloseTo(12.0493, 3);
    expect(answerOf(r).text).toContain('12,05'); // làm tròn hiển thị 2 chữ số
  });
});

describe('F19 + §16 — thụ động hóa & điều kiện đun nóng', () => {
  it('Al + HNO3 đặc NGUỘI → noReaction "thụ động hóa"', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Al', amount: { grams: '2,7' } },
        { op: 'species', formula: 'HNO3', amount: { excess: true }, state: 'solution', variant: 'đặc' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'phenomena' }],
    });
    expect(r.ok).toBe(true);
    expect(r.noReaction?.reason).toMatch(/thụ động/);
  });
  it('Al + HNO3 đặc ĐUN NÓNG → error ngoài phạm vi (không phán "không phản ứng")', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Al', amount: { grams: '2,7' } },
        { op: 'species', formula: 'HNO3', amount: { excess: true }, state: 'solution', variant: 'đặc' },
        { op: 'mix', heated: true },
      ],
      queries: [{ kind: 'phenomena' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/ngoài phạm vi/);
  });
  it('§16.7: NH4Cl + NaOH KHÔNG đun → error "cần đun nóng nhẹ" (không rơi vào noReaction/NH4OH)', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'NH4Cl', state: 'solution' },
        { op: 'species', formula: 'NaOH', state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'phenomena' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/cần đun nóng nhẹ/);
    expect(r.noReaction).toBeUndefined();
  });
  it('NH4Cl + NaOH CÓ đun → R38, khí mùi khai (không bao giờ "kết tủa NH4OH")', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'NH4Cl', state: 'solution' },
        { op: 'species', formula: 'NaOH', state: 'solution' },
        { op: 'mix', heated: true },
      ],
      queries: [{ kind: 'phenomena' }],
    });
    expect(r.ok).toBe(true);
    expect(r.reactions[0].id).toBe('R38');
    expect(r.answers[0].text).toMatch(/mùi khai/);
    expect(r.answers[0].text).not.toMatch(/NH4OH/);
  });
});

describe('F21–F27 — lưới lỗi chuẩn', () => {
  it('F21: CM khi tổng thể tích dung dịch = 0 (cả hai khai C%) → error, KHÔNG throw', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'NaOH', amount: { solution_percent: { massGrams: 200, percent: 10 } } },
        { op: 'species', formula: 'HCl', amount: { solution_percent: { massGrams: 200, percent: '7,3' } } },
        { op: 'mix' },
      ],
      queries: [{ kind: 'concentration', of: 'NaCl', as: 'CM' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/thể tích/);
  });
  it('F22: lượng ≤ 0 và chuỗi "1.000" → plan bị từ chối', () => {
    const bad1 = runChem({
      ops: [
        { op: 'species', formula: 'Fe', amount: { grams: 0 } },
        { op: 'species', formula: 'HCl', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'mass', of: 'FeCl2' }],
    });
    expect(bad1.ok).toBe(false);
    expect(bad1.errors[0].message).toMatch(/> 0/);
    const bad2 = runChem({
      ops: [
        { op: 'species', formula: 'Fe', amount: { grams: '1.000' } },
        { op: 'species', formula: 'HCl', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'mass', of: 'FeCl2' }],
    });
    expect(bad2.ok).toBe(false);
    expect(bad2.errors[0].message).toMatch(/nghìn|phân cách/);
  });
  it('F23: mọi reactant đều excess → error "không có chất hữu hạn"', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Fe', amount: { excess: true } },
        { op: 'species', formula: 'CuSO4', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'mass', of: 'Cu' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/không có chất hữu hạn/);
  });
  it('F26: volume_gas trên chất không phải khí → error chuẩn', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Fe', amount: { grams: '5,6' } },
        { op: 'species', formula: 'HCl', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'volume_gas', of: 'FeCl2' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/không phải chất khí/);
  });
  it('F26: CM trên chất rắn → error chuẩn', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Cu', amount: { grams: '6,4' } },
        { op: 'species', formula: 'AgNO3', amount: { solution: { molarity: 1, liters: '0,1' } } },
        { op: 'mix' },
      ],
      queries: [{ kind: 'concentration', of: 'Ag', as: 'CM' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/chất rắn|trạng thái/);
  });
  it('F26: query `of` không có trong sổ cái → error chuẩn', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Fe', amount: { grams: '5,6' } },
        { op: 'species', formula: 'CuSO4', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'mass', of: 'NaNO3' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/sổ cái/);
  });
  it('query lượng chất excess (∞) → error rõ ràng, không NaN/∞', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Fe', amount: { grams: '5,6' } },
        { op: 'species', formula: 'CuSO4', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'remaining', of: 'CuSO4' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/excess|dư/);
  });
  it('đa phản ứng (Fe + HCl + CuSO4 cùng lúc) → error "đa phản ứng", không tự chọn', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Fe', amount: { grams: '5,6' } },
        { op: 'species', formula: 'HCl', amount: { excess: true }, state: 'solution' },
        { op: 'species', formula: 'CuSO4', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'phenomena' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/đa phản ứng/);
  });
  it('≥ 2 op mix hoặc mix.of → error v1', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Fe', amount: { grams: '5,6' } },
        { op: 'mix' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'phenomena' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/v1/);
    const r2 = runChem({
      ops: [
        { op: 'species', formula: 'Fe', amount: { grams: '5,6' } },
        { op: 'mix', of: ['Fe'] },
      ],
      queries: [{ kind: 'phenomena' }],
    });
    expect(r2.ok).toBe(false);
    expect(r2.errors[0].message).toMatch(/v1/);
  });
  it('hydrat đưa vào mix → error; KHÔNG mix thì tính mol/M bình thường', () => {
    const bad = runChem({
      ops: [
        { op: 'species', formula: 'CuSO4.5H2O', amount: { grams: 25 } },
        { op: 'species', formula: 'NaOH', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      queries: [{ kind: 'mass', of: 'Cu(OH)2' }],
    });
    expect(bad.ok).toBe(false);
    expect(bad.errors[0].message).toMatch(/hydrat/i);
    const conv = runChem({
      ops: [{ op: 'species', formula: 'CuSO4.5H2O', amount: { grams: 25 } }],
      queries: [{ kind: 'mol', of: 'CuSO4.5H2O' }],
    });
    expect(conv.ok).toBe(true);
    expect(conv.answers[0].exact).toBe('1/10'); // M = 250
  });
  it('F20: muối tan khai EXCESS thiếu state → suy "dung dịch dư" (nghĩa duy nhất hợp lý), không chặn oan', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'Fe', amount: { grams: '5,6' } },
        { op: 'species', formula: 'CuSO4', amount: { excess: true } }, // thiếu state
        { op: 'mix' },
      ],
      queries: [{ kind: 'mass', of: 'Cu' }],
    });
    expect(r.ok).toBe(true);
    expect(r.answers[0].exact).toBe('32/5');
  });
  it('F20: muối tan cân GAM đổ vào mix có dung dịch mà không khai state → error bắt LLM khai', () => {
    const r = runChem({
      ops: [
        { op: 'species', formula: 'NaCl', amount: { grams: 10 } }, // thiếu state — mơ hồ (rắn hay dd?)
        { op: 'species', formula: 'AgNO3', amount: { solution: { molarity: 1, liters: '0,1' } } },
        { op: 'mix' },
      ],
      queries: [{ kind: 'mass', of: 'AgCl' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/state|trạng thái/);
  });
});
