// api/_lib/kernel/chem/atomicMass.ts
// Bảng NGUYÊN TỬ KHỐI theo SGK Việt Nam (số tròn đề thi — spec chem §6), lưu hữu tỉ exact.
// KHÔNG dùng IUPAC lẻ (Fe = 55,845…) để đáp số khớp đáp án SGK/đề thi.
// Review F15: BỎ Ar khỏi bảng (spec in 40, SGK in 39,9; DB v0 không dùng Ar —
// tránh chứa một dòng sai). Các NTK còn lại đã được phản biện xác nhận đúng.
import { type Rat, rat } from './rat';

export const ATOMIC_MASS: Record<string, Rat> = {
  H: rat(1n),
  He: rat(4n),
  Li: rat(7n),
  Be: rat(9n),
  B: rat(11n),
  C: rat(12n),
  N: rat(14n),
  O: rat(16n),
  F: rat(19n),
  Ne: rat(20n),
  Na: rat(23n),
  Mg: rat(24n),
  Al: rat(27n),
  Si: rat(28n),
  P: rat(31n),
  S: rat(32n),
  Cl: rat(71n, 2n), // 35,5
  K: rat(39n),
  Ca: rat(40n),
  Cr: rat(52n),
  Mn: rat(55n),
  Fe: rat(56n),
  Ni: rat(59n),
  Cu: rat(64n),
  Zn: rat(65n),
  Br: rat(80n),
  Ag: rat(108n),
  Sn: rat(119n),
  I: rat(127n),
  Ba: rat(137n),
  Au: rat(197n),
  Hg: rat(201n),
  Pb: rat(207n),
};

export function atomicMassOf(symbol: string): Rat {
  const m = ATOMIC_MASS[symbol];
  if (!m) throw new Error(`Không có nguyên tử khối của nguyên tố "${symbol}" trong bảng SGK v0`);
  return m;
}
