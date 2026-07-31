import { describe, it, expect } from "vitest";
import { mulberry32, randInt } from "../rng";

describe("mulberry32 — PRNG tất định", () => {
  it("cùng seed cho cùng dãy số", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("mọi giá trị nằm trong [0, 1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 200; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("seed khác thường cho số khác", () => {
    expect(mulberry32(1)()).not.toEqual(mulberry32(2)());
  });
});

describe("randInt — chỉ số nguyên 0..n-1", () => {
  it("luôn nằm trong khoảng hợp lệ", () => {
    const r = mulberry32(99);
    for (let i = 0; i < 200; i++) {
      const k = randInt(r, 5);
      expect(Number.isInteger(k)).toBe(true);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThan(5);
    }
  });
});
