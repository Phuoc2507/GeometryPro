# Phòng thủ phỏng vấn — Tài liệu luyện chất vấn ViSEF

*Kèm theo `bao-cao-nghien-cuu.md`. Mục tiêu: giúp thí sinh TỰ BẢO VỆ đề tài ở vòng chất vấn — chứng minh **tự làm và hiểu bản chất**, không né hạn chế, không bịa số.*

> **Bối cảnh phải nhớ:** hai mùa gần đây nhiều giải Nhất bị hậu kiểm/huỷ vì nghi "bàn tay người lớn" / "quá tầm học sinh". Giám khảo sẽ **chất vấn thực nghiệm sâu**: bắt em giải thích cơ chế, bắt em chạy thử, hỏi vặn con số. Vũ khí của em không phải là nói to, mà là **hiểu đến tận lõi** và **trung thực tuyệt đối** về cái đã đo và cái chưa đo.
>
> **Ba câu thần chú của cả đề tài — thuộc lòng:**
> 1. *"LLM chỉ DỊCH đề thành mô hình hình thức. ENGINE tất định TÍNH và TỰ KIỂM."*
> 2. *"Thà từ chối còn hơn bịa."*
> 3. *"Em chỉ báo con số đã đo được, tái lập được. Cái chưa đo, em nói thẳng là chưa đo."*

---

## PHẦN 1 — 28 câu giám khảo có thể hỏi (kèm câu trả lời mẫu)

Mỗi câu trả lời được viết **ngắn, đúng dự án, tự tin nhưng trung thực**. Em học ý, rồi diễn đạt bằng lời của mình — **đừng đọc thuộc như vẹt**, giám khảo phát hiện ngay.

### (a) Tính mới & định vị

**Q1. Đề tài của em mới ở chỗ nào? Nói một câu.**
> Em đưa tinh thần neuro‑symbolic của AlphaGeometry từ hình học **phẳng** sang hình học **không gian 3D** và **tính toán đại lượng** (khoảng cách, góc, thể tích), thay việc "huấn luyện mô hình trên hàng trăm triệu mẫu" bằng "một engine tất định tự viết + tối ưu prompt + cổng từ chối an toàn", và công bố **benchmark tiếng Việt đầu tiên** cho dạng toán này.

**Q2. Khác AlphaGeometry chỗ nào? Có phải em chép lại không?**
> Khác về **bài toán**, **kiến trúc** và **quy mô**. AlphaGeometry **chứng minh định lý** hình học **phẳng**, huấn luyện một mô hình ngôn ngữ chuyên biệt trên ~100 triệu mẫu tổng hợp để sinh "điểm phụ". Em làm hình học **không gian**, mục tiêu là **tính ra đại lượng kiểm chứng được + dựng hình 3D**, và em **không huấn luyện lại mô hình nào cả** — em dùng một LLM sẵn có chỉ để **dịch** đề sang JSON, còn phần lõi khoa học là **engine ký hiệu tự viết** (số học chính xác) và **cổng từ chối theo bất biến affine**. Điểm chung duy nhất là triết lý "thần kinh + ký hiệu"; mọi thứ còn lại là của em.

**Q3. "Chỉ là gọi API của một con AI có sẵn thôi mà?"**
> Không. Nếu chỉ gọi API thì nó **bịa đáp số** — đúng cái vấn đề em muốn giải. Vai trò của LLM trong hệ của em bị **cô lập** ở đúng một việc: đọc đề tiếng Việt và **toạ‑độ‑hoá** nó thành một *Construction Plan* JSON (khai điểm, ràng buộc, câu hỏi). **Nó tuyệt đối không được tính** khoảng cách/góc/thể tích. Toàn bộ tính toán và tự kiểm nằm ở **engine tất định do em viết**, khoảng 5.000 dòng, hơn một nghìn test đơn vị. Cái mới và cái khó nằm ở engine đó và ở cổng từ chối, không phải ở lời gọi API.

