# Schema & Công cụ dữ liệu — Kế hoạch triển khai

> **Cho người thực thi (agentic worker):** REQUIRED SUB-SKILL: dùng superpowers:subagent-driven-development hoặc superpowers:executing-plans để làm theo từng Task. Các bước dùng checkbox `- [ ]` để theo dõi.

**Mục tiêu:** Dựng "đường ray" cho toàn bộ dữ liệu VSGeo-Bench — một lược đồ (schema) chặt cho mỗi bài, một công cụ kiểm tra tự động, một cẩm nang soạn bài, và 3 bài mẫu hoàn chỉnh để 2 em bắt chước.

> **Phạm vi cho vòng trường (3 tháng):** schema + công cụ kiểm tra tự động + cẩm nang + **~120–150 bài** (tháng 1 làm ~20 bài mẫu trước, tháng 2 đủ 120–150). **Để dành MỞ RỘNG (sau vòng trường):** nâng bộ dữ liệu lên **~300 bài** + taxonomy (bảng phân loại) đầy đủ hơn.

**Kiến trúc:** Mỗi bài toán là một file JSON trong `data/seeds/`. Một schema viết bằng thư viện `zod` (định nghĩa ở `data/schema/problem.ts`) mô tả *chính xác* hình dạng hợp lệ của một bài. Một CLI (`data/schema/validate.ts`) đọc mọi file seed, đối chiếu với schema, và in báo cáo "bao nhiêu bài hợp lệ / lỗi ở đâu". Con người soạn nội dung; máy canh gác hình thức.

**Công nghệ:** TypeScript (ESM) · `zod` ^3.25 (kiểm tra schema) · `vitest` ^4.1 (chạy test) · `tsx` (chạy file TS như một script CLI — được cài ở kế hoạch **00**) · Node `fs`/`path` (đọc file).

---

## Dành cho 2 em (đọc trước)

Chào Em 1! Đây là **viên gạch đầu tiên** của cả dự án, và em là người đặt nó.

**Hệ con này là gì?** Cả benchmark của chúng ta xoay quanh ~300 bài toán hình không gian. Nếu mỗi bài được viết một kiểu (chỗ thì thiếu đáp án, chỗ thì gõ sai tên tag, chỗ thì để độ khó là 7), thì máy chấm (kế hoạch 02) và harness gọi model (kế hoạch 03) sẽ *vỡ trận* — không đọc nổi dữ liệu. Vì vậy việc đầu tiên là thống nhất **một khuôn mẫu cứng** cho mọi bài, gọi là *schema*, rồi làm một cái máy soi để phát hiện bài nào lệch khuôn.

**Ví dụ cho dễ hình dung:** hãy tưởng tượng schema như tờ khai lý lịch có sẵn các ô bắt buộc điền: Họ tên, Ngày sinh, Lớp. Nếu ai đó nộp tờ khai thiếu ô "Ngày sinh", cái máy soi (CLI `validate.ts`) sẽ chỉ tay vào đúng chỗ đó và nói "bài vsgeo-0042 thiếu trường answer.type". Em sửa, chạy lại, đến khi máy báo "tất cả hợp lệ" thì yên tâm.

**Sản phẩm cuối của hệ con này trông thế nào?**
1. `data/schema/problem.ts` — file định nghĩa khuôn (schema) + hàm `validateSeed()` kiểm một bài.
2. `data/schema/id.ts` — hàm sinh mã bài chuẩn (`vsgeo-0001`, `vsgeo-0137`…).
3. `data/schema/validate.ts` — máy soi chạy bằng một dòng lệnh, quét cả thư mục seeds.
4. `data/schema/authoring-guide.md` — **cẩm nang soạn bài** của riêng em: chọn nguồn ở đâu, chuẩn hoá lời văn thế nào, dán tag ra sao, viết đáp án dạng gì để máy chấm hiểu.
5. `data/seeds/vsgeo-0001.json … 0003.json` — **3 bài mẫu hoàn chỉnh** (anh/chị soạn sẵn cho em) để em nhìn và bắt chước soạn 297 bài còn lại.

**Ai phụ trách?** Em này là của **Em 1 (Dữ liệu & Taxonomy)** — người sở hữu nguồn đề, chuẩn hoá, đáp án chuẩn (theo §11.1 của `docs/design.md`).

**Nằm ở tháng nào?** Theo lộ trình §11.2: bắt đầu ở **Tháng 1 (T1)** — mục tiêu T1 là **≥ 50 bài pilot validate sạch**. Việc soạn dữ liệu kéo dài sang **Tháng 2 (T2)** để đủ **~120–150 bài** cho vòng trường (con số **~300 bài** là mục tiêu **MỞ RỘNG** sau vòng trường). Ba Task hạ tầng (schema + CLI) làm gọn trong tuần đầu T1; phần lớn thời gian còn lại là em soạn bài.

**Phụ thuộc kế hoạch nào?** Chỉ phụ thuộc **kế hoạch 00** (kế hoạch 00 cài `tsx` và thiết lập chạy test). Không cần chờ engine hay máy chấm. Ngược lại, **kế hoạch 02 (máy chấm) và 03 (harness) phụ thuộc vào em** — chúng đọc đúng cái schema em định nghĩa ở đây. Nên phần "HỢP ĐỒNG KIỂU DỮ LIỆU DÙNG CHUNG" phải khớp từng chữ.

> **Một lời nhắn về liêm chính (rất quan trọng cho ViSEF):** Ba file code (`problem.ts`, `id.ts`, `validate.ts`) là *công cụ* — em gõ, chạy, gỡ lỗi, và **hiểu** chúng. Nhưng **300 bài toán là công sức trí tuệ của chính em**: em chọn đề, chuẩn hoá lời văn, tính đáp án, dán nhãn. Anh/chị chỉ soạn 3 bài mẫu để em có điểm tựa; 297 bài kia không ai làm hộ được, và đó chính là thứ em sẽ tự hào bảo vệ trước hội đồng.

---

### Bản đồ file sẽ tạo/sửa trong kế hoạch này

| File | Trách nhiệm | Loại |
|------|-------------|------|
| `research/vsgeo-bench/data/schema/id.ts` | Sinh & kiểm mã bài `vsgeo-XXXX` | Code (Task 1) |
| `research/vsgeo-bench/data/schema/__tests__/id.test.ts` | Test cho `id.ts` | Test (Task 1) |
| `research/vsgeo-bench/data/schema/problem.ts` | Schema zod + `validateSeed()` + các `type` dùng chung | Code (Task 2) |
| `research/vsgeo-bench/data/schema/__tests__/problem.test.ts` | Test cho schema | Test (Task 2) |
| `research/vsgeo-bench/data/schema/validate.ts` | CLI quét thư mục seeds, in báo cáo | Code (Task 3) |
| `research/vsgeo-bench/data/schema/__tests__/validate.test.ts` | Test cho logic CLI | Test (Task 3) |
| `research/vsgeo-bench/data/schema/authoring-guide.md` | Cẩm nang soạn bài (phương pháp) | Nội dung (Task 4) |
| `research/vsgeo-bench/data/seeds/vsgeo-0001.json` | Bài mẫu — đáp án dạng căn (surd) | Nội dung mẫu (Task 5) |
| `research/vsgeo-bench/data/seeds/vsgeo-0002.json` | Bài mẫu — đáp án số hữu tỉ (rational) | Nội dung mẫu (Task 5) |
| `research/vsgeo-bench/data/seeds/vsgeo-0003.json` | Bài mẫu — đáp án phương trình mặt (plane_eq) | Nội dung mẫu (Task 5) |
| `research/vsgeo-bench/data/seeds/__tests__/pilot-seeds.test.ts` | Test canh 3 bài mẫu luôn hợp lệ | Test (Task 5) |

