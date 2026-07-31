// research/vsgeo-bench/analysis/rng.ts
// PRNG tất định "mulberry32" — nhỏ gọn, chất lượng đủ tốt cho bootstrap.
// Nguồn thuật toán: mulberry32 (thuật toán công khai, phổ biến). Ta CHỈ dùng lại.

// Một Rng là hàm không tham số, mỗi lần gọi trả một số thực trong [0, 1).
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0; // ép về nguyên 32-bit không dấu
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // chia cho 2^32 -> [0,1)
  };
}

// Lấy một chỉ số nguyên ngẫu nhiên trong 0..n-1 từ một Rng.
export function randInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n);
}
