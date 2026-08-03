# Khối lăng trụ (prism volume) — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline, TDD). Steps use checkbox syntax.

**Goal:** Thêm primitive thể tích khối lăng trụ (`solid:'prism'`, đáy+nắp) tính exact bằng xẻ tứ diện vào dialect oxyz, vá lỗi thể tích khối hộp/lập phương.

**Architecture:** Compute thuần trong `compute/volume.ts` (Scalar exact) → mở schema volume ở `compute/query.ts` → route case volume → ví dụ prompt để LLM phát ra → gặt golden canh giữ.

**Tech Stack:** TypeScript, Zod, vitest; số học Scalar exact (BigInt) + float chứng thực.

---

### Task 1: `computePrismVolume` + test (compute/volume.ts)

**Files:**
- Modify: `api/_lib/kernel/compute/volume.ts`
- Test: `api/_lib/kernel/compute/__tests__/volume.test.ts`

- [ ] **Step 1: Viết test thất bại** — thêm vào `volume.test.ts`:

```ts
import { computeTetraVolume, computePyramidVolume, volumeRatio, tetraVolumeScalar, computePrismVolume } from '../volume';

describe('computePrismVolume', () => {
  const box = (ax: bigint, ay: bigint, az: bigint) => {
    const base = [P(0n, 0n, 0n), P(ax, 0n, 0n), P(ax, ay, 0n), P(0n, ay, 0n)];
    const top = base.map((p) => P(p.p.x.exact!.num, p.p.y.exact!.num, az)); // dịch lên z=az
    return { base, top };
  };
  it('lập phương cạnh 3: V = 27', () => {
    const b = [P(0n, 0n, 0n), P(3n, 0n, 0n), P(3n, 3n, 0n), P(0n, 3n, 0n)];
    const t = [P(0n, 0n, 3n), P(3n, 0n, 3n), P(3n, 3n, 3n), P(0n, 3n, 3n)];
    const r = computePrismVolume(b, t);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.answer.exact).toEqual(makeExact(27n, 1n, 1)); expect(r.answer.text).toBe('27'); }
  });
  it('hộp chữ nhật 2×3×4: V = 24', () => {
    const b = [P(0n, 0n, 0n), P(2n, 0n, 0n), P(2n, 3n, 0n), P(0n, 3n, 0n)];
    const t = [P(0n, 0n, 4n), P(2n, 0n, 4n), P(2n, 3n, 4n), P(0n, 3n, 4n)];
    const r = computePrismVolume(b, t);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.answer.exact).toEqual(makeExact(24n, 1n, 1));
  });
  it('lăng trụ tam giác vuông (đáy 1/2, cao 5): V = 5/2', () => {
    const b = [P(0n, 0n, 0n), P(1n, 0n, 0n), P(0n, 1n, 0n)];
    const t = [P(0n, 0n, 5n), P(1n, 0n, 5n), P(0n, 1n, 5n)];
    const r = computePrismVolume(b, t);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.answer.exact).toEqual(makeExact(5n, 2n, 1));
  });
  it('từ chối khi số đỉnh đáy≠nắp', () => {
    const b = [P(0n, 0n, 0n), P(1n, 0n, 0n), P(0n, 1n, 0n)];
    const t = [P(0n, 0n, 5n), P(1n, 0n, 5n)];
    expect(computePrismVolume(b, t).ok).toBe(false);
  });
  it('từ chối khi nắp KHÔNG phải đáy tịnh tiến (chóp cụt)', () => {
    const b = [P(0n, 0n, 0n), P(2n, 0n, 0n), P(2n, 2n, 0n), P(0n, 2n, 0n)];
    const t = [P(0n, 0n, 3n), P(1n, 0n, 3n), P(1n, 1n, 3n), P(0n, 1n, 3n)]; // nắp nhỏ hơn
    expect(computePrismVolume(b, t).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test → FAIL** (`computePrismVolume` chưa tồn tại).

Run: `npx vitest run api/_lib/kernel/compute/__tests__/volume.test.ts`
Expected: FAIL "computePrismVolume is not a function / not exported".

- [ ] **Step 3: Cài đặt** — thêm vào `compute/volume.ts` (sau `fPyramid`/`computePyramidVolume`):

```ts
// ×6 tổng thể tích có dấu của lăng trụ: xẻ đáy thành quạt tam giác, mỗi tam giác = 3 tứ diện.
export function prismVolumeScalar(base: PointE[], top: PointE[]): Scalar {
  let sum = rat(0n);
  for (let i = 1; i < base.length - 1; i++) {
    const b0 = base[0].p, bi = base[i].p, bj = base[i + 1].p;
    const t0 = top[0].p, ti = top[i].p, tj = top[i + 1].p;
    sum = add(sum, tripleScalar(b0, bi, bj, t0));
    sum = add(sum, tripleScalar(bi, bj, t0, ti));
    sum = add(sum, tripleScalar(bj, t0, ti, tj));
  }
  return div(absS(sum), rat(6n));
}

