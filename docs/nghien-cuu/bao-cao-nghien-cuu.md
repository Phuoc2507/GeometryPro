# Nghiên cứu và phát triển hệ thống giải toán hình học không gian dựa trên kiến trúc Neuro‑Symbolic, tích hợp tối ưu prompt và bộ dữ liệu chuẩn tiếng Việt

*A Neuro‑Symbolic System for Solid Geometry Problem Solving with Prompt Optimization and a Vietnamese Benchmark Dataset*

> **Trạng thái bản thảo:** v0.5 — khung đầy đủ; **Phương pháp & Kiến trúc** đã điền chi tiết đối chiếu mã nguồn; Phụ lục A–E + trích dẫn thật; **§5.7 có kết quả đo thật** (engine‑replay **66/66**). Bộ dữ liệu hiện gồm **65 ca máy‑sinh đã kiểm chứng** (40 synthetic tự soạn + kiểm hai chiều, 25 capture) — **chưa có đề từ SGK/đề thi thật** (đây là phần mở rộng do nhóm/học sinh thực hiện). Còn lại: số liệu end‑to‑end/baseline (cần khoá API). Nguyên tắc: **không dùng số bịa**; mọi hạn chế nêu thẳng ở §10.
> **Lĩnh vực dự thi (đề xuất):** Phần mềm hệ thống / Robot và máy thông minh (Hệ thống thông minh).
> **Nguyên tắc biên tập:** chỉ ghi những gì đã hiện thực trong mã nguồn hoặc sẽ đo được; **không dùng con số minh hoạ chưa kiểm chứng**. Phần dự kiến luôn ghi rõ là dự kiến.

---

## Tóm tắt (Abstract)

Hình học không gian là một trong những mạch kiến thức trừu tượng và khó nhất ở bậc trung học phổ thông. Các mô hình ngôn ngữ lớn (LLM) hiện nay khi giải trực tiếp loại toán này thường **ảo giác**: bịa toạ độ, tính sai, hoặc đưa ra đáp số "nghe hợp lý" nhưng không kiểm chứng được. Nghiên cứu này đề xuất và hiện thực một hệ thống **Neuro‑Symbolic** cho bài toán hình học không gian, vận hành theo nguyên tắc **"LLM chỉ DỊCH đề thành mô hình hình thức; một ENGINE tất định TÍNH và TỰ KIỂM"**.

Hệ thống gồm ba khối: (1) **Khối thần kinh (Neural)** — một LLM đọc đề (văn bản/ảnh), chọn một hệ toạ độ và dịch đề thành một *Kế hoạch dựng hình* (Construction Plan) ở dạng JSON, kèm một **cổng từ chối (abstain gate)** buộc mô hình *thà từ chối còn hơn bịa* khi đề thiếu điều kiện; (2) **Khối ký hiệu (Symbolic)** — một engine hình học/giải tích **tất định, số học chính xác** (tự phát triển) tính ra đáp số ở **dạng căn đúng** (ví dụ `2√2/3`, `10−2√7`, `64/3`) và tự kiểm tính hợp lệ; (3) **Khối ứng dụng (Application)** — trực quan hoá 3D bằng React Three Fiber.

Đóng góp chính: (i) một kiến trúc Neuro‑Symbolic **an toàn** cho hình học *không gian* (phần lớn công trình trước tập trung hình học *phẳng*); (ii) cơ chế **từ chối theo bất biến affine** giúp hệ thống không đưa đáp số khi không đủ căn cứ; (iii) một **bộ dữ liệu chuẩn (benchmark) tiếng Việt** đầu tiên cho dạng toán này cùng một quy trình đánh giá **tất định, tái lập được**; (iv) một phương pháp **tối ưu prompt tự động** cho khối dịch.

**Từ khoá:** neuro‑symbolic, hình học không gian, mô hình ngôn ngữ lớn, suy luận ký hiệu, chống ảo giác, benchmark tiếng Việt, trực quan hoá 3D.

---

## 1. Đặt vấn đề

### 1.1. Bối cảnh
Trong chương trình Toán THPT, hình học không gian đòi hỏi học sinh dựng hình trong đầu, phối hợp quan hệ vuông góc – song song – khoảng cách – góc – thể tích. Đây là nội dung có tỉ lệ học sinh gặp khó cao, một phần vì thiếu công cụ **trực quan hoá** và **kiểm tra lời giải** tức thời.

### 1.2. Khoảng trống
Hai hướng tiếp cận bằng máy hiện đều có hạn chế:
- **LLM giải trực tiếp:** linh hoạt về ngôn ngữ nhưng **không đáng tin** — tính toán số học dài dễ sai, hay "bịa" đáp số, và không phân biệt được khi nào đề **không đủ dữ kiện** để có đáp số.
- **Phần mềm hình học truyền thống / CAS:** tính chính xác nhưng **không đọc được đề bằng ngôn ngữ tự nhiên**, đòi hỏi người dùng tự hình thức hoá bài toán.

Khoảng trống là: *chưa có hệ thống vừa đọc được đề tiếng Việt, vừa tính chính xác – kiểm chứng được – và biết từ chối khi thiếu dữ kiện, lại vừa trực quan hoá 3D cho mục đích giáo dục.*

### 1.3. Ý tưởng cốt lõi
> **LLM chỉ DỊCH. ENGINE tất định TÍNH và TỰ KIỂM.**

