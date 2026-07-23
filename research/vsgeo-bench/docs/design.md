# VSGeo-Bench — Thiết kế đề tài NCKH

> **Tên đề tài:** *VSGeo-Bench — Xây dựng bộ chuẩn và máy chấm tự động đánh giá năng lực suy luận hình học không gian của các mô hình trí tuệ nhân tạo trên đề Toán THPT Việt Nam*
>
> **Tên kho/dataset:** `VSGeo-Bench` (*Vietnamese Solid-Geometry Benchmark*)
> **Khẩu hiệu:** "AI có 'nhìn' được hình không gian?"
> **Sân chơi:** Cuộc thi Khoa học Kỹ thuật cấp quốc gia (ViSEF) — lĩnh vực Khoa học máy tính / Phần mềm hệ thống.
> **Nhóm:** 2 học sinh THPT (dự án tập thể).
> **Ngày lập:** 2026-07-23 · **Mùa thi nhắm tới:** 2026–2027 (quỹ ~5–6 tháng).
> **Vị trí trong repo:** `research/vsgeo-bench/` — tách riêng khỏi web app (xem §14).

---

## 0. Tóm tắt điều hành (Executive summary)

Các mô hình AI (GPT, Gemini, Claude…) đang được học sinh Việt dùng để học Toán, nhưng **chưa có công cụ đo lường khách quan** xem chúng giải **hình học không gian** tốt đến đâu, sai ở đâu, và có đáng tin không — đặc biệt với **đề tiếng Việt** và **đáp án dạng mở** (căn thức, tọa độ, tỉ số) chứ không chỉ trắc nghiệm.

VSGeo-Bench giải quyết khoảng trống đó bằng các sản phẩm gắn kết:

1. **Bộ dữ liệu** ~300 bài hình không gian THPT tiếng Việt, phân loại nhiều chiều, có đáp án chuẩn.
2. **Máy chấm tự động (oracle)** dựa trên một engine ký hiệu chính xác — xác minh được *đáp án mở* ở quy mô lớn (đóng góp phương pháp luận chính).
3. **Bộ đánh giá + phân tích:** xếp hạng model theo chủ đề, **bộ biến đổi có kiểm soát** để đo suy luận-thật-hay-dò-mẫu, **bảng phân loại lỗi**, chỉ số **"tự tin nhưng sai"**, và **một khảo sát giáo viên** làm điểm tham chiếu con người (góc an toàn giáo dục).

**Vì sao đạt tầm quốc gia:** giao điểm *tiếng Việt × hình học không gian 3D × chấm ký hiệu tự động × kiểm thử độ bền* là **chưa có tiền lệ (theo hiểu biết của nhóm)**; sản phẩm **đo được, tái lập được, công khai được**, và có **thông điệp tác động** (AI dạy Toán đáng tin cho học sinh Việt) được **kiểm chứng bằng cả số liệu máy lẫn cảm nhận giáo viên thật**.

---

## 1. Câu hỏi khoa học & giả thuyết

**Câu hỏi trung tâm:** *Các mô hình AI hiện nay giải hình học không gian THPT tiếng Việt tốt đến đâu, sai ở đâu và vì sao, và chúng có thực sự "suy luận không gian" hay chỉ "dò mẫu"?*

Bốn giả thuyết kiểm chứng được:

| Mã | Giả thuyết | Cách kiểm chứng |
|----|-----------|-----------------|
| **H1** | Độ chính xác tụt mạnh ở bài **cần dựng hình phụ** so với bài tọa độ hóa trực tiếp. | So sánh accuracy theo cờ `requires_auxiliary_construction`; hồi quy logistic. |
| **H2** | Model **giòn**: biến đổi bảo toàn toán học (đổi tên đỉnh, xoay khối) làm điểm rớt đáng kể → dò mẫu, không suy luận. | Đo "khoảng rớt robustness" giữa bài gốc và biến thể. |
| **H3** | Model **"tự tin nhưng sai"**: trả lời quả quyết ngay cả khi sai — và **con người (giáo viên) cũng bị đánh lừa**. | Đo tỉ lệ câu sai trình bày quả quyết (calibration, §6); đối chiếu với khảo sát giáo viên (§8). |
| **H4** | **Lai thắng thuần**: LLM (dịch đề) + engine (giải ký hiệu) vượt LLM thuần về tính chính xác. | So accuracy hệ lai vs LLM thuần trên cùng tập, nhất là bài đáp án căn/phân số. |

