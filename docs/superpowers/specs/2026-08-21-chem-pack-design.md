# Chem Pack — Engine Hóa VÔ CƠ v0 (THPT) — Thiết kế

**Ngày:** 2026-08-21
**Trạng thái:** Spec chờ phản biện hóa học (soi từng dòng bảng phản ứng §8 và bảng màu §12 trước khi thi công).
**Phạm vi:** Hóa VÔ CƠ THPT, trọng tâm chương **Kim loại** + **Axit – Bazơ – Muối** (SGK 9 → Hóa 12 phần đại cương kim loại).
**Kế hoạch thi công:** `docs/superpowers/plans/2026-08-21-chem-pack-v0.md`.

## 1. Mục tiêu

Thêm một engine thứ ba — **Hóa học tất định** — chạy song song engine Hình học (`run()`) và engine
Giải tích (`runAnalysis()`), **giữ nguyên triết lý chống ảo giác** của dự án:

> **LLM chỉ DỊCH đề → ChemPlan JSON. ENGINE tra DB ĐÓNG + TÍNH hữu tỉ chính xác + TỰ KIỂM bằng 2 định luật bảo toàn.**

Cụ thể hóa cho Hóa:

- LLM **không được** viết phương trình, **không được** cân bằng, **không được** tính mol. LLM chỉ khai
  báo *chất gì, bao nhiêu, trộn thế nào, đề hỏi gì*.
- Engine **chỉ chấp nhận phản ứng có trong Reaction DB** (50 record §8, mỗi record đã được người soi).
  Không có record khớp ⇒ hoặc trả "**không phản ứng**" (khi luật điều kiện §8.2 giải thích được vì sao),
  hoặc trả lỗi "**ngoài phạm vi DB v0**" — **không bao giờ suy diễn phản ứng mới**.
- Mọi phép tính chạy trên **số hữu tỉ chính xác** (Hóa THPT gần như chỉ cần hữu tỉ — nguyên tử khối SGK
  là số tròn hoặc x,5; xem §4). Đáp số dạng phân số + thập phân, không sai số tích lũy.
- Mọi kết quả **tự kiểm** bằng bảo toàn khối lượng + bảo toàn nguyên tố (đẳng thức hữu tỉ CHÍNH XÁC,
  không dung sai). Lệch ⇒ `violation`, không trả đáp bừa.

**Không mục tiêu v0 (YAGNI, ghi rõ để khỏi trượt phạm vi):** hóa hữu cơ; ion thu gọn; cân bằng
electron/ion-electron; trộn TUẦN TỰ nhiều lần (v1); bài NGƯỢC (cho lượng sản phẩm tìm chất đầu — v1);
CO2/SO2 + kiềm theo tỉ lệ tạo 2 muối (v1); hỗn hợp nhiều kim loại + hệ phương trình (v1); điện phân
dung dịch; nhiệt động/tốc độ phản ứng; pH.

## 2. Vì sao Hóa hợp khẩu vị engine này

| Đặc điểm bài Hóa THPT | Khớp với hạ tầng sẵn có |
|---|---|
| Đáp số hữu tỉ (0,1 mol; 6,4 g; 4,48 L; 0,5M) | `scalar.ts` đã có số hữu tỉ exact BigInt (`Exact` với `radicand = 1`) |
| Phương trình = đại số tuyến tính trên Q | Cân bằng bằng nullspace hữu tỉ — tất định tuyệt đối (§7) |
| "Chất hết/chất dư" = min các tỉ số hữu tỉ | So sánh hữu tỉ exact, không lằng nhằng epsilon |
| Tự kiểm = 2 định luật bảo toàn | Cùng khuôn `violations` của `run()`/`runAnalysis()` |
| Kiến thức phản ứng là tập ĐÓNG, đếm được | DB liệt kê tường minh, người phản biện soi được từng dòng |

Pattern lớp bọc: y hệt `api/_lib/kernel/analysis/runAnalysis.ts` — schema riêng, compute riêng,
entrypoint riêng (`runChem()`), **không sửa core**.

## 3. Kiến trúc & ranh giới file

```
api/_lib/kernel/chem/
├── rat.ts           # tiện ích hữu tỉ: bọc Exact(radicand=1) của ../scalar.ts + parse thập phân VN
├── atomicMass.ts    # bảng nguyên tử khối SGK VN (hữu tỉ exact)
├── formula.ts       # parser công thức: "Fe2(SO4)3" → Map nguyên tố → số; khối lượng mol
├── balance.ts       # cân bằng PTHH bằng nullspace hữu tỉ
├── reactionDB.ts    # 50 record phản ứng + dãy hoạt động + bảng tính tan mini + luật điều-kiện-xảy-ra
├── stoich.ts        # lượng chất → mol; chất hết/dư; sổ cái (ledger); CM/C%; 2 định luật bảo toàn
├── scene.ts         # ChemScene JSON cho frontend + bảng màu chuẩn
├── planSchema.ts    # ChemPlanSchema (zod)
├── runChem.ts       # entrypoint: plan → {reactions, ledger, answers, scene, violations, errors, trace}
└── __tests__/       # formula/balance/reactionDB/stoich/scene/runChem-contract
```

Ghi chú: `rat.ts` là file thêm ngoài danh sách dự kiến ban đầu — rất nhỏ (~40 dòng), chỉ để khỏi lặp
lại "gọi addExact rồi assert non-null" ở khắp nơi.

**Ranh giới cứng (điều kiện nghiệm thu):**
- **KHÔNG sửa** `api/_lib/kernel/run.ts`, `api/_lib/kernel/planSchema.ts` (gốc), `api/_lib/kernel/index.ts`, `package.json`.
- Chỉ **import từ** `../scalar.ts` (và `zod`). Không import ngược từ core vào chem.
- Test tự vào suite nhờ glob sẵn `api/_lib/kernel/**/*.test.ts` trong `vitest.config.ts` — không đổi config.
- Baseline **1072 test xanh** phải giữ nguyên xanh; chem chỉ CỘNG test mới.
- Route/bridge/prompt cho LLM = **ngoài phạm vi v0** (v1 sẽ có `translatorPromptChem` + route riêng).

## 4. Số học: hữu tỉ thuần + parse thập phân an toàn

- Kiểu `Rat` = `Exact` của `scalar.ts` với bất biến `radicand === 1`. Trong trường này `addExact/subExact/mulExact/divExact`
  **đóng kín và không bao giờ trả null** ⇒ `rat.ts` bọc thành `addR/subR/mulR/divR` trả thẳng `Rat`
  (assert bất biến, throw nếu vi phạm — không thể xảy ra nếu chỉ đi qua `rat.ts`).
- So sánh: `cmpR(a,b)` bằng tích chéo BigInt (a.num·b.den vs b.num·a.den) — exact.
- **Bẫy thập phân (quan trọng):** JSON đưa `5.6` tới dưới dạng double (5.6000000000000000888…).
  KHÔNG được dựng phân số từ double bằng nhân 10^k trên float. Quy ước: `parseDecimal(x: number | string): Rat`
  - `string`: chấp nhận cả `"5,6"` (dấu phẩy VN) lẫn `"5.6"` → tách phần nguyên/thập phân → `56/10` → rút gọn `28/5`.
  - `number`: đi qua `x.toString()` (chuỗi thập phân NGẮN NHẤT khứ hồi của JS — "5.6") rồi cùng đường trên.
    Từ chối `NaN/Infinity/1e21` (dạng mũ) bằng lỗi rõ ràng.
