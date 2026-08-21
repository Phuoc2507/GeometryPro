# Physics Pack v1 — Dòng điện không đổi lớp 11 (GDPT 2018) — Design Spec

**Ngày:** 2026-08-21 (cập nhật 22/08 — áp phán quyết phản biện đợt 2)
**Trạng thái:** ĐÃ PHẢN BIỆN đợt 2 — mọi finding CI-1..CI-4 + 10 phán quyết §15 + 3 phán quyết chung (§17) đã áp vào spec, gồm ĐỔI TÊN query `total_resistance` → `resistance(of?)` xuyên suốt (nguồn: `../reviews/2026-08-21-wave2-specs-review.md`); chờ thi công. Changelog sửa đổi: §18.
**Phạm vi:** Mở rộng physics pack sang chương DÒNG ĐIỆN KHÔNG ĐỔI (Vật lí 11, GDPT 2018 — chương "Dòng điện, mạch điện"). Chỉ CỘNG file mới trong `api/_lib/kernel/physics/` + test. KHÔNG sửa bất kỳ file có sẵn nào (kể cả file v0 động học).
**Quan hệ:** Xây trên nền `2026-08-21-physics-pack-design.md` (v0 — động học 10) và tuân các quy ước ĐÃ DUYỆT ở `2026-08-21-arch-physics-review-phien1.md` (unit per-quantity engine tự đổi — F2/D1; `answers[].unit` engine ghi — C6; mỗi query MỘT số — D5; tag 4 tầng — §9 kiến trúc). Đối chiếu chi tiết ở §14.

---

## 1. Mục tiêu (một câu)

Giải bài mạch điện MỘT nguồn (E, r) với điện trở nối tiếp/song song/hỗn hợp theo đúng nguyên tắc geo3d: **LLM chỉ DỊCH đề → CircuitPlan JSON (chép TOPOLOGY mạch dạng cây + câu hỏi, KHÔNG tính hộ một phép nào); ENGINE tất định thu gọn R_tđ bằng hữu tỉ exact, giải I/U/P từng phần tử, TỰ KIỂM bằng ba định luật bảo toàn (Kirchhoff vòng, Kirchhoff nút, bảo toàn công suất) và XUẤT `circuitLayout` (dữ-liệu-chờ-UI cho schematic 2D tương lai)** — mô hình không khớp đề ⇒ violation, không bịa đáp số.

## 2. Vì sao dựng được gọn (tái dùng gần hết, toán mới ~250 dòng thuần)

| Cần | Đã có sẵn | Dùng lại thế nào |
|---|---|---|
| Số học exact | `api/_lib/kernel/scalar.ts` (`Scalar` = hữu tỉ + một căn) | Mạch DC chỉ cần NỬA HỮU TỈ của trường: mọi phép là +, −, ×, ÷ trên hữu tỉ (radicand luôn 1) — `addExact`/`divExact` KHÔNG BAO GIỜ trả null với input hữu tỉ ⇒ exact 100% (§7.4) |
| Số thập phân đề → hữu tỉ | `scalarFromNumber` (v0 §6.1, `kinematics.ts`) | 1,5 Ω → 3/2; 0,5 Ω → 1/2; 1,2 A → 6/5 — input JSON số thập phân không phá exact |
| Chứng nhận exact ↔ float | `api/_lib/kernel/compute/answer.ts` (`certifyScalar`) | Mỗi đáp đối chiếu bản float tính ĐỘC LẬP (bộ giải song song bằng `number` thường) |
| Nhận dạng số đẹp từ float | `api/_lib/kernel/analysis/recognize.ts` | Fallback khi đề cho số lẻ (vd "R = 0,333 Ω") — hiếm ở chương này |
| Pattern bọc-ngoài | `runAnalysis.ts` / `runPhysics.ts` (v0) | Schema riêng + compute riêng + entry riêng, không đụng run()/core |
| Khung kết quả | `PhysicsResult` (v0 §9) | `CircuitResult` cùng hình dạng {ok, answers(+unit), checks, violations, errors, geometry, meta} + 2 trường riêng (`table`, `circuitLayout`) |

**Nhận xét then chốt:** toàn bộ chương dòng điện không đổi lớp 11 (không mạch cầu, một nguồn) là **đại số HỮU TỈ TUYẾN TÍNH**: R_tđ song song = nghịch đảo tổng nghịch đảo (đóng trong ℚ), I = E/(R_tđ + r), phân bố U/I xuống cây là nhân/chia, bài nghịch tìm R là phương trình Möbius (bậc nhất trên bậc nhất) giải bằng MỘT phép chia. **Không có căn, không cần `solver1d`, không quét lưới** — mọi đáp có công thức đóng hữu tỉ.

## 3. Dạng bài phủ (v1) + tag taxonomy đề xuất

| Dạng bài | Khai báo | Query dùng | Tag đề xuất (`subject/grade/chapter/skill`) |
|---|---|---|---|
| Định luật Ôm toàn mạch I = E/(R_tđ + r) | `source {emf, r}` + cây | `current` | `ly/11/dong-dien/dinh-luat-om-toan-mach` |
| Điện trở tương đương nt/ss/hỗn hợp lồng nhau (≤ ~8 điện trở) | cây `series`/`parallel` | `resistance` (tên mới — ĐÃ PHÁN QUYẾT §15.2) | `ly/11/dong-dien/dien-tro-tuong-duong` |
| U, I, P từng phần tử / từng khối / mạch ngoài | như trên | `voltage`, `current`, `power`, `power_source` | `ly/11/dong-dien/dinh-luat-om-toan-mach` |
| Công suất & điện năng A = UIt (đổi J/kJ/Wh/kWh, t theo s/min/h) | như trên | `energy`, `energy_source` | `ly/11/dong-dien/cong-suat-dien-nang` |
| Hiệu suất nguồn H = U_ngoài/E | `r > 0` | `efficiency` | `ly/11/dong-dien/hieu-suat-nguon` |
| Đèn (U_đm, P_đm) — "đèn sáng bình thường không?" | lá `lamp` | `lamp_check` | `ly/11/dong-dien/den-sang-binh-thuong` |
| Biến trở GIÁ TRỊ CỤ THỂ | lá `resistor` thường (quy ước §6.5) | mọi query | — |
| Bài NGHỊCH: tìm R để I mạch chính đạt giá trị cho trước | lá `unknown_resistor` | `solve_resistance` | `ly/11/dong-dien/bai-toan-nguoc-bien-tro` |

Tag: v1 scene tự gắn `['physics', 'circuit']` như quy ước v0; 5 tag taxonomy trên là **đề xuất seed cho registry** (`api/_lib/kernel/taxonomy/tags.ts` — việc của P0/bridge, spec này KHÔNG sửa file đó). Bridge lọc `isKnownTag` rồi append vào `scene.tags` theo đúng precedent `scaleSymbol` (kiến trúc §9.2).

## 4. Phạm vi & NGOÀI phạm vi (ghi tường minh — thà ít mà đúng)

**TRONG phạm vi v1:**
- Mạch MỘT nguồn (E, r ≥ 0; r = 0 hợp lệ — "điện trở trong không đáng kể", và mô hình luôn cho "mắc vào hiệu điện thế không đổi U" của mạng điện: `{emf: U, r: 0}`).
- Mạch ngoài là CÂY nối tiếp/song song lồng nhau tùy ý, tối đa **8 lá** (điện trở + đèn + ẩn), sâu tối đa **4 tầng nhóm**.
- Đèn dây tóc khai (U_đm, P_đm), R_đèn = U_đm²/P_đm **coi là hằng số** (giả định chuẩn SGK "coi điện trở đèn không đổi" — **ĐÃ PHÁN QUYẾT §15.1: đề không ghi câu đó vẫn dịch theo thông lệ, engine ghi assumption vào trace**).
- Ampe kế/vôn kế **LÝ TƯỞNG** xử lý ở tầng DỊCH, không có op: "số chỉ ampe kế nối tiếp nhánh X" → `current(of: X)`; "số chỉ vôn kế mắc vào hai đầu Y" → `voltage(of: Y)` (quy ước translator §6.5).
- Bài nghịch MỘT ẩn R, ràng buộc là I MẠCH CHÍNH cho trước (nghiệm đóng Möbius §7.5).

**NGOÀI phạm vi v1 (ghi rõ, LLM prompt v2 phải abstain):**
- Mạch CẦU / mạch không quy được về nối tiếp–song song (cần sao–tam giác hoặc thế nút). **CI-2: few-shot P2 BẮT BUỘC có 1 ví dụ mạch cầu → abstain** — topology cây sai do LLM "ép" mạch cầu về nt–ss không có phòng tuyến máy nào bắt được (spec khai trung thực), nên phòng tuyến là few-shot abstain + luật "mọi số đo dư → asserts" (§6.5).
- **Khóa K / đoạn NỐI TẮT / mạch HAI TRẠNG THÁI** ("khi K mở I₁ = …, khi K đóng I₂ = …" — dạng phổ biến của đề VN, CI-1): một plan v1 mô tả đúng MỘT trạng thái mạch tĩnh, không có op khóa/trạng thái ⇒ NGOÀI phạm vi; few-shot P2 phải có 1 ví dụ abstain. (Đề chỉ có MỘT trạng thái đã chốt — "K đóng" xuyên suốt — thì dịch mạch ở trạng thái đó như thường.)
- **Bài NGHỊCH tìm E, r từ HAI lần đo** (hai cặp (I, U) hoặc hai mạch ngoài khác nhau ⇒ hệ 2 phương trình 2 ẩn — dạng phổ biến, CI-1): schema chỉ có một `source {emf, r}` số cho trước, không có ẩn nguồn ⇒ NGOÀI phạm vi; few-shot P2 phải có 1 ví dụ abstain.
- NHIỀU nguồn (ghép nguồn nối tiếp/song song/xung đối), nguồn là máy thu.
- Tụ điện trong mạch (kể cả nhánh tụ hở dòng).
- Ampe kế/vôn kế KHÔNG lý tưởng (R_A ≠ 0, R_V < ∞).
- Tối ưu công suất trên biến trở (P_max khi R_b = r + ..., khảo sát P(R_b)) — v2.
- Ràng buộc nghịch kiểu "điều chỉnh R_b để ĐÈN SÁNG BÌNH THƯỜNG" (ràng buộc I nhánh, không phải I mạch chính) — v2, xem §15.4.
- U giữa hai điểm nằm trên HAI NHÁNH SONG SONG khác nhau (U chéo — bản chất là mạch cầu, cần thế nút).
- Đèn phi tuyến thực tế (R nguội ≠ R nóng), nhiệt lượng Q = I²Rt theo calo, điện phân.

