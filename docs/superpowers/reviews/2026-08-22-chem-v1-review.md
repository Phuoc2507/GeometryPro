# Phản biện spec Hóa-v1 mở rộng (22/08)

> Chuyên gia Hóa soi trọn spec v1 (801 dòng) + code chem v0 + 151 test. Tự cân
> tay 38 record, tính tay 6 bài cơ chế, đối chiếu từng test v0.

## Kết luận: hóa học CHẮC, hạ tầng CHƯA chín

- **38/38 record tự cân lại đúng hệ số + sản phẩm + hiện tượng SGK.** Không
  record nào sai hóa học (soi kỹ cân electron R62/R63/R80/R94; M các chất mới
  đều đúng).
- **3 cơ chế mới tính tay 6 bài đều đúng + tất định:** trộn tuần tự (0,896 L
  xuôi / 1,12 L ngược), 2 muối (10 g / 5,3+8,4 g), nối tiếp Fe+AgNO3 (27 g / 32,4 g).
  Thứ tự ưu tiên C đúng dãy điện hóa (E° Ag+/Ag > Fe3+/Fe2+).
- **R51–R58 spec "giả định" → XÁC NHẬN ĐÚNG 100%** so với reactionDB.ts. Dải
  R59–R96 không xung đột đánh số.

## Sửa tối thiểu trước khi code (6 việc)

- **[CAO-3]** Schema `domain` §1.1 GIỮ `reason: string` bắt buộc (v0 dùng ở
  checkDomain/checkQualitativeDomain — bỏ đi là vỡ R19/R23/R29/R39); soạn reason
  cho 13 domain mới (R61,62,65,66,68,73,74,80,85-89).
- **[VỪA-1]** maxRatio ratio "1/2" khiến `stoich.ts:108 parseDecimal` THROW (vỡ
  bất biến never-throw). Viết `parseRatio("a/b")` chia hữu tỉ exact HOẶC dùng
  "0.5"/"1"; sửa stoich.ts:108 + test.
- **[VỪA-3]** Nâng runChem `matches>=2 → đa phản ứng` thành điều phối domain +
  enforce `stageOnly` (lọc R95 khỏi findMatches) + dispatcher B chặn TRƯỚC
  findMatches (kể cả định tính); test từng họ cùng-tập-chất (R39/R95, R65/R88,
  R73/R74). Giữ "đa phản ứng" cho ambiguity thật.
- **[CAO-2]** Sửa §0.3.1 (khai SAI "mọi plan v0 chạy đúng kết quả cũ") → "plan
  v0 CHO ĐÁP hợp lệ giữ nguyên; plan v0 TRẢ ERROR trong §0.3.2 nay giải thật".
  Liệt kê 7 test v0 phải cập nhật: 4 contract (Cu/Fe+FeCl3, Fe+AgNO3 dư →27g,
  CO2+Ca(OH)2 dư →10g — v0 error, v1 giải) + 3 integrity đếm cứng.
- **[CAO-1]** Whitelist ion mở rộng (HCO3⁻/SO3²⁻/S²⁻/ClO⁻/AlO2⁻): **HOÃN sang v2**
  (khuyến nghị mạnh). Lý do: (a) phá test v0 khóa cứng `IONS['NaHCO3']
  undefined`; (b) guard hiện chỉ duyệt cation×anion, KHÔNG biểu diễn được luật
  anion+anion (OH⁻+HCO3⁻→CO3²⁻) → phán "không phản ứng" SAI cho NaHCO3+Ca(OH)2
  (làm mềm nước cứng, đề kinh điển); (c) whitelist KHÔNG cần cho 38 record chạy
  (record khớp qua findReactions theo formula). Nếu vẫn mở v1 → BẮT BUỘC
  redesign guard + test 3 ca anion+anion.
- **[VỪA-2]** Cập nhật test integrity đếm cứng: 58→96 record, domain 4→17.

## Độc lập với whitelist: [VỪA-4] solubilityOf phải exhaustive
R87 (CaSO3↓)/R93 (FeS) cần inferFixedState suy solid → solubilityOf phải biết
SO3²⁻/S²⁻ + có `default` an toàn (hiện không default → undefined ngầm → bỏ sót
kết tủa). Cần dù có hoãn whitelist hay không.

## Phân xử 14 điểm §6 (đã chốt)
Màu MnCl2 "không màu", KNO2 "trắng", Javel "không màu"; equilibrium record
định-tính-only + in ⇌ chú thích "lớp 9 viết →"; R66 mustBeLimiting C đúng; R72
quy ước SGK luôn CO2; dropwise mơ hồ → error + quy ước prompt "từ từ/từng giọt"
→ dropwise=true; thêm solventWater cho R84 (P2O5+nước dư); T=1/T=2 biên đúng;
CO2+Ba(OH)2/KOH giữ v2; R51-R58 xác nhận; R80 requireExcess đủ; R74 hai miền
O2 rời nhau đúng. Record §3.3 chủ động loại: ĐỒNG Ý toàn bộ.

## Breaking change với v0?
CÓ, hai loại: (1) cải thiện có chủ đích — 7 test cập nhật (an toàn); (2) nguy
hiểm nếu code ẩu — bỏ `reason` + maxRatio "1/2" throw (KHÔNG được lọt). KHÔNG
có mâu thuẫn buộc sửa data/hệ số record v0 đã ship — chỉ mở rộng type/logic.

## Trạng thái
Hóa-v1 KHÔNG nằm trong đường găng người dùng (route/frontend/chương Lý). Xếp
sau: sửa spec theo 6 việc → phản biện lại phần schema → code. Chưa gấp.
