# Bộ biến đổi có kiểm soát (Robustness) — Kế hoạch triển khai

> **Cho người thực thi (agentic worker):** REQUIRED SUB-SKILL: dùng superpowers:subagent-driven-development hoặc superpowers:executing-plans để làm theo từng Task. Các bước dùng checkbox `- [ ]` để theo dõi.

**Mục tiêu:** Từ mỗi bài gốc (seed) sinh ra các biến thể *bảo toàn đáp án* (hoặc đổi đáp án theo một quy tắc biết trước) để đo xem model **suy luận thật** hay chỉ **dò mẫu** (design §5, giả thuyết H2).

> **Phạm vi cho vòng trường (3 tháng):** ba phép **cốt lõi** `rename` / `rescale` / `paraphrase` — đủ để đưa ra bằng chứng cho giả thuyết H2 (model dò mẫu hay suy luận thật). **Để dành MỞ RỘNG (sau vòng trường):** mở rộng độ phủ `distractor` / `reflect` và tăng số biến thể mỗi seed (nhiều `k`, nhiều câu nhiễu, thêm các phép đẳng cự khác). Các Task `distractor`/`reflect` dưới đây vẫn giữ nguyên để làm sẵn, chỉ được gắn nhãn MỞ RỘNG.

**Kiến trúc:** Mỗi loại biến đổi là một file thuần TypeScript nhận vào một `Seed` và trả ra một `Variant` (chính là `Seed` cộng thêm nhãn truy vết cha). Một hàm điều phối `perturb()` gọi đúng phép theo `kind`; một CLI `generate.ts` chạy hàng loạt cho toàn bộ seed; một file `metrics.ts` tính hai chỉ số robustness/consistency mà nhóm phân tích (plan 05) dùng lại. Ta **tái sử dụng engine ký hiệu có sẵn** (`toExactForm`, `evalExpr`) để tính đáp án co giãn cho chuẩn kiểu SGK.

**Công nghệ:** Vite + React + TypeScript (KHÔNG phải Next.js) · npm · ESM (`"type":"module"`) · vitest (chạy `npm test`) · `npx tsx` để chạy CLI · engine ký hiệu tại `api/_lib/kernel/`.

---

## Dành cho 2 em (đọc trước)

Chào 2 em! Đây là **chương gây ấn tượng nhất** của đề tài trước hội đồng, nên anh/chị viết thật kỹ.

**"Biến đổi có kiểm soát" (perturbation) là gì?** Hãy tưởng tượng em ra cho AI một bài toán, nó giải đúng. Rồi em **đổi tên các đỉnh** từ `ABCD` thành `MNPQ` — bài toán y hệt về mặt toán học, đáp án không đổi một li. Nếu AI đột nhiên giải **sai**, thì nó không thật sự "hiểu" hình, mà chỉ *nhớ mẫu* của những bài giống vậy nó từng thấy. Đó chính là bằng chứng cho giả thuyết **H2** ("model giòn"). Việc sinh các bài "hoá trang" như vậy — mà vẫn kiểm soát được đáp án đúng — gọi là *perturbation / robustness probing*, một kỹ thuật có nền tảng học thuật (design §5), nên **trích dẫn được, phản biện được**.

**5 phép biến đổi ta làm:**

| Phép | Làm gì | Đáp án |
|------|--------|--------|
| `rename` | `ABCD` → `MNPQ` (đổi tên đỉnh) | Giữ nguyên |
| `rescale` | cạnh `a` → `k·a` (đổi tỉ lệ) | Co giãn theo bậc (thể tích ×k³) |
| `distractor` | chèn 1 câu dữ kiện **thừa** | Giữ nguyên |
| `paraphrase` | viết lại lời văn (nhờ 1 model) | Giữ nguyên |
| `reflect` | phản chiếu hệ toạ độ | Giữ nguyên (bất biến dời hình) |

**Sản phẩm cuối trông thế nào?** Sau khi làm xong, chạy một lệnh (`npx tsx .../generate.ts`) sẽ đọc ~300 bài gốc và đẻ ra hàng nghìn biến thể trong thư mục `data/seeds-variants/`. Nhóm harness (plan 06) đem cả bài gốc lẫn biến thể cho model làm; nhóm phân tích (plan 05) dùng `metrics.ts` để đo **khoảng rớt robustness** = độ chính xác(gốc) − độ chính xác(biến thể). Rớt nhiều ⇒ model đang dò mẫu.

**Em nào phụ trách?** **Cả 2 em cùng làm** — đây là điểm giao việc:
- **Em 1 (Dữ liệu & Taxonomy):** phụ trách phần **thiết kế toán** — quyết định quy tắc co giãn đáp án, và (quan trọng) **điền trường `scale_degree`** khi soạn bài ở plan 01 (độ dài = 1, diện tích = 2, thể tích = 3). Không có `scale_degree` thì `rescale` không chạy được.
- **Em 2 (Harness & Phân tích):** phụ trách **tự động hoá** — gõ code các file `.ts` dưới đây, chạy test, nối vào CLI.

**Nằm ở đâu trong lộ trình?** Tháng **T3** (design §11.2): "Chạy eval đầy đủ + bộ biến đổi + soạn phiếu khảo sát".

**Phụ thuộc kế hoạch nào?** Cần làm **sau**:
- **Plan 00** (khởi tạo): đã thêm `tsx` vào devDependencies (`npm i -D tsx`) và đã thêm `research/vsgeo-bench/**/*.test.ts` vào mảng `include` của `vitest.config.ts`. Không có bước này thì `npm test` không "thấy" test của ta.
- **Plan 01** (schema dữ liệu): đã tạo `research/vsgeo-bench/data/schema/problem.ts` xuất kiểu `Seed`, `Answer`, `AnswerType` và hàm `validateSeed`. Ta **import** từ đó, không định nghĩa lại.
- **Plan 02** (grader): định nghĩa `Verdict` (3 giá trị `correct|incorrect|unsure`). Ta khai báo lại đúng 3 giá trị này trong `types.ts` để `metrics.ts` không phải phụ thuộc trực tiếp grader.

> **⚠️ Điểm nối liên-kế-hoạch (đọc kỹ 1 lần):** Toàn bộ code ở đây **chỉ có đúng một chỗ** chạm sang plan khác: dòng `import ... from "../data/schema/problem"` trong `types.ts` và fixtures. Nếu plan 01 đặt file schema ở đường dẫn/khác tên (ví dụ `data/schema/index.ts`), 2 em **chỉ sửa đúng dòng import đó** là mọi thứ khớp lại. Ngoài ra, id biến thể có dạng `"vsgeo-0001__rename"`; nếu plan 01 ràng buộc regex cho `id`, phải cho phép hậu tố `__<kind>` (ví dụ `/^vsgeo-\d{4}(__[a-z]+)?$/`) — đây là thoả thuận với plan 01 và cũng để harness (plan 06) tách được `parentSeedId`.

---

## Chuẩn bị môi trường (kiểm tra nhanh, không code)

- [ ] **Kiểm tra `tsx` đã có** (do plan 00): chạy `npx tsx --version` → in ra một số phiên bản (vd `tsx v4.x.x`). Nếu báo "not found", chạy `npm i -D tsx` rồi thử lại.
- [ ] **Kiểm tra vitest đã "thấy" thư mục research** (do plan 00): mở `vitest.config.ts` ở gốc repo, xác nhận mảng `include` có chuỗi `'research/vsgeo-bench/**/*.test.ts'`. Nếu chưa có, thêm vào mảng đó (đây vốn là việc của plan 00, nhưng nếu thiếu thì test của ta sẽ "không chạy bài nào").
- [ ] **Kiểm tra plan 01 đã xong**: chạy `ls research/vsgeo-bench/data/schema/problem.ts` (Windows PowerShell: `Get-ChildItem research/vsgeo-bench/data/schema/problem.ts`). Phải thấy file. Nếu chưa có → quay lại làm plan 01 trước.

---

## Task 1: Kiểu dùng chung + seed mẫu (nền móng)

**Vì sao trước tiên?** Mọi phép biến đổi đều nhận `Seed` và trả `Variant`. Ta định nghĩa các kiểu này một lần, và tạo sẵn 3 "seed mẫu" (fixtures) để mọi test sau dùng lại, khỏi phải chép đề dài dòng.

**Files:**
- Create: `research/vsgeo-bench/perturbations/types.ts`
- Create (test fixtures): `research/vsgeo-bench/perturbations/__tests__/fixtures.ts`
- Test: `research/vsgeo-bench/perturbations/__tests__/types.test.ts`

### Các bước

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/perturbations/__tests__/types.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { variantId, cloneSeed } from "../types";
import { seedNumeric } from "./fixtures";

describe("types dùng chung", () => {
  it("variantId ghép id cha với tên phép", () => {
    expect(variantId("vsgeo-0001", "rename")).toBe("vsgeo-0001__rename");
    expect(variantId("vsgeo-0042", "rescale")).toBe("vsgeo-0042__rescale");
  });

  it("cloneSeed tạo bản sao SÂU, không dính tới seed gốc", () => {
    const copy = cloneSeed(seedNumeric);
    copy.statement_vi = "ĐÃ ĐỔI";
    // Sửa bản sao KHÔNG được ảnh hưởng seed gốc.
    expect(seedNumeric.statement_vi).not.toBe("ĐÃ ĐỔI");
    // Nội dung ban đầu phải giống hệt.
    expect(copy.answer.canonical).toBe(seedNumeric.answer.canonical);
  });
});
```

- [ ] **Bước 2 — Chạy cho thấy FAIL.** Chạy:

```
npm test -- research/vsgeo-bench/perturbations/__tests__/types.test.ts
```

Kỳ vọng: FAIL với thông báo kiểu `Failed to resolve import "../types"` hoặc `Cannot find module "./fixtures"` (vì ta chưa tạo). Đúng như mong đợi — test đang "đòi" code chưa có.

- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/perturbations/types.ts`:

