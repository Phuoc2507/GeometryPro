# Phản biện spec Hóa hữu cơ tầng 1 — đốt cháy · lập CTPT · este cơ bản (22/08)

> Kỷ luật **"TIN SỐ, KHÔNG TIN LỜI"**: tái dựng ĐỘC LẬP thuật toán §5–§7 bằng số hữu tỉ
> BigInt thuần (KHÔNG import code engine — để kiểm chéo đáp số spec khẳng định, không phải
> kiểm code chưa viết), tính lại TỪ ĐẦU cả 10 bài contract O1–O10 + bonus, rồi dò các vùng
> spec KHÔNG test bằng bộ ca đối kháng. Đã đọc code thật: `rat.ts`, `scalar.ts`, `formula.ts`,
> `atomicMass.ts`, `balance.ts`, `stoich.ts`, `reactionDB.ts`, `runChem.ts`, `planSchema.ts`.
> Script: `scratchpad/verify.mjs` (10 bài + bonus), `scratchpad/adversarial.mjs` (8 ca đối kháng).

---

## 0. VERDICT

**GẦN CHÍN — LÕI §5 VỮNG, SỐ HỌC 11/11 EXACT. Cần chốt 1 việc CAO + 4 việc VỪA (chủ yếu
điểm TÍCH HỢP/mô tả + 1 lỗ ester) trước khi code.** Không có lỗi thiết kế nền. Thuật toán
lập CTPT (rút CTĐGN LCM/GCD + duyệt nghiệm nguyên + 4 tự kiểm) tất định tuyệt đối, số học
giữ hữu tỉ suốt (kể cả `9,916/24,79 = 2/5` và `8,96/22,4 = 2/5` — không rơi float), triết lý
chống ảo giác giữ vững (schema không có ô nào nhận CTĐGN/CTPT/n đã suy). Việc CAO duy nhất là
**cơ chế khớp query→muối động ở este (O7)** chưa được đặc tả — nếu code theo `answerOne` v0
(so CHUỖI) thì bài contract O7 sẽ FAIL. Các việc VỪA đều là chỗ CẦN CHỐT TRƯỚC khi thi công,
không phải làm lại.

| Hạng | Số việc | Nội dung |
|---|---|---|
| CAO | 1 | H1: query muối O7 `"CH3COONa"` ≠ chuỗi engine ráp `"C2H3O2Na"` — spec chưa chốt match bằng ATOM-MAP; code ngây thơ so chuỗi ⇒ O7 trả "không có trong sổ cái" |
| VỪA | 4 | H2: LLM đọc nhầm nửa `alcohol` ⇒ muối sai nhưng MỌI tự kiểm PASS ⇒ SỐ SAI âm thầm · H3: DIFF 2a dispatch sớm mâu thuẫn §9 "mass/mol qua đường v0" — cơ chế trả query sản phẩm dự đoán (m H2O ở O4) chưa mô tả · H4: §5.1 thiếu guard `nO ≥ 0` (đề làm tròn ⇒ CTĐGN vô nghĩa) · H5: §6↔§5.4 mâu thuẫn — nhánh class k=1 thiếu neo phải LIỆT KÊ, không bail error |
| THẤP | 5 | H6: chú thích O5 "(n=1…)" sai (số C=2) · H7: `measure.tol` rộng + Memp nhỏ có thể nuốt đa nghiệm (round-then-verify) · H8: O7 `excess:true` cho "vừa đủ" lệch ngữ nghĩa · H9: `parseDecimal` chặn "2.070" (dấu chấm 3 số) — few-shot phải dùng phẩy · H10: chưa kiểm chéo `class`↔`contains` mâu thuẫn |

---

## 1. Kết quả tính lại (máy — BigInt hữu tỉ độc lập): 11/11 KHỚP

Tái dựng `Rat` (num/den BigInt rút gọn), `parseDecimal` (phẩy VN), bảng NTK + parser công thức,
`§5.1` (số đo → mol nguyên tố qua bảo toàn), `§5.2` (LCM mẫu → GCD tử), `§5.3` (mode A M/Memp,
mode B n_A theo class + duyệt nghiệm), `§5.4` (4 tự kiểm), `§7` (atom-map muối + bảo toàn KL).
So `formula` (chuỗi) + phân số exact, KHÔNG so float.

