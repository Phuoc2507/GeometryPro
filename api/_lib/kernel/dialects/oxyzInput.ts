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

export function parseRational(input: RationalInput): Exact {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) throw new Error('Rational input must be finite');
    if (Number.isInteger(input)) return makeExact(BigInt(input), 1n, 1);
    const s = input.toString();
    if (s.includes('e') || s.includes('E')) {
      throw new Error(`Number "${s}" is in exponent form; pass it as a string fraction instead`);
    }
    return decimalToExact(s);
  }
  const s = input.trim();
  if (s.includes('/')) {
    const [a, b] = s.split('/');
    return makeExact(BigInt(a.trim()), BigInt(b.trim()), 1);
  }
  return decimalToExact(s);
}

export function parseScalar(input: RationalInput): Scalar {
  return fromExact(parseRational(input));
}

export function parseVec3S(c: [RationalInput, RationalInput, RationalInput]): Vec3S {
  return vec3s(parseScalar(c[0]), parseScalar(c[1]), parseScalar(c[2]));
}
