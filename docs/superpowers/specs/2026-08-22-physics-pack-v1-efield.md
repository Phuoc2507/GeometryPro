# Physics Pack v1 — ĐIỆN TRƯỜNG lớp 11 (GDPT 2018) — Design Spec

**Ngày:** 2026-08-22
**Trạng thái:** DỰ THẢO — CHỜ PHẢN BIỆN (viết song song nhiều pack; spec này bị phản biện TRƯỚC khi code).
**Phạm vi file:** CHỈ THÊM `api/_lib/kernel/physics/efield*.ts` + test. KHÔNG sửa bất kỳ file có sẵn nào (kể cả `kinematics.ts`, `planSchema.ts`, `circuit*.ts`, `index.ts`, `run*.ts`). Pack độc lập, entry riêng `runEfield`.
**Đã đọc nền:** `2026-08-21-physics-pack-design.md` (engine exact scalar hữu tỉ + một căn, certify, unit per-quantity), `2026-08-21-arch-physics-review-phien1.md` (F2 unit exact, F8 label trần, F9 params, C8 EXACT_TRIG→`trigOf`), `2026-08-21-wave2-specs-review.md` (3 phán quyết chung: **label không nhúng giá trị**, **thập phân là việc bridge/UI, engine exact-first**, **chính tả field query `value`/`vUnit`/`component` theo v0**), `MERGE-BRIEF.md`. Đã đọc CODE: `scalar.ts`, `kinematics.ts`, `solver1d.ts`, `recognize.ts`, `compute/answer.ts`, `circuit*.ts`.

---

## 1. Mục tiêu (một câu)

Giữ nguyên nguyên tắc geo3d/physics-v0 cho chương **Điện trường lớp 11**: **LLM chỉ DỊCH đề → EFieldPlan JSON (khai điện tích/điện trường + câu hỏi); ENGINE tất định TÍNH bằng công thức đóng trên số học exact (hữu tỉ + một căn), TỰ KIỂM bằng thay-ngược + chứng chỉ đối xứng, và GHI đơn vị vào từng đáp.** Không bịa đáp số: cấu hình vector ngoài lớp exact-được ⇒ schema từ chối (abstain), không phục vụ số gần đúng giả danh chính xác.

## 2. Vì sao dựng được gọn (tái dùng gần hết — KHÔNG thêm máy móc scalar)

| Cần | Đã có sẵn (đã đọc code) | Dùng lại thế nào |
|---|---|---|
| Số lớn `k = 9·10⁹`, tích/thương lũy thừa 10 | `scalar.ts`: `Exact = {num: bigint, den: bigint, radicand: number}` — **num/den là BigInt (chính xác tùy ý)** | `k = rat(9000000000n)` exact; mọi tích `k·q₁·q₂/r²` ở lại trong ℚ (radicand=1) ⇒ exact 100%. Xem §5. |
| Đáp căn đẹp (`300000√3`, `2√5/5`) | `Exact` một-căn + `sqrtExact`/`mulExact`/`addExact` | Chồng chất tam giác đều, tốc độ `√(2ad)` ra căn exact |
| Thập phân đề → hữu tỉ | `scalarFromNumber` (kinematics.ts:13) — `≤9` chữ lẻ → ℚ chính xác | Mantissa điện tích (`5,4`), khoảng cách (`0,03`) → hữu tỉ; **KHÔNG feed số nhỏ hơn `1e-9` thô** (§5.3) |
| Đổi đơn vị EXACT (F2/D1) | mẫu `convertQty`/`qtyLength` (kinematics.ts:32-54) — bảng factor hữu tỉ | `qtyCharge`/`qtyField`/`qtyVoltage`/`qtyMass` cùng khuôn: `μC→1/10⁶`, `V/cm→100`, `g→1/1000` — lũy thừa 10 do **factor hữu tỉ** gánh, không phá exact |
| cos/sin góc đẹp exact | `trigOf(deg)` (kinematics.ts:66) — `{0,±30,±45,±60,±90}` exact, khác → float | Chồng chất đối xứng (góc giữa hai `E_i` là góc đẹp) |
| Giải bậc ≤ 2 exact | `solveQuadratic` (solver1d.ts:9) | Điểm cường độ điện trường triệt tiêu (null-point) 2 điện tích; khoảng cân bằng |
| Nhận dạng căn từ float | `recognizeConstant` (recognize.ts:58) — ℚ, `a√b/c`, `p+q√r` | Cứu khi `sqrtExact` vượt trần `radicand` (đáp `μC` thang lớn) — vẫn ra `a√b`, `approximate:false` |
| Chứng nhận exact ↔ float ĐỘC LẬP | `certifyScalar`/`cmpScalar`/`isZeroS` (answer.ts:124/139/133) | Mọi đáp đối chiếu bản float tính đường riêng (`…N`), lệch > `1e-6·scale` ⇒ bỏ exact |
| Khuôn pack physics phụ | `circuit*.ts` (schema/thuần/compute tách 3 tầng, `mkAns` 3 bậc, `…N` float độc lập, `EPS_SELF=1e-6`, entry riêng) | Sao khuôn y hệt cho `efield*.ts` |

**Nhận xét then chốt:** toàn bộ chương điện trường phổ thông là **đại số hữu tỉ + một căn** (`F=kq₁q₂/r²`, `E=kQ/r²`, `A=qEd`, `U=Ed`, `W=qU`, `qE=mg`, `v=√(2ad)`). `r²` (bình phương khoảng cách) **khử căn** ⇒ lực/cường độ điện trường điểm là HỮU TỈ; chỉ chồng chất đối xứng mới sinh một căn (`√3`) — vẫn trong trường của `Scalar`. ⇒ **không cần kiểu số mới, không cần "lũy thừa 10 tách riêng"**; BigInt của `Exact` đã gánh trọn (§5).

## 3. Phạm vi

### 3.1. TRONG phạm vi (v1) — dạng bài phủ

| Dạng bài | Op khai | Query | Đáp mẫu |
|---|---|---|---|
| Lực Coulomb 2 điện tích điểm `F=kq₁q₂/(ε·r²)` | 2× `point_charge` | `coulomb_force` | C1 (40 N), C2 (5,4·10⁻⁴ N) |
| Cường độ điện trường 1 điện tích `E=kQ/(ε·r²)` | 1× `point_charge` | `field_at` | C3 (9·10⁵ V/m), C4 (1,44·10⁵ V/m, r vô tỉ) |
| Lực lên điện tích thử `F=qE` (trường điểm) | `point_charge` | `force_on_test` | (thành phần bài tổng hợp) |
| Chồng chất **thẳng hàng** (2–3 điện tích + điểm cùng một đường) | ≥2 `point_charge` | `field_at` | C5 (1,8·10⁵ V/m) |
| Chồng chất **đối xứng góc đẹp** (2 điện tích `\|q\|` bằng nhau, điểm trên trung trực; tam giác đều/vuông cân/3-4-5) | 2 `point_charge` | `field_at` | C6 (3·10⁵·√3 V/m) |
| Công lực điện đều `A=qEd` | `uniform_field` + `charged_body` | `work` | C7 (10⁻⁴ J) |
| Hiệu điện thế `U=Ed`, thế năng `W=qU` | `uniform_field` + `charged_body` | `voltage`, `potential_energy` | C8 (80 V; 4·10⁻⁶ J) |
| Điện tích trong điện trường đều — **cân bằng** `qE=mg` | `uniform_field` + `charged_body(mass)` | `equilibrium_field` | C9 (10⁵ V/m) |
| Điện tích trong điện trường đều — **chuyển động** (nối động học: `a=qE/m`, `v=√(2qEd/m)`) | `uniform_field` + `charged_body(mass)` | `acceleration`, `speed_after` | C10 (a=10; v=2√5/5) |
| (tuỳ chọn) Điện thế điểm `V=ΣkQ/r` — sạch nhất khi thẳng hàng | `point_charge` | `potential_at` | §8.2 (ghi optional) |
| (tuỳ chọn) Môi trường điện môi `ε` (dầu, nước…) | `plan.epsilon` | mọi query trường điểm | `k_eff = k/ε` exact |

