# Ý tưởng xây lại phần "Vẽ Advance" (draft — chờ brainstorm kỹ)

> Trạng thái: **DRAFT ý tưởng**, chưa phải spec chốt. Viết ra để bám theo NẾU bản vá key
> (commit a2bdd42, self-heal) vẫn không cứu được, hoặc khi ta quyết định làm gọn kiến trúc.
> Bước tiếp theo trước khi code: chạy brainstorming → spec → plan như quy trình.

## 1. Vì sao cân nhắc xây lại (điểm đau thực tế)

Trải nghiệm gần đây phơi ra mấy vấn đề KIẾN TRÚC (không phải lỗi toán):

1. **Thất bại ÂM THẦM, khó truy vết.** Khi hỏng, người dùng chỉ thấy toast chung chung
   ("Chưa dựng được hình" / "Chưa vẽ được đề tròn xoay"). Ta KHÔNG thấy được: LLM trả gì?
   hỏng ở khâu nào (đọc đề? phân loại? trích tham số? dựng khối?)? key nào được dùng?
   → mỗi lần lỗi là một lần đoán mò, phải viết probe cục bộ để tái hiện.

2. **LLM ôm quá nhiều việc trong 1 lượt.** `splitProblem` vừa đọc ảnh, vừa phân loại
   (single/multi/animation), vừa trích template rev-ox, vừa để coverageCheck hậu-kiểm.
   Một mắt xích trượt là cả chuỗi sập về fallback mờ mịt.

3. **Nhiều tầng fallback chồng nhau** (rev-ox → multi → animation → looksLikeRevolution →
   solveProblem đơn → degrade+refund). Khó biết một đề "đáng lẽ vẽ được" rơi rớt ở tầng nào.

4. **Footgun cấu hình** đã cắn ta: `ADVANCE_API_KEY`/`ADVANCE_MODEL`/`TRANSCRIBE_API_KEY`
   đè `VILAO_API_KEY`. (Đã vá tạm bằng self-heal; xây lại thì bỏ hẳn các override này.)

5. **Không kiểm thử được đầu cuối trên prod** (route auth-gated, không tự lái UI headless).

Cái GIỮ LẠI (đang tốt, đừng đập): **engine tất định là nguồn chân lý** — LLM chỉ trích số,
engine tự dựng khối + tự kiểm thể tích. Đây là điểm mạnh, bản mới phải kế thừa.

## 2. Nguyên tắc bản xây lại

1. **LLM chỉ làm 1 việc hẹp, schema chặt.** Đọc đề (chữ hoặc ảnh) → trả về DUY NHẤT một
   "AdvanceSpec" có kiểu rõ ràng. Không phân nhánh trong prompt; phân nhánh nằm ở code.
2. **Registry theo LOẠI bài.** Mỗi loại = 1 mục `{ schema, validate, build, render }`:
   - `revolution` (quanh Ox: đĩa/vành khăn; quanh Oy: vỏ trụ)  ← Đợt 1, đã có engine
   - `volume-integral` (Đợt 2)
   - `cross-section` (Đợt 3)
   Thêm dạng mới = thêm 1 mục, không đụng lõi. Mở rộng có kỷ luật.
3. **Hỏng thì HỎNG TO, có chẩn đoán.** Mọi khâu trả `{ ok, stage, reason, detail }`. Log
   Sentry đầy đủ (kể cả raw model output, cắt gọn). Ở chế độ dev/nội bộ: trả cả trace về
   client để nhìn thẳng. Toast người dùng vẫn thân thiện nhưng ta có manh mối thật.
4. **Một khoá, một model.** Chỉ `VILAO_API_KEY` + model mặc định. Bỏ các biến override.
   (Nếu cần A/B model sau này thì làm qua feature-flag có kiểm soát, không phải env đè ngầm.)
