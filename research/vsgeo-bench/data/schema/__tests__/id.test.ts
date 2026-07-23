import { describe, it, expect } from "vitest";
import { makeSeedId, isValidSeedId } from "../id";

describe("makeSeedId — sinh mã bài đệm 0 đủ 4 chữ số", () => {
  it("số 1 → vsgeo-0001", () => {
    expect(makeSeedId(1)).toBe("vsgeo-0001");
  });

  it("số 137 → vsgeo-0137", () => {
    expect(makeSeedId(137)).toBe("vsgeo-0137");
  });

  it("số 300 → vsgeo-0300", () => {
    expect(makeSeedId(300)).toBe("vsgeo-0300");
  });

  it("số ngoài khoảng 1..9999 hoặc không nguyên → ném lỗi", () => {
    expect(() => makeSeedId(0)).toThrow();
    expect(() => makeSeedId(-5)).toThrow();
    expect(() => makeSeedId(10000)).toThrow();
    expect(() => makeSeedId(1.5)).toThrow();
  });
});

describe("isValidSeedId — kiểm định dạng mã", () => {
  it("nhận đúng dạng vsgeo-XXXX (4 chữ số)", () => {
    expect(isValidSeedId("vsgeo-0001")).toBe(true);
    expect(isValidSeedId("vsgeo-0137")).toBe(true);
  });

  it("từ chối dạng sai", () => {
    expect(isValidSeedId("vsgeo-1")).toBe(false);     // thiếu đệm 0
    expect(isValidSeedId("vsgeo-00001")).toBe(false); // 5 chữ số
    expect(isValidSeedId("VSGEO-0001")).toBe(false);  // viết hoa
    expect(isValidSeedId("bai-0001")).toBe(false);    // sai tiền tố
    expect(isValidSeedId("vsgeo-0001 ")).toBe(false); // dư khoảng trắng
  });
});
