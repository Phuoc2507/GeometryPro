import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseJsonl, loadRecords, loadSeeds, seedForRecord } from "../load";
import type { Seed, SeedIndex } from "../types";

describe("parseJsonl — đọc chuỗi JSONL thành EvalRecord[]", () => {
  it("bỏ dòng trống, giữ dòng hợp lệ", () => {
    const text = [
      '{"seedId":"s1","modelId":"gpt","run":1,"promptStyle":"zero_shot","rawOutput":"x","extractedAnswer":"1","verdict":"correct","latencyMs":10}',
      "",
      '{"seedId":"s2","modelId":"gpt","run":1,"promptStyle":"cot","rawOutput":"y","extractedAnswer":null,"verdict":"incorrect","latencyMs":20}',
    ].join("\n");
    const recs = parseJsonl(text);
    expect(recs.length).toBe(2);
    expect(recs[0].seedId).toBe("s1");
    expect(recs[1].verdict).toBe("incorrect");
  });

  it("ném lỗi khi verdict không hợp lệ", () => {
    const bad = '{"seedId":"s1","modelId":"gpt","run":1,"promptStyle":"zero_shot","rawOutput":"x","extractedAnswer":null,"verdict":"dung","latencyMs":10}';
    expect(() => parseJsonl(bad)).toThrow();
  });
});

describe("seedForRecord — nối bản ghi với bài gốc", () => {
  const seeds: SeedIndex = new Map();
  const base: Seed = {
    id: "s1",
    source: { type: "synthetic", ref: "t" },
    statement_vi: "…",
    answer: { canonical: "1", type: "rational" },
    tags: { topic: ["the_tich"], answer_form: "rational", difficulty: 2, requires_auxiliary_construction: false },
  };
  seeds.set("s1", base);

  it("bản ghi thường tra theo seedId", () => {
    const rec = { seedId: "s1", modelId: "m", run: 1, promptStyle: "zero_shot" as const, rawOutput: "", extractedAnswer: null, verdict: "correct" as const, latencyMs: 0 };
    expect(seedForRecord(rec, seeds)?.id).toBe("s1");
  });

  it("bản ghi biến thể tra theo parentSeedId", () => {
    const rec = { seedId: "s1__rename", modelId: "m", run: 1, promptStyle: "zero_shot" as const, rawOutput: "", extractedAnswer: null, verdict: "correct" as const, latencyMs: 0, perturbation: { kind: "rename", parentSeedId: "s1" } };
    expect(seedForRecord(rec, seeds)?.id).toBe("s1");
  });
});

describe("loadRecords / loadSeeds — đọc từ thư mục thật", () => {
  it("đọc gộp nhiều file trong thư mục", () => {
    const root = mkdtempSync(join(tmpdir(), "vsgeo-load-"));
    const resultsDir = join(root, "results");
    const seedsDir = join(root, "seeds");
    mkdirSync(resultsDir);
    mkdirSync(seedsDir);
    writeFileSync(join(resultsDir, "gpt.jsonl"),
      '{"seedId":"s1","modelId":"gpt","run":1,"promptStyle":"zero_shot","rawOutput":"x","extractedAnswer":"1","verdict":"correct","latencyMs":10}\n');
    writeFileSync(join(seedsDir, "s1.json"), JSON.stringify({
      id: "s1", source: { type: "synthetic", ref: "t" }, statement_vi: "…",
      answer: { canonical: "1", type: "rational" },
      tags: { topic: ["the_tich"], answer_form: "rational", difficulty: 1, requires_auxiliary_construction: false },
    }));
    const recs = loadRecords(resultsDir);
    const seeds = loadSeeds(seedsDir);
    expect(recs.length).toBe(1);
    expect(seeds.get("s1")?.tags.difficulty).toBe(1);
  });
});
