// Unit tests engine hữu cơ (spec §12): các route/nhánh KHÔNG tốn bài contract —
// route O bảo toàn O2, ankin, axit, mode-B-có-M, oxygen_needed, degree_unsaturation,
// suy biến/lỗi (2 route O lệch, M không chia hết, thiếu dữ kiện O), atom-map robustness,
// đa nghiệm H5, guard H2/H4, và membership TAG hữu cơ (§13).
import { describe, it, expect } from 'vitest';
import { runChem } from '../runChem';
import { hasOrganicOp } from '../organic';
import { ORGANIC_TAGS, TAG_4TIER, ORGANIC_OP_NAMES } from '../organicSchema';

const ans = (r: ReturnType<typeof runChem>, i = 0) => r.answers[i];
const byKind = (r: ReturnType<typeof runChem>, k: string) => r.answers.find((a) => (a.query as { kind?: string })?.kind === k);

describe('route O — bảo toàn O2 (route b) + tự kiểm o2', () => {
  it('C,H,O; co2 0,2; h2o 0,3; o2 tiêu thụ 0,3 → C2H6O (nO từ O2, valence chốt duy nhất)', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', contains: ['C', 'H', 'O'] },
        { op: 'combustion', of: 'A', co2: { mol: '0,2' }, h2o: { mol: '0,3' }, o2: { mol: '0,3' } },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }, { kind: 'empirical_formula', of: 'A' }],
    });
    expect(r.ok).toBe(true);
    expect(byKind(r, 'molecular_formula')!.exact).toBe('C2H6O');
    expect(byKind(r, 'empirical_formula')!.exact).toBe('C2H6O');
  });
});

describe('dãy đồng đẳng — ankin & axit (không tốn bài contract)', () => {
  it('ankin C2H2: co2 0,2; h2o 0,1 → C2H2', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', class: 'ankin' },
        { op: 'combustion', of: 'A', co2: { mol: '0,2' }, h2o: { mol: '0,1' } },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.ok).toBe(true);
    expect(ans(r).exact).toBe('C2H2');
  });

  it('axit no đơn: 6g A; co2 0,2 → C2H4O2 (M=60 pin qua khối lượng)', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', class: 'axit-no-don', sample: { grams: 6 } },
        { op: 'combustion', of: 'A', co2: { mol: '0,2' } },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.ok).toBe(true);
    expect(ans(r).exact).toBe('C2H4O2');
  });
});

describe('mode B có M (molar_mass) + oxygen_needed + degree_unsaturation', () => {
  it('este + M=74 → C3H6O2', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', class: 'este-no-don' },
        { op: 'combustion', of: 'A', co2: { mol: '0,3' } },
        { op: 'measure', of: 'A', kind: 'molar_mass', value: 74 },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.ok).toBe(true);
    expect(ans(r).exact).toBe('C3H6O2');
  });

  it('oxygen_needed: C2H6 (O1) cần n(O2)=7/20 mol', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', contains: ['C', 'H'] },
        { op: 'combustion', of: 'A', co2: { grams: '8,8' }, h2o: { grams: '5,4' } },
        { op: 'measure', of: 'A', kind: 'vapor_density', ref: 'H2', value: 15 },
      ],
      queries: [{ kind: 'oxygen_needed', of: 'A', as: 'mol' }],
    });
    expect(r.ok).toBe(true);
    expect(ans(r).exact).toBe('7/20');
    expect(ans(r).approx).toBeCloseTo(0.35, 12);
  });

  it('degree_unsaturation: C2H4O2 → k=1', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', contains: ['C', 'H', 'O'], sample: { grams: 3 } },
        { op: 'combustion', of: 'A', co2: { grams: '4,4' }, h2o: { grams: '1,8' } },
        { op: 'measure', of: 'A', kind: 'vapor_density', ref: 'air', value: '2,07', tol: '0,01' },
      ],
      queries: [{ kind: 'degree_unsaturation', of: 'A' }],
    });
    expect(r.ok).toBe(true);
    expect(ans(r).exact).toBe('1');
    expect(ans(r).approx).toBe(1);
  });
});

