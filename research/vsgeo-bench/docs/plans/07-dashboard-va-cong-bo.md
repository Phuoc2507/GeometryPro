# Dashboard & Công bố — Kế hoạch triển khai

> **Cho người thực thi (agentic worker):** REQUIRED SUB-SKILL: dùng superpowers:subagent-driven-development hoặc superpowers:executing-plans để làm theo từng Task. Các bước dùng checkbox `- [ ]` để theo dõi.

**Mục tiêu:** Trực quan hoá kết quả benchmark bằng một dashboard React + recharts đọc file JSON tóm tắt của `analysis/report.ts`, và chuẩn bị trọn bộ hồ sơ công bố công khai (datasheet, checklist phát hành, dàn ý báo cáo & poster).

> **Phạm vi cho vòng trường (3 tháng — phần LÕI):** dashboard (3 biểu đồ) + **demo sống "Kiểm tra lời giải AI"** (điểm nhấn phỏng vấn) + poster/báo cáo. Để dành **MỞ RỘNG** (sau vòng trường): datasheet chỉn chu, tách repo công khai, preprint.

**Kiến trúc:** Một lớp hàm THUẦN (`dashboard/data.ts`) biến JSON tóm tắt thành các cấu trúc sẵn-sàng-vẽ (bảng xếp hạng, ma trận accuracy theo chủ đề, khoảng rớt robustness) — lớp này có test đầy đủ và không đụng React. Bên trên là một component React (`dashboard/Leaderboard.tsx`) chỉ nhận props đã tính sẵn và vẽ bằng recharts, xem trước bằng một Vite dev server nhỏ tách riêng. Song song, bốn tài liệu công bố (datasheet, release-checklist, report-outline, poster-outline) là phần nội dung 2 em tự soạn theo template có sẵn.

**Công nghệ:** Vite + React 18 + TypeScript (ESM), recharts ^2.15, vitest ^4.1 để test hàm thuần, `@vitejs/plugin-react-swc` cho preview, npm quản lý gói. KHÔNG dùng Next.js.

---

## Dành cho 2 em (đọc trước)

Chào hai em! Đây là kế hoạch **cuối cùng** trong chuỗi — nơi mọi công sức 5 tháng trước biến thành thứ hội đồng **nhìn thấy trong 30 giây**: một bảng xếp hạng đẹp, mấy biểu đồ nói lên câu chuyện, và một bộ hồ sơ để bất kỳ ai trên thế giới cũng tải về chạy lại được.

**Hệ con này gồm hai nửa rất khác nhau:**

1. **Nửa "code" (Dashboard).** Em 2 phụ trách. Ta có một file JSON do bước phân tích (kế hoạch 05) sinh ra — nó tóm tắt "model nào đúng bao nhiêu %, theo chủ đề nào, rớt điểm bao nhiêu khi ta biến đổi đề". File JSON là **con số khô khan**. Việc của em là biến nó thành **hình**. Ta tách làm hai lớp cho dễ kiểm soát:
   - `data.ts` = cái "máy xay": nhận JSON, nhả ra mảng số đã sắp xếp sẵn cho biểu đồ. Đây là **hàm thuần** (pure function): cùng input luôn cho cùng output, không gọi mạng, không random. Vì thuần nên ta **test được từng dòng** — đó là lý do ta viết test cho nó.
   - `Leaderboard.tsx` = cái "màn hình": nhận mảng số đã xay, vẽ cột, vẽ bảng. Component React thì khó test tự động (phải render trình duyệt), nên ta **không test nó bằng vitest**; thay vào đó ta chạy một server xem trước và **nhìn bằng mắt**.
   - Vì sao tách? Nếu nhồi cả logic tính toán vào trong component, mỗi lần muốn kiểm "công thức xếp hạng có đúng không" em phải mở trình duyệt soi mắt. Tách ra, logic nằm ở hàm thuần và test tự bắt lỗi cho em.

2. **Nửa "nội dung" (Công bố).** **Cả hai em cùng làm.** Đây là phần hội đồng ViSEF chấm **liêm chính khoa học** rất nặng: em có ghi nguồn đàng hoàng không, có nói thật về hạn chế không, có để lộ khoá API bí mật lên GitHub không (tối kỵ!). Bốn tài liệu:
   - `datasheet.md` — "phiếu lý lịch" của bộ dữ liệu: từ đâu ra, chuẩn hoá thế nào, phân bố nhãn, hạn chế, giấy phép.
   - `release-checklist.md` — các bước tách repo con ra thành kho công khai độc lập, **sao chép (vendor)** phần engine cần thiết kèm ghi nguồn, và **gỡ sạch khoá API**.
   - `report-outline.md` + `poster-outline.md` — dàn ý báo cáo NCKH và poster, cùng gợi ý luyện phản biện.

   Những tài liệu này **kế hoạch KHÔNG viết hộ nội dung** — vì đó chính là công sức trí tuệ hai em phải bảo vệ trước hội đồng. Kế hoạch chỉ cho em **template (khung điền)**, **ví dụ mẫu đã làm sẵn**, và **checklist tự chấm**.

**Sản phẩm cuối trông thế nào?** Một trang web nội bộ (chạy `npm run` một lệnh là hiện) có: (1) bảng xếp hạng model, (2) biểu đồ cột accuracy theo chủ đề, (3) biểu đồ khoảng-rớt-robustness, và (4) **ô "Kiểm tra lời giải AI"** — dán đề + lời giải AI vào là máy chấm phán Đúng/Sai/Không chắc ngay trước mắt hội đồng (đây là **điểm nhấn phỏng vấn**). Cộng với thư mục `docs/` có bốn file `.md` chỉn chu, và một kho GitHub công khai mà người lạ `git clone` về, `npm install`, `npm test` là xanh.

**Nằm ở đâu trong lộ trình?** Theo §11.2, hệ con này thuộc **T4 → T6**: dashboard làm ở T4 (khi đã có số liệu phân tích), bộ công bố hoàn thiện ở T5–T6 (song song viết báo cáo & poster, và làm bản dự phòng/công khai ở T6).

**Phụ thuộc kế hoạch nào?**
- **Kế hoạch 00** (bootstrap dự án): đã thêm `tsx` vào devDependencies **và** đã mở rộng mảng `include` trong `vitest.config.ts` để nhận test trong `research/vsgeo-bench/**`. Nếu em chạy test mà báo "No test files found", hãy quay lại kiểm tra kế hoạch 00 đã làm bước đó chưa (xem "Điều kiện tiên quyết" bên dưới).
- **Kế hoạch 03** (harness gọi model): định nghĩa `EvalRecord` — nguồn dữ liệu thô mà bước phân tích gộp lại.
- **Kế hoạch 05** (analysis/report.ts + analysis/types.ts): **sinh ra file JSON tóm tắt** mà dashboard này đọc. Các type mô tả **hình dạng JSON** (`BenchmarkSummary`, `ModelSummary`, `TopicStat`, `DifficultyStat`, `RobustnessStat`, `Difficulty`) là **canonical do kế hoạch 05 SỞ HỮU**, sống ở `research/vsgeo-bench/analysis/types.ts`. Dashboard **KHÔNG định nghĩa lại** — chỉ `import type` từ đó (một nguồn sự thật duy nhất) để hai bên không bao giờ lệch nhau.

Bám sát spec: §9 (sản phẩm/tác động/đạo đức), §13 (tiêu chí thành công & giải Nhất), §14 (tách repo & vendor engine), §11.2 (lịch T4–T6).

---

## Điều kiện tiên quyết (kiểm 30 giây trước khi bắt đầu)

- [ ] Mở `vitest.config.ts` ở gốc repo. Trong mảng `test.include` phải có dòng bao được test của dự án con, ví dụ `'research/vsgeo-bench/**/*.test.ts'` và `'research/vsgeo-bench/**/*.test.tsx'`. Nếu **chưa có**, thêm vào (đây đáng lẽ là việc của kế hoạch 00). Không có dòng này thì `npm test` sẽ **không thấy** test của em.
- [ ] Chạy thử `npm test -- research/vsgeo-bench` một lần. Kỳ vọng: hoặc "No test files found" (chưa có test — bình thường vì ta chưa viết), hoặc chạy các test dự án con hiện có. Miễn là **không** báo lỗi cấu hình.
- [ ] Xác nhận `recharts` có trong `package.json` (đã có sẵn: `"recharts": "^2.15.4"`).
- [ ] Xác nhận `research/vsgeo-bench/analysis/types.ts` **đã tồn tại** và export `BenchmarkSummary` (cùng `ModelSummary`, `TopicStat`, `DifficultyStat`, `RobustnessStat`, `Difficulty`). File này do **kế hoạch 05 sở hữu**; dashboard chỉ `import type` từ đó. Nếu chưa có, quay lại làm kế hoạch 05 (Task type) trước — nếu không, `data.ts` sẽ báo `Cannot find module "../analysis/types"`.

> **Ghi chú về lệnh test:** `npm test -- <chuỗi>` chạy vitest một lần rồi **lọc** theo chuỗi đường dẫn. Ví dụ `npm test -- dashboard/data` chỉ chạy các file test có `dashboard/data` trong đường dẫn. Dấu `--` báo cho npm "phần sau là tham số cho vitest, không phải cho npm".

---

### Task 1: Kiểu dữ liệu tóm tắt + fixture JSON + hàm `buildLeaderboard`

**Ý tưởng:** Trước hết ta **IMPORT hình dạng** file JSON tóm tắt (`BenchmarkSummary` và bạn bè) từ `analysis/types.ts` — đây là "hợp đồng" giữa kế hoạch 05 (bên ghi, **sở hữu** type) và dashboard (bên đọc, chỉ import). Dashboard không định nghĩa lại type để tránh hai bản lệch nhau. Rồi ta tạo một file JSON mẫu để test. Rồi ta viết hàm đầu tiên: biến `summary` thành **bảng xếp hạng** đã sắp theo accuracy giảm dần, có số thứ hạng.

