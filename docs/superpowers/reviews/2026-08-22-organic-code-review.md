# Phản biện CODE — Hóa Hữu cơ tầng 1 (đốt cháy→CTPT + este thủy phân)

- **Ngày**: 2026-08-22
- **Commit soi**: `bc797b5` (`feat(chem): Hóa hữu cơ tầng 1 …, 37 test`) — code đã commit sạch, không phải working-tree bẩn.
- **File soi THẬT**: `api/_lib/kernel/chem/organic.ts` (610 dòng), `organicSchema.ts`, `planSchema.ts` (refine cấp plan + dispatch), `runChem.ts` (DIFF 2a dispatch), `stoich.ts`/`balance.ts`/`formula.ts`/`rat.ts` (tầng dưới), test `organic.test.ts` + `organic-contract.test.ts`.
- **Cách làm**: chạy engine THẬT qua bundle commit `api/_lib/kernel-dist/index.mjs` (`chem.runChem`). Tính lại 10/10 bài O1–O10 **độc lập** bằng lớp phân số BigInt của riêng người soi (không nhân 10^k trên double, không tin test, không tin engine). Săn 6 loại lỗi + đề dịch-lệch bằng ~45 plan đối kháng. Harness: `scratchpad/indep.mjs`, `hunt.mjs`, `hunt2.mjs`.
- **Kỷ luật**: KHÔNG sửa code, KHÔNG chạy full suite.

---

## 1. Tính lại độc lập O1–O10 — **10/10 KHỚP TUYỆT ĐỐI**

Mỗi bài: từ m(CO2)/m(H2O)/tỉ khối → nC,nH,nO (phân số BigInt) → CTĐGN (LCM mẫu/GCD tử) → duyệt nghiệm nguyên [1,30] + lọc hóa trị → CTPT + n_A. Đối chiếu chuỗi CTPT **và** phân số exact engine trả.

| Bài | Người soi (BigInt độc lập) | Engine trả | Khớp |
|-----|-----|-----|-----|
| O1 | C2H6 (nA=1/10) | C2H6 | ✓ |
| O2 | C2H4O2 ; CTĐGN CH2O (nA=1/20) | C2H4O2 \| CH2O | ✓ |
| O3 | C3H8 (nA=1/10) | C3H8 | ✓ |
| O4 | C4H8 ; **m(H2O)=36/5** (nA=1/10) | C4H8 \| 36/5 | ✓ |
| O5 | C2H7N (nA=1/10) | C2H7N | ✓ |
| O6 | đa nghiệm — 29 CTPT C2H4…C30H60 | 29 CTPT y hệt + ok:false | ✓ |
| O7 | **m(muối)=41/5** (nEster=1/10, M muối=82) | 41/5 | ✓ |
| O8 | C3H6O2 (nA=1/10) | C3H6O2 | ✓ |
| O9 | C4H10 (nA=1/10) | C4H10 | ✓ |
| O10 | C2H6O (nA=1/10) | C2H6O | ✓ |

Phân số exact khớp đến từng tử/mẫu (41/5, 36/5, 7/20, 17353/2000…). **Lõi bài toán ngược đốt-cháy→CTPT là ĐÚNG.** Không có bài vàng nào "âm thầm trả sai".

---

## 2. Finding

### 🔴 CAO-1 — Guard este **THỦNG khi `acid` vắng**: đọc nhầm nửa ancol ⇒ **khối lượng muối/ancol SAI, ok:true, KHÔNG violation**

**Đây là câu trả lời cho "guard ester có thủng không": CÓ — thủng theo mặc định.**

`ester_hydrolysis.acid` là **optional** (`organicSchema.ts:80`). Guard độc lập (kiểm `ester == acid + alcohol − H2O`) chỉ chạy trong nhánh `if (op.acid)` (`organic.ts:490`). Khi **không khai acid**, nhánh `else` chỉ đẩy một dòng **trace cảnh báo** rồi vẫn ráp muối bằng `salt = ester + NaOH − alcohol` (`organic.ts:504`) — hoàn toàn phái sinh từ `alcohol` do LLM khai. `balance()` và tự-kiểm bảo toàn của `react()` đều **tautology** ở đây (muối được dựng ĐỂ cân bằng) nên KHÔNG bắt được nửa ancol sai.

