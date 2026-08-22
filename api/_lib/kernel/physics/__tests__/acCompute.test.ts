// acCompute — từng query ra đúng text+unit; peak ×√2; is_resonance 3 verdict; write_* ráp chuỗi + sign
// pha; input số lẻ ⇒ approximate trung thực; chuẩn minus U+2212 (VỪA-2).
import { describe, it, expect } from 'vitest';
import { AcPlanSchema, type AcQuery } from '../acSchema';
import { resolveModel, deriveAc, phaseFromCos } from '../acCircuit';
import { computeAcQuery, normalizeMinus, MINUS } from '../acCompute';
import { fromExact, makeExact } from '../../scalar';
import { approxP } from '../piScalar';

function solve(raw: unknown) {
  // Query cụ thể được thử riêng qua one(); plan.queries chỉ cần hợp lệ schema ⇒ chèn placeholder.
  const plan = AcPlanSchema.parse({ queries: [{ kind: 'omega' }], ...(raw as object) });
  const m = resolveModel(plan);
  return { m, d: deriveAc(m) };
}
function one(raw: unknown, q: AcQuery) {
  const { m, d } = solve(raw);
  const r = computeAcQuery(m, d, q);
  if (r.ok === false) throw new Error(r.problem);
  return r.answer;
}

// Bộ số A1/A6 dùng lại nhiều lần.
const a1 = { problemName: 't', source: { omega: { n: 100, pi: true }, U: 250 }, R: 75, L: { n: 2, overPi: true }, C: { n: 1, exp: -4, overPi: true } };
const a6 = { problemName: 't', source: { omega: { n: 100, pi: true }, U0: { n: 200, rad: 2 }, phiU: { n: 0 } }, R: 100, L: { n: 2, overPi: true }, C: { n: 1, exp: -4, overPi: true } };

describe('phaseFromCos (§3.4) — inverse-trig LƯỚI, so struct Exact', () => {
  const cos = (n: bigint, d: bigint, rad = 1) => fromExact(makeExact(n, d, rad));
  it('5 mốc lưới → góc đẹp; dấu theo dZ', () => {
    expect(approxP(phaseFromCos(cos(1n, 1n), 1)!)).toBeCloseTo(0, 9);
    expect(approxP(phaseFromCos(cos(1n, 2n, 3), 1)!)).toBeCloseTo(Math.PI / 6, 9);
    expect(approxP(phaseFromCos(cos(1n, 2n, 2), -1)!)).toBeCloseTo(-Math.PI / 4, 9);
    expect(approxP(phaseFromCos(cos(1n, 2n, 1), 1)!)).toBeCloseTo(Math.PI / 3, 9);
    expect(approxP(phaseFromCos(cos(0n, 1n, 1), 1)!)).toBeCloseTo(Math.PI / 2, 9);
  });
  it('off-grid (hữu tỉ 4/5, 3/5) → null (caller rơi số)', () => {
    expect(phaseFromCos(cos(4n, 5n), -1)).toBeNull();
    expect(phaseFromCos(cos(3n, 5n), 1)).toBeNull();
  });
  it('cosφ không exact (null) → null', () => {
    expect(phaseFromCos({ approx: 0.8, exact: null }, 1)).toBeNull();
  });
  it('dZ = 0 → φ = 0 bất kể mốc', () => {
    expect(approxP(phaseFromCos(cos(1n, 1n), 0)!)).toBe(0);
  });
});

