// problem.ts — lược đồ (schema) của MỘT bài toán trong VSGeo-Bench.
// Viết bằng zod: khai báo một lần, rút ra được cả kiểm-tra-lúc-chạy lẫn kiểu TypeScript.
// Mọi tên trường ở đây PHẢI khớp "HỢP ĐỒNG KIỂU DỮ LIỆU DÙNG CHUNG" của cả dự án,
// vì máy chấm (kế hoạch 02) và harness (kế hoạch 03) đọc đúng các tên này.

import { z } from "zod";

// --- Kiểu đáp án: danh sách đóng (chỉ được là một trong các giá trị này) ---
export const AnswerTypeSchema = z.enum([
  "rational",  // số hữu tỉ, ví dụ "3/2"
  "surd",      // biểu thức căn, ví dụ "a*sqrt(6)/3"
  "ratio",     // tỉ số, ví dụ "1:2" hoặc "2/3"
  "point",     // toạ độ điểm, ví dụ "(1,2,3)"
  "vector",    // vector, ví dụ "(1,-2,2)"
  "plane_eq",  // phương trình mặt phẳng, ví dụ "x+2y-2z+3=0"
  "line_eq",   // phương trình đường thẳng
  "boolean",   // đúng/sai
  "mcq",       // trắc nghiệm A/B/C/D
]);
export type AnswerType = z.infer<typeof AnswerTypeSchema>;

// --- Đáp án ---
export const AnswerSchema = z
  .object({
    canonical: z.string().min(1, "answer.canonical không được rỗng"),
    type: AnswerTypeSchema,
    human_note: z.string().optional(),
  })
  .strict(); // .strict(): có trường lạ (gõ sai tên) → báo lỗi thay vì lặng lẽ bỏ qua
export type Answer = z.infer<typeof AnswerSchema>;

// --- Một điểm trong figure (nếu đề cho toạ độ) ---
export const PointSchema = z
  .object({
    id: z.string().min(1),
    x: z.number(),
    y: z.number(),
    z: z.number(),
  })
  .strict();

// --- figure: hình vẽ / dữ kiện toạ độ (tuỳ chọn) ---
export const FigureSchema = z
  .object({
    points: z.array(PointSchema).optional(),
    coords_given: z.boolean(), // đề có cho sẵn hệ toạ độ không
  })
  .strict();

// --- source: nguồn gốc bài, phục vụ minh bạch bản quyền (§3.2, §12) ---
export const SourceSchema = z
  .object({
    type: z.enum(["exam", "textbook", "synthetic"]),
    ref: z.string().min(1, "source.ref không được rỗng (phải ghi nguồn)"),
    license: z.string().optional(),
  })
  .strict();

// --- tags: các chiều phân loại (§3.4) ---
export const TagsSchema = z
  .object({
    topic: z.array(z.string().min(1)).min(1, "topic phải có ít nhất 1 nhãn"),
    answer_form: AnswerTypeSchema,
    // difficulty chỉ nhận đúng 1|2|3|4 (khớp kiểu 1|2|3|4 của hợp đồng dùng chung).
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    requires_auxiliary_construction: z.boolean(),
  })
  .strict();

// --- Seed: cả một bài toán ---
export const SeedSchema = z
  .object({
    id: z.string().regex(/^vsgeo-\d{4}$/, "id phải dạng vsgeo-XXXX (đúng 4 chữ số)"),
    source: SourceSchema,
    statement_vi: z.string().min(1, "statement_vi (đề bài) không được rỗng"),
    figure: FigureSchema.optional(),
    answer: AnswerSchema,
    tags: TagsSchema,
    solution_ref_vi: z.string().optional(),
    verified_by_engine: z.boolean().optional(),
    scale_degree: z.number().optional(),
  })
  .strict();

// Rút kiểu TypeScript ra từ schema — khỏi khai báo hai lần.
export type Seed = z.infer<typeof SeedSchema>;

/**
 * validateSeed — kiểm một object bất kỳ có phải Seed hợp lệ không.
 * Trả { ok: true, seed } nếu hợp lệ, hoặc { ok: false, errors } với danh sách
 * lỗi dạng "đường.dẫn.trường: mô tả" để người soạn biết sửa ở đâu.
 */
export function validateSeed(
  obj: unknown
): { ok: true; seed: Seed } | { ok: false; errors: string[] } {
  const r = SeedSchema.safeParse(obj);
  if (r.success) return { ok: true, seed: r.data };
  const errors = r.error.issues.map((iss) => {
    const path = iss.path.length ? iss.path.join(".") : "(gốc)";
    return `${path}: ${iss.message}`;
  });
  return { ok: false, errors };
}