function fPrism(base: Vec3[], top: Vec3[]): number {
  let s = 0;
  for (let i = 1; i < base.length - 1; i++) {
    s += scalarTriple(sub(base[i], base[0]), sub(base[i + 1], base[0]), sub(top[0], base[0]));
    s += scalarTriple(sub(base[i + 1], base[i]), sub(top[0], base[i]), sub(top[i], base[i]));
    s += scalarTriple(sub(top[0], base[i + 1]), sub(top[i], base[i + 1]), sub(top[i + 1], base[i + 1]));
  }
  return Math.abs(s) / 6;
}

// Nắp phải là đáy TỊNH TIẾN: mọi top[i]−base[i] phải bằng nhau. Nếu không → không phải lăng trụ.
function translationMismatch(base: PointE[], top: PointE[]): string | null {
  const v0 = subV(top[0].p, base[0].p);
  for (let i = 1; i < base.length; i++) {
    const d = subV(subV(top[i].p, base[i].p), v0);
    if (!(isZeroS(d.x) && isZeroS(d.y) && isZeroS(d.z)))
      return 'prism: top face is not a parallel translate of the base (not a prism)';
  }
  return null;
}

export function computePrismVolume(base: PointE[], top: PointE[]): ComputeOutcome<ScalarAnswer> {
  if (base.length < 3) return { ok: false, problem: 'prism base needs at least 3 vertices' };
  if (top.length !== base.length) return { ok: false, problem: 'prism: base and top must have the same number of vertices' };
  const cpB = coplanarityProblem(base.map((p) => p.p), 'prism base');
  if (cpB) return { ok: false, problem: cpB };
  const cpT = coplanarityProblem(top.map((p) => p.p), 'prism top');
  if (cpT) return { ok: false, problem: cpT };
  const mism = translationMismatch(base, top);
  if (mism) return { ok: false, problem: mism };
  const floatRef = fPrism(base.map((p) => av(p.p)), top.map((p) => av(p.p)));
  return { ok: true, answer: certifyScalar('volume', prismVolumeScalar(base, top), floatRef) };
}
```

Ghi chú import: `subV`, `isZeroS`, `coplanarityProblem`, `certifyScalar`, `sub` (vecMath), `scalarTriple`, `av` đều đã import sẵn ở đầu file.

- [ ] **Step 4: Chạy test → PASS.** Run: `npx vitest run api/_lib/kernel/compute/__tests__/volume.test.ts` → 8/8 pass.

- [ ] **Step 5: Commit** (gộp với Task 2 để 1 commit engine-hoàn-chỉnh — xem Task 2 Step 4).

---

### Task 2: Mở schema + route trong query.ts

**Files:**
- Modify: `api/_lib/kernel/compute/query.ts`

- [ ] **Step 1:** Thêm import `computePrismVolume` ở dòng import volume:

```ts
import { computeTetraVolume, computePyramidVolume, computePrismVolume, volumeRatio, computeSphereVolume } from './volume';
```

- [ ] **Step 2:** Thêm biến thể prism vào `QueryESchema` (ngay sau dòng volume pyramid/tetra):

```ts
  z.object({ kind: z.literal('volume'), solid: z.literal('prism'), base: z.array(Tok).min(3), top: z.array(Tok).min(3) }),
