# Máy chấm Oracle — Kế hoạch triển khai

> **Cho người thực thi (agentic worker):** REQUIRED SUB-SKILL: dùng superpowers:subagent-driven-development hoặc superpowers:executing-plans để làm theo từng Task. Các bước dùng checkbox `- [ ]` để theo dõi.

**Mục tiêu:** **Máy chấm oracle là sản phẩm cờ-lõi (flagship artifact) của cả đề tài** — thứ trực tiếp bảo vệ học sinh khỏi lời giải AI "trôi chảy nhưng sai" khi tự học Toán. Xây một "máy chấm tự động" (oracle) nhận đáp án THÔ do model AI viết ra + đáp án chuẩn của bài, rồi phán **correct / incorrect / unsure** bằng cách so khớp KÝ HIỆU CHÍNH XÁC (căn thức, phân số, tọa độ, phương trình mặt), dùng lại engine ký hiệu có sẵn của repo làm công cụ (design.md §4).

**Kiến trúc:** Một chuỗi (pipeline) nhiều lớp, mỗi lớp một file trong `research/vsgeo-bench/grader/`: **trích** đáp án ra khỏi văn bản dài → **chuẩn hóa** chuỗi đáp án về một dạng máy so được → **so tương đương** theo từng loại đáp án → **điều phối** trả phán quyết. Cộng thêm một công cụ **tự kiểm định** (self-check) để chứng minh máy chấm đáng tin. Engine `api/_lib/kernel/exactForm.ts` và `scalar.ts` chỉ được **dùng lại** (ghi nguồn), còn logic tương đương là phần 2 em tự viết và phải bảo vệ được (design.md §4.4).

**Công nghệ:** TypeScript (ESM) · vitest (chạy test) · tsx (chạy script CLI) · engine ký hiệu có sẵn (`toExactForm`, `makeExact`, `displayExact`). Không thư viện ngoài nào khác.

> **Phạm vi cho vòng trường (3 tháng):** LÕI toàn bộ — máy chấm chính là **NGÔI SAO** của đề tài nên phải làm cho thật chắc và chất lượng cao: đủ cả năm lớp (trích → chuẩn hóa → so tương đương → điều phối `grade()` → tự kiểm định precision/recall), test xanh 100%, đạt precision ≥ 0.95 trên mẫu chấm tay. Để dành **MỞ RỘNG** (sau vòng trường): thêm các dạng đáp án hiếm (vd đường thẳng tham số/chính tắc) khi thực sự cần.

---

## Dành cho 2 em (đọc trước)

Chào 2 em! Đây là **trái tim phương pháp luận** của cả đề tài — nếu hội đồng hỏi "làm sao các em biết AI trả lời đúng hay sai?", câu trả lời chính là cái máy chấm này. Hãy đọc kỹ phần này trước khi gõ dòng code nào.

**Máy chấm (oracle) là gì?** Khi ta hỏi một model AI (GPT, Gemini, Claude…) một bài hình không gian, nó trả về một đoạn văn dài loằng ngoằng, và ở cuối có một đáp án, ví dụ nó viết `\boxed{\dfrac{\sqrt{6}}{3}}`. Bài của ta có đáp án chuẩn là `√6/3`. Hai chuỗi này **nhìn khác nhau** nhưng **cùng một con số** (≈ 0.8165). Con người nhìn phát biết ngay, nhưng ta có hàng **nghìn** lượt chấm (300 bài × nhiều model × nhiều lần chạy × nhiều biến thể) — không thể ngồi chấm tay hết. Máy chấm là một chương trình tự làm việc đó: nhận (đáp án thô của model, đáp án chuẩn) → trả về một trong ba phán quyết:

- `correct` — đúng (tương đương đáp án chuẩn),
- `incorrect` — sai rõ ràng,
- `unsure` — máy **không dám chắc** (đáp án khó đọc, dạng lạ) → đánh dấu để người soát tay. Đây là điểm liêm chính: **thà nói "không chắc" còn hơn đoán bừa** (design.md §4.3).

**Vì sao khó, vì sao cần một engine?** Chấm đáp án "mở" (không phải trắc nghiệm A/B/C/D) rất khó vì một con số có vô số cách viết: `√6/3` = `sqrt(6)/3` = `0.8164` = `căn 6 / 3`. Muốn so được, ta phải **quy chúng về cùng một con số**, rồi hỏi engine: "con số này viết dạng SGK chuẩn là gì?". Engine ký hiệu `toExactForm` làm đúng việc đó: đưa vào số `0.8165`, nó trả về chuỗi `"√6/3"`. Ta **không phát minh** lại engine (nó là công trình có sẵn của nhóm) — ta **dùng lại và ghi nguồn**. Nhưng **cách ghép nối, cách quyết định "hai đáp án là tương đương"** thì 2 em tự viết và phải giải thích được (design.md §4.4). Đó chính là phần được chấm điểm sáng tạo ở ViSEF.

**Sản phẩm cuối trông thế nào?** Một thư mục `research/vsgeo-bench/grader/` gồm 6 file `.ts` (mỗi file một lớp) + 6 file test. Sau khi xong, em gọi:

```ts
grade('...bài giải dài của AI... \\boxed{\\sqrt{6}/3}', { canonical: '√6/3', type: 'surd' })
// → { verdict: 'correct', canonicalModel: '√6/3', canonicalTruth: '√6/3', reason: '...' }
```

và có một công cụ CLI `selfcheck.ts` để rút mẫu ngẫu nhiên đem chấm tay, rồi tính **precision/recall** chứng minh máy chấm khớp người tới mức nào.

**Ai phụ trách?** **Em 2 (Harness & Phân tích)** là chủ, **phối hợp Em 1** ở phần toán (Em 1 nắm chắc "hai đáp án hình học khi nào là một" — ví dụ phương trình mặt phẳng tương đương sai khác nhân vô hướng). Trong lộ trình 3 tháng lõi (design.md §11.2), việc này nằm ở **Tháng 1 → Tháng 2 (T1 → T2)**: T1 cần "chấm tự động chạy trên 50 bài, khớp tay ≥ ngưỡng", đây chính là kế hoạch làm ra cái đó.

**Phụ thuộc kế hoạch nào?** Cần làm **sau**:
- **Kế hoạch 00** (khởi tạo) — đã thêm `tsx` vào `devDependencies` và dựng khung thư mục. Nếu chưa có `tsx`, Task 6 sẽ nhắc cài.
- **Kế hoạch 01** (schema & seed) — cung cấp kiểu `Seed`/`Answer` và vài bài mẫu để thử. Máy chấm **dùng** kiểu `Answer` từ hợp đồng dùng chung; ta khai báo lại `Answer` trong `grader/types.ts` để `grader/` tự đứng được (không phụ thuộc vòng vào `data/schema/`).

> **Quy ước trong kế hoạch này:** mọi đường dẫn đều tính từ gốc repo. Lệnh chạy test một file: `npx vitest run <đường-dẫn-file-test>`. Lệnh chạy tất cả: `npm test`. Chế độ theo dõi (tự chạy lại khi lưu): `npm run test:watch`. Ký hiệu căn engine dùng là chữ **√** (U+221A), không phải chữ "sqrt".

---

## Task 0: Kiểm tra tiền quyết — vitest đã quét thư mục research

**Vì sao ở đây:** để `npm test` chạy được test của grader, `vitest.config.ts` phải có glob `research/vsgeo-bench/**/*.test.ts` trong trường `include`. Việc thêm glob này **đã do Kế hoạch 00 làm** — kế hoạch này KHÔNG sửa `vitest.config.ts` nữa (tránh trùng với Kế hoạch 00).

- [ ] **Kiểm tra nhanh (không sửa gì).** Bình thường không phải làm gì ở bước này. Chỉ khi sau này chạy `npm test` mà thấy báo `No test files found` cho thư mục research, đó là dấu hiệu glob chưa có → quay lại **Kế hoạch 00** thêm nó rồi tiếp tục.

---

## Task 1: Kiểu dữ liệu nền — `grader/types.ts`

**Mục tiêu Task:** khai báo đúng các kiểu trong HỢP ĐỒNG DÙNG CHUNG (`Answer`, `AnswerType`, `Verdict`, `GradeResult`) cộng `EvalRecord` (cần cho self-check), kèm vài hằng/hàm **có thể chạy được** để viết test kiểm chứng. (Kiểu thuần TypeScript không "chạy" được nên không test trực tiếp; ta thêm một mảng hằng `ALL_ANSWER_TYPES` và hàm `isAnswerType` để có thứ mà test.)

**Files:**
- Create: `research/vsgeo-bench/grader/types.ts`
- Test: `research/vsgeo-bench/grader/__tests__/types.test.ts`

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/grader/__tests__/types.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import { ALL_ANSWER_TYPES, ALL_VERDICTS, isAnswerType } from '../types';

  describe('Kiểu nền của máy chấm', () => {
    it('có đủ 9 loại đáp án theo hợp đồng dùng chung', () => {
      expect(ALL_ANSWER_TYPES).toEqual([
        'rational', 'surd', 'ratio', 'point', 'vector',
        'plane_eq', 'line_eq', 'boolean', 'mcq',
      ]);
    });

    it('có đúng 3 phán quyết', () => {
      expect(ALL_VERDICTS).toEqual(['correct', 'incorrect', 'unsure']);
    });

    it('isAnswerType nhận loại hợp lệ và loại chuỗi lạ', () => {
      expect(isAnswerType('surd')).toBe(true);
      expect(isAnswerType('plane_eq')).toBe(true);
      expect(isAnswerType('banana')).toBe(false);
      expect(isAnswerType('')).toBe(false);
    });
  });
  ```
- [ ] **Bước 2 — Chạy test cho thấy FAIL.**
  ```bash
  npx vitest run research/vsgeo-bench/grader/__tests__/types.test.ts
  ```
  Mong đợi: FAIL với thông báo đại loại `Failed to load ... Cannot find module '../types'` (vì `types.ts` chưa tồn tại). Đó là điều ta muốn: test đỏ trước.
- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/grader/types.ts`:
  ```ts
  // grader/types.ts
  // Các kiểu này phải TRÙNG TÊN với "HỢP ĐỒNG DÙNG CHUNG" của dự án, để các hệ con
  // (harness, perturbations, analysis) khớp nhau. Ta khai báo lại ở đây (không import từ
  // data/schema) để thư mục grader/ tự đứng được khi tách ra repo công khai (design.md §14).

  /** 9 dạng đáp án mà máy chấm phải xử lý (design.md §3.4). */
  export type AnswerType =
    | 'rational'   // số hữu tỉ, vd 3/2
    | 'surd'       // biểu thức căn, vd √6/3
    | 'ratio'      // tỉ số, vd 1:2
    | 'point'      // tọa độ điểm, vd (1,2,3)
    | 'vector'     // vector, vd (0,1,-2)
    | 'plane_eq'   // phương trình mặt phẳng, vd x+2y-2z+3=0
    | 'line_eq'    // phương trình đường thẳng
    | 'boolean'    // đúng/sai
    | 'mcq';       // trắc nghiệm A/B/C/D

  /** Phán quyết của máy chấm cho một lượt chấm. */
  export type Verdict = 'correct' | 'incorrect' | 'unsure';

  /** Đáp án chuẩn của một bài (khớp answer.canonical ở design.md §3.3). */
  export interface Answer {
    canonical: string;      // dạng chuẩn để oracle so khớp, vd "√6/3", "(1,2,3)"
    type: AnswerType;
    human_note?: string;    // ghi chú người đọc, vd "khoảng cách từ A đến (SBD)"
  }

  /** Kết quả một lần chấm — thứ mà hàm grade() trả về. */
  export interface GradeResult {
    verdict: Verdict;
    canonicalModel?: string;  // dạng chuẩn của đáp án model (nếu đọc được)
    canonicalTruth?: string;  // dạng chuẩn của đáp án đúng
    reason: string;           // giải thích BẰNG TIẾNG VIỆT vì sao ra phán quyết đó
  }

  /** Một dòng log kết quả (JSONL). Self-check đọc lại các bản ghi này. */
  export interface EvalRecord {
    seedId: string;
    modelId: string;
    run: number;
    promptStyle: 'zero_shot' | 'cot';
    rawOutput: string;
    extractedAnswer: string | null;
    verdict: Verdict;
    latencyMs: number;
    costUsd?: number;
    perturbation?: { kind: string; parentSeedId: string };
  }

  /** Danh sách chạy được để test & để lặp. Thứ tự cố định. */
  export const ALL_ANSWER_TYPES: AnswerType[] = [
    'rational', 'surd', 'ratio', 'point', 'vector',
    'plane_eq', 'line_eq', 'boolean', 'mcq',
  ];

  export const ALL_VERDICTS: Verdict[] = ['correct', 'incorrect', 'unsure'];

  /** Kiểm tra một chuỗi bất kỳ có phải là AnswerType hợp lệ không (type guard). */
  export function isAnswerType(x: string): x is AnswerType {
    return (ALL_ANSWER_TYPES as string[]).includes(x);
  }
  ```
