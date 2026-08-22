# Chem Pack v1 — HÓA HỮU CƠ TẦNG 1 (lớp 11–12): đốt cháy · lập CTPT · este cơ bản — Design Spec

**Ngày:** 2026-08-22
**Trạng thái:** DỰ THẢO — CHỜ PHẢN BIỆN CHUYÊN GIA HÓA (soi §5 thuật toán lõi, §11 mười bài contract, §15 điểm phân vân TRƯỚC khi cắt plan/thi công). Spec này từng mất trong sự cố quota — viết lại từ đầu, đã đọc lại code v0 thật.
**Phạm vi:** Mở rộng engine Hóa (nền vô cơ v0 — `2026-08-21-chem-pack-design.md`, đã qua phản biện phiên 1 `../reviews/2026-08-21-chem-review-phien1.md`) sang **hóa hữu cơ tầng 1**: bài toán ĐỐT CHÁY → tìm CÔNG THỨC PHÂN TỬ (CTPT) của CxHyOzNt, dãy đồng đẳng cơ bản, và este no đơn chức (thủy phân NaOH + đốt cháy). Chỉ **THÊM file** `organic.ts` (+ `organicSchema.ts` + test) vào `api/_lib/kernel/chem/**`; điểm chạm với v0 gói trong **2 FILE** (`planSchema.ts`, `runChem.ts`) — kê DIFF trung thực từng dòng ở §12. **KHÔNG phá 151 test chem v0.**

**Ràng buộc kế thừa (ĐÃ CHỐT ở phản biện v0 — không mở lại):**
- **Triết lý chống ảo giác:** LLM chỉ DỊCH đề → khai **số đo** (mol/khối lượng CO2, H2O, N2, O2 tiêu thụ; tỉ khối hơi; khối lượng mẫu) vào op. LLM **KHÔNG** lập CTĐGN, **KHÔNG** lập CTPT, **KHÔNG** tính mol, **KHÔNG** biện luận n. ENGINE tất định làm toàn bộ. Không có ô schema nào để LLM nộp một công thức đã suy.
- **Số học HỮU TỈ exact** qua `rat.ts` (bọc `Exact` radicand=1 của `../scalar`): `rat/addR/subR/mulR/divR/cmpR/minR/isZeroR/absR/ratToString/ratApprox/parseDecimal`. `divR` chia 0 THROW ⇒ mọi tầng phải guard/catch (F21). Toàn bộ nội bộ exact, KHÔNG dung sai.
- **Parser công thức `formula.ts`** (`parseFormula → Map<el,int>`, `molarMass → Rat`) đã **đọc được công thức hữu cơ cô đặc** không cần sửa: `"C2H6"`, `"CH3COOC2H5"`, `"CH3COONa"`, `"C2H5OH"`, `"C2H7N"` đều là chuỗi nguyên tố hợp lệ (mọi ký hiệu C,H,O,N,Na có trong `atomicMass.ts`). M(CH3COOC2H5)=M(C4H8O2)=88 tính đúng ngay bằng parser hiện có (đã kiểm §11). **KHÔNG** hỗ trợ ngoặc vuông `[...]` (grammar §5 v0) — không dùng ở tầng 1.
- **NTK SGK VN** (`atomicMass.ts`): H=1, C=12, N=14, O=16, Na=23 (đã đủ; Ar đã bị bỏ theo F15). Không thêm nguyên tố cho tầng 1.
- **`molarVolume` default = 24,79** (đkc GDPT 2018); đề "đktc" ⇒ 22,4. Dùng chung `MOLAR_VOLUMES` của v0.
- **Tol HAI TẦNG (F10):** đối chiếu nội bộ (bảo toàn nguyên tố, rút CTĐGN, so mol) = **EXACT** (cmpR=0). Chỉ khâu đối chiếu **dữ kiện ĐỀ đã làm tròn** (tỉ khối hơi "2,07", M≈…) mới mang `tol` TƯƠNG ĐỐI (default như v0 nhưng nới cho M — §10). Bảo toàn **KHÔNG** bắt được sai *khai tập nguyên tố* — §10.4 (bản sao của cảnh báo §9.5 v0: "bảo toàn không bắt được sai miền áp dụng").
- **Tags 4 tầng** `hoa/<lop>/<chuong>/<skill>` (F14), khớp regex `^[a-z0-9-]+(\/[a-z0-9-]+){3}$` — §13. Registry (P0 `taxonomy/tags.ts`) PHẢI được bổ sung các tag hữu cơ, nếu không `isKnownTag` drop lặng lẽ (bản sao TODO của `reactionDB.ts`).
- **runChem KHÔNG BAO GIỜ throw:** plan hợp-lệ-schema hỏng ⇒ `errors[]`/`violations[]` + `ok:false`; lưới cuối try/catch. Contract kết quả giữ nguyên `{ ok, reactions, ledger, answers, scene, violations, errors, trace }`.
- **"Thà ít mà đúng":** phủ hẹp nhưng mỗi dạng tất định + tự kiểm; đa nghiệm ⇒ **trả danh sách + violation "đề thiếu dữ kiện"**, TUYỆT ĐỐI không bịa một đáp. NGOÀI phạm vi liệt kê rõ §14.

---

## 1. Mục tiêu (một câu)

Bài đốt cháy/lập CTPT/este cơ bản: **LLM chỉ DỊCH đề → khai số đo vào 4 op hữu cơ (`organic_unknown` / `combustion` / `measure` / `ester_hydrolysis`); ENGINE tất định quy số đo → mol từng nguyên tố (bảo toàn C/H/O/N exact), rút CTĐGN bằng ước số chung hữu tỉ, chốt CTPT bằng M (từ tỉ khối) hoặc bằng ràng buộc dãy đồng đẳng qua duyệt nghiệm nguyên chặn n=1..30 — tất định; TỰ KIỂM 4 phép (bảo toàn nguyên tố · M khớp · độ bất bão hòa k nguyên ≥0 · hóa trị y hợp lệ); nhiều CTPT thỏa ⇒ trả DANH SÁCH + violation, không bịa.** Este dùng lại stoichiometry v0 (dựng phương trình cụ thể + `react()`). Mô hình không khớp dữ kiện ⇒ violation.

## 2. Nền tảng & tái dùng (đã đọc code v0 thật)

| Cần | Đã có (v0) | Dùng lại thế nào |
|---|---|---|
| Số hữu tỉ exact (mol, tỉ lệ, M) | `rat.ts` | Mọi đại lượng hữu cơ THPT là hữu tỉ (NTK tròn/·,5) — không cần căn |
| Nguyên tố → chỉ số, M | `formula.ts` `parseFormula`/`molarMass` | Đọc công thức cô đặc hữu cơ + tính M(muối) qua **cộng/trừ atom-map** (§7) |
| NTK SGK VN | `atomicMass.ts` | C,H,O,N,Na đủ cho tầng 1 |
| parse thập phân VN an toàn ("2,479"; chặn "1.000") | `rat.ts` `parseDecimal` + `Qty` schema | Số đo đề cho đi qua Qty (>0) y hệt v0 |
| Đổi lít khí ↔ mol (22,4 / 24,79) | `stoich.ts` `MOLAR_VOLUMES`, `amountToMol` | CO2/O2/khí hữu cơ nhỏ quy mol; **H2O KHÔNG** (nước lỏng — §15.1) |
| Cân bằng PTHH exact (nullspace) | `balance.ts` `balance()` | Cân **PT đốt cháy** CxHyOzNt+O2→CO2+H2O+N2 (khi đã có CTPT) ⇒ hệ số O2 + tự kiểm; và cân **thủy phân este** 1:1:1:1 |
| Chất hết/dư + sổ cái + bảo toàn khối lượng/nguyên tố exact | `stoich.ts` `react()`/`checkDomain` | Thủy phân este: dựng `ReactionRecord` cụ thể → `react()` (§7) — tự kiểm bảo toàn "miễn phí" |
| Đối chiếu dữ kiện đề có tol (F10) | `planSchema.ts` `ChemAssertSchema` + runChem tol | Đối chiếu M từ tỉ khối làm tròn |
| Khung plan/answer/contract | `planSchema.ts` / `runChem.ts` | THÊM op + query, dispatch nhánh hữu cơ (§12) |

