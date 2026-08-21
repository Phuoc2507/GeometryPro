# Phụ lục: Năng lực và Ranh giới của Hệ thống (System Capabilities & Boundaries)

> *Tài liệu này lập **bản đồ chính xác** về những gì engine ký hiệu tất định **tính được** và những gì hệ thống **cố ý từ chối**. Mọi tuyên bố năng lực/giới hạn đều truy được về mã nguồn (có dẫn đường dẫn tệp). Không có con số nào được bịa ra: các ví dụ đáp số đều trích từ rổ đề mốc đã cam kết (`bench/golden/`).*

---

## 1. Tóm tắt — "biên giới" là một đóng góp khoa học, không phải điểm yếu

Một hệ giải toán tự động có thể sai theo hai cách rất khác nhau về mặt đạo đức khoa học: (a) **từ chối** một bài nằm ngoài năng lực, hoặc (b) **trả lời tự tin nhưng sai** (confidently wrong). Trong giáo dục, cách (b) nguy hiểm hơn nhiều lần — học sinh tin vào một đáp số sai được trình bày như thể đã "được máy kiểm chứng".

Kiến trúc Neuro-Symbolic của chúng tôi tách bạch **LLM chỉ DỊCH** khỏi **engine TÍNH và TỰ KIỂM**, và đặt một **cổng từ chối theo tính chất toán học** ở ngay đầu đường ống. Nguyên tắc cốt lõi là:

> **THÀ TỪ CHỐI CÒN HƠN BỊA** — chỉ trả đáp số tất định khi engine thực sự dựng được hình và **tự kiểm** được; ngoài ranh giới đó, hệ thống gắn nhãn "chưa kiểm chứng" và rơi về lời giải LLM (đánh dấu rõ), thay vì mạo nhận một đáp số.

Vì vậy, việc **biết chính xác biên giới của mình** — engine tính được đúng những đại lượng nào, và từ chối chính xác lớp bài nào, vì **lý do ở cấp mã nguồn** — tự nó là một đóng góp: nó là **thước đo an toàn** của hệ thống. Phụ lục này trình bày hai nửa của biên giới đó: **§2** — ma trận năng lực (mỗi loại truy vấn kèm một ví dụ đáp thật); **§3** — ranh giới từ chối (mỗi lớp bài bị từ chối kèm điều kiện mã nguồn thực); **§4** — diễn giải vì sao một biên giới trung thực, tường minh là một điểm mạnh khoa học.

---

## 2. Bảng năng lực (Capability Matrix)

Bảng dưới liệt kê **mọi loại truy vấn** mà engine hỗ trợ, đúng theo union `QueryESchema` trong `api/_lib/kernel/compute/query.ts` (dòng 21–41). Cột "Ví dụ đáp thật" trích trực tiếp từ `bench/golden/*.json` (trường `expect.answers[].text`) — đây là **đáp dạng chính xác (căn/π/phân số)**, không phải số thập phân gần đúng.

Ký hiệu cột "Phủ golden": **✓** = có ít nhất một ca mốc đã cam kết kiểm chứng đáp này; **(schema)** = được lược đồ + tầng compute hỗ trợ nhưng **chưa** có ca mốc riêng (nêu trung thực).