**Không gian phủ (scope):** hình học không gian lớp 11–12 (khối đa diện, quan hệ song song/vuông góc, khoảng cách, góc, mặt cầu–nón–trụ, phương pháp tọa độ Oxyz). **Ngoài phạm vi:** hình học phẳng, giải tích, đại số, xác suất.

---

## 2. Định vị so với công trình liên quan (novelty)

- **GSM8K, MATH (tiếng Anh):** chấm bằng khớp đáp án số/chuỗi đơn giản, không phải hình học 3D, không tiếng Việt, không xét độ bền.
- **Benchmark NLP tiếng Việt** hiện có (đọc hiểu, hỏi đáp) **không** đụng tới suy luận hình học không gian.
- **Chấm đáp án mở:** MATH có chuẩn hóa đáp án nhưng hạn chế; chấm đáp án hình học **tương đương sai khác phép dời hình** và **tương đương căn thức chính xác** là khoảng trống thật.
- **Kiểm thử độ bền (perturbation/robustness):** phổ biến trong NLP nhưng hiếm khi áp cho Toán không gian tiếng Việt.

**Tính mới của VSGeo-Bench = giao điểm:** *tiếng Việt × hình không gian 3D × chấm ký hiệu tự động × robustness probing.* Phát biểu trung thực: *"bộ chuẩn đầu tiên cho suy luận hình học không gian tiếng Việt có máy chấm ký hiệu tự động, theo hiểu biết của nhóm."*

---

## 3. Bộ dữ liệu VSGeo-Bench

### 3.1 Quy mô
- **~300 bài "hạt giống" (seed)** chất lượng cao. Ưu tiên **chất lượng > số lượng** để bảo vệ được từng bài.
- Qua bộ biến đổi (§5) → **vài nghìn "instance"** để chấm, mà không cần soạn tay thêm.

### 3.2 Nguồn & bản quyền
- **Lõi (~60%):** đề THPT QG, đề thi thử, SGK — **chuẩn hóa lại lời văn** (không chép nguyên văn), **ghi nguồn** trong metadata.
- **Mở rộng (~40%):** **biến thể tự sinh** có kiểm soát, dùng engine bảo chứng đáp án đúng → an toàn bản quyền, dễ công bố công khai, kiểm soát được độ khó.
- Bản dataset công khai nghiêng về phần tự sinh + phần đề đã chuẩn hóa có trích nguồn hợp lệ.

### 3.3 Lược đồ (schema) mỗi bài

```jsonc
{
  "id": "vsgeo-0137",
  "source": { "type": "exam|textbook|synthetic", "ref": "THPTQG 2019 - mã 101 - câu 43", "license": "..." },
  "statement_vi": "Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a...",
  "figure": { "points": [], "coords_given": true },   // nếu đề cho tọa độ
  "answer": {
    "canonical": "a*sqrt(6)/3",        // dạng chuẩn để oracle so khớp
    "type": "rational|surd|ratio|point|vector|plane_eq|line_eq|boolean|mcq",
    "human_note": "khoảng cách từ A đến (SBD)"
  },
  "tags": {
    "topic": ["khoang_cach", "vuong_goc"],          // nhiều nhãn
    "answer_form": "surd",
    "difficulty": 3,                                  // 1..4
    "requires_auxiliary_construction": true
  },
  "solution_ref_vi": "Các bước lời giải mẫu (để đối chiếu taxonomy lỗi)",
  "verified_by_engine": true                          // engine có tự giải & khớp không
}
```

### 3.4 Các chiều phân loại
- **Chủ đề:** thể tích & khối đa diện · song song–vuông góc · khoảng cách (điểm–mặt, đường–đường chéo nhau) · góc (đường–mặt, mặt–mặt) · mặt cầu/nón/trụ · tọa độ Oxyz.
- **Dạng đáp án:** số hữu tỉ · biểu thức căn · tỉ số · tọa độ điểm/vector · phương trình mặt/đường · đúng-sai · trắc nghiệm.
- **Độ khó:** 1 (nhận biết) → 4 (vận dụng cao).
- **Cần hình phụ?** có/không (biến then chốt của H1).

### 3.5 Đáp án chuẩn kép (điểm nhấn độ chặt)
Mỗi bài có đáp án **do người soạn** *và* (nếu được) **do engine xác minh**. Chỗ hai nguồn lệch nhau → **cờ đỏ**, giải quyết tay và ghi lại. Việc đối chiếu kép này vừa nâng chất lượng ground truth vừa là bằng chứng quy trình khoa học khi phản biện.

