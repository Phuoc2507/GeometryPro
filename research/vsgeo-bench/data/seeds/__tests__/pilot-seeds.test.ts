import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateSeed } from "../../schema/problem";

const here = dirname(fileURLToPath(import.meta.url)); // .../data/seeds/__tests__
const seedsDir = join(here, ".."); // .../data/seeds

function docBai(id: string): unknown {
  return JSON.parse(readFileSync(join(seedsDir, `${id}.json`), "utf8"));
}

describe("3 bài pilot mẫu — phải luôn hợp lệ và đúng đa dạng dạng đáp án", () => {
  it("vsgeo-0001 hợp lệ và là dạng surd", () => {
    const res = validateSeed(docBai("vsgeo-0001"));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.seed.answer.type).toBe("surd");
  });

  it("vsgeo-0002 hợp lệ và là dạng rational", () => {
    const res = validateSeed(docBai("vsgeo-0002"));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.seed.answer.type).toBe("rational");
  });

  it("vsgeo-0003 hợp lệ và là dạng plane_eq", () => {
    const res = validateSeed(docBai("vsgeo-0003"));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.seed.answer.type).toBe("plane_eq");
  });
});
