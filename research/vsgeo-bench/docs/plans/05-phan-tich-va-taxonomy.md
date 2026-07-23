# Phân tích thống kê & Bảng phân loại lỗi — Kế hoạch triển khai

> **Cho người thực thi (agentic worker):** REQUIRED SUB-SKILL: dùng superpowers:subagent-driven-development hoặc superpowers:executing-plans để làm theo từng Task. Các bước dùng checkbox `- [ ]` để theo dõi.

**Mục tiêu:** Biến kho log kết quả (`results/*.jsonl`) thành **bằng chứng khoa học** cho bốn giả thuyết H1–H4 — bảng độ chính xác nhiều chiều có khoảng tin cậy, kiểm định thống kê, khoảng rớt độ bền, tỉ lệ "tự tin nhưng sai" — và một **bảng phân loại lỗi** (taxonomy) được đo độ khách quan bằng hệ số Cohen's κ.

> **Phạm vi cho vòng trường (3 tháng):** accuracy, khoảng tin cậy bootstrap, McNemar, calibration ("tự tin nhưng sai"), Cohen's κ trên **tập nhãn nhỏ**, bảng phân loại lỗi (taxonomy), và file `summary.json`. **Để dành MỞ RỘNG (sau vòng trường):** hồi quy logistic, κ liên-nhãn quy mô lớn, và phân tích **H4** (hybrid LLM+engine).

**Kiến trúc:** Một thư mục `analysis/` gồm các module TypeScript thuần (không React, không server): `load.ts` đọc log JSONL và nối với dữ liệu bài (seed); `stats.ts` chứa các hàm thống kê (accuracy, bootstrap, McNemar, calibration); `kappa.ts` tính độ đồng thuận giữa hai người dán nhãn; `report.ts` là một script dòng lệnh (CLI) sinh báo cáo Markdown + file `summary.json` cho dashboard. Hai file nội dung (`taxonomy.md`, `labeling-guide.md`) do 2 em tự soạn theo quy trình chuẩn.

**Công nghệ:** TypeScript (ESM) · vitest (chạy test) · tsx (chạy script CLI, thêm ở kế hoạch 00) · Node built-in `fs`/`path` (đọc file) · dùng lại engine ký hiệu `api/_lib/kernel/` (chỉ ở tầng grader, không ở đây) · dùng lại `perturbations/metrics.ts` (kế hoạch 04) cho chỉ số độ bền.

---

## Dành cho 2 em (đọc trước)

Chào hai em! Đây là **hệ con cuối cùng biến số liệu thô thành kết luận khoa học** — trái tim của phần "kết quả" trong báo cáo NCKH. Hãy đọc kỹ mục này trước khi gõ dòng code đầu tiên.

**Hệ con này là gì?** Sau khi kế hoạch 03 (harness) chạy xong, mỗi lần một model giải một bài sẽ để lại **một dòng** trong file `results/*.jsonl` — gọi là một `EvalRecord`. Với ~300 bài × vài model × 3–5 lần chạy × cả bài gốc lẫn biến thể, ta có **hàng chục nghìn dòng**. Bản thân đống dòng đó **chưa nói lên điều gì**. Việc của hệ con này là **đọc, gom nhóm, đếm, và tính toán thống kê** để trả lời: *Model nào giỏi nhất? Giỏi ở chủ đề nào? Có thật sự suy luận hay chỉ dò mẫu? Khi sai thì nó có "biết mình sai" không?*

**Vì sao cần?** Hội đồng ViSEF sẽ hỏi: *"Sao em biết model A giỏi hơn model B, hay chỉ do may rủi trên vài bài?"* Câu trả lời khoa học không phải là "em thấy vậy", mà là **khoảng tin cậy 95%** (bootstrap) và **kiểm định McNemar** (§6.4). Tương tự, khi 2 em nói "model hay tự tin nhưng sai", hội đồng sẽ hỏi *"đo bằng gì?"* — câu trả lời là **chỉ số calibration** trong `stats.ts`. Và khi 2 em trình bày bảng phân loại lỗi, hội đồng sẽ hỏi *"sao biết cách phân loại của em không tùy tiện?"* — câu trả lời là **Cohen's κ** (§7): hai em dán nhãn độc lập, đo độ trùng khớp, κ càng cao thì taxonomy càng khách quan.

**Sản phẩm cuối trông thế nào?** Chạy một lệnh:
```
npx tsx research/vsgeo-bench/analysis/report.ts results/ data/seeds/ out/
```
sẽ sinh ra `out/report.md` (bảng Markdown đọc được ngay) và `out/summary.json` (dashboard ở kế hoạch 07 đọc để vẽ biểu đồ). Cộng thêm hai tài liệu `taxonomy.md` (định nghĩa 6 loại lỗi) và `labeling-guide.md` (quy trình dán nhãn) do 2 em tự viết và bảo vệ.

**Em nào phụ trách?** **Cả 2 em cùng làm.** Phần **code hạ tầng** (Task 1–9) thiên về Em 2 (Harness & Phân tích) nhưng Em 1 nên đọc hiểu để dùng số liệu. Phần **nội dung** (Task 10–11: codebook + dán nhãn) là **công sức trí tuệ chung của cả hai** — bắt buộc cả hai cùng dán nhãn độc lập thì mới đo được κ.

**Nằm ở tháng nào?** **T4** trong lộ trình (§11.2): *"Phân tích + taxonomy (κ) + dashboard + chạy khảo sát GV"*.

**Phụ thuộc kế hoạch nào?**
- **00 (Setup):** cần `tsx` đã được thêm vào `devDependencies` (để chạy `report.ts`), và cấu trúc thư mục `research/vsgeo-bench/` đã dựng.
- **02 (Grader/Oracle):** cung cấp `verdict` ("correct"/"incorrect"/"unsure") trong mỗi `EvalRecord` — ta chỉ *đọc* verdict, không tự chấm lại.
- **03 (Harness):** sinh ra `results/*.jsonl` — nguồn dữ liệu chính của hệ con này.
- **04 (Perturbations):** cung cấp `perturbations/metrics.ts` (ta *dùng lại* hàm `robustnessReport` cho H2, §5) và các `EvalRecord` có trường `perturbation`.

> **Lưu ý quan trọng về cách làm:** Hệ con này viết theo **TDD (Test-Driven Development)** — *viết test trước, xem nó đỏ (fail), rồi viết code cho nó xanh (pass)*. Nghe lạ nhưng cực kỳ đáng giá: test là "cái lồng" giữ cho code luôn đúng khi 2 em sửa về sau. Mỗi Task chia thành các bước 2–5 phút. Đừng nhảy cóc — làm tuần tự từng checkbox.

---

## Bối cảnh kỹ thuật cần nhớ (dùng đúng, đừng bịa)

- **Chạy toàn bộ test:** `npm test` (chạy vitest một lần rồi thoát).
- **Chạy đúng một file test:** `npm test -- <đường-dẫn-file>` (dấu `--` để chuyển tiếp đường dẫn cho vitest).
- **Chạy một script TS độc lập:** `npx tsx <đường-dẫn>`.
- **Vị trí test:** thư mục `__tests__/` cạnh file nguồn, tên `*.test.ts`, viết mô tả **bằng tiếng Việt**.
- **Import không cần đuôi `.ts`** (vitest & tsx tự phân giải). Nếu gặp lỗi phân giải thì thêm `.ts`.
- **Kiểu dùng chung (HỢP ĐỒNG):** tất cả module trong hệ con này dùng đúng tên `EvalRecord`, `Seed`, `Answer`, `AnswerType`, `Verdict` như định nghĩa trong `docs/design.md` — được khai báo tập trung tại `analysis/types.ts` (Task 1) để mọi hệ con khớp nhau.

---

### Task 1: Khai báo kiểu dùng chung + type guard (`types.ts`)

Đây là "từ điển kiểu dữ liệu" của cả tầng phân tích. Mọi module khác `import` từ đây, nên tên phải **khớp tuyệt đối** với HỢP ĐỒNG DÙNG CHUNG trong `design.md`.

**Files:**
- Create: `research/vsgeo-bench/analysis/types.ts`
- Test: `research/vsgeo-bench/analysis/__tests__/types.test.ts`

**Vì sao có `isVerdict`?** Khi đọc JSONL từ file ngoài, dữ liệu có thể hỏng (do harness ghi sai). Một *type guard* (`isVerdict`) giúp ta **bắt lỗi sớm ngay lúc đọc** thay vì để nó âm thầm làm sai thống kê.

- [ ] **Bước 1 — Viết test thất bại.** Tạo file `research/vsgeo-bench/analysis/__tests__/types.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isVerdict } from "../types";

describe("isVerdict — nhận diện verdict hợp lệ", () => {
  it("chấp nhận đúng ba giá trị hợp lệ", () => {
    expect(isVerdict("correct")).toBe(true);
    expect(isVerdict("incorrect")).toBe(true);
    expect(isVerdict("unsure")).toBe(true);
  });

  it("từ chối giá trị lạ hoặc sai kiểu", () => {
    expect(isVerdict("dung")).toBe(false);   // tiếng Việt không phải giá trị hợp lệ
    expect(isVerdict(1)).toBe(false);
    expect(isVerdict(null)).toBe(false);
    expect(isVerdict(undefined)).toBe(false);
  });
});
```

- [ ] **Bước 2 — Chạy test, thấy FAIL.** Lệnh:

```
npm test -- research/vsgeo-bench/analysis/__tests__/types.test.ts
```

Kỳ vọng: vitest báo **không phân giải được import** hoặc "Cannot find module '../types'" (vì `types.ts` chưa tồn tại). Đây là "màu đỏ" mong đợi — nghĩa là test thực sự đang kiểm thứ chưa có.

- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo file `research/vsgeo-bench/analysis/types.ts`:

```ts
// research/vsgeo-bench/analysis/types.ts
// "Từ điển kiểu" của tầng phân tích. Khớp HỢP ĐỒNG DÙNG CHUNG trong docs/design.md
// và các kế hoạch 00–04, để mọi hệ con ăn khớp nhau.

// Phán quyết của máy chấm (oracle, kế hoạch 02) cho một câu trả lời.
export type Verdict = "correct" | "incorrect" | "unsure";

// Các dạng đáp án (§3.4). Dùng cho tag của bài và cho answer.type.
export type AnswerType =
  | "rational"   // số hữu tỉ, vd "3/2"
  | "surd"       // biểu thức căn, vd "2√3"
  | "ratio"      // tỉ số
  | "point"      // toạ độ điểm
  | "vector"     // vector
  | "plane_eq"   // phương trình mặt phẳng
  | "line_eq"    // phương trình đường thẳng
  | "boolean"    // đúng/sai
  | "mcq";       // trắc nghiệm

// Kiểu prompt cố định (§6.2).
export type PromptStyle = "zero_shot" | "cot";

// MỘT bản ghi kết quả = MỘT dòng trong results/*.jsonl.
// (Một bản ghi cho mỗi bộ seed × model × run.)
export interface EvalRecord {
  seedId: string;
  modelId: string;
  run: number;
  promptStyle: PromptStyle;
  rawOutput: string;            // output thô của model (để soi taxonomy lỗi + calibration)
  extractedAnswer: string | null;
  verdict: Verdict;             // do oracle (kế hoạch 02) chấm
  latencyMs: number;
  costUsd?: number;
  // Nếu bản ghi này là của MỘT BIẾN THỂ (perturbation), ghi loại biến đổi + id bài gốc.
  perturbation?: { kind: string; parentSeedId: string };
}

// ---- Thông tin BÀI (seed) — bản rút gọn đủ cho phân tích, đọc từ data/seeds/*.json ----

export interface Answer {
  canonical: string;   // dạng chuẩn để oracle so khớp
  type: AnswerType;
  human_note?: string;
}

export interface SeedTags {
  topic: string[];                              // nhiều nhãn chủ đề, vd ["khoang_cach","vuong_goc"]
  answer_form: AnswerType;
  difficulty: 1 | 2 | 3 | 4;                    // 1 nhận biết → 4 vận dụng cao
  requires_auxiliary_construction: boolean;     // biến then chốt của H1
}

export interface Seed {
  id: string;
  source: { type: "exam" | "textbook" | "synthetic"; ref: string; license?: string };
  statement_vi: string;
  figure?: { points?: { id: string; x: number; y: number; z: number }[]; coords_given: boolean };
  answer: Answer;
  tags: SeedTags;
  solution_ref_vi?: string;
  verified_by_engine?: boolean;
  scale_degree?: number;
}

// Bảng tra bài theo id (nối nhanh EvalRecord với tag của bài).
export type SeedIndex = Map<string, Seed>;

// ---- Kiểu riêng của tầng phân tích ----

// Một dòng bảng độ chính xác: nhãn nhóm + số đúng/tổng + tỉ lệ + khoảng tin cậy 95%.
export interface AccuracyRow {
  key: string;
  correct: number;
  total: number;
  accuracy: number;         // correct / total, nằm trong [0, 1]
  ci95: [number, number];   // khoảng tin cậy bootstrap [thấp, cao]
}

// Kết quả kiểm định McNemar (so 2 model trên cùng tập bài).
export interface McNemarResult {
  b: number;           // số bài: A đúng & B sai
  c: number;           // số bài: A sai & B đúng
  statistic: number;   // thống kê χ² (có hiệu chỉnh liên tục)
  pValue: number;      // xấp xỉ hai phía, χ² 1 bậc tự do
}

// ---- HỢP ĐỒNG máy-đọc với kế hoạch 07 (dashboard): kiểu CANONICAL cho summary.json ----
// Đây là kiểu chuẩn của file summary.json. Dashboard (kế hoạch 07) IMPORT nguyên các kiểu
// này TỪ ĐÂY (analysis/types.ts) — KHÔNG tự định nghĩa lại — để hai hệ con luôn khớp nhau.

export type Difficulty = 1 | 2 | 3 | 4;
export type TopicStat = { topic: string; total: number; correct: number; accuracy: number };
export type DifficultyStat = { difficulty: Difficulty; total: number; correct: number; accuracy: number };
export type RobustnessStat = { baseAccuracy: number; perturbedAccuracy: number; gap: number };
export type ModelSummary = {
  modelId: string;
  overall: { total: number; correct: number; incorrect: number; unsure: number; accuracy: number };
  byTopic: TopicStat[];
  byDifficulty: DifficultyStat[];
  robustness: RobustnessStat;
  costUsd?: number;
  avgLatencyMs?: number;
};
export type BenchmarkSummary = { generatedAt: string; seedCount: number; models: ModelSummary[] };

// ---- Type guards: bắt lỗi sớm khi đọc dữ liệu ngoài (JSONL) ----

const VERDICTS: readonly Verdict[] = ["correct", "incorrect", "unsure"];

export function isVerdict(x: unknown): x is Verdict {
  return typeof x === "string" && (VERDICTS as readonly string[]).includes(x);
}
```

- [ ] **Bước 4 — Chạy test, thấy PASS.** Lệnh:

```
npm test -- research/vsgeo-bench/analysis/__tests__/types.test.ts
```

Kỳ vọng: `Test Files 1 passed`, `Tests 2 passed`. "Màu xanh" đầu tiên!

- [ ] **Bước 5 — Commit.**

```
git add research/vsgeo-bench/analysis/types.ts research/vsgeo-bench/analysis/__tests__/types.test.ts
git commit -m "feat(analysis): kiểu dùng chung + type guard isVerdict"
```

---

### Task 2: Đọc log JSONL + nối với seed (`load.ts`)

`results/*.jsonl` là định dạng **JSON Lines**: mỗi dòng là một object JSON độc lập (không phải một mảng lớn). Ưu điểm: harness ghi thêm từng dòng mà không phải đọc lại cả file. Việc của `load.ts` là **đọc các dòng đó thành `EvalRecord[]`** và **nối mỗi bản ghi với bài gốc** để biết tag (chủ đề, độ khó...).

**Files:**
- Create: `research/vsgeo-bench/analysis/load.ts`
- Test: `research/vsgeo-bench/analysis/__tests__/load.test.ts`

**Điểm tinh tế cần hiểu:** một bản ghi có thể là của **biến thể** (`perturbation` khác `undefined`). Khi đó tag của nó nằm ở **bài gốc** (`perturbation.parentSeedId`), không phải ở `seedId`. Hàm `seedForRecord` xử lý đúng chỗ này.

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/analysis/__tests__/load.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseJsonl, loadRecords, loadSeeds, seedForRecord } from "../load";
import type { Seed, SeedIndex } from "../types";

describe("parseJsonl — đọc chuỗi JSONL thành EvalRecord[]", () => {
  it("bỏ dòng trống, giữ dòng hợp lệ", () => {
    const text = [
      '{"seedId":"s1","modelId":"gpt","run":1,"promptStyle":"zero_shot","rawOutput":"x","extractedAnswer":"1","verdict":"correct","latencyMs":10}',
      "",
      '{"seedId":"s2","modelId":"gpt","run":1,"promptStyle":"cot","rawOutput":"y","extractedAnswer":null,"verdict":"incorrect","latencyMs":20}',
    ].join("\n");
    const recs = parseJsonl(text);
    expect(recs.length).toBe(2);
    expect(recs[0].seedId).toBe("s1");
    expect(recs[1].verdict).toBe("incorrect");
  });

  it("ném lỗi khi verdict không hợp lệ", () => {
    const bad = '{"seedId":"s1","modelId":"gpt","run":1,"promptStyle":"zero_shot","rawOutput":"x","extractedAnswer":null,"verdict":"dung","latencyMs":10}';
    expect(() => parseJsonl(bad)).toThrow();
  });
});

describe("seedForRecord — nối bản ghi với bài gốc", () => {
  const seeds: SeedIndex = new Map();
  const base: Seed = {
    id: "s1",
    source: { type: "synthetic", ref: "t" },
    statement_vi: "…",
    answer: { canonical: "1", type: "rational" },
    tags: { topic: ["the_tich"], answer_form: "rational", difficulty: 2, requires_auxiliary_construction: false },
  };
  seeds.set("s1", base);

  it("bản ghi thường tra theo seedId", () => {
    const rec = { seedId: "s1", modelId: "m", run: 1, promptStyle: "zero_shot" as const, rawOutput: "", extractedAnswer: null, verdict: "correct" as const, latencyMs: 0 };
    expect(seedForRecord(rec, seeds)?.id).toBe("s1");
  });

  it("bản ghi biến thể tra theo parentSeedId", () => {
    const rec = { seedId: "s1__rename", modelId: "m", run: 1, promptStyle: "zero_shot" as const, rawOutput: "", extractedAnswer: null, verdict: "correct" as const, latencyMs: 0, perturbation: { kind: "rename", parentSeedId: "s1" } };
    expect(seedForRecord(rec, seeds)?.id).toBe("s1");
  });
});

describe("loadRecords / loadSeeds — đọc từ thư mục thật", () => {
  it("đọc gộp nhiều file trong thư mục", () => {
    const root = mkdtempSync(join(tmpdir(), "vsgeo-load-"));
    const resultsDir = join(root, "results");
    const seedsDir = join(root, "seeds");
    mkdirSync(resultsDir);
    mkdirSync(seedsDir);
    writeFileSync(join(resultsDir, "gpt.jsonl"),
      '{"seedId":"s1","modelId":"gpt","run":1,"promptStyle":"zero_shot","rawOutput":"x","extractedAnswer":"1","verdict":"correct","latencyMs":10}\n');
    writeFileSync(join(seedsDir, "s1.json"), JSON.stringify({
      id: "s1", source: { type: "synthetic", ref: "t" }, statement_vi: "…",
      answer: { canonical: "1", type: "rational" },
      tags: { topic: ["the_tich"], answer_form: "rational", difficulty: 1, requires_auxiliary_construction: false },
    }));
    const recs = loadRecords(resultsDir);
    const seeds = loadSeeds(seedsDir);
    expect(recs.length).toBe(1);
    expect(seeds.get("s1")?.tags.difficulty).toBe(1);
  });
});
```

- [ ] **Bước 2 — Chạy test, thấy FAIL.**

```
npm test -- research/vsgeo-bench/analysis/__tests__/load.test.ts
```

Kỳ vọng: lỗi không phân giải được import `../load` (file chưa tồn tại).

- [ ] **Bước 3 — Viết code để pass.** Tạo `research/vsgeo-bench/analysis/load.ts`:

```ts
// research/vsgeo-bench/analysis/load.ts
// Đọc log kết quả (JSONL) + dữ liệu bài (seed), rồi nối chúng lại.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { EvalRecord, Seed, SeedIndex } from "./types";
import { isVerdict } from "./types";

// Đọc MỘT chuỗi JSONL -> EvalRecord[]. Bỏ dòng trống. Ném lỗi RÕ nếu verdict sai.
export function parseJsonl(text: string): EvalRecord[] {
  const out: EvalRecord[] = [];
  const lines = text.split(/\r?\n/); // \r?\n để chịu được cả file Windows (CRLF) lẫn Unix (LF)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue; // bỏ dòng trống
    let obj: any;
    try {
      obj = JSON.parse(line);
    } catch {
      throw new Error(`Dòng ${i + 1}: JSON hỏng: ${line.slice(0, 80)}`);
    }
    if (!isVerdict(obj.verdict)) {
      throw new Error(`Dòng ${i + 1}: verdict không hợp lệ: ${JSON.stringify(obj.verdict)}`);
    }
    out.push(obj as EvalRecord);
  }
  return out;
}

// Đọc TẤT CẢ file .jsonl trong một thư mục (vd results/) và gộp thành một mảng.
export function loadRecords(dir: string): EvalRecord[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  const all: EvalRecord[] = [];
  for (const f of files) {
    all.push(...parseJsonl(readFileSync(join(dir, f), "utf8")));
  }
  return all;
}

