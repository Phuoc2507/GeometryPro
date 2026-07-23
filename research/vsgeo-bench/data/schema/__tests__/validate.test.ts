import { describe, it, expect } from "vitest";
import { runValidation } from "../validate";
import type { SeedFile } from "../validate";

// Một bài hợp lệ dưới dạng chuỗi JSON, kèm tên file khớp id.
function fileHopLe(): SeedFile {
  const seed = {
    id: "vsgeo-0001",
    source: { type: "exam", ref: "THPTQG 2019 - mã 101 - câu 43" },
    statement_vi: "Cho hình chóp ... Tính khoảng cách.",
    answer: { canonical: "a*sqrt(3)/3", type: "surd" },
    tags: {
      topic: ["khoang_cach"],
      answer_form: "surd",
      difficulty: 3,
      requires_auxiliary_construction: true,
    },
  };
  return { file: "vsgeo-0001.json", content: JSON.stringify(seed) };
}

describe("runValidation — kiểm cả tập seeds", () => {
  it("tập toàn bài hợp lệ → không có problem", () => {
    const rep = runValidation([fileHopLe()]);
    expect(rep.okCount).toBe(1);
    expect(rep.problems).toEqual([]);
  });

  it("JSON hỏng → báo lỗi 'JSON hỏng'", () => {
    const rep = runValidation([{ file: "vsgeo-0002.json", content: "{ hỏng, }" }]);
    expect(rep.okCount).toBe(0);
    expect(rep.problems.some((p) => p.includes("JSON hỏng"))).toBe(true);
  });

  it("bài không hợp schema → gắn tên file vào lỗi", () => {
    const rep = runValidation([{ file: "vsgeo-0003.json", content: '{"id":"vsgeo-0003"}' }]);
    expect(rep.okCount).toBe(0);
    expect(rep.problems.some((p) => p.startsWith("vsgeo-0003.json:"))).toBe(true);
  });

  it("tên file không khớp id → báo lỗi", () => {
    const f = fileHopLe();
    f.file = "vsgeo-9999.json"; // id bên trong vẫn là vsgeo-0001
    const rep = runValidation([f]);
    expect(rep.okCount).toBe(0);
    expect(rep.problems.some((p) => p.includes("khớp id"))).toBe(true);
  });

  it("id trùng nhau giữa 2 file → báo lỗi trùng", () => {
    const a = fileHopLe();
    const b = fileHopLe();
    b.file = "vsgeo-0001-copy.json"; // khác tên file, nhưng id bên trong trùng
    const rep = runValidation([a, b]);
    expect(rep.problems.some((p) => p.includes("trùng"))).toBe(true);
  });
});