- Hiển thị: `text` dùng dấu phẩy VN (`6,4 g`; `2,479 lít`), kèm `exact` dạng `"32/5"` và `approx` number.

## 5. Parser công thức (`formula.ts`)

**Đầu vào** ví dụ: `"Fe"`, `"O2"`, `"Fe2(SO4)3"`, `"Ca(OH)2"`, `"(NH4)2SO4"`, `"CuSO4.5H2O"`, `"CuSO4·5H2O"`.
**Đầu ra:** `Map<string, number>` nguyên tố → chỉ số (nguyên dương), ví dụ `Fe2(SO4)3` → `{Fe:2, S:3, O:12}`.

Ngữ pháp (đệ quy, hỗ trợ ngoặc lồng tự nhiên):

```
formula   := part ( ('.' | '·') INT? part )*        # hydrat: "CuSO4.5H2O" — INT là hệ số cả cụm sau dấu chấm
part      := group+
group     := ( ELEMENT | '(' part ')' ) INT?         # INT vắng mặt = 1
ELEMENT   := [A-Z][a-z]?                             # phải CÓ trong bảng atomicMass, ngược lại lỗi
INT       := [1-9][0-9]*
```

- Hydrat cộng dồn: `CuSO4.5H2O` → `{Cu:1, S:1, O:4} + 5×{H:2, O:1}` = `{Cu:1, S:1, O:9, H:10}`.
- Chấp nhận cả `.` lẫn `·` (U+00B7) làm dấu hydrat.
- Lỗi có thông điệp cụ thể: nguyên tố lạ (`"Xy"`), ngoặc lệch, chỉ số `0`, chuỗi rỗng, ký tự lạ.
- `molarMass(formula): Rat` = Σ chỉ số × nguyên tử khối (§6) — hữu tỉ exact.
  Kiểm tay: M(Fe2(SO4)3) = 2·56 + 3·32 + 12·16 = **400**; M(CuSO4·5H2O) = 160 + 5·18 = **250**;
  M((NH4)2SO4) = 2·18 + 96 = **132**; M(Ca3(PO4)2) = 120 + 62 + 128 = **310**.
- v0: hydrat chỉ dùng để tính M / khối lượng tinh thể. Đưa hydrat vào `mix` ⇒ lỗi "hydrat chưa hỗ trợ
  phản ứng ở v0" (v1 sẽ tự tách nước kết tinh vào dung môi).

## 6. Bảng nguyên tử khối — THEO SGK VIỆT NAM (quyết định thiết kế)

**Dùng số tròn đề thi VN** (SGK cũ và GDPT 2018 đều làm tròn như nhau ở các nguyên tố này), **KHÔNG
dùng IUPAC lẻ** (Fe=55,845…) — để đáp số khớp đáp án SGK/đề thi. Lưu dưới dạng `Rat` (Cl = 71/2).

| Ng.tố | NTK | Ng.tố | NTK | Ng.tố | NTK | Ng.tố | NTK |
|---|---|---|---|---|---|---|---|
| H | 1 | O | 16 | K | 39 | Cu | 64 |
| He | 4 | F | 19 | Ca | 40 | Zn | 65 |
| Li | 7 | Ne | 20 | Cr | 52 | Br | 80 |
| Be | 9 | Na | 23 | Mn | 55 | Ag | 108 |
| B | 11 | Mg | 24 | Fe | 56 | Sn | 119 |
| C | 12 | Al | 27 | Ni | 59 | I | 127 |
| N | 14 | Si | 28 | P | 31 | Ba | 137 |
| S | 32 | **Cl** | **35,5** | Hg | 201 | Pb | 207 |
| | | Ar | 40 | Au | 197 | | |

- Phủ đủ mọi nguyên tố xuất hiện trong DB §8 + các nguyên tố quen đề thi. Thêm nguyên tố mới = thêm 1 dòng.
- Khối lượng mol phân tử hay gặp (suy ra, để test đối chiếu): HCl 36,5 · H2SO4 98 · HNO3 63 · NaOH 40 ·
  KOH 56 · Ca(OH)2 74 · Ba(OH)2 171 · NaCl 58,5 · AgCl 143,5 · AgNO3 170 · CuSO4 160 · FeCl2 127 ·
  FeCl3 162,5 · FeSO4 152 · Fe2O3 160 · Fe3O4 232 · CaCO3 100 · CO2 44 · SO2 64 · NH3 17 · BaSO4 233 ·
  BaCl2 208 · Na2CO3 106 · NaHCO3 84 · KMnO4 158 · Al2(SO4)3 342 · ZnCl2 136.

## 7. Balancer — cân bằng bằng đại số tuyến tính hữu tỉ (`balance.ts`)

**Vào:** danh sách chất tham gia + danh sách sản phẩm (công thức). **Ra:** hệ số nguyên dương tối giản, hoặc lỗi.

Thuật toán (tất định tuyệt đối, không thử-sai):

1. Parse mọi công thức (§5). Lập ma trận A: **hàng = nguyên tố**, **cột = chất** (chất tham gia dấu `+`,
   sản phẩm dấu `−`), phần tử = chỉ số nguyên tố trong chất.
2. Khử Gauss–Jordan trên **hữu tỉ exact** (BigInt qua `rat.ts`) → nullspace của A.
3. **Yêu cầu dim(nullspace) = 1.** Nếu 0 ⇒ "không cân bằng được" (đề sai/thiếu chất). Nếu ≥ 2 ⇒
   "hệ phản ứng không xác định duy nhất" (vd `C + O2 → CO + CO2` trộn 2 phản ứng độc lập) — **từ chối,
   không đoán**.
4. Lấy vector cơ sở, nhân LCM các mẫu số → nguyên; chia GCD → tối giản; nếu toàn âm thì đổi dấu;
   **mọi hệ số phải > 0** (dấu lẫn lộn ⇒ chất bị đặt nhầm vế ⇒ từ chối).

Vai trò kép: (a) query `equation` ("cân bằng phương trình sau"); (b) **tự kiểm Reaction DB** — test
load toàn bộ 50 record, chạy balancer, hệ số phải TRÙNG hệ số lưu trong record (DB không thể chứa
phương trình sai cân bằng mà lọt qua CI).

Kiểm tay các ca test chốt: `Fe + O2 → Fe3O4` ⇒ [3,2,1] · `KMnO4 → K2MnO4 + MnO2 + O2` ⇒ [2,1,1,1] ·
`Cu + HNO3 → Cu(NO3)2 + NO + H2O` ⇒ [3,8,3,2,4] · `Al + H2SO4 → Al2(SO4)3 + H2` ⇒ [2,3,1,3] ·
`C + O2 → CO + CO2` ⇒ từ chối (dim 2).

## 8. Reaction DB (`reactionDB.ts`)

### 8.1. Schema một record

```ts
export type ReactionRecord = {
  id: string;                                   // 'R01'…'R50'
  reactants: { formula: string; coeff: number; variant?: 'loãng' | 'đặc' }[];
  products:  { formula: string; coeff: number; state: 'solid' | 'gas' | 'solution' | 'liquid' }[];
  conditions: ('t°' | 'xúc tác' | 'đpnc')[];    // điều kiện THỰC HIỆN (đun nóng, xúc tác…)
  type: 'hóa hợp' | 'phân hủy' | 'thế' | 'trao đổi' | 'oxi hóa – khử';
  redox: boolean;
  phenomena: string[];                          // hiện tượng tiếng Việt, khớp bảng màu §12
  tags: string[];                               // cây tri thức: 'kim-loai/axit', 'nhiet-phan', …
  note?: string;                                // cảnh báo/nới phạm vi (vd AgNO3 dư)
};
```

