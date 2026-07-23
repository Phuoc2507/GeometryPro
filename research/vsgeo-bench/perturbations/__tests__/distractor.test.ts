import { describe, it, expect } from "vitest";
import { distractor, DISTRACTOR_BANK } from "../distractor";
import { seedNumeric } from "./fixtures";
// ĐIỂM NỐI plan 01: nếu tên/đường dẫn khác, sửa đúng dòng import này.
import { validateSeed } from "../../data/schema/problem";

describe("distractor — chèn dữ kiện thừa", () => {
  it("câu DÀI THÊM, đáp án GIỮ NGUYÊN", () => {
    const v = distractor(seedNumeric);
    expect(v.statement_vi.length).toBeGreaterThan(seedNumeric.statement_vi.length);
    expect(v.statement_vi).toContain(DISTRACTOR_BANK[0]);
    expect(v.answer.canonical).toBe(seedNumeric.answer.canonical);
    expect(v.variant).toEqual({ kind: "distractor", parentSeedId: "vsgeo-0001" });
  });

  it("cho phép truyền câu nhiễu tuỳ ý", () => {
    const v = distractor(seedNumeric, "Thêm một dữ kiện không dùng.");
    expect(v.statement_vi.endsWith("Thêm một dữ kiện không dùng.")).toBe(true);
  });

  it("distractor giữ nguyên cấu trúc seed hợp lệ (kiểm phần seed nền)", () => {
    const v = distractor(seedNumeric);
    // validateSeed dùng schema Seed THUẦN: id phải khớp /^vsgeo-\d{4}$/ và .strict() cấm trường lạ.
    // Variant CỐ Ý mang id hậu tố "__distractor" + trường `variant` (khái niệm của plan 04, không
    // phải Seed gốc) => không hợp schema Seed nền. Nên ta kiểm PHẦN SEED NỀN: bỏ trường variant,
    // trả id gốc, rồi validateSeed. validateSeed KHÔNG ném (trả {ok,errors}) nên kiểm .ok.
    const { variant, ...seedPart } = v;
    const base = { ...seedPart, id: variant.parentSeedId };
    expect(validateSeed(base).ok).toBe(true);
  });
});
