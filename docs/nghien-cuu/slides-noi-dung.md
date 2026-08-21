# Nội dung slide thuyết trình ViSEF

> **Đề tài:** Hệ thống Neuro‑Symbolic giải toán hình học không gian — *"LLM chỉ DỊCH đề; một ENGINE tất định TÍNH và TỰ KIỂM."*
>
> **Dùng để dựng deck HTML.** File này CHỈ chứa nội dung + ghi chú người nói. 14 slide. Mỗi mục: tiêu đề hành động · 3–5 gạch đầu dòng · ghi chú người nói (~20–30s).
>
> **Kỷ luật số liệu (bắt buộc giữ khi dựng deck):** số THẬT được khẳng định — engine‑replay **210/210**, ~**1086** test đơn vị, benchmark **210 ca** (185 synthetic + 25 capture, **chưa có đề thi/SGK thật**), đáp căn/π thật (`2√3/3`, `8√2π/3`, `52π`…). Mọi số baseline/end‑to‑end ghi **"đang đo"**. Không đưa số mock vào deck như thể là kết quả.

---

## [Slide 1] LLM dịch — engine tính & tự kiểm: một AI biết từ chối thay vì bịa

- Tên đề tài: Hệ thống Neuro‑Symbolic giải và trực quan hoá toán hình học không gian THPT (tiếng Việt).
- Nguyên tắc lõi, đọc chậm: **"LLM chỉ DỊCH đề thành mô hình hình thức; một ENGINE tất định TÍNH và TỰ KIỂM."**
- Ba trụ đóng góp: cổng từ chối an toàn · engine trả đáp dạng căn/π đúng · benchmark tiếng Việt đầu tiên.
- Nhóm thực hiện · GVHD · lĩnh vực dự thi: Phần mềm hệ thống / Hệ thống thông minh.

*Ghi chú người nói (~25s): Kính thưa hội đồng, đề tài của chúng em giải một bài toán mà AI hiện nay làm rất tệ: hình học không gian. Ý tưởng cốt lõi gói trong một câu — LLM chỉ dịch đề, còn một engine tất định do chúng em tự viết mới là thứ tính toán và tự kiểm chứng. Trong 3 phút tới em sẽ chứng minh vì sao cách tách vai này khiến hệ thống vừa chính xác, vừa biết từ chối thay vì bịa.*

---

## [Slide 2] Hỏi thẳng một AI bài hình không gian: nó bịa toạ độ, tính sai, và không biết dừng

- Hình học không gian là mạch trừu tượng và khó nhất ở THPT: học sinh phải dựng hình trong đầu, phối hợp vuông góc – song song – khoảng cách – góc – thể tích.
- LLM giải trực tiếp thường **ảo giác**: bịa toạ độ, tính sai số học dài, đưa đáp "nghe hợp lý" mà không kiểm được.
- Nguy hiểm nhất: AI **không biết từ chối** — khi đề thiếu dữ kiện, nó vẫn cho ra một con số tự tin.
- Với giáo dục, lỗi "sai một cách tự tin" (confidently wrong) là lỗi tệ nhất: học sinh tin vào đáp sai.

*Ghi chú người nói (~30s): Vấn đề bắt đầu từ một quan sát đơn giản. Khi chúng em hỏi thẳng một AI một bài hình không gian, nó thường bịa toạ độ, tính sai ở những bước số học dài, và tệ nhất là nó không bao giờ nói "em không đủ dữ kiện". Nó luôn cho một đáp nghe hợp lý. Trong lớp học, đó chính là kiểu lỗi nguy hiểm nhất — sai nhưng rất tự tin, khiến học sinh tin theo.*

---

## [Slide 3] Ý tưởng cốt lõi: cô lập LLM khỏi khâu dễ sai nhất là tính toán

- Tách bạch vai trò: **LLM lo ngôn ngữ** (đọc đề, toạ‑độ‑hoá), **engine lo con số** (tính, kiểm chứng).
- Tận dụng điểm mạnh ngôn ngữ của LLM, đồng thời **cô lập** nó khỏi khâu nó hay sai nhất.
- Đưa **tính kiểm chứng được** vào lõi hệ thống: mọi đáp số đều phải qua engine tất định.
- Hệ quả: hệ thống có thể **từ chối có kiểm soát** thay vì bịa — nền tảng cho một AI đáng tin.

