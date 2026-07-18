# Nâng độ phủ engine cho bài Oxyz "dựng hình" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho engine phục vụ được nhiều bài Oxyz "dựng cấu hình thoả ràng buộc" hơn (vẽ + tính), giữ nguyên chống ảo giác (chỉ serve cái tự-kiểm bằng assert).

**Architecture:** Translator-first. Op dựng hình phần lớn đã có (`oxyz_foot`/`reflect`/`intersect`/`plane-coeffs`…); nút thắt là bước dịch không mô hình nổi chuỗi nhiều bước, cộng vài khe hở nhỏ (thay tham số vào coeffs mặt phẳng; điểm trên đường ở khoảng cách cho trước). Làm theo cổng kiểm chứng: xác minh op có sẵn đủ trước, rồi mới thêm ít op + few-shot.

**Tech Stack:** TypeScript engine (`api/_lib/kernel/**`), Zod schema, Vitest; translator prompt JS (`api/_lib/kernel-bridge/translatorPrompt.js`); Vilao gemini. Spec: `docs/superpowers/specs/2026-07-18-oxyz-construction-coverage-design.md`.

**Nhánh:** `claude/engine-improvements`. KHÔNG gộp main khi chưa hỏi (main auto-deploy prod).

---

## Bối cảnh cho người thực thi (đọc trước)

- Bài giải-tích/dựng chạy qua `runAnalysis(plan)` (`api/_lib/kernel/analysis/runAnalysis.ts`). Nó nhận
  `parameters`, `ops`, `asserts`, `analyze` (kind: `solve`/`optimize`/…). Khi `solve`/`optimize`, hàm
  nội bộ `concreteOps(value)` thay giá trị tham số vào ops **rồi** gọi `run({solidName, ops, asserts, queries})`.
- **Giới hạn hiện tại của `concreteOps`:** chỉ thay tham số vào `oxyz_point.at`, `oxyz_circumsphere_offset.t`,
  và các op hàm (`curve_point`…). KHÔNG thay vào `oxyz_plane` form `coeffs` (a,b,c,d) — dù schema cho phép
  chuỗi. ⇒ mặt phẳng có hệ số = tham số hiện KHÔNG giải được.
- Op Oxyz định nghĩa ở `api/_lib/kernel/dialects/oxyz.ts`; danh sách op trong `OXYZ_OPS`/`OXYZ_POINT_OPS`
  ở `api/_lib/kernel/unifiedPlan.ts`. Query/assert (distance…) dùng trong `run()` (`api/_lib/kernel/run.ts`).
- Test analysis ở `api/_lib/kernel/analysis/__tests__/`. Chạy 1 file: `npx vitest run <path>`.
- Đo end-to-end thật cần key: nạp `F:/geo3dnew/geo3d/.env.local` rồi gọi `planFromProblem`+`solvePlan`
  từ `api/_lib/kernel-bridge/solveWithKernel.js` (mẫu: các script trong scratchpad phiên này).

---

## Task 1: CỔNG KIỂM CHỨNG — viết tay plan bằng op CÓ SẴN

Mục tiêu: xác định chính xác 3 bài Phần 1 rơi về là do (a) thiếu op, (b) thiếu thay-tham-số, hay
(c) đáp là điểm/đường (ngoài phạm vi). KHÔNG viết few-shot / thêm op trước khi biết.

**Files:**
- Create: `api/_lib/kernel/analysis/__tests__/oxyz-construction-gate.test.ts`

- [ ] **Step 1: Viết test cổng — 3 hand-plan bằng op có sẵn, ghi rõ kỳ vọng**