Tách bạch vai trò này cho phép tận dụng điểm mạnh ngôn ngữ của LLM mà **cô lập** nó khỏi khâu dễ sai nhất (tính toán), đồng thời đưa **tính kiểm chứng** vào lõi hệ thống.

---

## 2. Mục tiêu và câu hỏi nghiên cứu

### 2.1. Mục tiêu
1. Xây dựng hệ thống Neuro‑Symbolic giải và trực quan hoá bài toán hình học không gian THPT, trả về **đáp số kiểm chứng được** và **mô hình 3D**.
2. Thiết kế cơ chế **từ chối an toàn** để hệ thống không đưa đáp số khi đề không đủ điều kiện.
3. Xây dựng **bộ dữ liệu chuẩn tiếng Việt** và một **quy trình đánh giá tái lập được**.
4. Nghiên cứu **tối ưu prompt tự động** cho khối dịch và đo mức cải thiện.

### 2.2. Câu hỏi nghiên cứu
- **CH1.** Việc tách "LLM dịch – engine tính" có làm tăng độ chính xác và độ tin cậy so với để LLM giải trực tiếp không? Tăng bao nhiêu?
- **CH2.** Cổng từ chối theo bất biến affine có giảm được tỉ lệ "đáp số sai được đưa ra một cách tự tin" (confidently wrong) không?
- **CH3.** Tối ưu prompt tự động có cải thiện tỉ lệ dịch đúng của khối Neural so với prompt viết tay không?
- **CH4.** Engine tất định trả **đáp dạng căn đúng** ở phạm vi dạng bài nào; giới hạn ở đâu?

### 2.3. Giả thuyết
Hệ Neuro‑Symbolic + cổng từ chối sẽ (a) đạt độ chính xác cao hơn LLM thuần trên tập bài giải được, và (b) **gần như loại bỏ** đáp số sai được đưa ra tự tin, đổi lại tăng tỉ lệ *từ chối có kiểm soát* trên các bài ngoài năng lực.

---

## 3. Tổng quan tình hình nghiên cứu (Related Work)

> *Mục này trình bày định vị; các trích dẫn đầy đủ để ở §11.*

- **AlphaGeometry / AlphaGeometry2 (DeepMind).** Kiến trúc neuro‑symbolic đạt trình độ huy chương IMO cho **hình học phẳng**, kết hợp một mô hình ngôn ngữ sinh "điểm phụ" với một engine suy diễn ký hiệu, huấn luyện trên khối dữ liệu tổng hợp khổng lồ. **Khác biệt của chúng tôi:** (i) mục tiêu là **hình học không gian 3D** và **tính toán đại lượng** (khoảng cách/góc/thể tích) + **trực quan hoá**, không phải chứng minh định lý phẳng; (ii) không huấn luyện lại mô hình trên trăm triệu mẫu, mà dùng LLM sẵn có + **tối ưu prompt**; (iii) hướng tới chi phí thấp, chạy được ở quy mô trường học.
- **Benchmark hình học không gian gần đây (SolidGeo, DynaSolidGeo, GeoSense…).** Cho thấy hình học *không gian* là hướng đang nổi và còn thiếu dữ liệu — càng thiếu với **tiếng Việt**. Bộ dữ liệu của chúng tôi bổ khuyết đúng khoảng trống này.
- **Tối ưu prompt tự động (APE, PromptBreeder, OPRO…).** Là nền tảng cho khối tối ưu prompt; chúng tôi áp dụng cho bài toán dịch đề → plan JSON và đo trên benchmark riêng.
- **Công cụ hình học ký hiệu (CAS/GeoGebra).** Chính xác nhưng không đọc ngôn ngữ tự nhiên; chúng tôi bổ sung lớp "hiểu đề" và lớp "từ chối an toàn".

**Định vị một câu:** *Chúng tôi đưa tinh thần neuro‑symbolic của AlphaGeometry sang hình học KHÔNG GIAN, thay "huấn luyện khổng lồ" bằng "engine tất định tự viết + tối ưu prompt + từ chối an toàn", và công bố benchmark tiếng Việt đầu tiên cho dạng toán này.*

---

## 4. Phương pháp và kiến trúc hệ thống

### 4.1. Tổng quan luồng xử lý
```
Đề bài (văn bản/ảnh tiếng Việt)
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ KHỐI NEURAL — LLM DỊCH ĐỀ                                    │
│  • Đọc đề, CHỌN một hệ toạ độ Oxyz thuận tiện                │
│  • Xuất "Construction Plan" JSON: toạ độ + ràng buộc + câu   │
│    hỏi (queries). KHÔNG tự tính khoảng cách/góc/thể tích.    │
│  • CỔNG TỪ CHỐI: nếu đề không đủ điều kiện ⇒ {abstain:true}  │
└─────────────────────────────────────────────────────────────┘
        │  (Plan JSON hợp lệ theo schema)
        ▼
┌─────────────────────────────────────────────────────────────┐
│ KHỐI SYMBOLIC — ENGINE TẤT ĐỊNH                             │
│  • Số học CHÍNH XÁC (hữu tỉ + căn) ⇒ đáp DẠNG CĂN đúng      │
│  • Dựng hình, tính đại lượng, kiểm ràng buộc, TỰ KIỂM       │
│  • Nếu mô hình vi phạm điều kiện ⇒ trả "violation", KHÔNG    │
│    bịa đáp số                                                │
└─────────────────────────────────────────────────────────────┘
        │  (đáp số + đối tượng hình học + nhãn độ tin cậy/tier)
        ▼
┌─────────────────────────────────────────────────────────────┐
│ KHỐI APPLICATION — TRỰC QUAN HOÁ 3D                          │
│  • React Three Fiber dựng điểm/đường/mặt/khối + tương tác   │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
   Hình 3D + đáp số kiểm chứng được (+ lời giải/annotation)
```

