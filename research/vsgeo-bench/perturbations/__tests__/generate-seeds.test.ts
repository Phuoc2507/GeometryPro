import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generateVariantsForSeed } from "../generate";
import { extractVertexLabels, extractRayAnchors } from "../rename";
import { validateVariant } from "../../data/schema/problem";
import type { Seed } from "../types";

// Test tích hợp: chạy bộ sinh biến thể TẤT ĐỊNH trên các seed THẬT trong data/seeds/ và
// khẳng định (a) mọi biến thể sinh ra đều HỢP LỆ theo validateVariant, (b) độ phủ tối thiểu
// rename + distractor cho mọi seed, (c) các file đã ghi ra data/seeds-variants/ KHỚP đúng
// tập biến thể mà bộ sinh tạo (chống lệch giữa dữ liệu commit và bộ sinh).
const here = dirname(fileURLToPath(import.meta.url)); // .../perturbations/__tests__
const seedsDir = join(here, "..", "..", "data", "seeds"); // .../data/seeds
const variantsDir = join(here, "..", "..", "data", "seeds-variants"); // .../data/seeds-variants

function docSeeds(): Seed[] {
  return readdirSync(seedsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(seedsDir, f), "utf8")) as Seed);
}

describe("generate — chạy trên seed THẬT, mọi biến thể phải hợp lệ", () => {
  it("mọi biến thể sinh từ data/seeds/ đều qua validateVariant", async () => {
    const seeds = docSeeds();
    expect(seeds.length).toBeGreaterThan(0);
    for (const seed of seeds) {
      const variants = await generateVariantsForSeed(seed);
      for (const v of variants) {
        const r = validateVariant(v);
        expect(r.ok, `biến thể ${v.id} phải hợp lệ: ${r.ok ? "" : r.errors.join("; ")}`).toBe(true);
        expect(v.variant.parentSeedId).toBe(seed.id);
      }
    }
  });

  it("mỗi seed: distractor phổ quát; rename áp được TRỪ khi đáp án tham chiếu nhãn đỉnh", async () => {
    for (const seed of docSeeds()) {
      const kinds = new Set((await generateVariantsForSeed(seed)).map((v) => v.variant.kind));
      // distractor là phép AN TOÀN phổ quát: ngân hàng câu nhiễu có phương án KHÔNG mang nhãn HOA
      // nào (BANK[1]/BANK[2]) nên luôn chèn được -> mọi seed đều có distractor.
      expect(kinds.has("distractor"), `${seed.id} phải có distractor`).toBe(true);
      // rename GIỮ NGUYÊN đáp án (§4.3). Nếu đáp án THAM CHIẾU nhãn đỉnh (vd mcq "(A'B'C'D')",
      // point/vector là "AB"...) thì đổi tên đỉnh trong đề mà không đổi đáp án sẽ desync câu hỏi–đáp
      // án, nên rename CỐ Ý bỏ (ném) — đây KHÔNG phải lỗi. Chỉ ĐÒI rename khi đáp án không có nhãn đỉnh.
      const answerRefsVertex =
        extractVertexLabels(seed.answer.canonical).length > 0 ||
        extractRayAnchors(seed.answer.canonical).length > 0;
      if (!answerRefsVertex) {
        expect(kinds.has("rename"), `${seed.id} (đáp án không có nhãn đỉnh) phải có rename`).toBe(true);
      }
      // Bất biến tối thiểu: dù bỏ phép nào, mỗi seed vẫn phải sinh được ÍT NHẤT một biến thể tất định.
      expect(kinds.size, `${seed.id} phải sinh ít nhất 1 biến thể`).toBeGreaterThan(0);
    }
  });

  it("file đã ghi ở data/seeds-variants/ khớp đúng tập biến thể bộ sinh tạo", async () => {
    // Nếu thư mục chưa sinh (CI sạch), bỏ qua — bộ sinh vẫn được kiểm ở hai test trên.
    if (!existsSync(variantsDir)) return;
    const expected = new Set<string>();
    for (const seed of docSeeds()) {
      for (const v of await generateVariantsForSeed(seed)) expected.add(`${v.id}.json`);
    }
    const actual = new Set(readdirSync(variantsDir).filter((f) => f.endsWith(".json")));
    expect(actual).toEqual(expected);
  });
});