// Đọc thư mục seeds/*.json -> SeedIndex (Map theo id) để tra nhanh.
export function loadSeeds(dir: string): SeedIndex {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const index: SeedIndex = new Map();
  for (const f of files) {
    const seed = JSON.parse(readFileSync(join(dir, f), "utf8")) as Seed;
    index.set(seed.id, seed);
  }
  return index;
}

// Nối một bản ghi với BÀI GỐC:
// - Nếu là biến thể -> tra theo perturbation.parentSeedId.
// - Ngược lại -> tra theo seedId.
export function seedForRecord(rec: EvalRecord, seeds: SeedIndex): Seed | undefined {
  const baseId = rec.perturbation ? rec.perturbation.parentSeedId : rec.seedId;
  return seeds.get(baseId);
}
```

- [ ] **Bước 4 — Chạy test, thấy PASS.**

```
npm test -- research/vsgeo-bench/analysis/__tests__/load.test.ts
```

Kỳ vọng: `Tests 4 passed` (2 cho parseJsonl, 2 cho seedForRecord, 1 cho loadRecords/loadSeeds — tổng 5 `it`, đếm theo máy). Miễn là tất cả xanh.

- [ ] **Bước 5 — Commit.**

```
git add research/vsgeo-bench/analysis/load.ts research/vsgeo-bench/analysis/__tests__/load.test.ts
git commit -m "feat(analysis): đọc log JSONL + nối bản ghi với seed"
```

---

### Task 3: Bộ sinh số ngẫu nhiên tất định (`rng.ts`)

**Vì sao cần một file riêng cho việc "random"?** Bootstrap (Task 4) phải **lấy mẫu ngẫu nhiên**. Nếu dùng `Math.random()` thì **mỗi lần chạy ra số khác nhau** → test không thể kiểm được (kết quả nhảy loạn). Giải pháp chuẩn khoa học: dùng một **PRNG tất định** (deterministic pseudo-random number generator) — truyền cùng một *seed* (hạt giống) thì ra **cùng một dãy số**. Nhờ vậy test tái lập được, và báo cáo cũng tái lập được (điểm cộng lớn với hội đồng: "kết quả của em chạy lại ra y hệt").

**Files:**
- Create: `research/vsgeo-bench/analysis/rng.ts`
- Test: `research/vsgeo-bench/analysis/__tests__/rng.test.ts`

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/analysis/__tests__/rng.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mulberry32, randInt } from "../rng";

describe("mulberry32 — PRNG tất định", () => {
  it("cùng seed cho cùng dãy số", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("mọi giá trị nằm trong [0, 1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 200; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("seed khác thường cho số khác", () => {
    expect(mulberry32(1)()).not.toEqual(mulberry32(2)());
  });
});

describe("randInt — chỉ số nguyên 0..n-1", () => {
  it("luôn nằm trong khoảng hợp lệ", () => {
    const r = mulberry32(99);
    for (let i = 0; i < 200; i++) {
      const k = randInt(r, 5);
      expect(Number.isInteger(k)).toBe(true);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThan(5);
    }
  });
});
```

- [ ] **Bước 2 — Chạy test, thấy FAIL.**

```
npm test -- research/vsgeo-bench/analysis/__tests__/rng.test.ts
```

Kỳ vọng: không phân giải được `../rng`.

- [ ] **Bước 3 — Viết code để pass.** Tạo `research/vsgeo-bench/analysis/rng.ts`:

```ts
// research/vsgeo-bench/analysis/rng.ts
// PRNG tất định "mulberry32" — nhỏ gọn, chất lượng đủ tốt cho bootstrap.
// Nguồn thuật toán: mulberry32 (thuật toán công khai, phổ biến). Ta CHỈ dùng lại.

// Một Rng là hàm không tham số, mỗi lần gọi trả một số thực trong [0, 1).
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0; // ép về nguyên 32-bit không dấu
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // chia cho 2^32 -> [0,1)
  };
}

// Lấy một chỉ số nguyên ngẫu nhiên trong 0..n-1 từ một Rng.
export function randInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n);
}
```

- [ ] **Bước 4 — Chạy test, thấy PASS.**

```
npm test -- research/vsgeo-bench/analysis/__tests__/rng.test.ts
```

Kỳ vọng: tất cả xanh (`Tests 4 passed`).

- [ ] **Bước 5 — Commit.**

```
git add research/vsgeo-bench/analysis/rng.ts research/vsgeo-bench/analysis/__tests__/rng.test.ts
git commit -m "feat(analysis): PRNG tất định mulberry32 cho bootstrap"
```

---

### Task 4: Khoảng tin cậy bootstrap (`stats.ts` — phần 1)

**Bootstrap là gì (giải thích thật dễ)?** Ta có một mẫu, ví dụ 50 lần model trả lời, đúng 40 lần → accuracy = 0.8. Nhưng 0.8 này *đáng tin đến đâu*? Nếu chạy lại trên 50 bài khác, liệu có ra 0.8 hay 0.6? Bootstrap trả lời bằng một mẹo thông minh: **lấy mẫu lại có hoàn lại** (resample with replacement) từ chính 50 kết quả đó, hàng nghìn lần, mỗi lần tính accuracy → ta được một "đám mây" các accuracy khả dĩ. Lấy **phân vị 2.5% và 97.5%** của đám mây đó → **khoảng tin cậy 95%**. Nếu khoảng hẹp (vd [0.72, 0.86]) → số liệu chắc chắn; nếu rộng (vd [0.5, 0.95]) → cần thêm dữ liệu. Đây chính là §6.4: *"Khoảng tin cậy 95% bằng bootstrap"*.

**Files:**
- Create: `research/vsgeo-bench/analysis/stats.ts`
- Test: `research/vsgeo-bench/analysis/__tests__/stats.test.ts`

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/analysis/__tests__/stats.test.ts` (file này sẽ lớn dần qua Task 4–7; bắt đầu với phần bootstrap):

```ts
import { describe, it, expect } from "vitest";
import { bootstrapCI } from "../stats";

describe("bootstrapCI — khoảng tin cậy 95% cho tỉ lệ nhị phân", () => {
  it("mẫu toàn 1 -> khoảng [1, 1]", () => {
    expect(bootstrapCI([1, 1, 1, 1], 1000, 123)).toEqual([1, 1]);
  });

  it("mẫu toàn 0 -> khoảng [0, 0]", () => {
    expect(bootstrapCI([0, 0, 0, 0], 1000, 123)).toEqual([0, 0]);
  });

  it("mẫu rỗng -> [0, 0]", () => {
    expect(bootstrapCI([], 1000, 123)).toEqual([0, 0]);
  });

  it("cùng seed -> kết quả tất định (chạy lại y hệt)", () => {
    const sample = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0]; // mean = 0.6
    expect(bootstrapCI(sample, 2000, 777)).toEqual(bootstrapCI(sample, 2000, 777));
  });

  it("khoảng bao quanh giá trị trung bình quan sát", () => {
    const sample = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0]; // mean = 0.6
    const [lo, hi] = bootstrapCI(sample, 2000, 777);
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeLessThanOrEqual(1);
    expect(lo).toBeLessThanOrEqual(0.6);
    expect(hi).toBeGreaterThanOrEqual(0.6);
  });
});
```

- [ ] **Bước 2 — Chạy test, thấy FAIL.**

```
npm test -- research/vsgeo-bench/analysis/__tests__/stats.test.ts
```

Kỳ vọng: không phân giải được `../stats`.

- [ ] **Bước 3 — Viết code để pass.** Tạo `research/vsgeo-bench/analysis/stats.ts`:

```ts
// research/vsgeo-bench/analysis/stats.ts
// Các hàm thống kê cho benchmark. Xây dần qua Task 4–7.
import type { EvalRecord, AccuracyRow, McNemarResult } from "./types";
import { mulberry32, randInt, type Rng } from "./rng";

// Quy ước chấm điểm nhị phân: chỉ "correct" tính là 1; "incorrect" VÀ "unsure" tính là 0.
// Vì sao unsure = 0? Trong thi cử, "không đưa được đáp án" cũng là không được điểm.
// Ta ghi rõ quy ước này để bảo vệ trước hội đồng (và để tính riêng tỉ lệ unsure nếu cần).
export function isCorrect(rec: EvalRecord): number {
  return rec.verdict === "correct" ? 1 : 0;
}

// Khoảng tin cậy 95% cho tỉ lệ nhị phân bằng bootstrap percentile.
// sample: mảng 0/1. iters: số lần lấy mẫu lại. seed: cho RNG tất định (test kiểm được).
export function bootstrapCI(sample: number[], iters = 2000, seed = 12345): [number, number] {
  const n = sample.length;
  if (n === 0) return [0, 0];
  const rng: Rng = mulberry32(seed);
  const means: number[] = [];
  for (let it = 0; it < iters; it++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += sample[randInt(rng, n)]; // lấy MỘT phần tử ngẫu nhiên (có hoàn lại)
    }
    means.push(sum / n);
  }
  means.sort((a, b) => a - b);
  const lo = means[Math.floor(0.025 * iters)];
  const hi = means[Math.floor(0.975 * iters)];
  return [lo, hi];
}
```

- [ ] **Bước 4 — Chạy test, thấy PASS.**

```
npm test -- research/vsgeo-bench/analysis/__tests__/stats.test.ts
```

Kỳ vọng: `Tests 5 passed` (5 `it` của bootstrap).

- [ ] **Bước 5 — Commit.**

```
git add research/vsgeo-bench/analysis/stats.ts research/vsgeo-bench/analysis/__tests__/stats.test.ts
git commit -m "feat(analysis): bootstrapCI cho tỉ lệ nhị phân (seed tất định)"
```

---

### Task 5: Độ chính xác theo nhiều chiều (`stats.ts` — phần 2: `accuracyBy`)

Đây là hàm **trung tâm** cho H1 và §6.3: gom các bản ghi theo một "khóa" (chủ đề, độ khó, model, cờ hình phụ...) rồi tính accuracy + khoảng tin cậy cho từng nhóm. `keyFn` có thể trả **một chuỗi** (vd model) hoặc **một mảng chuỗi** (vd một bài có nhiều chủ đề → tính vào nhiều nhóm).

**Files:**
- Modify: `research/vsgeo-bench/analysis/stats.ts`
- Modify (test): `research/vsgeo-bench/analysis/__tests__/stats.test.ts`

- [ ] **Bước 1 — Viết test thất bại.** Thêm vào cuối `stats.test.ts` (giữ nguyên phần cũ):

```ts
import { accuracyBy } from "../stats";
import type { EvalRecord, Verdict } from "../types";

// Hàm tạo bản ghi gọn cho test.
function rec(seedId: string, modelId: string, verdict: Verdict, raw = ""): EvalRecord {
  return {
    seedId, modelId, run: 1, promptStyle: "zero_shot",
    rawOutput: raw, extractedAnswer: null, verdict, latencyMs: 0,
  };
}