## 5. Kiến trúc & ranh giới

Cộng thêm cạnh các file v0 (đặt phẳng cùng thư mục, tiền tố `circuit`, file toán thuần trung tâm là **`circuit.ts`**):

```
api/_lib/kernel/physics/
  (v0 — KHÔNG SỬA) planSchema.ts  kinematics.ts  compute.ts  scene.ts  runPhysics.ts
  circuitSchema.ts     — CircuitPlanSchema (zod): source, cây circuit, queries, asserts + superRefine
  circuit.ts           — THUẦN (Scalar): thu gọn R_tđ đệ quy; giải phân bố U/I/P; bảng phần tử;
                          Möbius (a,b,c,d) cho bài nghịch; bộ đôi float độc lập (…N) cho certify
  circuitCompute.ts    — từng query → công thức đóng + certifyScalar + recognize + gắn unit
  circuitKirchhoff.ts  — tự kiểm K1/K2/K3 (residual tính từ BẢNG, chiều ngược với bộ giải)
  circuitLayout.ts     — cây → circuitLayout JSON (lưới schematic, dữ-liệu-chờ-UI)
  runCircuit.ts        — entry runCircuit(raw): parse → solve → queries → asserts → checks
                          → layout → CircuitResult
  __tests__/
    circuit.test.ts  circuitCompute.test.ts  circuitKirchhoff.test.ts
    circuitLayout.test.ts  runCircuit.test.ts  circuit-contract.test.ts   (10 bài C1–C10 §11)
```

**Import được phép:** `../scalar`, `../compute/answer` (certifyScalar, cmpScalar), `../analysis/recognize`, `zod`, `import type` từ `src/types/geometry` (type-only, tiền lệ index.ts). Thêm: `./kinematics` CHỈ để lấy `scalarFromNumber` (định nghĩa ở v0 §6.1) — nếu vòng phản biện v0 dời hàm này sang file dùng chung thì circuit theo (§15.10). **KHÔNG cần `../analysis/solver1d`** — không có phương trình bậc hai.

**Ranh giới CỨNG (v1 hoàn toàn additive):**
- KHÔNG sửa: core kernel (`run.ts`, `planSchema.ts` gốc, `index.ts`, `scalar.ts`…), file v0 physics, `package.json`, `vitest.config.ts` (glob `api/_lib/kernel/**/*.test.ts` ĐÃ phủ), `src/**`, taxonomy registry.
- Vì `index.ts` không đổi ⇒ circuit **chưa vào `kernel-dist`** — test import trực tiếp `../runCircuit`. Nối dây (export index.ts, bridge, few-shot translator, route có quota theo F1, UI schematic) là bước tích hợp sau, ngoài phạm vi.
- Entry RIÊNG `runCircuit` tách khỏi `runPhysics` (v0 có thể thi công song song, không giẫm chân); hợp nhất một cửa qua discriminator là quyết định lúc wiring (§15.6).
- Baseline test tại thời điểm thi công (= 1072 cũ + phần v0 để lại): chỉ được CỘNG, không đổi số cũ. Nghi thức kiểm thêm `tsconfig.kernel.json` theo F9.

## 6. CircuitPlanSchema (zod)

### 6.1. Topology — LLM CHÉP cấu trúc, engine tính mọi thứ

Cây đệ quy: nhóm `series`/`parallel` với `items`, lá là phần tử. **Schema KHÔNG có bất kỳ field nào nhận R_tđ, I, U đã tính** — LLM không có chỗ nộp số đã tính hộ (mirror R1 của v0). Đề cho sẵn R_tđ/I/U là DỮ KIỆN DƯ → `asserts`.

```ts
// api/_lib/kernel/physics/circuitSchema.ts
import { z } from 'zod';
const Num = z.number().finite();
const Name = z.string().min(1).regex(/^[A-Za-z0-9_]+$/);   // tên = id: không dấu, không cách

const ResistorLeaf = z.object({
  kind: z.literal('resistor'), name: Name,
  ohms: Num.positive(),
  unit: z.enum(['ohm', 'kohm']).default('ohm'),            // per-quantity (F2): kohm → engine ×1000 exact
});
const LampLeaf = z.object({
  kind: z.literal('lamp'), name: Name,
  ratedVolts: Num.positive(),                              // U_đm (V)
  ratedWatts: Num.positive(),                              // P_đm (W) — engine tự suy R = U_đm²/P_đm
});
const UnknownLeaf = z.object({
  kind: z.literal('unknown_resistor'), name: Name,         // biến trở CẦN TÌM (bài nghịch) — không ohms
});

export type CircuitNode =
  | z.infer<typeof ResistorLeaf> | z.infer<typeof LampLeaf> | z.infer<typeof UnknownLeaf>
  | { kind: 'series';   name?: string; items: CircuitNode[] }
  | { kind: 'parallel'; name?: string; items: CircuitNode[] };

export const CircuitNodeSchema: z.ZodType<CircuitNode> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    ResistorLeaf, LampLeaf, UnknownLeaf,
    z.object({ kind: z.literal('series'),   name: Name.optional(), items: z.array(CircuitNodeSchema).min(2) }),
    z.object({ kind: z.literal('parallel'), name: Name.optional(), items: z.array(CircuitNodeSchema).min(2) }),
  ]));
```

**Ví dụ bắt buộc nắm — mạch "R1 nt (R2 // R3)"** (R1 = 4 Ω, R2 = 6 Ω, R3 = 3 Ω — chính là bài C5 §11):

```json
{
  "kind": "series",
  "items": [
    { "kind": "resistor", "name": "R1", "ohms": 4 },
    { "kind": "parallel", "name": "P23",
      "items": [
        { "kind": "resistor", "name": "R2", "ohms": 6 },
        { "kind": "resistor", "name": "R3", "ohms": 3 }
      ] }
  ]
}
```

LLM chỉ chép "nối tiếp"/"song song" từ đề thành `series`/`parallel`. Engine tự thu gọn: 1/R_P23 = 1/6 + 1/3 = 1/2 ⇒ R_P23 = 2; R_tđ = 4 + 2 = 6 — toàn `divExact`/`addExact` radicand 1, exact tuyệt đối. Nhóm CÓ THỂ đặt `name` ("P23", "MN") để query trỏ vào — đó là cách hỏi "U giữa hai điểm M, N": khối nằm giữa M và N chính là thứ được đặt tên (§8, phân vân §15.3).

### 6.2. Plan đầy đủ

```ts
export const CircuitQuerySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('resistance'), of: Name.optional(), label: z.string().optional() }),
      // ĐỔI TÊN từ 'total_resistance' (ĐÃ PHÁN QUYẾT §15.2): ngữ nghĩa phủ cả lá/khối nên bỏ tiền tố total_.
      // bỏ of = R_tđ MẠCH NGOÀI; of = tên lá/khối = R (tương đương) của phần tử đó (vd R đèn)
  z.object({ kind: z.literal('current'), of: Name.optional(), label: z.string().optional() }),
      // bỏ of = I mạch chính (qua nguồn); of = I qua lá/khối
  z.object({ kind: z.literal('voltage'), of: Name.optional(), label: z.string().optional() }),
      // bỏ of = U mạch ngoài = U hai cực nguồn; of = U hai đầu lá/khối
  z.object({ kind: z.literal('power'), of: Name, label: z.string().optional() }),
      // P tiêu thụ của lá/khối = U·I
  z.object({ kind: z.literal('power_source'),
             part: z.enum(['total', 'internal', 'external']).default('total'),
             label: z.string().optional() }),
      // total = E·I (công suất nguồn) | internal = I²r (hao phí trên r) | external = U_N·I (mạch ngoài)
  z.object({ kind: z.literal('energy'), of: Name.optional(),
             t: Num.positive(), tUnit: z.enum(['s', 'min', 'h']).default('s'),
             unit: z.enum(['J', 'kJ', 'Wh', 'kWh']).default('J'),
             label: z.string().optional() }),
      // A = P·t của lá/khối (bỏ of = mạch ngoài); tUnit/unit: engine đổi exact (§6.4)
  z.object({ kind: z.literal('energy_source'),
             t: Num.positive(), tUnit: z.enum(['s', 'min', 'h']).default('s'),
             unit: z.enum(['J', 'kJ', 'Wh', 'kWh']).default('J'),
             label: z.string().optional() }),
      // Công của nguồn A_ng = E·I·t
  z.object({ kind: z.literal('efficiency'), label: z.string().optional() }),
      // H = U_N/E, trả PHẦN TRĂM (unit '%')
  z.object({ kind: z.literal('lamp_check'), of: Name, label: z.string().optional() }),
      // of PHẢI là lamp: so I thực vs I_đm — answers.approx = tỉ số I/I_đm, kèm verdict (§8)
  z.object({ kind: z.literal('solve_resistance'), of: Name,
             targetCurrent: Num.positive(),
             targetCurrentUnit: z.enum(['A', 'mA']).default('A'),
             label: z.string().optional() }),
      // of PHẢI là unknown_resistor; tìm R để I MẠCH CHÍNH = targetCurrent (§7.5)
]);

export const CircuitPlanSchema = z.object({
  problemName: z.string().min(1),
  source: z.object({
    emf: Num.positive(),            // E (V) — "mắc vào U không đổi" ⇒ emf = U, r = 0
    r: Num.min(0).default(0),       // điện trở trong (Ω)
  }),
  circuit: CircuitNodeSchema,       // mạch ngoài; MỘT lá đơn cũng hợp lệ (bếp điện, một đèn)
  queries: z.array(CircuitQuerySchema).min(1),
  asserts: z.array(z.object({       // DỮ KIỆN DƯ của đề — không phải chỗ nộp đáp (như v0 §7.2)
    query: CircuitQuerySchema, equals: Num, tol: Num.positive().optional(),
  })).default([]),
});
export type CircuitPlan = z.infer<typeof CircuitPlanSchema>;
```

