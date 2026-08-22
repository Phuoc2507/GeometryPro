# 🧭 Sổ tay hiểu CODE LÕI (để tự tin bảo vệ)

> **Bạn KHÔNG cần học hết code.** Chỉ cần hiểu **6 mảnh dưới đây** là trả lời được mọi câu hỏi vặn về cách hệ hoạt động.
> Mỗi mảnh có 3 phần: **① Ý là gì** (lời thường) · **② Đọc ở đâu** (mở đúng file, đúng dòng) · **③ Nói gì với hội đồng** (một câu).
> Cách dùng: mỗi ngày đọc 1 mảnh, **mở file lên đối chiếu**, rồi tự nói lại bằng lời mình. 6 ngày là xong.

---

## Mảnh 1 — Luồng tổng: đề → dịch → tính → đáp
**① Ý là gì:** Cả hệ chạy 3 bước. (1) AI đọc đề, xuất ra một "kế hoạch" dạng JSON (điểm + điều kiện + câu hỏi). (2) Chương trình nhận kế hoạch đó, dựng hình và tính. (3) Trả đáp. AI **không tính**, chỉ dịch.
**② Đọc ở đâu:** `api/_lib/kernel-bridge/solveWithKernel.js`
- `planFromProblem(...)` **dòng 24** — gọi AI dịch đề, đọc kết quả JSON (dòng 28, 36).
- `solvePlan(plan)` **dòng 108** — đưa kế hoạch cho engine tính, trả đáp.
- `solveProblem(...)` **dòng 140** — nối cả hai bước lại.
**③ Nói với hội đồng:** *"Hệ chạy hai bước tách bạch: `planFromProblem` cho AI đọc đề thành kế hoạch JSON, rồi `solvePlan` đưa kế hoạch đó cho chương trình của em tính. AI không đụng vào phép tính."*

## Mảnh 2 — Vì sao AI KHÔNG được tính (chỉ dịch)
**① Ý là gì:** Chỗ AI hay sai nhất là tính toán. Nên em ra lệnh (trong "chỉ dẫn" gửi cho AI) rằng nó chỉ được đọc đề và đặt toạ độ, tuyệt đối không tính khoảng cách/góc — để engine tính.
**② Đọc ở đâu:** `api/_lib/kernel-bridge/translatorPrompt.js` **dòng 6** — câu: *"Bạn KHÔNG giải, KHÔNG tính khoảng cách/góc — engine sẽ tính."*
**③ Nói với hội đồng:** *"Ngay trong chỉ dẫn gửi cho AI, em cấm nó tính. Việc của nó chỉ là đọc hiểu đề và đặt lên toạ độ."*

## Mảnh 3 — Lưu số dạng căn để không làm tròn
**① Ý là gì:** Máy tính thường đổi ra số thập phân (sai số). Chương trình của em lưu số ở dạng **một phân số nhân với một căn**, ví dụ `√3/3`, và tính thẳng trên dạng đó, nên đáp cuối vẫn là căn thức đúng.
**② Đọc ở đâu:** `api/_lib/kernel/scalar.ts` **dòng 5**: `Exact = { num, den, radicand }` — nghĩa là giá trị `= (num/den) · √radicand`. Hàm `makeExact` **dòng 38** luôn rút gọn phân số và tách bình phương ra khỏi căn.
**③ Nói với hội đồng:** *"Em không dùng số thập phân. Mỗi số lưu dạng phân số nhân căn, nên đáp ra `√3/3` chứ không phải `1,1547`."*

## Mảnh 4 — Tự kiểm một đáp (chống sai âm thầm)
**① Ý là gì:** Sau khi tính ra đáp dạng căn, chương trình **tính lại giá trị đó một lần nữa bằng số thập phân theo cách độc lập**, rồi so hai bên. Lệch quá ngưỡng rất nhỏ thì nó **bỏ dạng căn, hạ xuống báo "gần đúng"** chứ không khẳng định bừa.
**② Đọc ở đâu:** `api/_lib/kernel/compute/answer.ts`, hàm `certifyDistance` **dòng 41–46**: so `exact` với `floatRef`, sai quá `tol` (dòng 42) thì trả `approximate: true` (dòng 46).
**③ Nói với hội đồng:** *"Mỗi đáp được kiểm chéo bằng một phép tính độc lập; hai cách khớp mới nhận, không khớp thì hệ tự báo là chưa chắc."*

