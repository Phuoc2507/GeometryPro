# Chem Pack — Mở rộng v1 (đợt 2): 7 ứng viên + phi kim + 3 cơ chế mới

**Ngày:** 2026-08-21
**Trạng thái:** Spec chờ PHẢN BIỆN CHUYÊN GIA HÓA (soi từng record §2–§3, từng thuật toán §4, từng bài contract §5 trước khi thi công).
**Phạm vi:** Đợt 2 của engine Hóa vô cơ. Mở rộng trên nền v0 (`2026-08-21-chem-pack-design.md`) **sau khi** v0 đã sửa theo review phiên 1. Chỉ mô tả nội dung sẽ nằm trong `api/_lib/kernel/chem/**` + taxonomy; KHÔNG kèm plan thi công (viết sau khi spec qua phản biện).
**Nguồn chuẩn:**

1. `docs/superpowers/reviews/2026-08-21-chem-review-phien1.md` — **mọi finding + phân xử trong đó coi là ĐÃ DUYỆT và THẮNG khi vênh** với bất kỳ tài liệu nào khác.
2. `docs/superpowers/specs/2026-08-21-chem-pack-design.md` (spec v0) — nền data: bảng 50 phản ứng, NTK SGK §6, bảng màu §12, schema §8.1/§10. Chỗ nào vênh review → **review thắng**.
3. `docs/superpowers/specs/2026-08-21-engine-pack-architecture-design.md` §9 — format tag 4 tầng + registry.

**Người dùng đã chốt:** `molarVolume` default = **24,79** (đkc, GDPT 2018); 22,4 khi đề ghi "đktc".

---

## 0. Kế thừa phán quyết, quy ước đánh số, tương thích ngược

### 0.1. Bảng phán quyết review được spec này CƯỠNG CHẾ

| Phán quyết | Nguồn | Spec này dùng ở |
|---|---|---|
| Schema `domain` máy-đọc: `requireExcess` / `mustBeLimiting` / `maxRatio`, enforce trong stoich trước khi trả đáp | F3–F6 | §1.1, mọi record §2–§3 |
| Tầng ion `IONS` + whitelist anion/cation đóng; ngoài whitelist → guard trả null | F9 | §1.4, §3.2.4 |
| Luật riêng NH4⁺ + OH⁻ → NH3↑ + H2O (không bao giờ "kết tủa NH4OH") | F9 | §1.4 |
| "Ít tan" (CaSO4, Ca(OH)2…): sản phẩm duy nhất thuộc cột ít tan → guard trả null, không phán | F11 | §1.4 |
| Tol hai tầng: bảo toàn nội bộ EXACT; đối chiếu dữ kiện đề có tol | F10 | §1.5 |
| Tags 4 tầng `hoa/<lop>/<chuong>/<skill>` thuộc registry, `isKnownTag` phải true | F14, arch §9 | §1.7, cột tags mọi record |
| Matching ưu tiên record khớp TRỌN tập chất; nhiệt phân 1-chất chỉ khớp khi mix đúng 1 chất | F12 | §1.3 |
| Bảng suy `state` tường minh | F20 | §1.6 |
| C% trừ cả CHẤT RẮN DƯ: m_dd sau = Σ đổ vào − m↓ − m khí − m rắn dư | F8 | §1.6, §4.1.5 |
| G2 sửa: muối Fe³⁺ + kim loại từ Cu trở lên KHÔNG được kết luận "không phản ứng" | F1 | §2 (R59, R60 giải thật) |
| {K, Ba, Ca, Na} + dd muối → error "phản ứng với nước trước", không dùng khuôn noReaction | F2 | §1.3 (giữ nguyên ở v1) |
| Thụ động hóa G4 chỉ khi heated=false; heated=true + đặc → v0 "ngoài phạm vi" | F19 | §2 (R62 giải thật ca heated=true) |
| NaAlO2 (không ngoặc vuông; grammar parser chưa mở rộng) | Phân xử §16.6 | §2 (R63) |
| Cu+2FeCl3 chỉ vào v1 SAU khi sửa G2; axit đặc phải mang requireExcess | Phân xử §16.10 | §2 |

### 0.2. Quy ước đánh số record (GIẢ ĐỊNH cần agent đợt 1 xác nhận)

- v0 gốc: **R01–R50**.
- Đợt sửa v0 theo review đang thi công song song: **R51–R58** = 8 phản ứng canon F18, theo đúng
  thứ tự liệt kê trong review: R51 `2K + 2H2O → 2KOH + H2↑` · R52 `Mg + CuSO4 → MgSO4 + Cu↓` ·
  R53 `BaCl2 + H2SO4 → BaSO4↓ + 2HCl` · R54 `AgNO3 + HCl → AgCl↓ + HNO3` ·
  R55 `Ba(OH)2 + Na2SO4 → BaSO4↓ + 2NaOH` · R56 `NaHCO3 + HCl → NaCl + H2O + CO2↑` ·
  R57 `NaHCO3 + NaOH → Na2CO3 + H2O` · R58 `Ca(OH)2 + Na2CO3 → CaCO3↓ + 2NaOH`.
- Spec v1 này cấp số từ **R59**: Phần 1 = **R59–R65** (7 record), Phần 2 = **R66–R94** (29 record),
  Phần 3 kéo theo = **R95–R96** (2 record). Tổng cộng v1 thêm **38 record** → DB 96 record.
- Id chỉ là nhãn: nếu đợt 1 chốt id khác cho F18, toàn bộ dải v1 trượt theo; test integrity chỉ yêu cầu
  id duy nhất + tự cân bằng. §5 và §4 tham chiếu R56 (NaHCO3+HCl) theo giả định trên — nơi duy nhất
  spec này phụ thuộc id của đợt 1, đã đánh dấu ⚠ tại chỗ.

### 0.3. Tương thích ngược với ChemPlan v0 (cam kết nghiệm thu)

1. **Mọi plan v0 hợp lệ chạy ra đúng kết quả cũ.** Các mở rộng schema §1 đều là field optional/mới;
   không đổi nghĩa field cũ; không đổi default (`molarVolume` 24,79; variant vắng = 'loãng'; heated
   default false).
2. **Các ca v0 trả error/guard mà v1 GIẢI THẬT** (đây là mục đích của đợt 2 — danh sách đóng):
   - Guard mustBeLimiting của R23 vi phạm (AgNO3 dư) → cơ chế §4.3 giải, không error nữa.
   - Guard miền CO2/SO2 + kiềm vi phạm (vùng 2 muối) → cơ chế §4.2 giải.
   - Nhiều bước trộn / `of` trong mix / op `add` → cơ chế §4.1 giải (v0 từ chối "trộn tuần tự = v1").
   - Cặp chất khớp record mới R59–R96 → giải như record thường (v0 trả "ngoài phạm vi DB v0").
3. **Các ca v0 trả "không phản ứng"/"ngoài phạm vi" còn lại giữ NGUYÊN hành vi** (kể cả F2: kim loại
   kiềm + dd muối vẫn error "phản ứng với nước trước, ngoài phạm vi" — v1 KHÔNG mô hình chuỗi này).
4. Kết quả `ChemResult` chỉ THÊM field (`steps`, xem §4.1.4) — client cũ đọc field cũ vô hại.

---

## 1. Nâng cấp hạ tầng dùng chung cho v1

### 1.1. Chuẩn hóa `domain` (mở rộng F6) — ngữ nghĩa CHÍNH XÁC để agent thi công không phải đoán

```ts
type Domain = {
  requireExcess?: string[];   // các formula PHẢI được plan khai { excess: true }
  mustBeLimiting?: string[];  // các formula PHẢI là chất hết (after = 0 sau phản ứng)
  maxRatio?: { of: string; per: string; ratio: string };  // n(of) ≤ ratio · n(per); ratio = phân số "1/2"
  requireCold?: boolean;      // true ⇒ chỉ khớp khi heated = false   (MỚI, cho R76)
};
```

Ngữ nghĩa từng khóa (kiểm SAU khi match record, TRƯỚC khi `react()` trả đáp):

