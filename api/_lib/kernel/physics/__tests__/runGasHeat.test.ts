// Entry test — H3 (cổng abstain/violation DƯƠNG TÍNH: >1 ẩn / 0 ẩn / latent-trong-cân-bằng / ref sai
// loại / T(K)≤0 / m≤0-Tf-ngoài-khoảng / đẳng-quá-trình mâu thuẫn) + sanity end-to-end + guard KHÔNG
// import solver1d / KHÔNG gọi sqrt. "Thà từ chối còn hơn bịa" — PHYSICAL_VIOLATIONS ⇒ KHÔNG serve.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runGasHeat } from '../runGasHeat';

const HERE = dirname(fileURLToPath(import.meta.url));

describe('runGasHeat — sanity end-to-end + không throw', () => {
  it('G1 chạy trơn: ok, đúng 1 đáp, meta.knowledgeTags truyền qua', () => {
    const r = runGasHeat({
      problemName: 'p', knowledgeTags: ['ly/12/khi-ly-tuong/dang-nhiet'],
      ops: [
        { op: 'state', name: 's1', p: { value: 2, unit: 'atm' }, V: { value: 6, unit: 'L' } },
        { op: 'state', name: 's2', p: { value: 5, unit: 'atm' } },
        { op: 'process', kind: 'isothermal', from: 's1', to: 's2' },
      ],
      queries: [{ kind: 'state_value', of: 's2', quantity: 'V', unit: 'L' }],
    });
    expect(r.ok).toBe(true);
    expect(r.answers.length).toBe(1);
    expect(r.meta.knowledgeTags).toEqual(['ly/12/khi-ly-tuong/dang-nhiet']);
    expect(r.meta.atmInPa).toBe(101325);
    expect(r.geometry).toBeNull(); // D34-a: geometry cắt hẳn v1
  });

  it('plan rác không ném — trả errors có cấu trúc', () => {
    const r = runGasHeat({ problemName: '', ops: [], queries: [] } as unknown);
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.answers.length).toBe(0);
  });
});

