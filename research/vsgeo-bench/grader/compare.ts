// grader/compare.ts
// Lớp 3 của oracle (design.md §4.2 & §4.3): quyết định "hai đáp án có tương đương không".
// ĐÂY LÀ LOGIC 2 EM TỰ VIẾT & PHẢI BẢO VỆ (design.md §4.4). Engine chỉ giúp canonical hóa số.
import { toExactForm } from '../../../api/_lib/kernel/exactForm';
import type { Verdict } from './types';
import {
  parseScalar, parsePoint, parsePlane, parseRatioExact,
  SCALAR_EPS, POINT_EPS,
} from './normalize';

/** Vô hướng: cùng chuỗi chuẩn engine HOẶC cùng số trong sai số. Đọc không ra → unsure. */
export function compareScalar(model: string, truth: string): Verdict {
  const t = parseScalar(truth);
  if (t === null) return 'unsure';        // đáp án chuẩn tự nó không đọc được → cần soát
  const m = parseScalar(model);
  if (m === null) return 'unsure';        // model viết khó đọc → không đoán bừa
  if (toExactForm(m).text === toExactForm(t).text) return 'correct';
  if (Math.abs(m - t) < SCALAR_EPS) return 'correct';
  return 'incorrect';
}

/** Tỉ số: ưu tiên rút gọn nguyên chính xác; không được thì so như vô hướng. */
export function compareRatio(model: string, truth: string): Verdict {
  const em = parseRatioExact(model);
  const et = parseRatioExact(truth);
  if (em !== null && et !== null) return em === et ? 'correct' : 'incorrect';
  return compareScalar(model, truth);
}

/** Điểm/vector: cùng số chiều, từng tọa độ khớp trong POINT_EPS. */
export function comparePoint(model: string, truth: string): Verdict {
  const t = parsePoint(truth);
  if (t === null) return 'unsure';
  const m = parsePoint(model);
  if (m === null) return 'unsure';
  if (m.length !== t.length) return 'incorrect';
  for (let i = 0; i < t.length; i++) {
    if (Math.abs(m[i] - t[i]) > POINT_EPS) return 'incorrect';
  }
  return 'correct';
}

/**
 * Mặt phẳng: hai bộ hệ số (a,b,c,d) biểu diễn CÙNG một mặt phẳng
 * khi và chỉ khi chúng TỈ LỆ với nhau bởi một số khác 0 (design.md §4.2 lớp 3).
 * Cách kiểm: tìm chỉ số đầu tiên khác 0 của đáp án chuẩn, lấy tỉ số, rồi kiểm mọi hệ số.
 */
export function comparePlane(model: string, truth: string): Verdict {
  const q = parsePlane(truth);
  if (q === null) return 'unsure';
  const p = parsePlane(model);
  if (p === null) return 'unsure';
  const A = [p.a, p.b, p.c, p.d];  // model
  const B = [q.a, q.b, q.c, q.d];  // chuẩn
  const k = B.findIndex((x) => Math.abs(x) > 1e-9);
  if (k === -1) return 'unsure';         // đáp án chuẩn toàn 0 → bất thường
  if (Math.abs(A[k]) < 1e-9) return 'incorrect';
  const ratio = A[k] / B[k];
  if (Math.abs(ratio) < 1e-9) return 'incorrect';
  for (let i = 0; i < 4; i++) {
    if (Math.abs(A[i] - ratio * B[i]) > 1e-6 * (1 + Math.abs(A[i]))) return 'incorrect';
  }
  return 'correct';
}

/** Đúng/sai: nhận nhiều cách viết tiếng Việt & tiếng Anh. Không nhận ra → unsure. */
export function compareBoolean(model: string, truth: string): Verdict {
  const bm = toBool(model);
  const bt = toBool(truth);
  if (bt === null) return 'unsure';
  if (bm === null) return 'unsure';
  return bm === bt ? 'correct' : 'incorrect';
}

function toBool(raw: string): boolean | null {
  const s = raw.trim().toLowerCase();
  const TRUE = ['đúng', 'dung', 'true', 'yes', 'có', 'co', 'phải', 'phai', '1'];
  const FALSE = ['sai', 'false', 'no', 'không', 'khong', 'ko', '0'];
  if (TRUE.includes(s)) return true;
  if (FALSE.includes(s)) return false;
  // Fallback: chứa từ khóa (vd "Khẳng định là đúng")
  if (/(^|\W)(đúng|true)(\W|$)/i.test(s)) return true;
  if (/(^|\W)(sai|false)(\W|$)/i.test(s)) return false;
  return null;
}

/** Trắc nghiệm: lấy chữ cái A–D ĐỨNG ĐỘC LẬP đầu tiên ở cả hai bên. Không có → unsure. */
export function compareMcq(model: string, truth: string): Verdict {
  const lt = toMcq(truth);
  const lm = toMcq(model);
  if (lt === null) return 'unsure';
  if (lm === null) return 'unsure';
  return lm === lt ? 'correct' : 'incorrect';
}

function toMcq(raw: string): string | null {
  // Chỉ nhận A/B/C/D khi nó là MỘT TỪ RIÊNG, không nằm trong từ khác. Nếu chỉ dùng
  // /[ABCD]/ thì "Chọn đáp án B" sẽ khớp nhầm chữ C trong "CHỌN", và "không có chữ cái"
  // khớp nhầm chữ C trong "CÓ" → phán bừa. Ranh giới \b của JS chỉ tính [A-Za-z0-9_] nên
  // dấu tiếng Việt (Ó, Đ, Á…) vẫn bị coi là ranh giới → không đủ. Ta dùng lookaround theo
  // \p{L} (mọi CHỮ Unicode, kể cả chữ có dấu) để chắc chắn chữ cái đứng tách biệt.
  const m = raw.toUpperCase().match(/(?<!\p{L})[ABCD](?!\p{L})/u);
  return m ? m[0] : null;
}
