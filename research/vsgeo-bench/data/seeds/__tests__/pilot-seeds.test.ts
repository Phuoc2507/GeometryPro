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

  it("vsgeo-0005 hợp lệ và là dạng rational", () => {
    const res = validateSeed(docBai("vsgeo-0005"));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.seed.answer.type).toBe("rational");
  });

  // 0003 nay là bài dễ dạng rational (thể tích chóp) sau khi thay tầng synthetic bằng đề THẬT.
  // Vẫn giữ độ phủ dạng plane_eq bằng một seed đề-thật hiện có (0016: mặt phẳng qua điểm + VTPT).
  it("vsgeo-0016 hợp lệ và là dạng plane_eq", () => {
    const res = validateSeed(docBai("vsgeo-0016"));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.seed.answer.type).toBe("plane_eq");
  });
});
