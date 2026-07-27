import { describe, it, expect } from 'vitest';
import {
  evalProfile, revolutionVolumeDisk, buildRevolutionSolidOx,
  revolutionVolumeShellOy, buildRevolutionSolidOy, sampleProfile,
} from '../revolution';

describe('evalProfile', () => {
  it('poly: c0 + c1·x + c2·x²', () => {
    expect(evalProfile({ kind: 'poly', coeffs: [1, 2, 3] }, 2)).toBeCloseTo(1 + 4 + 12, 12);
  });
  it('sqrt: a·√x + b', () => {
    expect(evalProfile({ kind: 'sqrt', a: 2, b: 1 }, 9)).toBeCloseTo(7, 12);
  });
  it('const', () => {
    expect(evalProfile({ kind: 'const', c: 5 }, 123)).toBe(5);
  });
  it('expr: hàm tổng quát theo x (e^x, ln, 1/x, √(4-x²))', () => {
    expect(evalProfile({ kind: 'expr', expr: 'exp(x)' }, 1)).toBeCloseTo(Math.E, 12);
    expect(evalProfile({ kind: 'expr', expr: 'ln(x)' }, Math.E)).toBeCloseTo(1, 12);
    expect(evalProfile({ kind: 'expr', expr: '1/x' }, 4)).toBeCloseTo(0.25, 12);
    expect(evalProfile({ kind: 'expr', expr: 'sqrt(4 - x^2)' }, 0)).toBeCloseTo(2, 12);
  });
});

describe('revolutionVolumeDisk', () => {
  it('y=√x quay quanh Ox trên [0,4] → 8π', () => {
    const { value, estimatedError } = revolutionVolumeDisk(
      { kind: 'sqrt', a: 1, b: 0 },
      [0, 4],
    );
    expect(value).toBeCloseTo(8 * Math.PI, 6);
    expect(estimatedError).toBeLessThan(1e-6);
  });
  it('expr y=e^x quay quanh Ox trên [0,1] → π(e²−1)/2', () => {
    const { value } = revolutionVolumeDisk({ kind: 'expr', expr: 'exp(x)' }, [0, 1]);
    expect(value).toBeCloseTo((Math.PI * (Math.E * Math.E - 1)) / 2, 6);
  });
  it('vành khăn (washer) y=x (ngoài) & y=x² (trong) trên [0,1] → 2π/15', () => {
    const { value } = revolutionVolumeDisk(
      { kind: 'poly', coeffs: [0, 1] },       // outer = x
      [0, 1],
      { kind: 'poly', coeffs: [0, 0, 1] },    // inner = x²
    );
    expect(value).toBeCloseTo((2 * Math.PI) / 15, 6);
  });
});

describe('revolutionVolumeShellOy (quanh Oy, vỏ trụ)', () => {
  it('y=x² trên [0,1] quay quanh Oy → π/2', () => {
    const { value, estimatedError } = revolutionVolumeShellOy({ kind: 'poly', coeffs: [0, 0, 1] }, [0, 1]);
    expect(value).toBeCloseTo(Math.PI / 2, 6);
    expect(estimatedError).toBeLessThan(1e-6);
  });
});

describe('sampleProfile (mẫu cho frontend)', () => {
  it('trả n+1 điểm, radius không âm, hữu hạn', () => {
    const s = sampleProfile({ kind: 'expr', expr: '1/x' }, [1, 2], 8);
    expect(s).toHaveLength(9);
    expect(s.every((p) => Number.isFinite(p.r) && p.r >= 0)).toBe(true);
  });
});

describe('buildRevolutionSolidOy', () => {
  it('gói khối shell quanh Oy: axis=Oy, method=shell, có samples, verified', () => {
    const s = buildRevolutionSolidOy('rev1', { kind: 'poly', coeffs: [0, 0, 1] }, [0, 1], '#6366f1');
    expect(s.axis).toBe('Oy');
    expect(s.method).toBe('shell');
    expect(s.samples && s.samples.length).toBeGreaterThan(0);
    expect(s.volume?.value).toBeCloseTo(Math.PI / 2, 6);
    expect(s.volume?.verified).toBe(true);
    expect(s.volume?.latex).toContain('2\\pi');
  });
});

describe('buildRevolutionSolidOx (washer + samples)', () => {
  it('có inner ⇒ method=washer, kèm samples & innerSamples', () => {
    const s = buildRevolutionSolidOx('rev1', { kind: 'poly', coeffs: [0, 1] }, [0, 1], '#6366f1', { kind: 'poly', coeffs: [0, 0, 1] });
    expect(s.method).toBe('washer');
    expect(s.inner).toBeDefined();
    expect(s.samples && s.samples.length).toBeGreaterThan(0);
    expect(s.innerSamples && s.innerSamples.length).toBeGreaterThan(0);
    expect(s.volume?.value).toBeCloseTo((2 * Math.PI) / 15, 6);
  });
});

describe('buildRevolutionSolidOx', () => {
  it('gói khối với volume đã verified + latex', () => {
    const s = buildRevolutionSolidOx('rev1', { kind: 'sqrt', a: 1, b: 0 }, [0, 4], '#6366f1');
    expect(s.id).toBe('rev1');
    expect(s.axis).toBe('Ox');
    expect(s.method).toBe('disk');
    expect(s.domain).toEqual([0, 4]);
    expect(s.color).toBe('#6366f1');
    expect(s.volume?.value).toBeCloseTo(8 * Math.PI, 6);
    expect(s.volume?.verified).toBe(true);
    expect(s.volume?.latex).toContain('\\pi');
    expect(s.volume?.latex).toContain('\\int');
  });
});
