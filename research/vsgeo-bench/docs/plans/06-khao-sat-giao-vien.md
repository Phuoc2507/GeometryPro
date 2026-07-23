# Khảo sát Giáo viên (điểm tham chiếu con người) — Kế hoạch triển khai

> **Cho người thực thi (agentic worker):** REQUIRED SUB-SKILL: dùng superpowers:subagent-driven-development hoặc superpowers:executing-plans để làm theo từng Task. Các bước dùng checkbox `- [ ]` để theo dõi.

**Mục tiêu:** Kiểm chứng giả thuyết H3 ở phía người dùng thật — đo xem giáo viên Toán THPT có bị lời giải AI "trôi chảy nhưng sai" đánh lừa không, một cách có đạo đức, ẩn danh và tái lập được (design.md §8, §1 H3).

> **Phạm vi cho vòng trường (3 tháng):** mini-pilot 3–5 giáo viên + soạn phiếu đồng thuận/đạo đức (kiểm chứng PHỤ). **Để dành MỞ RỘNG (sau vòng trường):** khảo sát đầy đủ N giáo viên với phê duyệt đạo đức chính thức.

> **Định vị:** Khảo sát giáo viên là **kiểm chứng PHỤ (secondary validation)** — bằng chứng con người bổ trợ cho máy chấm tự động, **không phải trục chính** của đề tài.

**Kiến trúc:** Một nghiên cứu con gồm hai nửa. Nửa *nội dung* (2 em tự soạn & bảo vệ): phiếu đồng thuận, checklist đạo đức, thiết kế "thử nghiệm tin cậy mù", định dạng dữ liệu thu. Nửa *hạ tầng* (code có test): một script phân tích `analyze.ts` đọc dữ liệu phản hồi ẩn danh rồi tính `deceptionRate` (tỉ lệ bị đánh lừa) và `trustAccuracyCorrelation` (tương quan giữa độ tin cảm nhận và đúng thực tế), xuất bảng.

**Công nghệ:** TypeScript (ESM), vitest (chạy test), `npx tsx` (chạy script CLI độc lập), Node `fs`/`url` chuẩn (đọc file, phát hiện chạy trực tiếp). Nửa nội dung là các file Markdown (biểu mẫu + hướng dẫn). Không cần thư viện ngoài; không gọi model, không đụng engine ký hiệu ở hệ con này (đáp án đúng/sai của mỗi item đã do máy chấm ở Kế hoạch 02 sinh sẵn).

---

## ⚠️ CẢNH BÁO ĐẠO ĐỨC — ĐỌC TRƯỚC TIÊN (design.md §8.4)

> **ĐÂY LÀ THÍ NGHIỆM TRÊN NGƯỜI.** Giáo viên là *người tham gia nghiên cứu* (human subjects), không phải "nguồn dữ liệu". Vì vậy có những điều **BẮT BUỘC**, không được bỏ qua để "cho nhanh":
>
> 1. **Phiếu đồng thuận có thông tin (informed consent):** mỗi giáo viên phải đọc mục đích, việc họ sẽ làm, thời gian, rủi ro (tối thiểu), quyền rút lui, và cách dữ liệu được ẩn danh — rồi **tự nguyện đồng ý** trước khi bắt đầu.
> 2. **Tự nguyện & rút lui được bất cứ lúc nào**, không cần nêu lý do, không hệ quả gì.
> 3. **Ẩn danh & thu tối thiểu:** chỉ thu *số năm giảng dạy* và *khối lớp đang dạy*. **KHÔNG** thu tên, trường, email, số điện thoại, hay bất cứ thứ gì truy ngược ra danh tính. Mỗi giáo viên được gán một mã ẩn danh (vd `T01`).
> 4. **Xin phê duyệt hội đồng trường TRƯỚC KHI CHẠY** nếu quy chế trường/ViSEF yêu cầu (khảo sát người lớn, rủi ro tối thiểu). Giữ lại email/giấy phê duyệt để trình hội đồng.
> 5. **N nhỏ ⇒ KHÔNG tổng quát hoá.** Báo cáo đây là *nghiên cứu tham chiếu* (reference study) với ~8–15 giáo viên, **không** khẳng định cho "toàn bộ giáo viên Việt Nam".
>
> **TUYỆT ĐỐI KHÔNG mời giáo viên hay thu một dòng dữ liệu nào trước khi (a) phiếu đồng thuận + checklist đạo đức đã hoàn tất và (b) đã có phê duyệt cần thiết.** Task 5 (viết code phân tích) *được phép* làm trước bằng **dữ liệu tổng hợp giả** (synthetic) để kiểm thử — nhưng **dữ liệu người thật chỉ được thu sau khi qua cổng đạo đức**.

---

## Dành cho 2 em (đọc trước)

Chào hai em! Đây là một trong những phần **"ghi điểm tác động"** mạnh nhất của cả đề tài, và cũng là phần khiến hội đồng ViSEF gật gù nhất, vì nó trả lời một câu rất đời thường: *"Nếu chính thầy cô Toán còn bị AI nói sai một cách trơn tru đánh lừa, thì học sinh dùng AI tự học có an toàn không?"*

**Hệ con này là gì?** Một *nghiên cứu con nhỏ, nhanh, rẻ* (design.md §8). Ta lấy khoảng 10–15 lời giải do AI sinh ra (một nửa **đúng**, một nửa **sai** — nhưng cái sai được chọn sao cho *trông rất thuyết phục*), **giấu tên model**, rồi đưa cho ~8–15 giáo viên Toán THPT xem. Với mỗi lời giải, giáo viên trả lời 2 câu: (a) *"Theo thầy/cô, lời giải này Đúng hay Sai?"* và (b) *"Thầy/cô tin lời giải này tới mức nào?"* — cho điểm 1 đến 5 (thang Likert). Ta so phán đoán của giáo viên với **đáp án đúng thật** (do máy chấm oracle ở Kế hoạch 02 xác định) để đo hai con số:

- **`deceptionRate` (tỉ lệ bị đánh lừa):** trong những lời giải **thật sự SAI**, bao nhiêu phần trăm bị giáo viên chấm nhầm là "Đúng". Con số này càng cao ⇒ bằng chứng người-thật cho H3 càng mạnh.
- **`trustAccuracyCorrelation` (tương quan tin ↔ đúng):** điểm tin của giáo viên có "đi cùng" với việc lời giải thật sự đúng không. Gần 0 ⇒ giáo viên gần như *không phân biệt được* đúng/sai (đáng báo động, đúng tinh thần "tự tin nhưng sai" §6.3).

**Vì sao cần?** Cả benchmark máy (§6) chỉ nói *"AI sai X% số bài"*. Nhưng phản biện có thể hỏi *"sai thì đã sao, người dùng nhận ra mà?"*. Khảo sát này **đóng cái lỗ hổng đó bằng bằng chứng con người thật**: nếu ngay cả giáo viên còn bị lừa, thì rủi ro giáo dục là có thật.

**Sản phẩm cuối trông thế nào?**
- 4 file tài liệu trong `survey/`: phiếu đồng thuận, checklist đạo đức, thiết kế công cụ khảo sát, định dạng dữ liệu.
- 1 script `survey/analyze.ts` chạy được bằng `npx tsx`, đọc file CSV phản hồi ẩn danh và in ra bảng số liệu.
- 1 file test `survey/__tests__/analyze.test.ts` chứng minh công thức tính đúng trên dữ liệu biết trước.
- (Sau cùng, ở T4) một tập dữ liệu thật ẩn danh + một đoạn kết quả cho báo cáo.

