# Physics Pack v1 — KHÍ LÍ TƯỞNG + VẬT LÍ NHIỆT lớp 12 (GDPT 2018) — Design Spec

**Ngày:** 2026-08-22
**Trạng thái:** DỰ THẢO — CHỜ PHẢN BIỆN (viết lại từ đầu sau sự cố quota; spec này bị phản biện TRƯỚC khi code).
**Phạm vi file:** CHỈ TẠO MỚI đúng `api/_lib/kernel/physics/gasHeat*.ts` + test (`gasHeat.ts`, `gasHeatSchema.ts`, `gasHeatCompute.ts`, `runGasHeat.ts` + `__tests__/`). KHÔNG sửa bất kỳ file có sẵn nào (kể cả `kinematics.ts`, `planSchema.ts`, `circuit*.ts`, `dynamics*.ts`, `oscillation*.ts`, `efield*.ts`, `index.ts`, `run*.ts`). Pack độc lập, entry riêng `runGasHeat`. (Nhiều agent chạy song song — ranh giới cứng.)
**Đã đọc nền:** `2026-08-21-physics-pack-design.md` (engine exact scalar hữu tỉ + một căn, certify float độc lập, unit per-quantity, tự-kiểm thay-ngược, answers mang `unit`); `2026-08-21-arch-physics-review-phien1.md` (F2 unit đổi exact ×hữu-tỉ, F8 **label scene trần** — giá trị ở `answers[]`, F9 `params:{}` + `tsconfig.kernel.json`, C6 engine ghi `answers[].unit`, C8 EXACT_TRIG→`trigOf`); `2026-08-21-wave2-specs-review.md` (3 phán quyết CHUNG: **label không nhúng giá trị engine tính**, **thập phân là việc bridge/UI — engine exact-first**, **chính tả field query dùng chung theo v0**); `MERGE-BRIEF.md` (nhánh CHỈ CỘNG THÊM, không đụng `src/`/route cũ). Đã đọc CODE: `scalar.ts`, `kinematics.ts`, `dynamics*.ts`, `circuit*.ts`, `runDynamics.ts`.

---

## 1. Mục tiêu (một câu)

Giữ nguyên nguyên tắc geo3d/physics-v0 cho hai chương lớp 12 **Khí lí tưởng** và **Vật lí nhiệt**: **LLM chỉ DỊCH đề → GasHeatPlan JSON (khai trạng thái khí / quá trình / vật nhiệt + câu hỏi, ẩn số = trường bỏ trống); ENGINE tất định GIẢI bằng công thức đóng trên số học hữu tỉ EXACT, TỰ KIỂM bằng thay-ngược phương trình + ràng buộc vật lí, và GHI đơn vị vào từng đáp.** Không bịa đáp: mô hình phi vật lí (T ≤ 0 K, p/V ≤ 0, t_cb ngoài khoảng nhiệt độ đầu, khối lượng âm) ⇒ violation, KHÔNG phục vụ số.

## 2. Vì sao dựng được gọn — ĐÂY LÀ PACK ĐƠN GIẢN NHẤT (tái dùng gần hết, KHÔNG cần cả solver1d)

| Cần | Đã có sẵn (đã đọc code) | Dùng lại thế nào |
|---|---|---|
| Số học hữu tỉ EXACT (phân số) | `scalar.ts`: `Exact = {num: bigint, den: bigint, radicand: number}` — num/den BigInt chính xác tùy ý | Mọi đại lượng khí/nhiệt là `Scalar` **radicand = 1** (hữu tỉ thuần). `R = rat(831n,100n)` exact; `p₂ = 8/3 atm`, `m = 28/23 kg`, `m = 32/3 g` ra phân số CHÍNH XÁC (máy tính bỏ túi phải làm tròn) |
| Thập phân đề → hữu tỉ | `scalarFromNumber` (kinematics.ts:13) — ≤9 chữ lẻ → ℚ chính xác (`8,31 → 831/100`; `0,1 → 1/10`) | Mantissa áp suất/thể tích/nhiệt độ/khối lượng chép thẳng, giữ exact |
| Đổi đơn vị EXACT (F2/D1) | mẫu `convertQty`/`qtyLength` (kinematics.ts:32-54) — bảng factor hữu tỉ | `qtyPressure`/`qtyVolume`/`qtyTemp`/`qtyMass` cùng khuôn: `atm→101325`, `L→1/1000 m³`, `cm³→10⁻⁶`, `g→1/1000 kg`; **°C→K là +273 EXACT** (cộng hữu tỉ, không phải factor nhân) |
| Chứng nhận exact ↔ float ĐỘC LẬP | `certifyScalar`/`cmpScalar`/`isZeroS` (answer.ts:124/139/133) | Mọi đáp đối chiếu bản float đường riêng (`…N`), lệch > `1e-6·scale` ⇒ bỏ exact |
| Khuôn pack physics phụ | `circuit*.ts`/`dynamics*.ts` (schema/thuần/compute tách 3 tầng, `mkAns` 3 bậc, `…N` float độc lập, `EPS_SELF=1e-6`, entry riêng, `TOL_ASSERT=1e-3`) | Sao khuôn Y HỆT cho `gasHeat*.ts` |

**Nhận xét then chốt (khác efield/dynamics — đơn giản hơn NỮA):** toàn bộ hai chương này là **đại số HỮU TỈ TUYẾN TÍNH** — không có căn, không có bậc 2.
- Ba đẳng quá trình + phương trình trạng thái + Clapeyron: mỗi phương trình là **tích/thương bằng nhau**, tuyến tính theo BẤT KỲ một ẩn (sau nhân chéo). ⇒ nghiệm = một phép chia hữu tỉ, exact 100%.
- Cân bằng nhiệt `Σ mᵢcᵢ(T_f − T0ᵢ) = 0`: tuyến tính theo ẩn (dù ẩn là `t_cb`, một `m`, hay một `c`). ⇒ exact 100%.
- Nhiệt lượng `Q = mcΔt`, `Q = λm`, `Q = Lm`, chuỗi = tổng đoạn: cộng/nhân hữu tỉ thuần.

⇒ **KHÔNG import `solver1d` (không giải bậc 2), KHÔNG dùng `sqrt`, radicand LUÔN = 1, KHÔNG bao giờ chạm trần radicand.** Đây là pack physics ít máy móc nhất. `recognizeConstant` chỉ giữ làm lưới an toàn (thực tế không đường nào rơi float ở thang phổ thông).

## 3. Phạm vi

### 3.1. TRONG phạm vi (v1) — dạng bài phủ

| Dạng bài | Công thức đóng | Op khai | Query | Bài |
|---|---|---|---|---|
| Đẳng nhiệt (Boyle) | `p₁V₁ = p₂V₂` | 2× `state` + `process(isothermal)` | `state_value` | G1, G2 |
| Đẳng tích (Charles) | `p₁/T₁ = p₂/T₂` | 2× `state` + `process(isochoric)` | `state_value` | G3 |
| Đẳng áp (Gay-Lussac) | `V₁/T₁ = V₂/T₂` | 2× `state` + `process(isobaric)` | `state_value` | G4 |
| Phương trình trạng thái | `p₁V₁/T₁ = p₂V₂/T₂` | 2× `state` + `process(general)` | `state_value` | G5, G10 |
| Clapeyron–Mendeleev | `pV = nRT`, `R = 8,31`; `m = nM` | 1× `state`(+n/mass/M) | `clapeyron` | G6 |
| Áp suất thuỷ tĩnh (bọt khí đáy hồ) | `p = p₀ + ρgh` (engine tính, nối đẳng nhiệt) | `state.pFromDepth` | `state_value` | G2 |
| Nhiệt lượng thu/toả | `Q = mcΔt` | `thermal_body` | `heat` | (thành phần) |
| Nóng chảy / hoá hơi | `Q = λm` / `Q = Lm` | `thermal_body`(λ,L) | `heat` | (thành phần) |
| Chuỗi đá→nước→hơi | Σ đoạn (nóng rắn + nóng chảy + nóng lỏng + hoá hơi) | `thermal_body`(đủ props) | `heat` | G9 |
| Cân bằng nhiệt tìm t_cb | `Σ mᵢcᵢ(T_f−T0ᵢ)=0` | 2–3× `thermal_body` | `equilibrium_temp` | G7 |
| Cân bằng nhiệt tìm m (thả sắt nóng) | như trên, ẩn một `m` | 2× `thermal_body`(một `mass` trống) | `mass_from_heat` | G8 |
| °C→K EXACT (+273) | mọi query dùng T | khai `unit:'C'`, engine cộng 273 | — | G3,G4,G5,G6,G10 |
| Bẫy đổi đơn vị (L↔m³, atm↔Pa, cm³) | khai unit, engine đổi hữu tỉ | mọi op | mọi query | G10 |