### 3.2. NGOÀI phạm vi (ghi rõ — YAGNI + "thà ít mà đúng")

- **Phân bố điện tích liên tục** (thanh, vòng, đĩa, mặt cầu tích điện) — cần tích phân trường, không đóng exact phổ thông.
- **Tụ điện** (điện dung `C=Q/U`, năng lượng `½CU²`, ghép tụ nối tiếp/song song, nạp/xả) — **để CHƯƠNG RIÊNG** (`physics-pack-v1-capacitor`). *Lưu ý ranh giới:* "hai bản kim loại song song tạo **điện trường đều**" là NGUỒN trường đều (trong phạm vi, khai `uniform_field.fromVoltage`); nhưng bản thân **tụ như linh kiện tích điện** (Q, C, năng lượng) là ngoài phạm vi.
- **Cấu hình vector bất kỳ không đối xứng** (3 điện tích tam giác lệch, điểm ngoài trục đối xứng) mà hợp lực có các căn **khác radicand không cộng được** ⇒ schema TỪ CHỐI (superRefine, §7.3) → LLM abstain. Engine KHÔNG phục vụ số float giả danh exact cho lớp này.
- **Điện trường không đều phức tạp** (ngoài chồng chất điện tích điểm), đường sức cong, thế năng tương tác nhiều điện tích (`W=Σkqᵢqⱼ/rᵢⱼ` — có thể là v2 nhỏ, ghi §14).
- **Thang electron/proton** (`e=1,6·10⁻¹⁹ C`, `mₑ=9,1·10⁻³¹ kg`): xem §14 điểm phân vân — kỹ thuật LÀM ĐƯỢC (BigInt) nhưng chạm giới hạn HIỂN THỊ; v1 mặc định trần `pC`.
- **Cảm ứng điện, điện thế do vật dẫn, năng lượng điện trường** — ngoài chương.

## 4. Kiến trúc & file (soi gương `circuit*.ts` — pack phụ độc lập)

```
api/_lib/kernel/physics/
  efieldSchema.ts   — EFieldPlanSchema (zod): units, epsilon, ops, queries, asserts,
                      knowledgeTags + superRefine (tên duy nhất, ref tồn tại, GATE thẳng-hàng/đối-xứng §7.3)
  efield.ts         — THUẦN (Scalar): hằng K; qtyCharge/qtyField/qtyVoltage/qtyMass (đổi unit exact);
                      vector 2D Scalar (VecS); fieldAtPoint(Σ), coulombForce, forceOnTest;
                      + CẶP FLOAT ĐỘC LẬP (…N) cho mọi hàm; EPS_SELF; chứng chỉ đối xứng (perpComp)
  efieldCompute.ts  — mỗi query → công thức đóng + mkEAns (3 bậc: certify → recognize → fmtNum
                      + LUẬT HIỂN THỊ §6); computeEFieldQuery
  runEfield.ts      — entry runEfield(raw): parse → build entities → queries → asserts → self-check → EFieldResult
  __tests__/
    efield.test.ts  efieldCompute.test.ts  efield-contract.test.ts (10 bài §12)
```

**Import được phép** (y hệt physics v0, cross-import C2 đã duyệt): `../scalar`, `../analysis/solver1d`, `../analysis/recognize`, `../compute/answer` (`certifyScalar`, `cmpScalar`, `isZeroS`), `./kinematics` (chỉ `scalarFromNumber`, `trigOf` — như `circuit.ts:8` đã import `scalarFromNumber` từ kinematics), `zod`, và `import type` từ `../../../../src/types/geometry` (type-only, bị erase).

**Ranh giới CỨNG (hoàn toàn additive):** KHÔNG sửa `run.ts`, `planSchema.ts`, `kinematics.ts`, `circuit*.ts`, `index.ts`, `runPhysics.ts`, `package.json`, `vitest.config.ts` (glob `api/_lib/kernel/**/*.test.ts` đã phủ test mới), `src/**`. Nối dây (export `index.ts`, bridge route đa môn, few-shot translator) là **P2/bridge**, ngoài spec này. Gate typecheck: thêm `efield*.ts` vào phạm vi `tsconfig.kernel.json` (F9) khi thi công — pack tự phát đủ field type.

## 5. Biểu diễn lũy thừa 10 + KẾT LUẬN: `Scalar` có kham `9·10⁹` không (ĐÃ ĐỌC CODE)

> Đây là câu hỏi kỹ thuật trung tâm của task. Trả lời dứt khoát, có trích dòng code + đã chạy máy đối chứng (script inline reimplement `scalar.ts`, 10/10 đáp khớp).

### 5.1. KẾT LUẬN: CÓ — không cần kiểu số mới, không cần "lũy thừa 10 tách riêng"

`scalar.ts:5` định nghĩa `Exact = { num: bigint; den: bigint; radicand: number }`. **`num`/`den` là `bigint` ⇒ chính xác tùy ý, không tràn.** Do đó:

- `k = 9·10⁹ = makeExact(9000000000n, 1n, 1)` **chính xác tuyệt đối**. Đã chạy: `exactToApprox(K) === 9e9` trả `true` (vì `9·10⁹ < 2⁵³ ≈ 9,007·10¹⁵`, `Number(9000000000n)` khớp bit).
- Điện tích `q = 2 μC` biểu diễn `2/10⁶` (hữu tỉ), `4 nC = 4/10⁹`… Tích `k·q₁·q₂` và thương `/r²` **ở lại trong ℚ** (mọi thừa số radicand=1) ⇒ **exact 100%**, `makeExact` tự rút gọn BigInt sau mỗi phép (`scalar.ts:38-49`). Ví dụ C1: `k·q₁·q₂ = 9·10⁹·(2/10⁶)·(2/10⁶) = 36·10⁹/10¹² → rút gọn 9/250`; `/(9/10⁴) = 40`. Số trung gian lớn nhất `36·10⁹ = 3,6·10¹⁰` và `10¹²` — đều `< 2⁵³`, và dù có lớn hơn thì BigInt vẫn đúng.
- **Trần `MAX_SAFE_RADICAND = 1e12` (`scalar.ts:11`) CHỈ chặn phần CĂN** (`radicand: number`), KHÔNG chặn độ lớn hữu tỉ. Lực Coulomb & điện trường điểm cho đáp HỮU TỈ (`r²` khử căn) ⇒ **không bao giờ chạm trần này**. Chồng chất tam giác đều sinh `radicand = 3` (bé xíu) — an toàn.

### 5.2. Giới hạn THỰC duy nhất: bóng float `exactToApprox`, và nó VÔ HẠI

`exactToApprox(e) = Number(e.num)/Number(e.den)·√radicand` (`scalar.ts:51`). Khi `num` hoặc `den` (SAU rút gọn) vượt `2⁵³`, phép `Number()` làm tròn double (sai số **tương đối ~1e-16**). Nhưng:

- Đáp phổ thông sau rút gọn rất nhỏ (`40`, `9/250`, `900000`, `1/250000`, `300000√3`) — `num/den ≪ 2⁵³`, bóng float khớp bit.
- Ngay cả khi lớn: `certifyScalar` (answer.ts:124) so `|exactToApprox − floatRef| ≤ 1e-6·max(1,|floatRef|)`. Sai số `~1e-16` tương đối **thấp hơn dung sai `1e-6` chín bậc** ⇒ exact **không bao giờ bị bác oan**. Bản thân đáp lưu trong `Exact` (BigInt) **luôn đúng**; bóng float chỉ dùng để đối chứng và hiển thị `approx`.
- Mẫu số lũy thừa 10 (`den = 2ᵃ·5ᵇ`) đặc biệt lành: phần lẻ `5ᵇ < 2⁵³` khi `b ≤ 22` ⇒ `Number(den)` khớp bit tới thang rất lớn. Đã chạy: `Number(6250000000000000000n) === 6.25·10¹⁸` trả `true`.