Nghiêm trọng hơn: **bài vàng O7 và toàn bộ test atom-map H1 đều KHÔNG khai acid** → đường mặc định được chứng minh trong chính test là đường guard TẮT.

**Tái hiện (số thật, đã chạy):**
```js
// ester đúng CH3COOC2H5 (C4H8O2), NHƯNG LLM đọc nhầm ancol = CH3OH (đúng phải C2H5OH), KHÔNG khai acid
runChem({ ops: [{ op:'ester_hydrolysis', ester:'CH3COOC2H5', alcohol:'CH3OH',
                  esterAmount:{grams:'8,8'}, baseAmount:{excess:true} }],
          queries: [{ kind:'mass', of:'C3H5O2Na' }] })   // ← muối engine tự ráp
// → ok:TRUE, m = 48/5 = 9,6 g, KHÔNG violation.  (ĐÁP ĐÚNG phải là 8,2 g / muối CH3COONa)
//   query mass ancol 'CH3OH' → ok:true, 16/5 = 3,2 g (đúng phải 4,6 g C2H5OH)
```
Sai lệch **+1,4 g (+17%)** trên khối lượng muối, phục vụ với `ok:true` — người dùng không có cách nào biết.

Đối chứng — cùng đề sai nhưng **có khai acid** thì guard nổ đúng:
```
acid:'CH3COOH' + alcohol:'CH3OH' → violation "axit + ancol − H2O = C3H6O2 ≠ este C4H8O2", ok:false. ✓
```

**Hậu quả**: mọi plan este KHÔNG khai acid (mặc định, và là cách O7/H1 đang dùng) đều thiếu lưới độc lập cho nửa ancol. LLM dịch lệch nửa ancol ⇒ số muối/ancol sai âm thầm.

**Khuyến nghị (chốt trước khi ship nhánh este)**: đặt `acid` **bắt buộc** cho `ester_hydrolysis` (bỏ `.optional()`), để guard `ester = acid + alcohol − H2O` luôn chạy — khi đó muối = `acid + NaOH − H2O` được neo vào axit độc lập. (Kéo theo phải thêm `acid` vào O7 + test H1; đây là siết hợp đồng có chủ đích, không phải phá test.) Phương án mềm hơn — khi acid vắng thì **đẩy violation / hạ `ok=false`** thay vì chỉ trace — cũng đóng lỗ nhưng vẫn phá O7 (đang kỳ vọng ok:true). Trace suông là mức bảo vệ quá yếu cho một silent-wrong.

---

### 🟠 VỪA-1 — `finish is not defined`: ReferenceError trên MỌI nhánh buildModel thất bại

`organic.ts:421`:
```js
const built = buildModel(unknown, plan, vm, trace);
if (!built.ok) { errors.push({ message: built.error }); return finish(false); }
```
`finish` **không hề được định nghĩa** trong `organic.ts` (grep xác nhận: chỉ xuất hiện đúng 1 lần, chính dòng này). Mọi lần `buildModel` trả lỗi ⇒ `finish(false)` ném `ReferenceError`, bị outer try/catch của `runOrganic` (`organic.ts:606`) bắt và bail.

**Tái hiện (đã chạy):**
```
measure vapor_density THIẾU 'ref'  → errors: ["... thiếu 'ref' ...", "lỗi engine hữu cơ: finish is not defined"]
measure vapor_density ref='Xe'/'Uuo' (khí ngoài bảng SGK) → errors: ["Công thức ... nguyên tố lạ", "... finish is not defined"]
```
**Không silent-wrong** (luôn về `ok:false` nhờ outer catch), nhưng: (1) là code lỗi rõ ràng đã lọt vào bundle commit; (2) rò thông điệp nội bộ "finish is not defined" ra ngoài thay vì lý do hóa học sạch; (3) chứng tỏ **nhánh buildModel-fail CHƯA HỀ có test** — mọi test đốt cháy đều dùng ref H2/air hoặc molar_mass hợp lệ nên không bao giờ chạm dòng 421. Trigger thực tế: LLM dịch "tỉ khối so với khí X" lạ, hoặc gõ sai ref.

