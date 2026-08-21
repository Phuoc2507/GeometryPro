# Nhật ký quyết định — phiên chạy tự quản đêm 21/08/2026

> Người dùng giao toàn quyền trong ~5 giờ (từ ~23:30 giờ VN): lên lịch, giao việc,
> phản biện, code nhiều vòng lặp. Mọi quyết định tự đưa ra đều ghi tại đây để
> sáng hôm sau duyệt lại. Quyết định nào bị bác thì đảo lại được — không có gì
> irreversible ngoài các commit docs/code trên nhánh `claude/edu-tech-ecosystem-if51pn`
> (chưa merge vào main, chưa deploy).

## Bối cảnh nhiệm vụ

Mở rộng geo3d thành đa môn theo mô hình "engine pack": Vật lý động học lớp 10 +
Hóa vô cơ THPT, cùng dây chuyền "LLM chỉ dịch → engine tất định tính + tự kiểm".
Pipeline: spec (3 agent) → phản biện thiết kế (2 agent) → sửa spec → thi công
(2 agent, TDD) → phản biện code (2 agent) → tích hợp + full test → báo cáo.

## Quyết định đã đưa ra

- **D1 · Mở phiên phản biện thiết kế sớm, không chờ plan Lý.** Lý do: spec thiết kế
  Lý đã xong, chỉ thiếu file plan (checklist thi công) — tôi tự soát phần đó.
  Rút ngắn đường găng ~30 phút.
- **D2 · Giao thêm agent "bộ đề vàng" 24 bài (12 Lý + 12 Hóa) ngoài kế hoạch gốc.**
  Lý do: người dùng muốn giao nhiều việc song song; kho bài này thành contract
  test bổ sung cho giai đoạn thi công, không giẫm chân ai.
- **D3 · Commit docs theo từng đợt agent hoàn thành** (thay vì gom một commit cuối).
  Lý do: stop-hook của repo yêu cầu; chấp nhận lịch sử có bản nháp trung gian
  trên nhánh làm việc.
- **D4 · Bảng nguyên tử khối dùng giá trị SGK VN (Fe=56, Cu=64, Cl=35,5...),
  thể tích mol khí hỗ trợ cả 22,4 (đktc cũ) lẫn 24,79 (đkc GDPT 2018), default 24,79.**
  Lý do: đáp số phải khớp đáp án SGK/đề thi VN chứ không phải IUPAC. Sáng mai
  cần bạn xác nhận default 24,79 có hợp tệp người dùng hiện tại không (nếu đa số
  giáo viên còn dạy bộ cũ thì đổi default về 22,4 — một dòng).
- **D5 · DB phản ứng Hóa v0 "thà ít mà đúng":** 50 phản ứng đã tự kiểm cân bằng;
  các phản ứng nhạy (HNO₃/H₂SO₄ đặc, Al+NaOH, CO₂+kiềm 2 muối...) để ngoài v0,
  chờ phản biện duyệt mới vào v1. Engine gặp chất ngoài DB trả "ngoài phạm vi",
  không bao giờ bịa.

- **D6 · Phản biện Hóa phiên 1 kết luận "chưa đủ chín" → cho sửa spec TRƯỚC khi
  thi công, không bỏ qua.** Báo cáo đầy đủ: `docs/superpowers/reviews/2026-08-21-chem-review-phien1.md`.
  Điểm chính: 50/50 phương trình đúng nhưng 4 record (R19/R23/R29/R39) thiếu guard
  miền áp dụng → sẽ trả đáp sai cho bài kinh điển (Fe+AgNO3 dư, CO2 dư, nhỏ từ từ
  axit); công thức C% sai khi có rắn dư; thiếu tầng ion cho guard trao đổi. Tôi
  chấp nhận TOÀN BỘ khuyến nghị của phản biện (kể cả bổ sung 8 phản ứng canon:
  K+H2O, Mg+CuSO4, BaCl2+H2SO4, AgNO3+HCl, Ba(OH)2+Na2SO4, NaHCO3+HCl,
  NaHCO3+NaOH, Ca(OH)2+Na2CO3 → DB lên ~58 record) vì mỗi finding đều kèm phép
  tính chứng minh. Giao agent sửa 2 tài liệu chem ngay, không đợi phản biện
  kiến trúc (độc lập nhau; điểm giao F13 đã được chốt "chem-pack thắng").

