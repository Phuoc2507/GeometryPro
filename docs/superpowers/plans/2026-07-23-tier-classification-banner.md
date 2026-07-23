# Tiểu-dự án B — Ống phân loại 3 mức + banner dạng bài — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến xác thực nhị phân `verified` thành mô hình 3 mức an toàn, hiện cho giáo viên qua banner "dạng bài · mức", render lời chưa-chứng-thực/từ-chối, và gom badge về một nguồn — **KHÔNG đụng kernel, KHÔNG đụng translator** (Nhịp 1).

**Architecture:** Một classifier thuần server-side (`classifyTier`) neo vào `engineSolved` sẵn có, gắn `tier` tại `solveProblem` (một nguồn sự thật). Cả hai route (draw/solve) thừa hưởng cùng object `{ level, exactness, problemType, reason }`. Frontend map mức → nhãn/màu qua một module `safetyTier.ts`; banner giáo viên mount ở `<aside>` desktop (teacher-only ≥1024px).

**Tech Stack:** Node ESM (api routes), Vite + React + TypeScript, Zod (schema engine đã có), Vitest (`environment: node`, KHÔNG có testing-library).

**Worktree thực thi:** `F:/geo3dnew/geo3d/.claude/worktrees/tier-classification` — branch `claude/tier-classification` (tách từ `origin/main` tại `1849492`). Mọi lệnh git/test/build chạy TẠI worktree này.

**Spec nguồn:** [`docs/superpowers/specs/2026-07-23-tier-classification-banner-design.md`](../specs/2026-07-23-tier-classification-banner-design.md) — bản đã qua review đối kháng, chốt Option A.

**Bất biến tối thượng:** `level === 1 ⟺ engineSolved(result) === true`. B chỉ *làm hiện rõ* `verified` sẵn có, không nới/siết. Góc / phương trình / vị trí tương đối / giao / THANG-CHỮ → **Mức 3 `unsolved` trung tính** (= status quo, không hồi quy).

---

## Cấu trúc file

**TẠO (server):**
- `api/_lib/kernel-bridge/classifyTier.js` — classifier thuần: `classifyTier(result)` + `tierFromThrow(err)` + bảng nhãn dạng bài. Chỉ import `engineSolved` (không import kernel-dist ⇒ test siêu nhẹ).
- `api/_lib/__tests__/classifyTier.test.js` — unit test thuần cho classifier (khớp glob `api/_lib/__tests__/**/*.test.js`).
- `api/_lib/__tests__/solveProblemTier.test.js` — test wiring: mock `callVilao`, khẳng định nhánh khước từ/lỗi trả `tier` Mức 3.

**TẠO (frontend):**
- `src/lib/safetyTier.ts` — nguồn duy nhất: type `SafetyClassification`, `safetyTierMeta(level)`, `verifiedToLevel(verified)`, `exactnessLabel(e)`.
- `src/lib/safetyTier.test.ts` — unit test mapping (khớp glob `src/**/*.test.ts`).
- `src/components/layout/TierBanner.tsx` — banner giáo viên (đọc `classification`, tự ẩn khi vắng).

**SỬA (server):**
- `api/_lib/kernel-bridge/solveWithKernel.js` — bọc `planFromProblem` try/catch → Mức 3; `result.tier = classifyTier(result)`; re-stamp tier ở early-return crosscheck.
- `api/solve.js` — tính `tier` và trả kèm.
- `api/analyze-geometry.js` — stamp `geometry.classification` ở nhánh engine phục vụ; hoist `engineClassification` sang LLM fallback.

**SỬA (frontend):**
- `src/types/geometry.ts` — thêm `GeometryData.classification`.
- `src/hooks/useSolver.ts` — thêm `SolveResult.tier` + map `tier: data.tier ?? null`.
- `src/components/SolverPanel.tsx` — badge + khối lý do Mức 3 qua `safetyTier`.
- `src/components/layout/AdvanceStepper.tsx` — badge qua `safetyTier` (map `verified`→level).
- `src/components/layout/RightPanel.tsx` — mount `<TierBanner/>` trong `<aside>` desktop.

**KHÔNG sửa:** `api/_lib/solveAssemble.js` (đóng băng — `tier` gắn ở `solve.js`); `src/context/GeometryContext.tsx` (classification lồng, tự sống sót qua spread).

---

## Task 1: Classifier thuần `classifyTier.js` (+ test)

**Files:**
- Create: `api/_lib/kernel-bridge/classifyTier.js`
- Test: `api/_lib/__tests__/classifyTier.test.js`

- [ ] **Step 1: Viết test thất bại**