> **Ghi chú về vitest:** vitest ở gốc repo tự động tìm mọi file `*.test.ts` trong toàn dự án, kể cả dưới `research/`. Vì vậy các test dưới đây chạy được ngay bằng `npm test` mà **không cần** chỉnh cấu hình gì thêm.

> **Nhắc cú pháp lệnh (Windows PowerShell hay bash đều chạy):**
> - Chạy toàn bộ test một lần: `npm test`
> - Chạy đúng một file test: `npm test -- <phần-tên-file>` (ví dụ `npm test -- id.test`). Phần sau `--` là bộ lọc theo tên đường dẫn của vitest.
> - Chạy một script TS như CLI: `npx tsx <đường-dẫn-file.ts>`

---

## HỢP ĐỒNG KIỂU DỮ LIỆU (bản sao để tiện tra — mọi Task phải khớp)

Đây là *hợp đồng dùng chung* của cả dự án. Kế hoạch 02/03/04 đều dựa vào đúng các tên này. **Không tự đổi tên trường.**

```
Seed = {
  id: string;                                  // "vsgeo-0001"
  source: { type: "exam"|"textbook"|"synthetic"; ref: string; license?: string };
  statement_vi: string;                        // đề bài tiếng Việt đã chuẩn hoá
  figure?: { points?: {id:string,x:number,y:number,z:number}[]; coords_given: boolean };
  answer: Answer;
  tags: {
    topic: string[];                           // nhiều nhãn chủ đề
    answer_form: AnswerType;
    difficulty: 1|2|3|4;
    requires_auxiliary_construction: boolean;  // có cần dựng hình phụ không
  };
  solution_ref_vi?: string;                    // lời giải mẫu (để đối chiếu taxonomy lỗi)
  verified_by_engine?: boolean;                // engine đã tự giải & khớp chưa
  scale_degree?: number;                       // bậc co giãn theo cạnh a (dùng cho biến đổi rescale)
}
Answer = { canonical: string; type: AnswerType; human_note?: string }
AnswerType = "rational" | "surd" | "ratio" | "point" | "vector" | "plane_eq" | "line_eq" | "boolean" | "mcq"
```

---

### Task 1: Mã bài `vsgeo-XXXX` (`id.ts`)

Mỗi bài cần một mã định danh duy nhất, đệm 0 cho đủ 4 chữ số để sắp xếp đẹp (`vsgeo-0001`, `vsgeo-0042`, `vsgeo-0300`). Ta viết hàm sinh mã và hàm kiểm định dạng mã.

**Files:**
- Create: `research/vsgeo-bench/data/schema/id.ts`
- Test: `research/vsgeo-bench/data/schema/__tests__/id.test.ts`

- [ ] **Bước 1: Viết test thất bại**

Tạo file `research/vsgeo-bench/data/schema/__tests__/id.test.ts` với nội dung:

```ts
import { describe, it, expect } from "vitest";
import { makeSeedId, isValidSeedId } from "../id";

describe("makeSeedId — sinh mã bài đệm 0 đủ 4 chữ số", () => {
  it("số 1 → vsgeo-0001", () => {
    expect(makeSeedId(1)).toBe("vsgeo-0001");
  });

  it("số 137 → vsgeo-0137", () => {
    expect(makeSeedId(137)).toBe("vsgeo-0137");
  });

  it("số 300 → vsgeo-0300", () => {
    expect(makeSeedId(300)).toBe("vsgeo-0300");
  });

  it("số ngoài khoảng 1..9999 hoặc không nguyên → ném lỗi", () => {
    expect(() => makeSeedId(0)).toThrow();
    expect(() => makeSeedId(-5)).toThrow();
    expect(() => makeSeedId(10000)).toThrow();
    expect(() => makeSeedId(1.5)).toThrow();
  });
});

describe("isValidSeedId — kiểm định dạng mã", () => {
  it("nhận đúng dạng vsgeo-XXXX (4 chữ số)", () => {
    expect(isValidSeedId("vsgeo-0001")).toBe(true);
    expect(isValidSeedId("vsgeo-0137")).toBe(true);
  });

  it("từ chối dạng sai", () => {
    expect(isValidSeedId("vsgeo-1")).toBe(false);     // thiếu đệm 0
    expect(isValidSeedId("vsgeo-00001")).toBe(false); // 5 chữ số
    expect(isValidSeedId("VSGEO-0001")).toBe(false);  // viết hoa
    expect(isValidSeedId("bai-0001")).toBe(false);    // sai tiền tố
    expect(isValidSeedId("vsgeo-0001 ")).toBe(false); // dư khoảng trắng
  });
});
```

- [ ] **Bước 2: Chạy test cho thấy FAIL**

Run: `npm test -- id.test`
Expected: FAIL — vitest báo không tìm thấy module `../id` (hoặc `makeSeedId is not a function`), vì file `id.ts` chưa tồn tại.

- [ ] **Bước 3: Viết code tối thiểu để pass**

Tạo file `research/vsgeo-bench/data/schema/id.ts`:

```ts
// id.ts — sinh & kiểm mã định danh của một bài seed.
// Mã có dạng "vsgeo-" + 4 chữ số đệm 0, ví dụ vsgeo-0001, vsgeo-0300.
// Vì sao đệm 0 tới 4 chữ số? Để khi liệt kê file theo thứ tự chữ cái,
// chúng cũng tự sắp đúng theo thứ tự số (0002 đứng trước 0010).

// Biểu thức chính quy (regex) khớp đúng một mã hợp lệ:
//  ^      = đầu chuỗi (không cho ký tự lạ đứng trước)
//  vsgeo- = tiền tố cố định
//  \d{4}  = đúng 4 chữ số
//  $      = cuối chuỗi (không cho ký tự lạ, kể cả khoảng trắng, đứng sau)
const SEED_ID_RE = /^vsgeo-\d{4}$/;

/** Sinh mã bài từ số thứ tự (1..9999). makeSeedId(1) === "vsgeo-0001". */
export function makeSeedId(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 9999) {
    throw new Error(`Số thứ tự phải là số nguyên trong khoảng 1..9999, nhận: ${n}`);
  }
  // padStart(4, "0"): "1" -> "0001", "137" -> "0137".
  return `vsgeo-${String(n).padStart(4, "0")}`;
}

/** Kiểm một chuỗi có đúng định dạng mã bài không. */
export function isValidSeedId(id: string): boolean {
  return SEED_ID_RE.test(id);
}
```

- [ ] **Bước 4: Chạy test PASS**

Run: `npm test -- id.test`
Expected: PASS — tất cả các `it(...)` xanh (2 nhóm describe, 6 test).

- [ ] **Bước 5: Commit**

```bash
git add research/vsgeo-bench/data/schema/id.ts research/vsgeo-bench/data/schema/__tests__/id.test.ts
git commit -m "feat(schema): thêm makeSeedId + isValidSeedId cho mã bài vsgeo-XXXX"
```

---

### Task 2: Schema `zod` + `validateSeed()` (`problem.ts`)

Đây là trái tim của hệ con: mô tả *chính xác* hình dạng một bài hợp lệ bằng `zod`, rồi cho ra hàm `validateSeed()` trả về danh sách lỗi dễ đọc bằng tiếng Việt.

**`zod` là gì?** Là một thư viện giúp ta khai báo "dữ liệu phải trông thế này" bằng code, rồi kiểm một object bất kỳ có khớp không. Ví dụ `z.string().min(1)` nghĩa là "phải là chuỗi, dài ≥ 1". `z.enum([...])` nghĩa là "chỉ được là một trong các giá trị liệt kê". Điểm hay: từ schema `zod`, ta rút được luôn *kiểu TypeScript* tương ứng bằng `z.infer<...>`, nên không phải khai báo kiểu hai lần.

**Files:**
- Create: `research/vsgeo-bench/data/schema/problem.ts`
- Test: `research/vsgeo-bench/data/schema/__tests__/problem.test.ts`

- [ ] **Bước 1: Viết test thất bại**

