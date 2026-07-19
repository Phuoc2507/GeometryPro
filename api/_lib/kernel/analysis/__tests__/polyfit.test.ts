import { describe, it, expect } from 'vitest';
import { fitPoly, evalPoly, derivPoly, extremumOfPoly } from '../polyfit';

describe('polyfit', () => {
  it('khớp có GHIM hệ số đầu: bậc 2 qua (0,0),(8,0), a=-1/3 → f(x)=-x²/3+8x/3', () => {
    const c = fitPoly(2, [[0, 0], [8, 0]], -1 / 3); // [c0,c1,c2]
    expect(c[0]).toBeCloseTo(0, 10);
    expect(c[1]).toBeCloseTo(8 / 3, 10);
    expect(c[2]).toBeCloseTo(-1 / 3, 10);
  });

  it('khớp ĐỦ điểm: bậc 2 qua (0,10),(20,14),(40,10) → r(z)=-z²/100+0.4z+10', () => {
    const c = fitPoly(2, [[0, 10], [20, 14], [40, 10]]);
    expect(c[0]).toBeCloseTo(10, 10);
    expect(c[1]).toBeCloseTo(0.4, 10);
    expect(c[2]).toBeCloseTo(-0.01, 10);
  });

  it('evalPoly + derivPoly', () => {
    const c = [0, 8 / 3, -1 / 3];
    expect(evalPoly(c, 6)).toBeCloseTo(4, 10);   // f(6)=4
    expect(evalPoly(c, 0)).toBeCloseTo(0, 10);
    const d = derivPoly(c);                       // f'(x) = 8/3 - 2x/3
    expect(evalPoly(d, 6)).toBeCloseTo(-4 / 3, 10);
  });

  it('extremumOfPoly: đỉnh parabol tại x=4, y=16/3', () => {
    const r = extremumOfPoly([0, 8 / 3, -1 / 3], 0, 8);
    expect(r).not.toBeNull();
    expect(r!.x).toBeCloseTo(4, 6);
    expect(r!.y).toBeCloseTo(16 / 3, 6);
  });

  it('sai số điểm → ném', () => {
    expect(() => fitPoly(2, [[0, 0]], -1 / 3)).toThrow();
  });

  it('ràng buộc ĐẠO HÀM: bậc 3 qua (0,0),(2,4),(3,0) + f\'(2)=0 → f = -x³+3x²', () => {
    const c = fitPoly(3, [[0, 0], [2, 4], [3, 0]], undefined, [[2, 0]]);
    expect(c[0]).toBeCloseTo(0, 9);
    expect(c[1]).toBeCloseTo(0, 9);
    expect(c[2]).toBeCloseTo(3, 9);
    expect(c[3]).toBeCloseTo(-1, 9);
  });

  it('slopeAt phối hợp với leading đã ghim', () => {
    // bậc 2, ghim hệ số đầu = -1/3, chỉ cần 2 ràng buộc: qua (0,0) và f'(4)=0 (đỉnh tại x=4)
    const c = fitPoly(2, [[0, 0]], -1 / 3, [[4, 0]]);
    expect(c[0]).toBeCloseTo(0, 9);
    expect(c[1]).toBeCloseTo(8 / 3, 9);   // f'(x) = -2x/3 + c1 ; f'(4)=0 ⇒ c1 = 8/3
    expect(c[2]).toBeCloseTo(-1 / 3, 9);
  });

  it('tổng ràng buộc sai số lượng → ném', () => {
    expect(() => fitPoly(3, [[0, 0], [2, 4]], undefined, [[2, 0]])).toThrow(); // 3 ràng buộc cho 4 ẩn
  });

  it('extremumOfPoly LOẠI điểm uốn: x³ trên [−1,1] → null (f\'(0)=0 nhưng f\'\'(0)=0, là điểm uốn)', () => {
    expect(extremumOfPoly([0, 0, 0, 1], -1, 1)).toBeNull();
  });

  it('extremumOfPoly chọn đúng max/min: f=x³−3x có cực đại tại x=−1, cực tiểu tại x=1', () => {
    const c = [0, -3, 0, 1]; // -3x + x³
    const mx = extremumOfPoly(c, -2, 2, 'max');
    const mn = extremumOfPoly(c, -2, 2, 'min');
    expect(mx!.x).toBeCloseTo(-1, 6); expect(mx!.y).toBeCloseTo(2, 6);   // f(−1)=2
    expect(mn!.x).toBeCloseTo(1, 6); expect(mn!.y).toBeCloseTo(-2, 6);   // f(1)=−2
  });

  it('extremumOfPoly parabola (Câu 1) không đổi: đỉnh tại x=4, y=16/3', () => {
    const r = extremumOfPoly([0, 8 / 3, -1 / 3], 0, 8);
    expect(r!.x).toBeCloseTo(4, 6);
    expect(r!.y).toBeCloseTo(16 / 3, 6);
  });
});
