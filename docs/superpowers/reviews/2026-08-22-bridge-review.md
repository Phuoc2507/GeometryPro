# Phản biện cầu LLM + route (22/08) — commit bc13a8d

> Phản biện tĩnh + dry-run (không có VILAO_API_KEY nên không test đường LLM
> thật). Mọi lỗi "đáp sai âm thầm" đều tái hiện THẬT bằng solvePhysics/ChemPlan
> qua bundle. Nền bridge: 36/36 test xanh.

## Kết luận: PHẢI có hậu-kiểm tất định trước khi nối frontend
Engine tự-kiểm (backsub) chỉ kiểm mô hình TỰ NHẤT QUÁN, KHÔNG kiểm ĐÚNG ĐỀ.
Assert chỉ chạy khi đề có dữ kiện dư. Với đề "1 dữ kiện → 1 đáp" (đa số THPT),
6 điểm D25 + 5 điểm mới đều cho ĐÁP SAI ÂM THẦM ok:true.

## Rủi ro prompt (đã tái hiện thật)

- **[A1 CAO] km/h đổi hai lần**: LLM tự chia 3,6 rồi vẫn để `v0Unit:'km/h'` →
  engine đổi TIẾP → sai 3,6 lần. Prompt dặn bằng chữ, không phản-ví-dụ, engine
  không ép. → thêm phản-ví-dụ JSON SAI + quy ước "điền unit thì số PHẢI là số gốc".
- **[A2 CAO] quên axis:y hỏi độ cao**: projectile mainAxis='x'; position_at/
  time_when thiếu axis → giải trục ngang. Biến thể time_when cho đáp ma "1 s"
  tròn trịa không ai nghi. → phản-ví-dụ + hậu-kiểm B2.
- **[A3 CAO] sai dấu a** chậm dần đều: "độ lớn 3" → LLM để a:+3 (nhanh dần).
  → luật tường minh "chậm dần/hãm phanh ⇒ a ngược dấu v0".
- **[A4 VỪA] component default 'speed'** nuốt dấu vận tốc (ném lên, sau 4s đang
  rơi, trả +10 mất dấu). → "hỏi vận tốc (có chiều) ⇒ component x/y".
- **[A5 CAO] molarVolume default 24,79 = BẪY**: "điều kiện **tiêu** chuẩn"
  (đktc,22,4) vs "điều kiện chuẩn" (đkc,24,79) khác đúng chữ "tiêu"; LLM bỏ
  trống → auto 24,79 → sai +10,7%. → bảng khóa cứng cụm đầy đủ + phản-ví-dụ +
  hậu-kiểm B1.
- **[A6 CAO] excess sai chất**: đảo vai chất dư → lật limiting → sai hoàn toàn,
  bảo toàn nội bộ vẫn khớp. → "chất sau chữ 'dư' mới excess; đừng gán cho chất
  có khối lượng/mol cụ thể".
- **[A7 VỪA] variant loãng/đặc**: thiếu variant = loãng → Cu+H2SO4 đặc bị phán
  "không phản ứng" (fail-loud, nhưng sai kết luận).
- **[A8 VỪA] hệ đơn vị trộn**: đề có a=3 m/s² mà LLM chọn hệ nền km-h → a hiểu
  3 km/h² sai ~10⁴. → luật "có a/g m/s² thì hệ nền BẮT BUỘC m-s".

## Tầng HẬU-KIỂM đề xuất (deterministic, trong solveSubject sau safeParse)
- **B1 [reject cứng]** đề "đktc/tiêu chuẩn" mà molarVolume≠22,4; hoặc "đkc/điều
  kiện chuẩn" (không "tiêu") mà =22,4 → từ chối "nghi lẫn đktc/đkc".
- **B2 [reject cứng]** đề "độ cao/cao bao nhiêu" + query position_at/time_when
  trỏ projectile/free_fall thiếu axis:'y' → từ chối.
- **B3 [warn]** đề "km/h" mà không unit nào ='km/h' (nghi tự đổi); hoặc ngược lại.
- **B4 [warn]** "chậm dần/hãm phanh" mà sign(a)===sign(v0).
- **B5 [reject]** đề có a (m/s²) mà units.time='h' hoặc length='km'.
Tất cả là so chuỗi/regex, vài chục dòng, không LLM. B1/B2 reject cứng (hậu quả
nặng + tín hiệu chắc); B3/B4 warn (có false-positive).

## Classifier (bảng 17 đề hiểm, chạy thật — 14/17 đúng)
- **[VỪA-CAO] Ion trong điện trường → physics** (engine động học không có lực
  điện) → phó thác translator abstain, rủi ro đáp lệch ngữ cảnh. Sửa: STOP-words
  `điện trường|từ trường|điện tích|cảm ứng từ|hạt nhân|phóng xạ` → hạ/loại physics.
- **[VỪA] Mạch điện → geometry** (PHYS_LEXICAL không có từ khóa mạch). Engine mạch
  đã có nhưng route CHƯA có nhánh circuit. ĐỪNG thêm từ khóa mạch vào classifier
  cho tới khi route mở nhánh circuit — nếu không đề mạch → physics → động học
  abstain (tệ hơn geometry). Thứ tự đúng: mở nhánh circuit trong route TRƯỚC.
- **[THẤP] Đề trộn Lý-Hóa → chem** (bỏ câu Lý). Hiếm.
Chiều nguy hiểm thật chỉ là geometry/khác → physics/chem (đánh cược translator).

## Auth resolveAuthNoCharge
- **[VỪA] Bỏ kiểm `blocked`**: chỉ validate JWT, không đọc profiles → tài khoản
  admin đặt blocked vẫn dùng. → thêm 1 truy vấn nhẹ chặn blocked/hết hạn, KHÔNG
  trừ credit (giữ D22).
- **[VỪA-CAO] Không rate-limit**: 1 token → gọi vô hạn → đốt tiền LLM chủ. →
  trần thô ~20-30 req/phút/userId (không phải quota tính tiền, chỉ chống đốt).
- **[THẤP] catch cuối route trả error.message thẳng** → map về thông điệp chung,
  log chi tiết server.
- **[THẤP] nợ bảo trì** auth-copy → refactor resolveAiAccess nhận cờ {charge:false}.
- ĐÚNG: dry-run production 404; classifier trước auth (đề Toán không tốn auth).

## Dry-run xác nhận
Đáp khớp golden (L02/L06/H01/H03/H08); abstain/lỗi → ok:false KHÔNG ném;
jsonSafe 0 BigInt sót. Lưu ý vận hành: key sai ở production → mọi đề Lý/Hóa
ok:false im ("key not set" lọt errors) trông như "ngoài phạm vi" giả → route
nên phân biệt lỗi-hạ-tầng với lỗi-nội-dung.

## Việc phải làm trước khi nối frontend
CAO: A1/A2/A3/A5/A6 → hậu-kiểm B1+B2 (reject) + B3/B4/B5 (warn) + sửa prompt.
VỪA: A4/A7/A8 + classifier STOP-words ion + auth blocked/rate-limit.
Hậu-kiểm QUAN TRỌNG HƠN prompt (prompt chỉ dặn, không ép).
