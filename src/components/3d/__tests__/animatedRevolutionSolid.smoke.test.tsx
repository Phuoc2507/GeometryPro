import { describe, it, expect } from 'vitest';
import { profileSamplesForTest } from '../AnimatedRevolutionSolid';

describe('AnimatedRevolutionSolid · biên dạng', () => {
  it('sinh điểm lathe (radius,axial) đúng đầu-cuối cho √x trên [0,4]', () => {
    const pts = profileSamplesForTest({ kind: 'sqrt', a: 1, b: 0 }, [0, 4], 8);
    expect(pts[0]).toMatchObject({ axial: 0 });
    expect(pts[0].radius).toBeCloseTo(0, 9);
    const last = pts[pts.length - 1];
    expect(last.axial).toBeCloseTo(4, 9);
    expect(last.radius).toBeCloseTo(2, 9); // √4 = 2
  });
});
