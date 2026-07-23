# Harness gọi Model — Kế hoạch triển khai

> **Cho người thực thi (agentic worker):** REQUIRED SUB-SKILL: dùng superpowers:subagent-driven-development hoặc superpowers:executing-plans để làm theo từng Task. Các bước dùng checkbox `- [ ]` để theo dõi.

**Mục tiêu:** Xây pipeline chạy đánh giá — gọi nhiều model AI trên mọi bài (seed), lặp k=3–5 lần, trích đáp án trong `\boxed{...}`, gọi máy chấm `grade()`, và ghi nhật ký kết quả `EvalRecord` ra file JSONL.

> **Phạm vi cho vòng trường (3 tháng):** LÕI toàn bộ — tháng 1 gọi 1–2 model để chạy end-to-end trên ~20 bài; tháng 2 chạy đủ dàn model mục tiêu với k=3. **Để dành MỞ RỘNG (sau vòng trường):** thêm nhiều model hơn và tăng k lớn hơn.

**Kiến trúc:** Mỗi nhà cung cấp model (OpenAI, Gemini, Anthropic, OpenRouter) có một *adapter* nhỏ chỉ lo "dựng request + đọc response". Một bộ định tuyến `callModel` chọn adapter đúng theo tiền tố của `modelId`, thêm cơ chế thử-lại (retry) và ước tính chi phí. File `run.ts` là chương trình dòng lệnh (CLI) ghép mọi thứ lại: đọc seed → gọi model → trích → chấm → ghi log. Toàn bộ *logic* được test bằng client giả (mock), **không hề gọi mạng thật**; chỉ khi chạy CLI thật mới đụng Internet.

**Công nghệ:** TypeScript (ESM), vitest (test), `fetch` sẵn có của Node ≥18, `dotenv` (nạp khoá API từ `.env`), `npx tsx` (chạy script TS trực tiếp). Không có framework web nào ở đây — đây là code chạy ở terminal.

---

## Dành cho 2 em (đọc trước)

Chào Em 2! Đây là "trái tim vận hành" của cả đề tài. Hãy hình dung thế này:

- **Hệ con này là gì?** Là một cái *máy chạy thi tự động*. Ta có ~300 bài toán (do Em 1 soạn, nằm trong `data/seeds/`). Ta có một danh sách "thí sinh" là các model AI (GPT, Gemini, Claude, và vài model mở). Harness sẽ **lần lượt đưa từng bài cho từng thí sinh, mỗi bài hỏi lại 3–5 lần** (vì AI trả lời không cố định, hỏi nhiều lần mới đo được độ ổn định), lấy câu trả lời cuối trong `\boxed{...}`, đưa cho **máy chấm** (`grade()`, do kế hoạch 02 làm) phán đúng/sai, rồi **ghi lại từng lượt** thành một dòng nhật ký. Cuối buổi ta có một file `results/2026-08-15.jsonl` chứa hàng nghìn dòng — đó là nguyên liệu thô cho mọi bảng xếp hạng và phân tích sau này.

- **Vì sao cần?** Không có harness thì mọi con số accuracy đều là làm tay, không tái lập được. Hội đồng ViSEF sẽ hỏi "các em chạy lại có ra kết quả cũ không?". Harness chính là câu trả lời: một lệnh `npx tsx ... ` là chạy lại toàn bộ.

- **Sản phẩm cuối trông thế nào?** Một thư mục `harness/` gồm vài file `.ts` có test đầy đủ, cộng với **một file kết quả JSONL** sinh ra khi chạy thật. Mỗi dòng JSONL là một `EvalRecord` — xem "Hợp đồng kiểu dữ liệu" ở cuối. Ví dụ một dòng:
  ```json
  {"seedId":"vsgeo-0001","modelId":"openai:gpt-5.6","run":1,"promptStyle":"zero_shot","rawOutput":"... \\boxed{a\\sqrt6/3}","extractedAnswer":"a\\sqrt6/3","verdict":"correct","latencyMs":2143,"costUsd":0.0031}
  ```

- **Em nào phụ trách?** **Em 2 (Harness & Phân tích)**. Đây đúng "sở trường" của em theo phân vai ở §11.1: *pipeline gọi model, tích hợp oracle, tự động hoá*.

- **Nằm ở tháng nào?** Bắt đầu **cuối T2** (mục tiêu T2: "harness gọi model chạy end-to-end — 1 model chạy hết") và dùng suốt **T3** (chạy eval đầy đủ). Xem lịch §11.2.

- **Phụ thuộc kế hoạch nào?** Cần làm **sau** ba kế hoạch này:
  - **00** (setup: thêm `tsx`, cấu trúc thư mục, `.env.example`) — cho lệnh `npx tsx` và chỗ để khoá API.
  - **01** (schema + kiểu `Seed`) — harness đọc seed đúng hình dạng.
  - **02** (grader: hàm `grade()`) — harness gọi để chấm.
  Nếu ba cái đó chưa xong, em vẫn **viết và test được harness** nhờ ta *tiêm* (inject) hàm giả vào chỗ của `grade()` và `callModel()` khi test — nhưng để **chạy thật** thì cần 01 và 02 có mặt.

Đừng lo nếu chưa quen `fetch` hay API model — mỗi Task đều có code đầy đủ và giải thích "vì sao". Cứ gõ theo, chạy test xanh, rồi commit. Ta đi từng bước nhỏ 2–5 phút.

> **Nguyên tắc vàng của cả kế hoạch:** *test không bao giờ gọi mạng thật*. Ta tách mỗi adapter làm hai phần thuần tuý (pure): `build...Request` (dựng request) và `parse...Response` (đọc kết quả) — hai phần này nhận dữ liệu vào, trả dữ liệu ra, **không đụng Internet**, nên test được ngay. Phần `call()` (gọi `fetch` thật) chỉ chạy khi chạy CLI thật. Còn `callModel` và `run` được test bằng cách *tiêm adapter giả / grade giả*.

---

## Chuẩn bị (làm một lần trước Task 1)

- [ ] Xác nhận đang ở thư mục gốc repo (nơi có `package.json`). Mọi lệnh `npm test` chạy từ đây.
- [ ] Xác nhận kế hoạch 00 đã cài `tsx`: chạy `npx tsx --version` → in ra một số phiên bản (vd `tsx v4.x`). Nếu báo "not found", quay lại làm kế hoạch 00 trước.
- [ ] Xác nhận `dotenv` và `zod` đã có: mở `package.json`, tìm trong `dependencies` hai dòng `"dotenv"` và `"zod"`. (Đã có sẵn — không cần cài.)
- [ ] Tạo sẵn thư mục test rỗng: `mkdir -p research/vsgeo-bench/harness/models research/vsgeo-bench/harness/__tests__ research/vsgeo-bench/results` (trên PowerShell: `New-Item -ItemType Directory -Force research/vsgeo-bench/harness/models, research/vsgeo-bench/harness/__tests__, research/vsgeo-bench/results`).

---

### Task 1: Kiểu dữ liệu chung + bảng giá & ước tính chi phí

**Vì sao trước tiên?** Mọi file khác dùng lại các *kiểu* này. Riêng bảng giá (`PRICING`) cho ta một hàm thuần `estimateCostUsd()` — một mục tiêu TDD "sạch" để làm nóng.

**Files:**
- Create: `research/vsgeo-bench/harness/types.ts`
- Create: `research/vsgeo-bench/harness/pricing.ts`
- Test: `research/vsgeo-bench/harness/__tests__/pricing.test.ts`

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/harness/__tests__/pricing.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { estimateCostUsd, PRICING } from "../pricing";

  describe("estimateCostUsd — ước tính chi phí theo số token", () => {
    it("tính đúng chi phí khi model có trong bảng giá", () => {
      // Giả sử model 'test:demo' giá 1.00 USD / 1 triệu token vào, 2.00 USD / 1 triệu token ra.
      // Dùng 1000 token vào + 500 token ra => 1000/1e6*1 + 500/1e6*2 = 0.001 + 0.001 = 0.002.
      const cost = estimateCostUsd("test:demo", { in: 1000, out: 500 });
      expect(cost).toBeCloseTo(0.002, 9);
    });

    it("trả undefined khi model KHÔNG có trong bảng giá (không đoán bừa)", () => {
      const cost = estimateCostUsd("khong:ton-tai", { in: 100, out: 100 });
      expect(cost).toBeUndefined();
    });

    it("trả undefined khi thiếu thông tin usage", () => {
      expect(estimateCostUsd("test:demo", undefined)).toBeUndefined();
    });

    it("bảng giá PRICING phủ MỖI nhà cung cấp chính (openai/gemini/anthropic/openrouter)", () => {
      // Bản ngây thơ chỉ kiểm PRICING["test:demo"] (khoá DEMO) — tên test hứa "model chính"
      // nhưng KHÔNG canh dòng giá THẬT nào: ai lỡ xoá hết dòng thật thì mọi costUsd rỗng mà
      // test vẫn XANH (xem Task 11). Kiểm THEO TIỀN TỐ nhà cung cấp, KHÔNG khoá cứng tên model.
      const providers = new Set(Object.keys(PRICING).map((key) => key.split(":")[0]));
      for (const p of ["openai", "gemini", "anthropic", "openrouter"]) {
        expect(providers).toContain(p);
      }
    });

    it("estimateCostUsd ra số dương cho một model THẬT trong bảng (không chỉ demo)", () => {
      const realKey = Object.keys(PRICING).find((key) => !key.startsWith("test:"));
      expect(realKey).toBeDefined();
      expect(estimateCostUsd(realKey!, { in: 1000, out: 1000 })).toBeGreaterThan(0);
    });
  });
  ```

- [ ] **Bước 2 — Chạy test cho thấy FAIL.**
  ```
  npm test -- research/vsgeo-bench/harness/__tests__/pricing.test.ts
  ```
  Kỳ vọng: FAIL với thông báo kiểu `Cannot find module '../pricing'` (vì chưa tạo file). Đây là màu đỏ mong đợi.

- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/harness/types.ts`:
  ```ts
  // ===== Hợp đồng kiểu dữ liệu dùng chung cho toàn bộ VSGeo-Bench =====
  // (khớp với "HỢP ĐỒNG KIỂU DỮ LIỆU DÙNG CHUNG" trong bản thiết kế — mọi hệ con dùng đúng tên này)

  // Kiểu "phán quyết" của máy chấm. Định nghĩa gốc ở kế hoạch 02 (grader).
  // Ta khai lại ở đây một bản độc lập để harness tự đứng được khi test;
  // giá trị y hệt nên không xung đột. Khi grader có mặt, hai bên vẫn khớp chuỗi.
  export type Verdict = "correct" | "incorrect" | "unsure";

  // Hai kiểu prompt: hỏi thẳng, hoặc bắt suy luận từng bước rồi mới kết luận.
  export type PromptStyle = "zero_shot" | "cot";

  // Kết quả một lần gọi model. costUsd có thể vắng nếu chưa biết giá.
  export interface ModelReply {
    text: string;            // toàn văn model trả về
    latencyMs: number;       // thời gian chờ (mili-giây)
    usage?: { in: number; out: number };  // số token vào/ra (nếu nhà cung cấp trả về)
    costUsd?: number;        // chi phí ước tính (USD)
  }

  // Một dòng nhật ký: MỘT lượt seed × model × run × style.
  export interface EvalRecord {
    seedId: string;
    modelId: string;
    run: number;                 // lần thứ mấy (1..k)
    promptStyle: PromptStyle;
    rawOutput: string;           // nguyên văn model trả (để soi lỗi sau)
    extractedAnswer: string | null;  // phần trong \boxed{...}, hoặc null nếu không thấy
    verdict: Verdict;            // do grade() phán
    latencyMs: number;
    costUsd?: number;
    perturbation?: { kind: string; parentSeedId: string };  // nếu đây là bài biến thể (kế hoạch 04)
  }
  ```
  Tạo `research/vsgeo-bench/harness/pricing.ts`:
  ```ts
  // Bảng giá mỗi model: USD cho MỖI 1 TRIỆU token.
  // ĐÂY LÀ CẤU HÌNH — hãy cập nhật theo bảng giá hiện hành của nhà cung cấp trước khi chạy thật.
  // Khoá là modelId ĐẦY ĐỦ (có tiền tố nhà cung cấp), vd "openai:gpt-5.6".
  export interface PriceRow { inPer1M: number; outPer1M: number }

  export const PRICING: Record<string, PriceRow> = {
    // Model demo chỉ dùng cho test (đừng xoá — pricing.test.ts dựa vào nó):
    "test:demo": { inPer1M: 1.0, outPer1M: 2.0 },

    // Ví dụ giá tham chiếu (SỐ MINH HOẠ — chỉnh lại theo thời giá thật):
    "openai:gpt-5.6": { inPer1M: 2.5, outPer1M: 10.0 },
    "gemini:gemini-2.5-pro": { inPer1M: 1.25, outPer1M: 5.0 },
    "gemini:gemini-2.5-flash": { inPer1M: 0.15, outPer1M: 0.6 },
    "anthropic:claude-opus-4-8": { inPer1M: 5.0, outPer1M: 25.0 },
    "openrouter:qwen/qwen-2.5-72b-instruct": { inPer1M: 0.4, outPer1M: 0.4 },
  };

  // Nhận usage token, trả chi phí USD; trả undefined nếu không đủ dữ liệu để tính.
  // KHÔNG đoán bừa: model lạ hoặc thiếu usage => undefined (để dòng log ghi trống, minh bạch).
  export function estimateCostUsd(
    modelId: string,
    usage?: { in: number; out: number }
  ): number | undefined {
    if (!usage) return undefined;
    const row = PRICING[modelId];
    if (!row) return undefined;
    return (usage.in / 1_000_000) * row.inPer1M + (usage.out / 1_000_000) * row.outPer1M;
  }
  ```