### 6.3. Ràng buộc superRefine (fail parse = lỗi dịch nhìn thấy được)

1. Tên duy nhất trên toàn cây (lá + nhóm có tên); mọi `of` trong queries/asserts phải trỏ tới tên tồn tại.
2. Số LÁ ≤ 8; độ sâu nhóm ≤ 4 (đủ mọi đề SGK/đề thi chương này).
3. `unknown_resistor`: tối đa MỘT trên toàn cây; có ẩn ⇔ có đúng một query `solve_resistance` trỏ vào nó; các query khác vẫn hợp lệ (chạy SAU khi thế nghiệm §7.5). Không ẩn mà có `solve_resistance` (hoặc ngược lại) ⇒ lỗi parse.
4. `lamp_check.of` phải trỏ tới lá `lamp`.
5. Tên KHÔNG được là từ khóa hiển thị nội bộ (`_ngoai`, `_nguon`) — engine dùng làm id hàng bảng §7.3.

### 6.4. Đơn vị — per-quantity, ENGINE tự đổi (quy ước F2/D1 đã duyệt)

Chuẩn nội bộ = SI (Ω, V, A, W, s, J). Field unit CHỈ mở ở những chỗ đề VN thực sự có biến thể; mọi hệ số đổi là hữu tỉ exact:

| Field | Giá trị | Hệ số đổi (exact) |
|---|---|---|
| lá `resistor.unit` | `ohm` \| `kohm` | ×1 \| ×1000 |
| `energy.tUnit` / `energy_source.tUnit` | `s` \| `min` \| `h` | ×1 \| ×60 \| ×3600 |
| `energy.unit` (ĐẦU RA) | `J` \| `kJ` \| `Wh` \| `kWh` | ÷1 \| ÷1000 \| ÷3600 \| ÷3 600 000 |
| `solve_resistance.targetCurrentUnit` | `A` \| `mA` | ×1 \| ×1/1000 |

`emf` luôn V, `r` luôn Ω, `ratedVolts/ratedWatts` luôn V/W (đề lớp 11 không có biến thể — YAGNI, mở thêm khi gặp đề thật, §15.9). `answers[].unit` do ENGINE ghi theo kind (C6): `resistance`/`solve_resistance` → `'Ω'`; `current` → `'A'`; `voltage` → `'V'`; `power*` → `'W'`; `energy*` → đúng `unit` khai; `efficiency` → `'%'`; `lamp_check` → `''` (tỉ số).

### 6.5. Quy ước cho translator (ghi sẵn cho few-shot v2)

- Mọi số CHÉP THẲNG từ đề (kể cả thập phân "0,5" → `0.5`); phép đổi đơn vị là việc engine qua field unit — LLM KHÔNG chia/nhân gì.
- "Biến trở có giá trị R_b = 6 Ω" / "biến trở đang đặt ở 6 Ω" → lá `resistor` thường tên `Rb`. "Tìm giá trị biến trở để I = …" → `unknown_resistor` + `solve_resistance`.
- "Hai đèn cùng loại 6 V – 3 W mắc song song" → HAI lá `lamp` tên khác nhau (`den1`, `den2`) — tên là id duy nhất. Đề KHÔNG ghi "coi điện trở đèn không đổi" vẫn dịch theo thông lệ SGK; engine ghi assumption "R đèn coi như không đổi" vào trace/checks (ĐÃ PHÁN QUYẾT §15.1).
- Ampe kế/vôn kế lý tưởng: không có op — dịch câu hỏi số chỉ thành `current`/`voltage` của nhánh/phần tử tương ứng.
- "Mắc vào hiệu điện thế không đổi U = 220 V" (mạng điện, không nói nguồn) → `source {emf: 220, r: 0}`.
- **MỌI số đo/dữ kiện DƯ → `asserts`, KHÔNG ĐƯỢC BỎ (CI-2 — nâng thành luật cứng):** số chỉ ampe kế/vôn kế, "biết cường độ mạch chính là 2 A", công suất đo được… khi E, r, cây đã đủ — tất cả thành asserts. Đây là phòng tuyến MÁY duy nhất bắt topology cây dịch sai (đặc biệt LLM "ép" mạch cầu về nt–ss): mô hình sai + số đo dư ⇒ assert lệch ⇒ violation, ok:false.
- **"U giữa hai điểm M, N" (ĐÃ PHÁN QUYẾT §15.3):** đặt tên khối giữa M–N rồi hỏi `voltage(of)` (như C7). **LUẬT: M, N KHÔNG phải hai mút của MỘT khối trong cây (U chéo nhánh — bản chất mạch cầu) ⇒ ABSTAIN tường minh**, không cố ép; prompt P2 ghi luật này cạnh few-shot C7.
- Đề thuộc danh sách NGOÀI phạm vi §4 → abstain (cổng như radar geometry), không cố ép về cây. **Few-shot abstain P2 tối thiểu phải có ví dụ cho: mạch cầu (CI-2), khóa K/nối tắt/2 trạng thái (CI-1), tìm E–r từ 2 lần đo (CI-1), U chéo nhánh (§15.3).**

## 7. Tầng giải mạch exact (circuit.ts — THUẦN, không zod, không I/O)

### 7.1. Chuẩn hóa lá → R (Scalar)

| Lá | R |
|---|---|
| `resistor` | `scalarFromNumber(ohms)` × (1000 nếu kohm) |
| `lamp` | R_đèn = U_đm²/P_đm (mul/div exact) + ghi kèm I_đm = P_đm/U_đm cho `lamp_check` |
| `unknown_resistor` | không có R — chỉ hợp lệ trên đường Möbius §7.5 |

### 7.2. Thu gọn R_tđ (đệ quy, exact)

```
R(lá)        = §7.1
R(series)    = Σ R(items)                       // addExact — radicand 1, không bao giờ null
R(parallel)  = 1 / Σ (1/R(items))               // divExact + addExact — đóng trong ℚ
```

Mỗi hàm có CẶP FLOAT độc lập (`reduceN`, số học `number` thường) — đường đối chiếu cho `certifyScalar`, mirror `evalQuadN` của v0.

### 7.3. Giải phân bố U/I/P — bảng phần tử

```
I_chinh = E / (R_tđ + r)          U_N = I_chinh · R_tđ          (= E − I·r, kiểm ở K1)

distribute(node, biết I hoặc U):
  lá:              biết I → U = I·R;  biết U → I = U/R
  series (biết I): mọi item nhận CÙNG I, đệ quy   |  (biết U): I = U/R(node) rồi như trên
  parallel (biết U): mọi item nhận CÙNG U, đệ quy |  (biết I): U = I·R(node) rồi như trên
Gốc: distribute(root, I = I_chinh)
```

Kết quả là **BẢNG**: mỗi lá + mỗi khối có tên + hàng `_ngoai` (mạch ngoài) → `{R, I, U, P = U·I}` (Scalar). Mọi query §8 chỉ ĐỌC bảng. Bảng cũng xuất ra `CircuitResult.table` (dạng answer-hóa: text/approx/unit) — nguyên liệu cho panel lời giải "bảng như SGK" sau này.

### 7.4. Đường exact — cam kết 100% trừ khi đề cho số lẻ

Mọi phép ở §7.1–7.3 là +, −, ×, ÷ trên hữu tỉ: trường ℚ ĐÓNG, `Exact.radicand` luôn 1, không phép nào rời trường (khác động học có căn từ solveQuadratic). ⇒ input thập phân hữu hạn (≤ 9 chữ số lẻ, qua `scalarFromNumber`) cho **đáp exact tuyệt đối, `approximate:false` toàn bộ**. Đề cho số lẻ thật (vd "R = 1/3 Ω viết 0,3333333333") → rơi float trung thực + `recognizeConstant` thử dựng lại + certify — đúng 3 tầng mkAnswer v0 §6.3. Trần an toàn: bigint không tràn (không có MAX_SAFE_RADICAND vì radicand = 1); mẫu số lớn dần qua nhiều phép song song vẫn là bigint chính xác.

### 7.5. Bài nghịch — thu gọn Möbius, nghiệm đóng MỘT phép chia

Với đúng MỘT lá ẩn x, R_tđ của mọi node là hàm Möbius của x: **R(x) = (a·x + b)/(c·x + d)**, a,b,c,d hữu tỉ (Scalar). Quy nạp cấu trúc — ở mỗi nhóm, TỐI ĐA MỘT con chứa x (các con còn lại thu gọn thành hằng C bằng §7.2):