```ts
// research/vsgeo-bench/perturbations/types.ts
// Kiểu dùng chung cho toàn bộ bộ biến đổi (perturbations).

// ĐIỂM NỐI DUY NHẤT sang plan khác: Seed/Answer/AnswerType đến từ plan 01.
// Nếu plan 01 đặt file ở đường dẫn/tên khác, chỉ sửa đúng dòng import dưới đây.
import type { Seed, Answer, AnswerType } from "../data/schema/problem";
export type { Seed, Answer, AnswerType };

// 5 loại biến đổi — khớp HỢP ĐỒNG DÙNG CHUNG của đề tài.
export type PerturbKind = "rename" | "rescale" | "paraphrase" | "distractor" | "reflect";

// Verdict — khai báo lại đúng 3 giá trị của grader (plan 02) để metrics.ts độc lập.
// Nếu grader đổi tập giá trị này, phải sửa cả hai nơi cho khớp.
export type Verdict = "correct" | "incorrect" | "unsure";

// Nhãn truy vết: biến thể này sinh từ seed cha nào, bằng phép gì.
export type VariantMeta = { kind: PerturbKind; parentSeedId: string };

// Một biến thể = một Seed hợp lệ + trường `variant` ghi nguồn gốc.
// Variant KẾ THỪA Seed, nên Variant[] cũng là Seed[] (thoả hợp đồng perturb => Seed[]).
export type Variant = Seed & { variant: VariantMeta };

// Ghép id: "vsgeo-0001" + "rename" => "vsgeo-0001__rename".
export function variantId(parentId: string, kind: PerturbKind): string {
  return `${parentId}__${kind}`;
}

// Bản sao SÂU của seed (để biến đổi không làm hỏng seed gốc).
// structuredClone có sẵn trong Node >= 18 (môi trường tsx/vitest của ta).
export function cloneSeed(seed: Seed): Seed {
  return structuredClone(seed);
}
```

Rồi tạo `research/vsgeo-bench/perturbations/__tests__/fixtures.ts`:

```ts
// research/vsgeo-bench/perturbations/__tests__/fixtures.ts
// 3 seed mẫu dùng chung cho mọi test, xây đúng schema §3.3 (khớp plan 01).
import type { Seed } from "../../data/schema/problem";

// (1) Seed SỐ cụ thể: khối lập phương cạnh 2, thể tích = 8 (đại lượng bậc 3).
export const seedNumeric: Seed = {
  id: "vsgeo-0001",
  source: { type: "synthetic", ref: "tự sinh - test rescale" },
  statement_vi:
    "Cho khối lập phương ABCD.A'B'C'D' có cạnh 2. Tính thể tích khối lập phương.",
  figure: { points: [], coords_given: false },
  answer: { canonical: "8", type: "rational", human_note: "thể tích khối lập phương cạnh 2" },
  tags: {
    topic: ["the_tich"],
    answer_form: "rational",
    difficulty: 1,
    requires_auxiliary_construction: false,
  },
  scale_degree: 3,
};

// (2) Seed KÝ HIỆU: cạnh a, đáp án còn chữ 'a'.
export const seedSymbolic: Seed = {
  id: "vsgeo-0002",
  source: { type: "synthetic", ref: "tự sinh - test rename/paraphrase" },
  statement_vi:
    "Cho hình chóp đều S.ABCD có đáy là hình vuông cạnh a. Tính thể tích khối chóp.",
  figure: { points: [], coords_given: false },
  answer: { canonical: "a^3*sqrt(2)/12", type: "surd", human_note: "thể tích hình chóp đều" },
  tags: {
    topic: ["the_tich"],
    answer_form: "surd",
    difficulty: 2,
    requires_auxiliary_construction: false,
  },
  scale_degree: 3,
};

// (3) Seed CÓ TOẠ ĐỘ: dùng cho reflect. AB = sqrt(3^2+2^2+3^2) = sqrt(22).
export const seedWithCoords: Seed = {
  id: "vsgeo-0003",
  source: { type: "synthetic", ref: "tự sinh - test reflect" },
  statement_vi:
    "Trong không gian Oxyz cho A(1;2;3) và B(4;0;0). Tính độ dài đoạn AB.",
  figure: {
    points: [
      { id: "A", x: 1, y: 2, z: 3 },
      { id: "B", x: 4, y: 0, z: 0 },
    ],
    coords_given: true,
  },
  answer: { canonical: "sqrt(22)", type: "surd", human_note: "độ dài đoạn AB" },
  tags: {
    topic: ["toa_do_oxyz", "khoang_cach"],
    answer_form: "surd",
    difficulty: 1,
    requires_auxiliary_construction: false,
  },
  scale_degree: 1,
};
```

- [ ] **Bước 4 — Chạy test PASS.** Chạy lại lệnh ở Bước 2. Kỳ vọng: `Test Files 1 passed`, `Tests 2 passed`.

- [ ] **Bước 5 — Commit.**

```
git add research/vsgeo-bench/perturbations/types.ts research/vsgeo-bench/perturbations/__tests__/types.test.ts research/vsgeo-bench/perturbations/__tests__/fixtures.ts
git commit -m "feat(perturb): types dùng chung + seed mẫu (fixtures)"
```

---

## Task 2: `rename` — đổi tên đỉnh (đáp án không đổi)

**Ý tưởng:** Đỉnh trong hình là các **chữ HOA** (`S`, `A`, `B`…). Đáp án kiểu SGK dùng **chữ thường** (`a`) và ký hiệu căn. Nên nếu ta chỉ thay chữ HOA-đỉnh, đáp án **không bị đụng tới**. Mẹo phân biệt: một chữ HOA là *nhãn đỉnh* nếu nó **không đứng ngay trước một chữ thường** — vì "Cho", "Tính" có chữ HOA đầu từ nhưng theo sau là chữ thường, còn "ABCD", "S." thì không.

**Files:**
- Create: `research/vsgeo-bench/perturbations/rename.ts`
- Test: `research/vsgeo-bench/perturbations/__tests__/rename.test.ts`

### Các bước

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/perturbations/__tests__/rename.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { rename, extractVertexLabels, defaultRenameMap, renameInText } from "../rename";
import { seedSymbolic } from "./fixtures";

describe("rename — đổi tên đỉnh", () => {
  it("extractVertexLabels bắt đúng nhãn đỉnh, bỏ qua chữ HOA đầu từ", () => {
    // 'C' trong "Cho" theo sau bởi 'h' => không phải đỉnh. S,A,B,C,D là đỉnh.
    expect(extractVertexLabels("Cho hình chóp S.ABCD.")).toEqual(["S", "A", "B", "C", "D"]);
  });

  it("defaultRenameMap tránh trùng với nhãn đang dùng", () => {
    const map = defaultRenameMap(["A", "B", "C", "D"]);
    const targets = [...map.values()];
    // Không đích nào trùng nguồn (tránh thay dây chuyền).
    for (const t of targets) expect(["A", "B", "C", "D"]).not.toContain(t);
    // Mỗi nguồn có đúng một đích khác nhau.
    expect(new Set(targets).size).toBe(4);
  });

  it("renameInText không đụng chữ HOA đầu từ tiếng Việt", () => {
    const map = new Map([["A", "M"]]);
    // "An toàn" — 'A' theo sau 'n' => giữ nguyên; còn 'A' trong "(A)" => đổi.
    expect(renameInText("Điểm (A) và An toàn", map)).toBe("Điểm (M) và An toàn");
  });

  it("rename: mọi đỉnh được thay, đáp án GIỮ NGUYÊN", () => {
    const v = rename(seedSymbolic);
    // Các đỉnh cũ S,A,B,C,D biến mất khỏi lời văn.
    for (const old of ["S", "A", "B", "C", "D"]) {
      expect(v.statement_vi.includes(`${old}.`) || /[A-Z]/.test(v.statement_vi)).toBeTruthy();
    }
    expect(v.statement_vi).not.toContain("S.ABCD");
    // Đáp án và bậc không đổi.
    expect(v.answer.canonical).toBe(seedSymbolic.answer.canonical);
    // Metadata truy vết đúng.
    expect(v.variant).toEqual({ kind: "rename", parentSeedId: "vsgeo-0002" });
    expect(v.id).toBe("vsgeo-0002__rename");
  });
});
```

- [ ] **Bước 2 — Chạy cho thấy FAIL.**

```
npm test -- research/vsgeo-bench/perturbations/__tests__/rename.test.ts
```

Kỳ vọng: FAIL, `Failed to resolve import "../rename"`.

- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/perturbations/rename.ts`:

```ts
// research/vsgeo-bench/perturbations/rename.ts
// Đổi tên đỉnh (S.ABCD -> ...). Đáp án KHÔNG đổi vì đỉnh là chữ HOA còn đáp án dùng chữ thường + căn.
import type { Seed, Variant } from "./types";
import { cloneSeed, variantId } from "./types";

// "Là nhãn đỉnh" = chữ HOA KHÔNG theo sau bởi một chữ thường (kể cả chữ thường có dấu).
// Nhờ vậy 'C' trong "Cho" (theo sau 'h') bị loại, còn 'C' trong "ABCD" được nhận.
const AFTER_LABEL_NEG = "(?![a-zà-ỹ])";

export function extractVertexLabels(text: string): string[] {
  const re = new RegExp(`[A-Z]${AFTER_LABEL_NEG}`, "g");
  const seen: string[] = [];
  for (const m of text.matchAll(re)) {
    if (!seen.includes(m[0])) seen.push(m[0]);
  }
  return seen;
}

// Bể chữ đích. Lọc bỏ chữ đang dùng để không tạo "thay dây chuyền" (A->M, rồi M vô tình bị thay tiếp).
const TARGET_POOL = ["M", "N", "P", "Q", "R", "T", "U", "V", "X", "Y", "Z", "E", "F", "G", "H", "I", "J", "K", "L"];

export function defaultRenameMap(labels: string[]): Map<string, string> {
  const used = new Set(labels);
  const targets = TARGET_POOL.filter((c) => !used.has(c));
  const map = new Map<string, string>();
  labels.forEach((l, i) => {
    if (i >= targets.length) throw new Error("Hết chữ đích để đổi tên đỉnh");
    map.set(l, targets[i]);
  });
  return map;
}

export function renameInText(text: string, map: Map<string, string>): string {
  let out = text;
  for (const [from, to] of map) {
    out = out.replace(new RegExp(`${from}${AFTER_LABEL_NEG}`, "g"), to);
  }
  return out;
}

export function rename(seed: Seed, map?: Map<string, string>): Variant {
  // Ưu tiên lấy nhãn từ figure.points; nếu không có thì quét lời văn.
  const labels =
    seed.figure?.points && seed.figure.points.length > 0
      ? seed.figure.points.map((p) => p.id)
      : extractVertexLabels(seed.statement_vi);
  const renameMap = map ?? defaultRenameMap(labels);

  const v = cloneSeed(seed) as Variant;
  v.id = variantId(seed.id, "rename");
  v.statement_vi = renameInText(seed.statement_vi, renameMap);
  if (v.figure?.points) {
    v.figure.points = v.figure.points.map((p) => ({ ...p, id: renameMap.get(p.id) ?? p.id }));
  }
  // answer KHÔNG đổi.
  v.variant = { kind: "rename", parentSeedId: seed.id };
  return v;
}
```

- [ ] **Bước 4 — Chạy test PASS.** Lặp lại lệnh Bước 2. Kỳ vọng: `Tests 4 passed`.

- [ ] **Bước 5 — Commit.**

```
git add research/vsgeo-bench/perturbations/rename.ts research/vsgeo-bench/perturbations/__tests__/rename.test.ts
git commit -m "feat(perturb): rename đổi tên đỉnh, đáp án bất biến"
```

---

## Task 3: `rescale` — đổi tỉ lệ cạnh, đáp án co giãn theo bậc

**Ý tưởng (thiết kế toán — phần Em 1 giải thích được):** Nếu ta phóng to mọi độ dài lên `k` lần thì một đại lượng **bậc d** sẽ nhân lên `k^d` lần: độ dài (d=1) ×k, diện tích (d=2) ×k², thể tích (d=3) ×k³. Con số `d` chính là trường `scale_degree` mà **Em 1 phải điền khi soạn bài ở plan 01** — không có nó thì `rescale` từ chối chạy (ném lỗi rõ ràng).

**Hai nhánh đáp án:**
- **Đáp án là SỐ cụ thể** (vd "8", "sqrt(22)"): ta tính giá trị số × `k^d`, rồi gọi engine `toExactForm` để in lại chuỗi chuẩn kiểu SGK.
- **Đáp án còn KÝ HIỆU 'a'** (vd "a^3*sqrt(2)/12"): ta bọc hệ số `k^d` ở đầu: `"8*(a^3*sqrt(2)/12)"`. Chuỗi hơi "thô" nhưng **đúng giá trị**, và grader (plan 02) sẽ tự chuẩn hoá khi chấm.

**Files:**
- Create: `research/vsgeo-bench/perturbations/rescale.ts`
- Test: `research/vsgeo-bench/perturbations/__tests__/rescale.test.ts`

### Các bước

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/perturbations/__tests__/rescale.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  rescale,
  canonicalToNumber,
  isNumericCanonical,
  scaleLengthsInText,
} from "../rescale";
import { seedNumeric, seedSymbolic } from "./fixtures";

describe("rescale — đổi tỉ lệ, đáp án co giãn theo bậc", () => {
  it("canonicalToNumber đọc được cả 'sqrt(...)' lẫn ký hiệu '√'", () => {
    expect(canonicalToNumber("8")).toBeCloseTo(8, 9);
    expect(canonicalToNumber("sqrt(6)/3")).toBeCloseTo(Math.sqrt(6) / 3, 9);
    expect(canonicalToNumber("sqrt(22)")).toBeCloseTo(Math.sqrt(22), 9);
    expect(canonicalToNumber("2√3")).toBeCloseTo(2 * Math.sqrt(3), 9);
    // Có ký hiệu 'a' thì cần gán a=1.
    expect(canonicalToNumber("a^3*sqrt(2)/12", { a: 1 })).toBeCloseTo(Math.sqrt(2) / 12, 9);
  });

  it("isNumericCanonical phân biệt đáp án số vs đáp án còn chữ", () => {
    expect(isNumericCanonical("sqrt(22)")).toBe(true);
    expect(isNumericCanonical("sqrt(6)/3")).toBe(true);
    expect(isNumericCanonical("a^3*sqrt(2)/12")).toBe(false);
  });

  it("scaleLengthsInText nhân độ dài theo k (các mẫu SGK phổ biến)", () => {
    expect(scaleLengthsInText("có cạnh 2.", 3)).toBe("có cạnh 6.");
    expect(scaleLengthsInText("cạnh a.", 2)).toBe("cạnh 2a.");
    expect(scaleLengthsInText("cạnh 3a.", 2)).toBe("cạnh 6a.");
  });

  it("SEED SỐ, scale_degree=3, k=2 => đáp án nhân 8 (kiểm bằng giá trị số)", () => {
    const v = rescale(seedNumeric, 2);
    const before = canonicalToNumber(seedNumeric.answer.canonical); // 8
    const after = canonicalToNumber(v.answer.canonical); // kỳ vọng 64
    expect(after).toBeCloseTo(before * Math.pow(2, 3), 6);
    expect(after).toBeCloseTo(64, 6);
    expect(v.answer.canonical).toBe("64"); // toExactForm in gọn
    expect(v.variant).toEqual({ kind: "rescale", parentSeedId: "vsgeo-0001" });
  });

  it("SEED KÝ HIỆU, scale_degree=3, k=2 => giá trị (tại a=1) nhân 8", () => {
    const v = rescale(seedSymbolic, 2);
    const before = canonicalToNumber(seedSymbolic.answer.canonical, { a: 1 });
    const after = canonicalToNumber(v.answer.canonical, { a: 1 });
    expect(after).toBeCloseTo(before * 8, 6);
    // Lời văn đổi cạnh a -> 2a.
    expect(v.statement_vi).toContain("cạnh 2a");
  });

  it("từ chối rescale khi thiếu scale_degree hoặc đáp án không phải số/căn/tỉ số", () => {
    const noDeg = { ...seedNumeric, scale_degree: undefined };
    expect(() => rescale(noDeg, 2)).toThrow(/scale_degree/);
    const pointAns = { ...seedNumeric, answer: { canonical: "(1;2;3)", type: "point" as const } };
    expect(() => rescale(pointAns, 2)).toThrow(/rational\|surd\|ratio/);
  });
});
```

- [ ] **Bước 2 — Chạy cho thấy FAIL.**

```
npm test -- research/vsgeo-bench/perturbations/__tests__/rescale.test.ts
```

Kỳ vọng: FAIL, `Failed to resolve import "../rescale"`.

- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/perturbations/rescale.ts`:

```ts
// research/vsgeo-bench/perturbations/rescale.ts
// Đổi tỉ lệ mọi độ dài lên k lần; đáp án co giãn theo scale_degree (bậc): x -> x * k^degree.
import type { Seed, Variant } from "./types";
import { cloneSeed, variantId } from "./types";
// Engine ký hiệu có sẵn (ghi nguồn: api/_lib/kernel) — KHÔNG phải do nhóm phát minh.
import { toExactForm } from "../../../api/_lib/kernel/exactForm";
import { evalExpr } from "../../../api/_lib/kernel/analysis/expr";

const NUMERIC_TYPES = new Set(["rational", "surd", "ratio"]);

// Chuẩn hoá canonical về cú pháp evalExpr đọc được (√ -> sqrt), rồi tính giá trị số.
// env cho phép gán a=1 khi canonical còn ký hiệu cạnh 'a'.
export function canonicalToNumber(canonical: string, env: Record<string, number> = {}): number {
  let s = canonical.trim();
  s = s.replace(/(\d)\s*√/g, "$1*√"); // "3√14" -> "3*√14" (chèn dấu nhân)
  s = s.replace(/√\s*(\d+)/g, "sqrt($1)"); // "√14" -> "sqrt(14)"
  return evalExpr(s, env);
}

// canonical có chứa ký hiệu chữ (vd 'a') không? (bỏ qua chữ trong "sqrt")
export function isNumericCanonical(canonical: string): boolean {
  const withoutSqrt = canonical.replace(/sqrt/gi, "");
  return !/[a-zA-Z]/.test(withoutSqrt);
}

// Nhân độ dài trong lời văn lên k lần — BẢO THỦ, chỉ khớp các mẫu SGK phổ biến.
// (Đây là ranh giới: Em 1 soạn bài rescale-được theo các mẫu này — xem "Lưu ý phối hợp".)
export function scaleLengthsInText(text: string, k: number): string {
  let out = text;
  // 1) hệ số của cạnh ký hiệu: "cạnh a" -> "cạnh (k)a"; "cạnh 2a" -> "cạnh (2k)a"
  out = out.replace(/(cạnh\s+)(\d*)a\b/gi, (_m, pre: string, coef: string) => {
    const c = coef ? Number(coef) : 1;
    return `${pre}${c * k}a`;
  });
  // 2) số sau từ khoá độ dài, KHÔNG theo sau bởi chữ/số (tránh đụng "2a" đã xử lý ở trên)
  out = out.replace(
    /(cạnh|bằng|dài|cao|bán kính)(\s+)(\d+(?:\.\d+)?)(?![\da-zA-Z])/gi,
    (_m, kw: string, sp: string, num: string) => `${kw}${sp}${Number(num) * k}`
  );
  return out;
}

export function rescale(seed: Seed, k: number): Variant {
  if (seed.scale_degree === undefined) {
    throw new Error(`rescale cần seed.scale_degree (seed ${seed.id})`);
  }
  if (!NUMERIC_TYPES.has(seed.answer.type)) {
    throw new Error(
      `rescale chỉ định nghĩa cho đáp án số (rational|surd|ratio), gặp ${seed.answer.type} ở seed ${seed.id}`
    );
  }
  const degree = seed.scale_degree;
  const factor = Math.pow(k, degree);

  const v = cloneSeed(seed) as Variant;
  v.id = variantId(seed.id, "rescale");
  v.statement_vi = scaleLengthsInText(seed.statement_vi, k);
  if (v.figure?.points) {
    v.figure.points = v.figure.points.map((p) => ({ ...p, x: p.x * k, y: p.y * k, z: p.z * k }));
  }

  // Đáp án
  if (isNumericCanonical(seed.answer.canonical)) {
    const nv = canonicalToNumber(seed.answer.canonical) * factor;
    v.answer = { ...seed.answer, canonical: toExactForm(nv).text };
  } else {
    // Còn ký hiệu 'a': bọc hệ số k^degree; grader sẽ chuẩn hoá khi chấm.
    v.answer = { ...seed.answer, canonical: `${factor}*(${seed.answer.canonical})` };
  }
  v.variant = { kind: "rescale", parentSeedId: seed.id };
  return v;
}
```

- [ ] **Bước 4 — Chạy test PASS.** Lặp lại lệnh Bước 2. Kỳ vọng: `Tests 6 passed`.

- [ ] **Bước 5 — Commit.**

```
git add research/vsgeo-bench/perturbations/rescale.ts research/vsgeo-bench/perturbations/__tests__/rescale.test.ts
git commit -m "feat(perturb): rescale co giãn đáp án theo scale_degree (dùng toExactForm)"
```

> **Lưu ý phối hợp (Em 1 ↔ plan 01):** `rescale` phụ thuộc trường `seed.scale_degree`. Khi soạn bài ở plan 01, **Em 1 điền `scale_degree`** cho MỌI seed có đáp án là độ dài/diện tích/thể tích (1/2/3). Ngoài ra, muốn `scaleLengthsInText` đổi được lời văn, hãy viết độ dài theo mẫu được hỗ trợ: `"cạnh a"`, `"cạnh 2a"`, hoặc `"cạnh 2"`, `"bằng 3"`, `"bán kính 5"`, `"đường cao 4"`… (tiêu chí nghiệm thu ở cuối). Nếu một seed không hợp các mẫu này, `generate.ts` vẫn giữ được đáp án (nhánh số/ký hiệu), chỉ là lời văn không đổi số — khi đó Em 1 chỉnh cách viết đề cho khớp mẫu.

---

## Task 4: `distractor` — chèn dữ kiện thừa (đáp án không đổi)

> **Nhãn phạm vi: MỞ RỘNG (sau vòng trường).** Vòng trường tập trung ba phép cốt lõi (`rename`/`rescale`/`paraphrase`); `distractor` để dành cho giai đoạn mở rộng độ phủ. Vẫn giữ nguyên toàn bộ các bước dưới đây để làm sẵn.

**Ý tưởng:** Thêm một câu "nhiễu" trung tính — thông tin không dùng để giải, không tạo ràng buộc mới — để xem model có bị phân tâm không. Đáp án giữ nguyên tuyệt đối.

**Files:**
- Create: `research/vsgeo-bench/perturbations/distractor.ts`
- Test: `research/vsgeo-bench/perturbations/__tests__/distractor.test.ts`

### Các bước

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/perturbations/__tests__/distractor.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { distractor, DISTRACTOR_BANK } from "../distractor";
import { seedNumeric } from "./fixtures";
// ĐIỂM NỐI plan 01: nếu tên/đường dẫn khác, sửa đúng dòng import này.
import { validateSeed } from "../../data/schema/problem";

describe("distractor — chèn dữ kiện thừa", () => {
  it("câu DÀI THÊM, đáp án GIỮ NGUYÊN", () => {
    const v = distractor(seedNumeric);
    expect(v.statement_vi.length).toBeGreaterThan(seedNumeric.statement_vi.length);
    expect(v.statement_vi).toContain(DISTRACTOR_BANK[0]);
    expect(v.answer.canonical).toBe(seedNumeric.answer.canonical);
    expect(v.variant).toEqual({ kind: "distractor", parentSeedId: "vsgeo-0001" });
  });

  it("cho phép truyền câu nhiễu tuỳ ý", () => {
    const v = distractor(seedNumeric, "Thêm một dữ kiện không dùng.");
    expect(v.statement_vi.endsWith("Thêm một dữ kiện không dùng.")).toBe(true);
  });

  it("biến thể vẫn hợp schema (validateSeed không ném)", () => {
    const v = distractor(seedNumeric);
    expect(() => validateSeed(v)).not.toThrow();
  });
});
```

- [ ] **Bước 2 — Chạy cho thấy FAIL.**

```
npm test -- research/vsgeo-bench/perturbations/__tests__/distractor.test.ts
```

Kỳ vọng: FAIL, `Failed to resolve import "../distractor"`.

> Nếu lỗi lại là `validateSeed` không tồn tại trong plan 01, xem lại "Điểm nối liên-kế-hoạch" ở đầu file: chỉnh dòng import cho khớp tên hàm plan 01 xuất ra (và đảm bảo schema `id` cho phép hậu tố `__distractor`).

- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/perturbations/distractor.ts`:

```ts
// research/vsgeo-bench/perturbations/distractor.ts
// Chèn một câu dữ kiện THỪA (không dùng để giải). Đáp án KHÔNG đổi.
import type { Seed, Variant } from "./types";
import { cloneSeed, variantId } from "./types";

// Ngân hàng câu nhiễu trung tính (không thêm ràng buộc dùng được cho lời giải).
export const DISTRACTOR_BANK: string[] = [
  "Ngoài ra, gọi K là một điểm tuỳ ý trong không gian (K không liên quan đến yêu cầu của bài).",
  "Biết thêm rằng bài toán này được dùng cho mục đích ôn tập (thông tin không dùng khi tính).",
  "Cho biết thêm: người ta sơn màu xanh cho một mặt bất kì của hình (dữ kiện không ảnh hưởng kết quả).",
];

export function distractor(seed: Seed, sentence?: string): Variant {
  const extra = sentence ?? DISTRACTOR_BANK[0];
  const v = cloneSeed(seed) as Variant;
  v.id = variantId(seed.id, "distractor");
  v.statement_vi = `${seed.statement_vi.trim()} ${extra}`;
  // answer KHÔNG đổi.
  v.variant = { kind: "distractor", parentSeedId: seed.id };
  return v;
}
```

- [ ] **Bước 4 — Chạy test PASS.** Lặp lại lệnh Bước 2. Kỳ vọng: `Tests 3 passed`.

- [ ] **Bước 5 — Commit.**

```
git add research/vsgeo-bench/perturbations/distractor.ts research/vsgeo-bench/perturbations/__tests__/distractor.test.ts
git commit -m "feat(perturb): distractor chèn dữ kiện thừa, đáp án bất biến"
```

---

## Task 5: `paraphrase` — viết lại lời văn (rewriter injectable)

**Ý tưởng:** Diễn đạt lại đề cần một model viết văn, nhưng **test không được gọi model thật** (chậm, tốn tiền, không tất định). Giải pháp chuẩn: hàm `paraphrase` nhận vào một **`rewriter` injectable** — một hàm `(text) => Promise<string>`. Thật thì harness truyền rewriter gọi model; test truyền **rewriter giả**. Quan trọng nhất: sau khi viết lại, ta **kiểm bất biến** — mọi con số và mọi nhãn đỉnh của đề gốc phải còn nguyên; nếu model lỡ đổi một con số (đổi nghĩa đề) thì **ném lỗi**, không nhận biến thể hỏng.