- [ ] **Bước 4 — Chạy test PASS.**
  ```
  npm test -- research/vsgeo-bench/harness/__tests__/pricing.test.ts
  ```
  Kỳ vọng: `5 passed`. Xanh rồi thì đi tiếp.

- [ ] **Bước 5 — Commit.**
  ```
  git add research/vsgeo-bench/harness/types.ts research/vsgeo-bench/harness/pricing.ts research/vsgeo-bench/harness/__tests__/pricing.test.ts
  git commit -m "feat(harness): kiểu dữ liệu chung + bảng giá & ước tính chi phí"
  ```

---

### Task 2: Dựng prompt (buildPrompt) — bắt model kết luận trong `\boxed{}`

**Vì sao?** Máy chấm chỉ đọc phần trong `\boxed{...}` (thiết kế §4.2). Nên *mọi* prompt phải yêu cầu model đóng khung đáp án cuối bằng `\boxed{...}`. Ta làm hai kiểu: `zero_shot` (hỏi thẳng) và `cot` (chain-of-thought — bắt trình bày các bước rồi mới chốt).

**Files:**
- Create: `research/vsgeo-bench/harness/prompt.ts`
- Test: `research/vsgeo-bench/harness/__tests__/prompt.test.ts`

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/harness/__tests__/prompt.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { buildPrompt } from "../prompt";
  import type { Seed } from "../seedTypes";

  // Một seed tối giản đủ để test dựng prompt (không cần đủ mọi trường).
  const seed = {
    id: "vsgeo-0001",
    source: { type: "synthetic", ref: "demo" },
    statement_vi: "Cho hình lập phương cạnh a. Tính thể tích.",
    answer: { canonical: "a^3", type: "surd" },
    tags: { topic: ["the_tich"], answer_form: "surd", difficulty: 1, requires_auxiliary_construction: false },
  } as unknown as Seed;

  describe("buildPrompt — dựng lời nhắc cho model", () => {
    it("zero_shot: chèn đề bài và yêu cầu \\boxed", () => {
      const { system, user } = buildPrompt(seed, "zero_shot");
      expect(user).toContain("Cho hình lập phương cạnh a");
      expect(system).toContain("\\boxed");
      expect(user).toContain("\\boxed");
    });

    it("cot: có yêu cầu suy luận từng bước VÀ vẫn buộc \\boxed cuối", () => {
      const { system, user } = buildPrompt(seed, "cot");
      expect(user).toContain("từng bước");
      expect(user).toContain("\\boxed");
      expect(system).toContain("\\boxed");
    });

    it("system giống nhau ở cả hai kiểu (giao thức cố định), chỉ user khác", () => {
      const z = buildPrompt(seed, "zero_shot");
      const c = buildPrompt(seed, "cot");
      expect(z.system).toBe(c.system);
      expect(z.user).not.toBe(c.user);
    });
  });
  ```

- [ ] **Bước 2 — Chạy test cho thấy FAIL.**
  ```
  npm test -- research/vsgeo-bench/harness/__tests__/prompt.test.ts
  ```
  Kỳ vọng: FAIL — `Cannot find module '../prompt'` (và cả `'../seedTypes'`). Ta tạo cả hai ở bước sau.

- [ ] **Bước 3 — Viết code tối thiểu để pass.** Trước hết tạo một *cầu nối kiểu Seed* để harness không phụ thuộc cứng vào đường dẫn của kế hoạch 01. Tạo `research/vsgeo-bench/harness/seedTypes.ts`:
  ```ts
  // Harness chỉ cần MỘT PHẦN của Seed (đề bài + đáp án). Ta khai bản rút gọn ở đây để
  // harness tự đứng khi test. Khi kế hoạch 01 hoàn tất, kiểu Seed đầy đủ tương thích bản này
  // (đây là tập con). Nếu muốn, sau này đổi dòng dưới thành:
  //   export type { Seed } from "../data/schema/types";
  export type AnswerType =
    | "rational" | "surd" | "ratio" | "point"
    | "vector" | "plane_eq" | "line_eq" | "boolean" | "mcq";

  export interface Answer {
    canonical: string;
    type: AnswerType;
    human_note?: string;
  }

  export interface Seed {
    id: string;
    source: { type: "exam" | "textbook" | "synthetic"; ref: string; license?: string };
    statement_vi: string;
    figure?: { points?: { id: string; x: number; y: number; z: number }[]; coords_given: boolean };
    answer: Answer;
    tags: {
      topic: string[];
      answer_form: AnswerType;
      difficulty: 1 | 2 | 3 | 4;
      requires_auxiliary_construction: boolean;
    };
    solution_ref_vi?: string;
    verified_by_engine?: boolean;
    scale_degree?: number;
  }
  ```
  Tạo `research/vsgeo-bench/harness/prompt.ts`:
  ```ts
  import type { Seed } from "./seedTypes";
  import type { PromptStyle } from "./types";

  // Lời hệ thống (system) CỐ ĐỊNH cho mọi model, mọi bài — để giao thức đồng nhất, tái lập được.
  // Điểm mấu chốt: BẮT BUỘC kết luận cuối trong \boxed{...} để parser (§4.2) trích được.
  const SYSTEM_PROMPT = [
    "Bạn là trợ giảng Toán, chuyên hình học không gian (lớp 11–12) chương trình THPT Việt Nam.",
    "Hãy giải bài toán được giao một cách chính xác.",
    "Quan trọng: đặt ĐÁP ÁN CUỐI CÙNG trong một lệnh \\boxed{...} duy nhất ở cuối câu trả lời.",
    "Ví dụ kết luận: \\boxed{a\\sqrt{6}/3}. Chỉ đặt kết quả gọn nhất trong \\boxed{}, không kèm chữ.",
  ].join(" ");

  export function buildPrompt(seed: Seed, style: PromptStyle): { system: string; user: string } {
    const de = seed.statement_vi;
    let user: string;
    if (style === "zero_shot") {
      user =
        `Giải bài sau. Trả lời ngắn gọn và đặt đáp án cuối trong \\boxed{...}.\n\n` +
        `Đề: ${de}`;
    } else {
      // cot = chain-of-thought: yêu cầu suy luận từng bước rồi mới chốt.
      user =
        // Viết "từng bước" THƯỜNG (không hoa) để khớp chính xác test ở Bước 1
        // (`toContain("từng bước")` phân biệt hoa–thường). Chớ viết HOA kẻo test đỏ.
        `Giải bài sau. Hãy suy luận từng bước rõ ràng, sau đó đặt đáp án cuối trong \\boxed{...}.\n\n` +
        `Đề: ${de}`;
    }
    return { system: SYSTEM_PROMPT, user };
  }
  ```

- [ ] **Bước 4 — Chạy test PASS.**
  ```
  npm test -- research/vsgeo-bench/harness/__tests__/prompt.test.ts
  ```
  Kỳ vọng: `3 passed`.

- [ ] **Bước 5 — Commit.**
  ```
  git add research/vsgeo-bench/harness/prompt.ts research/vsgeo-bench/harness/seedTypes.ts research/vsgeo-bench/harness/__tests__/prompt.test.ts
  git commit -m "feat(harness): buildPrompt zero_shot/cot buộc kết luận trong boxed"
  ```

---

### Task 3: Trích đáp án từ `\boxed{...}` (extractBoxed)

**Vì sao?** Model trả cả một bài dài; ta cần lấy đúng phần trong `\boxed{}` để đưa vào `EvalRecord.extractedAnswer` (và để soi lỗi). Phải xử lý *ngoặc lồng nhau* (vd `\boxed{\frac{a}{2}}`) và lấy `\boxed` **cuối cùng** nếu có nhiều cái.

> **Ghi chú ranh giới:** máy chấm `grade()` (kế hoạch 02) nhận **nguyên văn** model (`modelAnswerRaw`) và tự làm phần chuẩn hoá. Hàm `extractBoxed` ở đây chỉ để **hiển thị/ghi log** trường `extractedAnswer` cho dễ đọc. Ta vẫn truyền *nguyên văn* cho `grade()`.

**Files:**
- Create: `research/vsgeo-bench/harness/extract.ts`
- Test: `research/vsgeo-bench/harness/__tests__/extract.test.ts`

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/harness/__tests__/extract.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { extractBoxed } from "../extract";

  describe("extractBoxed — lấy nội dung trong \\boxed{...}", () => {
    it("lấy được trường hợp đơn giản", () => {
      expect(extractBoxed("Vậy đáp án là \\boxed{a\\sqrt6/3}.")).toBe("a\\sqrt6/3");
    });

    it("xử lý ngoặc lồng nhau", () => {
      expect(extractBoxed("Kết quả \\boxed{\\frac{a}{2}} nhé")).toBe("\\frac{a}{2}");
    });

    it("có nhiều \\boxed thì lấy CÁI CUỐI", () => {
      expect(extractBoxed("thử \\boxed{1} rồi sửa \\boxed{2}")).toBe("2");
    });

    it("không có \\boxed thì trả null", () => {
      expect(extractBoxed("mình không chắc đáp án")).toBeNull();
    });

    it("cắt khoảng trắng thừa", () => {
      expect(extractBoxed("\\boxed{  V = 8  }")).toBe("V = 8");
    });
  });
  ```

- [ ] **Bước 2 — Chạy test cho thấy FAIL.**
  ```
  npm test -- research/vsgeo-bench/harness/__tests__/extract.test.ts
  ```
  Kỳ vọng: FAIL — `Cannot find module '../extract'`.

- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/harness/extract.ts`:
  ```ts
  // Trích nội dung trong \boxed{...} CUỐI CÙNG của chuỗi.
  // Tự đếm ngoặc để xử lý lồng nhau (regex thường không làm được ngoặc lồng).
  // Trả null nếu không tìm thấy \boxed{ hợp lệ.
  export function extractBoxed(raw: string): string | null {
    const marker = "\\boxed{";
    let result: string | null = null;
    let searchFrom = 0;

    while (true) {
      const start = raw.indexOf(marker, searchFrom);
      if (start === -1) break;               // hết \boxed{ để xét
      const contentStart = start + marker.length;

      // Quét từ contentStart, đếm độ sâu ngoặc để tìm } đóng khớp.
      let depth = 1;
      let i = contentStart;
      for (; i < raw.length; i++) {
        const ch = raw[i];
        if (ch === "{") depth++;
        else if (ch === "}") {
          depth--;
          if (depth === 0) break;            // } đóng khớp với \boxed{
        }
      }
      if (depth === 0) {
        result = raw.slice(contentStart, i).trim();  // chỉ nhận khi ngoặc đóng cân; ghi đè => giữ CUỐI
      }
      // LUÔN nhích qua marker này rồi quét tiếp — kể cả khi ngoặc KHÔNG đóng cân. Một \boxed{
      // hỏng/bị cắt cụt ở phía TRƯỚC không được che mất \boxed{...} hợp lệ phía SAU (khớp cách
      // grader/extract.ts làm; xem Task 11 — bản `break` cũ làm mất box sau). contentStart > start
      // nên indexOf lần sau luôn tiến => không lặp vô tận.
      searchFrom = contentStart;
    }
    return result;
  }
  ```

- [ ] **Bước 4 — Chạy test PASS.**
  ```
  npm test -- research/vsgeo-bench/harness/__tests__/extract.test.ts
  ```
  Kỳ vọng: `5 passed`.

- [ ] **Bước 5 — Commit.**
  ```
  git add research/vsgeo-bench/harness/extract.ts research/vsgeo-bench/harness/__tests__/extract.test.ts
  git commit -m "feat(harness): extractBoxed lấy đáp án trong boxed (xử lý ngoặc lồng)"
  ```

---

### Task 4: Adapter OpenAI — tách "dựng request" và "đọc response"

**Vì sao tách đôi?** Nếu để việc dựng URL/headers/body chung với `fetch`, ta không test được mà không gọi mạng. Nên ta viết **hai hàm thuần**: `buildOpenAIRequest(...)` trả `{ url, headers, body }` (test được), và `parseOpenAIResponse(...)` biến JSON trả về thành `ModelReply` (test được). Hàm `call()` chỉ ghép hai cái đó với `fetch` — phần này chỉ chạy khi chạy thật.

> **Nguồn tham chiếu:** cách đặt header `Authorization: Bearer <key>`, endpoint `/v1/chat/completions`, và body `{ model, messages, max_tokens }` bắt chước theo `api/_lib/vilao.js` (dùng chuẩn OpenAI-compatible). Khoá đọc qua `process.env.OPENAI_API_KEY` (đã nạp bằng `dotenv`).

**Files:**
- Create: `research/vsgeo-bench/harness/models/openai.ts`
- Test: `research/vsgeo-bench/harness/__tests__/openai.test.ts`

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/harness/__tests__/openai.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { buildOpenAIRequest, parseOpenAIResponse } from "../models/openai";

  describe("OpenAI adapter — dựng request (thuần, không mạng)", () => {
    it("đặt đúng endpoint, header Bearer và body messages", () => {
      const req = buildOpenAIRequest("gpt-5.6", "SYS", "USER", { temperature: 0, maxTokens: 1024 }, "sk-test");
      expect(req.url).toBe("https://api.openai.com/v1/chat/completions");
      expect(req.headers["Authorization"]).toBe("Bearer sk-test");
      expect(req.headers["Content-Type"]).toBe("application/json");
      const body = JSON.parse(req.body);
      expect(body.model).toBe("gpt-5.6");
      expect(body.max_tokens).toBe(1024);
      expect(body.temperature).toBe(0);
      expect(body.messages).toEqual([
        { role: "system", content: "SYS" },
        { role: "user", content: "USER" },
      ]);
    });
  });

  describe("OpenAI adapter — parse response (thuần, không mạng)", () => {
    it("bóc text + usage từ JSON mẫu ra ModelReply", () => {
      const sample = {
        choices: [{ message: { content: "Đáp án \\boxed{8}" } }],
        usage: { prompt_tokens: 120, completion_tokens: 30 },
      };
      const reply = parseOpenAIResponse(sample, 1500);
      expect(reply.text).toBe("Đáp án \\boxed{8}");
      expect(reply.latencyMs).toBe(1500);
      expect(reply.usage).toEqual({ in: 120, out: 30 });
    });

    it("ném lỗi khi response không có choices (để callModel bắt và retry)", () => {
      expect(() => parseOpenAIResponse({ error: "boom" } as any, 10)).toThrow();
    });
  });
  ```

- [ ] **Bước 2 — Chạy test cho thấy FAIL.**
  ```
  npm test -- research/vsgeo-bench/harness/__tests__/openai.test.ts
  ```
  Kỳ vọng: FAIL — `Cannot find module '../models/openai'`.

- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/harness/models/openai.ts`:
  ```ts
  import type { ModelReply } from "../types";

  // ===== Phần THUẦN 1: dựng request. Test được, không đụng mạng. =====
  export function buildOpenAIRequest(
    model: string,               // tên model đã BỎ tiền tố "openai:" (vd "gpt-5.6")
    system: string,
    user: string,
    opts: { temperature?: number; maxTokens?: number },
    apiKey: string
  ): { url: string; headers: Record<string, string>; body: string } {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0,
      }),
    };
  }

  // ===== Phần THUẦN 2: đọc response. Test được, không đụng mạng. =====
  export function parseOpenAIResponse(json: any, latencyMs: number): ModelReply {
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim() === "") {
      throw new Error("OpenAI: response không có nội dung hợp lệ");
    }
    const u = json.usage;
    const usage = u ? { in: u.prompt_tokens ?? 0, out: u.completion_tokens ?? 0 } : undefined;
    return { text: content, latencyMs, usage };
  }

  // ===== Phần CÓ MẠNG: chỉ chạy khi chạy thật. Không viết unit test cho hàm này. =====
  export async function call(
    model: string,
    system: string,
    user: string,
    opts: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {}
  ): Promise<ModelReply> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Thiếu OPENAI_API_KEY trong môi trường (.env)");
    const req = buildOpenAIRequest(model, system, user, opts, apiKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120000);
    const t0 = Date.now();
    try {
      const res = await fetch(req.url, {
        method: "POST",
        headers: req.headers,
        body: req.body,
        signal: controller.signal,
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }
      const json = await res.json();
      return parseOpenAIResponse(json, Date.now() - t0);
    } finally {
      clearTimeout(timeout);
    }
  }
  ```

- [ ] **Bước 4 — Chạy test PASS.**
  ```
  npm test -- research/vsgeo-bench/harness/__tests__/openai.test.ts
  ```
  Kỳ vọng: `3 passed`.

- [ ] **Bước 5 — Commit.**
  ```
  git add research/vsgeo-bench/harness/models/openai.ts research/vsgeo-bench/harness/__tests__/openai.test.ts
  git commit -m "feat(harness): adapter OpenAI (build/parse thuần + call fetch)"
  ```

---

### Task 5: Adapter Gemini

**Vì sao khác OpenAI?** Google Gemini có *hình dạng request/response khác hẳn*: khoá đi trong query `?key=...`, đề bài nằm trong `contents[].parts[].text`, system nằm ở `systemInstruction`, và usage tên là `usageMetadata`. Đây là lý do mỗi nhà cung cấp cần một adapter riêng.

**Files:**
- Create: `research/vsgeo-bench/harness/models/gemini.ts`
- Test: `research/vsgeo-bench/harness/__tests__/gemini.test.ts`

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/harness/__tests__/gemini.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { buildGeminiRequest, parseGeminiResponse } from "../models/gemini";

  describe("Gemini adapter — dựng request (thuần)", () => {
    it("khoá nằm trong URL, đề nằm trong contents, system ở systemInstruction", () => {
      const req = buildGeminiRequest("gemini-2.5-pro", "SYS", "USER", { temperature: 0, maxTokens: 2048 }, "AIza-test");
      expect(req.url).toBe(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=AIza-test"
      );
      const body = JSON.parse(req.body);
      expect(body.systemInstruction.parts[0].text).toBe("SYS");
      expect(body.contents[0].parts[0].text).toBe("USER");
      expect(body.generationConfig.temperature).toBe(0);
      expect(body.generationConfig.maxOutputTokens).toBe(2048);
    });
  });

  describe("Gemini adapter — parse response (thuần)", () => {
    it("bóc text từ candidates + usageMetadata", () => {
      const sample = {
        candidates: [{ content: { parts: [{ text: "Vậy \\boxed{a^3}" }] } }],
        usageMetadata: { promptTokenCount: 88, candidatesTokenCount: 12 },
      };
      const reply = parseGeminiResponse(sample, 900);
      expect(reply.text).toBe("Vậy \\boxed{a^3}");
      expect(reply.latencyMs).toBe(900);
      expect(reply.usage).toEqual({ in: 88, out: 12 });
    });

    it("ném lỗi khi bị chặn / không có candidates", () => {
      expect(() => parseGeminiResponse({ promptFeedback: { blockReason: "SAFETY" } } as any, 5)).toThrow();
    });
  });
  ```

- [ ] **Bước 2 — Chạy test cho thấy FAIL.**
  ```
  npm test -- research/vsgeo-bench/harness/__tests__/gemini.test.ts
  ```
  Kỳ vọng: FAIL — `Cannot find module '../models/gemini'`.

- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/harness/models/gemini.ts`:
  ```ts
  import type { ModelReply } from "../types";

  export function buildGeminiRequest(
    model: string,               // đã bỏ tiền tố "gemini:" (vd "gemini-2.5-pro")
    system: string,
    user: string,
    opts: { temperature?: number; maxTokens?: number },
    apiKey: string
  ): { url: string; headers: Record<string, string>; body: string } {
    return {
      url:
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0,
          maxOutputTokens: opts.maxTokens ?? 4096,
        },
      }),
    };
  }

  export function parseGeminiResponse(json: any, latencyMs: number): ModelReply {
    const parts = json?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts)
      ? parts.map((p: any) => p?.text ?? "").join("")
      : "";
    if (!text || text.trim() === "") {
      throw new Error("Gemini: không có nội dung (có thể bị chặn an toàn)");
    }
    const u = json.usageMetadata;
    const usage = u ? { in: u.promptTokenCount ?? 0, out: u.candidatesTokenCount ?? 0 } : undefined;
    return { text, latencyMs, usage };
  }

  export async function call(
    model: string,
    system: string,
    user: string,
    opts: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {}
  ): Promise<ModelReply> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Thiếu GEMINI_API_KEY trong môi trường (.env)");
    const req = buildGeminiRequest(model, system, user, opts, apiKey);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120000);
    const t0 = Date.now();
    try {
      const res = await fetch(req.url, {
        method: "POST",
        headers: req.headers,
        body: req.body,
        signal: controller.signal,
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }
      const json = await res.json();
      return parseGeminiResponse(json, Date.now() - t0);
    } finally {
      clearTimeout(timeout);
    }
  }
  ```

- [ ] **Bước 4 — Chạy test PASS.**
  ```
  npm test -- research/vsgeo-bench/harness/__tests__/gemini.test.ts
  ```
  Kỳ vọng: `3 passed`.

- [ ] **Bước 5 — Commit.**
  ```
  git add research/vsgeo-bench/harness/models/gemini.ts research/vsgeo-bench/harness/__tests__/gemini.test.ts
  git commit -m "feat(harness): adapter Gemini (build/parse thuần + call fetch)"
  ```

---

### Task 6: Adapter Anthropic (Claude) + OpenRouter

**Vì sao gộp?** Anthropic có hình dạng riêng (header `x-api-key`, `anthropic-version`, response `content[].text`). OpenRouter thì *tương thích OpenAI* nên ta tái dùng chính hàm dựng/đọc của OpenAI, chỉ đổi URL. Cả hai đều có code đầy đủ dưới đây (không viết tắt).

**Files:**
- Create: `research/vsgeo-bench/harness/models/anthropic.ts`
- Create: `research/vsgeo-bench/harness/models/openrouter.ts`
- Test: `research/vsgeo-bench/harness/__tests__/anthropic.test.ts`
- Test: `research/vsgeo-bench/harness/__tests__/openrouter.test.ts`

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/harness/__tests__/anthropic.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { buildAnthropicRequest, parseAnthropicResponse } from "../models/anthropic";

  describe("Anthropic adapter — dựng request (thuần)", () => {
    it("dùng header x-api-key + anthropic-version, system tách riêng", () => {
      const req = buildAnthropicRequest("claude-opus-4-8", "SYS", "USER", { temperature: 0, maxTokens: 1024 }, "sk-ant-test");
      expect(req.url).toBe("https://api.anthropic.com/v1/messages");
      expect(req.headers["x-api-key"]).toBe("sk-ant-test");
      expect(req.headers["anthropic-version"]).toBe("2023-06-01");
      const body = JSON.parse(req.body);
      expect(body.model).toBe("claude-opus-4-8");
      expect(body.system).toBe("SYS");
      expect(body.max_tokens).toBe(1024);
      expect(body.messages).toEqual([{ role: "user", content: "USER" }]);
    });
  });

  describe("Anthropic adapter — parse response (thuần)", () => {
    it("bóc content[].text + usage input/output_tokens", () => {
      const sample = {
        content: [{ type: "text", text: "Kết luận \\boxed{2}" }],
        usage: { input_tokens: 50, output_tokens: 8 },
      };
      const reply = parseAnthropicResponse(sample, 700);
      expect(reply.text).toBe("Kết luận \\boxed{2}");
      expect(reply.usage).toEqual({ in: 50, out: 8 });
    });

    it("ném lỗi khi content rỗng", () => {
      expect(() => parseAnthropicResponse({ content: [] } as any, 3)).toThrow();
    });
  });
  ```
  Tạo `research/vsgeo-bench/harness/__tests__/openrouter.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { buildOpenRouterRequest, parseOpenRouterResponse } from "../models/openrouter";

  describe("OpenRouter adapter — tương thích OpenAI, chỉ khác URL", () => {
    it("dựng request tới endpoint openrouter với body kiểu OpenAI", () => {
      const req = buildOpenRouterRequest("qwen/qwen-2.5-72b-instruct", "SYS", "USER", { maxTokens: 512 }, "sk-or-test");
      expect(req.url).toBe("https://openrouter.ai/api/v1/chat/completions");
      expect(req.headers["Authorization"]).toBe("Bearer sk-or-test");
      const body = JSON.parse(req.body);
      expect(body.model).toBe("qwen/qwen-2.5-72b-instruct");
      expect(body.messages[0]).toEqual({ role: "system", content: "SYS" });
    });

    it("parse dùng lại logic OpenAI", () => {
      const sample = { choices: [{ message: { content: "\\boxed{1}" } }], usage: { prompt_tokens: 10, completion_tokens: 2 } };
      const reply = parseOpenRouterResponse(sample, 400);
      expect(reply.text).toBe("\\boxed{1}");
      expect(reply.usage).toEqual({ in: 10, out: 2 });
    });
  });
  ```

- [ ] **Bước 2 — Chạy test cho thấy FAIL.**
  ```
  npm test -- research/vsgeo-bench/harness/__tests__/anthropic.test.ts research/vsgeo-bench/harness/__tests__/openrouter.test.ts
  ```
  Kỳ vọng: FAIL — thiếu hai module `../models/anthropic` và `../models/openrouter`.

- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/harness/models/anthropic.ts`:
  ```ts
  import type { ModelReply } from "../types";

  export function buildAnthropicRequest(
    model: string,               // đã bỏ tiền tố "anthropic:" (vd "claude-opus-4-8")
    system: string,
    user: string,
    opts: { temperature?: number; maxTokens?: number },
    apiKey: string
  ): { url: string; headers: Record<string, string>; body: string } {
    return {
      url: "https://api.anthropic.com/v1/messages",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0,
        system,                                       // Anthropic để system TÁCH RIÊNG, không trong messages
        messages: [{ role: "user", content: user }],
      }),
    };
  }

  export function parseAnthropicResponse(json: any, latencyMs: number): ModelReply {
    const blocks = json?.content;
    const text = Array.isArray(blocks)
      ? blocks.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("")
      : "";
    if (!text || text.trim() === "") {
      throw new Error("Anthropic: response không có nội dung text");
    }
    const u = json.usage;
    const usage = u ? { in: u.input_tokens ?? 0, out: u.output_tokens ?? 0 } : undefined;
    return { text, latencyMs, usage };
  }

  export async function call(
    model: string,
    system: string,
    user: string,
    opts: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {}
  ): Promise<ModelReply> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Thiếu ANTHROPIC_API_KEY trong môi trường (.env)");
    const req = buildAnthropicRequest(model, system, user, opts, apiKey);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120000);
    const t0 = Date.now();
    try {
      const res = await fetch(req.url, {
        method: "POST",
        headers: req.headers,
        body: req.body,
        signal: controller.signal,
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Anthropic HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }
      const json = await res.json();
      return parseAnthropicResponse(json, Date.now() - t0);
    } finally {
      clearTimeout(timeout);
    }
  }
  ```
  Tạo `research/vsgeo-bench/harness/models/openrouter.ts` (tái dùng logic OpenAI, chỉ đổi URL):
  ```ts
  import type { ModelReply } from "../types";
  import { parseOpenAIResponse } from "./openai";

  export function buildOpenRouterRequest(
    model: string,               // đã bỏ tiền tố "openrouter:" (vd "qwen/qwen-2.5-72b-instruct")
    system: string,
    user: string,
    opts: { temperature?: number; maxTokens?: number },
    apiKey: string
  ): { url: string; headers: Record<string, string>; body: string } {
    return {
      url: "https://openrouter.ai/api/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0,
      }),
    };
  }

  // OpenRouter trả response y hệt OpenAI => dùng lại parseOpenAIResponse.
  export function parseOpenRouterResponse(json: any, latencyMs: number): ModelReply {
    return parseOpenAIResponse(json, latencyMs);
  }

  export async function call(
    model: string,
    system: string,
    user: string,
    opts: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {}
  ): Promise<ModelReply> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("Thiếu OPENROUTER_API_KEY trong môi trường (.env)");
    const req = buildOpenRouterRequest(model, system, user, opts, apiKey);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120000);
    const t0 = Date.now();
    try {
      const res = await fetch(req.url, {
        method: "POST",
        headers: req.headers,
        body: req.body,
        signal: controller.signal,
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }
      const json = await res.json();
      return parseOpenRouterResponse(json, Date.now() - t0);
    } finally {
      clearTimeout(timeout);
    }
  }
  ```

- [ ] **Bước 4 — Chạy test PASS.**
  ```
  npm test -- research/vsgeo-bench/harness/__tests__/anthropic.test.ts research/vsgeo-bench/harness/__tests__/openrouter.test.ts
  ```
  Kỳ vọng: `5 passed` (3 của anthropic + 2 của openrouter).

- [ ] **Bước 5 — Commit.**
  ```
  git add research/vsgeo-bench/harness/models/anthropic.ts research/vsgeo-bench/harness/models/openrouter.ts research/vsgeo-bench/harness/__tests__/anthropic.test.ts research/vsgeo-bench/harness/__tests__/openrouter.test.ts
  git commit -m "feat(harness): adapter Anthropic + OpenRouter (build/parse thuần + call fetch)"
  ```

---

### Task 7: callModel — định tuyến theo tiền tố + retry/backoff + gắn chi phí

**Vì sao?** Đây là "tổng đài": nhận `modelId` kiểu `"gemini:gemini-2.5-pro"`, cắt tiền tố `"gemini"` để chọn adapter, cắt phần sau (`gemini-2.5-pro`) làm tên model đưa cho adapter. Nếu adapter lỗi tạm thời (mạng chập, 429, 5xx) thì **thử lại vài lần với thời gian chờ tăng dần (exponential backoff)**. Cuối cùng gắn `costUsd` ước tính.

**Mẹo test không gọi mạng:** ta cho `callModel` nhận thêm tham số `deps` (dependencies) để *tiêm adapter giả* và *tiêm hàm sleep giả* (để test không phải chờ thật). Khi chạy thật, `deps` bỏ trống → dùng adapter thật + sleep thật.

**Files:**
- Create: `research/vsgeo-bench/harness/callModel.ts`
- Test: `research/vsgeo-bench/harness/__tests__/callModel.test.ts`

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/harness/__tests__/callModel.test.ts`:
  ```ts
  import { describe, it, expect, vi } from "vitest";
  import { callModel } from "../callModel";
  import type { ModelReply } from "../types";

  // Một adapter giả: ghi lại nó nhận model gì, trả về reply cố định.
  function fakeAdapter(reply: ModelReply) {
    const spy = vi.fn(async (_model: string) => reply);
    return { call: spy, spy };
  }

  const noSleep = async (_ms: number) => {};  // sleep giả: không chờ gì cả

  describe("callModel — định tuyến theo tiền tố", () => {
    it("chọn đúng adapter theo tiền tố và bỏ tiền tố khỏi tên model", async () => {
      const openai = fakeAdapter({ text: "\\boxed{1}", latencyMs: 10, usage: { in: 5, out: 1 } });
      const gemini = fakeAdapter({ text: "\\boxed{2}", latencyMs: 20 });
      const reply = await callModel(
        "gemini:gemini-2.5-pro", "S", "U", {},
        { adapters: { openai: openai.call, gemini: gemini.call }, sleep: noSleep }
      );
      expect(gemini.spy).toHaveBeenCalledWith("gemini-2.5-pro", "S", "U", {});
      expect(openai.spy).not.toHaveBeenCalled();
      expect(reply.text).toBe("\\boxed{2}");
    });

    it("gắn costUsd từ bảng giá khi có usage + model có giá", async () => {
      const adapter = fakeAdapter({ text: "x", latencyMs: 1, usage: { in: 1000, out: 500 } });
      const reply = await callModel(
        "test:demo", "S", "U", {},
        { adapters: { test: adapter.call }, sleep: noSleep }
      );
      expect(reply.costUsd).toBeCloseTo(0.002, 9);  // theo PRICING['test:demo']
    });

    it("ném lỗi khi tiền tố không có adapter tương ứng", async () => {
      await expect(
        callModel("khong:gi", "S", "U", {}, { adapters: {}, sleep: noSleep })
      ).rejects.toThrow(/không nhận ra nhà cung cấp/);
    });
  });

  describe("callModel — retry khi lỗi tạm thời", () => {
    it("thử lại rồi thành công ở lần 2", async () => {
      let n = 0;
      const flaky = vi.fn(async () => {
        n++;
        if (n === 1) throw new Error("network timeout tạm thời");
        return { text: "ok", latencyMs: 5 } as ModelReply;
      });
      const reply = await callModel(
        "openai:gpt-x", "S", "U", {},
        { adapters: { openai: flaky }, sleep: noSleep, maxAttempts: 3 }
      );
      expect(n).toBe(2);
      expect(reply.text).toBe("ok");
    });

    it("hết số lần thử thì ném lỗi cuối", async () => {
      const always = vi.fn(async () => { throw new Error("HTTP 503 dịch vụ bận"); });
      await expect(
        callModel("openai:gpt-x", "S", "U", {}, { adapters: { openai: always }, sleep: noSleep, maxAttempts: 3 })
      ).rejects.toThrow(/503/);
      expect(always).toHaveBeenCalledTimes(3);
    });
  });
  ```