**Q4. Đã có SolidGeo, DynaSolidGeo… rồi, đóng góp của em còn gì?**
> Những cái đó là **benchmark để đo** VLM, và **không có tiếng Việt**. Em không chỉ đo — em **xây một hệ thống giải + tự kiểm + từ chối an toàn**, và bổ sung đúng khoảng trống họ chỉ ra: một **bộ dữ liệu chuẩn tiếng Việt** có đáp **kiểm chứng được** cùng quy trình đánh giá **tất định, tái lập**.

### (b) Chiều sâu kỹ thuật

**Q5. Giải thích "cổng từ chối" (abstain gate) hoạt động thế nào.**
> Trước khi dịch, prompt buộc LLM chạy **3 câu hỏi cổng dựa trên TÍNH CHẤT toán học, không dựa từ khoá**:
> (1) Đáp có phụ thuộc **thang tuyệt đối** mà đề không cho không? — góc và tỉ số bất biến theo cỡ nên luôn qua; chỉ độ dài/diện tích/thể tích mới cần thang.
> (2) Quan hệ cần kết luận có **bất biến affine** không, hoặc hình có **xác định tới đồng dạng** không?
> (3) **Engine có kiểm được** không — quy được về một truy vấn trả số/đối tượng, hoặc một khẳng định kiểm tại toạ độ cụ thể?
> Dính bất kỳ "ô cấm" nào (ví dụ hỏi đại lượng tuyệt đối nhưng đề chỉ cho tỉ số, hình còn tỉ lệ tự do; hoặc bài quỹ tích/biện luận/bất đẳng thức) ⇒ trả `{abstain:true}`. Đây chính là cơ chế "thà từ chối còn hơn bịa".

**Q6. "Bất biến affine" nghĩa là gì? Cho ví dụ tại sao nó cho phép chọn toạ độ tuỳ ý.**
> Một quan hệ **bất biến affine** là quan hệ **giữ nguyên** qua mọi phép biến đổi affine (co giãn, kéo xiên): song song, thẳng hàng, đồng phẳng, tỉ số chia đoạn, giao điểm. Với những quan hệ này, **đúng tại một hệ toạ độ mình tự chọn ⇒ đúng tổng quát**, nên em được phép đặt toạ độ số nguyên cho tiện và việc kiểm tại một toạ độ **là một chứng minh hợp lệ**. Ngược lại, **vuông góc, bằng nhau, "là tam giác đều"** thì **không** bất biến affine — kéo xiên là hỏng — nên chỉ được mô hình khi hình đã **cố định tới đồng dạng** (đề cho đủ số liệu khoá mọi tỉ lệ). Cổng câu 2 chính là để phân biệt hai loại này.

**Q7. "Số học chính xác hữu tỉ + căn" là gì? Vì sao không dùng số thập phân?**
> Kiểu số lõi của engine là `Exact = {num, den, radicand}`, biểu diễn **một hữu tỉ nhân một căn không chính phương**: giá trị `= (num/den)·√radicand`. Nhờ vậy đáp ra **dạng căn đúng** như `2√3/3`, `2√2/3`, `64/3` — chứ không phải `1.1547…` làm tròn. Số thập phân **mất thông tin** và tích luỹ sai số; dạng exact thì **kiểm chứng được** và đúng như đáp án sách. Ràng buộc quan trọng: phép **cộng/trừ chỉ đóng khi cùng `radicand`**, nên để mọi phép toán nằm trong trường số biểu diễn được, engine **giữ mọi công thức ở dạng bình phương** — ví dụ khoảng cách điểm–mặt dùng `|n·x+d|²/|n|²` rồi mới khai căn ở bước cuối.

**Q8. Engine "tự kiểm" bằng cách nào? Làm sao em chắc đáp căn không sai?**
> Với mỗi đáp, engine phát một **"chứng chỉ tự kiểm"**: nó tính **giá trị của dạng chính xác** và so với một **số thực tính độc lập** bằng con đường khác. Nếu lệch quá dung sai (cỡ `1e-6·|giá trị|`) thì engine **vứt bỏ dạng exact, hạ về số gần đúng** và gắn cờ `approximate` — tức thà báo "gần đúng" còn hơn khẳng định sai một dạng căn. Ngoài ra `verify.ts` **kiểm lại mọi ràng buộc đề** (⊥, ∥, đồng phẳng, khoảng cách, góc): nếu hình vi phạm điều kiện ⇒ trả **violation**, **không** đưa đáp số. Mã ở `compute/answer.ts` (`certifyDistance/certifyScalar/certifyAngle`).