*Ghi chú người nói (~25s): Giải pháp của chúng em không phải làm cho AI thông minh hơn, mà là giao đúng việc cho đúng bên. LLM rất giỏi ngôn ngữ nên chỉ để nó đọc đề và dịch. Còn tính toán — khâu nó dễ sai nhất — thì giao hết cho một engine tất định, chính xác. Nhờ cô lập được như vậy, chúng em mới đưa được tính kiểm chứng vào lõi, và mới cho hệ thống quyền từ chối.*

---

## [Slide 4] Kiến trúc ba khối: Neural dịch → Symbolic tính & kiểm → Application dựng 3D

- **Khối Neural (LLM dịch):** đọc đề văn bản/ảnh, tự chọn hệ toạ độ Oxyz, xuất *Construction Plan* JSON (điểm, ràng buộc, câu hỏi). Có **cổng từ chối**. Không tự tính.
- **Khối Symbolic (engine tất định, tự viết):** số học chính xác, dựng hình, tính khoảng cách/góc/thể tích, tự kiểm; vi phạm điều kiện ⇒ trả *violation* chứ không bịa.
- **Khối Application (trực quan hoá 3D):** React Three Fiber dựng điểm/đường/mặt/khối, xoay–zoom tương tác.
- Hai khối giao tiếp qua **một JSON Schema chung** — "hợp đồng dữ liệu" giữa LLM và engine.

*Ghi chú người nói (~30s): Hệ thống gồm ba khối nối tiếp. Khối Neural là LLM, đọc đề rồi dịch thành một kế hoạch dựng hình dạng JSON — chỉ khai điểm, ràng buộc và câu hỏi, tuyệt đối không điền đáp số. Khối Symbolic là engine tất định do chúng em tự viết, nhận JSON đó, tính ra đáp và tự kiểm. Khối cuối dựng hình 3D xoay được. Ranh giới giữa LLM và engine là một JSON schema chung, nên hai bên phát triển độc lập rồi ghép.*

---

## [Slide 5] Điểm mới 1 — Cổng từ chối theo bất biến affine: "thà từ chối còn hơn bịa"

- Trước khi dịch, LLM chạy **3 câu hỏi cổng dựa trên tính chất toán học, không dựa từ khoá**:
  1. Đáp có cần **thang tuyệt đối** mà đề không cho? (góc và tỉ số bất biến theo cỡ ⇒ luôn qua).
  2. Quan hệ cần kết luận có **bất biến affine** không, hay hình có **xác định tới đồng dạng** không?
  3. Engine có **kiểm được** không (quy về một truy vấn trả số/đối tượng)?
- Dính "ô cấm" (hỏi đại lượng tuyệt đối nhưng chỉ cho tỉ số; bài quỹ tích/biện luận/bất đẳng thức) ⇒ trả `{abstain:true}`.
- Đây là cơ chế trực tiếp kéo **"confidently‑wrong"** — chỉ số an toàn cốt lõi — xuống thấp.

*Ghi chú người nói (~30s): Đóng góp thứ nhất là cổng từ chối. Trước khi giải, mô hình phải trả lời ba câu hỏi mang tính toán học chứ không phải bắt từ khoá: đáp có cần một thang đo tuyệt đối không, quan hệ có bất biến affine không, và engine có kiểm được không. Nếu bài rơi vào ô cấm — ví dụ hỏi thể tích tuyệt đối nhưng đề chỉ cho tỉ số cạnh — hệ thống từ chối. Chúng em cố tình chọn "thà từ chối còn hơn bịa", vì trong giáo dục một lời từ chối an toàn hơn một đáp sai tự tin.*

---

## [Slide 6] Điểm mới 2 — Engine số học chính xác trả đáp dạng căn/π đúng, không phải số thập phân

- Kiểu số lõi tự viết: `Exact = (num/den)·√radicand` — một hữu tỉ nhân một căn không chính phương; **không phụ thuộc CAS/SymPy bên ngoài**.
- Đáp ra **đúng như sách**: khoảng cách `2√3/3`, `√6/3`, `12/5`; thể tích `12π`, `8√2π/3`, `52π`, `9√2/4`; tỉ số `1/24`, `1/6`.
- Mẹo kỹ thuật giữ độ chính xác: cộng/trừ chỉ đóng khi cùng `radicand`, nên engine **giữ mọi công thức ở dạng bình phương** (khoảng cách điểm–mặt = `|n·x+d|²/|n|²`) rồi mới khai căn.
- **Tự kiểm:** so dạng exact với một số thực tính độc lập; lệch quá `1e-6` ⇒ bỏ exact, hạ về gần đúng — thà báo gần đúng còn hơn khẳng định sai một dạng căn.

