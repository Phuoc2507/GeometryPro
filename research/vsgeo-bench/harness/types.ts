// ===== Hợp đồng kiểu dữ liệu dùng chung cho toàn bộ VSGeo-Bench =====
// (khớp với "HỢP ĐỒNG KIỂU DỮ LIỆU DÙNG CHUNG" trong bản thiết kế — mọi hệ con dùng đúng tên này)

// Kiểu "phán quyết" của máy chấm. Định nghĩa gốc ở kế hoạch 02 (grader).
// Ta khai lại ở đây một bản độc lập để harness tự đứng được khi test;
// giá trị y hệt nên không xung đột. Khi grader có mặt, hai bên vẫn khớp chuỗi.
export type Verdict = "correct" | "incorrect" | "unsure";

// Hai kiểu prompt: hỏi thẳng, hoặc bắt suy luận từng bước rồi mới kết luận.
export type PromptStyle = "zero_shot" | "cot";

// Kết quả một lần gọi model. costUsd có thể vắng nếu chưa biết giá.
export interface ModelReply {
  text: string;            // toàn văn model trả về
  latencyMs: number;       // thời gian chờ (mili-giây)
  usage?: { in: number; out: number };  // số token vào/ra (nếu nhà cung cấp trả về)
  costUsd?: number;        // chi phí ước tính (USD)
}

// Một dòng nhật ký: MỘT lượt seed × model × run × style.
export interface EvalRecord {
  seedId: string;
  modelId: string;
  run: number;                 // lần thứ mấy (1..k)
  promptStyle: PromptStyle;
  rawOutput: string;           // nguyên văn model trả (để soi lỗi sau)
  extractedAnswer: string | null;  // phần trong \boxed{...}, hoặc null nếu không thấy
  verdict: Verdict;            // do grade() phán
  latencyMs: number;
  costUsd?: number;
  perturbation?: { kind: string; parentSeedId: string };  // nếu đây là bài biến thể (kế hoạch 04)
}
