// Compute test — H1 (heat piecewise: 4 ca đơn-pha/nóng-chảy-thuần/partial/chạm-boil + GUARD over-count),
// H2 (mass_from_heat property c & T0), và LUẬT HIỂN THỊ D34-b (displayGasHeat). Đáp là HỢP ĐỒNG tính tay.
import { describe, it, expect } from 'vitest';
import { runGasHeat } from '../runGasHeat';
import { displayGasHeat } from '../gasHeatCompute';
import { rat, fromExact, makeExact } from '../../scalar';

const heatQ = (bodyProps: Record<string, unknown>, from: unknown, to: unknown) =>
  runGasHeat({
    problemName: 'heat-case',
    ops: [{ op: 'thermal_body', name: 'B', mass: { value: 0.1, unit: 'kg' }, ...bodyProps }],
    queries: [{ kind: 'heat', of: 'B', from, to }],
  });

describe('H1 — heat piecewise: vị-từ pha+ngưỡng tường minh + self-check chống over-count latent', () => {
  it('đơn-pha lỏng (mcΔt): nước 20→80 = 25200 J, KHÔNG cộng latent', () => {
    const r = heatQ(
      { c: { value: 4200 } },
      { phase: 'liquid', temp: { value: 20, unit: 'C' } },
      { phase: 'liquid', temp: { value: 80, unit: 'C' } },
    );
    expect(r.ok).toBe(true);
    expect(r.answers[0].approx).toBeCloseTo(25200, 6);
    expect(r.answers[0].text).toBe('2,52·10⁴');
    expect(r.answers[0].unit).toBe('J');
    expect(r.answers[0].approximate).toBe(false);
    // Số mốc latent cộng vào = 0 (đoạn không băng qua mốc nào).
    expect(r.checks.find((c) => c.kind === 'latent-count')?.residual).toBe(0);
    expect(r.checks.every((c) => c.pass)).toBe(true);
  });

  it('nóng-chảy-thuần (λm): đá 0→nước 0 = 34000 J', () => {
    const r = heatQ(
      { meltTemp: { value: 0, unit: 'C' }, latentMelt: { value: 340000 } },
      { phase: 'solid', temp: { value: 0, unit: 'C' } },
      { phase: 'liquid', temp: { value: 0, unit: 'C' } },
    );
    expect(r.ok).toBe(true);
    expect(r.answers[0].approx).toBeCloseTo(34000, 6);
    expect(r.answers[0].text).toBe('3,4·10⁴');
    expect(r.checks.find((c) => c.kind === 'latent-count')?.residual).toBe(1);
    expect(r.checks.every((c) => c.pass)).toBe(true);
  });

  it('partial dừng giữa pha lỏng: đá −10→nước 50 = 57100 J (2100+34000+21000)', () => {
    const r = heatQ(
      { cSolid: { value: 2100 }, cLiquid: { value: 4200 }, meltTemp: { value: 0, unit: 'C' }, latentMelt: { value: 340000 } },
      { phase: 'solid', temp: { value: -10, unit: 'C' } },
      { phase: 'liquid', temp: { value: 50, unit: 'C' } },
    );
    expect(r.ok).toBe(true);
    expect(r.answers[0].approx).toBeCloseTo(57100, 6);
    expect(r.answers[0].text).toBe('5,71·10⁴');
    expect(r.checks.find((c) => c.kind === 'latent-count')?.residual).toBe(1);
    expect(r.checks.every((c) => c.pass)).toBe(true);
  });

  it('chạm đúng biên boil (Lm): nước 100→hơi 100 = 230000 J', () => {
    const r = heatQ(
      { boilTemp: { value: 100, unit: 'C' }, latentVapor: { value: 2300000 } },
      { phase: 'liquid', temp: { value: 100, unit: 'C' } },
      { phase: 'gas', temp: { value: 100, unit: 'C' } },
    );
    expect(r.ok).toBe(true);
    expect(r.answers[0].approx).toBeCloseTo(230000, 6);
    expect(r.answers[0].text).toBe('2,3·10⁵');
    expect(r.checks.find((c) => c.kind === 'latent-count')?.residual).toBe(1);
    expect(r.checks.every((c) => c.pass)).toBe(true);
  });

  // GUARD "âm thầm trả sai": body có ĐỦ latent-props nhưng query CHỈ trong pha lỏng ⇒ KHÔNG được cộng λm/Lm.
  it('GUARD over-count: body đủ props nhưng đun lỏng 20→80 vẫn = 25200 J (không cộng thừa 34000)', () => {
    const r = heatQ(
      {
        cSolid: { value: 2100 }, cLiquid: { value: 4200 },
        meltTemp: { value: 0, unit: 'C' }, boilTemp: { value: 100, unit: 'C' },
        latentMelt: { value: 340000 }, latentVapor: { value: 2300000 },
      },
      { phase: 'liquid', temp: { value: 20, unit: 'C' } },
      { phase: 'liquid', temp: { value: 80, unit: 'C' } },
    );
    expect(r.ok).toBe(true);
    expect(r.answers[0].approx).toBeCloseTo(25200, 6); // KHÔNG phải 59200
    expect(r.checks.find((c) => c.kind === 'latent-count')?.residual).toBe(0);
    expect(r.checks.every((c) => c.pass)).toBe(true);
  });

  it('chiều gia nhiệt NGHỊCH (to < from) ⇒ violation, KHÔNG serve', () => {
    const r = heatQ(
      { c: { value: 4200 } },
      { phase: 'liquid', temp: { value: 80, unit: 'C' } },
      { phase: 'liquid', temp: { value: 20, unit: 'C' } },
    );
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.id === 'chieu-gia-nhiet-nghich')).toBe(true);
    expect(r.answers.length).toBe(0);
  });
});