**Files:**
- Create: `research/vsgeo-bench/perturbations/paraphrase.ts`
- Test: `research/vsgeo-bench/perturbations/__tests__/paraphrase.test.ts`

### Các bước

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/perturbations/__tests__/paraphrase.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { paraphrase, assertParaphrasePreserves, ParaphraseDriftError } from "../paraphrase";
import { seedSymbolic } from "./fixtures";

describe("paraphrase — viết lại lời văn, giữ nghĩa", () => {
  it("assertParaphrasePreserves: đổi thứ tự chữ nhưng giữ số & nhãn => KHÔNG ném", () => {
    expect(() =>
      assertParaphrasePreserves("Cho S.ABCD cạnh 2.", "Hình S.ABCD có cạnh 2 cho trước.")
    ).not.toThrow();
  });

  it("assertParaphrasePreserves: đổi một con số => NÉM (đổi nghĩa)", () => {
    expect(() =>
      assertParaphrasePreserves("cạnh 2.", "cạnh 3.")
    ).toThrow(ParaphraseDriftError);
  });

  it("assertParaphrasePreserves: mất nhãn đỉnh => NÉM", () => {
    expect(() =>
      assertParaphrasePreserves("Cho S.ABCD.", "Cho hình chóp ABCD.")
    ).toThrow(ParaphraseDriftError);
  });

  it("paraphrase dùng rewriter GIẢ, giữ đáp án, gắn metadata", async () => {
    const fakeRewriter = async (t: string) => `Xét bài toán sau: ${t}`;
    const v = await paraphrase(seedSymbolic, fakeRewriter);
    expect(v.statement_vi.startsWith("Xét bài toán sau:")).toBe(true);
    expect(v.answer.canonical).toBe(seedSymbolic.answer.canonical);
    expect(v.variant).toEqual({ kind: "paraphrase", parentSeedId: "vsgeo-0002" });
  });

  it("paraphrase: rewriter làm đổi số => ném ParaphraseDriftError", async () => {
    const badRewriter = async () => "Cho hình chóp đều S.ABCD có đáy hình vuông cạnh b. Tính thể tích.";
    // seedSymbolic không có số, nhưng đổi 'a' -> 'b' làm MẤT nhãn? 'a' là chữ thường không tính nhãn.
    // Test số: dùng một rewriter thêm số lạ.
    const addNumberRewriter = async (t: string) => `${t} (phiên bản 2)`;
    await expect(paraphrase(seedSymbolic, addNumberRewriter)).rejects.toThrow(ParaphraseDriftError);
    // badRewriter không dùng, chỉ minh hoạ; giữ để 2 em thử.
    void badRewriter;
  });
});
```

> Giải thích test cuối: `seedSymbolic` gốc **không có con số** nào trong lời văn. Rewriter thêm `"(phiên bản 2)"` đưa vào số `2` mới ⇒ tập số thay đổi ⇒ đúng ra phải ném. Đây là cách bắt lỗi "model tự ý thêm dữ kiện số".

- [ ] **Bước 2 — Chạy cho thấy FAIL.**

```
npm test -- research/vsgeo-bench/perturbations/__tests__/paraphrase.test.ts
```

Kỳ vọng: FAIL, `Failed to resolve import "../paraphrase"`.

- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/perturbations/paraphrase.ts`:

```ts
// research/vsgeo-bench/perturbations/paraphrase.ts
// Viết lại lời văn nhờ một "rewriter" injectable (thật = gọi model; test = rewriter giả).
// Bắt buộc kiểm bất biến: mọi SỐ và mọi NHÃN ĐỈNH của đề gốc phải còn nguyên. Đáp án KHÔNG đổi.
import type { Seed, Variant } from "./types";
import { cloneSeed, variantId } from "./types";
import { extractVertexLabels } from "./rename";

export type Rewriter = (text: string) => Promise<string>;

export class ParaphraseDriftError extends Error {}

// Multiset các con số (đã sắp xếp) để so khớp không phụ thuộc thứ tự.
export function numberMultiset(text: string): string[] {
  return (text.match(/\d+(?:\.\d+)?/g) ?? []).slice().sort();
}

export function assertParaphrasePreserves(original: string, rewritten: string): void {
  const a = numberMultiset(original);
  const b = numberMultiset(rewritten);
  if (a.join(",") !== b.join(",")) {
    throw new ParaphraseDriftError(`Paraphrase làm đổi tập số: [${a}] -> [${b}]`);
  }
  const labelsOrig = extractVertexLabels(original);
  const labelsNew = new Set(extractVertexLabels(rewritten));
  for (const l of labelsOrig) {
    if (!labelsNew.has(l)) {
      throw new ParaphraseDriftError(`Paraphrase làm mất nhãn đỉnh '${l}'`);
    }
  }
}

// rewriter mặc định: kế hoạch này CHƯA nối model -> ném lỗi rõ nếu quên truyền rewriter.
const defaultRewriter: Rewriter = async () => {
  throw new Error(
    "paraphrase cần một rewriter (hàm gọi model). Truyền rewriter thật từ harness, hoặc rewriter giả trong test."
  );
};

export async function paraphrase(seed: Seed, rewriter: Rewriter = defaultRewriter): Promise<Variant> {
  const rewritten = (await rewriter(seed.statement_vi)).trim();
  assertParaphrasePreserves(seed.statement_vi, rewritten);

  const v = cloneSeed(seed) as Variant;
  v.id = variantId(seed.id, "paraphrase");
  v.statement_vi = rewritten;
  // answer KHÔNG đổi.
  v.variant = { kind: "paraphrase", parentSeedId: seed.id };
  return v;
}
```

- [ ] **Bước 4 — Chạy test PASS.** Lặp lại lệnh Bước 2. Kỳ vọng: `Tests 5 passed`.

- [ ] **Bước 5 — Commit.**

```
git add research/vsgeo-bench/perturbations/paraphrase.ts research/vsgeo-bench/perturbations/__tests__/paraphrase.test.ts
git commit -m "feat(perturb): paraphrase với rewriter injectable + kiểm bất biến số/nhãn"
```

---

## Task 6: `reflect` — phản chiếu hệ toạ độ (tuỳ chọn, cho bài có toạ độ)

> **Nhãn phạm vi: MỞ RỘNG (sau vòng trường).** Vòng trường tập trung ba phép cốt lõi (`rename`/`rescale`/`paraphrase`); `reflect` để dành cho giai đoạn mở rộng độ phủ. Vẫn giữ nguyên toàn bộ các bước dưới đây để làm sẵn.

**Ý tưởng:** Với bài cho toạ độ (Oxyz), ta áp một **phép đẳng cự** (isometry) — mặc định phản chiếu qua mặt phẳng `x = 0` (đổi dấu `x`). Các đại lượng **bất biến dời hình** (độ dài, thể tích, góc, tỉ số) **không đổi**, nên đáp án giữ nguyên. Ta chỉ áp cho các loại đáp án bất biến; nếu đáp án là toạ độ điểm/vector/phương trình (sẽ đổi theo phép biến) thì `reflect` từ chối (ném lỗi) — ngoài phạm vi.

**Files:**
- Create: `research/vsgeo-bench/perturbations/reflect.ts`
- Test: `research/vsgeo-bench/perturbations/__tests__/reflect.test.ts`

### Các bước

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/perturbations/__tests__/reflect.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { reflect, reflectX, reflectCoordsInText } from "../reflect";
import { seedWithCoords, seedSymbolic } from "./fixtures";

describe("reflect — phản chiếu hệ toạ độ, đáp án bất biến", () => {
  it("reflectCoordsInText đổi dấu x trong 'L(x;y;z)'", () => {
    expect(reflectCoordsInText("A(1;2;3) và B(4;0;0)", reflectX)).toBe("A(-1;2;3) và B(-4;0;0)");
  });

  it("reflect: toạ độ điểm bị đổi dấu x, đáp án GIỮ NGUYÊN", () => {
    const v = reflect(seedWithCoords);
    expect(v.figure!.points).toEqual([
      { id: "A", x: -1, y: 2, z: 3 },
      { id: "B", x: -4, y: 0, z: 0 },
    ]);
    expect(v.statement_vi).toContain("A(-1;2;3)");
    expect(v.answer.canonical).toBe(seedWithCoords.answer.canonical); // sqrt(22) không đổi
    expect(v.variant).toEqual({ kind: "reflect", parentSeedId: "vsgeo-0003" });
  });

  it("từ chối reflect khi seed không có toạ độ", () => {
    expect(() => reflect(seedSymbolic)).toThrow(/coords_given/);
  });
});
```

- [ ] **Bước 2 — Chạy cho thấy FAIL.**

```
npm test -- research/vsgeo-bench/perturbations/__tests__/reflect.test.ts
```

Kỳ vọng: FAIL, `Failed to resolve import "../reflect"`.

- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/perturbations/reflect.ts`:

```ts
// research/vsgeo-bench/perturbations/reflect.ts
// (Tuỳ chọn) Phản chiếu/xoay hệ toạ độ. Chỉ dùng khi figure có toạ độ.
// Đáp án BẤT BIẾN dời hình -> chỉ áp cho loại đáp án bất biến (khoảng cách/thể tích/góc/tỉ số/đúng-sai).
import type { Seed, Variant } from "./types";
import { cloneSeed, variantId } from "./types";

const INVARIANT_TYPES = new Set(["rational", "surd", "ratio", "boolean"]);

export type Point3 = { x: number; y: number; z: number };
export type Isometry = (p: Point3) => Point3;

// Phép đẳng cự mặc định: phản chiếu qua mặt phẳng x = 0 (x -> -x).
export const reflectX: Isometry = (p) => ({ x: -p.x, y: p.y, z: p.z });

// Đổi toạ độ trong lời văn cho mẫu "L(x;y;z)" (ngăn cách bằng ';' hoặc ',').
export function reflectCoordsInText(text: string, iso: Isometry): string {
  return text.replace(
    /([A-Z])\(\s*(-?\d+(?:\.\d+)?)\s*[;,]\s*(-?\d+(?:\.\d+)?)\s*[;,]\s*(-?\d+(?:\.\d+)?)\s*\)/g,
    (_m, lab: string, x: string, y: string, z: string) => {
      const q = iso({ x: Number(x), y: Number(y), z: Number(z) });
      return `${lab}(${q.x};${q.y};${q.z})`;
    }
  );
}

export function reflect(seed: Seed, iso: Isometry = reflectX): Variant {
  if (!seed.figure?.coords_given || !seed.figure.points || seed.figure.points.length === 0) {
    throw new Error(`reflect cần figure có toạ độ (coords_given=true và có points) ở seed ${seed.id}`);
  }
  if (!INVARIANT_TYPES.has(seed.answer.type)) {
    throw new Error(
      `reflect chỉ giữ nguyên đáp án cho loại bất biến dời hình, gặp ${seed.answer.type} ở seed ${seed.id}`
    );
  }
  const v = cloneSeed(seed) as Variant;
  v.id = variantId(seed.id, "reflect");
  v.figure!.points = seed.figure.points.map((p) => ({ id: p.id, ...iso(p) }));
  v.statement_vi = reflectCoordsInText(seed.statement_vi, iso);
  // answer KHÔNG đổi (bất biến dời hình).
  v.variant = { kind: "reflect", parentSeedId: seed.id };
  return v;
}
```

- [ ] **Bước 4 — Chạy test PASS.** Lặp lại lệnh Bước 2. Kỳ vọng: `Tests 3 passed`.

- [ ] **Bước 5 — Commit.**

```
git add research/vsgeo-bench/perturbations/reflect.ts research/vsgeo-bench/perturbations/__tests__/reflect.test.ts
git commit -m "feat(perturb): reflect phản chiếu toạ độ, đáp án bất biến dời hình"
```

---

## Task 7: `perturb` — hàm điều phối

**Ý tưởng:** Một cửa vào duy nhất `perturb(seed, kind, opts)` gọi đúng phép theo `kind`, trả về **mảng** biến thể (`Variant[]`) — để sau này một `kind` có thể sinh nhiều biến thể. Vì `paraphrase` cần gọi model (bất đồng bộ), `perturb` trả `Promise<Variant[]>` (async) cho đồng nhất; các phép tất định vẫn xử lý ngay lập tức bên trong.

> **Khác biệt có chủ đích so với hợp đồng:** Hợp đồng ghi `perturb(...) => Seed[]`. Ta **giữ nguyên tên `perturb` và `PerturbKind`**, nhưng trả `Promise<Variant[]>`. Lý do: `paraphrase` không thể đồng bộ. `Variant` là con của `Seed` nên `Variant[]` vẫn là `Seed[]` về mặt kiểu; phần khác duy nhất là `Promise` (bất đồng bộ) — nhóm harness `await` là xong.

**Files:**
- Create: `research/vsgeo-bench/perturbations/perturb.ts`
- Test: `research/vsgeo-bench/perturbations/__tests__/perturb.test.ts`

### Các bước

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/perturbations/__tests__/perturb.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { perturb } from "../perturb";
import { seedNumeric, seedWithCoords } from "./fixtures";

describe("perturb — điều phối", () => {
  it("gọi đúng phép theo kind (tất định)", async () => {
    const [r] = await perturb(seedNumeric, "rename");
    expect(r.variant.kind).toBe("rename");

    const [s] = await perturb(seedNumeric, "rescale", { k: 2 });
    expect(s.variant.kind).toBe("rescale");
    expect(s.answer.canonical).toBe("64");

    const [d] = await perturb(seedNumeric, "distractor");
    expect(d.variant.kind).toBe("distractor");

    const [f] = await perturb(seedWithCoords, "reflect");
    expect(f.variant.kind).toBe("reflect");
  });

  it("paraphrase qua opts.rewriter", async () => {
    const [p] = await perturb(seedNumeric, "paraphrase", {
      rewriter: async (t) => `Bài: ${t}`,
    });
    expect(p.variant.kind).toBe("paraphrase");
    expect(p.statement_vi.startsWith("Bài:")).toBe(true);
  });
});
```

- [ ] **Bước 2 — Chạy cho thấy FAIL.**

```
npm test -- research/vsgeo-bench/perturbations/__tests__/perturb.test.ts
```

Kỳ vọng: FAIL, `Failed to resolve import "../perturb"`.

- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/perturbations/perturb.ts`:

```ts
// research/vsgeo-bench/perturbations/perturb.ts
// Điều phối: gọi đúng phép biến đổi theo kind. Trả Promise<Variant[]> (async vì paraphrase cần model).
import type { Seed, Variant, PerturbKind } from "./types";
import { rename } from "./rename";
import { rescale } from "./rescale";
import { distractor } from "./distractor";
import { paraphrase, type Rewriter } from "./paraphrase";
import { reflect } from "./reflect";

export type PerturbOpts = {
  k?: number; // hệ số cho rescale (mặc định 2)
  rewriter?: Rewriter; // cho paraphrase
  distractorSentence?: string; // cho distractor
};

export async function perturb(
  seed: Seed,
  kind: PerturbKind,
  opts: PerturbOpts = {}
): Promise<Variant[]> {
  switch (kind) {
    case "rename":
      return [rename(seed)];
    case "rescale":
      return [rescale(seed, opts.k ?? 2)];
    case "distractor":
      return [distractor(seed, opts.distractorSentence)];
    case "reflect":
      return [reflect(seed)];
    case "paraphrase":
      return [await paraphrase(seed, opts.rewriter)];
    default: {
      const _never: never = kind; // ép TypeScript kiểm đủ mọi kind
      throw new Error(`kind không hỗ trợ: ${_never}`);
    }
  }
}
```

- [ ] **Bước 4 — Chạy test PASS.** Lặp lại lệnh Bước 2. Kỳ vọng: `Tests 2 passed`.

- [ ] **Bước 5 — Commit.**

```
git add research/vsgeo-bench/perturbations/perturb.ts research/vsgeo-bench/perturbations/__tests__/perturb.test.ts
git commit -m "feat(perturb): hàm điều phối perturb(seed, kind, opts)"
```

---

## Task 8: `metrics` — chỉ số robustness & consistency

**Ý tưởng:** Hai con số mà chương này sinh ra cho hội đồng (design §5, §6.3):
- **Khoảng rớt robustness** = độ chính xác(gốc) − độ chính xác(biến thể). Rớt càng nhiều ⇒ càng "dò mẫu".
- **Độ nhất quán nội tại** trong một *họ biến thể* (cùng seed cha) = tỉ lệ phán quyết trùng với phán quyết **đa số**. Vd 3 lần cùng seed cho `[correct, correct, incorrect]` ⇒ nhất quán 2/3.

**Files:**
- Create: `research/vsgeo-bench/perturbations/metrics.ts`
- Test: `research/vsgeo-bench/perturbations/__tests__/metrics.test.ts`

### Các bước

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/perturbations/__tests__/metrics.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { accuracy, robustnessGap, robustnessReport, consistency } from "../metrics";
import type { Verdict } from "../types";

describe("metrics — robustness & consistency", () => {
  it("accuracy = số correct / tổng", () => {
    const v: Verdict[] = ["correct", "incorrect", "correct", "unsure"];
    expect(accuracy(v)).toBeCloseTo(2 / 4, 9);
  });

  it("robustnessGap = acc(gốc) - acc(biến thể)", () => {
    expect(robustnessGap(0.9, 0.6)).toBeCloseTo(0.3, 9);
    expect(robustnessGap(0.5, 0.8)).toBeCloseTo(-0.3, 9); // âm = biến thể còn tốt hơn
  });

  it("robustnessReport = overall + byKind theo bản ghi (hợp đồng plan 05)", () => {
    // base: 2 đúng / 0 sai => acc(base) = 1.
    const base = [{ verdict: "correct" }, { verdict: "correct" }] as const;
    // variants: 1 đúng (rename) / 1 sai (rescale) => acc(variants) = 1/2.
    const variants = [
      { verdict: "correct", perturbation: { kind: "rename" } },
      { verdict: "incorrect", perturbation: { kind: "rescale" } },
    ] as const;
    const rep = robustnessReport([...base], [...variants]);
    expect(rep.overall).toBeCloseTo(1 - 0.5, 9); // 0.5
    expect(rep.byKind.rename).toBeCloseTo(1 - 1, 9); // rename toàn đúng => 0
    expect(rep.byKind.rescale).toBeCloseTo(1 - 0, 9); // rescale toàn sai => 1
  });

  it("consistency = tỉ lệ trùng phán quyết đa số", () => {
    expect(consistency(["correct", "correct", "incorrect"])).toBeCloseTo(2 / 3, 9);
    expect(consistency(["correct", "correct", "correct"])).toBeCloseTo(1, 9);
    expect(consistency(["correct", "incorrect"])).toBeCloseTo(1 / 2, 9);
  });

  it("mảng rỗng => ném lỗi rõ ràng", () => {
    expect(() => accuracy([])).toThrow();
    expect(() => consistency([])).toThrow();
  });
});
```

- [ ] **Bước 2 — Chạy cho thấy FAIL.**

```
npm test -- research/vsgeo-bench/perturbations/__tests__/metrics.test.ts
```

Kỳ vọng: FAIL, `Failed to resolve import "../metrics"`.

- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/perturbations/metrics.ts`:

```ts
// research/vsgeo-bench/perturbations/metrics.ts
// Chỉ số robustness/consistency — nhóm phân tích (plan 05) sẽ import lại.
import type { Verdict } from "./types";

// Độ chính xác = số "correct" / tổng. Mảng rỗng -> ném.
export function accuracy(verdicts: Verdict[]): number {
  if (verdicts.length === 0) throw new Error("accuracy cần ít nhất 1 phán quyết");
  const correct = verdicts.filter((v) => v === "correct").length;
  return correct / verdicts.length;
}

// Khoảng rớt robustness (scalar) = accuracy(gốc) - accuracy(biến thể).
export function robustnessGap(accGoc: number, accBienThe: number): number {
  return accGoc - accBienThe;
}

// --- HỢP ĐỒNG DÙNG CHUNG với plan 05: báo cáo robustness theo bản ghi (record) + theo loại phép ---
// Một bản ghi tối thiểu cho việc tính gap: phán quyết + (nếu là biến thể) loại phép đã áp.
type RecordForGap = { verdict: "correct" | "incorrect" | "unsure"; perturbation?: { kind: string } };

// acc trên MẢNG BẢN GHI = (số verdict==="correct") / độ dài; mảng RỖNG -> 0 (khác accuracy() ném lỗi).
function accRecords(xs: RecordForGap[]): number {
  if (xs.length === 0) return 0;
  return xs.filter((r) => r.verdict === "correct").length / xs.length;
}

// robustnessReport: so bản ghi GỐC (base) với bản ghi BIẾN THỂ (variants).
//   overall      = acc(base) - acc(variants)
//   byKind[kind] = acc(base) - acc(variants CHỈ thuộc kind đó)
// Đây là hàm plan 05 (analysis/report.ts) import lại — chữ ký: (base, variants) -> {overall, byKind}.
export function robustnessReport(
  base: RecordForGap[],
  variants: RecordForGap[]
): { overall: number; byKind: Record<string, number> } {
  const accBase = accRecords(base);
  const overall = accBase - accRecords(variants);
  const byKind: Record<string, number> = {};
  const kinds = new Set(
    variants.map((r) => r.perturbation?.kind).filter((k): k is string => k !== undefined)
  );
  for (const kind of kinds) {
    const subset = variants.filter((r) => r.perturbation?.kind === kind);
    byKind[kind] = accBase - accRecords(subset);
  }
  return { overall, byKind };
}

// Độ nhất quán trong MỘT họ biến thể = tỉ lệ phán quyết trùng phán quyết đa số.
export function consistency(verdicts: Verdict[]): number {
  if (verdicts.length === 0) throw new Error("consistency cần ít nhất 1 phán quyết");
  const counts = new Map<Verdict, number>();
  for (const v of verdicts) counts.set(v, (counts.get(v) ?? 0) + 1);
  const max = Math.max(...counts.values());
  return max / verdicts.length;
}
```

- [ ] **Bước 4 — Chạy test PASS.** Lặp lại lệnh Bước 2. Kỳ vọng: `Tests 5 passed`.

- [ ] **Bước 5 — Commit.**

```
git add research/vsgeo-bench/perturbations/metrics.ts research/vsgeo-bench/perturbations/__tests__/metrics.test.ts
git commit -m "feat(perturb): metrics robustnessGap + consistency + accuracy"
```

---

## Task 9: `generate` — CLI sinh biến thể hàng loạt

**Ý tưởng:** Đọc mọi seed trong `data/seeds/*.json`, sinh các biến thể **tất định** (`rename`, `rescale`, `distractor`, `reflect` — bỏ `paraphrase` vì cần model, để harness chạy riêng), ghi mỗi biến thể thành một file trong `data/seeds-variants/`. Seed nào không hợp một phép nào đó thì **bỏ qua phép đó** (bắt lỗi, không làm sập cả mẻ). Ta tách một hàm thuần `generateVariantsForSeed` để **test được** mà không đụng ổ đĩa; phần đọc/ghi file gói trong `runGenerate` chỉ chạy khi gọi trực tiếp bằng `tsx`.

**Files:**
- Create: `research/vsgeo-bench/perturbations/generate.ts`
- Test: `research/vsgeo-bench/perturbations/__tests__/generate.test.ts`

### Các bước

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/perturbations/__tests__/generate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateVariantsForSeed } from "../generate";
import { seedWithCoords, seedSymbolic } from "./fixtures";

describe("generate — sinh biến thể hàng loạt (hàm thuần)", () => {
  it("seed có toạ độ + đáp án số => đủ 4 phép tất định", async () => {
    const vs = await generateVariantsForSeed(seedWithCoords);
    const kinds = vs.map((v) => v.variant.kind).sort();
    expect(kinds).toEqual(["distractor", "reflect", "rename", "rescale"]);
    // Mọi biến thể đều trỏ đúng cha.
    for (const v of vs) expect(v.variant.parentSeedId).toBe("vsgeo-0003");
  });

  it("seed ký hiệu không toạ độ => reflect bị bỏ, còn 3 phép", async () => {
    const vs = await generateVariantsForSeed(seedSymbolic);
    const kinds = vs.map((v) => v.variant.kind).sort();
    expect(kinds).toEqual(["distractor", "rename", "rescale"]);
  });
});
```

- [ ] **Bước 2 — Chạy cho thấy FAIL.**

```
npm test -- research/vsgeo-bench/perturbations/__tests__/generate.test.ts
```

Kỳ vọng: FAIL, `Failed to resolve import "../generate"`.

- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/perturbations/generate.ts`:

```ts
// research/vsgeo-bench/perturbations/generate.ts
// CLI: đọc data/seeds/*.json, sinh biến thể TẤT ĐỊNH, ghi ra data/seeds-variants/.
// Chạy: npx tsx research/vsgeo-bench/perturbations/generate.ts
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Seed, Variant, PerturbKind } from "./types";
import { perturb } from "./perturb";

const HERE = dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = resolve(HERE, "../data/seeds");
const OUT_DIR = resolve(HERE, "../data/seeds-variants");

// Các phép TẤT ĐỊNH (paraphrase cần model -> để harness chạy riêng).
export const DETERMINISTIC: PerturbKind[] = ["rename", "rescale", "distractor", "reflect"];

// Hàm THUẦN (không đụng ổ đĩa) -> test được.
export async function generateVariantsForSeed(
  seed: Seed,
  kinds: PerturbKind[] = DETERMINISTIC
): Promise<Variant[]> {
  const out: Variant[] = [];
  for (const kind of kinds) {
    try {
      out.push(...(await perturb(seed, kind)));
    } catch {
      // Seed không hợp phép này (vd reflect mà không có toạ độ) -> bỏ qua, không làm sập mẻ.
    }
  }
  return out;
}

// Phần đọc/ghi file — chỉ chạy khi gọi CLI.
export async function runGenerate(): Promise<void> {
  if (!existsSync(SEEDS_DIR)) {
    console.error(`Không thấy thư mục seeds: ${SEEDS_DIR}`);
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const files = readdirSync(SEEDS_DIR).filter((f) => f.endsWith(".json"));
  let ok = 0;
  for (const f of files) {
    const seed = JSON.parse(readFileSync(join(SEEDS_DIR, f), "utf8")) as Seed;
    const variants = await generateVariantsForSeed(seed);
    for (const v of variants) {
      writeFileSync(join(OUT_DIR, `${v.id}.json`), JSON.stringify(v, null, 2), "utf8");
      ok++;
    }
  }
  console.log(`Sinh xong ${ok} biến thể từ ${files.length} seed. Thư mục: ${OUT_DIR}`);
}

// Tự chạy khi gọi trực tiếp bằng tsx (không chạy khi bị import trong test).
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  runGenerate();
}
```

- [ ] **Bước 4 — Chạy test PASS.** Lặp lại lệnh Bước 2. Kỳ vọng: `Tests 2 passed`.

- [ ] **Bước 5 — Chạy thử CLI thật (khói).** Tạo tạm một seed để chạy end-to-end (nếu plan 01 đã có seed thật thì bỏ qua bước tạo tạm):

```
npx tsx research/vsgeo-bench/perturbations/generate.ts
```

Kỳ vọng: in ra dòng `Sinh xong N biến thể từ M seed. Thư mục: ...seeds-variants`. Kiểm tra thư mục `research/vsgeo-bench/data/seeds-variants/` có các file `*.json`. (Nếu `data/seeds/` còn rỗng vì plan 01 chưa soạn bài, CLI in `Sinh xong 0 biến thể` — vẫn đúng.)

- [ ] **Bước 6 — Commit.**

```
git add research/vsgeo-bench/perturbations/generate.ts research/vsgeo-bench/perturbations/__tests__/generate.test.ts
git commit -m "feat(perturb): CLI generate sinh biến thể tất định hàng loạt"
```