### 3.2. NGOÀI phạm vi (ghi rõ — YAGNI + "thà ít mà đúng")

- **Động cơ nhiệt, hiệu suất chu trình** (`H = A/Q₁`, `H = 1 − T₂/T₁`), **đồ thị chu trình kín** (Carnot, Otto…), công chu trình = diện tích. → chương/pack riêng.
- **Nguyên lí I nhiệt động lực học** dạng `ΔU = A + Q` với công khí `A = pΔV` (đẳng áp) và nội năng — v1 KHÔNG phủ (chỉ nhiệt lượng thu/toả + phương trình trạng thái). Ghi §14 điểm phân vân (có nên thêm `internal_energy`/`work_gas` không).
- **Khí thực** (van der Waals), **độ ẩm không khí** (tuyệt đối/tương đối, điểm sương).
- **Cân bằng nhiệt CÓ chuyển thể một phần** (thả nước đá vào nước ấm, phải xác định đá tan hết hay chưa → BÀI TOÁN PHI TUYẾN/phân nhánh trạng thái). v1 CHỈ nhận cân bằng nhiệt **cảm nhiệt thuần** (`Q=mcΔt`, tuyến tính); chuyển thể chỉ xuất hiện ở **chuỗi một chất** (`heat`, G9), KHÔNG trộn với vật khác. superRefine chặn (§6.3) → LLM abstain.
- **Sự nở vì nhiệt** (dài/khối), **truyền nhiệt** (dẫn/đối lưu/bức xạ, định luật Fourier).
- **Thang electron/áp suất hơi bão hoà**; đơn vị ngoài bảng (§5.2) ⇒ engine trả error có cấu trúc, không đoán.

## 4. Kiến trúc & file (soi gương `circuit*.ts`/`dynamics*.ts` — pack phụ độc lập)

```
api/_lib/kernel/physics/
  gasHeatSchema.ts   — GasHeatPlanSchema (zod): atmInPa, ops (state/process/thermal_body),
                       queries (state_value/clapeyron/heat/equilibrium_temp/mass_from_heat),
                       asserts, knowledgeTags + superRefine (tên duy nhất, ref tồn tại,
                       GATE "đúng-một-ẩn" §6.3, chặn trộn chuyển-thể-vào-cân-bằng)
  gasHeat.ts         — THUẦN (Scalar): R=831/100; qtyPressure/qtyVolume/qtyTemp(+273)/qtyMass/qtyMolar
                       (đổi unit hữu tỉ exact); buildStates (tính pFromDepth); solveProcess,
                       solveClapeyron, solveBalance, heatChain; CẶP FLOAT ĐỘC LẬP (…N); EPS_SELF
  gasHeatCompute.ts  — mỗi query → công thức đóng + mkGHAns (3 bậc: certify → recognize → fmtNum);
                       computeGasHeatQuery
  runGasHeat.ts      — entry runGasHeat(raw): parse → build → queries → asserts → self-check → GasHeatResult
  __tests__/
    gasHeat.test.ts  gasHeatCompute.test.ts  gasHeat-contract.test.ts (10 bài §12)
```

**Import được phép** (y hệt physics v0/circuit; cross-import C2 đã duyệt): `../scalar`, `../analysis/recognize` (chỉ lưới an toàn), `../compute/answer` (`certifyScalar`, `cmpScalar`, `isZeroS`), `./kinematics` (**chỉ `scalarFromNumber`** — như `circuit.ts:8`/`dynamics.ts:13` đã import), `zod`, và `import type` từ `../../../../src/types/geometry` (type-only, bị erase). **KHÔNG import `solver1d`** (không có bậc 2).

**Ranh giới CỨNG (hoàn toàn additive):** KHÔNG sửa `run.ts`, `planSchema.ts`, `kinematics.ts`, `circuit*.ts`, `dynamics*.ts`, `oscillation*.ts`, `efield*.ts`, `index.ts`, `runPhysics.ts`, `package.json`, `vitest.config.ts` (glob `api/_lib/kernel/**/*.test.ts` đã phủ test mới), `src/**`. Nối dây (export `index.ts`, bridge route đa môn, few-shot translator, `answers[].unit`→UI) là **P2/bridge**, ngoài spec này. Gate typecheck: thêm `gasHeat*.ts` vào `tsconfig.kernel.json` (F9) khi thi công — pack tự phát đủ field type; `params:{}` bắt buộc nếu phát `Curve3D` (§10).

## 5. Số học exact — R, +273, và đổi đơn vị (chỗ duy nhất số của đề thành Scalar)

### 5.1. Hằng số & vì sao tất cả ở lại trong ℚ

- **`R = rat(831n, 100n)`** = 8,31 J/(mol·K) EXACT. (Đề VN GDPT 2018 dùng R = 8,31; KHÔNG dùng 8,314.) `R·T` với T = 300 K → `2493` exact; `pV` các bài chọn khéo là bội của 831 ⇒ `n = pV/RT` ra phân số đẹp (G6: `831/2493 = 1/3`).
- **°C → K là PHÉP CỘNG +273, KHÔNG phải factor nhân** (điểm khác mọi đơn vị khác): `T_K = scalarFromNumber(T_C) + rat(273n)` khi `unit === 'C'`; `unit === 'K'` giữ nguyên. Đề GDPT 2018 dùng +273 (không +273,15) ⇒ EXACT hữu tỉ. **LLM KHÔNG tự cộng 273** — chỉ khai `{value:27, unit:'C'}`, engine đổi (chống R1 "LLM tính hộ").
- Ba đẳng quá trình là **tỉ số** ⇒ đơn vị p, V TRIỆT TIÊU nếu hai trạng thái cùng đơn vị (đáp giữ đúng đơn vị đầu vào). Nhưng để phủ **đề trộn đơn vị** (G10: V₁ m³ vs V₂ lít) engine QUY MỌI đại lượng về SI (Pa, m³, K, kg, mol, J) rồi giải, cuối cùng đổi đáp về đơn vị `unit` của query (mặc định = đơn vị đại lượng đó khai ở trạng thái kia, hoặc SI). Đổi hai chiều toàn hữu tỉ ⇒ round-trip EXACT.

### 5.2. Bảng factor (hữu tỉ EXACT — lũy thừa 10 do factor gánh)

```ts
// gasHeat.ts — mọi factor là Scalar hữu tỉ; đổi = value × factor(unit) (về SI)
const PRES_TO_PA: Record<string, Scalar> = {
  Pa: rat(1n), kPa: rat(1000n), atm: rat(ATM_IN_PA), bar: rat(100000n), mmHg: rat(101325n, 760n),
};                                            // ATM_IN_PA = plan.atmInPa ∈ {101325, 100000}
const VOL_TO_M3: Record<string, Scalar> = { m3: rat(1n), L: rat(1n,1000n), mL: rat(1n,1000000n), cm3: rat(1n,1000000n) };
const MASS_TO_KG: Record<string, Scalar> = { kg: rat(1n), g: rat(1n,1000n) };
export const qtyPressure = (v,u,atmInPa) => mul(scalarFromNumber(v), PRES_TO_PA(u,atmInPa)); // exact
export const qtyTemp = (v,u) => u === 'C' ? add(scalarFromNumber(v), rat(273n)) : scalarFromNumber(v); // +273 EXACT
export const R = rat(831n, 100n);
```