```
lá thường R:      (0, R, 0, 1)
lá ẩn:            (1, 0, 0, 1)
series  (M + C):  (a + c·C,  b + d·C,  c,        d      )
parallel(M ∥ C):  (C·a,      C·b,      a + C·c,  b + C·d)
```

Giải: R_cần = E/I_target − r (đòi > 0, ngược lại error "I yêu cầu lớn hơn mức nguồn cấp nổi"); rồi
**x = (d·R_cần − b)/(a − c·R_cần)**. Suy biến a − c·R_cần = 0 ⇒ error (R_tđ không đạt được giá trị đó). Nghiệm x ≤ 0 ⇒ error "giá trị điện trở không dương — mô hình không khớp đề". **Thay ngược bắt buộc:** thế x vào cây, chạy TRỌN §7.2–7.3 + toàn bộ K1–K3 §9 — mọi query khác của plan tính trên mạch đã thế. Đây là tự kiểm thay-đáp-ngược đúng nghĩa: residual exact 0.

(Kiểm tay đại diện: series(5, x), R_cần = 9 ⇒ mob = (1,5,0,1) ⇒ x = 4 ✓; x ∥ 6, R_cần = 2 ⇒ mob = (6,0,1,6) ⇒ x = (6·2 − 0)/(6 − 2) = 3, và 3∥6 = 2 ✓.)

## 8. Queries — công thức đóng + unit engine ghi

Ký hiệu: hàng bảng của `of` = {R, I, U, P}; bỏ `of` = hàng `_ngoai` (I hàng này = I_chinh).

| Query | Công thức | Unit | Ghi chú |
|---|---|---|---|
| `resistance(of?)` | R của hàng | Ω | tên mới (§15.2); bỏ of = R_tđ mạch ngoài; of=đèn → R suy từ định mức |
| `current(of?)` | I của hàng | A | bỏ of = I mạch chính |
| `voltage(of?)` | U của hàng | V | bỏ of = U_N (= U hai cực nguồn) |
| `power(of)` | P = U·I của hàng | W | |
| `power_source(part)` | total: E·I · internal: I²·r · external: U_N·I | W | |
| `energy(of?, t)` | P(hàng) · t_giây, đổi ra `unit` | theo `unit` | t_giây = t × {1,60,3600} exact |
| `energy_source(t)` | E·I · t_giây, đổi ra `unit` | theo `unit` | công của nguồn |
| `efficiency` | H% = (U_N/E)·100 | % | exact hữu tỉ; đối chiếu nội bộ với R_tđ/(R_tđ+r)·100 (§9-K4) |
| `lamp_check(of)` | ratio = I(đèn)/I_đm | '' (tỉ số) | verdict §8.1 |
| `solve_resistance(of, I_target)` | §7.5 | Ω | các query khác chạy trên mạch đã thế nghiệm |

Mỗi query đúng MỘT SỐ (quy ước D5). Dựng đáp 3 tầng y v0 §6.3: certifyScalar(scalar, floatĐộcLập) → exact sống thì `displayScalar` ("3/2", "63/4"), chết thì recognize, trượt thì `toFixed(4)` + `approximate:true`. `answers[]` theo thứ tự queries, mỗi phần tử `{label?, kind, text, approx, unit, approximate, verdict?}`.

### 8.1. `lamp_check` — phán quyết tất định từ MỘT số

`ratio = I_thực/I_đm` (exact khi có). Phán quyết bằng `cmpScalar` (exact khi cả hai exact; float dùng ngưỡng tương đối **EPS_SELF = 1e-6 — dùng chung hằng của v0, KHÔNG đặt hằng riêng EPS_LAMP (CI-4)**):

| So sánh | `verdict` | text mẫu |
|---|---|---|
| ratio = 1 | `sang_binh_thuong` | "1" |
| ratio < 1 | `sang_yeu` | "3/4" |
| ratio > 1 | `sang_manh` | "6/5" |

`verdict` là field CÓ CẤU TRÚC cho máy (bridge/UI dịch thành câu "đèn sáng bình thường / sáng yếu hơn / sáng mạnh hơn bình thường (nguy cơ cháy)"); `approx` vẫn là một số (tỉ số) — không phá quy ước D5. Đề số đẹp SGK cho ratio hữu tỉ exact ⇒ so sánh tuyệt đối, không có vùng xám.

## 9. Tự kiểm tất định (circuitKirchhoff.ts) — residual ≠ 0 ⇒ violation

Residual tính **TỪ BẢNG §7.3, chiều NGƯỢC với bộ giải** (bộ giải phân bổ top-down từng nhánh độc lập; check gộp bottom-up) — cùng triết lý thay-ngược v0 §7.1, bắt được bug phân bố/thu gọn:

| # | Định luật | Residual (Scalar, exact khi có) | Ghi vào |
|---|---|---|---|
| K1 | Kirchhoff VÒNG | (a) U(`_ngoai`) − (E − I_chinh·r); (b) với MỖI khối series: Σ U(item) − U(khối) | `checks[]` từng dòng |
| K2 | Kirchhoff NÚT | với MỖI khối parallel: Σ I(item) − I(khối); và U(item) − U(khối) từng nhánh | `checks[]` |
| K3 | Bảo toàn CÔNG SUẤT | Σ P(mọi LÁ) + I_chinh²·r − E·I_chinh | `checks[]` một dòng |
| K4 | Hiệu suất 2 đường | (U_N/E) − R_tđ/(R_tđ + r) — chỉ khi có query `efficiency` | `checks[]` |

- Ngưỡng: exact hai vế ⇒ đòi residual **exact 0** (`num === 0n`); có vế float ⇒ `|residual| ≤ EPS_SELF·scale` với **EPS_SELF = 1e-6 tương đối** (kế thừa nguyên lý do chọn của v0 §7.3: nghiệm đóng lệch ~1e-15, công thức sai lệch O(1)).
- Check FAIL ⇒ push `violations` + `ok:false`, KHÔNG serve đáp (K1–K3 đúng theo đại số — fail chỉ có thể là bug engine hoặc số tràn; thà không trả còn hơn trả sai).
- **Asserts khai báo** (dữ kiện dư của đề): chạy `assert.query` như query thường, so `|got − equals| ≤ tol·max(1,|equals|)`, tol mặc định **TOL_ASSERT = 1e-3** (dung nạp đề làm tròn, vẫn bắt dịch sai — y v0 §7.2/§7.3). Fail ⇒ `violations` "mô hình không khớp đề".
- Minh bạch ngữ nghĩa: K1–K4 kiểm "engine tự nhất quán"; KHỚP ĐỀ là việc của asserts + validation nghiệm (§7.5) — ghi rõ trong doc code để không ngộ nhận residual-0 nghĩa là dịch đúng.
- `solve_resistance`: sau khi thế nghiệm, TOÀN BỘ K1–K3 chạy lại trên mạch đã thế + check riêng `|I_chinh − I_target|` (exact 0) — chính là thay-đáp-ngược.

## 10. CircuitResult, GeometryData rỗng, circuitLayout

### 10.1. CircuitResult

```ts
type CircuitAns = { label?: string; kind: string; text: string; approx: number;
                    unit: string; approximate: boolean; verdict?: 'sang_binh_thuong'|'sang_yeu'|'sang_manh' };
type CircuitResult = {
  ok: boolean;                          // violations = 0 && errors = 0 && mọi đáp hữu hạn
  answers: CircuitAns[];                // THEO THỨ TỰ queries
  checks:  { kind: string; detail: string; residual: number; pass: boolean }[];   // K1–K4 + thay-ngược solve
  violations: { assert: string; expected: number; got: number; delta: number }[],
  errors: { message: string }[],
  geometry: GeometryData | null;        // §10.2 — RỖNG hợp lệ (v1 không vẽ 3D)
  table: { name: string; kind: 'resistor'|'lamp'|'group_series'|'group_parallel'|'external';
           R: Omit<CircuitAns,'verdict'>; U: ...; I: ...; P: ... }[];   // bảng §7.3 answer-hóa
  circuitLayout: CircuitLayout;         // §10.3 — dữ-liệu-chờ-UI
  meta: { iMain: { text: string; approx: number }; uExternal: { text: string; approx: number };
          rTotal: { text: string; approx: number }; unitsNote: 'SI' };
};
```

### 10.2. GeometryData RỖNG hình học hợp lệ — v1 KHÔNG vẽ mạch 3D

Mạch điện không phải hình 3D — v1 chủ động KHÔNG dựng cảnh (không agent, không timeline). Trả:

```ts
geometry = { name: plan.problemName, points: [], lines: [], tags: ['physics', 'circuit'] }
```

- Hợp lệ theo `GeometryData` (src/types/geometry.ts:351 — `name/points/lines` bắt buộc, mảng RỖNG hợp lệ; mọi trường khác optional).
- Frontend ĐÃ chịu được points rỗng: `GeometryCanvas.tsx:277-280` centroid mặc định `[0, 1.5, 0]`, `:309` gridSize mặc định 10 ⇒ canvas hiện lưới trống, KHÔNG crash. Panel đáp số đọc `answers[]` từ kết quả solve (đường dữ liệu của bridge, không đọc từ geometry) ⇒ người dùng thấy đáp + bảng mà cảnh 3D trống — hành vi CHỦ ĐÍCH của v1, banner "sơ đồ mạch 2D sẽ có sau" là việc UI lúc wiring.
- `tags` giữ chỗ cho bridge append taxonomy (§3). Điều kiện nghiệm thu lúc wiring (KHÔNG phải v1): xác nhận trên canvas thật rằng geometry rỗng render sạch; nếu lộ quirk khác thì fallback đã định sẵn: một điểm mồi `O(0,0,0)` label rỗng.

