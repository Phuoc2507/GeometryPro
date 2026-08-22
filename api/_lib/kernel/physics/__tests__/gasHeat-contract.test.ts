// Contract test — 10 bài vàng G1–G10 (spec §11/§12). Plan CHÉP NGUYÊN từ tài liệu; đáp là HỢP ĐỒNG
// tính tay (exact "12/5", "8/3", "28/23", "32/3"…). Lệch thì SỬA CODE, KHÔNG sửa đáp.
//
// QUYẾT ĐỊNH HIỂN THỊ (D34-b "khoa-học-hoá lũy thừa 10", đồng bộ efield §14.1): giữ PHÂN SỐ trần cho
// mọi phân số (đúng như reviewer §14.1: "8/3, 28/23, 32/3 ĐẸP, tự nhiên cho chương này"); CHỈ số
// NGUYÊN có |v|≥10⁴ mới khoa-học-hoá. Vậy chỉ G9 (308100→"3,081·10⁵") và G10 (480000→"4,8·10⁵")
// đổi so với bản nháp §12 — chính là hai "lũy thừa 10" mà D34-b nhắm tới. approx+exact GIỮ NGUYÊN.
import { describe, it, expect } from 'vitest';
import { runGasHeat, type GasHeatResult } from '../runGasHeat';

const texts = (r: GasHeatResult) => r.answers.map((a) => a.text);
const units = (r: GasHeatResult) => r.answers.map((a) => a.unit);
const approxes = (r: GasHeatResult) => r.answers.map((a) => a.approx);
const allExact = (r: GasHeatResult) => r.answers.every((a) => !a.approximate);
const checksPass = (r: GasHeatResult) => r.checks.every((c) => c.pass);
// Mọi residual thay-ngược = 0 EXACT (hữu tỉ thuần) — không phải bóng float ~1e-16.
const backsubZeroExact = (r: GasHeatResult) =>
  r.checks.filter((c) => c.kind.startsWith('backsub')).every((c) => c.residual === 0);

