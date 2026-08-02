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
- **Thể tích khối hộp / lập phương SAI:** "lập phương cạnh 3" → engine trả `9, 9, 9` (xẻ khối thành 3 chóp) thay vì `27`; "hình hộp chữ nhật 2×3×4" → trả `8` thay vì `24`. Cả họ khối-hộp đều lệch.
- **Tứ diện đều cạnh 3 bỏ cuộc:** cạnh 2 và cạnh 4 giải được nhưng cạnh 3 trả `ok:false` (lỗ hổng, abstain an toàn — không phải đáp sai).

## Lộ trình (chưa làm)
Gặt tự động từ `problem_reports` thành ca "known-gap"; khi bản sửa làm ca đó đậu → gợi ý kết nạp. Đây là chỗ nối Tầng 2/3.