*Ghi chú người nói (~30s): Đóng góp thứ hai là engine trả đáp dạng căn và π đúng, chứ không phải số thập phân làm tròn. Ví dụ nó cho ra hai căn ba phần ba, hay tám căn hai pi phần ba — đúng như đáp án sách giáo khoa. Điểm khoa học ở đây là engine dùng một kiểu số chính xác tự viết, không mượn thư viện đại số nào, và với mỗi đáp nó phát một chứng chỉ tự kiểm: nếu dạng căn lệch so với một số thực tính độc lập thì nó tự hạ xuống gần đúng thay vì khẳng định sai.*

---

## [Slide 7] Điểm mới 3 — Benchmark tiếng Việt tất định + tối ưu prompt tiến hoá không phá cổng an toàn

- **Benchmark tái lập được:** mỗi ca là JSON `{id, source, plan, expect}`, chạy engine‑replay **offline, không gọi AI**; so đáp bằng số (parse được `a√b/c`, hiểu cả π).
- Chống overfit: **tách train/test tất định** (seed 42, 70/30) — tối ưu prompt chỉ trên TRAIN, báo cáo accuracy trên TEST.
- **Tối ưu prompt bằng thuật toán tiến hoá (GA):** genome = bật/tắt + sắp thứ tự các câu chỉ dẫn phụ; `fitness = accuracy − λ·token`.
- An toàn theo thiết kế: GA **không đụng phần lõi prompt**, đặc biệt là cổng từ chối — tệ nhất nó chỉ chọn tổ hợp gợi ý dở, không bao giờ chạm được cổng an toàn.

*Ghi chú người nói (~30s): Đóng góp thứ ba gồm hai phần. Thứ nhất là một benchmark tiếng Việt chạy tất định, offline, nên ai cũng tái lập được cùng một kết quả. Thứ hai là một cỗ máy tối ưu prompt bằng thuật toán tiến hoá cho khối dịch. Điểm quan trọng về an toàn: thuật toán chỉ được bật/tắt vài câu gợi ý phụ, tuyệt đối không được sửa phần lõi hay cổng từ chối — nên nó không bao giờ có thể vô tình khiến hệ thống quay lại bịa đáp.*

---

## [Slide 8] Kết quả đo thật: engine‑replay 210/210, ~1086 test xanh, đáp căn/π chính xác

- **Engine‑replay 210/210 (100%)** trên toàn bộ 210 ca golden: 0 sai đáp, 0 sai trạng thái, 0 lỗi — tất định, chạy lại giống hệt mỗi lần.
- Toàn repo **~1086 test đơn vị xanh**; riêng kernel ~5.000 dòng do nhóm tự viết.
- Phủ dạng truy vấn: đa diện, khoảng cách điểm–mặt, mặt cầu, nón/trụ, nón cụt/chóp cụt, tỉ số thể tích, giao điểm.
- Demo đáp căn thật: khoảng cách `2√3/3`, thể tích `8√2π/3` và `52π` — không phải số thập phân.

*Ghi chú người nói (~30s): Đây là con số thật, đo được, tái lập được. Chúng em chạy engine ở chế độ replay trên toàn bộ 210 ca mốc: cả 210 đều pass, không một ca sai. Toàn dự án có khoảng 1086 test đơn vị đều xanh. Và quan trọng, các đáp ra đúng dạng căn và π như em đang chiếu — hai căn ba phần ba, năm hai pi. Nếu hội đồng muốn, em có thể chạy lại lệnh này ngay tại chỗ, offline, cho ra đúng con số này.*

---

## [Slide 9] Con số 210/210 đo cái gì — và trung thực về cái nó chưa đo

- 210/210 chứng minh **engine tính đúng khi đã có plan đúng** và **thực sự trả đáp dạng căn** — nó củng cố năng lực engine.
- Nó **chưa** đo khâu **LLM dịch đề → plan** (đầu‑cuối); muốn đo phải chạy `--full` (gọi LLM, cần khoá API).
- "100%" chỉ nghĩa "chưa phát hiện hồi quy trên rổ 210 ca", **không** phải "hệ thống chính xác 100%".
- **Đang đo (cần khoá API):** baseline LLM thuần vs hệ của chúng em, và đặc biệt chỉ số **confidently‑wrong** + **precision khi trả lời**.

*Ghi chú người nói (~30s): Chúng em muốn chủ động thu hẹp ý nghĩa con số này trước khi hội đồng vặn. 210/210 là engine‑replay: nó chứng minh engine tính đúng khi đã có kế hoạch đúng, và trả đáp dạng căn. Nó chưa đo khâu LLM dịch đề, và 210 ca là mẫu còn nhỏ, nên "100%" chỉ có nghĩa "chưa thấy hồi quy", không phải hệ thống đúng tuyệt đối. Bảng baseline và chỉ số confidently‑wrong chúng em đang đo — harness đã dựng xong, chỉ còn chờ khoá API để chạy trên LLM thật.*