---

## 4. Máy chấm tự động — oracle (ngôi sao phương pháp luận)

### 4.1 Vấn đề
Chấm **đáp án mở** rất khó: `√6/3` = `0.8164…` = `sqrt(6)/3`; đáp án tọa độ phụ thuộc hệ trục; phương trình mặt phẳng tương đương sai khác nhân vô hướng.

### 4.2 Thiết kế nhiều lớp
1. **Trích đáp án:** yêu cầu model kết luận trong `\boxed{...}`; parser lấy ra biểu thức cuối.
2. **Chuẩn hóa ký hiệu:** dùng **lớp scalar chính xác của engine** (`api/_lib/kernel/scalar.ts`, `exactForm.ts`) — hữu tỉ hóa mẫu, rút gọn căn, quy đồng — rồi so khớp chính xác.
3. **Tương đương có cấu trúc:**
   - Phương trình mặt/đường: tương đương **sai khác nhân vô hướng khác 0**.
   - Tọa độ điểm/vector: chuẩn hóa về **hệ trục do đề quy định**; nếu đề không cố định hệ trục → xét bất biến qua **phép dời hình**.
4. **Dự phòng số học:** với ca siêu việt/không rút gọn được ký hiệu → so sánh số với sai số cho phép (epsilon).

### 4.3 Tự kiểm định oracle (chống phản biện "sao biết máy chấm đúng?")
- Lấy **mẫu ngẫu nhiên** các cặp (đáp án model, phán quyết máy chấm), **chấm tay** độc lập.
- Báo cáo **precision/recall** của máy chấm (tỉ lệ phán "đúng/sai" khớp người).
- Mục tiêu: máy chấm đạt độ tin cậy đủ cao; các ca máy không quyết được → đánh dấu "cần soát tay" thay vì đoán bừa.

### 4.4 Ranh giới sở hữu (quan trọng cho ViSEF)
- Engine ký hiệu là **công cụ có sẵn** (công trình trước của thành viên nhóm), được **ghi nguồn minh bạch**.
- Phần **2 em tự làm & phải bảo vệ được:** logic *tương đương đáp án*, lớp trích xuất, giao thức chấm, và toàn bộ phân tích. Hai em **không cần** viết lại số học chính xác nội bộ, nhưng **phải giải thích được** vì sao hai đáp án được coi là tương đương.

---

## 5. Bộ "biến đổi có kiểm soát" (robustness probe — chương gây ấn tượng)

Từ mỗi bài gốc, sinh biến thể **bảo toàn đáp án (hoặc biến đổi đáp án theo quy tắc biết trước)**:

| Biến đổi | Mô tả | Đáp án kỳ vọng |
|----------|-------|----------------|
| Đổi tên đỉnh | ABCD → MNPQ | Không đổi |
| Xoay/phản chiếu | Đổi hệ tọa độ, cùng cấu hình | Không đổi (bất biến dời hình) |
| Đổi tỉ lệ cạnh | cạnh `a` → `2a` | Co giãn dự đoán được (vd thể tích ×8) |
| Diễn đạt lại | Viết lại lời văn tiếng Việt | Không đổi |
| Chèn nhiễu | Thêm dữ kiện thừa không dùng | Không đổi |

**Chỉ số đo:**
- **Khoảng rớt robustness** = accuracy(gốc) − accuracy(biến thể). Rớt nhiều ⇒ dò mẫu (ủng hộ H2).
- **Độ nhất quán nội tại** = tỉ lệ model trả lời *tương đương* trên cùng một họ biến thể.

Kỹ thuật này có nền tảng học thuật (kiểm thử độ bền / adversarial paraphrase) → **trích dẫn được, phản biện được**.

---

## 6. Model & giao thức đánh giá

### 6.1 Dàn model
GPT (mới nhất) · Gemini (pro + flash) · Claude · ≥1 model mở (Qwen/Llama) · **hệ lai "engine-assisted"** (LLM dịch đề → engine giải) như **hệ tham chiếu topline**, ghi nguồn rõ, **không** nhận là phát minh của 2 em.

