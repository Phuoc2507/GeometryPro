// grader/normalize.ts
// Lớp 2 của oracle (design.md §4.2): chuẩn hóa chuỗi đáp án về dạng máy so được.
//
// NGUỒN CÔNG CỤ (design.md §4.4): toExactForm, makeExact, displayExact là ENGINE KÝ HIỆU
// có sẵn của repo (api/_lib/kernel). Ta DÙNG LẠI, không viết lại số học chính xác.
// Phần 2 em tự viết & phải bảo vệ: bộ đọc biểu thức (toEvalString + evalExpr) và các
// bộ đọc điểm/mặt phẳng bên dưới.
import { toExactForm } from '../../../api/_lib/kernel/exactForm';
import { makeExact, displayExact } from '../../../api/_lib/kernel/scalar';

// Sai số cho so sánh SỐ khi không rút gọn được về chuỗi chuẩn (dự phòng số học §4.2).
// 1e-3 đủ rộng để chấp nhận đáp án model làm tròn 3–4 chữ số thập phân,
// nhưng đủ chặt để loại đáp án sai thật (vd 0.82 vs 0.8165).
export const SCALAR_EPS = 1e-3;
// Sai số so từng tọa độ điểm/vector (tọa độ model thường làm tròn).
export const POINT_EPS = 1e-3;

// ---------------------------------------------------------------------------
// (A) BỘ ĐỌC BIỂU THỨC VÔ HƯỚNG — phần 2 em tự viết.
// ---------------------------------------------------------------------------

// Giá trị dò cho BIẾN CẠNH. Đề hình không gian Việt gần như luôn dùng chữ 'a' cho cạnh
// (vd "cạnh a", đáp án "a√6/3"). Ta chỉ thay 'a' → 1 và GIỮ NGUYÊN mọi chữ khác. Nhờ vậy:
//   • "a√6/3" đọc được (đáp án theo cạnh),
//   • nhưng "abc", "xyz" (rác) vẫn còn chữ lạ → evalExpr báo lỗi → null (không nhận nhầm).
const DEFAULT_PROBE: Record<string, number> = { a: 1 };

/**
 * Biến chuỗi "người viết" thành chuỗi chỉ gồm số + toán tử + '#' (ký hiệu căn nội bộ),
 * sẵn sàng cho evalExpr. Các bước:
 *  1) bỏ khoảng trắng, thống nhất dấu nhân/chia/hai-chấm.
 *  2) đổi "sqrt", "căn/can", "√" về một ký hiệu tạm '√'.
 *  3) đổi "√..." thành "#(...)" (# = hàm căn của evalExpr).
 *  4) thay biến chữ còn lại bằng giá trị dò (vd a→(1)).
 *  5) chèn dấu '*' cho phép nhân ngầm (vd "2#(3)" → "2*#(3)").
 */
