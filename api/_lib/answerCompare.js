// api/_lib/answerCompare.js
// Hàm THUẦN đối chiếu hai đáp số về mặt SỐ — nền cho cross-check engine ↔ luồng cũ.
// CHỈ dùng regex + Math.sqrt; KHÔNG phụ thuộc kernel.
// toNumeric: đọc số từ text đáp engine (a√b/c, p±q√r, phân số p/q, thập phân) → number|null.
// answersAgree: null nếu không parse được; else |a−b| ≤ relTol·max(1,|a|).

// Parse MỘT hạng tử: hằng hữu tỉ (p, p.q, p/q) hoặc hạng căn (a√b/c). Trả number|null.
function parseTerm(raw) {
  const t = raw.trim();
  if (!t) return null;
  // Hạng căn: [coef]√radicand[/den]
  const surd = t.match(/^([+-]?\d*(?:\.\d+)?)√(\d+)(?:\/(\d+))?$/);
  if (surd) {
    const coefStr = surd[1];
    let coef;
    if (coefStr === '' || coefStr === '+') coef = 1;
    else if (coefStr === '-') coef = -1;
    else coef = parseFloat(coefStr);
    const rad = parseInt(surd[2], 10);
    const den = surd[3] ? parseInt(surd[3], 10) : 1;
    if (!Number.isFinite(coef) || !Number.isFinite(rad) || den === 0) return null;
    return (coef * Math.sqrt(rad)) / den;
  }
  // Hằng hữu tỉ: phân số p/q
  const frac = t.match(/^([+-]?\d+)\/(\d+)$/);
  if (frac) {
    const num = parseInt(frac[1], 10);
    const den = parseInt(frac[2], 10);
    if (den === 0) return null;
    return num / den;
  }
  // Số nguyên hoặc thập phân
  const num = t.match(/^[+-]?\d+(?:\.\d+)?$/);
  if (num) return parseFloat(t);
  return null;
}

export function toNumeric(text) {
  if (text == null) return null;
  let s = String(text).trim();
  if (!s) return null;
  // Chuẩn hoá dấu trừ unicode → '-'
  s = s.replace(/[−–—]/g, '-');
  // Bỏ khoảng trắng thừa quanh dấu để tách hạng tử theo +/-
  s = s.replace(/\s+/g, '');
  if (!s) return null;
  // Tách thành các hạng tử có dấu (giữ dấu đứng đầu mỗi hạng tử).
  // Dấu +/- đứng đầu chuỗi hoặc ngay sau một ký tự không phải toán tử là ranh giới hạng tử.
  const terms = [];
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if ((ch === '+' || ch === '-') && i > 0) {
      // Không tách nếu ký tự trước là toán tử (dấu của số) — nhưng chuỗi engine không có '*' nên an toàn.
      terms.push(cur);
      cur = ch;
    } else {
      cur += ch;
    }
  }
  if (cur) terms.push(cur);
  let sum = 0;
  for (const term of terms) {
    const v = parseTerm(term);
    if (v === null) return null;
    sum += v;
  }
  return sum;
}

export function answersAgree(engineText, otherNum, relTol = 1e-3) {
  const a = toNumeric(engineText);
  if (a === null) return null;
  if (typeof otherNum !== 'number' || !Number.isFinite(otherNum)) return null;
  return Math.abs(a - otherNum) <= relTol * Math.max(1, Math.abs(a));
}
