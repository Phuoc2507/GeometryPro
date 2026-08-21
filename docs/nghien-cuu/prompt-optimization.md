# Tối ưu prompt bằng thuật toán tiến hóa — tài liệu phương pháp

*Tài liệu này mô tả module tối ưu prompt (thư mục `scripts/prompt-opt/`) — một đóng góp nghiên cứu của đề tài. Mục §4.6 của báo cáo chính tham chiếu tới đây.*

## 1. Bài toán

Chất lượng của cả hệ thống Neuro‑Symbolic phụ thuộc nặng vào **prompt của bộ dịch** (khối Neural): prompt càng tốt thì LLM càng dịch đúng đề → *Construction Plan* JSON, engine mới có cái đúng để tính. Thay vì chỉnh prompt bằng tay theo cảm tính, ta **tối ưu tự động** prompt đó bằng một **thuật toán tiến hóa (Genetic Algorithm)**, lấy điểm trên chính benchmark làm hàm mục tiêu.

## 2. Biểu diễn cá thể (genome) — điểm mấu chốt về an toàn

Prompt gốc (`TRANSLATOR_PROMPT`) chứa **cổng từ chối 3 câu hỏi** đã tinh chỉnh rất kỹ. Nếu để GA đột biến tự do trên toàn văn prompt, nó dễ phá hỏng cổng này → hệ thống quay lại bịa đáp, đi ngược mục tiêu.

Vì vậy genome **không đụng vào phần lõi**. Mỗi cá thể được biểu diễn bởi:
- **`bits`** — một vector 0/1 chọn **BẬT/TẮT** từng **gene** (một câu chỉ dẫn ngắn, nhắm một lỗi dịch điển hình);
- **`order`** — một hoán vị quyết định **thứ tự** gắn các gene đang bật.

Prompt cuối = `prompt gốc` + (các gene bật, nối theo `order`). Nghĩa là GA chỉ tìm kiếm trên phần **CHỈ DẪN BỔ SUNG** — an toàn, rẻ, và **dễ giải thích cho hội đồng**: *"thuật toán khám phá xem thêm gợi ý nào giúp dịch chính xác hơn."*

Kho gene hiện tại (`scripts/prompt-opt/genome.mjs`, mở rộng được):

| tag | Ý nghĩa gene |
|---|---|
| `json-only` | Chỉ in JSON, không rào ```, không giải thích |
| `gate-first` | Chạy 3 câu hỏi cổng trước khi viết JSON |
| `origin-hint` | Đặt gốc toạ độ ở chân đường cao / đỉnh nhiều cạnh vuông |
| `integer-coords` | Ưu tiên toạ độ nguyên/đơn giản |
| `strip-units` | Bỏ đơn vị khỏi số |
| `scale-symbol` | Kích thước một chữ (a) ⇒ dùng `scaleSymbol` |
| `queries-list` | Mỗi đại lượng hỏi là một phần tử `queries` |
| `verify-asserts` | Tự soát ràng buộc ⊥/∥/khoảng cách trước khi trả |

## 3. Hàm thích nghi (fitness)

```
fitness(genome) = accuracy − λ · (số_token_prompt / 1000)
```
- **accuracy** = tỉ lệ ca trong benchmark mà: `đề → dịch(prompt) → plan → engine.solvePlan → compareCase == 'pass'`. Đáp được so **bằng số** (tái dùng `answersAgree`, `√2 == 1.4142…`).
- **λ · token** = phạt độ dài prompt (khuyến khích *hiệu quả token*; mặc định λ = 0,02).

Ghi thêm các chỉ số phụ để phân tích/an toàn: tỉ lệ **abstain**, phân bố verdict (`pass` / `regress-answer` / `translate-error` / `abstain`), độ trễ trung bình.

## 4. Vòng tiến hóa

`scripts/prompt-opt/ga.mjs`: quần thể khởi tạo **luôn gồm baseline** (prompt gốc, để so sánh trực tiếp) + các cá thể ngẫu nhiên → chấm fitness → **chọn lọc giải đấu (tournament)** → **lai ghép** (uniform trên `bits`, Order‑Crossover trên `order`) → **đột biến** (lật bit, hoán vị) → thế hệ mới, có **elitism** (giữ cá thể tốt nhất). Ghi lại **đường cong fitness** (best & mean) qua từng thế hệ.

- **RNG có hạt giống** (`prng.mjs`, mulberry32) ⇒ cùng `--seed` cho **kết quả tái lập y hệt** (đã kiểm chứng).
- **Cache fitness theo `genomeKey`**: genome trùng nhau qua các thế hệ **không gọi lại LLM** ⇒ tiết kiệm phí thật.

## 5. Hai chế độ chạy

| provider | Ý nghĩa | Chi phí |
|---|---|---|
| **`mock`** | Giả lập **tất định, offline**: một ca "dịch đúng" nếu genome bật đủ gene mà ca đó cần. Dùng để **kiểm thử cỗ máy tiến hóa** và dựng đường cong fitness. **Không phải kết quả khoa học.** | 0 đồng |
| **`vilao`** | Gọi **LLM thật** qua đúng đường sản xuất (`planFromProblem` + `systemPrompt` override). Đây mới là số liệu để báo cáo. | Tốn API (cần `VILAO_API_KEY`) |

### Cách chạy
```bash
# Kiểm thử miễn phí (offline, ~3s):
npm run prompt:opt:mock -- --pop 14 --gen 10 --seed 42

# Chạy thật trên LLM (cần khoá API — bước tốn phí):
VILAO_API_KEY=... npm run prompt:opt -- --pop 10 --gen 6 --seed 42 --limit 12
```
Kết quả ghi vào `docs/nghien-cuu/prompt-opt-runs/<provider>-seed<seed>/`: `summary.md` (đường cong + bảng), `history.csv`, `best-prompt.txt`, `best-genome.json`. *(Thư mục này được `.gitignore` — sinh lại được bằng lệnh trên.)*

## 6. Kết quả tự kiểm (chế độ mock, seed 42)

Đã xác nhận cỗ máy hoạt động: best fitness **0,557 → 0,807**, best accuracy **75% → 100%** qua 10 thế hệ, và GA **tự khám phá** đúng bộ gene mà bài toán (giả lập) cần (`json-only`, `integer-coords`, `verify-asserts`, `queries-list`). Chạy lại cùng seed cho kết quả **giống hệt** (tái lập).

> ⚠️ Đây là **self‑test**, không phải kết luận khoa học. Con số dùng trong báo cáo phải đến từ chế độ `vilao` (LLM thật) trên benchmark đã mở rộng.

## 7. Việc còn lại

- Chạy `--provider vilao` để có **đường cong fitness thật** và so *prompt tối ưu vs prompt tay* (cần khoá API — phần của nhóm).
- Mở rộng kho gene và benchmark; cân nhắc thêm toán tử **đột biến bằng LLM** (paraphrase) kiểu PromptBreeder như một mở rộng.
