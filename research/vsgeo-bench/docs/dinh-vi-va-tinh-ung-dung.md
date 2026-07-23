# VSGeo-Bench — Định vị & Tính ứng dụng: "Có quá hàn lâm cho ViSEF không?"

> **Loại tài liệu:** Memo đánh giá thẳng thắn (positioning review) cho 2 em học sinh + mentor.
> **Ngày:** 2026-07-23 · **Người tổng hợp:** trợ lý nghiên cứu (Claude) từ 5 góc khảo cứu độc lập + đọc `design.md`.
> **Câu hỏi cần trả lời:** Đề tài VSGeo-Bench (benchmark + máy chấm + thống kê + khảo sát GV) có "quá hàn lâm / giống bài báo" so với các dự án ĐẠT GIẢI ở ViSEF/ISEF không? Cái gì thực sự giúp thắng giải cao?

---

## 0. NGUỒN & ĐỘ TIN — đọc trước khi tin bất cứ dòng nào dưới đây

Memo này dựa trên 5 báo cáo khảo cứu (Góc A–E). **Chất lượng nguồn KHÔNG đồng đều — phải phân biệt:**

- **Bằng chứng MẠNH (nên tin, kiểm chứng chéo được):**
  - Danh sách 12 giải Nhất ViSEF 2025 và 14 giải Nhất ViSEF 2025–2026 (nhiều báo lớn VN đăng trùng khớp: Tuổi Trẻ, VnExpress, VietnamPlus/TTXVN, Báo Tin Tức, Phụ Nữ Mới).
  - Thành tích ISEF cao nhất của VN (giải Nhì 2024, lĩnh vực Systems Software — công cụ dựng lại tim mạch 3D, trường Lê Hồng Phong) — VOV English.
  - Rubric ISEF Grand Award: có nguồn gốc societyforscience.org (Góc D trích trực tiếp: Research Question 10 / Design 15 / Execution 20 / Creativity & Impact 20 / Presentation 35).
  - Người thắng ISEF 2024–2025 (Grace Sun — thuật toán SOCP; Adam Kovalčík — quy trình tổng hợp thuốc) — Society for Science.

- **Bằng chứng TRUNG BÌNH (định hướng đúng nhưng nguồn coaching/SEO, KHÔNG phải BTC):**
  - Rubric ISEF Systems Software "30/30/15/15/10" và mục "novelty bar", "common mistakes" — lấy từ finalia.ai (trang luyện thi). Trùng ý với rubric chính thức nhưng **các con số % cụ thể chưa xác minh từ nguồn gốc**.
  - Lời khuyên mentor (sciencefair.io, veducation.org, embarkchina, atopai, rishabacademy) — quan điểm tham khảo, có động cơ tiếp thị.

- **GAP nghiêm trọng — chưa làm được, đừng giả vờ đã có:**
  - **Chưa có rubric/thang điểm CHÍNH THỨC của ViSEF từ văn bản Bộ GD&ĐT** (Quy chế/Thông tư). Toàn bộ suy luận "trọng số điểm" đang mượn rubric ISEF quốc tế.
  - **Không tìm thấy tiền lệ dự án VN dạng "benchmark/đánh giá model AI thuần" từng đoạt giải.** Đây là "không tìm thấy" (absence of evidence), KHÔNG phải bằng chứng phủ định tuyệt đối. Có thể có ở giải thấp/năm cũ mà khảo cứu chưa quét tới.
  - Ở 2 trong 5 phiên khảo cứu, WebSearch/WebFetch hỏng — một phần dữ liệu là kiến thức nền chưa xác minh live (đã loại các phần confidence=low ra khỏi kết luận chính).

**=> Cách dùng memo:** coi đây là "la bàn định vị", không phải "bản đồ chính xác". Trước khi chốt chiến lược, mentor NÊN tự lấy 2 thứ còn thiếu: (1) rubric ViSEF chính thức của Bộ GD&ĐT; (2) hỏi giám khảo/GV từng dẫn đội xem thể loại benchmark có "cửa" ở lĩnh vực nào.

---

## 1. PHÁN QUYẾT THẲNG