⇒ **Không có rủi ro sai số ở thang phổ thông.** "Cách biểu diễn 10ⁿ" = để BigInt của `Exact` gánh tự nhiên; điều duy nhất còn lại là **HIỂN THỊ** (đáp `9·10⁵` vs chuỗi `900000`, `5,4·10⁻⁴` vs `27/50000`) — bàn ở §6.

### 5.3. Quy tắc NHẬP để giữ exact (thiết kế schema §7)

Sai lầm cần tránh: feed số cực nhỏ thô vào `scalarFromNumber`. `scalarFromNumber(x)` (kinematics.ts:13) dùng `SCALE=1e9`; `x < ~1e-9` làm tròn về 0 hoặc rơi float (vd `0,5 nC = 5e-10 → round(0,5)=1`, lệch `>1e-3` ⇒ **float, MẤT exact**). Cách đúng — **mantissa + đơn vị per-quantity** (đúng khuôn F2 đã có):

```ts
// efield.ts — bảng factor HỮU TỈ EXACT (lũy thừa 10 do factor gánh)
const CHARGE_TO_SI: Record<string, Scalar> = {
  C: rat(1n), mC: rat(1n,1000n), uC: rat(1n,1000000n), nC: rat(1n,1000000000n), pC: rat(1n,1000000000000n),
};
const FIELD_TO_SI:  Record<string, Scalar> = { 'V/m': rat(1n), 'N/C': rat(1n), 'V/cm': rat(100n) };
const VOLT_TO_SI:   Record<string, Scalar> = { V: rat(1n), kV: rat(1000n) };
const MASS_TO_SI:   Record<string, Scalar> = { kg: rat(1n), g: rat(1n,1000n) };
export const qtyCharge = (v: number, u: string) => mul(scalarFromNumber(v), CHARGE_TO_SI[u]); // 5,4 nC → (27/5)·(1/10⁹) EXACT
export const K = rat(9000000000n);                                    // hằng Coulomb, exact
export const kEff = (epsilon: Scalar) => div(K, epsilon);             // môi trường ε: k/ε
```

`value` LLM chép là mantissa "đẹp" (`2`, `4`, `5.4`, `9.1`) trong tầm exact của `scalarFromNumber` (`≤9` chữ lẻ, `≥~1e-9`); lũy thừa 10 nằm trong `unit`. ⇒ **không phần tử nhập nào phá exact**. Điện tích âm: `value` mang dấu (`q = {value:-6, unit:'nC'}`); độ lớn dùng `absExact` khi cần (Coulomb lấy `|q₁q₂|`, dấu quyết định hút/đẩy).

## 6. Luật hiển thị đáp điện trường (`displayEField`) — điểm thiết kế MỞ (xem §14.1)

`displayScalar` (scalar.ts:157) trả **phân số/số nguyên trần**: `40`✓ nhưng `27/50000`✗ (đề Lý viết `5,4·10⁻⁴ N`), `900000`→ đề viết `9·10⁵ V/m`. Phán quyết chung wave2 (b): *"thập phân là việc bridge/UI, engine giữ exact-first"*. Với Ω-tỉ-số (`11/20`) điều đó ổn; với **lũy thừa 10 của Lý thì phân số trần khó dùng** (cực đoan: thế năng `1/250000` J). Spec đề xuất luật `displayEField(s)` áp Ở TẦNG COMPUTE cho `text` (giá trị exact vẫn lưu ở field `exact`, `approx` vẫn là số):

```
displayEField(s):
  nếu s.exact và radicand==1 (hữu tỉ thuần p/q):
    - den có ước nguyên tố NGOÀI {2,5}  ⇒ giữ PHÂN SỐ "p/q"      (vd 9/7, 1/3 — tự nhiên, KHÔNG cắt thập phân)
    - ngược lại (thập phân HỮU HẠN):
        · |v| ≥ 10⁴ hoặc (v≠0 và |v| < 10⁻²) ⇒ KHOA HỌC "a·10ⁿ"  (a ∈ [1,10), dấu phẩy VN: "5,4·10⁻⁴")
        · còn lại ⇒ thập phân dấu phẩy "0,036"
  nếu radicand>1 ⇒ displayExact ("300000√3", "2√5/5")            (căn giữ nguyên; hệ số lớn có thể kèm ×10ⁿ — v1 giữ trần)
  nếu float ⇒ recognizeConstant → nếu trượt: fmtNum (thập phân trung thực)
```

- Terminating ⇔ `den = 2ᵃ·5ᵇ` (kiểm bằng chia hết 2,5 trên BigInt của `den`). Mọi đáp Coulomb/E/A/W ở §12 là terminating (nhập là mantissa × 10ⁿ) ⇒ ra khoa học/thập phân "kiểu đề". Đáp `/7`, `/3` (chồng chất số lẻ) giữ phân số — đúng thẩm mỹ.
- `approx` (số) LUÔN đi kèm ⇒ bridge/UI muốn định dạng khác vẫn có nguồn. **Không phá phán quyết (b) về mặt giá trị** (exact vẫn lưu), chỉ chọn CHUỖI `text` thân thiện Lý. Nếu phản biện giữ nguyên (b) tuyệt đối ⇒ `text = displayScalar` trần, đẩy khoa-học-hoá sang bridge (chấp nhận được, `approx` đủ dùng). **Đây là điểm phân vân #1.**

## 7. Schema (efieldSchema.ts)