**Điểm mới DUY NHẤT ngoài trường v0:** thuật toán **lập CTPT từ số đo đốt cháy** (rút CTĐGN + duyệt nghiệm nguyên + 4 tự kiểm) — không có ở vô cơ v0. Đây là lý do cần `organic.ts` riêng (§5). Mọi thứ khác là tái dùng.

## 3. Vì sao khớp engine này

- Toàn bộ số học là **hữu tỉ** (n(CO2)=8,8/44=1/5; tỉ lệ 1:2:1; M=30). `rat.ts` đóng kín, exact tuyệt đối.
- Lập CTĐGN = **rút một vectơ tỉ lệ hữu tỉ về nguyên tối giản** = nhân LCM mẫu → chia GCD (đúng khuôn `balance.ts` đã làm cho hệ số). Tất định, không epsilon.
- Chốt n trong CnH… = **duyệt nghiệm nguyên trong khoảng chặn [1,30]** + kiểm đẳng thức exact — bigint, không float, không thử-sai mù.
- Tự kiểm = **bảo toàn nguyên tố** (đúng 2 định luật engine đã có) + **hóa trị** (k = độ bất bão hòa nguyên ≥0). Cùng khuôn `violations`.
- Kiến thức "dãy đồng đẳng" là tập ĐÓNG, đếm được (ankan/anken/ankin/ancol-no-đơn/axit-no-đơn/este-no-đơn/amin-no-đơn) — người phản biện soi được từng công thức tổng quát.

## 4. Dạng bài phủ (v1 — thà ít mà đúng)

| Nhóm | Dạng | Op chính | Query |
|---|---|---|---|
| Lập CTPT (mode A: CTĐGN→CTPT) | đốt CxHy / CxHyOz / CxHyOzNt + tỉ khối ⇒ CTPT | `organic_unknown`+`combustion`+`measure` | `molecular_formula`, `empirical_formula`, `degree_unsaturation` |
| Lập CTPT (mode B: ràng buộc dãy) | biết loại chất (ankan/anken/…) + 1 số đo ⇒ n | `organic_unknown`(class)+`combustion` | `molecular_formula` |
| Dãy đồng đẳng — quan hệ mol | ankan nCO2<nH2O; anken nCO2=nH2O; ankin nCO2>nH2O | `combustion` | `molecular_formula`, `mol`/`mass` sản phẩm |
| Có N (amin no đơn) | đốt → CO2, H2O, N2 ⇒ CTPT | `organic_unknown`(class amin)+`combustion` | `molecular_formula` |
| Đa nghiệm | thiếu M ⇒ nhiều CTPT | như trên | `molecular_formula` ⇒ danh sách + violation |
| Este no đơn — đốt | nCO2=nH2O ⇒ CnH2nO2 | `organic_unknown`(class este)+`combustion` | `molecular_formula` |
| Este no đơn — thủy phân | RCOOR′ + NaOH → muối + ancol | `ester_hydrolysis` | `mass`(muối/ancol), `mol` |
| Lượng O2 đốt | V O2 cần đốt cháy A (sau khi có CTPT) | (suy từ CTPT) | `oxygen_needed` |

## 5. THUẬT TOÁN LÕI — số đo đốt cháy → CTĐGN → CTPT (`organic.ts`)

### 5.1. Bước 1 — số đo sản phẩm → MOL TỪNG NGUYÊN TỐ trong mẫu (bảo toàn nguyên tố, exact)

Mọi số đo (CO2, H2O, N2, O2, khối lượng mẫu) đã quy về **mol hữu tỉ** qua `amountToMol` (grams/mol/liters_gas; H2O chỉ grams|mol — §15.1). Từ **bảo toàn nguyên tố** của phản ứng đốt cháy tổng quát

> CxHyOzNt + O2 → x·CO2 + (y/2)·H2O + (t/2)·N2

engine tính mol nguyên tố **trong toàn bộ mẫu đốt**:

| Nguyên tố | Công thức (exact) | Điều kiện |
|---|---|---|
| C | `nC = n(CO2)` | luôn (mỗi CO2 có 1 C) |
| H | `nH = 2·n(H2O)` | luôn |
| N | `nN = 2·n(N2)` | khi có N2 (amin/hợp chất N) |
| O — route (a) khối lượng | `nO = (m_A − 12·nC − 1·nH − 14·nN) / 16` | khi biết **khối lượng mẫu** m_A |
| O — route (b) bảo toàn O2 | `nO = 2·n(CO2) + n(H2O) − 2·n(O2)` | khi biết **O2 tiêu thụ** |

- **Hai route O phải trùng** nếu đề cho cả m_A lẫn O2 (⇒ tự kiểm bảo toàn khối lượng, §5.4). Cả hai đều exact.
- **Không route nào khả dụng** (không m_A, không O2) và đề **không** khai `contains:['…','O']`/`class` chứa O ⇒ engine **KHÔNG suy bừa O=0**; nếu đề khai "hiđrocacbon"/`contains:['C','H']` ⇒ O=0 hợp lệ; nếu đề khai chứa O nhưng không đủ dữ kiện định lượng O ⇒ `violation` "thiếu dữ kiện xác định oxi (cần m mẫu, hoặc O2, hoặc loại hợp chất)". Đây là bẫy kinh điển học sinh mặc định O=0 — engine không mắc.

### 5.2. Bước 2 — CTĐGN (công thức đơn giản nhất) bằng rút tỉ lệ hữu tỉ

Vectơ `(nC, nH, nO, nN)` (bỏ nguyên tố = 0) là các `Rat`. Rút về **nguyên tối giản** (đúng khuôn `balance.ts`):

1. Nhân LCM các mẫu số → vectơ nguyên (bigint).
2. Chia GCD các tử → tối giản.
⇒ `(x', y', z', t')` = **CTĐGN** (empirical), M_emp = `molarMass` của atom-map đó (exact).

Ví dụ O2 (§11): `(1/10, 1/5, 1/10)` → ×10 → `(1,2,1)` → GCD 1 → **CH2O**, M_emp=30.

### 5.3. Bước 3 — CTPT: chốt bội số n bằng M, hoặc bằng ràng buộc dãy (duyệt nghiệm nguyên chặn)

CTPT = (CTĐGN)ₙ với n nguyên dương. Hai đường chốt n — **cả hai tất định**:

**Đường M (mode A):** cần M của A.
- M từ `measure`: `vapor_density` ref `H2`→M_ref=2, `air`→M_ref=29 (SGK; §15.2), hoặc công thức khí khác→`molarMass(ref)`; `M_A = d·M_ref`. Hoặc `molar_mass` cho thẳng. Hoặc `M_A = m_A / n_A` khi biết cả khối lượng và số mol mẫu.
- **d/M exact** (vd d/H2=15) ⇒ M_A exact ⇒ `n = M_A / M_emp` PHẢI là số nguyên exact (ngược lại ⇒ violation "M không chia hết cho M_ĐGN — dữ kiện mâu thuẫn").
- **d làm tròn** (vd d/kk=2,07) ⇒ M_A xấp xỉ ⇒ `n = round(M_A / M_emp)`, rồi **verify** `|n·M_emp − M_A| ≤ tol·M_A` (F10 hai tầng). Khoảng cách giữa hai ứng viên kề nhau là M_emp (≥14) ≫ sai số làm tròn ⇒ `round` chọn n **duy nhất, ổn định**.

**Đường dãy đồng đẳng (mode B):** không có M nhưng biết `class` ⇒ công thức tổng quát f(n) (§6). **Duyệt n = 1..30**, dựng CTPT ứng viên f(n), tính **số đo lý thuyết** (nCO2, nH2O, n(A)…) từ một dữ kiện neo (khối lượng mẫu, hoặc n(A), hoặc n(CO2)), giữ n **khớp exact** dữ kiện đề. Ví dụ O8: este `CnH2nO2`, m_A=7,4 g ⇒ với mỗi n: M=14n+32, n_A=7,4/M, nCO2=n·n_A; chỉ n=3 cho nCO2=3/10 (exact) ⇒ **C3H6O2**. (Duyệt là bigint/hữu tỉ, không float; chặn [1,30] đủ cho THPT — §15.7.)

