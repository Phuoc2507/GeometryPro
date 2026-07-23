// grader/index.ts
// Điểm vào công khai (barrel) của thư mục grader/. Các kế hoạch khác — nhất là
// Kế hoạch 03 (harness) — lấy máy chấm qua CHỖ NÀY, không import lẻ từng file:
//   const { grade } = await import('../grader');   // → resolve grader/index.ts
// File này CHỈ re-export, không chứa logic — để đổi cấu trúc bên trong mà không vỡ nơi gọi.
export { grade } from './grade';
export type { Answer, AnswerType, Verdict, GradeResult, EvalRecord } from './types';
