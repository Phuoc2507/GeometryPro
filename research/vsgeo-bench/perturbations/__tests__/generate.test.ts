import { describe, it, expect } from "vitest";
import { generateVariantsForSeed } from "../generate";
import { seedWithCoords, seedSymbolic } from "./fixtures";

describe("generate — sinh biến thể hàng loạt (hàm thuần)", () => {
  it("seed có toạ độ + đáp án số => đủ 4 phép tất định", async () => {
    const vs = await generateVariantsForSeed(seedWithCoords);
    const kinds = vs.map((v) => v.variant.kind).sort();
    expect(kinds).toEqual(["distractor", "reflect", "rename", "rescale"]);
    // Mọi biến thể đều trỏ đúng cha.
    for (const v of vs) expect(v.variant.parentSeedId).toBe("vsgeo-0003");
  });

  it("seed ký hiệu không toạ độ => reflect bị bỏ, còn 3 phép", async () => {
    const vs = await generateVariantsForSeed(seedSymbolic);
    const kinds = vs.map((v) => v.variant.kind).sort();
    expect(kinds).toEqual(["distractor", "rename", "rescale"]);
  });
});