describe('suy biến / lỗi — thà từ chối còn hơn bịa', () => {
  it('H4: hai route O (khối lượng vs O2) LỆCH → violation/error, không CTPT', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', contains: ['C', 'H', 'O'], sample: { grams: 3 } },
        { op: 'combustion', of: 'A', co2: { grams: '4,4' }, h2o: { grams: '1,8' }, o2: { mol: '0,2' } },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.length + r.violations.length).toBeGreaterThan(0);
  });

  it('M không chia hết cho M_ĐGN (CH3, M=15) với M=50 → không có CTPT', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', contains: ['C', 'H'] },
        { op: 'combustion', of: 'A', co2: { grams: '8,8' }, h2o: { grams: '5,4' } },
        { op: 'measure', of: 'A', kind: 'molar_mass', value: 50 },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.ok).toBe(false);
  });

  it('class=none, KHÔNG contains & KHÔNG route O → từ chối (engine không mặc định O=0)', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A' },
        { op: 'combustion', of: 'A', co2: { mol: '0,2' }, h2o: { mol: '0,2' } },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('§10.4: khai chỉ C,H nhưng khối lượng mẫu lộ oxi → bắt lỗi khai thiếu O', () => {
    // 4,6g C2H6O nhưng khai contains ['C','H']: mC+mH = 2,4+0,6 = 3,0 < 4,6 ⇒ có O.
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', contains: ['C', 'H'], sample: { grams: '4,6' } },
        { op: 'combustion', of: 'A', co2: { mol: '0,2' }, h2o: { mol: '0,3' } },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.ok).toBe(false);
  });
});

describe('VỪA-1 (review 2026-08-22): nhánh buildModel-fail trả ĐÚNG KHUÔN, KHÔNG leak "finish is not defined"', () => {
  // Trước fix: organic.ts:421 gọi `finish(false)` (hàm không tồn tại) ⇒ ReferenceError,
  // bị outer-catch của runOrganic nuốt thành error "lỗi engine hữu cơ: finish is not defined".
  // Nay trả thẳng { ok:false, ... } đúng shape ⇒ chỉ còn lý do hóa học SẠCH, không leak.
  it('measure vapor_density ref LẠ (khí ngoài bảng SGK: "Xe") ⇒ ok:false với lý do sạch, KHÔNG "finish is not defined"', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', class: 'ankan' },
        { op: 'combustion', of: 'A', co2: { mol: '0,3' }, h2o: { mol: '0,4' } },
        { op: 'measure', of: 'A', kind: 'vapor_density', ref: 'Xe', value: '2' },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors.some((e) => /nguyên tố lạ|không hợp lệ/i.test(e.message))).toBe(true);
    expect(r.errors.every((e) => !/finish is not defined/i.test(e.message))).toBe(true);
  });

  it('measure vapor_density THIẾU ref ⇒ ok:false báo "thiếu ref", KHÔNG "finish is not defined"', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', class: 'ankan' },
        { op: 'combustion', of: 'A', co2: { mol: '0,3' }, h2o: { mol: '0,4' } },
        { op: 'measure', of: 'A', kind: 'vapor_density', value: '2' },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /thiếu.*ref|ref/i.test(e.message))).toBe(true);
    expect(r.errors.every((e) => !/finish is not defined/i.test(e.message))).toBe(true);
  });
});

describe('chống ảo giác — given_mass sản phẩm đốt', () => {
  it('O1 + đề BỊA given_mass(CO2)=10 (thật 8,8) → ok:false + violation', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', contains: ['C', 'H'] },
        { op: 'combustion', of: 'A', co2: { grams: '8,8' }, h2o: { grams: '5,4' } },
        { op: 'measure', of: 'A', kind: 'vapor_density', ref: 'H2', value: 15 },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
      asserts: [{ kind: 'given_mass', of: 'CO2', grams: 10 }],
    });
    expect(r.ok).toBe(false);
    expect(r.violations.length).toBeGreaterThan(0);
  });

  it('O1 + given_mass(CO2)=8,8 ĐÚNG → ok:true', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', contains: ['C', 'H'] },
        { op: 'combustion', of: 'A', co2: { grams: '8,8' }, h2o: { grams: '5,4' } },
        { op: 'measure', of: 'A', kind: 'vapor_density', ref: 'H2', value: 15 },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
      asserts: [{ kind: 'given_mass', of: 'CO2', grams: '8,8' }],
    });
    expect(r.ok).toBe(true);
    expect(ans(r).exact).toBe('C2H6');
  });
});