- **requireExcess: [X]** — amount của X phải là `{excess: true}`. X hữu hạn (kể cả rất lớn) ⇒ error miền,
  message nêu lý do hóa học của record (vd "HNO3 đặc phải dư: khi HNO3 loãng dần sản phẩm khử đổi
  (NO2 → NO), ngoài mô hình v1"). KHÔNG suy "dư" từ số mol — dư là khai báo có chủ đích của đề.
- **mustBeLimiting: [X]** — X phải hữu hạn và đạt min tỉ số n/a (X hết). **Hòa min (nhiều chất cùng
  hết, "vừa đủ") vẫn HỢP LỆ** — X vẫn hết. X khai excess ⇒ vi phạm hiển nhiên.
- **maxRatio {of, per, ratio}** — so sánh hữu tỉ exact `n(of) ≤ ratio × n(per)`. `of` phải hữu hạn;
  `per` khai excess ⇒ luôn thỏa (∞); `ratio` là CHUỖI phân số ("1/2", "1", "3/2") parse exact — không
  bao giờ là float.
- **requireCold** — record chỉ khớp khi `heated = false`; heated=true ⇒ record bị loại khỏi matching
  (nếu vì thế không còn record nào ⇒ error nêu "sản phẩm đổi khi đun nóng, ngoài phạm vi v1").
- Vi phạm domain: mặc định = error miền (như F3–F5). **Ngoại lệ danh sách đóng:** cặp chất thuộc một
  CƠ CHẾ §4 ⇒ dispatcher cơ chế nhận xử lý thay vì error (§1.3 bước 0). Error miền phải ghi rõ mã
  record + điều kiện bị vi phạm + gợi ý ("dạng này thuộc cơ chế X, cần plan dạng Y") khi có.

### 1.2. Hai cờ record mới + xúc tác

```ts
type ReactionRecord = {
  // ... như v0 §8.1 + domain?: Domain (F6) ...
  equilibrium?: true;    // MỚI: phản ứng thuận nghịch/không hoàn toàn — CHỈ phục vụ định tính
  solventWater?: true;   // MỚI: H2O trong reactants là NƯỚC DUNG MÔI, engine tự cấp (excess)
};
```

- **equilibrium** (R75, R81, R82, R83): record chỉ trả lời query `phenomena` / `equation` (equation in
  dấu **⇌**). MỌI query định lượng đụng tới sản phẩm/chất tham gia của record này ⇒ error rõ:
  "phản ứng thuận nghịch/hiệu suất, ngoài phạm vi định lượng v1". Ledger KHÔNG chạy ξ cho record
  equilibrium (không có mức phản ứng tất định để tính). Lý do thiết kế: các phương trình này nằm trong
  SGK và bị hỏi ở dạng nhận biết/hiện tượng rất thường xuyên; bỏ hẳn thì mất coverage định tính, mô
  hình hóa định lượng thì phải có hằng số cân bằng/hiệu suất — ngoài triết lý engine tất định.
- **solventWater** (R63, R90): record khớp khi mọi reactant ≠ H2O có mặt trong bình **và** bình có ≥ 1
  species `solution`. Engine tự thêm H2O vào sổ cái với before = ∞ (excess), consumed ghi bình thường
  theo hệ số. LLM **không khai H2O** cho các bài này (đỡ một nguồn sai); nếu LLM lỡ khai H2O tường
  minh có amount hữu hạn ⇒ error "H2O là dung môi của record này, không khai lượng". Cờ này per-record
  nên KHÔNG đổi hành vi matching của bất kỳ record nào khác (đặc biệt: KHÔNG tự thêm H2O cho mix
  {Na, CuSO4} — nhánh F2 vẫn error như cũ).
- **Xúc tác trong plan** (cho R64 MnO2, R81 V2O5): thêm field vào SpeciesOp:

```ts
const SpeciesOpSchema = z.object({
  /* ... v0 ... */
  catalyst: z.boolean().optional(),  // MỚI: chất xúc tác — không vào matching, không vào limiting
});
```

  Species `catalyst: true`: loại khỏi tập chất khi match record; không tham gia ξ; ledger ghi
  before = after (không đổi); scene vẫn hiển thị (đúng thực tế thí nghiệm). Đề không nhắc xúc tác ⇒
  LLM không khai — record điều kiện 'xúc tác' vẫn khớp (điều kiện là thuộc tính của record, mô tả
  cách thực hiện, không phải ràng buộc bắt LLM khai đủ đồ nghề).

### 1.3. Luật matching v1 (hợp nhất F12 + record mới + cơ chế)

Cho tập chất hữu hiệu S = {species trong bình có after > 0} ∪ {chất vừa thêm}, đã LOẠI xúc tác và
H2O-dung-môi:

0. **Dispatcher cơ chế chạy trước** (danh sách đóng, §4): S đúng khuôn cơ chế (§4.2: {CO2|SO2} × {NaOH|Ca(OH)2};
   §4.3: {Fe, AgNO3}; §4.1: op `add`/`of`) ⇒ cơ chế xử lý trọn, KHÔNG rơi xuống các bước dưới.
   Khuôn không khớp trọn (vd {SO2, KOH}) ⇒ đi tiếp như thường.
1. Lấy mọi record có reactants (sau chuẩn hóa variant; xét solventWater) ⊆ S và điều kiện t°/requireCold
   thỏa với `heated`.
2. **Ưu tiên khớp TRỌN tập** (F12): nếu tồn tại record có tập reactants = S ⇒ chỉ giữ các record đó.
   Record nhiệt phân 1-chất chỉ được khớp khi |S| = 1.
3. Còn > 1 record (một HỌ cùng tập chất, vd R73/R74) ⇒ **điều phối theo domain**: giữ record có domain
   thỏa với số mol thực. Đúng 1 ⇒ chạy. 0 ⇒ error nêu "miền chưa phủ" kèm khoảng trống (vd "tỉ lệ
   O2/H2S trong (1/2; 3/2): hỗn hợp S + SO2, ngoài phạm vi v1"). ≥ 2 ⇒ error "đa phản ứng" (thiết kế
   DB phải bảo đảm miền các record cùng họ RỜI NHAU — test integrity §3.2.6 kiểm).
4. 0 record: chạy guard (G1/G2'/G4' + trao đổi qua tầng IONS §1.4) → noReaction có lý do, hoặc error
   "ngoài phạm vi DB" khi guard trả null.

### 1.4. Tầng ion IONS + whitelist (F9) — trạng thái sau v1

Nhắc lại thiết kế F9 (đợt 1 thi công): từ điển `IONS` ánh xạ mỗi hợp chất DB → (cation, anion);
guard trao đổi chỉ được phép KẾT LUẬN khi mọi ion của cả hai chất nằm trong whitelist; luật riêng
NH4⁺ + OH⁻ → NH3↑ + H2O; sản phẩm duy nhất rơi vào cột "ít tan" ⇒ trả null (F11). **Nguyên tắc bất
đối xứng (giữ nguyên, in đậm cho đợt 2): guard chỉ được kết luận "KHÔNG phản ứng"; kết luận "CÓ phản
ứng" là độc quyền của record trong DB.** Nhờ đó whitelist mở rộng ở §3.2.4 không bao giờ tự sinh
phản ứng (vd CuS + HCl: guard thấy "có thể ra khí H2S" ⇒ không dám nói "không phản ứng" ⇒ null ⇒
"ngoài phạm vi" — đúng, vì CuS thực tế KHÔNG tan trong HCl loãng).

### 1.5. Tol hai tầng (F10) — chốt số

- **EPS_SELF = 0 (exact):** 2 định luật bảo toàn, after ≥ 0, khớp hệ số DB — so sánh hữu tỉ `cmpR === 0`,
  không dung sai, xuyên MỌI giai đoạn của cơ chế §4.
- **TOL_ASSERT = 1/100 (tương đối, hữu tỉ):** chỉ áp cho asserts đối chiếu dữ kiện ĐỀ
  (`given_mass`/`given_mol` và các given_* thêm sau): pass ⇔ |computed − given| ≤ (1/100)·|given|
  (so sánh hữu tỉ exact trên bất đẳng thức). Lệch hơn ⇒ violation ghi cả hai số + gợi ý nghi vấn
  ("nghi đề làm tròn khác mốc / sai molarVolume 22,4↔24,79"). Ví dụ chuẩn F10: đề ghi "3,72 lít" cho
  0,15·24,79 = 3,7185 — lệch tương đối ≈ 4·10⁻⁴ ⇒ pass.
- Input đề (`liters_gas`, grams…) parse exact từ chuỗi — KHÔNG tol ở đầu vào (số đề là số đề).

### 1.6. C% + bảng suy state (F8 + F20) — dùng chung mọi phần

- **C%:** m_dd sau = Σ khối lượng mọi thứ đổ vào bình (dd + rắn + lỏng + khí HẤP THỤ vào dd)
  − m kết tủa − m khí bay ra − **m chất rắn còn dư chưa tan** (mọi species solid có after > 0). Với
  cơ chế tuần tự §4.1: áp trên TỔNG các bước tính đến thời điểm query.
- **Suy state khi LLM bỏ trống** (F20, bảng đóng): kim loại/oxit/phi kim rắn (C, S, P) → solid; muối
  tan + amount dạng solution → solution; muối không tan (tra bảng tính tan) → solid; chất thuộc DANH
  SÁCH KHÍ ĐÓNG → gas; còn lại → error bắt LLM khai. **Danh sách khí đóng v1** = v0 {H2, O2, N2, CO2,
  Cl2, SO2, NO, NO2, NH3, CO} ∪ {**H2S, HCl(k)**} (HCl chỉ là gas khi record sinh nó ở pha khí — R79;
  HCl trong mix mặc định là dung dịch như v0).

### 1.7. Taxonomy: 11 tag MỚI đăng ký vào `TAG_REGISTRY` (kèm label)

Mọi record §2–§3 chỉ dùng tag thuộc registry (11 tag Hóa sẵn có của arch §9.3 + 11 tag mới sau).
Test integrity: `isKnownTag(t) === true` với mọi tag của mọi record.

| Tag mới | Label |
|---|---|
| `hoa/12/dai-cuong-kim-loai/day-dien-hoa` | Dãy điện hóa — muối Fe³⁺/Ag⁺ oxi hóa kim loại, thứ tự ưu tiên |
| `hoa/12/dai-cuong-kim-loai/kim-loai-tac-dung-kiem` | Kim loại tác dụng dung dịch kiềm (Al) |
| `hoa/11/nito-luu-huynh/axit-dac-oxi-hoa` | HNO3/H2SO4 đặc — tính oxi hóa mạnh, sản phẩm khử |
| `hoa/9-10/phi-kim/phan-ung-voi-oxi` | Phi kim và hợp chất cháy trong oxi |
| `hoa/9-10/phi-kim/clo` | Clo và hợp chất của clo (nước clo, Javel, điều chế) |
| `hoa/9-10/phi-kim/cacbon` | Cacbon và hợp chất của cacbon (C, CO, CO2) |
| `hoa/9-10/phi-kim/luu-huynh` | Lưu huỳnh và hợp chất (H2S, SO2, muối sunfit) |
| `hoa/9-10/oxit/oxit-axit-tac-dung-kiem` | CO2/SO2 + dung dịch kiềm (kể cả vùng 2 muối) |
| `hoa/9-10/phan-ung/nhiet-phan` | Phản ứng nhiệt phân |
| `hoa/9-10/dieu-che/dieu-che-kim-loai` | Điều chế kim loại (khử oxit bằng C/CO/H2, nhiệt nhôm) |
| `hoa/9-10/axit-bazo-muoi/axit-vao-cacbonat` | Nhỏ từ từ axit ↔ muối cacbonat (phản ứng từng nấc) |

Ghi chú: nhãn `type` của record dùng enum v0 + nhãn F17 `'oxit-axit + bazơ'` (giả định đợt 1 đã thêm
theo F17; nếu đợt 1 chọn phương án "bỏ nhãn" thì các record tương ứng ở đây để type theo phương án
đó — đồng bộ khi merge, ghi ở §6).

---

## 2. PHẦN 1 — Đưa 7 "ứng viên v1" vào chuẩn (R59–R65)

Cả 7 phương trình đã được review xác nhận đúng hệ số (phân xử §16.10); spec này **tự cân lại lần nữa
từng dòng** (ghi phép đếm nguyên tố ngay dưới record) và bổ sung đủ cột: điều kiện, hiện tượng giọng
SGK, type, tags, domain — thứ mà danh sách ứng viên v0 chưa có.

### R59 — Cu + 2FeCl3 → CuCl2 + 2FeCl2

- **Tự cân:** Cu 1=1 · Fe 2=2 · Cl 6 = 2+4 ✓.
- **Điều kiện:** dung dịch, nhiệt độ thường. `conditions: []`.
- **Type:** oxi hóa – khử (Cu⁰ → Cu²⁺; Fe³⁺ → Fe²⁺). `redox: true`. KHÔNG phải "thế" — không có kim
  loại thoát ra.
- **Hiện tượng (giọng SGK):** "đồng tan dần; màu vàng nâu của dung dịch nhạt dần rồi chuyển sang màu
  xanh lam (muối đồng)".
- **Tags:** `hoa/12/dai-cuong-kim-loai/day-dien-hoa`, `hoa/10/phan-ung/oxi-hoa-khu`.
- **Domain: KHÔNG cần.** Xét cả hai chiều hết/dư: FeCl3 dư + CuCl2 → không phản ứng tiếp; Cu dư +
  FeCl2 → không phản ứng tiếp. Miền an toàn toàn phần — khác hẳn R23.
- **Quan hệ với G2':** G2 sửa theo F1 chỉ trả null cho "muối Fe³⁺ + kim loại từ Cu trở lên" KHI KHÔNG
  có record. Nay {Cu, FeCl3} khớp R59 ở bước matching (trước guard) ⇒ G2' không còn che ca này. Các
  kim loại khác + Fe³⁺ (Zn, Mg… — chuỗi nhiều nấc) vẫn rơi vào G2' → null → "ngoài phạm vi" (đúng).
  Kim loại SAU Cu (Ag, Au) + Fe³⁺: G2' được phép kết luận "không phản ứng" (Fe³⁺ không oxi hóa được Ag).

### R60 — Fe + 2FeCl3 → 3FeCl2

- **Tự cân:** Fe 1+2 = 3 ✓ · Cl 6 = 6 ✓.
- **Điều kiện:** dung dịch, nhiệt độ thường. `conditions: []`.
- **Type:** oxi hóa – khử. `redox: true`.
- **Hiện tượng:** "sắt tan dần; màu vàng nâu của dung dịch nhạt dần, chuyển sang lục rất nhạt (gần như
  không màu) của muối sắt(II)".
