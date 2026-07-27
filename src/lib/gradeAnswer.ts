/**
 * gradeAnswer — Chấm đáp án học sinh tự nhập, so với `answer_value`
 * (con số đã được engine hình học kiểm chứng). KHÔNG gọi API — tất cả
 * tính ngay tại máy. Hỗ trợ nhập dạng: 2√3, 4/3, pi/6, sqrt(12), 2^3, 1.5…
 */

export type GradeVerdict = 'correct' | 'close' | 'wrong' | 'unparseable' | 'no-reference';

export interface GradeResult {
  verdict: GradeVerdict;
  value: number | null; // giá trị số parse được từ input (null nếu không đọc được)
}

// —— Tách token (không dùng eval) ——
function tokenize(src: string): string[] {
  const s = src
    .replace(/\s+/g, '')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/°/g, '')      // "60°" -> 60
    .replace(/,/g, '.')     // dấu phẩy thập phân kiểu VN
    .replace(/π/gi, 'pi')
    .replace(/√/g, 'sqrt');
  const tokens: string[] = [];
  const isDigit = (c: string) => c >= '0' && c <= '9';
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (isDigit(c) || c === '.') {
      let num = '';
      while (i < s.length && (isDigit(s[i]) || s[i] === '.')) num += s[i++];
      tokens.push(num);
    } else if (/[a-z]/i.test(c)) {
      let name = '';
      while (i < s.length && /[a-z]/i.test(s[i])) name += s[i++];
      tokens.push(name.toLowerCase());
    } else if ('+-*/^()'.includes(c)) {
      tokens.push(c);
      i++;
    } else {
      throw new Error('ký tự lạ');
    }
  }
  return tokens;
}

// —— Đệ quy xuống (recursive descent), có nhân ngầm: 2√3, 2(3), pi 2 ——
function evaluate(tokens: string[]): number {
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = () => tokens[pos++];
  const startsFactor = (t?: string) =>
    t !== undefined && (t === '(' || t === 'sqrt' || t === 'pi' || /^[0-9.]+$/.test(t));

  function parseExpr(): number {
    let v = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = eat();
      const r = parseTerm();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  function parseTerm(): number {
    let v = parseFactor();
    for (;;) {
      const t = peek();
      if (t === '*' || t === '/') {
        eat();
        const r = parseFactor();
        v = t === '*' ? v * r : v / r;
      } else if (startsFactor(t)) {
        v = v * parseFactor(); // nhân ngầm
      } else break;
    }
    return v;
  }
  function parseFactor(): number {
    const base = parseBase();
    if (peek() === '^') {
      eat();
      return Math.pow(base, parseFactor()); // ^ kết hợp phải
    }
    return base;
  }
  function parseBase(): number {
    const t = peek();
    if (t === '-') { eat(); return -parseBase(); }
    if (t === '+') { eat(); return parseBase(); }
    if (t === '(') {
      eat();
      const v = parseExpr();
      if (eat() !== ')') throw new Error('thiếu )');
      return v;
    }
    if (t === 'sqrt') {
      eat();
      let arg: number;
      if (peek() === '(') { eat(); arg = parseExpr(); if (eat() !== ')') throw new Error('thiếu )'); }
      else arg = parseBase();
      if (arg < 0) throw new Error('căn số âm');
      return Math.sqrt(arg);
    }
    if (t === 'pi') { eat(); return Math.PI; }
    if (t !== undefined && /^[0-9.]+$/.test(t)) { eat(); return parseFloat(t); }
    throw new Error('không đọc được');
  }

  const val = parseExpr();
  if (pos !== tokens.length) throw new Error('còn dư token');
  if (!Number.isFinite(val)) throw new Error('không hữu hạn');
  return val;
}

/** Đọc một số từ chuỗi học sinh nhập; trả null nếu không parse được. */
export function parseNumeric(input: string): number | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;
  // Bỏ vế trái nếu gõ kiểu "SA = 2√3" hoặc "V = 4/3".
  const rhs = trimmed.includes('=') ? (trimmed.split('=').pop() ?? '').trim() : trimmed;
  try {
    const tokens = tokenize(rhs);
    if (!tokens.length) return null;
    return evaluate(tokens);
  } catch {
    return null;
  }
}

/**
 * Chấm `input` so với `reference` (số chuẩn từ engine).
 *  - correct: khớp trong ~1.5% (hoặc gần bằng tuyệt đối)
 *  - close:   lệch ≤ 8% (thường do làm tròn) → khích lệ kiểm lại
 *  - wrong:   lệch nhiều
 *  - unparseable: không đọc được số
 *  - no-reference: bài này không có số chuẩn để chấm
 */
export function gradeAnswer(input: string, reference: number | null | undefined): GradeResult {
  if (reference == null || !Number.isFinite(reference)) return { verdict: 'no-reference', value: null };
  const value = parseNumeric(input);
  if (value == null) return { verdict: 'unparseable', value: null };
  const diff = Math.abs(value - reference);
  const rel = diff / Math.max(Math.abs(reference), 1e-9);
  if (diff <= 1e-6 || rel <= 0.015) return { verdict: 'correct', value };
  if (rel <= 0.08) return { verdict: 'close', value };
  return { verdict: 'wrong', value };
}