**Em nào phụ trách?** **Cả hai em cùng làm**, nhưng **Em 1 (Dữ liệu & Taxonomy) dẫn phần con người** — soạn phiếu, làm việc & mời giáo viên, chọn 10–15 lời giải cân bằng đúng/sai. **Em 2 (Harness & Phân tích)** dẫn phần code `analyze.ts` và đối chiếu số liệu khảo sát với benchmark. Hai em cùng đọc và cùng ký tên chịu trách nhiệm phần đạo đức.

**Nằm ở tháng nào?** Theo lộ trình §11.2: **T3 = soạn** (viết 4 file tài liệu + code phân tích + xin phê duyệt), **T4 = chạy khảo sát thật & phân tích**. Đừng chạy khảo sát ở T3.

**Phụ thuộc kế hoạch nào?** (nêu số thứ tự trong `docs/plans/`)
- **Kế hoạch 00 (Thiết lập & công cụ):** cài `tsx` (chạy script TS), `dotenv`, dựng cây thư mục `research/vsgeo-bench/`. Không có 00 thì lệnh `npx tsx` chưa chắc chạy.
- **Kế hoạch 02 (Máy chấm oracle):** cung cấp **đáp án đúng/sai chuẩn** (`truth`) cho từng lời giải — chính là "ground truth" để đối chiếu với phán đoán giáo viên. Không có 02 thì ta không biết lời giải nào *thật sự* sai.
- **Kế hoạch 03 (Harness gọi model):** sinh **log kết quả** (`EvalRecord`, mỗi dòng JSONL) chứa `rawOutput` — chính là *văn bản lời giải AI* mà ta sẽ trích ra cho giáo viên xem, kèm cờ `verdict` (đúng/sai từ oracle) để ta chọn item cân bằng.

Ta sẽ đi theo lối **"làm ngược cho an toàn"**: viết code phân tích trước (test bằng dữ liệu giả), soạn tài liệu đạo đức trước, và **chỉ chạm vào giáo viên thật sau cùng, sau khi đã qua cổng phê duyệt**. Bắt đầu nhé!

---

## Bối cảnh hợp đồng dữ liệu (đọc 1 phút, rất quan trọng)

Để mọi hệ con khớp nhau, hai em dùng đúng các tên dưới đây (trích từ "HỢP ĐỒNG KIỂU DỮ LIỆU DÙNG CHUNG" của dự án):

- Mỗi kết quả model chạy được ghi thành một **`EvalRecord`** (một dòng JSONL) do Kế hoạch 03 sinh ra:
  ```ts
  // KHÔNG gõ lại — đây là kiểu do Kế hoạch 03 định nghĩa, ghi ở đây để hai em hiểu ta lấy gì từ log.
  type Verdict = "correct" | "incorrect" | "unsure";
  type EvalRecord = {
    seedId: string;        // bài gốc nào
    modelId: string;       // MODEL NÀO — ta sẽ GIẤU khỏi giáo viên
    run: number;
    promptStyle: "zero_shot" | "cot";
    rawOutput: string;     // <-- VĂN BẢN LỜI GIẢI AI, thứ ta đưa giáo viên xem
    extractedAnswer: string | null;
    verdict: Verdict;      // <-- ĐÚNG/SAI từ oracle, dùng để chọn item & làm truth
    latencyMs: number;
    costUsd?: number;
    perturbation?: { kind: string; parentSeedId: string };
  };
  ```
- Ở hệ con này ta **không** dùng lại engine ký hiệu (`exactForm.ts`/`scalar.ts`) — vì đúng/sai đã được Kế hoạch 02/03 chấm xong và nằm sẵn trong `verdict`. Việc của ta chỉ là *thu phán đoán con người* rồi *so với `verdict`*.
- Ta sẽ định nghĩa một kiểu **riêng của hệ con này** tên `SurveyRow` (Task 4 & 5) — mỗi dòng là *một giáo viên chấm một item*. Đây là cầu nối giữa tài liệu và code.

---

## Task 1: Phiếu đồng thuận có thông tin — `survey/consent-form.md`

> **Loại Task: NỘI DUNG (2 em tự soạn & bảo vệ).** Đây là **công sức trí tuệ và trách nhiệm đạo đức của hai em** — không ai soạn hộ được, vì hai em là người ký tên chịu trách nhiệm. Kế hoạch cho **khung mẫu (template) + 1 ví dụ điền mẫu + tiêu chí nghiệm thu + checklist tự kiểm**; hai em điền tên trường/nhóm và tinh chỉnh lời văn cho phù hợp.

**Files:**
- Create: `research/vsgeo-bench/survey/consent-form.md`

**Vì sao làm vậy:** Phiếu đồng thuận là *hợp đồng đạo đức* giữa nhóm và giáo viên. Nó bảo vệ giáo viên (họ biết mình đồng ý điều gì) và bảo vệ hai em (chứng minh trước hội đồng rằng đã làm đúng quy trình §8.4). Thiếu phiếu này thì toàn bộ dữ liệu khảo sát *không dùng được* về mặt liêm chính.

**Các bước:**

- [ ] **Bước 1 — Tạo file từ khung mẫu.** Tạo `research/vsgeo-bench/survey/consent-form.md` với đúng khung 7 mục dưới đây (chép nguyên, chỗ `[[...]]` là chỗ hai em điền):

  ```markdown
  # Phiếu đồng thuận tham gia nghiên cứu (Informed Consent)

  **Tên đề tài:** VSGeo-Bench — Đánh giá năng lực suy luận hình học không gian của AI trên đề Toán THPT Việt Nam.
  **Nhóm nghiên cứu:** [[Tên Em 1]], [[Tên Em 2]] — học sinh [[Tên trường]].
  **Giáo viên hướng dẫn:** [[Tên GVHD]].
  **Ngày phiên bản phiếu:** [[YYYY-MM-DD]].

  ## 1. Mục đích
  Chúng em đang nghiên cứu xem các mô hình AI giải Toán hình không gian đúng/sai
  ra sao, và liệu người đọc có phân biệt được lời giải đúng với lời giải "nghe hợp lý
  nhưng sai" hay không. Thầy/cô được mời tham gia với tư cách chuyên gia Toán THPT.

  ## 2. Thầy/cô sẽ làm gì
  Xem [[khoảng 10–15]] lời giải Toán do AI sinh (đã giấu tên AI). Với mỗi lời giải,
  thầy/cô: (a) đánh giá Đúng hay Sai; (b) cho điểm mức độ tin tưởng từ 1 đến 5.
  Thời gian dự kiến: [[khoảng 20–30]] phút.

  ## 3. Rủi ro & lợi ích
  Rủi ro ở mức tối thiểu (chỉ là đọc và đánh giá bài Toán, không có nội dung nhạy cảm).
  Không có lợi ích vật chất. Đóng góp của thầy/cô giúp đánh giá độ an toàn của AI trong
  giáo dục Toán.

  ## 4. Tự nguyện & quyền rút lui
  Tham gia hoàn toàn tự nguyện. Thầy/cô có thể dừng bất cứ lúc nào, bỏ qua câu bất kỳ,
  hoặc yêu cầu xoá dữ liệu của mình — không cần nêu lý do, không có hệ quả gì.

  ## 5. Ẩn danh & dữ liệu
  Chúng em KHÔNG thu tên, trường, email, số điện thoại. Thầy/cô chỉ được gán một mã ẩn
  danh (vd T01). Chúng em chỉ thu thêm: (i) số năm giảng dạy, (ii) khối lớp đang dạy —
  để mô tả nhóm tham gia. Dữ liệu ẩn danh có thể được công bố kèm báo cáo/khoá luận.

  ## 6. Liên hệ
  Mọi thắc mắc xin liên hệ giáo viên hướng dẫn: [[Tên + kênh liên hệ của GVHD]].

  ## 7. Xác nhận đồng thuận
  "Tôi đã đọc và hiểu thông tin trên. Tôi tự nguyện đồng ý tham gia."
  - [ ] Tôi đồng ý tham gia.
  - Số năm giảng dạy Toán: ______
  - Khối lớp đang dạy (10 / 11 / 12): ______
  - Mã ẩn danh (nhóm điền): ______
  - Ngày: ______
  ```

