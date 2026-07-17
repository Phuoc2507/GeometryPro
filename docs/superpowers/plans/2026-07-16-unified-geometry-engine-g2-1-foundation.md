# Kế hoạch G2-1: Nền móng Engine Hợp Nhất (Scalar + Entities + EntityTable)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây lớp nền của engine hợp nhất — số `Scalar` lai (float + exact hữu tỷ/căn), vector `Vec3S`, entity hạng nhất (Point/Line/Plane/Sphere) với builder, và `EntityTable` cùng cầu nối từ `SymbolTable` Phase 1 — **thuần cộng thêm, không đụng 139 test đang xanh**.

**Architecture:** Theo spec `docs/superpowers/specs/2026-07-16-unified-geometry-engine-design.md`, Hướng 1 (song biểu diễn: float luôn có, exact tuỳ chọn). Plan này chỉ làm lớp dữ liệu/số học nền; chưa có compute/Oxyz/verifier mở rộng (các plan G2-2..4 sau).

**Tech Stack:** TypeScript, Zod (đã có), Vitest 4.1.10 (đã cấu hình `api/_lib/kernel/**/*.test.ts`), `bigint` cho số hữu tỷ.

---

## Design deviations from the spec (đã cân nhắc, cải tiến)

1. **`Exact` dùng MỘT dạng hợp nhất `{ num, den, radicand }`** thay vì union `Rational | Surd` như spec §3.1. Ngữ nghĩa: giá trị = `(num/den)·√radicand`, với `radicand` là số nguyên dương square-free; `radicand === 1` ⇒ số hữu tỷ thuần. Đây là biểu diễn tương đương nhưng gọn hơn (ít nhánh case), giữ đúng phạm vi "hữu tỷ + căn đơn". Mọi chỗ spec nói "Rational" = `radicand 1`, "Surd" = `radicand > 1`.
2. **Builder mặt cầu 4 điểm để sang plan sau** (cần giải hệ tuyến tính — thuộc compute layer G2-3). Plan này chỉ làm builder: tâm+bán kính, tâm+điểm, phương trình.
3. **Cầu nối `symtabToEntityTable` đặt `exact = null` cho điểm dựng từ Phase 1** (toạ độ Phase 1 là float, không mang exact). Giá trị exact đến từ dialect Oxyz (plan G2-2). Cầu nối vẫn hữu ích vì tạo ra entity Line/Plane/Sphere hạng nhất mà compute layer cần.

---

## File Structure

- Create: `api/_lib/kernel/scalar.ts` — `Exact`, `Scalar`, số học hữu tỷ/căn, hiển thị.
- Create: `api/_lib/kernel/vec3s.ts` — `Vec3S` (vector Scalar) + phép vector.
- Create: `api/_lib/kernel/entities.ts` — `PointE/LineE/PlaneE/SphereE` + builder.
- Create: `api/_lib/kernel/entityTable.ts` — `EntityTable` + `createEmptyEntityTable` + `symtabToEntityTable`.
- Create: `api/_lib/kernel/__tests__/scalar.test.ts`
- Create: `api/_lib/kernel/__tests__/vec3s.test.ts`
- Create: `api/_lib/kernel/__tests__/entities.test.ts`
- Create: `api/_lib/kernel/__tests__/entityTable.test.ts`
- **Không sửa** `execute.ts`, `verify.ts`, `resolve.ts`, `planSchema.ts` trong plan này (giữ 139 test nguyên vẹn).

---

## Task 1: Số học nền — `Exact` (hữu tỷ + căn) và hiển thị

**Files:**
- Create: `api/_lib/kernel/scalar.ts`
- Test: `api/_lib/kernel/__tests__/scalar.test.ts`

- [ ] **Step 1: Viết test đỏ**

