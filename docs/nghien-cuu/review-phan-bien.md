# Phản biện đề tài — góc nhìn GIÁM KHẢO ViSEF khó tính

> **Trạng thái xử lý (đã khép vòng một phần — cập nhật sau khi rà):**
> - Lỗi #4 (benchmark nhỏ/lệch dạng): **đã bổ sung nhiều đợt ca synthetic** kiểm hai chiều → **210 ca / 279 đáp**, `bench:gate` 210/210. Đã lấp đúng các dạng review chỉ ra thiếu (§2.6): góc 15, vị trí tương đối 15, phương trình mặt phẳng 15, thiết diện/đa giác, tỉ số thể tích, mặt cầu, nón/trụ/cụt — không còn "0 ca" ở các dạng này. **100% đáp ở dạng chính xác** (0 làm tròn). *(Ghi chú: các con số trong phần THÂN bài dưới đây — vd "26 file capture", "0 ca góc" — giữ nguyên làm ảnh chụp thời điểm rà soát để đối chiếu tiến độ; trạng thái mới nhất xem dòng này.)*
> - Lỗi #5 (số tự mâu thuẫn): **đã sửa** — test→1085, ca→210, baseline SymPy đánh dấu *chưa hiện thực*.
> - Lỗi #3 (nguồn dữ liệu nói như đã có): **đã sửa** báo cáo/datasheet — nêu rõ hiện là ca máy‑sinh, đề SGK/đề thi là phần học sinh làm.
> - Lỗi #1 (git 82% commit AI) & #2 (chưa có số thật): **cần bạn** — học sinh sở hữu/hiểu & tự commit phần của mình; cắm API key để đo confidently‑wrong.

*Bản rà soát độc lập, đọc toàn bộ `docs/nghien-cuu/*`, `README`, `bench/golden/`, và mã `api/_lib/kernel-bridge/`, `api/_lib/kernel/`, `scripts/`. Mục tiêu: chỉ ra chỗ dễ bị hỏi/bị bác TRƯỚC khi thi, kèm cách vá cụ thể. Giọng nghiêm khắc là cố ý — để nhóm không bị bất ngờ trên hội đồng.*

*Ngày rà soát: 2026-08-21. Đối chiếu trực tiếp repo, không dựa trí nhớ.*

---

## Tóm tắt một dòng

Kiến trúc và phần **engine ký hiệu** là thật, chạy được, test xanh (1085 test) — đây là điểm mạnh thực. Nhưng **toàn bộ luận điểm nghiên cứu cốt lõi (CH1–CH3) chưa có một số đo thật nào**, benchmark **26 ca đều do máy tự sinh (không có nguồn SGK/đề thi, không có xác minh người)**, và **lịch sử git cho thấy 82% commit do AI viết**. Ba điều này, nếu không xử lý, đủ để một hội đồng khó tính đánh rớt hoặc nghi "quá tầm / không phải em làm".

---

## 1. LỖ HỔNG CHÍ MẠNG (có thể làm rớt giải)

### 1.1. "Em tự làm không?" — lịch sử git tố cáo AI viết phần lớn
**Bằng chứng (đo trên repo):** `git log` có 60 commit: **49 commit tác giả `Claude <noreply@anthropic.com>`**, chỉ 11 commit của `Phuoc2507`. Nghĩa là ~82% lịch sử — gồm engine, script prompt-opt, harness eval, và **chính bản báo cáo khoa học** — do AI tạo. Toàn bộ mã và tài liệu viết trong 2026‑08.

**Vì sao chí mạng:** đây là câu hỏi số 1 của giám khảo ViSEF sau hai mùa nhiều dự án bị huỷ giải vì "người lớn/AI làm". Repo công khai + commit AI = bằng chứng bất lợi ngay trong tay hội đồng. Mục §6 "Liêm chính" của báo cáo tự nói "minh bạch công bố mã nguồn" — mà mã nguồn lại chính là thứ tố cáo.