5. **Chống spike sẵn trong lõi.** Giữ `hedge` (6s bắn lượt 2) + `isNetworkError` đã vá.
6. **Kiểm thử theo "bộ đề vàng".** Một tập đề mẫu (chữ + ảnh render) chạy qua CLASSIFIER
   THẬT thành battery; mỗi builder có fixture riêng. CI/local chạy được không cần UI.
7. **Endpoint debug (sau cờ dev).** POST một đề → nhận full trace pipeline. Để lần sau
   soi prod không phải viết probe tay.

## 3. Luồng đề xuất (một đường thẳng, ít nhánh)

```
Ảnh/Chữ
  └─► extractSpec(input)            # 1 lượt LLM, schema chặt → AdvanceSpec | {ok:false, reason}
        │  AdvanceSpec = {
        │    kind: 'revolution' | 'volume-integral' | 'cross-section',
        │    problemText,          # bản chép đề (để hiển thị + đối chiếu)
        │    params: <tuỳ kind, typed>,
        │    question: string
        │  }
        └─► registry[kind].validate(params)   # tất định, chống ảo giác (thay coverageCheck)
              ok  ─► registry[kind].build(params)   # engine dựng + TỰ KIỂM (giữ như hiện tại)
              fail─► trả {ok:false, stage:'validate'|'extract'|'build', reason, detail}
```

- Không match kind nào / thiếu tham số / validate trượt ⇒ trả lỗi CÓ TÊN KHÂU, không vẽ bừa.
- "single/multi câu" chỉ còn là thuộc tính của spec (danh sách `questions`), không phải một
  nhánh pipeline riêng — giảm mạnh số ngã rẽ.

## 4. Ranh giới file (nếu làm)

- `api/_lib/advance2/extractSpec.js` + `extractPrompt.js` — 1 lượt LLM, trả AdvanceSpec.
- `api/_lib/advance2/registry.js` — map kind → {schema, validate, build}.
- `api/_lib/advance2/kinds/revolution.js` — dùng lại kernel `analysis/revolution.ts` sẵn có.
- `api/_lib/advance2/diagnostics.js` — chuẩn hoá {ok,stage,reason,detail} + log Sentry.
- `api/analyze-advance.js` — mỏng đi: auth/credit → extractSpec → registry → trả kết quả+trace.
- Frontend: gom các renderer (`AnimatedRevolutionSolid.tsx`…) sau một `AdvanceScene` chung,
  đọc `scene.kind` để chọn renderer. Toast đọc `reason` để nói cụ thể hơn.
- GIỮ: toàn bộ `api/_lib/kernel/analysis/*` (toán đã kiểm chứng). KHÔNG viết lại toán.

## 5. Migrate an toàn (không đập một phát)

1. Dựng `advance2` SONG SONG, sau feature-flag (env `ADVANCE_V2=1` hoặc query `?adv2=1`).
2. Chạy bộ đề vàng qua cả v1 và v2, so khớp kết quả rev-ox trước.
3. Khi v2 phủ bằng hoặc hơn v1 ở Đợt 1 → chuyển mặc định sang v2, gỡ v1.
4. Đợt 2/3 chỉ xây trên v2.

## 6. Việc cần chốt khi brainstorm (chưa quyết)

- AdvanceSpec.params cho từng kind trông chính xác thế nào? (đồng bộ với kernel hiện có)
- "multi câu bóc lớp" (buildAdvanceScene hiện tại) có gộp vào registry được không, hay là
  một kind riêng `layered-figure`?
- Mức độ lộ trace cho client: chỉ dev, hay có nút "báo lỗi" gửi trace về ta?
- Có giữ đường fallback "bài đơn" (solveWithKernel) cho đề KHÔNG phải calculus không?

---
Liên quan: memory [[advance-calculus-revolution]] (Đợt 1 đã ship), [[integration-branch-and-prod]]
(2 key, branch prod). Vá tạm hiện tại: merge 2→1 lượt vision + hedge (9f5b02a) + self-heal key (a2bdd42).
```