Tạo file `research/vsgeo-bench/data/schema/__tests__/problem.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateSeed, SeedSchema } from "../problem";
import type { Seed } from "../problem";

// Một bài hợp lệ tối thiểu, dùng làm "khuôn" rồi ta cố tình làm hỏng từng chỗ.
function baiHopLe(): Seed {
  return {
    id: "vsgeo-0001",
    source: { type: "exam", ref: "THPTQG 2019 - mã 101 - câu 43" },
    statement_vi: "Cho hình chóp S.ABCD ... Tính khoảng cách từ A đến (SBD).",
    answer: { canonical: "a*sqrt(3)/3", type: "surd", human_note: "khoảng cách A đến (SBD)" },
    tags: {
      topic: ["khoang_cach", "vuong_goc"],
      answer_form: "surd",
      difficulty: 3,
      requires_auxiliary_construction: true,
    },
  };
}

describe("validateSeed — ca hợp lệ", () => {
  it("bài đầy đủ các trường bắt buộc → ok", () => {
    const res = validateSeed(baiHopLe());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.seed.id).toBe("vsgeo-0001");
      expect(res.seed.answer.type).toBe("surd");
    }
  });

  it("bài có các trường tuỳ chọn (figure, solution_ref_vi, verified_by_engine, scale_degree) → ok", () => {
    const bai = baiHopLe();
    bai.figure = {
      coords_given: true,
      points: [{ id: "A", x: 1, y: 0, z: 0 }],
    };
    bai.solution_ref_vi = "Bước 1: dựng chân đường cao...";
    bai.verified_by_engine = true;
    bai.scale_degree = 1;
    const res = validateSeed(bai);
    expect(res.ok).toBe(true);
  });
});

describe("validateSeed — ca lỗi", () => {
  it("thiếu trường bắt buộc (answer) → báo lỗi rõ đường dẫn", () => {
    const bai: any = baiHopLe();
    delete bai.answer;
    const res = validateSeed(bai);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.length).toBeGreaterThan(0);
      expect(res.errors.some((e) => e.includes("answer"))).toBe(true);
    }
  });

  it("answer.type ngoài enum → báo lỗi", () => {
    const bai: any = baiHopLe();
    bai.answer.type = "so_thuc"; // không thuộc AnswerType
    const res = validateSeed(bai);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.some((e) => e.includes("answer.type"))).toBe(true);
    }
  });

  it("difficulty ngoài 1..4 → báo lỗi", () => {
    const bai: any = baiHopLe();
    bai.tags.difficulty = 7;
    const res = validateSeed(bai);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.some((e) => e.includes("difficulty"))).toBe(true);
    }
  });

  it("topic rỗng → báo lỗi (phải có ít nhất 1 nhãn)", () => {
    const bai: any = baiHopLe();
    bai.tags.topic = [];
    const res = validateSeed(bai);
    expect(res.ok).toBe(false);
  });

  it("thừa trường lạ (typo tên) → báo lỗi nhờ .strict()", () => {
    const bai: any = baiHopLe();
    bai.answ = bai.answer; // gõ nhầm tên trường
    const res = validateSeed(bai);
    expect(res.ok).toBe(false);
  });

  it("id sai định dạng → báo lỗi", () => {
    const bai: any = baiHopLe();
    bai.id = "vsgeo-1"; // thiếu đệm 0
    const res = validateSeed(bai);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.some((e) => e.includes("id"))).toBe(true);
    }
  });
});

describe("SeedSchema — dùng trực tiếp cũng được", () => {
  it("safeParse trả success cho bài hợp lệ", () => {
    expect(SeedSchema.safeParse(baiHopLe()).success).toBe(true);
  });
});
```

- [ ] **Bước 2: Chạy test cho thấy FAIL**

Run: `npm test -- problem.test`
Expected: FAIL — không tìm thấy module `../problem` (file chưa có).

- [ ] **Bước 3: Viết code tối thiểu để pass**

Tạo file `research/vsgeo-bench/data/schema/problem.ts`:

```ts
// problem.ts — lược đồ (schema) của MỘT bài toán trong VSGeo-Bench.
// Viết bằng zod: khai báo một lần, rút ra được cả kiểm-tra-lúc-chạy lẫn kiểu TypeScript.
// Mọi tên trường ở đây PHẢI khớp "HỢP ĐỒNG KIỂU DỮ LIỆU DÙNG CHUNG" của cả dự án,
// vì máy chấm (kế hoạch 02) và harness (kế hoạch 03) đọc đúng các tên này.

import { z } from "zod";

// --- Kiểu đáp án: danh sách đóng (chỉ được là một trong các giá trị này) ---
export const AnswerTypeSchema = z.enum([
  "rational",  // số hữu tỉ, ví dụ "3/2"
  "surd",      // biểu thức căn, ví dụ "a*sqrt(6)/3"
  "ratio",     // tỉ số, ví dụ "1:2" hoặc "2/3"
  "point",     // toạ độ điểm, ví dụ "(1,2,3)"
  "vector",    // vector, ví dụ "(1,-2,2)"
  "plane_eq",  // phương trình mặt phẳng, ví dụ "x+2y-2z+3=0"
  "line_eq",   // phương trình đường thẳng
  "boolean",   // đúng/sai
  "mcq",       // trắc nghiệm A/B/C/D
]);
export type AnswerType = z.infer<typeof AnswerTypeSchema>;

// --- Đáp án ---
export const AnswerSchema = z
  .object({
    canonical: z.string().min(1, "answer.canonical không được rỗng"),
    type: AnswerTypeSchema,
    human_note: z.string().optional(),
  })
  .strict(); // .strict(): có trường lạ (gõ sai tên) → báo lỗi thay vì lặng lẽ bỏ qua
export type Answer = z.infer<typeof AnswerSchema>;

// --- Một điểm trong figure (nếu đề cho toạ độ) ---
export const PointSchema = z
  .object({
    id: z.string().min(1),
    x: z.number(),
    y: z.number(),
    z: z.number(),
  })
  .strict();

// --- figure: hình vẽ / dữ kiện toạ độ (tuỳ chọn) ---
export const FigureSchema = z
  .object({
    points: z.array(PointSchema).optional(),
    coords_given: z.boolean(), // đề có cho sẵn hệ toạ độ không
  })
  .strict();

// --- source: nguồn gốc bài, phục vụ minh bạch bản quyền (§3.2, §12) ---
export const SourceSchema = z
  .object({
    type: z.enum(["exam", "textbook", "synthetic"]),
    ref: z.string().min(1, "source.ref không được rỗng (phải ghi nguồn)"),
    license: z.string().optional(),
  })
  .strict();

// --- tags: các chiều phân loại (§3.4) ---
export const TagsSchema = z
  .object({
    topic: z.array(z.string().min(1)).min(1, "topic phải có ít nhất 1 nhãn"),
    answer_form: AnswerTypeSchema,
    // difficulty chỉ nhận đúng 1|2|3|4 (khớp kiểu 1|2|3|4 của hợp đồng dùng chung).
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    requires_auxiliary_construction: z.boolean(),
  })
  .strict();

// --- Seed: cả một bài toán ---
export const SeedSchema = z
  .object({
    id: z.string().regex(/^vsgeo-\d{4}$/, "id phải dạng vsgeo-XXXX (đúng 4 chữ số)"),
    source: SourceSchema,
    statement_vi: z.string().min(1, "statement_vi (đề bài) không được rỗng"),
    figure: FigureSchema.optional(),
    answer: AnswerSchema,
    tags: TagsSchema,
    solution_ref_vi: z.string().optional(),
    verified_by_engine: z.boolean().optional(),
    scale_degree: z.number().optional(),
  })
  .strict();

// Rút kiểu TypeScript ra từ schema — khỏi khai báo hai lần.
export type Seed = z.infer<typeof SeedSchema>;

/**
 * validateSeed — kiểm một object bất kỳ có phải Seed hợp lệ không.
 * Trả { ok: true, seed } nếu hợp lệ, hoặc { ok: false, errors } với danh sách
 * lỗi dạng "đường.dẫn.trường: mô tả" để người soạn biết sửa ở đâu.
 */
export function validateSeed(
  obj: unknown
): { ok: true; seed: Seed } | { ok: false; errors: string[] } {
  const r = SeedSchema.safeParse(obj);
  if (r.success) return { ok: true, seed: r.data };
  const errors = r.error.issues.map((iss) => {
    const path = iss.path.length ? iss.path.join(".") : "(gốc)";
    return `${path}: ${iss.message}`;
  });
  return { ok: false, errors };
}
```

