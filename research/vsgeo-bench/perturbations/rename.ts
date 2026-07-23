// research/vsgeo-bench/perturbations/rename.ts
// Đổi tên đỉnh (S.ABCD -> ...). Đáp án KHÔNG đổi vì đỉnh là chữ HOA còn đáp án dùng chữ thường + căn.
import type { Seed, Variant } from "./types";
import { cloneSeed, variantId } from "./types";

// "Là nhãn đỉnh" = chữ HOA KHÔNG theo sau bởi một chữ thường (kể cả chữ thường có dấu).
// Nhờ vậy 'C' trong "Cho" (theo sau 'h') bị loại, còn 'C' trong "ABCD" được nhận.
const AFTER_LABEL_NEG = "(?![a-zà-ỹ])";

export function extractVertexLabels(text: string): string[] {
  const re = new RegExp(`[A-Z]${AFTER_LABEL_NEG}`, "g");
  const seen: string[] = [];
  for (const m of text.matchAll(re)) {
    if (!seen.includes(m[0])) seen.push(m[0]);
  }
  return seen;
}

// F26 Đáp án dạng TIA/ĐƯỜNG "Vx" = đỉnh HOA + chữ HƯỚNG thường (x/y/z/t): "Sx","Ax","At".
// extractVertexLabels bỏ 'S' vì theo sau là chữ thường 'x', nên NHÃN ĐỈNH trong tên tia LỌT
// lưới guard F20. Hàm này rút riêng chữ HOA đứng ngay trước một chữ hướng thường + ranh giới từ.
export function extractRayAnchors(text: string): string[] {
  const re = /\b([A-Z])[xyzt]\b/g;
  const seen: string[] = [];
  for (const m of text.matchAll(re)) if (!seen.includes(m[1])) seen.push(m[1]);
  return seen;
}

// Bể chữ đích. Lọc bỏ chữ đang dùng để không tạo "thay dây chuyền" (A->M, rồi M vô tình bị thay tiếp).
const TARGET_POOL = ["M", "N", "P", "Q", "R", "T", "U", "V", "X", "Y", "Z", "E", "F", "G", "H", "I", "J", "K", "L"];

// F3 `exclude` = TẤT CẢ nhãn không được chọn làm đích: gồm cả nhãn chỉ xuất hiện trong
// LỜI VĂN (trung điểm M, mặt phẳng (P), tâm I...) chứ không nằm trong figure.points.
// Nếu bỏ sót, rename có thể chọn 'M' làm đích cho 'A' trong khi 'M' đã là điểm khác => hai
// điểm khác nhau cùng tên 'M' (dữ liệu sai im lặng). Mặc định exclude=labels giữ tương thích.
export function defaultRenameMap(
  labels: string[],
  exclude: Iterable<string> = labels
): Map<string, string> {
  const used = new Set<string>([...labels, ...exclude]);
  const targets = TARGET_POOL.filter((c) => !used.has(c));
  const map = new Map<string, string>();
  labels.forEach((l, i) => {
    if (i >= targets.length) throw new Error("Hết chữ đích để đổi tên đỉnh");
    map.set(l, targets[i]);
  });
  return map;
}

export function renameInText(text: string, map: Map<string, string>): string {
  let out = text;
  for (const [from, to] of map) {
    out = out.replace(new RegExp(`${from}${AFTER_LABEL_NEG}`, "g"), to);
  }
  return out;
}