```ts
import { z } from 'zod';
const Num = z.number().finite();
const Name = z.string().min(1).regex(/^[A-Za-z0-9_]+$/);           // tên = id: không dấu/cách
const Pt = z.tuple([Num, Num]);                                    // toạ độ 2D theo units.length (1D ⇒ y=0)

const ChargeUnit = z.enum(['C','mC','uC','nC','pC']);              // uC = μC (ascii); hiển thị μC
const LenUnit    = z.enum(['m','cm','mm']);
const FieldUnit  = z.enum(['V/m','N/C','V/cm']);
const VoltUnit   = z.enum(['V','kV']);
const MassUnit   = z.enum(['kg','g']);
const Charge = z.object({ value: Num, unit: ChargeUnit.default('C') });   // value MANG DẤU (âm = điện tích âm)
const Dist   = z.object({ value: Num, unit: LenUnit.default('m') });      // dùng cho d dọc đường sức (đại số)

// ── Ops (thực thể) ────────────────────────────────────────────────────────────
const PointChargeOp = z.object({
  op: z.literal('point_charge'), name: Name, q: Charge,
  at: Pt.default([0,0]),                                           // vị trí (units.length)
});
const UniformFieldOp = z.object({
  op: z.literal('uniform_field'), name: Name,
  E: z.object({ value: Num.positive(), unit: FieldUnit.default('V/m') }).optional(),      // cho trực tiếp
  fromVoltage: z.object({ U: z.object({ value: Num.positive(), unit: VoltUnit.default('V') }),
                          d: Dist }).optional(),                   // HOẶC suy E=U/d (hai bản song song)
  direction: z.enum(['up','down','left','right','x','y']).default('x'), // chiều đường sức — chỉ để GHI phương
});                                                                // superRefine: đúng MỘT trong {E, fromVoltage}
const ChargedBodyOp = z.object({
  op: z.literal('charged_body'), name: Name, q: Charge,
  mass: z.object({ value: Num.positive(), unit: MassUnit.default('kg') }).optional(),     // cần cho cân bằng/động học
});
export const EFieldOpSchema = z.discriminatedUnion('op', [PointChargeOp, UniformFieldOp, ChargedBodyOp]);

// ── Queries (mỗi query MỘT đáp số + phương/chiều mô tả) ────────────────────────
export const EFieldQuerySchema = z.discriminatedUnion('kind', [
  // Trường điểm:
  z.object({ kind: z.literal('coulomb_force'), a: Name, b: Name, label: z.string().optional() }),           // F=k|qa·qb|/(ε r²)
  z.object({ kind: z.literal('field_at'),  at: Pt, by: z.array(Name).optional(), label: z.string().optional() }),   // ΣEᵢ tại at
  z.object({ kind: z.literal('force_on_test'), q: Charge, at: Pt, by: z.array(Name).optional(), label: z.string().optional() }), // F=q·E_at
  z.object({ kind: z.literal('potential_at'), at: Pt, by: z.array(Name).optional(), label: z.string().optional() }), // V=ΣkQ/(ε r) (optional §8.2)
  // Trường đều:
  z.object({ kind: z.literal('electric_force'), body: Name, field: Name, label: z.string().optional() }),   // F=qE
  z.object({ kind: z.literal('work'), body: Name, field: Name, d: Dist, label: z.string().optional() }),    // A=qEd (d đại số dọc đường sức)
  z.object({ kind: z.literal('voltage'), field: Name, d: Dist, label: z.string().optional() }),             // U=Ed
  z.object({ kind: z.literal('potential_energy'), body: Name,
             U: z.object({ value: Num, unit: VoltUnit.default('V') }), label: z.string().optional() }),     // W=qU
  z.object({ kind: z.literal('equilibrium_field'), body: Name, g: Num.positive().default(10), label: z.string().optional() }), // qE=mg → E cần
  z.object({ kind: z.literal('acceleration'), body: Name, field: Name, label: z.string().optional() }),     // a=qE/m (nối động học)
  z.object({ kind: z.literal('speed_after'), body: Name, field: Name, d: Dist, label: z.string().optional() }), // v=√(2qEd/m) (thả nghỉ, bỏ trọng lực)
]);

export const EFieldPlanSchema = z.object({
  problemName: z.string().min(1),
  units: z.object({ length: LenUnit.default('m') }).default({}),
  epsilon: Num.positive().default(1),                             // hằng điện môi tương đối (chân không/kk = 1; dầu ≈ 2…)
  ops: z.array(EFieldOpSchema).min(1),
  queries: z.array(EFieldQuerySchema).min(1),
  asserts: z.array(z.object({ query: EFieldQuerySchema, equals: Num, tol: Num.positive().optional() })).default([]),
  knowledgeTags: z.array(z.string()).default([]),                 // 4 tầng ly/11/dien-truong/<skill> (§11)
}).superRefine((plan, ctx) => { /* §7.3 */ });
export type EFieldPlan = z.infer<typeof EFieldPlanSchema>;
export type EFieldQuery = z.infer<typeof EFieldQuerySchema>;
```

### 7.3. superRefine — GATE tính tất định (chỗ ép "abstain" cho cấu hình không exact-được)

1. **Tên duy nhất** trên toàn `ops`; mọi `a`/`b`/`body`/`field`/`by[]` trong queries/asserts **trỏ tên tồn tại** và **đúng loại** (`coulomb_force.a/b` là `point_charge`; `electric_force.field` là `uniform_field`; `…body` là `charged_body`; `by[]` toàn `point_charge`).
2. `uniform_field`: đúng MỘT trong `{E, fromVoltage}` (không cả hai / không thiếu).
3. Query cần khối lượng (`equilibrium_field`, `acceleration`, `speed_after`) ⇒ `charged_body.mass` phải có.
4. **GATE CHỒNG CHẤT (cốt lõi):** với `field_at`/`force_on_test`/`potential_at` mà tập nguồn (`by` hoặc toàn bộ `point_charge`) có **≥ 2** điện tích, cấu hình PHẢI thuộc một trong hai lớp exact-được, nếu không ⇒ `addIssue` (từ chối plan ⇒ LLM buộc abstain):
   - **(a) Thẳng hàng:** mọi điện tích nguồn + điểm khảo sát thẳng hàng. Kiểm: với mọi nguồn `Sᵢ`, tích có hướng `(P−S₀)×(Sᵢ−S₀) = 0`. (Kiểm trên số thô của plan với `tol` nhỏ — chỉ để GATE; tính đáp vẫn exact.)
   - **(b) Cặp đối xứng đẳng cự (2 nguồn):** đúng 2 điện tích, `|q_A| = |q_B|`, và điểm `P` **cách đều** hai điện tích (`|P−A|² = |P−B|²`, so exact trên số thô). Bao trọn tam giác đều/cân/vuông-cân/3-4-5 với `P` ở đỉnh trên trung trực.
   - Ngoài (a),(b) ⇒ thông điệp: *"cấu hình chồng chất không thuộc lớp exact-được (chỉ hỗ trợ thẳng hàng hoặc cặp đối xứng đẳng cự) — v1 abstain; xem §14.2"*.
   - *(3 điện tích đối xứng — tam giác đều, điểm ở TÂM: hợp lực = 0 — nhận như case (a-mở-rộng) tuỳ chọn, ghi §14.2.)*

## 8. Tầng compute — công thức đóng từng query (efieldCompute.ts)

Mỗi hàm có **cặp float độc lập** (`…N`, số học `number`) làm đường certify (mẫu `circuit.ts`). `mkEAns` = 3 bậc + luật §6:

```ts
export type EDir = string;   // mô tả phương/chiều: "đẩy nhau" | "hút nhau" | "từ A đến B" | "hướng ra xa Q" | "thẳng đứng lên"…
export type EFieldAns = { label?: string; kind: string; text: string; approx: number; unit: string;
                          approximate: boolean; direction?: EDir; queryIndex?: number };

function mkEAns(kind, s: Scalar, floatRef: number, unit: string, label?, direction?): EFieldAns {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol)
    return { label, kind, text: displayEField(s), approx: exactToApprox(s.exact), unit, approximate:false, direction };
  const nice = Number.isFinite(floatRef) ? recognizeConstant(floatRef) : null;   // cứu khi vượt trần radicand
  return { label, kind, text: nice ? nice.text : fmtNum(floatRef), approx: floatRef, unit, approximate: !nice, direction };
}
```

### 8.1. Công thức + đơn vị engine ghi (C6: `answers[].unit` do engine)

| Query | Công thức đóng (Scalar) | Đơn vị | Phương/chiều |
|---|---|---|---|
| `coulomb_force(a,b)` | `F = kEff·|q_a|·|q_b| / r²`, `r² = (x_a−x_b)²+(y_a−y_b)²` (exact) | `N` | `q_a·q_b>0`→"đẩy nhau", `<0`→"hút nhau" |
| `field_at(at, by)` | `E⃗ = Σ kEff·q_i·(P−S_i)/r_i³`; độ lớn `|E⃗| = √(Eₓ²+E_y²)` | `V/m` | thẳng hàng→dấu trục; đối xứng→dọc trục đối xứng |
| `force_on_test(q,at,by)` | `F = |q|·|E_at|` | `N` | theo `E_at`, đảo nếu `q<0` |
| `potential_at(at,by)` | `V = Σ kEff·q_i / r_i` (vô hướng, cộng đại số) | `V` | — |
| `electric_force(body,field)` | `F = |q|·E` | `N` | dọc đường sức, đảo nếu `q<0` |
| `work(body,field,d)` | `A = q·E·d` (d ĐẠI SỐ dọc đường sức; `E=U/d₀` nếu `fromVoltage`) | `J` | dấu `A` → sinh/nhận công |
| `voltage(field,d)` | `U = E·d` | `V` | — |
| `potential_energy(body,U)` | `W = q·U` | `J` | dấu → thế năng tăng/giảm |
| `equilibrium_field(body,g)` | `E = m·g/|q|` (giải `|q|E=mg`) | `V/m` | `q>0`→cùng chiều lực cân trọng lực; `q<0`→ngược |
| `acceleration(body,field)` | `a = |q|·E/m` | `m/s²` | dọc đường sức |
| `speed_after(body,field,d)` | `v = √(2|q|E·d/m)` (định lý động năng, thả nghỉ) | `m/s` | — |