**Files:**
- Create: `research/vsgeo-bench/dashboard/data.ts`
- Create: `research/vsgeo-bench/dashboard/__tests__/sample-summary.json`
- Test: `research/vsgeo-bench/dashboard/__tests__/data.test.ts`

**Các bước:**

- [ ] **Bước 1 — Tạo fixture JSON mẫu.** Đây là "input JSON mẫu" mà đề bài yêu cầu test trên đó. Tạo `research/vsgeo-bench/dashboard/__tests__/sample-summary.json` với hai model để có cái mà xếp hạng và so sánh. Chú ý: `accuracy` lưu dưới dạng **phân số 0..1** (0.82 nghĩa là 82%), vì đó là dạng thô toán học; việc đổi ra phần trăm để hiển thị là việc của `data.ts`.

```json
{
  "generatedAt": "2026-11-01T09:00:00.000Z",
  "seedCount": 300,
  "models": [
    {
      "modelId": "gpt-flagship",
      "overall": { "total": 300, "correct": 246, "incorrect": 48, "unsure": 6, "accuracy": 0.82 },
      "byTopic": [
        { "topic": "the_tich", "total": 60, "correct": 54, "accuracy": 0.9 },
        { "topic": "khoang_cach", "total": 80, "correct": 56, "accuracy": 0.7 },
        { "topic": "goc", "total": 60, "correct": 45, "accuracy": 0.75 }
      ],
      "byDifficulty": [
        { "difficulty": 1, "total": 90, "correct": 86, "accuracy": 0.955 },
        { "difficulty": 4, "total": 40, "correct": 20, "accuracy": 0.5 }
      ],
      "robustness": { "baseAccuracy": 0.82, "perturbedAccuracy": 0.71, "gap": 0.11 },
      "costUsd": 4.2,
      "avgLatencyMs": 5300
    },
    {
      "modelId": "open-model-7b",
      "overall": { "total": 300, "correct": 150, "incorrect": 140, "unsure": 10, "accuracy": 0.5 },
      "byTopic": [
        { "topic": "the_tich", "total": 60, "correct": 39, "accuracy": 0.65 },
        { "topic": "khoang_cach", "total": 80, "correct": 32, "accuracy": 0.4 },
        { "topic": "goc", "total": 60, "correct": 27, "accuracy": 0.45 }
      ],
      "byDifficulty": [
        { "difficulty": 1, "total": 90, "correct": 72, "accuracy": 0.8 },
        { "difficulty": 4, "total": 40, "correct": 6, "accuracy": 0.15 }
      ],
      "robustness": { "baseAccuracy": 0.5, "perturbedAccuracy": 0.29, "gap": 0.21 },
      "costUsd": 0.0,
      "avgLatencyMs": 2100
    }
  ]
}
```

- [ ] **Bước 2 — Viết test thất bại.** Tạo `research/vsgeo-bench/dashboard/__tests__/data.test.ts`. Ở đây ta nạp file JSON mẫu bằng `fs` (cách này luôn chạy trong môi trường node của vitest, không phụ thuộc cấu hình import JSON). Mô tả test viết tiếng Việt cho khớp codebase.

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildLeaderboard, type BenchmarkSummary } from "../data";

// __dirname không tồn tại sẵn trong ESM, nên ta tự dựng đường dẫn thư mục hiện tại
// từ import.meta.url (URL của chính file test này) rồi đọc file JSON cạnh nó.
const here = path.dirname(fileURLToPath(import.meta.url));
const sample = JSON.parse(
  readFileSync(path.join(here, "sample-summary.json"), "utf8"),
) as BenchmarkSummary;

describe("buildLeaderboard — bảng xếp hạng model", () => {
  it("sắp model theo accuracy giảm dần và đánh số hạng từ 1", () => {
    const rows = buildLeaderboard(sample);
    expect(rows.map((r) => r.modelId)).toEqual(["gpt-flagship", "open-model-7b"]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2]);
  });

  it("đổi accuracy phân số (0..1) thành phần trăm làm tròn 1 chữ số thập phân", () => {
    const rows = buildLeaderboard(sample);
    expect(rows[0].accuracyPct).toBe(82); // 0.82 -> 82
    expect(rows[1].accuracyPct).toBe(50); // 0.50 -> 50
  });

  it("giữ nguyên số câu đúng/tổng và kèm chi phí, độ trễ nếu có", () => {
    const rows = buildLeaderboard(sample);
    expect(rows[0].correct).toBe(246);
    expect(rows[0].total).toBe(300);
    expect(rows[0].costUsd).toBe(4.2);
    expect(rows[0].avgLatencyMs).toBe(5300);
  });

  it("là hàm thuần: gọi lần nữa cho kết quả y hệt và không sửa input", () => {
    const before = JSON.stringify(sample);
    const a = buildLeaderboard(sample);
    const b = buildLeaderboard(sample);
    expect(a).toEqual(b);
    expect(JSON.stringify(sample)).toBe(before); // input không bị đụng vào
  });
});
```

- [ ] **Bước 3 — Chạy test cho thấy FAIL.** Lệnh:

```bash
npm test -- research/vsgeo-bench/dashboard/__tests__/data.test.ts
```

Kỳ vọng: FAIL với thông báo đại loại `Failed to resolve import "../data"` hoặc `buildLeaderboard is not a function` — vì `data.ts` chưa tồn tại. Đúng như mong đợi (đỏ trước, xanh sau).

- [ ] **Bước 4 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/dashboard/data.ts`:

```ts
// dashboard/data.ts
// Lớp hàm THUẦN biến JSON tóm tắt (do analysis/report.ts sinh — xem kế hoạch 05)
// thành các cấu trúc sẵn-sàng-vẽ cho recharts. KHÔNG import React ở đây, để test được.

// ---- Hình dạng file JSON tóm tắt (HỢP ĐỒNG với kế hoạch 05) ----
// Các type canonical (Difficulty, TopicStat, DifficultyStat, RobustnessStat, ModelSummary,
// BenchmarkSummary) do KẾ HOẠCH 05 SỞ HỮU và sống ở `analysis/types.ts` — một nguồn sự thật
// duy nhất. Dashboard KHÔNG định nghĩa lại; chỉ IMPORT rồi RE-EXPORT lại để các file cạnh
// (test, Leaderboard.tsx, preview.tsx) vẫn `import ... from "./data"` như trước.
import type {
  BenchmarkSummary,
  ModelSummary,
  TopicStat,
  DifficultyStat,
  RobustnessStat,
  Difficulty,
} from "../analysis/types";
export type {
  BenchmarkSummary,
  ModelSummary,
  TopicStat,
  DifficultyStat,
  RobustnessStat,
  Difficulty,
};

// ---- Tiện ích nhỏ ----
// Đổi phân số 0..1 sang phần trăm, làm tròn 1 chữ số thập phân. VD 0.826 -> 82.6
export function toPct(fraction: number): number {
  return Math.round(fraction * 1000) / 10;
}

// ---- 1) Bảng xếp hạng ----
export type LeaderboardRow = {
  rank: number;
  modelId: string;
  accuracyPct: number;
  correct: number;
  total: number;
  costUsd?: number;
  avgLatencyMs?: number;
};

export function buildLeaderboard(summary: BenchmarkSummary): LeaderboardRow[] {
  // [...] tạo bản sao để KHÔNG sửa mảng gốc (giữ tính thuần).
  const sorted = [...summary.models].sort(
    (a, b) =>
      b.overall.accuracy - a.overall.accuracy || // accuracy cao lên trước
      a.modelId.localeCompare(b.modelId), // hoà nhau thì sắp theo tên cho ổn định
  );
  return sorted.map((m, i) => ({
    rank: i + 1,
    modelId: m.modelId,
    accuracyPct: toPct(m.overall.accuracy),
    correct: m.overall.correct,
    total: m.overall.total,
    costUsd: m.costUsd,
    avgLatencyMs: m.avgLatencyMs,
  }));
}
```

- [ ] **Bước 5 — Chạy test PASS.** Lệnh:

```bash
npm test -- research/vsgeo-bench/dashboard/__tests__/data.test.ts
```

Kỳ vọng: `4 passed`. Nếu còn đỏ, đọc dòng `expected ... received ...` và sửa cho tới xanh.

- [ ] **Bước 6 — Commit.**

```bash
git add research/vsgeo-bench/dashboard/data.ts research/vsgeo-bench/dashboard/__tests__/
git commit -m "feat(dashboard): import BenchmarkSummary từ analysis/types + buildLeaderboard (TDD)"
```

---

### Task 2: Hàm `buildTopicMatrix` + `modelIds` (accuracy theo chủ đề)

**Ý tưởng:** Để vẽ biểu đồ cột nhóm "mỗi chủ đề một cụm cột, mỗi model một màu", recharts cần dữ liệu dạng **một hàng cho mỗi chủ đề**, trong hàng đó có accuracy của từng model. Ta cũng cần danh sách `modelIds` để biết vẽ bao nhiêu cột.

**Files:**
- Modify: `research/vsgeo-bench/dashboard/data.ts`
- Test: `research/vsgeo-bench/dashboard/__tests__/data.test.ts` (thêm describe mới)

**Các bước:**

- [ ] **Bước 1 — Thêm test thất bại.** Thêm vào cuối `data.test.ts` (nhớ bổ sung `buildTopicMatrix, modelIds` vào dòng import ở đầu file):