### 8.2. Luật ĐIỀU KIỆN XẢY RA (guard — engine dùng để giải thích "không phản ứng")

- **Dãy hoạt động hóa học** (SGK): `K > Ba > Ca > Na > Mg > Al > Zn > Fe > Ni > Sn > Pb > (H) > Cu > Hg > Ag > Pt > Au`.
  - G1: Kim loại + HCl/H2SO4 loãng ⇔ kim loại đứng **trước H**. (Cu + HCl ⇒ "không phản ứng, Cu đứng sau H".)
  - G2: Kim loại M1 + dung dịch muối M2 ⇔ M1 đứng **trước** M2 **và** M1 ∉ {K, Ba, Ca, Na}
    (nhóm này gặp nước phản ứng với NƯỚC trước — không đẩy được kim loại khỏi muối trong dung dịch).
- **Điều kiện phản ứng trao đổi trong dung dịch:** sản phẩm phải có ít nhất một trong
  {**kết tủa**, **khí**, **H2O**}; tra bằng bảng tính tan mini §8.3.
  **Guard này CHỈ được kết luận "không phản ứng" khi mọi ion của cả hai chất đều nằm trong bảng §8.3.**
  Gặp ion lạ (vd MnO4⁻ trong `KMnO4 + HCl` — thực tế CÓ phản ứng oxi hóa – khử, ngoài DB v0) ⇒ guard
  trả `null` ⇒ runChem trả lỗi "ngoài phạm vi DB v0" chứ KHÔNG dám tuyên "không phản ứng".
- G3: Nhiệt phân / khử oxit / kim loại + S / Fe + Cl2… chỉ chạy khi `mix.heated = true` (record có `t°`).
- G4: **Thụ động hóa:** Al, Fe **không phản ứng** với HNO3 đặc nguội, H2SO4 đặc nguội — guard trả
  lời "không phản ứng (thụ động hóa)" thay vì im lặng.
- Khi KHÔNG record nào khớp và KHÔNG guard nào giải thích được ⇒ lỗi `ngoài phạm vi DB v0` (phân biệt
  rạch ròi "biết là không xảy ra" vs "không biết").

### 8.3. Bảng tính tan mini (đủ cho các chất trong DB; dùng cho guard + scene)

| Nhóm | Tan | KHÔNG tan (kết tủa) | Ít tan |
|---|---|---|---|
| NO3⁻ | tất cả | — | — |
| Cl⁻ | hầu hết | AgCl | PbCl2 |
| SO4²⁻ | hầu hết | BaSO4, PbSO4 | CaSO4, Ag2SO4 |
| CO3²⁻ | Na2CO3, K2CO3, (NH4)2CO3 | còn lại (CaCO3, BaCO3, MgCO3…) | — |
| OH⁻ | NaOH, KOH, Ba(OH)2 | còn lại (Cu(OH)2, Fe(OH)2, Fe(OH)3, Mg(OH)2, Al(OH)3, Zn(OH)2…) | Ca(OH)2 |
| Muối Na⁺/K⁺/NH4⁺ | tất cả | — | — |

### 8.4. BẢNG 50 PHẢN ỨNG SEED (mỗi dòng sẽ bị chuyên gia Hóa soi — hệ số đã kiểm tay từng dòng)

**Nhóm A — Kim loại + phi kim (O2 / Cl2 / S)** — đều `t°`, hóa hợp, redox ✓

| # | Phương trình | Đk | Loại | Hiện tượng | Tags |
|---|---|---|---|---|---|
| R01 | 3Fe + 2O2 → Fe3O4 | t° | hóa hợp | sắt cháy sáng, bắn tia lửa; tạo hạt rắn màu nâu đen (oxit sắt từ) | kim-loai/phi-kim |
| R02 | 4Al + 3O2 → 2Al2O3 | t° | hóa hợp | cháy sáng chói; tạo chất rắn trắng | kim-loai/phi-kim |
| R03 | 2Mg + O2 → 2MgO | t° | hóa hợp | cháy sáng chói lóa; tạo khói trắng MgO | kim-loai/phi-kim |
| R04 | 2Cu + O2 → 2CuO | t° | hóa hợp | đồng đỏ chuyển thành lớp rắn màu đen | kim-loai/phi-kim |
| R05 | 2Fe + 3Cl2 → 2FeCl3 | t° | hóa hợp | sắt cháy trong clo tạo khói màu nâu đỏ | kim-loai/phi-kim |
| R06 | Cu + Cl2 → CuCl2 | t° | hóa hợp | đồng cháy tạo khói màu vàng nâu | kim-loai/phi-kim |
| R07 | Fe + S → FeS | t° | hóa hợp | hỗn hợp nóng đỏ lan truyền; tạo chất rắn màu xám đen | kim-loai/phi-kim |

**Nhóm B — Kim loại kiềm/kiềm thổ + nước** — thế, redox ✓

| # | Phương trình | Đk | Loại | Hiện tượng | Tags |
|---|---|---|---|---|---|
| R08 | 2Na + 2H2O → 2NaOH + H2↑ | — | thế | Na nóng chảy thành giọt tròn chạy trên mặt nước, sủi bọt khí, tỏa nhiệt | kim-loai/nuoc |
| R09 | Ca + 2H2O → Ca(OH)2 + H2↑ | — | thế | sủi bọt khí; dung dịch vẩn đục nhẹ (Ca(OH)2 ít tan) | kim-loai/nuoc |
| R10 | Ba + 2H2O → Ba(OH)2 + H2↑ | — | thế | tan nhanh, sủi bọt khí mạnh, tỏa nhiệt | kim-loai/nuoc |

**Nhóm C — Kim loại + axit loãng (HCl / H2SO4 loãng)** — thế, redox ✓; guard G1

| # | Phương trình | Đk | Loại | Hiện tượng | Tags |
|---|---|---|---|---|---|
| R11 | Mg + 2HCl → MgCl2 + H2↑ | — | thế | kim loại tan nhanh, sủi bọt khí không màu | kim-loai/axit |
| R12 | 2Al + 6HCl → 2AlCl3 + 3H2↑ | — | thế | kim loại tan, sủi bọt khí không màu | kim-loai/axit |
| R13 | Zn + 2HCl → ZnCl2 + H2↑ | — | thế | viên kẽm tan dần, sủi bọt khí không màu | kim-loai/axit |
| R14 | Fe + 2HCl → FeCl2 + H2↑ | — | thế | sắt tan dần, sủi bọt khí; dung dịch lục rất nhạt (gần như không màu) | kim-loai/axit |
| R15 | Fe + H2SO4 → FeSO4 + H2↑ | (loãng) | thế | như R14 | kim-loai/axit |
| R16 | 2Al + 3H2SO4 → Al2(SO4)3 + 3H2↑ | (loãng) | thế | nhôm tan, sủi bọt khí không màu | kim-loai/axit |

**Nhóm D — Kim loại + axit có tính oxi hóa mạnh** — oxi hóa – khử ✓; guard G4 (thụ động)

