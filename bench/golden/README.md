# Rổ đề mốc (golden) — Tầng 1 bench:gate

Mỗi `*.json` là 1 ca: `{ id, source, text?, plan, expect:{ ok, answers:[{kind,text}] } }`.
- `plan` (bắt buộc) chạy qua engine bằng `solvePlan` — **tất định, không gọi AI**.
- `text` (tùy chọn) chỉ cần cho chế độ `--full` (chạy cả bước dịch).
- `expect.answers` khớp THEO THỨ TỰ với `plan.queries`; so bằng SỐ (√2 == 1.4142…).

## Chạy
- `npm run bench:gate`            # engine-replay (mặc định, miễn phí, offline)
- `npm run bench:gate -- --full`  # cả translator (tốn LLM, cần .env.local)

## Thêm ca mốc
1. Viết `plan` (hoặc lấy từ `problem_reports.ai_json.plan` — Tầng 0 đã lưu).
2. Chạy `solvePlan(plan)`, ĐỌC đáp thật, ĐỐI CHIẾU TAY xem đúng chưa.
3. Chỉ khi chắc đúng mới ghi `expect.answers` = đáp đó. **Đừng "tạo lại golden" từ engine đang nghi sai** — golden phải phản ánh đáp ĐÚNG, không phải đáp HIỆN TẠI.

## Lỗi engine bắt được lúc soi golden (ứng viên Tầng 2)
Bước "ngó đáp bằng tay" khi gặt golden đã lộ vài chỗ engine sai/hụt — **KHÔNG đóng băng làm golden**, để dành vá:
- ✅ **[ĐÃ VÁ — Tầng 2, 2026-08-03] Thể tích khối hộp / lập phương SAI:** trước đây "lập phương cạnh 3" → `9, 9, 9` (xẻ khối thành 3 chóp) và "hộp 2×3×4" → `8`. Đã thêm primitive `solid:"prism"` (đáy+nắp, tính exact bằng xẻ tứ diện) vào dialect oxyz + nhắc translator dùng. Giờ lập phương → `27`, hộp 2×3×4 → `24`, hộp 3×3×5 → `45`, lăng trụ tam giác vuông → `42`. 4 golden `cap-vol-lap-phuong-3`, `cap-vol-hop-2x3x4`, `cap-vol-hop-3x3x5`, `cap-vol-lang-tru-tamgiac-vuong-346-h7` canh giữ.
- **Tứ diện đều cạnh 3 bỏ cuộc:** cạnh 2 và cạnh 4 giải được nhưng cạnh 3 trả `ok:false` (lỗ hổng, abstain an toàn — không phải đáp sai).

## Lộ trình (chưa làm)
Gặt tự động từ `problem_reports` thành ca "known-gap"; khi bản sửa làm ca đó đậu → gợi ý kết nạp. Đây là chỗ nối Tầng 2/3.
