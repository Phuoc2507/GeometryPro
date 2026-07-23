import { describe, it, expect } from "vitest";
import { buildPrompt } from "../prompt";
import type { Seed } from "../seedTypes";

// Một seed tối giản đủ để test dựng prompt (không cần đủ mọi trường).
const seed = {
  id: "vsgeo-0001",
  source: { type: "synthetic", ref: "demo" },
  statement_vi: "Cho hình lập phương cạnh a. Tính thể tích.",
  answer: { canonical: "a^3", type: "surd" },
  tags: { topic: ["the_tich"], answer_form: "surd", difficulty: 1, requires_auxiliary_construction: false },
} as unknown as Seed;

describe("buildPrompt — dựng lời nhắc cho model", () => {
  it("zero_shot: chèn đề bài và yêu cầu \\boxed", () => {
    const { system, user } = buildPrompt(seed, "zero_shot");
    expect(user).toContain("Cho hình lập phương cạnh a");
    expect(system).toContain("\\boxed");
    expect(user).toContain("\\boxed");
  });

  it("cot: có yêu cầu suy luận từng bước VÀ vẫn buộc \\boxed cuối", () => {
    const { system, user } = buildPrompt(seed, "cot");
    expect(user).toContain("từng bước");
    expect(user).toContain("\\boxed");
    expect(system).toContain("\\boxed");
  });

  it("system giống nhau ở cả hai kiểu (giao thức cố định), chỉ user khác", () => {
    const z = buildPrompt(seed, "zero_shot");
    const c = buildPrompt(seed, "cot");
    expect(z.system).toBe(c.system);
    expect(z.user).not.toBe(c.user);
  });
});