### 4.2. Khối Neural — bộ dịch đề và cổng từ chối
- **Vai trò:** dịch đề sang *Construction Plan* JSON đúng lược đồ của engine; **tự chọn phương pháp toạ độ hoá**; **không** thực hiện tính toán.
- **Mô hình sử dụng (thực tế trong mã nguồn):** LLM được gọi qua một API dịch vụ (`api/_lib/vilao.js`), mô hình mặc định `ram/gemini-3.5-flash-low`. *(Điều này quan trọng cho tính trung thực của báo cáo: khối Neural hiện là LLM hosted làm nhiệm vụ DỊCH, không phải mô hình tự fine‑tune. Xem §8 về hướng thử nghiệm mô hình mã nguồn mở chạy offline.)*
- **Cổng từ chối (abstain gate):** prompt buộc mô hình chạy **3 câu hỏi cổng** trước khi giải, dựa trên **tính chất toán học** chứ không dựa từ khoá:
  1. Đáp có phụ thuộc **thang tuyệt đối** mà đề không cho? (góc và tỉ số là bất biến theo cỡ ⇒ luôn qua; chỉ độ dài/diện tích/thể tích mới cần thang.)
  2. Quan hệ cần kết luận có **bất biến affine** không, hoặc hình có **xác định tới đồng dạng** không?
  3. Engine có **kiểm** được không (quy về một truy vấn trả số/đối tượng, hoặc một khẳng định kiểm tại toạ độ cụ thể)?

  Nếu rơi vào "ô cấm" (ví dụ đề hỏi đại lượng đo tuyệt đối nhưng chỉ cho tỉ số giữa các cạnh, hình còn tỉ lệ tự do; hoặc bài quỹ tích/biện luận/bất đẳng thức tổng quát) ⇒ trả `{ "abstain": true, "abstain_reason": ... }`. Đây chính là cơ chế **"thà từ chối còn hơn bịa"**.
  *(Chi tiết & trích dẫn mã: `api/_lib/kernel-bridge/translatorPrompt.js`.)*

- **Cơ chế "thang chữ" (`scaleSymbol`).** Khi đề đo tuyệt đối trên một hình đã *rắn tới đồng dạng* nhưng cỡ cho bằng **một chữ** (ví dụ cạnh `a`, hoặc `a`, `2a`, `a√2` — đều là bội của cùng một `a`), khối dịch toạ‑độ‑hoá tại `a = 1` và thêm trường `"scaleSymbol":"a"`. Engine tính ở thang đó rồi **tự ghép lại** hệ số `×aᵏ` (k = 1 cho độ dài/khoảng cách, 2 cho diện tích, 3 cho thể tích), cho đáp đúng tổng quát dạng `d = a·√3/3`. Chỉ nhận đúng một chữ cái. *(Mã: `api/_lib/kernel-bridge/solveWithKernel.js`, hàm `applyScaleSymbol`/`scaleText`.)*
- **Đầu ra khối dịch.** Một *Construction Plan* JSON gồm: khai báo toạ độ điểm, các ràng buộc (⊥/∥/khoảng cách…), và danh sách **truy vấn** (`queries`) nêu đại lượng cần tính; hoặc một đối tượng `{abstain:true, abstain_reason}`. Bước gọi LLM bật *JSON mode* (`response_format: json_object`), timeout dịch mặc định 25 giây.

### 4.3. Khối Symbolic — engine hình học/giải tích tất định
Điểm khác biệt lớn nhất so với đề xuất "dùng SymPy": engine ở đây **tự phát triển**, với **số học chính xác (hữu tỉ + căn)** nên trả **đáp dạng căn đúng** thay vì số thập phân gần đúng — một đặc tính hiếm và đáng giá về mặt khoa học.

Thành phần (theo mã nguồn `api/_lib/kernel/**`):
- **Số học chính xác:** biểu diễn hữu tỉ + một căn; đối chiếu bằng số khi cần và **nhận dạng lại dạng căn đẹp**.
- **Thực thể hình học:** điểm, đường, mặt phẳng, mặt cầu.
- **Hai "dialect":** tổng hợp (synthetic) và toạ độ **Oxyz**.
- **Tầng compute:** khoảng cách · góc · thể tích · diện tích · phương trình · vị trí tương đối · giao · toạ độ điểm · tỉ số thể tích.
- **Phép dựng:** chân đường vuông góc, điểm đối xứng, trực tâm, tâm ngoại tiếp, mặt cầu ngoại tiếp…
- **Engine giải tích:** biểu thức, giải phương trình, tối ưu 1 & nhiều biến, khớp đa thức (kể cả ràng buộc đạo hàm), tích phân số, khối tròn xoay + thể tích giao.
- **Tự kiểm:** kiểm hội tụ số học, kiểm ràng buộc đề; nếu vi phạm ⇒ **violation** thay vì đáp số.

