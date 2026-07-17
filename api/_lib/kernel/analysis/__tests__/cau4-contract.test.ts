import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

// Đèn lồng cao 40, mặt cắt vuông; nửa đường chéo r(z) là parabol qua (0,10),(20,14),(40,10).
// Cạnh vuông = r√2 ⇒ diện tích mặt cắt = 2r².  (L0=10√2 ⇒ r=10; Lmax=14√2 ⇒ r=14.)
const LANTERN = { name: 'r', form: 'poly', degree: 2, through: [[0, 10], [20, 14], [40, 10]] };

describe('Câu 4 (đèn lồng) qua runAnalysis', () => {
  it('a) diện tích mặt cắt LỚN NHẤT = 392 cm² (đề nói 196 ⇒ Sai)', () => {
    const r = runAnalysis({
      solidName: 'lantern', functions: [LANTERN],
      parameters: [{ name: 'z', domain: [0, 40] }],
      analyze: { kind: 'optimize', parameter: 'z', sense: 'max', objective: { kind: 'expr', expr: '2*r(z)^2' } },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(392, 6);
  });

  it('c) thể tích = 12,95 lít', () => {
    const r = runAnalysis({
      solidName: 'lantern', functions: [LANTERN],
      analyze: { kind: 'integrate', variable: 'z', from: 0, to: 40, integrand: '2*r(z)^2' },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx / 1000).toBeCloseTo(12.95, 2);
  });

  it('d) bán kính bóng đèn lớn nhất ≈ 2,866 cm', () => {
    // Tâm bóng trên trục, cách đáy 22. Mặt gần trục nhất ở độ cao z cách trục r(z)/√2 (trung điểm cạnh).
    // Khoảng cách tâm→lồng = sqrt((r(z)/√2)² + (z−22)²); trừ 7 (khoảng an toàn) ⇒ bán kính tối đa.
    const r = runAnalysis({
      solidName: 'lantern', functions: [LANTERN],
      parameters: [{ name: 'z', domain: [0, 40] }],
      analyze: {
        kind: 'optimize', parameter: 'z', sense: 'min',
        objective: { kind: 'expr', expr: 'sqrt((r(z)/sqrt(2))^2 + (z-22)^2) - 7' },
      },
    });
    expect(r.ok).toBe(true);
    // Giá trị đúng = 2,866625... (đề in "2,866 cm" là cắt bớt, không phải làm tròn).
    expect(r.answer.approx).toBeCloseTo(2.8666, 3);
  });
});