describe('Gas-Heat contract — 10 bài vàng SGK/đề thi VN (spec §12)', () => {
  it('G1 đẳng nhiệt nén (Boyle) tìm V₂ = 12/5 L', () => {
    const r = runGasHeat({
      problemName: 'dang-nhiet-nen',
      knowledgeTags: ['ly/12/khi-ly-tuong/dang-nhiet'],
      ops: [
        { op: 'state', name: 's1', p: { value: 2, unit: 'atm' }, V: { value: 6, unit: 'L' } },
        { op: 'state', name: 's2', p: { value: 5, unit: 'atm' } },
        { op: 'process', kind: 'isothermal', from: 's1', to: 's2' },
      ],
      queries: [{ kind: 'state_value', of: 's2', quantity: 'V', unit: 'L' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['12/5']);
    expect(units(r)).toEqual(['L']);
    expect(r.answers[0].approx).toBeCloseTo(2.4, 6);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
    expect(backsubZeroExact(r)).toBe(true);
  });

  it('G2 bọt khí đáy hồ (engine tính p₀+ρgh) tìm V₂ = 2 cm³', () => {
    const r = runGasHeat({
      problemName: 'bot-khi-day-ho',
      knowledgeTags: ['ly/12/khi-ly-tuong/dang-nhiet'],
      ops: [
        {
          op: 'state', name: 'day',
          pFromDepth: { atmosphere: { value: 100000, unit: 'Pa' }, depth: { value: 10, unit: 'm' }, density: { value: 1000 }, g: 10 },
          V: { value: 1, unit: 'cm3' },
        },
        { op: 'state', name: 'mat', p: { value: 100000, unit: 'Pa' } },
        { op: 'process', kind: 'isothermal', from: 'day', to: 'mat' },
      ],
      queries: [{ kind: 'state_value', of: 'mat', quantity: 'V', unit: 'cm3' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['2']);
    expect(units(r)).toEqual(['cm3']);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
    // p_đáy = 200000 Pa ghi vào checks[] minh bạch (LLM KHÔNG tự nhân ρgh).
    expect(r.checks.some((c) => c.kind === 'hydrostatic' && Math.abs(c.residual - 200000) < 1)).toBe(true);
  });

  it('G3 đẳng tích nung (°C→K +273) tìm p₂ = 8/3 atm', () => {
    const r = runGasHeat({
      problemName: 'dang-tich-nung',
      knowledgeTags: ['ly/12/khi-ly-tuong/dang-tich'],
      ops: [
        { op: 'state', name: 's1', p: { value: 2, unit: 'atm' }, T: { value: 27, unit: 'C' } },
        { op: 'state', name: 's2', T: { value: 127, unit: 'C' } },
        { op: 'process', kind: 'isochoric', from: 's1', to: 's2' },
      ],
      queries: [{ kind: 'state_value', of: 's2', quantity: 'p', unit: 'atm' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['8/3']);
    expect(units(r)).toEqual(['atm']);
    expect(r.answers[0].approx).toBeCloseTo(2.6667, 3);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
    expect(backsubZeroExact(r)).toBe(true);
  });

  it('G4 đẳng áp đun (°C→K) tìm V₂ = 18/5 L', () => {
    const r = runGasHeat({
      problemName: 'dang-ap-dun',
      knowledgeTags: ['ly/12/khi-ly-tuong/dang-ap'],
      ops: [
        { op: 'state', name: 's1', V: { value: 3, unit: 'L' }, T: { value: 27, unit: 'C' } },
        { op: 'state', name: 's2', T: { value: 87, unit: 'C' } },
        { op: 'process', kind: 'isobaric', from: 's1', to: 's2' },
      ],
      queries: [{ kind: 'state_value', of: 's2', quantity: 'V', unit: 'L' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['18/5']);
    expect(units(r)).toEqual(['L']);
    expect(r.answers[0].approx).toBeCloseTo(3.6, 6);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
    expect(backsubZeroExact(r)).toBe(true);
  });

  it('G5 phương trình trạng thái tổng quát tìm V₂ = 6 L', () => {
    const r = runGasHeat({
      problemName: 'trang-thai-tong-quat',
      knowledgeTags: ['ly/12/khi-ly-tuong/phuong-trinh-trang-thai'],
      ops: [
        { op: 'state', name: 's1', p: { value: 1, unit: 'atm' }, V: { value: 10, unit: 'L' }, T: { value: 27, unit: 'C' } },
        { op: 'state', name: 's2', p: { value: 2, unit: 'atm' }, T: { value: 87, unit: 'C' } },
        { op: 'process', kind: 'general', from: 's1', to: 's2' },
      ],
      queries: [{ kind: 'state_value', of: 's2', quantity: 'V', unit: 'L' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['6']);
    expect(units(r)).toEqual(['L']);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
    expect(backsubZeroExact(r)).toBe(true);
  });

  it('G6 Clapeyron pV=nRT: n = 1/3 mol; m = 32/3 g (khoe exact)', () => {
    const r = runGasHeat({
      problemName: 'clapeyron-khoi-luong',
      knowledgeTags: ['ly/12/khi-ly-tuong/phuong-trinh-clapeyron'],
      ops: [
        { op: 'state', name: 'binh', p: { value: 100000, unit: 'Pa' }, V: { value: 8.31, unit: 'L' }, T: { value: 27, unit: 'C' }, molarMass: { value: 32 } },
      ],
      queries: [
        { kind: 'clapeyron', of: 'binh', solveFor: 'amount', unit: 'mol', label: 'a' },
        { kind: 'clapeyron', of: 'binh', solveFor: 'mass', unit: 'g', label: 'b' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['1/3', '32/3']);
    expect(units(r)).toEqual(['mol', 'g']);
    expect(r.answers[0].approx).toBeCloseTo(0.3333, 3);
    expect(r.answers[1].approx).toBeCloseTo(10.6667, 3);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
    expect(backsubZeroExact(r)).toBe(true);
  });

  it('G7 cân bằng nhiệt tìm t_cb = 44 °C', () => {
    const r = runGasHeat({
      problemName: 'can-bang-nhiet-tcb',
      knowledgeTags: ['ly/12/vat-ly-nhiet/can-bang-nhiet'],
      ops: [
        { op: 'thermal_body', name: 'nong', mass: { value: 2, unit: 'kg' }, c: { value: 4200 }, T0: { value: 80, unit: 'C' } },
        { op: 'thermal_body', name: 'lanh', mass: { value: 3, unit: 'kg' }, c: { value: 4200 }, T0: { value: 20, unit: 'C' } },
      ],
      queries: [{ kind: 'equilibrium_temp', unit: 'C' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['44']);
    expect(units(r)).toEqual(['C']);
    expect(r.answers[0].approx).toBeCloseTo(44, 6);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
    expect(backsubZeroExact(r)).toBe(true);
  });

  it('G8 thả sắt nóng tìm khối lượng m = 28/23 kg', () => {
    const r = runGasHeat({
      problemName: 'can-bang-nhiet-tim-m',
      knowledgeTags: ['ly/12/vat-ly-nhiet/can-bang-nhiet'],
      ops: [
        { op: 'thermal_body', name: 'sat', c: { value: 460 }, T0: { value: 100, unit: 'C' } },
        { op: 'thermal_body', name: 'nuoc', mass: { value: 2, unit: 'kg' }, c: { value: 4200 }, T0: { value: 20, unit: 'C' } },
      ],
      queries: [{ kind: 'mass_from_heat', of: 'sat', property: 'mass', Tf: { value: 25, unit: 'C' }, unit: 'kg' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['28/23']);
    expect(units(r)).toEqual(['kg']);
    expect(r.answers[0].approx).toBeCloseTo(1.2174, 3);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
    expect(backsubZeroExact(r)).toBe(true);
  });

  it('G9 chuỗi đá→nước→hơi Q = 308100 J → "3,081·10⁵" (khoa-học-hoá D34-b)', () => {
    const r = runGasHeat({
      problemName: 'chuoi-da-nuoc-hoi',
      knowledgeTags: ['ly/12/vat-ly-nhiet/chuyen-the'],
      ops: [
        {
          op: 'thermal_body', name: 'H2O', mass: { value: 0.1, unit: 'kg' },
          cSolid: { value: 2100 }, cLiquid: { value: 4200 },
          meltTemp: { value: 0, unit: 'C' }, boilTemp: { value: 100, unit: 'C' },
          latentMelt: { value: 340000 }, latentVapor: { value: 2300000 },
        },
      ],
      queries: [{
        kind: 'heat', of: 'H2O',
        from: { phase: 'solid', temp: { value: -10, unit: 'C' } },
        to: { phase: 'gas', temp: { value: 100, unit: 'C' } },
      }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['3,081·10⁵']);
    expect(units(r)).toEqual(['J']);
    expect(r.answers[0].approx).toBeCloseTo(308100, 6);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
    // 4 đoạn ghi checks[] minh bạch; số mốc latent = số mốc thực băng qua (chống over-count).
    expect(r.checks.some((c) => c.kind === 'latent-count' && c.pass)).toBe(true);
  });

  it('G10 bẫy đổi đơn vị (m³/L, °C→K) tìm p₂ = 480000 Pa → "4,8·10⁵"', () => {
    const r = runGasHeat({
      problemName: 'bay-doi-don-vi',
      knowledgeTags: ['ly/12/khi-ly-tuong/phuong-trinh-trang-thai'],
      ops: [
        { op: 'state', name: 's1', p: { value: 100000, unit: 'Pa' }, V: { value: 2, unit: 'm3' }, T: { value: 27, unit: 'C' } },
        { op: 'state', name: 's2', V: { value: 500, unit: 'L' }, T: { value: 87, unit: 'C' } },
        { op: 'process', kind: 'general', from: 's1', to: 's2' },
      ],
      queries: [{ kind: 'state_value', of: 's2', quantity: 'p', unit: 'Pa' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['4,8·10⁵']);
    expect(units(r)).toEqual(['Pa']);
    expect(r.answers[0].approx).toBeCloseTo(480000, 6);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
    expect(backsubZeroExact(r)).toBe(true);
  });

  it('mọi đáp radicand = 1 (không rời ℚ): exact + KHÔNG có dấu căn √ trong text', () => {
    const r = runGasHeat({
      problemName: 'radicand-guard',
      ops: [
        { op: 'state', name: 's1', p: { value: 2, unit: 'atm' }, V: { value: 6, unit: 'L' } },
        { op: 'state', name: 's2', p: { value: 5, unit: 'atm' } },
        { op: 'process', kind: 'isothermal', from: 's1', to: 's2' },
      ],
      queries: [{ kind: 'state_value', of: 's2', quantity: 'V', unit: 'L' }],
    });
    // radicand=1 ⇒ text hữu tỉ thuần (không "√"); + approximate:false (exact-first) — chương này KHÔNG rời ℚ.
    expect(r.answers.every((a) => !a.approximate && !a.text.includes('√'))).toBe(true);
  });
});
