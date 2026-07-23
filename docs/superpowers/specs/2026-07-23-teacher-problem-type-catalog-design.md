# Bảng phân loại dạng bài cho giáo viên (Teacher Problem-Type Catalog) — Design

> Sub-project **D** of the 3-mức-an-toàn + teacher-UX program (order E → A → B → **D** → C).
> Depends on **B** (shipped): `classifyTier` / `SafetyClassification` / `safetyTierMeta`.

**Date:** 2026-07-23
**Branch / worktree:** `claude/teacher-catalog` · `F:\geo3dnew\geo3d\.claude\worktrees\teacher-catalog` (from `origin/main` = `714e174`)

---

## 1. Goal

Give teachers a single **reference page** that answers: *"What kinds of problems can GeometryPro handle, and how much can I trust each?"*

For every problem type the engine recognises, the page shows its name, its current **safety Mức**, and — for the types the engine can **certify** — a worked example the teacher can load straight into the canvas with a **"Vẽ thử"** button. Uncertified types are shown **honestly**, never hidden, with a neutral "engine tính được nhưng chưa cấp chứng thực" note.

This is a pure teacher-facing surface. It changes **no** engine behaviour and adds **no** kernel code. Its entire value is honest transparency, so its one hard rule is: **nothing on the page may assert an answer the engine has not actually produced.**

## 2. Locked product decisions (from the user)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Audience | **Teacher-only, gated.** Auth required; teacher-capable tier only. Reached from `UserMenu`. Students never see it. |
| 2 | Interactivity | **"Vẽ thử" loads the figure** into the canvas — not read-only. Reuses the existing load mechanism. |
| 3 | Coverage | **Full taxonomy, including Mức-3 types**, shown honestly as "chưa chứng thực". |

## 3. Non-negotiable honesty constraints

These flow from the whole program's reason for existing (anti-hallucination). They are requirements, not preferences:

- **H1 — No uncertified assertion.** An answer value may be shown as certified ("Đã kiểm chứng", Mức 1) **only if** the live engine actually produces it. Enforced by a CI guard that re-runs the example (§7).
- **H2 — `demoResults` is banned as a source.** `src/data/demoResults.ts` is the *rendered showcase* and contains a **provably wrong** figure (Câu 9: sphere center/R and 14 m top are incorrect). No catalog figure, answer, or example may be sourced from it. Enforced structurally by the guard.
- **H3 — Mức is dynamic, mirrored from B.** The page classifies types the same way B classifies instances: `level 1 ⟺ engineSolved`. The catalog never invents a Mức; a type is "Mức-1-capable" **iff** it carries a certified example that passes the live-engine guard.
- **H4 — Mức-3 is neutral, not alarming.** Uncertified types use B's neutral Info tone (`safetyTierMeta(3)`), never red/warning. No "Vẽ thử" button (nothing verified to load).

## 4. Taxonomy (source of truth: `classifyTier.js`)

The catalog enumerates exactly the labels `problemTypeOf` can emit — no more, no less:

**Certified-capable today (Mức 1 — has a passing contract test ⇒ `engineSolved`):**

| Type | Certifying contract test | Verified answer (illustrative) |
|------|--------------------------|-------------------------------|
| Khoảng cách | `api/_lib/kernel/__tests__/e2e-flagship.test.ts` | `d(A,(SCD)) = √2` |
| Thể tích | `api/_lib/kernel/__tests__/e2e-flagship.test.ts` | `V = 8/3` |
| Diện tích | `api/_lib/kernel/analysis/__tests__/cau4-contract.test.ts` | thiết diện lớn nhất `392 cm²` |
| Cực trị | `api/_lib/kernel/analysis/__tests__/cau1-contract.test.ts` (or `cau5-contract`) | đỉnh `16/3 m = 533 cm` (Câu 1) / `MN` min `≈ 7,49 m` (Câu 5) |
| Toạ độ điểm | `api/_lib/kernel/__tests__/translator-contract.test.ts` | trực tâm `H = (16/21, 8/21, 4/21)` |
| Mặt cầu | `api/_lib/kernel/analysis/__tests__/cau9-integration.test.ts` | `R = 10 − 2√7 ≈ 4,7085` |

The exact `file:line` + the exact `program` (kernel input) for each entry are pinned during the writing-plans phase by reading each cited test. The table above is the intent; the guard (§7) is the enforcement.

**Not certified today (Mức 3 — shown honestly, no "Vẽ thử"):**

`Góc`, `Phương trình`, `Vị trí tương đối`, `Giao`, `Tỉ số thể tích`, `Tích phân`, `Giải phương trình`, `Tính giá trị`, `Khác`.

