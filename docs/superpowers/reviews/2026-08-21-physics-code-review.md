# Săn lỗi code — physics pack v0 (commit afd58b3)

> Xác nhận: tsc kernel PASS, 66/66 pack + toàn suite xanh, commit thuần additive.
> Đối chiếu finding phiên 1: F2/F8/F9/F11/F16/D3 áp đúng; F3 áp MỘT NỬA (thiếu
> guard miền + ghi giới hạn §11). Lõi toán VỮNG: không sai công thức/dấu; đổi
> đơn vị exact phủ đủ mọi đường vào; cấu hình vô nghiệm đều error thay vì bịa;
> khớp frontend kiểm từng quirk đều đúng.

## Finding

- **[CAO-1] Miền ngoài tin cậy được serve như đáp chứng thực.** position_at/
  velocity_at/time_when/*_when_velocity không guard t vượt mốc DỪNG (mover1d
  a ngược v0) hoặc vượt t CHẠM ĐẤT. Bằng chứng chạy thật: hãm phanh dừng t=5
  tại 37,5 m nhưng position_at t=8 → "24 m", velocity_at → "−9 m/s" ok:true;
  free_fall chạm đất t=3 nhưng position_at t=4 → "−35 m"; time_when position=
  −30 → "5+3√5 s" (nhánh ma). SỬA: tính t_stop + t_đất; query đụng miền ngoài
  → Check kind 'warn' "mô hình parabol không còn mô tả chuyển động thực" (chính
  sách error bàn sau); bổ giới hạn vào spec §11; test khoá.
- **[VỪA-1] Asserts nuốt check-fail**: runPhysics vòng asserts chỉ đọc approx,
  vứt r.checks — hai vật không gặp thật nhưng assert "gặp" vẫn ok:true, 0
  violation. SỬA: quét r.checks trong asserts như nhánh queries (1 dòng) + test.
- **[VỪA-2] buildCharts vẽ ĐI LÙI khi tPhys < startAt** (samples [[2,50],[1,54]]).
  SỬA: bỏ qua/kẹp đoạn [t0, max] (1 dòng) + test.
- **[VỪA-3]** answers dồn chỉ số khi query lỗi — thêm queryIndex vào PhysicsAnswer.
- **[VỪA-4]** Meet lệch trục: chặn được nhưng đáp vẫn nằm answers[] + message kỹ
  thuật — backsub fail → trả ok:false "hai vật không thực sự gặp nhau (lệch …)".
- **[VỪA-5]** time_when trên vật đứng yên tại đúng vị trí hỏi → "không bao giờ
  tới" (sai). SỬA: k1=k2=0 → |k0−pos|≈0 ⇒ t₀ + info; ngược lại error đứng-yên.
- **[VỪA-6]** charts.events thiếu field value (spec §8.3 có).
- **[THẤP]** (1) hai quy ước trước-t₀ (reject vs clamp) — thống nhất theo §6.2
  clamp; (2) lỗi zod không kèm path; (3) phân số xấu "2943/100" → den 2^a·5^b
  in thập phân; (4) fmtNum |x|<5e-5 in "0"; (5) switch không default → thêm
  exhaustive check; (6) angleDeg=180 không chặn (|angleDeg|≤90 hợp lý cho
  projectile); (7) va chạm id scene vật tên "G" với mốc G0; (8) cặp exact/float
  lệch quanh nghiệm kép hệ số float (fail-safe, ghi nhận); (9) parse fail
  timeScale:0 → 1.
- **Test thiếu**: mọi ca CAO-1; meet không-bao-giờ-gặp (hành vi đúng, chưa khoá);
  meet lệch trục; assert-check-fail; g=9,81; angleDeg lẻ 37°; t=0.

## Bảng bẻ engine (18 bài): 14 ĐÚNG (kể cả exact "1+√5 s", "20√2 m/s", loại
nghiệm trước-t₀, 4 cấu hình không-gặp đều error) — 4 SAI đều thuộc CAO-1.

## Kết luận
Sửa tối thiểu TRƯỚC khi nối route/serve: CAO-1, VỪA-1, VỪA-2 (+test khoá).
Ở phạm vi v0-nội-bộ-chưa-nối-dây: đủ chất lượng làm nền. VỪA-3→6 + THẤP xử
lý cùng đợt hoặc trước P2.