| # | Loại truy vấn (`kind`) | Biến thể / tham số | Engine tính gì | Ví dụ đáp thật | Phủ golden |
|---|---|---|---|---|---|
| 1 | `distance` | `a`, `b` (điểm–điểm, điểm–mặt, điểm–đường, đường–đường, mặt–mặt) | Khoảng cách giữa hai đối tượng, giữ ở dạng **bình phương** rồi khai căn để ra căn đúng | `2√3/3`, `√6/3`, `12/5`, `√2`, `√6` | ✓ |
| 2 | `angle` | `a`, `b` (đường/đường, đường/mặt, mặt/mặt) | Góc (độ), nhận dạng lại các góc đẹp | `45°`, `60°`, `30°`, `90°` | ✓ |
| 3 | `relative_position` | `a`, `b` | Một TỪ: `song song` / `cắt nhau` / `chéo nhau` / `trùng nhau` / `đường nằm trên mặt` | `trùng nhau`, `song song`, `đường nằm trên mặt` | ✓ |
| 4 | `intersection` | `a`, `b` (đường×mặt→điểm; mặt×mặt→đường) | Giao điểm/giao tuyến; hoặc `none`/`parallel`/`coincident`/`tangent` | (điểm hoặc đường qua `p`, chỉ phương `dir`) | (schema) |
| 5 | `equation` | `target` = mặt / mặt cầu / đường | Chuỗi phương trình chuẩn tắc | `x + y + z - 2 = 0`, `y - 2z = 0`, `(x - 2)² + (y - 2)² + (z - 2)² = 12` | ✓ (mặt, cầu) |
| 6 | `volume` `solid:sphere` | `target` | Thể tích khối cầu, **dạng π đúng** | `36π`, `8√2π/3` | ✓ |
| 7 | `volume` `solid:tetrahedron` | `points[4]` | Thể tích tứ diện (định thức, exact) | `2√2/3`, `9√2/4`, `125√2/12` | ✓ |
| 8 | `volume` `solid:pyramid` | `points`, `apex` | Thể tích khối chóp | `64/3`, `96`, `30` | ✓ |
| 9 | `volume` `solid:prism` | `base[]`, `top[]` | Thể tích lăng trụ/hộp/lập phương (xẻ tứ diện, exact) | `24`, `27`, `45`, `42` | ✓ |
| 10 | `volume` `solid:cone` | `r`, `h` | Thể tích khối nón | `12π`, `324π` | ✓ |
| 11 | `volume` `solid:cylinder` | `r`, `h` | Thể tích khối trụ | `20π` | ✓ |
| 12 | `volume` `solid:cone_frustum` | `R`, `r`, `h` | Thể tích nón cụt `(1/3)πh(R²+Rr+r²)` | `52π` | ✓ |
| 13 | `volume` `solid:pyramid_frustum` | `s1`, `s2`, `h` | Thể tích chóp cụt `(1/3)h(S₁+S₂+√(S₁S₂))` | `19` | ✓ |
| 14 | `volume_ratio` | `a`, `b` (mỗi cái là tứ diện/chóp) | Tỉ số hai thể tích (bất biến cỡ) | `1/6`, `1/24`, `1/2`, `1/4` | ✓ |
| 15 | `area` `shape:sphere` | `target` | Diện tích mặt cầu `4πr²`, dạng π đúng | `36π`, `8π`, `16π` | ✓ |
| 16 | `area` `shape:triangle` | `points[3]` | Diện tích tam giác (nửa độ dài tích có hướng) | (số / căn) | **(schema)** |
| 17 | `area` `shape:polygon` | `points[≥3]` | Diện tích đa giác phẳng (thiết diện) | `4`, `2`, `3√3`, `√3/2` | ✓ |
| 18 | `area` `shape:cone` | `part:lateral/total`, `r`, `h` | Diện tích xung quanh/toàn phần nón | `15π`, `90π` | ✓ |
| 19 | `area` `shape:cylinder` | `part:lateral/total`, `r`, `h` | Diện tích xung quanh/toàn phần trụ | `28π` | ✓ |
| 20 | `area` `shape:cone_frustum` | `part:lateral/total`, `R`, `r`, `h` | Diện tích nón cụt | `35π`, `117π`, `140π` | ✓ |
| 21 | `slant` | `r`, `h` (nón) hoặc `+R` (nón cụt) | Đường sinh `l=√(r²+h²)` hoặc `√(h²+(R−r)²)` | `5`, `15`, `13` | ✓ |
| 22 | `sphere_metric` | `what:radius/diameter/top_z/bottom_z` | Bán kính/đường kính/đỉnh chỏm mặt cầu, **căn đúng** | `√2` (radius), `2√2` (diameter), `2√3` | ✓ |
| 23 | `point_coord` | `target`, `axis:x/y/z` | Đọc một toạ độ của điểm engine dựng | `1` | ✓ |