describe('contains suy tự động — O từ khối lượng mẫu, không cần khai contains', () => {
  it('class=none KHÔNG contains nhưng có m mẫu 3g (route a) → C2H4O2', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', sample: { grams: 3 } },
        { op: 'combustion', of: 'A', co2: { grams: '4,4' }, h2o: { grams: '1,8' } },
        { op: 'measure', of: 'A', kind: 'vapor_density', ref: 'air', value: '2,07', tol: '0,01' },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.ok).toBe(true);
    expect(ans(r).exact).toBe('C2H4O2');
  });
});

describe('H5 — đa nghiệm class k=1 thiếu neo ⇒ LIỆT KÊ (không bail cụt)', () => {
  it('anken chỉ có co2 (không sample/M) → candidates C2H4,C3H6,… + violation', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', class: 'anken' },
        { op: 'combustion', of: 'A', co2: { mol: '0,2' } },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.ok).toBe(false);
    const mf = ans(r);
    expect(mf.candidates).toBeDefined();
    expect(mf.candidates).toContain('C2H4');
    expect(mf.candidates).toContain('C3H6');
    expect(r.violations.length).toBeGreaterThan(0);
  });
});

describe('H1 — atom-map match bền với biến thể chuỗi công thức', () => {
  it('O7 nhưng query muối viết "C2H3O2Na" (chuỗi engine ráp) → vẫn 41/5', () => {
    const r = runChem({
      ops: [
        { op: 'ester_hydrolysis', ester: 'CH3COOC2H5', acid: 'CH3COOH', alcohol: 'C2H5OH', esterAmount: { grams: '8,8' }, baseAmount: { excess: true } },
      ],
      queries: [{ kind: 'mass', of: 'C2H3O2Na' }],
    });
    expect(r.ok).toBe(true);
    expect(ans(r).exact).toBe('41/5');
  });

  it('O7 query khối lượng ancol C2H5OH → 4,6g (23/5)', () => {
    const r = runChem({
      ops: [
        { op: 'ester_hydrolysis', ester: 'CH3COOC2H5', acid: 'CH3COOH', alcohol: 'C2H5OH', esterAmount: { grams: '8,8' }, baseAmount: { excess: true } },
      ],
      queries: [{ kind: 'mass', of: 'C2H5OH' }],
    });
    expect(r.ok).toBe(true);
    expect(ans(r).exact).toBe('23/5');
    expect(ans(r).approx).toBeCloseTo(4.6, 12);
  });
});

describe('dispatch + refine cấp plan', () => {
  it('hasOrganicOp phát hiện đúng op hữu cơ', () => {
    expect(hasOrganicOp({ ops: [{ op: 'organic_unknown', name: 'A', class: 'none' }], molarVolume: 24.79, queries: [{ kind: 'molecular_formula', of: 'A' }], asserts: [] } as never)).toBe(true);
  });

  it('CẤM trộn op hữu cơ với op vô cơ (species) → plan không hợp lệ', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', contains: ['C', 'H'] },
        { op: 'species', formula: 'Fe', amount: { grams: 5.6 } },
        { op: 'combustion', of: 'A', co2: { mol: '0,2' }, h2o: { mol: '0,3' } },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /trộn|hữu cơ|vô cơ/i.test(e.message))).toBe(true);
  });

  it('combustion.of không khớp organic_unknown.name → plan không hợp lệ', () => {
    const r = runChem({
      ops: [
        { op: 'organic_unknown', name: 'A', contains: ['C', 'H'] },
        { op: 'combustion', of: 'B', co2: { mol: '0,2' }, h2o: { mol: '0,3' } },
      ],
      queries: [{ kind: 'molecular_formula', of: 'A' }],
    });
    expect(r.ok).toBe(false);
  });
});

describe('§13 — registry TAG hữu cơ (isKnownTag không drop lặng lẽ)', () => {
  it('9 tag, đúng format 4 tầng hoa/<lop>/<chuong>/<skill>, không trùng', () => {
    expect(ORGANIC_TAGS.length).toBe(9);
    for (const t of ORGANIC_TAGS) expect(TAG_4TIER.test(t)).toBe(true);
    expect(new Set(ORGANIC_TAGS).size).toBe(ORGANIC_TAGS.length);
  });

  it('tag thủy phân este mà record động dùng nằm trong registry', () => {
    expect(ORGANIC_TAGS).toContain('hoa/12/este-lipit/thuy-phan-este');
  });

  it('ORGANIC_OP_NAMES gồm đúng 4 op hữu cơ', () => {
    expect([...ORGANIC_OP_NAMES].sort()).toEqual(['combustion', 'ester_hydrolysis', 'measure', 'organic_unknown']);
  });
});