**Q9. Giải thích cơ chế "thang chữ" (`scaleSymbol`). Vì sao đáp `a·√3/3` là đúng tổng quát?**
> Khi đề đo tuyệt đối trên một hình đã **rắn tới đồng dạng** nhưng cỡ cho bằng **một chữ** (ví dụ lập phương cạnh `a`), khối dịch đặt `a = 1` cho tiện, và thêm trường `scaleSymbol:"a"`. Engine tính ở thang `a=1`, rồi **tự ghép lại** hệ số `×aᵏ` theo bậc đại lượng: `k=1` cho độ dài/khoảng cách, `k=2` cho diện tích, `k=3` cho thể tích. Đáp đúng tổng quát vì với hình đồng dạng, đại lượng bậc `k` **chính xác** tỉ lệ theo `aᵏ` — đây là tính chất đồng dạng, không phải mẹo. Điều kiện: **chỉ một chữ** khoá **toàn bộ** kích thước; còn một cỡ tự do thứ hai thì rơi vào ô cấm và hệ từ chối.

**Q10. Hệ thống "phân tầng" (tier) là gì? Để làm gì?**
> Mỗi kết quả được gán một **nhãn mức tin cậy**, neo vào việc *engine có thực sự giải được* và *đáp ở dạng chính xác hay chỉ là số*. Ba mức: **Mức 1 — đã kiểm chứng** (engine giải được, 0 vi phạm; kèm trục con `exact` vs `numeric`); **Mức 2 — đúng tổng quát ở thang chữ** (dùng `scaleSymbol`); **Mức 3 — chưa kiểm chứng** (`violation`/`error`/`unsolved`/`abstain`), lúc này hệ **không** đưa đáp tất định mà gắn nhãn rõ để người dùng biết. Nhãn tier là **nguồn sự thật duy nhất** về độ tin cậy và là biến phân tầng khi đánh giá. Mã: `classifyTier.js`.

**Q11. Giải thích tối ưu prompt bằng thuật toán tiến hoá. Genome của em là gì?**
> Prompt của bộ dịch quyết định chất lượng cả hệ, nên thay vì chỉnh tay theo cảm tính, em **tối ưu tự động** bằng một thuật toán di truyền (GA). Điểm mấu chốt về **an toàn**: GA **không đụng vào phần lõi prompt**, đặc biệt là cổng từ chối. Mỗi cá thể (genome) chỉ gồm hai thứ: một vector **bits** bật/tắt vài **câu chỉ dẫn bổ sung** (gene, ví dụ "chỉ in JSON", "ưu tiên toạ độ nguyên"), và một hoán vị **order** quyết định thứ tự nối chúng. Prompt cuối = prompt gốc + các gene bật. Hàm thích nghi `fitness = accuracy − λ·(token/1000)` — thưởng dịch đúng, phạt prompt dài. Cách này **rẻ, tái lập, và dễ giải thích**: "thuật toán tự khám phá xem thêm gợi ý nào giúp dịch chính xác hơn".

**Q12. Vì sao GA của em an toàn — nó có thể phá cổng từ chối không?**
> Không thể, và đó là chủ ý thiết kế. Nếu để GA đột biến tự do trên **toàn văn** prompt, nó dễ phá cổng từ chối → hệ quay lại bịa đáp. Nên em **khoá cứng** phần lõi; không gian tìm kiếm của GA **chỉ** là tập câu chỉ dẫn phụ. Về mặt kỹ thuật, cái tệ nhất GA làm được là chọn một tổ hợp gợi ý phụ dở — accuracy tụt và bị elimination — chứ **không bao giờ** chạm được vào cổng an toàn.

