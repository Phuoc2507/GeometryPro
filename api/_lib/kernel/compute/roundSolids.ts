// api/_lib/kernel/compute/roundSolids.ts
// Khối tròn xoay CƠ BẢN cho hình học không gian THPT: NÓN và TRỤ — nhận bán kính đáy r và chiều cao h
// (số / phân số / căn, vd 3, "3/2", "sqrt(3)"), trả đáp DẠNG π / CĂN chính xác (tái dùng piScalarAnswer).
//   • Thể tích nón   V = (1/3)π r² h            • Thể tích trụ    V = π r² h
//   • Sxq nón        = π r l  (l = √(r²+h²))    • Sxq trụ         = 2π r h
//   • Stp nón        = π r (l + r)              • Stp trụ         = 2π r (h + r)
//   • Đường sinh nón l = √(r² + h²)             (căn chính xác, không π)
import { type Scalar, add, mul, sqrt, rat } from '../scalar';
import { parseScalar } from '../dialects/oxyzInput';
import { type ScalarAnswer, piScalarAnswer, certifyScalar } from './answer';

type SIn = number | string;
const S = (x: SIn): Scalar => parseScalar(x);

// Đường sinh nón l = √(r² + h²) — nằm trong trường (r²+h² hữu tỉ → sqrt → căn).
function slantScalar(r: Scalar, h: Scalar): Scalar {
  return sqrt(add(mul(r, r), mul(h, h)));
}

export function coneVolume(rIn: SIn, hIn: SIn): ScalarAnswer {
  const r = S(rIn), h = S(hIn);
  const coeff = mul(rat(1n, 3n), mul(mul(r, r), h)); // (1/3)·r²·h
  return piScalarAnswer('volume', coeff, (1 / 3) * Math.PI * r.approx * r.approx * h.approx);
}

export function cylinderVolume(rIn: SIn, hIn: SIn): ScalarAnswer {
  const r = S(rIn), h = S(hIn);
  return piScalarAnswer('volume', mul(mul(r, r), h), Math.PI * r.approx * r.approx * h.approx);
}

export function coneSlant(rIn: SIn, hIn: SIn): ScalarAnswer {
  const r = S(rIn), h = S(hIn);
  return certifyScalar('slant', slantScalar(r, h), Math.hypot(r.approx, h.approx));
}

export function coneArea(rIn: SIn, hIn: SIn, part: 'lateral' | 'total'): ScalarAnswer {
  const r = S(rIn), h = S(hIn);
  const l = slantScalar(r, h);
  const lf = Math.hypot(r.approx, h.approx);
  if (part === 'lateral') return piScalarAnswer('area', mul(r, l), Math.PI * r.approx * lf); // π r l
  return piScalarAnswer('area', mul(r, add(l, r)), Math.PI * r.approx * (lf + r.approx));    // π r (l+r)
}

export function cylinderArea(rIn: SIn, hIn: SIn, part: 'lateral' | 'total'): ScalarAnswer {
  const r = S(rIn), h = S(hIn);
  if (part === 'lateral') return piScalarAnswer('area', mul(rat(2n), mul(r, h)), 2 * Math.PI * r.approx * h.approx); // 2π r h
  return piScalarAnswer('area', mul(rat(2n), mul(r, add(h, r))), 2 * Math.PI * r.approx * (h.approx + r.approx));    // 2π r (h+r)
}