### 5.4. Bước 4 — TỰ KIỂM 4 PHÉP cho MỖI CTPT ứng viên (§10 chi tiết)

Ứng viên CxHyOzNt chỉ được nhận khi thỏa **cả 4** (exact trừ (b) khi M làm tròn):

- **(a) Bảo toàn nguyên tố với dữ kiện đốt** — dựng lại số đo từ CTPT: `x·n_A = n(CO2)`, `(y/2)·n_A = n(H2O)`, `(t/2)·n_A = n(N2)` khớp exact; và **cân PT đốt bằng `balance.ts`** ⇒ hệ số O2 nguyên, hai vế cân — nếu m_A & O2 cùng cho thì bảo toàn khối lượng `m_A + m(O2) = m(CO2)+m(H2O)+m(N2)` exact.
- **(b) M khớp:** `M(CxHyOzNt) = M_A` (exact khi M exact; `≤ tol·M_A` khi tỉ khối làm tròn).
- **(c) Độ bất bão hòa** `k = (2x + 2 + t − y) / 2` là **số nguyên ≥ 0**.
- **(d) Hóa trị y hợp lệ:** `y > 0`, `y ≡ t (mod 2)`, `y ≤ 2x + 2 + t`. *(Với hợp chất C,H,O — t=0 — quy về "y chẵn, 0 < y ≤ 2x+2" như đề SGK; (c) và (d) là HAI MẶT của một ràng buộc hóa trị: y = 2x+2+t−2k.)*

**Kết luận:**
- Đúng **1** ứng viên thỏa ⇒ trả CTPT đó (+ CTĐGN + k trong `trace`).
- **≥ 2** ứng viên thỏa (thường do thiếu M — mode B không neo, hoặc mode A không có tỉ khối) ⇒ **trả DANH SÁCH ứng viên** (answer `candidates[]`) + **violation** `"đề thiếu dữ kiện: N CTPT cùng thỏa (…); cần M/tỉ khối để chốt duy nhất"`, `ok:false`. **KHÔNG bịa một đáp.**
- **0** ứng viên ⇒ violation "không CTPT nào thỏa dữ kiện — đề/mô hình mâu thuẫn".

## 6. Dãy đồng đẳng — công thức tổng quát & quan hệ mol (bảng đóng)

`class` ⇒ ràng buộc độ bất bão hòa k + số O/N cố định. Quan hệ **nCO2 − nH2O = n_A·(k − 1)** (hệ quả bảo toàn) cho **suy n_A từ hiệu** khi k ≠ 1 — tất định, exact:

| class | CT tổng quát | k | O | N | Quan hệ mol khi đốt (per mol A) | Suy n_A từ hiệu |
|---|---|---|---|---|---|---|
| `ankan` | CnH2n+2 | 0 | 0 | 0 | nH2O − nCO2 = n_A | **n_A = nH2O − nCO2** |
| `anken` | CnH2n | 1 | 0 | 0 | nCO2 = nH2O | (hiệu = 0 ⇒ cần neo khác: n_A / M / m) |
| `ankin` | CnH2n−2 | 2 | 0 | 0 | nCO2 − nH2O = n_A | **n_A = nCO2 − nH2O** |
| `ancol-no-don` | CnH2n+2O | 0 | 1 | 0 | nH2O − nCO2 = n_A | **n_A = nH2O − nCO2** |
| `axit-no-don` | CnH2nO2 | 1 | 2 | 0 | nCO2 = nH2O | cần neo khác |
| `este-no-don` | CnH2nO2 | 1 | 2 | 0 | nCO2 = nH2O | cần neo khác |
| `amin-no-don` | CnH2n+3N | 0 | 0 | 1 | nH2O − nCO2 = 1,5·n_A; nN2 = 0,5·n_A | **n_A = 2·nN2 = (nH2O−nCO2)/1,5** (hai route ⇒ tự kiểm) |
| `none` | tùy | (suy) | (suy) | (suy) | — | dùng mode A |

- Sau khi có n_A ⇒ `n = nCO2 / n_A` (số C), rồi ráp CT tổng quát ⇒ CTPT ⇒ chạy 4 tự kiểm (§5.4). Vẫn qua cùng cỗ máy ứng viên.
- **`axit-no-don` và `este-no-don` cùng CT CnH2nO2** — combustion KHÔNG phân biệt được (chỉ khác cấu tạo). CTPT vẫn duy nhất; phân biệt axit/este là việc lời giải, ngoài phạm vi (§14, §15.5).
- Kiểm chéo k: dù mode A hay B, k = (2x+2+t−y)/2 phải khớp k của `class` khai (lệch ⇒ violation "loại chất khai không khớp độ bất bão hòa tính được").

## 7. Este no đơn — thủy phân NaOH (tái dùng stoichiometry v0)

**Phản ứng mẫu (cố định, tham số hóa R,R′):** `RCOOR′ + NaOH → RCOONa + R′OH` (1:1:1:1). LLM khai **cấu trúc đọc được, không tính**: `ester` (công thức cô đặc, vd `CH3COOC2H5`) + `alcohol` (nửa ancol tách ra R′OH, vd `C2H5OH`) + `base: NaOH`. Engine derive phần còn lại:

1. **Muối bằng cộng/trừ atom-map** (không cần parser cấu trúc): `salt_atoms = ester_atoms + NaOH_atoms − alcohol_atoms`. Ví dụ `{C4,H8,O2} + {Na1,O1,H1} − {C2,H6,O1} = {C2,H3,O2,Na1}` = CH3COONa, M=82 (đã kiểm §11). M(muối) = `molarMass(salt_atoms)`.
2. **Cân bằng `balance.ts`** trên `[ester, NaOH] → [salt, alcohol]` ⇒ xác nhận hệ số 1:1:1:1 (nullspace dim 1). Lệch ⇒ error "không phải este đơn chức thủy phân 1:1 — ngoài phạm vi v1".
3. **Dựng `ReactionRecord` cụ thể** (id `ORG-ester`, reactants/products với hệ số vừa cân, state solution/liquid) rồi gọi **`stoich.react()`** với mol từ `esterAmount`/`baseAmount`. ⇒ tái dùng NGUYÊN sổ cái + **tự kiểm bảo toàn khối lượng & nguyên tố exact** của v0 (bắt mọi lỗi ráp muối). Query `mass`/`mol` của muối/ancol qua đường v0.

Ví dụ O7: 8,8 g CH3COOC2H5 (0,1 mol) + NaOH vừa đủ ⇒ n(muối)=0,1 ⇒ **m(CH3COONa)=8,2 g** (=41/5); bảo toàn: 8,8+4=8,2+4,6=12,8 ✓.

**Đốt cháy este no đơn** dùng chung §5–§6 với `class: 'este-no-don'` (nCO2=nH2O; O=2) — không cần cỗ máy riêng.

**Ranh giới este (§14):** chỉ **este no, đơn chức, mạch hở**, base **NaOH**. KHÔNG este đa chức/không no/thơm, KHÔNG chất béo (glixerol/chỉ số xà phòng/chỉ số axit), KHÔNG este của phenol (2 NaOH), KHÔNG peptit/amino axit.

## 8. Schema (`organicSchema.ts`, nối vào ChemPlanSchema v0)

Tái dùng `Qty` (parseDecimal, >0) và `AmountSchema` của v0. Combustion product dùng `ProductAmount` **hẹp hơn** (chỉ `grams|mol|liters_gas`, KHÔNG solution/excess). Bốn op mới + query mới nối vào các union v0 (DIFF §12).

