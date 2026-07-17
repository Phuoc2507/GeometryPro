// api/_lib/kernel/analysis/expr.ts
// Parser + evaluator biểu thức 1 dòng cho engine giải tích: số, biến, + - * / ^ (^ phải-kết-hợp),
// đơn nguyên (LỎNG hơn ^), ngoặc, hàm dựng sẵn sin/cos/tan/sqrt/abs, hằng pi/e, VÀ hàm do người
// dùng khai báo (vd f(z)) truyền qua `funcs` lúc TÍNH (tên hàm chỉ được kiểm khi tính, không khi parse).
export type Env = Record<string, number>;
export type Funcs = Record<string, (x: number) => number>;
type Node = (env: Env, funcs: Funcs) => number;
type Tok = { t: 'num' | 'name' | 'op' | '(' | ')'; v: string };

function tokenize(s: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++;
      toks.push({ t: 'num', v: s.slice(i, j) }); i = j; continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i; while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j++;
      toks.push({ t: 'name', v: s.slice(i, j) }); i = j; continue;
    }
    if ('+-*/^'.includes(c)) { toks.push({ t: 'op', v: c }); i++; continue; }
    if (c === '(') { toks.push({ t: '(', v: c }); i++; continue; }
    if (c === ')') { toks.push({ t: ')', v: c }); i++; continue; }
    throw new Error(`Ký tự lạ trong biểu thức: '${c}'`);
  }
  return toks;
}

const FUNCS: Record<string, (x: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt, abs: Math.abs,
};
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };

// Chỉ nhận thuộc tính RIÊNG: `x in obj` đi qua prototype chain nên 'constructor', 'toString'...
// sẽ lọt qua guard 'Hàm lạ'/'Biến chưa gán' và trả về hàm/đối tượng thay vì số.
const own = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);

export function parseExpr(src: string): (env?: Env, funcs?: Funcs) => number {
  const toks = tokenize(src);
  let pos = 0;
  const peek = () => toks[pos];
  const eat = () => toks[pos++];

  function parseE(): Node { // E := T (('+'|'-') T)*
    let left = parseT();
    while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) {
      const op = eat().v; const right = parseT(); const l = left;
      left = (env, fs) => (op === '+' ? l(env, fs) + right(env, fs) : l(env, fs) - right(env, fs));
    }
    return left;
  }
  function parseT(): Node { // T := U (('*'|'/') U)*
    let left = parseU();
    while (peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/')) {
      const op = eat().v; const right = parseU(); const l = left;
      left = (env, fs) => (op === '*' ? l(env, fs) * right(env, fs) : l(env, fs) / right(env, fs));
    }
    return left;
  }
  function parseU(): Node { // U := ('-'|'+') U | F — đơn nguyên LỎNG hơn ^ (nên -2^2 = -(2^2))
    const tk = peek();
    if (tk && tk.t === 'op' && tk.v === '-') { eat(); const u = parseU(); return (env, fs) => -u(env, fs); }
    if (tk && tk.t === 'op' && tk.v === '+') { eat(); return parseU(); }
    return parseF();
  }
  function parseF(): Node { // F := B ('^' U)? (^ phải-kết-hợp; số mũ có thể mang dấu)
    const base = parseB();
    if (peek() && peek().t === 'op' && peek().v === '^') {
      eat(); const exp = parseU();
      return (env, fs) => Math.pow(base(env, fs), exp(env, fs));
    }
    return base;
  }
  function parseB(): Node { // B := num | const | var | func '(' E ')' | '(' E ')'
    const tk = peek();
    if (!tk) throw new Error('Biểu thức cụt');
    if (tk.t === 'num') { eat(); const val = parseFloat(tk.v); return () => val; }
    if (tk.t === '(') { eat(); const e = parseE(); if (!peek() || peek().t !== ')') throw new Error('Thiếu )'); eat(); return e; }
    if (tk.t === 'name') {
      eat();
      if (peek() && peek().t === '(') {
        const fname = tk.v;
        eat(); const arg = parseE(); if (!peek() || peek().t !== ')') throw new Error('Thiếu )'); eat();
        return (env, fs) => {
          // Tra bằng own-property: tránh rò rỉ tên trên prototype (constructor/toString/...).
          const fn = own(FUNCS, fname) ? FUNCS[fname] : (own(fs, fname) ? fs[fname] : undefined);
          if (!fn) throw new Error(`Hàm lạ: ${fname}`);
          return fn(arg(env, fs));
        };
      }
      if (own(CONSTS, tk.v)) { const cv = CONSTS[tk.v]; return () => cv; }
      const name = tk.v;
      return (env) => { if (!own(env, name)) throw new Error(`Biến chưa gán: ${name}`); return env[name]; };
    }
    throw new Error(`Token lạ: ${tk.v}`);
  }

  const fn = parseE();
  if (pos !== toks.length) throw new Error('Biểu thức dư token');
  return (env: Env = {}, funcs: Funcs = {}) => fn(env, funcs);
}

export function evalExpr(src: string, env: Env = {}, funcs: Funcs = {}): number {
  return parseExpr(src)(env, funcs);
}
