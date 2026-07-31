// research/vsgeo-bench/analysis/kappa.ts
// Cohen's kappa — đo độ đồng thuận giữa HAI người dán nhãn, trừ đi phần trùng do may rủi.
// labelsA[i], labelsB[i] = nhãn của cùng mục i bởi hai người. Hai mảng phải cùng độ dài.
export function cohensKappa(labelsA: string[], labelsB: string[]): number {
  if (labelsA.length !== labelsB.length) {
    throw new Error("Hai mảng nhãn phải cùng độ dài");
  }
  const n = labelsA.length;
  if (n === 0) throw new Error("Cần ít nhất một mục để tính kappa");

  // Po: tỉ lệ hai người trùng nhãn (đồng thuận quan sát).
  let agree = 0;
  for (let i = 0; i < n; i++) if (labelsA[i] === labelsB[i]) agree++;
  const po = agree / n;

  // Pe: đồng thuận kỳ vọng do may rủi = Σ (tần suất nhãn của A) × (tần suất nhãn của B).
  const catsA = new Map<string, number>();
  const catsB = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    catsA.set(labelsA[i], (catsA.get(labelsA[i]) ?? 0) + 1);
    catsB.set(labelsB[i], (catsB.get(labelsB[i]) ?? 0) + 1);
  }
  const cats = new Set<string>([...catsA.keys(), ...catsB.keys()]);
  let pe = 0;
  for (const c of cats) {
    const pa = (catsA.get(c) ?? 0) / n;
    const pb = (catsB.get(c) ?? 0) / n;
    pe += pa * pb;
  }

  // Nếu Pe = 1 (cả hai gán CÙNG một nhãn cho mọi mục) -> mẫu số 0. Quy ước: đồng thuận hoàn toàn -> 1.
  if (pe === 1) return 1;
  return (po - pe) / (1 - pe);
}