- [ ] **Bước 4 — Chạy test PASS.**
  ```bash
  npx vitest run research/vsgeo-bench/grader/__tests__/types.test.ts
  ```
  Mong đợi: `Test Files  1 passed`, `Tests  3 passed`.
- [ ] **Bước 5 — Commit.**
  ```bash
  git add research/vsgeo-bench/grader/types.ts research/vsgeo-bench/grader/__tests__/types.test.ts
  git commit -m "feat(grader): kiểu nền Answer/Verdict/GradeResult/EvalRecord"
  ```

---

## Task 2: Lớp trích đáp án — `grader/extract.ts`

**Mục tiêu Task:** viết `extractBoxed(raw)` lấy **biểu thức trong `\boxed{...}` cuối cùng** của một output dài (models thường kết luận bằng `\boxed{...}`). Nếu không có `\boxed`, thử tìm dòng bắt đầu bằng `Đáp án:` / `Kết luận:` / `Answer:`. Không tìm được → trả `null` (design.md §4.2 lớp 1 "Trích đáp án").

**Vì sao lấy cái CUỐI CÙNG:** trong lời giải, model có thể viết `\boxed{...}` nhiều lần (nháp giữa chừng) rồi chốt ở cuối. Đáp án thật là cái cuối. Ta cũng phải đếm ngoặc `{ }` lồng nhau, vì bên trong LaTeX hay có `\dfrac{a}{b}` (nhiều cặp ngoặc).

**Files:**
- Create: `research/vsgeo-bench/grader/extract.ts`
- Test: `research/vsgeo-bench/grader/__tests__/extract.test.ts`

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/grader/__tests__/extract.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import { extractBoxed } from '../extract';

  describe('extractBoxed — trích đáp án cuối cùng', () => {
    it('lấy nội dung trong \\boxed{...} đơn giản', () => {
      expect(extractBoxed('Vậy đáp số là \\boxed{√6/3}.')).toBe('√6/3');
    });

    it('lấy \\boxed CUỐI CÙNG khi có nhiều cái', () => {
      const raw = 'Thử \\boxed{1/2} nhưng sai. Tính lại: \\boxed{√6/3}';
      expect(extractBoxed(raw)).toBe('√6/3');
    });

    it('đếm đúng ngoặc lồng nhau trong LaTeX', () => {
      const raw = 'Kết quả \\boxed{\\dfrac{\\sqrt{6}}{3}} là đáp án.';
      expect(extractBoxed(raw)).toBe('\\dfrac{\\sqrt{6}}{3}');
    });

    it('không có boxed → fallback dòng "Đáp án:"', () => {
      const raw = 'Lời giải dài...\nĐáp án: (1, 2, 3)\nHết.';
      expect(extractBoxed(raw)).toBe('(1, 2, 3)');
    });

    it('fallback nhận cả "Kết luận:" và "Answer:"', () => {
      expect(extractBoxed('...\nKết luận: đúng')).toBe('đúng');
      expect(extractBoxed('...\nAnswer: C')).toBe('C');
    });

    it('không tìm thấy gì → null', () => {
      expect(extractBoxed('Một đoạn văn không có đáp án rõ ràng.')).toBeNull();
      expect(extractBoxed('')).toBeNull();
    });

    it('boxed thiếu ngoặc đóng → coi như không hợp lệ, trả null', () => {
      expect(extractBoxed('Hỏng \\boxed{√6/3')).toBeNull();
    });
  });
  ```
- [ ] **Bước 2 — Chạy test cho thấy FAIL.**
  ```bash
  npx vitest run research/vsgeo-bench/grader/__tests__/extract.test.ts
  ```
  Mong đợi: FAIL — `Cannot find module '../extract'`.
- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/grader/extract.ts`:
  ```ts
  // grader/extract.ts
  // Lớp 1 của oracle (design.md §4.2): kéo đáp án ra khỏi văn bản dài của model.

  /**
   * Trả về nội dung trong \boxed{...} XUẤT HIỆN CUỐI CÙNG (đã cân ngoặc lồng nhau).
   * Nếu không có \boxed hợp lệ, thử dòng "Đáp án:" / "Kết luận:" / "Answer:" / "ĐS:" cuối cùng.
   * Không có gì → null (KHÔNG đoán bừa).
   */
  export function extractBoxed(raw: string): string | null {
    const KEY = '\\boxed{';
    let last: string | null = null;
    let searchFrom = 0;

    // Duyệt mọi lần xuất hiện của "\boxed{", giữ lại cái cuối cùng ĐÓNG NGOẶC CÂN.
    while (true) {
      const start = raw.indexOf(KEY, searchFrom);
      if (start === -1) break;
      let i = start + KEY.length;
      let depth = 1;        // đã mở 1 ngoặc "{" của \boxed
      let out = '';
      while (i < raw.length && depth > 0) {
        const c = raw[i];
        if (c === '{') depth++;
        else if (c === '}') {
          depth--;
          if (depth === 0) break;   // gặp "}" đóng của \boxed → dừng, KHÔNG thêm nó vào out
        }
        out += c;
        i++;
      }
      if (depth === 0) last = out.trim();   // chỉ nhận khi ngoặc đóng cân
      searchFrom = start + KEY.length;      // tìm tiếp cái sau
    }
    if (last !== null) return last;

    // Fallback: quét từ dưới lên, tìm dòng mở đầu bằng nhãn đáp án.
    const lines = raw.split(/\r?\n/);
    for (let k = lines.length - 1; k >= 0; k--) {
      const m = lines[k].match(/^\s*(?:Đáp\s*án|Kết\s*luận|Answer|ĐS)\s*[:：]\s*(.+)$/i);
      if (m) return m[1].trim();
    }
    return null;
  }
  ```
  Ghi chú: `[:：]` nhận cả dấu hai chấm thường và dấu hai chấm toàn-hình (fullwidth) mà bàn phím tiếng Việt đôi khi gõ ra. `depth === 0` sau vòng trong nghĩa là đã gặp `}` đóng; nếu văn bản hết mà `depth > 0` (thiếu ngoặc đóng) thì `last` không được gán → trả null cho ca hỏng.
- [ ] **Bước 4 — Chạy test PASS.**
  ```bash
  npx vitest run research/vsgeo-bench/grader/__tests__/extract.test.ts
  ```
  Mong đợi: `Tests  7 passed`.
- [ ] **Bước 5 — Commit.**
  ```bash
  git add research/vsgeo-bench/grader/extract.ts research/vsgeo-bench/grader/__tests__/extract.test.ts
  git commit -m "feat(grader): extractBoxed trích \\boxed cuối cùng + fallback nhãn đáp án"
  ```

---

## Task 3: Lớp chuẩn hóa — `grader/normalize.ts`

**Mục tiêu Task:** đây là lớp **khó và quan trọng nhất**. Nó biến một chuỗi đáp án "người viết kiểu gì cũng được" thành thứ máy so được:

- **Vô hướng (rational/surd/ratio):** đọc `"sqrt(6)/3"`, `"√6/3"`, `"căn 6/3"`, `"0.8164"`, `"1:2"` → ra một **con số** (float). Ta tự viết một bộ đọc biểu thức nhỏ (mini expression parser). Sau đó engine `toExactForm(số)` cho ra **chuỗi chuẩn kiểu SGK** để so bằng chuỗi; nếu không rút gọn được thì so bằng số với sai số (epsilon) — đúng "dự phòng số học" ở design.md §4.2 lớp 4.
- **Điểm/vector:** đọc `"(1,2,3)"` → mảng số `[1,2,3]`.
- **Mặt phẳng:** đọc `"x+2y-2z+3=0"` → hệ số `{a:1,b:2,c:-2,d:3}`.

**Ghi nguồn (design.md §4.4):** file này `import` engine từ `../../../api/_lib/kernel/exactForm` (hàm `toExactForm`) và `../../../api/_lib/kernel/scalar` (hàm `makeExact`, `displayExact`). Đó là **công cụ có sẵn**. Còn **bộ đọc biểu thức** (`toEvalString` + `evalExpr`) và các bộ đọc điểm/mặt là **do 2 em viết** — phải giải thích được.

