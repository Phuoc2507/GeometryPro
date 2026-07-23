import { describe, it, expect } from "vitest";
import { generateVariantsForSeed } from "../generate";
import { seedWithCoords, seedSymbolic } from "./fixtures";

describe("generate — sinh biến thể hàng loạt (hàm thuần)", () => {
  it("seed có toạ độ => rescale bị BỎ (tránh mâu thuẫn toạ độ), còn 3 phép", async () => {
    // F9: rescale cố ý từ chối đề có toạ độ literal A(x;y;z): scaleLengthsInText không co giãn
    // được toạ độ trong câu nên statement (√22) sẽ mâu thuẫn với figure.points/answer (2√22).
    // rename/reflect/distractor vẫn phủ nhóm Oxyz; coverage giảm được F4 skip-tally báo trung thực.
    const vs = await generateVariantsForSeed(seedWithCoords);
    const kinds = vs.map((v) => v.variant.kind).sort();
    expect(kinds).toEqual(["distractor", "reflect", "rename"]);
    // Mọi biến thể đều trỏ đúng cha.
    for (const v of vs) expect(v.variant.parentSeedId).toBe("vsgeo-0003");
  });

  it("seed ký hiệu không toạ độ => reflect bị bỏ, còn 3 phép", async () => {
    const vs = await generateVariantsForSeed(seedSymbolic);
    const kinds = vs.map((v) => v.variant.kind).sort();
    expect(kinds).toEqual(["distractor", "rename", "rescale"]);
  });
});
