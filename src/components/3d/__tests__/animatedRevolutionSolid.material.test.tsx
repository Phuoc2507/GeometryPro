import { describe, it, expect } from 'vitest';
import { solidMaterialForTest } from '../AnimatedRevolutionSolid';

describe('solidMaterialForTest', () => {
  it('translucent → transparent, opacity ~0.55', () => {
    expect(solidMaterialForTest({ translucent: true })).toEqual({ transparent: true, opacity: 0.55 });
  });
  it('không cờ → đục (opacity 1)', () => {
    expect(solidMaterialForTest({})).toEqual({ transparent: false, opacity: 1 });
  });
  it('dim ưu tiên hơn translucent (Advance không hồi quy)', () => {
    expect(solidMaterialForTest({ dim: true, translucent: true })).toEqual({ transparent: true, opacity: 0.25 });
  });
});