```ts
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';
import { runAny } from '../../run'; // dựng thuần, không tham số

// Câu 5 (Phần 1): đường qua A(1,0,2), ⊥ và cắt d. Dựng = foot + line. KHÔNG tham số.
// Kỳ vọng: DỰNG ĐƯỢC (foot F, đường Delta). Nhưng đáp là ĐƯỜNG (MC) ⇒ không có số để "serve".
it('Cau5: foot + line dung duoc (nhung dap la duong - ngoai pham vi)', () => {
  const et = runAny({
    solidName: 'c5',
    ops: [
      { op: 'oxyz_point', name: 'A', at: [1, 0, 2] },
      { op: 'oxyz_line', name: 'D', by: { form: 'point_dir', base: [1, 0, -1], dir: [1, 1, 2] } },
      { op: 'oxyz_foot', name: 'F', from: 'A', onto: 'line', target: 'D' },
      { op: 'oxyz_line', name: 'T', by: { form: 'two_points', a: 'A', b: 'F' } },
    ],
  });
  expect(et.points.has('F')).toBe(true); // chân vuông góc dựng được
});

// Câu 1 (Phần 1): mp (alpha) // (P): x-2y+3z-4=0, cat d1,d2 tai M,N, MN=√3.
// Model: alpha = coeffs(1,-2,3, d='k'); M=intersect(alpha,d1); N=intersect(alpha,d2); solve k: dist(M,N)=√3.
// Kỳ vọng: THẤT BẠI vì concreteOps KHÔNG thay 'k' vào oxyz_plane.coeffs ⇒ parseScalar('k') ném.
it('Cau1: mp tham so hien CHUA giai duoc (loc khe ho thay-tham-so vao coeffs)', () => {
  const r = runAnalysis({
    solidName: 'c1',
    parameters: [{ name: 'k', domain: [-20, 20] }],
    ops: [
      { op: 'oxyz_line', name: 'E', by: { form: 'point_dir', base: [1, 0, -1], dir: [1, -1, 2] } },
      { op: 'oxyz_line', name: 'G', by: { form: 'point_dir', base: [1, 3, -1], dir: [2, 1, 1] } },
      { op: 'oxyz_plane', name: 'W', by: { form: 'coeffs', a: 1, b: -2, c: 3, d: 'k' } },
      { op: 'oxyz_intersect', name: 'M', a: 'W', b: 'E' },
      { op: 'oxyz_intersect', name: 'N', a: 'W', b: 'G' },
    ],
    analyze: {
      kind: 'solve', parameter: 'k',
      constraint: { of: { kind: 'distance', a: 'M', b: 'N' }, equals: 'sqrt(3)' },
      report: { kind: 'distance', a: 'M', b: 'N' },
    },
  });
  // Ghi lại r.ok/r.errors vào findings. Kỳ vọng ok=false (khe hở G1).
  expect(r).toBeDefined();
});
```

- [ ] **Step 2: Chạy để lộ khe hở**

Run: `npx vitest run api/_lib/kernel/analysis/__tests__/oxyz-construction-gate.test.ts`
Expected: test Cau5 PASS (foot dựng được); test Cau1 chạy xong, `r.ok===false` (in `r.errors` để xác nhận
nguyên nhân là parseScalar('k') trong oxyz_plane.coeffs).

- [ ] **Step 3: Ghi findings vào cuối plan này**

Thêm mục "## Findings (Task 1)" liệt kê mỗi bài → {dựng được | thiếu thay-tham-số G1 | thiếu op | đáp ngoài phạm vi}.
Kết luận đường đi: nếu G1 là khe hở chính ⇒ Task 3 (thay-tham-số vào coeffs) là bắt buộc; few-shot (Task 2) luôn cần.

- [ ] **Step 4: Commit**

```bash
git add api/_lib/kernel/analysis/__tests__/oxyz-construction-gate.test.ts docs/superpowers/plans/2026-07-18-oxyz-construction-coverage.md
git commit -m "test(oxyz): cong kiem chung - hand-plan bang op co san, loc khe ho"
```

---

## Task 2: Thay tham số vào `oxyz_plane` form `coeffs` (khe hở G1)

Chỉ làm nếu Task 1 xác nhận G1. Cho phép mặt phẳng có hệ số = tham số (mp ∥ P với offset ẩn) giải được.

**Files:**
- Modify: `api/_lib/kernel/analysis/runAnalysis.ts` (hàm `concreteOps`, ~dòng 237–260)
- Test: `api/_lib/kernel/analysis/__tests__/oxyz-construction-gate.test.ts` (đổi kỳ vọng Cau1 → giải được)

- [ ] **Step 1: Đổi test Cau1 thành kỳ vọng GIẢI ĐÚNG (đỏ trước)**

Sửa test Cau1: `expect(r.ok).toBe(true);` và kiểm nghiệm k đúng. Nghiệm đúng: mp ∥ P cắt d1,d2 với MN=√3.
(Giá trị k tính tay hoặc lấy từ đáp án PDF khi thực thi; điền số thật vào test.)

Run: `npx vitest run .../oxyz-construction-gate.test.ts` → Expected: FAIL (ok=false).

- [ ] **Step 2: Thêm nhánh thay-tham-số cho `oxyz_plane` coeffs trong `concreteOps`**

Trong `concreteOps` (runAnalysis.ts), thêm trước nhánh `return op;` mặc định:

```ts
if (o.op === 'oxyz_plane' && (o.by as { form?: string })?.form === 'coeffs') {
  const by = o.by as { form: 'coeffs'; a: number | string; b: number | string; c: number | string; d: number | string };
  return { ...o, by: { ...by,
    a: numify(by.a, env, paramNames), b: numify(by.b, env, paramNames),
    c: numify(by.c, env, paramNames), d: numify(by.d, env, paramNames) } };
}
```

(`numify` đã có sẵn trong file; nó eval chuỗi chứa tên tham số, giữ nguyên số.)

- [ ] **Step 3: Chạy test → xanh**

Run: `npx vitest run .../oxyz-construction-gate.test.ts` → Expected: PASS (Cau1 giải đúng).

- [ ] **Step 4: Không hồi quy toàn suite**

Run: `npx vitest run` → Expected: tất cả xanh (bao gồm 417 test cũ).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel/analysis/runAnalysis.ts api/_lib/kernel/analysis/__tests__/oxyz-construction-gate.test.ts
git commit -m "feat(analysis): thay tham so vao oxyz_plane coeffs - giai duoc mp // P offset an"
```

---

## Task 3: Few-shot dựng hình + bắt buộc assert cho translator (đòn bẩy chính)

**Files:**
- Modify: `api/_lib/kernel-bridge/translatorPrompt.js` (thêm mục hướng dẫn + 2–3 ví dụ đầy đủ)

- [ ] **Step 1: Thêm mục hướng dẫn "DỰNG HÌNH OXYZ" vào prompt**

Trước phần "VÍ DỤ ĐẦY ĐỦ", thêm khối liệt kê op dựng có sẵn + quy tắc:
- Liệt kê: `oxyz_foot` (chân ⊥ điểm→đường/mặt), `oxyz_reflect_across`, `oxyz_intersect` (giao),
  `oxyz_plane` coeffs với hệ số = tham số (mp ∥ P: cùng a,b,c của P, d = tham số), `oxyz_line` two_points.
- Quy tắc BẮT BUỘC: bài dựng thoả ràng buộc metric ⇒ dùng `analyze.solve` theo tham số + `constraint`
  đúng ràng buộc đề; VÀ phát `asserts` kiểm lại điều kiện tại nghiệm (vd `{relation:'dist',args:['M','N'],value:'sqrt(3)'}`).
- Nhắc: đáp là ĐIỂM/ĐƯỜNG/PT (không phải số) ⇒ KHÔNG mô hình (để rơi về) — engine chỉ serve đại lượng SỐ.

- [ ] **Step 2: Thêm VÍ DỤ E (mp // P cắt 2 đường, MN cho trước → solve)**

Chèn ví dụ đầy đủ dạng Câu 1 (plan JSON đã xác minh ở Task 2), có `asserts` kiểm `dist(M,N)`.

- [ ] **Step 3: Thêm VÍ DỤ F (khoảng cách qua giao điểm + offset trên đường)**

Ví dụ dạng Câu 6: `oxyz_intersect(d,P)` cho I, dựng điểm trên d cách I một đoạn, tính khoảng cách. (Nếu
Task 1 cho thấy thiếu op "điểm trên đường ở khoảng cách", làm Task 4 trước rồi mới viết ví dụ này.)

- [ ] **Step 4: Kiểm cú pháp + không hồi quy**

Run: `node --check api/_lib/kernel-bridge/translatorPrompt.js` → OK.
Run: `npx vitest run` → 417 test xanh.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/kernel-bridge/translatorPrompt.js
git commit -m "feat(prompt): few-shot dung hinh Oxyz + bat buoc assert (mp//P, giao+offset)"
```

---

## Task 4: (Điều kiện) Op tiện lợi "điểm trên đường ở khoảng cách cho trước"

Chỉ làm nếu Task 1 cho thấy Câu 6-style không biểu diễn được bằng op có sẵn (không có cách sạch đặt
điểm trên đường cách một điểm một đoạn d). Op mới: `oxyz_point_on_line`.

**Files:**
- Modify: `api/_lib/kernel/dialects/oxyz.ts` (schema + case), `api/_lib/kernel/unifiedPlan.ts` (thêm vào `OXYZ_OPS`, `OXYZ_POINT_OPS`)
- Test: `api/_lib/kernel/dialects/__tests__/oxyz.test.ts` (hoặc file test oxyz sẵn có)

- [ ] **Step 1: Test đơn vị (đỏ)** — điểm trên đường qua base theo dir, cách `from` đúng khoảng cho trước.