**Sơ đồ số học chính xác (chi tiết).** Kiểu số lõi là `Exact = { num, den, radicand }`, biểu diễn **một hữu tỉ nhân một căn không‑chính‑phương**: giá trị `= (num/den)·√radicand` (`radicand = 1` ⇒ hữu tỉ thuần). Phân số luôn rút gọn; thừa số chính phương được tách khỏi căn. Phép cộng/trừ **chỉ đóng khi cùng `radicand`** (ngoài phạm vi đó trả `null`, báo "rời trường"), còn nhân/chia/khai căn luôn thực hiện được. Mỗi đại lượng mang **song song** một số thực gần đúng (`approx`) và một dạng chính xác (`exact`); "đáp dạng căn đúng" là khi `exact ≠ null`. Vì độ dài của vector nói chung là số vô tỉ (rời trường), engine **giữ mọi công thức ở dạng bình phương** (ví dụ khoảng cách điểm–mặt dùng `|n·x+d|² / |n|²`) để phép toán luôn nằm trong trường số biểu diễn được.
*(Mã: `api/_lib/kernel/scalar.ts`, `entities.ts`, `vec3s.ts`.)*

**Ví dụ đáp dạng căn thật (trích từ bench/test):** `2√2/3` (thể tích tứ diện đều cạnh 2), `4√5/5` và `6√5/5` (khoảng cách điểm–mặt), `64/3` (thể tích chóp), và các đáp giải tích như `10 − 2√7`, `16/3`, `64√2/15`, `64π/9 − 512/9 + 24√3`.

**Mở rộng thực hiện trong quá trình nghiên cứu (2026‑08):** trước đây các đại lượng mặt cầu trả *số thập phân* (vd `113.0973`); nhóm đã mở rộng engine để trả **dạng π chính xác** — diện tích `36π`, `8π`; thể tích `36π`, `8√2π/3`; bán kính/đường kính căn chính xác (`√2`, `2√2`) — và cho **bộ so đáp benchmark hiểu π** để kiểm được. (Kèm 2 golden mặt cầu + cập nhật test; toàn bộ 1082 test đơn vị vẫn xanh.)

**Cơ chế tự kiểm (chi tiết).** Engine phát một **"chứng chỉ tự kiểm"** cho mỗi đáp: so **giá trị dạng chính xác** với một số thực được tính **độc lập**; nếu lệch quá dung sai (cỡ `1e-6·|giá trị|`) thì **loại bỏ dạng exact, hạ về số gần đúng** và đánh dấu `approximate` — tức hệ thống *thà báo gần đúng còn hơn khẳng định sai một dạng căn*. Với tích phân/khối tròn xoay, kết quả chỉ được gắn cờ `verified` khi sai số ước lượng đủ nhỏ. Ràng buộc hình (⊥, ∥, đồng phẳng, thuộc, khoảng cách, góc) được kiểm bằng `verify.ts`; nếu mô hình vi phạm điều kiện đề ⇒ trả **violation** thay vì đáp số.
*(Mã: `api/_lib/kernel/compute/answer.ts` — `certifyDistance/certifyScalar/certifyAngle`; `analysis/quadrature.ts`, `analysis/revolution.ts`; `verify.ts`.)*

**Quy mô hiện có (đo trên repo):** ~48 file mã, ~5.256 dòng cho riêng kernel; toàn repo **1082 test** đơn vị xanh.

**Giới hạn đã biết (nêu trung thực):** một số bài engine chưa giải và **từ chối an toàn** thay vì bịa (ví dụ tứ diện đều cạnh 3 trong ghi chú bench trả `ok:false` — là abstain an toàn, không phải đáp sai). Ranh giới này được báo cáo minh bạch, không che giấu.

### 4.4. Phân tầng an toàn (tier) và độ tin cậy
Hệ thống gán **nhãn mức an toàn** cho mỗi kết quả, neo tuyệt đối vào việc *engine có thực sự giải được* (`engineSolved`) và *đáp có ở dạng chính xác hay chỉ là số*. Nhãn này vừa phục vụ người dùng, vừa là biến quan trọng khi đánh giá (phân biệt "giải đúng dạng căn" / "giải ra số" / "từ chối").
Hệ thống dùng **3 mức**:
- **Mức 1 — đã kiểm chứng (verified):** engine thực sự giải được (`engineSolved`: kết quả `ok`, có đáp số hữu hạn, 0 vi phạm). Trên mức này còn một trục **độ chính xác**: `exact` (đáp ở dạng căn/hữu tỉ đúng) hay `numeric` (chỉ ra được số).
- **Mức 2 — đúng tổng quát ở "thang chữ":** bài dùng `scaleSymbol`; đáp *chữ* đúng tổng quát, nhưng số đo cụ thể chỉ đúng ở thang `a = 1` (dùng để minh hoạ, không khẳng định là số tuyệt đối).
- **Mức 3 — chưa kiểm chứng:** phân biệt `violation` / `error` / `unsolved` / `abstain`. Đây là lúc hệ thống **không** đưa đáp số tất định mà rơi về lời giải LLM chưa kiểm chứng (và được gắn nhãn rõ để người dùng biết).

Nhãn tier là **một nguồn sự thật duy nhất** về độ tin cậy, và là biến phân tầng quan trọng khi đánh giá (phân biệt "giải đúng dạng căn" / "giải ra số" / "từ chối").
*(Mã: `api/_lib/kernel-bridge/classifyTier.js`, `solveAssemble.js`.)*