- [ ] **Bước 4: Chạy test PASS**

Run: `npm test -- problem.test`
Expected: PASS — cả nhóm "ca hợp lệ", "ca lỗi", "SeedSchema dùng trực tiếp" đều xanh.

> Nếu gặp lỗi phân giải module `zod`, kiểm tra `zod` đã có trong `package.json` (nó có sẵn, `^3.25.76`). Nếu vitest báo lỗi import, thử `npm install` một lần cho chắc.

- [ ] **Bước 5: Commit**

```bash
git add research/vsgeo-bench/data/schema/problem.ts research/vsgeo-bench/data/schema/__tests__/problem.test.ts
git commit -m "feat(schema): định nghĩa SeedSchema (zod) + validateSeed khớp hợp đồng dùng chung"
```

---

### Task 3: CLI kiểm tra toàn bộ seeds (`validate.ts`)

Bây giờ ta có "khuôn" cho một bài. Cần một cái máy soi quét **cả thư mục** `data/seeds/`, kiểm từng file, và in báo cáo tổng. Nếu có bất kỳ lỗi nào, CLI **thoát với mã khác 0** — điều này quan trọng để sau này chạy tự động (CI) biết được là "dữ liệu hỏng, dừng lại".

**Mẹo thiết kế để dễ test:** ta tách phần "tính toán thuần" (`runValidation`) khỏi phần "đọc đĩa + thoát tiến trình" (`main`). Hàm `runValidation` nhận vào một *mảng* các file (tên + nội dung chuỗi), không đụng đĩa → test cực dễ, không cần tạo file tạm. Còn `main()` mới đọc đĩa thật và gọi `process.exit`.

**Files:**
- Create: `research/vsgeo-bench/data/schema/validate.ts`
- Test: `research/vsgeo-bench/data/schema/__tests__/validate.test.ts`

- [ ] **Bước 1: Viết test thất bại**

Tạo file `research/vsgeo-bench/data/schema/__tests__/validate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { runValidation } from "../validate";
import type { SeedFile } from "../validate";

// Một bài hợp lệ dưới dạng chuỗi JSON, kèm tên file khớp id.
function fileHopLe(): SeedFile {
  const seed = {
    id: "vsgeo-0001",
    source: { type: "exam", ref: "THPTQG 2019 - mã 101 - câu 43" },
    statement_vi: "Cho hình chóp ... Tính khoảng cách.",
    answer: { canonical: "a*sqrt(3)/3", type: "surd" },
    tags: {
      topic: ["khoang_cach"],
      answer_form: "surd",
      difficulty: 3,
      requires_auxiliary_construction: true,
    },
  };
  return { file: "vsgeo-0001.json", content: JSON.stringify(seed) };
}

describe("runValidation — kiểm cả tập seeds", () => {
  it("tập toàn bài hợp lệ → không có problem", () => {
    const rep = runValidation([fileHopLe()]);
    expect(rep.okCount).toBe(1);
    expect(rep.problems).toEqual([]);
  });

  it("JSON hỏng → báo lỗi 'JSON hỏng'", () => {
    const rep = runValidation([{ file: "vsgeo-0002.json", content: "{ hỏng, }" }]);
    expect(rep.okCount).toBe(0);
    expect(rep.problems.some((p) => p.includes("JSON hỏng"))).toBe(true);
  });

  it("bài không hợp schema → gắn tên file vào lỗi", () => {
    const rep = runValidation([{ file: "vsgeo-0003.json", content: '{"id":"vsgeo-0003"}' }]);
    expect(rep.okCount).toBe(0);
    expect(rep.problems.some((p) => p.startsWith("vsgeo-0003.json:"))).toBe(true);
  });

  it("tên file không khớp id → báo lỗi", () => {
    const f = fileHopLe();
    f.file = "vsgeo-9999.json"; // id bên trong vẫn là vsgeo-0001
    const rep = runValidation([f]);
    expect(rep.okCount).toBe(0);
    expect(rep.problems.some((p) => p.includes("khớp id"))).toBe(true);
  });

  it("id trùng nhau giữa 2 file → báo lỗi trùng", () => {
    const a = fileHopLe();
    const b = fileHopLe();
    b.file = "vsgeo-0001-copy.json"; // khác tên file, nhưng id bên trong trùng
    const rep = runValidation([a, b]);
    expect(rep.problems.some((p) => p.includes("trùng"))).toBe(true);
  });
});
```

- [ ] **Bước 2: Chạy test cho thấy FAIL**

Run: `npm test -- validate.test`
Expected: FAIL — không tìm thấy module `../validate`.

- [ ] **Bước 3: Viết code tối thiểu để pass**

Tạo file `research/vsgeo-bench/data/schema/validate.ts`:

```ts
// validate.ts — CLI kiểm tra toàn bộ file trong data/seeds/.
// Cách chạy:  npx tsx research/vsgeo-bench/data/schema/validate.ts
// Thoát mã 0 nếu tất cả hợp lệ; mã 1 nếu có bất kỳ lỗi nào (để chạy tự động biết dừng).

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, basename } from "node:path";
import { validateSeed } from "./problem";
import { isValidSeedId } from "./id";

// Một file seed dạng thô: tên + nội dung chuỗi (chưa parse).
export type SeedFile = { file: string; content: string };
// Báo cáo: đếm số bài ok + danh sách mô tả lỗi (mỗi lỗi một dòng).
export type ValidationReport = { okCount: number; problems: string[] };

/**
 * runValidation — phần "não" thuần tính toán, KHÔNG đụng đĩa, KHÔNG thoát tiến trình.
 * Nhờ vậy test gọi trực tiếp được. Quy tắc kiểm (mỗi file, dừng ở lỗi đầu tiên gặp):
 *   1) JSON có parse được không.
 *   2) Có khớp SeedSchema không (validateSeed).
 *   3) id có đúng định dạng vsgeo-XXXX không.
 *   4) id có trùng với file khác không (kiểm trước tên file, xem chú thích dưới).
 *   5) Tên file có bằng "<id>.json" không (để tra cứu dễ, tránh lẫn).
 */
export function runValidation(files: SeedFile[]): ValidationReport {
  let okCount = 0;
  const problems: string[] = [];
  const seenIds = new Map<string, string>(); // id -> tên file đã gặp trước

  for (const { file, content } of files) {
    // (1) JSON hỏng?
    let raw: unknown;
    try {
      raw = JSON.parse(content);
    } catch (e) {
      problems.push(`${file}: JSON hỏng — ${(e as Error).message}`);
      continue;
    }

    // (2) Khớp schema?
    const res = validateSeed(raw);
    if (!res.ok) {
      for (const err of res.errors) problems.push(`${file}: ${err}`);
      continue;
    }
    const seed = res.seed;

    // (3) id đúng định dạng?
    if (!isValidSeedId(seed.id)) {
      problems.push(`${file}: id "${seed.id}" sai định dạng vsgeo-XXXX`);
      continue;
    }

    // (4) id trùng? (kiểm TRƯỚC tên file: một bản sao đặt sai tên vẫn phải bị
    //     bắt là trùng id — nếu kiểm tên file trước thì lỗi tên sẽ che mất lỗi trùng.)
    const truoc = seenIds.get(seed.id);
    if (truoc) {
      problems.push(`${file}: id "${seed.id}" trùng với file "${truoc}"`);
      continue;
    }

    // (5) Tên file khớp id?
    const expected = `${seed.id}.json`;
    if (basename(file) !== expected) {
      problems.push(`${file}: tên file phải là "${expected}" để khớp id "${seed.id}"`);
      continue;
    }

    seenIds.set(seed.id, file);
    okCount++;
  }

  return { okCount, problems };
}

/** Đọc mọi *.json trong data/seeds/ thành mảng SeedFile. */
function docThuMucSeeds(seedsDir: string): SeedFile[] {
  const names = readdirSync(seedsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  return names.map((file) => ({
    file,
    content: readFileSync(join(seedsDir, file), "utf8"),
  }));
}

/** main — phần "tay chân": đọc đĩa, in báo cáo, thoát với mã phù hợp. */
function main(): void {
  const here = dirname(fileURLToPath(import.meta.url)); // .../data/schema
  const seedsDir = join(here, "..", "seeds"); // .../data/seeds

  let files: SeedFile[];
  try {
    files = docThuMucSeeds(seedsDir);
  } catch {
    console.error(`✗ Không đọc được thư mục seeds: ${seedsDir}`);
    process.exit(1);
    return;
  }

  if (files.length === 0) {
    console.error(`✗ Chưa có file .json nào trong ${seedsDir}`);
    process.exit(1);
    return;
  }

  const rep = runValidation(files);

  console.log(`\n=== Báo cáo kiểm tra seeds (${files.length} file) ===`);
  console.log(`Hợp lệ: ${rep.okCount}`);
  console.log(`Lỗi:    ${rep.problems.length}`);
  if (rep.problems.length > 0) {
    console.log(`\n--- Chi tiết lỗi ---`);
    for (const p of rep.problems) console.log(`  ✗ ${p}`);
    console.log("");
    process.exit(1);
  } else {
    console.log(`\n✓ Tất cả ${rep.okCount} bài đều hợp lệ!\n`);
    process.exit(0);
  }
}

// Chạy main() khi file được gọi trực tiếp bằng tsx.
main();
```