**Ghi chú trung thực về phủ golden.** Trong 23 nhánh trên, chỉ **`area shape:"triangle"` (dòng 16)** là **được lược đồ và hàm `computeTriangleArea` hỗ trợ** (`query.ts` dòng 132–134) nhưng **không có ca mốc riêng** — toàn bộ ca `area` trong `bench/golden/` dùng `polygon`, `sphere`, `cone`, `cylinder`, hoặc `cone_frustum`. Tương tự, `equation` có ca mốc cho **mặt phẳng** và **mặt cầu** nhưng nhánh **đường thẳng** (`lineEquationText`, `query.ts` dòng 94) chỉ được lược đồ hỗ trợ. `intersection` (dòng 4) chủ yếu được dùng gián tiếp qua op dựng `oxyz_intersect` nên không có ca mốc trực tiếp cho query. Chúng tôi nêu rõ khác biệt "**hỗ trợ + có golden**" với "**hỗ trợ theo lược đồ, chưa có golden**" thay vì gộp chung.

### 2.1. Nền dựng hình (Construction Ops)

Các đại lượng trên tính trên một *cấu hình* do LLM toạ-độ-hoá bằng các **op dựng** trong `api/_lib/kernel/dialects/oxyz.ts` (union `OxyzOpSchema`, dòng 76–91). Engine — **không phải LLM** — thực thi mọi phép dựng dẫn xuất, nên điểm dựng luôn *kiểm được*:

| Op | Dựng gì | Biến thể |
|---|---|---|
| `oxyz_point` | Điểm theo toạ độ | — |
| `oxyz_line` | Đường thẳng | `two_points`, `point_dir` |
| `oxyz_plane` | Mặt phẳng | `three_points`, `point_normal`, `coeffs` |
| `oxyz_sphere` | Mặt cầu | `center_radius`, `center_point`, `equation`, `four_points` (ngoại tiếp) |
| `oxyz_midpoint` / `oxyz_ratio` / `oxyz_centroid` | Trung điểm / điểm chia `A+t·(B−A)` / trọng tâm | — |
| `oxyz_reflect` / `oxyz_reflect_across` | Đối xứng qua tâm / qua đường hoặc mặt | `across: line/plane` |
| `oxyz_foot` | Chân đường vuông góc (hình chiếu) | `onto: line/plane` |
| `oxyz_orthocenter` / `oxyz_circumcenter` | Trực tâm / tâm ngoại tiếp tam giác | — |
| `oxyz_intersect` | Giao điểm hai đối tượng → **một điểm** | — |
| `oxyz_circumsphere_offset` | Mặt cầu tựa 3 điểm, lệch `t` dọc pháp tuyến | — |

Nguyên tắc an toàn ở tầng dựng: mọi op đều **ném lỗi** khi không dựng được (ví dụ `oxyz_intersect` khi hai đối tượng song song/trùng/chéo — `oxyz.ts` dòng 252–258 trả thông điệp *"hai đối tượng song song — không có giao điểm"*, *"trùng nhau — vô số giao điểm, không xác định"*), và tên entity **buộc phải duy nhất xuyên mọi loại** (`ensureNameFree`, dòng 103–107) để resolver không âm thầm che một entity trùng tên. Lỗi ở tầng dựng đẩy cả plan về nhánh từ chối, chứ không cho ra một đáp số trên hình sai.

---

## 3. Ranh giới từ chối (Abstain Boundary)

Từ chối trong hệ thống **không** phải một danh sách từ khoá cấm, mà là một **cổng theo tính chất toán học** hoạt động ở **ba tầng độc lập**. Một bài phải qua *cả ba* mới nhận đáp số tất định.

