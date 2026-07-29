import { describe, it, expect } from 'vitest';
import {
  evalProfile, revolutionVolumeDisk, buildRevolutionSolidOx,
  revolutionVolumeShellOy, buildRevolutionSolidOy, buildRevolutionSolidOyDisk, sampleProfile,
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
  it('expr theo BIẾN y (đường x=g(y) quanh Oy): không ném "Biến chưa gán: y"', () => {
    // Lỗ hổng Oy: đĩa/vành khăn theo y nhận biên dạng viết theo y (vd x=√y). ProfileFn 1 biến ⇒ gán
    // giá trị trục cho CẢ x lẫn y để expr theo y không văng lỗi (trước đây chỉ gán x ⇒ 500).
    expect(evalProfile({ kind: 'expr', expr: 'sqrt(y)' }, 4)).toBeCloseTo(2, 12);
    expect(evalProfile({ kind: 'expr', expr: '3 - y' }, 1)).toBeCloseTo(2, 12);
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
  it('vành khăn BỀN với hoán đổi ngoài/trong: dù gán nhầm vẫn ra thể tích DƯƠNG đúng', () => {
    // Bug thật: nếu LLM gán nhầm đường trong thành "ngoài", π(ro²−ri²) âm ⇒ thể tích ÂM mà vẫn "verified".
    // Sửa: lấy |ro²−ri²| theo từng điểm ⇒ kết quả bằng nhau bất kể thứ tự, luôn ≥ 0.
    const correct = revolutionVolumeDisk({ kind: 'poly', coeffs: [0, 1] }, [0, 1], { kind: 'poly', coeffs: [0, 0, 1] });
    const swapped = revolutionVolumeDisk({ kind: 'poly', coeffs: [0, 0, 1] }, [0, 1], { kind: 'poly', coeffs: [0, 1] });
    expect(swapped.value).toBeGreaterThan(0);
    expect(swapped.value).toBeCloseTo(correct.value, 6);
    expect(swapped.value).toBeCloseTo((2 * Math.PI) / 15, 6);
  });
});

describe('revolutionVolumeShellOy (quanh Oy, vỏ trụ)', () => {
  it('y=x² trên [0,1] quay quanh Oy → π/2', () => {
    const { value, estimatedError } = revolutionVolumeShellOy({ kind: 'poly', coeffs: [0, 0, 1] }, [0, 1]);
    expect(value).toBeCloseTo(Math.PI / 2, 6);
    expect(estimatedError).toBeLessThan(1e-6);
  });
  it('MIỀN 2 ĐƯỜNG y=x (trên) & y=x² (dưới) quay quanh Oy → π/6 (chiều cao vỏ = outer−inner)', () => {
    // Lỗ hổng Oy: khi LLM đưa cặp đường y=f(x) CHƯA nghịch đảo (outer=x, inner=x²), vỏ trụ phải lấy
    // chiều cao = |outer−inner| ⇒ 2π∫₀¹ x(x−x²)dx = π/6. Trước sửa: bỏ inner ⇒ 2π/3 (SAI).
    const { value, estimatedError } = revolutionVolumeShellOy(
      { kind: 'poly', coeffs: [0, 1] },       // outer = x
      [0, 1],
      { kind: 'poly', coeffs: [0, 0, 1] },    // inner = x²
    );
    expect(value).toBeCloseTo(Math.PI / 6, 6);
    expect(estimatedError).toBeLessThan(1e-6);
  });
  it('vỏ trụ 2 đường BỀN với hoán đổi trên/dưới (|outer−inner|) ⇒ cùng π/6', () => {
    const swapped = revolutionVolumeShellOy(
      { kind: 'poly', coeffs: [0, 0, 1] },    // outer = x²
      [0, 1],
      { kind: 'poly', coeffs: [0, 1] },       // inner = x
    );
    expect(swapped.value).toBeCloseTo(Math.PI / 6, 6);
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
  it('vỏ trụ 2 đường (có inner): y=x & y=x² quanh Oy → π/6, có inner+innerSamples, latex trừ (ng−tr)', () => {
    const s = buildRevolutionSolidOy(
      'rev1',
      { kind: 'poly', coeffs: [0, 1] },       // outer = x
      [0, 1], '#6366f1',
      { kind: 'poly', coeffs: [0, 0, 1] },    // inner = x²
    );
    expect(s.axis).toBe('Oy');
    expect(s.method).toBe('shell');
    expect(s.inner).toBeDefined();
    expect(s.innerSamples && s.innerSamples.length).toBeGreaterThan(0);
    expect(s.volume?.value).toBeCloseTo(Math.PI / 6, 6);
    expect(s.volume?.verified).toBe(true);
    expect(s.volume?.latex).toContain('2\\pi');
  });
});

describe('buildRevolutionSolidOyDisk (quanh Oy, đĩa/vành khăn theo y — đường x=g(y))', () => {
  it('Ví dụ 4: x=5−y² (ngoài) & x=3−y (trong) quay quanh Oy trên y∈[−1,2] → 30.6π', () => {
    // Miền kẹp giữa 2 đường x=g(y); tiết diện tại mỗi y là vành khăn (x_ng²−x_tr²).
    // V=π∫_{-1}^{2}((5−y²)²−(3−y)²)dy = π·30.6 ≈ 96.13.
    const s = buildRevolutionSolidOyDisk(
      'rev1',
      { kind: 'poly', coeffs: [5, 0, -1] },   // x_ng(y) = 5 − y²
      [-1, 2], '#6366f1',
      { kind: 'poly', coeffs: [3, -1] },      // x_tr(y) = 3 − y
    );
    expect(s.axis).toBe('Oy');
    expect(s.method).toBe('washer');
    expect(s.inner).toBeDefined();
    expect(s.samples && s.samples.length).toBeGreaterThan(0);
    expect(s.innerSamples && s.innerSamples.length).toBeGreaterThan(0);
    expect(s.volume?.value).toBeCloseTo(30.6 * Math.PI, 5);
    expect(s.volume?.verified).toBe(true);
    expect(s.volume?.latex).toContain('dy');   // tích phân theo y (không phải dx)
  });
  it('đĩa đặc quanh Oy (không inner): x=√y trên y∈[0,4] → V=π∫y dy = 8π', () => {
    const s = buildRevolutionSolidOyDisk('rev1', { kind: 'sqrt', a: 1, b: 0 }, [0, 4], '#6366f1');
    expect(s.method).toBe('disk');
    expect(s.inner).toBeUndefined();
    expect(s.volume?.value).toBeCloseTo(8 * Math.PI, 6);
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