| # | Phương trình | Đk | Loại | Hiện tượng | Tags |
|---|---|---|---|---|---|
| R17 | Cu + 2H2SO4(đặc) → CuSO4 + SO2↑ + 2H2O | t°, đặc | oxi hóa – khử | Cu tan, khí không màu mùi hắc; dung dịch chuyển xanh lam | axit-oxh-manh |
| R18 | 3Cu + 8HNO3(loãng) → 3Cu(NO3)2 + 2NO↑ + 4H2O | loãng | oxi hóa – khử | Cu tan, khí không màu hóa nâu trong không khí; dung dịch xanh lam | axit-oxh-manh |
| R19 | Fe + 4HNO3(loãng, dư) → Fe(NO3)3 + NO↑ + 2H2O | loãng, HNO3 dư | oxi hóa – khử | sắt tan, khí không màu hóa nâu; dung dịch vàng nâu nhạt | axit-oxh-manh |

**Nhóm E — Kim loại + dung dịch muối** — thế, redox ✓; guard G2

| # | Phương trình | Đk | Loại | Hiện tượng | Tags |
|---|---|---|---|---|---|
| R20 | Fe + CuSO4 → FeSO4 + Cu↓ | dd | thế | lớp đồng đỏ bám lên sắt; màu xanh lam của dung dịch nhạt dần | kim-loai/muoi |
| R21 | Zn + CuSO4 → ZnSO4 + Cu↓ | dd | thế | lớp đồng đỏ bám lên kẽm; màu xanh lam nhạt dần | kim-loai/muoi |
| R22 | Cu + 2AgNO3 → Cu(NO3)2 + 2Ag↓ | dd | thế | lớp bạc trắng xám bám lên đồng; dung dịch chuyển dần sang xanh lam | kim-loai/muoi |
| R23 | Fe + 2AgNO3 → Fe(NO3)2 + 2Ag↓ | dd | thế | bạc trắng xám bám lên sắt | kim-loai/muoi · note: AgNO3 dư sẽ oxi hóa tiếp Fe²⁺ → Fe³⁺, v0 KHÔNG mô hình hóa ca dư |

**Nhóm F — Oxit (oxit bazơ/axit + nước; oxit + axit/kiềm)**

| # | Phương trình | Đk | Loại | Hiện tượng | Tags |
|---|---|---|---|---|---|
| R24 | CaO + H2O → Ca(OH)2 | — | hóa hợp | tỏa nhiệt mạnh (tôi vôi), chất rắn nhão ra | oxit/bazo |
| R25 | Na2O + H2O → 2NaOH | — | hóa hợp | tan hết, tỏa nhiệt | oxit/bazo |
| R26 | SO3 + H2O → H2SO4 | — | hóa hợp | tỏa nhiệt | oxit/axit |
| R27 | CuO + 2HCl → CuCl2 + H2O | — | trao đổi | bột đen tan, tạo dung dịch màu xanh lam | oxit/axit-tac-dung |
| R28 | Fe2O3 + 6HCl → 2FeCl3 + 3H2O | — | trao đổi | bột đỏ nâu tan, tạo dung dịch vàng nâu | oxit/axit-tac-dung |
| R29 | CO2 + Ca(OH)2 → CaCO3↓ + H2O | dd | trao đổi | nước vôi trong vẩn đục (kết tủa trắng) | oxit/axit · note: CO2 dư hòa tan kết tủa (tạo Ca(HCO3)2) — v0 không mô hình hóa |
| R30 | Al2O3 + 2NaOH → 2NaAlO2 + H2O | dd | trao đổi | chất rắn trắng tan trong kiềm (oxit lưỡng tính) | oxit/luong-tinh |

**Nhóm G — Axit + bazơ (trung hòa)** — trao đổi, redox ✗

| # | Phương trình | Đk | Loại | Hiện tượng | Tags |
|---|---|---|---|---|---|
| R31 | NaOH + HCl → NaCl + H2O | dd | trao đổi | không hiện tượng nhìn thấy; tỏa nhiệt nhẹ (quỳ/phenolphtalein đổi màu nếu có) | axit-bazo/trung-hoa |
| R32 | 2NaOH + H2SO4 → Na2SO4 + 2H2O | dd | trao đổi | như R31 | axit-bazo/trung-hoa |
| R33 | Cu(OH)2 + 2HCl → CuCl2 + 2H2O | — | trao đổi | kết tủa xanh lam tan, tạo dung dịch xanh lam | axit-bazo/trung-hoa |
| R34 | Ba(OH)2 + H2SO4 → BaSO4↓ + 2H2O | dd | trao đổi | kết tủa trắng (không tan trong axit dư) | axit-bazo/trung-hoa |

**Nhóm H — Muối + bazơ / muối + axit / muối + muối** — trao đổi, redox ✗; guard trao đổi §8.2

| # | Phương trình | Đk | Loại | Hiện tượng | Tags |
|---|---|---|---|---|---|
| R35 | CuSO4 + 2NaOH → Cu(OH)2↓ + Na2SO4 | dd | trao đổi | kết tủa xanh lam | muoi/bazo |
| R36 | FeCl3 + 3NaOH → Fe(OH)3↓ + 3NaCl | dd | trao đổi | kết tủa nâu đỏ | muoi/bazo |
| R37 | FeCl2 + 2NaOH → Fe(OH)2↓ + 2NaCl | dd | trao đổi | kết tủa trắng xanh, hóa nâu đỏ dần trong không khí | muoi/bazo · note: hóa nâu = 4Fe(OH)2+O2+2H2O→4Fe(OH)3, ghi hiện tượng, không thành record |
| R38 | NH4Cl + NaOH → NaCl + NH3↑ + H2O | t°, dd | trao đổi | khí mùi khai bay lên, làm xanh quỳ tím ẩm | muoi/bazo |
| R39 | Na2CO3 + 2HCl → 2NaCl + H2O + CO2↑ | dd | trao đổi | sủi bọt khí không màu, làm đục nước vôi | muoi/axit |
| R40 | CaCO3 + 2HCl → CaCl2 + H2O + CO2↑ | — | trao đổi | đá vôi tan, sủi bọt khí không màu | muoi/axit |
| R41 | AgNO3 + NaCl → AgCl↓ + NaNO3 | dd | trao đổi | kết tủa trắng, hóa đen dần ngoài ánh sáng | muoi/muoi |
| R42 | BaCl2 + Na2SO4 → BaSO4↓ + 2NaCl | dd | trao đổi | kết tủa trắng, không tan trong axit | muoi/muoi |

**Nhóm I — Nhiệt phân** — phân hủy; cần `t°` (guard G3)

| # | Phương trình | Đk | Loại | Redox | Hiện tượng | Tags |
|---|---|---|---|---|---|---|
| R43 | CaCO3 → CaO + CO2↑ | t° | phân hủy | ✗ | chất rắn trắng còn lại xốp hơn; khí thoát làm đục nước vôi | nhiet-phan |
| R44 | 2KMnO4 → K2MnO4 + MnO2 + O2↑ | t° | phân hủy | ✓ | tinh thể tím rã ra, thu khí O2 (làm bùng tàn đóm đỏ) | nhiet-phan · dieu-che/oxi |
| R45 | Cu(OH)2 → CuO + H2O | t° | phân hủy | ✗ | kết tủa xanh lam chuyển thành chất rắn đen | nhiet-phan |
| R46 | 2Fe(OH)3 → Fe2O3 + 3H2O | t° | phân hủy | ✗ | chất rắn nâu đỏ → bột đỏ nâu | nhiet-phan |
| R47 | 2NaHCO3 → Na2CO3 + H2O + CO2↑ | t° | phân hủy | ✗ | khí thoát làm đục nước vôi | nhiet-phan |