```ts
import { buildTopicMatrix, modelIds } from "../data";

describe("buildTopicMatrix — accuracy theo chủ đề cho biểu đồ cột nhóm", () => {
  it("mỗi hàng là một chủ đề, có accuracyPct của từng model", () => {
    const rows = buildTopicMatrix(sample);
    const theTich = rows.find((r) => r.topic === "the_tich");
    expect(theTich).toBeDefined();
    expect(theTich!["gpt-flagship"]).toBe(90); // 0.9 -> 90
    expect(theTich!["open-model-7b"]).toBe(65); // 0.65 -> 65
  });

  it("chủ đề được sắp xếp ổn định theo thứ tự chữ cái", () => {
    const rows = buildTopicMatrix(sample);
    expect(rows.map((r) => r.topic)).toEqual(["goc", "khoang_cach", "the_tich"]);
  });

  it("model thiếu số liệu ở một chủ đề thì điền 0 (không để trống)", () => {
    // dựng một summary méo: model thứ hai không có chủ đề 'goc'
    const lệch: BenchmarkSummary = {
      ...sample,
      models: [
        sample.models[0],
        { ...sample.models[1], byTopic: sample.models[1].byTopic.filter((t) => t.topic !== "goc") },
      ],
    };
    const rows = buildTopicMatrix(lệch);
    const goc = rows.find((r) => r.topic === "goc")!;
    expect(goc["open-model-7b"]).toBe(0);
  });

  it("modelIds trả đúng danh sách model theo thứ tự trong summary", () => {
    expect(modelIds(sample)).toEqual(["gpt-flagship", "open-model-7b"]);
  });
});
```

- [ ] **Bước 2 — Chạy test cho thấy FAIL.**

```bash
npm test -- research/vsgeo-bench/dashboard/__tests__/data.test.ts
```

Kỳ vọng: các test mới FAIL (`buildTopicMatrix is not a function`), các test Task 1 vẫn PASS.

- [ ] **Bước 3 — Viết code để pass.** Thêm vào cuối `data.ts`:

```ts
// ---- 2) Ma trận accuracy theo chủ đề ----
// Danh sách modelId theo đúng thứ tự xuất hiện trong summary (dùng để vẽ số cột).
export function modelIds(summary: BenchmarkSummary): string[] {
  return summary.models.map((m) => m.modelId);
}

// Kiểu một hàng cho recharts: bắt buộc có 'topic', còn lại là accuracyPct theo từng modelId.
export type TopicChartRow = { topic: string } & Record<string, number | string>;

export function buildTopicMatrix(summary: BenchmarkSummary): TopicChartRow[] {
  // Gom TẤT CẢ chủ đề mà bất kỳ model nào có, rồi sắp theo chữ cái cho ổn định.
  const topicSet = new Set<string>();
  for (const m of summary.models) {
    for (const t of m.byTopic) topicSet.add(t.topic);
  }
  const topics = [...topicSet].sort();

  return topics.map((topic) => {
    const row: TopicChartRow = { topic };
    for (const m of summary.models) {
      const stat = m.byTopic.find((t) => t.topic === topic);
      // Model không có chủ đề này -> điền 0 để cột hiện ra (không để undefined gây khoảng trống).
      row[m.modelId] = stat ? toPct(stat.accuracy) : 0;
    }
    return row;
  });
}
```

- [ ] **Bước 4 — Chạy test PASS.**

```bash
npm test -- research/vsgeo-bench/dashboard/__tests__/data.test.ts
```

Kỳ vọng: tất cả (Task 1 + Task 2) `passed`.

- [ ] **Bước 5 — Commit.**

```bash
git add research/vsgeo-bench/dashboard/data.ts research/vsgeo-bench/dashboard/__tests__/data.test.ts
git commit -m "feat(dashboard): buildTopicMatrix + modelIds (accuracy theo chủ đề)"
```

---

### Task 3: Hàm `buildRobustnessGap` (khoảng rớt độ bền)

**Ý tưởng:** Chỉ số ấn tượng nhất của đề tài (§5, giả thuyết H2): khi ta biến đổi đề mà vẫn giữ nguyên đáp án, model rớt điểm bao nhiêu? Rớt nhiều = "dò mẫu" chứ không suy luận. Ta biến `robustness` của mỗi model thành 3 con số phần trăm (gốc / sau biến đổi / khoảng rớt), sắp theo khoảng rớt **giảm dần** để model "giòn nhất" nằm trên.

**Files:**
- Modify: `research/vsgeo-bench/dashboard/data.ts`
- Test: `research/vsgeo-bench/dashboard/__tests__/data.test.ts` (thêm describe mới)

**Các bước:**

- [ ] **Bước 1 — Thêm test thất bại.** Thêm `buildRobustnessGap` vào import đầu file, rồi thêm:

```ts
import { buildRobustnessGap } from "../data";

describe("buildRobustnessGap — khoảng rớt độ bền (H2)", () => {
  it("tính đúng phần trăm gốc, sau biến đổi và khoảng rớt", () => {
    const rows = buildRobustnessGap(sample);
    const gpt = rows.find((r) => r.modelId === "gpt-flagship")!;
    expect(gpt.basePct).toBe(82); // 0.82
    expect(gpt.perturbedPct).toBe(71); // 0.71
    expect(gpt.gapPct).toBe(11); // 0.11
  });

  it("sắp model theo khoảng rớt giảm dần (giòn nhất lên đầu)", () => {
    const rows = buildRobustnessGap(sample);
    // open-model-7b rớt 0.21 > gpt-flagship rớt 0.11
    expect(rows.map((r) => r.modelId)).toEqual(["open-model-7b", "gpt-flagship"]);
  });
});
```

- [ ] **Bước 2 — Chạy test cho thấy FAIL.**

```bash
npm test -- research/vsgeo-bench/dashboard/__tests__/data.test.ts
```

Kỳ vọng: hai test mới FAIL, phần cũ vẫn PASS.

- [ ] **Bước 3 — Viết code để pass.** Thêm vào cuối `data.ts`:

```ts
// ---- 3) Khoảng rớt độ bền (robustness gap) ----
export type RobustnessRow = {
  modelId: string;
  basePct: number; // accuracy bài gốc (%)
  perturbedPct: number; // accuracy bài biến đổi (%)
  gapPct: number; // khoảng rớt (%)
};

export function buildRobustnessGap(summary: BenchmarkSummary): RobustnessRow[] {
  return summary.models
    .map((m) => ({
      modelId: m.modelId,
      basePct: toPct(m.robustness.baseAccuracy),
      perturbedPct: toPct(m.robustness.perturbedAccuracy),
      gapPct: toPct(m.robustness.gap),
    }))
    .sort(
      (a, b) => b.gapPct - a.gapPct || a.modelId.localeCompare(b.modelId), // rớt nhiều lên trước
    );
}
```

- [ ] **Bước 4 — Chạy test PASS.**

```bash
npm test -- research/vsgeo-bench/dashboard/__tests__/data.test.ts
```

Kỳ vọng: toàn bộ file test `passed` (Task 1+2+3). Đây là lúc thở phào: **toàn bộ logic dashboard đã có lưới an toàn test.**

- [ ] **Bước 5 — Commit.**

```bash
git add research/vsgeo-bench/dashboard/data.ts research/vsgeo-bench/dashboard/__tests__/data.test.ts
git commit -m "feat(dashboard): buildRobustnessGap (khoảng rớt độ bền, H2)"
```

---

### Task 4: Component `Leaderboard.tsx` + preview bằng Vite dev server nhỏ

**Ý tưởng:** Giờ mới đụng React. Component chỉ nhận `summary` qua props, gọi ba hàm thuần ở Task 1–3, rồi vẽ: (1) bảng xếp hạng, (2) biểu đồ cột nhóm accuracy theo chủ đề, (3) biểu đồ cột "gốc vs sau biến đổi". Vì đây là Vite + React (KHÔNG Next.js), ta **không** thêm vào app chính; thay vào đó dựng một **Vite dev server tí hon** tách riêng để xem trước — gọn, không đụng gì tới web app.

**Component React khó test tự động (phải render trình duyệt) nên Task này KHÔNG có test vitest.** Nghiệm thu bằng mắt qua preview + một lệnh `tsc` kiểm kiểu.

**Files:**
- Create: `research/vsgeo-bench/dashboard/Leaderboard.tsx`
- Create: `research/vsgeo-bench/dashboard/preview.tsx`
- Create: `research/vsgeo-bench/dashboard/index.html`
- Create: `research/vsgeo-bench/dashboard/vite.preview.config.ts`

**Các bước:**

- [ ] **Bước 1 — Viết component.** Tạo `research/vsgeo-bench/dashboard/Leaderboard.tsx`:

```tsx
// dashboard/Leaderboard.tsx
// Component React THUẦN HIỂN THỊ: nhận summary đã có sẵn, gọi các hàm ở data.ts để
// tính, rồi vẽ bằng recharts. Mọi phép tính nằm ở data.ts (đã có test), ở đây chỉ "bày ra".
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  buildLeaderboard,
  buildTopicMatrix,
  buildRobustnessGap,
  modelIds,
  type BenchmarkSummary,
} from "./data";

// Bảng màu cố định để mỗi model một màu ổn định qua các biểu đồ.
const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];

export function Leaderboard({ summary }: { summary: BenchmarkSummary }) {
  const leaderboard = buildLeaderboard(summary);
  const topicRows = buildTopicMatrix(summary);
  const robustness = buildRobustnessGap(summary);
  const ids = modelIds(summary);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <h1>VSGeo-Bench — Bảng xếp hạng</h1>
      <p style={{ color: "#555" }}>
        Tổng {summary.seedCount} bài · Cập nhật {new Date(summary.generatedAt).toLocaleString("vi-VN")}
      </p>

      {/* 1) Bảng xếp hạng */}
      <h2>1. Xếp hạng tổng thể</h2>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {["Hạng", "Model", "Accuracy", "Đúng/Tổng", "Chi phí (USD)", "Độ trễ TB (ms)"].map((h) => (
              <th key={h} style={{ textAlign: "left", borderBottom: "2px solid #333", padding: "6px 8px" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((r) => (
            <tr key={r.modelId}>
              <td style={cell}>{r.rank}</td>
              <td style={cell}>{r.modelId}</td>
              <td style={cell}>{r.accuracyPct}%</td>
              <td style={cell}>
                {r.correct}/{r.total}
              </td>
              <td style={cell}>{r.costUsd ?? "—"}</td>
              <td style={cell}>{r.avgLatencyMs ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 2) Accuracy theo chủ đề */}
      <h2>2. Accuracy theo chủ đề (%)</h2>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={topicRows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="topic" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Legend />
          {ids.map((id, i) => (
            <Bar key={id} dataKey={id} fill={COLORS[i % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* 3) Khoảng rớt độ bền */}
      <h2>3. Độ bền: accuracy gốc vs sau biến đổi (%)</h2>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={robustness}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="modelId" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Legend />
          <Bar dataKey="basePct" name="Bài gốc" fill="#16a34a" />
          <Bar dataKey="perturbedPct" name="Sau biến đổi" fill="#dc2626" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const cell: React.CSSProperties = { borderBottom: "1px solid #ddd", padding: "6px 8px" };
```