- **Tags:** `hoa/12/dai-cuong-kim-loai/day-dien-hoa`, `hoa/10/phan-ung/oxi-hoa-khu`.
- **Domain: KHÔNG cần** (Fe dư → dừng ở FeCl2; FeCl3 dư → Fe hết, vẫn chỉ FeCl2 — hai chiều đều đúng
  mô hình). Đây chính là phản ứng "Fe khử Fe³⁺" mà note R19 của v0 nhắc — nay có record thật (bản
  clorua; bản nitrat Fe + 2Fe(NO3)3 chủ động chưa vào, xem §3.3).

### R61 — Cu + 4HNO3 (đặc) → Cu(NO3)2 + 2NO2↑ + 2H2O

- **Tự cân:** Cu 1=1 · H 4 = 4 · N 4 = 2+2 · O 12 = 6+4+2 ✓.
- **Điều kiện:** HNO3 mang `variant: 'đặc'`; nhiệt độ thường (phản ứng xảy ra ngay). `conditions: []`.
  Cu không thuộc nhóm thụ động hóa (G4 chỉ Al/Fe) nên đặc NGUỘI vẫn chạy — nhất quán F19.
- **Type:** oxi hóa – khử. `redox: true`.
- **Hiện tượng:** "đồng tan; khí màu nâu đỏ thoát ra (NO2, độc); dung dịch chuyển sang màu xanh lam".
- **Tags:** `hoa/11/nito-luu-huynh/axit-dac-oxi-hoa`, `hoa/10/phan-ung/oxi-hoa-khu`.
- **Domain:** `{ requireExcess: ['HNO3'] }` — bắt buộc theo phân xử §16.10. Lý do máy phải chặn: HNO3
  hữu hạn → khi phản ứng tiến triển axit loãng dần → sản phẩm khử chuyển dần sang NO → hỗn hợp khí,
  ngoài mô hình. Error miền ghi đúng câu này.

