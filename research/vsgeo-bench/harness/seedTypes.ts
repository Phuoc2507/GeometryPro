// Harness chỉ cần MỘT PHẦN của Seed (đề bài + đáp án). Ta khai bản rút gọn ở đây để
// harness tự đứng khi test. Khi kế hoạch 01 hoàn tất, kiểu Seed đầy đủ tương thích bản này
// (đây là tập con). Nếu muốn, sau này đổi dòng dưới thành:
//   export type { Seed } from "../data/schema/types";
export type AnswerType =
  | "rational" | "surd" | "ratio" | "point"
  | "vector" | "plane_eq" | "line_eq" | "boolean" | "mcq";

export interface Answer {
  canonical: string;
  type: AnswerType;
  human_note?: string;
}

export interface Seed {
  id: string;
  source: { type: "exam" | "textbook" | "synthetic"; ref: string; license?: string };
  statement_vi: string;
  figure?: { points?: { id: string; x: number; y: number; z: number }[]; coords_given: boolean };
  answer: Answer;
  tags: {
    topic: string[];
    answer_form: AnswerType;
    difficulty: 1 | 2 | 3 | 4;
    requires_auxiliary_construction: boolean;
  };
  solution_ref_vi?: string;
  verified_by_engine?: boolean;
  scale_degree?: number;
}