- [ ] **Bước 2 — Viết điểm vào (entry) cho preview.** Tạo `research/vsgeo-bench/dashboard/preview.tsx`. File này chỉ dùng để **xem trước** trên máy em, không phải sản phẩm giao. Nó nạp chính file JSON mẫu ở Task 1 để có gì đó mà vẽ.

```tsx
// dashboard/preview.tsx — CHỈ để xem trước trên máy, không phải sản phẩm giao nộp.
import React from "react";
import { createRoot } from "react-dom/client";
import { Leaderboard } from "./Leaderboard";
import type { BenchmarkSummary } from "./data";
import sample from "./__tests__/sample-summary.json";

const root = createRoot(document.getElementById("root")!);
root.render(<Leaderboard summary={sample as BenchmarkSummary} />);
```

- [ ] **Bước 3 — Viết trang HTML vỏ.** Tạo `research/vsgeo-bench/dashboard/index.html`:

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>VSGeo-Bench Dashboard (preview)</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./preview.tsx"></script>
  </body>
</html>
```

- [ ] **Bước 4 — Viết config Vite riêng cho preview.** Tạo `research/vsgeo-bench/dashboard/vite.preview.config.ts`. Ta cần plugin React (đã có sẵn `@vitejs/plugin-react-swc`) và cho phép Vite import file `.json`.

```ts
// vite.preview.config.ts — server xem trước tách biệt, KHÔNG đụng web app chính.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname), // thư mục dashboard làm gốc phục vụ
  plugins: [react()],
  server: { port: 5199, open: true },
});
```

- [ ] **Bước 5 — Kiểm kiểu bằng TypeScript (không cần trình duyệt).** Chạy trình biên dịch ở chế độ chỉ-kiểm, không xuất file, để chắc component không sai kiểu:

```bash
npx tsc --noEmit --jsx react-jsx --module esnext --moduleResolution bundler --resolveJsonModule --skipLibCheck research/vsgeo-bench/dashboard/Leaderboard.tsx research/vsgeo-bench/dashboard/preview.tsx
```

Kỳ vọng: **không in ra lỗi nào** (lệnh kết thúc im lặng, exit code 0). Nếu báo thiếu type recharts hay react, kiểm lại `npm install` đã chạy chưa.

- [ ] **Bước 6 — Xem trước bằng mắt.** Chạy dev server tí hon:

```bash
npx vite --config research/vsgeo-bench/dashboard/vite.preview.config.ts
```

Kỳ vọng: terminal in `Local: http://localhost:5199/` và trình duyệt tự mở. Trên trang em phải thấy: **bảng xếp hạng 2 dòng** (gpt-flagship hạng 1, 82%; open-model-7b hạng 2, 50%), **biểu đồ cột theo chủ đề** (3 cụm goc/khoang_cach/the_tich, mỗi cụm 2 cột màu), và **biểu đồ độ bền** (mỗi model 2 cột xanh/đỏ). Nhấn `Ctrl+C` để tắt server.

- [ ] **Bước 7 — Commit.**

```bash
git add research/vsgeo-bench/dashboard/Leaderboard.tsx research/vsgeo-bench/dashboard/preview.tsx research/vsgeo-bench/dashboard/index.html research/vsgeo-bench/dashboard/vite.preview.config.ts
git commit -m "feat(dashboard): Leaderboard component + preview Vite server"
```

> **Vì sao không test component bằng vitest?** Test một component recharts cần dựng DOM giả và thư viện render — công sức lớn, dễ vỡ, ít giá trị so với việc **mắt nhìn thấy biểu đồ**. Ta đã dồn toàn bộ phần "dễ sai" (phép tính, sắp xếp, đổi phần trăm) xuống `data.ts` và test kỹ ở đó. Component chỉ còn là lớp bày biện — nhìn preview là đủ. Đây là một quyết định thiết kế em nên **nói được thành lời** khi phản biện.

---

### Task 4B: DEMO SỐNG "Kiểm tra lời giải AI" ⭐ (ĐIỂM NHẤN PHỎNG VẤN — ưu tiên cao)

> **Đây là thứ hội đồng sẽ NHỚ.** Thay vì chỉ khoe bảng số, ta cho ban giám khảo **tự tay thử**: dán một đề Toán + một lời giải do AI (ChatGPT/Gemini) viết ra, bấm một nút, và **máy chấm của nhóm** lập tức phán **Đúng / Sai / Không chắc** kèm đáp án chuẩn. Nó biến toàn bộ đề tài thành một câu chuyện 15 giây: *"Học sinh tự học Toán bằng AI dễ bị lời giải trôi chảy nhưng SAI đánh lừa — đây là cái máy phát hiện điều đó."* Máy chấm (oracle) là **ngôi sao**; benchmark chỉ là bằng chứng. Demo này đưa ngôi sao ra sân khấu.

**Ý tưởng (bám đúng kỷ luật tách lớp như phần dashboard):** Ta KHÔNG nhồi logic vào component. Trước hết viết một **hàm thuần** `checkAiSolution(truth, aiRawText)` — nó *trích* `\boxed{...}` và *gọi máy chấm* `grade()` (cả hai đã dựng ở kế hoạch 02), rồi trả về một kết quả **sẵn-sàng-hiển-thị** (nhãn tiếng Việt Đúng/Sai/Không chắc + đáp án chuẩn + lý do). Vì thuần (không mạng, không React) nên **test được từng nhánh**. Sau đó mới viết một component React nhỏ (Vite + React + TypeScript — **TUYỆT ĐỐI KHÔNG Next.js**) chỉ thu input và bày kết quả.

**Phụ thuộc:** kế hoạch 02 đã có `grade(modelAnswerRaw, truth): GradeResult` (`grader/grade.ts`), `extractBoxed(raw): string | null` (`grader/extract.ts`), và các kiểu `Answer`, `AnswerType`, `Verdict`, `GradeResult` (`grader/types.ts`). Demo này chỉ **dùng lại**, không sửa máy chấm.

**Files:**
- Create: `research/vsgeo-bench/dashboard/check-ai-solution.ts`
- Test: `research/vsgeo-bench/dashboard/__tests__/check-ai-solution.test.ts`
- Create: `research/vsgeo-bench/dashboard/CheckAiSolution.tsx`
- Modify: `research/vsgeo-bench/dashboard/preview.tsx` (thêm ô demo vào trang xem trước)

**Các bước:**

- [ ] **Bước 1 — Viết test thất bại cho hàm thuần.** Tạo `research/vsgeo-bench/dashboard/__tests__/check-ai-solution.test.ts`. Ta chọn ba tình huống lõi: lời giải AI đúng, lời giải AI **tự tin nhưng sai**, và lời giải không có đáp án rõ. Các mốc verdict lấy đúng theo hành vi máy chấm ở kế hoạch 02.

```ts
import { describe, it, expect } from "vitest";
import { checkAiSolution } from "../check-ai-solution";
import type { Answer } from "../../grader/types";

// Đáp án chuẩn của bài mẫu: khoảng cách = √6/3 (dạng surd).
const truth: Answer = { canonical: "√6/3", type: "surd" };

describe("checkAiSolution — máy chấm cho DEMO SỐNG 'Kiểm tra lời giải AI'", () => {
  it("lời giải AI có \\boxed ĐÚNG → verdict correct, nhãn 'Đúng', có trích được đáp án", () => {
    const r = checkAiSolution(truth, "Dựng chân đường cao... Vậy \\boxed{\\dfrac{\\sqrt6}{3}}.");
    expect(r.verdict).toBe("correct");
    expect(r.verdictLabel).toBe("Đúng");
    expect(r.extracted).not.toBeNull();
  });

  it("lời giải AI 'trôi chảy nhưng SAI' (\\boxed{5}) → verdict incorrect, nhãn 'Sai'", () => {
    const r = checkAiSolution(truth, "Trình bày dài dòng, tự tin kết luận: \\boxed{5}.");
    expect(r.verdict).toBe("incorrect");
    expect(r.verdictLabel).toBe("Sai");
  });

  it("không trích được đáp án → verdict unsure, nhãn 'Không chắc', extracted = null", () => {
    const r = checkAiSolution(truth, "Bài này khó quá, em nghĩ mãi chưa ra.");
    expect(r.verdict).toBe("unsure");
    expect(r.verdictLabel).toBe("Không chắc");
    expect(r.extracted).toBeNull();
  });

  it("luôn kèm đáp án chuẩn + lý do để học sinh ĐỐI CHIẾU, và là hàm thuần", () => {
    const r = checkAiSolution(truth, "\\boxed{5}");
    expect(r.canonicalTruth).toBe("√6/3");
    expect(r.reason.length).toBeGreaterThan(0);
    // gọi lại cho kết quả y hệt (không phụ thuộc trạng thái ngoài)
    expect(checkAiSolution(truth, "\\boxed{5}")).toEqual(r);
  });
});
```

- [ ] **Bước 2 — Chạy test cho thấy FAIL.**

```bash
npm test -- research/vsgeo-bench/dashboard/__tests__/check-ai-solution.test.ts
```

Kỳ vọng: FAIL (`Failed to resolve import "../check-ai-solution"`) vì file chưa tồn tại. Đỏ trước, xanh sau.

- [ ] **Bước 3 — Viết hàm thuần để pass.** Tạo `research/vsgeo-bench/dashboard/check-ai-solution.ts`:

```ts
// dashboard/check-ai-solution.ts
// Hàm THUẦN cho DEMO SỐNG "Kiểm tra lời giải AI".
// Nhận đáp án chuẩn của bài (truth) + toàn văn lời giải AI (chuỗi thô), rồi:
//   1) TRÍCH \boxed{...} để cho học sinh thấy "máy đọc đáp án của AI ra gì",
//   2) GỌI máy chấm grade() (so khớp ký hiệu chính xác) để ra phán quyết,
// và trả về một kết quả SẴN-SÀNG-HIỂN-THỊ (nhãn tiếng Việt). Không React, không mạng → test được.
// Máy chấm (grade, extractBoxed) là công cụ dựng ở kế hoạch 02; ở đây chỉ DÙNG LẠI.
import { extractBoxed } from "../grader/extract";
import { grade } from "../grader/grade";
import type { Answer, Verdict } from "../grader/types";

export type CheckResult = {
  verdict: Verdict; // phán quyết máy: correct | incorrect | unsure
  verdictLabel: string; // nhãn hiển thị tiếng Việt: "Đúng" | "Sai" | "Không chắc"
  extracted: string | null; // đáp án đọc được từ \boxed{...} (null nếu không thấy)
  canonicalTruth: string; // đáp án chuẩn của bài (để học sinh đối chiếu)
  reason: string; // giải thích tiếng Việt của máy chấm
};

// Ánh xạ verdict máy → nhãn thân thiện cho học sinh.
const LABEL: Record<Verdict, string> = {
  correct: "Đúng",
  incorrect: "Sai",
  unsure: "Không chắc",
};

export function checkAiSolution(truth: Answer, aiRawText: string): CheckResult {
  const extracted = extractBoxed(aiRawText); // cho học sinh thấy máy đọc đáp án AI là gì
  const result = grade(aiRawText, truth); // phán quyết dựa trên so khớp ký hiệu chính xác
  return {
    verdict: result.verdict,
    verdictLabel: LABEL[result.verdict],
    extracted,
    canonicalTruth: truth.canonical,
    reason: result.reason,
  };
}
```

- [ ] **Bước 4 — Chạy test PASS.**

```bash
npm test -- research/vsgeo-bench/dashboard/__tests__/check-ai-solution.test.ts
```

Kỳ vọng: `4 passed`. Nếu đỏ, đọc `expected ... received ...` và kiểm lại kế hoạch 02 đã dựng `grade`/`extractBoxed` chưa.

- [ ] **Bước 5 — Viết component React (chỉ hiển thị).** Tạo `research/vsgeo-bench/dashboard/CheckAiSolution.tsx`. Component có: ô textarea **đề bài**, ô textarea **lời giải AI**, ô nhập **đáp án chuẩn** + chọn **dạng đáp án**, nút **Chấm**, và khung kết quả tô màu theo verdict. Vài **ví dụ nạp sẵn** để demo chạy ngay khi mở (kể cả ca "tự tin nhưng sai").

```tsx
// dashboard/CheckAiSolution.tsx
// ⭐ ĐIỂM NHẤN PHỎNG VẤN — DEMO SỐNG "Kiểm tra lời giải AI".
// Giám khảo dán ĐỀ + LỜI GIẢI của một AI, chọn đáp án chuẩn, bấm "Chấm" → máy chấm phán
// Đúng / Sai / Không chắc kèm đáp án chuẩn để đối chiếu. Đây là bằng chứng SỐNG rằng máy
// chấm bảo vệ học sinh khỏi lời giải AI "trôi chảy nhưng sai".
// Mọi phép tính nằm ở hàm thuần checkAiSolution() (đã test); component chỉ thu input & bày kết quả.
import { useState } from "react";
import { checkAiSolution, type CheckResult } from "./check-ai-solution";
import type { Answer, AnswerType } from "../grader/types";

const ANSWER_TYPES: AnswerType[] = [
  "rational", "surd", "ratio", "point", "vector", "plane_eq", "line_eq", "boolean", "mcq",
];

// Ví dụ nạp sẵn để demo chạy được ngay (điền cả đề, đáp án chuẩn, và một lời giải AI mẫu).
const PRESETS: { label: string; de: string; canonical: string; type: AnswerType; ai: string }[] = [
  {
    label: "AI giải ĐÚNG",
    de: "Cho hình chóp S.ABCD có đáy là hình vuông cạnh a, SA vuông góc đáy. Tính khoảng cách từ A đến mặt phẳng (SBD).",
    canonical: "√6/3",
    type: "surd",
    ai: "Dựng AH vuông góc BD, rồi AK vuông góc SH... Sau khi tính, khoảng cách bằng \\boxed{\\dfrac{\\sqrt6}{3}}.",
  },
  {
    label: "AI tự tin nhưng SAI",
    de: "Cho hình chóp S.ABCD... Tính khoảng cách từ A đến mặt phẳng (SBD).",
    canonical: "√6/3",
    type: "surd",
    ai: "Lời giải dài, nhiều bước, lập luận nghe rất thuyết phục, kết luận dứt khoát: \\boxed{5}.",
  },
];

// Màu khung kết quả theo verdict.
const BADGE: Record<CheckResult["verdict"], { bg: string; fg: string; text: string }> = {
  correct: { bg: "#dcfce7", fg: "#166534", text: "ĐÚNG" },
  incorrect: { bg: "#fee2e2", fg: "#991b1b", text: "SAI" },
  unsure: { bg: "#fef9c3", fg: "#854d0e", text: "KHÔNG CHẮC" },
};

export function CheckAiSolution() {
  const [de, setDe] = useState(PRESETS[0].de);
  const [canonical, setCanonical] = useState(PRESETS[0].canonical);
  const [type, setType] = useState<AnswerType>(PRESETS[0].type);
  const [ai, setAi] = useState(PRESETS[0].ai);
  const [result, setResult] = useState<CheckResult | null>(null);

  function loadPreset(i: number) {
    const p = PRESETS[i];
    setDe(p.de);
    setCanonical(p.canonical);
    setType(p.type);
    setAi(p.ai);
    setResult(null);
  }

  function onCheck() {
    const truth: Answer = { canonical: canonical.trim(), type };
    setResult(checkAiSolution(truth, ai)); // gọi hàm thuần đã test
  }

  const badge = result ? BADGE[result.verdict] : null;

  return (
    <section style={box}>
      <h2 style={{ marginTop: 0 }}>Demo sống: Kiểm tra lời giải AI</h2>
      <p style={{ color: "#555", marginTop: 0 }}>
        Dán đề và lời giải của một AI, chọn đáp án chuẩn, rồi bấm <b>Chấm</b>. Máy chấm sẽ phán
        lời giải <b>Đúng / Sai / Không chắc</b> — bảo vệ học sinh khỏi lời giải "trôi chảy nhưng sai".
      </p>

      <div style={{ marginBottom: 8 }}>
        <span style={{ fontWeight: 600, marginRight: 8 }}>Ví dụ nạp sẵn:</span>
        {PRESETS.map((p, i) => (
          <button key={p.label} onClick={() => loadPreset(i)} style={{ marginRight: 8, cursor: "pointer" }}>
            {p.label}
          </button>
        ))}
      </div>

      <label style={lbl}>Đề bài (để đối chiếu — máy chấm chỉ so đáp án, không cần đọc đề)</label>
      <textarea value={de} onChange={(e) => setDe(e.target.value)} rows={3} style={ta} />

      <label style={lbl}>Lời giải của AI (dán nguyên văn; AI thường chốt đáp án trong \boxed)</label>
      <textarea value={ai} onChange={(e) => setAi(e.target.value)} rows={5} style={ta} />

      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginTop: 8 }}>
        <div>
          <label style={lbl}>Đáp án chuẩn</label>
          <input value={canonical} onChange={(e) => setCanonical(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>Dạng đáp án</label>
          <select value={type} onChange={(e) => setType(e.target.value as AnswerType)} style={inp}>
            {ANSWER_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <button onClick={onCheck} style={btn}>Chấm</button>
      </div>

      {result && badge && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: badge.bg, color: badge.fg }}>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{badge.text}</div>
          <div style={{ marginTop: 6 }}>
            Máy đọc đáp án của AI: <b>{result.extracted ?? "(không trích được đáp án)"}</b>
          </div>
          <div>
            Đáp án chuẩn của bài: <b>{result.canonicalTruth}</b>
          </div>
          <div style={{ marginTop: 6, color: "#333" }}>{result.reason}</div>
        </div>
      )}
    </section>
  );
}

const box: React.CSSProperties = {
  border: "2px solid #2563eb",
  borderRadius: 12,
  padding: 16,
  margin: "24px 0",
  fontFamily: "system-ui, sans-serif",
};
const lbl: React.CSSProperties = { display: "block", fontWeight: 600, margin: "8px 0 4px" };
const ta: React.CSSProperties = { width: "100%", fontFamily: "inherit", padding: 8, boxSizing: "border-box" };
const inp: React.CSSProperties = { padding: 8, fontFamily: "inherit" };
const btn: React.CSSProperties = { padding: "8px 20px", fontSize: 16, fontWeight: 700, cursor: "pointer" };
```

- [ ] **Bước 6 — Nối ô demo vào trang xem trước.** Sửa `research/vsgeo-bench/dashboard/preview.tsx` để render thêm `<CheckAiSolution />` ngay dưới bảng xếp hạng (giữ nguyên phần `<Leaderboard>`):

```tsx
// dashboard/preview.tsx — CHỈ để xem trước trên máy, không phải sản phẩm giao nộp.
import { createRoot } from "react-dom/client";
import { Leaderboard } from "./Leaderboard";
import { CheckAiSolution } from "./CheckAiSolution";
import type { BenchmarkSummary } from "./data";
import sample from "./__tests__/sample-summary.json";

const root = createRoot(document.getElementById("root")!);
root.render(
  <>
    <Leaderboard summary={sample as BenchmarkSummary} />
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <CheckAiSolution />
    </div>
  </>,
);
```

- [ ] **Bước 7 — Kiểm kiểu bằng TypeScript.** Chạy trình biên dịch chế độ chỉ-kiểm cho hàm thuần + component:

```bash
npx tsc --noEmit --jsx react-jsx --module esnext --moduleResolution bundler --resolveJsonModule --skipLibCheck research/vsgeo-bench/dashboard/check-ai-solution.ts research/vsgeo-bench/dashboard/CheckAiSolution.tsx research/vsgeo-bench/dashboard/preview.tsx
```

Kỳ vọng: **không in lỗi** (exit 0).

- [ ] **Bước 8 — Xem trước bằng mắt.** Chạy dev server tí hon (như Task 4), cuộn xuống dưới bảng xếp hạng:

```bash
npx vite --config research/vsgeo-bench/dashboard/vite.preview.config.ts
```

Kỳ vọng: thấy ô viền xanh **"Demo sống: Kiểm tra lời giải AI"**. Bấm nút **"AI tự tin nhưng SAI"** rồi bấm **Chấm** → hiện khung đỏ **SAI**, "Máy đọc đáp án của AI: 5", "Đáp án chuẩn của bài: √6/3". Bấm **"AI giải ĐÚNG"** rồi **Chấm** → khung xanh **ĐÚNG**. Đây chính là màn em sẽ diễn trước hội đồng. `Ctrl+C` để tắt.

- [ ] **Bước 9 — Commit.**

```bash
git add research/vsgeo-bench/dashboard/check-ai-solution.ts research/vsgeo-bench/dashboard/CheckAiSolution.tsx research/vsgeo-bench/dashboard/preview.tsx research/vsgeo-bench/dashboard/__tests__/check-ai-solution.test.ts
git commit -m "feat(dashboard): DEMO SỐNG Kiểm tra lời giải AI (checkAiSolution thuần + component)"
```

> **Vì sao demo này mạnh khi phản biện?** (1) Nó cho hội đồng **tương tác trực tiếp** thay vì nghe kể — cảm giác "máy chấm thật, chạy được" đọng lại lâu. (2) Nó đặt **máy chấm (oracle) làm ngôi sao**, đúng thông điệp đề tài: bảo vệ học sinh tự học khỏi lời giải AI sai. (3) Nó thể hiện lại **kỷ luật tách lớp**: logic ở hàm thuần `checkAiSolution` (có test), giao diện chỉ bày ra — em nói được thành lời vì sao thiết kế vậy. Chuẩn bị sẵn 1–2 ca "tự tin nhưng sai" ấn tượng để bấm trước giám khảo.

---

### Task 5: `docs/datasheet.md` — "phiếu lý lịch" bộ dữ liệu (2 em tự soạn)

> **Phần này là công sức trí tuệ của 2 em.** Kế hoạch KHÔNG viết hộ nội dung — vì "datasheet" là bằng chứng liêm chính khoa học mà hội đồng sẽ hỏi trực tiếp. Kế hoạch cho em **khung mục (template)**, **một mục đã điền mẫu**, và **checklist nghiệm thu**. Việc của em: điền các mục còn lại bằng số liệu THẬT từ dataset của mình.

"Datasheet for Datasets" là chuẩn học thuật (Gebru et al.) để mô tả một bộ dữ liệu: nó từ đâu ra, làm thế nào, dùng cho gì, có bẫy gì. Có datasheet = dataset của em **chuyên nghiệp và tái lập được** (§9.1, §3.2).

**Files:**
- Create: `research/vsgeo-bench/docs/datasheet.md`

**Các bước:**

- [ ] **Bước 1 — Tạo file từ khung sau.** Chép nguyên khung này vào `research/vsgeo-bench/docs/datasheet.md`, rồi điền phần trong dấu `«…»`. Mục "Phân bố nhãn" đã điền mẫu bằng số **giả định** — thay bằng số THẬT của em (đếm bằng script ở Bước 2).

```markdown
# Datasheet — VSGeo-Bench

*Theo khung "Datasheet for Datasets" (Gebru et al., 2021). Mọi số liệu dưới đây phải khớp
với dữ liệu thật trong `data/seeds/`.*

## 1. Động cơ (Motivation)
- **Bộ dữ liệu này được tạo để làm gì?** «Điền: đo năng lực suy luận hình học không gian
  của các model AI trên đề Toán THPT tiếng Việt; xem câu hỏi khoa học §1 của design.md.»
- **Ai tạo?** «Nhóm 2 học sinh THPT ... , đề tài ViSEF 2026–2027.»
- **Ai tài trợ?** «Không có / học bổng ... (điền trung thực).»

## 2. Thành phần (Composition)
- **Mỗi "instance" là gì?** Một bài hình học không gian (seed) theo schema §3.3, gồm đề
  tiếng Việt, đáp án chuẩn, và nhãn phân loại.
- **Có bao nhiêu bài?** «Điền số thật, vd 300 seed → N instance sau biến đổi.»
- **Phân bố nhãn (điền số THẬT — xem script Bước 2):**

  | Chiều | Nhãn | Số bài |
  |-------|------|--------|
  | Chủ đề | the_tich | «đếm» |
  | Chủ đề | khoang_cach | «đếm» |
  | Độ khó | 1..4 | «đếm từng mức» |
  | Cần hình phụ | có / không | «đếm» |
  | Dạng đáp án | surd/ratio/... | «đếm» |

- **Có dữ liệu nhạy cảm / cá nhân không?** Không (chỉ là bài toán). *Khảo sát giáo viên
  (§8) lưu riêng, ẩn danh — xem plan khảo sát.*

## 3. Quy trình thu thập & chuẩn hoá (Collection & Preprocessing)
- **Nguồn?** «~60% từ đề THPTQG / thi thử / SGK, ĐÃ CHUẨN HOÁ LỜI VĂN (không chép nguyên
  văn); ~40% tự sinh có kiểm soát (§3.2). Ghi rõ nguồn từng nhóm.»
- **Chuẩn hoá thế nào?** «Mô tả các bước: viết lại lời đề, gán schema, soạn đáp án chuẩn,
  cho engine xác minh (đáp án chuẩn kép §3.5), giải cờ đỏ khi lệch.»
- **Ai xác minh đáp án?** «Người soạn + engine ký hiệu (ghi nguồn: api/_lib/kernel). Tỉ lệ
  verified_by_engine = «điền %».»

## 4. Hạn chế & thiên lệch (Limitations & Bias)
- «Trung thực: chỉ phủ HHKG lớp 11–12, không phủ hình phẳng/giải tích (§1 scope);
  phần đề chuẩn hoá có thể trùng dữ liệu huấn luyện model → xem cách chặn nhiễm dữ liệu §12;
  khảo sát GV quy mô nhỏ, không tổng quát hoá.»

## 5. Giấy phép & phân phối (License & Distribution)
- **Giấy phép dataset:** «Điền, vd CC BY 4.0 cho phần tự sinh; phần đề trích nguồn ghi rõ.»
- **Giấy phép code:** «vd MIT — xem release-checklist.md.»
- **Engine dùng làm oracle:** công cụ có sẵn của thành viên nhóm, ghi nguồn tại grader/;
  KHÔNG nhận là do nhóm phát minh (§4.4).

## 6. Bảo trì (Maintenance)
- **Ai bảo trì, liên hệ ở đâu?** «Điền.»
- **Có kế hoạch cập nhật không?** «Điền trung thực.»
```

- [ ] **Bước 2 — Đếm phân bố nhãn bằng script (để điền số THẬT, không đoán).** Viết một script CLI nhỏ dùng `tsx` (đã cài ở kế hoạch 00) để đếm nhãn trực tiếp từ `data/seeds/`. Tạo `research/vsgeo-bench/dashboard/count-labels.ts`:

```ts
// count-labels.ts — chạy: npx tsx research/vsgeo-bench/dashboard/count-labels.ts
// Đếm phân bố nhãn từ các file seed JSON để điền vào datasheet. KHÔNG đoán số bằng tay.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const seedsDir = path.resolve(here, "../data/seeds");

const topic: Record<string, number> = {};
const difficulty: Record<string, number> = {};
let auxYes = 0;
let auxNo = 0;
const answerForm: Record<string, number> = {};
let n = 0;

for (const file of readdirSync(seedsDir)) {
  if (!file.endsWith(".json")) continue;
  const seed = JSON.parse(readFileSync(path.join(seedsDir, file), "utf8"));
  n++;
  for (const t of seed.tags?.topic ?? []) topic[t] = (topic[t] ?? 0) + 1;
  const d = String(seed.tags?.difficulty ?? "?");
  difficulty[d] = (difficulty[d] ?? 0) + 1;
  if (seed.tags?.requires_auxiliary_construction) auxYes++;
  else auxNo++;
  const af = seed.tags?.answer_form ?? "?";
  answerForm[af] = (answerForm[af] ?? 0) + 1;
}

console.log(`Tổng số seed: ${n}`);
console.log("Theo chủ đề:", topic);
console.log("Theo độ khó:", difficulty);
console.log(`Cần hình phụ: có=${auxYes}, không=${auxNo}`);
console.log("Theo dạng đáp án:", answerForm);
```

Chạy:

```bash
npx tsx research/vsgeo-bench/dashboard/count-labels.ts
```

Kỳ vọng: in ra các bảng đếm. **Chép số này vào bảng "Phân bố nhãn" ở Bước 1.** (Nếu `data/seeds/` còn rỗng vì chưa tới bước soạn bài, chạy lại script này khi đã có ~300 bài.)

- [ ] **Bước 3 — Tự chấm bằng checklist nghiệm thu.** Trước khi coi datasheet là xong, tự trả lời "có/không" cho từng dòng — mọi dòng phải "có":
  - [ ] Mọi mục `«…»` đã được thay bằng nội dung thật, không còn dấu ngoặc nhọn.
  - [ ] Số ở bảng phân bố khớp output script (không phải số bịa).
  - [ ] Có nêu **ít nhất 2 hạn chế trung thực** (mục 4).
  - [ ] Có ghi nguồn engine rõ ràng ở mục 5 (không nhận là tự phát minh).
  - [ ] Giấy phép dataset và code đều đã điền cụ thể.

- [ ] **Bước 4 — Commit.**