- **`atm↔Pa` khai được (task):** `plan.atmInPa` mặc định `101325`; đề nói "lấy 1 atm = 10⁵ Pa" ⇒ khai `atmInPa: 100000`. Chỉ ẢNH HƯỞNG khi bài THẬT SỰ đổi atm↔Pa; bài thuần-atm (tỉ số) hay thuần-Pa không đụng (10 bài §12 không bài nào trộn atm↔Pa ⇒ clean bất kể chọn hằng).
- **Đơn vị/nền ngoài bảng ⇒ throw thông điệp rõ** (`convertQty` mẫu kinematics.ts:39) — `runGasHeat` bắt thành `errors` có cấu trúc, KHÔNG đoán.
- **Molar mass** `M` (g/mol) không đổi đơn vị (v1 cố định g/mol — đề VN luôn g/mol: O₂=32, CO₂=44…); `mass(g) = n · M`. Đáp mass mặc định gam; `unit:'kg'` ⇒ đổi ×1/1000.

### 5.3. Quy tắc NHẬP giữ exact (thiết kế schema §6)

`value` LLM chép là **mantissa "đẹp"** trong tầm exact của `scalarFromNumber` (≤9 chữ lẻ, ≥~1e-9); lũy thừa 10 nằm trong `unit`. Sai lầm cần tránh (giống efield §5.3): feed `8,31e-3` thô → nên khai `{value: 8.31, unit: 'L'}`. λ, L (nhiệt nóng chảy/hoá hơi) thang `10⁵–10⁶` khai thẳng mantissa: `{value: 340000}` hoặc engine chấp `3.4e5` (số nguyên < 2⁵³, `scalarFromNumber` giữ exact). Điện-tích-cực-nhỏ KHÔNG xuất hiện ở chương này ⇒ không có bẫy dưới sàn.

## 6. Schema (gasHeatSchema.ts)

```ts
import { z } from 'zod';
const Num = z.number().finite();
const Name = z.string().min(1).regex(/^[A-Za-z0-9_]+$/);       // tên = id: không dấu/cách

const PresUnit = z.enum(['Pa','kPa','atm','bar','mmHg']);
const VolUnit  = z.enum(['m3','L','mL','cm3']);
const TempUnit = z.enum(['C','K']);
const MassUnit = z.enum(['kg','g']);
const LenUnit  = z.enum(['m','cm']);

const Pressure = z.object({ value: Num.positive(), unit: PresUnit.default('Pa') });
const Volume   = z.object({ value: Num.positive(), unit: VolUnit.default('m3') });
const Temp     = z.object({ value: Num, unit: TempUnit.default('K') });      // value có thể ≤0 (°C âm); K PHẢI >0 sau đổi (self-check)
const Mass     = z.object({ value: Num.positive(), unit: MassUnit.default('kg') });
// Áp suất thuỷ tĩnh (bọt khí) — engine tính p = p₀ + ρgh; LLM chỉ CHÉP p₀, h, ρ, g (không tự nhân)
const Hydrostatic = z.object({
  atmosphere: Pressure,
  depth: z.object({ value: Num.positive(), unit: LenUnit.default('m') }),
  density: z.object({ value: Num.positive() }).default({ value: 1000 }),      // ρ (kg/m³); nước = 1000
  g: Num.positive().default(10),
});

// ── Ops KHÍ ───────────────────────────────────────────────────────────────────
const StateOp = z.object({
  op: z.literal('state'), name: Name,
  p: Pressure.optional(),            // BỎ TRỐNG = ẩn (state_value hỏi) HOẶC không xuất hiện trong luật
  pFromDepth: Hydrostatic.optional(),// thay cho p: engine tính p₀+ρgh (loại trừ p — superRefine)
  V: Volume.optional(),
  T: Temp.optional(),                // đẳng nhiệt có thể bỏ T cả hai trạng thái (triệt tiêu)
  n: z.object({ value: Num.positive() }).optional(),   // số mol (Clapeyron)
  mass: Mass.optional(),                               // khối lượng khí (Clapeyron; cần molarMass)
  molarMass: z.object({ value: Num.positive() }).optional(),   // M (g/mol) — cầu mass↔mol
});
const ProcessOp = z.object({
  op: z.literal('process'),
  kind: z.enum(['isothermal','isochoric','isobaric','general']),
  from: Name, to: Name,
});

// ── Op NHIỆT (calorimetry + chuyển thể GỘP một op, field tuỳ query) ────────────
const ThermalBodyOp = z.object({
  op: z.literal('thermal_body'), name: Name,
  mass: Mass.optional(),                                // BỎ TRỐNG ⇒ ẩn của mass_from_heat
  c: z.object({ value: Num.positive() }).optional(),   // nhiệt dung riêng đơn-pha J/(kg·K)
  T0: Temp.optional(),                                 // nhiệt độ đầu (cân bằng nhiệt)
  // chuyển thể (chuỗi một chất):
  cSolid:  z.object({ value: Num.positive() }).optional(),
  cLiquid: z.object({ value: Num.positive() }).optional(),
  cGas:    z.object({ value: Num.positive() }).optional(),
  meltTemp: Temp.optional(), boilTemp: Temp.optional(),
  latentMelt:  z.object({ value: Num.positive() }).optional(),  // λ (J/kg)
  latentVapor: z.object({ value: Num.positive() }).optional(),  // L (J/kg)
});
export const GasHeatOpSchema = z.discriminatedUnion('op', [StateOp, ProcessOp, ThermalBodyOp]);

// ── Queries (mỗi query MỘT đáp số + đơn vị engine ghi) ─────────────────────────
const PhasePoint = z.object({ phase: z.enum(['solid','liquid','gas']), temp: Temp });

export const GasHeatQuerySchema = z.discriminatedUnion('kind', [
  // KHÍ:
  z.object({ kind: z.literal('state_value'), of: Name, quantity: z.enum(['p','V','T']),
             unit: z.string().optional(), label: z.string().optional() }),      // giải ẩn qua process
  z.object({ kind: z.literal('clapeyron'), of: Name,
             solveFor: z.enum(['p','V','T','amount','mass']),                    // amount = số mol
             unit: z.string().optional(), label: z.string().optional() }),
  // NHIỆT:
  z.object({ kind: z.literal('heat'), of: Name, from: PhasePoint, to: PhasePoint,
             label: z.string().optional() }),                                    // Σ đoạn enthalpy from→to
  z.object({ kind: z.literal('equilibrium_temp'),
             unit: TempUnit.default('C'), label: z.string().optional() }),       // t_cb: Σ mᵢcᵢ(T_f−T0ᵢ)=0
  z.object({ kind: z.literal('mass_from_heat'), of: Name,
             property: z.enum(['mass','c','T0']).default('mass'),                // ẩn m/c/T0
             Tf: Temp, unit: z.string().optional(), label: z.string().optional() }),
]);

export const GasHeatPlanSchema = z.object({
  problemName: z.string().min(1),
  atmInPa: z.union([z.literal(101325), z.literal(100000)]).default(101325),      // 1 atm = ? Pa (đề khai)
  ops: z.array(GasHeatOpSchema).min(1),
  queries: z.array(GasHeatQuerySchema).min(1),
  asserts: z.array(z.object({ query: GasHeatQuerySchema, equals: Num, tol: Num.positive().optional() })).default([]),
  knowledgeTags: z.array(z.string()).default([]),                               // 4 tầng §11
}).superRefine((plan, ctx) => { /* §6.3 */ });
export type GasHeatPlan = z.infer<typeof GasHeatPlanSchema>;
export type GasHeatQuery = z.infer<typeof GasHeatQuerySchema>;
```

### 6.1. Nguyên tắc "LLM chỉ chép, ẩn số = trường trống"

Không field nào nhận đáp đã tính hộ (R1): không có `p₂`/`V₂` "đã suy", không nhận `T` bằng Kelvin đã cộng tay, không nhận `n` khi hỏi n, không nhận `mg·sinθ`… Trạng thái sau của quá trình để **TRỐNG đúng đại lượng ẩn**; `state_value.quantity` trỏ nó. Clapeyron: trạng thái thiếu đúng một trong `{p,V,T,n|mass}`. Cân bằng nhiệt tìm m: `thermal_body.mass` bỏ trống. Áp suất thuỷ tĩnh: LLM khai `pFromDepth:{atmosphere,depth,density,g}` — ENGINE nhân `ρgh` và cộng (LLM KHÔNG tự tính p đáy).