describe("accuracyBy — gom nhóm & tính accuracy", () => {
  const records: EvalRecord[] = [
    rec("s1", "gpt", "correct"),
    rec("s1", "gpt", "incorrect"),
    rec("s2", "gemini", "correct"),
    rec("s2", "gemini", "correct"),
  ];

  it("gom theo model, đếm đúng/tổng và accuracy", () => {
    const rows = accuracyBy(records, (r) => r.modelId);
    const gpt = rows.find((r) => r.key === "gpt")!;
    expect(gpt.correct).toBe(1);
    expect(gpt.total).toBe(2);
    expect(gpt.accuracy).toBe(0.5);
    const gem = rows.find((r) => r.key === "gemini")!;
    expect(gem.accuracy).toBe(1);
  });

  it("mỗi dòng có khoảng tin cậy 95%", () => {
    const rows = accuracyBy(records, (r) => r.modelId, { ciIters: 500, seed: 1 });
    for (const row of rows) {
      expect(row.ci95[0]).toBeLessThanOrEqual(row.accuracy);
      expect(row.ci95[1]).toBeGreaterThanOrEqual(row.accuracy);
    }
  });

  it("keyFn trả MẢNG -> tính vào nhiều nhóm", () => {
    const rows = accuracyBy(records, () => ["A", "B"]);
    expect(rows.find((r) => r.key === "A")!.total).toBe(4);
    expect(rows.find((r) => r.key === "B")!.total).toBe(4);
  });

  it("sắp xếp các dòng theo key cho ổn định", () => {
    const rows = accuracyBy(records, (r) => r.modelId);
    expect(rows.map((r) => r.key)).toEqual(["gemini", "gpt"]);
  });
});
```

- [ ] **Bước 2 — Chạy test, thấy FAIL.**

```
npm test -- research/vsgeo-bench/analysis/__tests__/stats.test.ts
```

Kỳ vọng: `accuracyBy` chưa được export → lỗi import / "accuracyBy is not a function".

- [ ] **Bước 3 — Viết code để pass.** Thêm vào cuối `research/vsgeo-bench/analysis/stats.ts`:

```ts
// Gom nhóm bản ghi theo keyFn rồi tính accuracy + CI 95% cho từng nhóm.
// keyFn trả string (một nhóm) HOẶC string[] (bản ghi thuộc nhiều nhóm, vd bài nhiều chủ đề).
// opts.ciIters, opts.seed: điều khiển bootstrap (mặc định 2000 vòng, seed 12345).
export function accuracyBy(
  records: EvalRecord[],
  keyFn: (r: EvalRecord) => string | string[],
  opts: { ciIters?: number; seed?: number } = {},
): AccuracyRow[] {
  const buckets = new Map<string, number[]>(); // key -> mảng 0/1
  for (const rec of records) {
    const keys = keyFn(rec);
    const list = Array.isArray(keys) ? keys : [keys];
    for (const k of list) {
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k)!.push(isCorrect(rec));
    }
  }
  const rows: AccuracyRow[] = [];
  for (const [key, sample] of buckets) {
    const correct = sample.reduce((a, b) => a + b, 0);
    const total = sample.length;
    const accuracy = total === 0 ? 0 : correct / total;
    const ci95 = bootstrapCI(sample, opts.ciIters ?? 2000, opts.seed ?? 12345);
    rows.push({ key, correct, total, accuracy, ci95 });
  }
  rows.sort((a, b) => a.key.localeCompare(b.key)); // thứ tự ổn định để bảng nhất quán
  return rows;
}
```

- [ ] **Bước 4 — Chạy test, thấy PASS.**

```
npm test -- research/vsgeo-bench/analysis/__tests__/stats.test.ts
```

Kỳ vọng: tổng số test tăng, tất cả xanh (5 bootstrap + 4 accuracyBy).

- [ ] **Bước 5 — Commit.**

```
git add research/vsgeo-bench/analysis/stats.ts research/vsgeo-bench/analysis/__tests__/stats.test.ts
git commit -m "feat(analysis): accuracyBy gom nhóm nhiều chiều + CI"
```

---

### Task 6: Kiểm định McNemar (`stats.ts` — phần 3)

**McNemar để làm gì?** Khi so **hai model trên CÙNG một tập bài** (dữ liệu *ghép cặp* — paired), câu hỏi là: *"Chênh lệch accuracy giữa A và B có thật, hay chỉ do may rủi?"* McNemar chỉ nhìn vào các bài mà **hai model bất đồng**: `b` = số bài A đúng B sai, `c` = số bài A sai B đúng. Nếu `b` và `c` gần bằng nhau → không có bằng chứng ai giỏi hơn. Nếu lệch mạnh → khác biệt có ý nghĩa thống kê. Ta dùng công thức có **hiệu chỉnh liên tục** (continuity correction) cho ổn định: χ² = (|b−c| − 1)² / (b+c). Đây là §6.4: *"Kiểm định McNemar... dữ liệu ghép cặp"*.

**Files:**
- Modify: `research/vsgeo-bench/analysis/stats.ts`
- Modify (test): `research/vsgeo-bench/analysis/__tests__/stats.test.ts`

- [ ] **Bước 1 — Viết test thất bại.** Thêm vào cuối `stats.test.ts`:

```ts
import { mcnemar } from "../stats";

describe("mcnemar — kiểm định ghép cặp cho 2 model", () => {
  it("b = c: gần như không khác biệt (p lớn)", () => {
    const r = mcnemar(10, 10);
    expect(r.statistic).toBeCloseTo(0.05, 3); // (|0|-1)^2 / 20 = 0.05
    expect(r.pValue).toBeGreaterThan(0.5);
  });

  it("b + c = 0: không có bài bất đồng -> p = 1", () => {
    const r = mcnemar(0, 0);
    expect(r.statistic).toBe(0);
    expect(r.pValue).toBe(1);
  });

  it("khác biệt vừa: b=25, c=15 -> χ² = 2.025", () => {
    const r = mcnemar(25, 15);
    expect(r.statistic).toBeCloseTo(2.025, 3);
    expect(r.pValue).toBeCloseTo(0.155, 2); // tra bảng χ² 1 bậc tự do
  });

  it("khác biệt mạnh: b=30, c=5 -> p rất nhỏ", () => {
    const r = mcnemar(30, 5);
    expect(r.statistic).toBeCloseTo(16.457, 2); // (24-1)^2 / 35
    expect(r.pValue).toBeLessThan(0.001);
  });
});
```

- [ ] **Bước 2 — Chạy test, thấy FAIL.**

```
npm test -- research/vsgeo-bench/analysis/__tests__/stats.test.ts
```

Kỳ vọng: `mcnemar` chưa export.

- [ ] **Bước 3 — Viết code để pass.** Thêm vào cuối `research/vsgeo-bench/analysis/stats.ts`:

```ts
// Kiểm định McNemar cho dữ liệu ghép cặp (2 model trên cùng tập bài).
// b = số bài A đúng & B sai; c = số bài A sai & B đúng.
// χ² = (|b - c| - 1)^2 / (b + c)  (có hiệu chỉnh liên tục).
export function mcnemar(b: number, c: number): McNemarResult {
  const n = b + c;
  if (n === 0) return { b, c, statistic: 0, pValue: 1 };
  const statistic = Math.pow(Math.abs(b - c) - 1, 2) / n;
  const pValue = chiSquarePValue1df(statistic);
  return { b, c, statistic, pValue };
}

// p-value cho χ² với 1 bậc tự do = erfc( sqrt(x / 2) ).
function chiSquarePValue1df(x: number): number {
  if (x <= 0) return 1;
  return erfc(Math.sqrt(x / 2));
}

// Xấp xỉ hàm bù sai số erfc(x) (sai số < 1.2e-7). Nguồn: Numerical Recipes (công thức công khai).
// Ta CHỈ dùng lại công thức chuẩn này để tránh phụ thuộc thư viện thống kê ngoài.
function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const ans =
    t *
    Math.exp(
      -z * z - 1.26551223 +
        t * (1.00002368 +
          t * (0.37409196 +
            t * (0.09678418 +
              t * (-0.18628806 +
                t * (0.27886807 +
                  t * (-1.13520398 +
                    t * (1.48851587 +
                      t * (-0.82215223 + t * 0.17087277))))))))
    );
  return x >= 0 ? ans : 2 - ans;
}
```

- [ ] **Bước 4 — Chạy test, thấy PASS.**

```
npm test -- research/vsgeo-bench/analysis/__tests__/stats.test.ts
```

Kỳ vọng: tất cả xanh (thêm 4 test McNemar).

- [ ] **Bước 5 — Commit.**

```
git add research/vsgeo-bench/analysis/stats.ts research/vsgeo-bench/analysis/__tests__/stats.test.ts
git commit -m "feat(analysis): kiểm định McNemar cho so sánh model ghép cặp"
```

---

### Task 7: Tỉ lệ "tự tin nhưng sai" — calibration (`stats.ts` — phần 4)

**Đây là chỉ số cho H3** (§6.3: *"Tỉ lệ tự tin nhưng sai"*). Ý tưởng: đếm xem trong các câu **model trả lời SAI**, có bao nhiêu câu nó vẫn **trình bày quả quyết** (dứt khoát, không rào đón, có kết luận `\boxed{}`). Tỉ lệ này cao ⇒ model "tự tin mù quáng" ⇒ nguy hiểm khi dạy học sinh.

> **Hạn chế phải nêu rõ (trung thực khoa học):** "quả quyết" ở đây được đo bằng **heuristic đơn giản** dựa trên từ ngữ, KHÔNG phải đo "độ tự tin thật" bên trong model. Một model có thể quả quyết mà không dùng `\boxed`, hoặc rào đón mà vẫn sai. Ta **chấp nhận sai số này và báo cáo minh bạch** — đồng thời §8 (khảo sát giáo viên) là kiểm chứng độc lập ở phía con người cho cùng giả thuyết H3.

**Files:**
- Modify: `research/vsgeo-bench/analysis/stats.ts`
- Modify (test): `research/vsgeo-bench/analysis/__tests__/stats.test.ts`

- [ ] **Bước 1 — Viết test thất bại.** Thêm vào cuối `stats.test.ts`:

```ts
import { isConfident, calibrationRate } from "../stats";

describe("isConfident — heuristic 'quả quyết'", () => {
  it("có kết luận + không rào đón -> quả quyết", () => {
    expect(isConfident("... Vậy đáp án là \\boxed{3}.")).toBe(true);
  });
  it("có từ rào đón -> KHÔNG quả quyết", () => {
    expect(isConfident("Tôi nghĩ có thể là \\boxed{3} nhưng không chắc.")).toBe(false);
  });
  it("không có kết luận nào -> KHÔNG quả quyết", () => {
    expect(isConfident("Bài này cần tính khoảng cách...")).toBe(false);
  });
});