```ts
// api/_lib/kernel/chem/organicSchema.ts
import { z } from 'zod';
import { Qty, AmountSchema } from './planSchema';        // v0 export thêm Qty (DIFF 1)

const ProductAmount = z.union([                          // sản phẩm đốt: KHÔNG solution/excess
  z.object({ grams: Qty }), z.object({ mol: Qty }), z.object({ liters_gas: Qty }),
]);
export const ElementSet   = z.enum(['C', 'H', 'O', 'N']);
export const OrganicClass = z.enum([
  'ankan','anken','ankin','ancol-no-don','axit-no-don','este-no-don','amin-no-don','none',
]);

export const OrganicUnknownOp = z.object({
  op: z.literal('organic_unknown'),
  name: z.string().min(1),                               // 'A'
  sample: ProductAmount.optional(),                      // khối lượng/mol mẫu đem đốt (route O qua m; M qua m/n)
  contains: z.array(ElementSet).optional(),              // tập nguyên tố ĐỀ khẳng định (vd ['C','H','O']); vắng ⇒ suy
  class: OrganicClass.default('none'),                   // gợi ý dãy đồng đẳng (ràng buộc k, O, N)
});

export const CombustionOp = z.object({
  op: z.literal('combustion'),
  of: z.string().min(1),                                 // tên chất bị đốt (khớp organic_unknown.name)
  co2: ProductAmount.optional(),
  h2o: z.union([z.object({ grams: Qty }), z.object({ mol: Qty })]).optional(), // KHÔNG liters_gas (§15.1)
  n2:  ProductAmount.optional(),
  o2:  ProductAmount.optional(),                         // O2 TIÊU THỤ (tùy chọn — route O (b) + tự kiểm khối lượng)
});

export const MeasureOp = z.object({
  op: z.literal('measure'),
  of: z.string().min(1),
  kind: z.enum(['vapor_density', 'molar_mass']),
  ref: z.union([z.literal('H2'), z.literal('air'), z.string()]).optional(), // vapor_density: so H2/kk/khí khác
  value: Qty,                                            // d hoặc M — SỐ ĐO đề cho
  tol: Qty.optional(),                                   // F10: d làm tròn ⇒ tol tương đối cho M (default §10)
});

export const EsterHydrolysisOp = z.object({
  op: z.literal('ester_hydrolysis'),
  ester: z.string().min(1),                              // 'CH3COOC2H5'
  alcohol: z.string().min(1),                            // 'C2H5OH' — nửa ancol (đọc cấu trúc, KHÔNG tính)
  base: z.literal('NaOH').default('NaOH'),               // v1 chỉ NaOH
  esterAmount: AmountSchema.optional(),
  baseAmount: AmountSchema.optional(),
});

// Query hữu cơ (nối vào ChemQuerySchema v0):
export const OrganicQueries = [
  z.object({ kind: z.literal('molecular_formula'), of: z.string() }),
  z.object({ kind: z.literal('empirical_formula'), of: z.string() }),
  z.object({ kind: z.literal('degree_unsaturation'), of: z.string() }),
  z.object({ kind: z.literal('oxygen_needed'), of: z.string(), as: z.enum(['mol', 'liters_gas']).default('mol') }),
];
```

- **Refine cấp plan (DIFF trong `planSchema.ts`):** plan **hoặc** thuần vô cơ (species/mix) **hoặc** thuần hữu cơ (organic_*), **CẤM TRỘN** op hữu cơ với op `mix` vô cơ trong một plan (hai pipeline tách bạch; đề hỗn hợp hiếm ⇒ bridge tách). `combustion.of`/`measure.of` phải khớp một `organic_unknown.name`.
- **Vì sao KHÔNG cho LLM tính (chống ảo giác):** schema chỉ nhận **số đo literal** — `co2/h2o/n2/o2` là lượng đo, `measure.value` là tỉ khối nguyên văn, `alcohol` là nửa cấu trúc. **Không có ô nào nhận CTĐGN, CTPT, hay n đã suy.** Engine suy tất.

**Answer mở rộng (DIFF `runChem.ts` — CỘNG trường optional, không phá v0):** `ChemAnswer` thêm `formula?: string` (CTPT/CTĐGN dạng chuỗi) + `candidates?: string[]` (khi đa nghiệm). Với `molecular_formula`: `exact = "C2H6"` (chuỗi), `approx=null`, `unit=''`, `text="CTPT của A là C2H6 (M = 30; CTĐGN CH3; k = 0)"`.

## 9. Chuẩn hóa op → mô hình & compute (`organic.ts` — thuần)

```ts
type OrganicModel = {
  name: string;
  moles: { C: Rat|null; H: Rat|null; O: Rat|null; N: Rat|null };  // mol nguyên tố trong mẫu (null = chưa xác định)
  nSample: Rat | null;      // mol mẫu (nếu suy được)
  M: { value: Rat; exact: boolean; tol: Rat } | null;            // M_A + cờ exact/tol (từ measure)
  klass: OrganicClass;
  containsDeclared: Set<'C'|'H'|'O'|'N'> | null;
};
```

- `runOrganic(plan)`: gom `organic_unknown`/`combustion`/`measure` theo `name` → `OrganicModel`; ester đi nhánh riêng (§7).
- `solveFormula(model)`: mode A nếu đủ mol nguyên tố (§5.2) → CTĐGN → chốt n (§5.3); mode B nếu `class≠none` & thiếu O-ratio → suy n_A theo §6 → CTPT; chạy 4 tự kiểm (§5.4) → 1 / danh sách / 0.
- Đáp `molecular_formula`/`empirical_formula`/`degree_unsaturation`/`oxygen_needed` (cái cuối: cân `balance.ts` PT đốt của CTPT ⇒ hệ số O2 ⇒ mol/lít). `mass`/`mol`/`volume_gas` của sản phẩm & muối/ancol đi qua đường v0.
- **KHÔNG throw:** suy biến (chia 0 khi n_A=0 ở anken thiếu neo; mol âm; M không chia hết) ⇒ `errors`/`violations`. Lưới cuối try/catch trong `runChem` (DIFF 2).

## 10. Tự kiểm 4 phép — ánh xạ tol HAI TẦNG (F10)

| Phép | Nội dung | Tầng dung sai |
|---|---|---|
| (a) Bảo toàn nguyên tố | dựng lại nCO2/nH2O/nN2 từ CTPT khớp số đo; cân PT đốt (`balance.ts`); m_A+mO2 = mCO2+mH2O+mN2 khi đủ | **EXACT** (cmpR=0) |
| (b) M khớp | M(CTPT) vs M_A | **EXACT** nếu d/M exact; **tol tương đối** nếu tỉ khối làm tròn |
| (c) k nguyên ≥ 0 | k=(2x+2+t−y)/2 ∈ ℤ≥0 | **EXACT** |
| (d) hóa trị y | y>0, y≡t(mod2), y≤2x+2+t | **EXACT** |

- Tầng nội bộ (rút CTĐGN, so mol, bảo toàn) **luôn exact** — như v0.
- **Tol cho M (b):** default **1e-2 tương đối** (tỉ khối SGK thường 2 chữ số ⇒ sai số ~0,5%; khoảng cách ứng viên = M_emp ≥14 ⇒ 1% an toàn), override bằng `measure.tol`. *(Khác default assert 1e-3 của v0 — ghi rõ để phản biện chốt, §15.6.)*
- Đề đối chiếu (`given_mass`/`given_mol` v0 + `given_formula` mới — assert CTPT="X") vẫn dùng đường asserts v0 để bắt bài "đề bịa đáp" (§11 bonus).

### 10.4. CẢNH BÁO — bảo toàn KHÔNG bắt được sai KHAI TẬP NGUYÊN TỐ (bản sao §9.5 v0)

