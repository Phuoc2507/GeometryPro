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
  // Sai số TƯƠNG ĐỐI theo độ lớn đáp án chuẩn. Đáp án lớn (vd 6√2≈8.4853) khi model làm
  // tròn 2 chữ số thập phân (8.49) lệch 0.0047 > 1e-3 tuyệt đối → bị chấm SAI oan. Nhân
  // 1e-3 với max(1,|t|) cho công bằng ở mọi cỡ số, mà vẫn giữ chặt 1e-3 cho đáp án nhỏ
  // (|t|≤1) nên "0.82 vs 0.8165" vẫn khác nhau. (Lỗi này do bộ tự-phản-biện phát hiện.)
  if (Math.abs(m - t) < SCALAR_EPS * Math.max(1, Math.abs(t))) return 'correct';
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
  // Chuẩn hóa: thường hóa, gộp khoảng trắng, bỏ dấu câu cuối ("Đúng." → "đúng").
  let s = raw.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
  // Tiếng Việt PHỦ ĐỊNH BẰNG TIỀN TỐ: "không/chưa/chẳng đúng" nghĩa là SAI. Vì vậy TUYỆT
  // ĐỐI KHÔNG được bắt chuỗi con "đúng" rồi phán true — sẽ phán NGƯỢC (bug thật, bộ
  // tự-phản-biện phát hiện: "Không đúng" từng bị chấm là "đúng"). Cách đúng: bóc tiền tố
  // phủ định ra rồi ĐẢO cực tính của phần lõi.
  let neg = false;
  const negMatch = s.match(/^(?:không|khong|chưa|chua|chẳng|chang|ko)\s+(.*)$/);
  if (negMatch) { neg = true; s = negMatch[1]; }
  const TRUE = ['đúng', 'dung', 'true', 'yes', 'có', 'co', 'phải', 'phai', '1'];
  // Các từ phủ định đứng MỘT MÌNH ("không", "chưa"…) cũng là một câu trả lời SAI.
  const FALSE = ['sai', 'false', 'no', '0', 'không', 'khong', 'ko', 'chưa', 'chua', 'chẳng', 'chang'];
  let base: boolean | null = null;
  if (TRUE.includes(s)) base = true;
  else if (FALSE.includes(s)) base = false;
  if (base === null) {
    if (neg && s === '') return false;   // "không" + rỗng = phủ định trần = SAI
    // Không phải một token/cụm rõ ràng → unsure (nguyên tắc liêm chính §4.3: không đoán bừa).
    return null;
  }
  return neg ? !base : base;
}

/** Trắc nghiệm: rút chữ cái được CHỐT (chọn/đáp án …) ở cả hai bên. Mơ hồ/không có → unsure. */
export function compareMcq(model: string, truth: string): Verdict {
  const lt = toMcq(truth);
  const lm = toMcq(model);
  if (lt === null) return 'unsure';
  if (lm === null) return 'unsure';
  return lm === lt ? 'correct' : 'incorrect';
}

function toMcq(raw: string): string | null {
  // (1) Ưu tiên chữ cái A–D đứng NGAY SAU một "cụm chốt đáp án" (chọn / đáp án / answer /
  //     kết luận / → ), và lấy cụm CUỐI CÙNG: model hay nhắc phương án nhiễu trước ("A sai")
  //     rồi mới chốt ("nên chọn C") ở cuối. Nếu chỉ lấy chữ A–D ĐẦU TIÊN (bản cũ) thì
  //     "A sai nên chọn C" bị đọc nhầm là 'A' → chấm ĐÚNG oan (bug thật, bộ tự-phản-biện
  //     phát hiện). Lookahead (?!\p{L}) để chữ cái phải đứng tách biệt (kể cả cạnh chữ có dấu).
  const cue = /(?:chọn|chon|đáp\s*án|dap\s*an|answer|kết\s*luận|ket\s*luan|=>|⇒|→)\s*(?:là|la|:|\.)?\s*([abcd])(?!\p{L})/giu;
  let m: RegExpExecArray | null;
  let lastCue: string | null = null;
  while ((m = cue.exec(raw)) !== null) lastCue = m[1].toUpperCase();
  if (lastCue) return lastCue;
  // (2) Không có cụm chốt: chỉ nhận khi có ĐÚNG MỘT chữ A–D đứng độc lập. Nhiều chữ khác
  //     nhau (vd liệt kê "A, B, C") là MƠ HỒ → null (unsure), không đoán bừa. "Chọn đáp án B"
  //     vẫn ra 'B' nhờ (1); "không có chữ cái" ra null vì C trong "CÓ" bị (?<!\p{L}) loại.
  const singles = raw.toUpperCase().match(/(?<!\p{L})[ABCD](?!\p{L})/gu) ?? [];
  const distinct = Array.from(new Set(singles));
  return distinct.length === 1 ? distinct[0] : null;
}