**Khuyến nghị**: thay `return finish(false)` bằng shape trả chuẩn (như các return khác của `runCombustion`): `return { ok:false, reactions:[], ledger:[], answers:[], scene: emptyScene, violations, errors, trace };`. Thêm 1 test ref lạ + 1 test thiếu ref.

---

### 🟡 THẤP-1 — Trùng op `combustion`/`measure` cùng chất: engine im lặng dùng CÁI ĐẦU, bỏ phần còn lại

`buildModel` dùng `plan.ops.find(...)` (`organic.ts:131–132`) → chỉ lấy op **đầu tiên**. Schema/refine không cấm khai 2 `combustion` (hay 2 `measure`) cho cùng một `organic_unknown`.

**Tái hiện:** `combustion #1 (co2 0,2; h2o 0,3)` + `combustion #2 (co2 999)` → engine trả **C2H6O, ok:true**, lặng lẽ nuốt op #2. Tương tự 2 `measure` (M=74 vs M=9999) → dùng 74. Nếu LLM chẻ dữ kiện thành 2 op (hoặc lặp), phần sau biến mất không dấu vết. Xác suất thấp (plan dị dạng) nhưng là silent data-drop. **Khuyến nghị**: refine cấp plan bắt lỗi khi > 1 `combustion`/`measure` trỏ cùng một `name`.

### 🟡 THẤP-2 — Trần duyệt nghiệm n≤30: nghiệm hợp lệ n≥31 bị báo "mâu thuẫn" (sai nguyên nhân)

Vòng `for n=minC..30` (`organic.ts:295`). Bài cho n=31 (ankan co2 3,1; h2o 3,2 → C31H64) trả `"không CTPT nào thỏa dữ kiện — đề/mô hình mâu thuẫn"`. Đây là **từ chối an toàn** (không bịa), nhưng thông điệp đổ cho "mâu thuẫn" trong khi nguyên nhân thật là **vượt trần quét**. Với THPT (đề thường C1–C6) trần 30 là dư; chỉ là chẩn đoán lệch. Biên n=30 (C30H62) chạy đúng. **Khuyến nghị**: tách thông điệp "vượt trần Cn (n>30, ngoài phạm vi v1)".

### 🟡 THẤP-3 — `determineSampleOxygen` bỏ qua `contains: N` khi thiếu `n2` (được lưới sau đỡ)

Nhánh class=none suy O từ khối lượng chỉ trừ `nN` lấy từ `n2` (`organic.ts:187`, mặc định 0), **không** đối chiếu với `contains`. Về lý thuyết, khai `contains:['C','H','O','N']` nhưng quên `n2` sẽ **gán nhầm khối lượng N vào O**. **Nhưng** đã thử: (a) không có m mẫu → đa nghiệm, từ chối; (b) có m mẫu → `reconstructOK` bắt buộc `nA·M(cand) == m mẫu` exact, mà CTPT thiếu N không thể khớp khối lượng mẫu có N ⇒ "không CTPT nào thỏa" (từ chối). Tức lưới `reconstruct` chặn được, **không silent-wrong**. Chỉ là chẩn đoán không nói rõ "đã khai N mà thiếu n2". Ưu tiên thấp.

---

## 3. Điểm son (đã kiểm THẬT, đáng ghi nhận)