**Files:**
- Create: `research/vsgeo-bench/grader/normalize.ts`
- Test: `research/vsgeo-bench/grader/__tests__/normalize.test.ts`

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/grader/__tests__/normalize.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import {
    parseScalar, canonicalScalar, parsePoint, parsePlane, parseRatioExact,
  } from '../normalize';

  describe('parseScalar — đọc biểu thức vô hướng về SỐ', () => {
    it('đọc phân số và thập phân', () => {
      expect(parseScalar('1/2')).toBeCloseTo(0.5, 10);
      expect(parseScalar('0.8164')).toBeCloseTo(0.8164, 10);
      expect(parseScalar('3/2')).toBeCloseTo(1.5, 10);
    });

    it('đọc căn viết bằng "sqrt", "√" và "căn"', () => {
      expect(parseScalar('sqrt(6)/3')).toBeCloseTo(Math.sqrt(6) / 3, 10);
      expect(parseScalar('√6/3')).toBeCloseTo(Math.sqrt(6) / 3, 10);
      expect(parseScalar('căn 6 / 3')).toBeCloseTo(Math.sqrt(6) / 3, 10);
    });

    it('hiểu phép nhân ngầm: 2√3 = 2*sqrt(3)', () => {
      expect(parseScalar('2√3')).toBeCloseTo(2 * Math.sqrt(3), 10);
      expect(parseScalar('sqrt(12)')).toBeCloseTo(Math.sqrt(12), 10);
    });

    it('thay biến chữ (vd a) bằng giá trị dò mặc định 1', () => {
      expect(parseScalar('a*sqrt(6)/3')).toBeCloseTo(Math.sqrt(6) / 3, 10);
    });

    it('đọc dấu ":" của tỉ số như phép chia', () => {
      expect(parseScalar('1:2')).toBeCloseTo(0.5, 10);
    });

    it('chuỗi rác → null', () => {
      expect(parseScalar('không phải số')).toBeNull();
      expect(parseScalar('')).toBeNull();
      expect(parseScalar('1/0')).toBeNull(); // vô cực → không hợp lệ
    });
  });

  describe('canonicalScalar — quy về chuỗi chuẩn của engine', () => {
    it('các cách viết cùng một số cho cùng chuỗi chuẩn', () => {
      expect(canonicalScalar('√6/3')).toBe('√6/3');
      expect(canonicalScalar('sqrt(6)/3')).toBe('√6/3');
      expect(canonicalScalar('2√3')).toBe('2√3');
      expect(canonicalScalar('sqrt(12)')).toBe('2√3');
      expect(canonicalScalar('1/2')).toBe('1/2');
      expect(canonicalScalar('0.5')).toBe('1/2');
    });
    it('đọc được LaTeX model hay xuất: \\dfrac{\\sqrt{6}}{3}', () => {
      // \boxed thường bọc LaTeX; phần này kiểm bộ khử LaTeX lồng ngoặc trong toEvalString.
      expect(canonicalScalar('\\dfrac{\\sqrt{6}}{3}')).toBe('√6/3');
      expect(canonicalScalar('\\frac{1}{\\sqrt{2}}')).toBe('√2/2');
      expect(canonicalScalar('2\\sqrt{3}')).toBe('2√3');
    });
    it('chuỗi rác → null', () => {
      expect(canonicalScalar('xyz')).toBeNull();
    });
  });

  describe('parsePoint — đọc tọa độ điểm/vector', () => {
    it('đọc "(1,2,3)" và "(1, 2, 3)" như nhau', () => {
      expect(parsePoint('(1,2,3)')).toEqual([1, 2, 3]);
      expect(parsePoint('(1, 2, 3)')).toEqual([1, 2, 3]);
    });
    it('bỏ được ngoặc vuông/nhọn và có thành phần căn', () => {
      const p = parsePoint('[0, √3/2, 0]');
      expect(p).not.toBeNull();
      expect(p![1]).toBeCloseTo(Math.sqrt(3) / 2, 10);
    });
    it('chuỗi rác → null', () => {
      expect(parsePoint('abc')).toBeNull();
    });
  });

  describe('parsePlane — đọc hệ số phương trình mặt phẳng', () => {
    it('đọc "x+2y-2z+3=0"', () => {
      expect(parsePlane('x+2y-2z+3=0')).toEqual({ a: 1, b: 2, c: -2, d: 3 });
    });
    it('đọc bản đã nhân đôi "2x+4y-4z+6=0"', () => {
      expect(parsePlane('2x+4y-4z+6=0')).toEqual({ a: 2, b: 4, c: -4, d: 6 });
    });
    it('không có biến nào → null', () => {
      expect(parsePlane('3=0')).toBeNull();
    });
  });

  describe('parseRatioExact — rút gọn tỉ số nguyên bằng engine scalar', () => {
    it('1:2 và 2/4 cùng rút về "1/2"', () => {
      expect(parseRatioExact('1:2')).toBe('1/2');
      expect(parseRatioExact('2/4')).toBe('1/2');
    });
    it('không phải tỉ số nguyên → null', () => {
      expect(parseRatioExact('√6/3')).toBeNull();
    });
  });
  ```
- [ ] **Bước 2 — Chạy test cho thấy FAIL.**
  ```bash
  npx vitest run research/vsgeo-bench/grader/__tests__/normalize.test.ts
  ```
  Mong đợi: FAIL — `Cannot find module '../normalize'`.
- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/grader/normalize.ts`:
  ```ts
  // grader/normalize.ts
  // Lớp 2 của oracle (design.md §4.2): chuẩn hóa chuỗi đáp án về dạng máy so được.
  //
  // NGUỒN CÔNG CỤ (design.md §4.4): toExactForm, makeExact, displayExact là ENGINE KÝ HIỆU
  // có sẵn của repo (api/_lib/kernel). Ta DÙNG LẠI, không viết lại số học chính xác.
  // Phần 2 em tự viết & phải bảo vệ: bộ đọc biểu thức (toEvalString + evalExpr) và các
  // bộ đọc điểm/mặt phẳng bên dưới.
  import { toExactForm } from '../../../api/_lib/kernel/exactForm';
  import { makeExact, displayExact } from '../../../api/_lib/kernel/scalar';

  // Sai số cho so sánh SỐ khi không rút gọn được về chuỗi chuẩn (dự phòng số học §4.2).
  // 1e-3 đủ rộng để chấp nhận đáp án model làm tròn 3–4 chữ số thập phân,
  // nhưng đủ chặt để loại đáp án sai thật (vd 0.82 vs 0.8165).
  export const SCALAR_EPS = 1e-3;
  // Sai số so từng tọa độ điểm/vector (tọa độ model thường làm tròn).
  export const POINT_EPS = 1e-3;

  // ---------------------------------------------------------------------------
  // (A) BỘ ĐỌC BIỂU THỨC VÔ HƯỚNG — phần 2 em tự viết.
  // ---------------------------------------------------------------------------

  // Giá trị dò cho BIẾN CẠNH. Đề hình không gian Việt gần như luôn dùng chữ 'a' cho cạnh
  // (vd "cạnh a", đáp án "a√6/3"). Ta chỉ thay 'a' → 1 và GIỮ NGUYÊN mọi chữ khác. Nhờ vậy:
  //   • "a√6/3" đọc được (đáp án theo cạnh),
  //   • nhưng "abc", "xyz" (rác) vẫn còn chữ lạ → evalExpr báo lỗi → null (không nhận nhầm).
  const DEFAULT_PROBE: Record<string, number> = { a: 1 };

  /**
   * Biến chuỗi "người viết" thành chuỗi chỉ gồm số + toán tử + '#' (ký hiệu căn nội bộ),
   * sẵn sàng cho evalExpr. Các bước:
   *  1) bỏ khoảng trắng, thống nhất dấu nhân/chia/hai-chấm.
   *  2) đổi "sqrt", "căn/can", "√" về một ký hiệu tạm '√'.
   *  3) đổi "√..." thành "#(...)" (# = hàm căn của evalExpr).
   *  4) thay biến chữ còn lại bằng giá trị dò (vd a→(1)).
   *  5) chèn dấu '*' cho phép nhân ngầm (vd "2#(3)" → "2*#(3)").
   */
  export function toEvalString(raw: string, probe: Record<string, number> = DEFAULT_PROBE): string {
    let t = raw.trim();
    t = t.replace(/\\left|\\right|\\,|\\!|\\;|\\ /g, ''); // dọn lệnh khoảng cách LaTeX
    t = t.replace(/\s+/g, '');            // bỏ mọi khoảng trắng
    t = t.replace(/[×·⋅]/g, '*');         // dấu nhân lạ → *
    t = t.replace(/[÷:]/g, '/');          // dấu chia lạ & ':' (tỉ số) → /
    t = t.replace(/\\cdot/g, '*');        // \cdot → *
    // \frac / \dfrac dạng RÚT GỌN không ngoặc: bọc từng đối số MỘT-KÝ-TỰ vào {} để vòng lặp
    // khử bên dưới xử lý được (vd model hay viết "\frac12" thay vì "\frac{1}{2}").
    //   \frac12 → \frac{1}2 → \frac{1}{2};  \frac1{2} → \frac{1}{2};  \frac{1}2 → \frac{1}{2}.
    // Chạy 2 lượt: lượt 1 bọc đối số thứ nhất, lượt 2 bọc đối số thứ hai. Dạng đã có {} lồng
    // (vd \dfrac{\sqrt{6}}{3}) KHÔNG khớp [0-9a-zA-Z] ngay sau \frac/} nên không bị đụng tới.
    for (let k = 0; k < 2; k++) {
      t = t.replace(/(\\d?frac)([0-9a-zA-Z])/g, '$1{$2}');            // đối số 1 trần → {…}
      t = t.replace(/(\\d?frac\{[^{}]*\})([0-9a-zA-Z])/g, '$1{$2}');  // đối số 2 trần → {…}
    }
    // Khử LaTeX TỪ TRONG RA NGOÀI: lặp tới khi ổn định. Nhờ đổi \sqrt{X} → √(X) (ngoặc tròn,
    // KHÔNG phải {}), lần lặp sau \dfrac{√(6)}{3} mới khớp được [^{}]* (nhóm không còn '{}').
    // Đây là mấu chốt để xử lý ĐÚNG \dfrac{\sqrt{6}}{3} — dạng model AI hay xuất ra.
    let prev: string;
    do {
      prev = t;
      t = t.replace(/\\sqrt\{([^{}]*)\}/g, '√($1)');            // \sqrt{6} → √(6)
      t = t.replace(/\\sqrt(\d+(?:\.\d+)?)/g, '√($1)');         // \sqrt6  → √(6)
      t = t.replace(/\\d?frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))'); // \dfrac & \frac
    } while (t !== prev);
    t = t.replace(/[\\{}]/g, '');         // dọn ký tự LaTeX còn sót

    t = t.replace(/sqrt/gi, '√');         // "sqrt" dạng chữ → √
    t = t.replace(/căn|can/gi, '√');      // "căn" tiếng Việt → √

    // "√(...)" đã có ngoặc; "√<số>" hoặc "√<chữ>" thêm ngoặc. Dùng '#' làm token hàm căn.
    t = t.replace(/√\(/g, '#(');
    t = t.replace(/√(\d+(?:\.\d+)?)/g, '#($1)');
    t = t.replace(/√([a-zA-Z])/g, '#($1)');

    // Thay chữ CÓ trong probe (mặc định chỉ 'a') bằng giá trị dò; GIỮ NGUYÊN chữ lạ để
    // chuỗi rác còn ký tự không hợp lệ → evalExpr trả null. '#' không phải chữ nên an toàn.
    t = t.replace(/[a-zA-Z]/g, (ch) => {
      const key = ch.toLowerCase();
      return key in probe ? `(${probe[key]})` : ch;
    });

    // Phép nhân ngầm: số/')' đứng trước '(' hoặc '#'  →  chèn '*'
    t = t.replace(/([0-9)])(?=[(#])/g, '$1*');
    // ')' đứng trước số → chèn '*'  (vd "(1)2" hiếm gặp nhưng chặn cho chắc)
    t = t.replace(/(\))(?=[0-9])/g, '$1*');
    return t;
  }

  /**
   * Máy tính biểu thức đệ quy (recursive-descent). Ngữ pháp:
   *   expr := term (('+'|'-') term)*
   *   term := factor (('*'|'/') factor)*
   *   factor := ('-'|'+')? primary ('^' factor)?      (^ kết hợp phải)
   *   primary := number | '#' '(' expr ')' | '(' expr ')'
   * Trả về số, hoặc null nếu chuỗi không hợp lệ / kết quả vô cực-NaN.
   */
  export function evalExpr(s: string): number | null {
    let i = 0;

    function parseExpr(): number {
      let v = parseTerm();
      while (i < s.length && (s[i] === '+' || s[i] === '-')) {
        const op = s[i++];
        const r = parseTerm();
        v = op === '+' ? v + r : v - r;
      }
      return v;
    }
    function parseTerm(): number {
      let v = parseFactor();
      while (i < s.length && (s[i] === '*' || s[i] === '/')) {
        const op = s[i++];
        const r = parseFactor();
        v = op === '*' ? v * r : v / r;
      }
      return v;
    }
    function parseFactor(): number {
      if (s[i] === '-') { i++; return -parseFactor(); }
      if (s[i] === '+') { i++; return parseFactor(); }
      let v = parsePrimary();
      if (i < s.length && s[i] === '^') {
        i++;
        const e = parseFactor();  // kết hợp phải
        v = Math.pow(v, e);
      }
      return v;
    }
    function parsePrimary(): number {
      if (s[i] === '#') {               // hàm căn
        i++;
        if (s[i] !== '(') throw new Error('căn thiếu (');
        i++;
        const inner = parseExpr();
        if (s[i] !== ')') throw new Error('thiếu )');
        i++;
        return Math.sqrt(inner);
      }
      if (s[i] === '(') {
        i++;
        const v = parseExpr();
        if (s[i] !== ')') throw new Error('thiếu )');
        i++;
        return v;
      }
      // Đọc MỘT số hợp lệ: tùy chọn phần nguyên, tối đa MỘT dấu chấm, phần thập phân. Nhờ vậy
      // "1.5.2" chỉ nuốt "1.5" rồi dừng, để lại ".2" → parseExpr thấy dư ký tự → trả null
      // (bản cũ nuốt cả "1.5.2" bằng lớp ký tự [0-9.] rồi parseFloat ra 1.5 — chấp nhận SAI).
      const numMatch = /^\d*\.?\d+/.exec(s.slice(i));
      if (!numMatch) throw new Error('token lạ: ' + (s[i] ?? 'EOF'));
      i += numMatch[0].length;
      return parseFloat(numMatch[0]);
    }

    try {
      if (s.length === 0) return null;
      const v = parseExpr();
      if (i !== s.length) return null;   // còn dư ký tự → chuỗi không hợp lệ
      if (!Number.isFinite(v)) return null;
      return v;
    } catch {
      return null;
    }
  }

  /** Đọc một biểu thức vô hướng bất kỳ về SỐ (float). Rác → null. */
  export function parseScalar(raw: string, probe: Record<string, number> = DEFAULT_PROBE): number | null {
    if (typeof raw !== 'string' || raw.trim() === '') return null;
    return evalExpr(toEvalString(raw, probe));
  }

  /**
   * Quy chuỗi vô hướng về DẠNG CHUẨN của engine (vd "√6/3", "2√3", "1/2").
   * Nếu engine không rút gọn được (isExact=false) vẫn trả chuỗi thập phân của engine,
   * để hàm so sánh còn dùng làm nhãn hiển thị; việc quyết đúng/sai khi đó dựa trên SỐ.
   * Rác → null.
   */
  export function canonicalScalar(raw: string): string | null {
    const n = parseScalar(raw);
    if (n === null) return null;
    return toExactForm(n).text;
  }

  // ---------------------------------------------------------------------------
  // (B) BỘ ĐỌC ĐIỂM / VECTOR — phần 2 em tự viết.
  // ---------------------------------------------------------------------------

  /** Cắt chuỗi theo dấu `sep` nhưng chỉ ở "mặt ngoài" (không cắt bên trong ngoặc). */
  function splitTopLevel(s: string, sep: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let cur = '';
    for (const c of s) {
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') depth--;
      if (c === sep && depth === 0) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map((x) => x.trim()).filter((x) => x.length > 0);
  }

  /** Đọc "(1,2,3)" / "[0, √3/2, 0]" / "1,2,3" → mảng số. Rác → null. */
  export function parsePoint(raw: string): number[] | null {
    let s = raw.trim();
    s = s.replace(/^[([{]/, '').replace(/[)\]}]$/, '');   // bỏ ngoặc bao ngoài (nếu có)
    const parts = splitTopLevel(s, ',');
    if (parts.length === 0) return null;
    const out: number[] = [];
    for (const p of parts) {
      const v = parseScalar(p);
      if (v === null) return null;
      out.push(v);
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // (C) BỘ ĐỌC PHƯƠNG TRÌNH MẶT PHẲNG — phần 2 em tự viết.
  // ---------------------------------------------------------------------------

  /** Tách một vế thành các hạng tử, giữ dấu +/- gắn liền. Vd "x+2y-2z+3" → ["x","+2y","-2z","+3"]. */
  function splitTerms(s: string): string[] {
    const terms: string[] = [];
    let cur = '';
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      // '+'/'-' mở một hạng tử mới, TRỪ khi nó đứng ngay sau toán tử/ngoặc mở (dấu của số).
      if ((c === '+' || c === '-') && cur !== '' && !'*/^('.includes(s[i - 1])) {
        terms.push(cur);
        cur = c;
      } else {
        cur += c;
      }
    }
    if (cur !== '') terms.push(cur);
    return terms;
  }

  /** Đọc một hạng tử → { biến, hệ số }. Biến '' nghĩa là hằng số. Rác → null. */
  function termCoef(term: string): { v: '' | 'x' | 'y' | 'z'; coef: number } | null {
    let sign = 1;
    let t = term;
    while (t[0] === '+' || t[0] === '-') {
      if (t[0] === '-') sign = -sign;
      t = t.slice(1);
    }
    const m = t.match(/[xyz]/);
    if (!m) {
      if (t === '') return { v: '', coef: 0 };
      const val = parseScalar(t);
      return val === null ? null : { v: '', coef: sign * val };
    }
    const v = m[0] as 'x' | 'y' | 'z';
    let coefStr = t.split(v).join('');        // bỏ biến khỏi hạng tử
    coefStr = coefStr.replace(/\*/g, '');     // bỏ dấu '*' dư (vd "2*x")
    let coef: number;
    if (coefStr === '') coef = 1;
    else {
      const p = parseScalar(coefStr);
      if (p === null) return null;
      coef = p;
    }
    return { v, coef: sign * coef };
  }

  /**
   * Đọc "x+2y-2z+3=0" → { a, b, c, d } với a·x+b·y+c·z+d = 0.
   * Hỗ trợ cả khi hai vế đều có hạng tử (chuyển vế phải sang trái bằng dấu trừ).
   * Không có biến x/y/z nào → null (không phải mặt phẳng).
   */
  export function parsePlane(raw: string): { a: number; b: number; c: number; d: number } | null {
    const s = raw.replace(/\s+/g, '');
    const sides = s.split('=');
    if (sides.length > 2) return null;
    const acc = { a: 0, b: 0, c: 0, d: 0 };
    const addSide = (expr: string, sign: number): boolean => {
      for (const term of splitTerms(expr)) {
        const tc = termCoef(term);
        if (tc === null) return false;
        const c = sign * tc.coef;
        if (tc.v === 'x') acc.a += c;
        else if (tc.v === 'y') acc.b += c;
        else if (tc.v === 'z') acc.c += c;
        else acc.d += c;
      }
      return true;
    };
    if (!addSide(sides[0], 1)) return null;
    if (sides.length === 2 && !addSide(sides[1], -1)) return null;
    if (acc.a === 0 && acc.b === 0 && acc.c === 0) return null;
    return acc;
  }

  // ---------------------------------------------------------------------------
  // (D) TỈ SỐ NGUYÊN CHÍNH XÁC — DÙNG engine scalar để rút gọn không sai số float.
  // ---------------------------------------------------------------------------

  /**
   * Nếu chuỗi là tỉ số hai số nguyên "p:q" hoặc "p/q" → rút gọn CHÍNH XÁC bằng makeExact
   * rồi hiển thị bằng displayExact (vd "2/4" → "1/2"). Ngược lại → null.
   * Đây là chỗ dùng lớp số học chính xác của engine (design.md §4.2 lớp 2).
   */
  export function parseRatioExact(raw: string): string | null {
    const s = raw.trim().replace(/\s+/g, '');
    const m = s.match(/^(-?\d+)[:/](-?\d+)$/);
    if (!m) return null;
    const num = BigInt(m[1]);
    const den = BigInt(m[2]);
    if (den === 0n) return null;
    return displayExact(makeExact(num, den, 1));
  }
  ```