**Có quá hàn lâm không? → PARTLY (một phần). Điểm hàn lâm: 3.5/5** (5 = rất hàn lâm/ít ứng dụng).

Lý do cho điểm 3.5 chứ không phải 5, cũng không phải 2:

**Vì sao KHÔNG phải 5 (không phải "án tử"):**
- Độ chặt thống kê (bootstrap CI, McNemar, Cohen κ, calibration) **KHÔNG bị trừ điểm** ở ISEF — trái lại nó ăn điểm "Scientific Thought" và "Thoroughness". Lỗi bị phạt lại là *"benchmark KHÔNG có phân tích thống kê"* và *"không so với baseline"* (Góc C, E — finalia.ai). VSGeo-Bench đang làm ĐÚNG chỗ này.
- Đề tài **đã có sẵn một artifact kỹ thuật gốc**: máy chấm oracle ký hiệu xác minh đáp án mở (căn thức/tọa độ/mặt phẳng) ở quy mô lớn. Đây là "hệ thống mới" hợp lệ, không phải "chỉ xếp hạng model của người khác".
- Đề tài **có đối tượng hưởng lợi bản địa** (GV Toán + HS Việt) và **thông điệp an toàn giáo dục** — đúng gu ViSEF đang ưu ái "AI/IoT ứng dụng thực tiễn". Thậm chí ViSEF 2025–2026 có tới 2 giải Nhất KHXH-hành vi dạng khảo sát-thống kê thuần (một đề tài dùng mô hình mediation), và một giải Nhất về *"tư duy phản biện của HS khi dùng AI"* — cùng họ thông điệp với VSGeo-Bench.

**Vì sao KHÔNG phải 2 (nỗi lo là CÓ THẬT):**
- Motif thắng giải áp đảo ở cả ViSEF lẫn ISEF lĩnh vực CS là **SẢN PHẨM/ĐÓNG GÓP GỐC giải một bài toán cho nhóm hưởng lợi cụ thể** (robot dạy trẻ khuyết tật, xe lăn ALS, mô hình sinh thiết kế thuốc SBProbMol3, thuật toán SOCP...). Trong toàn bộ danh sách giải Nhất khảo được, **KHÔNG có dự án nào bản chất là "đo/xếp hạng model có sẵn"**.
- Nếu VSGeo-Bench trình bày như hiện tại — tiêu đề "*xây bộ chuẩn và máy chấm đánh giá năng lực... của các mô hình AI*" — nó **đọc như một bài báo benchmark**, dễ rơi đúng 2 bẫy giám khảo phạt: *"consumer report"* (so sánh các hãng model như so pin) và *"chỉ phân tích thứ có sẵn, thiếu đóng góp gốc"* (Góc D — veducation.org).
- Rủi ro không nằm ở thống kê, mà ở **THỨ TỰ KỂ CHUYỆN**: cái oracle (đóng góp gốc) đang bị chôn ở §4, còn "đánh giá model" chiếm mặt tiền tên đề tài.

**Kết luận một câu:** *Đề tài không quá hàn lâm về BẢN CHẤT — nó đã có đủ artifact gốc + tác động để thắng. Nó quá hàn lâm về CÁCH ĐÓNG GÓI. Sửa được bằng tái khung, không cần đổi lõi kỹ thuật.*

---

## 2. CÁI GÌ THỰC SỰ GIÚP THẮNG (theo bằng chứng)