### 4.5. Khối Application — trực quan hoá 3D
- **Công nghệ:** React + Vite + TypeScript, **React Three Fiber / three / drei**, Tailwind, Supabase, TanStack Query.
- **Quy mô hiện có (đo trên repo):** 17 trang, 136 component, 51 file dùng three.js.
- **Đường dữ liệu (chi tiết).** Người dùng nhập đề bằng chữ (`FloatingPromptBar`) hoặc ảnh (`DropZone`) ở trang `pages/Index.tsx`; `context/GeometryContext.tsx` gọi API và nhận về một `GeometryData` (lược đồ ở `src/types/geometry.ts`: các mảng `points/lines/planes/spheres/cylinders/cones/curves/…` cùng `revolutionSolids/sliceStacks/sectionCuts/timeline`). `components/3d/GeometryCanvas.tsx` (Canvas R3F, `OrbitControls`, `Grid`) co giãn – tái tâm – đổi hệ trục toán *z‑up* sang Three *y‑up* – tự canh khung hình, rồi `GeometryRenderer.tsx` ánh xạ **mỗi mảng dữ liệu sang một component `Animated*`** (`AnimatedPoint`, `AnimatedLine`, `AnimatedSphere/Cylinder/Cone`, `Plane3D`, `AnimatedRevolutionSolid`, `AnimatedSectionCut`…).
- **Ba chế độ vẽ** (`components/DrawModeSelector.tsx`): *Vẽ nhanh* (hình tĩnh một bước — **thử engine ký hiệu trước**, không được mới dùng LLM), *Vẽ kỹ* (phân loại đề, chi tiết hơn, có chuyển động), *Advance* (đa câu hỏi / hoạt hình liên tục — qua `api/analyze-advance.js`). Ngoài ra route thuần Neuro‑Symbolic `api/analyze-geometry-v2.js` là **đường nghiên cứu**: `solveProblem → planFromProblem (LLM dịch) → solvePlan (engine) → classifyTier`.
- **Công cụ phụ trợ phục vụ nghiên cứu:** tab **Test API Key** (`components/admin/TestApiKeyTab.tsx`) — gửi một đề qua **nhiều API key/mô hình cùng lúc**, đo token/thời gian, chuẩn hoá & so sánh JSON hình (đánh dấu khác biệt) — rất hữu ích để **so baseline**; bảng **problem_reports** ghi lại bài máy vẽ sai để mở rộng benchmark; **golden figures** (`GoldenTab`, `goldenStore.js`) lưu hình đúng đã được admin duyệt.

### 4.6. Tối ưu prompt tự động (đóng góp sẽ hiện thực)
Prompt của khối dịch được **tối ưu tự động** bằng vòng lặp tiến hoá:
1. Khởi tạo quần thể prompt (biến thể của prompt gốc).
2. **Hàm thích nghi (fitness)** = điểm trên **benchmark** (tỉ lệ dịch đúng + tỉ lệ engine giải được − phạt token).
3. Chọn lọc – lai ghép – đột biến qua nhiều thế hệ; ghi lại **đường cong fitness**.
4. So sánh prompt tối ưu với prompt viết tay và với baseline (APE/OPRO nếu khả thi).

**Biểu diễn cá thể — an toàn là trên hết:** GA **không đụng vào phần lõi** của prompt gốc (đặc biệt cổng từ chối). Mỗi cá thể (*genome*) chỉ chọn **BẬT/TẮT** và **sắp thứ tự** một số **câu chỉ dẫn bổ sung** (gene) gắn thêm sau prompt gốc. Không gian tìm kiếm này rẻ, tái lập, và dễ giải thích.

*Trạng thái: **đã hiện thực** (`scripts/prompt-opt/`), chạy được. Cỗ máy tiến hóa đã kiểm thử ở chế độ mô phỏng tất định (best accuracy 75%→100%, tái lập theo hạt giống). **Còn lại:** chạy trên LLM thật (`--provider vilao`, cần khoá API) để có đường cong fitness thật và so prompt‑tối‑ưu vs prompt‑tay. Chi tiết phương pháp: xem `docs/nghien-cuu/prompt-optimization.md`.*

---

## 5. Phương pháp đánh giá

### 5.1. Hạ tầng benchmark hiện có
Dự án đã có một **bộ đề mốc (golden)** và một **trình chạy đánh giá tất định**:
- Mỗi ca là một JSON `{ id, source, text?, plan, expect }`; chạy `plan` qua engine bằng chế độ **engine‑replay** (không gọi AI, miễn phí, offline) hoặc `--full` (chạy cả bước dịch, có gọi LLM).
- So đáp **theo giá trị số** với dung sai `≤ 1e-3·max(1,|đáp|)` (parse được `a√b/c`, `p/q`, thập phân) ⇒ chấp nhận nhiều cách viết cùng một đáp (ví dụ `√2` khớp `1.4142…`). Kết luận mỗi ca: `pass` / `regress-status` / `regress-answer` / `error`.
- **Hiện có 66 ca golden.** Trong đó **40 ca *synthetic*** (đề gốc tự soạn, đáp **kiểm hai chiều**: tính bằng công thức độc lập ↔ engine tính lại, chỉ nạp khi khớp) và **25 ca *capture*** (engine sinh). Đáp lưu ở dạng căn/π chính xác. *(Xem `du-lieu-benchmark.md` về công cụ gán nhãn `scripts/label/` và quy trình staging → soát → promote.)*
- Bài engine bó tay/từ chối được ghi vào bảng `problem_reports` kèm Plan JSON ⇒ nguồn "ca known‑gap" để bổ sung dữ liệu.
*(Mã: `api/_lib/bench/**` — `runGate.js`, `compareCase.js`, `captureCase.js`; `bench/golden/**`.)*

*(Mục tiêu: mở rộng lên hàng trăm ca, có gán nhãn dạng bài & độ khó.)*