Each carries a neutral note. Two honest sub-notes:
- **"engine tính được, chưa cấp chứng thực"** — the engine can compute a number but B assigns Mức 3 by policy (e.g. `Phương trình`, `Tích phân`, `Giải phương trình`, `Tính giá trị`).
- **"chưa hỗ trợ chứng thực"** — no reliable engine path yet (e.g. `Góc` in 3D — known gap; `Vị trí tương đối`, `Giao`, `Tỉ số thể tích`, `Khác`).

The per-type sub-note is data on the entry, decided during planning by checking each type against the engine; the page just renders whatever the entry says.

## 5. Data model

One typed module — the single source of catalog content:

**`src/data/problemTypeCatalog.ts`**

```ts
import type { GeometryData } from '@/context/GeometryContext'; // or wherever GeometryData lives
import type { SafetyLevel } from '@/lib/safetyTier';

/** A certified, engine-checked worked example (Mức-1 entries only). */
export interface CatalogExample {
  /** Vietnamese problem statement shown to the teacher. */
  de: string;
  /** Human-facing verified answer, e.g. "d(A,(SCD)) = √2". */
  answer: string;
  /**
   * Kernel input for this exact problem — the SAME construction its
   * certifying contract test solves. The guard runs this and asserts the
   * engine returns `answer` at level 1. This is what makes the answer honest.
   */
  program: unknown;               // shape = runAny() input (RunPlan | AnalysisPlan)
  /** file:line of the certifying contract test (human citation). */
  sourceTest: string;
  /** Loadable figure for "Vẽ thử" — authored to match `program`'s config. */
  geometry: GeometryData;
}

export interface CatalogEntry {
  /** Exactly one of the labels classifyTier.js can emit. */
  type: string;                   // 'Khoảng cách' | 'Góc' | ...
  /** Current safety Mức for this TYPE's best available support. */
  level: SafetyLevel;             // 1 | 3 (2 reserved for C)
  /** Neutral one-line description of the type. */
  blurb: string;
  /** Mức-3 honesty note; null for Mức-1 entries. */
  note: string | null;
  /** Present iff level === 1. Absent/undefined for Mức-3. */
  example?: CatalogExample;
}

export const PROBLEM_TYPE_CATALOG: CatalogEntry[] = [ /* ... */ ];
```

**Why a `.ts` module, not JSON:** it imports `GeometryData` / `SafetyLevel` types (compile-time safety, and the page can't drift from B's `SafetyLevel` union), and it can hold the `program` object literally.

**Invariant (guard-enforced):** `entry.level === 1 ⟺ entry.example != null`.

## 6. UI & integration

Follows the **E pattern** (`src/pages/Settings.tsx`) exactly — same auth gate, same shadcn Card layout, same `useAuth`.

### 6.1 New page — `src/pages/ProblemTypeCatalog.tsx`

- **Gate:** copy Settings' gate. `useAuth()` → if `!isLoading && !user` → `navigate('/auth')`. Then a **teacher-capability** check: render the catalog only for teacher-capable tiers; authenticated non-teacher (free) users see a short upsell card (reuse Settings' "Gói của tôi" tone + `openUpgradeModal`). The exact predicate (`canUseTeacherTools`) mirrors whatever already gates `TeacherMode` / reveals teacher UI — pinned during planning by reading `TeacherMode.tsx` and `useAuth`.
- **Layout:** two grouped sections using B's `safetyTierMeta` for badge styling so the page is visually consistent with the banner:
  - **"Mức 1 — Đã chứng thực"** — one Card per certified type: type name + `safetyTierMeta(1)` badge, `blurb`, the example's `de`, its verified `answer` (labeled "Đáp án đã kiểm chứng"), a small "Nguồn: `sourceTest`" citation, and a **"Vẽ thử"** button.
  - **"Mức 3 — Chưa chứng thực"** — one row/Card per uncertified type: type name + `safetyTierMeta(3)` neutral badge, `blurb`, and the honest `note`. **No** button.
- **"Vẽ thử" behaviour:** `onClick` → `loadGeometry(entry.example.geometry, { silent })` (the same context action `DropZone` uses) → `navigate('/teacher')` so the figure appears on the teacher canvas. Requires the catalog route to sit **inside** the `GeometryProvider` tree (verified during planning; App.tsx wraps routes in the provider).

### 6.2 Route — `src/App.tsx`

Add **above** the catch-all (respecting the existing "ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL" comment):

```tsx
<Route path="/teacher/dang-bai" element={<ProblemTypeCatalog />} />
```