```ts
// api/_lib/kernel/__tests__/scalar.test.ts
import { describe, it, expect } from 'vitest';
import { makeExact, exactToApprox, displayExact } from '../scalar';

describe('makeExact — chuẩn hoá', () => {
  it('rút gọn phân số và đưa dấu về tử', () => {
    const e = makeExact(4n, -8n, 1);
    expect(e).toEqual({ num: -1n, den: 2n, radicand: 1 });
  });

  it('rút thừa số chính phương khỏi radicand (√8 → 2√2)', () => {
    const e = makeExact(1n, 1n, 8);
    expect(e).toEqual({ num: 2n, den: 1n, radicand: 2 });
  });

  it('radicand = 1 giữ nguyên là số hữu tỷ', () => {
    expect(makeExact(3n, 1n, 1)).toEqual({ num: 3n, den: 1n, radicand: 1 });
  });

  it('num = 0 chuẩn hoá về 0 hữu tỷ bất kể radicand', () => {
    expect(makeExact(0n, 5n, 7)).toEqual({ num: 0n, den: 1n, radicand: 1 });
  });
});

describe('exactToApprox', () => {
  it('cho giá trị float đúng', () => {
    expect(exactToApprox(makeExact(3n, 14n, 14))).toBeCloseTo((3 / 14) * Math.sqrt(14), 12);
    expect(exactToApprox(makeExact(1n, 1n, 8))).toBeCloseTo(Math.sqrt(8), 12);
  });
});

describe('displayExact', () => {
  it('số nguyên và phân số', () => {
    expect(displayExact(makeExact(5n, 1n, 1))).toBe('5');
    expect(displayExact(makeExact(3n, 2n, 1))).toBe('3/2');
    expect(displayExact(makeExact(-3n, 2n, 1))).toBe('-3/2');
  });

  it('căn thuần và có hệ số', () => {
    expect(displayExact(makeExact(1n, 1n, 2))).toBe('√2');
    expect(displayExact(makeExact(3n, 14n, 14))).toBe('3√14/14');
    expect(displayExact(makeExact(2n, 1n, 3))).toBe('2√3');
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

Run: `npx vitest run api/_lib/kernel/__tests__/scalar.test.ts`
Expected: FAIL với "Cannot find module '../scalar'".

- [ ] **Step 3: Viết cài đặt tối thiểu**

```ts
// api/_lib/kernel/scalar.ts

// Giá trị chính xác = (num/den)·√radicand, với radicand nguyên dương square-free.
// radicand === 1 ⇒ số hữu tỷ thuần. den luôn > 0. Phân số luôn rút gọn.
export type Exact = { num: bigint; den: bigint; radicand: number };

function bgcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1n;
}

// Tách thừa số chính phương: r = factor² · rad, rad square-free. Trả { rad, factor }.
function extractSquare(r: number): { rad: number; factor: bigint } {
  if (!Number.isInteger(r) || r < 1) {
    throw new Error(`radicand must be a positive integer, got ${r}`);
  }
  let rad = r;
  let factor = 1n;
  for (let f = 2; f * f <= rad; f++) {
    while (rad % (f * f) === 0) {
      rad /= f * f;
      factor *= BigInt(f);
    }
  }
  return { rad, factor };
}

export function makeExact(num: bigint, den: bigint, radicand: number = 1): Exact {
  if (den === 0n) throw new Error('Exact denominator cannot be zero');
  if (num === 0n) return { num: 0n, den: 1n, radicand: 1 };
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  const { rad, factor } = extractSquare(radicand);
  num *= factor;
  const g = bgcd(num, den);
  return { num: num / g, den: den / g, radicand: rad };
}

export function exactToApprox(e: Exact): number {
  return (Number(e.num) / Number(e.den)) * Math.sqrt(e.radicand);
}

export function displayExact(e: Exact): string {
  const sign = e.num < 0n ? '-' : '';
  const n = e.num < 0n ? -e.num : e.num;
  if (e.radicand === 1) {
    return e.den === 1n ? `${sign}${n}` : `${sign}${n}/${e.den}`;
  }
  const radStr = `√${e.radicand}`;
  const numer = n === 1n ? radStr : `${n}${radStr}`;
  return e.den === 1n ? `${sign}${numer}` : `${sign}${numer}/${e.den}`;
}
```

- [ ] **Step 4: Chạy test để chắc chắn nó xanh**

Run: `npx vitest run api/_lib/kernel/__tests__/scalar.test.ts`
Expected: PASS (10 test).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/scalar.ts api/_lib/kernel/__tests__/scalar.test.ts
git commit -m "feat(engine): exact rational/surd core (makeExact + display)"
```

---

## Task 2: Số học trên `Exact` (add/sub/mul/div/neg/sqrt)

**Files:**
- Modify: `api/_lib/kernel/scalar.ts`
- Test: `api/_lib/kernel/__tests__/scalar.test.ts`

- [ ] **Step 1: Thêm test đỏ**