### 10.3. circuitLayout — dữ liệu schematic 2D (TRUNG THỰC: chưa có UI tiêu thụ)

Đây là **dữ-liệu-chờ-UI**: format DRAFT cho render 2D schematic tương lai (SVG overlay kiểu ChemScene C9), CHƯA có component nào đọc nó — ghi thẳng điều này vào doc code + spec để không ai ngộ nhận v1 "đã vẽ được mạch". Được phép đổi format khi làm UI thật (nó KHÔNG persist — nằm ngoài GeometryData, cùng số phận `charts` v0 theo phán quyết D6: mất khi lưu lịch sử, ghi rõ).

Layout tất định từ cây (không random, test được):

- Kích thước đệ quy: lá `{w:1, h:1}`; series `{w: Σw_i, h: max h_i}`; parallel `{w: max w_i, h: Σh_i}`.
- Đặt chỗ: series trải NGANG trái→phải (item căn giữa theo h khối); parallel xếp DỌC trên→dưới, hai thanh nối dọc ở hai mép làm nút chung.
- Mạch ngoài nằm hàng trên, nguồn ở cạnh đáy, dây khép vòng chữ nhật (quy ước sơ đồ SGK VN).

```jsonc
{
  "grid": { "cols": 4, "rows": 3 },
  "elements": [
    { "id": "src", "type": "source",   "name": "nguon", "valueText": "E = 12 V; r = 1 Ω", "cell": { "x": 1, "y": 2, "w": 1, "h": 1 } },
    { "id": "R1",  "type": "resistor", "name": "R1",    "valueText": "4 Ω",  "cell": { "x": 0, "y": 0, "w": 1, "h": 1 } },
    { "id": "R2",  "type": "resistor", "name": "R2",    "valueText": "6 Ω",  "cell": { "x": 1, "y": 0, "w": 1, "h": 1 } },
    { "id": "R3",  "type": "resistor", "name": "R3",    "valueText": "3 Ω",  "cell": { "x": 1, "y": 1, "w": 1, "h": 1 } }
    // type còn có: "lamp" (⊗), "unknown_resistor" (Rx?)
  ],
  "junctions": [ { "id": "j0", "at": [1, 0] }, { "id": "j1", "at": [2, 0] } ],   // nút chia dòng (2 mép mỗi parallel)
  "wires": [ { "from": [0, 0], "to": [1, 0] } /* … các đoạn nối trên lưới … */ ]
}
```

Test v1 KHÔNG khóa từng tọa độ đẹp/xấu — chỉ khóa **bất biến**: (1) mỗi phần tử của cây xuất hiện đúng MỘT lần; (2) không hai `cell` nào đè nhau; (3) đồ thị `wires + elements` LIÊN THÔNG từ cực này sang cực kia của nguồn và mỗi nhánh parallel chạm đủ hai junction mép. Thẩm mỹ là việc của UI sau.

## 11. MƯỜI BÀI CONTRACT — tính tay từng bước (circuit-contract.test.ts)

Mỗi bài: đề kiểu SGK/đề thi VN (số tự đặt chuẩn dạng), plan kỳ vọng, giải TAY từng bước, tự kiểm Kirchhoff bằng số, đáp chốt cho test. Đánh số C1–C10, tách khỏi P1–P10 (động học) và L01–L12 (golden).

---

### C1 — Nối tiếp thuần, nguồn lý tưởng (r = 0)

**Đề:** "Cho mạch điện gồm nguồn có suất điện động E = 12 V, điện trở trong không đáng kể; mạch ngoài gồm R1 = 4 Ω nối tiếp R2 = 8 Ω. a) Tính điện trở tương đương của mạch ngoài. b) Tính cường độ dòng điện trong mạch. c) Tính hiệu điện thế giữa hai đầu R2."

```json
{ "problemName": "noi-tiep-hai-dien-tro",
  "source": { "emf": 12 },
  "circuit": { "kind": "series", "items": [
      { "kind": "resistor", "name": "R1", "ohms": 4 },
      { "kind": "resistor", "name": "R2", "ohms": 8 } ] },
  "queries": [ { "kind": "resistance", "label": "a" },
               { "kind": "current", "label": "b" },
               { "kind": "voltage", "of": "R2", "label": "c" } ] }
```

**Tính tay:** R_tđ = 4 + 8 = **12 Ω**. I = 12/(12 + 0) = **1 A**. U2 = I·R2 = **8 V**.
**Tự kiểm:** K1: U1 + U2 = 4 + 8 = 12 = E − I·0 ✓ (residual exact 0). K3: P1 + P2 = 4 + 8 = 12 = E·I = 12 ✓.
**Kỳ vọng:** "12" Ω; "1" A; "8" V — exact, `approximate:false` cả ba.

---

### C2 — Nối tiếp thuần, r ≠ 0 + công suất + hao phí + công của nguồn (kJ)

**Đề:** "Nguồn điện có suất điện động 6 V, điện trở trong 0,5 Ω, mạch ngoài gồm R1 = 1,5 Ω nối tiếp R2 = 4 Ω. a) Tính cường độ dòng điện trong mạch. b) Hiệu điện thế hai đầu R2. c) Công suất tỏa nhiệt trên R1. d) Công suất hao phí trong nguồn. e) Tính công của nguồn điện sản ra trong 10 phút theo đơn vị kJ."

```json
{ "problemName": "noi-tiep-co-r",
  "source": { "emf": 6, "r": 0.5 },
  "circuit": { "kind": "series", "items": [
      { "kind": "resistor", "name": "R1", "ohms": 1.5 },
      { "kind": "resistor", "name": "R2", "ohms": 4 } ] },
  "queries": [ { "kind": "current", "label": "a" },
               { "kind": "voltage", "of": "R2", "label": "b" },
               { "kind": "power", "of": "R1", "label": "c" },
               { "kind": "power_source", "part": "internal", "label": "d" },
               { "kind": "energy_source", "t": 10, "tUnit": "min", "unit": "kJ", "label": "e" } ] }
```

**Tính tay:** 0,5 → 1/2; 1,5 → 3/2 (scalarFromNumber). R_ngoài = 3/2 + 4 = 11/2. a) I = 6/(11/2 + 1/2) = 6/6 = **1 A**. b) U2 = 1·4 = **4 V**. c) P1 = I²·R1 = **3/2 W = 1,5 W**. d) P_hp = I²·r = **1/2 W = 0,5 W**. e) A_ng = E·I·t = 6·1·600 = 3600 J = **18/5 kJ = 3,6 kJ** (tUnit min ×60; unit kJ ÷1000 — đều exact).
**Tự kiểm:** K1: U1 + U2 = 3/2 + 4 = 11/2 = E − I·r = 6 − 1/2 ✓. K3: 3/2 + 4 + 1/2 = 6 = E·I ✓.
**Kỳ vọng:** "1" A; "4" V; "3/2" W; "1/2" W; "18/5" kJ — exact cả năm.

---

### C3 — Song song thuần 2 nhánh (r = 0)

**Đề:** "Hai điện trở R1 = 6 Ω và R2 = 3 Ω mắc song song vào nguồn E = 6 V có điện trở trong không đáng kể. a) Tính điện trở tương đương mạch ngoài. b) Cường độ dòng điện mạch chính. c) Cường độ dòng điện qua R1."

```json
{ "problemName": "song-song-hai-nhanh",
  "source": { "emf": 6 },
  "circuit": { "kind": "parallel", "items": [
      { "kind": "resistor", "name": "R1", "ohms": 6 },
      { "kind": "resistor", "name": "R2", "ohms": 3 } ] },
  "queries": [ { "kind": "resistance", "label": "a" },
               { "kind": "current", "label": "b" },
               { "kind": "current", "of": "R1", "label": "c" } ] }
```

**Tính tay:** 1/R = 1/6 + 1/3 = 1/2 ⇒ R_tđ = **2 Ω**. I = 6/2 = **3 A**. U mọi nhánh = 6 V ⇒ I1 = 6/6 = **1 A**.
**Tự kiểm:** K2 nút: I1 + I2 = 1 + 2 = 3 = I ✓. K3: 6·1 + 6·2 = 18 = E·I = 18 ✓.
**Kỳ vọng:** "2" Ω; "3" A; "1" A.

---

### C4 — Song song thuần 3 nhánh, r ≠ 0 + công suất nguồn

**Đề:** "Cho nguồn E = 9 V, r = 1 Ω; mạch ngoài gồm ba điện trở R1 = 6 Ω, R2 = 12 Ω, R3 = 4 Ω mắc song song. a) Tính R_tđ mạch ngoài. b) Cường độ dòng điện mạch chính. c) Cường độ dòng điện qua R3. d) Công suất của nguồn."

```json
{ "problemName": "song-song-ba-nhanh-co-r",
  "source": { "emf": 9, "r": 1 },
  "circuit": { "kind": "parallel", "items": [
      { "kind": "resistor", "name": "R1", "ohms": 6 },
      { "kind": "resistor", "name": "R2", "ohms": 12 },
      { "kind": "resistor", "name": "R3", "ohms": 4 } ] },
  "queries": [ { "kind": "resistance", "label": "a" },
               { "kind": "current", "label": "b" },
               { "kind": "current", "of": "R3", "label": "c" },
               { "kind": "power_source", "part": "total", "label": "d" } ] }
```

