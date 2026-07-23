// research/vsgeo-bench/perturbations/rescale.ts
// Đổi tỉ lệ mọi độ dài lên k lần; đáp án co giãn theo scale_degree (bậc): x -> x * k^degree.
import type { Seed, Variant } from "./types";
import { cloneSeed, variantId } from "./types";
// Engine ký hiệu có sẵn (ghi nguồn: api/_lib/kernel) — KHÔNG phải do nhóm phát minh.
import { toExactForm } from "../../../api/_lib/kernel/exactForm";
import { evalExpr } from "../../../api/_lib/kernel/analysis/expr";

const NUMERIC_TYPES = new Set(["rational", "surd", "ratio"]);

// Chuẩn hoá canonical về cú pháp evalExpr đọc được (√ -> sqrt), rồi tính giá trị số.
// env cho phép gán a=1 khi canonical còn ký hiệu cạnh 'a'.
export function canonicalToNumber(canonical: string, env: Record<string, number> = {}): number {
  let s = canonical.trim();
  s = s.replace(/(\d)\s*√/g, "$1*√"); // "3√14" -> "3*√14" (chèn dấu nhân)
  s = s.replace(/√\s*(\d+)/g, "sqrt($1)"); // "√14" -> "sqrt(14)"
  return evalExpr(s, env);
}

// canonical có chứa ký hiệu chữ (vd 'a') không? (bỏ qua chữ trong "sqrt")
export function isNumericCanonical(canonical: string): boolean {
  const withoutSqrt = canonical.replace(/sqrt/gi, "");
  return !/[a-zA-Z]/.test(withoutSqrt);
}

// Nhân độ dài trong lời văn lên k lần — BẢO THỦ, chỉ khớp các mẫu SGK phổ biến.
// (Đây là ranh giới: Em 1 soạn bài rescale-được theo các mẫu này — xem "Lưu ý phối hợp".)
export function scaleLengthsInText(text: string, k: number): string {
  let out = text;
  // 1) hệ số của cạnh ký hiệu: "cạnh a" -> "cạnh (k)a"; "cạnh 2a" -> "cạnh (2k)a"
  out = out.replace(/(cạnh\s+)(\d*)a\b/gi, (_m, pre: string, coef: string) => {
    const c = coef ? Number(coef) : 1;
    return `${pre}${c * k}a`;
  });
  // 2) số sau từ khoá độ dài, KHÔNG theo sau bởi chữ/số (tránh đụng "2a" đã xử lý ở trên)
  out = out.replace(
    /(cạnh|bằng|dài|cao|bán kính)(\s+)(\d+(?:\.\d+)?)(?![\da-zA-Z])/gi,
    (_m, kw: string, sp: string, num: string) => `${kw}${sp}${Number(num) * k}`
  );
  return out;
}

export function rescale(seed: Seed, k: number): Variant {
  if (seed.scale_degree === undefined) {
    throw new Error(`rescale cần seed.scale_degree (seed ${seed.id})`);
  }
  if (!NUMERIC_TYPES.has(seed.answer.type)) {
    throw new Error(
      `rescale chỉ định nghĩa cho đáp án số (rational|surd|ratio), gặp ${seed.answer.type} ở seed ${seed.id}`
    );
  }
  const degree = seed.scale_degree;
  const factor = Math.pow(k, degree);

  const v = cloneSeed(seed) as Variant;
  v.id = variantId(seed.id, "rescale");
  v.statement_vi = scaleLengthsInText(seed.statement_vi, k);
  if (v.figure?.points) {
    v.figure.points = v.figure.points.map((p) => ({ ...p, x: p.x * k, y: p.y * k, z: p.z * k }));
  }

  // Đáp án
  if (isNumericCanonical(seed.answer.canonical)) {
    const nv = canonicalToNumber(seed.answer.canonical) * factor;
    v.answer = { ...seed.answer, canonical: toExactForm(nv).text };
  } else {
    // Còn ký hiệu 'a': bọc hệ số k^degree; grader sẽ chuẩn hoá khi chấm.
    v.answer = { ...seed.answer, canonical: `${factor}*(${seed.answer.canonical})` };
  }
  v.variant = { kind: "rescale", parentSeedId: seed.id };
  return v;
}