```ts
// append to api/_lib/kernel/__tests__/scalar.test.ts
import { addExact, mulExact, divExact, negExact, sqrtExact } from '../scalar';

describe('số học Exact', () => {
  it('cộng hai hữu tỷ', () => {
    expect(addExact(makeExact(1n, 2n), makeExact(1n, 3n))).toEqual(makeExact(5n, 6n));
  });

  it('cộng hai căn cùng radicand', () => {
    // √2 + 3√2 = 4√2
    expect(addExact(makeExact(1n, 1n, 2), makeExact(3n, 1n, 2))).toEqual(makeExact(4n, 1n, 2));
  });

  it('cộng khác radicand (khác 0) ra ngoài trường ⇒ null', () => {
    expect(addExact(makeExact(1n, 1n, 2), makeExact(1n, 1n, 3))).toBeNull();
  });

  it('cộng với 0 trả về số kia', () => {
    expect(addExact(makeExact(0n, 1n), makeExact(1n, 1n, 3))).toEqual(makeExact(1n, 1n, 3));
  });

  it('nhân hai căn: √2·√6 = 2√3', () => {
    expect(mulExact(makeExact(1n, 1n, 2), makeExact(1n, 1n, 6))).toEqual(makeExact(2n, 1n, 3));
  });

  it('chia: 3 / √14 = 3√14/14', () => {
    expect(divExact(makeExact(3n, 1n, 1), makeExact(1n, 1n, 14))).toEqual(makeExact(3n, 14n, 14));
  });

  it('sqrt của hữu tỷ: √(9/4) = 3/2', () => {
    expect(sqrtExact(makeExact(9n, 4n, 1))).toEqual(makeExact(3n, 2n, 1));
  });

  it('sqrt của hữu tỷ không chính phương: √2', () => {
    expect(sqrtExact(makeExact(2n, 1n, 1))).toEqual(makeExact(1n, 1n, 2));
  });

  it('sqrt của số âm hoặc của một căn ⇒ null', () => {
    expect(sqrtExact(makeExact(-1n, 1n, 1))).toBeNull();
    expect(sqrtExact(makeExact(1n, 1n, 2))).toBeNull();
  });

  it('neg đảo dấu', () => {
    expect(negExact(makeExact(3n, 2n, 5))).toEqual(makeExact(-3n, 2n, 5));
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/__tests__/scalar.test.ts`
Expected: FAIL với "addExact is not a function" (hoặc import lỗi).

- [ ] **Step 3: Thêm cài đặt vào `scalar.ts`**

```ts
// append to api/_lib/kernel/scalar.ts

export function negExact(a: Exact): Exact {
  return { num: -a.num, den: a.den, radicand: a.radicand };
}

// a + b — chỉ đóng khi cùng radicand (hoặc một trong hai bằng 0). Ngược lại ⇒ null.
export function addExact(a: Exact, b: Exact): Exact | null {
  if (a.num === 0n) return b;
  if (b.num === 0n) return a;
  if (a.radicand !== b.radicand) return null;
  // a.num/a.den + b.num/b.den, chung radicand
  const num = a.num * b.den + b.num * a.den;
  const den = a.den * b.den;
  return makeExact(num, den, a.radicand);
}

export function subExact(a: Exact, b: Exact): Exact | null {
  return addExact(a, negExact(b));
}

// (a.num/a.den·√ra)·(b.num/b.den·√rb) = (a.num·b.num)/(a.den·b.den)·√(ra·rb)
export function mulExact(a: Exact, b: Exact): Exact {
  return makeExact(a.num * b.num, a.den * b.den, a.radicand * b.radicand);
}

// a / b = (a.num·b.den)/(a.den·b.num) · √ra/√rb = ... · √(ra·rb)/rb
export function divExact(a: Exact, b: Exact): Exact {
  if (b.num === 0n) throw new Error('Exact division by zero');
  const num = a.num * b.den;
  const den = a.den * b.num * BigInt(b.radicand);
  return makeExact(num, den, a.radicand * b.radicand);
}

// √(num/den) khi là hữu tỷ không âm; = √(num·den)/den. Ngoài ra ⇒ null.
export function sqrtExact(a: Exact): Exact | null {
  if (a.radicand !== 1) return null; // √ của một căn: ngoài trường
  if (a.num < 0n) return null;
  if (a.num === 0n) return makeExact(0n, 1n, 1);
  const radicand = Number(a.num * a.den);
  if (!Number.isSafeInteger(radicand)) return null; // quá lớn để làm radicand an toàn
  return makeExact(1n, a.den, radicand);
}
```

- [ ] **Step 4: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/__tests__/scalar.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/scalar.ts api/_lib/kernel/__tests__/scalar.test.ts
git commit -m "feat(engine): exact arithmetic (add/sub/mul/div/neg/sqrt in the field)"
```

---

## Task 3: `Scalar` lai (float + exact) và số học bọc ngoài

**Files:**
- Modify: `api/_lib/kernel/scalar.ts`
- Test: `api/_lib/kernel/__tests__/scalar.test.ts`

- [ ] **Step 1: Thêm test đỏ**

```ts
// append to api/_lib/kernel/__tests__/scalar.test.ts
import { num, fromExact, add, mul, div, sqrt, displayScalar } from '../scalar';