- [ ] **Bước 2 — Điền một bản ví dụ hoàn chỉnh** ở cuối file (dưới một dòng `---` và tiêu đề `## Ví dụ đã điền (mẫu tham khảo, xoá trước khi in)`) để hai em thấy trông ra sao khi hoàn chỉnh — điền tên nhóm giả định, ngày, và đánh dấu ô đồng ý. Ví dụ này để tự kiểm, sẽ xoá khi in bản thật.

- [ ] **Bước 3 — Tự kiểm theo tiêu chí nghiệm thu (Acceptance criteria).** Đánh dấu từng ý:
  - [ ] Có đủ 7 mục; không mục nào để trống ý nghĩa (chỉ còn `[[...]]` chờ điền lúc dùng thật).
  - [ ] Nêu rõ *tự nguyện*, *rút lui được*, *ẩn danh*, *thu tối thiểu 2 trường* (năm dạy, khối lớp).
  - [ ] KHÔNG có ô nào hỏi tên/trường/email/SĐT.
  - [ ] Có kênh liên hệ GVHD ở mục 6.
  - [ ] Ngôn ngữ dễ hiểu, xưng hô "thầy/cô" lịch sự.

- [ ] **Bước 4 — Commit.**
  ```bash
  git add research/vsgeo-bench/survey/consent-form.md
  git commit -m "docs(survey): thêm phiếu đồng thuận có thông tin (consent form)"
  ```

---

## Task 2: Checklist tuân thủ đạo đức — `survey/ethics-checklist.md`

> **Loại Task: NỘI DUNG (2 em tự làm & bảo vệ).** Đây là **cổng an toàn**: hai em phải tự tay tick hết mới được chạm vào giáo viên thật. Kế hoạch cho khung checklist + tiêu chí; hai em điền tình trạng phê duyệt cụ thể của trường mình.

**Files:**
- Create: `research/vsgeo-bench/survey/ethics-checklist.md`

**Vì sao làm vậy:** §8.4 và §12 (dòng "Thí nghiệm trên người") biến các nguyên tắc đạo đức thành *hành động kiểm được*. Checklist này là bằng chứng trước hội đồng rằng nhóm không "làm ẩu rồi mới xin phép".

**Các bước:**

- [ ] **Bước 1 — Tạo file với khung checklist** (chép nguyên; các ô `- [ ]` sẽ được tick khi hoàn thành thật):

  ```markdown
  # Checklist tuân thủ đạo đức — trước khi chạy khảo sát giáo viên

  > Quy tắc vàng: KHÔNG mời giáo viên, KHÔNG thu bất kỳ dữ liệu người thật nào cho tới khi
  > MỌI ô "Cổng bắt buộc" bên dưới đã được tick. (design.md §8.4)

  ## A. Cổng bắt buộc (phải tick hết trước khi chạy)
  - [ ] Phiếu đồng thuận (`consent-form.md`) đã hoàn tất, GVHD đã duyệt lời văn.
  - [ ] Đã xác định trường có yêu cầu phê duyệt hội đồng cho khảo sát người lớn / rủi ro tối thiểu hay không.
  - [ ] Nếu CÓ yêu cầu: đã nộp hồ sơ và NHẬN được phê duyệt bằng văn bản. (Lưu bản sao.)
  - [ ] Nếu KHÔNG yêu cầu: đã có xác nhận của GVHD bằng văn bản rằng không cần phê duyệt.
  - [ ] Quy trình ẩn danh đã sẵn sàng: mỗi giáo viên có mã (T01, T02, …); bảng ghép mã↔người (nếu cần liên hệ lại) được giữ RIÊNG, KHÔNG nằm cùng dữ liệu phản hồi, và sẽ xoá sau khi thu xong.
  - [ ] Chỉ thu 2 trường nhân khẩu: số năm giảng dạy, khối lớp. Không thu gì khác.
  - [ ] Đã tuân thủ điều khoản sử dụng API của nhà cung cấp AI khi trích lời giải để cho giáo viên xem (không lộ nội dung vi phạm điều khoản).

  ## B. Trong lúc chạy
  - [ ] Mỗi giáo viên đọc & đồng ý phiếu TRƯỚC khi xem lời giải.
  - [ ] Nhắc rõ quyền dừng/bỏ qua/rút lui ở đầu buổi.
  - [ ] Không gây áp lực thời gian, không "chấm điểm" giáo viên.

  ## C. Sau khi chạy
  - [ ] Dữ liệu lưu ở dạng ẩn danh (chỉ mã Txx).
  - [ ] Bảng ghép mã↔người (nếu có) đã được huỷ.
  - [ ] Báo cáo ghi rõ N nhỏ ⇒ đây là nghiên cứu THAM CHIẾU, không tổng quát hoá.

  ## Tình trạng phê duyệt (nhóm điền)
  - Trường: [[tên trường]] — Yêu cầu phê duyệt hội đồng? [[Có/Không]]
  - Ngày nộp: [[...]] · Ngày nhận phê duyệt: [[...]] · Số/căn cứ: [[...]]
  ```

- [ ] **Bước 2 — Tự kiểm theo tiêu chí nghiệm thu:**
  - [ ] Mục A có đủ: đồng thuận, phê duyệt hội đồng, ẩn danh, thu tối thiểu, điều khoản API.
  - [ ] Có câu "quy tắc vàng" cấm chạy trước khi tick hết.
  - [ ] Mục C có bước huỷ bảng ghép mã↔người và câu "không tổng quát hoá".

- [ ] **Bước 3 — Commit.**
  ```bash
  git add research/vsgeo-bench/survey/ethics-checklist.md
  git commit -m "docs(survey): thêm checklist tuân thủ đạo đức trước khi khảo sát"
  ```

---

## Task 3: Thiết kế công cụ khảo sát ("thử nghiệm tin cậy mù") — `survey/instrument.md`

> **Loại Task: NỘI DUNG (2 em tự thiết kế & bảo vệ).** Việc *chọn 10–15 lời giải nào*, *cân bằng đúng/sai ra sao*, *mời giáo viên thế nào* là **thiết kế thí nghiệm — công sức trí tuệ của hai em**. Kế hoạch cho quy trình từng bước, template thẻ item, 1 ví dụ đã làm mẫu, tiêu chí cân bằng, và kịch bản mời.

**Files:**
- Create: `research/vsgeo-bench/survey/instrument.md`

**Vì sao làm vậy:** "Thử nghiệm tin cậy mù" (blind trust experiment) là *trái tim* của khảo sát (§8.2). "Mù" = giáo viên không biết lời giải nào của model nào, không biết cái nào đúng/sai — để phán đoán của họ *khách quan*. Nếu chọn item lệch (toàn bài dễ, hoặc toàn bài sai lộ liễu) thì kết quả vô nghĩa. Quy trình chọn phải *có kỷ luật và ghi lại được*.

