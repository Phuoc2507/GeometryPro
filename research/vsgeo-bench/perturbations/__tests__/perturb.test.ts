import { describe, it, expect } from "vitest";
import { perturb } from "../perturb";
import { seedNumeric, seedWithCoords } from "./fixtures";

describe("perturb — điều phối", () => {
  it("gọi đúng phép theo kind (tất định)", async () => {
    const [r] = await perturb(seedNumeric, "rename");
    expect(r.variant.kind).toBe("rename");

    const [s] = await perturb(seedNumeric, "rescale", { k: 2 });
    expect(s.variant.kind).toBe("rescale");
    expect(s.answer.canonical).toBe("64");

    const [d] = await perturb(seedNumeric, "distractor");
    expect(d.variant.kind).toBe("distractor");

    const [f] = await perturb(seedWithCoords, "reflect");
    expect(f.variant.kind).toBe("reflect");
  });

  it("paraphrase qua opts.rewriter", async () => {
    const [p] = await perturb(seedNumeric, "paraphrase", {
      rewriter: async (t) => `Bài: ${t}`,
    });
    expect(p.variant.kind).toBe("paraphrase");
    expect(p.statement_vi.startsWith("Bài:")).toBe(true);
  });
});
