// api/_lib/kernel/dialects/oxyzInput.ts
import { type Exact, type Scalar, makeExact, fromExact } from '../scalar';
import { type Vec3S, vec3s } from '../vec3s';

export type RationalInput = number | string;

// "1.5" / "-0.25" / "12" (thập phân hoặc nguyên, không dạng mũ) → Exact hữu tỷ.
function decimalToExact(s: string): Exact {
  const neg = s.startsWith('-');
  const body = neg ? s.slice(1) : s;
  if (!/^\d*\.?\d+$/.test(body) && !/^\d+\.?\d*$/.test(body)) {
    throw new Error(`Cannot parse rational from "${s}" (use "p/q" for fractions)`);
  }
  const dot = body.indexOf('.');
  if (dot === -1) {
    const v = BigInt(body);
    return makeExact(neg ? -v : v, 1n, 1);
  }
  const intPart = body.slice(0, dot) || '0';
  const fracPart = body.slice(dot + 1) || '0';
  const den = 10n ** BigInt(fracPart.length);
  const numAbs = BigInt(intPart) * den + BigInt(fracPart);
  return makeExact(neg ? -numAbs : numAbs, den, 1);
}

const INT_RE = /^[+-]?\d+$/;

// Căn đơn: "sqrt(3)", "√3", "2*sqrt(3)", "sqrt(3)/2", "2*sqrt(3)/3", "-sqrt(5)/2"
// → Exact dạng (num/den)·√radicand. Cho phép toạ độ vô tỉ (tam giác đều, góc 60°…) chính xác.
function parseSurd(raw: string): Exact | null {
  const s = raw.replace(/√\s*\(?\s*(\d+)\s*\)?/g, 'sqrt($1)').replace(/\s+/g, '');
  const m = s.match(/^([+-]?)(?:(\d+)(?:\/(\d+))?\*?)?sqrt\((\d+)\)(?:\/(\d+))?$/i);
  if (!m) return null;
  const sign = m[1] === '-' ? -1n : 1n;
  const cnum = m[2] ? BigInt(m[2]) : 1n;
  const cden = m[3] ? BigInt(m[3]) : 1n;
  const rad = Number(m[4]);
  const den = m[5] ? BigInt(m[5]) : 1n;
  return makeExact(sign * cnum, cden * den, rad); // (sign·cnum)/(cden·den) · √rad
}

export function parseRational(input: RationalInput): Exact {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) throw new Error('Rational input must be finite');
    if (Number.isInteger(input)) {
      if (!Number.isSafeInteger(input)) {
        throw new Error(`Integer ${input} exceeds the safe range; pass it as a string instead`);
      }
      return makeExact(BigInt(input), 1n, 1);
    }
    const s = input.toString();
    if (s.includes('e') || s.includes('E')) {
      throw new Error(`Number "${s}" is in exponent form; pass it as a string fraction instead`);
    }
    return decimalToExact(s);
  }
  const s = input.trim();
  if (/sqrt|√/i.test(s)) {
    const surd = parseSurd(s);
    if (!surd) throw new Error(`Cannot parse surd from "${input}" (dùng "sqrt(3)", "sqrt(3)/2", "2*sqrt(3)")`);
    return surd;
  }
  if (s.includes('/')) {
    const parts = s.split('/');
    const a = parts[0]?.trim();
    const b = parts[1]?.trim();
    if (parts.length !== 2 || !INT_RE.test(a) || !INT_RE.test(b)) {
      throw new Error(`Cannot parse rational from "${input}" (expected "p/q" with integer p, q)`);
    }
    return makeExact(BigInt(a), BigInt(b), 1); // makeExact throws on q = 0
  }
  return decimalToExact(s);
}

export function parseScalar(input: RationalInput): Scalar {
  return fromExact(parseRational(input));
}

export function parseVec3S(c: [RationalInput, RationalInput, RationalInput]): Vec3S {
  return vec3s(parseScalar(c[0]), parseScalar(c[1]), parseScalar(c[2]));
}
