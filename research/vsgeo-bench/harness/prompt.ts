import type { Seed } from "./seedTypes";
import type { PromptStyle } from "./types";

// Lời hệ thống (system) CỐ ĐỊNH cho mọi model, mọi bài — để giao thức đồng nhất, tái lập được.
// Điểm mấu chốt: BẮT BUỘC kết luận cuối trong \boxed{...} để parser (§4.2) trích được.
const SYSTEM_PROMPT = [
  "Bạn là trợ giảng Toán, chuyên hình học không gian (lớp 11–12) chương trình THPT Việt Nam.",
  "Hãy giải bài toán được giao một cách chính xác.",
  "Quan trọng: đặt ĐÁP ÁN CUỐI CÙNG trong một lệnh \\boxed{...} duy nhất ở cuối câu trả lời.",
  "Ví dụ kết luận: \\boxed{a\\sqrt{6}/3}. Chỉ đặt kết quả gọn nhất trong \\boxed{}, không kèm chữ.",
].join(" ");

export function buildPrompt(seed: Seed, style: PromptStyle): { system: string; user: string } {
  const de = seed.statement_vi;
  let user: string;
  if (style === "zero_shot") {
    user =
      `Giải bài sau. Trả lời ngắn gọn và đặt đáp án cuối trong \\boxed{...}.\n\n` +
      `Đề: ${de}`;
  } else {
    // cot = chain-of-thought: yêu cầu suy luận từng bước rồi mới chốt.
    user =
      `Giải bài sau. Hãy suy luận từng bước rõ ràng, sau đó đặt đáp án cuối trong \\boxed{...}.\n\n` +
      `Đề: ${de}`;
  }
  return { system: SYSTEM_PROMPT, user };
}