1. **Một ĐÓNG GÓP/ARTIFACT GỐC do chính thí sinh tạo ra** — thuật toán mới, hệ thống mới, thiết bị/mô hình mới. Đây là "ngưỡng tính mới" (novelty bar). Benchmark chỉ được coi là *bước validation*, không phải là dự án. (Grace Sun/SOCP, SBProbMol3, Kovalčík — Góc A, C, E)
2. **Đối tượng hưởng lợi cụ thể + tác động đo được.** Câu hỏi vàng của giám khảo: *"Ai dùng cái này sáng mai?"* và *"Nếu em thắng giải Nhất thì nó giúp ai?"* (Góc D — sciencefair.io, veducation.org)
3. **Độ chặt khoa học + tự bảo vệ khi phỏng vấn.** Presentation + phỏng vấn chiếm ~35/100 điểm ISEF — khối nặng nhất. Giám khảo thưởng thí sinh TỰ hiểu và bảo vệ được công trình. (Góc B, D — societyforscience.org)
4. **DEMO SỐNG trực quan.** Dự án CS cạnh tranh với robot/thiết bị "nhìn thấy được"; một demo chạy trước mắt giám khảo tạo "wow" hơn bảng số. (Góc A, D)
5. **Validation người dùng thật.** Khảo sát/thử nghiệm trên người được coi trọng (ví dụ robot Cuddle Chimp khảo sát 122 người). Khảo sát giáo viên của các em là TÀI SẢN nếu có hồ sơ đạo đức. (Góc D, E)
6. **Bản địa hóa VN + đúng xu hướng AI ứng dụng.** ViSEF đang ưu ái đề tài AI/IoT giải bài toán thực tiễn VN. (Góc A, E — VietnamPlus, Báo Tin Tức)

---

## 3. RỦI RO CỤ THỂ CỦA ĐỀ MÌNH (đối chiếu bằng chứng)

1. **Tên & khung hiện tại đọc như benchmark paper.** Tiêu đề đặt "đánh giá năng lực các mô hình AI" lên mặt tiền → dễ bị đọc là "consumer report so sánh GPT/Gemini/Claude", đúng bẫy giám khảo phạt.
2. **Artifact gốc (oracle) bị chôn.** Máy chấm ký hiệu — thứ mạnh nhất, "hệ thống mới" của các em — nằm ở §4 và bị mô tả khiêm tốn là "dùng lại engine có sẵn". Nếu phỏng vấn không làm nổi bật phần các em tự làm, mất cả điểm novelty lẫn điểm liêm chính.
3. **Ranh giới sở hữu engine là con dao hai lưỡi.** Engine ký hiệu là "công trình trước của thành viên nhóm". Giám khảo SẼ hỏi "phần nào là của em?". Nếu 2 em không tự bảo vệ được logic tương đương đáp án + lớp trích xuất + giao thức chấm, dự án sập ở phỏng vấn (35% điểm).
4. **Cưỡi giữa hai lĩnh vực.** Vừa "Phần mềm hệ thống" (oracle) vừa "KHXH-hành vi" (khảo sát GV) → không có "ngôi nhà" rõ. Systems Software thường KHÔNG cần IRB; nhưng nếu đẩy khảo sát GV lên trọng tâm thì lại cần hồ sơ nghiên cứu con người. Chọn lệch → hoặc yếu novelty, hoặc vướng thủ tục.
5. **Thiếu "thứ chạm được".** Dashboard + bảng số ít gây "wow" trực quan so với thiết bị. Không có demo sống thì khó cạnh tranh phần trình bày.
6. **Chưa có rubric ViSEF gốc.** Toàn bộ chiến lược đang mượn trọng số ISEF. Nếu rubric ViSEF nặng "tính ứng dụng/tác động" hơn ISEF, phần benchmark thuần càng dễ bị coi nhẹ — cần kiểm chứng.

---

## 4. TÁI KHUNG (giữ nguyên lõi kỹ thuật, bớt hàn lâm) — khả thi trong 3 tháng

1. **Đảo nhân vật chính: ORACLE ra mặt tiền, benchmark thành bằng chứng.**
   Đổi câu chuyện từ *"chúng em đánh giá các model AI"* → *"chúng em xây MỘT MÁY CHẤM TỰ ĐỘNG có thể xác minh đáp án hình không gian dạng mở (căn thức/tọa độ/mặt phẳng) ở quy mô lớn — thứ trước nay phải chấm tay; rồi dùng nó để phát hiện AI giải sai."* Việc xếp hạng model là *ứng dụng đầu tiên* của máy chấm, không phải mục tiêu. (Không đổi code, chỉ đổi tên đề tài + thứ tự kể + slide.)

2. **Đưa "bảo vệ học sinh khỏi AI tự tin nhưng sai" lên tuyến đầu.**
   Mở đầu poster/báo cáo bằng một ca thật: một lời giải AI "trôi chảy nhưng sai" mà HS dễ tin → máy chấm bắt được ngay. Đây là "hook tác động" thay cho bảng số. Gắn stakeholder rõ: GV Toán VN, HS tự học, đội edtech.

