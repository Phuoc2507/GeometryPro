// api/_lib/kernel/analysis/expr.ts
// Parser + evaluator biểu thức 1 dòng cho engine giải tích: số, biến, + - * / ^ (^ phải-kết-hợp),
// đơn nguyên -, ngoặc, hàm sin/cos/tan/sqrt/abs, hằng pi/e. Trả hàm (env) => number.
export type Env = Record<string, number>;
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

export function parseExpr(src: string): (env: Env) => number {
  const toks = tokenize(src);
  let pos = 0;
  const peek = () => toks[pos];
  const eat = () => toks[pos++];

  function parseE(): (env: Env) => number { // E := T (('+'|'-') T)*
    let left = parseT();
    while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) {
      const op = eat().v; const right = parseT(); const l = left;
      left = (env) => (op === '+' ? l(env) + right(env) : l(env) - right(env));
    }
    return left;
  }
  function parseT(): (env: Env) => number { // T := U (('*'|'/') U)*
    let left = parseU();
    while (peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/')) {
      const op = eat().v; const right = parseU(); const l = left;
      left = (env) => (op === '*' ? l(env) * right(env) : l(env) / right(env));
    }
    return left;
  }
  function parseU(): (env: Env) => number { // U := ('-'|'+') U | F — đơn nguyên LỎNG hơn ^ (nên -2^2 = -(2^2))
    const tk = peek();
    if (tk && tk.t === 'op' && tk.v === '-') { eat(); const u = parseU(); return (env) => -u(env); }
    if (tk && tk.t === 'op' && tk.v === '+') { eat(); return parseU(); }
    return parseF();
  }
  function parseF(): (env: Env) => number { // F := B ('^' U)?  (^ phải-kết-hợp; số mũ có thể mang dấu)
    const base = parseB();
    if (peek() && peek().t === 'op' && peek().v === '^') {
      eat(); const exp = parseU();
      return (env) => Math.pow(base(env), exp(env));
    }
    return base;
  }
  function parseB(): (env: Env) => number { // B := num | const | var | func '(' E ')' | '(' E ')'
    const tk = peek();
    if (!tk) throw new Error('Biểu thức cụt');
    if (tk.t === 'num') { eat(); const val = parseFloat(tk.v); return () => val; }
    if (tk.t === '(') { eat(); const e = parseE(); if (!peek() || peek().t !== ')') throw new Error('Thiếu )'); eat(); return e; }
    if (tk.t === 'name') {
      eat();
      if (peek() && peek().t === '(') {
        const fn = FUNCS[tk.v]; if (!fn) throw new Error(`Hàm lạ: ${tk.v}`);
        eat(); const arg = parseE(); if (!peek() || peek().t !== ')') throw new Error('Thiếu )'); eat();
        return (env) => fn(arg(env));
      }
      if (tk.v in CONSTS) { const cv = CONSTS[tk.v]; return () => cv; }
      const name = tk.v;
      return (env) => { if (!(name in env)) throw new Error(`Biến chưa gán: ${name}`); return env[name]; };
    }
    throw new Error(`Token lạ: ${tk.v}`);
  }

  const fn = parseE();
  if (pos !== toks.length) throw new Error('Biểu thức dư token');
  return fn;
}

export function evalExpr(src: string, env: Env = {}): number {
  return parseExpr(src)(env);
}