**Nhóm K — Khử oxit kim loại / nhiệt nhôm** — oxi hóa – khử ✓; cần `t°`

| # | Phương trình | Đk | Loại | Hiện tượng | Tags |
|---|---|---|---|---|---|
| R48 | CuO + H2 → Cu + H2O | t° | oxi hóa – khử | bột đen chuyển đỏ (Cu); hơi nước ngưng trên thành ống | dieu-che/kim-loai |
| R49 | Fe2O3 + 3CO → 2Fe + 3CO2 | t° | oxi hóa – khử | bột đỏ nâu chuyển xám (Fe); khí ra làm đục nước vôi | dieu-che/kim-loai |
| R50 | 2Al + Fe2O3 → Al2O3 + 2Fe | t° | oxi hóa – khử (nhiệt nhôm) | phản ứng cháy sáng chói, tỏa nhiệt mạnh; thu sắt nóng chảy | dieu-che/kim-loai |

**Ứng viên để dành v1 (KHÔNG vào DB v0 — cần chuyên gia duyệt trước):** `Cu + 4HNO3 đặc → Cu(NO3)2 + 2NO2 + 2H2O`;
`2Fe + 6H2SO4 đặc, t° → Fe2(SO4)3 + 3SO2 + 6H2O`; `Cu + 2FeCl3 → CuCl2 + 2FeCl2`; `2Al + 2NaOH + 2H2O → 2NaAlO2 + 3H2`;
`2KClO3 → 2KCl + 3O2 (t°, xt MnO2)`; `CO2 + 2NaOH → Na2CO3 + H2O` (và bài toán tỉ lệ 2 muối);
`4Na + O2 → 2Na2O` (né vào v0 vì tranh cãi Na2O/Na2O2 theo điều kiện).

## 9. Stoichiometry (`stoich.ts`)

### 9.1. Lượng đề cho → mol hữu tỉ

| Dạng đề cho | Cách quy về mol |
|---|---|
| `grams: m` | n = m / M(formula) |
| `mol: n` | dùng thẳng |
| `liters_gas: V` | n = V / Vm (Vm theo `plan.molarVolume`, §9.3) |
| `solution: {molarity CM, liters V}` | n = CM · V |
| `solution_percent: {massGrams m_dd, percent C}` | n = (m_dd · C / 100) / M |
| `excess: true` | ∞ (chất dư có chủ đích — không giới hạn) |
| *(bỏ trống amount)* | định tính (chỉ phục vụ phenomena/equation; query định lượng đụng tới ⇒ lỗi) |

### 9.2. Chất hết / chất dư (limiting reagent) + sổ cái

Với record `Σ aᵢ·Rᵢ → Σ bⱼ·Pⱼ` và mol ban đầu `n(Rᵢ)`:
- **Mức phản ứng** ξ = min ᵢ ( n(Rᵢ) / aᵢ ) (min trên hữu tỉ exact; chất ξ đạt min = chất HẾT; excess bỏ qua khi lấy min).
- Sổ cái mỗi chất: `before / consumed = aᵢ·ξ / produced = bⱼ·ξ / after = before − consumed (+ produced)`.
  Bất biến: mọi `after ≥ 0` (âm ⇒ bug ⇒ violation).
- v0: đúng **1 phản ứng chính** cho mỗi `mix`. Nếu ≥ 2 record cùng khớp tập chất ⇒ lỗi "đa phản ứng,
  ngoài phạm vi v0" (không tự chọn).

### 9.3. Thể tích mol khí — 22,4 và 24,79 (bắt buộc hỗ trợ CẢ HAI)

- `plan.molarVolume` ∈ {**22.4**, **24.79**} — **LLM đọc từ đề**: đề nói "đktc" (chương trình cũ, 0°C 1 atm)
  ⇒ 22,4; đề nói "đkc" (GDPT 2018, 25°C 1 bar) ⇒ 24,79. **Default = 24,79** (chương trình hiện hành).
- Lưu dạng hữu tỉ: 22,4 = 112/5; 24,79 = 2479/100. Áp cho cả input `liters_gas` lẫn query `volume_gas`.
- Câu trả lời thể tích LUÔN ghi rõ mốc dùng ("(đktc, 22,4 L/mol)" / "(đkc, 24,79 L/mol)") — tránh lộn chương trình.

### 9.4. Nồng độ đầu ra

- `concentration(of, as:'CM')`: CM = n(X)sau / V tổng, V tổng = Σ `liters` các species dạng `solution`.
  **Giả định thể tích cộng tính** — ghi chú giả định ngay trong answer. Có species dung dịch `excess`
  (không rõ V) ⇒ lỗi rõ ràng.
- `concentration(of, as:'C%')`: C% = m(X)sau / m_dd sau × 100, với
  **m_dd sau = Σ khối lượng mọi thứ đổ vào (dd + rắn + lỏng) − m kết tủa − m khí bay ra** (hệ quả bảo
  toàn khối lượng — đúng kỹ thuật giải SGK). Yêu cầu mọi lượng hữu hạn (không excess).

### 9.5. Tự kiểm — 2 định luật bảo toàn (asserts TỰ ĐỘNG, luôn bật)

1. **Bảo toàn khối lượng:** Σ m(consumed) = Σ m(produced) — đẳng thức hữu tỉ **CHÍNH XÁC** (cmpR = 0,
   không dung sai). (Khi có chất excess, kiểm trên phần phản ứng — vẫn chặt.)
2. **Bảo toàn nguyên tố:** với TỪNG nguyên tố, Σ (chỉ số × mol consumed) = Σ (chỉ số × mol produced) — exact.
3. `after ≥ 0` với mọi chất (§9.2).
4. DB tự cân bằng (test-time, §7).

Lệch bất kỳ ⇒ đẩy `violation {law, detail, lhs, rhs}` và `ok:false` — **không trả đáp số**. Vì số học
exact, một violation ở đây nghĩa là bug logic/DB, không phải sai số — đúng vai trò lưới an toàn.

Asserts ĐỀ CHO (tùy chọn, LLM khai từ đề): `{kind:'given_mass', of, grams}` / `{kind:'given_mol', of, mol}` —
đề nói "thu được 6,4 g Cu" ⇒ engine đối chiếu kết quả tính với số đề cho; lệch ⇒ violation (mô hình
hóa sai đâu đó), không im lặng.

## 10. ChemPlanSchema (zod, `planSchema.ts`)

