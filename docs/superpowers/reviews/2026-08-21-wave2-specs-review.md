# Phản biện 3 spec đợt 2/3 (dynamics · oscillation · dc-circuit) — 21-22/08

> Agent phản biện đã: tính lại tay + script độc lập 31 bài contract (11+10+10)
> và stress-tree — KHÔNG SAI MỘT SỐ NÀO; chạy thật recognize.ts (xác nhận nhận
> kπ/m nhưng KHÔNG nhận π², √b·π, k/π — PiScalar của spec dao động là cần thiết);
> tái lập nguyên văn parser AnimatedAgent xác nhận eval được Math.cos; đối chiếu
> mọi viện dẫn code với file thật.

## Kết luận + xếp hạng độ chín

| Hạng | Spec | Trạng thái | Sửa TỐI THIỂU trước khi code |
|---|---|---|---|
| 1 | dc-circuit | Chín nhất, không blocker | CI-1, CI-3, đổi tên query `resistance` |
| 2 | dynamics | Gần chín | DY-1, DY-2, DY-3, DY-4 |
| 3 | oscillation | Chưa đủ chín | OS-1, OS-2, OS-4 (+OS-3, OS-5 cùng vòng) |

Cả ba phụ thuộc `kinematics.ts` của v0 — ràng buộc "code SAU merge physics v0"
giữ nghiêm. Đề nghị 3 phán quyết CHUNG: (a) label scene KHÔNG nhúng giá trị
engine tính (đồng bộ F8) — giá trị nằm ở answers[]; (b) hiển thị thập phân
("0,55" vs "11/20") là việc tầng bridge/UI, engine giữ exact-first; (c) chính
tả field query dùng chung theo v0 (`value`/`vUnit`/`component`).

## Findings DYNAMICS

- **[DY-1 CAO]** `min_force_to_move` với góc âm lớn: mẫu (cosα + μ·sinα) < 0 ⇒
  serve LỰC ÂM mà thay-ngược vẫn pass (sai có con dấu — pattern miền-áp-dụng).
  CHỐT: v1 chỉ nhận α = 0; α ≠ 0 → v2 kèm guard mẫu > 0.
- **[DY-2 VỪA]** Dạng chuẩn SGK "hai vật nối dây CÙNG mặt ngang" bị schema từ
  chối nhưng KHÔNG khai trong mục ngoài-phạm-vi → thêm khai báo + few-shot abstain.
- **[DY-3 VỪA]** Field name lệch v0: dynamics dùng `{velocity, velocityUnit}`,
  v0 thật dùng `{value, vUnit, component}` → theo v0.
- **[DY-4 VỪA]** Spec khai import "bảng EXACT_TRIG" — bề mặt thật của v0 là HÀM
  `trigOf` → sửa.
- **[DY-5/6/7/8 THẤP]** time_when(position) sau khi dừng vĩnh viễn → error
  "không bao giờ đạt"; định nghĩa check `static_threshold` cho D3; message
  nhánh "chiều khai không khớp" (vật trượt xuống); ghi chú chân trời ròng rọc;
  tránh trùng ký hiệu D1-D11.

10 phán quyết §17 (đã chốt): op observed → v2; giữ acceleration đại số (dấu);
min_force α=0-only; khoá cứng text "-5/2 + 5√3" (đã chạy máy xác nhận); giữ
schema mass/g optional; "đứng yên" là đáp hợp lệ + khai rõ ma-sát-nghỉ ngoài
phạm vi + message riêng Atwood cân bằng; T_phys 2s giữ; meta.model giữ; tự
hiện thực ~60 dòng thay vì tái dùng compute v0; hệ 2 vật v0≠0 giữ chặn.

## Findings OSCILLATION