```

- [ ] **Step 3:** Trong `computeQuery`, case `'volume'`, chèn nhánh prism TRƯỚC `const pts = asPoints(query.points, et)`:

```ts
      case 'volume': {
        if (query.solid === 'sphere') {
          const e = resolveEntityE(query.target, et);
          if (e.kind !== 'sphere') return { ok: false, problem: 'volume(sphere) needs a sphere' };
          return { ok: true, answer: computeSphereVolume(e) };
        }
        if (query.solid === 'prism') {
          return computePrismVolume(asPoints(query.base, et), asPoints(query.top, et));
        }
        const pts = asPoints(query.points, et);
        ...
      }
```

- [ ] **Step 4: Chạy toàn bộ test suite → xanh.**

Run: `npx vitest run`
Expected: tất cả xanh (đã +5 test prism).

- [ ] **Step 5: build:kernel + commit** (gộp Task 1+2):

```bash
npm run build:kernel
git add api/_lib/kernel/compute/volume.ts api/_lib/kernel/compute/query.ts api/_lib/kernel/compute/__tests__/volume.test.ts api/_lib/kernel-dist/index.mjs
git commit -F <utf8 message file>
```

---

### Task 3: Ví dụ prism trong prompt (translatorPrompt.js)

**Files:**
- Modify: `api/_lib/kernel-bridge/translatorPrompt.js`

- [ ] **Step 1:** Thêm dòng ví dụ ở mục QUERIES (sau dòng 116 "Thể tích khối cầu"):

```
- Thể tích khối lăng trụ / hình hộp / lập phương: { "kind": "volume", "solid": "prism", "base": ["A","B","C","D"], "top": ["A1","B1","C1","D1"] }
  (base = các đỉnh MẶT ĐÁY theo thứ tự vòng; top = các đỉnh MẶT NẮP THEO ĐÚNG THỨ TỰ tương ứng. Nắp = đáy tịnh tiến.)
```

- [ ] **Step 2:** Bổ sung mẹo toạ-độ-hoá (mục NGUYÊN TẮC TOẠ-ĐỘ-HOÁ): "Hình hộp/lăng trụ: đặt đáy trong z=0, nắp z=h; KHÔNG xẻ khối thành nhiều chóp — dùng solid:'prism'."

- [ ] **Step 3: Commit** (prompt không đụng kernel, commit riêng hoặc gộp Task 4).

---

### Task 4: Gặt golden lập phương/hộp/lăng trụ vào rổ

**Files:**
- Create: `bench/golden/cap-vol-lap-phuong-3.json`, `cap-vol-hop-2x3x4.json`, `cap-vol-lang-tru-tamgiac-vuong-*.json`
- Modify: `bench/seed-problems.json`, `bench/golden/README.md`

- [ ] **Step 1:** Thêm 3 seed vào `bench/seed-problems.json` (lập phương cạnh 3 → 27; hộp 2×3×4 → 24; 1 lăng trụ nữa).
- [ ] **Step 2:** Chạy capture (engine + prompt đã sống nhờ build:kernel Task 2):

```bash
node scripts/bench-capture.mjs --seed bench/seed-problems.json --env "F:/geo3dnew/geo3d/.env.local" --dry
```

- [ ] **Step 3:** SOI TAY bảng — chỉ giữ ca engine trả ĐÚNG số đã tính tay (27, 24, ...). Nếu prism route chưa được LLM chọn (vẫn 9,9,9/8), quay lại chỉnh prompt Task 3.
- [ ] **Step 4:** Ghi golden thật (bỏ `--dry`, `--out bench/golden`), cập nhật README (chuyển 2 lỗi khỏi mục "ứng viên Tầng 2" sang "đã vá").
- [ ] **Step 5: bench:gate xanh:** `npm run bench:gate` → PASS toàn rổ.
- [ ] **Step 6: Commit** golden + seed + README + prompt.

---

### Task 5: Đóng gói & deploy
- [ ] `npx vitest run` toàn bộ xanh; `npm run build` xanh.
- [ ] Xác nhận `git status` chỉ có file chủ đích (kernel-dist chỉ đổi nếu kernel source đổi).
- [ ] `git push origin HEAD:main`.
- [ ] Verify Vercel qua `Invoke-RestMethod` `.../commits/<sha>/status` → `.state == success`.
- [ ] Cập nhật memory `self-improve-loop-instrumentation.md` + `MEMORY.md`.
