// research/vsgeo-bench/analysis/stats.ts
// Các hàm thống kê cho benchmark. Xây dần qua Task 4–7.
import type { EvalRecord, AccuracyRow, McNemarResult } from "./types";
import { mulberry32, randInt, type Rng } from "./rng";

// Quy ước chấm điểm nhị phân: chỉ "correct" tính là 1; "incorrect" VÀ "unsure" tính là 0.
// Vì sao unsure = 0? Trong thi cử, "không đưa được đáp án" cũng là không được điểm.
// Ta ghi rõ quy ước này để bảo vệ trước hội đồng (và để tính riêng tỉ lệ unsure nếu cần).
export function isCorrect(rec: EvalRecord): number {
  return rec.verdict === "correct" ? 1 : 0;
}

// Khoảng tin cậy 95% cho tỉ lệ nhị phân bằng bootstrap percentile.
// sample: mảng 0/1. iters: số lần lấy mẫu lại. seed: cho RNG tất định (test kiểm được).
export function bootstrapCI(sample: number[], iters = 2000, seed = 12345): [number, number] {
  const n = sample.length;
  if (n === 0) return [0, 0];
  const rng: Rng = mulberry32(seed);
  const means: number[] = [];
  for (let it = 0; it < iters; it++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += sample[randInt(rng, n)]; // lấy MỘT phần tử ngẫu nhiên (có hoàn lại)
    }
    means.push(sum / n);
  }
  means.sort((a, b) => a - b);
  const lo = means[Math.floor(0.025 * iters)];
  const hi = means[Math.floor(0.975 * iters)];
  return [lo, hi];
}
