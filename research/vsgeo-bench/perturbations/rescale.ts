// research/vsgeo-bench/perturbations/rescale.ts
// Đổi tỉ lệ mọi độ dài lên k lần; đáp án co giãn theo scale_degree (bậc): x -> x * k^degree.
import type { Seed, Variant } from "./types";
import { cloneSeed, variantId } from "./types";
// Engine ký hiệu có sẵn (ghi nguồn: api/_lib/kernel) — KHÔNG phải do nhóm phát minh.
import { toExactForm } from "../../../api/_lib/kernel/exactForm";
import { evalExpr } from "../../../api/_lib/kernel/analysis/expr";

const NUMERIC_TYPES = new Set(["rational", "surd", "ratio"]);

// F1(c) TIỀN-KIỂM: từ chối co giãn khi đề chứa dữ kiện KHÔNG co giãn tuyến tính theo k.
// Nguyên tắc §4.3: thà SKIP còn hơn sinh bài tự mâu thuẫn (góc bị nhân đôi, thể tích cho
// bằng số sẽ sai bậc). generateVariantsForSeed bọc try/catch nên ném = biến thể bị bỏ.
// F9 Toạ độ literal "L(x;y;z)" (nhãn HOA + 3 số ngăn bởi ';' hoặc ','), cùng dạng reflect nhận.
const HAS_COORD_LITERAL =
  /[A-Z]\(\s*-?\d+(?:\.\d+)?\s*[;,]\s*-?\d+(?:\.\d+)?\s*[;,]\s*-?\d+(?:\.\d+)?\s*\)/;

function assertScalable(orig: string): void {
  // F12 Nhánh '°/độ' cũ dùng '\b' sau '°'/'ộ' (ký tự phi-từ) nên KHÔNG BAO GIỜ khớp khi
  // theo sau là dấu câu/khoảng trắng — guard chết, "45°." / "60 độ." lọt lưới. Thay bằng
  // lookahead (?![\p{L}\d]) với cờ /u: chặn khi sau đơn vị góc KHÔNG phải chữ/số (tức là
  // '°'/'độ' đứng như đơn vị, không phải mở đầu từ khác như "độ dài" — vốn cần \d ngay trước).
  if (/\bgóc\b/i.test(orig) || /\d\s*(?:°|độ)(?![\p{L}\d])/iu.test(orig)) {
    throw new Error(`rescale: đề chứa góc/độ — co giãn cạnh không được đổi góc (bỏ qua)`);
  }
  if (/\b(diện tích|thể tích)\b[^.]*\bbằng\b\s*\d/i.test(orig)) {
    throw new Error(
      `rescale: diện tích/thể tích cho bằng số — bậc co giãn ≠ 1, không đảm bảo nhất quán (bỏ qua)`
    );
  }
  // F9 (MỞ RỘNG) TỪ CHỐI, KHÔNG cố co giãn toạ độ. scaleLengthsInText không khớp "A(1;2;3)"
  // nên câu giữ nguyên toạ độ (⇒ khoảng cách cũ) trong khi figure.points và đáp án đã ×k ⇒
  // statement mâu thuẫn với answer (model trả đúng theo đề lại bị chấm sai — §4.3 sai-im-lặng).
  // Co giãn toạ độ chỉ hợp lệ cho bài THUẦN BẬC ĐỒNG NHẤT và đòi xử lý riêng phương trình
  // mặt/mặt cầu (có hạng tử tự do) và vector phương-vs-vị-trí; một scaler nửa vời sẽ đẻ thêm
  // ca sai-emit mới. Theo "thà bỏ còn hơn sai", ta bỏ. Bù đắp toạ độ để MỞ RỘNG sau.
  if (HAS_COORD_LITERAL.test(orig)) {
    throw new Error(
      `rescale: đề chứa toạ độ literal A(x;y;z) — co giãn toạ độ cần xử lý riêng (pt mặt/vector), thà bỏ còn hơn sinh sai (MỞ RỘNG) — bỏ qua`
    );
  }
}