describe('H2 — mass_from_heat property c & T0 (công thức bổ sung §7.1)', () => {
  it('property=T0: nước(2,4200,20) + kim loại(1,4200,?) cân bằng ở 50 ⇒ T0 = 110 °C', () => {
    const r = runGasHeat({
      problemName: 'tim-t0',
      ops: [
        { op: 'thermal_body', name: 'nuoc', mass: { value: 2, unit: 'kg' }, c: { value: 4200 }, T0: { value: 20, unit: 'C' } },
        { op: 'thermal_body', name: 'kl', mass: { value: 1, unit: 'kg' }, c: { value: 4200 } },
      ],
      queries: [{ kind: 'mass_from_heat', of: 'kl', property: 'T0', Tf: { value: 50, unit: 'C' }, unit: 'C' }],
    });
    expect(r.ok).toBe(true);
    expect(r.answers[0].text).toBe('110');
    expect(r.answers[0].unit).toBe('C');
    expect(r.answers[0].approx).toBeCloseTo(110, 6);
    expect(r.answers[0].approximate).toBe(false);
    expect(r.checks.filter((c) => c.kind.startsWith('backsub')).every((c) => c.residual === 0)).toBe(true);
  });

  it('property=c: nước(2,4200,20) + kim loại(1,?,100) cân bằng ở 25 ⇒ c = 560 J/(kg·K)', () => {
    const r = runGasHeat({
      problemName: 'tim-c',
      ops: [
        { op: 'thermal_body', name: 'nuoc', mass: { value: 2, unit: 'kg' }, c: { value: 4200 }, T0: { value: 20, unit: 'C' } },
        { op: 'thermal_body', name: 'kl', mass: { value: 1, unit: 'kg' }, T0: { value: 100, unit: 'C' } },
      ],
      queries: [{ kind: 'mass_from_heat', of: 'kl', property: 'c', Tf: { value: 25, unit: 'C' } }],
    });
    expect(r.ok).toBe(true);
    expect(r.answers[0].text).toBe('560');
    expect(r.answers[0].unit).toBe('J/(kg·K)');
    expect(r.answers[0].approx).toBeCloseTo(560, 6);
    expect(r.answers[0].approximate).toBe(false);
    expect(r.checks.filter((c) => c.kind.startsWith('backsub')).every((c) => c.residual === 0)).toBe(true);
  });
});

describe('LUẬT HIỂN THỊ D34-b (displayGasHeat): phân số trần; số nguyên ≥10⁴ khoa-học-hoá', () => {
  it('phân số không rút gọn về nguyên ⇒ GIỮ phân số trần (khoe exact)', () => {
    expect(displayGasHeat(fromExact(makeExact(8n, 3n)))).toBe('8/3');
    expect(displayGasHeat(fromExact(makeExact(12n, 5n)))).toBe('12/5');
    expect(displayGasHeat(fromExact(makeExact(28n, 23n)))).toBe('28/23');
    expect(displayGasHeat(fromExact(makeExact(32n, 3n)))).toBe('32/3');
    expect(displayGasHeat(fromExact(makeExact(1n, 3n)))).toBe('1/3');
  });
  it('số nguyên < 10⁴ ⇒ trần; ≥ 10⁴ ⇒ khoa-học-hoá dấu phẩy VN', () => {
    expect(displayGasHeat(rat(6n))).toBe('6');
    expect(displayGasHeat(rat(44n))).toBe('44');
    expect(displayGasHeat(rat(2n))).toBe('2');
    expect(displayGasHeat(rat(480000n))).toBe('4,8·10⁵');
    expect(displayGasHeat(rat(308100n))).toBe('3,081·10⁵');
    expect(displayGasHeat(rat(230000n))).toBe('2,3·10⁵');
    expect(displayGasHeat(rat(10000n))).toBe('10⁴'); // mantissa 1 ⇒ bỏ "1·"
  });
});