**Cách vá (việc + ai):**
- **(Học sinh — bắt buộc)** Phải THỰC SỰ hiểu và tự trình bày lại được: (a) vì sao tách "LLM dịch — engine tính"; (b) engine tính khoảng cách điểm–mặt bằng công thức bình phương `|n·x+d|²/|n|²` để ở lại trong trường số biểu diễn được; (c) cổng từ chối 3 câu và bất biến affine. Hội đồng sẽ hỏi vặn ngẫu nhiên — trả lời trơn là điều kiện sống còn.
- **(Học sinh)** Chuẩn bị **demo tái lập trực tiếp**: bốc một đề mới trước mặt giám khảo, chạy, giải thích từng bước. Chứng minh làm chủ, không phải học thuộc.
- **(Học sinh + GVHD)** Viết một trang "nhật ký đóng góp" trung thực: phần nào tự nghĩ/tự code, phần nào dùng AI như công cụ (giống dùng máy tính / thư viện). ViSEF không cấm dùng AI công cụ, nhưng cấm giấu và cấm không hiểu. Thà khai rõ "em dùng AI hỗ trợ code, nhưng thiết kế và kiểm chứng là của em" hơn là để git tự tố.
- **(Kỹ thuật)** Từ giờ commit bằng tài khoản học sinh; đừng để thêm commit tác giả AI chồng lên.

### 1.2. Toàn bộ câu hỏi nghiên cứu cốt lõi CHƯA CÓ SỐ THẬT
**Bằng chứng:** báo cáo §5.5 bảng kết quả để trống `⟦CHỜ ĐO⟧`; `danh-gia.md §3` ghi "số thật cần API key — phần của nhóm"; `prompt-optimization.md §6` ghi rõ mock "không phải kết luận khoa học". Số duy nhất là thật là **engine‑replay 26/26** — nhưng §5.7 tự thú nhận nó **KHÔNG đo khâu LLM dịch** và **KHÔNG phải độ chính xác hệ thống**.

Cụ thể chưa đo:
- **CH1** (neuro‑symbolic có hơn LLM giải thẳng không, hơn bao nhiêu?) — chưa có.
- **CH2** (cổng từ chối có giảm *confidently‑wrong* không?) — **chỉ số an toàn cốt lõi của cả đề tài, chưa đo lần nào trên LLM thật.** Con số 0.0% trong `eval-runs/mock/report.md` là **giả lập tất định**, không có giá trị khoa học.
- **CH3** (prompt‑opt có cải thiện không?) — chỉ có mock 75%→100%.

**Vì sao chí mạng:** đề tài bán ý tưởng "AI đáng tin, confidently‑wrong ≈ 0". Nếu giám khảo hỏi "đo được bao nhiêu %?" mà đáp "chưa đo, đang chờ API key" thì luận điểm trung tâm **rỗng**. Poster và báo cáo mô tả cơ chế rất kỹ nhưng phần *kết quả* — thứ hội đồng chấm nặng nhất — gần như trắng.

**Cách vá (ưu tiên cao nhất, xem Top 5):**
- **(Học sinh, gấp)** Mua/xin credit API (đề tài đã dự toán 1–3 triệu). Chạy `npm run eval:baseline -- --methods system,llm-direct --split default --use test` và `npm run prompt:opt -- --provider vilao` để có **ít nhất một bảng số thật**, dù mẫu nhỏ.
- **Tối thiểu phải có:** một bảng `system` vs `llm-direct` trên tập test thật, với 3 cột: accuracy, **confidently‑wrong**, precision‑khi‑trả‑lời. Đây là "linh hồn" của bài.
- Nếu không kịp nhiều đề: đo trên chính 26 ca + vài chục đề mới, nêu rõ cỡ mẫu và khoảng tin cậy. **Một số thật nhỏ > một bảng trống.**

### 1.3. Benchmark: 26 ca, TẤT CẢ do máy tự sinh — mâu thuẫn với datasheet
**Bằng chứng (đo trên repo):** cả 26 file `bench/golden/*.json` có `"source":"capture"` (25) hoặc `"kernel-smoke.mjs"` (1). **Không một ca nào ghi nguồn SGK/đề thi.** Trong khi đó:
- Báo cáo §5.2: *"Nguồn: đề trong SGK và đề thi THPT (ghi rõ nguồn)"*.
- Phụ lục D (datasheet): *"đề từ SGK/đề thi (ghi nguồn); đáp do người XÁC MINH"*.
- `du-lieu-benchmark.md §3`: *"Ghi nguồn mọi đề… người là trọng tài cuối"*.

Thực tế: đề do máy sinh, đáp do **chính engine** sinh ra rồi đóng băng (`bench:capture` giữ lại ca engine tự giải được). `bench:gate` sau đó chấm engine **so với đáp của chính engine**.