### (c) Tính khả thi & "em tự làm chứ?"

**Q13. Phần nào em tự viết, phần nào dùng của người khác? Nói thật.**
> Em phân định rõ. **Tự phát triển:** toàn bộ **engine ký hiệu** (số học chính xác, dựng hình, compute khoảng cách/góc/thể tích/giao, engine giải tích, cơ chế tự kiểm), **cổng từ chối 3 câu hỏi**, cơ chế **thang chữ**, **phân tầng tier**, hạ tầng **benchmark + đánh giá + tối ưu prompt**, và ứng dụng 3D. **Dùng thư viện bên thứ ba (có ghi công):** một LLM hosted làm **bộ dịch** (qua `api/_lib/vilao.js`), `three.js`/React Three Fiber để **vẽ**, React/Vite/Supabase làm khung ứng dụng. Ranh giới này em ghi minh bạch ở §6 báo cáo.

**Q14. Em mở một file bất kỳ trong engine và giải thích được không?** *(Giám khảo có thể chỉ vào màn hình.)*
> *(Đây là câu SỐNG CÒN — hãy thực sự đọc được mã của mình. Cách trả lời: đọc tên hàm, nói nó nhận gì, trả gì, và vì sao viết vậy.)* Ví dụ: `certifyDistance(s, floatRef)` nhận một `Scalar` có dạng exact và một số thực tham chiếu tính độc lập; nếu `|exactToApprox(exact) − floatRef|` vượt dung sai `1e-6` thì bỏ exact, trả về số gần đúng gắn cờ `approximate`; ngược lại trả dạng căn. Em viết vậy để **không bao giờ khẳng định một dạng căn sai**.

**Q15. Nếu em tự làm, tại sao dùng LLM đóng thay vì tự huấn luyện?**
> Vì tự huấn luyện một mô hình ngôn ngữ cỡ đó cần dữ liệu và GPU **vượt tầm ngân sách học sinh** (mục tiêu của em ≤ 10 triệu). Quan trọng hơn: **em không cần** huấn luyện, vì em **cô lập** LLM ở khâu dịch và đặt **cổng từ chối + engine tự kiểm** làm lưới an toàn. Đây là một **lựa chọn thiết kế có ý thức**, không phải né tránh: nó cho hệ chạy được **ở quy mô trường học, chi phí thấp**. Hướng thử mô hình mã nguồn mở chạy offline em có nêu ở §8 là mở rộng tương lai.

**Q16. Một mình em làm hết được à? Mất bao lâu?**
> *(Trả lời trung thực theo đúng thực tế của em — phân công, thời gian, ai hỗ trợ phần nào.)* Khung trung thực: khối lõi Neuro‑Symbolic (engine + cổng từ chối) là trọng tâm em làm; khối trực quan hoá 3D phát triển song song, hai bên giao tiếp qua **JSON Schema chung** nên làm độc lập rồi ghép. Chỗ nào có người hướng dẫn/hỗ trợ code, em **nói thẳng** phần đó và nói rõ **em hiểu nó làm gì** — đó mới là điều giám khảo cần thấy.

### (d) Liêm chính & dữ liệu

**Q17. Đề bài trong benchmark lấy ở đâu? Có vi phạm bản quyền không?**
> Đề trích từ **SGK và đề thi THPT**, mỗi ca **ghi rõ nguồn** trong trường `source`. Em không phát tán trái phép; bộ dữ liệu công bố kèm mô tả (datasheet) để tái sử dụng đúng mục đích học thuật.

**Q18. Ai xác minh đáp án đúng? Làm sao chắc golden không sai?**
> Đáp **do người xác minh** trước — người là **trọng tài cuối**. Công cụ gán nhãn (`scripts/label/`) chỉ **đối chiếu** đáp máy với đáp người **bằng số**. Quy tắc cứng: ca nào engine giải **lệch** đáp người thì **không** được nạp làm golden, mà chuyển thành ca "known‑gap" để vá engine. Ngoài ra mọi ca golden phải **PASS** `npm run bench:gate` (engine‑replay tất định) mới được chốt.

