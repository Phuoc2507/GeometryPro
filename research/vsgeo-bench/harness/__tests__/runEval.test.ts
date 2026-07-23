import { describe, it, expect, vi } from "vitest";
import { runEval } from "../runEval";
import type { Seed } from "../seedTypes";
import type { EvalRecord } from "../types";

function makeSeed(id: string): Seed {
  return {
    id,
    source: { type: "synthetic", ref: "demo" },
    statement_vi: `Đề ${id}`,
    answer: { canonical: "1", type: "rational" },
    tags: { topic: ["the_tich"], answer_form: "rational", difficulty: 1, requires_auxiliary_construction: false },
  } as Seed;
}

describe("runEval — vòng lặp sinh EvalRecord", () => {
  it("sinh đúng số bản ghi = seeds × models × styles × k", async () => {
    const seeds = [makeSeed("s1"), makeSeed("s2")];
    const models = ["openai:gpt-x", "gemini:g"];
    const fakeCall = vi.fn(async () => ({ text: "đáp \\boxed{1}", latencyMs: 3 }));
    const fakeGrade = vi.fn(() => ({ verdict: "correct" as const, reason: "khớp" }));

    const records: EvalRecord[] = await runEval(seeds, models, {
      k: 3, styles: ["zero_shot"], temperature: 0,
    }, { callModel: fakeCall, grade: fakeGrade });

    // 2 seed × 2 model × 1 style × 3 run = 12
    expect(records.length).toBe(12);
    expect(fakeCall).toHaveBeenCalledTimes(12);
  });

  it("verdict lấy từ grade(); extractedAnswer lấy trong \\boxed", async () => {
    const seeds = [makeSeed("s1")];
    const fakeCall = vi.fn(async () => ({ text: "vậy \\boxed{42}", latencyMs: 1 }));
    const fakeGrade = vi.fn(() => ({ verdict: "incorrect" as const, reason: "sai" }));

    const records = await runEval(seeds, ["openai:gpt-x"], { k: 1, styles: ["zero_shot"], temperature: 0 },
      { callModel: fakeCall, grade: fakeGrade });

    expect(records[0].verdict).toBe("incorrect");
    expect(records[0].extractedAnswer).toBe("42");
    // grade nhận NGUYÊN VĂN model, và đáp án chuẩn của seed:
    expect(fakeGrade).toHaveBeenCalledWith("vậy \\boxed{42}", seeds[0].answer);
  });

  it("một bài lỗi không làm sập mẻ — thành verdict 'unsure'", async () => {
    const seeds = [makeSeed("s1"), makeSeed("s2")];
    let n = 0;
    const fakeCall = vi.fn(async () => {
      n++;
      if (n === 1) throw new Error("model chết bất ngờ");
      return { text: "\\boxed{1}", latencyMs: 2 };
    });
    const fakeGrade = vi.fn(() => ({ verdict: "correct" as const, reason: "ok" }));

    const records = await runEval(seeds, ["openai:gpt-x"], { k: 1, styles: ["zero_shot"], temperature: 0 },
      { callModel: fakeCall, grade: fakeGrade });

    expect(records.length).toBe(2);                       // vẫn đủ 2 bản ghi
    expect(records[0].verdict).toBe("unsure");            // bài lỗi
    expect(records[0].rawOutput).toContain("model chết"); // ghi lại thông báo lỗi
    expect(records[1].verdict).toBe("correct");           // bài sau vẫn chạy
  });
});