**Vector 2D exact (efield.ts).** `E⃗_i = kEff·q_i·(P−S_i)/r_i³`. `r_i² = Δx²+Δy²` là **hữu tỉ (radicand 1)**; `r_i = sqrt(r_i²)` là **một-căn** (`√(hữu tỉ)`); `r_i³ = r_i²·r_i`; chia `Δ (hữu tỉ)` cho `r_i³` → **một-căn** (`Scalar` tự hữu-tỉ-hoá mẫu). Cộng `E⃗_1+E⃗_2`:
- **Thẳng hàng:** mọi `Δ` cùng một trục ⇒ thành phần vuông góc **đúng 0** (exact `num===0n`), thành phần dọc là tổng ĐẠI SỐ các một-căn **cùng radicand** (cùng `r²` hoặc chung hệ) ⇒ `addExact` đóng ⇒ exact (C5: hai `r²` bằng nhau → hữu tỉ thuần).
- **Đối xứng đẳng cự:** hai nguồn cùng `r²` ⇒ hai `E⃗_i` cùng radicand; thành phần vuông góc **triệt tiêu exact**, dọc **cộng đôi** (C6: `E_res = √(3)·E`, `radicand 3`, `sqrtExact(3E²)` — đã chạy: `3E²=2,7·10¹¹ < 1e12` ⇒ exact `300000√3`).
- Ngoài hai lớp trên: các `E⃗_i` khác radicand ⇒ `addExact→null` ⇒ float; NHƯNG superRefine §7.3 đã CHẶN từ trước ⇒ không tới được đây (nếu tới, `mkEAns` trả recognize/float trung thực, `approximate:true`).

### 8.2. `potential_at` (điện thế điểm) — OPTIONAL

`V=ΣkQ/(ε·r)` cần `r` (không `r²`), `r` một-căn ⇒ `V` một-căn (hữu tỉ nếu `r` hữu tỉ). Cộng vô hướng (không vector) ⇒ đơn giản; sạch nhất khi thẳng hàng. Giữ trong schema như query phụ; **10 bài contract §12 KHÔNG phụ thuộc nó** (giữ core tối thiểu). Có thể hạ xuống v1.1 nếu phản biện muốn cắt.

## 9. Tự kiểm (checks[]) — thay-ngược + chứng chỉ đối xứng + đơn vị

`EPS_SELF = 1e-6` (tương đối, `scale = max(1,|hệ số lớn nhất|)`), dùng chung trị số v0/circuit. **Luôn chạy, ghi `checks[]` minh bạch** (F8: label scene trần, giá trị ở `answers[]`):

| Loại | Kiểm |
|---|---|
| **Certify exact↔float** | mọi đáp: `|exactToApprox(exact) − floatRef| ≤ 1e-6·scale`; lệch ⇒ bỏ exact (đã trong `mkEAns`) |
| **Thay-ngược cân bằng** | `equilibrium_field`: `\| \|q\|·E_tìm − m·g \| ≤ EPS_SELF·scale` (thay E vào `qE=mg`) |
| **Thay-ngược động năng** | `speed_after`: `\| ½·m·v² − \|q\|·E·d \| ≤ EPS_SELF·scale` (bảo toàn năng lượng) |
| **Chứng chỉ ĐỐI XỨNG → phương** | `field_at` cấu hình đối xứng/thẳng hàng: thành phần vuông góc trục hợp lực **PHẢI exact 0** (`perpComp.exact.num===0n`). Khác 0 ⇒ **violation** "mô hình/toạ độ sai đối xứng" (bắt lỗi dịch đề, KHÔNG serve) |
| **Dấu lực Coulomb** | chiều "hút/đẩy" khớp dấu `sign(q_a·q_b)`; nếu đề khẳng định ngược (assert) ⇒ đối chiếu |
| **Chiều trường điểm** | `Q>0` → `E⃗` hướng ra xa; `Q<0` → hướng về — kiểm bằng dấu chiếu lên `(P−S)` |
| **Miền hợp lệ** | `r² > 0` (hai điện tích/điểm KHÔNG trùng vị trí → error "trùng vị trí, `r=0`"); `|q|>0` cho mẫu (cân bằng cần `q≠0`); `m>0` |
| **Đơn vị** | engine gắn đơn vị theo `kind` (§8.1) — `answers[].unit`; text KHÔNG nhúng đơn vị (field riêng) |

**Asserts khai báo** (dữ kiện DƯ của đề): chạy `assert.query` như thường, so `|got − equals| ≤ tol·max(1,|equals|)`, `tol` mặc định `TOL_ASSERT = 1e-3` (dung nạp làm tròn của đề: "≈ 5,4·10⁻⁴ N"). Fail ⇒ `violations` ⇒ `ok:false`, không serve.

## 10. EFieldResult (mirror PhysicsResult §9 — bridge đa môn khớp sau)

```ts
type EFieldResult = {
  ok: boolean;                         // violations=0 && errors=0 && mọi đáp hữu hạn
  answers: EFieldAns[];                // THEO THỨ TỰ queries; mỗi đáp {text, approx, unit, approximate, direction?}
  checks: { kind: string; detail: string; residual: number; pass: boolean }[];
  violations: { assert: string; expected: number; got: number; delta: number }[];
  errors: { message: string }[];
  geometry: GeometryData | null;       // §10.1 — TỐI THIỂU (điểm điện tích + điểm khảo sát); vector-arrow → v1.1
  meta: { epsilon: number; units: { length: string }; knowledgeTags: string[] };
};
```

Bridge P2 (ngoài spec): `scene = result.geometry`; `trace` tổng hợp từ `checks[].detail`+`errors`; `checks`/`meta` là **mở rộng hợp lệ** (F7). `answers[].unit`/`direction` do engine (C6).

### 10.1. Geometry (tối thiểu, tuỳ chọn)

v1 phát `points` cho mỗi `point_charge` (label = tên, màu theo dấu: đỏ `+` / xanh `−`) + điểm khảo sát `field_at.at`; map `(x_p, y_p)→(x,0,y_p)` (quy ước z-đứng như physics v0). **Mũi tên vector trường, đường sức** → v1.1 (cần type mới, tránh phình v1). Trường đều: 2 điểm mốc + nhãn chiều. Nếu phản biện muốn cắt hẳn geometry ở v1 (chỉ `answers[]`) — chấp nhận; ghi §14.6.

## 11. Tags 4 tầng (`ly/11/dien-truong/<skill>`) — registry (bridge P0 merge)

Plan mang `knowledgeTags`; bridge lọc theo registry (isKnownTag) rồi merge `scene.tags` (KHÔNG tự chế tag — F10). Đề nghị **6 skill**:

| Tag | Dạng bài |
|---|---|
| `ly/11/dien-truong/luc-tuong-tac-coulomb` | C1, C2 |
| `ly/11/dien-truong/cuong-do-dien-truong` | C3, C4 |
| `ly/11/dien-truong/nguyen-ly-chong-chat` | C5, C6 |
| `ly/11/dien-truong/cong-cua-luc-dien` | C7 |
| `ly/11/dien-truong/dien-the-hieu-dien-the` | C8 (+ `potential_at`) |
| `ly/11/dien-truong/dien-tich-trong-dien-truong-deu` | C9, C10 |

## 12. MƯỜI BÀI CONTRACT (C1–C10) — đáp tính TAY, đã chạy máy đối chứng (10/10 khớp)