> **Vì sao có `main()` gọi luôn ở cuối mà test vẫn ổn?** Khi test `import { runValidation } from "../validate"`, dòng `main()` cũng chạy — nhưng lúc đó không có thư mục seeds nào ở cạnh, `docThuMucSeeds` sẽ ném lỗi hoặc trả mảng rỗng và gọi `process.exit(1)`, có thể làm hỏng tiến trình test. Để tránh, ta **chỉ gọi `main()` khi file được chạy trực tiếp**, không phải khi bị import. Sửa dòng cuối như bước dưới.

- [ ] **Bước 3b: Bọc `main()` để không chạy khi bị test import**

Sửa **dòng cuối** của `validate.ts`, thay `main();` bằng:

```ts
// Chỉ chạy khi được gọi trực tiếp qua tsx (không chạy khi bị test import).
// Dùng pathToFileURL của Node để so khớp URL cho ĐÚNG trên mọi HĐH: trên Windows
// import.meta.url là "file:///C:/..." (ba dấu /) nên KHÔNG được tự ghép chuỗi
// "file://" + đường dẫn (chỉ hai dấu /) — sẽ luôn lệch và main() không bao giờ chạy.
const calledDirectly =
  typeof process !== "undefined" &&
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (calledDirectly) {
  main();
}
```

> Giải thích: `import.meta.url` là địa chỉ của chính file `validate.ts`; `process.argv[1]` là đường dẫn file mà `tsx` được lệnh chạy. Khi hai cái trỏ cùng một file ⇒ ta đang chạy trực tiếp ⇒ gọi `main()`. Khi vitest import module, `argv[1]` là runner của vitest ⇒ không khớp ⇒ không gọi `main()`.
>
> **Cạm bẫy Windows (quan trọng):** KHÔNG tự ghép chuỗi `` `file://${process.argv[1].replace(/\\/g, "/")}` `` để so sánh. Trên Windows, `import.meta.url` có dạng `file:///C:/...` (ba dấu `/`) trong khi chuỗi tự ghép chỉ ra `file://C:/...` (hai dấu `/`) ⇒ **luôn lệch**, khiến `main()` không bao giờ chạy: CLI im lặng, không in gì, và luôn thoát mã 0 kể cả khi seed sai — mất tác dụng máy soi. Dùng `pathToFileURL(process.argv[1]).href` của Node để nó tự chuẩn hoá dấu `/` và chữ hoa/thường ổ đĩa cho đúng trên mọi HĐH.

- [ ] **Bước 4: Chạy test PASS**

Run: `npm test -- validate.test`
Expected: PASS — 5 test của `runValidation` đều xanh, và tiến trình test không bị `process.exit` làm gián đoạn.

- [ ] **Bước 5: Commit**

```bash
git add research/vsgeo-bench/data/schema/validate.ts research/vsgeo-bench/data/schema/__tests__/validate.test.ts
git commit -m "feat(schema): CLI validate.ts quét data/seeds + báo cáo lỗi, thoát mã != 0"
```

---

### Task 4: Cẩm nang soạn bài (`authoring-guide.md`)

> **Đây là phần PHƯƠNG PHÁP — không phải code.** Task này tạo ra cẩm nang để **Em 1 tự soạn 300 bài**. Anh/chị cung cấp *quy trình, biểu mẫu, ví dụ mẫu, tiêu chí nghiệm thu*; còn **nội dung 300 bài là công sức trí tuệ của em**. Cẩm nang này cũng chính là thứ em trình bày với hội đồng để chứng minh "dữ liệu của em có quy trình khoa học, không tuỳ tiện".

**Files:**
- Create: `research/vsgeo-bench/data/schema/authoring-guide.md`

- [ ] **Bước 1: Tạo file cẩm nang với nội dung đầy đủ dưới đây**

Tạo file `research/vsgeo-bench/data/schema/authoring-guide.md` với đúng nội dung sau:

````markdown
# Cẩm nang soạn bài VSGeo-Bench (dành cho Em 1)

> Mục tiêu: mỗi bài em soạn ra vừa **đúng toán học**, vừa **hợp schema** (máy soi `validate.ts` báo xanh), vừa **an toàn bản quyền** (§3.2, §12 của `docs/design.md`). Tài liệu này là quy trình cầm-tay-chỉ-việc + biểu mẫu + tiêu chí nghiệm thu.

## 0. Toàn cảnh: một bài đi qua 6 bước

1. **Chọn nguồn** (đề THPT QG / đề thi thử / SGK / tự sinh).
2. **Chuẩn hoá lời văn** (viết lại bằng lời của mình, KHÔNG chép nguyên văn) + ghi nguồn.
3. **Dán tag** (topic, answer_form, difficulty, requires_auxiliary_construction).
4. **Tính đáp án** và viết ở dạng `canonical` đúng chuẩn để máy chấm hiểu.
5. **Đáp án chuẩn kép** (§3.5): tự tính một lần, đối chiếu lần hai (engine hoặc cách khác); lệch → cờ đỏ.
6. **Chạy máy soi** `validate.ts`; xanh thì lưu, đỏ thì sửa.

## 1. Chọn nguồn (§3.2)

- **Lõi (~60%):** đề THPT QG, đề thi thử tỉnh/trường, SGK/SBT. Đây là bài "thật", giúp benchmark có giá trị thực tế.
- **Mở rộng (~40%):** bài **tự sinh** (thay số, đổi cấu hình) mà em tự bảo chứng đáp án. An toàn bản quyền, dễ công bố, kiểm soát được độ khó.
- Ghi vào `source.type`: `"exam"` (đề thi) · `"textbook"` (SGK/SBT) · `"synthetic"` (tự sinh).
- `source.ref`: ghi **đủ để truy vết**, ví dụ `"THPTQG 2019 - mã 101 - câu 43"` hoặc `"SGK Hình học 12 - trang 25 - bài 3"` hoặc `"tự sinh từ vsgeo-0007 (thay a=2)"`.