| # | Dạng | Đáp spec | Máy tính lại | Số học then chốt (exact) | Khớp? |
|---|---|---|---|---|---|
| O1 | HC, d/H2=15 | C2H6 | **C2H6** | nC=1/5, nH=3/5 → CTĐGN CH3, M=30 exact, n=2; (a)✓ k=0 (d)✓ | ✓ |
| O2 | C,H,O, d/kk=2,07 (tol) | C2H4O2 | **C2H4O2** | nO=1/10 → CH2O, M=6003/100=60,03, round(2,001)=2, verify 0,03≤0,60; k=1 | ✓ |
| O3 | ankan hiệu mol | C3H8 | **C3H8** | n_A=nH2O−nCO2=1/10, n=3; k=0 (d) y=8≤8 | ✓ |
| O4 | anken neo mol, 22,4 | C4H8; m(H2O)=7,2g | **C4H8; 36/5** | nCO2=8,96/22,4=2/5, n_A=1/10, n=4; nH2O=nCO2=2/5 → m=36/5 | ✓ |
| O5 | amin có N | C2H7N | **C2H7N** | nC:nH:nN=2:7:1 → C2H7N; n_A=2nN2=1/10 = (nH2O−nCO2)/1,5 **hai route khớp**; k=0 | ✓ |
| O6 | đa nghiệm HC | CH2 + danh sách | **CH2; 29 ứng viên** | C2H4,C3H6,…,C30H60; **C1H2 bị loại** (§15.4) + violation | ✓ |
| O7 | este thủy phân | m(muối)=8,2g | **41/5** | muối C2H3O2Na M=82, n=1/10; bảo toàn KL 64/5=64/5=12,8 | ✓ |
| O8 | este đốt, duyệt n | C3H6O2 | **C3H6O2** | duyệt n=1..30: n=3 (M=74, n_A=1/10) exact duy nhất; k=1 | ✓ |
| O9 | ankan đkc 24,79 | C4H10 | **C4H10** | nCO2=9,916/24,79=**2/5** exact, nH2O=1/2, n_A=1/10, n=4 | ✓ |
| O10 | ancol no đơn | C2H6O | **C2H6O** | n_A=nH2O−nCO2=1/10, n=2, O=1 từ class; k=0 | ✓ |
| Bonus | given_formula=C3H8 | ok:false + violation | **mismatch=true** | engine C2H6 ≠ đề C3H8 → phát hiện lệch | ✓ |

**10/10 bài (11/11 ý) khớp `formula` + phân số exact.** Mọi đại lượng ở lại ℚ; không ca nào
chạm float làm tròn mol. Tuyên bố §11 "mọi đáp là phân số exact (32/5, 41/5, 36/5)" là THẬT:
xác nhận `41/5`(O7), `36/5`(O4); các mốc `2/5` từ hai điều kiện đktc/đkc đều exact — điểm son.

---

## 2. CÂU HỎI SỐNG-CÒN của task → trả lời

**(a) Thuật toán tìm CTPT có TẤT ĐỊNH & DUY NHẤT không, hay đa nghiệm mà engine chọn bừa?**
→ TẤT ĐỊNH. Mode A: `n = M/M_emp` exact (chia không hết ⇒ violation, không làm tròn ép); M
làm tròn ⇒ round-then-verify với khoảng cách ứng viên = M_emp ≥ 14 ≫ sai số (H7 là biên hiếm).
Mode B: n_A từ hiệu mol (k≠1) hoặc duyệt nghiệm nguyên chặn [1,30] (k=1) — bigint, không thử-sai
mù. **Đa nghiệm KHÔNG bị chọn bừa**: O6 trả 29 ứng viên + violation, không bịa C2H4 (xác nhận
bằng máy). Điểm son bất ngờ (ADV-7): CTĐGN + tự kiểm (c)(d) hóa trị đôi khi thu hẹp về DUY NHẤT
dù không có M — ví dụ CTĐGN `CH3` chỉ còn `C2H6` (vì (CH3)ₙ cần y=3n chẵn ⇒ n chẵn, và
y≤2x+2 loại C4H12). Engine sẽ đúng hơn kỳ vọng NẾU áp (c)(d) filter khi liệt kê (spec O6 có
ghi "giữ ứng viên thỏa hóa trị" — cần đảm bảo code thực sự áp).

