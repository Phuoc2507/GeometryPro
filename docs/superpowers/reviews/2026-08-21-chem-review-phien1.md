# Phản biện Hóa học — chem pack v0 (phiên 1, 21/08/2026)

> Báo cáo của agent phản biện chuyên môn Hóa (lăng kính giáo viên Hóa THPT VN +
> kỹ sư kiểm thử). Tài liệu soi: `specs/2026-08-21-chem-pack-design.md`,
> `plans/2026-08-21-chem-pack-v0.md`, đối chiếu `specs/2026-08-21-engine-pack-architecture-design.md`.
> Đã tự cân lại 50 phương trình, tính lại 10 bài mẫu bằng tay, kiểm chứng hạ tầng
> thật (`scalar.ts`, `vitest.config.ts`).

## Kết luận tổng

- **DB 50 phản ứng: 50/50 đúng sản phẩm + hệ số; 10/10 bài mẫu đúng đáp số.**
- **NHƯNG chưa đạt chuẩn phát hành**: 4 record (R19, R23, R29, R39) mang miền áp
  dụng không được máy cưỡng chế — engine sẽ trả đáp số SAI có "con dấu tự kiểm"
  cho các bài kinh điển (Fe+AgNO3 dư → sai 20%; CO2 dư → sai gấp đôi; nhỏ từ từ
  axit → sai). Bảo toàn khối lượng KHÔNG bắt được sai miền áp dụng.
- **Spec chưa đủ chín để thi công** vì 4 điểm chặn: F9 (thiếu tầng ion cho guard
  trao đổi — agent thi công sẽ bí ở Task 4), F6 (schema thiếu trường domain),
  F8 (công thức C% sai khi có chất rắn dư), F13 (hai spec vênh nhau chưa phân xử).
- Một vòng sửa spec theo danh sách dưới là đủ để bấm nút thi công.

## Finding mức CAO

- **[F1]** Guard G2 (kim loại + muối) phát biểu dạng ⇔ nên kết luận "không phản
  ứng" SAI cho muối Fe³⁺: Cu + FeCl3 và Fe + FeCl3 là phản ứng thật (Cu+2FeCl3→
  CuCl2+2FeCl2; Fe+2FeCl3→3FeCl2). Sửa: muối Fe³⁺ + kim loại từ Cu trở lên →
  guard trả null → "ngoài phạm vi DB v0"; G2 chỉ kết luận "không phản ứng" khi
  cation muối ở hóa trị thấp nhất thông dụng.
- **[F2]** G2 với {K, Ba, Ca, Na} + dd muối: "không phản ứng" sai — kim loại kiềm
  phản ứng với nước trước (K+CuSO4: sủi bọt + kết tủa xanh). Sửa: nhánh riêng trả
  error "phản ứng với nước trước, ngoài phạm vi v0", không dùng khuôn noReaction.
- **[F3]** R23 (Fe + 2AgNO3): không có guard máy chặn ca AgNO3 dư. Ví dụ 0,1 mol
  Fe + 0,25 mol AgNO3: engine ra 21,6 g Ag; đáp đúng 27 g (Ag⁺ dư oxi hóa Fe²⁺).
  Sửa: domain `mustBeLimiting: AgNO3` (n(AgNO3) ≤ 2n(Fe)); vi phạm → error. Không
  làm guard thì phải xóa record.
- **[F4]** R29 (CO2 + Ca(OH)2): thiếu guard CO2 dư. 0,3 mol CO2 + 0,2 mol Ca(OH)2:
  engine 20 g kết tủa; đáp đúng 10 g. Sửa: domain n(CO2) ≤ n(Ca(OH)2).
- **[F5]** R19 (Fe + 4HNO3 loãng): "HNO3 dư" chỉ nằm trong note văn xuôi. Sửa:
  domain `requireExcess: HNO3`; mọi ca HNO3 hữu hạn → "ngoài phạm vi v0".
  (R17 Cu + H2SO4 đặc giữ nguyên — Cu một hóa trị, an toàn.)
- **[F6]** (gốc F3–F5) Schema ReactionRecord thiếu trường điều-kiện-miền máy-đọc.
  Thêm `domain?: { requireExcess?: string[]; mustBeLimiting?: string[];
  maxRatio?: {of, per, ratio} }` + stoich.ts enforce trước khi trả đáp.