Tạo `api/_lib/__tests__/classifyTier.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { classifyTier, tierFromThrow } from '../kernel-bridge/classifyTier.js';
import { engineSolved } from '../solveAssemble.js';

// Fixtures: `result` như solveProblem tạo (đã jsonSafe ⇒ exact là object/null, KHÔNG BigInt).
const distExact = {
  plan: { queries: [{ kind: 'distance', a: 'A', b: 'B' }] },
  ok: true,
  answers: [{ kind: 'distance', exact: { num: '1', den: '1', radicand: 3 }, approx: 1.7320508, text: '√3', approximate: false }],
  violations: [], errors: [], trace: [],
};
const distNumeric = {
  plan: { queries: [{ kind: 'distance', a: 'A', b: 'B' }] },
  ok: true,
  answers: [{ kind: 'distance', exact: null, approx: 1.4142, text: '1.4142', approximate: true }],
  violations: [], errors: [], trace: [],
};
const analysisNumeric = {
  plan: { analyze: { kind: 'optimize', parameter: 'x' } },
  ok: true,
  parameter: { name: 'x', value: 2 },
  answers: [{ kind: 'kết quả', approx: 7.49, text: '7,49', approximate: false }], // KHÔNG có field `exact`
  violations: [], errors: [],
};
const angleUnsolved = {
  plan: { queries: [{ kind: 'angle', a: 'A', b: 'B' }] },
  ok: true,
  answers: [{ kind: 'angle', degrees: 60, exactDegrees: 60, exactCos: null, text: '60°', approximate: false }], // KHÔNG approx
  violations: [], errors: [], trace: [],
};
const scaleSymbolUnsolved = {
  plan: { queries: [{ kind: 'distance', a: 'A', b: 'B' }], scaleSymbol: 'a' },
  ok: true,
  answers: [{ kind: 'distance', exact: { num: '1', den: '1', radicand: 3 }, approx: null, text: 'a·√3', approximate: false, scaleSymbol: 'a', scaleExp: 1 }],
  violations: [], errors: [],
};
const violated = {
  plan: { queries: [{ kind: 'volume', solid: 'pyramid', points: ['A', 'B', 'C'], apex: 'D' }] },
  ok: false, answers: [], violations: [{ message: 'pyramid vertices are not coplanar' }], errors: [],
};
const errored = {
  plan: { queries: [{ kind: 'distance', a: 'A', b: 'B' }] },
  ok: false, answers: [], violations: [], errors: [{ message: 'execute failed: unknown point' }],
};
const representative = {
  representative: true,
  plan: { queries: [{ kind: 'distance', a: 'A', b: 'B' }] },
  ok: true, answers: [{ kind: 'distance', exact: null, approx: 5, text: '5', approximate: true }], violations: [], errors: [],
};

describe('classifyTier — trục an toàn', () => {
  it('Mức 1 exact (hình học, exact != null, approximate=false)', () => {
    const t = classifyTier(distExact);
    expect(t.level).toBe(1);
    expect(t.exactness).toBe('exact');
    expect(t.problemType).toBe('Khoảng cách');
    expect(t.reason).toBeNull();
  });
  it('Mức 1 numeric (hình học approximate=true)', () => {
    expect(classifyTier(distNumeric).exactness).toBe('numeric');
    expect(classifyTier(distNumeric).level).toBe(1);
  });
  it('Mức 1 numeric (phân tích — chống bẫy undefined != null)', () => {
    const t = classifyTier(analysisNumeric);
    expect(t.level).toBe(1);
    expect(t.exactness).toBe('numeric'); // KHÔNG được là 'exact' dù answers[0].exact là undefined
    expect(t.problemType).toBe('Cực trị');
  });
  it('Mức 3 unsolved — góc (không approx)', () => {
    const t = classifyTier(angleUnsolved);
    expect(t.level).toBe(3);
    expect(t.reason.kind).toBe('unsolved');
    expect(t.problemType).toBe('Góc');
    expect(t.exactness).toBeNull();
  });
  it('Mức 3 unsolved — THANG CHỮ (approx=null)', () => {
    const t = classifyTier(scaleSymbolUnsolved);
    expect(t.level).toBe(3);
    expect(t.reason.kind).toBe('unsolved');
  });
  it('Mức 3 violation', () => {
    const t = classifyTier(violated);
    expect(t.level).toBe(3);
    expect(t.reason.kind).toBe('violation');
    expect(t.reason.message).toContain('coplanar');
  });
  it('Mức 3 error', () => {
    const t = classifyTier(errored);
    expect(t.level).toBe(3);
    expect(t.reason.kind).toBe('error');
  });
  it('Mức 2 representative (thắng cả engineSolved)', () => {
    const t = classifyTier(representative);
    expect(t.level).toBe(2);
    expect(t.exactness).toBeNull();
  });
});

describe('classifyTier — problemType', () => {
  it('volume_ratio → Tỉ số thể tích', () => {
    expect(classifyTier({ plan: { queries: [{ kind: 'volume_ratio' }] }, ok: false, answers: [], violations: [], errors: [] }).problemType).toBe('Tỉ số thể tích');
  });
  it('analyze integrate → Tích phân', () => {
    expect(classifyTier({ plan: { analyze: { kind: 'integrate' } }, ok: false, answers: [], violations: [], errors: [] }).problemType).toBe('Tích phân');
  });
  it('vắng/lạ → Khác', () => {
    expect(classifyTier({ plan: {}, ok: false, answers: [], violations: [], errors: [] }).problemType).toBe('Khác');
    expect(classifyTier({ plan: null, ok: false, answers: [], violations: [], errors: [] }).problemType).toBe('Khác');
  });
  it('problemKind của translator (Nhịp 2) được ưu tiên', () => {
    expect(classifyTier({ plan: { problemKind: 'Khoảng cách điểm–mặt', queries: [{ kind: 'distance' }] }, ok: false, answers: [], violations: [], errors: [] }).problemType).toBe('Khoảng cách điểm–mặt');
  });
});

describe('classifyTier — bất biến level 1 ⟺ engineSolved', () => {
  it('khớp trên mọi fixture', () => {
    for (const r of [distExact, distNumeric, analysisNumeric, angleUnsolved, scaleSymbolUnsolved, violated, errored]) {
      expect(classifyTier(r).level === 1).toBe(engineSolved(r) === true);
    }
  });
});

describe('tierFromThrow', () => {
  it('abstain → kind=abstain, giữ message', () => {
    const t = tierFromThrow(new Error('translator abstained: thiếu số liệu / ngoài danh mục'));
    expect(t.level).toBe(3);
    expect(t.reason.kind).toBe('abstain');
    expect(t.reason.message).toContain('thiếu số liệu');
  });
  it('non-JSON → kind=error', () => {
    expect(tierFromThrow(new Error('Translator returned non-JSON output')).reason.kind).toBe('error');
  });
  it('schema fail → kind=error', () => {
    expect(tierFromThrow(new Error('Translator plan failed schema: invalid')).reason.kind).toBe('error');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `cd F:/geo3dnew/geo3d/.claude/worktrees/tier-classification && npx vitest run api/_lib/__tests__/classifyTier.test.js`
Expected: FAIL — không import được `../kernel-bridge/classifyTier.js` (chưa tồn tại).

- [ ] **Step 3: Viết implementation tối thiểu**

Tạo `api/_lib/kernel-bridge/classifyTier.js`:

```js
// api/_lib/kernel-bridge/classifyTier.js
// Phân loại 3 MỨC AN TOÀN (tách khỏi tier GÓI CƯỚC). Neo TUYỆT ĐỐI vào engineSolved:
// level 1 ⟺ engineSolved(result). Module THUẦN — chỉ import engineSolved (không kéo kernel-dist)
// ⇒ test siêu nhẹ, không cần build engine.
import { engineSolved } from '../solveAssemble.js';