### 6.2. Xác định ẩn theo LUẬT (đại lượng mỗi quá trình dùng)

| kind | Đại lượng trong luật | Bỏ qua |
|---|---|---|
| isothermal | p₁, V₁, p₂, V₂ | T (có thể bỏ cả hai; nếu khai cả hai và T₁≠T₂ ⇒ violation "đẳng nhiệt nhưng T đổi") |
| isochoric | p₁, T₁, p₂, T₂ | V (nếu khai cả hai và V₁≠V₂ ⇒ violation) |
| isobaric | V₁, T₁, V₂, T₂ | p (nếu khai cả hai và p₁≠p₂ ⇒ violation) |
| general | p₁, V₁, T₁, p₂, V₂, T₂ | — |

Engine gom đại lượng-trong-luật của hai trạng thái, đếm **BLANK phải = đúng 1** (§6.3 gate); giải ẩn đó. Mọi luật là "tích/thương bằng nhau" ⇒ nhân chéo → **tuyến tính theo ẩn** → một phép chia hữu tỉ EXACT.

### 6.3. superRefine — GATE tính tất định & abstain

1. **Tên duy nhất** trên `ops`; `process.from/to`, `state_value.of`, `clapeyron.of` trỏ `state` tồn tại; `heat.of`, `mass_from_heat.of` trỏ `thermal_body` tồn tại; `equilibrium_temp` cần ≥ 2 `thermal_body`.
2. `state.p` và `state.pFromDepth` **loại trừ nhau** (không cả hai).
3. **GATE "đúng-một-ẩn":** với `state_value`, phải tồn tại đúng một `process` chứa `of`; số BLANK trong đại lượng-của-luật (§6.2) = **đúng 1**, và ẩn đó = `quantity` được hỏi (nếu ≠ ⇒ issue "ẩn số không khớp câu hỏi"). 0 hoặc >1 blank ⇒ issue "cần đúng một ẩn cho quá trình" (abstain).
4. `clapeyron`: trạng thái có đúng một blank trong `{p,V,T,amount}`; `solveFor='mass'` ⇒ cần `molarMass` và (n hoặc giải n trước); cho `mass` đầu vào ⇒ cần `molarMass` để ra n.
5. `heat`: body có đủ props cho khoảng `from→to`: đơn-pha cần `c`; qua nóng chảy cần `cSolid`/`meltTemp`/`latentMelt`; qua hoá hơi cần `cLiquid`/`boilTemp`/`latentVapor`/`cGas` (nếu vượt boil). Thiếu ⇒ issue rõ đại lượng nào.
6. `equilibrium_temp`: MỌI body đủ `mass`,`c`,`T0`; KHÔNG body nào có latent props (chặn trộn chuyển-thể-vào-cân-bằng §3.2 — phi tuyến). `mass_from_heat`: đúng một body thiếu `property` được hỏi, các body khác đủ; `Tf` cho sẵn.
7. Query `unit` (nếu khai) phải nằm trong bảng của đại lượng đó (p→PresUnit, V→VolUnit, T→TempUnit, mass→MassUnit) — sai ⇒ issue.

## 7. Tầng compute — công thức đóng từng query (gasHeatCompute.ts)

Mỗi hàm có **cặp float độc lập** (`…N`, số học `number`) làm đường certify (mẫu `dynamics.ts`/`circuit.ts`). `mkGHAns` = 3 bậc (y `mkAns` dynamics.ts:85):

```ts
export type GHAns = { label?: string; kind: string; text: string; approx: number; unit: string;
                      approximate: boolean; note?: string; queryIndex?: number };
function mkGHAns(kind, s: Scalar, floatRef: number, unit: string, label?, note?): GHAns {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol)
    return { label, kind, text: displayScalar(s), approx: exactToApprox(s.exact), unit, approximate:false, note };
  const nice = Number.isFinite(floatRef) ? recognizeConstant(floatRef) : null;   // lưới an toàn (thực tế không cần)
  return { label, kind, text: nice ? nice.text : fmtNum(floatRef), approx: floatRef, unit, approximate: !nice, note };
}
```

### 7.1. Công thức + đơn vị engine ghi (C6)

| Query | Công thức đóng (Scalar, đã về SI) | Đơn vị đáp (mặc định) |
|---|---|---|
| `state_value` isothermal, ẩn = X | nhân chéo `p₁V₁ = p₂V₂` giải X | đơn vị khai của X ở trạng thái kia (hoặc SI) |
| `state_value` isochoric, ẩn = X | `p₁T₂ = p₂T₁` giải X | như trên (T ra K, đổi về °C nếu `unit:'C'`) |
| `state_value` isobaric, ẩn = X | `V₁T₂ = V₂T₁` giải X | như trên |
| `state_value` general, ẩn = X | `p₁V₁T₂ = p₂V₂T₁` giải X | như trên |
| `clapeyron` solveFor p/V/T/amount | `p = nRT/V`, `V = nRT/p`, `T = pV/(nR)`, `n = pV/(RT)` | Pa / m³ / K / mol |
| `clapeyron` solveFor mass | `n = pV/(RT)`, `m = nM` | g (mặc định), kg nếu khai |
| `heat` from→to | Σ đoạn enthalpy (§7.2) | J |
| `equilibrium_temp` | `T_f = Σ(mᵢcᵢT0ᵢ)/Σ(mᵢcᵢ)` (T0 ra K), đổi về `unit` | °C (mặc định) / K |
| `mass_from_heat` property=mass | `m_k = −Σ_{i≠k} mᵢcᵢ(T_f−T0ᵢ) / (c_k(T_f−T0_k))` | kg / g |
| `mass_from_heat` property=c | tương tự, giải `c_k` | J/(kg·K) |

**Đổi đáp T về °C:** engine giải trong K; nếu `unit:'C'` (mặc định của equilibrium_temp) ⇒ `T_C = T_K − 273` EXACT (trừ hữu tỉ). `state_value` quantity='T' đáp theo `unit` khai (mặc định K).

### 7.2. `heat` — tổng đoạn enthalpy piecewise (chuỗi & đơn đoạn cùng một hàm)

Sắp thứ tự trên "trục enthalpy": `(solid,T) < (solid,T_nc)=(liquid,T_nc) < (liquid,T_s)=(gas,T_s) < (gas,T)` (T_nc = meltTemp, T_s = boilTemp). Engine đi từ `from` đến `to`, cộng các đoạn NẰM TRONG khoảng:
- rắn nóng lên: `m·cSolid·(min(to,T_nc) − from)` khi from ở rắn
- nóng chảy: `λ·m` nếu vượt mốc T_nc
- lỏng nóng lên: `m·cLiquid·(min(to,T_s) − max(from,T_nc))`
- hoá hơi: `L·m` nếu vượt mốc T_s
- hơi nóng lên: `m·cGas·(to − T_s)` khi to ở hơi

Đơn-pha (from.phase = to.phase, không vượt mốc) ⇒ đúng một đoạn `Q = mcΔt`. Nóng chảy thuần (from=(solid,T_nc), to=(liquid,T_nc)) ⇒ `Q = λm`. **Mọi đoạn ≥ 0** (self-check §8): from-enthalpy < to-enthalpy, else violation "chiều gia nhiệt nghịch".

## 8. Tự kiểm (checks[]) — thay-ngược + ràng buộc vật lí + certify

`EPS_SELF = 1e-6` (tương đối, `scale = max(1,|hệ số lớn nhất|)`), dùng chung trị số v0/circuit/dynamics. **Luôn chạy, ghi `checks[]` minh bạch** (F8: label scene trần, giá trị ở `answers[]`). Vì mọi thứ hữu tỉ ⇒ residual thường **exact 0** (`num===0n`), không phải bóng float.