- [ ] **Bước 2 — Chạy test cho thấy FAIL.**
  ```
  npm test -- research/vsgeo-bench/harness/__tests__/callModel.test.ts
  ```
  Kỳ vọng: FAIL — `Cannot find module '../callModel'`.

- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/harness/callModel.ts`:
  ```ts
  import type { ModelReply } from "./types";
  import { estimateCostUsd } from "./pricing";
  import { call as openaiCall } from "./models/openai";
  import { call as geminiCall } from "./models/gemini";
  import { call as anthropicCall } from "./models/anthropic";
  import { call as openrouterCall } from "./models/openrouter";

  // Kiểu một hàm adapter: nhận tên model (đã bỏ tiền tố) + system/user/opts, trả ModelReply.
  export type AdapterCall = (
    model: string,
    system: string,
    user: string,
    opts: { temperature?: number; maxTokens?: number; timeoutMs?: number }
  ) => Promise<ModelReply>;

  // Bảng adapter THẬT, khoá theo tiền tố nhà cung cấp.
  const REAL_ADAPTERS: Record<string, AdapterCall> = {
    openai: openaiCall,
    gemini: geminiCall,
    anthropic: anthropicCall,
    openrouter: openrouterCall,
  };

  const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  // Nhận biết lỗi "tạm thời" đáng thử lại (mạng chập, quá tải, giới hạn nhịp, quá hạn).
  // Bắt chước cách phân loại của api/_lib/vilao.js.
  //
  // Hai bẫy do bộ tự-phản-biện phát hiện (xem Task 11), đã vá sẵn ở đây:
  //   F1 — timeout do CHÍNH harness kích qua AbortController.abort() làm fetch ném lỗi
  //        name="AbortError", message "This operation was aborted" — KHÔNG chứa chữ "timeout".
  //        Dò chuỗi con "timeout" sẽ BỎ SÓT => timeout không bao giờ được retry. Sửa: bắt theo TÊN.
  //   F4 — dò chuỗi con "500" khớp NHẦM "8500" trong thân lỗi HTTP 400 (vd "max_tokens ... 8500
  //        tokens") => 4xx vĩnh viễn bị retry vô ích. Sửa: đọc ĐÚNG mã ngay sau "HTTP ".
  function isTransient(err: unknown): boolean {
    // F1 — timeout của harness: bắt theo TÊN lỗi, không theo chuỗi con.
    if (err instanceof Error && err.name === "AbortError") return true;

    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();

    // F4 — có mã HTTP thì quyết định LUÔN tại đây (mọi adapter ném "PROVIDER HTTP <mã>: <thân>"):
    // chỉ 429 (quá nhịp) và 5xx là tạm thời; 4xx khác là vĩnh viễn. Đọc mã ngay sau "http ".
    const httpMatch = msg.match(/\bhttp (\d{3})\b/);
    if (httpMatch) {
      const status = Number(httpMatch[1]);
      return status === 429 || status >= 500;
    }

    // Lỗi mạng cấp thấp (không kèm mã HTTP): chập mạng, mất/không nối được, quá hạn, quá nhịp.
    return (
      msg.includes("timeout") ||
      msg.includes("timed out") ||
      msg.includes("network") ||
      msg.includes("fetch failed") ||
      msg.includes("econnreset") ||
      msg.includes("econnrefused") ||
      msg.includes("rate limit")
    );
  }

  export interface CallModelDeps {
    adapters?: Record<string, AdapterCall>;   // tiêm adapter giả khi test
    sleep?: (ms: number) => Promise<void>;    // tiêm sleep giả khi test
    maxAttempts?: number;                     // số lần thử tối đa (mặc định 3)
  }

  export async function callModel(
    modelId: string,
    system: string,
    user: string,
    opts: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {},
    deps: CallModelDeps = {}
  ): Promise<ModelReply> {
    const adapters = deps.adapters ?? REAL_ADAPTERS;
    const sleep = deps.sleep ?? realSleep;
    const maxAttempts = deps.maxAttempts ?? 3;

    // Tách "tiền tố:phần-còn-lại". indexOf để giữ nguyên dấu ':' trong tên model (vd openrouter path).
    const sep = modelId.indexOf(":");
    if (sep === -1) throw new Error(`modelId phải có dạng "nhàCC:tên", nhận: ${modelId}`);
    const provider = modelId.slice(0, sep);
    const bareModel = modelId.slice(sep + 1);

    const adapter = adapters[provider];
    if (!adapter) throw new Error(`callModel: không nhận ra nhà cung cấp "${provider}" (modelId=${modelId})`);

    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const reply = await adapter(bareModel, system, user, opts);
        // Gắn chi phí ước tính (nếu chưa có sẵn từ adapter).
        const costUsd = reply.costUsd ?? estimateCostUsd(modelId, reply.usage);
        return { ...reply, costUsd };
      } catch (err) {
        lastErr = err;
        if (attempt < maxAttempts && isTransient(err)) {
          // Backoff luỹ thừa: chờ 500ms, 1000ms, 2000ms... trước lần thử kế.
          await sleep(500 * 2 ** (attempt - 1));
          continue;
        }
        throw err;   // lỗi vĩnh viễn hoặc đã hết lượt => ném ra
      }
    }
    throw lastErr;   // lý thuyết không tới đây, nhưng để TypeScript yên tâm
  }
  ```

- [ ] **Bước 4 — Chạy test PASS.**
  ```
  npm test -- research/vsgeo-bench/harness/__tests__/callModel.test.ts
  ```
  Kỳ vọng: `5 passed`.

- [ ] **Bước 5 — Commit.**
  ```
  git add research/vsgeo-bench/harness/callModel.ts research/vsgeo-bench/harness/__tests__/callModel.test.ts
  git commit -m "feat(harness): callModel định tuyến theo tiền tố + retry/backoff + costUsd"
  ```

---

### Task 8: runEval — vòng lặp seed × model × k và sinh EvalRecord

**Vì sao tách `runEval` khỏi CLI?** Vòng lặp lõi (đọc seed, gọi model, trích, chấm, gom `EvalRecord`) là phần *cần test*. Ta viết nó thành hàm thuần-logic nhận `deps` (callModel giả, grade giả, extractBoxed, buildPrompt) → test được không cần mạng, không cần grader thật. Phần CLI (đọc file, ghi file, đọc tham số dòng lệnh) làm ở Task 9.

**Điểm mấu chốt cần test:**
1. Số bản ghi = `seeds × models × styles × k` (không thiếu, không thừa).
2. `verdict` lấy đúng từ `grade()`.
3. Một bài lỗi (model ném lỗi) **không làm sập cả mẻ** — nó thành một bản ghi `verdict:"unsure"` và vòng lặp chạy tiếp.

**Files:**
- Create: `research/vsgeo-bench/harness/runEval.ts`
- Test: `research/vsgeo-bench/harness/__tests__/runEval.test.ts`

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/harness/__tests__/runEval.test.ts`:
  ```ts
  import { describe, it, expect, vi } from "vitest";
  import { runEval } from "../runEval";
  import type { Seed } from "../seedTypes";
  import type { EvalRecord } from "../types";

  function makeSeed(id: string): Seed {
    return {
      id,
      source: { type: "synthetic", ref: "demo" },
      statement_vi: `Đề ${id}`,
      answer: { canonical: "1", type: "rational" },
      tags: { topic: ["the_tich"], answer_form: "rational", difficulty: 1, requires_auxiliary_construction: false },
    } as Seed;
  }

  describe("runEval — vòng lặp sinh EvalRecord", () => {
    it("sinh đúng số bản ghi = seeds × models × styles × k", async () => {
      const seeds = [makeSeed("s1"), makeSeed("s2")];
      const models = ["openai:gpt-x", "gemini:g"];
      const fakeCall = vi.fn(async () => ({ text: "đáp \\boxed{1}", latencyMs: 3 }));
      const fakeGrade = vi.fn(() => ({ verdict: "correct" as const, reason: "khớp" }));

      const records: EvalRecord[] = await runEval(seeds, models, {
        k: 3, styles: ["zero_shot"], temperature: 0,
      }, { callModel: fakeCall, grade: fakeGrade });

      // 2 seed × 2 model × 1 style × 3 run = 12
      expect(records.length).toBe(12);
      expect(fakeCall).toHaveBeenCalledTimes(12);
    });

    it("verdict lấy từ grade(); extractedAnswer lấy trong \\boxed", async () => {
      const seeds = [makeSeed("s1")];
      const fakeCall = vi.fn(async () => ({ text: "vậy \\boxed{42}", latencyMs: 1 }));
      const fakeGrade = vi.fn(() => ({ verdict: "incorrect" as const, reason: "sai" }));

      const records = await runEval(seeds, ["openai:gpt-x"], { k: 1, styles: ["zero_shot"], temperature: 0 },
        { callModel: fakeCall, grade: fakeGrade });

      expect(records[0].verdict).toBe("incorrect");
      expect(records[0].extractedAnswer).toBe("42");
      // grade nhận NGUYÊN VĂN model, và đáp án chuẩn của seed:
      expect(fakeGrade).toHaveBeenCalledWith("vậy \\boxed{42}", seeds[0].answer);
    });

    it("một bài lỗi không làm sập mẻ — thành verdict 'unsure'", async () => {
      const seeds = [makeSeed("s1"), makeSeed("s2")];
      let n = 0;
      const fakeCall = vi.fn(async () => {
        n++;
        if (n === 1) throw new Error("model chết bất ngờ");
        return { text: "\\boxed{1}", latencyMs: 2 };
      });
      const fakeGrade = vi.fn(() => ({ verdict: "correct" as const, reason: "ok" }));

      const records = await runEval(seeds, ["openai:gpt-x"], { k: 1, styles: ["zero_shot"], temperature: 0 },
        { callModel: fakeCall, grade: fakeGrade });

      expect(records.length).toBe(2);                       // vẫn đủ 2 bản ghi
      expect(records[0].verdict).toBe("unsure");            // bài lỗi
      expect(records[0].rawOutput).toContain("model chết"); // ghi lại thông báo lỗi
      expect(records[1].verdict).toBe("correct");           // bài sau vẫn chạy
    });
  });
  ```

- [ ] **Bước 2 — Chạy test cho thấy FAIL.**
  ```
  npm test -- research/vsgeo-bench/harness/__tests__/runEval.test.ts
  ```
  Kỳ vọng: FAIL — `Cannot find module '../runEval'`.

- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/harness/runEval.ts`:
  ```ts
  import type { Seed, Answer } from "./seedTypes";
  import type { EvalRecord, ModelReply, PromptStyle, Verdict } from "./types";
  import { buildPrompt } from "./prompt";
  import { extractBoxed } from "./extract";

  // Kiểu kết quả của grade() (khớp hợp đồng dùng chung, do kế hoạch 02 định nghĩa đầy đủ).
  export interface GradeResult {
    verdict: Verdict;
    canonicalModel?: string;
    canonicalTruth?: string;
    reason: string;
  }

  // Các phụ thuộc TIÊM VÀO để test được: callModel giả + grade giả.
  export interface RunEvalDeps {
    callModel: (
      modelId: string, system: string, user: string,
      opts: { temperature?: number; maxTokens?: number; timeoutMs?: number }
    ) => Promise<ModelReply>;
    grade: (modelAnswerRaw: string, truth: Answer) => GradeResult;
    onProgress?: (done: number, total: number, rec: EvalRecord) => void;  // in tiến độ (tuỳ chọn)
  }

  export interface RunEvalOptions {
    k: number;                    // số lần hỏi lại mỗi (seed, model, style)
    styles: PromptStyle[];        // vd ["zero_shot", "cot"]
    temperature: number;          // cố định, ghi lại
    maxTokens?: number;
    timeoutMs?: number;
  }

  export async function runEval(
    seeds: Seed[],
    models: string[],
    opts: RunEvalOptions,
    deps: RunEvalDeps
  ): Promise<EvalRecord[]> {
    const records: EvalRecord[] = [];
    const total = seeds.length * models.length * opts.styles.length * opts.k;
    let done = 0;

    for (const seed of seeds) {
      for (const modelId of models) {
        for (const style of opts.styles) {
          for (let run = 1; run <= opts.k; run++) {
            const { system, user } = buildPrompt(seed, style);
            let rec: EvalRecord;
            try {
              const reply = await deps.callModel(modelId, system, user, {
                temperature: opts.temperature,
                maxTokens: opts.maxTokens,
                timeoutMs: opts.timeoutMs,
              });
              const extracted = extractBoxed(reply.text);
              const g = deps.grade(reply.text, seed.answer);   // TRUYỀN NGUYÊN VĂN cho grade
              rec = {
                seedId: seed.id,
                modelId,
                run,
                promptStyle: style,
                rawOutput: reply.text,
                extractedAnswer: extracted,
                verdict: g.verdict,
                latencyMs: reply.latencyMs,
                costUsd: reply.costUsd,
              };
            } catch (err) {
              // CHỊU LỖI TỪNG BÀI: ghi lại thành 'unsure', không ném để mẻ chạy tiếp.
              const msg = err instanceof Error ? err.message : String(err);
              rec = {
                seedId: seed.id,
                modelId,
                run,
                promptStyle: style,
                rawOutput: `[LỖI] ${msg}`,
                extractedAnswer: null,
                verdict: "unsure",
                latencyMs: 0,
              };
            }
            records.push(rec);
            done++;
            deps.onProgress?.(done, total, rec);
          }
        }
      }
    }
    return records;
  }
  ```

- [ ] **Bước 4 — Chạy test PASS.**
  ```
  npm test -- research/vsgeo-bench/harness/__tests__/runEval.test.ts
  ```
  Kỳ vọng: `3 passed`.

- [ ] **Bước 5 — Commit.**
  ```
  git add research/vsgeo-bench/harness/runEval.ts research/vsgeo-bench/harness/__tests__/runEval.test.ts
  git commit -m "feat(harness): runEval lặp seed×model×style×k, chịu lỗi từng bài"
  ```

---

### Task 9: CLI run.ts + đọc/ghi file + cập nhật `.env.example`

**Vì sao tách nữa?** `runEval` không biết gì về file hay dòng lệnh. `run.ts` là "lớp vỏ" nối `runEval` với thế giới thật: đọc tham số dòng lệnh (`--seeds`, `--models`, `--k`, `--styles`, `--date`), nạp khoá từ `.env` (bằng `dotenv`), đọc seed từ file JSONL, gọi `runEval` với `callModel` + `grade` **thật**, rồi ghi từng `EvalRecord` ra `results/<date>.jsonl`. Ta test hai hàm nhỏ *thuần* (`parseArgs`, `loadSeeds`) không cần mạng; phần nối mạng chỉ chạy khi chạy thật.

> **Ranh giới quan trọng:** `run.ts` import `grade` THẬT từ kế hoạch 02 tại `../grader` chỉ trong **hàm `main()`** (đường chạy thật). Ta dùng `import type` cho mọi kiểu để TypeScript không kéo file grader vào lúc test (vitest/tsx xoá `import type` khi chạy). Nhờ vậy test của Task 1–8 vẫn xanh dù grader chưa có.

**Files:**
- Create: `research/vsgeo-bench/harness/run.ts`
- Create: `research/vsgeo-bench/harness/__tests__/run.test.ts`
- Modify: `research/vsgeo-bench/.env.example`

- [ ] **Bước 1 — Viết test thất bại.** Tạo `research/vsgeo-bench/harness/__tests__/run.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { parseArgs, loadSeeds } from "../run";
  import { writeFileSync, mkdtempSync } from "node:fs";
  import { join } from "node:path";
  import { tmpdir } from "node:os";

  describe("parseArgs — đọc tham số dòng lệnh", () => {
    it("đọc đủ các cờ và tách danh sách theo dấu phẩy", () => {
      const a = parseArgs([
        "--seeds", "data/seeds/all.jsonl",
        "--models", "openai:gpt-x,gemini:g",
        "--k", "3",
        "--styles", "zero_shot,cot",
        "--date", "2026-08-15",
      ]);
      expect(a.seedsPath).toBe("data/seeds/all.jsonl");
      expect(a.models).toEqual(["openai:gpt-x", "gemini:g"]);
      expect(a.k).toBe(3);
      expect(a.styles).toEqual(["zero_shot", "cot"]);
      expect(a.date).toBe("2026-08-15");
    });

    it("ném lỗi khi thiếu --date (KHÔNG hardcode ngày)", () => {
      expect(() => parseArgs(["--seeds", "x", "--models", "openai:g"])).toThrow(/date/);
    });

    it("mặc định k=3 và styles=[zero_shot] nếu không truyền", () => {
      const a = parseArgs(["--seeds", "x", "--models", "openai:g", "--date", "2026-01-01"]);
      expect(a.k).toBe(3);
      expect(a.styles).toEqual(["zero_shot"]);
    });
  });

  describe("loadSeeds — đọc file JSONL thành mảng Seed", () => {
    it("đọc mỗi dòng một seed, bỏ dòng trống", () => {
      const dir = mkdtempSync(join(tmpdir(), "vsgeo-"));
      const file = join(dir, "s.jsonl");
      const s1 = { id: "a", source: { type: "synthetic", ref: "r" }, statement_vi: "đề a", answer: { canonical: "1", type: "rational" }, tags: { topic: [], answer_form: "rational", difficulty: 1, requires_auxiliary_construction: false } };
      const s2 = { ...s1, id: "b", statement_vi: "đề b" };
      writeFileSync(file, JSON.stringify(s1) + "\n\n" + JSON.stringify(s2) + "\n");
      const seeds = loadSeeds(file);
      expect(seeds.map((s) => s.id)).toEqual(["a", "b"]);
    });
  });
  ```

- [ ] **Bước 2 — Chạy test cho thấy FAIL.**
  ```
  npm test -- research/vsgeo-bench/harness/__tests__/run.test.ts
  ```
  Kỳ vọng: FAIL — `Cannot find module '../run'`.

- [ ] **Bước 3 — Viết code tối thiểu để pass.** Tạo `research/vsgeo-bench/harness/run.ts`:
  ```ts
  import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
  import { dirname } from "node:path";
  import type { Seed } from "./seedTypes";
  import type { PromptStyle, EvalRecord } from "./types";
  import { runEval } from "./runEval";
  import { callModel } from "./callModel";

  // ===== Phần THUẦN: đọc tham số dòng lệnh. Test được. =====
  export interface CliArgs {
    seedsPath: string;
    models: string[];
    k: number;
    styles: PromptStyle[];
    date: string;                 // YYYY-MM-DD, LẤY TỪ THAM SỐ — không hardcode
    temperature: number;
    outDir: string;
  }

  export function parseArgs(argv: string[]): CliArgs {
    const get = (flag: string): string | undefined => {
      const i = argv.indexOf(flag);
      return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined;
    };
    const seedsPath = get("--seeds");
    const modelsRaw = get("--models");
    const date = get("--date");
    if (!seedsPath) throw new Error("Thiếu --seeds <đường-dẫn file .jsonl>");
    if (!modelsRaw) throw new Error("Thiếu --models <ds ngăn bởi dấu phẩy>");
    if (!date) throw new Error("Thiếu --date <YYYY-MM-DD> (không hardcode ngày để tái lập được)");

    const styles = (get("--styles") ?? "zero_shot")
      .split(",").map((s) => s.trim()).filter(Boolean) as PromptStyle[];

    // Ép & KIỂM tham số số học. Bản ngây thơ dùng Number() TRẦN: "--k abc" => NaN, vòng lặp
    // `run <= NaN` sai ngay => 0 lượt, ghi JSONL rỗng, thoát 0 (xem Task 11 — benchmark IM
    // LẶNG không ra dữ liệu, đầu độc oracle bằng tập rỗng). Nay từ chối rõ ràng.
    const kRaw = get("--k") ?? "3";
    const k = Number(kRaw);
    if (!Number.isInteger(k) || k < 1) {
      throw new Error(`--k phải là số nguyên ≥ 1 (số lần lặp mỗi bài), nhận: "${kRaw}"`);
    }
    // Tương tự: "--temperature hot" => NaN => temperature:null lọt vào request (?? KHÔNG chặn
    // NaN) => vỡ tính TÁI LẬP. Chặn về [0, 2] (bao trọn dải của các nhà cung cấp).
    const tempRaw = get("--temperature") ?? "0";
    const temperature = Number(tempRaw);
    if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
      throw new Error(`--temperature phải là số trong [0, 2], nhận: "${tempRaw}"`);
    }

    return {
      seedsPath,
      models: modelsRaw.split(",").map((s) => s.trim()).filter(Boolean),
      k,
      styles,
      date,
      temperature,
      outDir: get("--out") ?? "research/vsgeo-bench/results",
    };
  }

  // ===== Phần THUẦN: đọc seed từ JSONL (mỗi dòng một JSON). Test được. =====
  export function loadSeeds(path: string): Seed[] {
    const text = readFileSync(path, "utf8");
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as Seed);
  }

  // ===== Phần CÓ MẠNG: chạy thật. Không unit test (gọi model + grader thật). =====
  async function main() {
    // Nạp khoá API từ .env (OPENAI_API_KEY, GEMINI_API_KEY, ...).
    const dotenv = await import("dotenv");
    dotenv.config({ path: "research/vsgeo-bench/.env" });

    const args = parseArgs(process.argv.slice(2));
    const seeds = loadSeeds(args.seedsPath);

    // Nạp grade() THẬT từ kế hoạch 02. Chỉ import ở đây (đường chạy thật) để test không cần grader.
    // Ghi chú: import "../grader" trỏ tới barrel grader/index.ts do kế hoạch 02 tạo (fix #5), nên dòng này hoạt động.
    const { grade } = await import("../grader");

    console.log(
      `[run] ${seeds.length} bài × ${args.models.length} model × ${args.styles.length} style × k=${args.k} ` +
      `= ${seeds.length * args.models.length * args.styles.length * args.k} lượt (temperature=${args.temperature})`
    );

    const outPath = `${args.outDir}/${args.date}.jsonl`;
    mkdirSync(dirname(outPath), { recursive: true });
    const lines: string[] = [];

    const records: EvalRecord[] = await runEval(
      seeds, args.models,
      { k: args.k, styles: args.styles, temperature: args.temperature, timeoutMs: 120000 },
      {
        callModel,          // adapter THẬT (gọi mạng)
        grade,              // grader THẬT
        onProgress: (done, total, rec) => {
          // Ghi ngay từng dòng để không mất dữ liệu nếu chạy dở bị ngắt.
          lines.push(JSON.stringify(rec));
          writeFileSync(outPath, lines.join("\n") + "\n");
          if (done % 10 === 0 || done === total) {
            console.log(`[run] ${done}/${total} — ${rec.seedId}/${rec.modelId}/run${rec.run} => ${rec.verdict}`);
          }
        },
      }
    );

    console.log(`[run] Xong. Ghi ${records.length} bản ghi vào ${outPath}`);
  }

  // Chỉ chạy main() khi gọi trực tiếp bằng `npx tsx run.ts`, KHÔNG chạy khi bị test import.
  // import.meta.url so với argv[1] là cách nhận biết "được chạy trực tiếp" trong ESM.
  const isDirectRun =
    typeof process !== "undefined" &&
    process.argv[1] &&
    import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`;
  if (isDirectRun) {
    main().catch((e) => {
      console.error("[run] LỖI:", e);
      process.exit(1);
    });
  }
  ```

  > **Ghi chú nhỏ về `isDirectRun`:** dòng này để `main()` KHÔNG tự chạy khi file bị `run.test.ts` import (nếu không, test sẽ vô tình gọi mạng). Trên Windows, đường dẫn dùng `\` nên ta đổi thành `/` trước khi so. Nếu gặp trục trặc nhận diện, cách chắc ăn hơn là tách `main()` ra file riêng `runMain.ts` và để `run.ts` chỉ chứa hàm thuần — nhưng bản trên đủ dùng.

- [ ] **Bước 4 — Chạy test PASS.**
  ```
  npm test -- research/vsgeo-bench/harness/__tests__/run.test.ts
  ```
  Kỳ vọng: `4 passed`.

- [ ] **Bước 5 — Cập nhật `.env.example`.** Mở `research/vsgeo-bench/.env.example` (kế hoạch 00 đã tạo file này) và thêm các dòng sau (CHỈ tên biến, KHÔNG giá trị thật):
  ```dotenv
  # ==== Khoá API cho harness gọi model (kế hoạch 03) ====
  # Điền giá trị vào file .env THẬT (đừng commit .env). File .env.example chỉ liệt kê TÊN biến.
  OPENAI_API_KEY=
  GEMINI_API_KEY=
  ANTHROPIC_API_KEY=
  OPENROUTER_API_KEY=
  ```
  Nếu file chưa tồn tại (kế hoạch 00 chưa chạy), tạo mới `research/vsgeo-bench/.env.example` với đúng nội dung trên.

- [ ] **Bước 6 — Chạy TOÀN BỘ test của harness một lượt cho chắc.**
  ```
  npm test -- research/vsgeo-bench/harness
  ```
  Kỳ vọng: tất cả file test của harness PASS (pricing 4, prompt 3, extract 5, openai 3, gemini 3, anthropic 3, openrouter 2, callModel 5, runEval 3, run 4). Tổng ~35 test xanh.

- [ ] **Bước 7 — Commit.**
  ```
  git add research/vsgeo-bench/harness/run.ts research/vsgeo-bench/harness/__tests__/run.test.ts research/vsgeo-bench/.env.example
  git commit -m "feat(harness): CLI run.ts (parseArgs/loadSeeds) + ghi JSONL + .env.example khoá API"
  ```

---

### Task 10 (chạy thật — làm khi 01 & 02 đã xong): kiểm tra khói end-to-end trên 1 bài, 1 model

**Đây KHÔNG phải test tự động** (vì gọi mạng thật, tốn tiền). Đây là bước *nghiệm thu tay* để chứng minh pipeline sống. Làm khi kế hoạch 01 (có ≥1 seed thật) và 02 (grade thật) đã sẵn.

- [ ] **Bước 1 — Chuẩn bị khoá.** Tạo file `research/vsgeo-bench/.env` (KHÔNG commit) và điền MỘT khoá em có, vd `GEMINI_API_KEY=AIza...`. Kiểm tra `.gitignore` đã bỏ qua `.env` (kế hoạch 00 lo phần này; nếu chưa, thêm dòng `research/vsgeo-bench/.env` vào `.gitignore`).
- [ ] **Bước 2 — Chuẩn bị 1 bài thử.** Tạo `research/vsgeo-bench/data/seeds/smoke.jsonl` với đúng MỘT dòng seed hợp lệ (lấy từ dữ liệu của Em 1). Ví dụ tối giản:
  ```json
  {"id":"smoke-1","source":{"type":"synthetic","ref":"demo"},"statement_vi":"Cho hình lập phương cạnh a=2. Tính thể tích khối lập phương.","answer":{"canonical":"8","type":"rational"},"tags":{"topic":["the_tich"],"answer_form":"rational","difficulty":1,"requires_auxiliary_construction":false}}
  ```
- [ ] **Bước 3 — Chạy thật.**
  ```
  npx tsx research/vsgeo-bench/harness/run.ts --seeds research/vsgeo-bench/data/seeds/smoke.jsonl --models gemini:gemini-2.5-flash --k 2 --styles zero_shot --date 2026-08-15
  ```
  Kỳ vọng in ra tiến độ và dòng `[run] Xong. Ghi 2 bản ghi vào research/vsgeo-bench/results/2026-08-15.jsonl`.
- [ ] **Bước 4 — Soi kết quả.** Mở `research/vsgeo-bench/results/2026-08-15.jsonl`: phải có 2 dòng JSON, mỗi dòng có `verdict` (kỳ vọng `correct`), `extractedAnswer` (kỳ vọng `8`), `latencyMs` > 0, và `costUsd` là số.
- [ ] **Bước 5 — Ghi nhật ký nghiên cứu (logbook).** Chép lệnh + kết quả vào nhật ký (một dòng: ngày, model, số bài, verdict). Đây là bằng chứng tái lập cho hội đồng. *(File kết quả trong `results/` có thể commit làm mẫu, nhưng KHÔNG commit `.env`.)*

---

### Task 11: Tự-phản-biện harness — `harness/__tests__/adversarial.test.ts`

> **Làm khi nào?** Task này KHÔNG cần mạng — làm được ngay sau Task 9 (khi mọi unit offline đã xong). Đặt cuối vì nó là *đỉnh* của kế hoạch: sau khi mọi test "đường hạnh phúc" đã XANH, ta **cố tình đi tìm cách làm harness ghi dữ liệu SAI/THIẾU**.

> **⭐ Tự-phản-biện harness (adversarial self-review) — phần đáng kể nhất khi bảo vệ.** Harness không *chấm* như oracle, nhưng nó là cái **ống dẫn** mọi con số vào benchmark: nếu nó âm thầm bỏ bài, kẹt retry, hay ghi tập rỗng thì mọi kết luận về sau đều hỏng theo mà nhìn bề ngoài vẫn "chạy ngon". Bài học Plan 02 lặp lại y nguyên: **một suite test xanh KHÔNG chứng minh harness đúng** — nó chỉ chứng minh harness vượt qua đúng những ca ta đã nghĩ ra. Một lượt review đa-góc (10 finder + refute-verify độc lập) lôi ra **6 lỗi đều lọt qua suite gốc**. Các bản vá đã **nằm sẵn** trong code Task 1/3/7/9 ở trên (như Plan 02 vá sẵn ở Task 3–4); file test dưới đây xác nhận bản vá còn nguyên và sẽ ĐỎ nếu ai lỡ tay làm hồi lỗi.
>
> | Mã | Ở đâu | Bản ngây thơ sai thế nào | Vì sao nguy hiểm |
> |----|-------|--------------------------|------------------|
> | **F1** | `callModel.isTransient` (Task 7) | Dò chuỗi con `"timeout"`, nhưng timeout do harness tự kích qua `AbortController.abort()` ném lỗi `name="AbortError"` msg `"This operation was aborted"` — KHÔNG chứa "timeout". | Timeout là lỗi tạm thời PHỔ BIẾN NHẤT khi gọi model chậm; bản cũ *không bao giờ retry* nó ⇒ mất bài lác đác, dữ liệu thủng lỗ chỗ. |
> | **F4** | `callModel.isTransient` (Task 7) | Dò chuỗi con `"500"` khớp NHẦM `"8500"` trong thân HTTP **400** (`max_tokens ... 8500 tokens`). | 4xx là lỗi *vĩnh viễn* (sai request) — retry 3 lần chỉ tổ chậm và tốn tiền, không bao giờ khá hơn. |
> | **F2** | `run.parseArgs` (Task 9) | `Number("--k abc")` ⇒ `NaN`; vòng `run <= NaN` sai ngay ⇒ 0 lượt. | Benchmark **im lặng không ra dữ liệu**: JSONL rỗng, thoát mã 0 (như thành công), đầu độc phân tích bằng tập rỗng. |
> | **F5** | `run.parseArgs` (Task 9) | `Number("--temperature hot")` ⇒ `NaN` lọt vào request. | Vỡ tính **tái lập** — trụ cột của một benchmark khoa học (§12). |
> | **F3** | `extract.extractBoxed` (Task 3) | `break` khi gặp một `\boxed{` mở-không-đóng ⇒ mất `\boxed{...}` hợp lệ phía sau. | `extractedAnswer` để soi lỗi bị sai lệch, gây hiểu nhầm khi phân tích thủ công. |
> | **F6** | `pricing.test` (Task 1) | Test cũ chỉ kiểm khoá `"test:demo"` — ai xoá hết dòng giá THẬT vẫn XANH. | Lỗ hổng *trong chính bộ test*: cột chi phí có thể rỗng toàn bộ mà CI vẫn báo an toàn. |
>
> **Cách kể trước hội đồng:** "Harness là *ống dẫn dữ liệu* của cả benchmark — nếu nó âm thầm bỏ bài hay ghi tập rỗng thì mọi con số về sau đều sai theo. Nên sau khi test xanh, chúng em dựng một lượt **tự-phản-biện** chuyên đi tìm *mất/hỏng dữ liệu im lặng*, tìm ra 6 lỗi mà suite gốc bỏ sót — trong đó F2 khiến benchmark chạy ra tập RỖNG mà vẫn báo thành công — rồi vá từng lỗi kèm test hồi quy." Đây chính là tư duy *đo lường được độ tin cậy của công cụ đo*.

**Files:**
- Create: `research/vsgeo-bench/harness/__tests__/adversarial.test.ts`

- [ ] **Bước 1 — Viết bộ test tấn công (phải XANH ngay vì code Task 1/3/7/9 đã vá).** Tạo `research/vsgeo-bench/harness/__tests__/adversarial.test.ts`:
  ```ts
  // harness/__tests__/adversarial.test.ts
  // BỘ TEST TỰ-PHẢN-BIỆN cho HARNESS (design.md §4.3) — song song grader/__tests__/adversarial.test.ts.
  // 6 lỗi F1–F6 đều LỌT QUA suite "đường hạnh phúc"; mỗi test dưới đây là một "bằng chứng hồi quy".
  import { describe, it, expect, vi } from "vitest";
  import { callModel } from "../callModel";
  import { parseArgs } from "../run";
  import { extractBoxed } from "../extract";
  import type { ModelReply } from "../types";

  const noSleep = async (_ms: number) => {};
  const okReply: ModelReply = { text: "\\boxed{1}", latencyMs: 1 };

  // Dựng lỗi y như fetch ném khi AbortController.abort() bắn (đường timeout của mọi adapter).
  function abortError(): Error {
    const e = new Error("This operation was aborted");
    e.name = "AbortError";
    return e;
  }

  describe("F1 — callModel: timeout (AbortError) PHẢI được thử lại", () => {
    it("AbortError được coi là tạm thời => thử lại rồi thành công", async () => {
      let n = 0;
      const flaky = vi.fn(async () => { n++; if (n === 1) throw abortError(); return okReply; });
      const reply = await callModel("openai:gpt-x", "S", "U", {},
        { adapters: { openai: flaky }, sleep: noSleep, maxAttempts: 3 });
      expect(n).toBe(2);
      expect(reply.text).toBe("\\boxed{1}");
    });

    it("AbortError liên tục => thử ĐỦ maxAttempts lần", async () => {
      const always = vi.fn(async () => { throw abortError(); });
      await expect(callModel("openai:gpt-x", "S", "U", {},
        { adapters: { openai: always }, sleep: noSleep, maxAttempts: 3 })).rejects.toThrow(/aborted/i);
      expect(always).toHaveBeenCalledTimes(3);
    });
  });

  describe("F4 — callModel: 4xx KHÔNG bị retry chỉ vì thân lỗi chứa chuỗi số giống mã 5xx", () => {
    it('HTTP 400 với thân "...8500 tokens" chỉ gọi ĐÚNG 1 lần', async () => {
      const badReq = vi.fn(async () => {
        throw new Error("OpenAI HTTP 400: max_tokens is too large: you requested 8500 tokens");
      });
      await expect(callModel("openai:gpt-x", "S", "U", {},
        { adapters: { openai: badReq }, sleep: noSleep, maxAttempts: 3 })).rejects.toThrow(/HTTP 400/);
      expect(badReq).toHaveBeenCalledTimes(1);
    });

    it("HTTP 404 cũng chỉ gọi 1 lần", async () => {
      const err404 = vi.fn(async () => { throw new Error("OpenAI HTTP 404: model not found"); });
      await expect(callModel("openai:x", "S", "U", {},
        { adapters: { openai: err404 }, sleep: noSleep, maxAttempts: 3 })).rejects.toThrow(/HTTP 404/);
      expect(err404).toHaveBeenCalledTimes(1);
    });

    it("nhưng 5xx & 429 THẬT vẫn được retry", async () => {
      const err500 = vi.fn(async () => { throw new Error("Gemini HTTP 500: internal"); });
      await expect(callModel("gemini:g", "S", "U", {},
        { adapters: { gemini: err500 }, sleep: noSleep, maxAttempts: 3 })).rejects.toThrow(/HTTP 500/);
      expect(err500).toHaveBeenCalledTimes(3);
    });
  });

  // parseArgs bắt buộc --seeds/--models/--date; BASE cấp sẵn để mỗi test chỉ thay cờ số học.
  const BASE = ["--seeds", "s.jsonl", "--models", "openai:x", "--date", "2026-07-23"];

  describe("F2 — run.ts: --k phải là số nguyên ≥ 1, nếu không THÌ NÉM", () => {
    it('"--k abc", "--k 0", "--k 2.5" đều bị từ chối', () => {
      expect(() => parseArgs([...BASE, "--k", "abc"])).toThrow(/--k/);
      expect(() => parseArgs([...BASE, "--k", "0"])).toThrow(/--k/);
      expect(() => parseArgs([...BASE, "--k", "2.5"])).toThrow(/--k/);
    });
    it("mặc định = 3; hợp lệ giữ nguyên", () => {
      expect(parseArgs([...BASE]).k).toBe(3);
      expect(parseArgs([...BASE, "--k", "5"]).k).toBe(5);
    });
  });

  describe("F5 — run.ts: --temperature phải là số trong [0,2], nếu không THÌ NÉM", () => {
    it('"--temperature hot", "3", "-1" đều bị từ chối', () => {
      expect(() => parseArgs([...BASE, "--temperature", "hot"])).toThrow(/--temperature/);
      expect(() => parseArgs([...BASE, "--temperature", "3"])).toThrow(/--temperature/);
      expect(() => parseArgs([...BASE, "--temperature", "-1"])).toThrow(/--temperature/);
    });
    it("mặc định = 0; hợp lệ giữ nguyên", () => {
      expect(parseArgs([...BASE]).temperature).toBe(0);
      expect(parseArgs([...BASE, "--temperature", "0.7"]).temperature).toBeCloseTo(0.7, 9);
    });
  });

  describe("F3 — extract.ts: \\boxed{ hỏng phía trước KHÔNG che \\boxed{...} hợp lệ phía sau", () => {
    it("box hỏng mở-không-đóng phía trước, vẫn lấy box hợp lệ phía sau", () => {
      expect(extractBoxed("scratch \\boxed{x ... final \\boxed{a\\sqrt2}")).toBe("a\\sqrt2");
    });
    it("box cụt ở CUỐI không xoá box hợp lệ trước đó", () => {
      expect(extractBoxed("answer \\boxed{a} then junk \\boxed{oops")).toBe("a");
    });
    it("đường hạnh phúc vẫn nguyên: lấy box CUỐI, ngoặc lồng, không box => null", () => {
      expect(extractBoxed("foo \\boxed{1} bar \\boxed{2}")).toBe("2");
      expect(extractBoxed("\\boxed{\\frac{1}{2}}")).toBe("\\frac{1}{2}");
      expect(extractBoxed("khong co box")).toBeNull();
    });
  });
  ```

- [ ] **Bước 2 — Chạy test PASS (không cần mạng).**
  ```
  npm test -- research/vsgeo-bench/harness/__tests__/adversarial.test.ts
  ```
  Kỳ vọng: tất cả xanh (bản vá đã nằm sẵn trong Task 1/3/7/9). Nếu ĐỎ ⇒ code em còn bản ngây thơ; xem lại đúng Task tương ứng.

- [ ] **Bước 3 — Commit.**
  ```
  git add research/vsgeo-bench/harness/__tests__/adversarial.test.ts
  git commit -m "test(harness): bộ tự-phản-biện khóa 6 lỗi mất/hỏng dữ liệu im lặng"
  ```

---

## Tiêu chí hoàn thành (Definition of Done)

Ánh xạ tới tiêu chí thành công §13 và giao thức §6.

- [ ] Có đủ 4 adapter (`openai`, `gemini`, `anthropic`, `openrouter`), mỗi cái tách `build*Request` + `parse*Response` thuần và test xanh — *không test nào gọi mạng*. (§6.1 dàn model)
- [ ] `callModel` định tuyến đúng theo tiền tố, có retry/backoff cho lỗi tạm thời, gắn `costUsd`; test bằng adapter giả + sleep giả. (§6.3 chi phí/độ trễ)
- [ ] `buildPrompt` sinh cả `zero_shot` và `cot`, cả hai buộc `\boxed{...}`; system cố định giữa hai kiểu. (§6.2 giao thức, §4.2 trích `\boxed`)
- [ ] `runEval` sinh đúng `seeds × models × styles × k` bản ghi, `verdict` từ `grade()`, và **một bài lỗi không làm sập mẻ**. (§6.2 k=3–5, ghi log đầy đủ)
- [ ] `run.ts` chạy thật: đọc `--seeds/--models/--k/--styles/--date`, ghi `results/<date>.jsonl`, `date` lấy từ tham số (không hardcode), temperature cố định & ghi lại. (§6.2, §12 tái lập)
- [ ] `.env.example` liệt kê 4 tên khoá, không giá trị. (§9.3 tuân thủ điều khoản API)
- [ ] **Task 11 tự-phản-biện:** `harness/__tests__/adversarial.test.ts` khóa 6 lỗi mất/hỏng dữ liệu im lặng (F1–F6), XANH ngay vì bản vá đã nằm trong Task 1/3/7/9. (design.md §4.3)
- [ ] `npm test -- research/vsgeo-bench/harness` xanh toàn bộ (~49 test, gồm bộ tự-phản-biện).
- [ ] (Sau khi có 01 & 02) Task 10 chạy khói end-to-end thành công trên 1 bài × 1 model, có file JSONL kết quả và một dòng nhật ký. (Mốc T2: "1 model chạy hết")

---

## Bảng thuật ngữ

| Thuật ngữ | Giải thích ngắn |
|-----------|-----------------|
| **Harness** | "Khung chạy" tự động — chương trình đưa từng bài cho từng model rồi thu kết quả. |
| **Adapter** | Miếng nối riêng cho mỗi nhà cung cấp model, lo việc dựng request và đọc response đúng "phương ngữ" của họ. |
| **Mock / client giả** | Bản giả của thứ thật (adapter, grade) tiêm vào lúc test để KHÔNG gọi mạng/không tốn tiền. |
| **Inject (tiêm phụ thuộc)** | Truyền hàm/đối tượng vào từ ngoài (qua tham số `deps`) thay vì gọi cứng bên trong — nhờ vậy test thay được bằng bản giả. |
| **Pure function (hàm thuần)** | Hàm chỉ phụ thuộc đầu vào, không đụng mạng/ổ đĩa/thời gian — nên test dễ và chắc. |
| **`\boxed{...}`** | Lệnh LaTeX đóng khung đáp án cuối; ta bắt model dùng để parser lấy đáp án chính xác (§4.2). |
| **Extract (trích)** | Bóc đáp án ra khỏi câu trả lời dài; ở đây là lấy nội dung trong `\boxed{}`. |
| **Retry / backoff** | Thử lại khi lỗi tạm thời; "backoff" = chờ lâu dần giữa các lần (500ms, 1s, 2s...). |
| **Latency (độ trễ)** | Thời gian từ lúc gửi tới lúc nhận trả lời, tính bằng mili-giây. |
| **Token / usage** | Đơn vị chữ mà model tính tiền; `usage` = số token vào/ra để ước tính chi phí. |
| **JSONL** | "JSON Lines" — file mà MỖI DÒNG là một object JSON độc lập; hợp để ghi log nối tiếp. |
| **CLI** | Command-Line Interface — chương trình chạy bằng lệnh ở terminal (ta chạy bằng `npx tsx`). |
| **`dotenv`** | Thư viện nạp biến môi trường (khoá API) từ file `.env` vào `process.env`. |
| **TDD** | Test-Driven Development: viết test đỏ trước → viết code cho xanh → dọn dẹp. |
| **EvalRecord** | Một dòng nhật ký kết quả cho một lượt (seed × model × run × style). |
| **Seed / instance** | *Seed* = bài gốc (do Em 1 soạn); *instance* = biến thể sinh từ seed (kế hoạch 04). |

---

## Em sẽ bảo vệ được gì trước hội đồng

- **"Em tự xây pipeline đánh giá tái lập được."** Em thiết kế kiến trúc adapter + định tuyến + retry, và chứng minh bằng ~35 test tự động chạy không cần mạng — thể hiện năng lực *kỹ thuật phần mềm* và *kiểm thử* thật, không phải chỉ "gọi API".
- **"Em bảo đảm tính khách quan & tái lập."** Nhiệt độ cố định + ghi lại, ngày chạy lấy từ tham số, log thô đầy đủ mỗi lượt — đúng tinh thần chống "kết quả không tái lập" ở §12; em giải thích được vì sao mỗi quyết định đó chặn một rủi ro cụ thể.
- **"Em xử lý được sự cố thực tế."** Retry/backoff cho lỗi tạm thời và "chịu lỗi từng bài" cho thấy em hiểu hệ thống thật hay hỏng vặt; một model chết không làm mất cả mẻ dữ liệu.
- **"Em tách bạch công cụ có sẵn và phần em làm."** Engine ký hiệu (oracle) là công cụ có sẵn được ghi nguồn; *harness, giao thức prompt `\boxed`, logic trích xuất, vòng lặp eval và ghi log là phần em tự làm* — đúng ranh giới liêm chính §4.4.