**Các bước:**

- [ ] **Bước 1 — Tạo file với phần "Nguyên tắc thiết kế".** Chép khối sau vào đầu file:

  ```markdown
  # Công cụ khảo sát: Thử nghiệm tin cậy mù (Blind Trust Experiment)

  ## Nguyên tắc (design.md §8.2)
  - Cho giáo viên xem một tập lời giải AI, TRỘN đúng/sai, GIẤU tên model.
  - Mỗi lời giải, giáo viên trả lời: (a) Đúng/Sai; (b) điểm tin 1–5 (Likert).
  - "Mù" nghĩa là: giáo viên không biết cái nào đúng, không biết model nào.
  - So phán đoán giáo viên với đáp án đúng thật (verdict từ oracle, Kế hoạch 02/03).

  ## Thang điểm tin (Likert 1–5) — in kèm mỗi phiếu
  1 = Chắc chắn SAI · 2 = Nghiêng về sai · 3 = Không chắc ·
  4 = Nghiêng về đúng · 5 = Chắc chắn ĐÚNG
  ```

- [ ] **Bước 2 — Viết "Quy trình chọn 10–15 item cân bằng" từ log harness.** Chép khối sau (đây là *quy trình*, hai em thao tác tay trên log `EvalRecord` mà Kế hoạch 03 sinh ra):

  ```markdown
  ## Quy trình chọn item (làm tay, ghi lại từng lựa chọn)
  Nguồn: file log JSONL của harness (mỗi dòng là một EvalRecord), có sẵn cờ `verdict`
  (correct/incorrect từ oracle) và `rawOutput` (văn bản lời giải AI).

  1. Mục tiêu số lượng: 12 item (nằm trong khoảng 10–15).
  2. CÂN BẰNG: ~6 item có `verdict = "correct"` và ~6 item có `verdict = "incorrect"`.
     (Cân bằng để tránh gợi ý; nếu lệch, ghi rõ tỉ lệ thật trong báo cáo.)
  3. ƯU TIÊN item SAI "TRÔI CHẢY": trong nhóm incorrect, ưu tiên lời giải DÀI, có
     trình bày mạch lạc, có bước rõ ràng và có câu kết luận quả quyết (vd có \boxed{...}).
     Đây chính là loại "tự tin nhưng sai" (§6.3) mà ta muốn thử giáo viên.
  4. ĐA DẠNG chủ đề & độ khó: cố gắng phủ vài chủ đề khác nhau (thể tích, khoảng cách,
     góc, toạ độ) và vài mức độ khó, để không thiên lệch.
  5. GIẤU model: khi trích ra, XOÁ mọi dấu vết tên model khỏi văn bản; đặt lại thứ tự
     NGẪU NHIÊN; gán mã item item-01 … item-12 (mã KHÔNG tiết lộ đúng/sai).
  6. GHI SỔ ẩn (answer key) RIÊNG: một bảng item-XX → (verdict thật, model thật, seedId).
     Bảng này KHÔNG đưa cho giáo viên; chỉ nhóm giữ để chấm sau.

  ## Tiêu chí cân bằng (acceptance) — tick trước khi chốt bộ item
  - [ ] Tổng 10–15 item.
  - [ ] Số item đúng và số item sai lệch nhau ≤ 2.
  - [ ] Ít nhất 3 item sai thuộc loại "trôi chảy nhưng sai".
  - [ ] Phủ ≥ 3 chủ đề khác nhau.
  - [ ] Không văn bản nào còn lộ tên model.
  - [ ] Thứ tự đã xáo trộn ngẫu nhiên.
  ```

- [ ] **Bước 3 — Viết "Template thẻ item" + 1 ví dụ đã làm mẫu.** Chép khối sau:

  ```markdown
  ## Template một thẻ item (giáo viên nhìn thấy)
  --------------------------------------------------
  ITEM item-XX
  Đề bài: <statement_vi của bài>
  Lời giải của AI:
  <rawOutput — đã bỏ tên model>

  Câu hỏi cho thầy/cô:
  (a) Lời giải này ĐÚNG hay SAI?   [ ] Đúng   [ ] Sai
  (b) Mức độ tin tưởng của thầy/cô (1–5): ___
  --------------------------------------------------

  ## Ví dụ đã làm mẫu (item-07, là một lời giải SAI "trôi chảy")
  ITEM item-07
  Đề bài: Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với đáy
  và SA = a. Tính khoảng cách từ A đến mặt phẳng (SBD).
  Lời giải của AI:
  "Gọi O là tâm hình vuông. Vì ABCD là hình vuông cạnh a nên BD = a√2 và AO = a√2/2.
  Do SA ⊥ (ABCD) nên tam giác SAO vuông tại A. Khoảng cách từ A đến (SBD) là đường cao
  AH của tam giác SAO. Ta có 1/AH² = 1/SA² + 1/AO² = 1/a² + 2/a² = 3/a², suy ra
  AH = a/√3 = a√3/3. Vậy khoảng cách cần tìm là \boxed{a√3/3}."
  → (Ghi chú của NHÓM, KHÔNG cho giáo viên xem: verdict = incorrect. Lời giải nhầm
     mặt phẳng (SBD) với (SAC): AO không nằm trong (SBD). Đáp án đúng là a√6/3.
     Đây là ví dụ điển hình "nghe rất hợp lý nhưng sai".)
  ```

  > Lưu ý cho hai em: ví dụ trên là *mẫu định dạng* — khi làm thật, thẻ item lấy từ log harness thật của hai em, và ghi chú answer-key cất riêng theo Bước 2 mục 6.

- [ ] **Bước 4 — Viết "Kịch bản mời & tổ chức" (~8–15 giáo viên).** Chép khối sau:

  ```markdown
  ## Kịch bản mời giáo viên (~8–15 người)
  1. Nhờ GVHD giới thiệu tới giáo viên Toán THPT (trong/ngoài trường). Mục tiêu 8–15 người.
  2. Gửi lời mời ngắn gọn kèm phiếu đồng thuận; nêu rõ ~20–30 phút, tự nguyện, ẩn danh.
  3. Ai đồng ý: cho đọc & ký phiếu đồng thuận TRƯỚC; gán mã Txx.
  4. Phát bộ 10–15 thẻ item (cùng thứ tự cho mọi người, hoặc ghi rõ nếu xáo mỗi người).
  5. Thu phiếu; nhập vào file dữ liệu theo `response-format.md` (Task 4).
  6. Cảm ơn; nhắc quyền rút dữ liệu.

  ## Tiêu chí nghiệm thu (instrument)
  - [ ] Có thang Likert 1–5 in kèm.
  - [ ] Có quy trình chọn item cân bằng + answer-key giữ riêng.
  - [ ] Có template thẻ + 1 ví dụ mẫu.
  - [ ] Có kịch bản mời 8–15 giáo viên.
  ```

- [ ] **Bước 5 — Commit.**
  ```bash
  git add research/vsgeo-bench/survey/instrument.md
  git commit -m "docs(survey): thiết kế thử nghiệm tin cậy mù + quy trình chọn item"
  ```

---

## Task 4: Định dạng dữ liệu thu (ẩn danh) — `survey/response-format.md`

> **Loại Task: NỘI DUNG + HỢP ĐỒNG DỮ LIỆU.** File này *định nghĩa chính xác* các cột dữ liệu mà Task 5 (`analyze.ts`) sẽ đọc. Vì thế nó vừa là tài liệu, vừa là "hợp đồng" giữa nửa con người và nửa code. **Phải làm trước Task 5.**