### R62 — 2Fe + 6H2SO4 (đặc) —t°→ Fe2(SO4)3 + 3SO2↑ + 6H2O

- **Tự cân:** Fe 2=2 · H 12 = 12 · S 6 = 3+3 · O 24 = 12+6+6 ✓.
- **Điều kiện:** `variant: 'đặc'` + **`conditions: ['t°']` bắt buộc** — khớp luật thụ động hóa F19:
  heated=false + đặc ⇒ G4 trả "không phản ứng (Fe bị thụ động hóa trong H2SO4 đặc nguội)";
  heated=true ⇒ khớp R62 (v0 trả "ngoài phạm vi", v1 giải thật).
- **Type:** oxi hóa – khử. `redox: true`.
- **Hiện tượng:** "sắt tan; khí không màu mùi hắc thoát ra (SO2); dung dịch thu được có màu vàng nâu
  (muối sắt(III))".
- **Tags:** `hoa/11/nito-luu-huynh/axit-dac-oxi-hoa`, `hoa/10/phan-ung/oxi-hoa-khu`.
- **Domain:** `{ requireExcess: ['H2SO4'] }` — Fe dư sẽ khử tiếp Fe2(SO4)3 → FeSO4 (phản ứng nối tiếp
  kiểu R60, bản sunfat KHÔNG có trong DB) ⇒ mọi ca H2SO4 hữu hạn phải bị chặn.

### R63 — 2Al + 2NaOH + 2H2O → 2NaAlO2 + 3H2↑

- **Tự cân:** Al 2=2 · Na 2=2 · O 2+2 = 4 = 2·2 ✓ · H 2+4 = 6 = 3·2 ✓.
- **Cách viết aluminat:** **NaAlO2** — chốt theo phân xử §16.6 (parser không có ngoặc vuông; đề luyện
  thi quen NaAlO2). Muốn Na[Al(OH)4] phải mở rộng grammar trước — ngoài v1.
- **Điều kiện:** dung dịch kiềm, nhiệt độ thường. `conditions: []`. **`solventWater: true`** (§1.2):
  LLM chỉ khai Al + NaOH; H2O do engine tự cấp (dung môi), consumed vẫn ghi sổ theo hệ số.
- **Type:** oxi hóa – khử (Al⁰ → Al³⁺; H⁺ của nước → H2). `redox: true`.
- **Hiện tượng:** "nhôm tan dần trong dung dịch kiềm, sủi bọt khí không màu (H2)".
- **Tags:** `hoa/12/dai-cuong-kim-loai/kim-loai-tac-dung-kiem`, `hoa/10/phan-ung/oxi-hoa-khu`.
- **Domain: KHÔNG cần** — NaOH hết hay Al hết đều dừng đúng; H2O luôn dư (dung môi). Limiting lấy
  min(n(Al)/2, n(NaOH)/2).

### R64 — 2KClO3 —t°, xt MnO2→ 2KCl + 3O2↑

- **Tự cân:** K 2=2 · Cl 2=2 · O 6 = 6 ✓.
- **Điều kiện:** `conditions: ['t°', 'xúc tác']` (enum v0 có sẵn 'xúc tác'; 'đpnc' đã xóa theo F25).
  MnO2 nếu đề nhắc ⇒ LLM khai species với `catalyst: true` (§1.2); không nhắc ⇒ không khai — cả hai
  đều khớp record.
- **Type:** phân hủy. `redox: true` (Cl⁺⁵ → Cl⁻¹, O⁻² → O⁰).
- **Hiện tượng:** "chất rắn màu trắng phân hủy, thu được khí oxi (làm bùng cháy tàn đóm đỏ)".
- **Tags:** `hoa/9-10/dieu-che/dieu-che-khi`, `hoa/9-10/phan-ung/nhiet-phan`.
- **Domain: KHÔNG cần.** Matching: record nhiệt phân 1-chất — chỉ khớp khi bình có đúng 1 chất không
  kể xúc tác (F12 + §1.3).

### R65 — CO2 + 2NaOH → Na2CO3 + H2O

- **Tự cân:** C 1=1 · Na 2=2 · O 2+2 = 4 = 3+1 ✓ · H 2=2 ✓.
- **Điều kiện:** sục khí vào dung dịch, nhiệt độ thường. `conditions: []`.
- **Type:** 'oxit-axit + bazơ' (nhãn F17). `redox: false`.
- **Hiện tượng:** "khí CO2 bị hấp thụ; không có hiện tượng nhìn thấy rõ (dung dịch vẫn trong suốt,
  không màu)".
- **Tags:** `hoa/9-10/oxit/oxit-axit-tac-dung-kiem`.
- **Domain:** `{ maxRatio: { of: 'CO2', per: 'NaOH', ratio: '1/2' } }` ⇔ n(NaOH) ≥ 2n(CO2) (kiềm đủ
  dư để chỉ ra muối trung hòa; NaOH excess luôn thỏa). **Dưới ngưỡng KHÔNG error:** cặp {CO2, NaOH}
  thuộc cơ chế §4.2 — dispatcher tính T rồi chọn R65 / R88 / giải hệ vùng giữa. Record này đồng thời
  là "record biên T ≥ 2" của cơ chế đó.

**Bảng tóm tắt Phần 1** (cột chuẩn hóa để agent chép):

| # | Phương trình | Variant/Đk | Type | Redox | Domain | Tags (rút gọn) |
|---|---|---|---|---|---|---|
| R59 | Cu + 2FeCl3 → CuCl2 + 2FeCl2 | dd | oxi hóa – khử | ✓ | — | day-dien-hoa |
| R60 | Fe + 2FeCl3 → 3FeCl2 | dd | oxi hóa – khử | ✓ | — | day-dien-hoa |
| R61 | Cu + 4HNO3(đặc) → Cu(NO3)2 + 2NO2↑ + 2H2O | đặc | oxi hóa – khử | ✓ | requireExcess HNO3 | axit-dac-oxi-hoa |
| R62 | 2Fe + 6H2SO4(đặc) → Fe2(SO4)3 + 3SO2↑ + 6H2O | đặc, t° | oxi hóa – khử | ✓ | requireExcess H2SO4 | axit-dac-oxi-hoa |
| R63 | 2Al + 2NaOH + 2H2O → 2NaAlO2 + 3H2↑ | dd, solventWater | oxi hóa – khử | ✓ | — | kim-loai-tac-dung-kiem |
| R64 | 2KClO3 → 2KCl + 3O2↑ | t°, xt MnO2 | phân hủy | ✓ | — | dieu-che-khi, nhiet-phan |
| R65 | CO2 + 2NaOH → Na2CO3 + H2O | dd | oxit-axit + bazơ | ✗ | maxRatio CO2 ≤ ½·NaOH (→ §4.2) | oxit-axit-tac-dung-kiem |

Dữ liệu kéo theo Phần 1: dd CuCl2 đã chốt "xanh lam" (phân xử §16.2); CuCl2(r)/FeCl3(r) đã vào bảng
màu ở đợt 1 (F16); **thêm mới**: Fe(NO3)2 vào hàng Fe²⁺ của bảng màu dd; NaAlO2 (dd, không màu);
KClO3 (rắn, trắng); KCl (rắn, trắng). M kiểm tay: FeCl3 162,5 · CuCl2 135 · FeCl2 127 · KClO3 122,5 ·
KCl 74,5 · NaAlO2 82 · Fe2(SO4)3 400.