## 2. Chuẩn hoá lời văn (chống bản quyền + chống nhiễm dữ liệu)

**Nguyên tắc vàng: KHÔNG chép nguyên văn.** Đọc đề gốc, hiểu, rồi **viết lại bằng lời của em**. Vừa tránh rắc rối bản quyền (§12), vừa giảm rủi ro "model đã học thuộc đề gốc" (data contamination).

Checklist chuẩn hoá:
- [ ] Đổi cách diễn đạt câu chữ (không giữ nguyên mệnh đề).
- [ ] Giữ nguyên **bản chất toán học** (các giả thiết, số liệu quan trọng không đổi).
- [ ] Thống nhất ký hiệu: cạnh `a`, `AB`, mặt phẳng `(SBD)`, viết dấu nhân là `·` hoặc bỏ.
- [ ] Bỏ phần "Chọn đáp án A/B/C/D" nếu chuyển bài trắc nghiệm thành bài hỏi trực tiếp (khuyến khích, để đo đáp án mở).
- [ ] Ghi `source.ref` trỏ về đề gốc.

## 3. Dán tag (§3.4)

| Trường | Ý nghĩa | Giá trị hợp lệ |
|--------|---------|----------------|
| `tags.topic` | Chủ đề (nhiều nhãn) | mảng chuỗi, ví dụ `["the_tich"]`, `["khoang_cach","vuong_goc"]` |
| `tags.answer_form` | Dạng đáp án | đúng một `AnswerType` (xem §4) |
| `tags.difficulty` | Độ khó | `1` (nhận biết) → `4` (vận dụng cao) |
| `tags.requires_auxiliary_construction` | Có phải dựng hình phụ? | `true`/`false` |

**Bảng nhãn chủ đề chuẩn (dùng đúng các slug này để thống kê gộp được):**

| Slug | Chủ đề |
|------|--------|
| `the_tich` | Thể tích & khối đa diện |
| `song_song` | Quan hệ song song |
| `vuong_goc` | Quan hệ vuông góc |
| `khoang_cach` | Khoảng cách (điểm–mặt, đường–đường chéo) |
| `goc` | Góc (đường–mặt, mặt–mặt) |
| `mat_cau_non_tru` | Mặt cầu / nón / trụ |
| `toa_do_oxyz` | Phương pháp toạ độ Oxyz |

> Nếu cần một chủ đề mới, thêm vào bảng này **trước** rồi mới dùng — để cả nhóm dùng chung một bộ slug, tránh chỗ ghi `khoang_cach` chỗ ghi `khoangcach`.

**Cách quyết `requires_auxiliary_construction`:** hỏi "để giải, có bắt buộc **vẽ thêm** một đường/điểm/mặt phụ không có sẵn trong đề không?" (ví dụ kẻ chân đường cao, dựng hình chiếu). Nếu có ⇒ `true`. Đây là **biến then chốt** của giả thuyết H1, nên dán cẩn thận.

**Thang độ khó gợi ý:**
- `1` — áp thẳng một công thức (thể tích khối cơ bản).
- `2` — hai bước, không cần dựng hình phụ.
- `3` — cần dựng hình phụ hoặc phối hợp 2–3 định lý.
- `4` — vận dụng cao, nhiều bước, dễ sai.

## 4. Viết `answer.canonical` đúng chuẩn (để máy chấm hiểu)

Máy chấm (kế hoạch 02) sẽ so đáp án của model với `answer.canonical`. Vì vậy em phải viết `canonical` theo **đúng quy ước** cho từng `AnswerType`:

| `type` | Ý nghĩa | Ví dụ `canonical` | Ghi chú |
|--------|---------|-------------------|---------|
| `rational` | Số hữu tỉ | `3/2` · `4` · `-5/6` | phân số tối giản, hoặc số nguyên |
| `surd` | Biểu thức căn | `a*sqrt(6)/3` · `2*sqrt(3)` · `sqrt(2)/2` | dùng `sqrt(...)`, nhân là `*`, cạnh ký hiệu là `a` |
| `ratio` | Tỉ số | `1:2` · `2/3` | ghi rõ thứ tự tỉ số |
| `point` | Toạ độ điểm | `(1,2,3)` · `(0,-1,2)` | trong ngoặc, cách nhau bởi dấu phẩy |
| `vector` | Vector | `(1,-2,2)` | như điểm; hướng có thể chuẩn hoá ở máy chấm |
| `plane_eq` | Phương trình mặt phẳng | `x+2y-2z+3=0` | thu gọn hệ số nguyên, vế phải `=0` |
| `line_eq` | Phương trình đường thẳng | `(x-1)/2=(y+1)/1=z/3` | dạng chính tắc |
| `boolean` | Đúng/sai | `true` · `false` | chữ thường |
| `mcq` | Trắc nghiệm | `A` · `B` · `C` · `D` | một chữ in hoa |

**Quy ước gõ (quan trọng — máy chấm dựa vào):**
- Căn bậc hai: viết `sqrt(6)`, KHÔNG viết `√6` trong `canonical` (ký hiệu `√` để dành cho phần hiển thị của engine).
- Nhân: `*`. Chia: `/`. Ví dụ "a nhân căn 6 chia 3" → `a*sqrt(6)/3`.
- Cạnh ký hiệu chữ: dùng `a`. Nếu đáp án co giãn theo `a`, khai thêm `scale_degree` (xem §6).

## 5. Đáp án chuẩn kép (§3.5) — "hai người gác một cửa"

Đây là điểm nhấn độ chặt của cả đề tài. Với **mỗi** bài:

1. **Nguồn 1 — em tự tính:** giải bài, ra đáp án, viết `canonical`.
2. **Nguồn 2 — đối chiếu độc lập:** tính lại bằng **một cách khác** để không lặp lại đúng sai lầm cũ. Chọn một trong:
   - Toạ độ hoá và bấm máy tính khoa học ra số thập phân, so với `canonical` (ví dụ `a*sqrt(3)/3` với `a=1` ≈ `0.5774`).
   - Sau khi **kế hoạch 02 (máy chấm/oracle)** xong, dùng engine ký hiệu để tự giải/đối chiếu và đặt `verified_by_engine: true`.
3. **Nếu hai nguồn khớp** ⇒ yên tâm, ghi `verified_by_engine: true` nếu đã dùng engine (chưa dùng thì để `false` hoặc bỏ trống).
4. **Nếu lệch nhau** ⇒ **CỜ ĐỎ**: dừng lại, tìm bài giải tay cẩn thận, ghi lại vào một dòng trong sổ nhật ký nghiên cứu (logbook) "bài X từng lệch, nguyên nhân Y, đã sửa". Chính những dòng cờ đỏ này là bằng chứng quy trình khoa học khi phản biện.

> **Ranh giới sở hữu (§4.4):** engine ký hiệu là **công cụ có sẵn** (công trình trước của nhóm) — ghi nguồn minh bạch, KHÔNG nhận là em phát minh. Phần em bảo vệ: *logic tương đương đáp án*, quy trình đối chiếu kép, và toàn bộ dữ liệu.

## 6. `scale_degree` — bậc co giãn theo cạnh (phục vụ biến đổi rescale ở kế hoạch 05)

Nếu đáp án phụ thuộc cạnh `a`, ghi `scale_degree` = số mũ của `a` trong đáp án:
- Đáp án là **độ dài / khoảng cách** (tỉ lệ với `a^1`) ⇒ `scale_degree: 1`. Ví dụ `a*sqrt(3)/3`.
- Đáp án là **diện tích** (`a^2`) ⇒ `scale_degree: 2`.
- Đáp án là **thể tích** (`a^3`) ⇒ `scale_degree: 3`.
- Đáp án là **số thuần / tỉ số / góc** (không đổi khi phóng to hình) ⇒ `scale_degree: 0` (hoặc bỏ trống).