**Files:**
- Create: `research/vsgeo-bench/survey/response-format.md`

**Vì sao làm vậy:** Nếu định dạng dữ liệu mơ hồ, code phân tích sẽ đọc sai và mọi con số vô nghĩa. Ta chốt một CSV *phẳng, dễ nhập tay, ẩn danh sẵn*.

**Các bước:**

- [ ] **Bước 1 — Tạo file** với nội dung sau (chép nguyên):

  ```markdown
  # Định dạng dữ liệu phản hồi khảo sát (ẩn danh)

  Ta dùng CSV phẳng cho dễ nhập tay và mở bằng Excel/Sheets. MỖI DÒNG = một giáo viên
  chấm một item. File này KHÔNG chứa tên/trường/email — chỉ mã ẩn danh.

  ## File chính: `responses.csv`
  Cột (đúng thứ tự, có dòng tiêu đề):

  | Cột | Kiểu | Ý nghĩa | Giá trị hợp lệ |
  |-----|------|---------|----------------|
  | `teacherId` | chuỗi | Mã ẩn danh giáo viên | vd `T01`, `T02` |
  | `itemId` | chuỗi | Mã lời giải | vd `item-01` |
  | `judged` | chuỗi | Giáo viên phán | `correct` hoặc `incorrect` |
  | `trust` | số | Điểm tin Likert | số nguyên 1..5 |
  | `truth` | chuỗi | Đáp án đúng thật (từ oracle §02/03) | `correct` hoặc `incorrect` |

  Quy ước dịch phiếu → giá trị:
  - Giáo viên tick "Đúng" ⇒ `judged = correct`; tick "Sai" ⇒ `judged = incorrect`.
  - `truth` lấy từ answer-key giữ riêng (verdict của oracle): `correct`/`incorrect`.
  - Bỏ qua các dòng giáo viên không trả lời (đừng bịa giá trị).

  ### Ví dụ `responses.csv`
  ```csv
  teacherId,itemId,judged,trust,truth
  T01,item-01,correct,5,correct
  T01,item-07,correct,4,incorrect
  T02,item-07,incorrect,2,incorrect
  T02,item-01,correct,5,correct
  ```
  (Dòng 2: giáo viên T01 bị lời giải sai item-07 đánh lừa — chấm "correct" dù truth là
  "incorrect", lại còn cho điểm tin 4. Đây chính là dữ liệu H3 cần.)

  ## File phụ (tách riêng để giữ ẩn danh): `demographics.csv`
  Chỉ 2 trường nhân khẩu, khoá bằng cùng mã ẩn danh:

  ```csv
  teacherId,yearsTeaching,gradeLevels
  T01,12,"11,12"
  T02,6,10
  ```
  KHÔNG bao giờ ghép file này với danh tính thật trong cùng một chỗ lưu.

  ## Bản đồ item→model (chỉ NHÓM giữ, cho phân tích tuỳ chọn): `item-model-map.csv`
  Dùng cho phân tích "xếp hạng cảm nhận vs benchmark" (tuỳ chọn, Task 5). KHÔNG đưa
  giáo viên.
  ```csv
  itemId,modelId
  item-01,model-A
  item-07,model-B
  ```
  ```

- [ ] **Bước 2 — Tự kiểm tiêu chí nghiệm thu:**
  - [ ] `responses.csv` có đúng 5 cột: `teacherId,itemId,judged,trust,truth`.
  - [ ] `judged` và `truth` chỉ nhận `correct`/`incorrect`; `trust` là 1..5.
  - [ ] Nhân khẩu tách file riêng, chỉ 2 trường.
  - [ ] Không cột nào chứa danh tính thật.

- [ ] **Bước 3 — Commit.**
  ```bash
  git add research/vsgeo-bench/survey/response-format.md
  git commit -m "docs(survey): chốt định dạng dữ liệu phản hồi CSV ẩn danh"
  ```

---

## Task 5: Script phân tích `analyze.ts` (CODE — theo vòng TDD)

> **Loại Task: HẠ TẦNG/CÔNG CỤ — CODE ĐẦY ĐỦ, có test.** Đây là công cụ hai em gõ, chạy, gỡ lỗi và **phải hiểu từng dòng** để bảo vệ trước hội đồng. Ta làm theo **TDD** (Test-Driven Development): *viết test thất bại trước → chạy thấy đỏ → viết code cho xanh → commit*.

**Files:**
- Create: `research/vsgeo-bench/survey/analyze.ts`
- Test: `research/vsgeo-bench/survey/__tests__/analyze.test.ts`

**Vì sao TDD?** Với công thức thống kê (tỉ lệ, tương quan), rất dễ sai lặng lẽ (chia nhầm mẫu số, quên trường hợp rỗng). Viết test *trước* với dữ liệu ta *tự tính tay được kết quả* buộc code phải đúng, và cho hai em một "lưới an toàn" khi chỉnh sửa sau này.

**Khái niệm hai chỉ số (đọc kỹ, hai em sẽ bị hỏi ở hội đồng):**
- **`deceptionRate` (tỉ lệ bị đánh lừa):** *trong các dòng có `truth = "incorrect"`*, tỉ lệ dòng mà giáo viên `judged = "correct"`. Công thức: (số dòng truth-sai bị chấm đúng) / (tổng số dòng truth-sai). Cao ⇒ giáo viên hay bị lừa ⇒ ủng hộ H3.
- **`trustAccuracyCorrelation` (tương quan tin↔đúng):** hệ số tương quan Pearson giữa `trust` (1..5) và `truth` quy về số (correct=1, incorrect=0). Gần +1 ⇒ giáo viên tin nhiều đúng lúc (calibrate tốt); gần 0 ⇒ điểm tin *không* liên quan tới đúng/sai (giáo viên không phân biệt được — đúng nỗi lo §6.3); âm ⇒ tin ngược (tin cao lại hay sai).

Ngoài ra ta tính vài số phụ hữu ích: `highTrustOnWrongRate` (tỉ lệ lời giải SAI mà giáo viên cho điểm tin ≥ 4 — "bị lừa mạnh"), `teacherAccuracy` (tỉ lệ giáo viên chấm khớp truth), và một hàm tuỳ chọn xếp hạng cảm nhận theo model.

---

### Bước 1 — Viết test thất bại trước (kèm CODE test đầy đủ)