- **[OS-1 VỪA — chặn]** Scene nhúng GIÁ TRỊ engine tính vào label ("Biên +A
  (4 cm)", "T = 2 s") — mâu thuẫn F8 và mâu thuẫn chéo với dynamics cùng đợt.
  CHỐT: label trần, giá trị ở answers[].
- **[OS-2 VỪA — chặn]** PiRat cho omega/T/f/count.dt không chặn ≤ 0: T=0 ⇒
  divExact THROW xuyên pipeline; omega âm ⇒ T/f/vmax âm serve mà tự kiểm vẫn
  pass. CHỐT: refine "> 0 sau quy đổi" + không bao giờ ném ra ngoài.
- **[OS-3 VỪA]** Claim "so exact bằng cmpScalar, không snap float" không đứng:
  cmpScalar khác radicand rơi float EPS 1e-9 (answer.ts:139-147). CHỐT: so
  bằng equality struct Exact + luật "hữu tỉ vs mốc vô tỉ ⇒ mismatch".
- **[OS-4 VỪA — chặn]** Diff vào v0 kê thiếu (refine cấp plan units.time='s',
  length∈{m,cm} đụng planSchema nhiều hơn "2 dòng"); plan trộn mover1d +
  oscillator không bị cấm mà cm làm qty* v0 THROW. CHỐT: cấm mixed-op v1 +
  kê diff thật.
- **[OS-5 VỪA]** initial {x0:0, v0:0} ⇒ A=0 ⇒ chia 0 tính φ → guard "không
  dao động".
- **[OS-6 THẤP]** Sửa dẫn chiếu §6.3; x_at_speed cho v ≥ 0; error tường minh
  khi query trỏ nhầm loại op; formatter "1/5 s" theo phán quyết chung; chép
  nhắc quota F1.

Điểm son: PiScalar đúng và cần thiết (recognize không cứu được π², √b·π, k/π —
đã chạy máy); EXACT_COS 16 điểm là mở rộng C8 hợp lệ (cần 1 dòng phán quyết);
gAsPiSquared xử lý "g=π²" bằng đại số phân bậc — thiết kế đẹp.

10 phán quyết §14 (đã chốt): per-quantity chấp nhận (v0 đã vậy một phần);
PiRat giữ + few-shot pha phân số; KHÔNG mở rộng recognize v1; first_time t>0
nghiêm giữ; gAsPiSquared → prompt hướng dẫn override tol=0.02, engine không
tự nới; "π²=10" → engine trung thực, xấp xỉ là việc lời giải; φ thiếu ⇒ không
animate (dựng tĩnh), con lắc cung tròn v2; vmax+amax→ω ngoài v1; trần |k|≤2
giữ; speed/x trả 1 số dương giữ.

## Findings DC-CIRCUIT

- **[CI-1 VỪA]** 2 dạng phổ biến chưa khai phạm vi: khóa K / nối tắt / 2 trạng
  thái mạch; bài nghịch tìm E,r từ HAI lần đo → thêm vào §4 + few-shot abstain.
- **[CI-2 THẤP]** Topology cây sai do LLM ép mạch cầu: không có phòng tuyến máy
  (spec đã khai trung thực) → few-shot 1 ví dụ mạch cầu → abstain; mọi số đo dư
  → asserts.
- **[CI-3 THẤP]** Đếm phủ query sai: total_resistance 5→6, current 9→12.
- **[CI-4 THẤP]** EPS_LAMP trùng EPS_SELF → dùng chung.

Kiểm riêng: chia dòng nút, hiệu suất 2 đường kiểm chéo, kWh exact, đại số
Möbius cả 2 quy tắc hợp thành — đều đúng. Tự kiểm K1-K4 + thay-đáp-ngược là
mạnh nhất trong 3 spec.

10 phán quyết §15 (đã chốt): đèn R hằng theo thông lệ + ghi assumption; ĐỔI
`total_resistance` → `resistance(of?)`; U chéo nhánh → luật "M/N không phải
hai mút một khối ⇒ abstain"; bài nghịch giữ Möbius tổng quát; efficiency giữ
%; runCircuit entry riêng; circuitLayout draft chấp nhận; thập phân để bridge
(áp chung 3 spec); giữ 'Ω'; scalarFromNumber import từ kinematics.