```bash
git add research/vsgeo-bench/docs/datasheet.md research/vsgeo-bench/dashboard/count-labels.ts
git commit -m "docs(datasheet): datasheet + script đếm nhãn cho dataset"
```

---

### Task 6: `docs/release-checklist.md` — quy trình tách repo công khai (2 em tự làm, có code hỗ trợ)

> **Đây là bước "an toàn" quan trọng nhất trước khi công bố.** Sai một chỗ là **lộ khoá API** (mất tiền, mất điểm liêm chính) hoặc **repo con không chạy được** vì thiếu engine. Kế hoạch cho em checklist chi tiết + một script quét khoá bí mật. Việc *thực hiện* các bước (vendor engine, viết LICENSE, hoàn thiện README) là của em.

Theo §14: repo con phải **tự đứng được** khi tách ra công khai — nghĩa là phần engine dùng làm oracle (`exactForm.ts`, `scalar.ts`) phải được **sao chép (vendor)** vào `grader/` kèm ghi nguồn + giấy phép, và mọi khoá/.env phải bị gỡ.

**Files:**
- Create: `research/vsgeo-bench/docs/release-checklist.md`
- Create: `research/vsgeo-bench/dashboard/scan-secrets.ts`

**Các bước:**

- [ ] **Bước 1 — Viết script quét khoá bí mật (công cụ, có code đầy đủ).** Tạo `research/vsgeo-bench/dashboard/scan-secrets.ts`. Script duyệt toàn bộ thư mục dự án con, tìm dấu hiệu khoá API và file `.env`, in cảnh báo và **thoát với mã lỗi khác 0** nếu thấy — để em không lỡ tay đẩy khoá lên GitHub.

```ts
// scan-secrets.ts — chạy: npx tsx research/vsgeo-bench/dashboard/scan-secrets.ts
// Quét thư mục dự án con tìm khoá API / file .env lỡ sót TRƯỚC KHI công khai repo.
// Thoát mã 1 nếu thấy nghi vấn (để dùng trong checklist phát hành).
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, ".."); // thư mục research/vsgeo-bench

// Các mẫu khoá thường gặp (tiền tố nhà cung cấp) + biến môi trường lộ giá trị.
const PATTERNS: { name: string; re: RegExp }[] = [
  { name: "OpenAI key", re: /sk-[A-Za-z0-9]{20,}/ },
  { name: "Anthropic key", re: /sk-ant-[A-Za-z0-9-]{20,}/ },
  { name: "Google API key", re: /AIza[A-Za-z0-9_-]{30,}/ },
  { name: "Gán khoá lộ giá trị", re: /(API_KEY|APIKEY|SECRET|TOKEN)\s*[:=]\s*["'][A-Za-z0-9_-]{16,}["']/i },
];
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build"]);

let hits = 0;

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const rel = path.relative(root, full);
    if (statSync(full).isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      walk(full);
      continue;
    }
    // File .env (trừ .env.example) là cờ đỏ.
    if (/^\.env(\.|$)/.test(entry) && entry !== ".env.example") {
      console.error(`[CẢNH BÁO] File môi trường lộ: ${rel}`);
      hits++;
    }
    // Chỉ quét file văn bản; bỏ ảnh/nhị phân cho nhẹ.
    if (!/\.(ts|tsx|js|jsx|json|md|txt|env|yml|yaml)$/.test(entry)) continue;
    const text = readFileSync(full, "utf8");
    for (const p of PATTERNS) {
      if (p.re.test(text)) {
        console.error(`[CẢNH BÁO] Nghi ${p.name} trong: ${rel}`);
        hits++;
      }
    }
  }
}

walk(root);

if (hits > 0) {
  console.error(`\n❌ Tìm thấy ${hits} nghi vấn. GỠ SẠCH trước khi công khai repo.`);
  process.exit(1);
} else {
  console.log("✅ Không thấy khoá/.env nghi vấn. An toàn hơn để công khai.");
}
```

Chạy thử:

```bash
npx tsx research/vsgeo-bench/dashboard/scan-secrets.ts
```

Kỳ vọng ở giai đoạn này: `✅ Không thấy khoá/.env nghi vấn.` (vì ta chưa commit khoá nào). Nếu nó cảnh báo, xử lý ngay.

- [ ] **Bước 2 — Viết checklist phát hành từ khung sau.** Tạo `research/vsgeo-bench/docs/release-checklist.md`:

```markdown
# Checklist phát hành công khai — VSGeo-Bench

*Làm theo THỨ TỰ. Chỉ đánh dấu khi ĐÃ thật sự làm và kiểm.*

## A. Vendor (sao chép) engine vào grader/ — §14, §4.4
- [ ] Tạo `research/vsgeo-bench/grader/vendor/kernel/`.
- [ ] Sao chép `api/_lib/kernel/exactForm.ts` và `api/_lib/kernel/scalar.ts` vào đó
      (cùng bất kỳ file kernel nào chúng import — dò theo lệnh `import`).
- [ ] Đầu MỖI file vendor thêm khối ghi nguồn:
      `// Nguồn: api/_lib/kernel/<tên>.ts của web app geo3d (công cụ có sẵn của thành viên nhóm).`
      `// Sao chép (vendor) để repo công khai tự đứng được. Giấy phép: xem LICENSE-engine.`
- [ ] Sửa các `import` trong grader/ để trỏ vào bản vendor thay vì `../../../api/...`.
- [ ] Chạy `npm test -- research/vsgeo-bench/grader` → PHẢI xanh với bản vendor.
- [ ] Thêm `LICENSE-engine` (hoặc mục trong NOTICE) nêu rõ giấy phép phần engine.

## B. Gỡ mọi bí mật — §9.3
- [ ] `npx tsx research/vsgeo-bench/dashboard/scan-secrets.ts` → PHẢI in ✅.
- [ ] Thêm/kiểm `.gitignore` có dòng `.env` và `.env.*` (trừ `.env.example`).
- [ ] Nếu từng lỡ commit khoá: xoay (revoke) khoá đó ở nhà cung cấp NGAY.
- [ ] Tạo `.env.example` chỉ có TÊN biến, KHÔNG có giá trị.

## C. Giấy phép & ghi nguồn
- [ ] Thêm `LICENSE` cho code (vd MIT) và ghi giấy phép dataset (vd CC BY 4.0) trong datasheet.
- [ ] README ghi rõ phần nào là công cụ có sẵn (engine) vs phần 2 em tự làm (§4.4).

## D. Hoàn thiện README repo con
- [ ] Mô tả dự án + cách chạy: `npm install`, `npm test`, cách xem dashboard.
- [ ] Link tới datasheet.md, design.md, report.
- [ ] Trạng thái, nhóm tác giả, cách trích dẫn (citation).

## E. Kiểm tra "người lạ chạy được"
- [ ] Ở một thư mục SẠCH, thử `npm install` rồi `npm test` → toàn bộ xanh.
- [ ] Mở dashboard preview theo hướng dẫn README → thấy biểu đồ.
- [ ] Không file nào import ngược ra ngoài `research/vsgeo-bench/` (repo con tự chứa).
```

- [ ] **Bước 3 — Tự chấm.** Đây là checklist để *chạy khi thật sự phát hành* (T6). Ở bước lập kế hoạch, chỉ cần đảm bảo: (a) script `scan-secrets.ts` chạy ra ✅, (b) file checklist tồn tại và đủ 5 mục A–E, (c) mỗi mục là hành động cụ thể (không có "TBD").

- [ ] **Bước 4 — Commit.**

```bash
git add research/vsgeo-bench/docs/release-checklist.md research/vsgeo-bench/dashboard/scan-secrets.ts
git commit -m "docs(release): checklist phát hành + script quét khoá bí mật"
```

---

### Task 7: `docs/report-outline.md` + `docs/poster-outline.md` — dàn ý báo cáo & poster (2 em tự soạn)

> **Phần này là công sức trí tuệ của 2 em.** Kế hoạch cho khung ánh xạ tới câu hỏi/giả thuyết (§1) và tiêu chí giải Nhất (§13), cùng gợi ý luyện phản biện. Nội dung khoa học — cách kể câu chuyện, chọn số liệu nào để nêu bật, diễn giải kết quả — là **của em**, và chính là thứ hội đồng chấm.

**Files:**
- Create: `research/vsgeo-bench/docs/report-outline.md`
- Create: `research/vsgeo-bench/docs/poster-outline.md`

**Các bước:**

- [ ] **Bước 1 — Tạo dàn ý báo cáo.** Chép khung sau vào `research/vsgeo-bench/docs/report-outline.md`. Cột "Nội dung cần có" là gợi ý; em viết đầy bằng kết quả thật.

```markdown
# Dàn ý báo cáo NCKH — VSGeo-Bench

*Mỗi mục ghi rõ nó trả lời câu hỏi/giả thuyết nào (§1) và phục vụ tiêu chí giải Nhất nào (§13).*

| # | Mục | Nội dung cần có | Ánh xạ |
|---|-----|-----------------|--------|
| 1 | Tóm tắt (Abstract) | 1 đoạn: vấn đề, ta làm gì, phát hiện chính, tác động | §0 |
| 2 | Đặt vấn đề | Học sinh Việt dùng AI học Toán nhưng chưa có thước đo khách quan | §1 câu hỏi trung tâm |
| 3 | Câu hỏi & giả thuyết | Nêu H1–H4, mỗi cái 1 câu kiểm chứng được | §1 |
| 4 | Công trình liên quan | GSM8K/MATH (Anh), benchmark NLP Việt; nêu KHOẢNG TRỐNG | §2 novelty |
| 5 | Bộ dữ liệu | Quy mô, nguồn, schema, đáp án chuẩn kép, phân bố nhãn (dẫn datasheet) | §3 |
| 6 | Máy chấm oracle | Thiết kế nhiều lớp, tự kiểm định precision/recall, ranh giới engine | §4 |
| 7 | Bộ biến đổi (robustness) | 5 loại biến đổi, chỉ số khoảng rớt | §5, H2 |
| 8 | Giao thức đánh giá | Dàn model, zero-shot vs CoT, k lần, thống kê | §6 |
| 9 | Kết quả | Bảng xếp hạng, accuracy theo chủ đề/độ khó/hình phụ, robustness gap, "tự tin nhưng sai" | §6.3, H1–H4 |
| 10 | Phân loại lỗi | 6 loại lỗi, κ đồng thuận, ví dụ output thật | §7 |
| 11 | Khảo sát giáo viên | Tỉ lệ "bị đánh lừa", tương quan tin-cậy vs đúng | §8, H3 |
| 12 | Thảo luận | Diễn giải: model suy luận hay dò mẫu? Tác động giáo dục | §9.2 |
| 13 | Hạn chế | Trung thực: nhiễm dữ liệu, N nhỏ, phạm vi | §10, §12 |
| 14 | Kết luận & hướng phát triển | Trả lời câu hỏi trung tâm; nêu bản công khai | §1, §9 |
| — | Phụ lục | Datasheet, link repo/dashboard, phiếu đồng thuận khảo sát | §9.1 |