- [ ] Tạo `research/vsgeo-bench/survey/__tests__/analyze.test.ts` với nội dung sau. Số liệu trong test đã được tính tay để hai em đối chiếu (xem chú thích).

  ```ts
  import { describe, it, expect } from "vitest";
  import {
    parseCsv,
    analyze,
    pearson,
    formatReport,
    perceivedModelRanking,
    type SurveyRow,
  } from "../analyze";

  // Dữ liệu tổng hợp (synthetic) — ta BIẾT TRƯỚC kết quả để kiểm tra công thức.
  // 4 dòng, một cách sắp có chủ đích:
  //  A: truth incorrect, judged correct, trust 5  -> BỊ LỪA (và tin cao)
  //  B: truth incorrect, judged incorrect, trust 2 -> không bị lừa
  //  C: truth incorrect, judged correct, trust 4  -> BỊ LỪA (tin >=4)
  //  D: truth correct,   judged correct, trust 5  -> đúng
  const ROWS: SurveyRow[] = [
    { teacherId: "T01", itemId: "A", judged: "correct",   trust: 5, truth: "incorrect" },
    { teacherId: "T01", itemId: "B", judged: "incorrect", trust: 2, truth: "incorrect" },
    { teacherId: "T02", itemId: "C", judged: "correct",   trust: 4, truth: "incorrect" },
    { teacherId: "T02", itemId: "D", judged: "correct",   trust: 5, truth: "correct"   },
  ];

  describe("parseCsv", () => {
    it("đọc CSV 5 cột thành mảng SurveyRow, trust là số", () => {
      const csv =
        "teacherId,itemId,judged,trust,truth\n" +
        "T01,item-01,correct,5,correct\n" +
        "T02,item-07,incorrect,2,incorrect\n";
      const rows = parseCsv(csv);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({
        teacherId: "T01", itemId: "item-01", judged: "correct", trust: 5, truth: "correct",
      });
      expect(rows[1].trust).toBe(2);
      expect(typeof rows[1].trust).toBe("number");
    });

    it("bỏ qua dòng trống và khoảng trắng thừa", () => {
      const csv =
        "teacherId,itemId,judged,trust,truth\n" +
        " T01 , item-01 , correct , 5 , correct \n" +
        "\n";
      const rows = parseCsv(csv);
      expect(rows).toHaveLength(1);
      expect(rows[0].teacherId).toBe("T01");
      expect(rows[0].truth).toBe("correct");
    });
  });

  describe("pearson", () => {
    it("tương quan hoàn hảo = 1", () => {
      // xs và ys tăng cùng nhau
      expect(pearson([1, 5, 1, 5], [0, 1, 0, 1])).toBeCloseTo(1, 6);
    });
    it("tính đúng trên bộ nhỏ đã tính tay = 0.4714", () => {
      // trust=[5,2,4,5], truth01=[0,0,0,1] -> r = 1/sqrt(4.5) = 0.471405
      expect(pearson([5, 2, 4, 5], [0, 0, 0, 1])).toBeCloseTo(0.4714, 4);
    });
    it("phương sai 0 -> trả 0 (không chia cho 0)", () => {
      expect(pearson([3, 3, 3], [1, 2, 3])).toBe(0);
    });
  });

  describe("analyze", () => {
    const r = analyze(ROWS);
    it("đếm đúng số dòng/giáo viên/item", () => {
      expect(r.nRows).toBe(4);
      expect(r.nTeachers).toBe(2);
      expect(r.nItems).toBe(4);
    });
    it("deceptionRate = 2/3 (2 trong 3 lời giải sai bị chấm đúng)", () => {
      expect(r.deceptionRate).toBeCloseTo(2 / 3, 6);
    });
    it("highTrustOnWrongRate = 2/3 (A trust5, C trust4 >=4)", () => {
      expect(r.highTrustOnWrongRate).toBeCloseTo(2 / 3, 6);
    });
    it("teacherAccuracy = 1/2 (chỉ B và D khớp truth)", () => {
      expect(r.teacherAccuracy).toBeCloseTo(0.5, 6);
    });
    it("trustAccuracyCorrelation = 0.4714 (đã tính tay)", () => {
      expect(r.trustAccuracyCorrelation).toBeCloseTo(0.4714, 4);
    });
  });

  describe("formatReport", () => {
    it("trả chuỗi có các nhãn chính", () => {
      const s = formatReport(analyze(ROWS));
      expect(typeof s).toBe("string");
      expect(s).toContain("Tỉ lệ bị đánh lừa");
      expect(s).toContain("Tương quan tin");
      expect(s).toContain("66.7%"); // deceptionRate 2/3
    });
  });

  describe("perceivedModelRanking (tuỳ chọn)", () => {
    it("xếp model theo tỉ lệ được giáo viên chấm 'correct'", () => {
      const map = new Map<string, string>([
        ["A", "X"], ["B", "X"], ["C", "Y"], ["D", "Y"],
      ]);
      const rank = perceivedModelRanking(ROWS, map);
      // X: items A,B -> judged correct rate = 1/2 ; real (truth correct) = 0/2 = 0
      // Y: items C,D -> judged correct rate = 2/2 = 1 ; real = 1/2 = 0.5
      expect(rank[0].modelId).toBe("Y");
      expect(rank[0].perceivedAccuracy).toBeCloseTo(1, 6);
      expect(rank[0].realAccuracy).toBeCloseTo(0.5, 6);
      expect(rank[1].modelId).toBe("X");
      expect(rank[1].perceivedAccuracy).toBeCloseTo(0.5, 6);
      expect(rank[1].realAccuracy).toBeCloseTo(0, 6);
    });
  });
  ```

---

### Bước 2 — Chạy test, thấy FAIL

- [ ] Chạy:
  ```bash
  npm test -- research/vsgeo-bench/survey/__tests__/analyze.test.ts
  ```
- [ ] **Output mong đợi:** vitest báo lỗi *không import được* `../analyze` (file chưa tồn tại), đại loại:
  ```
  Error: Failed to load url ../analyze (resolved id: .../survey/analyze) ... does not exist
  ⎯⎯ Test Files  1 failed (1)
  ```
  Đỏ là ĐÚNG ở bước này — nghĩa là test đang thật sự kiểm `analyze.ts`.

---

### Bước 3 — Viết code tối thiểu cho PASS (kèm CODE đầy đủ)

