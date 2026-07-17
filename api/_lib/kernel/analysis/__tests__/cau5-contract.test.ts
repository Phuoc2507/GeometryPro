import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('Câu 5 (hồ bơi) qua runAnalysis', () => {
  it('MN ngắn nhất từ đường cong bậc ba tới đường nhựa ≈ 7,49 m', () => {
    const r = runAnalysis({
      solidName: 'pool',
      // f: bậc ba qua O(0,0), B(2,4), C(3,0); B là CỰC ĐẠI ⇒ f'(2)=0. Engine tự khớp ⇒ f = -x³+3x².
      functions: [{ name: 'f', form: 'poly', degree: 3, through: [[0, 0], [2, 4], [3, 0]], slopeAt: [[2, 0]] }],
      // a chạy trên đồ thị f (nhánh B→C), b chạy trên đường nhựa g(x)=(x+1)/(x-2), x>2.
      parameters: [{ name: 'a', domain: [2, 3] }, { name: 'b', domain: [2.05, 7] }],
      analyze: {
        kind: 'optimize_multi', parameters: ['a', 'b'], sense: 'min',
        // ×10 vì đơn vị mỗi trục là 10 m.
        objective: { kind: 'expr', expr: '10*sqrt((a-b)^2 + (f(a)-(b+1)/(b-2))^2)' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(7.485, 2);
    expect(Number(r.answer.approx.toFixed(2))).toBe(7.49);
  });
});