### 3.1. Tầng 1 — Cổng ngữ nghĩa của bộ dịch (3 câu hỏi cổng)

Đặt trong system-prompt của bộ dịch, `api/_lib/kernel-bridge/translatorPrompt.js` (mục "⚠️ QUAN TRỌNG NHẤT — KHI NÀO TỪ CHỐI", dòng 8–65). Trước khi mô hình hoá, LLM phải chạy đúng **ba câu hỏi cổng** (thiết kế mô tả ở `bao-cao-nghien-cuu.md` §4.2, dòng 128–134). Muốn từ chối, bộ dịch trả về đúng `{ "abstain": true, "abstain_reason": "..." }`.

**Câu 1 — Đáp có phụ thuộc THANG TUYỆT ĐỐI mà đề không cho?**
Góc và tỉ số **bất biến theo cỡ** ⇒ luôn qua cổng; chỉ độ dài/diện tích/thể tích mới cần thang. **Ô cấm** (từ chối), trích nguyên văn prompt (dòng 25–29):

> *"Ô CẤM (TỪ CHỐI): đề hỏi đo tuyệt đối nhưng chỉ cho TỈ SỐ giữa các cạnh (vd 'AD=2BC') HOẶC THIẾU kích thước, khiến hình CÒN tỉ lệ hình dạng TỰ DO (chưa rắn tới đồng dạng). ... Một chữ 'a' phải khoá TẤT CẢ chiều; nếu còn một cỡ thứ hai tự do ... ⇒ vẫn Ô CẤM."*

Ngoại lệ được mở có kiểm soát: cơ chế **"thang chữ" (`scaleSymbol`)** — khi hình đã *rắn tới đồng dạng* và cỡ cho bằng **một chữ duy nhất** (cạnh `a`), engine tính tại `a=1` rồi tự ghép `×aᵏ` (k=1 độ dài, 2 diện tích, 3 thể tích), cho đáp đúng tổng quát như `a·√3/3`. Cài đặt ở `solveWithKernel.js` hàm `applyScaleSymbol`/`scaleText` (dòng 79–106); prompt chỉ nhận **đúng một chữ cái** (`solveWithKernel.js` dòng 54: `/^[a-zA-Z]$/`).

**Câu 2 — Quan hệ có BẤT BIẾN AFFINE, hoặc hình có XÁC ĐỊNH TỚI ĐỒNG DẠNG?**
Đây là hạt nhân lý thuyết của cổng (mô tả ở §4.2, dòng 130). Quan hệ **bất biến affine** (song song, thẳng hàng, đồng phẳng, giao điểm, tỉ số, phương trình...) thì "đúng tại một hệ toạ độ tự chọn ⇒ đúng tổng quát" — kiểm 1 toạ độ **là chứng minh hợp lệ** (phương pháp toạ độ hoá). Trái lại (trích nguyên văn, dòng 48–54):

> *"Quan hệ KHÔNG bất biến affine (VUÔNG GÓC, khoảng-cách-BẰNG-nhau, góc-BẰNG-nhau, 'là tam giác cân/đều/vuông' phải chứng minh): 'đúng tại 1 toạ độ' KHÔNG suy ra tổng quát. CHỈ mô hình khi hình đã XÁC ĐỊNH TỚI ĐỒNG DẠNG ... Hình KHÔNG cố định tới đồng dạng ⇒ Ô CẤM."*

**Câu 3 — Engine có KIỂM được không?**
Phải quy được về ít nhất một query trả số/đối tượng, hoặc một assert kiểm tại toạ độ. **Ô cấm** (trích nguyên văn, dòng 58–61):

> *"QUỸ TÍCH / tập hợp điểm phải SUY RA (engine chưa có bộ giải quỹ tích ...); bài BIỆN LUẬN / định tính / 'có tồn tại không' / BẤT ĐẲNG THỨC / điều kiện tham số dạng CHỮ tổng quát; đề thiếu dữ kiện tới mức KHÔNG dựng nổi hình (under-determined)."*