> File test `efield-contract.test.ts`. Số liệu kiểu đề SGK/đề thi VN. **Đã reimplement inline `scalar.ts` và chạy — mọi `text`/`approx` dưới đây là output THẬT của đường exact** (không phải kỳ vọng suông). `k = 9·10⁹`, chân không `ε=1` trừ khi nói khác.

---
### C1 — Lực Coulomb, hai điện tích dương (đẩy nhau)
**Đề:** "Hai điện tích điểm `q₁ = q₂ = 2·10⁻⁶ C` đặt tại A, B trong chân không, cách nhau 3 cm. Tính lực tương tác."
```json
{ "problemName":"coulomb-2uC", "units":{"length":"cm"},
  "ops":[{"op":"point_charge","name":"A","q":{"value":2,"unit":"uC"},"at":[0,0]},
         {"op":"point_charge","name":"B","q":{"value":2,"unit":"uC"},"at":[3,0]}],
  "queries":[{"kind":"coulomb_force","a":"A","b":"B"}] }
```
**Tính tay:** `r=3 cm=3/100 m`, `r²=9/10⁴`. `F = 9·10⁹·(2/10⁶)·(2/10⁶)/(9/10⁴) = (9/250)/(9/10⁴) = 40`. **F = 40 N, đẩy nhau.** Exact `text:"40"`, `approx:40`, `unit:"N"`, `direction:"đẩy nhau"`.

---
### C2 — Lực Coulomb, trái dấu (hút), thang nC → khoa học
**Đề:** "`q₁ = 4·10⁻⁹ C`, `q₂ = −6·10⁻⁹ C` cách nhau 2 cm trong chân không. Tính độ lớn lực."
```json
{ "problemName":"coulomb-nC-hut", "units":{"length":"cm"},
  "ops":[{"op":"point_charge","name":"A","q":{"value":4,"unit":"nC"},"at":[0,0]},
         {"op":"point_charge","name":"B","q":{"value":-6,"unit":"nC"},"at":[2,0]}],
  "queries":[{"kind":"coulomb_force","a":"A","b":"B"}] }
```
**Tính tay:** `r²=1/2500`. `F = 9·10⁹·(4/10⁹)·(6/10⁹)/(1/2500) = 27/50000 = 5,4·10⁻⁴`. **F = 5,4·10⁻⁴ N, hút nhau.** exact `27/50000` → **luật §6 hiển thị `"5,4·10⁻⁴"`** (den=2⁴·5⁵ terminating, `<10⁻²`), `approx:0.00054`, `direction:"hút nhau"`. *(displayScalar trần cho `"27/50000"` — minh hoạ điểm phân vân #1.)*

---
### C3 — Cường độ điện trường một điện tích (nguyên)
**Đề:** "Điện tích điểm `Q = 4·10⁻⁸ C` trong chân không. Tính E tại M cách Q 2 cm."
```json
{ "problemName":"E-diem-4e-8", "units":{"length":"cm"},
  "ops":[{"op":"point_charge","name":"Q","q":{"value":4,"unit":"nC"},"at":[0,0]}],
  "queries":[{"kind":"field_at","at":[2,0]}] }
```
*(4·10⁻⁸ C = 40 nC = `{value:40,unit:"nC"}` hoặc `{value:0.04,unit:"uC"}`.)*
**Tính tay:** `r²=4/10⁴`. `E = 9·10⁹·(4/10⁸)/(4/10⁴)=900000`. **E = 9·10⁵ V/m = 900000 V/m**, hướng ra xa Q (`Q>0`). exact `"900000"`→ luật §6 `"9·10⁵"` (den=1, `≥10⁴` khoa học), `approx:900000`, `direction:"hướng ra xa Q"`.

---
### C4 — Cường độ điện trường, r VÔ TỈ nhưng r² HỮU TỈ (điểm đẹp)
**Đề:** "`Q = 8·10⁻⁹ C` tại O(0,0). Tính E tại M có toạ độ (1 cm; 2 cm)."
```json
{ "problemName":"E-diem-r-vo-ti", "units":{"length":"cm"},
  "ops":[{"op":"point_charge","name":"Q","q":{"value":8,"unit":"nC"},"at":[0,0]}],
  "queries":[{"kind":"field_at","at":[1,2]}] }
```
**Tính tay:** `r² = (1/100)²+(2/100)² = 5/10⁴` (r = √5 cm — **VÔ TỈ**), nhưng `E = kQ/r²` chỉ cần `r²`: `E = 9·10⁹·(8/10⁹)/(5/10⁴) = 72·10⁴/5 = 144000`. **E = 1,44·10⁵ V/m**, hướng ra xa Q. exact `"144000"`→ `"1,44·10⁵"`, `approx:144000`. **Điểm đẹp task nêu: `r²` khử căn ⇒ E hữu tỉ dù r vô tỉ** — đã chạy khớp.

---
### C5 — Chồng chất THẲNG HÀNG, 2 điện tích (trung điểm)
**Đề:** "A, B cách 10 cm; `q₁=+9·10⁻⁸ C` tại A, `q₂=+4·10⁻⁸ C` tại B. Tính E tổng hợp tại trung điểm M."
```json
{ "problemName":"chong-chat-thang-hang", "units":{"length":"cm"},
  "ops":[{"op":"point_charge","name":"A","q":{"value":90,"unit":"nC"},"at":[0,0]},
         {"op":"point_charge","name":"B","q":{"value":40,"unit":"nC"},"at":[10,0]}],
  "queries":[{"kind":"field_at","at":[5,0]}] }
```
**Tính tay:** M cách mỗi điện tích 5 cm, `r²=1/400`. `E₁=9·10⁹·(9·10⁻⁸)/(1/400)=324000` (hướng A→B, +x); `E₂=9·10⁹·(4·10⁻⁸)/(1/400)=144000` (hướng B→A, −x). Cùng phương AB, ngược chiều: `E = 324000−144000 = 180000`. **E = 1,8·10⁵ V/m, chiều từ A đến B.** Thành phần ⊥ AB = **exact 0** (chứng chỉ đối xứng pass). exact `"180000"`→ `"1,8·10⁵"`, `direction:"từ A đến B"`.

---
### C6 — Chồng chất TAM GIÁC ĐỀU (căn √3 exact qua `trigOf`)
**Đề:** "`q₁=q₂=3·10⁻⁸ C` tại A, B — hai đỉnh tam giác đều cạnh 3 cm (chân không). Tính E tổng hợp tại đỉnh C."
```json
{ "problemName":"chong-chat-tam-giac-deu", "units":{"length":"cm"},
  "ops":[{"op":"point_charge","name":"A","q":{"value":30,"unit":"nC"},"at":[0,0]},
         {"op":"point_charge","name":"B","q":{"value":30,"unit":"nC"},"at":[3,0]}],
  "queries":[{"kind":"field_at","at":[1.5,2.598076211]}] }
```
*(C = đỉnh trên trung trực AB, cao `3·√3/2 ≈ 2,598 cm`; engine kiểm đẳng cự `|CA|²=|CB|²` exact ⇒ gate (b) pass. Toạ độ y của C là float nhập nhưng r² vẫn ra `9/10⁴` sạch vì đối xứng.)*
**Tính tay:** `|CA|=|CB|=3 cm`, `r²=9/10⁴`. `E_A=E_B=9·10⁹·(3·10⁻⁸)/(9/10⁴)=300000`. Góc giữa hai vector = góc ACB = 60° (`trigOf(60).cos=1/2`). `E_res² = E_A²+E_B²+2E_AE_B·cos60° = 3E²`; `E_res = E√3`. `sqrtExact(3·300000²)=sqrtExact(2,7·10¹¹)` — **`2,7·10¹¹ < 10¹²` (dưới trần radicand)** ⇒ exact `300000√3`. **E = 3·10⁵·√3 V/m ≈ 5,196·10⁵ V/m**, dọc trung trực, hướng ra xa AB. exact `"300000√3"` (`approximate:false`), `approx≈519615.24`, thành phần ⊥ trục = **exact 0**.
*(Ghi biên: nếu q ở thang μC → `3E²` vượt `10¹²` ⇒ `sqrtExact→null` ⇒ `recognizeConstant` dựng lại `"30000000√3"`, `approximate:false`. Đường cứu đã kiểm.)*

---
### C7 — Công lực điện đều `A=qEd`
**Đề:** "Điện tích `q=2·10⁻⁶ C` dời 5 cm dọc đường sức (cùng chiều) trong điện trường đều `E=1000 V/m`. Tính công lực điện."
```json
{ "problemName":"cong-luc-dien", "units":{"length":"m"},
  "ops":[{"op":"uniform_field","name":"E1","E":{"value":1000,"unit":"V/m"},"direction":"x"},
         {"op":"charged_body","name":"q","q":{"value":2,"unit":"uC"}}],
  "queries":[{"kind":"work","body":"q","field":"E1","d":{"value":5,"unit":"cm"}}] }
```
**Tính tay:** `A = q·E·d = (2/10⁶)·1000·(5/100) = 1/10000 = 10⁻⁴`. **A = 10⁻⁴ J = 0,0001 J** (dương, lực điện sinh công). exact `"1/10000"`→ luật §6 `"10⁻⁴"` (terminating, `<10⁻²`), `approx:0.0001`, `unit:"J"`.

---
### C8 — Hiệu điện thế `U=Ed` + thế năng/công `W=qU`
**Đề:** "Điện trường đều `E=2000 V/m`; M, N trên cùng đường sức cách 4 cm (M→N cùng chiều điện trường). a) Tính `U_MN`. b) `q=5·10⁻⁸ C` dời M→N — tính công lực điện."
```json
{ "problemName":"hieu-dien-the-the-nang", "units":{"length":"m"},
  "ops":[{"op":"uniform_field","name":"E1","E":{"value":2000,"unit":"V/m"},"direction":"x"},
         {"op":"charged_body","name":"q","q":{"value":50,"unit":"nC"}}],
  "queries":[{"kind":"voltage","field":"E1","d":{"value":4,"unit":"cm"},"label":"a"},
             {"kind":"potential_energy","body":"q","U":{"value":80,"unit":"V"},"label":"b"}] }
```
**Tính tay:** a) `U_MN=E·d=2000·(4/100)=80`. **U = 80 V.** b) `W=A=q·U=(5·10⁻⁸)·80=4·10⁻⁶`. **A = 4·10⁻⁶ J** (= độ giảm thế năng W_M−W_N). a) exact `"80"`, `unit:"V"`; b) exact `"1/250000"`→ `"4·10⁻⁶"`, `approx:0.000004`, `unit:"J"`. *(LLM chép U=80 từ câu a — hoặc bridge nối; v1 cho khai trực tiếp để giữ mỗi query độc lập.)*