**Tính tay:** 1/R = 1/6 + 1/12 + 1/4 = 2/12 + 1/12 + 3/12 = 6/12 = 1/2 ⇒ R_tđ = **2 Ω**. I = 9/(2+1) = **3 A**. U_N = I·R_tđ = 6 V (= E − I·r = 9 − 3 ✓). I3 = 6/4 = **3/2 A = 1,5 A**. P_ng = E·I = **27 W**.
**Tự kiểm:** K2: I1 + I2 + I3 = 1 + 1/2 + 3/2 = 3 ✓. K3: 6·1 + 6·1/2 + 6·3/2 + 3²·1 = 6 + 3 + 9 + 9 = 27 = E·I ✓.
**Kỳ vọng:** "2" Ω; "3" A; "3/2" A; "27" W.

---

### C5 — Hỗn hợp R1 nt (R2 // R3) — bài của ví dụ JSON §6.1

**Đề:** "Cho nguồn E = 12 V điện trở trong không đáng kể; mạch ngoài gồm R1 = 4 Ω nối tiếp với đoạn mạch gồm R2 = 6 Ω song song R3 = 3 Ω. a) Tính điện trở tương đương mạch ngoài. b) Cường độ dòng điện qua R1. c) Cường độ dòng điện qua R2."

```json
{ "problemName": "hon-hop-r1-nt-r2-ss-r3",
  "source": { "emf": 12 },
  "circuit": { "kind": "series", "items": [
      { "kind": "resistor", "name": "R1", "ohms": 4 },
      { "kind": "parallel", "name": "P23", "items": [
          { "kind": "resistor", "name": "R2", "ohms": 6 },
          { "kind": "resistor", "name": "R3", "ohms": 3 } ] } ] },
  "queries": [ { "kind": "resistance", "label": "a" },
               { "kind": "current", "of": "R1", "label": "b" },
               { "kind": "current", "of": "R2", "label": "c" } ] }
```

**Tính tay:** R_P23 = 1/(1/6 + 1/3) = 2; R_tđ = 4 + 2 = **6 Ω**. I = 12/6 = 2 A = I qua R1 (nối tiếp) ⇒ **2 A**. U_P23 = 2·2 = 4 V ⇒ I2 = 4/6 = **2/3 A ≈ 0,6667**.
**Tự kiểm:** K2 nút P23: I2 + I3 = 2/3 + 4/3 = 2 = I ✓ (exact 0). K1: U1 + U_P23 = 8 + 4 = 12 = E ✓. K3: 16 + 8/3 + 16/3 = 24 = E·I = 24 ✓.
**Kỳ vọng:** "6" Ω; "2" A; "2/3" A approx ≈ 0.6667, `approximate:false` (hữu tỉ exact — khóa hành vi displayExact phân số).

---

### C6 — Hỗn hợp LỒNG 3 TẦNG, r ≠ 0 + HIỆU SUẤT nguồn

**Đề:** "Cho nguồn E = 10 V, r = 1 Ω. Mạch ngoài gồm R1 = 2 Ω nối tiếp với cụm gồm R2 = 3 Ω song song với nhánh (R3 = 2 Ω nối tiếp R4 = 4 Ω). a) Tính R_tđ mạch ngoài. b) Cường độ dòng điện mạch chính. c) Cường độ dòng điện qua R4. d) Hiệu suất của nguồn."

```json
{ "problemName": "hon-hop-long-ba-tang-hieu-suat",
  "source": { "emf": 10, "r": 1 },
  "circuit": { "kind": "series", "items": [
      { "kind": "resistor", "name": "R1", "ohms": 2 },
      { "kind": "parallel", "name": "cum", "items": [
          { "kind": "resistor", "name": "R2", "ohms": 3 },
          { "kind": "series", "name": "nhanh34", "items": [
              { "kind": "resistor", "name": "R3", "ohms": 2 },
              { "kind": "resistor", "name": "R4", "ohms": 4 } ] } ] } ] },
  "queries": [ { "kind": "resistance", "label": "a" },
               { "kind": "current", "label": "b" },
               { "kind": "current", "of": "R4", "label": "c" },
               { "kind": "efficiency", "label": "d" } ] }
```

**Tính tay:** R_nhanh34 = 2 + 4 = 6; R_cum = 1/(1/3 + 1/6) = 2; R_tđ = 2 + 2 = **4 Ω**. I = 10/(4+1) = **2 A**. U_cum = 2·2 = 4 V ⇒ I_nhanh34 = 4/6 = 2/3 = I qua R4 (nối tiếp trong nhánh) ⇒ **2/3 A**. U_N = E − I·r = 10 − 2 = 8 V ⇒ H = 8/10·100 = **80 %**.
**Tự kiểm:** K2 nút cụm: I2 + I34 = 4/3 + 2/3 = 2 ✓. K1: U1 + U_cum = 4 + 4 = 8 = E − I·r ✓; series nhanh34: U3 + U4 = 4/3 + 8/3 = 4 = U_cum ✓. K3: P1 + P2 + P3 + P4 + P_r = 8 + 16/3 + 8/9 + 16/9 + 4 = 8 + 48/9 + 24/9 + 4 = 8 + 8 + 4 = 20 = E·I = 20 ✓. K4: U_N/E = 4/5 = R_tđ/(R_tđ+r) = 4/5 ✓.
**Kỳ vọng:** "4" Ω; "2" A; "2/3" A; "80" % — exact cả bốn.

---

### C7 — Hỗn hợp + U GIỮA HAI ĐIỂM giữa mạch (khối có tên MN)

**Đề:** "Cho nguồn E = 12 V, r = 1 Ω. Mạch ngoài: từ A qua R1 = 3 Ω đến điểm M; giữa M và N có R2 = 4 Ω mắc song song R3 = 12 Ω; từ N qua R4 = 1 Ω về B. a) Tính hiệu điện thế U_MN. b) Cường độ dòng điện qua R3. c) Công suất tiêu thụ của mạch ngoài."

```json
{ "problemName": "hon-hop-u-giua-hai-diem",
  "source": { "emf": 12, "r": 1 },
  "circuit": { "kind": "series", "items": [
      { "kind": "resistor", "name": "R1", "ohms": 3 },
      { "kind": "parallel", "name": "MN", "items": [
          { "kind": "resistor", "name": "R2", "ohms": 4 },
          { "kind": "resistor", "name": "R3", "ohms": 12 } ] },
      { "kind": "resistor", "name": "R4", "ohms": 1 } ] },
  "queries": [ { "kind": "voltage", "of": "MN", "label": "a" },
               { "kind": "current", "of": "R3", "label": "b" },
               { "kind": "power_source", "part": "external", "label": "c" } ] }
```

**Cách dịch "U giữa M và N":** M, N là hai mút của khối song song ⇒ LLM đặt tên khối là `MN`, hỏi `voltage(of:"MN")` — thuần chép cấu trúc, không tính (giới hạn: M, N phải là mút của một khối trong cây — U chéo nhánh là mạch cầu, NGOÀI phạm vi §4; **ĐÃ PHÁN QUYẾT §15.3: M/N không phải hai mút một khối ⇒ ABSTAIN tường minh, luật ghi ở §6.5**).
**Tính tay:** R_MN = 1/(1/4 + 1/12) = 3; R_tđ = 3 + 3 + 1 = 7. I = 12/(7+1) = **3/2 A**. a) U_MN = I·R_MN = 3/2·3 = **9/2 V = 4,5 V**. b) I3 = U_MN/R3 = (9/2)/12 = **3/8 A = 0,375 A**. c) P_ngoài = U_N·I = (12 − 3/2)·3/2 = (21/2)(3/2) = **63/4 W = 15,75 W**.
**Tự kiểm:** K2 nút MN: I2 + I3 = 9/8 + 3/8 = 12/8 = 3/2 ✓. K1: U1 + U_MN + U4 = 9/2 + 9/2 + 3/2 = 21/2 = E − I·r = 12 − 3/2 ✓. K3: I²(R1+R4) + P2 + P3 + P_r = 9 + 81/16 + 27/16 + 9/4 = 9 + 27/4 + 9/4 = 18 = E·I = 18 ✓.
**Kỳ vọng:** "9/2" V; "3/8" A; "63/4" W — exact.

---

### C8 — ĐÈN sáng bình thường (lamp + biến trở giá trị cụ thể)

**Đề:** "Một bóng đèn ghi 6 V – 3 W mắc nối tiếp với biến trở đang đặt ở giá trị R_b = 6 Ω rồi mắc vào nguồn E = 9 V có điện trở trong không đáng kể. Coi điện trở của đèn không đổi. a) Tính điện trở của đèn. b) Cường độ dòng điện qua đèn. c) Đèn có sáng bình thường không?"

```json
{ "problemName": "den-sang-binh-thuong",
  "source": { "emf": 9 },
  "circuit": { "kind": "series", "items": [
      { "kind": "lamp", "name": "den", "ratedVolts": 6, "ratedWatts": 3 },
      { "kind": "resistor", "name": "Rb", "ohms": 6 } ] },
  "queries": [ { "kind": "resistance", "of": "den", "label": "a" },
               { "kind": "current", "of": "den", "label": "b" },
               { "kind": "lamp_check", "of": "den", "label": "c" } ] }
```

**Tính tay:** a) R_đèn = U_đm²/P_đm = 36/3 = **12 Ω** (engine tự suy — LLM chỉ chép 6 và 3). b) I = 9/(12 + 6) = **1/2 A = 0,5 A**. c) I_đm = P_đm/U_đm = 3/6 = 1/2 A ⇒ ratio = (1/2)/(1/2) = **1** exact ⇒ verdict `sang_binh_thuong`.
**Tự kiểm:** K1: U_đèn + U_b = 6 + 3 = 9 = E ✓. K3: P_đèn + P_b = 3 + 3/2 = 9/2 = E·I = 9·1/2 ✓ (P_đèn = 3 W = đúng P_đm — nhất quán với "sáng bình thường").
**Kỳ vọng:** "12" Ω; "1/2" A; answers[2] = {text "1", approx 1, unit "", verdict "sang_binh_thuong"}. (Biến thể unit test cạnh bài: E = 8 V ⇒ I = 4/9 < 1/2 ⇒ verdict `sang_yeu`, ratio "8/9".)

