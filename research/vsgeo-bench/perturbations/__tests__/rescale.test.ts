import { describe, it, expect } from "vitest";
import {
  rescale,
  canonicalToNumber,
  isNumericCanonical,
  scaleLengthsInText,
} from "../rescale";
import { seedNumeric, seedSymbolic } from "./fixtures";

describe("rescale — đổi tỉ lệ, đáp án co giãn theo bậc", () => {
  it("canonicalToNumber đọc được cả 'sqrt(...)' lẫn ký hiệu '√'", () => {
    expect(canonicalToNumber("8")).toBeCloseTo(8, 9);
    expect(canonicalToNumber("sqrt(6)/3")).toBeCloseTo(Math.sqrt(6) / 3, 9);
    expect(canonicalToNumber("sqrt(22)")).toBeCloseTo(Math.sqrt(22), 9);
    expect(canonicalToNumber("2√3")).toBeCloseTo(2 * Math.sqrt(3), 9);
    // Có ký hiệu 'a' thì cần gán a=1.
    expect(canonicalToNumber("a^3*sqrt(2)/12", { a: 1 })).toBeCloseTo(Math.sqrt(2) / 12, 9);
  });

  it("isNumericCanonical phân biệt đáp án số vs đáp án còn chữ", () => {
    expect(isNumericCanonical("sqrt(22)")).toBe(true);
    expect(isNumericCanonical("sqrt(6)/3")).toBe(true);
    expect(isNumericCanonical("a^3*sqrt(2)/12")).toBe(false);
  });

  it("scaleLengthsInText nhân độ dài theo k (các mẫu SGK phổ biến)", () => {
    expect(scaleLengthsInText("có cạnh 2.", 3)).toBe("có cạnh 6.");
    expect(scaleLengthsInText("cạnh a.", 2)).toBe("cạnh 2a.");
    expect(scaleLengthsInText("cạnh 3a.", 2)).toBe("cạnh 6a.");
  });

  it("SEED SỐ, scale_degree=3, k=2 => đáp án nhân 8 (kiểm bằng giá trị số)", () => {
    const v = rescale(seedNumeric, 2);
    const before = canonicalToNumber(seedNumeric.answer.canonical); // 8
    const after = canonicalToNumber(v.answer.canonical); // kỳ vọng 64
    expect(after).toBeCloseTo(before * Math.pow(2, 3), 6);
    expect(after).toBeCloseTo(64, 6);
    expect(v.answer.canonical).toBe("64"); // toExactForm in gọn
    expect(v.variant).toEqual({ kind: "rescale", parentSeedId: "vsgeo-0001" });
  });

  it("SEED KÝ HIỆU, scale_degree=3, k=2 => giá trị (tại a=1) nhân 8", () => {
    const v = rescale(seedSymbolic, 2);
    const before = canonicalToNumber(seedSymbolic.answer.canonical, { a: 1 });
    const after = canonicalToNumber(v.answer.canonical, { a: 1 });
    expect(after).toBeCloseTo(before * 8, 6);
    // Lời văn đổi cạnh a -> 2a.
    expect(v.statement_vi).toContain("cạnh 2a");
  });

  it("từ chối rescale khi thiếu scale_degree hoặc đáp án không phải số/căn/tỉ số", () => {
    const noDeg = { ...seedNumeric, scale_degree: undefined };
    expect(() => rescale(noDeg, 2)).toThrow(/scale_degree/);
    const pointAns = { ...seedNumeric, answer: { canonical: "(1;2;3)", type: "point" as const } };
    expect(() => rescale(pointAns, 2)).toThrow(/rational\|surd\|ratio/);
  });

  // RS-9 regression bug 0039: đề hỏi KHOẢNG CÁCH (độ dài, bậc 1). Trước đây gán scale_degree=0
  // ⇒ factor=k^0=1 ⇒ lời văn đổi cạnh 6→12 còn đáp án GIỮ NGUYÊN 3√6 (đúng phải 6√6) — mâu
  // thuẫn im lặng. Nay bậc đúng =1 co giãn đáp án chuẩn; bậc sai bị guard bắt (bỏ qua §4.3).
  const distStmt =
    "Cho hình lập phương ABCD.MNPQ có cạnh bằng 6. Tính khoảng cách từ điểm P đến mặt phẳng (MED).";
  it("RS-9: khoảng cách (bậc 1) — 3√6 --(k=2)--> 6√6 (đáp án co giãn ĐÚNG)", () => {
    const distSeed = {
      ...seedNumeric,
      id: "vsgeo-0039",
      figure: { coords_given: false },
      statement_vi: distStmt,
      answer: { canonical: "3*sqrt(6)", type: "surd" as const },
      scale_degree: 1,
    };
    const v = rescale(distSeed, 2);
    expect(v.statement_vi).toContain("cạnh bằng 12");
    expect(canonicalToNumber(v.answer.canonical)).toBeCloseTo(6 * Math.sqrt(6), 6);
  });
  it("RS-9: từ chối khi đề hỏi khoảng cách nhưng scale_degree≠1 (chặn tái diễn 0039)", () => {
    const badDist = {
      ...seedNumeric,
      figure: { coords_given: false },
      statement_vi: distStmt,
      answer: { canonical: "3*sqrt(6)", type: "surd" as const },
      scale_degree: 0,
    };
    expect(() => rescale(badDist, 2)).toThrow(/LỆCH bậc/);
  });
});
