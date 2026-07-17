// api/_lib/kernel/analysis/solver1d.ts
// Bộ giải phương trình một biến — Đợt A chỉ cần bậc ≤ 2 (đủ cho các bài quy về bậc hai như Câu 9).
// Giữ EXACT khi kết quả ở trong trường một-căn của Scalar (vd ±√7, hữu tỉ); nghiệm nhị thức căn
// (−b±√Δ)/2a với b≠0 tự động rơi về số (exact=null) — tầng recognize sẽ nhận dạng lại dạng đẹp.
import { type Scalar, add, sub, mul, neg, div, rat, sqrt } from '../scalar';
import { cmpScalar, isZeroS } from '../compute/answer';

// Giải a·x² + b·x + c = 0 trên tập số thực. Trả 0/1/2 nghiệm (Scalar). a=0 ⇒ tuyến tính.
export function solveQuadratic(a: Scalar, b: Scalar, c: Scalar): Scalar[] {
  if (isZeroS(a)) {
    if (isZeroS(b)) return []; // c=0: vô số / c≠0: vô nghiệm — cả hai trả []
    return [neg(div(c, b))];
  }
  const disc = sub(mul(b, b), mul(mul(rat(4n), a), c));
  const cmp = cmpScalar(disc, rat(0n));
  if (cmp < 0) return [];
  const twoA = mul(rat(2n), a);
  if (cmp === 0) return [neg(div(b, twoA))];
  const sq = sqrt(disc);
  return [div(sub(neg(b), sq), twoA), div(add(neg(b), sq), twoA)];
}
