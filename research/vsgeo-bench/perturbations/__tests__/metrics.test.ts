import { describe, it, expect } from "vitest";
import { accuracy, robustnessGap, robustnessReport, consistency } from "../metrics";
import type { Verdict } from "../types";

describe("metrics — robustness & consistency", () => {
  it("accuracy = số correct / tổng", () => {
    const v: Verdict[] = ["correct", "incorrect", "correct", "unsure"];
    expect(accuracy(v)).toBeCloseTo(2 / 4, 9);
  });

  it("robustnessGap = acc(gốc) - acc(biến thể)", () => {
    expect(robustnessGap(0.9, 0.6)).toBeCloseTo(0.3, 9);
    expect(robustnessGap(0.5, 0.8)).toBeCloseTo(-0.3, 9); // âm = biến thể còn tốt hơn
  });

  it("robustnessReport = overall + byKind theo bản ghi (hợp đồng plan 05)", () => {
    // base: 2 đúng / 0 sai => acc(base) = 1.
    const base = [{ verdict: "correct" }, { verdict: "correct" }] as const;
    // variants: 1 đúng (rename) / 1 sai (rescale) => acc(variants) = 1/2.
    const variants = [
      { verdict: "correct", perturbation: { kind: "rename" } },
      { verdict: "incorrect", perturbation: { kind: "rescale" } },
    ] as const;
    const rep = robustnessReport([...base], [...variants]);
    expect(rep.overall).toBeCloseTo(1 - 0.5, 9); // 0.5
    expect(rep.byKind.rename).toBeCloseTo(1 - 1, 9); // rename toàn đúng => 0
    expect(rep.byKind.rescale).toBeCloseTo(1 - 0, 9); // rescale toàn sai => 1
  });

  it("consistency = tỉ lệ trùng phán quyết đa số", () => {
    expect(consistency(["correct", "correct", "incorrect"])).toBeCloseTo(2 / 3, 9);
    expect(consistency(["correct", "correct", "correct"])).toBeCloseTo(1, 9);
    expect(consistency(["correct", "incorrect"])).toBeCloseTo(1 / 2, 9);
  });

  it("mảng rỗng => ném lỗi rõ ràng", () => {
    expect(() => accuracy([])).toThrow();
    expect(() => consistency([])).toThrow();
  });
});
