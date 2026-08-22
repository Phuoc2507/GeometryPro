// Contract 10 bài HÓA HỮU CƠ tầng 1 (spec §11: O1–O10) + bonus chống ảo giác
// + ca H2 (ester đọc nhầm nửa ancol → guard độc lập bắt) + ca H4 (nO < 0 → violation).
// Đáp số là PHÂN SỐ EXACT (41/5, 36/5, …) và CHUỖI CTPT — KHÔNG so float.
// Black-box qua runChem: LLM chỉ DỊCH đề → khai số đo; engine suy CTPT tất định.
import { describe, it, expect } from 'vitest';
import { runChem } from '../runChem';

const ans = (r: ReturnType<typeof runChem>, i = 0) => r.answers[i];
const answerFor = (r: ReturnType<typeof runChem>, kind: string) =>
  r.answers.find((a) => (a.query as { kind?: string })?.kind === kind);

describe('Hữu cơ — 10 bài contract (spec §11)', () => {
  it('O1 — Đốt HC, d/H2=15 → C2H6', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', contains: ['C', 'H'] },
        { op: 'combustion', of: 'A', co2: { grams: '8,8' }, h2o: { grams: '5,4' } },
        { op: 'measure', of: 'A', kind: 'vapor_density', ref: 'H2', value: 15 },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.ok).toBe(true);
    expect(ans(r).exact).toBe('C2H6');
    expect(ans(r).text).toContain('C2H6');
  });

  it('O2 — Đốt C,H,O, d/kk=2,07 (tol) → C2H4O2; CTĐGN CH2O', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', contains: ['C', 'H', 'O'], sample: { grams: 3 } },
        { op: 'combustion', of: 'A', co2: { grams: '4,4' }, h2o: { grams: '1,8' } },
        { op: 'measure', of: 'A', kind: 'vapor_density', ref: 'air', value: '2,07', tol: '0,01' },
      ],
      queries: [
        { kind: 'molecular_formula', of: 'A' },
        { kind: 'empirical_formula', of: 'A' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(answerFor(r, 'molecular_formula')!.exact).toBe('C2H4O2');
    expect(answerFor(r, 'empirical_formula')!.exact).toBe('CH2O');
  });

  it('O3 — Ankan hiệu mol (0,3 CO2; 0,4 H2O) → C3H8', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', class: 'ankan' },
        { op: 'combustion', of: 'A', co2: { mol: '0,3' }, h2o: { mol: '0,4' } },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.ok).toBe(true);
    expect(ans(r).exact).toBe('C3H8');
  });

  it('O4 — Anken neo n_A, 22,4 → C4H8; m(H2O)=36/5=7,2g', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', class: 'anken', sample: { mol: '0,1' } },
        { op: 'combustion', of: 'A', co2: { liters_gas: '8,96' } },
      ],
      molarVolume: 22.4,
      queries: [
        { kind: 'molecular_formula', of: 'A' },
        { kind: 'mass', of: 'H2O' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(answerFor(r, 'molecular_formula')!.exact).toBe('C4H8');
    const mH2O = answerFor(r, 'mass')!;
    expect(mH2O.exact).toBe('36/5');
    expect(mH2O.approx).toBeCloseTo(7.2, 12);
    expect(mH2O.text).toContain('7,2');
  });

  it('O5 — Amin no đơn (có N2), hai route n_A → C2H7N', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', class: 'amin-no-don' },
        { op: 'combustion', of: 'A', co2: { mol: '0,2' }, h2o: { mol: '0,35' }, n2: { mol: '0,05' } },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.ok).toBe(true);
    expect(ans(r).exact).toBe('C2H7N');
  });

  it('O6 — Đa nghiệm (nCO2=nH2O, không tỉ khối) → CTĐGN CH2 + danh sách + violation', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', contains: ['C', 'H'] },
        { op: 'combustion', of: 'A', co2: { mol: '0,2' }, h2o: { mol: '0,2' } },
      ],
      queries: [
        { kind: 'empirical_formula', of: 'A' },
        { kind: 'molecular_formula', of: 'A' },
      ],
    });
    expect(r.ok).toBe(false); // đa nghiệm ⇒ không chốt được CTPT
    expect(answerFor(r, 'empirical_formula')!.exact).toBe('CH2'); // CTĐGN vẫn chốt được
    const mf = answerFor(r, 'molecular_formula')!;
    expect(mf.candidates).toBeDefined();
    expect(mf.candidates).toContain('C2H4');
    expect(mf.candidates).toContain('C3H6');
    expect(mf.candidates).toContain('C4H8');
    expect(mf.candidates).not.toContain('CH2'); // C1H2 (cacben) bị loại — HC k≥1 cần x≥2
    expect(r.violations.length).toBeGreaterThan(0);
  });

  it('O7 — Este thủy phân NaOH (react v0) → m(CH3COONa)=41/5=8,2g [H1 atom-map match]', () => {
    const r = runChem({
      ops: [
        {
          op: 'ester_hydrolysis', ester: 'CH3COOC2H5', acid: 'CH3COOH', alcohol: 'C2H5OH',
          esterAmount: { grams: '8,8' }, baseAmount: { excess: true },
        },
      ],
      queries: [{ kind: 'mass', of: 'CH3COONa' }],
    });
    expect(r.ok).toBe(true);
    expect(ans(r).exact).toBe('41/5'); // muối engine ráp "C2H3O2Na" vẫn khớp query "CH3COONa"
    expect(ans(r).approx).toBeCloseTo(8.2, 12);
    expect(ans(r).text).toContain('8,2');
  });

  it('O8 — Este no đơn, đốt, DUYỆT nghiệm nguyên → C3H6O2', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', class: 'este-no-don', sample: { grams: '7,4' } },
        { op: 'combustion', of: 'A', co2: { mol: '0,3' } },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.ok).toBe(true);
    expect(ans(r).exact).toBe('C3H6O2');
  });

  it('O9 — Ankan đkc 24,79; nước đo bằng khối lượng → C4H10', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', class: 'ankan' },
        { op: 'combustion', of: 'A', co2: { liters_gas: '9,916' }, h2o: { grams: 9 } },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.ok).toBe(true);
    expect(ans(r).exact).toBe('C4H10');
  });

  it('O10 — Ancol no đơn (O=1 theo class) → C2H6O', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', class: 'ancol-no-don' },
        { op: 'combustion', of: 'A', co2: { mol: '0,2' }, h2o: { mol: '0,3' } },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.ok).toBe(true);
    expect(ans(r).exact).toBe('C2H6O');
  });
});

