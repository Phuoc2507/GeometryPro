// So MỘT ca golden với kết quả engine (solvePlan/solveProblem). THUẦN, không I/O.
// Trả { id, verdict, detail }. verdict: 'pass' | 'regress-status' | 'regress-answer' | 'error'.
// So đáp bằng SỐ (answerCompare) — √2 khớp 1.4142…, KHÔNG so chuỗi thô.
import { answersAgree, toNumeric } from '../answerCompare.js';

// Đọc toạ độ dạng Scalar của engine ({approx, exact}) về số, làm gọn nhiễu float.
function coordText(sc) {
  const v = typeof sc === 'object' && sc !== null ? sc.approx : sc;
  if (typeof v !== 'number' || !Number.isFinite(v)) return '?';
  return String(Number(v.toFixed(6)));
}

/**
 * Chuỗi đại diện của MỘT đáp, để so được cả những đáp KHÔNG phải số.
 *
 * Không phải đáp nào cũng có `.text`: `relative_position` trả `{relation}` và
 * `intersection` trả `{result, point}`. Trước đây hai dạng này luôn cho text
 * undefined ⇒ mọi golden viết cho chúng đều rớt, tức là hai loại truy vấn ĐÃ SHIP
 * không thể được canh hồi quy.
 */
export function answerText(a) {
  if (!a || typeof a !== 'object') return '';
  if (typeof a.text === 'string' && a.text.trim()) return a.text.trim();
  if (typeof a.relation === 'string' && a.relation.trim()) return a.relation.trim();
  if (a.kind === 'intersection') {
    const parts = [];
    if (a.result) parts.push(String(a.result));
    const p = a.point?.p;
    if (p) parts.push(`(${coordText(p.x)},${coordText(p.y)},${coordText(p.z)})`);
    return parts.join(' ');
  }
  return '';
}

/** So hai chuỗi đáp bỏ qua hoa/thường và khoảng trắng thừa. */
function sameText(a, b) {
  const norm = (t) => String(t ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  return norm(a) !== '' && norm(a) === norm(b);
}

export function compareCase(golden, result) {
  const id = golden.id;
  if (result && result.__throw) {
    return { id, verdict: 'error', detail: 'engine văng lỗi: ' + result.__throw };
  }
  const expect = golden.expect || {};
  const wantOk = expect.ok !== false; // mặc định kỳ vọng ok:true
  const gotOk = !!(result && result.ok);
  const answers = (result && result.answers) || [];

  if (!wantOk) {
    // Ca kỳ vọng HỎNG (hiếm ở v1): nay đậu ⇒ đổi hành vi (đánh regress-answer để lộ ra); nay hỏng ⇒ pass.
    return gotOk
      ? { id, verdict: 'regress-answer', detail: 'kỳ vọng ok:false nhưng nay ok:true' }
      : { id, verdict: 'pass', detail: 'ok:false như kỳ vọng' };
  }
  if (!gotOk || answers.length === 0) {
    return { id, verdict: 'regress-status', detail: `kỳ vọng ok:true nhưng nay ok=${gotOk}, số đáp=${answers.length}` };
  }
  const want = expect.answers || [];
  if (want.length !== answers.length) {
    return { id, verdict: 'regress-answer', detail: `số/thứ tự đáp khác: kỳ vọng ${want.length}, nay ${answers.length}` };
  }
  for (let i = 0; i < want.length; i++) {
    const got = answerText(answers[i]);
    const wantText = want[i]?.text;
    // Ưu tiên so SỐ (√2 khớp 1.4142…). Kỳ vọng không đọc được thành số — vd
    // 'rời nhau', 'point (1,2,0)' — thì so chuỗi đã chuẩn hoá.
    const wantNum = toNumeric(wantText);
    const agree = wantNum === null ? sameText(got, wantText) : answersAgree(got, wantNum);
    if (agree !== true) {
      return { id, verdict: 'regress-answer', detail: `đáp #${i + 1} lệch: kỳ vọng "${wantText}" nay "${got}"` };
    }
  }
  return { id, verdict: 'pass', detail: `${want.length} đáp khớp` };
}