describe('Scalar lai', () => {
  it('num() tạo scalar float-only (exact null)', () => {
    const s = num(1.5);
    expect(s.approx).toBe(1.5);
    expect(s.exact).toBeNull();
  });

  it('fromExact() giữ cả exact lẫn approx', () => {
    const s = fromExact(makeExact(3n, 2n, 1));
    expect(s.approx).toBeCloseTo(1.5, 12);
    expect(s.exact).toEqual(makeExact(3n, 2n, 1));
  });

  it('add hai exact giữ exact', () => {
    const s = add(fromExact(makeExact(1n, 2n)), fromExact(makeExact(1n, 3n)));
    expect(s.exact).toEqual(makeExact(5n, 6n));
    expect(s.approx).toBeCloseTo(5 / 6, 12);
  });

  it('add khi một toán hạng float-only ⇒ exact null, approx vẫn đúng', () => {
    const s = add(num(0.5), fromExact(makeExact(1n, 2n)));
    expect(s.exact).toBeNull();
    expect(s.approx).toBeCloseTo(1, 12);
  });

  it('add hai exact ra ngoài trường ⇒ exact null nhưng approx đúng', () => {
    const s = add(fromExact(makeExact(1n, 1n, 2)), fromExact(makeExact(1n, 1n, 3)));
    expect(s.exact).toBeNull();
    expect(s.approx).toBeCloseTo(Math.sqrt(2) + Math.sqrt(3), 12);
  });

  it('mul/div/sqrt lan truyền exact khi ở trong trường', () => {
    expect(mul(fromExact(makeExact(1n, 1n, 2)), fromExact(makeExact(1n, 1n, 6))).exact)
      .toEqual(makeExact(2n, 1n, 3));
    expect(div(fromExact(makeExact(3n, 1n)), fromExact(makeExact(1n, 1n, 14))).exact)
      .toEqual(makeExact(3n, 14n, 14));
    expect(sqrt(fromExact(makeExact(9n, 4n))).exact).toEqual(makeExact(3n, 2n, 1));
  });

  it('displayScalar dùng exact nếu có, ngược lại decimal', () => {
    expect(displayScalar(fromExact(makeExact(3n, 14n, 14)))).toBe('3√14/14');
    expect(displayScalar(num(Math.PI))).toBe(Math.PI.toFixed(4));
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/__tests__/scalar.test.ts`
Expected: FAIL (`num is not a function`).

- [ ] **Step 3: Thêm cài đặt vào `scalar.ts`**

```ts
// append to api/_lib/kernel/scalar.ts

// Số lai: approx (float) luôn có; exact khi tính được trong trường hữu tỷ+căn.
export type Scalar = { approx: number; exact: Exact | null };

export function num(n: number): Scalar {
  return { approx: n, exact: null };
}

export function fromExact(e: Exact): Scalar {
  return { approx: exactToApprox(e), exact: e };
}

// Hằng tiện dụng: số nguyên/hữu tỷ chính xác.
export function rat(n: bigint, d: bigint = 1n): Scalar {
  return fromExact(makeExact(n, d, 1));
}

export function add(a: Scalar, b: Scalar): Scalar {
  const exact = a.exact && b.exact ? addExact(a.exact, b.exact) : null;
  return { approx: a.approx + b.approx, exact };
}

export function sub(a: Scalar, b: Scalar): Scalar {
  const exact = a.exact && b.exact ? subExact(a.exact, b.exact) : null;
  return { approx: a.approx - b.approx, exact };
}

export function mul(a: Scalar, b: Scalar): Scalar {
  const exact = a.exact && b.exact ? mulExact(a.exact, b.exact) : null;
  return { approx: a.approx * b.approx, exact };
}

export function div(a: Scalar, b: Scalar): Scalar {
  const exact = a.exact && b.exact && b.exact.num !== 0n ? divExact(a.exact, b.exact) : null;
  return { approx: a.approx / b.approx, exact };
}

export function neg(a: Scalar): Scalar {
  return { approx: -a.approx, exact: a.exact ? negExact(a.exact) : null };
}

export function sqrt(a: Scalar): Scalar {
  const exact = a.exact ? sqrtExact(a.exact) : null;
  return { approx: Math.sqrt(a.approx), exact };
}

export function displayScalar(s: Scalar): string {
  return s.exact ? displayExact(s.exact) : s.approx.toFixed(4);
}
```

- [ ] **Step 4: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/__tests__/scalar.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/scalar.ts api/_lib/kernel/__tests__/scalar.test.ts
git commit -m "feat(engine): hybrid Scalar wrapper (float mirror + exact propagation)"
```

---

## Task 4: `Vec3S` — vector Scalar và phép vector

**Files:**
- Create: `api/_lib/kernel/vec3s.ts`
- Test: `api/_lib/kernel/__tests__/vec3s.test.ts`

- [ ] **Step 1: Viết test đỏ**

```ts
// api/_lib/kernel/__tests__/vec3s.test.ts
import { describe, it, expect } from 'vitest';
import { ratVec, addV, subV, scaleV, dotV, crossV, lenSqV, toApproxVec } from '../vec3s';
import { makeExact, rat } from '../scalar';

describe('Vec3S', () => {
  it('ratVec dựng vector hữu tỷ, toApproxVec cho gương float', () => {
    const v = ratVec(1n, 2n, 3n);
    expect(toApproxVec(v)).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('dot giữ exact: (1,2,2)·(2,-2,1) = 0', () => {
    const a = ratVec(1n, 2n, 2n);
    const b = ratVec(2n, -2n, 1n);
    const d = dotV(a, b);
    expect(d.exact).toEqual(makeExact(0n, 1n, 1));
    expect(d.approx).toBeCloseTo(0, 12);
  });

  it('cross giữ exact: (1,0,0)×(0,1,0) = (0,0,1)', () => {
    const c = crossV(ratVec(1n, 0n, 0n), ratVec(0n, 1n, 0n));
    expect(toApproxVec(c)).toEqual({ x: 0, y: 0, z: 1 });
    expect(c.z.exact).toEqual(makeExact(1n, 1n, 1));
  });

  it('lenSqV cho bình phương độ dài chính xác (hữu tỷ)', () => {
    // |(1,2,2)|² = 9
    expect(lenSqV(ratVec(1n, 2n, 2n)).exact).toEqual(makeExact(9n, 1n, 1));
  });

  it('add/sub/scale hoạt động trên gương float', () => {
    const s = addV(ratVec(1n, 1n, 1n), ratVec(2n, 3n, 4n));
    expect(toApproxVec(s)).toEqual({ x: 3, y: 4, z: 5 });
    const d = subV(ratVec(5n, 5n, 5n), ratVec(1n, 2n, 3n));
    expect(toApproxVec(d)).toEqual({ x: 4, y: 3, z: 2 });
    const sc = scaleV(ratVec(1n, 2n, 3n), rat(2n));
    expect(toApproxVec(sc)).toEqual({ x: 2, y: 4, z: 6 });
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/__tests__/vec3s.test.ts`
Expected: FAIL "Cannot find module '../vec3s'".

- [ ] **Step 3: Viết cài đặt**

```ts
// api/_lib/kernel/vec3s.ts
import { type Scalar, rat, add, sub, mul, neg } from './scalar';

export type Vec3S = { x: Scalar; y: Scalar; z: Scalar };

export function vec3s(x: Scalar, y: Scalar, z: Scalar): Vec3S {
  return { x, y, z };
}

export function ratVec(x: bigint, y: bigint, z: bigint): Vec3S {
  return { x: rat(x), y: rat(y), z: rat(z) };
}

export function addV(a: Vec3S, b: Vec3S): Vec3S {
  return { x: add(a.x, b.x), y: add(a.y, b.y), z: add(a.z, b.z) };
}

export function subV(a: Vec3S, b: Vec3S): Vec3S {
  return { x: sub(a.x, b.x), y: sub(a.y, b.y), z: sub(a.z, b.z) };
}

export function scaleV(a: Vec3S, s: Scalar): Vec3S {
  return { x: mul(a.x, s), y: mul(a.y, s), z: mul(a.z, s) };
}

export function dotV(a: Vec3S, b: Vec3S): Scalar {
  return add(add(mul(a.x, b.x), mul(a.y, b.y)), mul(a.z, b.z));
}

export function crossV(a: Vec3S, b: Vec3S): Vec3S {
  return {
    x: sub(mul(a.y, b.z), mul(a.z, b.y)),
    y: sub(mul(a.z, b.x), mul(a.x, b.z)),
    z: sub(mul(a.x, b.y), mul(a.y, b.x)),
  };
}

export function lenSqV(a: Vec3S): Scalar {
  return dotV(a, a);
}

export function negV(a: Vec3S): Vec3S {
  return { x: neg(a.x), y: neg(a.y), z: neg(a.z) };
}

export function toApproxVec(a: Vec3S): { x: number; y: number; z: number } {
  return { x: a.x.approx, y: a.y.approx, z: a.z.approx };
}
```

- [ ] **Step 4: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/__tests__/vec3s.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/vec3s.ts api/_lib/kernel/__tests__/vec3s.test.ts
git commit -m "feat(engine): Vec3S scalar vector + dot/cross/lenSq with exact propagation"
```

---

## Task 5: Entity hạng nhất + builder

**Files:**
- Create: `api/_lib/kernel/entities.ts`
- Test: `api/_lib/kernel/__tests__/entities.test.ts`

- [ ] **Step 1: Viết test đỏ**

```ts
// api/_lib/kernel/__tests__/entities.test.ts
import { describe, it, expect } from 'vitest';
import {
  pointFromCoords, lineFromTwoPoints, lineFromPointDir,
  planeFromThreePoints, planeFromPointNormal, planeFromCoeffs,
  sphereFromCenterRadius2, sphereFromCenterPoint,
} from '../entities';
import { ratVec, toApproxVec } from '../vec3s';
import { makeExact, rat } from '../scalar';

describe('builder điểm/đường', () => {
  it('pointFromCoords', () => {
    const p = pointFromCoords(ratVec(1n, 2n, 3n));
    expect(p.kind).toBe('point');
    expect(toApproxVec(p.p)).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('lineFromTwoPoints lấy chỉ phương B−A', () => {
    const l = lineFromTwoPoints(ratVec(0n, 0n, 0n), ratVec(1n, 2n, 2n));
    expect(l.kind).toBe('line');
    expect(toApproxVec(l.dir)).toEqual({ x: 1, y: 2, z: 2 });
  });

  it('lineFromPointDir', () => {
    const l = lineFromPointDir(ratVec(1n, 0n, 0n), ratVec(0n, 0n, 1n));
    expect(toApproxVec(l.p)).toEqual({ x: 1, y: 0, z: 0 });
    expect(toApproxVec(l.dir)).toEqual({ x: 0, y: 0, z: 1 });
  });
});

describe('builder mặt phẳng', () => {
  it('planeFromThreePoints: mặt z=0 có pháp tuyến ‖ (0,0,1) và d=0', () => {
    const pl = planeFromThreePoints(ratVec(0n, 0n, 0n), ratVec(1n, 0n, 0n), ratVec(0n, 1n, 0n));
    expect(pl.kind).toBe('plane');
    // pháp tuyến = AB×AC = (1,0,0)×(0,1,0) = (0,0,1)
    expect(toApproxVec(pl.n)).toEqual({ x: 0, y: 0, z: 1 });
    expect(pl.d.exact).toEqual(makeExact(0n, 1n, 1));
  });

  it('planeFromPointNormal: n·x + d = 0 với d = −n·A', () => {
    // điểm (1,1,1), pháp tuyến (2,-1,2) ⇒ d = -(2-1+2) = -3
    const pl = planeFromPointNormal(ratVec(1n, 1n, 1n), ratVec(2n, -1n, 2n));
    expect(pl.d.exact).toEqual(makeExact(-3n, 1n, 1));
  });

  it('planeFromCoeffs giữ đúng hệ số', () => {
    const pl = planeFromCoeffs(rat(2n), rat(-1n), rat(2n), rat(-3n));
    expect(toApproxVec(pl.n)).toEqual({ x: 2, y: -1, z: 2 });
    expect(pl.d.exact).toEqual(makeExact(-3n, 1n, 1));
  });
});

describe('builder mặt cầu', () => {
  it('sphereFromCenterRadius2 giữ tâm và R²', () => {
    const s = sphereFromCenterRadius2(ratVec(1n, 0n, 0n), rat(9n));
    expect(s.kind).toBe('sphere');
    expect(toApproxVec(s.center)).toEqual({ x: 1, y: 0, z: 0 });
    expect(s.r2.exact).toEqual(makeExact(9n, 1n, 1));
  });

  it('sphereFromCenterPoint tính R² = |P−tâm|²', () => {
    // tâm (0,0,0), điểm (1,2,2) ⇒ R² = 9
    const s = sphereFromCenterPoint(ratVec(0n, 0n, 0n), ratVec(1n, 2n, 2n));
    expect(s.r2.exact).toEqual(makeExact(9n, 1n, 1));
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/__tests__/entities.test.ts`
Expected: FAIL "Cannot find module '../entities'".

- [ ] **Step 3: Viết cài đặt**

```ts
// api/_lib/kernel/entities.ts
import { type Scalar, neg } from './scalar';
import { type Vec3S, subV, dotV, crossV, lenSqV } from './vec3s';

export type PointE = { kind: 'point'; p: Vec3S };
export type LineE = { kind: 'line'; p: Vec3S; dir: Vec3S };
export type PlaneE = { kind: 'plane'; n: Vec3S; d: Scalar };
export type SphereE = { kind: 'sphere'; center: Vec3S; r2: Scalar };
export type Entity = PointE | LineE | PlaneE | SphereE;

export function pointFromCoords(p: Vec3S): PointE {
  return { kind: 'point', p };
}

export function lineFromTwoPoints(a: Vec3S, b: Vec3S): LineE {
  return { kind: 'line', p: a, dir: subV(b, a) };
}

export function lineFromPointDir(p: Vec3S, dir: Vec3S): LineE {
  return { kind: 'line', p, dir };
}

// Mặt qua 3 điểm: pháp tuyến = (B−A)×(C−A), d = −n·A.
export function planeFromThreePoints(a: Vec3S, b: Vec3S, c: Vec3S): PlaneE {
  const n = crossV(subV(b, a), subV(c, a));
  const d = neg(dotV(n, a));
  return { kind: 'plane', n, d };
}

export function planeFromPointNormal(point: Vec3S, n: Vec3S): PlaneE {
  return { kind: 'plane', n, d: neg(dotV(n, point)) };
}

export function planeFromCoeffs(a: Scalar, b: Scalar, c: Scalar, d: Scalar): PlaneE {
  return { kind: 'plane', n: { x: a, y: b, z: c }, d };
}

export function sphereFromCenterRadius2(center: Vec3S, r2: Scalar): SphereE {
  return { kind: 'sphere', center, r2 };
}

export function sphereFromCenterPoint(center: Vec3S, onSphere: Vec3S): SphereE {
  return { kind: 'sphere', center, r2: lenSqV(subV(onSphere, center)) };
}
```

- [ ] **Step 4: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/__tests__/entities.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/entities.ts api/_lib/kernel/__tests__/entities.test.ts
git commit -m "feat(engine): first-class Point/Line/Plane/Sphere entities + builders"
```

---

## Task 6: `EntityTable` + cầu nối từ `SymbolTable` Phase 1

**Files:**
- Create: `api/_lib/kernel/entityTable.ts`
- Test: `api/_lib/kernel/__tests__/entityTable.test.ts`

- [ ] **Step 1: Viết test đỏ**

```ts
// api/_lib/kernel/__tests__/entityTable.test.ts
import { describe, it, expect } from 'vitest';
import { createEmptyEntityTable, symtabToEntityTable } from '../entityTable';
import { toApproxVec } from '../vec3s';
import { executePlan } from '../execute';
import { PlanSchema } from '../planSchema';

describe('createEmptyEntityTable', () => {
  it('khởi tạo rỗng đủ các map', () => {
    const et = createEmptyEntityTable();
    expect(et.points.size).toBe(0);
    expect(et.planes.size).toBe(0);
    expect(et.spheres.size).toBe(0);
    expect(et.lines.size).toBe(0);
  });
});

describe('symtabToEntityTable — cầu nối Phase 1', () => {
  it('chuyển điểm và face của một hình vuông sang entity', () => {
    const plan = PlanSchema.parse({
      solidName: 'sq',
      ops: [{ op: 'base', shape: 'square', vertices: ['A', 'B', 'C', 'D'], dims: { edge: 2 } }],
    });
    const symtab = executePlan(plan);
    const et = symtabToEntityTable(symtab);

    // 4 điểm chuyển thành PointE (approx = toạ độ float Phase 1, exact = null)
    expect(et.points.size).toBe(4);
    const A = et.points.get('A')!;
    expect(A.kind).toBe('point');
    expect(A.p.x.exact).toBeNull(); // Phase 1 float-only

    // face ABCD đăng ký một PlaneE
    expect(et.planes.has('ABCD')).toBe(true);
    const plane = et.planes.get('ABCD')!;
    expect(plane.kind).toBe('plane');
    // hình vuông nằm trong z=0 ⇒ pháp tuyến ‖ trục z
    const n = toApproxVec(plane.n);
    expect(Math.abs(n.x)).toBeCloseTo(0, 9);
    expect(Math.abs(n.y)).toBeCloseTo(0, 9);
    expect(Math.abs(n.z)).toBeGreaterThan(0);

    // lớp mesh/render kế thừa
    expect(et.faces.has('ABCD')).toBe(true);
    expect(et.edges.size).toBe(4);
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn đỏ**

Run: `npx vitest run api/_lib/kernel/__tests__/entityTable.test.ts`
Expected: FAIL "Cannot find module '../entityTable'".

- [ ] **Step 3: Viết cài đặt**

```ts
// api/_lib/kernel/entityTable.ts
import type { SymbolTable, Vec3 } from './types';
import type { PointE, LineE, PlaneE, SphereE } from './entities';
import { pointFromCoords, planeFromThreePoints } from './entities';
import { num } from './scalar';
import type { Vec3S } from './vec3s';

export type EntityTable = {
  points: Map<string, PointE>;
  lines: Map<string, LineE>;
  planes: Map<string, PlaneE>;
  spheres: Map<string, SphereE>;
  // Lớp mesh/render kế thừa Phase 1:
  faces: Map<string, string[]>;
  edges: Set<string>;
  derivedPoints: Set<string>;
};

export function createEmptyEntityTable(): EntityTable {
  return {
    points: new Map(),
    lines: new Map(),
    planes: new Map(),
    spheres: new Map(),
    faces: new Map(),
    edges: new Set(),
    derivedPoints: new Set(),
  };
}

// Vec3 float (Phase 1) → Vec3S float-only (exact = null, giữ nguyên giá trị dựng).
function floatVecToVec3S(v: Vec3): Vec3S {
  return { x: num(v.x), y: num(v.y), z: num(v.z) };
}

// Bồi thêm: dựng EntityTable từ SymbolTable đã execute của Phase 1. Điểm giữ float-only;
// mỗi face đăng ký thêm một PlaneE (qua 3 đỉnh đầu) bên cạnh lớp mesh.
export function symtabToEntityTable(symtab: SymbolTable): EntityTable {
  const et = createEmptyEntityTable();

  for (const [name, pos] of symtab.points) {
    et.points.set(name, pointFromCoords(floatVecToVec3S(pos)));
  }

  for (const [key, verts] of symtab.namedPlanes) {
    et.faces.set(key, verts);
    if (verts.length >= 3) {
      const [a, b, c] = verts.map((n) => floatVecToVec3S(symtab.points.get(n)!));
      et.planes.set(key, planeFromThreePoints(a, b, c));
    }
  }

  for (const e of symtab.edges) et.edges.add(e);
  if (symtab.derivedPoints) for (const d of symtab.derivedPoints) et.derivedPoints.add(d);

  return et;
}
```

- [ ] **Step 4: Chạy để chắc chắn xanh**

Run: `npx vitest run api/_lib/kernel/__tests__/entityTable.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/entityTable.ts api/_lib/kernel/__tests__/entityTable.test.ts
git commit -m "feat(engine): EntityTable + bridge from Phase 1 SymbolTable"
```

---

## Task 7: Kiểm chứng toàn cục — full suite + tsc + eslint

**Files:** (không tạo mới)

- [ ] **Step 1: Chạy full test suite**

Run: `npx vitest run`
Expected: PASS toàn bộ — **139 test Phase 1 cũ + các test mới** (scalar/vec3s/entities/entityTable), 0 fail. Xác nhận không hồi quy.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: không lỗi.

- [ ] **Step 3: Lint**

Run: `npx eslint api/_lib/kernel --ext .ts`
Expected: không lỗi/cảnh báo trong `api/_lib/kernel/`.

- [ ] **Step 4: Nếu tất cả xanh, commit dấu mốc**

```bash
git commit --allow-empty -m "chore(engine): G2-1 foundation complete — Scalar/Vec3S/entities/EntityTable green"
```

---

## Success criteria cho G2-1

- [ ] `Scalar` lai hoạt động: số học hữu tỷ + căn đơn, lan truyền exact khi ở trong trường, rơi về float + `exact:null` khi ra ngoài; hiển thị đúng (`3/2`, `√2`, `3√14/14`).
- [ ] `Vec3S` + dot/cross/lenSq giữ exact (ví dụ tích vô hướng của hai vector vuông góc hữu tỷ ra đúng `0`).
- [ ] Builder Point/Line/Plane/Sphere cho mọi dạng nhập trong plan này, dạng chuẩn đúng (pháp tuyến, d, R²).
- [ ] `EntityTable` + `symtabToEntityTable` dựng entity từ plan Phase 1 (điểm float-only, face → PlaneE, mesh kế thừa).
- [ ] **139 test Phase 1 vẫn xanh** (không đụng execute/verify/planSchema).
- [ ] `tsc --noEmit` và `eslint` sạch.