describe('computeAcQuery — text/unit theo kind (C6)', () => {
  it('omega → 100π rad/s', () => {
    const a = one(a1, { kind: 'omega' });
    expect(a.text).toBe('100π'); expect(a.unit).toBe('rad/s');
  });
  it('impedance of L/C → Z_L/Z_C; bỏ of → Z tổng', () => {
    expect(one(a1, { kind: 'impedance', of: 'L' }).text).toBe('200');
    expect(one(a1, { kind: 'impedance', of: 'C' }).text).toBe('100');
    expect(one(a1, { kind: 'impedance' }).text).toBe('125');
  });
  it('current peak = I√2', () => {
    // A1: I = 2 ⇒ I₀ = 2√2.
    expect(one(a1, { kind: 'current', peak: false }).text).toBe('2');
    expect(one(a1, { kind: 'current', peak: true }).text).toBe('2√2');
  });
  it('voltage of R/L/C + source; peak ×√2', () => {
    expect(one(a1, { kind: 'voltage', of: 'R' }).text).toBe('150'); // I·R = 2·75
    expect(one(a1, { kind: 'voltage', of: 'L' }).text).toBe('400'); // 2·200
    expect(one(a1, { kind: 'voltage', of: 'C' }).text).toBe('200'); // 2·100
    expect(one(a1, { kind: 'voltage', of: 'source' }).text).toBe('250');
    expect(one(a1, { kind: 'voltage', of: 'source', peak: true }).text).toBe('250√2');
  });
});

describe('computeAcQuery — is_resonance 3 verdict (§8.1)', () => {
  const src = { f: 50, U: 200 };
  it('Z_L > Z_C ⇒ tinh_cam_khang, ratio 2', () => {
    const a = one({ problemName: 't', source: src, R: 50, L: { n: 2, overPi: true }, C: { n: 1, exp: -4, overPi: true } }, { kind: 'is_resonance' });
    expect(a.verdict).toBe('tinh_cam_khang'); expect(a.text).toBe('2');
  });
  it('Z_L < Z_C ⇒ tinh_dung_khang, ratio 1/2', () => {
    const a = one({ problemName: 't', source: src, R: 50, L: { n: 1, overPi: true }, C: { n: 1, d: 2, exp: -4, overPi: true } }, { kind: 'is_resonance' });
    expect(a.verdict).toBe('tinh_dung_khang'); expect(a.text).toBe('1/2');
  });
  it('Z_L = Z_C ⇒ cong_huong, ratio 1', () => {
    const a = one({ problemName: 't', source: src, R: 50, L: { n: 1, overPi: true }, C: { n: 1, exp: -4, overPi: true } }, { kind: 'is_resonance' });
    expect(a.verdict).toBe('cong_huong'); expect(a.text).toBe('1');
  });
});

describe('computeAcQuery — write_* (§8.2) ráp chuỗi + sign pha (U+2212)', () => {
  it('write_current cảm kháng ⇒ φ_i < 0 ⇒ " − "', () => {
    const a = one(a6, { kind: 'write_current' });
    expect(a.text).toBe('i = 2cos(100πt − π/4) (A)');
    expect(a.expr).toEqual({ amp: '2', omega: '100π', phase: '−π/4' });
    expect(a.text.includes(MINUS)).toBe(true);
  });
  it('write_voltage of L: u_L sớm pha π/2 so i ⇒ pha π/4', () => {
    // A6: φ_i = −π/4 ⇒ pha u_L = −π/4 + π/2 = π/4; biên độ = I₀·Z_L = 2·200 = 400.
    const a = one(a6, { kind: 'write_voltage', of: 'L' });
    expect(a.text).toBe('u = 400cos(100πt + π/4) (V)');
  });
  it('write_voltage of source: pha φ_u = 0', () => {
    const a = one(a6, { kind: 'write_voltage', of: 'source' });
    expect(a.text).toBe('u = 200√2cos(100πt) (V)');
  });
});

describe('computeAcQuery — input số lẻ ⇒ approximate trung thực (§3.3)', () => {
  it('L thập phân thuần ⇒ impedance số + approximate:true', () => {
    const a = one({ problemName: 't', source: { f: 50, U: 200 }, R: 100, L: 0.5, C: 1e-4 }, { kind: 'impedance' });
    expect(a.approximate).toBe(true);
    expect(Number.isFinite(a.approx)).toBe(true);
  });
});

describe('normalizeMinus (VỪA-2)', () => {
  it("đổi '-' U+002D → '−' U+2212", () => {
    expect(normalizeMinus('-π/4').charCodeAt(0)).toBe(0x2212);
    expect(normalizeMinus('a-b')).toBe('a−b');
  });
});
