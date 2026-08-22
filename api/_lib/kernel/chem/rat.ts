// api/_lib/kernel/chem/rat.ts
// Tiện ích số HỮU TỈ exact cho engine Hóa: bọc Exact (radicand === 1) của ../scalar.ts.
// Trong trường hữu tỉ các phép addExact/subExact/mulExact/divExact đóng kín và không
// bao giờ trả null — assert ở đây chỉ là lưới an toàn (spec chem §4).
import { type Exact, makeExact, addExact, subExact, mulExact, divExact, exactToApprox } from '../scalar';

export type Rat = Exact; // bất biến: radicand === 1

export function rat(num: bigint, den: bigint = 1n): Rat {
  return makeExact(num, den, 1);
}

export const R0: Rat = rat(0n);
export const R1: Rat = rat(1n);

function assertRat(x: Exact | null, opName: string): Rat {
  // Lưới an toàn: không thể xảy ra nếu mọi giá trị đi qua rat.ts (radicand luôn 1).
  if (x === null || x.radicand !== 1) {
    throw new Error(`rat.${opName}: rời khỏi trường hữu tỉ (bug nội bộ)`);
  }
  return x;
}

export function addR(a: Rat, b: Rat): Rat {
  return assertRat(addExact(a, b), 'addR');
}

export function subR(a: Rat, b: Rat): Rat {
  return assertRat(subExact(a, b), 'subR');
}

export function mulR(a: Rat, b: Rat): Rat {
  return assertRat(mulExact(a, b), 'mulR');
}

// LƯU Ý: chia cho 0 sẽ THROW (divExact). Tầng stoich/runChem phải tự guard/catch
// (review F21) — không được để lỗi này xuyên qua runChem.
export function divR(a: Rat, b: Rat): Rat {
  return assertRat(divExact(a, b), 'divR');
}

// So sánh exact bằng tích chéo BigInt (den luôn > 0 theo makeExact).
export function cmpR(a: Rat, b: Rat): -1 | 0 | 1 {
  const lhs = a.num * b.den;
  const rhs = b.num * a.den;
  return lhs < rhs ? -1 : lhs > rhs ? 1 : 0;
}

export function isZeroR(a: Rat): boolean {
  return a.num === 0n;
}

export function absR(a: Rat): Rat {
  return a.num < 0n ? rat(-a.num, a.den) : a;
}

export function minR(a: Rat, b: Rat): Rat {
  return cmpR(a, b) <= 0 ? a : b;
}

export function ratToString(a: Rat): string {
  return a.den === 1n ? `${a.num}` : `${a.num}/${a.den}`;
}

export function ratApprox(a: Rat): number {
  return exactToApprox(a);
}

// ── parseDecimal — đường CHUỖI THẬP PHÂN an toàn (spec §4) ────────────────────
// number → x.toString() (chuỗi thập phân ngắn nhất khứ hồi của JS) rồi cùng đường
// chuỗi; TUYỆT ĐỐI không dựng phân số bằng nhân 10^k trên double.
// Chấp nhận dấu phẩy VN ("5,6") lẫn dấu chấm ("5.6"), dấu '-' đầu chuỗi.
// Từ chối: NaN/Infinity, dạng mũ (e/E), nhiều dấu phân cách, chuỗi rác, và kiểu
// phân cách nghìn mơ hồ "1.000"/"1,000" (phần thập phân đúng "000" — review F22).
export function parseDecimal(x: number | string): Rat {
  let s: string;
  if (typeof x === 'number') {
    if (!Number.isFinite(x)) throw new Error(`parseDecimal: số không hữu hạn (${x})`);
    s = x.toString();
    if (/[eE]/.test(s)) throw new Error(`parseDecimal: dạng mũ không hỗ trợ ("${s}")`);
  } else {
    s = x.trim();
  }
  if (s === '') throw new Error('parseDecimal: chuỗi rỗng');
  // Bắt luôn KÝ TỰ PHÂN CÁCH (sep) để phân biệt dấu chấm với dấu phẩy — review VỪA-4.
  const m = /^(-?)(\d+)(?:([.,])(\d+))?$/.exec(s);
  if (!m) {
    if ((s.match(/[.,]/g) ?? []).length > 1) {
      throw new Error(`parseDecimal: "${s}" có nhiều dấu phân cách — nghi dấu phân cách nghìn, không hợp lệ`);
    }
    throw new Error(`parseDecimal: không đọc được số từ "${s}"`);
  }
  const [, sign, intPart, sep, fracPart] = m;
  if (fracPart === '000') {
    // "1.000"/"25,000": gần như chắc chắn là dấu phân cách nghìn kiểu VN — mơ hồ, từ chối.
    throw new Error(`parseDecimal: "${s}" giống dấu phân cách nghìn ("1.000") — hãy viết số nguyên không phân cách hoặc bỏ các số 0 thừa`);
  }
  // VỪA-4: dấu CHẤM + đúng 3 chữ số thập phân ("1.500", "2.500") nhập nhằng với dấu phân
  // cách nghìn kiểu VN ("2.500 gam" = 2500) — từ chối; yêu cầu dùng dấu phẩy cho phần thập
  // phân hoặc viết số nguyên. Dấu PHẨY + 3 số ("2,479") vẫn hợp lệ (phẩy = thập phân VN rõ ràng).
  // CHỈ mơ hồ khi phần nguyên KHÁC 0: "1.500"/"25.000" mới có nhóm nghìn; "0.001"/"0.500"
  // (phần nguyên 0) không bao giờ là dấu phân cách nghìn nên vẫn là thập phân hợp lệ.
  if (sep === '.' && fracPart !== undefined && fracPart.length === 3 && intPart !== '0') {
    throw new Error(`parseDecimal: "${s}" dùng dấu CHẤM với đúng 3 chữ số thập phân — nhập nhằng dấu phân cách nghìn kiểu VN ("2.500"=2500); hãy dùng dấu PHẨY cho phần thập phân hoặc viết số nguyên`);
  }
  const frac = fracPart ?? '';
  const num = BigInt(intPart + frac) * (sign === '-' ? -1n : 1n);
  const den = 10n ** BigInt(frac.length);
  return rat(num, den);
}
