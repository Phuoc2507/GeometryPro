import { describe, it, expect } from "vitest";
import { parseArgs, loadSeeds } from "../run";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("parseArgs — đọc tham số dòng lệnh", () => {
  it("đọc đủ các cờ và tách danh sách theo dấu phẩy", () => {
    const a = parseArgs([
      "--seeds", "data/seeds/all.jsonl",
      "--models", "openai:gpt-x,gemini:g",
      "--k", "3",
      "--styles", "zero_shot,cot",
      "--date", "2026-08-15",
    ]);
    expect(a.seedsPath).toBe("data/seeds/all.jsonl");
    expect(a.models).toEqual(["openai:gpt-x", "gemini:g"]);
    expect(a.k).toBe(3);
    expect(a.styles).toEqual(["zero_shot", "cot"]);
    expect(a.date).toBe("2026-08-15");
  });

  it("ném lỗi khi thiếu --date (KHÔNG hardcode ngày)", () => {
    expect(() => parseArgs(["--seeds", "x", "--models", "openai:g"])).toThrow(/date/);
  });

  it("mặc định k=3 và styles=[zero_shot] nếu không truyền", () => {
    const a = parseArgs(["--seeds", "x", "--models", "openai:g", "--date", "2026-01-01"]);
    expect(a.k).toBe(3);
    expect(a.styles).toEqual(["zero_shot"]);
  });
});

describe("loadSeeds — đọc file JSONL thành mảng Seed", () => {
  it("đọc mỗi dòng một seed, bỏ dòng trống", () => {
    const dir = mkdtempSync(join(tmpdir(), "vsgeo-"));
    const file = join(dir, "s.jsonl");
    const s1 = { id: "a", source: { type: "synthetic", ref: "r" }, statement_vi: "đề a", answer: { canonical: "1", type: "rational" }, tags: { topic: [], answer_form: "rational", difficulty: 1, requires_auxiliary_construction: false } };
    const s2 = { ...s1, id: "b", statement_vi: "đề b" };
    writeFileSync(file, JSON.stringify(s1) + "\n\n" + JSON.stringify(s2) + "\n");
    const seeds = loadSeeds(file);
    expect(seeds.map((s) => s.id)).toEqual(["a", "b"]);
  });
});
