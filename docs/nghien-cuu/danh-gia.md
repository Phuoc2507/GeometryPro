# Đánh giá: tách train/test & so baseline — tài liệu phương pháp

*Mô tả `scripts/eval/` — tách train/test và harness so sánh baseline. Báo cáo §5.4–5.5 tham chiếu tới đây.*

## 1. Tách train/test (chống overfit prompt)

`scripts/eval/split.mjs` chia benchmark thành **train** và **test**:
- **Tất định** theo `--seed`, **phân tầng theo dạng bài** (kind) ⇒ cả hai tập đều đa dạng.
- **Tối ưu prompt chỉ chạy trên TRAIN**; **accuracy báo cáo đo trên TEST** (giữ riêng, prompt chưa từng "thấy").

```bash
npm run eval:split -- --ratio 0.3 --seed 42 --name default   # → bench/splits/default.json
# tối ưu prompt CHỈ trên train:
npm run prompt:opt -- --split default --use train ...
```

## 2. Harness so baseline

`scripts/eval/baseline.mjs` chạy nhiều phương pháp trên **cùng** tập (thường là test), đo và lập bảng:

| Phương pháp | Mô tả |
|---|---|
| `system` | Hệ Neuro‑Symbolic của đề tài (LLM dịch → engine tính + tự kiểm; từ chối an toàn khi thiếu dữ kiện) |
| `llm-direct` | Baseline: để LLM **giải thẳng**, tự đưa đáp số (không engine, không tự kiểm) |

### Chỉ số
- **Accuracy** — tỉ lệ đáp đúng / toàn tập.
- **Confidently‑wrong** — tỉ lệ đưa đáp SAI một cách tự tin. *Chỉ số an toàn then chốt* (thấp = tốt).
- **Precision khi trả lời** — `correct/(correct+wrong)`: khi hệ CÓ trả đáp thì đúng bao nhiêu %.
- **Từ chối** — tỉ lệ chủ động không trả lời (an toàn, không tính sai).
- **Latency TB**.

Luận điểm kỳ vọng: hệ Neuro‑Symbolic có **confidently‑wrong rất thấp** và **precision rất cao** (nhờ engine tự kiểm + cổng từ chối), đổi lại có thể **từ chối nhiều hơn** trên bài ngoài năng lực — đúng tinh thần *"thà không trả lời còn hơn trả lời sai"*.

### Cách chạy
```bash
# Offline (kiểm thử harness, 0đ — KHÔNG phải kết quả khoa học):
npm run eval:baseline:mock -- --methods system,llm-direct --split default --use test

# Thật (cần VILAO_API_KEY):
VILAO_API_KEY=... npm run eval:baseline -- --methods system,llm-direct --split default --use test
```
Kết quả ghi `docs/nghien-cuu/eval-runs/<tag>/` (`report.md`, `results.json`; thư mục này được `.gitignore`).

## 3. Trạng thái

- ✅ Split + harness + chỉ số: **đã hiện thực & kiểm thử offline** (mock).
- ◻️ **Số thật**: cần `VILAO_API_KEY` để chạy `system` (LLM dịch) và `llm-direct` (LLM giải) — phần của nhóm.
- Lưu ý: bảng số ở chế độ `--mock` chỉ để kiểm thử đường ống, **không được dùng làm kết quả báo cáo**.