Nếu LLM khai nhầm "hiđrocacbon" cho hợp chất **có oxi**, thì nC (từ CO2) và nH (từ H2O) vẫn dựng lại CO2/H2O đúng ⇒ **(a) không phát hiện**. Chỉ **(b) M** hoặc **khối lượng mẫu** (mC+mH < m_A ⇒ lộ oxi) mới bắt được. ⇒ Quy tắc: khi đề **không** cho m_A/M mà LLM khai `contains`/`class` thiếu O, engine **tin lời khai** (đúng như v0 tin miền áp dụng). Few-shot translator PHẢI khai đủ tập nguyên tố theo chữ đề ("chất hữu cơ A chứa C, H, O"). Đây là ranh giới trung thực, không phải lỗ hổng che giấu.

## 11. MƯỜI BÀI CONTRACT — tính tay từng bước (test `organic-contract.test.ts`)

Số đã kiểm bằng số học hữu tỉ tay + đối chiếu (đường Python, mọi đáp là phân số exact). Mỗi bài nêu **4 tự kiểm §5.4**. Test so `exact`/`formula` (chuỗi/phân số), không so float.

### Bảng tổng hợp 10 bài

| # | Dạng | Đề (rút gọn) | Đáp CTPT / số | Tự kiểm 4 phép |
|---|---|---|---|---|
| O1 | Đốt HC + **d/H2** | 8,8g CO2; 5,4g H2O; d/H2=15 | **C2H6** | (a)✓ (b) 30=30 exact (c) k=0 (d) y=6≤6 |
| O2 | Đốt CHO + **d/kk** (tol) | 3g A(C,H,O); 4,4g CO2; 1,8g H2O; d/kk=2,07 | **C2H4O2** | (a)✓ (b) 60≈60,03 **tol** (c) k=1 (d) y=4 |
| O3 | **Ankan** hiệu mol | ankan; 0,3 mol CO2; 0,4 mol H2O | **C3H8** | (a)✓ (c) k=0 (d) y=8≤8; nA=nH2O−nCO2=0,1 |
| O4 | **Anken** neo n_A | 0,1 mol anken; 8,96L CO2 (đktc); tính m H2O | **C4H8**; m(H2O)=**7,2g** (36/5) | (a)✓ (c) k=1; nCO2=nH2O tự kiểm ✓ |
| O5 | **Amin** có N | amin no đơn; 0,2 mol CO2; 0,35 mol H2O; 0,05 mol N2 | **C2H7N** | (a)✓ (c) k=0 (d) y=7≡t=1; nA=2nN2=(nH2O−nCO2)/1,5 hai route ✓ |
| O6 | **Đa nghiệm** | HC; nCO2=nH2O; không tỉ khối | **danh sách** (CH2)ₙ: C2H4,C3H6,C4H8,… + violation | (a)✓ (c) k=1; (b) THIẾU ⇒ ≥2 ứng viên |
| O7 | **Este thủy phân** | 8,8g CH3COOC2H5 + NaOH vừa đủ; m muối? | m(CH3COONa)=**8,2g** (41/5) | bảo toàn KL 12,8=12,8 exact (react v0) |
| O8 | **Este đốt** (duyệt n) | este no đơn; 7,4g A; 0,3 mol CO2 | **C3H6O2** | (a)✓ (c) k=1; duyệt n=1..30 ⇒ n=3 exact |
| O9 | **đkc 24,79** ankan | ankan; 9,916L CO2 (đkc); 9g H2O | **C4H10** | (a)✓ (c) k=0 (d) y=10≤10; nA=0,1 |
| O10 | **Ancol** | ancol no đơn; 0,2 mol CO2; 0,3 mol H2O | **C2H6O** | (a)✓ (c) k=0; O=1 theo class; nA=nH2O−nCO2=0,1 |

---

**O1 — Đốt hiđrocacbon, tỉ khối so H2.** *Đốt cháy hoàn toàn hiđrocacbon A thu được 8,8 g CO2 và 5,4 g H2O. Tỉ khối hơi của A so với H2 bằng 15. Tìm CTPT của A.*
```json
{ "ops": [
    { "op":"organic_unknown", "name":"A", "contains":["C","H"] },
    { "op":"combustion", "of":"A", "co2":{"grams":"8,8"}, "h2o":{"grams":"5,4"} },
    { "op":"measure", "of":"A", "kind":"vapor_density", "ref":"H2", "value":15 } ],
  "queries": [ { "kind":"molecular_formula", "of":"A" } ] }
```
**Tính tay:** n(CO2)=8,8/44=1/5 ⇒ nC=1/5; n(H2O)=5,4/18=3/10 ⇒ nH=3/5. Tỉ lệ nC:nH = 1/5 : 3/5 = 1:3 ⇒ **CTĐGN CH3** (M_emp=15). M_A=15·2=30 ⇒ n=30/15=**2** ⇒ **C2H6**. Tự kiểm: (a) 2·1/10=1/5=nCO2, 3·1/10=3/10=nH2O ✓; (b) 30=30 exact; (c) k=(4+2−6)/2=0; (d) y=6 chẵn ≤6. Duy nhất.

**O2 — Đốt hợp chất C,H,O, tỉ khối so không khí (đường khối lượng tìm O + tol).** *Đốt cháy hoàn toàn 3 g chất hữu cơ A (chứa C, H, O) thu được 4,4 g CO2 và 1,8 g H2O. Tỉ khối hơi của A so với không khí là 2,07. Tìm CTPT của A.*
```json
{ "ops": [
    { "op":"organic_unknown", "name":"A", "contains":["C","H","O"], "sample":{"grams":3} },
    { "op":"combustion", "of":"A", "co2":{"grams":"4,4"}, "h2o":{"grams":"1,8"} },
    { "op":"measure", "of":"A", "kind":"vapor_density", "ref":"air", "value":"2,07", "tol":"0,01" } ],
  "queries": [ { "kind":"molecular_formula", "of":"A" }, { "kind":"empirical_formula", "of":"A" } ] }
```
**Tính tay:** nC=4,4/44=1/10; nH=2·1,8/18=1/5; mC=1/10·12=6/5; mH=1/5·1=1/5; mO=3−6/5−1/5=8/5 ⇒ nO=8/5÷16=1/10. Tỉ lệ 1/10:1/5:1/10 = 1:2:1 ⇒ **CTĐGN CH2O** (M_emp=30). M_A≈2,07·29=60,03 ⇒ n=round(60,03/30)=**2**, verify |60−60,03|=0,03 ≤ 0,01·60,03=0,6 ✓ ⇒ **C2H4O2**. (b) dùng **tol** (đây là lý do F10 tồn tại). (c) k=1; (d) y=4 chẵn ≤6. *(CTPT C2H4O2 duy nhất; ứng nhiều CTCT — axit/este/tạp — là việc lời giải, §15.5.)*

**O3 — Ankan, phương pháp hiệu mol (nCO2 < nH2O).** *Đốt cháy hoàn toàn một ankan A thu được 0,3 mol CO2 và 0,4 mol H2O. Tìm CTPT của A.*
```json
{ "ops": [
    { "op":"organic_unknown", "name":"A", "class":"ankan" },
    { "op":"combustion", "of":"A", "co2":{"mol":"0,3"}, "h2o":{"mol":"0,4"} } ],
  "queries": [ { "kind":"molecular_formula", "of":"A" } ] }
```
**Tính tay:** ankan ⇒ nH2O>nCO2 ⇒ n_A = nH2O−nCO2 = 0,4−0,3 = 1/10. Số C n = nCO2/n_A = (3/10)/(1/10) = **3** ⇒ CnH2n+2 = **C3H8**. Tự kiểm: (a) 0,1 mol C3H8 cháy → 0,3 CO2, 0,4 H2O ✓; (c) k=0; (d) y=8≤8. Không cần M (class + hiệu chốt duy nhất).