- [ ] **Bước 4 — Chạy test PASS.**
  ```bash
  npx vitest run research/vsgeo-bench/grader/__tests__/normalize.test.ts
  ```
  Mong đợi: tất cả nhóm test PASS. Nếu một ca căn lệch, kiểm tra lại thứ tự các bước `replace` trong `toEvalString` (đặc biệt việc đổi `sqrt`/`căn` → `√` phải làm TRƯỚC khi thay biến chữ).
- [ ] **Bước 5 — Commit.**
  ```bash
  git add research/vsgeo-bench/grader/normalize.ts research/vsgeo-bench/grader/__tests__/normalize.test.ts
  git commit -m "feat(grader): chuẩn hóa vô hướng/điểm/mặt phẳng (dùng lại engine ký hiệu)"
  ```

> **Ghi chú toán học cho Em 1 kiểm tra:** việc thay biến chữ `a` bằng `1` (probe) khiến `a√6/3` và đáp án chuẩn `√6/3` cùng ra một số. Hạn chế: nếu hai đáp án chỉ trùng nhau **tình cờ tại a=1** (vd `a` và `a²`) thì có thể báo nhầm "đúng". Với đáp án hình học phổ thông (đơn thức bậc nhất theo cạnh) rủi ro này rất thấp; nếu về sau gặp bài đáp án đa thức theo `a`, ghi vào "câu hỏi mở" và nâng cấp probe thành nhiều giá trị. Đây là một quyết định thiết kế 2 em **phải giải thích được**.

---

## Task 4: Lớp so tương đương — `grader/compare.ts`

**Mục tiêu Task:** với mỗi loại đáp án, viết một hàm `compare*` nhận (đáp án model đã trích, đáp án chuẩn) → trả `Verdict`. Đây là **logic tương đương** — phần lõi 2 em phải bảo vệ (design.md §4.4). Các quy tắc tương đương:

- **Vô hướng:** cùng chuỗi chuẩn của engine **HOẶC** cùng số trong sai số `SCALAR_EPS`.
- **Tỉ số:** thử rút gọn nguyên chính xác trước (`parseRatioExact`), không được thì rơi về vô hướng.
- **Điểm/vector:** cùng số chiều và từng tọa độ khớp trong `POINT_EPS`.
- **Mặt phẳng:** **tương đương sai khác nhân vô hướng khác 0** — tức bộ hệ số `(a,b,c,d)` của hai bên tỉ lệ với nhau (design.md §4.2 lớp 3).
- **Boolean / MCQ:** khớp giá trị đúng/sai, hoặc khớp chữ cái A/B/C/D.