---
### C9 — Điện tích cân bằng trong điện trường đều `qE=mg`
**Đề:** "Quả cầu nhỏ `m=0,1 g`, điện tích `q=10⁻⁸ C` (dương), cân bằng trong điện trường đều thẳng đứng. `g=10 m/s²`. Tính E và xác định chiều."
```json
{ "problemName":"can-bang-dien-truong-deu", "units":{"length":"m"},
  "ops":[{"op":"uniform_field","name":"E1","E":{"value":1,"unit":"V/m"},"direction":"up"},
         {"op":"charged_body","name":"cau","q":{"value":10,"unit":"nC"},"mass":{"value":0.1,"unit":"g"}}],
  "queries":[{"kind":"equilibrium_field","body":"cau","g":10}] }
```
*(E khai giá trị placeholder — `equilibrium_field` GIẢI E cần, không đọc E khai; hoặc cho `uniform_field` optional khi chỉ hỏi equilibrium. superRefine nới: equilibrium_field không đòi field.E — ghi chú thi công.)*
**Tính tay:** `m=0,1 g=10⁻⁴ kg`; `mg=10⁻³ N`. Cân bằng `qE=mg` ⇒ `E=mg/q=(10⁻³)/(10⁻⁸)=10⁵`. **E = 10⁵ V/m = 100000 V/m.** `q>0`, lực điện phải hướng LÊN (cân trọng lực xuống) ⇒ **E⃗ hướng thẳng đứng lên.** Thay-ngược: `qE=10⁻⁸·10⁵=10⁻³=mg` ✓. exact `"100000"`→ `"10⁵"`, `direction:"thẳng đứng, hướng lên"`.

---
### C10 — Điện tích chuyển động trong điện trường đều (nối động học)
**Đề:** "Hạt `q=2·10⁻⁶ C`, `m=2·10⁻⁵ kg`, đứng yên, thả trong điện trường đều `E=100 V/m` (bỏ trọng lực). a) Lực điện. b) Gia tốc. c) Tốc độ sau khi đi 4 cm dọc đường sức."
```json
{ "problemName":"dien-tich-chuyen-dong", "units":{"length":"m"},
  "ops":[{"op":"uniform_field","name":"E1","E":{"value":100,"unit":"V/m"},"direction":"x"},
         {"op":"charged_body","name":"hat","q":{"value":2,"unit":"uC"},"mass":{"value":0.00002,"unit":"kg"}}],
  "queries":[{"kind":"electric_force","body":"hat","field":"E1","label":"a"},
             {"kind":"acceleration","body":"hat","field":"E1","label":"b"},
             {"kind":"speed_after","body":"hat","field":"E1","d":{"value":4,"unit":"cm"},"label":"c"}] }
```
**Tính tay:** a) `F=qE=(2·10⁻⁶)·100=2·10⁻⁴`. **F = 2·10⁻⁴ N.** b) `a=F/m=(2·10⁻⁴)/(2·10⁻⁵)=10`. **a = 10 m/s².** c) định lý động năng `½mv²=Fd=qEd` ⇒ `v=√(2ad)=√(2·10·0,04)=√(4/5)=2√5/5`. **v = 2√5/5 m/s ≈ 0,894 m/s.** a) `"1/5000"`→`"2·10⁻⁴"`, `unit:"N"`; b) exact `"10"`, `unit:"m/s²"`; c) `sqrtExact(4/5)` → exact `"2√5/5"` (`approximate:false`), `approx≈0.8944`, `unit:"m/s"`. Thay-ngược động năng: `½·2·10⁻⁵·(4/5)=8·10⁻⁶ = qEd=2·10⁻⁶·100·0,04=8·10⁻⁶` ✓.

---
### Bảng tổng hợp 10 bài (đã chạy máy — cột "Đáp exact engine" là output THẬT)

| # | Dạng (tag) | Đáp exact engine | Hiển thị §6 | approximate |
|---|---|---|---|---|
| C1 | Coulomb đẩy | `40` | `40 N` | false |
| C2 | Coulomb hút (nC) | `27/50000` | `5,4·10⁻⁴ N` | false |
| C3 | E một điện tích | `900000` | `9·10⁵ V/m` | false |
| C4 | E, r vô tỉ / r² hữu tỉ | `144000` | `1,44·10⁵ V/m` | false |
| C5 | Chồng chất thẳng hàng | `180000` | `1,8·10⁵ V/m` (từ A→B) | false |
| C6 | Chồng chất tam giác đều | `300000√3` | `300000√3 V/m` ≈5,196·10⁵ | false |
| C7 | Công `A=qEd` | `1/10000` | `10⁻⁴ J` | false |
| C8 | `U=Ed`; `W=qU` | `80`; `1/250000` | `80 V`; `4·10⁻⁶ J` | false |
| C9 | Cân bằng `qE=mg` | `100000` | `10⁵ V/m` (đứng, lên) | false |
| C10 | Chuyển động: F; a; v | `1/5000`; `10`; `2√5/5` | `2·10⁻⁴ N`; `10 m/s²`; `2√5/5 m/s` | false |