**Q19. Làm sao chứng minh số liệu trong báo cáo là thật, không bịa?**
> Nguyên tắc biên tập của em: **chỉ ghi số đã đo được và tái lập được**; ô chưa đo ghi rõ `⟦CHỜ ĐO⟧`. Con số đầu bảng — **engine‑replay 210/210** — em **chạy lại ngay tại chỗ** cho hội đồng xem: `npm run bench:gate`, offline, không gọi AI, cho kết quả **giống hệt** mỗi lần. Cái gì chưa chạy (số end‑to‑end, baseline) em **nói thẳng là chưa chạy vì cần khoá API**, không tô vẽ.

### (e) Kết quả & đánh giá

**Q20. Con số "210/210" nghĩa là gì? Có phải độ chính xác 100% không?**
> **Không, và em cẩn thận không nói vậy.** 210/210 là kết quả **engine‑replay**: em đưa **210 plan đã đúng** qua engine (tất định, không gọi AI) và cả 210 ca **pass** — 0 sai đáp, 0 sai trạng thái, 0 lỗi. Nó **chứng minh engine tính đúng** trên rổ mốc và **thực sự trả đáp dạng căn**. Nhưng nó **chưa** đo khâu **LLM dịch đề → plan** (đầu‑cuối), và cỡ mẫu 210 còn nhỏ — nên "100%" chỉ có nghĩa "chưa phát hiện hồi quy trên rổ hiện tại", **không** phải "hệ thống chính xác 100%". Muốn đo đầu‑cuối phải chạy `--full` (gọi LLM, cần API key).

**Q21. Baseline so với LLM giải thẳng đâu? Em hơn nó bao nhiêu?**
> Harness so baseline em **đã dựng xong** (`scripts/eval/baseline.mjs`): chạy `system` (hệ của em) và `llm-direct` (LLM giải thẳng) trên **cùng** tập test, đo accuracy, **confidently‑wrong**, **precision khi trả lời**, latency. Hiện em **đã kiểm thử đường ống ở chế độ mock**; **số thật đang chờ chạy** vì cần khoá API (`VILAO_API_KEY`). Em không đưa số mock vào báo cáo vì nó **không phải kết quả khoa học**. Giả thuyết em kỳ vọng: hệ của em có **confidently‑wrong rất thấp** và **precision cao** nhờ engine tự kiểm + cổng từ chối, đổi lại **từ chối nhiều hơn** trên bài ngoài năng lực.

**Q22. "Confidently‑wrong" là gì và vì sao nó là chỉ số quan trọng nhất?**
> Là tỉ lệ hệ **đưa đáp số SAI một cách tự tin**. Đây là kiểu lỗi **nguy hiểm nhất** trong AI giáo dục: học sinh tin một đáp sai. Cả kiến trúc của em thiết kế để **kéo chỉ số này xuống gần 0**: engine tự kiểm loại đáp sai, cổng từ chối chặn bài ngoài năng lực. Em chấp nhận đánh đổi **từ chối nhiều hơn** để **gần như không bao giờ nói sai một cách tự tin** — đúng tinh thần "AI đáng tin cậy".

**Q23. Em chống "tối ưu prompt ngay trên tập test" (overfit) thế nào?**
> Em **tách train/test tất định, phân tầng theo dạng bài** (`scripts/eval/split.mjs`, seed 42, tỉ lệ 70/30). **Tối ưu prompt chỉ chạy trên TRAIN**; **accuracy báo cáo đo trên TEST** mà prompt **chưa từng thấy**. Split cố định theo seed nên tái lập được và không "chọn tập test dễ".

**Q24. GA của em cho best accuracy 75%→100% — đó là kết quả thật chứ?**
> **Không, đó là self‑test ở chế độ mock**, em nói rõ điều này. Con số 75%→100% chỉ chứng minh **cỗ máy tiến hoá chạy đúng** — GA tự khám phá đúng bộ gene mà bài toán *giả lập* cần, và **tái lập y hệt** theo seed. **Không phải** kết quả khoa học. Số dùng cho báo cáo phải đến từ chế độ `vilao` (LLM thật) — đang chờ chạy vì cần API key.