---

## [Slide 10] Khung đánh giá lấy an toàn làm trung tâm: confidently‑wrong và precision khi trả lời

- So trên **cùng tập test**: `system` (hệ của chúng em) vs `llm-direct` (LLM giải thẳng) — harness `scripts/eval/baseline.mjs` đã dựng.
- Ba cột đo cốt lõi: **accuracy**, **confidently‑wrong** (đưa đáp SAI một cách tự tin — càng thấp càng tốt), **precision khi trả lời** = correct/(correct+wrong).
- Giả thuyết: hệ Neuro‑Symbolic có **confidently‑wrong rất thấp** và **precision cao** nhờ engine tự kiểm + cổng từ chối, đổi lại **từ chối nhiều hơn** trên bài ngoài năng lực.
- Trạng thái trung thực: đường ống **đã kiểm thử ở chế độ mock**; **số thật đang đo** — không đưa số mock vào deck như kết quả.

*Ghi chú người nói (~30s): Đây là linh hồn của phần đánh giá. Chúng em không chỉ đo độ chính xác, mà đo hai chỉ số an toàn: tỉ lệ sai một cách tự tin, và độ chính xác khi hệ có trả lời. Kỳ vọng của chúng em là hệ thống gần như không bao giờ sai tự tin, đổi lại nó từ chối nhiều hơn — đúng tinh thần AI đáng tin cậy. Em nói thẳng: đường ống đã chạy thử ở chế độ mô phỏng, còn số thật đang đo vì cần khoá API. Chúng em không đưa số mô phỏng vào đây.*

---

## [Slide 11] Định vị so với AlphaGeometry: cùng triết lý, khác bài toán, khác quy mô

- **AlphaGeometry** chứng minh định lý hình học **phẳng**, huấn luyện một mô hình chuyên biệt trên ~100 triệu mẫu tổng hợp.
- Chúng em làm hình học **không gian 3D** và **tính đại lượng** (khoảng cách/góc/thể tích) + **trực quan hoá** — không phải chứng minh định lý phẳng.
- Chúng em **không huấn luyện lại mô hình nào**: dùng LLM sẵn có chỉ để dịch, cộng engine tự viết + cổng từ chối + tối ưu prompt.
- Điểm chung duy nhất là **triết lý neuro‑symbolic** — đó là nguồn cảm hứng, không phải bản sao; và chúng em thêm **benchmark tiếng Việt đầu tiên**.

*Ghi chú người nói (~30s): Chắc chắn hội đồng sẽ hỏi khác gì AlphaGeometry. Ba khác biệt dứt khoát. Về bài toán: họ chứng minh định lý hình phẳng, chúng em tính đại lượng trong không gian ba chiều và dựng hình. Về phương pháp: họ huấn luyện một mô hình trên trăm triệu mẫu, chúng em không huấn luyện gì, chỉ dùng LLM để dịch. Về đóng góp mới: benchmark tiếng Việt đầu tiên cho dạng toán này. Điểm chung duy nhất là triết lý thần kinh cộng ký hiệu — đó là cảm hứng, không phải sao chép.*

---

## [Slide 12] Khả thi ở quy mô trường học: chi phí ≤ 10 triệu, mã nguồn mở, chạy tất định

- Cố tình **không train mô hình khổng lồ**: dùng LLM rẻ, sẵn có, rồi làm cho nó đáng tin bằng engine — hợp túi tiền học sinh.
- Ngân sách mục tiêu **≤ 10 triệu VNĐ**: chủ yếu API baseline (1–3 triệu) và GPU thuê giờ (2–6 triệu); benchmark engine‑replay chạy **offline miễn phí**.
- **Công bố toàn bộ báo cáo, mã nguồn và benchmark** để cộng đồng đối chiếu, tái lập.
- Ứng dụng 3D thật: 17 trang, 136 component; đầu vào bằng chữ hoặc ảnh, đầu ra là hình xoay‑zoom + đáp kiểm chứng được.

*Ghi chú người nói (~25s): Đề tài này khả thi ở quy mô trường học. Chúng em cố tình không đi theo hướng huấn luyện mô hình khổng lồ, mà làm cho một LLM rẻ trở nên đáng tin nhờ engine. Nhờ vậy tổng chi phí nằm dưới 10 triệu, phần lớn là tiền gọi API để đo baseline, còn benchmark thì chạy offline miễn phí. Toàn bộ mã nguồn, báo cáo và dữ liệu chúng em công bố công khai để ai cũng kiểm chứng lại được.*