**Ba lằn ranh cấm cốt lõi** (prompt dòng 64–65): (1) đại lượng ĐO thiếu thang tuyệt đối; (2) quan hệ KHÔNG affine trên hình chưa cố định tới đồng dạng; (3) đáp cần SUY-RA-tập-hợp / biện luận mà engine không kiểm được.

Khi bộ dịch trả `abstain`, đường ống bắt cờ này và ném để rơi về luồng LLM cũ — `solveWithKernel.js` dòng 42–44:

```js
if (json && typeof json === 'object' && json.abstain === true) {
  throw new Error('translator abstained: ' + (json.abstain_reason || 'thiếu số liệu / ngoài danh mục'));
}
```

Ngoài abstain, tầng này còn từ chối **thầm lặng theo lược đồ**: nếu plan không đúng `RunPlanSchema`/`AnalysisPlanSchema` thì `safeParse` loại (dòng 48–50), và output không phải JSON cũng bị chặn (dòng 37–39). Mọi trường hợp đều được `solveProblem` gói lại thành một object **Mức-3** có `tier` (dòng 146–152) thay vì để nổ exception.

### 3.2. Tầng 2 — Từ chối tất định ở tầng compute (`ok:false`)

Ngay cả khi plan hợp lệ, tầng tính từ chối trả đáp khi cấu hình suy biến hoặc tổ hợp không hỗ trợ. Trong `computeQuery` (`query.ts`), mọi nhánh sai kiểu đều trả `{ ok: false, problem }`, ví dụ:
- `volume(sphere) needs a sphere`, `sphere_metric needs a sphere`, `point_coord needs a point`, `no equation for a <kind>` (dòng 96, 102, 125, 140, 159).
- Giao không hỗ trợ: `intersection not supported for ${key}` (`compute/intersect.ts` dòng 114); vị trí tương đối: `relative position not supported for ${key}` (`compute/relative.ts` dòng 62); cả hai từ chối cấu hình **suy biến** qua kiểm `deg` (dòng 103 / 49).
- Đồng phẳng: `computePolygonArea`/`coplanarityProblem` trả *"vertices are not coplanar"* khi các đỉnh không đồng phẳng (`compute/answer.ts` dòng 93–110) — engine **không** tính diện tích một "đa giác" cong.

### 3.3. Tầng 3 — Tự kiểm chứng chỉ (hạ `exact`→`approximate`)

Đây là lằn ranh tinh tế nhất: engine **thà báo gần đúng còn hơn khẳng định sai một dạng căn**. Mỗi đáp được "chứng thực": so **giá trị dạng chính xác** với một số thực tính **độc lập**; nếu lệch quá dung sai `1e-6·max(1,|giá trị|)` thì **bỏ dạng exact, hạ về số** và gắn cờ `approximate:true`. Trích `compute/answer.ts` (dòng 42–46, và tương tự cho scalar dòng 125–129, góc, π):

```js
const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol) {
  return { kind: 'distance', exact: s.exact, ..., approximate: false };
}
return { kind: 'distance', exact: null, approx: floatRef, text: floatRef.toFixed(4), approximate: true };
```

Bản thân **số học lõi** cũng có một biên giới trường: phép cộng/trừ **chỉ đóng khi cùng `radicand`** — ngoài phạm vi đó trả `null` ("rời trường"), báo rằng đáp không biểu diễn được dưới dạng *một* hữu tỉ nhân *một* căn (`bao-cao-nghien-cuu.md` §4.3, dòng 151). Đây là lý do engine giữ mọi công thức ở **dạng bình phương** để phép toán luôn nằm trong trường biểu diễn được.

### 3.4. Kết quả: phân tầng an toàn (tier)