### 5.2. Bộ dữ liệu chuẩn tiếng Việt (sẽ mở rộng)
- **Nguồn:** đề trong SGK và đề thi THPT (ghi rõ nguồn, tôn trọng bản quyền).
- **Gán nhãn:** mỗi bài gồm đề gốc, *plan* JSON, đáp số đúng (đã **xác minh thủ công**), dạng bài, độ khó, và nhãn "giải được / từ chối".
- **Quy mô mục tiêu:** ⟦CHỜ CHỐT⟧ ~150–300 bài, đa dạng dạng (khoảng cách, góc, thể tích, thiết diện, tương giao, tròn xoay…).
- **Công bố:** kèm tài liệu mô tả để tái sử dụng.
- **Công cụ gán nhãn (đã hiện thực):** `scripts/label/` — người dùng chỉ nhập *đề + đáp đã xác minh*, công cụ chạy engine, đối chiếu, và đóng gói golden (staging → soát → promote). Quy trình chi tiết: `docs/nghien-cuu/du-lieu-benchmark.md`.

### 5.3. Các chỉ số
- **Độ chính xác tuyệt đối** trên toàn tập và **theo dạng bài**.
- **Độ chính xác trên tập giải‑được** (loại các bài hệ thống từ chối) — đo năng lực engine.
- **Tỉ lệ từ chối đúng / từ chối sai** và đặc biệt **tỉ lệ "confidently wrong"** (đưa đáp số sai một cách tự tin) — chỉ số an toàn cốt lõi.
- **Độ trễ (latency)** trung bình & phân vị.
- **Độ tin cậy vận hành:** tỉ lệ không lỗi (crash/timeout/JSON sai) trên lô lớn.

### 5.4. Tách train/test (giữ tính khách quan)
Để tránh chỉ trích *"tối ưu prompt ngay trên tập test"*, benchmark được **tách train/test tất định, phân tầng theo dạng bài** (`scripts/eval/split.mjs`): **tối ưu prompt chỉ trên TRAIN**, còn **accuracy báo cáo đo trên TEST giữ riêng**. Split hiện tại (`bench/splits/default.json`, seed 42): train/test theo tỉ lệ 70/30.

### 5.5. So sánh baseline
Harness so sánh (`scripts/eval/baseline.mjs`) chạy các phương pháp trên **cùng** tập test:

| Phương pháp | Vai trò |
|---|---|
| LLM thuần (Gemini/GPT/Claude) giải trực tiếp | Baseline "AI tự giải", không engine, không tự kiểm |
| CAS thuần (SymPy) trên bài đã hình thức hoá — *baseline dự kiến, chưa hiện thực* | Cho thấy giới hạn khi thiếu lớp hiểu đề |
| Hệ của chúng tôi — prompt viết tay | Ablation trước tối ưu |
| Hệ của chúng tôi — prompt tối ưu | Cấu hình đề xuất |

Chỉ số đo — ngoài **accuracy**, nhấn mạnh hai chỉ số AN TOÀN:
- **Confidently‑wrong** = tỉ lệ đưa đáp số SAI một cách tự tin (càng thấp càng tốt).
- **Precision khi trả lời** = correct/(correct+wrong): khi hệ CÓ trả đáp thì đúng bao nhiêu %. Hệ Neuro‑Symbolic kỳ vọng CAO nhờ engine tự kiểm + từ chối an toàn.

> **Bảng kết quả (⟦CHỜ ĐO — chạy `--provider vilao`/không `--mock`, cần API key⟧):**
>
> | Phương pháp | Accuracy | Confidently‑wrong | Precision khi trả lời | Latency TB |
> |---|---|---|---|---|
> | LLM thuần | ⟦…⟧ | ⟦…⟧ | ⟦…⟧ | ⟦…⟧ |
> | Hệ (prompt tay) | ⟦…⟧ | ⟦…⟧ | ⟦…⟧ | ⟦…⟧ |
> | Hệ (prompt tối ưu) | ⟦…⟧ | ⟦…⟧ | ⟦…⟧ | ⟦…⟧ |
>
> *Chỉ điền số ĐO THẬT, tái lập được. (Harness đã kiểm thử ở chế độ mock; xem `docs/nghien-cuu/danh-gia.md`.)*

### 5.6. Đánh giá bởi chuyên gia (human evaluation)
Mời giáo viên Toán chấm **chất lượng lời giải/annotation** và **giá trị sư phạm của trực quan hoá 3D** trên một mẫu bài; báo cáo mức đồng thuận.

### 5.7. Kết quả bước đầu (số ĐO THẬT, cập nhật liên tục)

**Thí nghiệm 1 — Tính đúng đắn của engine ký hiệu (engine‑replay).**
Chạy `npm run bench:gate` (chế độ engine‑replay: đưa *plan đã đúng* qua engine, **tất định, không gọi AI**) trên toàn bộ **66 ca golden** hiện có:

| Chỉ số | Kết quả |
|---|---|
| Tổng số ca | 66 |
| Pass | **66 / 66 (100%)** |
| Sai đáp (regress‑answer) | 0 |
| Sai trạng thái (regress‑status) | 0 |
| Lỗi (error) | 0 |

