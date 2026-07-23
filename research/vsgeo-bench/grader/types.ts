// grader/types.ts
// Các kiểu này phải TRÙNG TÊN với "HỢP ĐỒNG DÙNG CHUNG" của dự án, để các hệ con
// (harness, perturbations, analysis) khớp nhau. Ta khai báo lại ở đây (không import từ
// data/schema) để thư mục grader/ tự đứng được khi tách ra repo công khai (design.md §14).

/** 9 dạng đáp án mà máy chấm phải xử lý (design.md §3.4). */
export type AnswerType =
  | 'rational'   // số hữu tỉ, vd 3/2
  | 'surd'       // biểu thức căn, vd √6/3
  | 'ratio'      // tỉ số, vd 1:2
  | 'point'      // tọa độ điểm, vd (1,2,3)
  | 'vector'     // vector, vd (0,1,-2)
  | 'plane_eq'   // phương trình mặt phẳng, vd x+2y-2z+3=0
  | 'line_eq'    // phương trình đường thẳng
  | 'boolean'    // đúng/sai
  | 'mcq';       // trắc nghiệm A/B/C/D

/** Phán quyết của máy chấm cho một lượt chấm. */
export type Verdict = 'correct' | 'incorrect' | 'unsure';

/** Đáp án chuẩn của một bài (khớp answer.canonical ở design.md §3.3). */
export interface Answer {
  canonical: string;      // dạng chuẩn để oracle so khớp, vd "√6/3", "(1,2,3)"
  type: AnswerType;
  human_note?: string;    // ghi chú người đọc, vd "khoảng cách từ A đến (SBD)"
}

/** Kết quả một lần chấm — thứ mà hàm grade() trả về. */
export interface GradeResult {
  verdict: Verdict;
  canonicalModel?: string;  // dạng chuẩn của đáp án model (nếu đọc được)
  canonicalTruth?: string;  // dạng chuẩn của đáp án đúng
  reason: string;           // giải thích BẰNG TIẾNG VIỆT vì sao ra phán quyết đó
}

/** Một dòng log kết quả (JSONL). Self-check đọc lại các bản ghi này. */
export interface EvalRecord {
  seedId: string;
  modelId: string;
  run: number;
  promptStyle: 'zero_shot' | 'cot';
  rawOutput: string;
  extractedAnswer: string | null;
  verdict: Verdict;
  latencyMs: number;
  costUsd?: number;
  perturbation?: { kind: string; parentSeedId: string };
}

/** Danh sách chạy được để test & để lặp. Thứ tự cố định. */
export const ALL_ANSWER_TYPES: AnswerType[] = [
  'rational', 'surd', 'ratio', 'point', 'vector',
  'plane_eq', 'line_eq', 'boolean', 'mcq',
];

export const ALL_VERDICTS: Verdict[] = ['correct', 'incorrect', 'unsure'];

/** Kiểm tra một chuỗi bất kỳ có phải là AnswerType hợp lệ không (type guard). */
export function isAnswerType(x: string): x is AnswerType {
  return (ALL_ANSWER_TYPES as string[]).includes(x);
}