Ba tầng trên hội tụ vào **một nhãn tier duy nhất** (`api/_lib/kernel-bridge/classifyTier.js`; thiết kế ở §4.4, dòng 165–173):
- **Mức 1 — đã kiểm chứng:** engine thực sự giải (`ok`, đáp hữu hạn, 0 vi phạm); còn phân trục `exact` (căn đúng) vs `numeric` (chỉ ra số).
- **Mức 2 — đúng tổng quát ở "thang chữ":** bài `scaleSymbol`; đáp chữ đúng tổng quát, số đo cụ thể chỉ đúng ở `a=1`.
- **Mức 3 — chưa kiểm chứng:** phân biệt `violation` / `error` / `unsolved` / `abstain` — hệ thống **không** đưa đáp số tất định, rơi về LLM có gắn nhãn rõ.

---

## 4. Diễn giải — vì sao một biên giới trung thực là điểm mạnh khoa học

### 4.1. Từ chối là một **thước đo an toàn**, không phải một lỗ hổng

Trong các hệ giải toán, chỉ số duy nhất được báo cáo thường là *accuracy*. Nhưng accuracy che giấu điều nguy hiểm nhất: **tỉ lệ sai-mà-tự-tin**. Kiến trúc ba tầng ở §3 được thiết kế để **đẩy phần lớn cái sai vào ô "từ chối" (Mức 3) thay vì ô "trả lời sai"**. Với người dùng là học sinh, một câu "tôi chưa chắc, đây là hướng tham khảo có gắn nhãn" an toàn hơn hẳn một đáp số sai được đóng dấu "đã kiểm chứng". Nhãn tier chính là biến cho phép đo tách bạch ba trạng thái — *giải đúng dạng căn* / *giải ra số* / *từ chối* — thay vì gộp tất cả vào một con số accuracy phẳng (§4.4, dòng 172).

### 4.2. Biên giới được neo vào **tính chất toán học**, nên phòng thủ được trước phản biện

Điểm mạnh của cổng là nó **không dựa từ khoá** ("chứng minh", "tỉ lệ"...) mà dựa **bất biến affine** và **xác định-tới-đồng-dạng** (§3.1, Câu 2). Đây là những khái niệm chuẩn: một quan hệ bất biến affine mà đúng tại một hệ toạ độ thì đúng tổng quát — nên "kiểm 1 toạ độ = chứng minh". Ngược lại, vuông góc / bằng nhau **không** bất biến affine, nên hệ thống **từ chối tự nhận là đã chứng minh** chúng trên một hình chưa khoá tỉ lệ. Một giám khảo hỏi "vì sao được phép chọn toạ độ cụ thể mà vẫn tổng quát?" sẽ nhận được câu trả lời **có cơ sở lý thuyết**, không phải "vì nó chạy đúng trên vài ví dụ".

### 4.3. Ranh giới được **báo cáo minh bạch**, kể cả khi bất lợi

Rổ đề mốc (`bench/golden/README.md`) ghi lại **cả những chỗ engine từng sai** — không phải để khoe, mà để chốt lại thành ca kiểm chứng: ví dụ thể tích hộp/lập phương trước đây bị "xẻ khối thành nhiều chóp rồi cộng" cho `lập phương cạnh 3 → 9,9,9` (sai), đã vá bằng primitive `solid:"prism"` cho ra `27` đúng. Sự minh bạch này (kể cả việc phân biệt "hỗ trợ có golden" vs "hỗ trợ chưa golden" ở §2.1) là điều một hệ thống *biết rõ biên giới của mình* mới làm được.