## Gợi ý luyện phản biện (viết sẵn câu trả lời cho từng câu hỏi hóc búa)
- "Làm sao biết máy chấm (oracle) đúng?" → dẫn §4.3: precision/recall + soát tay mẫu.
- "Engine có phải các em tự viết không?" → Không; là công cụ có sẵn, ghi nguồn (§4.4);
  phần các em tự làm là logic tương đương đáp án, harness, taxonomy, phân tích.
- "Điểm cao có phải do model đã thấy đề?" → dẫn §12 chống nhiễm dữ liệu + robustness gap.
- "N khảo sát nhỏ, sao kết luận?" → báo cáo như nghiên cứu THAM CHIẾU, không tổng quát hoá (§8.4).
```

- [ ] **Bước 2 — Tạo dàn ý poster.** Chép khung sau vào `research/vsgeo-bench/docs/poster-outline.md`:

```markdown
# Dàn ý poster — VSGeo-Bench

*Poster đọc trong 60 giây từ xa 2 mét. Ít chữ, nhiều hình. Bố cục gợi ý A0 dọc, 6 khối.*

| Khối | Vị trí | Nội dung | Hình chủ đạo |
|------|--------|----------|--------------|
| 1. Tiêu đề & khẩu hiệu | Trên cùng | Tên đề tài + "AI có 'nhìn' được hình không gian?" + tên nhóm | Logo/hình khối 3D |
| 2. Vấn đề & câu hỏi | Trái trên | 2–3 câu: khoảng trống + câu hỏi trung tâm | Icon |
| 3. Phương pháp | Giữa trái | Sơ đồ: đề → model → oracle chấm → phân tích | Sơ đồ khối |
| 4. Kết quả chính | Giữa phải (lớn nhất) | Bảng xếp hạng + biểu đồ robustness gap (chụp từ dashboard) | Biểu đồ từ Leaderboard.tsx |
| 5. Phát hiện nổi bật | Phải dưới | H2 "model giòn" + H3 "tự tin nhưng sai" + khảo sát GV | 1 số liệu to |
| 6. Tác động & công khai | Dưới cùng | Thông điệp giáo dục + QR link repo/dashboard | QR code |

## Nguyên tắc trình bày
- Mỗi khối 1 ý. Cỡ chữ tiêu đề khối ≥ 48pt.
- Biểu đồ lấy thẳng từ dashboard (Task 4) để nhất quán số liệu.
- Ghi nguồn engine nhỏ ở chân poster (liêm chính).

## Gợi ý luyện thuyết trình poster (kịch bản 90 giây)
- 0–15s: câu hỏi + vì sao quan trọng với học sinh Việt.
- 15–45s: ta đo thế nào (oracle + robustness) — nhấn phần TỰ LÀM.
- 45–75s: phát hiện gây bất ngờ (model giòn / tự tin nhưng sai + GV bị đánh lừa).
- 75–90s: tác động + mời quét QR xem dashboard.
```

- [ ] **Bước 3 — Tự chấm.** Kiểm: (a) mọi mục báo cáo có cột "Ánh xạ" trỏ tới § của design.md; (b) mục kết quả (report #9) và khối poster #4 đều dùng đúng ba biểu đồ dashboard đã dựng; (c) cả hai file đều có phần luyện phản biện/thuyết trình.

- [ ] **Bước 4 — Commit.**

```bash
git add research/vsgeo-bench/docs/report-outline.md research/vsgeo-bench/docs/poster-outline.md
git commit -m "docs(outline): dàn ý báo cáo NCKH + poster"
```

---

## Tiêu chí hoàn thành (Definition of Done)

Hệ con coi như xong khi TẤT CẢ dưới đây đúng (ánh xạ §13):

- [ ] `npm test -- research/vsgeo-bench/dashboard` **xanh**: ≥ 8 test cho các hàm thuần trong `data.ts` (buildLeaderboard, buildTopicMatrix + modelIds, buildRobustnessGap). *(→ dashboard tái lập được, §13 "công khai, tái lập được".)*
- [ ] `npx vite --config research/vsgeo-bench/dashboard/vite.preview.config.ts` mở ra trang hiện đủ **3 thành phần**: bảng xếp hạng, biểu đồ accuracy theo chủ đề, biểu đồ robustness gap. *(→ §13 "dataset + code + dashboard công khai".)*
- [ ] `npx tsc --noEmit ...` trên `Leaderboard.tsx` + `preview.tsx` không lỗi kiểu.
- [ ] **DEMO SỐNG (Task 4B):** `npm test -- research/vsgeo-bench/dashboard/__tests__/check-ai-solution.test.ts` **xanh** (≥4 test cho hàm thuần `checkAiSolution`); và preview hiện ô **"Kiểm tra lời giải AI"** chấm được ca đúng (khung xanh) lẫn ca "tự tin nhưng sai" (khung đỏ). *(→ điểm nhấn phỏng vấn: máy chấm/oracle là ngôi sao, §9 tác động giáo dục.)*
- [ ] `docs/datasheet.md` hoàn chỉnh, số phân bố nhãn khớp output `count-labels.ts`, có ≥2 hạn chế trung thực, ghi nguồn engine. *(→ §9.1 datasheet, §9.3 liêm chính.)*
- [ ] `npx tsx research/vsgeo-bench/dashboard/scan-secrets.ts` in ✅ (không lộ khoá). *(→ §9.3.)*
- [ ] `docs/release-checklist.md` đủ 5 mục A–E, mỗi mục là hành động cụ thể, gồm bước **vendor engine** kèm ghi nguồn (§14, §4.4).
- [ ] `docs/report-outline.md` + `docs/poster-outline.md` tồn tại, mọi mục ánh xạ tới § design.md và tới các biểu đồ dashboard; có phần luyện phản biện. *(→ §13 "báo cáo + poster hoàn chỉnh".)*
- [ ] Mọi commit đã tạo với message conventional; không còn dấu `«…»` hay "TBD" trong tài liệu đã điền.

---

## Bảng thuật ngữ

| Thuật ngữ | Nghĩa dễ hiểu |
|-----------|----------------|
| **Pure function (hàm thuần)** | Hàm cùng input luôn cho cùng output, không đụng mạng/ổ đĩa/random, không sửa input. Nhờ vậy test được dễ dàng. |
| **Fixture** | Dữ liệu mẫu cố định dùng để test (ở đây là `sample-summary.json`). |
| **TDD (Test-Driven Development)** | Viết test (đỏ) trước, rồi viết code cho xanh. Giúp bắt lỗi sớm và tự tin sửa code. |
| **recharts** | Thư viện React vẽ biểu đồ (cột, đường...) bằng cách khai báo `<BarChart>`, `<Bar>`... |
| **ResponsiveContainer** | Vỏ recharts giúp biểu đồ tự co giãn theo khung cha. |
| **ESM (`import/export`)** | Kiểu module chuẩn của dự án (`"type":"module"`). Trong ESM không có sẵn `__dirname`, phải dựng từ `import.meta.url`. |
| **tsx** | Công cụ chạy thẳng file TypeScript ở dòng lệnh: `npx tsx file.ts`. Cài ở kế hoạch 00. |
| **Datasheet for Datasets** | Chuẩn học thuật mô tả "lý lịch" một bộ dữ liệu: nguồn, cách làm, hạn chế, giấy phép. |
| **Vendor (hoá)** | Sao chép mã của một thư viện/engine vào thẳng repo mình (kèm ghi nguồn) để repo tự đứng được, không phụ thuộc bên ngoài. |
| **Robustness gap** | Khoảng rớt độ chính xác giữa bài gốc và bài đã biến đổi bảo toàn đáp án. Rớt nhiều = model "dò mẫu". |
| **Oracle** | Máy chấm tự động phán đáp án model đúng/sai bằng so khớp ký hiệu chính xác. |

---

## Em sẽ bảo vệ được gì trước hội đồng

- **"Tách logic khỏi giao diện để kiểm thử được":** em chứng minh được vì sao dồn phép tính vào `data.ts` (hàm thuần, có ≥8 test) rồi để component chỉ hiển thị — đây là tư duy kỹ thuật phần mềm thật, không phải "làm cho có".
- **"Trực quan hoá trung thực số liệu":** em đọc một file JSON kết quả và biến nó thành bảng xếp hạng + biểu đồ robustness — thể hiện năng lực phân tích & truyền đạt dữ liệu (§6.3, §13).
- **"Liêm chính khoa học khi công bố":** qua datasheet + release-checklist + script quét khoá + vendor engine có ghi nguồn, em cho thấy hiểu và thực hành đạo đức nghiên cứu (nguồn dữ liệu, giấy phép, ranh giới công cụ có sẵn vs tự làm — §4.4, §9.3, §14).
- **"Kể được câu chuyện nghiên cứu":** dàn ý báo cáo & poster ánh xạ từng mục về câu hỏi/giả thuyết H1–H4 và tiêu chí giải Nhất, kèm kịch bản phản biện — em sẵn sàng đứng trước hội đồng, không bị hỏi bất ngờ.