### 6.2 Giao thức
- Prompt **cố định**, có 2 biến thể: **zero-shot** và **chain-of-thought**.
- **k = 3–5 lần/bài** (ngân sách thoải mái) để đo **phương sai**.
- Nhiệt độ (temperature) cố định, ghi lại; trích đáp án bằng parser xác định.
- Ghi log đầy đủ output thô để phục vụ taxonomy lỗi (§7) và khảo sát (§8).

### 6.3 Chỉ số
- **Độ chính xác:** tổng + theo chủ đề + theo độ khó + theo cờ hình phụ.
- **Khoảng rớt robustness** & **độ nhất quán** (§5).
- **Tỉ lệ "tự tin nhưng sai"** (calibration): câu sai nhưng trình bày quả quyết, không tự kiểm.
- **Chi phí & độ trễ** mỗi bài (tính thực dụng khi triển khai).

### 6.4 Thống kê
- **Khoảng tin cậy 95%** bằng bootstrap.
- **Kiểm định McNemar** cho khác biệt giữa các model trên cùng tập bài (dữ liệu ghép cặp).
- **Hồi quy logistic:** đặc trưng bài (độ khó, cần hình phụ, dạng đáp án…) → xác suất model sai. (Tùy chọn "trần cao" — xem §10.)

---

## 7. Bảng phân loại lỗi (chiều sâu định tính)

Phân loại lỗi từ **output thật** của model:

1. **Lỗi tưởng tượng không gian** — nhận sai quan hệ 3D (đoạn nào vuông góc, hình chiếu ở đâu).
2. **Lỗi dựng hình phụ** — dựng sai hoặc "bịa" hình phụ.
3. **Lỗi áp dụng định lý/công thức** — chọn sai định lý, dùng sai công thức.
4. **Lỗi số học/đại số** — đúng phương pháp, sai tính toán.
5. **Lỗi đọc đề** — hiểu sai đề tiếng Việt, sai đơn vị/giả thiết.
6. **Lỗi trình bày/không kết luận** — thiếu đáp án cuối, tự mâu thuẫn.

