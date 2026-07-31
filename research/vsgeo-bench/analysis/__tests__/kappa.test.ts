import { describe, it, expect } from "vitest";
import { cohensKappa } from "../kappa";

describe("cohensKappa — độ đồng thuận hai người dán nhãn", () => {
  it("đồng thuận hoàn toàn (nhiều nhãn khác nhau) -> κ = 1", () => {
    const a = ["e1", "e2", "e3", "e1"];
    const b = ["e1", "e2", "e3", "e1"];
    expect(cohensKappa(a, b)).toBeCloseTo(1, 10);
  });

  it("đồng thuận đúng bằng mức may rủi -> κ = 0", () => {
    // A: 1,1,0,0 ; B: 1,0,1,0 -> Po=0.5, Pe=0.5 -> κ=0
    const a = ["1", "1", "0", "0"];
    const b = ["1", "0", "1", "0"];
    expect(cohensKappa(a, b)).toBeCloseTo(0, 10);
  });

  it("ca biết trước -> κ ≈ 0.615", () => {
    // Po=0.8, Pe=0.48 -> κ=(0.8-0.48)/(1-0.48)=0.6154
    const a = ["y", "y", "n", "n", "y"];
    const b = ["y", "n", "n", "n", "y"];
    expect(cohensKappa(a, b)).toBeCloseTo(0.615, 3);
  });

  it("cả hai gán CÙNG một nhãn cho tất cả -> κ = 1 (theo quy ước)", () => {
    expect(cohensKappa(["e1", "e1"], ["e1", "e1"])).toBe(1);
  });

  it("hai mảng khác độ dài -> ném lỗi", () => {
    expect(() => cohensKappa(["a"], ["a", "b"])).toThrow();
  });

  it("mảng rỗng -> ném lỗi", () => {
    expect(() => cohensKappa([], [])).toThrow();
  });
});
