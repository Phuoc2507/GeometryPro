// dashboard/check-ai-solution.ts
// Hàm THUẦN cho DEMO SỐNG "Kiểm tra lời giải AI".
// Nhận đáp án chuẩn của bài (truth) + toàn văn lời giải AI (chuỗi thô), rồi:
//   1) TRÍCH \boxed{...} để cho học sinh thấy "máy đọc đáp án của AI ra gì",
//   2) GỌI máy chấm grade() (so khớp ký hiệu chính xác) để ra phán quyết,
// và trả về một kết quả SẴN-SÀNG-HIỂN-THỊ (nhãn tiếng Việt). Không React, không mạng → test được.
// Máy chấm (grade, extractBoxed) là công cụ dựng ở kế hoạch 02; ở đây chỉ DÙNG LẠI.
import { extractBoxed } from "../grader/extract";
import { grade } from "../grader/grade";
import type { Answer, Verdict } from "../grader/types";

export type CheckResult = {
  verdict: Verdict; // phán quyết máy: correct | incorrect | unsure
  verdictLabel: string; // nhãn hiển thị tiếng Việt: "Đúng" | "Sai" | "Không chắc"
  extracted: string | null; // đáp án đọc được từ \boxed{...} (null nếu không thấy)
  canonicalTruth: string; // đáp án chuẩn của bài (để học sinh đối chiếu)
  reason: string; // giải thích tiếng Việt của máy chấm
};

// Ánh xạ verdict máy → nhãn thân thiện cho học sinh.
const LABEL: Record<Verdict, string> = {
  correct: "Đúng",
  incorrect: "Sai",
  unsure: "Không chắc",
};

export function checkAiSolution(truth: Answer, aiRawText: string): CheckResult {
  const extracted = extractBoxed(aiRawText); // cho học sinh thấy máy đọc đáp án AI là gì
  const result = grade(aiRawText, truth); // phán quyết dựa trên so khớp ký hiệu chính xác
  return {
    verdict: result.verdict,
    verdictLabel: LABEL[result.verdict],
    extracted,
    canonicalTruth: truth.canonical,
    reason: result.reason,
  };
}
