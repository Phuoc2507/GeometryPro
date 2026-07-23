// perturbations/__tests__/adversarial.test.ts
// ===========================================================================
// BỘ TEST TỰ-PHẢN-BIỆN cho BỘ BIẾN ĐỔI (design.md §4.3) — song song với
// grader/__tests__/adversarial.test.ts và harness/__tests__/adversarial.test.ts.
//
// Suite "đường hạnh phúc" (32 test) đã XANH hết. Nhưng một suite xanh KHÔNG chứng minh
// bộ biến đổi ĐÚNG — nó chỉ chứng minh ta vượt qua ĐÚNG các ca đã nghĩ ra. Một lượt review
// đối kháng độc lập lôi ra các lỗi SINH DỮ LIỆU SAI-IM-LẶNG (lớp §4.3 coi tệ hơn crash):
//
//   F1  rescale: sinh bài TỰ MÂU THUẪN mà không báo lỗi:
//        (a) under-scale: "SA = a" giữ nguyên trong khi đáp án ×k^degree;
//        (b) over-scale: "bằng" bắt cả góc ("bằng 60"→120) và thể-tích-cho-số (×k thay vì ×k³);
//        (b') cờ /i ở mẫu-1 biến "cạnh A." (nhãn HOA) thành "cạnh 2a" (hỏng nhãn);
//        (e) đáp án số không biểu diễn được exact bị lưu decimal .toFixed(4) (mất mát).
//   F2  reflect: cổng theo answer.TYPE (rational/surd...) không phân biệt được đại lượng
//        BẤT BIẾN (khoảng cách) với đại lượng ĐỔI theo phản chiếu (hoành độ) cùng type.
//   F3  rename: bể chữ đích trùng nhãn CHỈ-XUẤT-HIỆN-TRONG-LỜI-VĂN (trung điểm M) => A→M đụng M.
//   F4  generate: catch{} nuốt mọi lỗi => một phép hỏng CHO MỌI seed => 0 biến thể mà không cảnh báo.
//   F5  metrics: tập rỗng => gap giả 0 (đọc thành "rớt thảm hại"); byKind trừ base TOÀN CỤC (thiên lệch).
//   F6  paraphrase: guard bỏ sót (a) mất ký hiệu 'a' mà đáp án còn dùng; (b) hoán vai "SA=2,SB=3"→"SA=3,SB=2".
//   F8  distractor: câu nhiễu mặc định thêm điểm 'K' — nếu seed đã có 'K' thì đụng nhãn.
//
// MỖI test là một bằng chứng hồi quy: lỡ tay làm hồi lỗi cũ thì test này ĐỎ ngay.
// ===========================================================================
import { describe, it, expect } from "vitest";
import type { Seed } from "../../data/schema/problem";
import { rescale, scaleLengthsInText, canonicalToNumber } from "../rescale";
import { seedNumeric } from "./fixtures";

// Bộ dựng seed tối thiểu cho các ca đối kháng (ghi đè trường cần thiết).
function mkSeed(over: Partial<Seed> & Pick<Seed, "statement_vi" | "answer">): Seed {
  return {
    id: "vsgeo-0009",
    source: { type: "synthetic", ref: "adversarial" },
    figure: { points: [], coords_given: false },
    tags: {
      topic: ["the_tich"],
      answer_form: "surd",
      difficulty: 1,
      requires_auxiliary_construction: false,
    },
    scale_degree: 3,
    ...over,
  } as Seed;
}

describe("F1 — rescale: từ chối (skip) thay vì sinh bài tự mâu thuẫn", () => {
  it("(a) under-scale: 'SA = a' còn nguyên trong khi đáp án ×k => PHẢI ném (bị skip)", () => {
    const s = mkSeed({
      statement_vi:
        "Cho hình chóp S.ABCD có đáy là hình vuông cạnh a, cạnh bên SA = a. Tính thể tích khối chóp.",
      answer: { canonical: "a^3/6", type: "surd" },
      scale_degree: 3,
    });
    // "cạnh a" -> "cạnh 2a" nhưng "SA = a" không đổi => hậu-kiểm bắt được độ dài ký hiệu sót.
    expect(() => rescale(s, 2)).toThrow(/ký hiệu|chưa co giãn/);
  });

  it("(b) over-scale góc: đề chứa 'góc ... bằng 60' => PHẢI ném (không nhân đôi góc)", () => {
    const s = mkSeed({
      statement_vi:
        "Cho hình chóp S.ABCD, góc giữa SC và mặt đáy bằng 60. Tính thể tích khối chóp.",
      answer: { canonical: "a^3*sqrt(3)/3", type: "surd" },
      scale_degree: 3,
    });
    expect(() => rescale(s, 2)).toThrow(/góc|độ/);
  });

  it("(b) over-scale thể tích cho bằng số: 'thể tích ... bằng 8' => PHẢI ném", () => {
    const s = mkSeed({
      statement_vi: "Cho khối chóp có thể tích bằng 8. Tính độ dài cạnh đáy.",
      answer: { canonical: "sqrt(6)", type: "surd" },
      scale_degree: 1,
    });
    expect(() => rescale(s, 2)).toThrow(/diện tích|thể tích/);
  });

  it("(b') mẫu-1 KHÔNG được đụng nhãn HOA: 'cạnh A.' giữ nguyên (không thành 'cạnh 2a')", () => {
    // Trước sửa: cờ /i làm 'A' khớp 'a' => "cạnh A." -> "cạnh 2a." (hỏng nhãn đỉnh).
    expect(scaleLengthsInText("Lấy điểm trên cạnh A.", 2)).toBe("Lấy điểm trên cạnh A.");
    // Cạnh ký hiệu thường vẫn co giãn:
    expect(scaleLengthsInText("hình vuông cạnh a.", 2)).toBe("hình vuông cạnh 2a.");
  });

  it("(e) đáp án số không biểu diễn exact được => KHÔNG lưu decimal mất mát, bọc ký hiệu", () => {
    const s = mkSeed({
      statement_vi: "Tính giá trị biểu thức đã cho.",
      answer: { canonical: "sqrt(2)+sqrt(3)", type: "surd" },
      scale_degree: 1,
    });
    const v = rescale(s, 2);
    // 2*(√2+√3) ≈ 6.2925 -> toExactForm.isExact=false. Lỗi cũ lưu "6.2925" (mất mát).
    expect(v.answer.canonical).not.toMatch(/^-?\d+\.\d+$/);
    // Vẫn đúng giá trị: canonicalToNumber(kết quả) = giá trị gốc × k^degree.
    expect(canonicalToNumber(v.answer.canonical)).toBeCloseTo(
      canonicalToNumber("sqrt(2)+sqrt(3)") * 2,
      6
    );
  });

  it("hồi quy: đáp án SỐ exact vẫn co giãn gọn (khối lập phương cạnh 2 => 64)", () => {
    const v = rescale(seedNumeric, 2);
    expect(v.answer.canonical).toBe("64");
  });
});