---

### C9 — Điện năng tiêu thụ theo kWh (đổi đơn vị t và A do ENGINE)

**Đề:** "Một bếp điện có điện trở R = 44 Ω được mắc vào hiệu điện thế không đổi 220 V. a) Tính công suất tiêu thụ của bếp. b) Tính điện năng bếp tiêu thụ trong 30 phút theo đơn vị jun. c) Cũng điện năng đó, tính theo kilôoát giờ (kWh)."

```json
{ "problemName": "bep-dien-kwh",
  "source": { "emf": 220 },
  "circuit": { "kind": "resistor", "name": "bep", "ohms": 44 },
  "queries": [ { "kind": "power", "of": "bep", "label": "a" },
               { "kind": "energy", "of": "bep", "t": 30, "tUnit": "min", "unit": "J", "label": "b" },
               { "kind": "energy", "of": "bep", "t": 30, "tUnit": "min", "unit": "kWh", "label": "c" } ] }
```

**Tính tay:** ("mắc vào U không đổi" → emf 220, r 0 — quy ước §6.5; cây MỘT LÁ hợp lệ.) I = 220/44 = 5 A. a) P = U·I = 220·5 = **1100 W**. b) t = 30 min = 1800 s (×60 exact); A = P·t = 1100·1800 = **1 980 000 J**. c) A_kWh = 1 980 000/3 600 000 = **11/20 kWh = 0,55 kWh** (÷3 600 000 exact — cùng MỘT lượng, hai unit khai khác nhau ⇒ khóa đường đổi đơn vị).
**Tự kiểm:** K1: U_bếp = 220 = E − I·0 ✓. K3: P = 1100 = E·I ✓.
**Kỳ vọng:** "1100" W; "1980000" J; "11/20" kWh approx 0.55 — exact cả ba, hai câu b/c cùng approx quy về J chỉ khác unit.

---

### C10 — Bài NGHỊCH: tìm R để I mạch chính đạt giá trị cho trước

**Đề:** "Cho nguồn E = 12 V, r = 1 Ω. Mạch ngoài gồm điện trở R1 = 5 Ω nối tiếp với biến trở R_x. Phải điều chỉnh R_x bằng bao nhiêu để cường độ dòng điện trong mạch bằng 1,2 A?"

```json
{ "problemName": "tim-r-de-i-cho-truoc",
  "source": { "emf": 12, "r": 1 },
  "circuit": { "kind": "series", "items": [
      { "kind": "resistor", "name": "R1", "ohms": 5 },
      { "kind": "unknown_resistor", "name": "Rx" } ] },
  "queries": [ { "kind": "solve_resistance", "of": "Rx", "targetCurrent": 1.2 } ] }
```

**Tính tay:** 1,2 → 6/5 exact. R_cần = E/I − r = 12/(6/5) − 1 = 10 − 1 = 9 Ω. Möbius: cây series(5, x) ⇒ (a,b,c,d) = (1, 5, 0, 1) ⇒ Rx = (1·9 − 5)/(1 − 0) = **4 Ω** (nghiệm phương trình TUYẾN TÍNH, một phép chia, exact).
**Tự kiểm (thay-đáp-ngược trọn vòng):** thế Rx = 4 → R_tđ = 9; I = 12/10 = 6/5 = 1,2 ✓ (residual exact 0); K1: U1 + Ux = 6 + 24/5 = 54/5 = E − I·r = 12 − 6/5 ✓; K3: I²·9 + I²·1 = (36/25)·10 = 72/5 = E·I = 12·6/5 ✓.
**Kỳ vọng:** "4" Ω, `approximate:false`; checks có dòng `solve_backsub` residual 0 pass. (Unit test cạnh bài: targetCurrent 2,5 A ⇒ R_cần = 4,8 − 1 = 3,8 < 5 ⇒ Rx = −1,2 < 0 ⇒ error "giá trị điện trở không dương", ok:false, KHÔNG serve.)

---

### Bảng tổng hợp 10 bài