| Loại | Kiểm |
|---|---|
| **Certify exact↔float** | mọi đáp: `|exactToApprox(exact) − floatRef| ≤ 1e-6·scale` (đã trong `mkGHAns`; …N đường độc lập) |
| **Thay-ngược quá trình** | thay X vừa giải vào luật: `p₁V₁−p₂V₂`, `p₁T₂−p₂T₁`, `V₁T₂−V₂T₁`, `p₁V₁T₂−p₂V₂T₁` = **exact 0** |
| **Thay-ngược Clapeyron** | `pV − nRT = 0` exact (với n/mass/T vừa giải) |
| **Thay-ngược cân bằng nhiệt** | `Σ mᵢcᵢ(T_f − T0ᵢ) = 0` exact (T_f vừa giải, hoặc m/c vừa giải) |
| **Miền vật lí T** | T (K) **> 0** sau đổi mọi trạng thái/nghiệm ⇒ else violation `nhiet-do-tuyet-doi-am` |
| **Miền vật lí p, V** | p, V nghiệm **> 0** ⇒ else violation `ap-suat-hoac-the-tich-am` (mô hình sai đề) |
| **t_cb trong khoảng** | `min(T0ᵢ) < T_f < max(T0ᵢ)` (nghiêm ngặt) ⇒ else violation `t-cb-ngoai-khoang` (bắt lỗi: hai vật cùng phía, đề mâu thuẫn) |
| **Khối lượng dương** | `mass_from_heat` ra `m > 0`; `m ≤ 0` ⇒ violation `khoi-luong-am` (Tf mâu thuẫn dữ kiện) |
| **Đẳng-quá-trình nhất quán** | đại lượng "hằng" khai cả hai trạng thái mà lệch ⇒ violation (§6.2) |
| **Enthalpy tăng** | `heat`: mỗi đoạn ≥ 0, from < to trên trục enthalpy ⇒ else violation `chieu-gia-nhiet-nghich` |
| **Đơn vị** | engine gắn đơn vị theo `kind` (§7.1) — `answers[].unit`; text KHÔNG nhúng đơn vị |

`PHYSICAL_VIOLATIONS = {nhiet-do-tuyet-doi-am, ap-suat-hoac-the-tich-am, t-cb-ngoai-khoang, khoi-luong-am, chieu-gia-nhiet-nghich, dang-qua-trinh-mau-thuan}` ⇒ **KHÔNG serve đáp** (mirror dynamics.ts:51). Assert-sai KHÔNG xoá đáp (engine tính đúng, chỉ dữ kiện DƯ mâu thuẫn) nhưng vẫn `ok:false`.

**Asserts khai báo** (dữ kiện DƯ của đề): chạy `assert.query`, so `|got − equals| ≤ tol·max(1,|equals|)`, `tol` mặc định `TOL_ASSERT = 1e-3` (dung nạp làm tròn của đề: "≈ 2,67 atm"). LLM override khi đề "lấy tròn". Fail ⇒ `violations` + `ok:false`.

## 9. GasHeatResult (mirror PhysicsResult §9 / DynamicsResult — bridge đa môn khớp sau)

```ts
type GasHeatResult = {
  ok: boolean;                         // violations=0 && errors=0 && mọi đáp hữu hạn && đủ số đáp
  answers: GHAns[];                    // THEO THỨ TỰ queries; {text, approx, unit, approximate, note?}
  checks: { kind: string; detail: string; residual: number; pass: boolean }[];
  violations: { assert?: string; id?: string; message: string; expected?: number; got?: number; delta?: number }[];
  errors: { message: string }[];
  geometry: GeometryData | null;       // §10 — TỐI THIỂU/tuỳ chọn (giản đồ p–V cho khí); heat = null
  meta: { atmInPa: number; unitsNote: 'SI'; knowledgeTags: string[] };
};
```

Bridge P2 (ngoài spec): `scene = result.geometry`; `trace` tổng hợp từ `checks[].detail` + `errors`; `checks`/`meta` là **mở rộng hợp lệ** (F7). `answers[].unit` do engine (C6). `runGasHeat` khung y `runDynamics.ts:32` (parse → giải → queries: lỗi ⇒ errors; check FAIL ⇒ errors + không serve; asserts ⇒ violations; PHYSICAL_VIOLATIONS ⇒ servedAnswers=[]).

## 10. Geometry (tối thiểu — điểm phân vân §14.6)

Hai chương này **KHÔNG có hình học không gian tự nhiên**. Đề xuất v1:
- **Khí:** tuỳ chọn phát giản đồ **p–V** 2D: 2 điểm trạng thái (V→trục x, p→trục z) map `(V,0,p)` theo quy ước z-đứng physics v0, + đường quá trình (`Curve3D {type:'expr', plane:'xz', params:{}, samples}` — đẳng nhiệt = hyperbol `p=p₁V₁/V`; đẳng tích/áp = đoạn thẳng). `params:{}` BẮT BUỘC (F9). Label điểm **trần** ("Trạng thái 1"/"Trạng thái 2" — KHÔNG nhúng giá trị, F8).
- **Nhiệt:** `geometry = null` (không hình) — đáp ở `answers[]`.

Vì giá trị số đã ở `answers[]`, geometry chỉ minh hoạ. **Có thể cắt HẲN ở v1** (chỉ `answers[]`, như dc-circuit để `circuitLayout` draft) nếu phản biện muốn giảm bề mặt — ghi §14.6.

## 11. Tags 4 tầng — registry (bridge P0 merge; F10 isKnownTag)

Plan mang `knowledgeTags`; bridge lọc theo registry rồi merge `scene.tags` (KHÔNG tự chế tag). Hai nhánh chương (khớp cấu trúc GDPT 2018 lớp 12):

| Tag | Dạng bài | Bài |
|---|---|---|
| `ly/12/khi-ly-tuong/dang-nhiet` | Boyle `p₁V₁=p₂V₂` (kể cả bọt khí) | G1, G2 |
| `ly/12/khi-ly-tuong/dang-tich` | Charles `p/T` | G3 |
| `ly/12/khi-ly-tuong/dang-ap` | Gay-Lussac `V/T` | G4 |
| `ly/12/khi-ly-tuong/phuong-trinh-trang-thai` | `p₁V₁/T₁=p₂V₂/T₂` | G5, G10 |
| `ly/12/khi-ly-tuong/phuong-trinh-clapeyron` | `pV=nRT`, khối lượng↔mol | G6 |
| `ly/12/vat-ly-nhiet/nhiet-luong` | `Q=mcΔt` | (thành phần) |
| `ly/12/vat-ly-nhiet/can-bang-nhiet` | `Q_toả=Q_thu` | G7, G8 |
| `ly/12/vat-ly-nhiet/chuyen-the` | `Q=λm`, `Q=Lm`, chuỗi đá→hơi | G9 |

## 12. MƯỜI BÀI CONTRACT (G1–G10) — đáp tính TAY từng bước, đã chạy máy (Fraction) đối chứng 10/10

> File test `gasHeat-contract.test.ts`. Số liệu kiểu SGK/đề thi VN. **Đã reimplement bằng `fractions.Fraction` và chạy — mọi `text`/`approx` dưới đây là output THẬT của đường hữu tỉ**; mọi residual thay-ngược = **0 exact**. `R = 831/100`, °C→K bằng **+273** (GDPT 2018). Không bài nào rời ℚ (radicand luôn = 1).

---
### G1 — Đẳng nhiệt (Boyle), nén khí — tìm V₂ (đáp phân số)
**Đề:** "Một lượng khí lí tưởng ở nhiệt độ không đổi có thể tích 6 lít, áp suất 2 atm. Nén đẳng nhiệt tới khi áp suất bằng 5 atm. Tính thể tích khí lúc sau."
```json
{ "problemName":"dang-nhiet-nen", "knowledgeTags":["ly/12/khi-ly-tuong/dang-nhiet"],
  "ops":[{"op":"state","name":"s1","p":{"value":2,"unit":"atm"},"V":{"value":6,"unit":"L"}},
         {"op":"state","name":"s2","p":{"value":5,"unit":"atm"}},
         {"op":"process","kind":"isothermal","from":"s1","to":"s2"}],
  "queries":[{"kind":"state_value","of":"s2","quantity":"V","unit":"L"}] }
```
**Tính tay:** `p₁V₁=p₂V₂` ⇒ `V₂ = p₁V₁/p₂ = 2·6/5 = 12/5 = 2,4 lít`. Thay ngược: `2·6 = 5·(12/5) = 12` ✓. exact `text:"12/5"`, `approx:2.4`, `unit:"L"`, `approximate:false`.

