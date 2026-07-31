// research/vsgeo-bench/analysis/types.ts
// "Từ điển kiểu" của tầng phân tích. Khớp HỢP ĐỒNG DÙNG CHUNG trong docs/design.md
// và các kế hoạch 00–04, để mọi hệ con ăn khớp nhau.

// Phán quyết của máy chấm (oracle, kế hoạch 02) cho một câu trả lời.
export type Verdict = "correct" | "incorrect" | "unsure";

// Các dạng đáp án (§3.4). Dùng cho tag của bài và cho answer.type.
export type AnswerType =
  | "rational"   // số hữu tỉ, vd "3/2"
  | "surd"       // biểu thức căn, vd "2√3"
  | "ratio"      // tỉ số
  | "point"      // toạ độ điểm
  | "vector"     // vector
  | "plane_eq"   // phương trình mặt phẳng
  | "line_eq"    // phương trình đường thẳng
  | "boolean"    // đúng/sai
  | "mcq";       // trắc nghiệm

// Kiểu prompt cố định (§6.2).
export type PromptStyle = "zero_shot" | "cot";

// MỘT bản ghi kết quả = MỘT dòng trong results/*.jsonl.
// (Một bản ghi cho mỗi bộ seed × model × run.)
export interface EvalRecord {
  seedId: string;
  modelId: string;
  run: number;
  promptStyle: PromptStyle;
  rawOutput: string;            // output thô của model (để soi taxonomy lỗi + calibration)
  extractedAnswer: string | null;
  verdict: Verdict;             // do oracle (kế hoạch 02) chấm
  latencyMs: number;
  costUsd?: number;
  // Nếu bản ghi này là của MỘT BIẾN THỂ (perturbation), ghi loại biến đổi + id bài gốc.
  perturbation?: { kind: string; parentSeedId: string };
}

// ---- Thông tin BÀI (seed) — bản rút gọn đủ cho phân tích, đọc từ data/seeds/*.json ----

export interface Answer {
  canonical: string;   // dạng chuẩn để oracle so khớp
  type: AnswerType;
  human_note?: string;
}

export interface SeedTags {
  topic: string[];                              // nhiều nhãn chủ đề, vd ["khoang_cach","vuong_goc"]
  answer_form: AnswerType;
  difficulty: 1 | 2 | 3 | 4;                    // 1 nhận biết → 4 vận dụng cao
  requires_auxiliary_construction: boolean;     // biến then chốt của H1
}

export interface Seed {
  id: string;
  source: { type: "exam" | "textbook" | "synthetic"; ref: string; license?: string };
  statement_vi: string;
  figure?: { points?: { id: string; x: number; y: number; z: number }[]; coords_given: boolean };
  answer: Answer;
  tags: SeedTags;
  solution_ref_vi?: string;
  verified_by_engine?: boolean;
  scale_degree?: number;
}

// Bảng tra bài theo id (nối nhanh EvalRecord với tag của bài).
export type SeedIndex = Map<string, Seed>;

// ---- Kiểu riêng của tầng phân tích ----

// Một dòng bảng độ chính xác: nhãn nhóm + số đúng/tổng + tỉ lệ + khoảng tin cậy 95%.
export interface AccuracyRow {
  key: string;
  correct: number;
  total: number;
  accuracy: number;         // correct / total, nằm trong [0, 1]
  ci95: [number, number];   // khoảng tin cậy bootstrap [thấp, cao]
}

// Kết quả kiểm định McNemar (so 2 model trên cùng tập bài).
export interface McNemarResult {
  b: number;           // số bài: A đúng & B sai
  c: number;           // số bài: A sai & B đúng
  statistic: number;   // thống kê χ² (có hiệu chỉnh liên tục)
  pValue: number;      // xấp xỉ hai phía, χ² 1 bậc tự do
}

// ---- HỢP ĐỒNG máy-đọc với kế hoạch 07 (dashboard): kiểu CANONICAL cho summary.json ----
// Đây là kiểu chuẩn của file summary.json. Dashboard (kế hoạch 07) IMPORT nguyên các kiểu
// này TỪ ĐÂY (analysis/types.ts) — KHÔNG tự định nghĩa lại — để hai hệ con luôn khớp nhau.

export type Difficulty = 1 | 2 | 3 | 4;
export type TopicStat = { topic: string; total: number; correct: number; accuracy: number };
export type DifficultyStat = { difficulty: Difficulty; total: number; correct: number; accuracy: number };
export type RobustnessStat = { baseAccuracy: number; perturbedAccuracy: number; gap: number };
export type ModelSummary = {
  modelId: string;
  overall: { total: number; correct: number; incorrect: number; unsure: number; accuracy: number };
  byTopic: TopicStat[];
  byDifficulty: DifficultyStat[];
  robustness: RobustnessStat;
  costUsd?: number;
  avgLatencyMs?: number;
};
export type BenchmarkSummary = { generatedAt: string; seedCount: number; models: ModelSummary[] };

// ---- Type guards: bắt lỗi sớm khi đọc dữ liệu ngoài (JSONL) ----

const VERDICTS: readonly Verdict[] = ["correct", "incorrect", "unsure"];

export function isVerdict(x: unknown): x is Verdict {
  return typeof x === "string" && (VERDICTS as readonly string[]).includes(x);
}
