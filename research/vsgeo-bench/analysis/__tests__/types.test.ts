import { describe, it, expect } from "vitest";
import { isVerdict } from "../types";

describe("isVerdict — nhận diện verdict hợp lệ", () => {
  it("chấp nhận đúng ba giá trị hợp lệ", () => {
    expect(isVerdict("correct")).toBe(true);
    expect(isVerdict("incorrect")).toBe(true);
    expect(isVerdict("unsure")).toBe(true);
  });

  it("từ chối giá trị lạ hoặc sai kiểu", () => {
    expect(isVerdict("dung")).toBe(false);   // tiếng Việt không phải giá trị hợp lệ
    expect(isVerdict(1)).toBe(false);
    expect(isVerdict(null)).toBe(false);
    expect(isVerdict(undefined)).toBe(false);
  });
});
