import { describe, it, expect } from 'vitest';
import { safetyTierMeta, verifiedToLevel, exactnessLabel } from './safetyTier';

describe('safetyTier', () => {
  it('Mức 1 = tone ok, nhãn "Đã kiểm chứng"', () => {
    expect(safetyTierMeta(1).tone).toBe('ok');
    expect(safetyTierMeta(1).label).toBe('Đã kiểm chứng');
  });
  it('Mức 2 = tone muted, nhãn minh hoạ', () => {
    expect(safetyTierMeta(2).tone).toBe('muted');
    expect(safetyTierMeta(2).label).toContain('Minh hoạ');
  });
  it('Mức 3 = tone info (KHÔNG đỏ/hù dọa)', () => {
    expect(safetyTierMeta(3).tone).toBe('info');
  });
  it('verifiedToLevel: true→1, false→3', () => {
    expect(verifiedToLevel(true)).toBe(1);
    expect(verifiedToLevel(false)).toBe(3);
  });
  it('exactnessLabel', () => {
    expect(exactnessLabel('exact')).toBe('chính xác');
    expect(exactnessLabel('numeric')).toBe('giá trị số');
    expect(exactnessLabel(null)).toBe('');
  });
});