```ts
const Qty = z.union([z.number(), z.string()]); // "5,6" | 5.6 → parseDecimal (§4)

const AmountSchema = z.union([
  z.object({ grams: Qty }),
  z.object({ mol: Qty }),
  z.object({ liters_gas: Qty }),
  z.object({ solution: z.object({ molarity: Qty, liters: Qty }) }),
  z.object({ solution_percent: z.object({ massGrams: Qty, percent: Qty }) }),
  z.object({ excess: z.literal(true) }),
]);

const SpeciesOpSchema = z.object({
  op: z.literal('species'),
  formula: z.string().min(1),
  amount: AmountSchema.optional(),            // bỏ trống = định tính (bài hỏi hiện tượng)
  state: z.enum(['solid', 'solution', 'gas', 'liquid']).optional(), // vắng ⇒ suy từ loại chất (kim loại→solid, muối+solution amount→solution…)
  variant: z.enum(['loãng', 'đặc']).optional(), // cho H2SO4/HNO3; vắng ⇒ 'loãng'
});

const MixOpSchema = z.object({
  op: z.literal('mix'),
  of: z.array(z.string()).optional(),          // v0: PHẢI vắng mặt (trộn tất cả); v1: trộn tuần tự theo danh sách
  heated: z.boolean().default(false),          // true ⇔ record cần 't°' được phép khớp
});

const ChemQuerySchema = z.union([
  z.object({ kind: z.literal('mass'), of: z.string() }),
  z.object({ kind: z.literal('mol'), of: z.string() }),
  z.object({ kind: z.literal('volume_gas'), of: z.string() }),
  z.object({ kind: z.literal('concentration'), of: z.string(), as: z.enum(['CM', 'C%']) }),
  z.object({ kind: z.literal('remaining'), of: z.string() }),   // chất dư còn lại (mol + gam)
  z.object({ kind: z.literal('phenomena') }),
  z.object({ kind: z.literal('equation') }),
]);

const ChemAssertSchema = z.union([
  z.object({ kind: z.literal('given_mass'), of: z.string(), grams: Qty }),
  z.object({ kind: z.literal('given_mol'), of: z.string(), mol: Qty }),
]);

export const ChemPlanSchema = z.object({
  ops: z.array(z.union([SpeciesOpSchema, MixOpSchema])).min(1),
  molarVolume: z.union([z.literal(22.4), z.literal(24.79)]).default(24.79), // LLM đọc từ đề: "đktc"→22.4, "đkc"→24.79
  queries: z.array(ChemQuerySchema).min(1),
  asserts: z.array(ChemAssertSchema).default([]),
});
```

**v0 chấp nhận đúng MỘT op `mix`** (0 mix ⇒ chỉ tính M/khối lượng/đổi đơn vị của từng chất — vẫn hữu
ích cho bài "tính khối lượng mol", "đổi gam ↔ mol ↔ lít"). Ghi rõ trong schema comment: **v1 sẽ thêm
trộn tuần tự** (`of` + nhiều mix, sản phẩm mix trước làm đầu vào mix sau).

Kết quả `runChem()`:

```ts
export type ChemResult = {
  ok: boolean;
  reactions: { id: string; equation: string; coefficients: number[] }[]; // rỗng nếu không phản ứng
  noReaction?: { reason: string };            // guard giải thích được (vd "Cu đứng sau H")
  ledger: { formula: string; before: string | null; consumed: string; produced: string; after: string | null; excess: boolean }[]; // hữu tỉ dạng chuỗi "1/10"; null = ∞ (excess)
  answers: { query: unknown; exact: string | null; approx: number | null; unit: string; text: string }[];
  scene: ChemScene;                            // §11
  violations: { law: string; detail: string }[];
  errors: { message: string }[];
  trace: string[];
};
```

## 11. ChemScene JSON (`scene.ts`) — mô tả cảnh cho frontend

Frontend (React) sẽ render sau; v0 chỉ SINH JSON tất định từ ledger + record + bảng màu:

```ts
export type ChemScene = {
  vessels: {
    id: string;                                // 'v1', 'v2'…
    kind: 'beaker' | 'test_tube';
    contents: { formula: string; state: 'solution' | 'solid' | 'gas'; color: string; colorName: string; amountText?: string }[];
  }[];
  events: (
    | { t: number; kind: 'pour';         from: string; into: string; formula: string }
    | { t: number; kind: 'add_solid';    into: string; formula: string }
    | { t: number; kind: 'heat';         vessel: string }
    | { t: number; kind: 'color_change'; vessel: string; fromColor: string; toColor: string; text: string }
    | { t: number; kind: 'precipitate';  vessel: string; formula: string; color: string; text: string }
    | { t: number; kind: 'gas_bubbles';  vessel: string; formula: string; text: string }
    | { t: number; kind: 'dissolve';     vessel: string; formula: string; text: string }
  )[];
  captions: { t: number; text: string }[];     // thuyết minh tiếng Việt theo mốc thời gian
};
```

Quy tắc sinh (tất định): mỗi species-có-state-solution → 1 vessel (beaker); chất rắn → `add_solid`
vào vessel trộn; `heated` → event `heat`; record có sản phẩm kết tủa/khí → event `precipitate`/`gas_bubbles`
với màu tra bảng §12; đổi màu dung dịch (vd CuSO4 nhạt dần khi hết) → `color_change`. `t` gán 0, 1, 2…
theo thứ tự logic — frontend tự co giãn thời lượng.

## 12. BẢNG MÀU chuẩn (hằng `COLORS` trong `scene.ts` — chuyên gia soi cùng bảng phản ứng)

**Dung dịch** (không có trong bảng ⇒ "không màu"):

| Chất (dd) | Màu tiếng Việt | Hex gợi ý |
|---|---|---|
| CuSO4, CuCl2, Cu(NO3)2 (ion Cu²⁺) | xanh lam | `#2E86DE` |
| FeCl3, Fe2(SO4)3, Fe(NO3)3 (ion Fe³⁺) | vàng nâu | `#B7791F` |
| FeCl2, FeSO4 (ion Fe²⁺) | lục rất nhạt (gần như không màu) | `#C8E6C9` |
| KMnO4 | tím | `#6F42C1` |
| Axit loãng, kiềm, muối Na/K/Ca/Ba/Mg/Al/Zn/NH4 thông thường | không màu | `#EAF4FB` |

**Chất rắn / kết tủa:**

| Chất | Màu | Hex gợi ý | | Chất | Màu | Hex gợi ý |
|---|---|---|---|---|---|---|
| Cu | đỏ (ánh kim) | `#B87333` | | Fe(OH)3 | nâu đỏ | `#8B4513` |
| CuO | đen | `#1B1B1B` | | Fe(OH)2 | trắng xanh | `#D5E8D4` |
| Cu(OH)2 | xanh lam | `#3498DB` | | Fe2O3 | đỏ nâu | `#A0522D` |
| Fe | trắng xám | `#7F8C8D` | | Fe3O4 | nâu đen | `#2C2C2C` |
| Ag | trắng xám (ánh kim) | `#C0C0C0` | | FeS | xám đen | `#3B3B3B` |
| AgCl | trắng (hóa đen ngoài sáng) | `#F5F5F5` | | S | vàng | `#F1C40F` |
| BaSO4, CaCO3, BaCO3 | trắng | `#FAFAFA` | | MgO, CaO, Al2O3, ZnO | trắng | `#FDFDFD` |
| Mg(OH)2, Zn(OH)2 | trắng | `#FAFAFA` | | Al(OH)3 | keo trắng | `#F2F2F2` |
| Na, K | trắng bạc | `#DCDCDC` | | KMnO4 (rắn) | tím đen | `#3D1E52` |

**Chất khí:**

| Khí | Màu / dấu hiệu |
|---|---|
| H2, O2, N2, CO2 | không màu (CO2: làm đục nước vôi trong) |
| Cl2 | vàng lục, mùi hắc, độc |
| SO2 | không màu, mùi hắc |
| NO | không màu, hóa nâu trong không khí (2NO + O2 → 2NO2) |
| NO2 | nâu đỏ |
| NH3 | không màu, mùi khai, làm xanh quỳ tím ẩm |