---
### G2 — Đẳng nhiệt: BỌT KHÍ nổi từ đáy hồ (engine tính p₀+ρgh) — tìm V₂
**Đề:** "Một bọt khí ở đáy hồ sâu 10 m nổi lên tới mặt nước, coi nhiệt độ không đổi. Thể tích bọt khí ở đáy là 1 cm³. Áp suất khí quyển p₀ = 10⁵ Pa, khối lượng riêng nước 1000 kg/m³, g = 10 m/s². Tính thể tích bọt khí khi lên mặt nước."
```json
{ "problemName":"bot-khi-day-ho", "knowledgeTags":["ly/12/khi-ly-tuong/dang-nhiet"],
  "ops":[{"op":"state","name":"day","pFromDepth":{"atmosphere":{"value":100000,"unit":"Pa"},
            "depth":{"value":10,"unit":"m"},"density":{"value":1000},"g":10},"V":{"value":1,"unit":"cm3"}},
         {"op":"state","name":"mat","p":{"value":100000,"unit":"Pa"}},
         {"op":"process","kind":"isothermal","from":"day","to":"mat"}],
  "queries":[{"kind":"state_value","of":"mat","quantity":"V","unit":"cm3"}] }
```
**Tính tay:** engine tính áp đáy `p_đáy = p₀+ρgh = 10⁵ + 1000·10·10 = 10⁵+10⁵ = 2·10⁵ Pa` (LLM KHÔNG tự nhân). `p_đáy·V_đáy = p_mặt·V₂` ⇒ `V₂ = 2·10⁵·1/10⁵ = 2 cm³`. Thay ngược `2·10⁵·1 = 10⁵·2` ✓. exact `text:"2"`, `approx:2`, `unit:"cm3"`. *(check phụ: p_đáy = 200000 Pa ghi vào `checks[]` minh bạch.)*

---
### G3 — Đẳng tích (Charles), nung nóng — tìm p₂ (°C→K, đáp phân số)
**Đề:** "Một bình kín thể tích không đổi chứa khí ở 27°C, áp suất 2 atm. Nung nóng bình tới 127°C. Tính áp suất khí trong bình."
```json
{ "problemName":"dang-tich-nung", "knowledgeTags":["ly/12/khi-ly-tuong/dang-tich"],
  "ops":[{"op":"state","name":"s1","p":{"value":2,"unit":"atm"},"T":{"value":27,"unit":"C"}},
         {"op":"state","name":"s2","T":{"value":127,"unit":"C"}},
         {"op":"process","kind":"isochoric","from":"s1","to":"s2"}],
  "queries":[{"kind":"state_value","of":"s2","quantity":"p","unit":"atm"}] }
```
**Tính tay:** engine đổi `T₁ = 27+273 = 300 K`, `T₂ = 127+273 = 400 K` (+273 EXACT). `p₁/T₁ = p₂/T₂` ⇒ `p₂ = p₁T₂/T₁ = 2·400/300 = 8/3 atm ≈ 2,667 atm`. Thay ngược `p₁T₂ − p₂T₁ = 2·400 − (8/3)·300 = 800−800 = 0` ✓. exact `text:"8/3"`, `approx:2.6667`, `unit:"atm"`, `approximate:false`. (p₂ > p₁ hợp lí khi nung.)

---
### G4 — Đẳng áp (Gay-Lussac), đun nóng — tìm V₂ (°C→K)
**Đề:** "Một lượng khí ở áp suất không đổi. Ở 27°C thể tích là 3 lít. Đun nóng khí tới 87°C. Tính thể tích khí."
```json
{ "problemName":"dang-ap-dun", "knowledgeTags":["ly/12/khi-ly-tuong/dang-ap"],
  "ops":[{"op":"state","name":"s1","V":{"value":3,"unit":"L"},"T":{"value":27,"unit":"C"}},
         {"op":"state","name":"s2","T":{"value":87,"unit":"C"}},
         {"op":"process","kind":"isobaric","from":"s1","to":"s2"}],
  "queries":[{"kind":"state_value","of":"s2","quantity":"V","unit":"L"}] }
```
**Tính tay:** `T₁=300 K`, `T₂=87+273=360 K`. `V₁/T₁=V₂/T₂` ⇒ `V₂ = 3·360/300 = 18/5 = 3,6 lít`. Thay ngược `V₁T₂ − V₂T₁ = 3·360 − (18/5)·300 = 1080−1080 = 0` ✓. exact `text:"18/5"`, `approx:3.6`, `unit:"L"`.

---
### G5 — Phương trình trạng thái (tổng quát) — tìm V₂
**Đề:** "Một lượng khí ở áp suất 1 atm, thể tích 10 lít, nhiệt độ 27°C. Nén và đun tới áp suất 2 atm, nhiệt độ 87°C. Tính thể tích khí lúc sau."
```json
{ "problemName":"trang-thai-tong-quat", "knowledgeTags":["ly/12/khi-ly-tuong/phuong-trinh-trang-thai"],
  "ops":[{"op":"state","name":"s1","p":{"value":1,"unit":"atm"},"V":{"value":10,"unit":"L"},"T":{"value":27,"unit":"C"}},
         {"op":"state","name":"s2","p":{"value":2,"unit":"atm"},"T":{"value":87,"unit":"C"}},
         {"op":"process","kind":"general","from":"s1","to":"s2"}],
  "queries":[{"kind":"state_value","of":"s2","quantity":"V","unit":"L"}] }
```
**Tính tay:** `T₁=300`, `T₂=360`. `p₁V₁/T₁ = p₂V₂/T₂` ⇒ `V₂ = p₁V₁T₂/(T₁p₂) = 1·10·360/(300·2) = 3600/600 = 6 lít`. Thay ngược `p₁V₁T₂ − p₂V₂T₁ = 1·10·360 − 2·6·300 = 3600−3600 = 0` ✓. exact `text:"6"`, `approx:6`, `unit:"L"`.

---
### G6 — Clapeyron `pV=nRT` — tìm KHỐI LƯỢNG (đáp phân số, khoe exact)
**Đề:** "Một bình thể tích 8,31 lít chứa khí oxygen (O₂, M = 32 g/mol) ở 27°C, áp suất 10⁵ Pa. Tính khối lượng khí oxygen trong bình. Cho R = 8,31 J/(mol·K)."
```json
{ "problemName":"clapeyron-khoi-luong", "knowledgeTags":["ly/12/khi-ly-tuong/phuong-trinh-clapeyron"],
  "ops":[{"op":"state","name":"binh","p":{"value":100000,"unit":"Pa"},"V":{"value":8.31,"unit":"L"},
          "T":{"value":27,"unit":"C"},"molarMass":{"value":32}}],
  "queries":[{"kind":"clapeyron","of":"binh","solveFor":"amount","unit":"mol","label":"a"},
             {"kind":"clapeyron","of":"binh","solveFor":"mass","unit":"g","label":"b"}] }
```
**Tính tay:** về SI `p=10⁵ Pa`, `V=8,31 L=8,31·10⁻³ m³`, `T=300 K`, `R=831/100`. `pV = 10⁵·8,31·10⁻³ = 831 J`; `RT = (831/100)·300 = 2493`. a) `n = pV/(RT) = 831/2493 = 1/3 mol`. b) `m = nM = (1/3)·32 = 32/3 g ≈ 10,67 g`. Thay ngược `pV − nRT = 831 − (1/3)·2493 = 831−831 = 0` ✓. a) exact `"1/3"`, `approx:0.3333`, `unit:"mol"`; b) exact `"32/3"`, `approx:10.6667`, `unit:"g"`, `approximate:false`. **Điểm khoe: máy tính bỏ túi cho 10,6666…; engine giữ 32/3 chính xác.**