**Files:**
- Create: `research/vsgeo-bench/grader/compare.ts`
- Test: `research/vsgeo-bench/grader/__tests__/compare.test.ts`

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/grader/__tests__/compare.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import {
    compareScalar, compareRatio, comparePoint, comparePlane,
    compareBoolean, compareMcq,
  } from '../compare';

  describe('compareScalar — tương đương vô hướng', () => {
    it('√6/3 == sqrt(6)/3 == 0.8164 đều correct', () => {
      expect(compareScalar('√6/3', '√6/3')).toBe('correct');
      expect(compareScalar('sqrt(6)/3', '√6/3')).toBe('correct');
      expect(compareScalar('0.8164', '√6/3')).toBe('correct');
    });
    it('1/2 == 0.5 correct', () => {
      expect(compareScalar('0.5', '1/2')).toBe('correct');
    });
    it('2√3 == sqrt(12) correct', () => {
      expect(compareScalar('sqrt(12)', '2√3')).toBe('correct');
    });
    it('đáp án sai rõ → incorrect', () => {
      expect(compareScalar('5', '1/2')).toBe('incorrect');
      expect(compareScalar('0.82', '√6/3')).toBe('incorrect'); // lệch > eps
    });
    it('đáp án đọc không ra → unsure', () => {
      expect(compareScalar('không rõ', '1/2')).toBe('unsure');
    });
  });

  describe('compareRatio — tỉ số', () => {
    it('1:2 == 1/2 correct (rút gọn chính xác)', () => {
      expect(compareRatio('1:2', '1/2')).toBe('correct');
      expect(compareRatio('2/4', '1/2')).toBe('correct');
    });
    it('1:3 != 1/2 incorrect', () => {
      expect(compareRatio('1:3', '1/2')).toBe('incorrect');
    });
  });

  describe('comparePoint — điểm/vector', () => {
    it('(1,2,3) == (1, 2, 3) correct', () => {
      expect(comparePoint('(1,2,3)', '(1, 2, 3)')).toBe('correct');
    });
    it('sai một tọa độ → incorrect', () => {
      expect(comparePoint('(1,2,4)', '(1,2,3)')).toBe('incorrect');
    });
    it('khác số chiều → incorrect', () => {
      expect(comparePoint('(1,2)', '(1,2,3)')).toBe('incorrect');
    });
    it('đọc không ra → unsure', () => {
      expect(comparePoint('abc', '(1,2,3)')).toBe('unsure');
    });
  });

  describe('comparePlane — mặt phẳng (sai khác nhân vô hướng)', () => {
    it('x+2y-2z+3=0 == 2x+4y-4z+6=0 correct', () => {
      expect(comparePlane('x+2y-2z+3=0', '2x+4y-4z+6=0')).toBe('correct');
    });
    it('x+2y-2z+3=0 != x+2y-2z-3=0 incorrect', () => {
      expect(comparePlane('x+2y-2z-3=0', 'x+2y-2z+3=0')).toBe('incorrect');
    });
    it('đọc không ra → unsure', () => {
      expect(comparePlane('tào lao', 'x+2y-2z+3=0')).toBe('unsure');
    });
  });

  describe('compareBoolean & compareMcq', () => {
    it('boolean: đúng/sai và true/false', () => {
      expect(compareBoolean('đúng', 'đúng')).toBe('correct');
      expect(compareBoolean('true', 'đúng')).toBe('correct');
      expect(compareBoolean('sai', 'đúng')).toBe('incorrect');
      expect(compareBoolean('hửm?', 'đúng')).toBe('unsure');
    });
    it('mcq: lấy chữ cái A–D', () => {
      expect(compareMcq('C', 'C')).toBe('correct');
      expect(compareMcq('Chọn đáp án B', 'B')).toBe('correct');
      expect(compareMcq('A', 'C')).toBe('incorrect');
      expect(compareMcq('không có chữ cái', 'C')).toBe('unsure');
    });
  });
  ```
- [ ] **Bước 2 — Chạy test cho thấy FAIL.**
  ```bash
  npx vitest run research/vsgeo-bench/grader/__tests__/compare.test.ts
  ```
  Mong đợi: FAIL — `Cannot find module '../compare'`.
- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/grader/compare.ts`:
  ```ts
  // grader/compare.ts
  // Lớp 3 của oracle (design.md §4.2 & §4.3): quyết định "hai đáp án có tương đương không".
  // ĐÂY LÀ LOGIC 2 EM TỰ VIẾT & PHẢI BẢO VỆ (design.md §4.4). Engine chỉ giúp canonical hóa số.
  import { toExactForm } from '../../../api/_lib/kernel/exactForm';
  import type { Verdict } from './types';
  import {
    parseScalar, parsePoint, parsePlane, parseRatioExact,
    SCALAR_EPS, POINT_EPS,
  } from './normalize';

  /** Vô hướng: cùng chuỗi chuẩn engine HOẶC cùng số trong sai số. Đọc không ra → unsure. */
  export function compareScalar(model: string, truth: string): Verdict {
    const t = parseScalar(truth);
    if (t === null) return 'unsure';        // đáp án chuẩn tự nó không đọc được → cần soát
    const m = parseScalar(model);
    if (m === null) return 'unsure';        // model viết khó đọc → không đoán bừa
    if (toExactForm(m).text === toExactForm(t).text) return 'correct';
    // Sai số TƯƠNG ĐỐI theo độ lớn đáp án chuẩn. Đáp án lớn (vd 6√2≈8.4853) khi model làm
    // tròn 2 chữ số thập phân (8.49) lệch 0.0047 > 1e-3 tuyệt đối → bị chấm SAI oan. Nhân
    // 1e-3 với max(1,|t|) cho công bằng ở mọi cỡ số, mà vẫn giữ chặt 1e-3 cho đáp án nhỏ
    // (|t|≤1) nên "0.82 vs 0.8165" vẫn khác nhau. (Lỗi này do bộ tự-phản-biện phát hiện.)
    if (Math.abs(m - t) < SCALAR_EPS * Math.max(1, Math.abs(t))) return 'correct';
    return 'incorrect';
  }

  /** Tỉ số: ưu tiên rút gọn nguyên chính xác; không được thì so như vô hướng. */
  export function compareRatio(model: string, truth: string): Verdict {
    const em = parseRatioExact(model);
    const et = parseRatioExact(truth);
    if (em !== null && et !== null) return em === et ? 'correct' : 'incorrect';
    return compareScalar(model, truth);
  }

  /** Điểm/vector: cùng số chiều, từng tọa độ khớp trong POINT_EPS. */
  export function comparePoint(model: string, truth: string): Verdict {
    const t = parsePoint(truth);
    if (t === null) return 'unsure';
    const m = parsePoint(model);
    if (m === null) return 'unsure';
    if (m.length !== t.length) return 'incorrect';
    for (let i = 0; i < t.length; i++) {
      if (Math.abs(m[i] - t[i]) > POINT_EPS) return 'incorrect';
    }
    return 'correct';
  }

  /**
   * Mặt phẳng: hai bộ hệ số (a,b,c,d) biểu diễn CÙNG một mặt phẳng
   * khi và chỉ khi chúng TỈ LỆ với nhau bởi một số khác 0 (design.md §4.2 lớp 3).
   * Cách kiểm: tìm chỉ số đầu tiên khác 0 của đáp án chuẩn, lấy tỉ số, rồi kiểm mọi hệ số.
   */
  export function comparePlane(model: string, truth: string): Verdict {
    const q = parsePlane(truth);
    if (q === null) return 'unsure';
    const p = parsePlane(model);
    if (p === null) return 'unsure';
    const A = [p.a, p.b, p.c, p.d];  // model
    const B = [q.a, q.b, q.c, q.d];  // chuẩn
    const k = B.findIndex((x) => Math.abs(x) > 1e-9);
    if (k === -1) return 'unsure';         // đáp án chuẩn toàn 0 → bất thường
    if (Math.abs(A[k]) < 1e-9) return 'incorrect';
    const ratio = A[k] / B[k];
    if (Math.abs(ratio) < 1e-9) return 'incorrect';
    for (let i = 0; i < 4; i++) {
      if (Math.abs(A[i] - ratio * B[i]) > 1e-6 * (1 + Math.abs(A[i]))) return 'incorrect';
    }
    return 'correct';
  }

  /** Đúng/sai: nhận nhiều cách viết tiếng Việt & tiếng Anh. Không nhận ra → unsure. */
  export function compareBoolean(model: string, truth: string): Verdict {
    const bm = toBool(model);
    const bt = toBool(truth);
    if (bt === null) return 'unsure';
    if (bm === null) return 'unsure';
    return bm === bt ? 'correct' : 'incorrect';
  }

  function toBool(raw: string): boolean | null {
    // Chuẩn hóa: thường hóa, gộp khoảng trắng, bỏ dấu câu cuối ("Đúng." → "đúng").
    let s = raw.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
    // Tiếng Việt PHỦ ĐỊNH BẰNG TIỀN TỐ: "không/chưa/chẳng đúng" nghĩa là SAI. Vì vậy TUYỆT
    // ĐỐI KHÔNG được bắt chuỗi con "đúng" rồi phán true — sẽ phán NGƯỢC (bug thật, bộ
    // tự-phản-biện phát hiện: "Không đúng" từng bị chấm là "đúng"). Cách đúng: bóc tiền tố
    // phủ định ra rồi ĐẢO cực tính của phần lõi.
    let neg = false;
    const negMatch = s.match(/^(?:không|khong|chưa|chua|chẳng|chang|ko)\s+(.*)$/);
    if (negMatch) { neg = true; s = negMatch[1]; }
    const TRUE = ['đúng', 'dung', 'true', 'yes', 'có', 'co', 'phải', 'phai', '1'];
    // Các từ phủ định đứng MỘT MÌNH ("không", "chưa"…) cũng là một câu trả lời SAI.
    const FALSE = ['sai', 'false', 'no', '0', 'không', 'khong', 'ko', 'chưa', 'chua', 'chẳng', 'chang'];
    let base: boolean | null = null;
    if (TRUE.includes(s)) base = true;
    else if (FALSE.includes(s)) base = false;
    if (base === null) {
      if (neg && s === '') return false;   // "không" + rỗng = phủ định trần = SAI
      // Không phải một token/cụm rõ ràng → unsure (nguyên tắc liêm chính §4.3: không đoán bừa).
      return null;
    }
    return neg ? !base : base;
  }

  /** Trắc nghiệm: rút chữ cái được CHỐT (chọn/đáp án …) ở cả hai bên. Mơ hồ/không có → unsure. */
  export function compareMcq(model: string, truth: string): Verdict {
    const lt = toMcq(truth);
    const lm = toMcq(model);
    if (lt === null) return 'unsure';
    if (lm === null) return 'unsure';
    return lm === lt ? 'correct' : 'incorrect';
  }

  function toMcq(raw: string): string | null {
    // (1) Ưu tiên chữ cái A–D đứng NGAY SAU một "cụm chốt đáp án" (chọn / đáp án / answer /
    //     kết luận / → ), và lấy cụm CUỐI CÙNG: model hay nhắc phương án nhiễu trước ("A sai")
    //     rồi mới chốt ("nên chọn C") ở cuối. Nếu chỉ lấy chữ A–D ĐẦU TIÊN (bản cũ) thì
    //     "A sai nên chọn C" bị đọc nhầm là 'A' → chấm ĐÚNG oan (bug thật, bộ tự-phản-biện
    //     phát hiện). Lookahead (?!\p{L}) để chữ cái phải đứng tách biệt (kể cả cạnh chữ có dấu).
    const cue = /(?:chọn|chon|đáp\s*án|dap\s*an|answer|kết\s*luận|ket\s*luan|=>|⇒|→)\s*(?:là|la|:|\.)?\s*([abcd])(?!\p{L})/giu;
    let m: RegExpExecArray | null;
    let lastCue: string | null = null;
    while ((m = cue.exec(raw)) !== null) lastCue = m[1].toUpperCase();
    if (lastCue) return lastCue;
    // (2) Không có cụm chốt: chỉ nhận khi có ĐÚNG MỘT chữ A–D đứng độc lập. Nhiều chữ khác
    //     nhau (vd liệt kê "A, B, C") là MƠ HỒ → null (unsure), không đoán bừa. "Chọn đáp án B"
    //     vẫn ra 'B' nhờ (1); "không có chữ cái" ra null vì C trong "CÓ" bị (?<!\p{L}) loại.
    const singles = raw.toUpperCase().match(/(?<!\p{L})[ABCD](?!\p{L})/gu) ?? [];
    const distinct = Array.from(new Set(singles));
    return distinct.length === 1 ? distinct[0] : null;
  }
  ```
- [ ] **Bước 4 — Chạy test PASS.**
  ```bash
  npx vitest run research/vsgeo-bench/grader/__tests__/compare.test.ts
  ```
  Mong đợi: tất cả PASS.
- [ ] **Bước 5 — Commit.**
  ```bash
  git add research/vsgeo-bench/grader/compare.ts research/vsgeo-bench/grader/__tests__/compare.test.ts
  git commit -m "feat(grader): logic tương đương vô hướng/tỉ số/điểm/mặt/boolean/mcq"
  ```

> **⭐ Tự-phản-biện máy chấm (adversarial self-review) — phần đáng kể nhất khi bảo vệ.** Sau khi cả module chạy được và bộ test "đường hạnh phúc" đã XANH hết, 2 em **cố tình đi tìm cách làm máy chấm chấm sai** (xem `grader/__tests__/adversarial.test.ts`). Bài học lớn: **một suite test xanh KHÔNG chứng minh máy chấm đúng** — nó chỉ chứng minh máy chấm vượt qua đúng những ca ta đã nghĩ ra. Năm lỗi dưới đây đều **lọt qua suite gốc**, trong đó hai lỗi đầu là *false positive* (chấm "đúng" cho đáp án SAI — nguy hiểm nhất vì làm điểm benchmark ảo cao):
>
> - **F1 — boolean (CRITICAL).** `toBool` bản đầu có "fallback chứa chuỗi con": hễ thấy chữ *"đúng"* trong câu là trả `true`. Nhưng tiếng Việt **phủ định bằng tiền tố**: "Không đúng" = SAI, mà vẫn chứa chuỗi con "đúng" → bị chấm là `true` = khớp với đáp án chuẩn "đúng" → **false positive**. Bản vá: bóc tiền tố phủ định (`không/chưa/chẳng/ko`) rồi **đảo cực tính** phần lõi; câu mơ hồ ("không đúng lắm") → `unsure` thay vì đoán bừa.
> - **F2 — mcq (CRITICAL).** `toMcq` bản đầu lấy **chữ A–D đứng độc lập ĐẦU TIÊN**. Câu "A sai nên chọn C" (model **chọn C**) bị đọc thành `'A'` → nếu đáp án chuẩn là A thì **chấm đúng oan**. Bản vá: lấy chữ **ngay sau cụm chốt** (`chọn`/`đáp án`/`answer`/`kết luận`/`→`), lấy cụm **cuối cùng**; không có cụm chốt mà nhiều chữ khác nhau → `unsure`. *(Lưu ý kỹ thuật vẫn giữ:* ranh giới `\b` của JS chỉ coi `[A-Za-z0-9_]` là "chữ" nên dấu tiếng Việt Ó/Đ/Á… bị tính là ranh giới → phải dùng lookaround Unicode `(?<!\p{L})…(?!\p{L})` để C trong "CÓ" không bị nhận nhầm.)*
> - **F3 — scalar (HIGH, *false negative*).** Sai số `1e-3` **tuyệt đối** phạt oan đáp án lớn: `6√2≈8.4853`, model làm tròn 2 chữ số thành `8.49` lệch `0.0047 > 1e-3` → chấm "sai" oan. Bản vá: sai số **tương đối** `1e-3·max(1,|t|)` — công bằng ở mọi cỡ số, vẫn giữ chặt cho đáp án nhỏ.
> - **F4 — parse (MEDIUM).** `\frac12` (thiếu ngoặc, dạng model AI hay xuất) đọc không ra → `unsure`, giảm recall. Bản vá: bọc đối số một-ký-tự vào `{}` trước khi khử LaTeX; **không** đụng dạng lồng ngoặc `\dfrac{\sqrt{6}}{3}`.
> - **F5 — parse (LOW).** Số hỏng `1.5.2` bị lớp ký tự `[0-9.]` nuốt hết rồi `parseFloat` ra `1.5` (**chấp nhận sai**). Bản vá: đọc đúng **một** số hợp lệ (`/^\d*\.?\d+/`), dư ký tự → `null`.
>
> **Cách kể trước hội đồng:** "Máy chấm là *oracle* — nếu nó chấm sai thì mọi con số trong đề tài đều sai theo. Nên sau khi test xanh, chúng em dựng một lượt **tự-phản-biện** chuyên đi tìm *false positive*, tìm ra 5 lỗi mà suite gốc bỏ sót, vá từng lỗi kèm test hồi quy, và biến chính quá trình đó thành bằng chứng về độ tin cậy (đo lại precision/recall ở kế hoạch 05)." Đây chính là tư duy *đo lường được độ tin cậy của công cụ đo* mà một đề tài khoa học cần.