- **[F7]** R39 (Na2CO3 + 2HCl): sai cho dạng "nhỏ từ từ axit thiếu" (0,1 mol HCl
  vào 0,06 mol Na2CO3: engine 1,12 L; đúng 0,896 L). Sửa: guard n(HCl) ≥ 2n(Na2CO3).
- **[F8]** Công thức C% quên trừ CHẤT RẮN DƯ chưa tan: m_dd sau = Σ đổ vào − m kết
  tủa − m khí − m chất rắn còn dư (mọi species solid có after > 0). Ví dụ 16,8 g Fe
  + 200 g dd HCl 7,3%: đúng 12,05%, công thức spec cũ ra 11,74%.
- **[F9]** Guard trao đổi KHÔNG thi công được: thiếu tầng ion. Sửa: từ điển ion
  đóng `IONS` (~30 hợp chất của DB), whitelist anion {NO3⁻, Cl⁻, SO4²⁻, CO3²⁻, OH⁻}
  + cation {Na⁺, K⁺, NH4⁺, Mg²⁺, Ca²⁺, Ba²⁺, Al³⁺, Zn²⁺, Fe²⁺, Fe³⁺, Cu²⁺, Ag⁺,
  Pb²⁺}, luật riêng NH4⁺ + OH⁻ → NH3↑ + H2O (hiện bảng tính tan làm NH4OH thành
  kết tủa — sai), ngoài whitelist → null. Thêm 1 step vào plan Task 4.

## Finding mức VỪA

- **[F10]** Asserts đối chiếu dữ kiện ĐỀ phải có `tol` (đề GDPT 2018 làm tròn:
  0,15·24,79 = 3,7185 ≈ "3,72 lít" sẽ nổ violation oan nếu so exact). Bảo toàn
  nội bộ vẫn exact.
- **[F11]** "Ít tan" (CaSO4, Ca(OH)2): sản phẩm duy nhất thuộc cột ít tan → guard
  trả null (ngoài phạm vi), không phán.
- **[F12]** Matching tập-con sinh "đa phản ứng" giả (CaCO3+HCl+t° khớp cả R40 lẫn
  R43). Sửa: record nhiệt phân 1-chất chỉ khớp khi mix có đúng 1 chất; ưu tiên
  record khớp trọn tập chất.
- **[F13]** Hai spec vênh nhau (ChemPlanSchema, ReactionRecord.phenomena,
  ChemScene, tên file, thiếu chem/index.ts): CHỐT chem-pack-design thắng toàn bộ;
  thêm dòng "superseded by chem-pack-design §8–§12" vào spec kiến trúc §6.3/§8
  (làm sau khi phản biện kiến trúc xong); ý tưởng `effects` có cấu trúc → v1.
- **[F14]** Tags 50 record không theo format taxonomy 4 tầng
  (`hoa/9-10/kim-loai/tac-dung-axit`) → sẽ bị isKnownTag drop lặng lẽ. Viết lại
  cột tags theo registry.
- **[F15]** Ar = 40 sai bảng SGK (in 39,9) → sửa 39,9 hoặc xóa dòng (DB không dùng).
  34/34 NTK còn lại đúng (Hg 201, Sn 119, Ni 59, Cr 52 xác nhận đúng).
- **[F16]** Bảng màu thiếu chất rắn DB sinh ra: CuCl2(r) vàng nâu, FeCl3(r) nâu
  đỏ, Ca(OH)2(r) trắng, Na2CO3(r) trắng + default màu cho solid ngoài bảng; thêm
  test integrity: mọi sản phẩm của DB phải tra được màu có chủ đích.
- **[F17]** Nhãn type R29/R30 "trao đổi" khiên cưỡng → nhãn riêng
  ('oxit-axit + bazơ' / 'oxit lưỡng tính + kiềm') hoặc bỏ nhãn.
- **[F18]** Lỗ coverage: bổ sung 6–8 phản ứng canon KHÔNG mang rủi ro miền:
  K + H2O; Mg + CuSO4; BaCl2 + H2SO4; AgNO3 + HCl; Ba(OH)2 + Na2SO4;
  NaHCO3 + HCl; NaHCO3 + NaOH; Ca(OH)2 + Na2CO3.