### (f) Hạn chế & hướng phát triển

**Q25. Hạn chế lớn nhất của đề tài là gì? (Đừng né.)**
> Ba cái, em nói thẳng. (1) **Số end‑to‑end và baseline chưa chạy** — phương pháp và harness đã dựng, kiểm thử mock xong, nhưng số thật cần khoá API; em đang ở bước đó. (2) **Benchmark còn nhỏ (26 ca)** và phân bố dạng bài chưa cân bằng (nặng thể tích/khoảng cách, thiếu góc/thiết diện/tương giao); công cụ mở rộng đã có, cần thời gian gom và xác minh đề. (3) **Phạm vi engine có giới hạn**: quỹ tích tổng quát, bất đẳng thức, biện luận tham số thì engine **từ chối an toàn** thay vì giải — em xem đây là hành vi đúng, nhưng nó là ranh giới năng lực rõ ràng.

**Q26. Engine gặp bài không giải được thì sao? Nó bịa không?**
> **Không bao giờ bịa.** Có ba tầng chặn: cổng từ chối chặn ngay ở khâu dịch (`abstain`); nếu mô hình vi phạm điều kiện đề, `verify.ts` trả **violation**; nếu engine không hội tụ, kết quả bị hạ về `unsolved`/`approximate`. Ví dụ thật trong ghi chú bench: một ca tứ diện đều engine trả `ok:false` — đó là **từ chối an toàn**, không phải đáp sai. Em **báo cáo minh bạch** những ranh giới này, không giấu.

**Q27. Bước tiếp theo cụ thể là gì?**
> Theo đúng thứ tự: (1) mở rộng benchmark tiếng Việt lên ~150–300 ca, đủ dạng; (2) chạy đánh giá đầu‑cuối + baseline thật (accuracy, confidently‑wrong, latency) khi có khoá API; (3) chạy tối ưu prompt tiến hoá trên LLM thật để có đường cong fitness và so prompt‑tối‑ưu vs prompt‑tay; (4) human evaluation với giáo viên Toán về giá trị sư phạm; (5) thử mô hình mã nguồn mở chạy offline để giảm phụ thuộc LLM đóng.

### (g) Ứng dụng & tác động giáo dục

**Q28. Đề tài này giúp ích gì thực sự cho học sinh?**
> Hình học không gian là mạch khó nhất ở THPT vì học sinh phải **dựng hình trong đầu** và **không có công cụ kiểm lời giải** tức thời. Hệ của em cho cả hai: một **hình 3D xoay‑zoom được** để hiểu bằng mắt, và một **đáp số kiểm chứng được** (dạng căn đúng như sách) — chứ không phải một đáp "nghe hợp lý" của AI. Quan trọng nhất với giáo dục: nó **thà từ chối còn hơn dạy sai**, nên an toàn khi đưa cho học sinh dùng. Đó là điểm khác biệt cốt lõi so với việc để các em hỏi thẳng một chatbot.

---

## PHẦN 2 — Checklist "thí sinh PHẢI giải thích được"

Nếu chưa nắm mục nào, **học ngay hôm nay**. Mỗi mục em phải nói được **bằng lời của mình** trong 30 giây và **chỉ được vào mã** nếu bị hỏi.