---
### G7 — Cân bằng nhiệt — tìm t_cb (2 vật)
**Đề:** "Trộn 2 kg nước ở 80°C với 3 kg nước ở 20°C. Nhiệt dung riêng của nước 4200 J/(kg·K). Bỏ qua nhiệt lượng trao đổi với môi trường. Tính nhiệt độ khi cân bằng nhiệt."
```json
{ "problemName":"can-bang-nhiet-tcb", "knowledgeTags":["ly/12/vat-ly-nhiet/can-bang-nhiet"],
  "ops":[{"op":"thermal_body","name":"nong","mass":{"value":2,"unit":"kg"},"c":{"value":4200},"T0":{"value":80,"unit":"C"}},
         {"op":"thermal_body","name":"lanh","mass":{"value":3,"unit":"kg"},"c":{"value":4200},"T0":{"value":20,"unit":"C"}}],
  "queries":[{"kind":"equilibrium_temp","unit":"C"}] }
```
**Tính tay:** `Q_toả = Q_thu`: `2·4200·(80−t) = 3·4200·(t−20)` ⇒ `2(80−t)=3(t−20)` ⇒ `160−2t=3t−60` ⇒ `5t=220` ⇒ `t = 44°C`. Kiểm miền `20 < 44 < 80` ✓. Thay ngược `Σ mᵢcᵢ(t−T0ᵢ) = 2·4200·(44−80)+3·4200·(44−20) = −302400+302400 = 0` ✓. exact `text:"44"`, `approx:44`, `unit:"C"`.

---
### G8 — Cân bằng nhiệt — tìm KHỐI LƯỢNG (thả sắt nóng vào nước; đáp phân số)
**Đề:** "Thả một miếng sắt đã nung tới 100°C vào 2 kg nước ở 20°C. Khi cân bằng, nhiệt độ hệ là 25°C. Nhiệt dung riêng sắt 460 J/(kg·K), nước 4200 J/(kg·K). Bỏ qua trao đổi nhiệt với môi trường. Tính khối lượng miếng sắt."
```json
{ "problemName":"can-bang-nhiet-tim-m", "knowledgeTags":["ly/12/vat-ly-nhiet/can-bang-nhiet"],
  "ops":[{"op":"thermal_body","name":"sat","c":{"value":460},"T0":{"value":100,"unit":"C"}},
         {"op":"thermal_body","name":"nuoc","mass":{"value":2,"unit":"kg"},"c":{"value":4200},"T0":{"value":20,"unit":"C"}}],
  "queries":[{"kind":"mass_from_heat","of":"sat","property":"mass","Tf":{"value":25,"unit":"C"},"unit":"kg"}] }
```
**Tính tay:** `m·460·(100−25) = 2·4200·(25−20)` ⇒ `m·460·75 = 2·4200·5` ⇒ `m·34500 = 42000` ⇒ `m = 42000/34500 = 28/23 kg ≈ 1,22 kg`. Kiểm `Tf=25` nằm giữa `20` và `100` ✓; `m>0` ✓. Thay ngược `28/23·460·75 − 42000 = 42000−42000 = 0` ✓. exact `text:"28/23"`, `approx:1.2174`, `unit:"kg"`, `approximate:false`. **Đáp phân số hữu tỉ — engine giữ chính xác, không làm tròn.**

---
### G9 — Chuỗi ĐÁ → NƯỚC → HƠI (cộng đoạn)
**Đề:** "Tính nhiệt lượng cần cung cấp để biến 0,1 kg nước đá ở −10°C thành hơi nước hoàn toàn ở 100°C. Cho nhiệt dung riêng của nước đá 2100 J/(kg·K), của nước 4200 J/(kg·K), nhiệt nóng chảy riêng của nước đá λ = 3,4·10⁵ J/kg, nhiệt hóa hơi riêng của nước L = 2,3·10⁶ J/kg."
```json
{ "problemName":"chuoi-da-nuoc-hoi", "knowledgeTags":["ly/12/vat-ly-nhiet/chuyen-the"],
  "ops":[{"op":"thermal_body","name":"H2O","mass":{"value":0.1,"unit":"kg"},
          "cSolid":{"value":2100},"cLiquid":{"value":4200},
          "meltTemp":{"value":0,"unit":"C"},"boilTemp":{"value":100,"unit":"C"},
          "latentMelt":{"value":340000},"latentVapor":{"value":2300000}}],
  "queries":[{"kind":"heat","of":"H2O",
              "from":{"phase":"solid","temp":{"value":-10,"unit":"C"}},
              "to":{"phase":"gas","temp":{"value":100,"unit":"C"}}}] }
```
**Tính tay (4 đoạn):** ① đá −10→0: `0,1·2100·10 = 2100 J`; ② nóng chảy: `λm = 3,4·10⁵·0,1 = 34000 J`; ③ nước 0→100: `0,1·4200·100 = 42000 J`; ④ hóa hơi: `Lm = 2,3·10⁶·0,1 = 230000 J`. Tổng `Q = 2100+34000+42000+230000 = 308100 J = 308,1 kJ`. Mỗi đoạn ≥0 ✓ (chiều gia nhiệt thuận). exact `text:"308100"`, `approx:308100`, `unit:"J"`. *(4 đoạn ghi `checks[]` minh bạch.)*

---
### G10 — BẪY ĐỔI ĐƠN VỊ (m³ vs lít, °C→K) — phương trình trạng thái tìm p₂
**Đề:** "Một lượng khí có thể tích 2 m³, áp suất 10⁵ Pa, nhiệt độ 27°C. Nén khí tới thể tích 500 lít, nhiệt độ 87°C. Tính áp suất khí lúc này."
```json
{ "problemName":"bay-doi-don-vi", "knowledgeTags":["ly/12/khi-ly-tuong/phuong-trinh-trang-thai"],
  "ops":[{"op":"state","name":"s1","p":{"value":100000,"unit":"Pa"},"V":{"value":2,"unit":"m3"},"T":{"value":27,"unit":"C"}},
         {"op":"state","name":"s2","V":{"value":500,"unit":"L"},"T":{"value":87,"unit":"C"}},
         {"op":"process","kind":"general","from":"s1","to":"s2"}],
  "queries":[{"kind":"state_value","of":"s2","quantity":"p","unit":"Pa"}] }
```
**Tính tay (bẫy: 2 m³ ≠ 2 lít; phải quy đồng):** engine đổi `V₂ = 500 L = 0,5 m³` (nếu ai đó quên đổi → sai gấp bội). `T₁=300 K`, `T₂=360 K`. `p₂ = p₁V₁T₂/(T₁V₂) = 10⁵·2·360/(300·0,5) = 10⁵·720/150 = 4,8·10⁵ Pa = 480000 Pa`. Thay ngược `p₁V₁T₂ − p₂V₂T₁ = 10⁵·2·360 − 480000·0,5·300 = 7,2·10⁷ − 7,2·10⁷ = 0` ✓. exact `text:"480000"`, `approx:480000`, `unit:"Pa"`. **Bẫy được engine xử qua khai unit; LLM KHÔNG đổi tay.**

---
### Bảng tổng hợp 10 bài (đã chạy máy — cột "Đáp exact" là output THẬT của đường hữu tỉ)

| # | Dạng (tag) | Ẩn hỏi | Đáp exact | ≈ | approximate |
|---|---|---|---|---|---|
| G1 | Đẳng nhiệt nén | V₂ | `12/5` | 2,4 L | false |
| G2 | Đẳng nhiệt — bọt khí đáy hồ (p₀+ρgh) | V₂ | `2` | 2 cm³ | false |
| G3 | Đẳng tích nung | p₂ | `8/3` | 2,667 atm | false |
| G4 | Đẳng áp đun | V₂ | `18/5` | 3,6 L | false |
| G5 | Phương trình trạng thái | V₂ | `6` | 6 L | false |
| G6 | Clapeyron pV=nRT (tìm m) | n; m | `1/3`; `32/3` | 0,333 mol; 10,67 g | false |
| G7 | Cân bằng nhiệt (tìm t_cb) | t_cb | `44` | 44 °C | false |
| G8 | Cân bằng nhiệt (thả sắt, tìm m) | m | `28/23` | 1,22 kg | false |
| G9 | Chuỗi đá→nước→hơi | Q | `308100` | 308,1 kJ | false |
| G10 | Bẫy đổi đơn vị (m³/L, °C→K) | p₂ | `480000` | 4,8·10⁵ Pa | false |

