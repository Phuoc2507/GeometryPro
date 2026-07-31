import { describe, it, expect } from "vitest";
import { checkAiSolution } from "../check-ai-solution";
import type { Answer } from "../../grader/types";

// Đáp án chuẩn của bài mẫu: khoảng cách = √6/3 (dạng surd).
const truth: Answer = { canonical: "√6/3", type: "surd" };

describe("checkAiSolution — máy chấm cho DEMO SỐNG 'Kiểm tra lời giải AI'", () => {
  it("lời giải AI có \\boxed ĐÚNG → verdict correct, nhãn 'Đúng', có trích được đáp án", () => {
    const r = checkAiSolution(truth, "Dựng chân đường cao... Vậy \\boxed{\\dfrac{\\sqrt6}{3}}.");
    expect(r.verdict).toBe("correct");
    expect(r.verdictLabel).toBe("Đúng");
    expect(r.extracted).not.toBeNull();
  });

  it("lời giải AI 'trôi chảy nhưng SAI' (\\boxed{5}) → verdict incorrect, nhãn 'Sai'", () => {
    const r = checkAiSolution(truth, "Trình bày dài dòng, tự tin kết luận: \\boxed{5}.");
    expect(r.verdict).toBe("incorrect");
    expect(r.verdictLabel).toBe("Sai");
  });

  it("không trích được đáp án → verdict unsure, nhãn 'Không chắc', extracted = null", () => {
    const r = checkAiSolution(truth, "Bài này khó quá, em nghĩ mãi chưa ra.");
    expect(r.verdict).toBe("unsure");
    expect(r.verdictLabel).toBe("Không chắc");
    expect(r.extracted).toBeNull();
  });

  it("luôn kèm đáp án chuẩn + lý do để học sinh ĐỐI CHIẾU, và là hàm thuần", () => {
    const r = checkAiSolution(truth, "\\boxed{5}");
    expect(r.canonicalTruth).toBe("√6/3");
    expect(r.reason.length).toBeGreaterThan(0);
    // gọi lại cho kết quả y hệt (không phụ thuộc trạng thái ngoài)
    expect(checkAiSolution(truth, "\\boxed{5}")).toEqual(r);
  });
});