**Vì sao chí mạng:**
1. **Vòng lặp tự xác nhận (circular):** "26/26 pass" chỉ chứng minh engine *không hồi quy* so với chính nó — **không** chứng minh đáp *đúng về mặt toán học* một cách độc lập. Nếu engine sai một cách nhất quán, golden cũng sai theo, gate vẫn xanh. README của chính rổ golden đã cảnh báo điều này ("Đừng tạo lại golden từ engine đang nghi sai") nhưng dữ liệu hiện tại vi phạm đúng cảnh báo đó.
2. **Nguy cơ liêm chính:** datasheet mô tả một quy trình (nguồn SGK + người xác minh) mà **dữ liệu thật không thể hiện**. Giám khảo mở một file golden thấy `source:"capture"` sẽ hỏi ngay "nguồn SGK đâu, ai xác minh đáp?". Đây là chỗ báo cáo **nói như đã có** trong khi chưa có.
3. **"Bộ dữ liệu chuẩn tiếng Việt đầu tiên"** (đóng góp §9.4, poster) mà nội dung là 26 ca máy sinh, không nguồn, không nhãn khó/dạng đầy đủ — rất khó bảo vệ là "đóng góp dữ liệu".

**Cách vá (việc + ai):**
- **(Học sinh — cốt lõi)** Tự tay nhập ≥ 50–100 đề **thật từ SGK/đề thi**, ghi nguồn (trang, năm), **tự giải tay ra đáp**, rồi dùng `scripts/label/` đối chiếu. Chỉ nạp golden khi đáp người == đáp máy. Sửa mọi `source` thành nguồn thật.
- **(Học sinh)** Với mỗi ca, người phải là trọng tài đáp — đúng như datasheet đã hứa. Ghi lại ai xác minh, ngày nào.
- **(Trình bày)** Hạ giọng từ "benchmark chuẩn đầu tiên" xuống "bộ đề mốc bước đầu (n=…) đang mở rộng", cho tới khi đủ lớn và có nguồn.

---

## 2. ĐIỂM YẾU VỪA (không rớt ngay nhưng bị trừ điểm / bị hỏi khó)

### 2.1. Số liệu tự mâu thuẫn trong cùng báo cáo — mất uy tín "trung thực số"
**Bằng chứng:** §4.3 và §8.1 ghi **"868 test"**; §5.7 ghi **"1073 test"**; đo thật `npm test` = **1085 test**. Ba con số, không cái nào khớp. Tương tự §8.1 còn ghi **"engine‑replay 20/20"** và hộp diễn giải §5.7 ghi **"cỡ mẫu 20"**, trong khi phần trên cùng §5.7 đã là **26/26**. Kernel "~48 file, ~5.256 dòng" — đo lại 49 file, 5.394 dòng (lệch nhẹ, chấp nhận được nhưng nên cập nhật).

**Vì sao là vấn đề:** đề tài lấy "trung thực số liệu, không dùng số bịa" làm nguyên tắc biên tập (dòng 7). Số test đá nhau ngay trong một file khiến giám khảo nghi cả những số khác. (Điểm cộng: `poster.html` đã dùng đúng **1085** và **26/26** — chứng tỏ số đúng tồn tại, chỉ là thân báo cáo chưa đồng bộ.)

**Cách vá:** **(Học sinh/kỹ thuật)** rà toàn văn, thay mọi "868"/"1073" → **1085**, mọi "20/20"/"cỡ mẫu 20" → **26/26 / 26**; cập nhật dòng/file kernel. Một buổi dò là xong.

### 2.2. Bảng baseline liệt kê SymPy/CAS — nhưng KHÔNG có trong mã
**Bằng chứng:** §5.5 liệt kê 4 phương pháp, gồm *"CAS thuần (SymPy) trên bài đã hình thức hoá"*. Nhưng `scripts/eval/methods.mjs` chỉ hiện thực **2** method: `system` và `llm-direct`. Không có SymPy. `danh-gia.md` (đúng) cũng chỉ nói 2 method.

**Vì sao là vấn đề:** liệt kê một baseline chưa tồn tại là "nói như đã có". Nếu giám khảo hỏi kết quả SymPy, không có gì để đưa.

**Cách vá:** **(Kỹ thuật)** hoặc (a) thực sự thêm method SymPy vào harness (đúng vai baseline "ký hiệu thuần"), hoặc (b) sửa §5.5: hạ SymPy xuống "dự kiến, chưa hiện thực". Không để bảng gợi ý đã chạy.

### 2.3. "Tối ưu prompt" — đóng góp mỏng và mock bị nghi tuần hoàn
**Bằng chứng:** genome chỉ **BẬT/TẮT + sắp thứ tự 8 câu gene** viết tay (`scripts/prompt-opt/genome.mjs`), gắn sau prompt gốc. Không gian tìm kiếm rất nhỏ (8 bit + hoán vị). Chế độ mock định nghĩa "ca dịch đúng nếu genome bật đủ gene ca đó cần" — tức **đáp án đã cài sẵn trong luật chấm**, nên GA đạt 100% là **hiển nhiên**, không nói lên năng lực gì.

