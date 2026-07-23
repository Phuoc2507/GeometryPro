// research/vsgeo-bench/perturbations/reflect.ts
// (Tuỳ chọn) Phản chiếu/xoay hệ toạ độ. Chỉ dùng khi figure có toạ độ.
// Đáp án BẤT BIẾN dời hình -> chỉ áp cho loại đáp án bất biến (khoảng cách/thể tích/góc/tỉ số/đúng-sai).
import type { Seed, Variant } from "./types";
import { cloneSeed, variantId } from "./types";

// F2 CỔNG BẤT BIẾN THEO NỘI DUNG (không theo answer.type).
// answer.type chỉ nói dạng SỐ của đáp án (rational/surd...), KHÔNG nói đại lượng có
// bất biến khi phản chiếu hay không: "hoành độ" (type rational) ĐỔI dấu, "khoảng cách"
// (cũng có thể type rational) thì GIỮ NGUYÊN. Ta duyệt theo chủ đề + đặc trưng lời văn.
const INVARIANT_TOPICS = new Set(["khoang_cach", "the_tich", "dien_tich", "goc", "ti_so"]);
// Đề HỎI trực tiếp một giá trị toạ độ (đổi khi phản chiếu).
const ASKS_COORD = /hoành độ|tung độ|cao độ|to[aạ] độ/i;
// Có phương trình mặt/đường (hệ số cố định, phản chiếu điểm nhưng không phản chiếu pt => sai).
const HAS_EQUATION = /[xyz]\s*[+\-]\s*\d*\s*[xyz]/i;
// Vector/toạ độ literal dạng "= (1;2;...)".
const HAS_VECTOR_LITERAL = /=\s*\(\s*-?\d/;
// Nhãn có phẩy (A', B') mà reflectCoordsInText chưa biết cách xử lý.
const HAS_PRIMED_LABEL = /[A-Z]['’′]/;

// Chỉ chấp nhận reflect khi CHẮC CHẮN đáp án bất biến; nghi ngờ thì ném để bị bỏ (§4.3).
function assertReflectInvariant(seed: Seed): void {
  const topics = seed.tags?.topic ?? [];
  if (!topics.some((t) => INVARIANT_TOPICS.has(t))) {
    throw new Error(
      `reflect: chủ đề ${JSON.stringify(topics)} không thuộc nhóm bất biến dời hình (bỏ qua) — seed ${seed.id}`
    );
  }
  const s = seed.statement_vi;
  if (ASKS_COORD.test(s)) {
    throw new Error(`reflect: đề hỏi toạ độ (hoành/tung/cao độ) — đổi khi phản chiếu (bỏ qua) — seed ${seed.id}`);
  }
  if (HAS_EQUATION.test(s)) {
    throw new Error(`reflect: đề chứa phương trình mặt phẳng/đường thẳng — đáp án đổi theo phép biến (bỏ qua) — seed ${seed.id}`);
  }
  if (HAS_VECTOR_LITERAL.test(s)) {
    throw new Error(`reflect: đề chứa vector/toạ độ literal — không đảm bảo bất biến (bỏ qua) — seed ${seed.id}`);
  }
  if (HAS_PRIMED_LABEL.test(s)) {
    throw new Error(`reflect: đề chứa nhãn có phẩy (A') chưa xử lý được — bỏ qua — seed ${seed.id}`);
  }
}

export type Point3 = { x: number; y: number; z: number };
export type Isometry = (p: Point3) => Point3;

// Phép đẳng cự mặc định: phản chiếu qua mặt phẳng x = 0 (x -> -x).
export const reflectX: Isometry = (p) => ({ x: -p.x, y: p.y, z: p.z });

// Đổi toạ độ trong lời văn cho mẫu "L(x;y;z)" (ngăn cách bằng ';' hoặc ',').
export function reflectCoordsInText(text: string, iso: Isometry): string {
  return text.replace(
    /([A-Z])\(\s*(-?\d+(?:\.\d+)?)\s*[;,]\s*(-?\d+(?:\.\d+)?)\s*[;,]\s*(-?\d+(?:\.\d+)?)\s*\)/g,
    (_m, lab: string, x: string, y: string, z: string) => {
      const q = iso({ x: Number(x), y: Number(y), z: Number(z) });
      return `${lab}(${q.x};${q.y};${q.z})`;
    }
  );
}

export function reflect(seed: Seed, iso: Isometry = reflectX): Variant {
  if (!seed.figure?.coords_given || !seed.figure.points || seed.figure.points.length === 0) {
    throw new Error(`reflect cần figure có toạ độ (coords_given=true và có points) ở seed ${seed.id}`);
  }
  assertReflectInvariant(seed); // F2: cổng bất biến theo chủ đề + lời văn (thay cho cổng type cũ)
  const v = cloneSeed(seed) as Variant;
  v.id = variantId(seed.id, "reflect");
  v.figure!.points = seed.figure.points.map((p) => ({ id: p.id, ...iso(p) }));
  v.statement_vi = reflectCoordsInText(seed.statement_vi, iso);
  // answer KHÔNG đổi (bất biến dời hình).
  v.variant = { kind: "reflect", parentSeedId: seed.id };
  return v;
}
