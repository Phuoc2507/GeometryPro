import { describe, it, expect } from 'vitest';
import { planeSgkName } from '../planeSgkLabel';

describe('planeSgkName', () => {
  it('gộp 4 đỉnh placeholder cùng chữ gốc thành tên SGK', () => {
    expect(planeSgkName(['P', "P'", "P''", "P'''"])).toBe('P');
  });

  it('nhận cả dạng chỉ số P1..P4 (pointLabel đổi thành primes)', () => {
    expect(planeSgkName(['P1', 'P2', 'P3', 'P4'])).toBe('P');
  });

  it('mặt tường/mặt đất W1..W4, G1..G4 → (W), (G)', () => {
    expect(planeSgkName(['W1', 'W2', 'W3', 'W4'])).toBe('W');
    expect(planeSgkName(['G1', 'G2', 'G3', 'G4'])).toBe('G');
  });

  it('đỉnh tên thật khác nhau (A,B,C,D) → null, không đụng tới', () => {
    expect(planeSgkName(['A', 'B', 'C', 'D'])).toBeNull();
  });

  it('đỉnh có tên ghép/toạ độ → null', () => {
    expect(planeSgkName(['A(8;0)', 'B', 'C', 'D'])).toBeNull();
  });

  it('dưới 3 đỉnh → null', () => {
    expect(planeSgkName(['P', "P'"])).toBeNull();
  });

  it('trộn chữ gốc khác nhau → null', () => {
    expect(planeSgkName(['P', "P'", "Q'"])).toBeNull();
  });

  it('thiếu nhãn (undefined) → null', () => {
    expect(planeSgkName(['P', undefined, "P''"])).toBeNull();
  });
});