describe("calibrationRate — tỉ lệ 'tự tin nhưng sai'", () => {
  it("chỉ tính trên câu SAI; đếm câu sai quả quyết", () => {
    const records: EvalRecord[] = [
      rec("s1", "gpt", "incorrect", "Vậy đáp án \\boxed{2}."),      // sai + quả quyết
      rec("s2", "gpt", "incorrect", "Có lẽ là 2, mình không chắc."), // sai + rào đón
      rec("s3", "gpt", "correct", "Vậy \\boxed{1}."),               // đúng -> bỏ qua
    ];
    const r = calibrationRate(records);
    expect(r.totalWrong).toBe(2);
    expect(r.confidentWrong).toBe(1);
    expect(r.rate).toBe(0.5);
  });

  it("không có câu sai -> rate = 0", () => {
    const r = calibrationRate([rec("s1", "gpt", "correct", "\\boxed{1}")]);
    expect(r.rate).toBe(0);
  });
});
```

- [ ] **Bước 2 — Chạy test, thấy FAIL.**

```
npm test -- research/vsgeo-bench/analysis/__tests__/stats.test.ts
```

Kỳ vọng: `isConfident` / `calibrationRate` chưa export.

- [ ] **Bước 3 — Viết code để pass.** Thêm vào cuối `research/vsgeo-bench/analysis/stats.ts`:

```ts
// Từ ngữ "rào đón" (hedging): dấu hiệu model KHÔNG chắc chắn.
const HEDGE_WORDS = [
  "có thể", "có lẽ", "không chắc", "chưa chắc", "tôi nghĩ", "mình nghĩ",
  "khoảng chừng", "ước chừng", "không chắc chắn", "hình như", "dường như",
  "maybe", "perhaps", "possibly", "i think", "not sure", "uncertain",
];

// Dấu hiệu có "kết luận": trình bày một đáp án cuối một cách dứt khoát.
const CONCLUDE_MARKERS = ["\\boxed", "vậy", "kết luận", "đáp án", "suy ra", "do đó"];

// "Quả quyết" = CÓ kết luận VÀ KHÔNG có từ rào đón. Heuristic đơn giản (hạn chế: xem §7 kế hoạch).
export function isConfident(rawOutput: string): boolean {
  const text = rawOutput.toLowerCase();
  const hedged = HEDGE_WORDS.some((w) => text.includes(w));
  const concluded = CONCLUDE_MARKERS.some((w) => text.includes(w.toLowerCase()));
  return concluded && !hedged;
}

// Tỉ lệ "tự tin nhưng sai" = (số câu SAI trình bày quả quyết) / (số câu SAI).
export function calibrationRate(records: EvalRecord[]): {
  confidentWrong: number;
  totalWrong: number;
  rate: number;
} {
  const wrong = records.filter((r) => r.verdict === "incorrect");
  const confidentWrong = wrong.filter((r) => isConfident(r.rawOutput)).length;
  const rate = wrong.length === 0 ? 0 : confidentWrong / wrong.length;
  return { confidentWrong, totalWrong: wrong.length, rate };
}
```

- [ ] **Bước 4 — Chạy test, thấy PASS.**

```
npm test -- research/vsgeo-bench/analysis/__tests__/stats.test.ts
```

Kỳ vọng: tất cả xanh (thêm 5 test calibration/isConfident).

- [ ] **Bước 5 — Commit.**

```
git add research/vsgeo-bench/analysis/stats.ts research/vsgeo-bench/analysis/__tests__/stats.test.ts
git commit -m "feat(analysis): calibrationRate 'tự tin nhưng sai' cho H3"
```

---

### Task 8: Cohen's κ — độ đồng thuận dán nhãn (`kappa.ts`)

**Đây là "vũ khí" bảo vệ taxonomy** (§7). Sau khi 2 em **dán nhãn lỗi độc lập** cho một mẫu bản ghi, ta cần một con số chứng minh cách phân loại **khách quan** chứ không tùy tiện. Đó là Cohen's κ:
- κ = 1: hai người trùng nhau hoàn toàn.
- κ ≈ 0: trùng nhau chỉ ngang mức... đoán bừa (may rủi).
- κ < 0: tệ hơn cả đoán bừa.
- Quy ước diễn giải phổ biến (Landis & Koch): 0.61–0.80 "đáng kể (substantial)", > 0.80 "gần như hoàn hảo".

Công thức: κ = (Po − Pe) / (1 − Pe), với Po = tỉ lệ trùng khớp quan sát, Pe = tỉ lệ trùng khớp *kỳ vọng do may rủi*.

**Files:**
- Create: `research/vsgeo-bench/analysis/kappa.ts`
- Test: `research/vsgeo-bench/analysis/__tests__/kappa.test.ts`

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/analysis/__tests__/kappa.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { cohensKappa } from "../kappa";

describe("cohensKappa — độ đồng thuận hai người dán nhãn", () => {
  it("đồng thuận hoàn toàn (nhiều nhãn khác nhau) -> κ = 1", () => {
    const a = ["e1", "e2", "e3", "e1"];
    const b = ["e1", "e2", "e3", "e1"];
    expect(cohensKappa(a, b)).toBeCloseTo(1, 10);
  });

  it("đồng thuận đúng bằng mức may rủi -> κ = 0", () => {
    // A: 1,1,0,0 ; B: 1,0,1,0 -> Po=0.5, Pe=0.5 -> κ=0
    const a = ["1", "1", "0", "0"];
    const b = ["1", "0", "1", "0"];
    expect(cohensKappa(a, b)).toBeCloseTo(0, 10);
  });

  it("ca biết trước -> κ ≈ 0.615", () => {
    // Po=0.8, Pe=0.48 -> κ=(0.8-0.48)/(1-0.48)=0.6154
    const a = ["y", "y", "n", "n", "y"];
    const b = ["y", "n", "n", "n", "y"];
    expect(cohensKappa(a, b)).toBeCloseTo(0.615, 3);
  });

  it("cả hai gán CÙNG một nhãn cho tất cả -> κ = 1 (theo quy ước)", () => {
    expect(cohensKappa(["e1", "e1"], ["e1", "e1"])).toBe(1);
  });

  it("hai mảng khác độ dài -> ném lỗi", () => {
    expect(() => cohensKappa(["a"], ["a", "b"])).toThrow();
  });

  it("mảng rỗng -> ném lỗi", () => {
    expect(() => cohensKappa([], [])).toThrow();
  });
});
```

- [ ] **Bước 2 — Chạy test, thấy FAIL.**

```
npm test -- research/vsgeo-bench/analysis/__tests__/kappa.test.ts
```

Kỳ vọng: không phân giải được `../kappa`.

- [ ] **Bước 3 — Viết code để pass.** Tạo `research/vsgeo-bench/analysis/kappa.ts`:

```ts
// research/vsgeo-bench/analysis/kappa.ts
// Cohen's kappa — đo độ đồng thuận giữa HAI người dán nhãn, trừ đi phần trùng do may rủi.
// labelsA[i], labelsB[i] = nhãn của cùng mục i bởi hai người. Hai mảng phải cùng độ dài.
export function cohensKappa(labelsA: string[], labelsB: string[]): number {
  if (labelsA.length !== labelsB.length) {
    throw new Error("Hai mảng nhãn phải cùng độ dài");
  }
  const n = labelsA.length;
  if (n === 0) throw new Error("Cần ít nhất một mục để tính kappa");

  // Po: tỉ lệ hai người trùng nhãn (đồng thuận quan sát).
  let agree = 0;
  for (let i = 0; i < n; i++) if (labelsA[i] === labelsB[i]) agree++;
  const po = agree / n;

  // Pe: đồng thuận kỳ vọng do may rủi = Σ (tần suất nhãn của A) × (tần suất nhãn của B).
  const catsA = new Map<string, number>();
  const catsB = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    catsA.set(labelsA[i], (catsA.get(labelsA[i]) ?? 0) + 1);
    catsB.set(labelsB[i], (catsB.get(labelsB[i]) ?? 0) + 1);
  }
  const cats = new Set<string>([...catsA.keys(), ...catsB.keys()]);
  let pe = 0;
  for (const c of cats) {
    const pa = (catsA.get(c) ?? 0) / n;
    const pb = (catsB.get(c) ?? 0) / n;
    pe += pa * pb;
  }

  // Nếu Pe = 1 (cả hai gán CÙNG một nhãn cho mọi mục) -> mẫu số 0. Quy ước: đồng thuận hoàn toàn -> 1.
  if (pe === 1) return 1;
  return (po - pe) / (1 - pe);
}
```

- [ ] **Bước 4 — Chạy test, thấy PASS.**

```
npm test -- research/vsgeo-bench/analysis/__tests__/kappa.test.ts
```

Kỳ vọng: `Tests 6 passed`.

- [ ] **Bước 5 — Commit.**

```
git add research/vsgeo-bench/analysis/kappa.ts research/vsgeo-bench/analysis/__tests__/kappa.test.ts
git commit -m "feat(analysis): cohensKappa đo đồng thuận dán nhãn cho taxonomy"
```

---

### Task 9: Báo cáo Markdown + summary.json (`report.ts`)

Đây là **điểm hội tụ**: một script CLI đọc `results/` + `data/seeds/`, gọi các hàm ở Task 4–7, và sinh ra:
- `report.md` — bảng Markdown đọc ngay, **ánh xạ rõ mỗi bảng tới H1/H2/H3**.
- `summary.json` — dữ liệu **máy-đọc** cho dashboard (kế hoạch 07); kiểu canonical là **`BenchmarkSummary`** ở `analysis/types.ts` (kế hoạch 07 import trực tiếp từ đó, không tự định nghĩa lại).

Để test được, ta tách các hàm **thuần** (`buildReport` sinh chuỗi Markdown cho `report.md`; `buildBenchmarkSummary` sinh object `BenchmarkSummary` cho `summary.json`) khỏi phần **đọc/ghi file** (`main` — chỉ chạy khi gọi bằng `tsx`).

> **Phụ thuộc chéo (kế hoạch 04):** Cho **H2** (khoảng rớt robustness, §5), ta **dùng lại** `perturbations/metrics.ts`. Kế hoạch 04 phải export hàm:
> ```ts
> export function robustnessReport(
>   base: EvalRecord[],       // các bản ghi KHÔNG có perturbation (bài gốc)
>   variants: EvalRecord[],   // các bản ghi CÓ perturbation (biến thể)
> ): { overall: number; byKind: Record<string, number> };
> // overall = accuracy(base) - accuracy(variants); byKind[kind] = gap theo từng loại biến đổi.
> ```
> `report.ts` **nạp động** (dynamic import) hàm này *chỉ trong `main()`*, nên test của `buildReport` vẫn chạy được ngay cả khi kế hoạch 04 chưa xong. Nếu tới T4 mà `metrics.ts` chưa có, tạm bỏ đối số robustness (báo cáo vẫn ra H1/H3, thiếu H2).

**Files:**
- Create: `research/vsgeo-bench/analysis/report.ts`
- Test: `research/vsgeo-bench/analysis/__tests__/report.test.ts`

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/analysis/__tests__/report.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildReport, buildBenchmarkSummary } from "../report";
import type { EvalRecord, Seed, SeedIndex, Verdict } from "../types";