- **Atom-map match bền** (H1 đạt mục tiêu): 5 biến thể chuỗi muối `CH3COONa / C2H3O2Na / C2H3NaO2 / NaC2H3O2 / CH3CO2Na` đều → **41/5** đúng. Chuỗi rác (`CH3-COO-Na`, `CH3COONA`, `ch3coona`) **từ chối sạch** (ok:false + lỗi parse), không trả bừa.
- **Đa nghiệm xử lý mẫu mực**: cả 7 lớp (chỉ co2, không neo/M) đều **liệt kê candidates + violation + ok:false**, không chọn bừa, không bail cụt. Đếm nghiệm khớp người soi (anken 29, ankan/ancol/axit/amin 30…).
- **Mọi guard mâu thuẫn NỔ ĐÚNG**: nO<0 (cả route khối-lượng lẫn route O2), hai-route-O lệch, khai C,H mà m mẫu lộ O (§10.4), M không chia hết M_ĐGN, thiếu-dữ-kiện-O (không mặc định O=0), class↔contains mâu thuẫn, class không N mà có n2 — tất cả từ chối, không bịa.
- **Số học hữu tỉ exact xuyên suốt**: 41/5, 36/5, 7/20, 17353/2000, 3/8 — không trôi float. `parseDecimal` chặn "1.000"/dấu-chấm-3-số nhập nhằng nghìn.
- **Lọc hóa trị chốt nghiệm không cần M**: CTĐGN CH3 → **duy nhất C2H6** (loại gốc C1H3 hóa trị lẻ, loại C3H9 vô lý). Đúng hóa học.
- **Chống ảo giác (assert) đúng**: `given_formula` sai (C3H8) và `given_mass` sai (CO2=10) đều → violation + ok:false, vẫn hiện CTPT tính được, **không xác nhận điều đề bịa**.
- **Este chất giới hạn đúng**: ester 0,1 + NaOH 0,05 → muối 4,1g, ester dư 0,05 mol, ancol 2,3g (ξ=min đúng). `oxygen_needed` cho amin (có N2 trong sản phẩm) cân bằng đúng 0,375 mol.
- **Không hồi quy vô cơ**: dispatch sớm (`hasOrganicOp`) chỉ bắt 4 op hữu cơ; plan vô cơ chạy nguyên vẹn — Al+HCl (V(H2)=7,437L; HCl dư 0,3 mol), Fe+CuSO4 (Cu 6,4g) đúng; dispatch KHÔNG nuốt plan species/mix. Cấm-trộn hữu-vô cơ chặn ở refine.

---

## 4. VERDICT — **cần sửa 1 (CAO) + 1 (VỪA) trước khi ship nhánh este; lõi đốt cháy sạch, ship được**

- **Lõi đốt cháy → CTPT: SẠCH.** 10/10 bài vàng khớp phân số exact bằng tính lại độc lập; mọi guard mâu thuẫn/đa nghiệm/ảo giác nổ đúng; không tìm thấy đường nào âm thầm trả sai CTPT. Nhánh này ship được.
- **Nhánh este: có 1 lỗ silent-wrong (CAO-1).** Guard `ester = acid + alcohol − H2O` **thủng theo mặc định** vì `acid` optional — đọc nhầm nửa ancol ⇒ 9,6g thay vì 8,2g, `ok:true`, không cờ. **Phải chốt `acid` bắt buộc (hoặc hạ ok=false khi acid vắng) trước khi tin nhánh este.**
- **VỪA-1** (`finish is not defined`) là lỗi code rõ ràng trong bundle commit, tuy được outer-catch che thành ok:false — nên vá + thêm test nhánh buildModel-fail.
- **3 THẤP** (trùng op nuốt lặng, trần n>30 báo sai nguyên nhân, contains-N-thiếu-n2) nên vá dần; không cái nào tạo silent-wrong hiện tại.

**Guard ester có thủng không? → CÓ, khi `acid` vắng (mặc định). Đã chứng minh bằng số: 9,6g sai âm thầm.**

---
*Harness tái hiện: `scratchpad/indep.mjs` (tính lại 10 bài), `scratchpad/hunt.mjs` + `hunt2.mjs` (~45 plan đối kháng). Không sửa một dòng code nào.*
