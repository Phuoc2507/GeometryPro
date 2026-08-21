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