// Query hình học (RunPlan.queries[].kind) → nhãn tiếng Việt.
const QUERY_LABEL = {
  distance: 'Khoảng cách', angle: 'Góc', volume: 'Thể tích', area: 'Diện tích',
  equation: 'Phương trình', relative_position: 'Vị trí tương đối', intersection: 'Giao',
  point_coord: 'Toạ độ điểm', sphere_metric: 'Mặt cầu', volume_ratio: 'Tỉ số thể tích',
};
// Analyze (AnalysisPlan.analyze.kind) → nhãn.
const ANALYZE_LABEL = {
  optimize: 'Cực trị', optimize_multi: 'Cực trị', integrate: 'Tích phân',
  solve: 'Giải phương trình', solve_multi: 'Giải phương trình', eval: 'Tính giá trị',
};

// Nhãn dạng bài — TẤT ĐỊNH từ plan (KHÔNG đụng translator ở Nhịp 1). Nhịp 2: translator có thể
// xuất `plan.problemKind` (câu-chữ theo đề) ⇒ ưu tiên; field này DORMANT ở Nhịp 1 (luôn undefined).
function problemTypeOf(plan) {
  if (plan && typeof plan.problemKind === 'string' && plan.problemKind.trim()) return plan.problemKind.trim();
  const qk = plan && plan.queries && plan.queries[0] && plan.queries[0].kind;
  if (qk && QUERY_LABEL[qk]) return QUERY_LABEL[qk];
  const ak = plan && plan.analyze && plan.analyze.kind;
  if (ak && ANALYZE_LABEL[ak]) return ANALYZE_LABEL[ak];
  return 'Khác';
}

// Trục CHÍNH XÁC — CHỈ gọi khi đã engineSolved (Mức 1) ⇒ answers[0].approx hữu hạn.
// GATE 'parameter' in result TRƯỚC: nhánh phân tích KHÔNG có field `exact` ⇒ answers[0].exact là
// undefined ⇒ `undefined != null` là TRUE (bẫy!). Không gate sẽ dán nhầm 'exact' cho đáp số.
function exactnessOf(result) {
  if ('parameter' in result) return 'numeric';
  const a = result.answers[0];
  return a && a.exact != null && a.approximate === false ? 'exact' : 'numeric';
}

// Lấy message an toàn từ phần tử violation/error (có thể là {message} hoặc chuỗi).
function msgOf(x, fallback) {
  if (x == null) return fallback;
  if (typeof x === 'string') return x;
  return (typeof x.message === 'string' && x.message) || fallback;
}

export function classifyTier(result) {
  const plan = result && result.plan;
  const problemType = problemTypeOf(plan);

  // Thứ tự: representative → engineSolved → còn lại.
  if (result && result.representative === true) {
    return { level: 2, exactness: null, problemType, reason: null };
  }
  if (engineSolved(result)) {
    return { level: 1, exactness: exactnessOf(result), problemType, reason: null };
  }
  let reason;
  if (result && result.violations && result.violations.length) {
    reason = { kind: 'violation', message: msgOf(result.violations[0], 'Vi phạm giả thiết của đề.') };
  } else if (result && result.errors && result.errors.length) {
    reason = { kind: 'error', message: msgOf(result.errors[0], 'Lỗi tính toán.') };
  } else {
    reason = { kind: 'unsolved', message: 'Engine chưa chứng thực đáp số dạng này — đang hiện lời giải AI, CHƯA kiểm chứng.' };
  }
  return { level: 3, exactness: null, problemType, reason };
}