---

## [Slide 13] Liêm chính và hạn chế — chúng em tự nêu trước khi bị hỏi

- **Số đã đo:** engine‑replay 210/210, ~1086 test. **Số chưa đo:** end‑to‑end + baseline + confidently‑wrong — cần khoá API, ghi rõ `⟦đang đo⟧`, không tô vẽ.
- **Benchmark còn nhỏ (210 ca) và là máy‑sinh** (185 synthetic kiểm hai chiều + 25 capture) — **chưa có đề từ SGK/đề thi thật**; bổ sung đề thật có nguồn là việc học sinh đang làm.
- **Phạm vi engine có giới hạn:** quỹ tích tổng quát, bất đẳng thức, biện luận tham số ⇒ engine **từ chối an toàn** thay vì giải — là ranh giới năng lực rõ ràng, không giấu.
- **Ghi công minh bạch:** LLM hosted làm bộ dịch, three.js/React để vẽ; phần tự viết là engine, cổng từ chối, benchmark, phân tầng.

*Ghi chú người nói (~30s): Chúng em chủ động nêu hạn chế, vì trung thực chính là điểm mạnh. Số chắc chắn của chúng em là engine‑replay và test đơn vị; số baseline và confidently‑wrong đang đo vì cần khoá API. Benchmark hiện 210 ca là máy sinh, chưa có đề thi thật — chúng em đang bổ sung đề có nguồn, tự giải tay xác minh. Engine cũng có ranh giới: gặp quỹ tích hay bất đẳng thức thì nó từ chối chứ không bịa. Phần nào dùng thư viện, phần nào tự viết, chúng em ghi rõ ràng.*

---

## [Slide 14] Hướng phát triển: từ 210 ca máy‑sinh tới benchmark có nguồn và số đầu‑cuối thật

- Mở rộng benchmark tiếng Việt lên **~150–300 ca có nguồn SGK/đề thi**, tự giải tay xác minh, đủ dạng (thêm góc, thiết diện, giao tuyến).
- Chạy **đánh giá đầu‑cuối + baseline thật** (accuracy, confidently‑wrong, latency) khi có khoá API.
- Chạy **tối ưu prompt tiến hoá trên LLM thật** để có đường cong fitness và so prompt‑tối‑ưu vs prompt‑tay.
- **Human evaluation** với giáo viên Toán về giá trị sư phạm; thử **mô hình mã nguồn mở chạy offline** để giảm phụ thuộc LLM đóng.

*Ghi chú người nói (~25s): Bước tiếp theo rất rõ ràng. Ưu tiên số một là mở rộng benchmark lên vài trăm ca lấy từ sách và đề thi thật, tự giải tay xác minh. Sau đó chạy đánh giá đầu‑cuối và baseline để có bảng số thật, đặc biệt là chỉ số confidently‑wrong. Rồi chạy tối ưu prompt trên LLM thật, mời giáo viên Toán đánh giá giá trị sư phạm, và thử một mô hình mã nguồn mở chạy offline để bớt phụ thuộc dịch vụ bên ngoài.*

---

## [Slide 15] Kết: một AI đáng tin cho hình học không gian — biết tính đúng và biết từ chối

- Đóng góp: kiến trúc Neuro‑Symbolic an toàn cho hình học **không gian** · cổng từ chối theo bất biến affine · engine trả đáp căn/π đúng · benchmark tiếng Việt đầu tiên.
- Số thật làm nền: engine‑replay **210/210**, ~**1086** test; phần còn lại **đang đo** một cách minh bạch.
- Giá trị giáo dục: hình 3D để hiểu bằng mắt + đáp kiểm chứng được, và quan trọng nhất — **thà từ chối còn hơn dạy sai**.
- **Xin cảm ơn hội đồng và quý thầy cô** — chúng em sẵn sàng chạy demo trực tiếp và trả lời chất vấn.

*Ghi chú người nói (~25s): Tóm lại, chúng em xây một hệ thống giải hình học không gian mà điểm khác biệt không nằm ở chỗ nó thông minh hơn, mà ở chỗ nó đáng tin hơn: nó tính đúng ra đáp dạng căn, và nó biết từ chối khi không đủ căn cứ thay vì bịa. Nền của đề tài là số thật đo được và một tinh thần không bịa số. Em xin cảm ơn hội đồng, và chúng em rất sẵn lòng chạy demo trực tiếp cũng như trả lời mọi câu hỏi ạ.*
