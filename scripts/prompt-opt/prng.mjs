// scripts/prompt-opt/prng.mjs
// RNG có HẠT GIỐNG (mulberry32) — để mọi lần chạy tối ưu prompt TÁI LẬP được: cùng --seed ⇒ cùng
// quần thể khởi tạo, cùng lai ghép/đột biến. KHÔNG dùng Math.random (không tái lập, không kiểm thử được).

export function makeRng(seed = 42) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,                                    // số thực [0,1)
    int: (n) => Math.floor(next() * n),      // số nguyên [0,n)
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    bool: (p = 0.5) => next() < p,
    shuffle: (arr) => {                       // Fisher–Yates tại chỗ, dùng cùng RNG
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  };
}