describe('Hữu cơ — bonus chống ảo giác (given_formula)', () => {
  it('O1 + đề BỊA CTPT là C3H8 → ok:false + violation (engine tính C2H6 ≠ C3H8)', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', contains: ['C', 'H'] },
        { op: 'combustion', of: 'A', co2: { grams: '8,8' }, h2o: { grams: '5,4' } },
        { op: 'measure', of: 'A', kind: 'vapor_density', ref: 'H2', value: 15 },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
      asserts: [{ kind: 'given_formula', of: 'A', formula: 'C3H8' }],
    });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => /C3H8|C2H6|given_formula/i.test(v.law + v.detail))).toBe(true);
  });

  it('O1 + given_formula ĐÚNG C2H6 → vẫn ok:true', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', contains: ['C', 'H'] },
        { op: 'combustion', of: 'A', co2: { grams: '8,8' }, h2o: { grams: '5,4' } },
        { op: 'measure', of: 'A', kind: 'vapor_density', ref: 'H2', value: 15 },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
      asserts: [{ kind: 'given_formula', of: 'A', formula: 'C2H6' }],
    });
    expect(r.ok).toBe(true);
    expect(ans(r).exact).toBe('C2H6');
  });
});

describe('Hữu cơ — H2 (guard độc lập ester): đọc nhầm nửa ancol phải bị bắt', () => {
  it('ester đúng + acid đúng + ancol SAI (CH3OH thay C2H5OH) → violation, KHÔNG trả 9,6g', () => {
    const r = runChem({
      ops: [
        {
          op: 'ester_hydrolysis', ester: 'CH3COOC2H5', acid: 'CH3COOH', alcohol: 'CH3OH',
          esterAmount: { grams: '8,8' }, baseAmount: { excess: true },
        },
      ],
      queries: [{ kind: 'mass', of: 'CH3COONa' }],
    });
    expect(r.ok).toBe(false);
    expect(r.violations.length).toBeGreaterThan(0);
    // TUYỆT ĐỐI không được trả 48/5 (9,6g) — con số sai âm thầm mà review cảnh báo.
    expect(r.answers.every((a) => a.exact !== '48/5')).toBe(true);
  });

  it('ester đúng + acid đúng + ancol ĐÚNG → guard PASS, m(muối)=41/5', () => {
    const r = runChem({
      ops: [
        {
          op: 'ester_hydrolysis', ester: 'CH3COOC2H5', acid: 'CH3COOH', alcohol: 'C2H5OH',
          esterAmount: { grams: '8,8' }, baseAmount: { excess: true },
        },
      ],
      queries: [{ kind: 'mass', of: 'CH3COONa' }],
    });
    expect(r.ok).toBe(true);
    expect(ans(r).exact).toBe('41/5');
  });

  // CAO-1 (review 2026-08-22): trước fix, acid OPTIONAL ⇒ đường mặc định (KHÔNG khai acid) TẮT
  // guard ⇒ đọc nhầm ancol CH3OH trả 48/5 (9,6g) mù với ok:true. Nay acid BẮT BUỘC ⇒ schema
  // TỪ CHỐI ngay khi thiếu acid: guard không còn thủng theo mặc định, KHÔNG serve số sai âm thầm.
  it('CAO-1: THIẾU acid (đúng ca review, ancol đọc nhầm CH3OH) ⇒ schema từ chối ok:false, KHÔNG trả 9,6g (48/5)', () => {
    const r = runChem({
      ops: [
        {
          op: 'ester_hydrolysis', ester: 'CH3COOC2H5', alcohol: 'CH3OH',
          esterAmount: { grams: '8,8' }, baseAmount: { excess: true },
        },
      ],
      queries: [{ kind: 'mass', of: 'C3H5O2Na' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors.some((e) => /không hợp lệ|acid/i.test(e.message))).toBe(true);
    // TUYỆT ĐỐI không lọt 48/5 (9,6g) — con số sai âm thầm mà review cảnh báo.
    expect(r.answers.every((a) => a.exact !== '48/5')).toBe(true);
  });
});

describe('Hữu cơ — H4 (nO < 0): khối lượng C+H vượt mẫu → dữ kiện mâu thuẫn', () => {
  it('m mẫu 2g nhưng mC+mH=2,6g → nO<0 → violation, không bịa CTPT', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', contains: ['C', 'H', 'O'], sample: { grams: 2 } },
        { op: 'combustion', of: 'A', co2: { grams: '8,8' }, h2o: { grams: '1,8' } },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.ok).toBe(false);
    expect(r.violations.length + r.errors.length).toBeGreaterThan(0);
  });
});