**Vì sao là vấn đề:** nếu trình bày mock 75%→100% như "thành tựu", giám khảo tinh sẽ vạch ra tính tuần hoàn và đóng góp bị coi là tô vẽ. Bản thân tài liệu đã cảnh báo mock "không phải kết luận khoa học" — tốt — nhưng §4.6 báo cáo và poster dễ khiến người đọc lướt hiểu nhầm là kết quả.

**Cách vá:**
- **(Học sinh + API)** Chạy `--provider vilao` thật; báo cáo đường cong fitness thật + so *prompt tối ưu vs prompt tay* trên tập TEST. Không có số thật thì §4.6 nên trình bày là "khung phương pháp + tự kiểm cỗ máy", **không** gọi là kết quả.
- **(Trình bày)** Nói thẳng phạm vi: "GA chỉ khám phá tổ hợp chỉ dẫn bổ sung, không đụng lõi an toàn" — đây là lựa chọn thiết kế hợp lý, cứ tự tin nêu là *có chủ đích*, đừng thổi thành "tối ưu prompt tổng quát".

### 2.4. Phụ thuộc LLM hosted — phải nói to, tránh mang tiếng "quá tầm"
**Bằng chứng:** §4.2 khai trung thực khối Neural là LLM gọi qua `api/_lib/vilao.js`, model mặc định `ram/gemini-3.5-flash-low` — **không phải mô hình tự train/fine‑tune**. (Điểm tốt: đã khai.) Nhưng tiêu đề/abstract nhấn "hệ thống" dễ khiến người nghe tưởng mô hình là của nhóm.

**Vì sao là vấn đề:** (a) nếu giám khảo tưởng nhóm tự train rồi phát hiện là API bên thứ ba → mang tiếng thổi phồng; (b) tên model qua reseller (`ram/gemini-3.5-flash-low`) lạ, giám khảo có thể hỏi "đây là model gì, phiên bản nào" — cần trả lời được; (c) kết quả phụ thuộc một dịch vụ có thể đổi/biến mất → tính tái lập lung lay.

**Cách vá:**
- **(Trình bày)** Ngay slide/poster nói rõ: "khối Neural = LLM có sẵn làm **bộ DỊCH**; đóng góp của nhóm là **engine + cổng từ chối + benchmark + phân tầng**, không phải mô hình ngôn ngữ". Biến điểm yếu thành điểm mạnh: "chúng em cố tình không train mô hình khổng lồ như AlphaGeometry — mà làm cho LLM rẻ, sẵn có trở nên đáng tin nhờ engine."
- **(Kỹ thuật)** Ghi rõ nhà cung cấp + model + ngày chạy trong báo cáo để tái lập. Cân nhắc chạy thử một model mở offline (đã hứa ở §8) để giảm phụ thuộc — dù chỉ một thí nghiệm nhỏ.

### 2.5. Chưa có human evaluation — mới là kế hoạch
**Bằng chứng:** §5.6 mô tả sẽ mời giáo viên chấm; không có giao thức, mẫu, hay kết quả nào trong repo.

**Vì sao là vấn đề:** đề tài nhấn "giá trị sư phạm / trực quan hoá 3D" nhưng không có bằng chứng người dùng. Với lĩnh vực AI‑giáo dục, thiếu human eval là lỗ hổng thường bị hỏi.

**Cách vá:** **(Học sinh)** làm một human eval **nhỏ mà thật**: 3–5 giáo viên Toán chấm 10–15 lời giải/hình 3D theo rubric (đúng/rõ/hữu ích), báo cáo mức đồng thuận. Nhỏ vẫn hơn không.

### 2.6. Benchmark lệch dạng — nhiều dạng prompt hỗ trợ nhưng golden = 0
**Bằng chứng:** phân bố golden gần như chỉ **thể tích + khoảng cách** (+2 mặt cầu, +nón/trụ/cụt). **0 ca** cho: góc, thiết diện/đa giác, vị trí tương đối, giao tuyến, tỉ số thể tích, tối ưu/tích phân — dù `translatorPrompt.js` quảng cáo hỗ trợ tất cả. Đóng góp §9.3 "đáp dạng căn" chủ yếu minh chứng trên thể tích/khoảng cách.

**Vì sao là vấn đề:** engine "phủ rộng" trên giấy nhưng **bằng chứng kiểm chứng hẹp**. Giám khảo hỏi "góc/thiết diện có đúng không?" → không có golden để chỉ.