- [ ] **1. Câu thần chú kiến trúc:** "LLM chỉ DỊCH, ENGINE tất định TÍNH và TỰ KIỂM." Vẽ được sơ đồ 3 khối Neural → Symbolic → Application.
- [ ] **2. Vì sao tách vai trò:** cô lập LLM khỏi khâu dễ sai nhất (tính toán) để chống ảo giác.
- [ ] **3. Construction Plan JSON là gì:** "hợp đồng dữ liệu" giữa LLM và engine — chỉ có `ops` (dựng), `asserts` (ràng buộc để engine tự kiểm), `queries` (câu hỏi). LLM **không điền đáp số**.
- [ ] **4. Cổng từ chối 3 câu hỏi:** thang tuyệt đối / bất biến affine / engine kiểm được — và **theo tính chất, không theo từ khoá**.
- [ ] **5. Bất biến affine:** định nghĩa + vì sao nó cho phép "kiểm 1 toạ độ = chứng minh"; đối lập với vuông góc/bằng nhau (không affine).
- [ ] **6. Số học chính xác:** `Exact = (num/den)·√radicand`; cộng/trừ chỉ đóng khi cùng radicand; giữ công thức dạng bình phương; đáp ra `2√3/3` chứ không phải `1.1547`.
- [ ] **7. Cơ chế tự kiểm:** so exact với float độc lập, lệch quá `1e-6` thì hạ về approximate; `verify.ts` kiểm ràng buộc → violation.
- [ ] **8. Thang chữ (`scaleSymbol`):** đặt `a=1`, engine ghép `×aᵏ` (k=1/2/3); vì sao đúng tổng quát; điều kiện "một chữ khoá toàn bộ kích thước".
- [ ] **9. Phân tầng tier:** 3 mức và `engineSolved`/`exact` vs `numeric`; tier là "nguồn sự thật duy nhất" về độ tin cậy.
- [ ] **10. Tối ưu prompt GA:** genome = bits + order; **không chạm phần lõi/cổng từ chối**; `fitness = accuracy − λ·token`.
- [ ] **11. Chống overfit:** tách train/test seed 42, tối ưu trên train, báo cáo trên test.
- [ ] **12. Benchmark & engine‑replay:** 210 ca golden, replay 210/210 tất định offline; so đáp bằng số (dung sai `1e-3`).
- [ ] **13. Confidently‑wrong & precision:** định nghĩa và vì sao chúng là chỉ số **an toàn** cốt lõi.
- [ ] **14. Ranh giới trung thực:** cái đã đo (engine‑replay) vs cái chưa đo (end‑to‑end, baseline — chờ API key); nói được vì sao chưa đo.
- [ ] **15. Phân định tự làm:** liệt kê rành mạch phần tự viết vs thư viện bên thứ ba (LLM hosted, three.js, Supabase).

---

## PHẦN 3 — Ba câu bẫy thường gặp & cách xử lý

**Bẫy 1 — "Cái này AI làm hay người lớn làm chứ không phải em, đúng không?"**
- *Sai lầm chết người:* phòng thủ, lúng túng, hoặc nói "em làm hết" một cách chung chung.
- *Cách xử lý:* **Không tự ái, chuyển sang chứng minh bằng hiểu biết.** "Em xin chứng minh bằng cách giải thích cơ chế ạ. Thầy/cô chỉ vào bất kỳ phần nào của engine, em giải thích nó làm gì và vì sao em viết vậy." Rồi **mở đúng một file** (ví dụ `compute/answer.ts`) và nói mạch lạc: hàm này nhận gì, trả gì, giải quyết vấn đề gì. Kết: "Phần LLM em dùng thư viện, em ghi công rõ; phần lõi này em tự viết và em hiểu từng dòng." **Hiểu sâu là bằng chứng mạnh nhất cho việc tự làm.**

**Bẫy 2 — "Khác gì AlphaGeometry? Không phải chỉ là bản sao à?"**
- *Sai lầm:* trả lời mơ hồ "dạ khác nhiều ạ".
- *Cách xử lý:* Trả lời bằng **ba khác biệt cụ thể, dứt khoát** (xem Q2): **(1) bài toán** — họ chứng minh định lý phẳng, em tính đại lượng không gian + dựng hình; **(2) phương pháp** — họ huấn luyện mô hình trên ~100 triệu mẫu, em **không huấn luyện gì**, chỉ dùng LLM để dịch + engine tự viết + cổng từ chối; **(3) đóng góp mới** — benchmark tiếng Việt đầu tiên. "Điểm chung duy nhất là triết lý neuro‑symbolic; đó là *nguồn cảm hứng*, không phải bản sao."