> **Lưu ý phát hiện trong quá trình soát mã (2026-08):** có **một điểm lệch tài liệu** cần đính chính. `bao-cao-nghien-cuu.md` §4.3 (dòng 163) còn nêu ví dụ *"tứ diện đều cạnh 3 ... trả `ok:false` — là abstain an toàn"*. Nhưng khi kiểm lại trên mã hiện tại, engine **đã giải đúng** ca này: `cạnh 3 → 9√2/4`, `cạnh 5 → 125√2/12` (ghi rõ trong `bench/golden/README.md`, mục *"[HẾT LỖ HỔNG]"*, xác minh 2026-08-21). Nghĩa là biên giới đã **dịch chuyển ra ngoài** — bài từng bị từ chối nay tính được. Đây đúng là hành vi mong muốn (từ chối an toàn khi chưa làm được, mở rộng khi đã làm được), nhưng câu ví dụ trong báo cáo chính nên được cập nhật để khỏi hiểu nhầm là engine vẫn từ chối tứ diện đều cạnh lẻ.

### 4.4. Quy mô thực của "vùng an toàn"

Rổ đề mốc đã cam kết gồm **159 ca / 226 đáp án**, đạt **100% đáp dạng chính xác (exact-form)** trên phần engine giải. Phân bố theo loại truy vấn cho thấy vùng năng lực thực, không phải danh mục lý thuyết:

| Loại truy vấn | Số đáp | Loại truy vấn | Số đáp |
|---|---|---|---|
| `volume` | 61 | `distance` | 15 |
| `point_coord` | 56 | `sphere_metric` | 6 |
| `area` | 33 | `ratio` (volume_ratio) | 5 |
| `angle` | 15 | `slant` | 4 |
| `equation` | 15 | | |
| `relative_position` | 15 | | |

Nói cách khác: biên giới ở §2–§3 **không phải một tuyên bố suông** — nó được đóng cọc bằng 226 đáp án đã đối chiếu tay, chạy tất định (engine-replay, không gọi AI) qua `npm run bench:gate`. Đó là cái làm cho "hệ thống biết ranh giới của mình" trở thành một khẳng định **kiểm được**, chứ không phải một lời tự nhận.

---

### Chỉ mục nguồn (mọi tuyên bố truy về đây)

| Chủ đề | Tệp | Vị trí |
|---|---|---|
| Danh mục truy vấn (`QueryESchema`) | `api/_lib/kernel/compute/query.ts` | dòng 21–41 |
| Điều phối tính + `ok:false` | `api/_lib/kernel/compute/query.ts` | dòng 83–167 |
| Op dựng hình (`OxyzOpSchema`) | `api/_lib/kernel/dialects/oxyz.ts` | dòng 76–91 |
| Từ chối tầng dựng (giao suy biến, tên trùng) | `api/_lib/kernel/dialects/oxyz.ts` | dòng 103–107, 252–258 |
| Cổng 3 câu hỏi + ô cấm | `api/_lib/kernel-bridge/translatorPrompt.js` | dòng 8–65 |
| Bắt cờ `abstain`, chặn non-JSON/sai lược đồ | `api/_lib/kernel-bridge/solveWithKernel.js` | dòng 37–50 |
| Cơ chế "thang chữ" (`scaleSymbol`) | `api/_lib/kernel-bridge/solveWithKernel.js` | dòng 54, 79–106 |
| Tự kiểm chứng chỉ (hạ exact→approximate) | `api/_lib/kernel/compute/answer.ts` | dòng 42–46, 125–129 |
| Từ chối giao / vị trí tương đối không hỗ trợ | `api/_lib/kernel/compute/intersect.ts`, `relative.ts` | dòng 114 / 62 |
| Phân tầng an toàn (tier) | `api/_lib/kernel-bridge/classifyTier.js`; `bao-cao-nghien-cuu.md` §4.4 | — |
| Thiết kế cổng từ chối (3 câu hỏi, affine) | `docs/nghien-cuu/bao-cao-nghien-cuu.md` | §4.2 (dòng 128–134), §4.4 (dòng 165–173) |
| Ví dụ đáp thật + lịch sử lỗi đã vá | `bench/golden/*.json`, `bench/golden/README.md` | — |
