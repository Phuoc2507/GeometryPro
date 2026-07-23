// research/vsgeo-bench/perturbations/reflect.ts
// (Tuỳ chọn) Phản chiếu/xoay hệ toạ độ. Chỉ dùng khi figure có toạ độ.
// Đáp án BẤT BIẾN dời hình -> chỉ áp cho loại đáp án bất biến (khoảng cách/thể tích/góc/tỉ số/đúng-sai).
import type { Seed, Variant } from "./types";
import { cloneSeed, variantId } from "./types";

// F2 CỔNG BẤT BIẾN THEO NỘI DUNG (không theo answer.type).
// answer.type chỉ nói dạng SỐ của đáp án (rational/surd...), KHÔNG nói đại lượng có
// bất biến khi phản chiếu hay không: "hoành độ" (type rational) ĐỔI dấu, "khoảng cách"
// (cũng có thể type rational) thì GIỮ NGUYÊN. Ta duyệt theo chủ đề + đặc trưng lời văn.
//
// G (LƯU Ý CHO NGƯỜI SOẠN SEED): reflect CHỈ chạy khi tags.topic có ít nhất một chủ đề
// trong INVARIANT_TOPICS dưới đây. Vì thế mọi seed CÓ toạ độ mà muốn được phản chiếu PHẢI
// được gắn nhãn một chủ đề bất biến dời hình (khoang_cach/the_tich/dien_tich/goc/ti_so);
// seed toạ độ không gắn nhãn sẽ bị reflect BỎ QUA (an toàn: thà bỏ còn hơn sinh sai).
const INVARIANT_TOPICS = new Set(["khoang_cach", "the_tich", "dien_tich", "goc", "ti_so"]);
// Đề HỎI trực tiếp một giá trị toạ độ (đổi khi phản chiếu).
const ASKS_COORD = /hoành độ|tung độ|cao độ|to[aạ] độ/i;
// F10 Toạ độ ĐIỂM literal "L(x;y;z)" — bỏ khỏi lời văn TRƯỚC khi soi dấu '=' (điểm được
// phản chiếu đúng nên không phải ràng buộc cần chặn). Cùng dạng reflectCoordsInText nhận.
const COORD_LITERAL_G =
  /[A-Z]\(\s*-?\d+(?:\.\d+)?\s*[;,]\s*-?\d+(?:\.\d+)?\s*[;,]\s*-?\d+(?:\.\d+)?\s*\)/g;
// F10 Nhắc tới ĐỐI TƯỢNG hình học có phương trình/hệ số cố định: phản chiếu chỉ đổi điểm,
// KHÔNG đổi mặt phẳng/mặt cầu/đường thẳng/vector => đáp án (khoảng cách, góc tới mặt...) sai.
const PLANE_LINE_SPHERE = /mặt phẳng|mặt cầu|đường thẳng|phương trình|\bmp\b|\([PQRSαβ]\)/iu;
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
  // F10 Bỏ toạ độ ĐIỂM literal (được phản chiếu đúng), rồi nếu CÒN dấu '=' thì đó là một
  // phương trình/ràng buộc (mặt phẳng dạng đoạn chắn, "z=2x+1", "x-5=0"...) mà phép phản
  // chiếu điểm KHÔNG biến đổi => đáp án hoá sai. Cách này bắt mọi dạng, không chỉ chuẩn tắc.
  const stripped = s.replace(COORD_LITERAL_G, " ");
  if (stripped.includes("=")) {
    throw new Error(`reflect: đề còn dấu '=' (phương trình/ràng buộc) sau khi bỏ toạ độ điểm — phản chiếu điểm không biến đổi ràng buộc, đáp án sẽ sai (bỏ qua) — seed ${seed.id}`);
  }
  if (PLANE_LINE_SPHERE.test(s)) {
    throw new Error(`reflect: đề nhắc mặt phẳng/mặt cầu/đường thẳng/phương trình — phản chiếu chỉ đổi điểm, không đổi các đối tượng này, không đảm bảo bất biến (bỏ qua) — seed ${seed.id}`);
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