**O4 — Anken, neo bằng số mol chất, tính thêm m H2O (đktc).** *Đốt cháy hoàn toàn 0,1 mol anken A (mạch hở) thu được 8,96 lít CO2 (đktc). Tìm CTPT của A và tính khối lượng H2O tạo thành.*
```json
{ "ops": [
    { "op":"organic_unknown", "name":"A", "class":"anken", "sample":{"mol":"0,1"} },
    { "op":"combustion", "of":"A", "co2":{"liters_gas":"8,96"} } ],
  "molarVolume": 22.4,
  "queries": [ { "kind":"molecular_formula", "of":"A" }, { "kind":"mass", "of":"H2O" } ] }
```
**Tính tay:** n(CO2)=8,96/22,4=2/5; n_A=1/10 ⇒ n=(2/5)/(1/10)=**4** ⇒ CnH2n = **C4H8** (k=1). Anken ⇒ nH2O=nCO2=2/5 ⇒ m(H2O)=2/5·18=36/5=**7,2 g**. Tự kiểm nCO2=nH2O ✓; (c) k=1. *(Engine DỰ ĐOÁN H2O từ class rồi trả — không cần đề cho.)*

**O5 — Amin no đơn chức (có N), hai route n_A.** *Đốt cháy hoàn toàn một amin no, đơn chức, mạch hở A thu được 0,2 mol CO2; 0,35 mol H2O và 0,05 mol N2. Tìm CTPT của A.*
```json
{ "ops": [
    { "op":"organic_unknown", "name":"A", "class":"amin-no-don" },
    { "op":"combustion", "of":"A", "co2":{"mol":"0,2"}, "h2o":{"mol":"0,35"}, "n2":{"mol":"0,05"} } ],
  "queries": [ { "kind":"molecular_formula", "of":"A" } ] }
```
**Tính tay:** nC=0,2; nH=2·0,35=0,7; nN=2·0,05=0,1. Tỉ lệ 0,2:0,7:0,1 = 2:7:1 ⇒ **CTĐGN C2H7N** (M_emp=45). n_A route N2 = 2·0,05 = 1/10; route hiệu = (0,35−0,2)/1,5 = 0,15/1,5 = 1/10 ⇒ **khớp** ✓. n=nCO2/n_A=2 ⇒ **C2H7N** (n=1 với CT tổng quát CnH2n+3N). (c) k=(4+2+1−7)/2=0; (d) y=7≡t=1 (mod 2), 7≤2·2+2+1=7 ✓. Duy nhất.

**O6 — Đa nghiệm, trả DANH SÁCH + violation.** *Đốt cháy hoàn toàn một hiđrocacbon A thu được số mol CO2 bằng số mol H2O. Không có thêm dữ kiện. Tìm CTPT của A.*
```json
{ "ops": [
    { "op":"organic_unknown", "name":"A", "contains":["C","H"] },
    { "op":"combustion", "of":"A", "co2":{"mol":"0,2"}, "h2o":{"mol":"0,2"} } ],
  "queries": [ { "kind":"empirical_formula", "of":"A" }, { "kind":"molecular_formula", "of":"A" } ] }
```
**Tính tay:** nC:nH = 0,2:0,4 = 1:2 ⇒ **CTĐGN CH2** (duy nhất, exact). Không tỉ khối ⇒ mode A không chốt n. Duyệt n=1..30, giữ ứng viên thỏa hóa trị (n≥2 vì HC có k=1 cần ≥2 C — §15.4): C2H4, C3H6, C4H8, C5H10, … ⇒ **≥2 ứng viên** ⇒ answer `empirical_formula="CH2"` (chốt được), `molecular_formula` trả `candidates:["C2H4","C3H6","C4H8",…]` + **violation** `"đề thiếu dữ kiện: nhiều CTPT (CH2)ₙ cùng thỏa; cần M/tỉ khối để chốt"`, `ok:false`. **KHÔNG bịa C2H4.**

**O7 — Este no đơn, thủy phân NaOH, tính m muối (tái dùng stoich v0).** *Xà phòng hóa hoàn toàn 8,8 g etyl axetat (CH3COOC2H5) bằng dung dịch NaOH vừa đủ. Tính khối lượng muối thu được.*
```json
{ "ops": [
    { "op":"ester_hydrolysis", "ester":"CH3COOC2H5", "alcohol":"C2H5OH",
      "esterAmount":{"grams":"8,8"}, "baseAmount":{"excess":true} } ],
  "queries": [ { "kind":"mass", "of":"CH3COONa" } ] }
```
**Tính tay:** M(CH3COOC2H5)=C4H8O2=88 ⇒ n=8,8/88=1/10. Muối = ester+NaOH−ancol atom-map = C2H3O2Na (CH3COONa, M=82). NaOH vừa đủ ⇒ n(muối)=1/10 ⇒ **m=1/10·82=41/5=8,2 g**. Tự kiểm (react v0): bảo toàn KL 8,8+0,1·40=8,2+0,1·46 ⇒ 12,8=12,8 exact; bảo toàn nguyên tố exact. *(Muối CH3COONa suy bằng cộng/trừ atom — không do LLM ráp.)*

**O8 — Este no đơn, đốt cháy, chốt n bằng DUYỆT NGHIỆM NGUYÊN.** *Đốt cháy hoàn toàn 7,4 g một este no, đơn chức, mạch hở A thu được 0,3 mol CO2. Tìm CTPT của A.*
```json
{ "ops": [
    { "op":"organic_unknown", "name":"A", "class":"este-no-don", "sample":{"grams":"7,4"} },
    { "op":"combustion", "of":"A", "co2":{"mol":"0,3"} } ],
  "queries": [ { "kind":"molecular_formula", "of":"A" } ] }
```
**Tính tay:** este no đơn CnH2nO2, M=14n+32. Duyệt n=1..30: n_A=7,4/(14n+32), nCO2_lý_thuyết=n·n_A; giữ n cho nCO2=3/10 exact. n=3: M=74, n_A=7,4/74=1/10, nCO2=3·1/10=3/10 ✓ (các n khác lệch) ⇒ **C3H6O2**. (c) k=1; (d) y=6 chẵn ≤8. Duy nhất. *(Đây là minh họa cỗ máy duyệt nghiệm nguyên chặn §5.3.)*

**O9 — Ankan, thể tích ở đkc (24,79); nước đo bằng khối lượng.** *Đốt cháy hoàn toàn một ankan A thu được 9,916 lít khí CO2 (đkc, 25 °C 1 bar) và 9 g H2O. Tìm CTPT của A.*
```json
{ "ops": [
    { "op":"organic_unknown", "name":"A", "class":"ankan" },
    { "op":"combustion", "of":"A", "co2":{"liters_gas":"9,916"}, "h2o":{"grams":9} } ],
  "queries": [ { "kind":"molecular_formula", "of":"A" } ] }
```
**Tính tay:** n(CO2)=9,916/24,79=2/5; n(H2O)=9/18=1/2. Ankan ⇒ n_A=nH2O−nCO2=1/2−2/5=1/10. n=(2/5)/(1/10)=**4** ⇒ **C4H10** (k=0; y=10≤10). *(CO2 đo bằng thể tích khí ở đkc — hợp lệ; H2O đo bằng KHỐI LƯỢNG vì nước là chất lỏng ở đkc — §15.1. Nếu plan khai `h2o:{liters_gas}` ⇒ engine error.)* molarVolume default 24,79.

**O10 — Ancol no đơn chức.** *Đốt cháy hoàn toàn một ancol no, đơn chức, mạch hở A thu được 0,2 mol CO2 và 0,3 mol H2O. Tìm CTPT của A.*
```json
{ "ops": [
    { "op":"organic_unknown", "name":"A", "class":"ancol-no-don" },
    { "op":"combustion", "of":"A", "co2":{"mol":"0,2"}, "h2o":{"mol":"0,3"} } ],
  "queries": [ { "kind":"molecular_formula", "of":"A" } ] }
```
**Tính tay:** ancol no đơn CnH2n+2O (O=1 theo class), nH2O>nCO2 ⇒ n_A=nH2O−nCO2=0,3−0,2=1/10. n=(0,2)/(1/10)=**2** ⇒ **C2H6O** (M=46). (a)✓; (c) k=(4+2−6)/2=0; (d) y=6 chẵn ≤6. *(C2H6O = ancol etylic hoặc đimetyl ete — CTPT duy nhất; O=1 lấy từ class, KHÔNG cần khối lượng mẫu.)*