**(b) Có phân biệt CTĐGN (empirical) vs CTPT thật (cần M) và TỪ CHỐI đúng chỗ không?**
→ CÓ. Query tách bạch `empirical_formula` (chốt được khi có tỉ lệ) vs `molecular_formula` (cần
M/neo). O6: `empirical="CH2"` trả về, còn `molecular_formula` trả `candidates[]` + violation
"thiếu dữ kiện". Đây là ranh giới đúng: KHÔNG nâng CTĐGN thành CTPT khi thiếu M.

**(c) Số học có giữ hữu tỉ suốt không, hay rơi float làm tròn sai mol?**
→ GIỮ HỮU TỈ TUYỆT ĐỐI. `rat.ts` bọc `Exact` radicand=1, `makeExact` luôn rút gọn (chia GCD),
den>0. Không đại lượng hữu cơ THPT nào cần căn (NTK tròn/·,5) ⇒ không chạm trần radicand
`MAX_SAFE_RADICAND`. round-then-verify chỉ dùng float Ở KHÂU ĐỐI CHIẾU M-làm-tròn (đúng chủ
đích F10 hai tầng), còn dựng CTPT + bảo toàn là exact.

**(d) Dãy đồng đẳng — whitelist chặt hay mở toang?**
→ CHẶT. `OrganicClass` là enum ĐÓNG 8 giá trị; mỗi class ⇒ (k, số O, số N) cố định + công thức
tổng quát tường minh (§6). Kiểm chéo k giữa class-khai và k-tính-được chặn khai sai loại. Người
phản biện soi được từng công thức. Ester dùng chung cỗ máy đốt với `class:'este-no-don'`.

---

## 3. Findings CAO

### H1 (CAO) — Query muối động O7: match bằng ATOM-MAP, KHÔNG phải chuỗi. Spec chưa chốt.

Bài contract O7 (§11) truy vấn `{"kind":"mass","of":"CH3COONa"}`. Nhưng §7 nói muối được engine
DERIVE bằng cộng/trừ atom-map: `{C4H8O2}+{NaOH}−{C2H6O} = {C:2,H:3,O:2,Na:1}`. Khi engine ráp
atom-map này thành CHUỖI để dựng `ReactionRecord.products`, thứ tự nguyên tố tự nhiên (C,H,O,Na)
cho ra `"C2H3O2Na"` — **KHÔNG bằng chuỗi `"CH3COONa"`** mà query dùng. Kiểm bằng máy (ADV-1):

```
muối atom-map = {C:2,H:3,O:2,Na:1}
ráp ORDER     = "C2H3O2Na"
query.of      = "CH3COONa"  → parseFormula = {C:2,H:3,O:2,Na:1}
SO CHUỖI  "C2H3O2Na"==="CH3COONa" ? false   ← answerOne v0 dùng chính phép này
SO ATOM-MAP tương đương ?           true
```

`runChem.answerOne` v0 tìm hàng bằng `rows.find(rr => rr.formula === target)` — SO CHUỖI. §9 lại
ghi "mass/mol của muối/ancol đi qua đường v0" ⇒ nếu tái dùng đúng đường đó, O7 sẽ trả lỗi
`"CH3COONa" không có trong sổ cái phản ứng`. **Đề xuất chốt (chọn 1, ghi vào §7/§9):**
- (a) Khi match query `of` với hàng muối/ancol hữu cơ, chuẩn hóa CẢ HAI vế qua `parseFormula`
  rồi so ATOM-MAP (không so chuỗi). Text hiển thị giữ nguyên `of` của đề.
- (b) Query muối/ancol không cần tên: `of` optional, engine trả product không phải khí/nước.

Không chốt ⇒ O7 (1/10 bài contract) hỏng ngay. Đây là lỗ MÔ TẢ, sửa bằng 2 câu, nhưng phải
sửa TRƯỚC khi code vì nó định hình cách viết `runOrganic`.

---

## 4. Findings VỪA

### H2 (VỪA) — LLM đọc nhầm nửa `alcohol` ⇒ muối sai, MỌI tự kiểm PASS ⇒ SỐ SAI âm thầm.

§7 để LLM khai `ester` + `alcohol` (nửa ancol tách ra), engine derive muối = `ester + NaOH −
alcohol`. §15.7 tự hỏi có nên bắt khai cả axit. Kiểm đối kháng (ADV-2): ester đúng
`CH3COOC2H5` nhưng LLM đọc nhầm `alcohol="CH3OH"` (metanol thay etanol):