### 6.3 Entry point — `src/components/UserMenu.tsx`

Add a `DropdownMenuItem` — **"Bảng phân loại dạng bài"** (icon e.g. `LayoutGrid`/`BookOpen`) → `navigate('/teacher/dang-bai')`. Rendered **only** when `canUseTeacherTools` (teacher-gated at the link level too, so students never see the entry point).

## 7. Honesty guard (CI)

Two layers. Layer B is the anti-hallucination guarantee; layer A is cheap structural hygiene.

**Layer A — structural guard (light, no engine):** `src/data/__tests__/problemTypeCatalog.structure.test.ts`
- Every `type` is one of `classifyTier.js`'s emittable labels; no duplicates; every emittable label is present (full-coverage per decision #3).
- Invariant `level === 1 ⟺ example != null`.
- Every Mức-3 entry has a non-empty `note` and **no** `example`.
- **H2:** assert no catalog `geometry` is referentially or structurally equal to any `demoResults` entry (import `demoResults`, cross-check).
- For each Mức-1 example: `geometry.points` includes the points named in `answer` (e.g. `A`, `S`, `C`, `D` for the distance example) — a wrong/empty figure fails here.

**Layer B — live-engine guard (the H1 guarantee):** `api/_lib/__tests__/problemTypeCatalog.engine.test.js` (co-located with the engine so kernel import is trivial; covered by the existing `api/_lib/__tests__/**/*.test.js` vitest glob).
- For each Mức-1 entry: `runAny(entry.example.program)` → assert `classifyTier(result).level === 1` **and** the engine's answer matches `entry.example.answer` (compare the exact/approx value the contract test asserts). If the engine ever changes an answer, this test fails until the catalog is updated — the catalog **cannot silently drift from the engine**.
- Import friction (this JS test needs the TS catalog's programs): resolved in planning — either (a) import the catalog module through vitest's `@` alias, or (b) export the Mức-1 `{program, answer}` pairs from a tiny shared module both the page and this test import. Preference: (a) if the alias resolves in the `node` project; else (b).

**Existing suite stays green:** 539/539 tests, `tsc` 0 errors, `npm run build` exit 0.

## 8. Out of scope (YAGNI)

- **Auto-generating figures from the engine** at build time (via `buildGeometryFromPoints`). Feasible and strictly more honest, but heavier; v1 hand-authors 6 figures matched to their `program` and guard-checks them. Noted as a future enhancement to eliminate hand-authoring.
- **Mức-2 representative illustrations** — that is sub-project **C** (consumes `showIllustrationValues`). The `SafetyLevel === 2` branch is not produced here.
- **Editing / adding examples from the UI.** Catalog is static, engine-pinned, code-reviewed.
- **Sample đề for Mức-3 types.** Optional; if added later it carries **no** answer and **no** figure and is explicitly framed "ví dụ dạng đề — chưa chứng thực." Not in v1.
- **`translatorPrompt.js` `problemKind`** enrichment (B-Nhịp 2 / A-Nhịp 2) — gated behind the live 50-case translator gate, unrelated to D.

## 9. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| A hand-authored figure is geometrically wrong (the Câu-9 failure mode) | Figure authored to match the `program`'s exact coordinates; Layer-A guard checks named points exist; the *answer* (the honesty-critical claim) is pinned to the live engine by Layer B. Figure is illustrative, answer is certified. |
| Catalog drifts from engine after an engine change | Layer-B live-engine guard fails CI on any drift. |
| `demoResults`'s wrong data leaks in | H2 structural ban in Layer-A guard. |
| Teacher gate lets students/free users in | Gate copied from Settings + teacher-capability predicate; link in UserMenu also gated; page redirects anonymous to `/auth`. |
| "Vẽ thử" loads but figure doesn't appear on canvas | Catalog route confirmed inside `GeometryProvider`; `loadGeometry` then `navigate('/teacher')`. |

## 10. Deliverables

1. `src/data/problemTypeCatalog.ts` — typed catalog (all types; 6 certified examples).
2. `src/pages/ProblemTypeCatalog.tsx` — teacher-gated page.
3. `src/App.tsx` — `/teacher/dang-bai` route above catch-all.
4. `src/components/UserMenu.tsx` — teacher-gated catalog link.
5. `src/data/__tests__/problemTypeCatalog.structure.test.ts` — Layer-A guard.
6. `api/_lib/__tests__/problemTypeCatalog.engine.test.js` — Layer-B live-engine guard.

Ship per `deploy-freely-to-prod`: build green → FF-push `claude/teacher-catalog:main` → confirm Vercel `state:success` via GitHub commit-status API.
