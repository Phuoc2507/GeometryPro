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