- **[F19]** G4 thụ động hóa (Al/Fe + HNO3/H2SO4 đặc nguội) chỉ áp khi
  heated=false; heated=true + đặc → "ngoài phạm vi v0".
- **[F20]** Bảng luật suy `state` tường minh: kim loại/oxit → solid; muối tan +
  amount solution → solution; muối không tan → solid; khí danh sách đóng → gas;
  còn lại → bắt LLM khai.

## Finding mức THẤP

- **[F21]** divExact throw khi chia 0 (CM với V tổng = 0) → catch tại stoich.ts,
  trả error, giữ bất biến "không bao giờ throw".
- **[F22]** Chặn lượng chất ≤ 0 trong schema Qty; cấm chuỗi có dấu phân cách
  nghìn kiểu "1.000".
- **[F23]** Mọi reactant đều excess → error "không có chất hữu hạn" (ξ vô định).
- **[F24]** Scene: "nhạt dần" khi consumed > 0; "mất màu" chỉ khi after = 0
  (bài 1 CuSO4 dư không được phát "mất màu").
- **[F25]** Xóa 'đpnc' khỏi enum conditions (0/50 record dùng).
- **[F26]** Error chuẩn cho: volume_gas trên chất không khí, CM trên chất rắn,
  query `of` không có trong sổ cái.
- **[F27]** Bảng 50 record cần cột conditions/variant/domain chuẩn hóa theo enum
  để agent chép nguyên văn không phải diễn dịch.
- **[F28]** Câu chữ Ag "trắng xám", Fe3O4 "nâu đen", FeS "xám đen": chấp nhận được.

## Phân xử 9+1 nghi vấn tự khai (§16)

1. R06 Cu+Cl2: GIỮ "khói màu vàng nâu" + thêm CuCl2(r) vào bảng màu.
2. Màu dd CuCl2: CHỐT "xanh lam" (đồng bộ Cu²⁺), comment về ngả lục khi đặc.
3. R23: GIỮ + guard mustBeLimiting (không chấp nhận "dựa vào LLM").
4. R19: GIỮ + requireExcess HNO3.
5. R09 Ca+H2O: GIỮ "sủi bọt; dd vẩn đục (Ca(OH)2 ít tan)".
6. CHỐT NaAlO2 (parser không có ngoặc vuông; đề luyện thi quen NaAlO2); v1 muốn
   đổi phải mở rộng grammar trước.
7. R38 NH4Cl+NaOH: GIỮ t°; ca không đun → thông báo "cần đun nóng nhẹ", tuyệt
   đối không rơi vào "không phản ứng"/"kết tủa NH4OH".
8. NTK: Hg/Sn/Ni/Cr đúng; Ar sửa 39,9.
9. R05 "khói màu nâu đỏ": đúng nguyên văn SGK.
10. Ứng viên v1: cả 7 phương trình đúng hệ số; Cu+2FeCl3 chỉ vào v1 SAU khi sửa
    G2; axit đặc phải mang requireExcess; hoãn 4Na+O2 là đúng.

## 3 bài đề VN thiết kế hiện tại giải SAI (phải bị guard chặn sau khi sửa)

1. 5,6 g Fe + 0,25 mol AgNO3 → engine 21,6 g (đúng: 27 g) — F3.
2. 6,72 L CO2 (đktc) + 200 ml Ca(OH)2 1M → engine 20 g (đúng: 10 g) — F4.
3. Nhỏ từ từ 100 ml HCl 1M vào 100 ml Na2CO3 0,6M → engine 1,12 L (đúng: 0,896 L) — F7.

## Ghi chú kiểm chứng thêm

- Tự kiểm bảo toàn exact với NTK 35,5: KHẢ THI (mọi NTK hữu tỉ, trường Q đóng kín);
  nhưng phải ghi rõ trong §9.5: bảo toàn KHÔNG bắt được sai miền áp dụng.
- Bẫy float qua chuỗi thập phân: kín cho JSON number thường; cảnh báo trace khi
  phân số > 15 chữ số.
- Plan TDD: bổ sung step tầng ion (Task 4), bảng suy state (Task 6), test phủ màu
  (Task 7), test chặn số âm (Task 1), test đa-phản-ứng + domain guard.