- [ ] Tạo `research/vsgeo-bench/survey/analyze.ts` với nội dung sau (đọc chú thích tiếng Việt để hiểu):

  ```ts
  // survey/analyze.ts
  // Phân tích dữ liệu khảo sát giáo viên (điểm tham chiếu con người, design.md §8).
  // Đọc CSV phản hồi ẩn danh -> tính deceptionRate & trustAccuracyCorrelation -> in bảng.
  // KHÔNG dùng engine ký hiệu: đúng/sai (truth) đã do máy chấm ở Kế hoạch 02/03 xác định.

  // --- Kiểu dữ liệu (khớp response-format.md) ---
  export type Verdict01 = "correct" | "incorrect";

  export type SurveyRow = {
    teacherId: string;   // mã ẩn danh, vd "T01"
    itemId: string;      // vd "item-07"
    judged: Verdict01;   // giáo viên phán Đúng/Sai
    trust: number;       // điểm tin Likert 1..5
    truth: Verdict01;    // đáp án đúng thật (oracle)
  };

  export type AnalysisResult = {
    nRows: number;                    // tổng số phán đoán (giáo viên × item)
    nTeachers: number;                // số giáo viên khác nhau
    nItems: number;                   // số item khác nhau
    deceptionRate: number;            // trong các dòng truth=incorrect: tỉ lệ judged=correct
    highTrustOnWrongRate: number;     // trong các dòng truth=incorrect: tỉ lệ trust>=4
    teacherAccuracy: number;          // tỉ lệ judged===truth
    trustAccuracyCorrelation: number; // Pearson(trust, truth01)
  };

  // --- Đọc CSV (5 cột theo response-format.md) ---
  // Ta viết parser CSV tối giản: KHÔNG hỗ trợ dấu phẩy trong ô, vì dữ liệu của ta
  // (mã, correct/incorrect, số) không có dấu phẩy. Đơn giản = dễ hiểu, dễ bảo vệ.
  export function parseCsv(text: string): SurveyRow[] {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return [];
    // Bỏ dòng tiêu đề (dòng đầu).
    const rows: SurveyRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      if (cols.length < 5) continue; // dòng thiếu cột -> bỏ qua, không bịa
      const [teacherId, itemId, judged, trustStr, truth] = cols;
      const trust = Number(trustStr);
      if (!Number.isFinite(trust)) continue; // trust không phải số -> bỏ qua
      if (judged !== "correct" && judged !== "incorrect") continue;
      if (truth !== "correct" && truth !== "incorrect") continue;
      rows.push({ teacherId, itemId, judged, trust, truth });
    }
    return rows;
  }

  // --- Hệ số tương quan Pearson ---
  // r = Σ(xi-x̄)(yi-ȳ) / sqrt( Σ(xi-x̄)² · Σ(yi-ȳ)² ).
  // Nếu một biến không đổi (phương sai 0) -> trả 0 để tránh chia cho 0.
  export function pearson(xs: number[], ys: number[]): number {
    const n = xs.length;
    if (n === 0 || n !== ys.length) return 0;
    const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    const mx = mean(xs);
    const my = mean(ys);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - mx;
      const dy = ys[i] - my;
      sxy += dx * dy;
      sxx += dx * dx;
      syy += dy * dy;
    }
    const denom = Math.sqrt(sxx * syy);
    if (denom === 0) return 0;
    return sxy / denom;
  }

  const truth01 = (v: Verdict01): number => (v === "correct" ? 1 : 0);

  // --- Phân tích chính ---
  export function analyze(rows: SurveyRow[]): AnalysisResult {
    const nRows = rows.length;
    const nTeachers = new Set(rows.map((r) => r.teacherId)).size;
    const nItems = new Set(rows.map((r) => r.itemId)).size;

    const wrongRows = rows.filter((r) => r.truth === "incorrect");
    const fooled = wrongRows.filter((r) => r.judged === "correct").length;
    const highTrustWrong = wrongRows.filter((r) => r.trust >= 4).length;

    const deceptionRate = wrongRows.length === 0 ? 0 : fooled / wrongRows.length;
    const highTrustOnWrongRate =
      wrongRows.length === 0 ? 0 : highTrustWrong / wrongRows.length;

    const correctJudgments = rows.filter((r) => r.judged === r.truth).length;
    const teacherAccuracy = nRows === 0 ? 0 : correctJudgments / nRows;

    const trustAccuracyCorrelation = pearson(
      rows.map((r) => r.trust),
      rows.map((r) => truth01(r.truth)),
    );

    return {
      nRows,
      nTeachers,
      nItems,
      deceptionRate,
      highTrustOnWrongRate,
      teacherAccuracy,
      trustAccuracyCorrelation,
    };
  }

  // --- Xếp hạng cảm nhận theo model (TUỲ CHỌN, design.md §8.3) ---
  // "perceived" = tỉ lệ item của model bị/được giáo viên chấm "correct".
  // "real" = tỉ lệ item của model thật sự đúng (truth=correct). So hai cái để thấy
  // giáo viên có bị model nào đó "qua mặt" nhiều hơn không.
  export type ModelPerception = {
    modelId: string;
    n: number;                 // số phán đoán liên quan model này
    perceivedAccuracy: number; // tỉ lệ judged=correct
    realAccuracy: number;      // tỉ lệ truth=correct
  };

  export function perceivedModelRanking(
    rows: SurveyRow[],
    itemModelMap: Map<string, string>,
  ): ModelPerception[] {
    const byModel = new Map<string, SurveyRow[]>();
    for (const r of rows) {
      const model = itemModelMap.get(r.itemId);
      if (!model) continue; // item không có trong map -> bỏ qua
      const arr = byModel.get(model) ?? [];
      arr.push(r);
      byModel.set(model, arr);
    }
    const out: ModelPerception[] = [];
    for (const [modelId, rs] of byModel) {
      const perceived = rs.filter((r) => r.judged === "correct").length / rs.length;
      const real = rs.filter((r) => r.truth === "correct").length / rs.length;
      out.push({ modelId, n: rs.length, perceivedAccuracy: perceived, realAccuracy: real });
    }
    // Xếp giảm dần theo cảm nhận; hoà thì theo modelId cho ổn định.
    out.sort(
      (a, b) =>
        b.perceivedAccuracy - a.perceivedAccuracy || a.modelId.localeCompare(b.modelId),
    );
    return out;
  }

  // --- In bảng dễ đọc ---
  const pct = (x: number): string => (x * 100).toFixed(1) + "%";

  export function formatReport(r: AnalysisResult): string {
    return [
      "=== KHẢO SÁT GIÁO VIÊN — KẾT QUẢ ===",
      `Số phán đoán (giáo viên × item): ${r.nRows}`,
      `Số giáo viên: ${r.nTeachers} · Số item: ${r.nItems}`,
      "",
      `Tỉ lệ bị đánh lừa (deceptionRate): ${pct(r.deceptionRate)}`,
      `  (lời giải SAI nhưng bị chấm ĐÚNG)`,
      `Bị lừa mạnh, tin ≥ 4 (highTrustOnWrongRate): ${pct(r.highTrustOnWrongRate)}`,
      `Độ chính xác của giáo viên (teacherAccuracy): ${pct(r.teacherAccuracy)}`,
      `Tương quan tin ↔ đúng (Pearson): ${r.trustAccuracyCorrelation.toFixed(4)}`,
      "  (gần 0 ⇒ điểm tin gần như không phân biệt được đúng/sai)",
    ].join("\n");
  }

  // --- CLI: chạy trực tiếp bằng `npx tsx survey/analyze.ts <đường-dẫn.csv>` ---
  // Đoạn này chỉ chạy khi gọi file trực tiếp, KHÔNG chạy khi bị test import.
  import { readFileSync } from "node:fs";
  import { fileURLToPath } from "node:url";

  const isMain =
    typeof process !== "undefined" &&
    Array.isArray(process.argv) &&
    process.argv[1] === fileURLToPath(import.meta.url);

  if (isMain) {
    const path = process.argv[2];
    if (!path) {
      console.error("Cách dùng: npx tsx survey/analyze.ts <đường-dẫn responses.csv>");
      process.exit(1);
    }
    const rows = parseCsv(readFileSync(path, "utf8"));
    console.log(formatReport(analyze(rows)));
  }
  ```

  > Ghi chú kỹ thuật cho hai em: `import` ở giữa file là hợp lệ trong ESM vì mọi `import` được "nâng" (hoist) lên đầu khi chạy; ta đặt nó cạnh khối CLI cho dễ đọc. Nếu ESLint của dự án phàn nàn "import phải ở đầu file", chỉ cần chuyển hai dòng `import { readFileSync }` và `import { fileURLToPath }` lên ngay dưới các `export type` ở đầu file — logic không đổi.

---

### Bước 4 — Chạy test, thấy PASS

- [ ] Chạy lại:
  ```bash
  npm test -- research/vsgeo-bench/survey/__tests__/analyze.test.ts
  ```
- [ ] **Output mong đợi:** tất cả xanh, ví dụ:
  ```
  ✓ survey/__tests__/analyze.test.ts (11 tests) ...ms
    ✓ parseCsv > đọc CSV 5 cột thành mảng SurveyRow, trust là số
    ✓ analyze > deceptionRate = 2/3 (2 trong 3 lời giải sai bị chấm đúng)
    ✓ analyze > trustAccuracyCorrelation = 0.4714 (đã tính tay)
    ...
  Test Files  1 passed (1)
       Tests  11 passed (11)
  ```
- [ ] (Tuỳ chọn) Thử chạy CLI bằng một CSV mẫu để thấy bảng in ra:
  ```bash
  printf 'teacherId,itemId,judged,trust,truth\nT01,item-07,correct,4,incorrect\nT02,item-07,incorrect,2,incorrect\n' > /tmp/demo.csv
  npx tsx research/vsgeo-bench/survey/analyze.ts /tmp/demo.csv
  ```
  Thấy in ra khối "KHẢO SÁT GIÁO VIÊN — KẾT QUẢ" với `deceptionRate: 50.0%` (1 trong 2 lời giải sai bị chấm đúng) là đạt.