**Bonus (bắt buộc, như bài 11 v0) — chống ảo giác:** lấy plan O1, thêm assert `given_formula` (đề bịa "CTPT là C3H8") hoặc `given_mass CO2 = 10`. Engine trả `ok:false` + violation "engine tính C2H6 ≠ C3H8 đề cho / mô hình lệch dữ kiện" — **không** sửa mô hình cho khớp.

**Phủ:** d/H2(O1) · d/kk+tol(O2) · route O khối lượng(O2) · route O bảo toàn O2 (unit test) · hiệu mol ankan(O3,O9)/ancol(O10) · neo n_A anken(O4) · N2→amin(O5) · duyệt nghiệm nguyên(O8) · đa nghiệm+danh sách(O6) · este thủy phân react v0(O7) · 22,4(O4)/24,79(O9) · dự đoán sản phẩm từ class(O4) · chống ảo giác(bonus). `oxygen_needed`, `degree_unsaturation`, `axit-no-don`, `ankin`, mode-B-M-đủ, `contains` suy tự động: phủ ở **unit test** (`organic.test.ts`) — không tốn bài contract.

## 12. Cấu trúc file & DIFF TRUNG THỰC (bài học OS-4 của pack Lý: KHÔNG viết "2 dòng")

```
api/_lib/kernel/chem/
  organicSchema.ts   MỚI — §8: OrganicUnknownOp, CombustionOp, MeasureOp, EsterHydrolysisOp, OrganicQueries
  organic.ts         MỚI — §5,§6,§7,§9 THUẦN: elementMolesFromCombustion; empiricalFormula (LCM/GCD bigint);
                       molecularCandidates (duyệt 1..30 + 4 tự kiểm); homologSolve (n_A theo class); esterHydrolysis
                       (atom-map muối + balance + dựng record + react v0); runOrganic dispatch; answer formula
  planSchema.ts   (v0) ← DIFF 1:
                    (a) EXPORT `Qty` và `AmountSchema` (đang là const nội bộ) để organicSchema import — 2 dòng `export`;
                    (b) import 4 op + OrganicQueries từ './organicSchema';
                    (c) thêm 4 op vào union `ops`; thêm OrganicQueries (spread) vào union `queries`;
                    (d) thêm `given_formula` vào ChemAssertSchema (assert CTPT — chống ảo giác);
                    (e) superRefine CẤP PLAN: CẤM trộn op hữu cơ với op `mix` vô cơ; combustion.of/measure.of khớp
                        một organic_unknown.name;
                    ⇒ (c)–(e) là LOGIC MỚI (~20–25 dòng) + test planSchema v0 chạy kèm giữ nguyên.
  runChem.ts      (v0) ← DIFF 2:
                    (a) sau safeParse: nếu plan chứa op hữu cơ ⇒ `return runOrganic(parsed.data, ...)` (dispatch SỚM,
                        TRƯỚC toàn bộ nhánh species/mix v0) — plan v0 KHÔNG chứa op hữu cơ nên rẽ nhánh else y cũ;
                    (b) `ChemAnswer` thêm `formula?: string` + `candidates?: string[]` (optional — không phá v0);
                    (c) try/catch lưới cuối quanh runOrganic đổi Error → errors[] (KHÔNG throw).
                    ⇒ nhánh v0 species/mix KHÔNG đổi một dòng logic; 151 test v0 xanh nguyên.
  __tests__/organic.test.ts           MỚI — unit: empirical, candidates, homolog, ester, các route O, lỗi/suy biến
  __tests__/organic-contract.test.ts  MỚI — 10 bài §11 + bonus chống ảo giác
```

- **Import được phép:** `../scalar`(gián tiếp qua rat), `./rat`, `./formula`, `./atomicMass`, `./stoich`(react/parsePositive/amountToMol/MOLAR_VOLUMES), `./balance`, `./reactionDB`(type ReactionRecord/SpeciesState), `./planSchema`, `./organicSchema`, `zod`. KHÔNG import ngược core, KHÔNG sửa `run.ts`/`index.ts` gốc/`src/**`.
- **Ranh giới cứng kế thừa v0:** baseline **151 test chem v0 + 1072 test toàn suite** phải xanh nguyên; chem chỉ CỘNG test mới (~30–40: organic ≈20, contract 10 bài ≈ 20 assert). `npx tsc --noEmit -p tsconfig.kernel.json` sạch. `git diff --stat` chỉ chứa `api/_lib/kernel/chem/**` + 1 doc này.
- **Chưa nối route/bridge/prompt** (P4 của rollout — `chemTranslatorPrompt.js` few-shot hữu cơ + quota). Ghi tại đây để không rơi mất.
- **Đồng bộ registry:** tag hữu cơ §13 PHẢI được thêm vào `taxonomy/tags.ts` (P0) — nếu không `isKnownTag` drop lặng lẽ (đúng cảnh báo TODO của `reactionDB.ts`). Kèm test membership cross-module.

## 13. Taxonomy tags đề xuất (registry P0 seed thêm; bridge P4 gắn)

Khớp regex `^[a-z0-9-]+(\/[a-z0-9-]+){3}$`, `<lop>` theo GDPT 2018 (hidrocacbon/ancol lớp 11; este-lipit/amin lớp 12):

`hoa/11/dai-cuong-huu-co/lap-cong-thuc-phan-tu` · `hoa/11/hidrocacbon/ankan` · `hoa/11/hidrocacbon/anken` · `hoa/11/hidrocacbon/ankin` · `hoa/11/ancol/dot-chay-tim-ctpt` · `hoa/11/axit-cacboxylic/dot-chay` · `hoa/12/este-lipit/dot-chay-este` · `hoa/12/este-lipit/thuy-phan-este` · `hoa/12/amin/dot-chay-tim-ctpt`

## 14. NGOÀI phạm vi v1 (ghi rõ, có chủ đích — "thà ít mà đúng")

- **Cấu tạo / đồng phân / danh pháp:** engine trả CTPT (molecular formula), KHÔNG đếm/đặt tên đồng phân, KHÔNG suy CTCT (axit vs este cùng CnH2nO2 — §15.5).
- **Hợp chất đa chức / không no có O:** ancol đa chức (glixerol, etylen glicol), anđehit/xeton, axit không no/đa chức, ancol không no — chỉ nhận **no, đơn chức** ở v1.
- **Este nâng cao:** este đa chức, este không no/thơm, **chất béo** (chỉ số xà phòng/chỉ số axit/số trieste), este của phenol (2 NaOH), phản ứng este hóa (chiều thuận, hiệu suất, Kc).
- **Amin nâng cao / N khác:** amin bậc/đa chức, amino axit, peptit/protein, muối amoni hữu cơ, đốt tìm CTPT amin không no.
- **Phản ứng hữu cơ khác:** thế/cộng/tách/trùng hợp/trùng ngưng, phản ứng đặc trưng (tráng bạc, Cu(OH)2, Br2…), sơ đồ chuỗi biến hóa.
- **Halogen/lưu huỳnh trong hợp chất hữu cơ** (dẫn xuất halogen): NTK Cl/Br có nhưng route tìm CTPT chứa halogen để **v-next** (thêm phép chuẩn độ AgNO3).
- **Hiệu suất, hỗn hợp nhiều chất hữu cơ + hệ phương trình, bài NGƯỢC** (cho CTPT tính lượng — một phần đã có qua combustion op nhưng hỗn hợp thì v-next), **sản phẩm cháy hấp thụ vào bình kiềm ra bài 2 muối** (đã ngoài phạm vi ở v0 vô cơ).
- **Hơi nước ở nhiệt độ cao coi là khí** ("sản phẩm cháy ở 136,5 °C") — v1 chốt nước là chất lỏng (§15.1).

## 15. ĐIỂM CẦN PHẢN BIỆN HÓA HỌC (tác giả KHÔNG chắc — soi kỹ giúp, TRƯỚC khi code)