> **Hạn chế của `comparePoint` (design.md §4.2 điểm 3) — phải ghi rõ khi bảo vệ:** hàm này so **từng tọa độ** theo epsilon, tức **giả định đề đã cố định hệ trục Oxyz** (đa số bài tọa độ hóa lớp 12 đều cho sẵn gốc/hướng trục, nên giả định này đúng). Nếu một bài **không** cố định hệ trục thì cùng một điểm có thể có tọa độ khác nhau sau một **phép dời hình** (tịnh tiến/xoay), và so từng tọa độ sẽ báo "sai" oan. **Cách xử lý tối thiểu ở v1:** khi soạn seed loại `point`/`vector` (kế hoạch 01), Em 1 **luôn ghi rõ hệ trục trong đề** để đáp án là duy nhất; ca hiếm không cố định được hệ trục thì gắn cờ soát tay. Nâng cấp "bất biến dời hình" là *trần cao*, ghi vào "câu hỏi mở", không làm ở v1.

---

## Task 5: Lớp điều phối — `grader/grade.ts`

**Mục tiêu Task:** ghép ba lớp trên thành một hàm duy nhất `grade(modelAnswerRaw, truth)` đúng HỢP ĐỒNG DÙNG CHUNG: trích → chuẩn hóa → so theo `truth.type` → trả `GradeResult` với `reason` tiếng Việt. Nếu không trích được đáp án → `unsure` (không đoán).

**Files:**
- Create: `research/vsgeo-bench/grader/grade.ts`
- Test: `research/vsgeo-bench/grader/__tests__/grade.test.ts`

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/grader/__tests__/grade.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import { grade } from '../grade';
  import type { Answer } from '../types';

  const surd: Answer = { canonical: '√6/3', type: 'surd' };
  const plane: Answer = { canonical: 'x+2y-2z+3=0', type: 'plane_eq' };
  const point: Answer = { canonical: '(1,2,3)', type: 'point' };

  describe('grade — điều phối toàn máy chấm', () => {
    it('output có \\boxed đúng → correct', () => {
      const r = grade('Tính toán... Vậy \\boxed{sqrt(6)/3}.', surd);
      expect(r.verdict).toBe('correct');
      expect(r.canonicalModel).toBe('√6/3');
      expect(r.canonicalTruth).toBe('√6/3');
    });

    it('output thập phân xấp xỉ → vẫn correct', () => {
      expect(grade('\\boxed{0.8164}', surd).verdict).toBe('correct');
    });

    it('đáp án sai rõ → incorrect', () => {
      expect(grade('\\boxed{5}', surd).verdict).toBe('incorrect');
    });

    it('không có đáp án trích được → unsure', () => {
      const r = grade('Một lời giải bỏ ngỏ, không kết luận.', surd);
      expect(r.verdict).toBe('unsure');
      expect(r.reason).toMatch(/không.*trích|boxed/i);
    });

    it('mặt phẳng tương đương nhân đôi → correct', () => {
      expect(grade('\\boxed{2x+4y-4z+6=0}', plane).verdict).toBe('correct');
    });

    it('điểm khớp → correct', () => {
      expect(grade('Đáp án: (1, 2, 3)', point).verdict).toBe('correct');
    });

    it('reason luôn là chuỗi không rỗng', () => {
      expect(grade('\\boxed{5}', surd).reason.length).toBeGreaterThan(0);
    });
  });
  ```
- [ ] **Bước 2 — Chạy test cho thấy FAIL.**
  ```bash
  npx vitest run research/vsgeo-bench/grader/__tests__/grade.test.ts
  ```
  Mong đợi: FAIL — `Cannot find module '../grade'`.
- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/grader/grade.ts`:
  ```ts
  // grader/grade.ts
  // Lớp điều phối: nối extract → normalize → compare thành một hàm grade() duy nhất
  // theo HỢP ĐỒNG DÙNG CHUNG. Đây là "giao thức chấm" mà 2 em phải giải thích (design.md §4.4).
  import type { Answer, GradeResult, Verdict } from './types';
  import { extractBoxed } from './extract';
  import { canonicalScalar } from './normalize';
  import {
    compareScalar, compareRatio, comparePoint, comparePlane,
    compareBoolean, compareMcq,
  } from './compare';

  /** Câu giải thích tiếng Việt cho từng phán quyết. */
  function reasonFor(verdict: Verdict, type: string): string {
    if (verdict === 'correct') return `Đáp án model tương đương đáp án chuẩn (loại "${type}").`;
    if (verdict === 'incorrect') return `Đáp án model khác đáp án chuẩn (loại "${type}").`;
    return `Máy chấm không chắc (loại "${type}") — đánh dấu để soát tay, không đoán bừa.`;
  }

  /**
   * Chấm một đáp án THÔ của model so với đáp án chuẩn.
   * Trả GradeResult { verdict, canonicalModel?, canonicalTruth?, reason }.
   */
  export function grade(modelAnswerRaw: string, truth: Answer): GradeResult {
    const extracted = extractBoxed(modelAnswerRaw);
    if (extracted === null) {
      return {
        verdict: 'unsure',
        canonicalTruth: truth.canonical,
        reason: 'Không trích được đáp án: thiếu \\boxed{...} và không có dòng "Đáp án:/Kết luận:".',
      };
    }

    let verdict: Verdict;
    switch (truth.type) {
      case 'rational':
      case 'surd':
        verdict = compareScalar(extracted, truth.canonical);
        break;
      case 'ratio':
        verdict = compareRatio(extracted, truth.canonical);
        break;
      case 'point':
      case 'vector':
        verdict = comparePoint(extracted, truth.canonical);
        break;
      case 'plane_eq':
        verdict = comparePlane(extracted, truth.canonical);
        break;
      case 'line_eq':
        // Giới hạn hiện tại: chỉ xử lý được đường dạng hệ số tuyến tính giống mặt phẳng.
        // Dạng tham số/chính tắc → comparePlane trả 'unsure' (đánh dấu soát tay). Xem "câu hỏi mở".
        verdict = comparePlane(extracted, truth.canonical);
        break;
      case 'boolean':
        verdict = compareBoolean(extracted, truth.canonical);
        break;
      case 'mcq':
        verdict = compareMcq(extracted, truth.canonical);
        break;
      default:
        verdict = 'unsure';
    }

    // canonicalModel: chỉ có nghĩa cho đáp án vô hướng; loại khác để nguyên chuỗi trích được.
    const isScalarLike = truth.type === 'rational' || truth.type === 'surd' || truth.type === 'ratio';
    const canonicalModel = isScalarLike ? (canonicalScalar(extracted) ?? extracted) : extracted;

    return {
      verdict,
      canonicalModel,
      canonicalTruth: truth.canonical,
      reason: reasonFor(verdict, truth.type),
    };
  }
  ```
- [ ] **Bước 4 — Chạy test PASS.**
  ```bash
  npx vitest run research/vsgeo-bench/grader/__tests__/grade.test.ts
  ```
  Mong đợi: `Tests  7 passed`.
- [ ] **Bước 5 — Commit.**
  ```bash
  git add research/vsgeo-bench/grader/grade.ts research/vsgeo-bench/grader/__tests__/grade.test.ts
  git commit -m "feat(grader): grade() điều phối extract→normalize→compare theo type"
  ```

---

## Task 6: Tự kiểm định oracle — `grader/selfcheck.ts` (design.md §4.3)

**Mục tiêu Task:** trả lời câu phản biện chí mạng — *"sao biết máy chấm của các em chấm đúng?"*. Cách khoa học: rút **mẫu ngẫu nhiên** các phán quyết của máy, in ra file để **người chấm tay độc lập**, rồi tính **precision** và **recall** đo mức máy khớp người. Ta viết:
- `sampleForAudit(records, n, seed)` — rút `n` bản ghi **ngẫu nhiên nhưng tái lập được** (cùng seed → cùng mẫu), để kèm vào báo cáo.
- `computePrecisionRecall(human, machine)` — tính precision/recall, coi lớp "positive" = máy phán `correct`.
- `main()` — CLI: đọc file `.jsonl` các `EvalRecord`, ghi ra file `.json` bảng chấm tay (có ô `human_verdict` để trống). Chạy bằng `npx tsx`.

**Định nghĩa precision/recall ở đây (Em 2 phải giải thích được):**
- **Precision** = trong số ca **máy nói "correct"**, bao nhiêu phần trăm **người cũng nói "correct"**. Precision thấp ⇒ máy "khoan dung quá", chấm đúng cho bài thật ra sai.
- **Recall** = trong số ca **người nói "correct"**, bao nhiêu phần trăm **máy cũng bắt được**. Recall thấp ⇒ máy "khắt khe/bỏ sót", chấm sai/unsure cho bài thật ra đúng.

**Files:**
- Create: `research/vsgeo-bench/grader/selfcheck.ts`
- Test: `research/vsgeo-bench/grader/__tests__/selfcheck.test.ts`

- [ ] **Bước 0 — Đảm bảo có `tsx`.** (Kế hoạch 00 lẽ ra đã cài.) Kiểm tra nhanh:
  ```bash
  npx tsx --version
  ```
  Nếu báo lỗi "not found", cài công cụ chạy TS độc lập:
  ```bash
  npm i -D tsx
  ```
  Mong đợi: in ra số phiên bản (vd `tsx v4...`).
- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/grader/__tests__/selfcheck.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import { computePrecisionRecall, sampleForAudit } from '../selfcheck';
  import type { EvalRecord, Verdict } from '../types';

  function rec(seedId: string, verdict: Verdict): EvalRecord {
    return {
      seedId, modelId: 'm', run: 1, promptStyle: 'zero_shot',
      rawOutput: '', extractedAnswer: null, verdict, latencyMs: 0,
    };
  }

  describe('computePrecisionRecall', () => {
    it('tính đúng trên dữ liệu biết trước', () => {
      // người:  correct, correct,  incorrect, correct
      // máy:    correct, incorrect, correct,  correct
      // → tp=2 (i0,i3), fp=1 (i2), fn=1 (i1) → precision=2/3, recall=2/3
      const human: Verdict[]   = ['correct', 'correct', 'incorrect', 'correct'];
      const machine: Verdict[] = ['correct', 'incorrect', 'correct', 'correct'];
      const r = computePrecisionRecall(human, machine);
      expect(r.precision).toBeCloseTo(2 / 3, 10);
      expect(r.recall).toBeCloseTo(2 / 3, 10);
    });

    it('máy hoàn hảo → precision=recall=1', () => {
      const v: Verdict[] = ['correct', 'incorrect', 'correct'];
      const r = computePrecisionRecall(v, v);
      expect(r.precision).toBe(1);
      expect(r.recall).toBe(1);
    });

    it('hai mảng lệch độ dài → ném lỗi', () => {
      expect(() => computePrecisionRecall(['correct'], [])).toThrow();
    });
  });

  describe('sampleForAudit', () => {
    const data: EvalRecord[] = Array.from({ length: 20 }, (_, i) =>
      rec(`vsgeo-${i}`, 'correct'));

    it('rút đúng số lượng', () => {
      expect(sampleForAudit(data, 5, 42)).toHaveLength(5);
    });

    it('cùng seed → cùng mẫu (tái lập được)', () => {
      const a = sampleForAudit(data, 5, 42).map((r) => r.seedId);
      const b = sampleForAudit(data, 5, 42).map((r) => r.seedId);
      expect(a).toEqual(b);
    });

    it('khác seed → (thường) khác mẫu', () => {
      const a = sampleForAudit(data, 5, 1).map((r) => r.seedId);
      const b = sampleForAudit(data, 5, 999).map((r) => r.seedId);
      expect(a).not.toEqual(b);
    });

    it('n lớn hơn dữ liệu → trả hết, không lặp', () => {
      expect(sampleForAudit(data, 100, 7)).toHaveLength(20);
    });
  });
  ```
- [ ] **Bước 2 — Chạy test cho thấy FAIL.**
  ```bash
  npx vitest run research/vsgeo-bench/grader/__tests__/selfcheck.test.ts
  ```
  Mong đợi: FAIL — `Cannot find module '../selfcheck'`.
- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/grader/selfcheck.ts`:
  ```ts
  // grader/selfcheck.ts
  // Tự kiểm định oracle (design.md §4.3): chứng minh máy chấm đáng tin bằng cách
  // đối chiếu một MẪU NGẪU NHIÊN với người chấm tay, rồi báo precision/recall.
  import { readFileSync, writeFileSync } from 'node:fs';
  import type { EvalRecord, Verdict } from './types';

  /**
   * precision/recall của máy chấm, lớp "positive" = máy phán 'correct'.
   *  - precision = tp / (tp + fp): trong ca máy nói correct, bao nhiêu người cũng correct.
   *  - recall    = tp / (tp + fn): trong ca người nói correct, bao nhiêu máy bắt được.
   * human[i], machine[i] là phán quyết cho CÙNG một lượt chấm.
   */
  export function computePrecisionRecall(
    human: Verdict[],
    machine: Verdict[],
  ): { precision: number; recall: number } {
    if (human.length !== machine.length) {
      throw new Error('human và machine phải cùng độ dài');
    }
    let tp = 0;
    let fp = 0;
    let fn = 0;
    for (let i = 0; i < human.length; i++) {
      const mCorrect = machine[i] === 'correct';
      const hCorrect = human[i] === 'correct';
      if (mCorrect && hCorrect) tp++;
      else if (mCorrect && !hCorrect) fp++;
      else if (!mCorrect && hCorrect) fn++;
    }
    const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
    return { precision, recall };
  }

  /** Sinh số giả ngẫu nhiên tái lập được (mulberry32) — cùng seed cho cùng dãy số. */
  function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Rút n bản ghi ngẫu nhiên (không lặp) bằng xáo trộn Fisher–Yates có seed.
   * Cùng seed → cùng mẫu, để kết quả tái lập được khi phản biện.
   */
  export function sampleForAudit(records: EvalRecord[], n: number, seed: number): EvalRecord[] {
    const arr = records.slice();
    const rand = mulberry32(seed);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, Math.min(n, arr.length));
  }

  /** Một dòng trong bảng chấm tay: có sẵn phán máy, để trống ô người điền. */
  interface AuditRow {
    seedId: string;
    modelId: string;
    run: number;
    extractedAnswer: string | null;
    machine_verdict: Verdict;
    human_verdict: '';           // NGƯỜI điền tay: 'correct' | 'incorrect' | 'unsure'
  }

  function toAuditRows(sample: EvalRecord[]): AuditRow[] {
    return sample.map((r) => ({
      seedId: r.seedId,
      modelId: r.modelId,
      run: r.run,
      extractedAnswer: r.extractedAnswer,
      machine_verdict: r.verdict,
      human_verdict: '',
    }));
  }

  // --------- CLI: npx tsx research/vsgeo-bench/grader/selfcheck.ts <in.jsonl> <n> [out.json] ---------
  // Đọc file JSONL các EvalRecord, rút mẫu, ghi bảng chấm tay JSON.
  function main(): void {
    const [inPath, nStr, outPath = 'audit-sample.json', seedStr = '42'] = process.argv.slice(2);
    if (!inPath || !nStr) {
      console.error('Cách dùng: npx tsx grader/selfcheck.ts <in.jsonl> <n> [out.json] [seed]');
      process.exit(1);
    }
    const lines = readFileSync(inPath, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
    const records: EvalRecord[] = lines.map((l) => JSON.parse(l) as EvalRecord);
    const sample = sampleForAudit(records, Number(nStr), Number(seedStr));
    writeFileSync(outPath, JSON.stringify(toAuditRows(sample), null, 2), 'utf8');
    console.log(`Đã ghi ${sample.length} dòng chấm tay vào ${outPath}.`);
    console.log('Bước tiếp: mở file, điền cột human_verdict, rồi tính precision/recall.');
  }

  // Chỉ chạy main() khi gọi trực tiếp bằng tsx (không chạy khi bị import trong test).
  // import.meta.url so với đường dẫn file được node truyền vào argv[1].
  const invoked = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
  if (invoked) main();
  ```
- [ ] **Bước 4 — Chạy test PASS.**
  ```bash
  npx vitest run research/vsgeo-bench/grader/__tests__/selfcheck.test.ts
  ```
  Mong đợi: `Tests  7 passed`.
- [ ] **Bước 5 — Thử CLI end-to-end (không bắt buộc test, nhưng nên chạy 1 lần).** Tạo file mẫu nhỏ rồi chạy:
  ```bash
  printf '%s\n' '{"seedId":"vsgeo-1","modelId":"gpt","run":1,"promptStyle":"zero_shot","rawOutput":"","extractedAnswer":"√6/3","verdict":"correct","latencyMs":10}' '{"seedId":"vsgeo-2","modelId":"gpt","run":1,"promptStyle":"zero_shot","rawOutput":"","extractedAnswer":"5","verdict":"incorrect","latencyMs":10}' > /tmp/eval-demo.jsonl
  npx tsx research/vsgeo-bench/grader/selfcheck.ts /tmp/eval-demo.jsonl 2 /tmp/audit-demo.json
  ```
  Mong đợi: in `Đã ghi 2 dòng chấm tay vào /tmp/audit-demo.json.` và file JSON có 2 dòng, mỗi dòng có `machine_verdict` và `human_verdict: ""`. (Trên Windows PowerShell, thay `/tmp/...` bằng đường dẫn scratchpad và dùng cách tạo file JSONL tùy ý — nội dung file là thứ quan trọng, không phải lệnh tạo.)
- [ ] **Bước 6 — Commit.**
  ```bash
  git add research/vsgeo-bench/grader/selfcheck.ts research/vsgeo-bench/grader/__tests__/selfcheck.test.ts
  git commit -m "feat(grader): selfcheck precision/recall + rút mẫu chấm tay (CLI tsx)"
  ```

---

## Task 7: Điểm vào công khai — barrel `grader/index.ts`

**Mục tiêu Task:** tạo một file "cửa vào" duy nhất để các kế hoạch khác lấy máy chấm mà không cần biết cấu trúc file bên trong. Kế hoạch 03 (harness) gọi `const { grade } = await import('../grader')` — lời gọi này resolve đúng `grader/index.ts`. Barrel chỉ **re-export**, không thêm logic mới.

**Files:**
- Create: `research/vsgeo-bench/grader/index.ts`
- Test: `research/vsgeo-bench/grader/__tests__/index.test.ts`

- [ ] **Bước 1 — Viết smoke test thất bại.** Tạo `research/vsgeo-bench/grader/__tests__/index.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest';
  import { grade } from '../index';
  import type { Answer } from '../index';

  describe('barrel grader/index.ts — điểm vào công khai', () => {
    it('lấy được grade() từ cửa vào và nó chạy đúng', () => {
      expect(typeof grade).toBe('function');
      const truth: Answer = { canonical: '√6/3', type: 'surd' };
      expect(grade('Vậy \\boxed{sqrt(6)/3}.', truth).verdict).toBe('correct');
    });
  });
  ```
- [ ] **Bước 2 — Chạy test cho thấy FAIL.**
  ```bash
  npx vitest run research/vsgeo-bench/grader/__tests__/index.test.ts
  ```
  Mong đợi: FAIL — `Cannot find module '../index'`.
- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/grader/index.ts`:
  ```ts
  // grader/index.ts
  // Điểm vào công khai (barrel) của thư mục grader/. Các kế hoạch khác — nhất là
  // Kế hoạch 03 (harness) — lấy máy chấm qua CHỖ NÀY, không import lẻ từng file:
  //   const { grade } = await import('../grader');   // → resolve grader/index.ts
  // File này CHỈ re-export, không chứa logic — để đổi cấu trúc bên trong mà không vỡ nơi gọi.
  export { grade } from './grade';
  export type { Answer, AnswerType, Verdict, GradeResult, EvalRecord } from './types';
  ```
- [ ] **Bước 4 — Chạy test PASS.**
  ```bash
  npx vitest run research/vsgeo-bench/grader/__tests__/index.test.ts
  ```
  Mong đợi: `Tests  1 passed`.
- [ ] **Bước 5 — Commit.**
  ```bash
  git add research/vsgeo-bench/grader/index.ts research/vsgeo-bench/grader/__tests__/index.test.ts
  git commit -m "feat(grader): barrel index.ts re-export grade + kiểu kết quả cho harness"
  ```

---

## Task 8: Tự-phản-biện máy chấm — `grader/__tests__/adversarial.test.ts`

**Mục tiêu Task:** khi cả module đã xong và mọi test "đường hạnh phúc" đã XANH, **dựng một lượt cố tình đi tìm cách làm máy chấm chấm sai** rồi khóa các lỗi tìm được bằng test hồi quy. Đây KHÔNG phải test lặp lại các ca cũ — mỗi ca ở đây là một *đòn tấn công* mà suite gốc bỏ sót. Xem callout "⭐ Tự-phản-biện máy chấm" ở cuối Task 4 để hiểu 5 lỗi F1–F5 và vì sao chúng nguy hiểm (đặc biệt F1/F2 là *false positive*). Nếu 2 em viết lại code từ kế hoạch này, code Task 3–4 đã có sẵn bản vá — file test dưới đây xác nhận bản vá còn nguyên.

**Files:**
- Create: `research/vsgeo-bench/grader/__tests__/adversarial.test.ts`

- [ ] **Bước 1 — Viết bộ test tấn công (phải XANH ngay vì code Task 3–4 đã vá).** Tạo `research/vsgeo-bench/grader/__tests__/adversarial.test.ts`:
  ```ts
  // grader/__tests__/adversarial.test.ts
  // Bộ test TỰ-PHẢN-BIỆN (adversarial self-review) — design.md §4.3. Cố tình đi tìm cách làm
  // máy chấm chấm SAI. Lỗi nguy hiểm nhất là FALSE POSITIVE: chấm "correct" cho đáp án SAI.
  //   F1 boolean: "Không đúng" (=SAI) từng bị chấm bằng "đúng" vì bắt chuỗi con "đúng".
  //   F2 mcq:     "A sai nên chọn C" (chọn C) từng bị chấm là 'A' vì lấy chữ ĐẦU TIÊN.
  //   F3 scalar:  8.49 (làm tròn của 6√2) từng bị chấm SAI oan (false negative).
  //   F4 parse:   "\frac12" từng đọc không ra → unsure. F5: "1.5.2" từng bị nuốt thành 1.5.
  import { describe, it, expect } from 'vitest';
  import { grade } from '../grade';
  import { compareScalar, compareBoolean, compareMcq } from '../compare';
  import { parseScalar } from '../normalize';
  import type { Answer } from '../types';

  const boolAns = (canonical: string): Answer => ({ canonical, type: 'boolean' });
  const mcqAns = (canonical: string): Answer => ({ canonical, type: 'mcq' });

  describe('F1 — boolean: phủ định KHÔNG được chấm thành khẳng định', () => {
    it('"Không đúng" (=SAI) KHÔNG bao giờ là correct khi đáp án chuẩn là "đúng"', () => {
      expect(grade('\\boxed{Không đúng}', boolAns('đúng')).verdict).toBe('incorrect');
      expect(grade('\\boxed{chưa đúng}', boolAns('đúng')).verdict).toBe('incorrect');
      expect(grade('\\boxed{Không đúng.}', boolAns('đúng')).verdict).toBe('incorrect');
    });
    it('phủ định của "sai" thì thành đúng: "không sai" == "đúng"', () => {
      expect(compareBoolean('không sai', 'đúng')).toBe('correct');
    });
    it('token phủ định trần vẫn là SAI: "Không"/"Chưa"/"ko" == "sai"', () => {
      expect(compareBoolean('Không', 'sai')).toBe('correct');
      expect(compareBoolean('Chưa', 'sai')).toBe('correct');
      expect(compareBoolean('ko', 'sai')).toBe('correct');
    });
    it('câu mơ hồ (không phải token/cụm rõ) → unsure, KHÔNG đoán bừa', () => {
      expect(compareBoolean('không đúng lắm', 'đúng')).toBe('unsure');
      expect(compareBoolean('có lẽ đúng', 'đúng')).toBe('unsure');
    });
    it('đường hạnh phúc vẫn nguyên: "Đúng"/"Sai" chấm chuẩn', () => {
      expect(compareBoolean('Đúng', 'đúng')).toBe('correct');
      expect(compareBoolean('Sai', 'đúng')).toBe('incorrect');
      expect(compareBoolean('true', 'đúng')).toBe('correct');
    });
  });

  describe('F2 — mcq: phải lấy chữ được CHỐT, không phải chữ đầu tiên', () => {
    it('"A sai nên chọn C" (model chọn C) KHÔNG được chấm là A', () => {
      expect(grade('\\boxed{A sai nên chọn C}', mcqAns('A')).verdict).toBe('incorrect');
      expect(grade('\\boxed{A sai nên chọn C}', mcqAns('C')).verdict).toBe('correct');
    });
    it('câu qua đường "Đáp án:" cũng lấy đúng chữ chốt cuối', () => {
      expect(grade('Kết luận: Vì A và B đều sai nên chọn D', mcqAns('A')).verdict).toBe('incorrect');
      expect(grade('Kết luận: Vì A và B đều sai nên chọn D', mcqAns('D')).verdict).toBe('correct');
    });
    it('liệt kê nhiều chữ mà không có cụm chốt → mơ hồ → unsure', () => {
      expect(compareMcq('A, B, C', 'A')).toBe('unsure');
    });
    it('đường hạnh phúc vẫn nguyên: "C", "Chọn đáp án B", "(B)"', () => {
      expect(compareMcq('C', 'C')).toBe('correct');
      expect(compareMcq('Chọn đáp án B', 'B')).toBe('correct');
      expect(compareMcq('(B)', 'B')).toBe('correct');
      expect(compareMcq('không có chữ cái', 'C')).toBe('unsure');
    });
  });

  describe('F3 — scalar: sai số theo ĐỘ LỚN, không phạt oan đáp án lớn làm tròn', () => {
    it('6√2 ≈ 8.4853: model viết 8.49 (làm tròn 2 chữ số) vẫn correct', () => {
      expect(compareScalar('8.49', '6√2')).toBe('correct');
      expect(compareScalar('84.85', '60√2')).toBe('correct');
    });
    it('nhưng đáp án nhỏ vẫn giữ chặt: 0.82 vs √6/3(≈0.8165) vẫn incorrect', () => {
      expect(compareScalar('0.82', '√6/3')).toBe('incorrect');
    });
    it('đáp án lớn KHÁC hẳn vẫn incorrect: 8.5 (=17/2) vs 6√2', () => {
      expect(compareScalar('8.5', '6√2')).toBe('incorrect');
    });
  });

  describe('F4/F5 — parse: đọc \\frac rút gọn; từ chối số hỏng', () => {
    it('F4 "\\frac12" đọc được thành 0.5 (dạng model hay xuất)', () => {
      expect(parseScalar('\\frac12')).toBeCloseTo(0.5, 9);
      expect(parseScalar('\\frac1{2}')).toBeCloseTo(0.5, 9);
      expect(parseScalar('\\frac{1}2')).toBeCloseTo(0.5, 9);
    });
    it('F4 KHÔNG làm hỏng dạng lồng ngoặc \\dfrac{\\sqrt{6}}{3}', () => {
      expect(parseScalar('\\dfrac{\\sqrt{6}}{3}')).toBeCloseTo(Math.sqrt(6) / 3, 9);
    });
    it('F5 số hỏng "1.5.2" → null (từ chối, không nuốt thành 1.5)', () => {
      expect(parseScalar('1.5.2')).toBeNull();
    });
    it('F5 số thập phân hợp lệ vẫn đọc bình thường (".5", "0.5", "1.5")', () => {
      expect(parseScalar('.5')).toBeCloseTo(0.5, 9);
      expect(parseScalar('0.5')).toBeCloseTo(0.5, 9);
      expect(parseScalar('1.5')).toBeCloseTo(1.5, 9);
    });
  });
  ```
- [ ] **Bước 2 — Chạy toàn bộ suite grader, phải XANH hết.**
  ```bash
  npx vitest run research/vsgeo-bench/grader
  ```
  Mong đợi: tất cả PASS (gồm cả file tấn công này).
- [ ] **Bước 3 — Commit.**
  ```bash
  git add research/vsgeo-bench/grader/__tests__/adversarial.test.ts
  git commit -m "test(grader): bộ tự-phản-biện khóa 5 lỗi false-positive/negative"
  ```

---

## Quy trình do 2 EM tự làm & bảo vệ (không code sẵn được)

> **Phần này là công sức trí tuệ của 2 em** — code ở trên là *công cụ*, còn việc dưới đây là *bằng chứng khoa học* mà hội đồng chấm. Không ai làm thay được.

### Chạy vòng tự kiểm định oracle (design.md §4.3) — quy trình 6 bước

1. Sau khi harness (kế hoạch 03/04) đã chấm xong ≥ 50 bài pilot của T1, gom log thành một file `eval.jsonl` (mỗi dòng một `EvalRecord`).
2. Chạy `npx tsx research/vsgeo-bench/grader/selfcheck.ts eval.jsonl 50 audit.json 42` để rút **50 ca ngẫu nhiên** (seed 42 để tái lập).
3. **Hai em chấm tay ĐỘC LẬP** cột `human_verdict` (chưa nhìn bài nhau) — mỗi ca ghi `correct/incorrect/unsure` theo *đáp án chuẩn của bài*, KHÔNG theo phán quyết máy.
4. Gộp hai bản, những ca hai em lệch nhau thì **thảo luận thống nhất** (và ghi lại lý do — đây là dữ liệu quý).
5. Nhập hai mảng `human` (đã thống nhất) và `machine` (cột `machine_verdict`) vào một script nhỏ gọi `computePrecisionRecall`, đọc ra **precision & recall**.
6. Viết một đoạn 1 trang: số precision/recall đạt được, các ca máy sai/ unsure là loại gì, và ta xử lý ra sao. **Tiêu chí nghiệm thu (acceptance):** precision ≥ 0.95 trên mẫu; mọi ca `unsure` được liệt kê và soát tay.

### Ví dụ mẫu đã làm hoàn chỉnh (để 2 em bắt chước)

| # | Đáp án chuẩn (type) | Model viết | Máy phán | Người phán | Khớp? |
|---|---|---|---|---|---|
| 1 | `√6/3` (surd) | `\boxed{\dfrac{\sqrt6}{3}}` | correct | correct | ✅ |
| 2 | `x+2y-2z+3=0` (plane_eq) | `\boxed{2x+4y-4z+6=0}` | correct | correct | ✅ |
| 3 | `1/2` (rational) | `\boxed{0.5}` | correct | correct | ✅ |
| 4 | `(1,2,3)` (point) | `Đáp án: (1;2;3)` | ? | correct | ⚠️ dấu `;` |

> Ca #4 là **bài học thật**: đề Việt hay dùng dấu `;` ngăn tọa độ thay vì `,`. Nếu gặp, đây là một cải tiến nhỏ đáng thêm vào `parsePoint` (cho phép cả `;`) — và là một điểm 2 em có thể kể như "phát hiện trong quá trình tự kiểm định". Đừng sửa vội trong kế hoạch này; ghi vào nhật ký, thêm test, rồi vá.

### Checklist tự kiểm trước khi tuyên bố "oracle v1 xong"

- [ ] `npm test` xanh toàn bộ (mọi test grader PASS).
- [ ] Đã chạy tự kiểm định trên ≥ 50 ca, có bảng precision/recall.
- [ ] precision ≥ 0.95; mọi ca `unsure` đã liệt kê.
- [ ] Viết được 3 câu giải thích: (a) vì sao `√6/3` và `0.8164` được coi là bằng nhau, (b) vì sao mặt phẳng tương đương sai khác nhân vô hướng, (c) vì sao ta chọn `unsure` thay vì đoán.

---

## Tiêu chí hoàn thành (Definition of Done)

Ánh xạ tới tiêu chí thành công design.md §13 ("oracle tự kiểm định đạt độ tin cậy báo cáo được"):

1. **6 file grader + 6 file test tồn tại**, `npm test` chạy tất cả và **PASS 100%**.
2. Hàm `grade(modelAnswerRaw, truth)` đúng chữ ký HỢP ĐỒNG DÙNG CHUNG, phủ đủ 9 `AnswerType` (loại chưa hỗ trợ sâu như `line_eq` tham số → trả `unsure`, không sai).
3. Các ca chuẩn trong đề bài đều đúng: `√6/3 == sqrt(6)/3 == 0.8164` (correct); `1/2 == 0.5`; `2√3 == sqrt(12)`; `x+2y-2z+3=0 == 2x+4y-4z+6=0` (correct) và `!= x+2y-2z-3=0`; `(1,2,3) == (1, 2, 3)`; rác/thiếu → `unsure`; sai rõ → `incorrect`.
4. `computePrecisionRecall` cho số đúng trên dữ liệu biết trước; `sampleForAudit` tái lập được theo seed.
5. Đã chạy **một vòng tự kiểm định** trên ≥ 50 ca pilot, đạt **precision ≥ 0.95** (nếu chưa đạt: liệt kê ca sai, vá, chạy lại).
6. Ranh giới sở hữu rõ (design.md §4.4): engine được `import` + ghi nguồn trong comment; logic tương đương do 2 em viết & giải thích được.

---

## Bảng thuật ngữ

| Thuật ngữ | Nghĩa dễ hiểu |
|---|---|
| **Oracle / máy chấm** | Chương trình tự phán đáp án model đúng/sai/không-chắc bằng so khớp ký hiệu. |
| **canonical (dạng chuẩn)** | Một cách viết duy nhất cho một giá trị, vd số `0.8165` → chuỗi chuẩn `√6/3`. |
| **`toExactForm`** | Hàm engine có sẵn: nhận một SỐ, trả chuỗi kiểu SGK (căn/phân số) + cờ `isExact`. Ta dùng lại. |
| **`makeExact` / `displayExact`** | Hàm engine: làm số học phân số + căn **chính xác** (không sai số float) rồi in ra. Dùng cho tỉ số. |
| **epsilon (sai số)** | Ngưỡng nhỏ (`SCALAR_EPS = 1e-3`) để coi hai số "gần bằng nhau" là bằng — cần vì model làm tròn. |
| **recursive-descent parser** | Bộ đọc biểu thức viết bằng vài hàm gọi lẫn nhau (`parseExpr`→`parseTerm`→…) theo ngữ pháp. |
| **phép nhân ngầm** | `2√3` hiểu là `2 × √3` dù không viết dấu `×`; ta tự chèn `*` khi chuẩn hóa. |
| **tương đương sai khác nhân vô hướng** | Hai phương trình mặt phẳng là một nếu bộ hệ số tỉ lệ nhau (nhân cả hai vế với số ≠ 0). |
| **precision / recall** | Hai chỉ số đo máy chấm khớp người tới đâu (khoan dung sai vs bỏ sót). |
| **Fisher–Yates + seed** | Cách xáo trộn danh sách ngẫu nhiên nhưng **tái lập được** (cùng seed → cùng kết quả). |
| **`unsure`** | Phán quyết "máy không dám chắc" — đánh dấu soát tay, thể hiện tính liêm chính. |
| **vitest / tsx** | vitest chạy test; tsx chạy một file `.ts` như script CLI (không cần biên dịch trước). |

---

## Em sẽ bảo vệ được gì trước hội đồng

- **"Chúng em tự thiết kế logic tương đương đáp án mở."** Em giải thích được vì sao `√6/3 = 0.8164 = sqrt(6)/3` (quy về một số rồi hỏi engine dạng chuẩn) và vì sao hai phương trình mặt phẳng tỉ lệ là một — đây là năng lực **mô hình hóa toán học + đặc tả bài toán**, không phải chép công cụ (design.md §4.4).
- **"Máy chấm của em có bằng chứng đáng tin, không phải nói suông."** Em trình được **precision/recall** đo trên mẫu ngẫu nhiên chấm tay độc lập, và chính sách `unsure` thay vì đoán bừa — năng lực **đánh giá thực nghiệm & tư duy phản biện** (design.md §4.3).
- **"Em phân định rạch ròi công cụ có sẵn và phần tự làm."** Engine ký hiệu được ghi nguồn minh bạch trong từng file; phần trích xuất, chuẩn hóa, so tương đương, tự kiểm định là của em — năng lực **liêm chính học thuật**, đúng tinh thần ViSEF (design.md §4.4, §9.3).
- **"Em làm việc theo quy trình kỹ sư thật."** Mỗi tính năng có test viết trước (TDD), commit nhỏ, có thể tái lập — năng lực **kỹ thuật phần mềm & phương pháp khoa học tái lập được**.