| # | Dạng | Đáp chốt |
|---|---|---|
| C1 | Nối tiếp thuần, r = 0 | 12 Ω; 1 A; 8 V |
| C2 | Nối tiếp thuần, r ≠ 0 + P + A nguồn | 1 A; 4 V; 3/2 W; 1/2 W; 18/5 kJ (3,6 kJ) |
| C3 | Song song thuần 2 nhánh | 2 Ω; 3 A; 1 A |
| C4 | Song song thuần 3 nhánh + r | 2 Ω; 3 A; 3/2 A; 27 W |
| C5 | Hỗn hợp R1 nt (R2//R3) | 6 Ω; 2 A; 2/3 A |
| C6 | Hỗn hợp lồng 3 tầng + r + hiệu suất | 4 Ω; 2 A; 2/3 A; 80 % |
| C7 | Hỗn hợp + U_MN giữa mạch | 9/2 V; 3/8 A; 63/4 W |
| C8 | Đèn sáng bình thường | 12 Ω; 1/2 A; ratio 1 → sang_binh_thuong |
| C9 | Điện năng J ↔ kWh | 1100 W; 1 980 000 J; 11/20 kWh (0,55) |
| C10 | Nghịch: tìm Rx cho I = 1,2 A | Rx = 4 Ω |

Phủ query (đếm ĐÃ SỬA theo CI-3): `resistance` **×6** (C1a, C3a, C4a, C5a, C6a, C8a-của-lá — câu cũ ghi "×5" đếm sót), `current` **×12** (C1b, C2a, C3b, C3c, C4b, C4c, C5b, C5c, C6b, C6c, C7b, C8b — câu cũ ghi "×9"), `voltage` ×3, `power` ×2, `power_source` đủ 3 part (C2d internal, C4d total, C7c external), `energy` ×2 (J, kWh) + `energy_source` ×1 (kJ), `efficiency` ×1, `lamp_check` ×1 (+2 verdict ở unit test), `solve_resistance` ×1 (+1 nhánh error). Đơn vị: tUnit `min` ×3; unit ra `J`/`kJ`/`kWh`; thập phân → hữu tỉ (0,5; 1,5; 1,2).

## 12. Test plan (chỉ CỘNG, ước ~45–50 test)

- `circuit.test.ts` (~14): thu gọn nt/ss/lồng nhau; **stress 8 điện trở sâu 4 tầng** — cây `((1nt5) // (2nt4)) nt (6//6//3) nt 0,5` = 3 + 3/2 + 1/2 = **5 Ω** tính tay; kohm ×1000; lamp → R = U²/P; bảng phân bố; Möbius 4 nhánh công thức (kể cả x trong parallel: x∥6 target 2 ⇒ 3) + suy biến + nghiệm âm.
- `circuitCompute.test.ts` (~10): từng kind ra đúng số + unit; energy đổi 3 tUnit × 4 unit chọn mẫu; efficiency %; lamp_check 3 verdict; input số lẻ → approximate:true trung thực.
- `circuitKirchhoff.test.ts` (~5): K1–K4 residual exact-0 trên mạch mẫu; tiêm bảng hỏng (sửa 1 ô) ⇒ violation.
- `circuitLayout.test.ts` (~5): 3 bất biến §10.3 trên C1/C5/C6; cây một lá.
- `runCircuit.test.ts` (~8): parse fail các superRefine §6.3 (tên trùng, of lạ, 9 lá, ẩn không query…); asserts đúng/sai (C5 + assert `current = 2` pass; `= 2,1` ⇒ violation ok:false); geometry rỗng đúng shape; C10 nhánh error.
- `circuit-contract.test.ts` (10 bài §11): so `text` + `approx` + `unit` + `approximate` + verdict; checks pass toàn bộ.

## 13. Ngoài phạm vi v1 — để v2+ (YAGNI, đã liệt kê chi tiết §4)

Mạch cầu/thế nút; nhiều nguồn/ghép nguồn; tụ; dụng cụ đo không lý tưởng; P_max trên biến trở; ràng buộc nghịch "đèn sáng bình thường"/I nhánh; U chéo nhánh; Q calo/điện phân; render schematic UI; wiring (index.ts/bridge/route + quota F1/prompt); tag registry seed (P0).

## 14. Đối chiếu quy ước ĐÃ DUYỆT (review phiên 1) — spec này tuân thế nào

| Quy ước đã duyệt | Áp dụng trong spec này |
|---|---|
| F2/D1 — unit per-quantity, engine đổi exact | §6.4: unit ở lá Ω/kΩ, tUnit s/min/h, unit đầu ra J/kJ/Wh/kWh, A/mA — hệ số hữu tỉ; LLM không nhân chia gì |
| C6 — `answers[].unit` do engine ghi | §8: bảng kind → unit cố định; energy theo unit khai |
| D5 — mỗi query MỘT số | §8: kể cả `lamp_check` (một số ratio + verdict cấu trúc) và `power_source` (part chọn một trong ba số) |
| Tag 4 tầng `subject/grade/chapter/skill` | §3: 5 tag `ly/11/dong-dien/<skill>` đề xuất seed; v1 tự gắn `['physics','circuit']`, taxonomy là việc bridge |
| EPS hai tầng (EPS_SELF 1e-6 / TOL_ASSERT 1e-3) | §9 giữ nguyên trị số và lý do; thêm chế độ residual exact-0 vì mạch DC thuần hữu tỉ |
| F9 — gate tsc kernel | §5 nghi thức kiểm dùng `tsconfig.kernel.json` |
| F1 — route phải có quota | Ghi ở §13: wiring ngoài phạm vi nhưng điều kiện F1 chép lại để không rơi mất |
| D6 — dữ liệu ngoài GeometryData mất khi lưu lịch sử | §10.3: `circuitLayout` (và `table`) cùng số phận `charts` v0 — ghi rõ, hướng xử lý để bước wiring |

## 15. Điểm phân vân — ĐÃ PHÁN QUYẾT TOÀN BỘ (phản biện đợt 2, 22/08)

Mười điểm giữ nguyên văn câu hỏi gốc (trace), mỗi điểm ghi phán quyết tại chỗ. Nguồn: `../reviews/2026-08-21-wave2-specs-review.md` §Findings DC-CIRCUIT — không mở lại tranh luận.

1. **Đèn R phi tuyến:** thực tế R dây tóc nguội nhỏ hơn ~10 lần R nóng; v1 coi R = U_đm²/P_đm HẰNG (giả định chuẩn SGK). Đề không ghi "coi điện trở đèn không đổi" thì translator vẫn dịch hay abstain?
   **ĐÃ PHÁN QUYẾT: vẫn dịch theo thông lệ SGK + engine ghi assumption "R đèn coi như không đổi" vào trace/checks** (đã áp §4, §6.5).
2. **Tên query `total_resistance(of?)`:** tên `total_` lệch vì ngữ nghĩa phủ cả lá/khối. Đổi thành `resistance(of?)`?
   **ĐÃ PHÁN QUYẾT: ĐỔI thành `resistance(of?)`** — đã đổi XUYÊN SUỐT spec (schema §6.2, bảng unit §6.4, bảng query §8, 6 bài contract C1/C3/C4/C5/C6/C8, bảng phủ §11).
3. **U giữa hai điểm qua "khối có tên":** đề "U_AB" với A, B KHÔNG là mút một khối con (chéo nhánh) bản chất là mạch cầu — cần translator phát hiện + abstain tường minh?
   **ĐÃ PHÁN QUYẾT: CÓ — luật "M/N không phải hai mút của MỘT khối trong cây ⇒ ABSTAIN"** ghi vào quy ước translator §6.5 + chú thích C7.
4. **Bài nghịch:** khóa hẹp (ẩn chỉ ở chuỗi nối tiếp gốc) hay giữ Möbius tổng quát?
   **ĐÃ PHÁN QUYẾT: GIỮ Möbius TỔNG QUÁT** (thuật toán đồng nhất ~30 dòng, nghiệm đóng, phản biện đã kiểm cả 2 quy tắc hợp thành). Ràng buộc I-nhánh/U-phần-tử/"đèn sáng bình thường" để v2.
5. **`efficiency` trả PHẦN TRĂM** (80, unit '%') thay vì tỉ số 0,8?
   **ĐÃ PHÁN QUYẾT: GIỮ phần trăm** — khớp đáp SGK VN; hữu tỉ lẻ "800/9" vẫn exact.
6. **Entry riêng `runCircuit`** vs nhét vào `runPhysics` qua discriminator?
   **ĐÃ PHÁN QUYẾT: GIỮ entry riêng `runCircuit`** cho v1 (thi công song song không đụng v0); hợp nhất một cửa quyết ở bước wiring.
7. **`circuitLayout` format draft** chưa có consumer?
   **ĐÃ PHÁN QUYẾT: CHẤP NHẬN draft** — nghiệm thu bằng 3 bất biến, không khóa tọa độ; format được phép đổi khi làm UI thật.
8. **Hiển thị hữu tỉ:** "11/20" vs "0,55" — formatter thập phân đặt đâu?
   **ĐÃ PHÁN QUYẾT (phán quyết CHUNG cả 3 spec, §17.2): engine giữ exact-first ("11/20"); formatter thập phân là việc tầng BRIDGE/UI lúc wiring** — không đưa vào text v1.
9. **Ký tự unit 'Ω':** chấp nhận hay dùng 'ohm'?
   **ĐÃ PHÁN QUYẾT: GIỮ 'Ω'** — JSON/JS an toàn, rủi ro font là việc UI.
10. **Vị trí `scalarFromNumber`:** đang ở `kinematics.ts` (v0).
   **ĐÃ PHÁN QUYẾT: circuit IMPORT từ `kinematics.ts`** như spec khai (§5); nếu sau này v0 tách `numeric.ts` dùng chung thì circuit theo — không tự tách trước.

## 16. Tiêu chí thành công

1. 10 bài contract §11 chạy qua `runCircuit` ra ĐÚNG đáp tính tay: text/approx/unit/approximate khớp từng câu; C8 verdict đúng; C10 nghiệm 4 Ω + nhánh nghiệm âm ra error không serve.
2. Mọi bài có `checks[]` K1–K3 (K4 khi hỏi hiệu suất) pass với residual exact-0; assert sai ⇒ violations + ok:false.
3. Đáp `approximate:false` 100% trên cả 10 bài (không bài nào rơi float) — chứng thực cam kết §7.4.
4. `geometry` rỗng đúng shape `{name, points:[], lines:[], tags:['physics','circuit']}`; `circuitLayout` qua 3 bất biến trên mọi bài contract.
5. Toàn suite: test cũ (1072 + phần v0) XANH nguyên vẹn, chỉ CỘNG test mới; `git status` chỉ thấy file mới trong `api/_lib/kernel/physics/`; `npx tsc --noEmit -p tsconfig.kernel.json` sạch.

## 17. Phán quyết chung đợt 2 (áp cho CẢ BA spec: dynamics · oscillation · dc-circuit)

Ba luật chung ĐÃ DUYỆT tại `../reviews/2026-08-21-wave2-specs-review.md` (Kết luận):

1. **Label trần:** scene KHÔNG nhúng giá trị engine tính vào bất kỳ label nào (đồng bộ F8) — mọi giá trị nằm ở `answers[]`. *Spec này v1 không vẽ 3D (geometry rỗng §10.2) nên không có label để vi phạm; lưu ý ranh giới cho tương lai: `circuitLayout.valueText` ("4 Ω", "E = 12 V; r = 1 Ω") chỉ mang SỐ LIỆU ĐỀ CHO đã khai trong plan — đúng vai sơ đồ đề bài SGK — TUYỆT ĐỐI không được đưa giá trị engine TÍNH (I, U, R_tđ…) vào valueText khi làm UI schematic.*
2. **Exact-first, thập phân ở bridge:** engine giữ text exact ("11/20" kWh, "3/2" W, "63/4" W); mọi formatter thập phân kiểu VN ("0,55", "1,5", "15,75") là việc tầng bridge/UI lúc wiring — engine KHÔNG in số theo quy ước trình bày (= phán quyết §15.8). *Chú thích "= 0,55 kWh" trong lời tính tay §11 chỉ là đối chiếu ≈ cho người đọc, không phải text engine.*
3. **Chính tả field query theo v0:** field dùng chung viết đúng chính tả planSchema v0 — `value`/`vUnit`/`component`. *Circuit không có field vận tốc/thành phần; các unit field theo mẫu per-quantity (`tUnit`, `targetCurrentUnit`, `unit` cho đầu ra) đã nhất quán — luật áp khi bridge hợp nhất field dùng chung giữa các pack (dynamics đã đổi theo ở DY-3, osc đã đúng sẵn).*

## 18. Changelog phản biện (22/08)

Áp trọn kết luận `../reviews/2026-08-21-wave2-specs-review.md` (mọi finding + phán quyết ĐÃ DUYỆT). Không đổi bất kỳ giá trị số/đáp nào của 10 bài contract C1–C10 (phản biện xác nhận 31/31 số đúng toàn đợt; kiểm riêng chia dòng nút, hiệu suất 2 đường, kWh exact, đại số Möbius cả 2 quy tắc — đều đúng) — chỉ sửa thiết kế/khai báo/tên.

| Finding / phán quyết | Vị trí sửa trong spec |
|---|---|
| CI-1 — khóa K/nối tắt/2 trạng thái; bài nghịch tìm E,r từ 2 lần đo | §4 NGOÀI phạm vi (2 bullet mới + chỉ dẫn few-shot abstain), §6.5 (danh sách few-shot abstain) |
| CI-2 — few-shot mạch cầu abstain + mọi số đo dư → asserts | §4 (bullet mạch cầu, thêm yêu cầu few-shot + lý do "không có phòng tuyến máy"), §6.5 (luật cứng "MỌI số đo dư → asserts") |
| CI-3 — sửa đếm phủ query | Bảng phủ cuối §11: `resistance` ×5 → **×6**, `current` ×9 → **×12** (kèm liệt kê từng câu) |
| CI-4 — bỏ EPS_LAMP | §8.1: dùng chung **EPS_SELF = 1e-6**, không đặt hằng riêng |
| Đổi tên `total_resistance` → `resistance(of?)` (phán quyết §15.2) | §3 (bảng dạng bài), §6.2 (z.literal + comment), §6.4 (bảng unit), §8 (bảng query), 6 bài contract C1/C3/C4/C5/C6/C8, bảng phủ §11 |
| 10 phán quyết §15 | Ghi "ĐÃ PHÁN QUYẾT" từng điểm tại §15.1–§15.10; áp vào thân bài: §4 (1), §6.5 (1, 3), C7 (3), §17.2 (8) |
| Phán quyết chung (a)(b)(c) | §17 (+ các mục nó trỏ tới) |