function seed(id: string, topic: string[], difficulty: 1 | 2 | 3 | 4, aux: boolean): Seed {
  return {
    id,
    source: { type: "synthetic", ref: "test" },
    statement_vi: "…",
    answer: { canonical: "1", type: "rational" },
    tags: { topic, answer_form: "rational", difficulty, requires_auxiliary_construction: aux },
  };
}
function rec(seedId: string, modelId: string, verdict: Verdict, raw: string): EvalRecord {
  return { seedId, modelId, run: 1, promptStyle: "zero_shot", rawOutput: raw, extractedAnswer: "x", verdict, latencyMs: 100 };
}

describe("buildReport — tổng hợp báo cáo", () => {
  const seeds: SeedIndex = new Map();
  seeds.set("s1", seed("s1", ["khoang_cach"], 3, true));
  seeds.set("s2", seed("s2", ["the_tich"], 1, false));

  const records: EvalRecord[] = [
    rec("s1", "gpt", "correct", "Vậy đáp án \\boxed{1}"),
    rec("s1", "gpt", "incorrect", "Vậy đáp án \\boxed{2}"),
    rec("s2", "gpt", "correct", "Vậy \\boxed{1}"),
  ];

  it("accuracy theo model + có bảng markdown", () => {
    const { markdown, summary } = buildReport(records, seeds);
    expect(summary.totalRecords).toBe(3);
    const gpt = summary.byModel.find((r) => r.key === "gpt")!;
    expect(gpt.correct).toBe(2);
    expect(gpt.total).toBe(3);
    expect(markdown).toContain("Xếp hạng model");
  });

  it("H3 — đếm câu sai quả quyết", () => {
    const { summary } = buildReport(records, seeds);
    expect(summary.calibration.totalWrong).toBe(1);
    expect(summary.calibration.confidentWrong).toBe(1);
    expect(summary.calibration.rate).toBe(1);
  });

  it("H1 — nhóm theo cờ cần hình phụ", () => {
    const { summary } = buildReport(records, seeds);
    const keys = summary.byAuxiliary.map((r) => r.key).sort();
    expect(keys).toContain("cần hình phụ");
    expect(keys).toContain("không cần hình phụ");
  });

  it("gắn robustness khi được truyền vào (H2)", () => {
    const { summary, markdown } = buildReport(records, seeds, { overall: 0.2, byKind: { rename: 0.1 } });
    expect(summary.robustness?.overall).toBe(0.2);
    expect(markdown).toContain("robustness");
  });
});

describe("buildBenchmarkSummary — HỢP ĐỒNG máy-đọc summary.json (kế hoạch 07)", () => {
  const seeds: SeedIndex = new Map();
  seeds.set("s1", seed("s1", ["khoang_cach"], 3, true));
  seeds.set("s2", seed("s2", ["the_tich"], 1, false));
  const records: EvalRecord[] = [
    rec("s1", "gpt", "correct", "Vậy đáp án \\boxed{1}"),
    rec("s1", "gpt", "incorrect", "Vậy đáp án \\boxed{2}"),
    rec("s2", "gpt", "correct", "Vậy \\boxed{1}"),
  ];

  it("có mảng models[] và mỗi model đủ overall/byTopic/byDifficulty/robustness", () => {
    const summary = buildBenchmarkSummary(records, seeds);
    expect(Array.isArray(summary.models)).toBe(true);
    expect(summary.models.length).toBe(1);
    for (const m of summary.models) {
      expect(m.overall).toBeDefined();
      expect(Array.isArray(m.byTopic)).toBe(true);
      expect(Array.isArray(m.byDifficulty)).toBe(true);
      expect(m.robustness).toBeDefined();
    }
    const gpt = summary.models.find((m) => m.modelId === "gpt")!;
    expect(gpt.overall.total).toBe(3);
    expect(gpt.overall.correct).toBe(2);
    expect(summary.seedCount).toBe(2);
  });
});
```

- [ ] **Bước 2 — Chạy test, thấy FAIL.**

```
npm test -- research/vsgeo-bench/analysis/__tests__/report.test.ts
```

Kỳ vọng: không phân giải được `../report`.

- [ ] **Bước 3 — Viết code để pass.** Tạo `research/vsgeo-bench/analysis/report.ts`:

```ts
// research/vsgeo-bench/analysis/report.ts
// Sinh báo cáo Markdown + summary.json từ log kết quả. Chạy:
//   npx tsx research/vsgeo-bench/analysis/report.ts <results/> <data/seeds/> <out/>
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  EvalRecord, SeedIndex, AccuracyRow,
  BenchmarkSummary, ModelSummary, TopicStat, DifficultyStat, RobustnessStat, Difficulty,
} from "./types";
import { accuracyBy, calibrationRate } from "./stats";
import { loadRecords, loadSeeds } from "./load";

// Cấu trúc NỘI BỘ nuôi buildReport -> report.md (bảng người-đọc). KHÔNG phải summary.json.
// summary.json dùng kiểu máy-đọc canonical BenchmarkSummary (khai báo ở analysis/types.ts).
export interface ReportSummary {
  generatedAt: string;
  totalRecords: number;
  byModel: AccuracyRow[];        // xếp hạng model (accuracy tổng)
  byTopic: AccuracyRow[];        // §6.3 theo chủ đề
  byDifficulty: AccuracyRow[];   // §6.3 theo độ khó
  byAuxiliary: AccuracyRow[];    // H1: cần hình phụ hay không
  calibration: { confidentWrong: number; totalWrong: number; rate: number }; // H3
  robustness?: { overall: number; byKind: Record<string, number> };          // H2 (từ kế hoạch 04)
}

// Lấy id bài GỐC của một bản ghi (biến thể tra theo parentSeedId).
function baseId(r: EvalRecord): string {
  return r.perturbation ? r.perturbation.parentSeedId : r.seedId;
}

// HÀM THUẦN: nhận dữ liệu, trả markdown + summary. Không đọc/ghi file -> test được dễ dàng.
export function buildReport(
  records: EvalRecord[],
  seeds: SeedIndex,
  robustness?: { overall: number; byKind: Record<string, number> },
): { markdown: string; summary: ReportSummary } {
  const byModel = accuracyBy(records, (r) => r.modelId);
  const byTopic = accuracyBy(records, (r) => seeds.get(baseId(r))?.tags.topic ?? ["(không rõ)"]);
  const byDifficulty = accuracyBy(records, (r) => "độ khó " + (seeds.get(baseId(r))?.tags.difficulty ?? "?"));
  const byAuxiliary = accuracyBy(records, (r) => {
    const s = seeds.get(baseId(r));
    if (!s) return "(không rõ)";
    return s.tags.requires_auxiliary_construction ? "cần hình phụ" : "không cần hình phụ";
  });
  const calibration = calibrationRate(records);

  const summary: ReportSummary = {
    generatedAt: new Date().toISOString(),
    totalRecords: records.length,
    byModel, byTopic, byDifficulty, byAuxiliary, calibration, robustness,
  };
  return { markdown: renderMarkdown(summary), summary };
}

// HÀM THUẦN: gom số liệu theo model thành BenchmarkSummary (HỢP ĐỒNG máy-đọc, kế hoạch 07).
// Kiểu BenchmarkSummary/ModelSummary/… là CANONICAL ở analysis/types.ts — dashboard import từ đó.
export function buildBenchmarkSummary(records: EvalRecord[], seeds: SeedIndex): BenchmarkSummary {
  // acc(xs) = số verdict "correct" / xs.length; mảng rỗng -> 0.
  const acc = (xs: EvalRecord[]): number =>
    xs.length === 0 ? 0 : xs.filter((r) => r.verdict === "correct").length / xs.length;

  // Gom bản ghi theo modelId.
  const byModelId = new Map<string, EvalRecord[]>();
  for (const r of records) {
    if (!byModelId.has(r.modelId)) byModelId.set(r.modelId, []);
    byModelId.get(r.modelId)!.push(r);
  }

  const models: ModelSummary[] = [];
  for (const [modelId, recs] of byModelId) {
    const total = recs.length;
    const correct = recs.filter((r) => r.verdict === "correct").length;
    const incorrect = recs.filter((r) => r.verdict === "incorrect").length;
    const unsure = recs.filter((r) => r.verdict === "unsure").length;

    // byTopic: gom theo TỪNG chủ đề của BÀI GỐC (bài nhiều chủ đề -> cộng vào từng chủ đề).
    const topicBuckets = new Map<string, EvalRecord[]>();
    for (const r of recs) {
      for (const t of seeds.get(baseId(r))?.tags.topic ?? []) {
        if (!topicBuckets.has(t)) topicBuckets.set(t, []);
        topicBuckets.get(t)!.push(r);
      }
    }
    const byTopic: TopicStat[] = [...topicBuckets].map(([topic, xs]) => ({
      topic, total: xs.length, correct: xs.filter((r) => r.verdict === "correct").length, accuracy: acc(xs),
    }));
    byTopic.sort((a, b) => a.topic.localeCompare(b.topic));

    // byDifficulty: gom theo độ khó (1..4) của BÀI GỐC.
    const diffBuckets = new Map<Difficulty, EvalRecord[]>();
    for (const r of recs) {
      const d = seeds.get(baseId(r))?.tags.difficulty;
      if (d === undefined) continue;
      if (!diffBuckets.has(d)) diffBuckets.set(d, []);
      diffBuckets.get(d)!.push(r);
    }
    const byDifficulty: DifficultyStat[] = [...diffBuckets].map(([difficulty, xs]) => ({
      difficulty, total: xs.length, correct: xs.filter((r) => r.verdict === "correct").length, accuracy: acc(xs),
    }));
    byDifficulty.sort((a, b) => a.difficulty - b.difficulty);

    // robustness: bài GỐC (không perturbation) vs BIẾN THỂ (có perturbation).
    const base = recs.filter((r) => !r.perturbation);
    const perturbed = recs.filter((r) => r.perturbation);
    const robustness: RobustnessStat = {
      baseAccuracy: acc(base),
      perturbedAccuracy: acc(perturbed),
      gap: acc(base) - acc(perturbed),
    };

    // Chi phí (tổng nếu có) & độ trễ (trung bình).
    const costs = recs.map((r) => r.costUsd).filter((x): x is number => typeof x === "number");
    const costUsd = costs.length > 0 ? costs.reduce((a, b) => a + b, 0) : undefined;
    const avgLatencyMs = total === 0 ? undefined : recs.reduce((a, r) => a + r.latencyMs, 0) / total;

    models.push({
      modelId,
      overall: { total, correct, incorrect, unsure, accuracy: total === 0 ? 0 : correct / total },
      byTopic, byDifficulty, robustness, costUsd, avgLatencyMs,
    });
  }
  models.sort((a, b) => a.modelId.localeCompare(b.modelId)); // thứ tự ổn định

  return { generatedAt: new Date().toISOString(), seedCount: seeds.size, models };
}

function pct(x: number): string {
  return (x * 100).toFixed(1) + "%";
}

function renderAccuracyTable(title: string, rows: AccuracyRow[]): string {
  const lines = [`### ${title}`, "", "| Nhóm | Đúng/Tổng | Accuracy | CI 95% |", "|---|---|---|---|"];
  for (const r of rows) {
    lines.push(`| ${r.key} | ${r.correct}/${r.total} | ${pct(r.accuracy)} | [${pct(r.ci95[0])}, ${pct(r.ci95[1])}] |`);
  }
  lines.push("");
  return lines.join("\n");
}

