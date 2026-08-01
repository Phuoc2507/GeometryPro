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

  // RS-10 GỐC RỄ — chốt đối xứng F22, ĐỘC LẬP TỪ KHOÁ. Chứng minh nó bắt được đại lượng bậc-1
  // gắn nhầm bậc 0 mà RS-9 (chỉ dò chữ "khoảng cách") KHÔNG liệt kê: đây đề hỏi "đường cao" hình
  // nón (một độ dài, bậc 1). Lời văn co giãn (bán kính 3→6, đường sinh 5→10) nhưng đáp án số 4 giữ
  // nguyên vì factor=k^0=1 ⇒ mâu thuẫn im lặng. Không có chữ "khoảng cách/thể tích/diện tích" nào
  // ⇒ RS-9/RS-2 câm; chỉ RS-10 (độ-dài-đổi-thì-trị-số-phải-đổi) chặn.
  it("RS-10: bắt đại lượng bậc-1 gắn nhầm bậc 0 mà RS-9 KHÔNG có từ khoá (đường cao hình nón)", () => {
    const badHeight = {
      ...seedNumeric,
      id: "vsgeo-0009",
      figure: { coords_given: false },
      statement_vi:
        "Cho hình nón có bán kính đáy bằng 3 và đường sinh bằng 5. Tính đường cao của hình nón.",
      answer: { canonical: "4", type: "rational" as const },
      scale_degree: 0,
    };
    expect(() => rescale(badHeight, 2)).toThrow(/độ dài đổi thì trị số phải đổi/);
  });

  // RS-10 MIỄN ĐÚNG: đáp án type=ratio KHÔNG THỨ NGUYÊN (bậc 0) — lời văn co giãn (cạnh 6→12) mà
  // tỉ số bất biến là HỢP LỆ, KHÔNG được ném. (Đề không chứa chữ "tỉ số"/"góc" nên qua assertScalable.)
  it("RS-10: KHÔNG ném ca tỉ số hợp lệ (ratio bậc 0, lời văn co giãn, đáp án bất biến)", () => {
    const ratioSeed = {
      ...seedNumeric,
      id: "vsgeo-ratio",
      figure: { coords_given: false },
      statement_vi:
        "Cho hình lập phương ABCD.A'B'C'D' có cạnh 6. Mặt phẳng (P) chia khối thành hai phần V1, V2 với V1 nhỏ hơn V2. Tính V1 chia V2.",
      answer: { canonical: "1/2", type: "ratio" as const },
      scale_degree: 0,
    };
    const v = rescale(ratioSeed, 2);
    expect(v.statement_vi).toContain("cạnh 12");
    expect(v.answer.canonical).toBe("1/2"); // tỉ số bất biến co giãn
  });
});