// F1(d) HẬU-KIỂM: sau khi co giãn, không được còn độ dài KÝ HIỆU ('a', '2a') đứng tự do
// mà chưa nhân k (vd "SA = a" bị bỏ sót trong khi "cạnh a" đã thành "cạnh 2a").
// m[1] là tiền tố "cạnh " (đã co giãn) — chỉ ném khi độ dài ký hiệu KHÔNG có tiền tố này.
// F11 PHÂN BIỆT HOA/THƯỜNG (/g KHÔNG /gi): 'a' thường là cạnh ký hiệu, 'A' HOA là NHÃN
// đỉnh — cờ /i cũ khớp cả nhãn "A" đứng tự do ⇒ ném NHẦM ⇒ bài co-giãn-được bị bỏ oan.
function assertFullyScaled(scaled: string): void {
  const EDGE = /(?<=^|[\s=(:])(cạnh\s+)?(\d*)a(?=$|[\s.,;)√^])/g;
  for (const m of scaled.matchAll(EDGE)) {
    if (!m[1]) {
      throw new Error(
        `rescale: còn độ dài ký hiệu '${m[0].trim()}' chưa co giãn — bài sẽ tự mâu thuẫn (bỏ qua)`
      );
    }
  }
}

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
  // F1(b') PHÂN BIỆT HOA/THƯỜNG (bỏ cờ /i): 'a' là ký hiệu cạnh, 'A' là NHÃN đỉnh —
  // "cạnh A." không được biến thành "cạnh 2a" (làm hỏng nhãn hình học).
  out = out.replace(/(cạnh\s+)(\d*)a\b/g, (_m, pre: string, coef: string) => {
    const c = coef ? Number(coef) : 1;
    return `${pre}${c * k}a`;
  });
  // 2) số sau từ khoá ĐỘ DÀI, KHÔNG theo sau bởi chữ/số (tránh đụng "2a" đã xử lý ở trên).
  // F1(a) BỎ 'bằng' khỏi từ khoá: "bằng 60" (số đo góc), "bằng 8" (thể tích cho sẵn) KHÔNG
  // phải độ dài — nhân k vào chúng là sai. Chỉ giữ các danh từ chỉ độ dài thực sự.
  out = out.replace(
    /(cạnh|dài|cao|bán kính|đường kính)(\s+)(\d+(?:\.\d+)?)(?![\da-zA-Z])/gi,
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
  assertScalable(seed.statement_vi); // F1(c) tiền-kiểm góc/độ, diện tích/thể tích cho bằng số
  const degree = seed.scale_degree;
  const factor = Math.pow(k, degree);

  const v = cloneSeed(seed) as Variant;
  v.id = variantId(seed.id, "rescale");
  v.statement_vi = scaleLengthsInText(seed.statement_vi, k);
  assertFullyScaled(v.statement_vi); // F1(d) hậu-kiểm: không còn độ dài ký hiệu chưa co giãn
  if (v.figure?.points) {
    v.figure.points = v.figure.points.map((p) => ({ ...p, x: p.x * k, y: p.y * k, z: p.z * k }));
  }

  // Đáp án
  if (isNumericCanonical(seed.answer.canonical)) {
    const nv = canonicalToNumber(seed.answer.canonical) * factor;
    // F1(e) toExactForm.isExact=false nghĩa là nó rơi xuống nhánh .toFixed(4) (MẤT MÁT).
    // Không lưu decimal cắt cụt; thay vào đó bọc ký hiệu k^degree quanh canonical gốc để
    // giữ đáp án CHÍNH XÁC (grader chuẩn hoá số học khi chấm).
    const exact = toExactForm(nv);
    v.answer = {
      ...seed.answer,
      canonical: exact.isExact ? exact.text : `${factor}*(${seed.answer.canonical})`,
    };
  } else {
    // Còn ký hiệu 'a': bọc hệ số k^degree; grader sẽ chuẩn hoá khi chấm.
    v.answer = { ...seed.answer, canonical: `${factor}*(${seed.answer.canonical})` };
  }
  v.variant = { kind: "rescale", parentSeedId: seed.id };
  return v;
}
