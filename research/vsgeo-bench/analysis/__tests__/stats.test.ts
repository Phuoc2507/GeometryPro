import { describe, it, expect } from "vitest";
import { bootstrapCI } from "../stats";

describe("bootstrapCI — khoảng tin cậy 95% cho tỉ lệ nhị phân", () => {
  it("mẫu toàn 1 -> khoảng [1, 1]", () => {
    expect(bootstrapCI([1, 1, 1, 1], 1000, 123)).toEqual([1, 1]);
  });

  it("mẫu toàn 0 -> khoảng [0, 0]", () => {
    expect(bootstrapCI([0, 0, 0, 0], 1000, 123)).toEqual([0, 0]);
  });

  it("mẫu rỗng -> [0, 0]", () => {
    expect(bootstrapCI([], 1000, 123)).toEqual([0, 0]);
  });

  it("cùng seed -> kết quả tất định (chạy lại y hệt)", () => {
    const sample = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0]; // mean = 0.6
    expect(bootstrapCI(sample, 2000, 777)).toEqual(bootstrapCI(sample, 2000, 777));
  });

  it("khoảng bao quanh giá trị trung bình quan sát", () => {
    const sample = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0]; // mean = 0.6
    const [lo, hi] = bootstrapCI(sample, 2000, 777);
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeLessThanOrEqual(1);
    expect(lo).toBeLessThanOrEqual(0.6);
    expect(hi).toBeGreaterThanOrEqual(0.6);
  });
});

import { accuracyBy } from "../stats";
import type { EvalRecord, Verdict } from "../types";

// Hàm tạo bản ghi gọn cho test.
function rec(seedId: string, modelId: string, verdict: Verdict, raw = ""): EvalRecord {
  return {
    seedId, modelId, run: 1, promptStyle: "zero_shot",
    rawOutput: raw, extractedAnswer: null, verdict, latencyMs: 0,
  };
}

describe("accuracyBy — gom nhóm & tính accuracy", () => {
  const records: EvalRecord[] = [
    rec("s1", "gpt", "correct"),
    rec("s1", "gpt", "incorrect"),
    rec("s2", "gemini", "correct"),
    rec("s2", "gemini", "correct"),
  ];

  it("gom theo model, đếm đúng/tổng và accuracy", () => {
    const rows = accuracyBy(records, (r) => r.modelId);
    const gpt = rows.find((r) => r.key === "gpt")!;
    expect(gpt.correct).toBe(1);
    expect(gpt.total).toBe(2);
    expect(gpt.accuracy).toBe(0.5);
    const gem = rows.find((r) => r.key === "gemini")!;
    expect(gem.accuracy).toBe(1);
  });

  it("mỗi dòng có khoảng tin cậy 95%", () => {
    const rows = accuracyBy(records, (r) => r.modelId, { ciIters: 500, seed: 1 });
    for (const row of rows) {
      expect(row.ci95[0]).toBeLessThanOrEqual(row.accuracy);
      expect(row.ci95[1]).toBeGreaterThanOrEqual(row.accuracy);
    }
  });

  it("keyFn trả MẢNG -> tính vào nhiều nhóm", () => {
    const rows = accuracyBy(records, () => ["A", "B"]);
    expect(rows.find((r) => r.key === "A")!.total).toBe(4);
    expect(rows.find((r) => r.key === "B")!.total).toBe(4);
  });

  it("sắp xếp các dòng theo key cho ổn định", () => {
    const rows = accuracyBy(records, (r) => r.modelId);
    expect(rows.map((r) => r.key)).toEqual(["gemini", "gpt"]);
  });
});

import { mcnemar } from "../stats";

describe("mcnemar — kiểm định ghép cặp cho 2 model", () => {
  it("b = c: gần như không khác biệt (p lớn)", () => {
    const r = mcnemar(10, 10);
    expect(r.statistic).toBeCloseTo(0.05, 3); // (|0|-1)^2 / 20 = 0.05
    expect(r.pValue).toBeGreaterThan(0.5);
  });

  it("b + c = 0: không có bài bất đồng -> p = 1", () => {
    const r = mcnemar(0, 0);
    expect(r.statistic).toBe(0);
    expect(r.pValue).toBe(1);
  });

  it("khác biệt vừa: b=25, c=15 -> χ² = 2.025", () => {
    const r = mcnemar(25, 15);
    expect(r.statistic).toBeCloseTo(2.025, 3);
    expect(r.pValue).toBeCloseTo(0.155, 2); // tra bảng χ² 1 bậc tự do
  });

  it("khác biệt mạnh: b=30, c=5 -> p rất nhỏ", () => {
    const r = mcnemar(30, 5);
    expect(r.statistic).toBeCloseTo(16.457, 2); // (24-1)^2 / 35
    expect(r.pValue).toBeLessThan(0.001);
  });
});

import { isConfident, calibrationRate } from "../stats";

describe("isConfident — heuristic 'quả quyết'", () => {
  it("có kết luận + không rào đón -> quả quyết", () => {
    expect(isConfident("... Vậy đáp án là \\boxed{3}.")).toBe(true);
  });
  it("có từ rào đón -> KHÔNG quả quyết", () => {
    expect(isConfident("Tôi nghĩ có thể là \\boxed{3} nhưng không chắc.")).toBe(false);
  });
  it("không có kết luận nào -> KHÔNG quả quyết", () => {
    expect(isConfident("Bài này cần tính khoảng cách...")).toBe(false);
  });
});

describe("calibrationRate — tỉ lệ 'tự tin nhưng sai'", () => {
  it("chỉ tính trên câu SAI; đếm câu sai quả quyết", () => {
    const records: EvalRecord[] = [
      rec("s1", "gpt", "incorrect", "Vậy đáp án \\boxed{2}."),      // sai + quả quyết
      rec("s2", "gpt", "incorrect", "Có lẽ là 2, mình không chắc."), // sai + rào đón
      rec("s3", "gpt", "correct", "Vậy \\boxed{1}."),               // đúng -> bỏ qua
    ];
    const r = calibrationRate(records);
    expect(r.totalWrong).toBe(2);
    expect(r.confidentWrong).toBe(1);
    expect(r.rate).toBe(0.5);
  });

  it("không có câu sai -> rate = 0", () => {
    const r = calibrationRate([rec("s1", "gpt", "correct", "\\boxed{1}")]);
    expect(r.rate).toBe(0);
  });
});
