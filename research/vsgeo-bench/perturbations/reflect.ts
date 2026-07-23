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
// F16 Đại lượng CÓ DẤU / ĐỊNH HƯỚNG: tích hỗn hợp (scalar triple product), tích có hướng
// (cross product), định thức, thể tích ĐẠI SỐ — tất cả ĐỔI DẤU dưới phép phản chiếu (đảo
// hướng). Cổng bất biến theo topic/lời-văn KHÔNG bắt được (topic the_tich vẫn qua cổng),
// nên phải soi riêng: giữ đáp án "2" trong khi giá trị thật hoá "-2" là sai-im-lặng (§4.3).
const SIGNED_ORIENTED =
  /tích hỗn hợp|tich hon hop|tích có hướng|tich co huong|định thức|dinh thuc|thể tích đại số|the tich dai so/i;
// F25 Đại lượng PHỤ THUỘC ĐỊNH HƯỚNG / DẤU TOẠ ĐỘ diễn đạt bằng LỜI THƯỜNG (không phải tên
// công thức mà SIGNED_ORIENTED bắt): tính thuận/nghịch của tam diện (handedness), chiều kim
// đồng hồ (định hướng 2D), và các so sánh vị trí theo "chiều dương/âm" của một trục hay
// "phía trước/sau/trái/phải". Tất cả ĐỔI khi phản chiếu (phép đảo hướng) ⇒ đáp án boolean/giá
// trị KHÔNG bất biến ⇒ giữ nguyên đáp án là sai-im-lặng (§4.3). Thà bỏ còn hơn sai.
const ORIENTATION_SENSITIVE =
  /tam diện\s+(?:thuận|nghịch)|(?:thuận|nghịch)\s+chiều|chiều\s+kim\s+đồng\s+hồ|(?:phía|bên)\s+(?:trước|sau|trái|phải)|chiều\s+(?:dương|âm)|hướng\s+(?:dương|âm)|định hướng/iu;
// F10 Toạ độ ĐIỂM literal "L(x;y;z)" — bỏ khỏi lời văn TRƯỚC khi soi dấu '=' (điểm được
// phản chiếu đúng nên không phải ràng buộc cần chặn). Cùng dạng reflectCoordsInText nhận.
const COORD_LITERAL_G =
  /[A-Z]\(\s*-?\d+(?:\.\d+)?\s*[;,]\s*-?\d+(?:\.\d+)?\s*[;,]\s*-?\d+(?:\.\d+)?\s*\)/g;
// F10 Nhắc tới ĐỐI TƯỢNG hình học có phương trình/hệ số cố định: phản chiếu chỉ đổi điểm,
// KHÔNG đổi mặt phẳng/mặt cầu/đường thẳng/vector => đáp án (khoảng cách, góc tới mặt...) sai.
const PLANE_LINE_SPHERE = /mặt phẳng|mặt cầu|đường thẳng|phương trình|\bmp\b|\([PQRSαβ]\)/iu;
// Nhãn có phẩy (A', B') mà reflectCoordsInText chưa biết cách xử lý.
const HAS_PRIMED_LABEL = /[A-Z]['’′]/;

// RF-1 (Round-5) Đáp án dạng TOẠ ĐỘ (point/vector/plane_eq/line_eq) BIẾN ĐỔI dưới phép phản
// chiếu (x→-x đảo dấu thành phần x của điểm/vector, đổi hệ số phương trình mặt/đường) trong khi
// reflect GIỮ NGUYÊN answer.canonical ⇒ figure lật toạ độ còn đáp án cũ ⇒ sai-im-lặng (§4.3).
// Bất biến chỉ ở ca đo-không (mọi thành phần x = 0) — không đáng emit. Đặt Ở ĐẦU để chặn sớm.
const COORD_VALUED_ANSWER = new Set(["point", "vector", "plane_eq", "line_eq"]);
// RF-2 (Round-5) Đại lượng CÓ DẤU/ĐỊNH HƯỚNG diễn đạt bằng LỜI mà SIGNED_ORIENTED (tên công
// thức) và ORIENTATION_SENSITIVE (thuận/nghịch, chiều dương/âm) còn SÓT: "…đại số", "có dấu",
// "có hướng", "góc lượng giác", "bàn tay phải", "góc phần tám" (octant), "đầu/nửa dương/âm".
// Phản chiếu ĐẢO HƯỚNG ⇒ các đại lượng này đổi dấu/đổi octant ⇒ đáp án giữ nguyên là sai (§4.3).
const ORIENTED_OR_SIGNED =
  /đại số|có dấu|có hướng|lượng giác|bàn tay phải|phần tám|(?:đầu|nửa)\s*(?:dương|âm)|chiều\s*(?:dương|âm)/iu;

// Chỉ chấp nhận reflect khi CHẮC CHẮN đáp án bất biến; nghi ngờ thì ném để bị bỏ (§4.3).
function assertReflectInvariant(seed: Seed): void {
  if (COORD_VALUED_ANSWER.has(seed.answer.type)) {
    throw new Error(
      `reflect: đáp án dạng toạ độ (${seed.answer.type}) đổi khi phản chiếu, không bất biến (bỏ qua §4.3) — seed ${seed.id}`
    );
  }
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
  // F16 Đại lượng có dấu/định hướng (tích hỗn hợp/có hướng/định thức) ĐỔI DẤU khi phản chiếu.
  if (SIGNED_ORIENTED.test(s)) {
    throw new Error(
      `reflect: đại lượng CÓ DẤU/ĐỊNH HƯỚNG (tích hỗn hợp/có hướng/định thức) đổi dấu khi phản chiếu — không bất biến (bỏ qua §4.3) — seed ${seed.id}`
    );
  }
  // F25 Đại lượng phụ thuộc ĐỊNH HƯỚNG/DẤU TOẠ ĐỘ diễn đạt bằng LỜI (thuận/nghịch, chiều kim
  // đồng hồ, phía trước/sau/trái/phải, chiều dương/âm) — SIGNED_ORIENTED chỉ bắt tên công thức.
  if (ORIENTATION_SENSITIVE.test(s)) {
    throw new Error(
      `reflect: đại lượng phụ thuộc ĐỊNH HƯỚNG/DẤU TOẠ ĐỘ diễn đạt bằng lời (thuận/nghịch, chiều kim đồng hồ, phía trước/sau/trái/phải, chiều dương/âm) — đổi khi phản chiếu, không bất biến (bỏ qua §4.3) — seed ${seed.id}`
    );
  }
  // RF-2 Bộ dò RỘNG cho đại lượng có dấu/định hướng còn sót ở hai bộ trên (đại số/có dấu/có
  // hướng/lượng giác/bàn tay phải/góc phần tám/đầu-nửa dương-âm). Đặt SAU hai bộ trên để chúng
  // giữ ưu tiên thông điệp; đặt TRƯỚC cổng '='/mặt-phẳng vì các đề này thường không có hai dấu đó.
  if (ORIENTED_OR_SIGNED.test(s)) {
    throw new Error(
      `reflect: đại lượng CÓ DẤU/ĐỊNH HƯỚNG (đại số/có dấu/có hướng/lượng giác/bàn tay phải/góc phần tám/đầu dương) đổi dấu khi phản chiếu — không bất biến (bỏ qua §4.3) — seed ${seed.id}`
    );
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