---

## 3. PHẦN 2 — Mở rộng PHI KIM (R66–R94, 29 record)

Tiêu chí chọn: chỉ record chắc 100% theo SGK VN (SGK 8/9/10/11 cũ + GDPT 2018), hệ số tự cân tay từng
dòng (phép đếm nguyên tố ghi ở cột "Tự cân"), miền áp dụng hoặc an toàn toàn phần hoặc có domain
cưỡng chế. Record KHÔNG chắc/không mô hình được tất định → §3.3 (loại chủ động, có lý do).

### 3.1. Bảng record

**Nhóm P2-A — Cháy trong oxi** (đều `t°`, redox ✓)

| # | Phương trình | Tự cân | Type | Hiện tượng (giọng SGK) | Domain | Tags (rút gọn) |
|---|---|---|---|---|---|---|
| R66 | C + O2 → CO2 | C1=1; O2=2 | hóa hợp | than cháy sáng (đỏ rực), tỏa nhiều nhiệt; khí sinh ra làm đục nước vôi trong | mustBeLimiting C | phi-kim/phan-ung-voi-oxi, phi-kim/cacbon |
| R67 | S + O2 → SO2 | S1=1; O2=2 | hóa hợp | lưu huỳnh cháy với ngọn lửa màu xanh nhạt, sinh khí không màu mùi hắc (SO2) | — | phi-kim/phan-ung-voi-oxi, phi-kim/luu-huynh |
| R68 | 4P + 5O2 → 2P2O5 | P4=4; O10=10 | hóa hợp | photpho cháy sáng chói, tạo khói trắng dày đặc (P2O5) | mustBeLimiting P | phi-kim/phan-ung-voi-oxi |
| R69 | 2H2 + O2 → 2H2O | H4=4; O2=2 | hóa hợp | hiđro cháy với ngọn lửa màu xanh nhạt; hỗn hợp 2V(H2):1V(O2) nổ mạnh | — | phi-kim/phan-ung-voi-oxi |
| R70 | 2CO + O2 → 2CO2 | C2=2; O2+2=4 | hóa hợp | khí CO cháy với ngọn lửa màu xanh | — | phi-kim/cacbon |
| R73 | 2H2S + 3O2 → 2SO2 + 2H2O | H4=4; S2=2; O6=4+2 | oxi hóa – khử | khí H2S cháy (đủ oxi) với ngọn lửa xanh nhạt, sinh SO2 mùi hắc | mustBeLimiting H2S | phi-kim/luu-huynh |
| R74 | 2H2S + O2 → 2S + 2H2O | H4=4; S2=2; O2=2 | oxi hóa – khử | cháy thiếu oxi: tạo chất bột màu vàng (S) bám thành bình | maxRatio O2 ≤ ½·H2S | phi-kim/luu-huynh |

- R66: `mustBeLimiting C` vì C dư ở t° cao khử tiếp CO2 → CO (chính là R71) — "đốt cháy hoàn toàn"
  của đề ⇔ C hết. O2 vừa đủ hoặc dư đều hợp lệ.
- R68: tương tự — thiếu oxi sinh P2O3, SGK chỉ dạy P2O5 ⇒ P phải hết.
- **R73/R74 là một HỌ cùng tập chất {H2S, O2}** — điều phối theo domain (§1.3 bước 3):
  R73 thỏa ⇔ n(O2) ≥ (3/2)·n(H2S) (mustBeLimiting H2S); R74 thỏa ⇔ n(O2) ≤ (1/2)·n(H2S).
  Khoảng giữa (1/2; 3/2)·n(H2S) ⇒ error "hỗn hợp S + SO2, ngoài phạm vi v1". Hai miền rời nhau ✓.

**Nhóm P2-B — Cacbon khử / cân bằng C–CO–CO2** (đều `t°`)

| # | Phương trình | Tự cân | Type | Hiện tượng | Domain | Tags |
|---|---|---|---|---|---|---|
| R71 | C + CO2 → 2CO | C1+1=2; O2=2 | oxi hóa – khử | (t° cao) chất khí sinh ra cháy được với ngọn lửa xanh | — | phi-kim/cacbon |
| R72 | C + 2CuO → 2Cu + CO2↑ | C1=1; Cu2=2; O2=2 | oxi hóa – khử | bột đen chuyển dần sang màu đỏ (Cu); khí thoát ra làm đục nước vôi trong | — | phi-kim/cacbon, dieu-che/dieu-che-kim-loai |

- R72 không domain: SGK 9 quy ước sản phẩm CO2 bất kể tỉ lệ; câu hỏi kinh điển là m(Cu) — đúng ở mọi
  chiều hết/dư. Ghi note trong record: "C dư ở t° rất cao có thể sinh CO — ngoài mô hình, đề SGK
  không xét" (điểm phân vân §6.6).

**Nhóm P2-C — Clo và hợp chất**

| # | Phương trình | Tự cân | Đk | Type | Hiện tượng | Domain/Cờ | Tags |
|---|---|---|---|---|---|---|---|
| R75 | Cl2 + H2O ⇌ HCl + HClO | Cl2=2; H2=2; O1=1 | — | oxi hóa – khử | nước clo màu vàng lục nhạt, mùi hắc; làm quỳ tím hóa đỏ rồi MẤT MÀU (HClO tẩy màu) | **equilibrium** (chỉ định tính) | phi-kim/clo |
| R76 | Cl2 + 2NaOH → NaCl + NaClO + H2O | Cl2=1+1; Na2=2; O2=1+1; H2=2 | dd loãng, nguội | oxi hóa – khử | khí clo vàng lục bị hấp thụ hết; tạo dung dịch không màu (nước Gia-ven, tính tẩy màu) | **requireCold** | phi-kim/clo |
| R77 | 2Na + Cl2 → 2NaCl | Na2=2; Cl2=2 | t° | hóa hợp | natri nóng chảy cháy sáng chói trong khí clo, tạo khói trắng (NaCl) | — | phi-kim/clo |
| R78 | 2Al + 3Cl2 → 2AlCl3 | Al2=2; Cl6=6 | t° | hóa hợp | nhôm cháy sáng trong khí clo tạo khói trắng (AlCl3) | — | phi-kim/clo |
| R79 | H2 + Cl2 → 2HCl | H2=2; Cl2=2 | t° (hoặc ánh sáng) | hóa hợp | hiđro cháy trong clo với ngọn lửa sáng xanh nhạt; khí HCl sinh ra tạo khói trắng với không khí ẩm | — | phi-kim/clo |
| R80 | MnO2 + 4HCl(đặc) → MnCl2 + Cl2↑ + 2H2O | Mn1=1; O2=2; H4=4; Cl4=2+2 | đặc, t° | oxi hóa – khử | đun nhẹ, khí màu vàng lục mùi hắc thoát ra (Cl2) | **requireExcess HCl** | phi-kim/clo, dieu-che/dieu-che-khi |

- R75 equilibrium: SGK viết ⇌; định lượng HClO không có trong đề phổ thông ⇒ chỉ phenomena/equation.
- R76 requireCold: đun nóng → 3Cl2 + 6NaOH → 5NaCl + NaClO3 + 3H2O (KHÔNG vào v1, §3.3) — heated=true
  phải error thay vì trả nước Javel. `variant` không dùng; điều kiện "loãng nguội" ghi trong note +
  requireCold cưỡng chế phần "nguội".