function renderMarkdown(s: ReportSummary): string {
  const parts: string[] = [];
  parts.push("# Báo cáo VSGeo-Bench");
  parts.push(`_Sinh lúc ${s.generatedAt} · ${s.totalRecords} bản ghi_`);
  parts.push("");
  parts.push(renderAccuracyTable("Xếp hạng model (accuracy tổng)", s.byModel));
  parts.push(renderAccuracyTable("Theo chủ đề (§6.3)", s.byTopic));
  parts.push(renderAccuracyTable("Theo độ khó (§6.3)", s.byDifficulty));
  parts.push(renderAccuracyTable("H1 — Theo cờ cần hình phụ", s.byAuxiliary));
  parts.push('### H3 — Tỉ lệ "tự tin nhưng sai"');
  parts.push(`- Câu sai: ${s.calibration.totalWrong}`);
  parts.push(`- Trong đó trình bày quả quyết: ${s.calibration.confidentWrong}`);
  parts.push(`- Tỉ lệ: ${pct(s.calibration.rate)}`);
  parts.push("");
  if (s.robustness) {
    parts.push("### H2 — Khoảng rớt robustness");
    parts.push(`- Tổng: ${pct(s.robustness.overall)}`);
    for (const [k, v] of Object.entries(s.robustness.byKind)) {
      parts.push(`- ${k}: ${pct(v)}`);
    }
    parts.push("");
  }
  return parts.join("\n");
}

