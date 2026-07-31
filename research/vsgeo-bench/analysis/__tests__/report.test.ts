import { describe, it, expect } from "vitest";
import { buildReport, buildBenchmarkSummary } from "../report";
import type { EvalRecord, Seed, SeedIndex, Verdict } from "../types";

function seed(id: string, topic: string[], difficulty: 1 | 2 | 3 | 4, aux: boolean): Seed {
  return {
    id,
    source: { type: "synthetic", ref: "test" },
    statement_vi: "…",
    answer: { canonical: "1", type: "rational" },
    tags: { topic, answer_form: "rational", difficulty, requires_auxiliary_construction: aux },
  };
}
function rec(seedId: string, modelId: string, verdict: Verdict, raw: string): EvalRecord {
  return { seedId, modelId, run: 1, promptStyle: "zero_shot", rawOutput: raw, extractedAnswer: "x", verdict, latencyMs: 100 };
}

describe("buildReport — tổng hợp báo cáo", () => {
  const seeds: SeedIndex = new Map();
  seeds.set("s1", seed("s1", ["khoang_cach"], 3, true));
  seeds.set("s2", seed("s2", ["the_tich"], 1, false));

  const records: EvalRecord[] = [
    rec("s1", "gpt", "correct", "Vậy đáp án \\boxed{1}"),
    rec("s1", "gpt", "incorrect", "Vậy đáp án \\boxed{2}"),
    rec("s2", "gpt", "correct", "Vậy \\boxed{1}"),
  ];

  it("accuracy theo model + có bảng markdown", () => {
    const { markdown, summary } = buildReport(records, seeds);
    expect(summary.totalRecords).toBe(3);
    const gpt = summary.byModel.find((r) => r.key === "gpt")!;
    expect(gpt.correct).toBe(2);
    expect(gpt.total).toBe(3);
    expect(markdown).toContain("Xếp hạng model");
  });

  it("H3 — đếm câu sai quả quyết", () => {
    const { summary } = buildReport(records, seeds);
    expect(summary.calibration.totalWrong).toBe(1);
    expect(summary.calibration.confidentWrong).toBe(1);
    expect(summary.calibration.rate).toBe(1);
  });

  it("H1 — nhóm theo cờ cần hình phụ", () => {
    const { summary } = buildReport(records, seeds);
    const keys = summary.byAuxiliary.map((r) => r.key).sort();
    expect(keys).toContain("cần hình phụ");
    expect(keys).toContain("không cần hình phụ");
  });

  it("gắn robustness khi được truyền vào (H2)", () => {
    const { summary, markdown } = buildReport(records, seeds, { overall: 0.2, byKind: { rename: 0.1 } });
    expect(summary.robustness?.overall).toBe(0.2);
    expect(markdown).toContain("robustness");
  });
});

describe("buildBenchmarkSummary — HỢP ĐỒNG máy-đọc summary.json (kế hoạch 07)", () => {
  const seeds: SeedIndex = new Map();
  seeds.set("s1", seed("s1", ["khoang_cach"], 3, true));
  seeds.set("s2", seed("s2", ["the_tich"], 1, false));
  const records: EvalRecord[] = [
    rec("s1", "gpt", "correct", "Vậy đáp án \\boxed{1}"),
    rec("s1", "gpt", "incorrect", "Vậy đáp án \\boxed{2}"),
    rec("s2", "gpt", "correct", "Vậy \\boxed{1}"),
  ];

  it("có mảng models[] và mỗi model đủ overall/byTopic/byDifficulty/robustness", () => {
    const summary = buildBenchmarkSummary(records, seeds);
    expect(Array.isArray(summary.models)).toBe(true);
    expect(summary.models.length).toBe(1);
    for (const m of summary.models) {
      expect(m.overall).toBeDefined();
      expect(Array.isArray(m.byTopic)).toBe(true);
      expect(Array.isArray(m.byDifficulty)).toBe(true);
      expect(m.robustness).toBeDefined();
    }
    const gpt = summary.models.find((m) => m.modelId === "gpt")!;
    expect(gpt.overall.total).toBe(3);
    expect(gpt.overall.correct).toBe(2);
    expect(summary.seedCount).toBe(2);
  });
});
