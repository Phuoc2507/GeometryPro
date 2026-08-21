# Săn lỗi code + kiểm Hóa — chem pack v0 (commit 1a35052)

> Xác nhận: 139 test chem xanh, toàn suite 1277 xanh. Agent soi TỪNG record ở
> tầng code (kiến thức hóa, không chỉ máy), kiểm 28 finding review trong code
> thật, bẻ engine 19 bài.

## DB 58 record: SẠCH tuyệt đối
R01–R50 đúng 100% sản phẩm + hệ số + điều kiện + redox flag; R51–R58 (F18)
đúng 8 phương trình. Không lỗi chép spec→code. Các chốt §16 hiện diện nguyên văn.

## 28 finding review: hiện diện thật (trừ F14 nửa vời)
Domain guard R19/R23/R29/R39 enforce TRƯỚC khi tính (stoich.ts); F8 C% trừ rắn
dư kiểm tay khớp (16,8g Fe → 12,05%); F9 tầng ion + NH4OH→khí; F16 integrity
màu THẬT (phủ mọi sản phẩm); F20 suy state 2 chiều. Test tái-cân-bằng + bảo
toàn khối lượng theo record là chốt tốt.

## Finding CAO (đúng loại "dạy sai có dấu kiểm chứng")

- **[CAO-1] Spectator ẩn**: khi 1 record khớp TẬP CON species, phần thừa bị gán
  role 'spectator' mà KHÔNG kiểm tính trơ. Bằng chứng: Al(0,1)+Fe(0,1)+
  CuSO4(0,25) → chỉ R20 (Al+CuSO4 vắng DB) khớp → ok:true, Cu=6,4g, Al nguyên
  vẹn; đáp đúng 16g (Al hoạt động hơn phản ứng trước). Bài "hỗn hợp kim loại +
  muối" cực phổ biến lớp 9. SỬA: sau khi chọn record, với mỗi species ngoài
  record chạy kiểm cặp với mọi chất còn lại — nếu findMatches ra record →
  "đa phản ứng"; nếu classifyNoMatch KHÔNG trả no_reaction → bail "ngoài phạm
  vi (chất X có thể phản ứng)". Chỉ cho spectator đi tiếp khi mọi cặp no_reaction.
- **[CAO-2] Phán bừa "không phản ứng" cho axit đặc + muối rắn**: NaCl(r)+H2SO4
  đặc t° → noReaction, thực ra là bài điều chế HCl (SGK 10); tương tự KNO3+
  H2SO4 đặc (điều chế HNO3). Nhánh trao đổi bỏ qua `variant`. SỬA: species nào
  có effectiveVariant='đặc' → nhánh trao đổi trả null (ngoài phạm vi).

## Finding VỪA

- **[VỪA-3] F14 nửa vời**: tags đúng FORMAT nhưng lệch REGISTRY kiến trúc (DB
  dùng `hoa/9/...`, seed kiến trúc `hoa/9-10/...`) và taxonomy/tags.ts chưa tồn
  tại (grep isKnownTag = 0). Khi bridge lọc theo seed → 58 record mất taxonomy
  lặng lẽ. CHỐT một nguồn sự thật (khuyến nghị: registry lấy từ tags DB) + test
  membership cross-module khi tags.ts ra đời.
- **[VỪA-4] parseDecimal hở "x.500"**: chặn "1.000" nhưng "1.500"→1,5, "2.500"→
  2,5 (đề VN "2.500 gam" = 2500 → sai 1000 lần im lặng). SỬA: dấu '.' + 3 chữ
  số thập phân → từ chối.
- **[VỪA-5] volume_gas(H2O)** trả "2,24 L (đktc)" vô nghĩa (R45-R48 để H2O state
  'gas' cho hiện tượng). SỬA: dùng GAS_SET làm điều kiện (H2O không thuộc).
- **[VỪA-6] Test F21 gác nhầm nhánh**: ca chia-0 thật (mix không có solution,
  Na+H2O hỏi CM) chưa test nào phủ. Thêm test.

## Finding THẤP
G2 câu chữ "Fe đứng sau Fe" → "không đứng trước"; tol assert nhận number
không nhận "0,001"; BaCl2+H2SO4 đặc out-of-scope (an toàn); mix 1 chất trơ
hơi cứng.

## Kết luận
DB sạch, 17/19 bài bẻ đúng, nhưng 2 lỗi CAO phải vá trước khi ship: spectator
ẩn (i) + variant đặc trao đổi (ii) + "x.500" (iii) + 3 test gác (spectator,
đặc-trao-đổi, chia-0 thật). VỪA-3 chốt trước khi bridge v1 dùng taxonomy.