**10/10 exact** (`approximate:false`), phủ đúng yêu cầu: 2 Coulomb (C1,C2) · 2 E một điện tích (C3,C4) · 2 chồng chất thẳng hàng+tam giác (C5,C6) · 1 công (C7) · 1 hiệu điện thế/thế năng (C8) · 2 tổng hợp (C9 cân bằng, C10 động học). Không bài nào chạm trần radicand ở thang khai (C6 `2,7·10¹¹ < 10¹²`).

## 13. Rủi ro & giảm thiểu

- **R1 — LLM tự tính hộ engine** (tự nhân `k·q`, tự chia `3,6`, tự lấy `cos60`): schema chỉ nhận `{value,unit}` + toạ độ; KHÔNG có field nộp `F`/`E`/thành-phần đã tính; góc/hình do toạ độ, engine tự `trigOf`. Few-shot cấm (P2).
- **R2 — Cấu hình vector không exact-được lọt lưới:** superRefine §7.3 GATE thẳng-hàng/đối-xứng trước khi tính; chứng chỉ đối xứng (thành phần ⊥ = exact 0) bắt lỗi toạ độ. Ngoài lớp ⇒ reject plan (abstain), KHÔNG serve float giả exact.
- **R3 — exact giả** (số học exact ra dạng đẹp SAI): mọi đáp qua `certifyScalar` đối chiếu float ĐỘC LẬP (`…N`) + thay-ngược `EPS_SELF`.
- **R4 — Mất exact do nhập số nhỏ thô:** ép mantissa+unit (§5.3); test có case `0,5 nC` khai `{0.5,'nC'}` (giữ exact) đối chứng case `5e-10` thô (rơi float — chứng minh vì sao cấm).
- **R5 — Vượt trần radicand thang μC (C6 biến thể):** `sqrtExact→null` ⇒ `recognizeConstant` cứu về `a√b` `approximate:false`; test khoá cả hai nhánh.
- **R6 — Hiển thị lũy thừa 10:** luật §6; nếu phản biện bác ⇒ fallback `displayScalar` trần + `approx` (bridge lo). Không ảnh hưởng ĐÚNG/SAI.

## 14. Điểm phân vân cho phản biện (trước khi code)

1. **[TRỌNG — biểu diễn 10ⁿ khi hiển thị]** §6 đề xuất `displayEField` cho `text` dạng khoa học/thập phân (`"5,4·10⁻⁴"`, `"9·10⁵"`, giữ phân số khi mẫu có ước ≠ 2,5). Điều này **lệch phán quyết wave2 (b)** ("thập phân là việc bridge, engine exact-first"). Lập luận lệch: với Lý, phân số trần `27/50000 N`, `1/250000 J` **không đọc được**; `approx` vẫn kèm nên KHÔNG mất giá trị. **Chọn:** (A) engine áp §6 (khuyến nghị) hay (B) giữ `displayScalar` trần, đẩy khoa-học-hoá sang bridge? *(Về REPRESENTATION không có phân vân: BigInt kham `9·10⁹`, đã chứng minh §5 — chỉ HIỂN THỊ mở.)*
2. **[TRỌNG — ranh giới cấu hình vector exact-được]** §7.3 chốt đúng 2 lớp: **thẳng hàng** (cross=0) + **cặp đối xứng đẳng cự** (`|q|` bằng, điểm cách đều). Câu hỏi: (a) predicate này ĐỦ chưa (bỏ sót dạng SGK nào? vd điện tích thử trên đường trung trực đoạn nối 2 điện tích TRÁI dấu — hợp lực dọc AB, vẫn đối xứng đẳng cự ⇒ nằm trong (b) ✓); (b) có nhận **3 điện tích tam giác đều, điểm ở TÂM** (hợp lực=0) không, hay để v2; (c) gate kiểm trên **số thô float** (tol nhỏ) — có nên kiểm exact trên toạ độ hữu tỉ để tránh nhận nhầm cấu hình "gần đối xứng"?
3. **[Thang electron/proton `e`]** Kỹ thuật LÀM ĐƯỢC: thêm `ChargeUnit 'e'` với factor `16/10²⁰` (exact rational), `mₑ` qua `mass` thang `1e-31` (nhưng `scalarFromNumber` sàn `~1e-9` ⇒ phải cho `MassUnit` thang nhỏ hoặc rational literal). `exactToApprox` vẫn trong dung sai certify (§5.2). NHƯNG hiển thị (`1,28·10⁻¹⁷ J`) BẮT BUỘC luật §6, và phân số exact khổng lồ. **Chọn:** v1 trần `pC`/không-electron (khuyến nghị, "thà ít mà đúng"), hay mở `e`/electron ngay? Nếu mở, cần re-verify `Number(den≈6,25·10¹⁸)` (đã chạy: khớp bit cho lũy thừa 2·5).
4. **[Abstain vs float trung thực]** §7.3 chọn **abstain cứng** (reject plan) cho cấu hình ngoài lớp — khớp task ("cấu hình khác → abstain") nhưng LỆCH tiền lệ động học (P6c/P10b serve float `approximate:true` cho căn lồng). Với chồng chất bất kỳ có giá trị đúng (chỉ không đóng exact), abstain làm MẤT thông tin đúng. Giữ abstain hay chuyển sang "serve float + check `non_closed_form`"?
5. **[Môi trường ε]** `plan.epsilon` (default 1) chia vào `k`. Đủ chưa, hay cần bảng vật liệu (`epsilonOf('dau')`)? Đề VN thường cho ε số trực tiếp ⇒ số là đủ; xin xác nhận.
6. **[Geometry v1]** §10.1 phát điểm-điện-tích tối thiểu, mũi tên/đường sức → v1.1. Có nên cắt HẲN geometry ở v1 (chỉ `answers[]`, như dc-circuit `circuitLayout` draft) để giảm bề mặt? Hay giữ điểm tối thiểu?
7. **[`voltage`/`potential_energy` nối câu]** C8b khai `U:{80}` trực tiếp (mỗi query độc lập, dễ assert). Có nên cho `potential_energy.fromField:{field,d}` để engine tự suy `U=Ed` (chống LLM chép sai 80)? — cân nhắc R1 vs tiện.
8. **[`equilibrium_field` không cần `uniform_field.E`]** query GIẢI E nên `uniform_field.E` là placeholder/không bắt buộc khi chỉ hỏi cân bằng. superRefine cần nới (field.E optional nếu mọi query trỏ field đó là `equilibrium_field`). Chốt cách khai gọn.

## 15. Tiêu chí thành công

1. 10 bài §12 chạy qua `runEfield` ra ĐÚNG đáp tính tay (`text` sau luật §6 + `approx`), 10/10 `approximate:false`, căn/chỉ-số-10 đúng chỗ (C6 `√3`, C10 `2√5/5`, C2/C7/C8b khoa học).
2. Mọi đáp có `checks[]` certify + (nơi có) thay-ngược pass; chứng chỉ đối xứng cho C5/C6 (thành phần ⊥ exact 0); assert dữ-kiện-dư sai ⇒ `violations` + `ok:false`.
3. superRefine từ chối cấu hình chồng chất ngoài lớp exact (test 1 ca tam giác lệch → issue "abstain").
4. `K=rat(9000000000n)` exact; test khẳng định `exactToApprox(K)===9e9` và C1–C10 không đáp nào chạm trần radicand ở thang khai.
5. KHÔNG file có sẵn nào đổi (git status chỉ thấy `physics/efield*.ts` + test + spec này); test cũ XANH nguyên, chỉ CỘNG test mới.
