// research/vsgeo-bench/perturbations/types.ts
// Kiểu dùng chung cho toàn bộ bộ biến đổi (perturbations).

// ĐIỂM NỐI DUY NHẤT sang plan khác: Seed/Answer/AnswerType đến từ plan 01.
// Nếu plan 01 đặt file ở đường dẫn/tên khác, chỉ sửa đúng dòng import dưới đây.
import type { Seed, Answer, AnswerType } from "../data/schema/problem";
export type { Seed, Answer, AnswerType };

// 5 loại biến đổi — khớp HỢP ĐỒNG DÙNG CHUNG của đề tài.
export type PerturbKind = "rename" | "rescale" | "paraphrase" | "distractor" | "reflect";

// Verdict — khai báo lại đúng 3 giá trị của grader (plan 02) để metrics.ts độc lập.
// Nếu grader đổi tập giá trị này, phải sửa cả hai nơi cho khớp.
export type Verdict = "correct" | "incorrect" | "unsure";

// Nhãn truy vết: biến thể này sinh từ seed cha nào, bằng phép gì.
export type VariantMeta = { kind: PerturbKind; parentSeedId: string };

// Một biến thể = một Seed hợp lệ + trường `variant` ghi nguồn gốc.
// Variant KẾ THỪA Seed, nên Variant[] cũng là Seed[] (thoả hợp đồng perturb => Seed[]).
export type Variant = Seed & { variant: VariantMeta };

// Ghép id: "vsgeo-0001" + "rename" => "vsgeo-0001__rename".
export function variantId(parentId: string, kind: PerturbKind): string {
  return `${parentId}__${kind}`;
}

// Bản sao SÂU của seed (để biến đổi không làm hỏng seed gốc).
// structuredClone có sẵn trong Node >= 18 (môi trường tsx/vitest của ta).
export function cloneSeed(seed: Seed): Seed {
  return structuredClone(seed);
}
