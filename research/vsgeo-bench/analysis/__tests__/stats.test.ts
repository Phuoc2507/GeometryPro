import { describe, it, expect } from "vitest";
import { bootstrapCI } from "../stats";

describe("bootstrapCI — khoảng tin cậy 95% cho tỉ lệ nhị phân", () => {
  it("mẫu toàn 1 -> khoảng [1, 1]", () => {
    expect(bootstrapCI([1, 1, 1, 1], 1000, 123)).toEqual([1, 1]);
  });

  it("mẫu toàn 0 -> khoảng [0, 0]", () => {
    expect(bootstrapCI([0, 0, 0, 0], 1000, 123)).toEqual([0, 0]);
  });

  it("mẫu rỗng -> [0, 0]", () => {
    expect(bootstrapCI([], 1000, 123)).toEqual([0, 0]);
  });

  it("cùng seed -> kết quả tất định (chạy lại y hệt)", () => {
    const sample = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0]; // mean = 0.6
    expect(bootstrapCI(sample, 2000, 777)).toEqual(bootstrapCI(sample, 2000, 777));
  });

  it("khoảng bao quanh giá trị trung bình quan sát", () => {
    const sample = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0]; // mean = 0.6
    const [lo, hi] = bootstrapCI(sample, 2000, 777);
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeLessThanOrEqual(1);
    expect(lo).toBeLessThanOrEqual(0.6);
    expect(hi).toBeGreaterThanOrEqual(0.6);
  });
});