Vì sao cần? Biến đổi "đổi tỉ lệ cạnh" (§5) sẽ nhân đáp án theo luỹ thừa này (ví dụ `a → 2a` thì thể tích ×`2^3 = 8`). Có `scale_degree`, máy tự tính đáp án biến thể mà không cần em soạn tay lại.

## 7. Checklist nghiệm thu MỘT bài (tự kiểm trước khi lưu)

- [ ] `id` đúng dạng `vsgeo-XXXX`, và **tên file** đúng bằng `<id>.json`.
- [ ] `source.type` ∈ {exam, textbook, synthetic}; `source.ref` đủ để truy vết nguồn.
- [ ] `statement_vi` là lời **đã chuẩn hoá** (không chép nguyên văn), đọc là hiểu, đủ dữ kiện để giải.
- [ ] `answer.type` khớp `tags.answer_form` (hai chỗ này nên giống nhau).
- [ ] `answer.canonical` viết đúng quy ước §4 (dùng `sqrt`, `*`, `/`, không dùng `√`).
- [ ] `answer.human_note` mô tả ngắn "đáp án là đại lượng gì" (giúp người soát tay).
- [ ] Tag đủ: `topic` ≥ 1 nhãn (dùng slug chuẩn §3), `difficulty` ∈ 1..4, `requires_auxiliary_construction` đã cân nhắc.
- [ ] Nếu đề cho toạ độ: `figure.coords_given = true` và liệt kê `figure.points`.
- [ ] Đã đối chiếu đáp án kép (§5); nếu lệch, đã xử lý cờ đỏ và ghi logbook.
- [ ] `scale_degree` đã đặt nếu đáp án phụ thuộc `a`.
- [ ] Chạy `npx tsx research/vsgeo-bench/data/schema/validate.ts` → bài này báo xanh.

## 8. Mục tiêu số lượng theo mốc (§11.2)

- **Hết T1:** ≥ **50 bài** pilot, tất cả validate sạch, phủ đủ các chủ đề chính.
- **Hết T2:** ~**300 bài**, phân bố hợp lý theo chủ đề × độ khó × dạng đáp án × cờ hình phụ.

> **Ghi chú phạm vi:** con số ~**300 bài** là mục tiêu **MỞ RỘNG** (sau vòng trường, hướng tới vòng thành phố). Bản **LÕI cho vòng trường (3 tháng)** chỉ cần **~120–150 bài** validate sạch, phân bố hợp lý là đủ nộp.

Gợi ý cân đối để dữ liệu "đẹp" cho phân tích: đừng dồn hết vào một chủ đề hay một mức khó; cố gắng mỗi chủ đề có bài ở nhiều mức khó, và có cả bài `requires_auxiliary_construction` true lẫn false (để kiểm định H1).

> **Ghi nhớ:** 3 bài `vsgeo-0001..0003` là mẫu anh/chị soạn để em bắt chước. **Từ `vsgeo-0004` trở đi là của em** — đó là phần em đứng tên và bảo vệ.
````

- [ ] **Bước 2: Commit**

```bash
git add research/vsgeo-bench/data/schema/authoring-guide.md
git commit -m "docs(schema): cẩm nang soạn bài cho Em 1 (nguồn, chuẩn hoá, tag, đáp án kép)"
```

---

### Task 5: Ba bài mẫu hoàn chỉnh + test canh mẫu

Ba file JSON mẫu này là **điểm tựa** để Em 1 bắt chước: đủ mọi trường, đa dạng `AnswerType` (surd, rational, plane_eq). Kèm một test nhỏ để nếu sau này ai lỡ sửa hỏng mẫu, test đỏ ngay.

**Files:**
- Create: `research/vsgeo-bench/data/seeds/vsgeo-0001.json`
- Create: `research/vsgeo-bench/data/seeds/vsgeo-0002.json`
- Create: `research/vsgeo-bench/data/seeds/vsgeo-0003.json`
- Test: `research/vsgeo-bench/data/seeds/__tests__/pilot-seeds.test.ts`

- [ ] **Bước 1: Viết test thất bại (canh 3 bài mẫu hợp lệ)**

Tạo file `research/vsgeo-bench/data/seeds/__tests__/pilot-seeds.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateSeed } from "../../schema/problem";

const here = dirname(fileURLToPath(import.meta.url)); // .../data/seeds/__tests__
const seedsDir = join(here, ".."); // .../data/seeds

function docBai(id: string): unknown {
  return JSON.parse(readFileSync(join(seedsDir, `${id}.json`), "utf8"));
}

describe("3 bài pilot mẫu — phải luôn hợp lệ và đúng đa dạng dạng đáp án", () => {
  it("vsgeo-0001 hợp lệ và là dạng surd", () => {
    const res = validateSeed(docBai("vsgeo-0001"));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.seed.answer.type).toBe("surd");
  });

  it("vsgeo-0002 hợp lệ và là dạng rational", () => {
    const res = validateSeed(docBai("vsgeo-0002"));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.seed.answer.type).toBe("rational");
  });

  it("vsgeo-0003 hợp lệ và là dạng plane_eq", () => {
    const res = validateSeed(docBai("vsgeo-0003"));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.seed.answer.type).toBe("plane_eq");
  });
});
```

- [ ] **Bước 2: Chạy test cho thấy FAIL**

Run: `npm test -- pilot-seeds`
Expected: FAIL — `readFileSync` ném lỗi "ENOENT" vì 3 file JSON chưa tồn tại.

- [ ] **Bước 3: Tạo 3 file mẫu**

Tạo `research/vsgeo-bench/data/seeds/vsgeo-0001.json` (đáp án dạng **surd**):

```json
{
  "id": "vsgeo-0001",
  "source": {
    "type": "exam",
    "ref": "THPTQG 2019 - mã 101 - câu 43 (đã chuẩn hoá lời văn)"
  },
  "statement_vi": "Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a. Cạnh SA vuông góc với mặt phẳng đáy và SA = a. Tính khoảng cách từ điểm A đến mặt phẳng (SBD).",
  "figure": { "coords_given": false },
  "answer": {
    "canonical": "a*sqrt(3)/3",
    "type": "surd",
    "human_note": "khoảng cách từ A đến mặt phẳng (SBD)"
  },
  "tags": {
    "topic": ["khoang_cach", "vuong_goc"],
    "answer_form": "surd",
    "difficulty": 3,
    "requires_auxiliary_construction": true
  },
  "solution_ref_vi": "Chọn hệ trục A(0,0,0), B(a,0,0), D(0,a,0), S(0,0,a). Mặt phẳng (SBD) đi qua S, B, D có phương trình x + y + z = a. Khoảng cách từ A(0,0,0) đến mặt này bằng |0-a|/sqrt(3) = a/sqrt(3) = a*sqrt(3)/3.",
  "verified_by_engine": false,
  "scale_degree": 1
}
```

Tạo `research/vsgeo-bench/data/seeds/vsgeo-0002.json` (đáp án dạng **rational**):

```json
{
  "id": "vsgeo-0002",
  "source": {
    "type": "textbook",
    "ref": "SGK Hình học 12 - chương I - bài thể tích khối chóp (biến thể thay số)"
  },
  "statement_vi": "Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh 2. Cạnh SA vuông góc với mặt phẳng đáy và SA = 3. Tính thể tích khối chóp S.ABCD.",
  "figure": { "coords_given": false },
  "answer": {
    "canonical": "4",
    "type": "rational",
    "human_note": "thể tích khối chóp S.ABCD"
  },
  "tags": {
    "topic": ["the_tich"],
    "answer_form": "rational",
    "difficulty": 1,
    "requires_auxiliary_construction": false
  },
  "solution_ref_vi": "Diện tích đáy = 2^2 = 4; chiều cao = SA = 3. Thể tích khối chóp = (1/3)·đáy·cao = (1/3)·4·3 = 4.",
  "verified_by_engine": false,
  "scale_degree": 0
}
```