1. **Hơi nước có tính vào thể tích khí ở "đktc/đkc" không? (điểm phân vân TRỌNG TÂM).** Chốt hiện tại: **KHÔNG** — ở 0 °C (đktc) và 25 °C (đkc) nước là **chất lỏng**, nên H2O đo bằng **khối lượng/mol**, `combustion.h2o` KHÔNG nhận `liters_gas` (engine error). CO2/O2/N2 mới quy thể tích khí. Căn cứ SGK: bài toán chuẩn "dẫn sản phẩm cháy qua bình H2SO4 đặc (hút nước) rồi qua bình Ca(OH)2/kiềm (giữ CO2)" — tách nước ra khỏi khí; "V khí sau phản ứng" mặc định KHÔNG gồm hơi nước. Bản sao luật VỪA-5 v0 (H2O ∉ GAS_SET). **Hỏi chuyên gia:** (a) chốt này có đúng chuẩn SGK/đề VN hiện hành? (b) có đề tầng-1 nào buộc coi hơi nước là khí (VD "hỗn hợp khí và hơi" ở nhiệt độ cao) mà ta đang loại đúng — hay cần một cờ `waterAsVapor` cho đề nâng cao (đề nghị: KHÔNG, để v-next)?

2. **M không khí = 29 hay 28,8?** Chốt **29** (0,8·28+0,2·32=28,8 làm tròn 29 — quy ước SGK gần như phổ quát). Nhưng vài sách/đề dùng 28,8 ⇒ với d/kk cho sẵn, M_A lệch ~0,7%. Tol 1e-2 (§10) nuốt được chênh này nên n vẫn chốt đúng. **Hỏi:** giữ 29 cứng, hay cho `measure` khai `ref` là số M_ref tùy ý (đề tự cho M không khí)? (đề nghị: 29 mặc định + cho ref số tùy chọn.)

3. **Duyệt n=1..30 — trần đủ chưa, và xử lý khi M pin sẵn?** THPT hầu như C≤~20 (trừ polime/lipit ngoài phạm vi). Khi có M exact, n chốt thẳng (không duyệt); duyệt chỉ cho mode B (class + neo) và liệt kê đa nghiệm. **Hỏi:** trần 30 hợp lý? Có nên hạ 20 cho gọn, hay nâng 40 phòng đề lạ?

4. **C1H2 và "hiện thực hóa" ngoài hóa trị.** Kiểm hóa trị (c)(d) CHO C1H2 (k=1, y=2 chẵn) qua được, nhưng CH2 (cacben) KHÔNG là phân tử bền — hiđrocacbon k≥1 cần **C≥2**. Chốt hiện tại: thêm luật rẻ "HC có k≥1 ⇒ x≥2" (loại C1H2 khỏi danh sách O6); KHÔNG kiểm hiện-thực-hóa-đồ-thị đầy đủ (YAGNI). **Hỏi:** bộ luật hiện-thực tối thiểu nên gồm gì nữa (VD ankin/ankađien x≥2? ancol x≥1 OK? amin x≥1 OK)? Có nên chặn cả "y lẻ khi t chẵn" — đã có ở (d).

5. **Axit vs este cùng CnH2nO2 — trả gì?** Combustion chỉ ra **CTPT duy nhất** (C2H4O2), không phân biệt HCOOCH3 (este) / CH3COOH (axit) / HOCH2CHO (tạp chức). Chốt: query `molecular_formula` trả CTPT; KHÔNG liệt kê CTCT. **Hỏi:** có nên phát một `info` "CTPT này ứng nhiều loại chất (axit/este/…)" để lời giải cảnh báo, hay im lặng (đề nghị: một dòng info trong `trace`, không thành violation)?

6. **Tol cho M từ tỉ khối làm tròn — 1e-2 hay giữ 1e-3 như v0?** Đề nghị **1e-2 tương đối** (tỉ khối 2 chữ số ⇒ sai ~0,5%; khoảng cách ứng viên = M_emp ≥14 ⇒ 1% rất an toàn, round-then-verify không bao giờ nhầm). Khác default assert 1e-3 của v0. **Hỏi:** chấp nhận hai default khác nhau (nội bộ 1e-3, M-từ-tỉ-khối 1e-2), hay thống nhất + luôn cho `measure.tol` override? Và cách chốt n: **round-then-verify** (đề nghị) hay **quét khoảng** [M/(M_emp·(1+tol)), M/(M_emp·(1−tol))] tìm nghiệm nguyên (tổng quát hơn, bắt được ca "nhiều n trong dải" ⇒ đa nghiệm)?

7. **Este: LLM khai nửa `alcohol` — có phạm "LLM tính hộ"?** Chốt: LLM đọc **cấu trúc** (etyl axetat ⇒ ancol C2H5OH), engine derive muối bằng **cộng/trừ atom-map** + `balance` + `react` (bảo toàn tự kiểm). Tương tự `direction` "đọc dấu" của pack Lý. **Hỏi:** (a) đây có đúng tinh thần chống ảo giác (đọc ≠ tính)? (b) hay nên bắt LLM khai **cả axit lẫn ancol** rồi engine kiểm `ester = axit + ancol − H2O` (thêm một tự kiểm este hóa)? (c) hay tham vọng hơn: mở rộng `formula.ts` nhận nhóm chức để tự tách −COO− (đề nghị: KHÔNG ở v1 — parser đếm-nguyên-tử là đủ, atom-map + conservation đã chặn lỗi)?

8. **Bảo toàn KHÔNG bắt sai khai tập nguyên tố (§10.4).** Khi thiếu m_A/M mà LLM bỏ sót O, engine tin lời khai. Chốt: giống v0 tin miền áp dụng — trách nhiệm dồn về few-shot khai đủ `contains` theo chữ đề. **Hỏi:** có nên **bắt buộc** `sample`(m_A) hoặc `measure`(M) khi `class`/`contains` cho biết có O (để luôn có đường bắt lỗi O), hay chấp nhận tin khai cho đề "biết trước là ancol/este" (đề nghị: chấp nhận + ghi rõ ranh giới)?

9. **`n2` đo bằng gì, và N từ đâu?** Chốt: N2 đo bằng mol/thể tích khí (N2 là khí thật ở đkc — khác H2O); nN=2·nN2. Đề amin đôi khi cho **%N** hoặc M thay vì N2. **Hỏi:** v1 có cần nhận `%N`/route N qua M (M_amin ⇒ n từ 14/M) không, hay chỉ N2 + class là đủ cho tầng 1 (đề nghị: chỉ N2 + class; %N để v-next)?

10. **Dựng `ReactionRecord` cụ thể cho este có phá nguyên tắc "chỉ phản ứng trong DB" của v0?** v0 cấm suy phản ứng mới; nhưng thủy phân este là **họ phản ứng có cơ chế cố định** (RCOOR′+NaOH→RCOONa+R′OH), engine chỉ **thực thi hóa template**, LLM không chế phản ứng. Chốt: hợp lệ vì template cứng + `balance`/`react` tự kiểm. **Hỏi:** chuyên gia đồng ý xem đây là "phản ứng tham số hóa trong DB mở rộng" (ghi 1 template = 1 record động), hay muốn tách hẳn ester ra một cỗ máy stoich riêng không mượn `react()` (đề nghị: mượn `react()` để hưởng tự kiểm bảo toàn)?

---

*Spec DỰ THẢO — chờ phản biện chuyên gia Hóa. Mọi khẳng định về code v0 (rat/formula/atomicMass/stoich.react/balance/planSchema/runChem, parser đọc được công thức hữu cơ cô đặc, NTK SGK) dựa trên ĐỌC code thật `api/_lib/kernel/chem/**`. Mười bài contract O1–O10 đã kiểm tay bằng số học hữu tỉ + đối chiếu (mọi đáp là phân số exact: 32/5, 41/5, 36/5, …). Điểm mới ngoài trường v0 là thuật toán lập CTPT (§5) — thiết kế bám khuôn rút-hệ-số của `balance.ts` (LCM/GCD bigint) + duyệt nghiệm nguyên chặn, tất định tuyệt đối, và 4 tự kiểm bám 2 định luật bảo toàn engine đã có.*