3. **Dựng một DEMO SỐNG cho phỏng vấn.**
   Giao diện tối giản: dán một đề + một lời giải AI → máy chấm phán Đúng/Sai + chỉ ra đáp án chuẩn tương đương, ngay trước mắt giám khảo. Đây là "khoảnh khắc wow". (Tái dùng frontend React sẵn có — nằm trong T4 dashboard, chỉ cần thêm ô nhập trực tiếp.)

4. **Chốt DỨT KHOÁT một lĩnh vực: "Phần mềm hệ thống", oracle là trung tâm.**
   Khảo sát GV giữ vai *validation phụ* ("vấn đề AI sai là có thật, cả GV cũng bị đánh lừa"), không phải trục chính → tránh vướng nặng IRB. Vẫn giữ hồ sơ đồng thuận/ẩn danh như §8.4.

5. **Mỗi bảng số kết bằng KHUYẾN NGHỊ HÀNH ĐỘNG.**
   Không dừng ở "model X đạt Y%". Thêm: *"→ Khi dạy chủ đề khoảng cách/mặt phẳng, KHÔNG nên tin model ___ vì tỉ lệ tự-tin-nhưng-sai cao; nên dùng máy chấm để kiểm."* Biến thống kê thành lời khuyên dùng được.

6. **Đóng khung "hạ tầng công cộng mở."**
   Dataset + máy chấm + datasheet công khai như *tài nguyên tái dùng cho cộng đồng GV/nghiên cứu VN* — đây là "tác động bền vững" mà tiêu chí ViSEF nhấn.

---

## 5. HẠNG MỤC NHỎ CÓ THỂ THÊM ĐỂ CÓ "SẢN PHẨM" (kèm chi phí & cảnh báo phạm vi)

> **CẢNH BÁO CHUNG:** §10 design đã đúng khi liệt kê YAGNI. Mọi thứ dưới đây là *tùy chọn*, chỉ làm nếu lõi (§3–4, §6) đã xong. **Đừng phình phạm vi** — một demo chạy tốt > ba demo dở.

1. **Ô "Kiểm tra lời giải AI" trực tiếp trên dashboard** *(ưu tiên cao nhất, ~3–5 ngày).*
   Dán đề + lời giải → máy chấm phán ngay. Đây chính là demo sống ở §4.3, biến dự án thành "công cụ dùng được". Rủi ro phình: THẤP (tái dùng oracle + frontend). **Nên làm.**

2. **Tờ một trang "Khi nào nên tin AI giải Toán không gian?"** *(~2–3 ngày.)*
   Rút gọn kết quả benchmark thành hướng dẫn cho GV/HS: model nào ổn/không ổn theo từng chủ đề, dấu hiệu nhận biết lời giải sai. Là "sản phẩm tác động" nhẹ, in ra phát tại gian trưng bày. Rủi ro phình: THẤP.

3. **Thẻ "độ tin cậy theo chủ đề" (reliability card)** *(~2 ngày, tùy chọn.)*
   Bảng tra nhanh: chủ đề × model → mức tin (xanh/vàng/đỏ) dựa trên accuracy + calibration. Rủi ro phình: THẤP-TRUNG (phụ thuộc dữ liệu đủ).

4. **KHÔNG nên làm trong mùa này:** app di động, hệ thống tài khoản người dùng, mở rộng sang hình phẳng/giải tích, preprint (chỉ là "trần cao" §9.1). Những thứ này ngốn thời gian mà không tăng cơ hội giải.

---

## 6. GIỮ NGUYÊN (đã đúng hướng — đừng vứt độ chặt)