Phân bố dạng truy vấn (66 ca, nhiều ca đa truy vấn): **38 thể tích, 15 diện tích, 10 khoảng cách, 28 toạ độ điểm/giao điểm, 5 tỉ số thể tích, 2 mặt cầu, 1 đường sinh, 1 giải tích**. Bao phủ: đa diện · khoảng cách điểm–mặt · mặt cầu · nón/trụ · nón cụt/chóp cụt · tỉ số thể tích · giao điểm (đường×mặt, đường×đường, đường×cầu). Đáp **dạng căn/π chính xác** — ví dụ thật: khoảng cách `2√3/3`, `√6/3`, `12/5`; thể tích `12π`, `8√2π/3`, `9√2/4`, `52π`; tỉ số `1/24`, `1/6`; toạ độ giao `7/4`.

> **Diễn giải trung thực — phép đo này đo cái gì và KHÔNG đo cái gì:**
> - ✅ Nó chứng minh **engine tất định tính đúng** trên tập ca mốc, và **thực sự trả đáp dạng căn** (không phải số thập phân gần đúng) — củng cố CH4.
> - ⚠️ Nó **chưa** đo khâu **LLM dịch đề → plan** (end‑to‑end). Muốn đo đầu‑cuối phải chạy `npm run bench:gate -- --full` (có gọi LLM, cần khoá API — *phần của bạn*).
> - ⚠️ Con số 100% chỉ nói "engine giải đúng khi ĐÃ có plan đúng, chưa phát hiện hồi quy trên rổ", **không** phải "độ chính xác hệ thống 100%".
> - ⚠️ **Nguồn dữ liệu:** 66 ca hiện là **máy‑sinh** (40 synthetic tự soạn có kiểm hai chiều công‑thức↔engine, 25 capture) — **chưa có đề từ SGK/đề thi thật**. Vì vậy chưa nên suy rộng ra "năng lực trên đề thực". Bổ sung đề thật (ghi nguồn, người tự giải xác minh) là hạng mục nhóm sẽ làm.

**Các thí nghiệm còn lại (⟦CHỜ CHẠY⟧):** (2) end‑to‑end `--full` để đo tỉ lệ dịch đúng; (3) so baseline LLM thuần; (4) đo *confidently‑wrong* và tỉ lệ từ chối; (5) latency. Các mục này cần khoá API và bộ dữ liệu mở rộng.

---

## 6. Đạo đức nghiên cứu và liêm chính học thuật

Mục này được đưa lên **trang trọng** vì hai mùa thi gần đây có nhiều dự án bị hậu kiểm/huỷ giải do nghi vấn "quá tầm" hoặc sao chép.

- **Minh bạch:** công bố **toàn bộ báo cáo, mã nguồn và benchmark** để cộng đồng đối chiếu.
- **Trung thực số liệu:** mọi con số trong báo cáo đều từ thí nghiệm tái lập được; không dùng số minh hoạ. Ô chưa đo ghi rõ `⟦CHỜ ĐO⟧`.
- **Ghi công đúng:** nêu rõ phần nào dùng thư viện/mô hình bên thứ ba (LLM hosted, three.js, Supabase…), phần nào do nhóm tự phát triển (engine ký hiệu, cổng từ chối, bộ dữ liệu).
- **Bản quyền & nguồn dữ liệu:** benchmark hiện gồm **đề gốc tự soạn (synthetic)** và ca capture — *không* chép từ tài liệu có bản quyền. Khi bổ sung đề từ SGK/đề thi, sẽ **ghi rõ nguồn** (sách, trang, năm) và không phát tán trái phép.
- **Phân định vai trò:** phần đóng góp của từng thành viên (khối lõi Neuro‑Symbolic vs khối trực quan hoá 3D) được ghi minh bạch.

---

## 7. Dự toán chi phí

Ngân sách mục tiêu **≤ 10 triệu VNĐ**, ưu tiên thuê tài nguyên theo giờ và tận dụng nguồn miễn phí.

| Hạng mục | Dự kiến (VNĐ) | Ghi chú |
|---|---|---|
| Thuê GPU theo giờ | ⟦2–6 triệu⟧ | Chỉ khi cần chạy mô hình mở/thử nghiệm; engine‑replay benchmark chạy offline miễn phí |
| Chi phí API (baseline GPT/Claude/Gemini) | ⟦1–3 triệu⟧ | Chỉ gọi lượng mẫu đủ ý nghĩa thống kê; tận dụng credit/model rẻ |
| Điện, Internet | ~1 triệu | Máy cá nhân |
| In ấn, poster, thuyết trình | ~1 triệu | |
| **Tổng** | **≈ 5–10 triệu** | Nằm trong ngân sách |

*(Chi phí nhân công: không tính, đây là đề tài nghiên cứu học sinh.)*

---

## 8. Kế hoạch thực hiện và phân công

### 8.1. Trạng thái hiện tại (đo trên repo)
- ✅ Engine ký hiệu (hình học + giải tích), số học chính xác — ~5.256 dòng; toàn repo 1082 test đơn vị xanh.
- ✅ Khối dịch LLM + cổng từ chối + phân tầng an toàn — đã nối chạy.
- ✅ Ứng dụng 3D (React Three Fiber) — 17 trang, 136 component.
- ◑ Benchmark tiếng Việt — **66 ca** (40 synthetic kiểm hai chiều + 25 capture); **chưa có đề SGK/đề thi thật** (phần học sinh làm).
- ◑ Đánh giá định lượng — engine‑replay 20/20 (§5.7); **harness so baseline + tách train/test đã hiện thực** (`scripts/eval/`, kiểm thử mock); còn số end‑to‑end thật (cần API key).
- ◑ Tối ưu prompt tiến hoá — **đã hiện thực & chạy được** (`scripts/prompt-opt/`); mock 75%→100% tái lập; còn chạy LLM thật.
- ◻️ Báo cáo khoa học — đang viết (bản này).