```ts
it('oxyz_point_on_line: diem tren duong cach diem cho truoc dung khoang', () => {
  const et = executeOxyzPlan([
    { op: 'oxyz_line', name: 'D', by: { form: 'point_dir', base: [1,-1,-2], dir: [2,2,1] } },
    { op: 'oxyz_point', name: 'I', at: [1,-1,-2] },
    { op: 'oxyz_point_on_line', name: 'M', on: 'D', from: 'I', dist: 9 },
  ] as any);
  const M = et.points.get('M')!;
  // |IM| = 9
  expect(Math.hypot(M.p.x.approx-1, M.p.y.approx+1, M.p.z.approx+2)).toBeCloseTo(9, 6);
});
```

- [ ] **Step 2: Schema + case** trong oxyz.ts:

```ts
export const OxyzPointOnLineSchema = z.object({
  op: z.literal('oxyz_point_on_line'), name: PointName, on: Name, from: Name, dist: RInput,
});
// thêm vào OxyzOpSchema union; case: điểm = from-chiếu-lên-D rồi + (dist/|dir|)·dir  (hoặc I + dist·unit(dir))
```

Impl: lấy line `on`, điểm `from`; đơn vị hoá dir; điểm kết quả = `from` + `dist`·unitDir (dùng `footOnLineE`
nếu cần chiếu `from` lên đường trước). Thêm `'oxyz_point_on_line'` vào `OXYZ_OPS` và `OXYZ_POINT_OPS` ở unifiedPlan.ts.

- [ ] **Step 3: Thay-tham-số** cho op mới trong `concreteOps` (nếu `dist` có thể là tham số): thêm nhánh numify `dist`.

- [ ] **Step 4: Test xanh + suite xanh** — `npx vitest run`.

- [ ] **Step 5: Commit** — `feat(oxyz): op oxyz_point_on_line (diem tren duong o khoang cach cho truoc)`

---

## Task 5: Đo end-to-end + chốt độ phủ

**Files:**
- Create: `scripts/measure-oxyz-part1.mjs` (script đo, không phải test — phụ thuộc LLM)

- [ ] **Step 1: Script đo** — nạp `.env.local`, chạy ≥6 đề Phần 1 (chép sạch từ ảnh PDF, lưu literal trong script)
  qua `planFromProblem`+`solvePlan`, in serve/đúng/rơi-về mỗi bài. Chạy 2 lần đo ổn định.

```bash
node scripts/measure-oxyz-part1.mjs
```

- [ ] **Step 2: Đối chiếu tiêu chí** — Phần 1: 0/3 (cũ) → ≥50% phục vụ; mỗi câu serve phải có assert
  (kiểm `plan.asserts.length>0`); không có serve-sai (so đáp án PDF). Ghi kết quả vào "## Findings".

- [ ] **Step 3: Quyết định nhân rộng** — nếu đạt: cân nhắc kéo Phần 3 (mặt cầu) vào bằng cùng cách
  (thêm query `section_radius`/`tangent_length`). Nếu chưa đạt do dịch: bật Task 6.

- [ ] **Step 4: Commit** — `chore: script do do phu Oxyz Phan 1 + findings`

---

## Task 6: (Điều kiện) Route model dịch mạnh hơn cho bài dựng

Chỉ làm nếu Task 5 cho thấy flash-low vẫn là nút thắt dù đã few-shot.

**Files:**
- Modify: `api/_lib/kernel-bridge/solveWithKernel.js` (`planFromProblem`)

- [ ] **Step 1:** Heuristic phát hiện "đề dựng hình" (regex từ khoá: "mặt phẳng.*(song song|vuông góc)",
  "đường thẳng.*(cắt|tiếp xúc)"), nếu khớp ⇒ dùng model khá hơn qua biến env `VILAO_CONSTRUCTION_MODEL`
  (mặc định = `VILAO_TRANSLATOR_MODEL`). Gated: không đặt env ⇒ hành vi không đổi.
- [ ] **Step 2:** Đo lại bằng script Task 5 với env bật; so chi phí/độ phủ.
- [ ] **Step 3:** Commit — `feat(bridge): route model dich manh hon cho bai dung (gated)`.

---

## Kiểm cuối + gộp

- [ ] Toàn suite xanh (`npx vitest run`), 10 benchmark cũ không đổi, đếm/quỹ tích vẫn abstain.
- [ ] Cập nhật memory `integration-branch-and-prod.md` (độ phủ Oxyz mới).
- [ ] **HỎI trước khi gộp `main`** (auto-deploy prod). Gộp theo mẻ, verify prod như các lần trước.

---

## Findings (Task 1)

*(Điền khi thực thi Task 1: mỗi bài → dựng được / khe hở G1 thay-tham-số / thiếu op / đáp ngoài phạm vi.)*