---

### Bước 5 — Commit

- [ ] Commit code + test:
  ```bash
  git add research/vsgeo-bench/survey/analyze.ts research/vsgeo-bench/survey/__tests__/analyze.test.ts
  git commit -m "feat(survey): analyze deceptionRate + trustAccuracyCorrelation (TDD)"
  ```

---

## Task 6 (T4): Chạy khảo sát thật & viết kết quả — quy trình, KHÔNG code

> **Loại Task: NỘI DUNG (2 em tự làm ở T4).** Chỉ làm sau khi Task 1–5 xong và **checklist đạo đức (Task 2) đã tick hết cổng bắt buộc**. Không có file mới bắt buộc; đầu ra là *dữ liệu thật ẩn danh* + *đoạn kết quả* cho báo cáo.

**Vì sao tách riêng:** để nhấn mạnh ranh giới — code và tài liệu làm ở T3; *chạm vào giáo viên thật* chỉ ở T4 và chỉ khi đã qua cổng đạo đức.

**Các bước (checklist thực thi ở T4):**
- [ ] Xác nhận `survey/ethics-checklist.md` mục A đã tick hết (đặc biệt: phê duyệt nếu cần).
- [ ] Chốt bộ 10–15 item theo `instrument.md`; cất answer-key riêng.
- [ ] Mời 8–15 giáo viên; mỗi người đọc & ký `consent-form.md` trước.
- [ ] Thu phiếu; nhập vào `survey/data/responses.csv` đúng `response-format.md` (tạo thư mục `survey/data/` nếu chưa có; **không commit dữ liệu chứa bất kỳ danh tính nào** — chỉ mã Txx).
- [ ] Chạy `npx tsx research/vsgeo-bench/survey/analyze.ts research/vsgeo-bench/survey/data/responses.csv`, lưu bảng kết quả.
- [ ] Viết 1 đoạn diễn giải cho báo cáo: nêu `deceptionRate`, `trustAccuracyCorrelation`, và nhắc lại *N nhỏ ⇒ nghiên cứu tham chiếu, không tổng quát hoá* (§8.4). **Phần diễn giải là công sức trí tuệ của hai em** — kế hoạch không viết hộ kết luận.

**Tiêu chí nghiệm thu Task 6:**
- [ ] Có `responses.csv` ẩn danh, ≥ 8 giáo viên.
- [ ] Có bảng kết quả từ `analyze.ts`.
- [ ] Có đoạn diễn giải trung thực (kể cả nếu deceptionRate thấp/cao ngoài kỳ vọng — báo cáo đúng như số liệu, §9.3).

---

## Tiêu chí hoàn thành (Definition of Done)

Ánh xạ tới tiêu chí thành công §13 và giả thuyết H3 (§1):

- [ ] **4 file tài liệu** tồn tại và qua tự-kiểm: `consent-form.md`, `ethics-checklist.md`, `instrument.md`, `response-format.md`.
- [ ] **Cổng đạo đức (§8.4)** hiện diện dưới dạng checklist tick được; có chỗ ghi tình trạng phê duyệt hội đồng.
- [ ] **`analyze.ts` + test** đủ chạy: `npm test -- research/vsgeo-bench/survey/__tests__/analyze.test.ts` xanh toàn bộ (≥ 11 test).
- [ ] `analyze.ts` chạy được như CLI bằng `npx tsx` và in bảng có `deceptionRate` + `trustAccuracyCorrelation`.
- [ ] Kiểu `SurveyRow` trong code **khớp đúng** 5 cột trong `response-format.md`.
- [ ] (T4) Có dữ liệu khảo sát thật ẩn danh (≥ 8 giáo viên) + bảng kết quả + đoạn diễn giải → **bằng chứng con người cho H3** (§1, §8.3), báo cáo kèm cảnh báo N nhỏ.
- [ ] Mọi commit dùng message conventional (`docs(survey): ...`, `feat(survey): ...`).

---

## Bảng thuật ngữ

| Thuật ngữ | Nghĩa dễ hiểu |
|-----------|----------------|
| **Informed consent (phiếu đồng thuận có thông tin)** | Tờ giấy giải thích nghiên cứu để người tham gia *hiểu rồi mới đồng ý*. |
| **Human subjects (thí nghiệm trên người)** | Nghiên cứu có con người tham gia ⇒ phải theo quy tắc đạo đức chặt. |
| **Blind trust experiment (thử nghiệm tin cậy mù)** | Giáo viên chấm lời giải mà *không biết* cái nào đúng, model nào — để phán đoán khách quan. |
| **Likert 1–5** | Thang cho điểm chủ quan, ở đây là mức độ tin tưởng: 1 = chắc chắn sai … 5 = chắc chắn đúng. |
| **deceptionRate (tỉ lệ bị đánh lừa)** | % lời giải *thật sự sai* mà giáo viên vẫn chấm là đúng. |
| **trustAccuracyCorrelation (tương quan tin↔đúng)** | Hệ số Pearson đo xem điểm tin có "đi cùng" với đúng thực tế không; gần 0 = không phân biệt được. |
| **Pearson r** | Số từ −1 đến 1 đo mức hai đại lượng biến thiên cùng chiều. |
| **oracle / truth / verdict** | Máy chấm ở Kế hoạch 02/03 quyết định lời giải đúng hay sai; ta lấy làm "đáp án đúng thật". |
| **anonymize (ẩn danh)** | Thay danh tính bằng mã (T01…) để không truy ngược ra người. |
| **calibration ("tự tin nhưng sai")** | Khi mức độ tự tin *không* khớp mức độ đúng — điều H3 nghi ngờ ở cả AI lẫn người (§6.3). |
| **TDD** | Viết test trước, thấy đỏ, viết code cho xanh — cách làm code ít lỗi. |
| **CSV** | File bảng phẳng ngăn bằng dấu phẩy, mở được bằng Excel/Sheets. |
| **CLI** | Chương trình chạy bằng dòng lệnh (ở đây: `npx tsx ...`). |

---

## Em sẽ bảo vệ được gì trước hội đồng

- **"Chúng em làm nghiên cứu trên người ĐÚNG chuẩn đạo đức."** — Tự tay soạn phiếu đồng thuận, checklist đạo đức, và cổng phê duyệt; giải thích được vì sao mỗi điều là bắt buộc (§8.4). Đây là năng lực *thiết kế nghiên cứu có trách nhiệm*.
- **"Chúng em đo được H3 ở phía con người thật, không chỉ ở máy."** — `deceptionRate` và `trustAccuracyCorrelation` cho bằng chứng định lượng rằng ngay cả giáo viên cũng bị lời giải AI "trôi chảy nhưng sai" đánh lừa (§1 H3, §8.3, §6.3). Năng lực *nối giả thuyết với số liệu*.
- **"Chúng em tự viết và hiểu từng dòng công cụ phân tích."** — Giải thích được công thức tỉ lệ và tương quan Pearson, và chứng minh đúng bằng test trên dữ liệu tự tính tay (TDD). Năng lực *lập trình + thống kê kiểm chứng được*.
- **"Chúng em trung thực về giới hạn."** — Chủ động nêu N nhỏ ⇒ nghiên cứu tham chiếu, không tổng quát hoá (§8.4, §9.3). Năng lực *liêm chính khoa học* — thứ hội đồng ViSEF đánh giá rất cao.
