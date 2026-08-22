import { describe, it, expect } from 'vitest';
import { solvePhysicsPlan, solveChemPlan } from '../kernel-bridge/solveSubject.js';

// DRY-RUN: cấp PLAN JSON sẵn (KHÔNG qua LLM) → chạy engine → đối chiếu đáp golden.
// Chỉ kiểm tầng bridge (wrapper + bundle). Tầng dịch LLM để test thủ công bằng curl (cần VILAO_API_KEY).

const byLabel = (r, l) => r.answers.find((a) => a.label === l);

describe('solvePhysicsPlan — dry-run bài Lý golden', () => {
  it('L02 hãm phanh (v0 khai km/h → engine đổi EXACT 15 m/s): 6 m/s; 75/2 m; 4 s', () => {
    const r = solvePhysicsPlan({
      problemName: 'oto-ham-phanh', units: { length: 'm', time: 's' },
      ops: [{ op: 'mover1d', name: 'oto', x0: 0, v0: 54, v0Unit: 'km/h', a: -3 }],
      queries: [
        { kind: 'velocity_at', of: 'oto', t: 3, component: 'x', label: 'a' },
        { kind: 'position_at', of: 'oto', t: 5, label: 'b' },
        { kind: 'time_when', of: 'oto', position: 36, label: 'c' },
      ],
      asserts: [{ query: { kind: 'velocity_at', of: 'oto', t: 5, component: 'x' }, equals: 0 }],
    });
    expect(r.subject).toBe('physics');
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
    expect(byLabel(r, 'a').text).toBe('6 m/s');
    expect(byLabel(r, 'b').approx).toBeCloseTo(37.5, 9);
    expect(byLabel(r, 'c').text).toBe('4 s');
    expect(r.answers.every((a) => !a.approximate)).toBe(true);
  });

  it('L06 ném ngang (máy bay): 10 s; 1000 m; 100√2 ≈ 141,42 m/s (căn đẹp, approximate:false)', () => {
    const r = solvePhysicsPlan({
      problemName: 'may-bay-tha-hang', units: { length: 'm', time: 's' },
      ops: [{ op: 'projectile', name: 'hang', h0: 500, v0: 100, angleDeg: 0, g: 10 }],
      queries: [
        { kind: 'time_to_ground', of: 'hang', label: 'a' },
        { kind: 'range', of: 'hang', label: 'b' },
        { kind: 'impact_velocity', of: 'hang', label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(byLabel(r, 'a').approx).toBeCloseTo(10, 9);
    expect(byLabel(r, 'b').approx).toBeCloseTo(1000, 9);
    expect(byLabel(r, 'c').approx).toBeCloseTo(141.42135, 4);
    expect(byLabel(r, 'c').approximate).toBe(false);
    // scene chung có geometry + timeline để frontend vẽ
    expect(r.scene).toBeTruthy();
    expect(r.scene.playback).toBeTruthy();
  });

  it('plan hỏng schema → ok:false, có errors (không ném)', () => {
    const r = solvePhysicsPlan({ problemName: 'x', ops: [], queries: [] });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

describe('solveChemPlan — dry-run bài Hóa golden', () => {
  it('H01 Al + HCl dư (đktc 22,4): PTHH [2,6,2,3]; V(H2)=6,72 L; m(AlCl3)=26,7 g', () => {
    const r = solveChemPlan({
      ops: [
        { op: 'species', formula: 'Al', amount: { grams: '5,4' } },
        { op: 'species', formula: 'HCl', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      molarVolume: 22.4,
      queries: [
        { kind: 'equation' },
        { kind: 'volume_gas', of: 'H2' },
        { kind: 'mass', of: 'AlCl3' },
      ],
    });
    expect(r.subject).toBe('chem');
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
    expect(r.reactions[0].coefficients).toEqual([2, 6, 2, 3]);
    expect(r.answers[0].text).toContain('2Al + 6HCl');
    expect(r.answers[1].exact).toBe('168/25');   // 6,72 exact
    expect(r.answers[1].approx).toBeCloseTo(6.72, 9);
    expect(r.answers[2].exact).toBe('267/10');   // 26,7 exact
    expect(r.answers[2].approx).toBeCloseTo(26.7, 9);
  });

  it('H03 Zn + CuSO4 (đkc default): Zn dư 1/50 mol (≈1,3 g); m(Cu)=5,12 g', () => {
    const r = solveChemPlan({
      ops: [
        { op: 'species', formula: 'Zn', amount: { grams: '6,5' } },
        { op: 'species', formula: 'CuSO4', amount: { solution: { molarity: '0,4', liters: '0,2' } } },
        { op: 'mix' },
      ],
      queries: [
        { kind: 'remaining', of: 'Zn' },
        { kind: 'mass', of: 'Cu' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.answers[0].exact).toBe('1/50');       // Zn dư 0,02 mol
    expect(r.answers[0].approx).toBeCloseTo(0.02, 9);
    expect(r.answers[1].exact).toBe('128/25');     // 5,12 g
    expect(r.answers[1].approx).toBeCloseTo(5.12, 9);
  });

  it('H08 nhiệt phân NaHCO3 (heated, đkc): m(Na2CO3)=10,6 g; V(CO2)=2,479 L', () => {
    const r = solveChemPlan({
      ops: [
        { op: 'species', formula: 'NaHCO3', amount: { grams: '16,8' } },
        { op: 'mix', heated: true },
      ],
      queries: [
        { kind: 'mass', of: 'Na2CO3' },
        { kind: 'volume_gas', of: 'CO2' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.answers[0].approx).toBeCloseTo(10.6, 9);
    expect(r.answers[1].approx).toBeCloseTo(2.479, 9);
  });

  it('plan hỏng schema → ok:false, có errors (không ném)', () => {
    const r = solveChemPlan({ ops: [], queries: [] });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});