- **Độ chặt thống kê** (bootstrap CI, McNemar, calibration): là LỢI THẾ khi khung đúng, ăn điểm Scientific Thought + Thoroughness. Giữ.
- **Cohen κ cho taxonomy lỗi:** đúng chuẩn khoa học, chống phản biện "dán nhãn tùy tiện". Giữ.
- **Tự kiểm định oracle (precision/recall + soát tay):** trả lời trước câu hỏi "sao biết máy chấm đúng?" — cực kỳ quan trọng cho phỏng vấn. Giữ và luyện nói.
- **Bộ biến đổi có kiểm soát (robustness):** phân biệt "suy luận thật vs dò mẫu" là điểm sáng tạo khoa học, có nền học thuật, trích dẫn được. Giữ — nhưng đóng gói như "bằng chứng cho một khẳng định an toàn", không phải bảng số trưng bày.
- **Khảo sát giáo viên:** giữ như validation người-thật cho H3; giữ hồ sơ đạo đức §8.4.
- **Ranh giới sở hữu minh bạch (§4.4) + §10 YAGNI + §12 rủi ro:** tư duy liêm chính và kỷ luật phạm vi này đã rất chín. Giữ.
- **Ưu tiên chất lượng > số lượng (300 bài "hạt giống"):** đúng, dễ bảo vệ từng bài. Giữ.

---

## 7. BẰNG CHỨNG MẠNH NHẤT HẬU THUẪN PHÁN QUYẾT

1. **Thành tích ISEF cao nhất của VN (giải Nhì 2024, Systems Software) là một CÔNG CỤ PHẦN MỀM** (deep learning dựng lại tim mạch 3D cho thực hành y khoa, trường Lê Hồng Phong), không phải nghiên cứu đo lường. → Giám khảo VN thưởng "tool giải bài toán ngành". Nguồn: english.vov.vn/.../post1096009.vov
2. **12 giải Nhất ViSEF 2025: mọi dự án CS/robot đều là sản phẩm có nhóm hưởng lợi cụ thể** (robot dạy trẻ khuyết tật ngôn ngữ, xe lăn ALS, phân loại rác AI, AI bảo tồn đờn ca tài tử); KHÔNG có benchmark thuần. Nguồn: tuoitre.vn/.../20250321184619912.htm
3. **Rubric ISEF Grand Award: Presentation 35 / Creativity&Impact 20 / Execution 20 / Design 15 / Question 10** → phỏng vấn nặng nhất; độ chặt KHÔNG bị phạt. Nguồn: societyforscience.org/isef/grand-award/criteria/
4. **Rubric Systems Software + "novelty bar": phải có thuật toán/hệ thống mới; "benchmark không phân tích thống kê" và "không so baseline" là lỗi bị phạt.** → Xác nhận: giữ thống kê, nhưng cần artifact gốc (oracle). Nguồn: finalia.ai/isef/categories/systems-software (coaching, độ tin trung bình).
5. **ViSEF 2025–2026 có giải Nhất KHXH dạng khảo sát-thống kê thuần (mô hình mediation) và một giải Nhất "tư duy phản biện của HS khi dùng AI".** → Dạng nghiên cứu định lượng + thông điệp "độ tin AI trong giáo dục" VẪN thắng, đúng lĩnh vực. Nguồn: phunumoi.net.vn/.../d340451.html
6. **Trưởng BGK quốc gia VN 2025–2026 (GS.TS Phạm Thành Huy) KHEN đề tài "có số liệu và đối sánh cụ thể" NHƯNG gắn "khả năng gắn kết thực tiễn".** → Số liệu tốt là cộng điểm; thiếu là ứng dụng thực tiễn mới trừ. Nguồn: baotintuc.vn/.../20260322214647045.htm

---

## 8. VIỆC CẦN LÀM TIẾP (cho mentor, trước khi chốt)

1. Lấy **rubric/thang điểm ViSEF chính thức** từ văn bản Bộ GD&ĐT (Quy chế thi KHKT quốc gia — bản hiệu lực mới nhất). Đây là gap lớn nhất.
2. Hỏi 1–2 GV/giám khảo từng dẫn đội: thể loại "benchmark/công cụ đánh giá AI" nên đăng ký **lĩnh vực nào** và có tiền lệ thắng không.
3. Chốt **tên đề tài mới** đưa "máy chấm/công cụ" ra mặt tiền (xem §4.1 của memo này).
4. Lên lịch dựng **demo sống** vào T4 (không để tới T5).

*Hết memo. Mọi nhận định "điều gì giúp thắng" từ nguồn coaching để mức tham khảo; các con số danh sách giải & rubric ISEF là kiểm chứng chéo được.*