export function rename(seed: Seed, map?: Map<string, string>): Variant {
  // Ưu tiên lấy nhãn từ figure.points; nếu không có thì quét lời văn.
  const labels =
    seed.figure?.points && seed.figure.points.length > 0
      ? seed.figure.points.map((p) => p.id)
      : extractVertexLabels(seed.statement_vi);
  // F3: loại khỏi bể đích cả nhãn chỉ có trong lời văn (không nằm trong figure.points).
  // F20: và cả nhãn xuất hiện trong ĐÁP ÁN (vd đáp án "AB") — chữ đích không được đụng chúng.
  const exclude = new Set<string>([
    ...labels,
    ...extractVertexLabels(seed.statement_vi),
    ...extractVertexLabels(seed.answer.canonical),
    // F26 nhãn đỉnh neo trong tên tia/đường "Vx" của đáp án cũng không được làm đích.
    ...extractRayAnchors(seed.answer.canonical),
  ]);
  const renameMap = map ?? defaultRenameMap(labels, exclude);

  // RN-1 (Round-5) BẤT BIẾN-ĐỔI-TÊN cho đáp án: nếu áp CHÍNH renameMap (dùng renameInText — cùng
  // hàm sẽ viết lại statement) lên answer.canonical mà đáp án ĐỔI, tức đáp án tham chiếu một nhãn
  // đỉnh SẼ bị đổi tên; rename thiết kế GIỮ NGUYÊN đáp án ⇒ sau khi đổi, câu hỏi trỏ nhãn mới còn
  // đáp án trỏ nhãn cũ (đã biến mất) ⇒ mâu thuẫn sai-im-lặng (§4.3). Bắt ĐÚNG các nhãn sẽ di
  // chuyển — kể cả nhãn NHIỀU KÝ TỰ (M1, Ma, B') mà extractVertexLabels/extractRayAnchors (guard
  // F20/F26) BỎ SÓT — vì dùng chung bộ khoá renameMap, không cần bộ rút nhãn thứ hai giữ đồng bộ.
  if (renameInText(seed.answer.canonical, renameMap) !== seed.answer.canonical) {
    throw new Error(
      `rename: đáp án "${seed.answer.canonical}" tham chiếu nhãn đỉnh sẽ bị đổi tên nhưng đáp án không đổi theo — mâu thuẫn (bỏ qua §4.3) — seed ${seed.id}`
    );
  }

  // F20 Đáp án THAM CHIẾU NHÃN ĐỈNH (mcq/point/vector/line/plane có canonical là biểu thức
  // nhãn, vd "AB") nhưng rename KHÔNG đổi answer.canonical => sau khi đổi đỉnh, câu hỏi về "NP"
  // trong khi đáp án vẫn "AB" => mâu thuẫn sai-im-lặng (§4.3). Nếu đáp án chứa nhãn nằm trong
  // renameMap thì BỎ QUA (đáp án ký hiệu thường + căn thì extractVertexLabels=[] nên không chặn).
  // F26 gộp thêm nhãn đỉnh neo trong tên tia "Vx" (Sx,Ax) — extractVertexLabels bỏ sót vì 'S'
  // theo sau chữ thường 'x'. Nếu nhãn đó nằm trong renameMap thì đáp án sẽ trỏ đỉnh không còn.
  // GIỮ LẠI loop này (RN-1 ở trên KHÔNG bao phủ ca F26): renameInText("Sx") = "Sx" KHÔNG đổi vì
  // AFTER_LABEL_NEG chặn 'S' khi theo sau chữ thường 'x' ⇒ RN-1 không ném; extractRayAnchors bắt.
  // OS-4 (Round-7): nhánh extractVertexLabels(answer) là THỪA — mọi nhãn đỉnh trong đáp án nằm trong
  // renameMap đều làm renameInText(answer) ĐỔI ⇒ RN-1 (ở trên) đã ném trước. Dùng CHUNG một bộ
  // AFTER_LABEL_NEG nên hai điều kiện tương đương. CHỈ neo-tia 'Vx' (Sx/Ax) lọt RN-1 (không đổi văn
  // bản) ⇒ chỉ nhánh extractRayAnchors mới load-bearing tại đây. Bỏ nhánh vertex, giữ bảo toàn hành vi.
  const answerLabels = extractRayAnchors(seed.answer.canonical);
  for (const l of answerLabels) {
    if (renameMap.has(l)) {
      throw new Error(
        `rename: đáp án "${seed.answer.canonical}" chứa nhãn đỉnh '${l}' sẽ bị đổi tên nhưng đáp án không đổi theo — sẽ mâu thuẫn (bỏ qua §4.3) — seed ${seed.id}`
      );
    }
  }

  const v = cloneSeed(seed) as Variant;
  v.id = variantId(seed.id, "rename");
  v.statement_vi = renameInText(seed.statement_vi, renameMap);
  if (v.figure?.points) {
    v.figure.points = v.figure.points.map((p) => ({ ...p, id: renameMap.get(p.id) ?? p.id }));
  }
  // answer KHÔNG đổi.
  v.variant = { kind: "rename", parentSeedId: seed.id };
  return v;
}
