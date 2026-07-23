import { describe, it, expect } from "vitest";
import { variantId, cloneSeed } from "../types";
import { seedNumeric } from "./fixtures";

describe("types dùng chung", () => {
  it("variantId ghép id cha với tên phép", () => {
    expect(variantId("vsgeo-0001", "rename")).toBe("vsgeo-0001__rename");
    expect(variantId("vsgeo-0042", "rescale")).toBe("vsgeo-0042__rescale");
  });

  it("cloneSeed tạo bản sao SÂU, không dính tới seed gốc", () => {
    const copy = cloneSeed(seedNumeric);
    copy.statement_vi = "ĐÃ ĐỔI";
    // Sửa bản sao KHÔNG được ảnh hưởng seed gốc.
    expect(seedNumeric.statement_vi).not.toBe("ĐÃ ĐỔI");
    // Nội dung ban đầu phải giống hệt.
    expect(copy.answer.canonical).toBe(seedNumeric.answer.canonical);
  });
});