// Ánh xạ một lỗi NÉM từ planFromProblem (abstain / non-JSON / sai schema) → object tier Mức 3.
// Dùng ở solveProblem (catch), analyze-geometry (catch), solve.js (catch). Thuần ⇒ test được.
export function tierFromThrow(err) {
  const message = err && err.message ? String(err.message) : 'Lỗi dịch đề.';
  const kind = /abstain/i.test(message) ? 'abstain' : 'error';
  return { level: 3, exactness: null, problemType: 'Khác', reason: { kind, message } };
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npx vitest run api/_lib/__tests__/classifyTier.test.js`
Expected: PASS toàn bộ (14 test).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel-bridge/classifyTier.js api/_lib/__tests__/classifyTier.test.js
git commit -m "feat(B): classifyTier — phân loại 3 mức an toàn thuần (neo engineSolved)"
```

---

## Task 2: Gắn `tier` vào `solveProblem` (+ test wiring)

**Files:**
- Modify: `api/_lib/kernel-bridge/solveWithKernel.js:119-142` (hàm `solveProblem`) + thêm import
- Test: `api/_lib/__tests__/solveProblemTier.test.js`

- [ ] **Step 1: Viết test thất bại**

Tạo `api/_lib/__tests__/solveProblemTier.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock callVilao (bước LLM DUY NHẤT) ⇒ deterministic, không mạng. Engine thật (kernel-dist) vẫn nạp.
vi.mock('../vilao.js', () => ({ callVilao: vi.fn() }));

import { callVilao } from '../vilao.js';
import { solveProblem } from '../kernel-bridge/solveWithKernel.js';

describe('solveProblem — gắn tier ở nhánh khước từ/lỗi (không nổ exception)', () => {
  beforeEach(() => vi.mocked(callVilao).mockReset());

  it('translator abstain → Mức 3, reason.kind=abstain, giữ lý do', async () => {
    vi.mocked(callVilao).mockResolvedValue('{"abstain": true, "abstain_reason": "thiếu số liệu"}');
    const r = await solveProblem('Một bài thiếu số liệu để giải.');
    expect(r.ok).toBe(false);
    expect(r.tier).toBeTruthy();
    expect(r.tier.level).toBe(3);
    expect(r.tier.reason.kind).toBe('abstain');
    expect(r.tier.reason.message).toContain('thiếu số liệu');
  });

  it('non-JSON → Mức 3, reason.kind=error', async () => {
    vi.mocked(callVilao).mockResolvedValue('xin chào, đây không phải JSON');
    const r = await solveProblem('Một đề bất kỳ.');
    expect(r.tier.level).toBe(3);
    expect(r.tier.reason.kind).toBe('error');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `npx vitest run api/_lib/__tests__/solveProblemTier.test.js`
Expected: FAIL — `r.tier` là `undefined` (solveProblem hiện NÉM ở abstain, chưa trả object có tier). Test đầu ném/không có tier.

- [ ] **Step 3: Sửa `solveWithKernel.js`**

3a. Thêm import (ngay sau dòng `import { answersAgree } from '../answerCompare.js';` — hiện là dòng 7):

```js
import { classifyTier, tierFromThrow } from './classifyTier.js';
```

3b. Thay TRỌN hàm `solveProblem` (dòng 119-142 hiện tại) bằng:

```js
export async function solveProblem(problem, options = {}) {
  // Khước từ dịch (abstain / non-JSON / sai schema) TRẢ object Mức-3 có tier, thay vì để exception
  // nổ. Route caller vẫn rơi về LLM fallback — nay có `tier` để render lời giải thích trung thực.
  let plan;
  try {
    plan = await planFromProblem(problem, options);
  } catch (e) {
    return {
      plan: null, ok: false, geometry: null, answers: [], violations: [],
      errors: [{ message: e && e.message ? e.message : 'lỗi dịch' }],
      tier: tierFromThrow(e),
    };
  }

  const result = { plan, ...solvePlan(plan) };
  result.tier = classifyTier(result); // MỘT nguồn sự thật; draw/solve thừa hưởng object này.

  // A1 — ĐỐI CHIẾU 2 ĐƯỜNG (gated qua env KERNEL_CROSSCHECK='on'; mặc định TẮT ⇒ không tốn thêm).
  if (String(process.env.KERNEL_CROSSCHECK || '').trim() === 'on' && result.ok && result.answers?.length) {
    try {
      const r2 = solvePlan(await planFromProblem(problem, options));
      const a1text = result.answers[0]?.text;
      const a2num = r2.answers?.[0]?.approx;
      const agree = a2num != null && Number.isFinite(a2num) ? answersAgree(a1text, a2num, 1e-3) : null;
      if (agree === false) {
        const disagreed = {
          ...result, ok: false, crossCheck: 'disagree',
          errors: [...(result.errors || []), { message: `cross-check lệch: "${a1text}" vs "${r2.answers?.[0]?.text}"` }],
        };
        disagreed.tier = classifyTier(disagreed); // ok flip false ⇒ tier phải tính lại (không stale).
        return disagreed;
      }
      result.crossCheck = agree === true ? 'agree' : 'unverified';
    } catch { /* lỗi khi đối chiếu ⇒ giữ kết quả gốc, không chặn */ }
  }
  return result;
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npx vitest run api/_lib/__tests__/solveProblemTier.test.js`
Expected: PASS (2 test).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel-bridge/solveWithKernel.js api/_lib/__tests__/solveProblemTier.test.js
git commit -m "feat(B): solveProblem gắn tier — khước từ/lỗi trả Mức 3 thay vì nổ exception"
```

---

## Task 3: `safetyTier.ts` — nguồn nhãn/mức frontend (+ test)

**Files:**
- Create: `src/lib/safetyTier.ts`
- Test: `src/lib/safetyTier.test.ts`

- [ ] **Step 1: Viết test thất bại**

Tạo `src/lib/safetyTier.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { safetyTierMeta, verifiedToLevel, exactnessLabel } from './safetyTier';

describe('safetyTier', () => {
  it('Mức 1 = tone ok, nhãn "Đã kiểm chứng"', () => {
    expect(safetyTierMeta(1).tone).toBe('ok');
    expect(safetyTierMeta(1).label).toBe('Đã kiểm chứng');
  });
  it('Mức 2 = tone muted, nhãn minh hoạ', () => {
    expect(safetyTierMeta(2).tone).toBe('muted');
    expect(safetyTierMeta(2).label).toContain('Minh hoạ');
  });
  it('Mức 3 = tone info (KHÔNG đỏ/hù dọa)', () => {
    expect(safetyTierMeta(3).tone).toBe('info');
  });
  it('verifiedToLevel: true→1, false→3', () => {
    expect(verifiedToLevel(true)).toBe(1);
    expect(verifiedToLevel(false)).toBe(3);
  });
  it('exactnessLabel', () => {
    expect(exactnessLabel('exact')).toBe('chính xác');
    expect(exactnessLabel('numeric')).toBe('giá trị số');
    expect(exactnessLabel(null)).toBe('');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `npx vitest run src/lib/safetyTier.test.ts`
Expected: FAIL — không import được `./safetyTier`.

- [ ] **Step 3: Viết implementation**

Tạo `src/lib/safetyTier.ts`:

```ts
import { CheckCircle2, Info, Layers, type LucideIcon } from 'lucide-react';

export type SafetyLevel = 1 | 2 | 3;
export type Exactness = 'exact' | 'numeric' | null;

// Object phân loại — CÙNG shape ở geometry.classification và SolveResult.tier (một nguồn).
export interface SafetyClassification {
  level: SafetyLevel;
  exactness: Exactness;
  problemType: string;
  reason?: { kind: string; message: string } | null;
}

export interface SafetyTierMeta {
  level: SafetyLevel;
  label: string;
  tone: 'ok' | 'muted' | 'info';
  icon: LucideIcon;
  badgeClass: string;   // pill cho badge học sinh
  bannerClass: string;  // nền dải banner giáo viên
  description: string;  // dòng phụ dưới đáp số
}

export function safetyTierMeta(level: SafetyLevel): SafetyTierMeta {
  switch (level) {
    case 1:
      return {
        level: 1, label: 'Đã kiểm chứng', tone: 'ok', icon: CheckCircle2,
        badgeClass: 'bg-green-500/15 text-green-600 dark:text-green-400',
        bannerClass: 'bg-green-500/5',
        description: 'Đã được ứng dụng kiểm chứng',
      };
    case 2:
      return {
        level: 2, label: 'Minh hoạ đại diện', tone: 'muted', icon: Layers,
        badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
        bannerClass: 'bg-blue-500/5',
        description: 'Chỉ đúng ở hình minh hoạ này',
      };
    default:
      return {
        level: 3, label: 'Chưa chứng thực', tone: 'info', icon: Info,
        badgeClass: 'bg-secondary text-muted-foreground',
        bannerClass: '',
        description: 'Ứng dụng chưa kiểm chứng kết quả này',
      };
  }
}

// Khi chỉ có boolean `verified` (badge học sinh, chưa có tier server) → map về mức.
export function verifiedToLevel(verified: boolean): SafetyLevel {
  return verified ? 1 : 3;
}

export function exactnessLabel(e: Exactness): string {
  return e === 'exact' ? 'chính xác' : e === 'numeric' ? 'giá trị số' : '';
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npx vitest run src/lib/safetyTier.test.ts`
Expected: PASS (5 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/safetyTier.ts src/lib/safetyTier.test.ts
git commit -m "feat(B): safetyTier — nguồn nhãn/màu/mức frontend + verifiedToLevel"
```

---

## Task 4: Kiểu — `GeometryData.classification` + `SolveResult.tier`

**Files:**
- Modify: `src/types/geometry.ts` (interface `GeometryData`, quanh dòng 236)
- Modify: `src/hooks/useSolver.ts` (interface `SolveResult` dòng 26-32; map dòng 72-78)

- [ ] **Step 1: Thêm import + field vào `GeometryData`**

Trong `src/types/geometry.ts`, thêm import ở đầu file (sau các import hiện có, hoặc thêm dòng mới trên cùng nếu chưa có import):

```ts
import type { SafetyClassification } from '@/lib/safetyTier';
```

Trong interface `GeometryData`, ngay sau dòng `confidence?: number;` (dòng 236) thêm:

```ts
  /** Phân loại 3 mức an toàn (B): mức + chính xác + dạng bài + lý do. Lồng ⇒ tự sống sót qua spread. */
  classification?: SafetyClassification;
```

- [ ] **Step 2: Thêm field vào `SolveResult` + map**

Trong `src/hooks/useSolver.ts`, thêm import (sau dòng `import type { ConstructSpec } from '@/lib/solveReveal';`):

```ts
import type { SafetyClassification } from '@/lib/safetyTier';
```

Trong interface `SolveResult` (dòng 26-32), sau `verify_error: string | null;` thêm:

```ts
  /** Phân loại 3 mức từ server (B). Vắng (lời giải cũ) ⇒ UI fallback theo `verified`. */
  tier?: SafetyClassification | null;
```

Trong `setResult({...})` (dòng 72-78), sau dòng `verify_error: data.verify_error ?? null,` thêm:

```ts
        tier:         data.tier         ?? null,
```

- [ ] **Step 3: Kiểm biên dịch**

Run: `npx tsc --noEmit`
Expected: KHÔNG lỗi mới liên quan `SafetyClassification`/`classification`/`tier`. (Lưu ý: tsc KHÔNG phải cổng build; chỉ dùng để bắt lỗi kiểu sớm. Nếu có lỗi cũ không liên quan, bỏ qua.)

- [ ] **Step 4: Commit**

```bash
git add src/types/geometry.ts src/hooks/useSolver.ts
git commit -m "feat(B): kiểu — GeometryData.classification + SolveResult.tier (additive)"
```

---

## Task 5: `solve.js` — tính và trả `tier`

**Files:**
- Modify: `api/solve.js` (import; dòng 64-76; dòng 103-104)

- [ ] **Step 1: Thêm import**

Trong `api/solve.js`, sau dòng `import { parseSolveResponse } from './_lib/solveCore.js';` (dòng 6) thêm:

```js
import { tierFromThrow } from './_lib/kernel-bridge/classifyTier.js';
```

- [ ] **Step 2: Khai `engTier` và set trong catch**

Thay khối dòng 64-76 hiện tại:

```js
  let eng = null;
  const ea = geometry.engineAnswer;
  if (ea && typeof ea.approx === 'number' && Number.isFinite(ea.approx)) {
    // Tái dùng đáp engine từ bước VẼ — KHÔNG chạy engine lại (bỏ dịch+giải trùng)
    eng = { ok: !!ea.verified, answers: [{ text: ea.text, approx: ea.approx }], violations: [] };
  } else {
    try {
      const { solveProblem } = await import('./_lib/kernel-bridge/solveWithKernel.js');
      eng = await solveProblem(problem.trim());
    } catch (e) {
      console.warn('[solve] engine không giải được, dùng lời giải LLM:', e?.message || e);
    }
  }
```

bằng:

```js
  let eng = null;
  let engTier = null; // tier khi solveProblem NÉM (hiếm: import kernel-dist hỏng / runAny nổ bất ngờ).
  const ea = geometry.engineAnswer;
  if (ea && typeof ea.approx === 'number' && Number.isFinite(ea.approx)) {
    // Tái dùng đáp engine từ bước VẼ — KHÔNG chạy engine lại (bỏ dịch+giải trùng)
    eng = { ok: !!ea.verified, answers: [{ text: ea.text, approx: ea.approx }], violations: [] };
  } else {
    try {
      const { solveProblem } = await import('./_lib/kernel-bridge/solveWithKernel.js');
      eng = await solveProblem(problem.trim());
    } catch (e) {
      console.warn('[solve] engine không giải được, dùng lời giải LLM:', e?.message || e);
      engTier = tierFromThrow(e);
    }
  }
```

- [ ] **Step 3: Tính `tier` và trả kèm**

Thay dòng 103-104 hiện tại:

```js
  const out = assembleSolveResult(eng, parsed);
  return res.json({ ...out, geometry });
```

bằng:

```js
  const out = assembleSolveResult(eng, parsed);
  // Ưu tiên: tier từ solveProblem → tier lỗi (catch) → classification tái dùng từ hình (nhánh reuse).
  const tier = (eng && eng.tier) || engTier || (geometry && geometry.classification) || null;
  return res.json({ ...out, tier, geometry });
```

- [ ] **Step 4: Kiểm cú pháp (route Node, không có test riêng)**

Run: `node --check api/solve.js`
Expected: KHÔNG lỗi cú pháp.

- [ ] **Step 5: Commit**

```bash
git add api/solve.js
git commit -m "feat(B): solve.js trả tier (từ engine / catch / classification tái dùng)"
```

---

## Task 6: `analyze-geometry.js` — stamp `classification` (served + LLM fallback)

**Files:**
- Modify: `api/analyze-geometry.js` (khai biến trước dòng 178; trong khối kernel dòng 184-197 và catch 242-245; trước finalPayload dòng 499)

**Bối cảnh:** khối KERNEL MODE (dòng 178-246) chỉ chạy khi `drawMode==='quick' && !imageBase64`. `k = await solveProblem(...)` nay mang `k.tier`. Nhánh phục vụ (`usable`) trả `enginePayload` sớm (dòng 232) ⇒ stamp `geometry.classification` ở đó. Nhánh không phục vụ / lỗi rơi xuống LLM ⇒ hoist `engineClassification` để stamp lên `finalPayload.step2.geometry` (dòng 499-519). Draw ảnh/detailed KHÔNG chạy khối kernel ⇒ `engineClassification` vẫn null ⇒ banner ẩn (chấp nhận; Mức 3 vẫn hiện ở SOLVE).

- [ ] **Step 1: Khai `engineClassification` trước khối KERNEL MODE**

Ngay TRƯỚC dòng 178 (`if (drawMode === 'quick' && !imageBase64 ...`), thêm:

```js
    // Tier engine để stamp lên hình (banner giáo viên). Chỉ set khi khối kernel dưới chạy
    // (quick & !ảnh). Draw ảnh/detailed giữ null ⇒ banner ẩn, Mức 3 vẫn hiện ở luồng SOLVE.
    let engineClassification = null;
```

- [ ] **Step 2: Set `engineClassification` + stamp served geometry**

2a. Ngay sau dòng 184 (`const k = await solveProblem(trimmedPrompt);`) thêm:

```js
        engineClassification = k.tier || null;
```

2b. Trong nhánh `if (usable)`, ngay sau dòng 193 (`geometry.confidence = 1;`) thêm:

```js
          geometry.classification = k.tier || null; // banner: served có thể là Mức 1 (đáp số) hoặc Mức 3 (vd góc: hình dựng được, đáp chưa chứng thực).
```

- [ ] **Step 3: Set `engineClassification` trong catch của khối kernel**

Trong khối `catch (e)` (dòng 242-245), sau dòng `console.warn('[kernel] lỗi → rơi về LLM:', e?.message);` thêm:

```js
        engineClassification = { level: 3, exactness: null, problemType: 'Khác', reason: { kind: 'error', message: e?.message || 'lỗi engine' } };
```

- [ ] **Step 4: Stamp lên `normalizedGeometry` trước finalPayload**

Ngay TRƯỚC dòng 499 (`const finalPayload = {`) thêm:

```js
    // Draw rơi về LLM: gắn tier engine (Mức 2/3) lên hình để banner giáo viên hiện lý do.
    if (engineClassification) normalizedGeometry.classification = engineClassification;
```

- [ ] **Step 5: Kiểm cú pháp**

Run: `node --check api/analyze-geometry.js`
Expected: KHÔNG lỗi cú pháp.

- [ ] **Step 6: Commit**

```bash
git add api/analyze-geometry.js
git commit -m "feat(B): analyze-geometry stamp classification (served + LLM fallback hoist)"
```

---

## Task 7: `TierBanner.tsx` — banner giáo viên

**Files:**
- Create: `src/components/layout/TierBanner.tsx`

- [ ] **Step 1: Viết component**

Tạo `src/components/layout/TierBanner.tsx`:

```tsx
import { safetyTierMeta, exactnessLabel, type SafetyClassification } from '@/lib/safetyTier';
import { cn } from '@/lib/utils';

/**
 * Banner giáo viên: "[Dạng bài] · Mức N — nhãn" (+ chip chính xác khi Mức 1; + lý do khi Mức 3).
 * Tự ẩn khi không có classification. CHỈ mount ở <aside> desktop (teacher-only ≥1024px).
 */
export function TierBanner({ classification }: { classification?: SafetyClassification | null }) {
  if (!classification) return null;
  const meta = safetyTierMeta(classification.level);
  const Icon = meta.icon;
  return (
    <div className={cn('flex items-start gap-2 px-3 py-2 border-b border-border/40 text-xs', meta.bannerClass)}>
      <Icon className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', meta.tone === 'ok' ? 'text-green-500' : meta.tone === 'muted' ? 'text-blue-500' : 'text-muted-foreground')} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-foreground">{classification.problemType}</span>
          <span className="text-muted-foreground">· Mức {classification.level}</span>
          <span className="font-medium text-foreground/90">{meta.label}</span>
          {classification.level === 1 && classification.exactness && (
            <span className="px-1.5 py-0.5 rounded bg-secondary/60 text-[10px] text-muted-foreground">
              {exactnessLabel(classification.exactness)}
            </span>
          )}
        </div>
        {classification.level === 3 && classification.reason?.message && (
          <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug break-words">
            {classification.reason.message}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Kiểm biên dịch**

Run: `npx tsc --noEmit`
Expected: KHÔNG lỗi mới liên quan `TierBanner`.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/TierBanner.tsx
git commit -m "feat(B): TierBanner — dải mức an toàn cho giáo viên"
```

---

## Task 8: Mount `TierBanner` ở `<aside>` desktop (teacher-only)

**Files:**
- Modify: `src/components/layout/RightPanel.tsx` (import; hàm `RightPanel` dòng 882-886)

**Quan trọng:** mount TRONG `<aside>` (khối `hidden lg:flex`, dòng 858) — KHÔNG trong `PanelContent` (bị `MobileRightPanel` dùng chung ở dòng 841 ⇒ sẽ rò xuống mobile <1024px).

- [ ] **Step 1: Thêm import**

Trong `src/components/layout/RightPanel.tsx`, thêm (cùng cụm import component layout):

```tsx
import { TierBanner } from './TierBanner';
```

- [ ] **Step 2: Mount banner trong `<aside>`**

Thay khối dòng 882-886 hiện tại:

```tsx
        <div style={{ width: 'var(--rp-w, 20rem)' }} className="h-full flex flex-col relative">
          <ErrorBoundary>
            <PanelContent />
          </ErrorBoundary>
        </div>
```

bằng:

```tsx
        <div style={{ width: 'var(--rp-w, 20rem)' }} className="h-full flex flex-col relative">
          <TierBanner classification={state.geometry?.classification} />
          <ErrorBoundary>
            <PanelContent />
          </ErrorBoundary>
        </div>
```

- [ ] **Step 3: Kiểm biên dịch**

Run: `npx tsc --noEmit`
Expected: KHÔNG lỗi mới. (`state` đã có ở dòng 855 `const { state } = context;`.)

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/RightPanel.tsx
git commit -m "feat(B): mount TierBanner ở <aside> desktop (teacher-only ≥1024px)"
```

---

## Task 9: `SolverPanel.tsx` — badge + khối lý do Mức 3 qua `safetyTier`

**Files:**
- Modify: `src/components/SolverPanel.tsx` (import; `SolveResultView` dòng 253-266)

- [ ] **Step 1: Thêm import**

Trong `src/components/SolverPanel.tsx`, thêm:

```tsx
import { safetyTierMeta, verifiedToLevel, exactnessLabel } from '@/lib/safetyTier';
```

- [ ] **Step 2: Thay khối đáp số (dòng 253-266)**

Thay:

```tsx
      {/* Đáp số — gọn, không hù dọa. Đã kiểm chứng: tick xanh; chưa: icon trung tính (KHÔNG phải X). */}
      <div className="px-4 py-3 border-b flex items-start gap-2">
        {result.verified ? (
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
        ) : (
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <MathText text={result.final_answer} className="text-sm font-semibold text-foreground break-words" />
          <p className={cn('text-[11px] mt-0.5', result.verified ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground')}>
            {result.verified ? 'Đã được ứng dụng kiểm chứng' : 'Ứng dụng chưa kiểm chứng kết quả này'}
          </p>
        </div>
      </div>
```

bằng:

```tsx
      {/* Đáp số — gọn, không hù dọa. Mức từ tier server (fallback verified nếu lời giải cũ). */}
      {(() => {
        const level = result.tier?.level ?? verifiedToLevel(result.verified);
        const meta = safetyTierMeta(level);
        const Icon = meta.icon;
        const reasonMsg = result.tier?.reason?.message ?? result.verify_error;
        return (
          <div className="px-4 py-3 border-b flex items-start gap-2">
            <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', meta.tone === 'ok' ? 'text-green-500' : meta.tone === 'muted' ? 'text-blue-500' : 'text-muted-foreground')} />
            <div className="flex-1 min-w-0">
              <MathText text={result.final_answer} className="text-sm font-semibold text-foreground break-words" />
              <p className={cn('text-[11px] mt-0.5', meta.tone === 'ok' ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground')}>
                {meta.description}
                {level === 1 && result.tier?.exactness ? ` · ${exactnessLabel(result.tier.exactness)}` : ''}
              </p>
              {level === 3 && reasonMsg && (
                <p className="text-[11px] mt-1 text-muted-foreground/90 leading-snug break-words">{reasonMsg}</p>
              )}
            </div>
          </div>
        );
      })()}
```

- [ ] **Step 3: Dọn import không dùng (nếu có)**

`CheckCircle2` và `Info` giờ dùng gián tiếp qua `meta.icon`. Grep xem còn tham chiếu trực tiếp trong file không:

Run: `grep -nE "CheckCircle2|(^|[^a-zA-Z])Info([^a-zA-Z]|$)" src/components/SolverPanel.tsx`
Nếu KHÔNG còn tham chiếu nào ngoài dòng import → xoá `CheckCircle2`, `Info` khỏi câu `import { ... } from 'lucide-react'`. Nếu còn dùng nơi khác → giữ nguyên. (esbuild bỏ import thừa không lỗi, nhưng dọn cho sạch.)

- [ ] **Step 4: Kiểm biên dịch**

Run: `npx tsc --noEmit`
Expected: KHÔNG lỗi mới.

- [ ] **Step 5: Commit**

```bash
git add src/components/SolverPanel.tsx
git commit -m "feat(B): SolverPanel badge + lý do Mức 3 qua safetyTier"
```

---

## Task 10: `AdvanceStepper.tsx` — badge qua `safetyTier` (map verified→level)

**Files:**
- Modify: `src/components/layout/AdvanceStepper.tsx` (import; badge dòng 77-92)

- [ ] **Step 1: Thêm import**

Trong `src/components/layout/AdvanceStepper.tsx`, thêm:

```tsx
import { safetyTierMeta, verifiedToLevel } from '@/lib/safetyTier';
```

- [ ] **Step 2: Thay khối badge (dòng 77-92)**

Thay:

```tsx
      {/* Đáp câu hiện tại + badge kiểm chứng */}
      {hasAnswer && (
        <div className="flex items-center gap-2 border-t border-border/40 pt-2 text-sm">
          <span className="flex-1 min-w-0 text-foreground">{answer!.text}</span>
          {answer!.verified ? (
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-600 dark:text-green-400">
              <Check className="w-3 h-3" />
              đã kiểm chứng
            </span>
          ) : (
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-3 h-3" />
              chưa kiểm chứng
            </span>
          )}
        </div>
      )}
```

bằng:

```tsx
      {/* Đáp câu hiện tại + badge kiểm chứng — gom về safetyTier (tông "gọn, không hù dọa";
          chưa kiểm chứng = trung tính, KHÔNG còn vàng cảnh báo). */}
      {hasAnswer && (() => {
        const meta = safetyTierMeta(verifiedToLevel(!!answer!.verified));
        const Icon = meta.icon;
        return (
          <div className="flex items-center gap-2 border-t border-border/40 pt-2 text-sm">
            <span className="flex-1 min-w-0 text-foreground">{answer!.text}</span>
            <span className={cn('shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', meta.badgeClass)}>
              <Icon className="w-3 h-3" />
              {answer!.verified ? 'đã kiểm chứng' : 'chưa kiểm chứng'}
            </span>
          </div>
        );
      })()}
```

- [ ] **Step 3: Dọn import không dùng**

`Check` và `AlertTriangle` có thể còn dùng nơi khác trong file. Grep:

Run: `grep -nE "AlertTriangle|(^|[^a-zA-Z])Check([^a-zA-Z]|$)" src/components/layout/AdvanceStepper.tsx`
Xoá khỏi import `lucide-react` chỉ những cái KHÔNG còn tham chiếu ngoài dòng import. Đảm bảo `cn` đã được import (nếu chưa: thêm `import { cn } from '@/lib/utils';`).

- [ ] **Step 4: Kiểm biên dịch**

Run: `npx tsc --noEmit`
Expected: KHÔNG lỗi mới.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AdvanceStepper.tsx
git commit -m "feat(B): AdvanceStepper badge qua safetyTier (verified→level, bỏ vàng hù dọa)"
```

---

## Task 11: Cổng cuối — test toàn bộ + build + đẩy deploy (Nhịp 1)

**Files:** không sửa — chỉ chạy cổng.

- [ ] **Step 1: Chạy TOÀN BỘ test (xác nhận số test tăng, không giả xanh)**

Run: `npx vitest run`
Expected: PASS tất cả. Có mặt các file mới: `classifyTier.test.js`, `solveProblemTier.test.js`, `safetyTier.test.ts`. Đối chiếu tổng số test cao hơn baseline (≥ 21 test mới). KHÔNG được có file test bị "0 test / skipped".

- [ ] **Step 2: Build production (cổng deploy thật)**

Run: `npm run build`
Expected: exit 0 (chạy `build:kernel` rồi `vite build`, không lỗi). Đây CHÍNH là cổng Vercel: Vercel tự chạy `npm run build` từ source khi deploy (preset Vite, `outputDirectory: dist`), nên build phải xanh.

> **Lưu ý churn tạo phẩm (QUAN TRỌNG — đừng nhầm là cây bẩn cần commit):** lệnh này TÁI SINH các file ĐANG được git theo dõi `dist/**` và (có thể) `api/_lib/kernel-dist/index.mjs`. Chúng **KHÔNG** gitignore — `.gitignore` chỉ bỏ `/build`, KHÔNG bỏ `/dist`. Nhưng churn này **KHÔNG** thuộc thay đổi B: `dist/` đã **cũ-theo-thông-lệ** (8 commit frontend gần nhất — cả Tiểu-dự-án E đã lên prod — KHÔNG hề đụng `dist/`), và Vercel **rebuild cả `dist/` lẫn `kernel-dist` từ source** khi deploy. Vì thế: **TUYỆT ĐỐI KHÔNG `git add` churn `dist/`/`kernel-dist`.**

- [ ] **Step 3: Rà git — churn build là BÌNH THƯỜNG, chỉ chặn file source lọt lưới**

Run: `git status --porcelain`
Expected: CHỈ xuất hiện đường dẫn dưới `dist/` và (có thể) `api/_lib/kernel-dist/` — tạo phẩm build vừa tái sinh (cả dòng ` M` sửa lẫn `??` mới do vite đổi tên băm nội dung). **KHÔNG** được có bất kỳ file `src/`, `api/` (ngoài `kernel-dist`), hay tài liệu nào chưa commit — nếu có, nghĩa là Task 1-10 chưa commit hết → quay lại commit trước khi push. **KHÔNG `git add`** phần churn build.

Xác nhận không có gì bị stage nhầm:
Run: `git diff --cached --name-only`
Expected: TRỐNG (không file nào staged — mọi thay đổi B đã commit ở Task 1-10, churn build để nguyên chưa stage).

- [ ] **Step 4: Đẩy lên main (auto-deploy Vercel) — chỉ khi Step 1-3 đạt**

`git push` gửi **các COMMIT** (chỉ file source từ Task 1-10), KHÔNG gửi churn build chưa stage ⇒ prod nhận đúng source, Vercel tự rebuild `dist/`.

Run: `git push origin claude/tier-classification:main`
Expected: push thành công (fast-forward), deploy khởi động trên Vercel.

> **Lưu ý deploy:** đây là chuẩn "luôn push khi build+test xanh". Nếu push bị từ chối (không fast-forward vì main đã tiến), DỪNG và báo chủ dự án — **KHÔNG force**. Nhịp 1 độc lập hoàn toàn với commit A-Nhịp-2 (`754ebee`).
>
> **(Tuỳ chọn) dọn cây sau khi push** — nếu muốn worktree sạch lại (churn build chỉ là tạo phẩm): `git checkout -- dist api/_lib/kernel-dist && git clean -fd dist api/_lib/kernel-dist`. `git clean -fd` chỉ đụng thư mục build output, an toàn.

---

## Nhịp 2 (SAU — cổng 50-ca live, KHÔNG chạy tự động)

> **KHÔNG thực thi trong lượt này.** Chỉ ghi để bàn giao. Nhịp 2 sửa `translatorPrompt.js` ⇒ bắt buộc cổng translator 50-ca (live, VILAO_API_KEY, gemini; 15/15 hard + 0 sai) do CHỦ DỰ ÁN chạy TRƯỚC khi push.

- **T2.1** `api/_lib/kernel-bridge/translatorPrompt.js` — thêm hướng dẫn cho translator xuất field tuỳ chọn `problemKind` (câu-chữ dạng bài theo đề). KHÔNG bắt buộc; vắng ⇒ classifier fallback map tất định (đã hoạt động).
- **T2.2** không cần sửa `classifyTier.js` — `problemTypeOf` ĐÃ ưu tiên `plan.problemKind` (dormant sẵn). Chỉ cần thêm case test trong `classifyTier.test.js` nếu muốn.
- **Cổng:** chủ dự án chạy 50-ca. Qua ⇒ `git push origin claude/tier-classification:main`. Không qua ⇒ revert phần translator, giữ Nhịp 1.

---

## Self-review (đã rà)

- **Spec coverage:** §4.1 (Task 1: representative→engineSolved→reason.kind); §4.2 exactness gate `parameter` (Task 1 exactnessOf + test chống bẫy); §4.3 problemType map (Task 1); §5.1 solveProblem tier + catch (Task 2); §5.2 solve.js (Task 5) + analyze-geometry hoist (Task 6) + GeometryContext KHÔNG sửa (đúng); §5.3 Mức 3 lý do (Task 9); §5.4 banner `<aside>` (Task 8) + badge gom (Task 9, 10) + verifiedToLevel (Task 3); §5.5 useSolver map (Task 4); §6 file list khớp; §7 test paths đúng glob (Task 1, 2, 3) + bất biến + unsolved/representative. §9 Mức 2 rail (Task 1 nhánh representative) — dormant, đúng.
- **Placeholder scan:** không có TBD/TODO; mọi step có code/lệnh đầy đủ + expected.
- **Type consistency:** `SafetyClassification { level, exactness, problemType, reason }` dùng nhất quán ở classifyTier (server, cùng field), geometry.ts, useSolver, safetyTier.ts, TierBanner, SolverPanel. `verifiedToLevel`, `exactnessLabel`, `safetyTierMeta` cùng chữ ký ở Task 3 và mọi consumer. `k.tier`/`eng.tier`/`geometry.classification` cùng object.
- **Rủi ro test:** classifyTier.test.js THUẦN (không kéo kernel-dist) ⇒ nhanh, ổn định; solveProblemTier.test.js mock `callVilao`, chỉ khẳng định nhánh throw (không dựng plan engine thủ công dễ vỡ). Không test render React (repo không có testing-library) ⇒ component dựa `tsc`/`build`.