- R79: enum conditions không có 'ánh sáng' — dùng `['t°']`, note ghi "hoặc chiếu sáng (hỗn hợp nổ)".
- R80: HCl mang `variant: 'đặc'` (schema v0 đã cho phép variant trên mọi chất — nay dùng cho HCl;
  default vắng variant = 'loãng' giữ nguyên ⇒ MnO2 + HCl loãng không khớp → guard null → "ngoài phạm
  vi", đúng — HCl loãng không khử được MnO2). requireExcess vì HCl loãng dần thì phản ứng dừng —
  ca HCl hữu hạn cho đáp sai.

**Nhóm P2-D — Oxit axit + nước; SO2 + O2**

| # | Phương trình | Tự cân | Đk | Type | Hiện tượng | Domain/Cờ | Tags |
|---|---|---|---|---|---|---|---|
| R81 | 2SO2 + O2 ⇌ 2SO3 | S2=2; O4+2=6 | t°, xt V2O5 | hóa hợp | (công nghiệp sản xuất H2SO4; không hiện tượng quan sát trong PTN phổ thông) | **equilibrium** | phi-kim/luu-huynh |
| R82 | SO2 + H2O ⇌ H2SO3 | S1=1; O2+1=3; H2=2 | — | hóa hợp | khí SO2 tan trong nước; dung dịch làm quỳ tím hóa đỏ | **equilibrium** | phi-kim/luu-huynh |
| R83 | CO2 + H2O ⇌ H2CO3 | C1=1; O2+1=3; H2=2 | — | hóa hợp | dung dịch làm quỳ tím chuyển đỏ nhạt | **equilibrium** | phi-kim/cacbon |
| R84 | P2O5 + 3H2O → 2H3PO4 | P2=2; O5+3=8; H6=6 | — | hóa hợp | chất rắn trắng tan trong nước, tỏa nhiệt; dung dịch làm quỳ hóa đỏ | — | phi-kim/phan-ung-voi-oxi (chuỗi P→P2O5→H3PO4) |

- R81/R82/R83 equilibrium: hiệu suất/cân bằng — mọi đề định lượng loại này đều kèm H% ⇒ ngoài mô hình
  tất định v1; giữ để phủ định tính + query equation (in ⇌). R82: SGK 9 in một chiều, bản chất thuận
  nghịch — chọn cờ equilibrium cho AN TOÀN định lượng, câu chữ chờ phản biện (§6.4).
- R84 là record định lượng đầy đủ (phản ứng hoàn toàn thật).

**Nhóm P2-E — CO2/SO2 + kiềm & muối axit** (dd, redox ✗, type 'oxit-axit + bazơ' trừ R90)

| # | Phương trình | Tự cân | Hiện tượng | Domain/Cờ | Tags |
|---|---|---|---|---|---|
| R85 | SO2 + 2NaOH → Na2SO3 + H2O | S1=1; Na2=2; O2+2=3+1; H2=2 | khí bị hấp thụ, dung dịch không màu | maxRatio SO2 ≤ ½·NaOH (→ §4.2) | oxit-axit-tac-dung-kiem, phi-kim/luu-huynh |
| R86 | SO2 + NaOH → NaHSO3 | S1=1; Na1=1; O2+1=3; H1=1 | khí bị hấp thụ | maxRatio NaOH ≤ 1·SO2 (→ §4.2) | oxit-axit-tac-dung-kiem |
| R87 | SO2 + Ca(OH)2 → CaSO3↓ + H2O | S1=1; Ca1=1; O2+2=3+1; H2=2 | nước vôi trong vẩn đục (kết tủa trắng CaSO3) | maxRatio SO2 ≤ 1·Ca(OH)2 | oxit-axit-tac-dung-kiem, phi-kim/luu-huynh |
| R88 | CO2 + NaOH → NaHCO3 | C1=1; Na1=1; O2+1=3; H1=1 | khí bị hấp thụ | maxRatio NaOH ≤ 1·CO2 (→ §4.2) | oxit-axit-tac-dung-kiem |
| R89 | 2CO2 + Ca(OH)2 → Ca(HCO3)2 | C2=2; Ca1=1; O4+2=6; H2=2 | khí bị hấp thụ hết, dung dịch trong suốt (muối axit tan) | maxRatio Ca(OH)2 ≤ ½·CO2 (→ §4.2) | oxit-axit-tac-dung-kiem |
| R90 | CO2 + CaCO3 + H2O → Ca(HCO3)2 | C1+1=2; Ca1=1; O2+3+1=6; H2=2 | sục tiếp CO2: kết tủa trắng TAN DẦN, dung dịch trong trở lại | **solventWater**; type 'trao đổi'(∗) | oxit-axit-tac-dung-kiem, phi-kim/cacbon |

- R85–R89 là các **record biên** của cơ chế vùng 2 muối §4.2 (mỗi cặp khí–kiềm có biên trên/biên dưới);
  domain của chúng đồng thời là điều kiện được đứng một mình khi plan chỉ mix 1 lần.
- R87 KHÔNG có biên dưới dạng Ca(HSO3)2 (không đưa vào v1, §3.3) ⇒ cặp {SO2, Ca(OH)2} chỉ giải vùng
  T ≥ 2; vùng khác → error nêu rõ.
- R90 phục vụ bước `add` tuần tự ("sục tiếp CO2 vào nước vôi đã có kết tủa") + hiện tượng kinh điển;
  (∗) nhãn type cho R90 khiên cưỡng ở mọi enum hiện có — đề xuất note thay nhãn, chờ phản biện (§6).

**Nhóm P2-F — Muối sunfit/sunfua + axit; nhiệt phân** (redox ✗ trừ R94)

| # | Phương trình | Tự cân | Đk | Type | Hiện tượng | Domain | Tags |
|---|---|---|---|---|---|---|---|
| R91 | Na2SO3 + H2SO4 → Na2SO4 + SO2↑ + H2O | Na2=2; S1+1=1+1; O3+4=4+2+1; H2=2 | dd | trao đổi | sủi bọt khí không màu MÙI HẮC (SO2) | — | phi-kim/luu-huynh, dieu-che/dieu-che-khi |
| R92 | Na2SO3 + 2HCl → 2NaCl + SO2↑ + H2O | Na2=2; S1=1; O3=2+1; H2=2; Cl2=2 | dd | trao đổi | như R91 | — | phi-kim/luu-huynh |
| R93 | FeS + 2HCl → FeCl2 + H2S↑ | Fe1=1; S1=1; H2=2; Cl2=2 | — | trao đổi | chất rắn màu xám đen tan, khí MÙI TRỨNG THỐI thoát ra (H2S, độc) | — | phi-kim/luu-huynh, dieu-che/dieu-che-khi |
| R94 | 2KNO3 —t°→ 2KNO2 + O2↑ | K2=2; N2=2; O6=4+2 | t° | phân hủy (redox ✓) | chất rắn nóng chảy, khí thoát ra làm bùng cháy tàn đóm đỏ | — | phan-ung/nhiet-phan |

- R91/R92: điều chế SO2 trong PTN (SGK dùng Na2SO3 + H2SO4; bản HCl thêm cho phủ đề). Không domain:
  hai chiều hết/dư đều đúng mô hình (muối dư hay axit dư không sinh phản ứng phụ trong phạm vi này).
- R93: điều chế H2S trong PTN. FeS là chất rắn (không tan) — state solid; hợp lệ trao đổi vì sinh khí.
- R94: nhiệt phân nitrat kim loại kiềm (nhóm 1 của quy luật nhiệt phân nitrat). Nitrat các nhóm khác
  (Cu(NO3)2, AgNO3) chủ động để lại trọn gói v2 (§3.3).

### 3.2. Dữ liệu kéo theo của Phần 2

**3.2.1. NTK:** KHÔNG cần thêm nguyên tố — mọi nguyên tố xuất hiện (C, S, P, N, K, Mn, Cl, Na, Ca,
Fe, Al, H, O) đã có trong bảng §6 v0 (P = 31, Mn = 55, K = 39 ✓; Ar đã sửa 39,9 theo F15).
M kiểm tay các chất mới: P2O5 142 · H3PO4 98 · Na2SO3 126 · NaHSO3 104 · CaSO3 120 · Ca(HCO3)2 162 ·
NaClO 74,5 · MnCl2 126 · MnO2 87 · H2S 34 · KNO2 85 · KNO3 101 · FeS 88.

**3.2.2. Bảng màu bổ sung** (F16: mọi sản phẩm phải tra được màu CÓ CHỦ ĐÍCH; test integrity phủ toàn DB):

| Chất | Pha | Màu | Ghi chú |
|---|---|---|---|
| P2O5 | rắn/khói | trắng | khói trắng dày đặc khi P cháy |
| P (đỏ) | rắn | đỏ | chất đầu, hiển thị scene |
| CaSO3 | rắn | trắng | kết tủa |
| Na2SO3, NaHSO3, NaHCO3, Ca(HCO3)2, NaClO, NaAlO2, H3PO4, H2SO3, H2CO3, HClO | dd | không màu | nhóm mặc định nhưng ghi TƯỜNG MINH để qua test phủ màu |
| MnCl2 | dd | không màu (hồng rất nhạt khi đặc) | câu chữ chờ phản biện §6.1 |
| MnO2 | rắn | đen | xúc tác/chất đầu |
| KCl, KClO3, KNO3, NaCl(r), AlCl3(r) | rắn | trắng | R64/R77/R78/R94 |
| KNO2 | rắn | trắng (hơi ngả vàng) | chờ phản biện §6.2 |
| H2S | khí | không màu, mùi trứng thối, ĐỘC | thêm vào bảng khí |
| HCl | khí | không màu, mùi xốc, "bốc khói" trong không khí ẩm | chỉ pha khí (R79) |
| CO | khí | không màu, RẤT ĐỘC | đã có trong danh sách khí v0, bổ sung mô tả |

**3.2.3. Bảng tính tan mini — hàng bổ sung:**

| Nhóm | Tan | KHÔNG tan (kết tủa) | Ít tan |
|---|---|---|---|
| SO3²⁻ | Na2SO3, K2SO3, (NH4)2SO3 | còn lại (CaSO3, BaSO3, MgSO3…) | — |
| S²⁻ | Na2S, K2S, (NH4)2S, BaS | FeS, ZnS, CuS, PbS, Ag2S | — |
| HCO3⁻ | tất cả | — | — |
| HSO3⁻ | tất cả (gặp trong DB: NaHSO3) | — | — |
| ClO⁻ | NaClO, KClO, Ca(ClO)2 | — | — |
| AlO2⁻ | NaAlO2, KAlO2 | — | — |

**3.2.4. Whitelist IONS mở rộng (F9):**

- **Anion thêm 6:** HCO3⁻ (luật: +H⁺ → CO2↑ + H2O; +OH⁻ → CO3²⁻ + H2O — khớp record R56/R57 đợt 1),
  SO3²⁻ (+H⁺ → SO2↑ + H2O), HSO3⁻ (+H⁺ → SO2↑ + H2O), S²⁻ (+H⁺ → H2S↑ — CHỈ ở mức "không được kết
  luận không-phản-ứng", xem nguyên tắc bất đối xứng §1.4), ClO⁻ (không luật riêng — chỉ tính tan),
  AlO2⁻ (không luật riêng).
- **Cation: KHÔNG thêm.** Mn²⁺ chỉ xuất hiện ở phía SẢN PHẨM (R80); nếu người dùng đem MnCl2 đi trộn
  tiếp → ion ngoài whitelist → guard null → "ngoài phạm vi" (đúng hành vi mong muốn, vì DB không có
  phản ứng nào của Mn²⁺).
- **KHÔNG thêm PO4³⁻:** H3PO4 chỉ là sản phẩm (R84); hệ sinh thái photphat (từng nấc H3PO4 + kiềm,
  Ag3PO4…) là một gói riêng — ngoài v1 (§3.3, §4.4).

### 3.3. Record CHỦ ĐỘNG LOẠI khỏi v1 (kèm lý do — để phản biện phán)

| Ứng viên | Lý do loại |
|---|---|
| N2 + O2 ⇌ 2NO | thuận nghịch, hiệu suất rất thấp, chỉ xảy ra ~3000°C/hồ quang; đề luôn kèm ngữ cảnh riêng — kể cả cờ equilibrium cũng ít giá trị vì hiện tượng không quan sát được trong PTN phổ thông |
| N2 + 3H2 ⇌ 2NH3 | thuận nghịch + xúc tác + áp suất cao (enum conditions không có 'p cao'); mọi đề là bài HIỆU SUẤT — ngoài mô hình tất định |
| 4Na + O2 → 2Na2O | giữ phán quyết v0/§16.10 (tranh cãi Na2O/Na2O2 theo điều kiện) |
| 2KMnO4 + 16HCl(đặc) → 2KCl + 2MnCl2 + 5Cl2 + 8H2O | đúng hóa học, nhưng (a) MnO4⁻ ngoài whitelist theo thiết kế F9 — chính là CA CHUẨN "guard trả null" trong test review; đưa vào sẽ phá test đã duyệt; (b) R80 đã đủ đường điều chế Cl2 PTN |
| 3Cl2 + 6NaOH —t°→ 5NaCl + NaClO3 + 3H2O | v1 chặn bằng requireCold trên R76 là đủ; thêm record nóng phải mở họ domain theo nhiệt độ — để v2 |
| 4NH3 + 3O2 → 2N2 + 6H2O (và bản xúc tác ra NO) | thuộc gói nitơ lớp 11 (nên làm trọn: NH3 cháy, NH3 + axit, muối amoni) — làm lẻ 1 record dễ sinh lỗ miền |
| Nhiệt phân Cu(NO3)2 / AgNO3 | quy luật nhiệt phân nitrat 3 nhóm nên vào cùng lúc thành họ có luật; v1 chỉ lấy nhóm kiềm (R94) là nhóm đề gặp nhiều nhất |
| H2 + S → H2S; Zn/Cu + S | đúng SGK nhưng giá trị đề định lượng thấp; FeS + HCl (R93) đã phủ đường điều chế H2S; Fe + S đã có R07 |
| Ca(HSO3)2 (biên dưới SO2 + Ca(OH)2) | SGK phổ thông hầu như không dùng; thêm sẽ phải bịa hiện tượng/tính tan ít nguồn — vùng T < 2 của cặp này để error tường minh |
| CO2/SO2 + Ba(OH)2, + KOH | hóa học chắc chắn nhưng kéo 4–6 record + hàng tính tan mới; để v2 lấy trọn (khuôn §4.2 đã tổng quát theo n(OH⁻), thêm sau rất rẻ) — ghi ở §4.4 |
| Fe + 2Fe(NO3)3; Cu + Fe2(SO4)3 (bản muối khác của R59/R60) | tránh nở DB theo tổ hợp anion; G2' trả null "ngoài phạm vi" là hành vi đúng; thêm khi có nhu cầu đề thật |
| C + H2O (hơi) ⇌ CO + H2 | thuận nghịch công nghiệp (khí than ướt) — ngoài phạm vi đề phổ thông định lượng |
| Si / SiO2 (Si + NaOH, SiO2 + NaOH nóng chảy…) | chương silic ít bài định lượng; điều kiện nóng chảy chưa mô hình |

---

## 4. PHẦN 3 — Ba cơ chế mới (giải thật 3 dạng mà v0 phải guard-chặn)

Ba dạng này chính là 3 bài "engine v0 giải SAI phải bị guard chặn" của review (F3/F4/F7). v1 gỡ guard
bằng cách GIẢI THẬT — mỗi cơ chế là một dispatcher tất định, danh sách kích hoạt ĐÓNG, tự kiểm bảo
toàn xuyên giai đoạn bằng EPS_SELF = 0.

### 4.1. Cơ chế A — TRỘN TUẦN TỰ (mix → add → …)

#### 4.1.1. Schema (tương thích ngược 100%)

```ts
const MixOpSchema = z.object({
  op: z.literal('mix'),
  of: z.array(z.string()).optional(),   // v1: danh sách formula lấy từ các species đã khai
  heated: z.boolean().default(false),
});

const AddOpSchema = z.object({          // MỚI
  op: z.literal('add'),
  formula: z.string().min(1),           // phải trỏ tới một SpeciesOp đã khai (có amount)
  dropwise: z.boolean().default(false), // true = "nhỏ từ từ / thêm từng giọt"
  heated: z.boolean().default(false),
});

// ops: species*  mix  (add | mix)*   — mix đầu nạp BÌNH; mix thứ n (n≥2, bắt buộc có `of`)
// = đường sugar cho "đổ đồng thời nhiều chất vào bình" (tương đương một add không-dropwise nhiều chất).
```

- **v0 plan (đúng 1 mix, không `of`, không add) chạy y nguyên** — mix không `of` = trộn mọi species
  chưa dùng (ngữ nghĩa v0).
- Một BÌNH duy nhất xuyên plan (bình thứ hai / lọc / tách kết tủa ra riêng → v2, §4.4). Tối đa 4 bước
  sau mix đầu (đề phổ thông không dài hơn; chặn plan bịa).
- Mỗi species chỉ được dùng ở đúng một bước (mix `of` hoặc add); species khai mà không dùng ⇒ error.

#### 4.1.2. Thuật toán từng bước (tất định)

Trạng thái = sổ cái bình: `Map<formula, {state, after}>` + tập excess + danh sách khí đã thoát.

Cho mỗi bước t (mix đầu, rồi từng add/mix-of):

1. Đưa lượng chất mới vào bình (chuyển từ "kho" species).
2. Xác định tập chất hữu hiệu S (after > 0, bỏ xúc tác/H2O-dung-môi) và chạy **luật matching §1.3**
   (dispatcher cơ chế B/C được phép kích hoạt TRONG một bước — vd add CO2 vào bình NaOH).
3. `dropwise = true` **và** (chất-thêm, bình) khớp BẢNG ƯU TIÊN đóng dưới ⇒ chạy CHUỖI NẤC thay cho
   record đơn. Nguyên lý thống nhất: **giọt thêm vào luôn gặp bình DƯ CỤC BỘ** ⇒ phản ứng chọn theo
   record ưu tiên của MÔI TRƯỜNG BÌNH; khi loài liên quan trong bình cạn, phần chất thêm còn lại chảy
   tiếp xuống record kế trong chuỗi.
4. Không match + guard không giải thích ⇒ error (như v0) — nêu rõ bước thứ mấy.
5. Ghi `steps[t] = {op, reactions: [{id, xi}], ledgerDelta}`; khí sinh ra chuyển vào "đã thoát"
   (vẫn nằm sổ để query volume_gas/bảo toàn).

**BẢNG ƯU TIÊN v1 (đóng — chỉ 2 khuôn, đều quanh hệ cacbonat):**

| Khuôn | Chuỗi nấc |
|---|---|
| add **HCl** (dropwise) vào bình chứa **Na2CO3** (± NaHCO3) | nấc 1: R95 `Na2CO3 + HCl → NaHCO3 + NaCl` cho tới khi Na2CO3 hết; nấc 2: R56 ⚠ `NaHCO3 + HCl → NaCl + H2O + CO2↑` trên TỔNG NaHCO3 (có sẵn + vừa sinh) |
| add **Na2CO3** (dropwise) vào bình chứa **HCl** | một nấc: R39 `Na2CO3 + 2HCl → 2NaCl + H2O + CO2↑` (bình axit dư cục bộ → CO2 thoát ngay); Na2CO3 thêm sau khi HCl hết ⇒ nằm lại bình, không phản ứng |

- Khuôn 1 cũng phủ luôn đề kinh điển "nhỏ từ từ HCl vào hỗn hợp Na2CO3 + NaHCO3".
- H2SO4/K2CO3 chưa có record kéo theo ⇒ NGOÀI bảng v1 (error gợi ý rõ), xem §4.4.
- `dropwise=false` (đổ nhanh/không rõ): KHÔNG dùng chuỗi — rơi về record R39 với guard F7
  (n(HCl) ≥ 2n(Na2CO3)); vi phạm ⇒ error "kết quả phụ thuộc cách đổ, đề không nói 'từ từ' — ngoài
  phạm vi" (điểm phân vân §6.7).

**Record kéo theo R95 — Na2CO3 + HCl → NaHCO3 + NaCl**
Tự cân: Na 2 = 1+1 · C 1=1 · O 3=3 · H 1=1 · Cl 1=1 ✓. dd; type 'trao đổi'(∗ không sinh ↓/khí/H2O —
hợp lệ vì là NẤC của chuỗi, không đứng một mình: record đánh dấu `stageOnly: true`, KHÔNG được match
ở đường record-đơn §1.3); redox ✗; hiện tượng: "chưa có khí thoát ra (giai đoạn tạo muối axit)";
tags: `hoa/9-10/axit-bazo-muoi/axit-vao-cacbonat`.

#### 4.1.3. Bài mẫu tính tay

**A1 (bài F7 của review):** Nhỏ TỪ TỪ 100 ml dd HCl 1M vào 100 ml dd Na2CO3 0,6M. Tính V(CO2) (đktc).

- n(HCl) = 0,1 · n(Na2CO3) = 0,06 (hữu tỉ: 1/10; 3/50).
- Nấc 1 (R95): ξ₁ = min(0,1; 0,06) = 0,06 → HCl còn 0,04; sinh NaHCO3 0,06; NaCl 0,06; Na2CO3 hết.
- Nấc 2 (R56): ξ₂ = min(0,04; 0,06) = 0,04 → CO2 = 0,04 mol; NaHCO3 còn 0,02; NaCl thêm 0,04.
- **V(CO2) = 0,04 × 22,4 = 0,896 lít** ✓ (đúng đáp F7; engine v0 trả 1,12 — sai).
- Tự kiểm nguyên tố xuyên 2 nấc: Na 0,12 = NaCl 0,10 + NaHCO3 0,02 ✓ · C 0,06 = CO2 0,04 + NaHCO3
  0,02 ✓ · Cl 0,10 = NaCl 0,10 ✓.
- Bonus CM (V cộng tính 0,2 L): NaCl 0,5M; NaHCO3 0,1M.

**A2 (chiều ngược):** Nhỏ TỪ TỪ dd chứa 0,06 mol Na2CO3 vào 100 ml dd HCl 1M. Tính V(CO2) (đktc).

- Khuôn 2: mỗi phần Na2CO3 gặp HCl dư cục bộ → R39 trọn: 1 Na2CO3 ăn 2 HCl ra 1 CO2.
- HCl 0,1 mol đủ cho 0,05 mol Na2CO3 → CO2 = 0,05 mol; Na2CO3 dư 0,01 nằm lại bình.
- **V(CO2) = 0,05 × 22,4 = 1,12 lít.** Cặp A1/A2 cho hai đáp KHÁC NHAU từ cùng hóa chất — đúng bản
  chất đề "từ từ", và là ca kiểm tra dispatcher chọn khuôn theo CHIỀU thêm.
- Tự kiểm: Cl 0,1 = NaCl 0,1 ✓; C 0,06 = CO2 0,05 + Na2CO3 dư 0,01 ✓; Na 0,12 = 0,1 + 0,02 ✓.

#### 4.1.4. Tự kiểm xuyên giai đoạn + kết quả

- Mỗi bước: 2 định luật bảo toàn exact + after ≥ 0 (như v0).
- TOÀN CUỘC (mới): với TỪNG nguyên tố, Σ(mol × chỉ số) mọi thứ đã đổ vào = Σ trong bình cuối + Σ khí
  đã thoát — đẳng thức hữu tỉ exact; lệch ⇒ violation, không trả đáp.
- `ChemResult` thêm `steps?: {op: string; reactions: {id: string; xi: string}[];}[]` — v0 field giữ
  nguyên (`reactions` tổng = nối các bước; `ledger` = trạng thái cuối + cột khí thoát).
- C% ở bước cuối theo công thức F8 (m_dd = Σ đổ vào − m↓ − m khí ĐÃ THOÁT − m rắn dư).

#### 4.1.5. VẪN ngoài v1 (cơ chế A)

Bình thứ hai / gạn lọc kết tủa đem nung tiếp; chuỗi ưu tiên ngoài hệ cacbonat–HCl (H2SO4 từng nấc,
K2CO3, photphat từng nấc); "thêm từ từ đến khi kết tủa lớn nhất/bắt đầu tan" (bài biện luận theo
tham số); trộn 3 dung dịch trở lên trong MỘT bước có tương tác chéo.

<!-- TIEP -->



