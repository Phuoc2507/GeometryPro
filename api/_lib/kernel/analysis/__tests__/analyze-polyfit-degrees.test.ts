// fitPoly khớp đa thức qua các điểm (Vandermonde). Bậc 1 (đường thẳng qua 2 điểm) và bậc 4 (qua 5 điểm).
// Kiểm bằng evalPoly để không phụ thuộc thứ tự hệ số. leading để trống ⇒ cần degree+1 ràng buộc.
import { describe, it, expect } from 'vitest';
import { fitPoly, evalPoly } from '../polyfit';

describe('fitPoly — bậc 1 và bậc 4', () => {
  it('bậc 1 qua (0,1),(2,5) → đường 1+2x', () => {
    const c = fitPoly(1, [[0, 1], [2, 5]]);
    expect(evalPoly(c, 0)).toBeCloseTo(1, 9);
    expect(evalPoly(c, 2)).toBeCloseTo(5, 9);
    expect(evalPoly(c, 1)).toBeCloseTo(3, 9); // nội suy giữa
  });

  it('bậc 4 qua (i, i^4) i=0..4 → khớp x^4', () => {
    const c = fitPoly(4, [[0, 0], [1, 1], [2, 16], [3, 81], [4, 256]]);
    expect(evalPoly(c, 2)).toBeCloseTo(16, 6);   // điểm đã khớp
    expect(evalPoly(c, 4)).toBeCloseTo(256, 4);  // điểm đã khớp
    expect(evalPoly(c, 2.5)).toBeCloseTo(39.0625, 3); // 2.5^4, nội suy duy nhất
  });
});
