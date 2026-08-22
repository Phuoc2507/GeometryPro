# Phản biện spec sóng cơ + điện trường (22/08)

> Chạy `scalar.ts`/`piScalar.ts`/`kinematics.ts`/`recognize.ts` THẬT qua máy,
> tái dựng công thức engine theo spec, đối chiếu từng đáp. Không tin lời — tin số.

## Kết quả tính lại (máy, code thật)
- **Sóng cơ: 10/10 khớp** (kể cả pha 5π/3 → cos lưới → u=2 exact; log10 √10 → 13/2;
  đếm giao thoa bigint hai-cách W3=9, W4=10).
- **Điện trường: 9/10** — C6 tam giác đều VỠ (approximate:true thay vì 300000√3).

## Xếp hạng: sóng cơ chín hơn (sửa kiến trúc cơ học); điện trường cần sửa 1 nhánh toán

## SÓNG CƠ — sửa tối thiểu rồi code được
- **[W1 CAO — kiến trúc]** Spec nhét op `wave`/`sound_source` vào `planSchema.ts` +
  `runPhysics.ts` v0 → `runPhysics:42` gọi `motionOf` vô điều kiện, op lạ rơi
  nhánh projectile → NaN; đụng bề mặt v0 (1072 test) = rủi ro breaking. Trong
  khi dynamics/circuit/oscillation/efield đều schema+run RIÊNG. **SỬA: tách
  `waveSchema.ts` + `runWaves.ts` RIÊNG, không đụng planSchema/runPhysics/
  kinematics.** Logic số học (đã đúng 100%) di dời nguyên. "Cấm trộn op sóng"
  tự tan (plan riêng). Sau tách → zero-breaking.
- **[W2 VỪA]** Import sai: `PiRat` ở `piScalar.ts:180`, KHÔNG phải `./oscSchema`
  (không tồn tại). Sửa `import { PiRat, toPiScalar } from './piScalar'`.
- **[W3 THẤP]** λ = divP(2π, spaceCoeff) ra PiScalar bậc 0 → thêm helper
  piToScalar khi k=0 để tính v=λf.
- Điểm son: log10Exact "chỉ exact khi tỉ số lũy thừa √10" ĐÚNG + certify được;
  đếm giao thoa tất định; piScalar export ĐỦ (không cần sửa piScalar.ts).

## ĐIỆN TRƯỜNG — 1 lỗ CAO đụng bản chất toán
- **[E1 CAO]** Chồng chất tam giác đều C6 KHÔNG exact được qua tọa độ: đỉnh có
  tung độ 3√3/2 vô tỉ → khai `at:[1.5, 2.598...]` cắt cụt → r² không ra đúng 9 →
  sqrt rơi NULL (radicand > 1e12) + recognize trượt (lệch ~2e-4 >> EPS). Gate
  đối xứng §7.3(b) cho qua (đối xứng theo x) → engine buộc serve FLOAT "giả đối
  xứng" — đúng thứ §1/§3.2 thề không làm. **CHỐT PHƯƠNG ÁN A** (điều phối quyết):
  đổi đường chồng chất đối xứng sang **trigOf-góc** — khai `{|q| chung, r chung,
  angleBetweenDeg}`, engine tính E_res = √(2E²(1+cosθ)); θ=60 → cos=1/2 exact →
  E√3 exact, KHÔNG cần tọa độ đỉnh vô tỉ. Giữ được bài √3 kinh điển. Kèm: siết
  gate (b) "mọi tọa độ + điểm khảo sát cho scalarFromNumber ra exact VÀ mỗi r²
  hữu tỉ"; chứng chỉ đối xứng đổi `perpComp.exact.num===0n` → `isZeroS(perpComp)`
  (tự fallback float, không crash/oan).
- **[E2 VỪA]** Thiếu `qtyLength` cho tọa độ (LEN_TO_SI kinematics chỉ có m/km,
  thiếu cm/mm). Thêm bảng `{m:1, cm:1/100, mm:1/1000}` cho efield; thiếu → r²
  theo cm² lệch 10⁴.
- **[E3 VỪA]** field_at tính |E| qua r³ (có căn) rơi float với tọa độ lẻ →
  single-charge/collinear tính thẳng kEff·|q|/r² (chỉ cần r² hữu tỉ).
- **[E4 THẤP]** equilibrium_field nới superRefine (E optional khi mọi query trỏ nó).
- Điểm son: K=rat(9000000000n) kham 9·10⁹ exact THẬT (9/10 chạy); 10^n qua factor
  đơn vị hữu tỉ ổn; r² khử căn E một-điện-tích đúng (C4 exact dù r=√5); additive
  hoàn toàn, không breaking.

## Phân xử điểm phân vân (tóm): sóng cơ §16 và điện trường §14 — xem báo cáo agent;
điểm nổi bật đã chốt: piScalar là file nền chung (bỏ ràng buộc thứ tự merge);
displayEField khoa-học-hoá text (approx+exact vẫn lưu); efield geometry cắt hẳn
v1; tam giác đều đi đường trigOf (E1-A).

## Kết luận
Cả hai CHƯA đủ chín để code ngay (mỗi spec 1 CAO). Sửa tối thiểu:
- Sóng cơ: W1 (tách pack) + W2 (import) → xanh. Ưu tiên code TRƯỚC (chín nhất).
- Điện trường: E1-A (đường trigOf) + E2 (qtyLength) + E3/E4 → rồi code.
Không spec nào đòi sửa file nền đã ship. Breaking chỉ phát sinh nếu sóng cơ giữ
thiết kế merge — nên tách.
