// api/_lib/kernel/chem/formula.ts
// Parser công thức hóa học (spec chem §5) — recursive descent đúng ngữ pháp:
//   formula := part ( ('.' | '·') INT? part )*      # hydrat, INT là hệ số cả cụm sau dấu
//   part    := group+
//   group   := ( ELEMENT | '(' part ')' ) INT?      # INT vắng mặt = 1
//   ELEMENT := [A-Z][a-z]?                          # phải CÓ trong bảng atomicMass
//   INT     := [1-9][0-9]*
import { ATOMIC_MASS, atomicMassOf } from './atomicMass';
import { type Rat, R0, addR, mulR, rat } from './rat';

type Counts = Map<string, number>;

function addInto(target: Counts, source: Counts, factor: number): void {
  for (const [el, n] of source) {
    target.set(el, (target.get(el) ?? 0) + n * factor);
  }
}

class Parser {
  private i = 0;
  constructor(private readonly s: string) {}

  private peek(): string {
    return this.s[this.i] ?? '';
  }

  private fail(msg: string): never {
    throw new Error(`Công thức "${this.s}" không hợp lệ: ${msg} (tại vị trí ${this.i})`);
  }

  // INT := [1-9][0-9]* — trả 1 nếu vắng mặt; chỉ số bắt đầu bằng 0 là lỗi.
  private parseInt(): number {
    if (this.peek() === '0') this.fail('chỉ số 0 không hợp lệ');
    if (!/[1-9]/.test(this.peek())) return 1;
    let digits = '';
    while (/[0-9]/.test(this.peek())) {
      digits += this.peek();
      this.i++;
    }
    return Number(digits);
  }

  private parseElement(): string {
    let sym = this.peek();
    this.i++;
    if (/[a-z]/.test(this.peek())) {
      sym += this.peek();
      this.i++;
    }
    if (!ATOMIC_MASS[sym]) this.fail(`nguyên tố lạ "${sym}"`);
    return sym;
  }

  // part := group+
  parsePart(): Counts {
    const out: Counts = new Map();
    let groups = 0;
    for (;;) {
      const c = this.peek();
      if (/[A-Z]/.test(c)) {
        const el = this.parseElement();
        const n = this.parseInt();
        out.set(el, (out.get(el) ?? 0) + n);
        groups++;
      } else if (c === '(') {
        this.i++;
        const inner = this.parsePart();
        if (this.peek() !== ')') this.fail('thiếu dấu ")" đóng ngoặc');
        this.i++;
        const n = this.parseInt();
        addInto(out, inner, n);
        groups++;
      } else {
        break;
      }
    }
    if (groups === 0) this.fail('thiếu nguyên tố');
    if (this.peek() === '0') this.fail('chỉ số 0 không hợp lệ');
    return out;
  }

  // formula := part ( ('.'|'·') INT? part )*
  parseFormula(): { counts: Counts; hydrate: boolean } {
    if (this.s === '') throw new Error('Công thức rỗng');
    const out = this.parsePart();
    let hydrate = false;
    while (this.peek() === '.' || this.peek() === '·') {
      hydrate = true;
      this.i++;
      const n = this.parseInt();
      const part = this.parsePart();
      addInto(out, part, n);
    }
    if (this.i !== this.s.length) this.fail(`ký tự lạ "${this.peek()}"`);
    return { counts: out, hydrate };
  }
}

// "Fe2(SO4)3" → Map {Fe:2, S:3, O:12}. Throw với thông điệp cụ thể khi sai.
export function parseFormula(formula: string): Counts {
  return new Parser(formula).parseFormula().counts;
}

// Công thức có phần hydrat ("CuSO4.5H2O")? — v0 hydrat chỉ dùng tính M/đổi đơn vị,
// KHÔNG được đưa vào mix (runChem sẽ chặn).
export function isHydrate(formula: string): boolean {
  return new Parser(formula).parseFormula().hydrate;
}

// Khối lượng mol hữu tỉ exact = Σ chỉ số × nguyên tử khối SGK.
export function molarMass(formula: string): Rat {
  let sum = R0;
  for (const [el, n] of parseFormula(formula)) {
    sum = addR(sum, mulR(rat(BigInt(n)), atomicMassOf(el)));
  }
  return sum;
}
