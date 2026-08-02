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

## Lộ trình (chưa làm)
Gặt tự động từ `problem_reports` thành ca "known-gap"; khi bản sửa làm ca đó đậu → gợi ý kết nạp. Đây là chỗ nối Tầng 2/3.