**Quy trình chuẩn khoa học:** 2 em **dán nhãn độc lập** một mẫu → đo **độ đồng thuận (Cohen's κ)** → thảo luận thống nhất → chốt hướng dẫn dán nhãn (codebook). κ cao ⇒ taxonomy khách quan, không tùy tiện.

---

## 8. Khảo sát giáo viên — điểm tham chiếu con người

Một nghiên cứu con **nhỏ, nhanh, rẻ** để (a) kiểm chứng H3 ở phía người dùng thật và (b) tăng "tác động" cho hội đồng.

### 8.1 Mục tiêu
Đo xem **giáo viên Toán có bị lời giải AI "trôi chảy nhưng sai" đánh lừa không**, và cảm nhận của họ về độ tin của model có khớp với số liệu benchmark không.

### 8.2 Thiết kế
- **Đối tượng:** ~8–15 giáo viên Toán THPT tự nguyện tham gia.
- **Công cụ chính — "thử nghiệm tin cậy mù":** cho xem một tập lời giải do AI sinh (trộn đúng/sai, **ẩn tên model**); mỗi lời giải, giáo viên: (a) phán đúng/sai, (b) cho **điểm tin tưởng** (thang Likert 1–5).
- **Đối chiếu:** phán đoán giáo viên ↔ ground truth (oracle) ↔ accuracy benchmark.

### 8.3 Kết quả kỳ vọng
- **Tỉ lệ "bị đánh lừa"**: bao nhiêu % lời giải sai vẫn được giáo viên chấm đúng / cho điểm tin cao → bằng chứng người-thật cho H3.
- **Tương quan** giữa "độ tin cảm nhận" và "đúng thực tế".
- (tùy chọn) So xếp hạng model theo cảm nhận giáo viên vs theo benchmark.

### 8.4 Đạo đức (bắt buộc — thí nghiệm trên người)
- **Phiếu đồng thuận có thông tin (informed consent)**; tham gia tự nguyện, rút lui được.
- **Ẩn danh**, chỉ thu thông tin tối thiểu (số năm giảng dạy, khối lớp) — không thu danh tính.
- Tuân thủ quy định thí nghiệm trên người của ViSEF/ISEF (khảo sát người lớn, rủi ro tối thiểu); **xin phê duyệt hội đồng trường trước khi chạy** nếu quy chế yêu cầu.
- **Quy mô nhỏ**: báo cáo như *nghiên cứu tham chiếu*, không khẳng định tổng quát cho toàn bộ giáo viên.

---

## 9. Sản phẩm, tác động & đạo đức

### 9.1 Sản phẩm
- **Dataset + code công khai** (GitHub) kèm **datasheet** mô tả nguồn, quy trình, hạn chế.
- **Dashboard xếp hạng** trực quan (tận dụng frontend React sẵn có của dự án).
- **Báo cáo NCKH + poster + nhật ký nghiên cứu (logbook)** + kịch bản luyện phản biện.
- **Trần cao hơn (nếu dư thời gian):** một *preprint/bài báo ngắn*.

### 9.2 Thông điệp tác động
Công cụ đánh giá khách quan mức độ **đáng tin của AI khi dạy Toán** cho học sinh Việt; phơi bày rủi ro **"tự tin nhưng sai"** (được chứng thực bằng cả máy lẫn giáo viên thật); là **tài nguyên mở** cho cộng đồng giáo dục & nghiên cứu.

### 9.3 Đạo đức & liêm chính học thuật (bắt buộc cho ViSEF)
- **Minh bạch nguồn dữ liệu** và giấy phép; không chép nguyên văn có bản quyền.
- **Ghi nhận rõ** phần công cụ có sẵn (engine) vs phần 2 em tự làm.
- **Báo cáo trung thực**, kể cả kết quả bất lợi; công bố hạn chế của phương pháp.
- Tuân thủ điều khoản sử dụng API của các nhà cung cấp model và quy định thí nghiệm trên người (§8.4).

---

## 10. Phạm vi & những thứ KHÔNG làm (YAGNI)

**Trọng tâm:** benchmark + máy chấm + phân tích + khảo sát nhỏ. **Không** trong phạm vi:
- Không xây solver AI mới, không huấn luyện/tinh chỉnh model.
- Không làm app di động, không hệ thống người dùng.
- Không mở sang hình học phẳng/giải tích.
- Khảo sát giáo viên (§8) giữ **quy mô nhỏ, tham chiếu** — không phải nghiên cứu xã hội học lớn.
- Hồi quy logistic (§6.4) và preprint (§9.1) là **tùy chọn "trần cao"** — cắt trước nếu thời gian ép.

---

## 11. Chia việc 2 em & tiến độ 5–6 tháng

### 11.1 Vai trò
| | **Em 1 — Dữ liệu & Taxonomy** | **Em 2 — Harness & Phân tích** |
|---|---|---|
| Sở hữu | Nguồn đề, chuẩn hóa, schema, đáp án chuẩn, dán nhãn lỗi, **thiết kế toán** của biến đổi | Pipeline gọi model, tích hợp oracle, thống kê, dashboard, **tự động hóa** biến đổi |
| Kỹ năng rèn | Toán không gian, phân loại, quy trình dữ liệu | Lập trình, API, thống kê, trực quan hóa |
| Khảo sát GV (§8) | Soạn phiếu, tuyển & làm việc với giáo viên | Phân tích số liệu khảo sát, đối chiếu benchmark |
| Cùng làm | Câu hỏi NC, thiết kế biến đổi, viết báo cáo, poster, **luyện phản biện** | |

### 11.2 Lịch (mốc kiểm tra rõ ràng)
| Tháng | Mục tiêu | Đầu ra kiểm được |
|-------|----------|------------------|
| **T1** | Schema + oracle v1 + 50 bài pilot + chốt giao thức | Chấm tự động chạy trên 50 bài, khớp tay ≥ ngưỡng |
| **T2** | Dataset lên ~300 bài + harness gọi model chạy end-to-end | 300 bài có metadata + 1 model chạy hết |
| **T3** | Chạy eval đầy đủ + bộ biến đổi + **soạn phiếu khảo sát** | Bảng accuracy sơ bộ + số liệu robustness + phiếu khảo sát |
| **T4** | Phân tích + taxonomy (κ) + dashboard + **chạy khảo sát GV** | Bảng lỗi có κ + dashboard + dữ liệu khảo sát |
| **T5** | Báo cáo + poster + luyện phản biện | Bản báo cáo hoàn chỉnh + poster |
| **T6** | Dự phòng / mở rộng (preprint, thêm model) | Bản công khai + (tùy chọn) preprint |

---

## 12. Rủi ro & cách chặn

| Rủi ro | Ảnh hưởng | Cách chặn |
|--------|-----------|-----------|
| **Nhiễm dữ liệu** (model đã thấy đề thi thật) | Điểm ảo cao | So *đề thật vs biến thể tự sinh*; dùng perturbation; báo cáo phần chênh như một phát hiện |
| **Oracle chấm sai** | Sai toàn bộ kết quả | Tự kiểm định precision/recall + soát tay mẫu; ca không chắc → đánh dấu, không đoán |
| **Nghi ngờ sở hữu khi phản biện** | Mất điểm liêm chính | 2 em làm dataset/harness/taxonomy; engine ghi nguồn rõ; giải thích được logic tương đương |
| **Phình phạm vi** | Không kịp | Làm lõi (§3–4,§6) trước; §6.4 hồi quy, §8 khảo sát mở rộng, preprint là tùy chọn |
| **Bản quyền khi công bố** | Rắc rối pháp lý | Chuẩn hóa lời + ghi nguồn + nghiêng phần tự sinh cho bản public |
| **API đổi/hỏng giữa chừng** | Kết quả không tái lập | Ghi phiên bản model + ngày chạy + log thô; cố định seed/nhiệt độ nơi có thể |
| **Thí nghiệm trên người (khảo sát)** | Vướng quy chế/đạo đức | Phiếu đồng thuận + ẩn danh + xin phê duyệt hội đồng trường; N nhỏ → không tổng quát hóa |

---

## 13. Tiêu chí thành công

**Mức "đủ nộp":** 300 bài có đáp án chuẩn; oracle tự kiểm định đạt độ tin cậy báo cáo được; ≥4 model được xếp hạng theo chủ đề; taxonomy lỗi có κ; báo cáo + poster hoàn chỉnh.

**Mức "tranh giải Nhất":** thêm bằng chứng H1–H4 với thống kê (CI, McNemar); bộ biến đổi cho thấy khoảng rớt robustness rõ; chỉ số "tự tin nhưng sai" định lượng được **và được khảo sát giáo viên chứng thực**; dataset + code + dashboard **công khai, tái lập được**; (tùy chọn) preprint.

---

## 14. Cấu trúc thư mục & vị trí trong repo

Dự án NCKH được **tách riêng** khỏi web app (`src/`, `api/`) để tự chứa và dễ công bố:

```
research/vsgeo-bench/
├── README.md              # cửa ngõ dự án (mô tả, trạng thái, cách điều hướng)
├── docs/
│   └── design.md          # bản thiết kế này (spec)
├── data/
│   ├── seeds/             # ~300 bài hạt giống (JSON theo schema §3.3)
│   └── schema/            # định nghĩa schema + bộ kiểm tra hợp lệ
├── grader/                # máy chấm oracle (§4) — dùng lại engine ký hiệu
├── harness/               # pipeline gọi model + trích đáp án (§6)
├── perturbations/         # bộ biến đổi có kiểm soát (§5)
├── analysis/              # thống kê + taxonomy lỗi (§6.4, §7)
├── survey/                # phiếu + dữ liệu khảo sát giáo viên (§8)
└── dashboard/             # UI xếp hạng (có thể tái dùng frontend web)
```

**Tái sử dụng engine:** vì cùng repo (monorepo), `grader/` **import** phần cần thiết từ `api/_lib/kernel/` (đặc biệt `scalar.ts`, `exactForm.ts`). Khi tách ra **repo công khai độc lập** để nộp/công bố, **sao chép (vendor)** các phần engine đó vào `grader/` kèm ghi nguồn + giấy phép, để repo con tự đứng được.

**Vì sao monorepo (chung repo) thay vì repo riêng ngay:** dễ dùng engine làm oracle và đồng bộ trong lúc phát triển; thư mục đã tự chứa nên bất cứ lúc nào cũng bê ra thành repo Git riêng được (bằng `git subtree split` hoặc sao chép). *Nếu muốn repo hoàn toàn riêng ngay từ đầu, đây là điểm quyết định cần chốt.*

---

## 15. Thuật ngữ

- **Oracle / máy chấm:** thành phần tự động phán đáp án model đúng/sai bằng so khớp ký hiệu chính xác.
- **Seed / instance:** *seed* = bài gốc do người soạn; *instance* = một biến thể sinh ra từ seed để chấm.
- **Robustness gap:** chênh lệch độ chính xác giữa bài gốc và biến thể bảo toàn toán học.
- **Calibration ("tự tin nhưng sai"):** mức độ model trình bày quả quyết dù đáp án sai.
- **κ (Cohen's kappa):** hệ số đo độ đồng thuận giữa hai người dán nhãn.