## Mảnh 5 — Cơ chế BIẾT TỪ CHỐI
**① Ý là gì:** Trước khi giải, AI phải qua **3 câu hỏi cổng**: (1) đáp có cần một thang đo tuyệt đối mà đề không cho không? (2) bài này có thuộc loại đặt toạ độ rồi kết luận được không? (3) engine có kiểm được không? Dính "ô cấm" (ví dụ chỉ cho tỉ số mà hỏi thể tích, hoặc bài chứng minh/quỹ tích) → trả `{ "abstain": true }`.
**② Đọc ở đâu:**
- `api/_lib/kernel-bridge/translatorPrompt.js` **dòng 8–64** — phần "KHI NÀO TỪ CHỐI" + 3 câu hỏi cổng + các ô cấm.
- `api/_lib/kernel-bridge/solveWithKernel.js` **dòng 42–43** — khi AI trả `abstain`, hệ dừng lại và báo lý do, **không** đưa đáp bừa.
**③ Nói với hội đồng:** *"Em thiết kế một cổng 3 câu hỏi. Bài nào thiếu dữ kiện hoặc ngoài khả năng thì hệ trả 'không đủ căn cứ' thay vì đoán — đúng phương châm 'thà từ chối còn hơn bịa'."*

## Mảnh 6 — Bộ đề mẫu chạy lại để kiểm (con số 210/210)
**① Ý là gì:** Em có một rổ đề mẫu, mỗi đề kèm kế hoạch và đáp đúng. Một lệnh sẽ **chạy lại toàn bộ**, so đáp máy với đáp đã lưu **bằng giá trị số** (nên `√2` khớp `1,4142`), báo bao nhiêu đúng. Chạy lần nào cũng ra y hệt.
**② Đọc ở đâu:**
- `scripts/bench-gate.mjs` — chạy cả rổ, in "GATE PASS" (dòng 30–34).
- `api/_lib/bench/compareCase.js` — cách so **một** ca bằng số.
- Lệnh chạy: `npm run bench:gate`.
**③ Nói với hội đồng:** *"Đây ạ, em chạy `npm run bench:gate` ngay bây giờ — nó chạy lại toàn bộ đề mẫu, không gọi AI, và cho kết quả giống hệt mỗi lần."* (Rồi bấm chạy thật.)

---

## 🎁 Mảnh phụ — "thang chữ" (bài cạnh a)
Bài cho kích thước bằng chữ `a`: AI đặt `a = 1` cho dễ, engine tính rồi **tự ghép `×a`, `×a²`, `×a³`** theo loại đại lượng (độ dài / diện tích / thể tích) để ra đáp tổng quát như `a³√2/12`. Xem `solveWithKernel.js` dòng 51–55 và `applyScaleSymbol` (dòng 123).

---

## 📅 Cách học trong 6 ngày
- Mỗi ngày **1 mảnh**: đọc phần ①, **mở file ở phần ②**, dò tới đúng dòng, đọc chú thích quanh đó, rồi **tự nói lại phần ③ bằng lời mình** (nói to, hoặc cho em/bạn nghe).
- Ngày 7: tự chạy `npm run bench:gate` và `npm run dev` một lần cho quen tay.

## 🆘 Nếu giám khảo chỉ vào một đoạn LẠ (không nằm trong 6 mảnh)
Đừng hoảng. Làm theo 3 bước, nói ra miệng:
1. **Đọc tên hàm + chú thích** phía trên — gần như hàm nào cũng có chú thích tiếng Việt.
2. Nói **đầu vào là gì, đầu ra là gì** (hàm này nhận cái gì, trả cái gì).
3. Nối về bức tranh lớn: *"Đoạn này phục vụ bước [dịch / tính / kiểm / từ chối] trong luồng chung."*
> Không ai thuộc hết code. Biết **tra và giải thích tại chỗ** mới là hiểu thật — và hội đồng đánh giá cao điều đó hơn học thuộc.

## 💬 Câu chốt về việc dùng AI (nói thẳng, không giấu)
*"Em có dùng công cụ AI hỗ trợ viết code, và em nói rõ điều đó. Nhưng ý tưởng tách 'AI đọc — chương trình tính', cơ chế biết từ chối, cách kiểm chứng, và việc hiểu hệ chạy thế nào là của em. Mời thầy cô hỏi bất kỳ phần lõi nào."*