## 13. 10 BÀI MẪU — contract test (đề VN + plan JSON + tính tay từng bước)

Mỗi bài thành 1 test trong `__tests__/runChem-contract.test.ts`; đáp số dưới đây là **golden tính tay**,
test so `exact` (phân số) chứ không so float.

### Bài 1 — Kim loại + muối (bài mẫu chuẩn)
**Đề:** Ngâm 5,6 g Fe trong dung dịch CuSO4 dư đến phản ứng hoàn toàn. Tính khối lượng Cu thu được.
```json
{ "ops": [
    { "op": "species", "formula": "Fe", "amount": { "grams": "5,6" } },
    { "op": "species", "formula": "CuSO4", "amount": { "excess": true }, "state": "solution" },
    { "op": "mix" } ],
  "queries": [ { "kind": "mass", "of": "Cu" } ] }
```
**Tính tay:** n(Fe) = 28/5 ÷ 56 = **1/10** mol. R20: Fe + CuSO4 → FeSO4 + Cu; CuSO4 dư ⇒ Fe hết, ξ = 1/10.
n(Cu) = 1/10 ⇒ m(Cu) = 1/10 × 64 = 32/5 = **6,4 g**.
Kiểm bảo toàn khối lượng (phần phản ứng): 5,6 + 1/10·160 (=16) = 6,4 + 1/10·152 (=15,2) → 21,6 = 21,6 ✓.

### Bài 2 — Kim loại + axit, V khí theo **22,4** (đktc — chương trình cũ)
**Đề:** Cho 13 g Zn tác dụng hết với dung dịch HCl dư. Tính thể tích H2 thoát ra (đktc).
```json
{ "ops": [
    { "op": "species", "formula": "Zn", "amount": { "grams": 13 } },
    { "op": "species", "formula": "HCl", "amount": { "excess": true }, "state": "solution" },
    { "op": "mix" } ],
  "molarVolume": 22.4,
  "queries": [ { "kind": "volume_gas", "of": "H2" } ] }
```
**Tính tay:** n(Zn) = 13/65 = **1/5** mol. R13: Zn + 2HCl → ZnCl2 + H2 ⇒ n(H2) = 1/5.
V = 1/5 × 112/5 = 112/25 = **4,48 lít (đktc)**.

### Bài 3 — Kim loại + axit, V khí theo **24,79** (đkc — GDPT 2018)
**Đề:** Cho 2,4 g Mg tác dụng hết với dung dịch HCl dư. Tính thể tích H2 ở điều kiện chuẩn (25 °C, 1 bar).
```json
{ "ops": [
    { "op": "species", "formula": "Mg", "amount": { "grams": "2,4" } },
    { "op": "species", "formula": "HCl", "amount": { "excess": true }, "state": "solution" },
    { "op": "mix" } ],
  "queries": [ { "kind": "volume_gas", "of": "H2" } ] }
```
(molarVolume vắng mặt ⇒ default 24,79.)
**Tính tay:** n(Mg) = 12/5 ÷ 24 = **1/10**. R11 ⇒ n(H2) = 1/10. V = 1/10 × 2479/100 = 2479/1000 = **2,479 lít (đkc)**.

### Bài 4 — Axit + bazơ, nồng độ CM sau phản ứng (kèm chất dư)
**Đề:** Trộn 200 ml dung dịch NaOH 1M với 200 ml dung dịch HCl 1,5M. Tính nồng độ mol các chất trong
dung dịch sau phản ứng (coi thể tích cộng tính).
```json
{ "ops": [
    { "op": "species", "formula": "NaOH", "amount": { "solution": { "molarity": 1, "liters": "0,2" } } },
    { "op": "species", "formula": "HCl",  "amount": { "solution": { "molarity": "1,5", "liters": "0,2" } } },
    { "op": "mix" } ],
  "queries": [ { "kind": "concentration", "of": "NaCl", "as": "CM" },
               { "kind": "concentration", "of": "HCl",  "as": "CM" } ] }
```
**Tính tay:** n(NaOH) = 1/5; n(HCl) = 3/2 × 1/5 = 3/10. R31 (1:1): NaOH hết (1/5 < 3/10), ξ = 1/5.
n(NaCl) = 1/5; HCl dư = 3/10 − 1/5 = 1/10. V tổng = 2/5 L.
CM(NaCl) = (1/5)/(2/5) = **0,5M**; CM(HCl dư) = (1/10)/(2/5) = **0,25M**.

### Bài 5 — Muối + muối ra kết tủa (tính m kết tủa)
**Đề:** Cho dung dịch chứa 20,8 g BaCl2 tác dụng với dung dịch Na2SO4 dư. Tính khối lượng kết tủa.
```json
{ "ops": [
    { "op": "species", "formula": "BaCl2", "amount": { "grams": "20,8" }, "state": "solution" },
    { "op": "species", "formula": "Na2SO4", "amount": { "excess": true }, "state": "solution" },
    { "op": "mix" } ],
  "queries": [ { "kind": "mass", "of": "BaSO4" } ] }
```
**Tính tay:** n(BaCl2) = 104/5 ÷ 208 = **1/10**. R42 ⇒ n(BaSO4) = 1/10 ⇒ m = 233/10 = **23,3 g**.

### Bài 6 — Chất hết / chất dư
**Đề:** Cho 5,6 g Fe vào 200 ml dung dịch HCl 1,5M. Chất nào dư, dư bao nhiêu mol? Tính thể tích H2
(đktc) và khối lượng muối tạo thành.
```json
{ "ops": [
    { "op": "species", "formula": "Fe", "amount": { "grams": "5,6" } },
    { "op": "species", "formula": "HCl", "amount": { "solution": { "molarity": "1,5", "liters": "0,2" } } },
    { "op": "mix" } ],
  "molarVolume": 22.4,
  "queries": [ { "kind": "remaining", "of": "HCl" },
               { "kind": "volume_gas", "of": "H2" },
               { "kind": "mass", "of": "FeCl2" } ] }
```
**Tính tay:** n(Fe) = 1/10; n(HCl) = 3/10. R14: Fe + 2HCl → FeCl2 + H2.
Tỉ số: Fe 1/10÷1 = 1/10; HCl 3/10÷2 = 3/20. min = 1/10 ⇒ **Fe hết, HCl dư**, ξ = 1/10.
HCl tiêu thụ 2×1/10 = 1/5 ⇒ **dư 3/10 − 1/5 = 1/10 mol** (= 3,65 g).
n(H2) = 1/10 ⇒ V = 112/50 = **2,24 lít (đktc)**. m(FeCl2) = 1/10 × 127 = **12,7 g**.

### Bài 7 — Nhiệt phân
**Đề:** Nung 50 g CaCO3 đến khối lượng không đổi. Tính khối lượng chất rắn còn lại và thể tích CO2 (đktc).
```json
{ "ops": [
    { "op": "species", "formula": "CaCO3", "amount": { "grams": 50 } },
    { "op": "mix", "heated": true } ],
  "molarVolume": 22.4,
  "queries": [ { "kind": "mass", "of": "CaO" }, { "kind": "volume_gas", "of": "CO2" } ] }
```
**Tính tay:** n = 50/100 = **1/2**. R43 ⇒ n(CaO) = n(CO2) = 1/2.
m(CaO) = 1/2 × 56 = **28 g**; V(CO2) = 1/2 × 112/5 = 56/5 = **11,2 lít (đktc)**.
Kiểm khối lượng: 50 = 28 + 1/2×44 (=22) ✓.