- **D7 · Phản biện kiến trúc + Lý phiên 1: chấp nhận toàn bộ 18 finding + 16 phán
  quyết (C1–C10, D1–D6).** Báo cáo: `docs/superpowers/reviews/2026-08-21-arch-physics-review-phien1.md`.
  Nổi bật: route mới phải bọc nguyên tầng quota/billing như v2 (F1 — nếu không
  là lỗ hổng chi phí); schema Lý thêm unit per-quantity để ENGINE đổi km/h→m/s
  bằng hữu tỉ exact (F2); thêm query time_when_velocity cho bài hãm phanh (F3);
  scene v0 hạ về mức plan, các mốc "đỉnh/điểm gặp" dời v1 (F8 — chọn phương án
  rẻ); EXACT_TRIG thêm góc âm (C8); ChemScene chốt theo chem spec, kiến trúc
  thành pointer (F5/C9); tsc gate rỗng với kernel → thêm tsconfig.kernel.json
  vào nghi thức kiểm (F9). Xác nhận độc lập: 10/10 bài mẫu Lý đúng, mọi quirk
  frontend có thật (trích dòng). Giao agent sửa 4 tài liệu (kiến trúc, rollout,
  spec Lý, plan Lý) — không đụng 2 file Hóa (vòng sửa Hóa đang chạy song song).
- **D8 · Trình tự thi công chốt theo phản biện:** physics pack code ngay sau
  vòng sửa docs Lý; chem pack code ngay sau vòng sửa docs Hóa; route/bridge (P2)
  và UI (P4) KHÔNG thi công đêm nay — cần bàn giao có người xem (quota, UX).

- **D9 · Người dùng yêu cầu "làm cho các chương khác luôn" → mở rộng theo kiểu
  SPEC-TRƯỚC, không code-trước.** 3 agent spec đợt 2 khởi chạy song song (không
  chặn v0): Lý-động lực học lớp 10, Lý-dao động điều hòa lớp 11, Hóa-v1 (7 ứng
  viên + phi kim ~25-30 record + 3 cơ chế mới: trộn tuần tự, CO2+kiềm 2 muối,
  phản ứng nối tiếp Fe/AgNO3). Các spec này phải qua đúng sàng phản biện như
  đợt 1 rồi mới code — code đợt 2 dự kiến NGÀY MAI trừ khi v0 xanh sớm trong
  đêm. Lý do không code thẳng: chuẩn "không bao giờ sai" chỉ giữ được nếu mọi
  chương qua cùng quy trình; nền v0 chưa xanh thì chưa có gì để chương mới tựa.
- **D10 · Bộ đề vàng 24 bài (L01-L12, H01-H12) nhận làm test bổ sung cho giai
  đoạn thi công**, kèm 5 cảnh báo thi công (L11 meet trục y; cos90 exact; nghiệm
  ma sau dừng; CM với chất excess; g nhận từ đề). Bài nào engine v0 chưa phục vụ
  được sẽ chuyển phụ lục v1 thay vì nới engine vội.

- **D11 · Người dùng yêu cầu phủ lớp 11+12 → giao thêm 3 spec đợt 3** (Lý 11
  dòng điện không đổi; Lý 12 khí lý tưởng + nhiệt; Hóa 11-12 hữu cơ tầng 1:
  đốt cháy/CTPT/este — chọn theo tiêu chí tính-được-tất-định + nặng đề thi).
  Lập bản đồ phủ chương đầy đủ tại `docs/superpowers/2026-08-21-lo-trinh-phu-chuong.md`;
  các chương còn lại (sóng, điện trường, từ trường, hạt nhân, cân bằng, điện
  phân, hữu cơ 12 nặng DB) xếp đợt 4 CÓ CHỦ ĐÍCH — 6 spec đang bay đã chạm trần
  băng thông phản biện; thứ tự code sau v0 quyết sáng mai cùng người dùng.

- **D12 · SỰ CỐ 17:45Z: chạm trần quota phiên khi chạy 8 agent song song — cả 8
  bị ngắt; phiên đứng im tới 22:23Z (trần reset 18:50Z nhưng không có wake).**
  Thiệt hại & cứu được: (a) 3 spec đợt 2/3 KỊP VIẾT XONG (động lực học, dao động,
  mạch điện — commit ngay); (b) 3 spec chết trước khi viết (khí+nhiệt, hữu cơ,
  Hóa-v1 mở rộng) → làm lại sáng mai; (c) agent sửa docs Lý/kiến trúc chết GIỮA
  CHỪNG — 3 file mang sửa đổi dở (commit nguyên trạng, đánh dấu "phần 1");
  (d) agent sửa docs Hóa chết TRƯỚC khi sửa — 2 file Hóa còn nguyên bản gốc.
  Bài học ghi nhớ: không quá 4-5 agent song song; luôn đặt nhịp wake KẾ TIẾP
  trước khi giao đợt agent mới.