Tạo `research/vsgeo-bench/data/seeds/vsgeo-0003.json` (đáp án dạng **plane_eq**, đề cho toạ độ):

```json
{
  "id": "vsgeo-0003",
  "source": {
    "type": "synthetic",
    "ref": "tự sinh: ba giao điểm trục toạ độ A(1,0,0), B(0,2,0), C(0,0,3)"
  },
  "statement_vi": "Trong không gian Oxyz, cho ba điểm A(1,0,0), B(0,2,0), C(0,0,3). Viết phương trình mặt phẳng (ABC).",
  "figure": {
    "coords_given": true,
    "points": [
      { "id": "A", "x": 1, "y": 0, "z": 0 },
      { "id": "B", "x": 0, "y": 2, "z": 0 },
      { "id": "C", "x": 0, "y": 0, "z": 3 }
    ]
  },
  "answer": {
    "canonical": "6x+3y+2z-6=0",
    "type": "plane_eq",
    "human_note": "phương trình mặt phẳng (ABC)"
  },
  "tags": {
    "topic": ["toa_do_oxyz"],
    "answer_form": "plane_eq",
    "difficulty": 2,
    "requires_auxiliary_construction": false
  },
  "solution_ref_vi": "Mặt phẳng chắn ba trục có phương trình theo đoạn chắn: x/1 + y/2 + z/3 = 1. Nhân hai vế với 6 được 6x + 3y + 2z = 6, tức 6x + 3y + 2z - 6 = 0.",
  "verified_by_engine": false,
  "scale_degree": 0
}
```

- [ ] **Bước 4: Chạy test PASS + chạy CLI thật**

Run test: `npm test -- pilot-seeds`
Expected: PASS — 3 test xanh.

Chạy luôn máy soi CLI trên thư mục seeds thật:

Run: `npx tsx research/vsgeo-bench/data/schema/validate.ts`
Expected (đại ý):
```
=== Báo cáo kiểm tra seeds (3 file) ===
Hợp lệ: 3
Lỗi:    0

✓ Tất cả 3 bài đều hợp lệ!
```
Và lệnh thoát với mã 0. (Kiểm mã thoát: trên bash chạy `echo $?` → `0`; trên PowerShell chạy `$LASTEXITCODE` → `0`.)

- [ ] **Bước 5: Commit**

```bash
git add research/vsgeo-bench/data/seeds/vsgeo-0001.json research/vsgeo-bench/data/seeds/vsgeo-0002.json research/vsgeo-bench/data/seeds/vsgeo-0003.json research/vsgeo-bench/data/seeds/__tests__/pilot-seeds.test.ts
git commit -m "feat(seeds): 3 bài pilot mẫu (surd/rational/plane_eq) + test canh mẫu hợp lệ"
```

---

## Tiêu chí hoàn thành (Definition of Done)

Ánh xạ tới tiêu chí thành công §13 và mốc §11.2. Hệ con này xong khi:

- [ ] `npm test` xanh toàn bộ (id.test, problem.test, validate.test, pilot-seeds — tổng ~20 test).
- [ ] `npx tsx research/vsgeo-bench/data/schema/validate.ts` chạy được, in báo cáo, thoát mã 0 khi mọi seed hợp lệ và mã 1 khi có lỗi.
- [ ] `problem.ts` xuất `SeedSchema`, `type Seed`, `type Answer`, `type AnswerType`, và hàm `validateSeed()` **khớp từng chữ** với HỢP ĐỒNG KIỂU DỮ LIỆU DÙNG CHUNG (để kế hoạch 02/03 dùng lại được).
- [ ] `id.ts` xuất `makeSeedId` (đệm 0 tới 4 chữ số) và `isValidSeedId`.
- [ ] `authoring-guide.md` có đủ: quy trình 6 bước, bảng slug chủ đề, bảng ví dụ mỗi `AnswerType`, quy trình đáp án kép §3.5, và checklist nghiệm thu 1 bài.
- [ ] 3 bài mẫu `vsgeo-0001..0003` hoàn chỉnh, đa dạng dạng đáp án, đều validate sạch.
- [ ] **Mốc T1 (Em 1 tiếp tục sau khi hạ tầng xong):** ≥ **50 bài** pilot validate sạch (§11.2).
- [ ] **Mốc T2:** ~**300 bài** validate sạch, phân bố hợp lý theo chủ đề × độ khó × dạng đáp án × cờ hình phụ (§13 "mức đủ nộp": 300 bài có đáp án chuẩn).

> **Ghi chú phạm vi (vòng trường 3 tháng):** mốc **LÕI** để nộp vòng trường là **~120–150 bài** validate sạch; con số **~300 bài** ở hai mốc trên là mục tiêu **MỞ RỘNG** sau vòng trường (hướng vòng thành phố).

---

## Bảng thuật ngữ

| Thuật ngữ | Nghĩa dễ hiểu |
|-----------|----------------|
| **schema** | "Khuôn mẫu" mô tả một bài hợp lệ phải có những trường gì, kiểu gì. |
| **zod** | Thư viện TypeScript để khai báo schema và kiểm dữ liệu lúc chạy; từ schema rút được luôn kiểu TS. |
| **seed** | Một bài toán gốc do người soạn (phân biệt với *instance* = biến thể sinh ra để chấm). |
| **validate / máy soi** | Kiểm một dữ liệu có khớp schema không; ở đây là hàm `validateSeed` và CLI `validate.ts`. |
| **CLI** | Command-Line Interface — chương trình chạy bằng một dòng lệnh trong terminal. |
| **tsx** | Công cụ chạy thẳng file TypeScript như một script (không cần biên dịch trước). Cài ở kế hoạch 00. |
| **vitest** | Bộ chạy test của dự án; `npm test` gọi nó. |
| **canonical** | Dạng "chuẩn" của đáp án (ví dụ `a*sqrt(6)/3`) để máy chấm so khớp nhất quán. |
| **AnswerType** | Loại đáp án: rational, surd, ratio, point, vector, plane_eq, line_eq, boolean, mcq. |
| **đáp án chuẩn kép** | Mỗi bài được xác nhận đáp án bằng hai nguồn độc lập; lệch nhau ⇒ cờ đỏ, xử lý tay (§3.5). |
| **scale_degree** | Bậc luỹ thừa của cạnh `a` trong đáp án (độ dài 1, diện tích 2, thể tích 3); phục vụ biến đổi rescale. |
| **process.exit(mã)** | Kết thúc chương trình với một mã số; `0` = thành công, khác `0` = có lỗi. |
| **.strict()** | Chế độ zod chặn trường lạ (gõ sai tên trường), giúp bắt lỗi chính tả sớm. |

---

## Em sẽ bảo vệ được gì trước hội đồng

- **Thiết kế dữ liệu có kỷ luật (data engineering):** em định nghĩa một *schema* chặt và một *công cụ kiểm tra tự động* — chứng minh dữ liệu 300 bài không tuỳ tiện mà tuân theo một chuẩn kiểm được bằng máy. Đây là năng lực kỹ thuật dữ liệu thực thụ.
- **Quy trình đảm bảo chất lượng (QA) & liêm chính khoa học:** quy trình *đáp án chuẩn kép* (§3.5) và checklist nghiệm thu cho thấy em có cơ chế phát hiện–xử lý sai sót, và ghi lại cờ đỏ — bằng chứng trung thực khi phản biện.
- **Hiểu bài toán miền (domain):** bảng phân loại chủ đề/độ khó/hình phụ và cách viết `canonical` cho từng dạng đáp án thể hiện em nắm chắc hình học không gian THPT lẫn cách "số hoá" nó cho máy chấm.
- **Ranh giới sở hữu rõ ràng:** em phân định được đâu là *công cụ có sẵn* (engine, ghi nguồn) và đâu là *công sức của mình* (toàn bộ 300 bài + schema + quy trình) — đúng yêu cầu liêm chính của ViSEF.
