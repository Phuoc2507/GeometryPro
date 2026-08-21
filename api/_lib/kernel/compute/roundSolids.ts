// api/_lib/kernel/compute/roundSolids.ts
// Khối tròn xoay CƠ BẢN cho hình học không gian THPT: NÓN và TRỤ — nhận bán kính đáy r và chiều cao h
// (số / phân số / căn, vd 3, "3/2", "sqrt(3)"), trả đáp DẠNG π / CĂN chính xác (tái dùng piScalarAnswer).
//   • Thể tích nón   V = (1/3)π r² h            • Thể tích trụ    V = π r² h
//   • Sxq nón        = π r l  (l = √(r²+h²))    • Sxq trụ         = 2π r h
//   • Stp nón        = π r (l + r)              • Stp trụ         = 2π r (h + r)
//   • Đường sinh nón l = √(r² + h²)             (căn chính xác, không π)
import { type Scalar, add, sub, mul, sqrt, rat } from '../scalar';
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

// ---- NÓN CỤT (frustum của nón): bán kính đáy lớn R, đáy nhỏ r, chiều cao h ----
// Đường sinh nón cụt l = √(h² + (R−r)²).
function frustumSlantScalar(R: Scalar, r: Scalar, h: Scalar): Scalar {
  const d = sub(R, r);
  return sqrt(add(mul(h, h), mul(d, d)));
}

export function coneFrustumVolume(RIn: SIn, rIn: SIn, hIn: SIn): ScalarAnswer {
  const R = S(RIn), r = S(rIn), h = S(hIn);
  // V = (1/3)π h (R² + Rr + r²)
  const coeff = mul(rat(1n, 3n), mul(h, add(add(mul(R, R), mul(R, r)), mul(r, r))));
  const rf = (1 / 3) * Math.PI * h.approx * (R.approx * R.approx + R.approx * r.approx + r.approx * r.approx);
  return piScalarAnswer('volume', coeff, rf);
}

export function coneFrustumSlant(RIn: SIn, rIn: SIn, hIn: SIn): ScalarAnswer {
  const R = S(RIn), r = S(rIn), h = S(hIn);
  return certifyScalar('slant', frustumSlantScalar(R, r, h), Math.hypot(h.approx, R.approx - r.approx));
}

export function coneFrustumArea(RIn: SIn, rIn: SIn, hIn: SIn, part: 'lateral' | 'total'): ScalarAnswer {
  const R = S(RIn), r = S(rIn), h = S(hIn);
  const l = frustumSlantScalar(R, r, h);
  const lf = Math.hypot(h.approx, R.approx - r.approx);
  const lateralCoeff = mul(add(R, r), l);                     // (R+r) l
  const latRf = Math.PI * (R.approx + r.approx) * lf;
  if (part === 'lateral') return piScalarAnswer('area', lateralCoeff, latRf); // π(R+r)l
  // total = π(R+r)l + πR² + πr²
  const coeff = add(lateralCoeff, add(mul(R, R), mul(r, r)));
  const rf = latRf + Math.PI * (R.approx * R.approx + r.approx * r.approx);
  return piScalarAnswer('area', coeff, rf);
}

// ---- CHÓP CỤT (frustum của chóp): diện tích đáy lớn S1, đáy nhỏ S2, chiều cao h. KHÔNG có π. ----
// V = (1/3) h (S1 + S2 + √(S1·S2)).
export function pyramidFrustumVolume(s1In: SIn, s2In: SIn, hIn: SIn): ScalarAnswer {
  const s1 = S(s1In), s2 = S(s2In), h = S(hIn);
  const coeff = mul(rat(1n, 3n), mul(h, add(add(s1, s2), sqrt(mul(s1, s2)))));
  const rf = (1 / 3) * h.approx * (s1.approx + s2.approx + Math.sqrt(s1.approx * s2.approx));
  return certifyScalar('volume', coeff, rf);
}