**10/10 exact** (`approximate:false`), phủ đúng yêu cầu task: 2 đẳng nhiệt (G1 + G2 bọt khí) · 1 đẳng tích (G3) · 1 đẳng áp (G4) · 1 trạng thái tổng quát (G5) · 1 Clapeyron tính khối lượng (G6) · 2 cân bằng nhiệt (G7 tìm t_cb + G8 thả sắt tìm m) · 1 chuỗi đá→nước→hơi (G9) · 1 bẫy đổi đơn vị (G10). Mọi residual thay-ngược = 0 EXACT. Không bài nào rời ℚ (radicand = 1) ⇒ không đụng `sqrt`/`solver1d`/trần radicand.

## 13. Rủi ro & giảm thiểu

- **R1 — LLM tự tính hộ engine** (tự cộng 273, tự đổi 500 L→0,5 m³, tự nhân ρgh, tự chia pV/RT): schema chỉ nhận `{value,unit}` + `pFromDepth` khai thô; KHÔNG field nộp T-đã-Kelvin / p-đáy / n / đáp. Engine đổi °C→K, đổi đơn vị, tính thuỷ tĩnh. Few-shot cấm (P2).
- **R2 — Mô hình phi vật lí lọt lưới** (T≤0 K, p/V≤0, t_cb ngoài khoảng, m<0): §8 ràng buộc + `PHYSICAL_VIOLATIONS` ⇒ KHÔNG serve. t_cb-giữa-khoảng bắt lỗi "hai vật cùng phía / đề mâu thuẫn".
- **R3 — Cân bằng nhiệt CÓ chuyển thể (phi tuyến) bị ép vào tuyến tính:** superRefine §6.3 chặn body có latent-props trong `equilibrium_temp`/`mass_from_heat` ⇒ abstain (ghi §3.2). Chuyển thể chỉ ở `heat` một chất.
- **R4 — exact giả** (số học ra phân số đẹp SAI): mọi đáp qua `certifyScalar` đối chiếu float ĐỘC LẬP (`…N`) + thay-ngược residual exact. Vì hữu tỉ thuần, residual = `num===0n` (0 đúng nghĩa).
- **R5 — atm↔Pa nhập nhằng (101325 vs 10⁵):** `plan.atmInPa` khai tường minh; 10 bài không trộn atm↔Pa nên miễn nhiễm. Nếu đề trộn mà không khai ⇒ mặc định 101325 + ghi `note` để bridge cảnh báo.
- **R6 — Mất exact do nhập số nhỏ thô:** ép mantissa+unit (§5.3); test có case `{8.31,'L'}` (giữ exact) đối chứng `8.31e-3` thô.
- **R7 — Đơn vị đáp lệch ý đề** (giải SI, đề muốn atm): `query.unit` + round-trip hữu tỉ; test khoá cả hai chiều (G1 ra L, G3 ra atm, G10 ra Pa).

## 14. Điểm phân vân cho phản biện (trước khi code)

1. **[Hiển thị lũy thừa 10 / phân số]** `displayScalar` trần cho `8/3`, `28/23`, `32/3` (ĐẸP, tự nhiên cho chương này) nhưng `480000`/`308100` để nguyên (đề Lý hay viết `4,8·10⁵`, `308,1 kJ`). efield §14.1 nêu `displayEField` (khoa học hoá) — **lệch phán quyết wave2 (b)** "thập phân là việc bridge". **Chọn:** (A) dùng chung helper `displayEField` NẾU phản biện efield chốt (A); (B) giữ `displayScalar` trần + `approx`, đẩy khoa-học-hoá sang bridge. Đề nghị **theo kết luận của efield** để đồng bộ hệ (không tự quyết riêng). Về GIÁ TRỊ không có phân vân (exact luôn ở `exact`+`approx`).
2. **[Áp suất thuỷ tĩnh — `pFromDepth` có xứng đưa vào v1?]** Chỉ 1 dạng bài dùng (bọt khí) nhưng task YÊU CẦU bài này. Cách rẻ: `pFromDepth` khai thô, engine nhân `ρgh` + cộng. Có nên tổng quát hơn (`pFromGauge` cho "áp kế chỉ…", "áp suất dư") hay giữ đúng bọt-khí? Đề nghị giữ tối thiểu `pFromDepth`, mở rộng v2.
3. **[Trộn ba đẳng-quá-trình trong MỘT plan]** Bài "nung đẳng tích rồi dãn đẳng áp" (2 quá trình nối tiếp, 3 trạng thái) — v1 schema cho nhiều `process`? Đề nghị **v1 chỉ một `process`/plan** (một chặng), chuỗi nhiều chặng → v2 (LLM tách câu hoặc bridge nối). Xin chốt.
4. **[Nguyên lí I NĐLH]** Có nên thêm `internal_energy`/`work_gas` (`A=pΔV` đẳng áp, `ΔU=A+Q`) vào v1 không? Task ghi NGOÀI phạm vi (động cơ/chu trình) nhưng ΔU=Q+A cho một quá trình đơn là "nhiệt" cơ bản GDPT 2018. Đề nghị **để v1.1** (giữ core 3 đẳng-quá-trình + Clapeyron + calorimetry), tránh phình. Xin xác nhận.
5. **[Đơn vị R & +273]** Chốt `R = 8,31` (831/100) và `+273` (không 8,314 / 273,15) theo SGK GDPT 2018 — nếu đề cho R hay mốc khác, có nên cho `plan.R`/`plan.zeroCelsiusK` override? Đề nghị cho `plan.R` optional (default 831/100), `+273` cứng (đề VN thống nhất).
6. **[Geometry]** §10: phát giản đồ p–V tối thiểu cho khí, `null` cho nhiệt — hay CẮT HẲN geometry ở v1 (chỉ `answers[]`) cho gọn (như dc-circuit)? Hai chương này không có hình không gian; nghiêng cắt hẳn, giữ chỗ `tags`.
7. **[`heat` gộp mọi Q vào một query]** `heat(from→to)` phủ `Q=mcΔt`, `λm`, `Lm`, chuỗi — gọn nhưng đòi khai `phase` ở from/to. Có nên tách `heat_sensible`/`heat_latent` cho few-shot dễ? Đề nghị **giữ một `heat`** (một mặt phẳng ngữ nghĩa), few-shot 3 ví dụ.
8. **[`mass_from_heat` mở rộng property c/T0]** Task nêu ẩn "t_cb/m/c". `equilibrium_temp` lo t_cb; `mass_from_heat` (property∈{mass,c,T0}) lo phần còn lại — tên query hơi hẹp so với chức năng. Giữ tên `mass_from_heat` (khớp task) hay đổi `unknown_from_balance`? Đề nghị giữ tên task, field `property` mở.

## 15. Tiêu chí thành công

1. 10 bài §12 chạy qua `runGasHeat` ra ĐÚNG đáp tính tay (`text` + `approx` + `unit`), **10/10 `approximate:false`**, phân số đúng chỗ (G1 12/5, G3 8/3, G6 32/3, G8 28/23), °C→K +273 đúng (G3/G4/G5/G6/G10), bọt khí p₀+ρgh đúng (G2), bẫy L↔m³ đúng (G10).
2. Mọi đáp có `checks[]` certify + thay-ngược **residual = 0 exact**; ràng buộc vật lí (T>0 K, p,V>0, t_cb∈(min,max), m>0) pass; `PHYSICAL_VIOLATIONS` ⇒ không serve; assert dữ-kiện-dư sai ⇒ `violations` + `ok:false`.
3. superRefine từ chối: >1 hoặc 0 ẩn cho quá trình; body có latent-props trong `equilibrium_temp` (chặn phi tuyến); ref sai loại — test 1 ca mỗi loại → issue rõ tiếng Việt.
4. `R=rat(831n,100n)` exact; test khẳng định KHÔNG import `solver1d`, KHÔNG gọi `sqrt`, mọi đáp radicand = 1.
5. KHÔNG file có sẵn nào đổi (git status chỉ thấy `physics/gasHeat*.ts` + test + spec này); test cũ XANH nguyên, chỉ CỘNG test mới; `tsconfig.kernel.json` phủ `gasHeat*.ts`.