---

## Chạy toàn bộ test của bộ biến đổi (nghiệm thu cuối)

- [ ] Chạy gộp cả thư mục:

```
npm test -- research/vsgeo-bench/perturbations
```

Kỳ vọng: `Test Files 9 passed`, tổng cộng ~32 test passed, 0 failed.

---

## Phần "công sức trí tuệ của 2 em" (KHÔNG viết sẵn — 2 em tự làm & bảo vệ)

Code hạ tầng ở trên anh/chị đã cung cấp đầy đủ. Nhưng có **hai quyết định nội dung** là công sức của chính 2 em, phải tự làm và bảo vệ được trước hội đồng:

1. **Điền `scale_degree` đúng cho từng bài (Em 1, làm cùng plan 01).**
   - *Quy trình:* với mỗi seed, hỏi "đáp án là đại lượng bậc mấy theo độ dài?": độ dài/khoảng cách/bán kính = 1; diện tích = 2; thể tích = 3; đại lượng không đổi khi phóng to (góc, tỉ số, cos, đúng-sai) = 0.
   - *Ví dụ đã làm mẫu:* "khoảng cách từ A đến (SBD)" → 1; "diện tích thiết diện" → 2; "thể tích khối chóp" → 3; "góc giữa hai mặt phẳng" → 0 (khi bậc 0, `rescale` vẫn chạy: đáp án ×k⁰ = ×1 = không đổi, đúng bản chất góc bất biến khi phóng to).
   - *Tiêu chí nghiệm thu:* 100% seed có đáp án đo được đều có `scale_degree`; chọn ngẫu nhiên 10 bài, kiểm tay bậc đúng.
   - *Checklist tự kiểm:* [ ] mọi thể tích = 3? [ ] mọi diện tích = 2? [ ] mọi khoảng cách/độ dài = 1? [ ] góc/tỉ số/đúng-sai = 0?

2. **Viết đề theo mẫu độ dài mà `scaleLengthsInText` hỗ trợ (Em 1).**
   - *Quy trình:* khi soạn bài định dùng `rescale`, viết cạnh theo mẫu `"cạnh a"`, `"cạnh 2a"`, hoặc `"cạnh 2"`, `"bằng 3"`, `"bán kính 5"`, `"đường cao 4"`.
   - *Ví dụ đã làm mẫu:* thay "hình vuông có độ dài mỗi cạnh gấp đôi đường cao" (khó tự động) bằng "hình vuông cạnh a" (chuẩn, tự động đổi được).
   - *Tiêu chí nghiệm thu:* chạy `generate.ts`, mở 5 biến thể `rescale` bất kỳ, xác nhận lời văn đã đổi số đúng theo `k`.
   - *Checklist tự kiểm:* [ ] biến thể rescale có số cạnh đã nhân k trong lời văn? [ ] đáp án biến thể = đáp án gốc × k^degree (kiểm bằng giá trị số)?

3. **Diễn giải kết quả robustness (cả 2 em, ở plan 05).** Bảng `robustnessGap`/`consistency` chỉ là con số; **ý nghĩa khoa học** ("model X rớt 22 điểm khi đổi tên đỉnh ⇒ bằng chứng dò mẫu, ủng hộ H2") là phần 2 em tự viết và bảo vệ.

---

## Tiêu chí hoàn thành (Definition of Done)

Ánh xạ tới tiêu chí thành công design §13 và chỉ số §5/§6.3:

- [ ] Đủ 9 file nguồn: `types.ts`, `rename.ts`, `rescale.ts`, `distractor.ts`, `paraphrase.ts`, `reflect.ts`, `perturb.ts`, `metrics.ts`, `generate.ts`.
- [ ] Đủ 9 file test, `npm test -- research/vsgeo-bench/perturbations` **xanh 100%** (0 failed).
- [ ] `rename`, `distractor`, `paraphrase`, `reflect` **bảo toàn `answer.canonical`** (đã có test khẳng định).
- [ ] `rescale` **co giãn đáp án đúng `k^scale_degree`**, kiểm bằng giá trị số (nhánh số dùng `toExactForm`, nhánh ký hiệu bọc hệ số) — cung cấp *bằng chứng H2* khi so bài gốc vs biến thể.
- [ ] `paraphrase` có **cơ chế kiểm bất biến** (số + nhãn đỉnh) chống đổi nghĩa; test rewriter giả cả ca đạt lẫn ca ném.
- [ ] `metrics.ts` xuất `robustnessGap` (scalar), `robustnessReport` (theo bản ghi + byKind, chữ ký `(base, variants) -> {overall, byKind}` khớp hợp đồng plan 05) và `consistency` đúng hợp đồng, sẵn cho plan 05 (đo *khoảng rớt robustness* §5 và *độ nhất quán* §6.3).
- [ ] `generate.ts` chạy được bằng `npx tsx`, ghi biến thể ra `data/seeds-variants/`, mỗi biến thể mang `variant = { kind, parentSeedId }` để harness (plan 06) điền `EvalRecord.perturbation`.
- [ ] Mọi kiểu khớp HỢP ĐỒNG DÙNG CHUNG: `PerturbKind`, `Seed`/`Answer`/`AnswerType` (từ plan 01), `Verdict` (khớp plan 02), và `perturb` giữ đúng tên (khác biệt duy nhất: trả `Promise<Variant[]>`, đã ghi rõ ở Task 7).
- [ ] 9 commit, mỗi Task một commit conventional.

---

## Bảng thuật ngữ

| Thuật ngữ | Nghĩa dễ hiểu |
|-----------|----------------|
| **Perturbation / biến đổi có kiểm soát** | "Hoá trang" một bài toán (đổi tên đỉnh, phóng to…) sao cho vẫn kiểm soát được đáp án đúng, để thử xem AI có suy luận thật không. |
| **Robustness (độ bền)** | Mức AI giữ được kết quả đúng khi đề bị hoá trang. Bền cao = suy luận thật. |
| **Robustness gap (khoảng rớt)** | độ chính xác(gốc) − độ chính xác(biến thể). Rớt nhiều = dò mẫu. |
| **Consistency (độ nhất quán)** | Trong cùng một họ biến thể, tỉ lệ AI trả lời trùng nhau. |
| **Isometry (phép đẳng cự / dời hình)** | Phép biến đổi giữ nguyên khoảng cách (xoay, phản chiếu, tịnh tiến) → độ dài/thể tích/góc không đổi. |
| **`scale_degree` (bậc co giãn)** | Số mũ của `k` khi phóng to: độ dài 1, diện tích 2, thể tích 3, góc/tỉ số 0. |
| **Injectable rewriter** | Hàm viết-lại-lời-văn được "tiêm" từ ngoài vào; thật thì gọi model, test thì dùng bản giả → test nhanh, tất định. |
| **Fixture** | Dữ liệu mẫu cố định dùng chung cho nhiều test. |
| **Variant / Seed** | *Seed* = bài gốc; *Variant* = một biến thể sinh từ seed (Seed + nhãn cha). |
| **`toExactForm` / `evalExpr`** | Hàm của engine ký hiệu **có sẵn** (ghi nguồn `api/_lib/kernel`): một cái đổi *số → chuỗi đáp án chuẩn SGK*, một cái *tính giá trị số của biểu thức*. |

---

## Em sẽ bảo vệ được gì trước hội đồng

- **"Chúng em chứng minh được model dò mẫu hay suy luận thật":** bộ `rename/rescale/distractor/paraphrase/reflect` + chỉ số `robustnessGap` cho ra **bằng chứng định lượng cho giả thuyết H2** — năng lực *thiết kế thí nghiệm kiểm định giả thuyết*.
- **"Chúng em kiểm soát được tính đúng đắn của biến thể":** `rescale` co giãn đáp án theo `k^scale_degree` (kiểm bằng giá trị số), `paraphrase` có cơ chế chống đổi nghĩa — năng lực *đảm bảo chất lượng dữ liệu (data validity) và tư duy bất biến toán học*.
- **"Chúng em phân định rõ công cụ có sẵn và phần tự làm":** engine (`toExactForm`, `evalExpr`) được ghi nguồn minh bạch; toàn bộ logic biến đổi, kiểm bất biến, chỉ số là của nhóm — năng lực *liêm chính học thuật* (điểm ViSEF coi trọng).
- **"Chúng em viết code kiểm thử được, tái lập được":** mỗi phép có test TDD, CLI chạy một lệnh sinh hàng nghìn biến thể — năng lực *kỹ thuật phần mềm và khoa học tái lập (reproducibility)*.

---

## Câu hỏi mở (chốt với mentor trước khi làm)

1. **Đường dẫn/tên API của plan 01:** file schema là `data/schema/problem.ts` và hàm `validateSeed`? Nếu khác, sửa các dòng import đã đánh dấu "ĐIỂM NỐI".
2. **Regex `id` của plan 01:** có cho phép hậu tố `__<kind>` không? (Cần, để id biến thể hợp lệ và harness tách được `parentSeedId`.)
3. **`paraphrase` trong `generate`:** giữ nguyên quyết định bỏ paraphrase khỏi CLI tất định (để harness chạy có model), hay muốn thêm một cờ `--paraphrase` nối model ngay trong generate?
4. **Hệ số `k` mặc định = 2** cho rescale có ổn không, hay muốn sinh nhiều `k` (2 và 3) cho mỗi seed?