**Bẫy 3 — "Số 210/210 nghĩa là hệ thống của em đúng 100% à?"**
- *Bẫy:* nếu em gật đầu, em **tự bẫy mình** — giám khảo sẽ vặn "vậy sao báo cáo nói cỡ mẫu nhỏ?".
- *Cách xử lý:* **Chủ động thu hẹp ý nghĩa con số** trước khi bị vặn (xem Q20). "Dạ không ạ. 210/210 là **engine‑replay** — chứng minh **engine tính đúng** trên rổ mốc và trả đáp **dạng căn chính xác**. Nó **chưa** đo khâu LLM dịch đề, và cỡ mẫu 210 còn nhỏ, nên nó chỉ nói 'chưa phát hiện hồi quy', không phải 'chính xác 100%'. Số đầu‑cuối em đang chờ chạy vì cần khoá API." → **Sự trung thực chủ động này ghi điểm liêm chính rất mạnh** trong bối cảnh hậu kiểm.

> **Nguyên tắc vàng khi gặp bẫy:** giám khảo bẫy để xem em có **trung thực** và **hiểu giới hạn** của chính mình không. Thắng bằng cách **tự nêu hạn chế trước khi bị chỉ ra** — đó là dấu hiệu của người thật sự làm nghiên cứu.

---

## PHẦN 4 — Mẹo trình bày 3–5 phút mở đầu

**Cấu trúc "phễu" — đi từ vấn đề tới điểm khác biệt, đừng liệt kê tính năng:**

1. **(30s) Móc câu bằng vấn đề thật.** "Hình học không gian là mạch khó nhất ở THPT. Khi hỏi thẳng một AI, nó hay **bịa toạ độ, tính sai, đưa đáp nghe hợp lý mà không kiểm được**. Đó là vấn đề em giải." — Nêu **nỗi đau**, đừng mở bằng "em xin trình bày đề tài...".
2. **(45s) Ý tưởng cốt lõi, một câu.** Nói câu thần chú: *"LLM chỉ DỊCH đề thành mô hình hình thức; một ENGINE tất định TÍNH và TỰ KIỂM."* Vẽ nhanh sơ đồ 3 khối. Đây là **linh hồn** của đề tài — nói chậm, rõ.
3. **(60s) Demo sống nếu có thể.** Nhập một đề → chỉ vào **đáp dạng căn `2√3/3`** (không phải số thập phân) và **hình 3D xoay được**. Nếu không demo được, chạy `npm run bench:gate` cho ra **210/210** ngay tại chỗ — bằng chứng tất định, tái lập.
4. **(45s) Ba điểm khác biệt.** Cổng từ chối an toàn (thà từ chối còn hơn bịa) · engine trả đáp căn đúng tự viết · benchmark tiếng Việt đầu tiên. Gắn mỗi cái với **một câu vì sao nó quan trọng**.
5. **(30s) Trung thực về trạng thái.** "Engine và toàn bộ phương pháp đánh giá đã dựng xong; số đầu‑cuối và baseline em **đang chạy** — cần khoá API." → Chủ động minh bạch **ngay từ đầu** làm giám khảo tin em suốt phần sau.

**Mẹo phong thái:**
- **Chậm và rõ hơn nhanh và nhiều.** Giám khảo cần *hiểu*, không cần *nghe hết*.
- **Luôn quy về câu thần chú** khi bị dồn: mọi câu hỏi khó đều có thể neo lại vào "LLM dịch — engine tính — tự kiểm".
- **Chuẩn bị sẵn để MỞ MÃ.** Mở laptop, biết đường tới `compute/answer.ts`, `translatorPrompt.js`, `classifyTier.js` — chỉ được vào và giải thích là đòn hạ gục nghi ngờ "không tự làm".
- **Khi không biết, nói "em chưa đo/chưa làm phần đó".** Không bao giờ bịa. Một câu "cái đó em chưa chạy vì cần API key" **mạnh hơn** một câu chế số — nhất là mùa hậu kiểm này.
- **Số duy nhất được khẳng định chắc:** engine‑replay **210/210**, ~1085 test đơn vị xanh. Mọi số khác đều kèm "đang đo".