describe('H3 — cổng superRefine (abstain trước khi giải): issue tiếng Việt rõ', () => {
  it('>1 ẩn cho quá trình ⇒ từ chối', () => {
    const r = runGasHeat({
      problemName: 'hai-an',
      ops: [
        { op: 'state', name: 's1', p: { value: 2, unit: 'atm' }, V: { value: 6, unit: 'L' } },
        { op: 'state', name: 's2' }, // thiếu CẢ p và V
        { op: 'process', kind: 'isothermal', from: 's1', to: 's2' },
      ],
      queries: [{ kind: 'state_value', of: 's2', quantity: 'V', unit: 'L' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /một ẩn/i.test(e.message))).toBe(true);
  });

  it('0 ẩn cho quá trình ⇒ từ chối', () => {
    const r = runGasHeat({
      problemName: 'khong-an',
      ops: [
        { op: 'state', name: 's1', p: { value: 2, unit: 'atm' }, V: { value: 6, unit: 'L' } },
        { op: 'state', name: 's2', p: { value: 5, unit: 'atm' }, V: { value: 3, unit: 'L' } },
        { op: 'process', kind: 'isothermal', from: 's1', to: 's2' },
      ],
      queries: [{ kind: 'state_value', of: 's2', quantity: 'V', unit: 'L' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /một ẩn/i.test(e.message))).toBe(true);
  });

  it('body có latent-props trong equilibrium_temp ⇒ chặn phi tuyến', () => {
    const r = runGasHeat({
      problemName: 'latent-trong-cb',
      ops: [
        { op: 'thermal_body', name: 'a', mass: { value: 1, unit: 'kg' }, c: { value: 4200 }, T0: { value: 80, unit: 'C' }, latentMelt: { value: 340000 }, meltTemp: { value: 0, unit: 'C' } },
        { op: 'thermal_body', name: 'b', mass: { value: 1, unit: 'kg' }, c: { value: 4200 }, T0: { value: 20, unit: 'C' } },
      ],
      queries: [{ kind: 'equilibrium_temp', unit: 'C' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /chuyển thể|latent|phi tuyến/i.test(e.message))).toBe(true);
  });

  it('ref sai loại (heat.of trỏ state) ⇒ từ chối', () => {
    const r = runGasHeat({
      problemName: 'ref-sai',
      ops: [
        { op: 'state', name: 's1', p: { value: 2, unit: 'atm' }, V: { value: 6, unit: 'L' } },
        { op: 'thermal_body', name: 'B', mass: { value: 1, unit: 'kg' }, c: { value: 4200 } },
      ],
      queries: [{ kind: 'heat', of: 's1', from: { phase: 'liquid', temp: { value: 20, unit: 'C' } }, to: { phase: 'liquid', temp: { value: 80, unit: 'C' } } }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /thermal_body|không phải vật nhiệt|không tồn tại/i.test(e.message))).toBe(true);
  });

  it('query unit sai loại (V hỏi bằng atm) ⇒ từ chối', () => {
    const r = runGasHeat({
      problemName: 'unit-sai',
      ops: [
        { op: 'state', name: 's1', p: { value: 2, unit: 'atm' }, V: { value: 6, unit: 'L' } },
        { op: 'state', name: 's2', p: { value: 5, unit: 'atm' } },
        { op: 'process', kind: 'isothermal', from: 's1', to: 's2' },
      ],
      queries: [{ kind: 'state_value', of: 's2', quantity: 'V', unit: 'atm' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

describe('H3 — PHYSICAL_VIOLATIONS dương tính ⇒ KHÔNG serve đáp', () => {
  it('T(K) ≤ 0 (−300°C) ⇒ nhiet-do-tuyet-doi-am, answers rỗng', () => {
    const r = runGasHeat({
      problemName: 'am-tuyet-doi',
      ops: [
        { op: 'state', name: 's1', p: { value: 2, unit: 'atm' }, T: { value: -300, unit: 'C' } },
        { op: 'state', name: 's2', T: { value: 27, unit: 'C' } },
        { op: 'process', kind: 'isochoric', from: 's1', to: 's2' },
      ],
      queries: [{ kind: 'state_value', of: 's2', quantity: 'p', unit: 'atm' }],
    });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.id === 'nhiet-do-tuyet-doi-am')).toBe(true);
    expect(r.answers.length).toBe(0);
  });

  it('Tf ngoài khoảng ⇒ m ≤ 0 (khoi-luong-am) / t-cb-ngoai-khoang, answers rỗng', () => {
    const r = runGasHeat({
      problemName: 'tf-ngoai-khoang',
      ops: [
        { op: 'thermal_body', name: 'sat', c: { value: 460 }, T0: { value: 100, unit: 'C' } },
        { op: 'thermal_body', name: 'nuoc', mass: { value: 2, unit: 'kg' }, c: { value: 4200 }, T0: { value: 20, unit: 'C' } },
      ],
      queries: [{ kind: 'mass_from_heat', of: 'sat', property: 'mass', Tf: { value: 150, unit: 'C' }, unit: 'kg' }],
    });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.id === 'khoi-luong-am' || v.id === 't-cb-ngoai-khoang')).toBe(true);
    expect(r.answers.length).toBe(0);
  });

  it('đẳng nhiệt nhưng T đổi (dữ kiện mâu thuẫn) ⇒ dang-qua-trinh-mau-thuan', () => {
    const r = runGasHeat({
      problemName: 'dang-nhiet-t-doi',
      ops: [
        { op: 'state', name: 's1', p: { value: 2, unit: 'atm' }, V: { value: 6, unit: 'L' }, T: { value: 300, unit: 'K' } },
        { op: 'state', name: 's2', p: { value: 5, unit: 'atm' }, T: { value: 400, unit: 'K' } },
        { op: 'process', kind: 'isothermal', from: 's1', to: 's2' },
      ],
      queries: [{ kind: 'state_value', of: 's2', quantity: 'V', unit: 'L' }],
    });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.id === 'dang-qua-trinh-mau-thuan')).toBe(true);
    expect(r.answers.length).toBe(0);
  });
});

describe('Guard kiến trúc — hữu tỉ tuyến tính thuần (spec §15.4)', () => {
  it('gasHeat.ts / gasHeatCompute.ts KHÔNG import solver1d, KHÔNG gọi sqrt() (đại số hữu tỉ tuyến tính)', () => {
    for (const f of ['../gasHeat.ts', '../gasHeatCompute.ts', '../runGasHeat.ts']) {
      const src = readFileSync(join(HERE, f), 'utf8');
      expect(src).not.toMatch(/import[^;]*solver1d/); // không IMPORT solver bậc-2
      expect(src).not.toMatch(/\bsqrt\s*\(/); // không GỌI sqrt(
      expect(src).not.toMatch(/from ['"][^'"]*solver1d/);
    }
  });
});