export function toEvalString(raw: string, probe: Record<string, number> = DEFAULT_PROBE): string {
  let t = raw.trim();
  t = t.replace(/\\left|\\right|\\,|\\!|\\;|\\ /g, ''); // dọn lệnh khoảng cách LaTeX
  t = t.replace(/\s+/g, '');            // bỏ mọi khoảng trắng
  t = t.replace(/[×·⋅]/g, '*');         // dấu nhân lạ → *
  t = t.replace(/[÷:]/g, '/');          // dấu chia lạ & ':' (tỉ số) → /
  t = t.replace(/\\cdot/g, '*');        // \cdot → *
  // Khử LaTeX TỪ TRONG RA NGOÀI: lặp tới khi ổn định. Nhờ đổi \sqrt{X} → √(X) (ngoặc tròn,
  // KHÔNG phải {}), lần lặp sau \dfrac{√(6)}{3} mới khớp được [^{}]* (nhóm không còn '{}').
  // Đây là mấu chốt để xử lý ĐÚNG \dfrac{\sqrt{6}}{3} — dạng model AI hay xuất ra.
  let prev: string;
  do {
    prev = t;
    t = t.replace(/\\sqrt\{([^{}]*)\}/g, '√($1)');            // \sqrt{6} → √(6)
    t = t.replace(/\\sqrt(\d+(?:\.\d+)?)/g, '√($1)');         // \sqrt6  → √(6)
    t = t.replace(/\\d?frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))'); // \dfrac & \frac
  } while (t !== prev);
  t = t.replace(/[\\{}]/g, '');         // dọn ký tự LaTeX còn sót

  t = t.replace(/sqrt/gi, '√');         // "sqrt" dạng chữ → √
  t = t.replace(/căn|can/gi, '√');      // "căn" tiếng Việt → √

  // "√(...)" đã có ngoặc; "√<số>" hoặc "√<chữ>" thêm ngoặc. Dùng '#' làm token hàm căn.
  t = t.replace(/√\(/g, '#(');
  t = t.replace(/√(\d+(?:\.\d+)?)/g, '#($1)');
  t = t.replace(/√([a-zA-Z])/g, '#($1)');

  // Thay chữ CÓ trong probe (mặc định chỉ 'a') bằng giá trị dò; GIỮ NGUYÊN chữ lạ để
  // chuỗi rác còn ký tự không hợp lệ → evalExpr trả null. '#' không phải chữ nên an toàn.
  t = t.replace(/[a-zA-Z]/g, (ch) => {
    const key = ch.toLowerCase();
    return key in probe ? `(${probe[key]})` : ch;
  });

  // Phép nhân ngầm: số/')' đứng trước '(' hoặc '#'  →  chèn '*'
  t = t.replace(/([0-9)])(?=[(#])/g, '$1*');
  // ')' đứng trước số → chèn '*'  (vd "(1)2" hiếm gặp nhưng chặn cho chắc)
  t = t.replace(/(\))(?=[0-9])/g, '$1*');
  return t;
}

/**
 * Máy tính biểu thức đệ quy (recursive-descent). Ngữ pháp:
 *   expr := term (('+'|'-') term)*
 *   term := factor (('*'|'/') factor)*
 *   factor := ('-'|'+')? primary ('^' factor)?      (^ kết hợp phải)
 *   primary := number | '#' '(' expr ')' | '(' expr ')'
 * Trả về số, hoặc null nếu chuỗi không hợp lệ / kết quả vô cực-NaN.
 */
export function evalExpr(s: string): number | null {
  let i = 0;

  function parseExpr(): number {
    let v = parseTerm();
    while (i < s.length && (s[i] === '+' || s[i] === '-')) {
      const op = s[i++];
      const r = parseTerm();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  function parseTerm(): number {
    let v = parseFactor();
    while (i < s.length && (s[i] === '*' || s[i] === '/')) {
      const op = s[i++];
      const r = parseFactor();
      v = op === '*' ? v * r : v / r;
    }
    return v;
  }
  function parseFactor(): number {
    if (s[i] === '-') { i++; return -parseFactor(); }
    if (s[i] === '+') { i++; return parseFactor(); }
    let v = parsePrimary();
    if (i < s.length && s[i] === '^') {
      i++;
      const e = parseFactor();  // kết hợp phải
      v = Math.pow(v, e);
    }
    return v;
  }
  function parsePrimary(): number {
    if (s[i] === '#') {               // hàm căn
      i++;
      if (s[i] !== '(') throw new Error('căn thiếu (');
      i++;
      const inner = parseExpr();
      if (s[i] !== ')') throw new Error('thiếu )');
      i++;
      return Math.sqrt(inner);
    }
    if (s[i] === '(') {
      i++;
      const v = parseExpr();
      if (s[i] !== ')') throw new Error('thiếu )');
      i++;
      return v;
    }
    const start = i;
    while (i < s.length && /[0-9.]/.test(s[i])) i++;
    if (i === start) throw new Error('token lạ: ' + (s[i] ?? 'EOF'));
    return parseFloat(s.slice(start, i));
  }

  try {
    if (s.length === 0) return null;
    const v = parseExpr();
    if (i !== s.length) return null;   // còn dư ký tự → chuỗi không hợp lệ
    if (!Number.isFinite(v)) return null;
    return v;
  } catch {
    return null;
  }
}

/** Đọc một biểu thức vô hướng bất kỳ về SỐ (float). Rác → null. */
export function parseScalar(raw: string, probe: Record<string, number> = DEFAULT_PROBE): number | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  return evalExpr(toEvalString(raw, probe));
}

/**
 * Quy chuỗi vô hướng về DẠNG CHUẨN của engine (vd "√6/3", "2√3", "1/2").
 * Nếu engine không rút gọn được (isExact=false) vẫn trả chuỗi thập phân của engine,
 * để hàm so sánh còn dùng làm nhãn hiển thị; việc quyết đúng/sai khi đó dựa trên SỐ.
 * Rác → null.
 */
export function canonicalScalar(raw: string): string | null {
  const n = parseScalar(raw);
  if (n === null) return null;
  return toExactForm(n).text;
}

// ---------------------------------------------------------------------------
// (B) BỘ ĐỌC ĐIỂM / VECTOR — phần 2 em tự viết.
// ---------------------------------------------------------------------------

/** Cắt chuỗi theo dấu `sep` nhưng chỉ ở "mặt ngoài" (không cắt bên trong ngoặc). */
function splitTopLevel(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const c of s) {
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    if (c === sep && depth === 0) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter((x) => x.length > 0);
}

/** Đọc "(1,2,3)" / "[0, √3/2, 0]" / "1,2,3" → mảng số. Rác → null. */
export function parsePoint(raw: string): number[] | null {
  let s = raw.trim();
  s = s.replace(/^[([{]/, '').replace(/[)\]}]$/, '');   // bỏ ngoặc bao ngoài (nếu có)
  const parts = splitTopLevel(s, ',');
  if (parts.length === 0) return null;
  const out: number[] = [];
  for (const p of parts) {
    const v = parseScalar(p);
    if (v === null) return null;
    out.push(v);
  }
  return out;
}

// ---------------------------------------------------------------------------
// (C) BỘ ĐỌC PHƯƠNG TRÌNH MẶT PHẲNG — phần 2 em tự viết.
// ---------------------------------------------------------------------------

/** Tách một vế thành các hạng tử, giữ dấu +/- gắn liền. Vd "x+2y-2z+3" → ["x","+2y","-2z","+3"]. */
function splitTerms(s: string): string[] {
  const terms: string[] = [];
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    // '+'/'-' mở một hạng tử mới, TRỪ khi nó đứng ngay sau toán tử/ngoặc mở (dấu của số).
    if ((c === '+' || c === '-') && cur !== '' && !'*/^('.includes(s[i - 1])) {
      terms.push(cur);
      cur = c;
    } else {
      cur += c;
    }
  }
  if (cur !== '') terms.push(cur);
  return terms;
}

/** Đọc một hạng tử → { biến, hệ số }. Biến '' nghĩa là hằng số. Rác → null. */
function termCoef(term: string): { v: '' | 'x' | 'y' | 'z'; coef: number } | null {
  let sign = 1;
  let t = term;
  while (t[0] === '+' || t[0] === '-') {
    if (t[0] === '-') sign = -sign;
    t = t.slice(1);
  }
  const m = t.match(/[xyz]/);
  if (!m) {
    if (t === '') return { v: '', coef: 0 };
    const val = parseScalar(t);
    return val === null ? null : { v: '', coef: sign * val };
  }
  const v = m[0] as 'x' | 'y' | 'z';
  let coefStr = t.split(v).join('');        // bỏ biến khỏi hạng tử
  coefStr = coefStr.replace(/\*/g, '');     // bỏ dấu '*' dư (vd "2*x")
  let coef: number;
  if (coefStr === '') coef = 1;
  else {
    const p = parseScalar(coefStr);
    if (p === null) return null;
    coef = p;
  }
  return { v, coef: sign * coef };
}

/**
 * Đọc "x+2y-2z+3=0" → { a, b, c, d } với a·x+b·y+c·z+d = 0.
 * Hỗ trợ cả khi hai vế đều có hạng tử (chuyển vế phải sang trái bằng dấu trừ).
 * Không có biến x/y/z nào → null (không phải mặt phẳng).
 */
export function parsePlane(raw: string): { a: number; b: number; c: number; d: number } | null {
  const s = raw.replace(/\s+/g, '');
  const sides = s.split('=');
  if (sides.length > 2) return null;
  const acc = { a: 0, b: 0, c: 0, d: 0 };
  const addSide = (expr: string, sign: number): boolean => {
    for (const term of splitTerms(expr)) {
      const tc = termCoef(term);
      if (tc === null) return false;
      const c = sign * tc.coef;
      if (tc.v === 'x') acc.a += c;
      else if (tc.v === 'y') acc.b += c;
      else if (tc.v === 'z') acc.c += c;
      else acc.d += c;
    }
    return true;
  };
  if (!addSide(sides[0], 1)) return null;
  if (sides.length === 2 && !addSide(sides[1], -1)) return null;
  if (acc.a === 0 && acc.b === 0 && acc.c === 0) return null;
  return acc;
}

// ---------------------------------------------------------------------------
// (D) TỈ SỐ NGUYÊN CHÍNH XÁC — DÙNG engine scalar để rút gọn không sai số float.
// ---------------------------------------------------------------------------

/**
 * Nếu chuỗi là tỉ số hai số nguyên "p:q" hoặc "p/q" → rút gọn CHÍNH XÁC bằng makeExact
 * rồi hiển thị bằng displayExact (vd "2/4" → "1/2"). Ngược lại → null.
 * Đây là chỗ dùng lớp số học chính xác của engine (design.md §4.2 lớp 2).
 */
export function parseRatioExact(raw: string): string | null {
  const s = raw.trim().replace(/\s+/g, '');
  const m = s.match(/^(-?\d+)[:/](-?\d+)$/);
  if (!m) return null;
  const num = BigInt(m[1]);
  const den = BigInt(m[2]);
  if (den === 0n) return null;
  return displayExact(makeExact(num, den, 1));
}
