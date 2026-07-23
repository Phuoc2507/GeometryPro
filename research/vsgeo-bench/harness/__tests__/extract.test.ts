import { describe, it, expect } from "vitest";
import { extractBoxed } from "../extract";

describe("extractBoxed — lấy nội dung trong \\boxed{...}", () => {
  it("lấy được trường hợp đơn giản", () => {
    expect(extractBoxed("Vậy đáp án là \\boxed{a\\sqrt6/3}.")).toBe("a\\sqrt6/3");
  });

  it("xử lý ngoặc lồng nhau", () => {
    expect(extractBoxed("Kết quả \\boxed{\\frac{a}{2}} nhé")).toBe("\\frac{a}{2}");
  });

  it("có nhiều \\boxed thì lấy CÁI CUỐI", () => {
    expect(extractBoxed("thử \\boxed{1} rồi sửa \\boxed{2}")).toBe("2");
  });

  it("không có \\boxed thì trả null", () => {
    expect(extractBoxed("mình không chắc đáp án")).toBeNull();
  });

  it("cắt khoảng trắng thừa", () => {
    expect(extractBoxed("\\boxed{  V = 8  }")).toBe("V = 8");
  });
});