### 8.2. Lộ trình còn lại
| Giai đoạn | Nội dung | Ai chủ trì |
|---|---|---|
| GĐ1 | Mở rộng & xác minh benchmark tiếng Việt | Học sinh (nguồn + xác minh đáp) · Hỗ trợ: công cụ gán nhãn |
| GĐ2 | Chạy đánh giá định lượng + baseline (accuracy/latency/confidently‑wrong) | Học sinh (API key/chi phí) · Hỗ trợ: script & biểu đồ |
| GĐ3 | Hiện thực & chạy tối ưu prompt tiến hoá (đường cong fitness) | Hỗ trợ: code · Học sinh: chạy & hiểu |
| GĐ4 | Human evaluation với giáo viên | Học sinh tổ chức |
| GĐ5 | Hoàn thiện báo cáo, poster, slide, video demo | Đồng thực hiện; Học sinh trình bày |

### 8.3. Phân công module (mô hình hợp tác qua *interface* JSON)
- **Khối lõi Neuro‑Symbolic (khối 1 & 2):** trọng tâm nghiên cứu.
- **Khối trực quan hoá 3D (khối 3):** phát triển song song, giao tiếp qua **JSON Schema chung** → hai bên làm độc lập, ghép nối ở khâu tích hợp.

---

## 9. Đóng góp dự kiến

1. **Kiến trúc Neuro‑Symbolic an toàn cho hình học KHÔNG GIAN** — mở rộng tinh thần AlphaGeometry sang 3D + tính toán đại lượng + trực quan hoá.
2. **Cổng từ chối theo bất biến affine** — giảm mạnh "confidently wrong", đúng chủ đề *AI đáng tin cậy*.
3. **Engine ký hiệu trả đáp dạng căn đúng** — chính xác, kiểm chứng được, không phụ thuộc CAS bên ngoài.
4. **Bộ dữ liệu chuẩn tiếng Việt đầu tiên** cho hình học không gian + quy trình đánh giá tái lập.
5. **Phương pháp tối ưu prompt** cho khâu dịch đề, có đo mức cải thiện.

---

## 10. Hạn chế và rủi ro

- **Phạm vi engine:** một số dạng (quỹ tích tổng quát, bất đẳng thức, biện luận tham số) engine chưa giải — hệ thống **từ chối an toàn** thay vì bịa; cần nêu rõ ranh giới.
- **Phụ thuộc LLM dịch:** chất lượng phụ thuộc khối dịch; giảm thiểu bằng tối ưu prompt và cổng từ chối.
- **Kích thước benchmark:** cần đủ lớn & đa dạng để số liệu có ý nghĩa.
- **So sánh baseline tốn chi phí API:** kiểm soát bằng cỡ mẫu hợp lý.
- **Cạnh tranh lĩnh vực:** mảng AI‑giáo dục cần sản phẩm demo mạnh để nổi bật.

---

## 11. Tài liệu tham khảo

1. Trinh, T. H., Wu, Y., Le, Q. V., He, H., Luong, T. *Solving olympiad geometry without human demonstrations.* **Nature**, 2024. DOI: 10.1038/s41586‑023‑06747‑5. (AlphaGeometry — neuro‑symbolic cho hình học **phẳng**.)
2. Google DeepMind. *Gold‑medalist Performance in Solving Olympiad Geometry with AlphaGeometry2.* **arXiv:2502.03544**, 2025.
3. *SolidGeo: Measuring Multimodal Spatial Math Reasoning in Solid Geometry.* **arXiv:2505.21177**; NeurIPS 2025 Datasets & Benchmarks. (3.113 bài hình học không gian — cho thấy khoảng trống dữ liệu, nhất là tiếng Việt.)
4. Wu, C. et al. *DynaSolidGeo: A Dynamic Benchmark for Genuine Spatial Mathematical Reasoning of VLMs in Solid Geometry.* **arXiv:2510.22340**, 2025.
5. Yang, C., Wang, X., Lu, Y., Liu, H., Le, Q. V., Zhou, D., Chen, X. *Large Language Models as Optimizers* (OPRO). **arXiv:2309.03409**, 2023.
6. Fernando, C., Banarse, D., Michalewski, H., Osindero, S., Rocktäschel, T. *Promptbreeder: Self‑Referential Self‑Improvement via Prompt Evolution.* 2023.
7. Zhou, Y. et al. *Large Language Models Are Human‑Level Prompt Engineers* (APE). **ICLR**, 2023.
8. Bộ Giáo dục và Đào tạo. *Thông tư 06/2024/TT‑BGDĐT* — Quy chế Cuộc thi nghiên cứu khoa học, kỹ thuật cấp quốc gia (thang điểm & tiêu chí, Phụ lục 2), hiệu lực 27/5/2024.

---

*Phụ lục (xem `docs/nghien-cuu/phu-luc.md`):* (A) Lược đồ Construction Plan JSON; (B) Ví dụ bài → plan → đáp dạng căn `2√3/3`; (C) Toàn văn 3 câu hỏi cổng từ chối; (D) Thẻ mô tả bộ dữ liệu (datasheet); (E) Ảnh giao diện 3D *(chờ bổ sung)*.
*Tài liệu phương pháp kèm theo:* `prompt-optimization.md` (tối ưu prompt), `du-lieu-benchmark.md` (dữ liệu & gán nhãn), `danh-gia.md` (train/test & baseline).