```
muối SAI = {C:3,H:5,O:2,Na:1} (M=96), salt âm? false
balance  e+NaOH == salt+alcohol ? true    ← CÂN theo XÂY DỰNG atom-map
bảo toàn KL  64/5 == 64/5 ? true
m muối trả ra = 48/5 = 9,6 g   (ĐÁP ĐÚNG 8,2)
```

**Mọi lưới an toàn PASS** vì muối, `balance`, và `react` đều PHÁI SINH từ cùng một atom-map —
chúng không phải guard độc lập, chỉ là hằng đẳng thức tự thỏa. Engine trả **9,6 g thay vì 8,2 g,
không một violation nào**. Đây NẶNG hơn ranh giới §10.4: §10.4 chỉ để sai NHÃN phân loại (bảo
toàn vẫn dựng lại số đo đúng); còn đây SỐ HỌC output SAI 17%. Ranh giới "đọc ≠ tính" của spec
đúng về tinh thần, nhưng với este hệ quả là con số bán ra sai.

**Đề xuất:** áp phương án §15.7(b) — bắt LLM khai CẢ `acid` LẪN `alcohol` (đều là "đọc cấu
trúc"), engine thêm MỘT tự kiểm ĐỘC LẬP `ester_atoms == acid_atoms + alcohol_atoms − H2O`
(phản ứng este hóa ngược). Sai lệch ⇒ violation "nửa axit/ancol khai không ghép thành este đã
cho". Chi phí: 1 trường schema + 1 phép so atom-map; đóng được lỗ mà không cần parser nhóm chức.
(Nếu quyết định GIỮ nguyên thì phải ghi rõ ở §14/§10.4 rằng "sai nửa ancol ⇒ engine trả số sai
không phát hiện" — đừng để ranh giới này ẩn.)

### H3 (VỪA) — DIFF 2a "dispatch sớm" vs §9 "mass/mol qua đường v0": cơ chế trả query sản phẩm chưa mô tả.

DIFF 2a: "nếu plan chứa op hữu cơ ⇒ `return runOrganic(...)` TRƯỚC toàn bộ nhánh species/mix".
Nhưng O4 trộn query MỚI (`molecular_formula`) với query V0 (`{"kind":"mass","of":"H2O"}`), và §9
nói "mass/mol/volume_gas của sản phẩm đi qua đường v0". Khi đã `return` sớm, KHÔNG còn nhánh v0
để đi — `runOrganic` phải TỰ dựng "hàng sổ cái" cho sản phẩm ĐỐT engine DỰ ĐOÁN (H2O với mol =
nH2O suy từ class) rồi tự trả lời `mass`. `H2O` không phải species khai, không nằm trong bất kỳ
ledger phản ứng nào — cơ chế tạo row cho nó spec CHƯA mô tả. Rủi ro: O4 chốt được C4H8 nhưng trả
THIẾU `m(H2O)=7,2g`, hoặc lỗi "H2O không có trong sổ cái".

**Đề xuất:** §9 nói rõ `runOrganic` dựng một `EnrichedRow[]` hư cấu gồm sản phẩm đốt (CO2, H2O,
N2) với mol lý thuyết đã suy, rồi GỌI LẠI chính `answerOne`/`answerQueries` v0 cho các query
`mass/mol/volume_gas` — vừa tái dùng vừa nhất quán format. Ghi 1 dòng: "các query định lượng
sản phẩm/muối/ancol chạy trên ledger hư cấu do runOrganic dựng, KHÔNG phải ledger mix v0".

### H4 (VỪA) — §5.1 thiếu guard `nO ≥ 0` (và `nC>0`, `nH>0`).

Route O qua khối lượng: `nO = (m_A − 12·nC − 1·nH − 14·nN)/16`. Đề CHO số đã làm tròn (CO2, H2O,
m_A độc lập) ⇒ `mC+mH` có thể VƯỢT `m_A` ⇒ `nO < 0`. `empirical()` sẽ nhân LCM ra vectơ có phần
tử âm ⇒ CTĐGN vô nghĩa (hoặc lọt (c)(d) sai). §5.1 mô tả công thức nhưng KHÔNG nêu chốt chặn.

**Đề xuất:** §5.1 thêm: `nO < 0` (quá tol) ⇒ violation "khối lượng C+H (+N) vượt khối lượng mẫu
— dữ kiện mâu thuẫn hoặc chất không chỉ chứa C,H,O"; `nC ≤ 0` hoặc `nH ≤ 0` ⇒ violation tương
tự. Đây là lưới bắt đề sai/LLM khai sai, cùng tinh thần "thà từ chối".

### H5 (VỪA) — §6 "cần neo khác" mâu thuẫn §5.4: nhánh class k=1 THIẾU neo phải LIỆT KÊ, không error.

Bảng §6 ghi anken/axit/este (k=1, nCO2=nH2O) "cần neo khác" nhưng KHÔNG mô tả hành vi khi đề
THỰC SỰ thiếu neo. Với class anken + chỉ nCO2 (không sample/M), mọi CnH2n (n≥2) đều thỏa
nCO2=nH2O ⇒ ĐA NGHIỆM hợp lệ (ADV-6). §5.4 nói rõ "≥2 ứng viên ⇒ danh sách + violation", nhưng
đọc §6 rời rạc dễ code thành `bail(error "thiếu neo")` — biến một bài "thiếu dữ kiện + danh
sách" hợp lệ thành "lỗi".

**Đề xuất:** §6 thêm dòng: "class k=1 thiếu neo (nCO2=nH2O, không sample/M) ⇒ đi vào cỗ máy
liệt-kê đa nghiệm §5.4 (candidates CnH2n + violation), KHÔNG bail error." Trỏ tường minh §6→§5.4.

---

## 5. Findings THẤP

- **H6** — Chú thích O5 §11: "n=nCO2/n_A=2 ⇒ C2H7N (**n=1** với CT tổng quát CnH2n+3N)". Số C
  của C2H7N là **2**, không phải 1 (kiểm máy: n=2). Lỗi trong ngoặc, đáp CTPT vẫn đúng. Sửa "n=1"→"n=2" cho khỏi rối người đọc/người cắt test.
- **H7** — round-then-verify: an toàn ở `tol=1e-2` (cần M≥700 mới nhầm, ngoài THPT). Nhưng
  `measure.tol` cho LLM override; `tol=5e-2` + Memp=14 ⇒ đã nhầm từ M≥140 (ADV-3). Đề xuất chặn
  trần `measure.tol` (vd ≤ 2e-2) HOẶC dùng "quét khoảng nghiệm nguyên" như §15.6 tự đề xuất (bắt
  luôn ca "nhiều n trong dải" ⇒ đa nghiệm) thay vì round đơn.
- **H8** — O7 khai `baseAmount:{excess:true}` cho đề "NaOH vừa đủ". `react()` vẫn cho m muối
  đúng (ξ theo ester là chất hết, `consumed(NaOH)=coeff·ξ` hữu hạn ⇒ bảo toàn KL 12,8=12,8 vẫn
  đúng — kiểm máy). Nhưng "vừa đủ" ≠ "dư": nếu bài kế hỏi `m(NaOH dư)`/`C%` sẽ hỏng. Nên khai
  `baseAmount:{mol: n vừa đủ}` hoặc chấp nhận + ghi rõ excess chỉ hợp lệ khi query chỉ hỏi muối/ancol.
- **H9** — `parseDecimal` (kế thừa v0) TỪ CHỐI "2.070"/"1.500" (dấu chấm + đúng 3 số thập phân —
  nhập nhằng phân cách nghìn VN). Tỉ khối/thể tích trong đề hữu cơ hay có 3 chữ số ("9,916" OK
  vì phẩy). Few-shot translator hữu cơ PHẢI dùng dấu PHẨY cho `measure.value`/`liters_gas`, nếu
  không plan bị schema reject. Ghi vào ghi chú P4 (prompt).
- **H10** — Chưa kiểm chéo `class` ↔ `contains`: khai `class:'ankan'` (ngụ ý O=0) đồng thời
  `contains:['C','H','O']` là mâu thuẫn nhưng spec không nói bắt. Rủi ro thấp (LLM ít khai cả
  hai). Đề xuất 1 dòng: nếu cả hai khai và lệch tập nguyên tố ⇒ violation.

---

## 6. ĐIỂM SON (spec làm ĐÚNG)

1. **Số học 11/11 exact, không "float giả exact".** Tuyên bố §11 trung thực; `9,916/24,79` và
   `8,96/22,4` đều rút về `2/5` exact nhờ đại lượng ở lại ℚ — không có chỗ nào ngụy trang float.
2. **Chống ảo giác giữ nguyên xương sống v0.** Schema KHÔNG có ô nào nhận CTĐGN/CTPT/n/mol đã
   suy — chỉ số đo literal (co2/h2o/n2/o2, tỉ khối nguyên văn, nửa cấu trúc). Bonus given_formula
   hoạt động (kiểm máy: C2H6≠C3H8 ⇒ mismatch). LLM chỉ DỊCH, engine suy tất.
3. **oxygen_needed tất định** — kiểm máy (ADV-5): mọi PT đốt tầng-1 (C2H6, C2H6O, C2H7N, C4H8O2
   + O2) có `nullity=1` ⇒ `balance.ts` tách hệ số O2 duy nhất. Tái dùng đúng.
4. **Công thức độ bất bão hòa `k=(2x+2+t−y)/2` BỎ O đúng chuẩn**; (d) `y≤2x+2+t` bỏ O cũng đúng
   (O hóa trị 2 không đổi H tối đa). Kiểm chéo trên C2H4O2 (k=1), C2H6O (k=0), C2H7N (k=0) đều khớp.
5. **Đa nghiệm xử lý đúng "thà từ chối":** O6 trả 29 ứng viên + violation, loại C1H2 (§15.4),
   KHÔNG bịa. Và filter hóa trị mạnh hơn kỳ vọng (CH3⇒C2H6 duy nhất — §2a).
6. **Tái dùng hạ tầng SẠCH, KHÔNG đụng `reactionDB` (58 phản ứng vô cơ).** Ester dựng
   `ReactionRecord` ĐỘNG (id `ORG-ester`), không thêm record tĩnh; mượn `react()` để hưởng tự
   kiểm bảo toàn KL/nguyên tố. `H2O ∉ liters_gas` (§15.1) nhất quán luật VỪA-5 v0. Điểm chạm v0
   gói đúng 2 file (planSchema/runChem) như tuyên bố, DIFF kê trung thực §12.
7. **Amin hai route n_A tự kiểm chéo** (`2·nN2` vs `(nH2O−nCO2)/1,5`) — kiểm máy O5 khớp exact,
   là một guard THẬT (không phải hằng đẳng thức tự thỏa như H2).

---

## 7. Việc cần làm TRƯỚC khi cắt plan/thi công (tóm tắt hành động)

1. **[CAO H1]** Chốt cơ chế match query→muối/ancol động bằng ATOM-MAP (không so chuỗi); ghi vào §7/§9.
2. **[VỪA H2]** Quyết định este: áp §15.7(b) (khai axit+ancol, thêm tự kiểm este hóa) HAY ghi rõ ranh giới "sai nửa ancol ⇒ số sai không phát hiện".
3. **[VỪA H3]** §9 mô tả `runOrganic` dựng ledger hư cấu cho sản phẩm đốt + gọi lại `answerQueries` v0 cho query định lượng.
4. **[VỪA H4]** §5.1 thêm guard `nO≥0`, `nC>0`, `nH>0` ⇒ violation khi vi phạm.
5. **[VỪA H5]** §6 trỏ tường minh nhánh class-k=1-thiếu-neo về cỗ máy liệt-kê §5.4.
6. **[THẤP]** Sửa chú thích O5 (n=2); chặn trần `measure.tol` hoặc quét-khoảng; ghi chú few-shot dùng dấu phẩy; cân nhắc kiểm chéo class↔contains.

*Không việc nào đòi làm lại thiết kế §5. Lõi thuật toán tất định + số học exact đã được máy xác
nhận 11/11. Các việc trên là chốt điểm tích hợp + bịt 1 lỗ ester trước khi có dòng code đầu tiên.*

---

*Phản biện dựa trên tái dựng ĐỘC LẬP (BigInt hữu tỉ thuần, không mượn code engine) + đọc code
thật `api/_lib/kernel/chem/**` + `scalar.ts`. Script kiểm chứng: `scratchpad/verify.mjs` (O1–O10
+ bonus, 11/11 KHỚP), `scratchpad/adversarial.mjs` (ADV-1..8). KHÔNG sửa spec, KHÔNG sửa code
engine, KHÔNG chạy full test suite — đúng ràng buộc task.*