### Bài 8 — C% đầu vào + muối + bazơ ra kết tủa
**Đề:** Cho dung dịch NaOH dư vào 200 g dung dịch CuSO4 8%. Tính khối lượng kết tủa thu được.
```json
{ "ops": [
    { "op": "species", "formula": "CuSO4", "amount": { "solution_percent": { "massGrams": 200, "percent": 8 } } },
    { "op": "species", "formula": "NaOH", "amount": { "excess": true }, "state": "solution" },
    { "op": "mix" } ],
  "queries": [ { "kind": "mass", "of": "Cu(OH)2" } ] }
```
**Tính tay:** m(CuSO4) = 200 × 8/100 = 16 g ⇒ n = 16/160 = **1/10**. R35 ⇒ n(Cu(OH)2) = 1/10.
M(Cu(OH)2) = 64 + 2×17 = 98 ⇒ m = **9,8 g**.

### Bài 9 — Hỏi HIỆN TƯỢNG thuần (định tính, không số)
**Đề:** Nhỏ dung dịch NaOH vào ống nghiệm đựng dung dịch FeCl3. Nêu hiện tượng và viết phương trình.
```json
{ "ops": [
    { "op": "species", "formula": "FeCl3", "state": "solution" },
    { "op": "species", "formula": "NaOH", "state": "solution" },
    { "op": "mix" } ],
  "queries": [ { "kind": "phenomena" }, { "kind": "equation" } ] }
```
**Đáp:** R36 — "xuất hiện **kết tủa nâu đỏ** (Fe(OH)3); màu vàng nâu của dung dịch nhạt dần".
Equation: `FeCl3 + 3NaOH → Fe(OH)3↓ + 3NaCl`. Scene: 2 vessel, event `pour` + `precipitate` màu `#8B4513`.

### Bài 10 — Khử oxit kim loại (điều chế)
**Đề:** Khử hoàn toàn 16 g Fe2O3 bằng khí CO dư ở nhiệt độ cao. Tính khối lượng Fe thu được và thể tích
CO2 sinh ra (đktc).
```json
{ "ops": [
    { "op": "species", "formula": "Fe2O3", "amount": { "grams": 16 } },
    { "op": "species", "formula": "CO", "amount": { "excess": true }, "state": "gas" },
    { "op": "mix", "heated": true } ],
  "molarVolume": 22.4,
  "queries": [ { "kind": "mass", "of": "Fe" }, { "kind": "volume_gas", "of": "CO2" } ] }
```
**Tính tay:** n(Fe2O3) = 16/160 = **1/10**. R49: Fe2O3 + 3CO → 2Fe + 3CO2, ξ = 1/10.
n(Fe) = 2/10 = 1/5 ⇒ m = 56/5 = **11,2 g**. n(CO2) = 3/10 ⇒ V = 3/10 × 112/5 = 336/50 = **6,72 lít (đktc)**.

### Bài 11 (bonus bắt buộc) — test CHỐNG ẢO GIÁC
Lấy plan Bài 1, thêm `"asserts": [{ "kind": "given_mass", "of": "Cu", "grams": 7 }]` (đề bịa "thu được
7 g Cu"). Engine phải trả `ok:false` + violation `given_mass Cu: tính được 6,4 ≠ 7` — **không** trả 6,4
như không có gì, cũng **không** sửa mô hình cho khớp 7.

## 14. Chiến lược test / tiêu chí "xong" v0

- Unit: formula (≥ 12 ca, gồm hydrat, ngoặc lồng, lỗi), balance (≥ 8 ca, gồm từ chối dim≠1),
  reactionDB (**tự cân bằng cả 50 record bằng balancer** + guard dãy hoạt động + guard trao đổi),
  stoich (mol/limiting/CM/C%/bảo toàn), scene (2 ca).
- Contract: 10 bài §13 so `exact`; + bài 11 chống ảo giác; + ca "Cu + HCl" trả noReaction có lý do;
  + ca chất lạ ngoài DB trả lỗi "ngoài phạm vi DB v0".
- Toàn suite: **1072 test cũ + test chem mới đều xanh**; `npx tsc --noEmit` sạch; KHÔNG file cấm nào đổi
  (`git diff --stat` chỉ chứa `api/_lib/kernel/chem/**` + 2 doc).

## 15. Phác thảo v1 (không làm ở v0)

Trộn tuần tự nhiều `mix` (`of`) · bài ngược (cho sản phẩm tìm chất đầu) · CO2/SO2 + kiềm theo tỉ lệ
(2 muối) · hỗn hợp kim loại + hệ phương trình tuyến tính hữu tỉ · nhóm phản ứng HNO3/H2SO4 đặc mở rộng
(sau duyệt) · hydrat trong phản ứng · prompt translator + route `analyze-chem` + render ChemScene.

## 16. ĐIỂM CẦN PHẢN BIỆN HÓA HỌC (tác giả spec KHÔNG chắc — soi kỹ giúp)

1. **R06 hiện tượng**: đồng cháy trong clo — "khói màu vàng nâu" hay "nâu vàng/xanh"? (CuCl2 khan vàng
   nâu, dd lại xanh). Cần chốt câu chữ SGK.
2. **Màu dd CuCl2** (§12): xếp chung Cu²⁺ "xanh lam"; dd CuCl2 đặc thực tế ngả **xanh lục** (phức cloro).
   Đề thi VN thường ghi "xanh"; cần chuyên gia chốt một chữ.
3. **R23 note**: Fe + AgNO3 dư → Fe³⁺. v0 chỉ mô hình ca AgNO3 KHÔNG dư mà record không có cách ép
   điều đó — tạm dựa vào LLM không chọn ca dư. Chuyên gia xem có nên loại hẳn R23 khỏi v0.
4. **R19**: Fe + HNO3 loãng ghi điều kiện "HNO3 dư → Fe(NO3)3 + NO". Nếu Fe dư thực tế còn
   Fe + 2Fe(NO3)3 → 3Fe(NO3)2 — v0 không mô hình. Đủ an toàn chưa, hay loại khỏi v0 cùng R17?
5. **R09 hiện tượng**: Ca + H2O "dung dịch vẩn đục nhẹ" — có sách ghi "dung dịch trong" khi ít Ca.
   Chốt câu chữ.
6. **R30**: sản phẩm aluminat viết `NaAlO2` (SGK cũ) — GDPT 2018 một số sách viết `Na[Al(OH)4]`
   (Al2O3 + 2NaOH + 3H2O → 2Na[Al(OH)4]). Chọn cách viết nào cho khớp SGK hiện hành?
7. **R38** NH4Cl + NaOH: có cần `t°` không, hay nhiệt độ thường đã bay NH3 đủ để ghi hiện tượng?
   (Spec đang để `t°`.)
8. **Nguyên tử khối Hg = 201, Sn = 119, Ni = 59, Cr = 52, Ar = 40**: đúng bảng SGK VN không? (SGK Hóa 8
   in Ar = 39,9 — spec làm tròn 40; các nguyên tố này không dùng trong DB v0 nhưng nằm trong bảng §6.)
9. **Hiện tượng "khói nâu đỏ" R05** (Fe + Cl2): SGK ghi "màu nâu đỏ" — xác nhận.
10. **Danh sách "ứng viên v1"** cuối §8.4 — duyệt từng dòng trước khi cho vào DB v1.
