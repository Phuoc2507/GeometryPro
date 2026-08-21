// So MỘT ca golden với kết quả engine (solvePlan/solveProblem). THUẦN, không I/O.
// Trả { id, verdict, detail }. verdict: 'pass' | 'regress-status' | 'regress-answer' | 'error'.
// So đáp bằng SỐ (answerCompare) — √2 khớp 1.4142…, KHÔNG so chuỗi thô.
import { answersAgree, toNumeric } from '../answerCompare.js';

// Chuẩn hoá chuỗi để so đáp phi-số (nhãn/phương trình): gộp khoảng trắng, bỏ dấu, thường hoá,
// chuẩn hoá dấu trừ unicode. KHÔNG dùng cho đáp số (đã có answersAgree lo).
function normText(s) {
  return String(s == null ? '' : s)
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, '')
    .toLowerCase();
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
    // Nhãn CHỮ của đáp: query relative_position trả nhãn ở trường `.relation` (KHÔNG có `.text`).
    // Đọc `.text ?? .relation` để cả đáp-số (text) lẫn đáp-nhãn (relation) đều so được.
    const gotText = answers[i]?.text ?? answers[i]?.relation;
    const wantText = want[i]?.text ?? want[i]?.relation;
    const wantNum = toNumeric(wantText);
    let agree = answersAgree(gotText, wantNum);
    // Đáp KHÔNG phải số (nhãn vị trí tương đối "chéo nhau", phương trình "2x−y+z−3=0"…):
    // answersAgree trả null ⇒ fallback so CHUỖI CHUẨN HOÁ (khi cả hai bên đều không parse ra số).
    if (agree !== true && wantNum === null && toNumeric(gotText) === null) {
      agree = normText(gotText) === normText(wantText);
    }
    if (agree !== true) {
      return { id, verdict: 'regress-answer', detail: `đáp #${i + 1} lệch: kỳ vọng "${wantText}" nay "${gotText}"` };
    }
  }
  return { id, verdict: 'pass', detail: `${want.length} đáp khớp` };
}