// PHẦN CLI: chỉ chạy khi gọi trực tiếp bằng tsx, KHÔNG chạy khi bị import trong test.
async function main() {
  const [resultsDir, seedsDir, outDir] = process.argv.slice(2);
  if (!resultsDir || !seedsDir || !outDir) {
    console.error("Dùng: npx tsx research/vsgeo-bench/analysis/report.ts <results/> <data/seeds/> <out/>");
    process.exit(1);
  }
  const records = loadRecords(resultsDir);
  const seeds = loadSeeds(seedsDir);

  // Dùng lại robustnessReport từ kế hoạch 04 (nạp động để không phụ thuộc cứng lúc test).
  let robustness: { overall: number; byKind: Record<string, number> } | undefined;
  try {
    const { robustnessReport } = await import("../perturbations/metrics");
    const base = records.filter((r) => !r.perturbation);
    const variants = records.filter((r) => r.perturbation);
    robustness = robustnessReport(base, variants);
  } catch {
    console.warn("Chưa có perturbations/metrics.ts (kế hoạch 04) — bỏ qua H2 robustness.");
  }

  // report.md dùng buildReport (bảng người-đọc); summary.json dùng buildBenchmarkSummary
  // (kiểu máy-đọc canonical BenchmarkSummary ở analysis/types.ts, cho dashboard kế hoạch 07).
  const { markdown } = buildReport(records, seeds, robustness);
  const benchmarkSummary = buildBenchmarkSummary(records, seeds);
  writeFileSync(join(outDir, "report.md"), markdown, "utf8");
  writeFileSync(join(outDir, "summary.json"), JSON.stringify(benchmarkSummary, null, 2), "utf8");
  console.log(`Đã ghi report.md và summary.json vào ${outDir}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
```

- [ ] **Bước 4 — Chạy test, thấy PASS.**

```
npm test -- research/vsgeo-bench/analysis/__tests__/report.test.ts
```

Kỳ vọng: `Tests 5 passed` (4 cho `buildReport` + 1 cho `buildBenchmarkSummary`). Sau đó chạy **toàn bộ** để chắc không vỡ gì:

```
npm test -- research/vsgeo-bench/analysis/
```

Kỳ vọng: tất cả file test trong `analysis/` đều xanh.

- [ ] **Bước 5 — Commit.**

```
git add research/vsgeo-bench/analysis/report.ts research/vsgeo-bench/analysis/__tests__/report.test.ts
git commit -m "feat(analysis): report CLI sinh Markdown + summary.json (H1/H2/H3)"
```

---

### Task 10: Codebook 6 loại lỗi (`taxonomy.md`) — NỘI DUNG do 2 em tự làm

> **Phần này là công sức trí tuệ của 2 em — không có code để gõ.** Ở đây kế hoạch chỉ đưa **khung, ví dụ mẫu, và tiêu chí nghiệm thu**. Nội dung định nghĩa/ví dụ cuối cùng phải do 2 em tự soạn từ output thật, vì chính 2 em sẽ phải **giải thích và bảo vệ** nó trước hội đồng (§7).

**Files:**
- Create: `research/vsgeo-bench/analysis/taxonomy.md`

**Mục tiêu:** viết một *codebook* (sổ tay mã hóa) định nghĩa rõ **6 loại lỗi** ở §7, sao cho hai người đọc cùng một lời giải sai sẽ **dán cùng một nhãn** (đó là điều κ đo được ở Task 8).

- [ ] **Bước 1 — Đọc lại §7 của `docs/design.md`** để nắm 6 loại lỗi gốc:
  1. Lỗi tưởng tượng không gian
  2. Lỗi dựng hình phụ
  3. Lỗi áp dụng định lý/công thức
  4. Lỗi số học/đại số
  5. Lỗi đọc đề
  6. Lỗi trình bày/không kết luận

- [ ] **Bước 2 — Với MỖI loại, viết đủ 4 phần theo mẫu dưới.** Dán khung này vào `taxonomy.md` rồi điền:

```markdown
# Codebook phân loại lỗi — VSGeo-Bench

> Sổ tay mã hóa để dán nhãn lỗi cho output model. Mục tiêu: hai người dán độc lập
> cùng một lời giải sai sẽ chọn cùng một nhãn (đo bằng Cohen's κ, xem labeling-guide.md).
> Mỗi bản ghi được gán ĐÚNG MỘT nhãn lỗi CHÍNH (lỗi sớm nhất / gốc rễ nhất).

## Mã nhãn (dùng đúng chuỗi này trong file JSON dán nhãn)
`spatial` · `auxiliary` · `theorem` · `arithmetic` · `reading` · `presentation`

---

## 1. `spatial` — Lỗi tưởng tượng không gian
- **Định nghĩa:** model nhận SAI một quan hệ hình học 3D (đoạn nào vuông góc với đoạn nào,
  hình chiếu của điểm rơi vào đâu, hai mặt có cắt nhau không...).
- **Dấu hiệu nhận biết:** ...(2 em điền)...
- **Ví dụ (trích output thật, rút gọn):** ...(2 em điền)...
- **RANH GIỚI phân biệt:** khác `theorem` ở chỗ định lý áp dụng ĐÚNG nhưng hình dung SAI;
  khác `reading` ở chỗ đề hiểu đúng nhưng dựng cấu hình 3D sai. ...(2 em bổ sung)...

## 2. `auxiliary` — Lỗi dựng hình phụ
- **Định nghĩa:** dựng sai đường/điểm phụ, hoặc "bịa" một hình phụ không hợp lệ.
- ...(điền đủ 4 phần như trên)...

## 3. `theorem` — Lỗi áp dụng định lý/công thức
- ...(điền đủ 4 phần)...

## 4. `arithmetic` — Lỗi số học/đại số
- **Định nghĩa:** phương pháp ĐÚNG nhưng tính toán SAI (nhân/chia/khai căn/giải phương trình).
- ...(điền đủ 4 phần)...

## 5. `reading` — Lỗi đọc đề
- ...(điền đủ 4 phần)...

## 6. `presentation` — Lỗi trình bày/không kết luận
- **Định nghĩa:** thiếu đáp án cuối, tự mâu thuẫn, hoặc bỏ dở.
- ...(điền đủ 4 phần)...

---

## Quy tắc chọn khi phân vân (tie-break)
1. Nếu có NHIỀU lỗi, chọn lỗi **gốc rễ / xảy ra sớm nhất** trong lời giải.
2. Nếu lời giải đúng phương pháp nhưng sai một phép tính cuối → `arithmetic`, KHÔNG phải `theorem`.
3. Nếu không xác định được (output quá mơ hồ) → ghi `presentation` và nêu lý do trong ghi chú.
```

- [ ] **Bước 3 — Làm mẫu HOÀN CHỈNH ít nhất 2 loại** (ví dụ `spatial` và `arithmetic`) với ví dụ trích từ output thật đã chạy ở kế hoạch 03, để loại còn lại 2 em theo mẫu mà làm.

- [ ] **Bước 4 — Tự kiểm theo checklist (acceptance criteria).** File đạt khi:
  - [ ] Đủ 6 loại, mỗi loại có đủ 4 phần (định nghĩa / dấu hiệu / ví dụ thật / ranh giới).
  - [ ] Mỗi loại có **ít nhất 1 ví dụ trích từ output model thật**, không phải bịa.
  - [ ] Mã nhãn dùng đúng 6 chuỗi: `spatial` `auxiliary` `theorem` `arithmetic` `reading` `presentation`.
  - [ ] Có mục "ranh giới phân biệt" cho các cặp dễ nhầm (`spatial`↔`theorem`, `theorem`↔`arithmetic`).
  - [ ] Có quy tắc tie-break khi một lời giải dính nhiều lỗi.

- [ ] **Bước 5 — Commit.**

```
git add research/vsgeo-bench/analysis/taxonomy.md
git commit -m "docs(analysis): codebook 6 loại lỗi (taxonomy §7)"
```

---

### Task 11: Quy trình dán nhãn độc lập + đo κ (`labeling-guide.md`) — NỘI DUNG do 2 em tự làm

> **Phần này cũng là công sức trí tuệ của 2 em.** Kế hoạch cung cấp quy trình chuẩn + định dạng file nhãn + cách nối với `kappa.ts` (Task 8). Việc dán nhãn thật là lao động của 2 em và là bằng chứng khoa học.

**Files:**
- Create: `research/vsgeo-bench/analysis/labeling-guide.md`

**Vì sao phải dán nhãn ĐỘC LẬP?** Nếu 2 em ngồi cạnh nhau bàn rồi mới dán, con số κ sẽ "ảo cao" vì hai người đã ảnh hưởng lẫn nhau. Dán **độc lập trước**, đo κ, rồi mới thảo luận — đó mới là quy trình khoa học chuẩn (§7).

- [ ] **Bước 1 — Dán khung quy trình vào `labeling-guide.md`:**

```markdown
# Hướng dẫn dán nhãn lỗi & đo độ đồng thuận

> Việc dán nhãn là CÔNG SỨC TRÍ TUỆ của 2 em và là bằng chứng khoa học cho tính khách quan
> của taxonomy. Làm đúng quy trình 4 bước dưới đây.

## Chọn mẫu để dán nhãn
- Chỉ dán nhãn các bản ghi có `verdict = "incorrect"` (lỗi thì mới có loại lỗi).
- Lấy **mẫu ngẫu nhiên** ≥ 60 bản ghi sai (đủ để κ có ý nghĩa), trải đều các model & chủ đề.
- Ghi lại cách lấy mẫu (seed/tiêu chí) để tái lập.

## Quy trình 4 bước (BẮT BUỘC theo thứ tự)
1. **Dán ĐỘC LẬP:** mỗi em tự đọc từng bản ghi và gán ĐÚNG MỘT nhãn theo `taxonomy.md`.
   TUYỆT ĐỐI không trao đổi trong bước này.
2. **Đo κ vòng 1:** ghép hai bộ nhãn, tính Cohen's κ (xem mục "Cách tính κ" bên dưới).
3. **Thảo luận & thống nhất:** rà các bản ghi hai em BẤT ĐỒNG; bàn để chốt nhãn chung;
   nếu do codebook chưa rõ → **sửa `taxonomy.md`** cho rõ hơn (ghi lại thay đổi).
4. **Dán lại & chốt:** dán lại mẫu theo codebook đã sửa; đo κ vòng 2; lưu bộ nhãn ĐÃ CHỐT.

## Mục tiêu κ
- κ ≥ 0.61 ("đáng kể", Landis & Koch) là NGƯỠNG TỐI THIỂU để báo cáo.
- Lý tưởng κ ≥ 0.80. Nếu κ < 0.61 sau vòng 2 → codebook còn mơ hồ, lặp lại bước 3.

## Định dạng file nhãn (JSON)
Mỗi em lưu một file, ví dụ `labels-em1.json`, `labels-em2.json`, là MẢNG các object:

```json
[
  { "recordId": "vsgeo-0137__gpt__run1", "labeler": "em1", "errorType": "spatial" },
  { "recordId": "vsgeo-0044__gemini__run2", "labeler": "em1", "errorType": "arithmetic" }
]
```

- `recordId`: chuỗi định danh DUY NHẤT một bản ghi (gợi ý: `seedId__modelId__run{n}`).
  Hai em phải dùng CÙNG bộ recordId, CÙNG thứ tự, để ghép cặp đúng.
- `labeler`: "em1" hoặc "em2".
- `errorType`: đúng một trong 6 mã ở `taxonomy.md`.

## Cách tính κ (dùng lại kappa.ts đã viết ở Task 8)
Viết một script nhỏ, chạy bằng: `npx tsx <đường-dẫn-script>`
```

- [ ] **Bước 2 — Thêm đoạn script mẫu tính κ vào cuối `labeling-guide.md`** (2 em chỉ cần sửa đường dẫn file nhãn). Đây là code hạ tầng, cung cấp đầy đủ:

```markdown
Lưu thành `research/vsgeo-bench/analysis/compute-kappa.ts`:
```

```ts
// research/vsgeo-bench/analysis/compute-kappa.ts
// Đọc hai file nhãn JSON, ghép cặp theo recordId, in Cohen's κ. Chạy:
//   npx tsx research/vsgeo-bench/analysis/compute-kappa.ts labels-em1.json labels-em2.json
import { readFileSync } from "node:fs";
import { cohensKappa } from "./kappa";

interface Label { recordId: string; labeler: string; errorType: string; }

const [fileA, fileB] = process.argv.slice(2);
if (!fileA || !fileB) {
  console.error("Dùng: npx tsx analysis/compute-kappa.ts <nhãn-em1.json> <nhãn-em2.json>");
  process.exit(1);
}

const a: Label[] = JSON.parse(readFileSync(fileA, "utf8"));
const b: Label[] = JSON.parse(readFileSync(fileB, "utf8"));

// Ghép theo recordId để chắc chắn so cùng một bản ghi (không phụ thuộc thứ tự file).
const mapB = new Map(b.map((x) => [x.recordId, x.errorType]));
const labelsA: string[] = [];
const labelsB: string[] = [];
const missing: string[] = [];
for (const la of a) {
  const lb = mapB.get(la.recordId);
  if (lb === undefined) { missing.push(la.recordId); continue; }
  labelsA.push(la.errorType);
  labelsB.push(lb);
}

if (missing.length > 0) {
  console.warn(`Cảnh báo: ${missing.length} recordId chỉ có ở file A (bỏ qua): ${missing.slice(0, 5).join(", ")}...`);
}
console.log(`Số cặp so được: ${labelsA.length}`);
console.log(`Cohen's κ = ${cohensKappa(labelsA, labelsB).toFixed(4)}`);
```

- [ ] **Bước 3 — Chạy thử script với dữ liệu giả để chắc nó chạy** (trước khi có nhãn thật). Tạo tạm hai file nhỏ rồi chạy:

```
npx tsx research/vsgeo-bench/analysis/compute-kappa.ts labels-em1.json labels-em2.json
```

Kỳ vọng in ra dạng: `Số cặp so được: N` và `Cohen's κ = 0.xxxx`.

- [ ] **Bước 4 — Tự kiểm theo checklist.** File hướng dẫn đạt khi:
  - [ ] Nêu rõ quy trình 4 bước và **thứ tự bắt buộc** (độc lập → κ → thảo luận → chốt).
  - [ ] Có định dạng JSON `{recordId, labeler, errorType}` và quy ước `recordId`.
  - [ ] Nêu mục tiêu κ (≥ 0.61, lý tưởng ≥ 0.80) và cách xử lý khi κ thấp.
  - [ ] Có script `compute-kappa.ts` chạy được, dùng lại `kappa.ts`.
  - [ ] Ghi rõ "dán nhãn là công sức trí tuệ của 2 em".

- [ ] **Bước 5 — Commit.**

```
git add research/vsgeo-bench/analysis/labeling-guide.md research/vsgeo-bench/analysis/compute-kappa.ts
git commit -m "docs(analysis): quy trình dán nhãn độc lập + script đo κ"
```

---

## Tiêu chí hoàn thành (Definition of Done)

Ánh xạ tới tiêu chí thành công §13 của `design.md`:

- [ ] **Toàn bộ test xanh:** `npm test -- research/vsgeo-bench/analysis/` chạy hết, không đỏ.
- [ ] **H1 đo được:** `report.md` có bảng accuracy theo cờ `requires_auxiliary_construction` + theo chủ đề + độ khó, mỗi dòng có CI 95% (bootstrap). *(→ §13 "xếp hạng theo chủ đề"; §6.3–6.4)*
- [ ] **H2 đo được:** khi có `perturbations/metrics.ts` (kế hoạch 04), `report.md` có mục "Khoảng rớt robustness" tổng + theo từng loại biến đổi. *(→ §13 "khoảng rớt robustness rõ"; §5)*
- [ ] **H3 đo được:** `report.md` có tỉ lệ "tự tin nhưng sai" (calibration). *(→ §13 "tự tin nhưng sai định lượng được"; §6.3)*
- [ ] **So sánh model có kiểm định:** hàm `mcnemar` sẵn sàng cho so cặp model trên cùng tập. *(→ §13 "McNemar"; §6.4)*
- [ ] **Taxonomy có κ:** `taxonomy.md` (6 loại) + `labeling-guide.md` + `compute-kappa.ts` cho ra một con số κ ≥ 0.61 trên mẫu ≥ 60 bản ghi sai. *(→ §13 "taxonomy lỗi có κ"; §7)*
- [ ] **Dashboard đọc được:** `summary.json` sinh ra đúng cấu trúc `BenchmarkSummary` (canonical ở `analysis/types.ts`) để kế hoạch 07 vẽ biểu đồ. *(→ §9.1 dashboard)*
- [ ] **Tái lập được:** mọi bootstrap dùng seed cố định → chạy lại ra số y hệt. *(→ §13 "tái lập được")*

---

## Bảng thuật ngữ

| Thuật ngữ (giữ tiếng Anh) | Nghĩa dễ hiểu |
|---|---|
| **JSONL (JSON Lines)** | File mà mỗi dòng là một object JSON độc lập; tiện để ghi thêm từng dòng. |
| **EvalRecord** | Một bản ghi kết quả: một lần một model giải một bài. |
| **Seed / instance** | *Seed* = bài gốc; *instance/variant* = biến thể sinh từ seed. |
| **accuracy** | Tỉ lệ trả lời đúng = số đúng / tổng. |
| **Bootstrap** | Mẹo lấy mẫu lại có hoàn lại nhiều lần để ước lượng độ chắc của một con số. |
| **CI 95% (confidence interval)** | Khoảng mà giá trị thật rơi vào với độ tin 95%. Hẹp = chắc, rộng = cần thêm dữ liệu. |
| **McNemar test** | Kiểm định xem chênh lệch giữa 2 model (trên cùng tập bài) có ý nghĩa thống kê không. |
| **p-value** | Xác suất thấy chênh lệch lớn như quan sát nếu thật ra không có khác biệt; càng nhỏ càng "đáng tin là có khác biệt". |
| **PRNG / seed** | Bộ sinh số giả ngẫu nhiên; cùng *seed* → cùng dãy số → kết quả tái lập được. |
| **Calibration ("tự tin nhưng sai")** | Mức độ model trình bày quả quyết dù đáp án sai. |
| **Heuristic** | Quy tắc gần đúng, đơn giản, không hoàn hảo nhưng đủ dùng (ở đây: đoán "quả quyết" qua từ ngữ). |
| **Taxonomy / codebook** | Bảng phân loại lỗi + sổ tay định nghĩa từng loại. |
| **Cohen's κ (kappa)** | Hệ số đo độ đồng thuận giữa hai người dán nhãn, đã trừ phần trùng do may rủi. |
| **Robustness gap** | Chênh accuracy giữa bài gốc và biến thể bảo toàn toán học; lớn ⇒ model dò mẫu. |
| **type guard** | Hàm kiểm tra kiểu lúc chạy (vd `isVerdict`) để bắt dữ liệu hỏng sớm. |
| **Dynamic import** | Nạp một module *khi cần* lúc chạy, thay vì bắt buộc lúc khởi động. |

---

## Em sẽ bảo vệ được gì trước hội đồng

- **"Kết quả của em có ý nghĩa thống kê, không phải may rủi."** — Em tự viết bootstrap (CI 95%) và McNemar, hiểu và giải thích được từng dòng; đây là năng lực **suy luận thống kê** và **lập trình khoa học** thật sự, không phải gọi thư viện hộp đen.
- **"Bảng phân loại lỗi của em khách quan, không tùy tiện."** — Em dán nhãn **độc lập** rồi đo **Cohen's κ**; con số κ là bằng chứng về **độ tin cậy liên-người-đánh-giá (inter-rater reliability)** — một chuẩn mực trong nghiên cứu định tính.
- **"Em phân biệt rõ công cụ có sẵn và phần em tự làm."** — Engine ký hiệu và công thức erfc/mulberry32 được **ghi nguồn**; toàn bộ logic phân tích, gom nhóm, giao thức dán nhãn và diễn giải là **do em thiết kế** (§4.4 liêm chính ViSEF).
- **"Kết quả của em tái lập được."** — Mọi phần ngẫu nhiên đều dùng *seed* cố định; bất kỳ ai chạy lại code của em cũng ra đúng những con số trong báo cáo — đúng tinh thần khoa học mở.
