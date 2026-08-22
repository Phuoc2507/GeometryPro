// VỪA-1 (phản biện code v2): bịt "lỗ abstain nhãn pha" — heat KHÔNG được tin nhãn pha của LLM mà phải
// đối chiếu meltTemp/boilTemp. Nhãn lệch miền ⇒ violation pha-lech-nhiet-do (KHÔNG serve đáp sai âm thầm).
import { describe, it, expect } from 'vitest';
import { runGasHeat } from '../runGasHeat';

const heatQ = (bodyProps: Record<string, unknown>, from: unknown, to: unknown) =>
  runGasHeat({
    problemName: 'phase-guard',
    ops: [{ op: 'thermal_body', name: 'B', mass: { value: 1, unit: 'kg' }, ...bodyProps }],
    queries: [{ kind: 'heat', of: 'B', from, to }],
  });

// Nước: mốc nóng chảy 0°C, mốc sôi 100°C.
const WATER = {
  cSolid: { value: 2100 }, cLiquid: { value: 4200 }, cGas: { value: 2010 },
  meltTemp: { value: 0, unit: 'C' }, boilTemp: { value: 100, unit: 'C' },
  latentMelt: { value: 340000 }, latentVapor: { value: 2300000 },
};

describe('gas-heat heat: guard pha↔nhiệt độ (VỪA-1)', () => {
  it('khai "lỏng" ở −10°C (DƯỚI mốc đông) ⇒ violation, KHÔNG serve', () => {
    const r = heatQ(WATER, { phase: 'liquid', temp: { value: -10, unit: 'C' } }, { phase: 'liquid', temp: { value: 20, unit: 'C' } });
    expect(r.ok).toBe(false); // ok:false ⇒ frontend hiện chẩn đoán, KHÔNG hiện đáp (dù engine trả placeholder 0)
    expect(r.violations.some((v) => v.id === 'pha-lech-nhiet-do')).toBe(true);
  });

  it('khai "rắn" ở 50°C (TRÊN mốc chảy) ⇒ violation, KHÔNG serve', () => {
    const r = heatQ(WATER, { phase: 'solid', temp: { value: 50, unit: 'C' } }, { phase: 'liquid', temp: { value: 60, unit: 'C' } });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.id === 'pha-lech-nhiet-do')).toBe(true);
  });

  it('khai "hơi" ở 50°C (DƯỚI mốc sôi) ⇒ violation', () => {
    const r = heatQ(WATER, { phase: 'gas', temp: { value: 50, unit: 'C' } }, { phase: 'gas', temp: { value: 120, unit: 'C' } });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.id === 'pha-lech-nhiet-do')).toBe(true);
  });

  it('nhãn ĐÚNG (rắn −10 → lỏng 20, băng qua nóng chảy) ⇒ VẪN serve (không oan)', () => {
    const r = heatQ(WATER, { phase: 'solid', temp: { value: -10, unit: 'C' } }, { phase: 'liquid', temp: { value: 20, unit: 'C' } });
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
    // rắn(2100·10) + nóng chảy(340000) + lỏng(4200·20) = 21000 + 340000 + 84000 = 445000 J
    expect(r.answers[0].approx).toBeCloseTo(445000, 3);
  });

  it('nhãn ĐÚNG tại đúng mốc (rắn 0°C → lỏng 0°C, nóng chảy thuần) ⇒ serve λm', () => {
    const r = heatQ(WATER, { phase: 'solid', temp: { value: 0, unit: 'C' } }, { phase: 'liquid', temp: { value: 0, unit: 'C' } });
    expect(r.ok).toBe(true);
    expect(r.answers[0].approx).toBeCloseTo(340000, 3); // λm = 340000·1
  });
});