- **D13 · Phương án gỡ: KHÔNG chờ sửa xong docs mới code.** Agent thi công nhận
  bộ nguồn: plan TDD (không bị sửa dở) + spec gốc + BÁO CÁO PHẢN BIỆN với quy
  tắc "review đè spec khi vênh nhau" + bộ đề vàng. Sửa docs hoàn chỉnh xếp sau
  code hoặc sáng mai — docs là bản đồ, code+test mới là sản phẩm đêm nay.
  Đổi mục tiêu giờ: code v0 + phản biện code + tích hợp xong trước ~01:00Z
  (8g sáng VN).

- **D14 · [NGƯỜI DÙNG PHÁN, sáng 22/08] molarVolume default = 24,79 L/mol** —
  xác nhận trực tiếp, đóng câu hỏi treo ở D4. Engine vẫn hỗ trợ cả 22,4 khi đề
  ghi "đktc".
- **D15 · Sáng 22/08, trong lúc 2 agent thi công chạy:** giao 1 agent phản biện
  3 spec chương mới (động lực học, dao động, mạch điện) + 1 agent viết lại spec
  Hóa-v1 bị mất trong sự cố. Tổng 4 agent — đúng trần an toàn D12.

- **D16 · Phản biện 3 spec lớp 11-12: chấp nhận toàn bộ finding + phán quyết**
  (báo cáo: `reviews/2026-08-21-wave2-specs-review.md`). 31/31 bài mẫu đúng.
  Xếp hạng chín: mạch điện → động lực học → dao động. 3 phán quyết CHUNG cho
  mọi pack từ nay: (a) label scene KHÔNG nhúng giá trị engine tính; (b) engine
  exact-first, thập phân là việc bridge/UI; (c) field query dùng chính tả v0.
  Giao 1 agent sửa 3 spec theo danh sách; thứ tự code đợt 2 (sau khi user duyệt):
  mạch điện → động lực học → dao động.
- **D17 · Physics pack v0 HOÀN THÀNH + commit afd58b3**: 66/66 test xanh, toàn
  suite 1169 pass/0 fail, tsc kernel sạch, smoke end-to-end đúng đáp exact.
  Đang phản biện code (phiên 2). Chem pack: snapshot WIP d1f811d, agent đang
  viết tiếp.

- **D18 · [NGƯỜI DÙNG, sáng 22/08] Từ đợt agent tiếp theo: dùng model opus 4.8,
  reasoning effort high.** Các agent đợt trước chạy model mặc định của phiên;
  từ giờ mọi agent mới spawn với opus 4.8 để tăng chất lượng phản biện/thi công.

- **D19 · Phản biện code cả 2 pack: mỗi pack lộ đúng loại lỗi "dạy sai có dấu
  kiểm chứng" — chấp nhận vá TRƯỚC khi tích hợp.** Physics: 1 CAO (miền sau
  dừng/chạm đất) + 6 VỪA (báo cáo `reviews/2026-08-21-physics-code-review.md`) —
  agent vá đang chạy. Chem: 2 CAO (spectator ẩn Al+Fe+CuSO4 → 6,4g thay 16g;
  phán bừa "không phản ứng" cho NaCl+H2SO4 đặc) + 3 VỪA (báo cáo
  `reviews/2026-08-21-chem-code-review.md`) — giao agent vá (opus 4.8 theo D18).
  Cả 2 pack DB/lõi toán được xác nhận SẠCH; lỗi nằm ở tầng guard/miền — đúng
  chỗ khó thấy nhất, đúng lý do cần phản biện code.

## Quyết định chờ ghi tiếp (sẽ bổ sung trong đêm)

- Phân xử 5 điểm lệch giữa spec kiến trúc và spec Lý (theo khuyến nghị phản biện).
- Phân xử 10 điểm phân vân kiến trúc + 9 nghi vấn Hóa + 6 điểm mở Lý.
- Kết quả thi công + các finding phản biện code và cách xử lý.

## Dòng thời gian

- 15:53Z — baseline 1072 test xanh, nhánh sạch.
- 16:10–16:30Z — 6 tài liệu spec/plan hoàn thành, 4 commit (b483dab, 6ff6556,
  9652d3f, 45f868e), đã push.
- 16:25Z — 2 agent phản biện thiết kế + 1 agent bộ đề vàng khởi chạy.
- (ghi tiếp theo tiến độ)