**Cách vá:** **(Học sinh + kỹ thuật)** thêm golden có nguồn cho ít nhất góc, thiết diện, giao tuyến, tỉ số thể tích, và một bài giải tích — mỗi dạng vài ca đã đủ chứng minh phủ.

---

## 3. RỦI RO TRUNG THỰC / LIÊM CHÍNH (rà kỹ để không bị quy thổi phồng)

- **R1 — Đóng góp viết ở thì hoàn thành cho việc chưa xong.** Abstract & §9 ghi "công bố benchmark tiếng Việt đầu tiên", "giảm mạnh confidently‑wrong" như *đã đạt*. Thực tế benchmark 26 ca máy sinh, confidently‑wrong chưa đo. **Vá:** chuyển các câu này sang "hướng tới / bước đầu", chỉ khẳng định khi có số + nguồn. Giữ đúng nguyên tắc §6 mà báo cáo tự đặt ra.
- **R2 — "Engine tự phát triển, không phụ thuộc CAS".** Điểm tốt: đã kiểm, **không** thấy `sympy/mathjs/CAS` trong phần lõi kernel — claim này đứng vững. **Giữ nguyên**, và chuẩn bị chỉ được vào `api/_lib/kernel/scalar.ts` (kiểu `Exact={num,den,radicand}`) để chứng minh là tự viết.
- **R3 — Poster tương đối trung thực** (ghi "26/26", "1085 tests", "các ô đang đo điền sau", "không dùng số minh hoạ") — **giữ chuẩn này** và kéo thân báo cáo về cùng mức kỷ luật. Đừng để poster đúng còn báo cáo lệch.
- **R4 — Mock dễ bị hiểu nhầm là kết quả.** Mọi bảng mock (eval + prompt‑opt) phải có nhãn ⚠️ "GIẢ LẬP — KHÔNG PHẢI KẾT QUẢ" **ngay cạnh số**, kể cả khi trích vào slide. Hiện tài liệu gốc có nhãn (tốt), nhưng khi cắt dán lên poster/slide rất dễ rụng nhãn — kiểm lại.

---

## 4. TOP 5 VIỆC ƯU TIÊN (xếp theo đòn bẩy → cơ hội giải cao nhất)

1. **Có SỐ THẬT cho luận điểm an toàn (confidently‑wrong) và CH1.** Bỏ tiền API, chạy `eval:baseline` (system vs llm‑direct) trên tập test thật; điền bảng §5.5 với ít nhất accuracy + confidently‑wrong + precision. *Đòn bẩy cao nhất: biến đề tài từ "mô tả cơ chế" thành "có kết quả".* — **Học sinh (API) + kỹ thuật (chạy/biểu đồ).**
2. **Dựng benchmark THẬT có nguồn + người xác minh (≥ 50–100 ca).** Nhập đề SGK/đề thi ghi nguồn, tự giải tay, dùng `scripts/label/`, sửa `source`. Xoá bỏ tính tuần hoàn và khớp lại datasheet với thực tế. *Vừa vá lỗ hổng 1.3, vừa cho mẫu để việc #1 có ý nghĩa thống kê.* — **Học sinh chủ trì.**
3. **Chuẩn bị bảo vệ "tự làm": hiểu sâu + demo trực tiếp + nhật ký đóng góp.** Trả lời trơn tru cơ chế engine/cổng từ chối; commit bằng tài khoản học sinh từ nay. *Trực tiếp gỡ nguy cơ rớt vì nghi AI/người lớn làm — lỗ hổng 1.1.* — **Học sinh + GVHD.**
4. **Đồng bộ số liệu & hạ giọng các claim chưa chứng minh.** Sửa 868/1073→1085, 20→26; chuyển "đầu tiên/giảm mạnh/đã công bố" sang "bước đầu/hướng tới"; sửa hoặc bỏ baseline SymPy. *Rẻ, nhanh, cứu uy tín "trung thực số".* — **Học sinh/kỹ thuật, 1 buổi.**
5. **Một human eval nhỏ mà thật + vài golden cho dạng còn trống (góc/thiết diện/giao tuyến).** *Lấp hai lỗ hổng bằng chứng (2.5, 2.6) với công vừa phải, tăng chiều sâu sư phạm.* — **Học sinh tổ chức.**

---

*Kết: bộ khung, engine và tính kỷ luật "không bịa số" là nền tốt và hiếm ở tuổi THPT. Nhưng ở trạng thái hiện tại, đề tài mạnh về KIẾN TRÚC và yếu về BẰNG CHỨNG. Giải cao sẽ đến từ việc biến ba khoảng trống — số thật, dữ liệu thật có nguồn, và khả năng tự bảo vệ — thành hiện thực trước ngày thi.*
