# Rổ đề mốc (golden) — bench:gate

Mỗi `*.json` là 1 ca: `{ id, source, text?, plan, expect:{ ok, answers:[{kind,text}] } }`.
- `plan` (bắt buộc) chạy qua engine bằng `solvePlan` — **tất định, không gọi AI**.
- `text` (bắt buộc nếu muốn ca đó chạy được `--full`) là đề bài tiếng Việt cho bước dịch.
- `expect.answers` khớp THEO THỨ TỰ với `plan.queries`.
- So bằng **SỐ** khi kỳ vọng đọc được thành số (`√2` == `1.4142…`, `32π/3` == `33.5103`,
  `90°` == `90`); ngược lại so **CHUỖI** đã chuẩn hoá (`rời nhau`, `point (1,2,0)`).

## Hai chế độ — hai mục đích khác hẳn nhau

| | `npm run bench:gate` | `npm run bench:gate -- --full` |
|---|---|---|
| Chạy gì | Plan → engine | Đề → **LLM dịch** → Plan → engine |
| Tất định? | Có | **Không** (LLM ngẫu nhiên) |
| Tốn tiền? | Không | Có, mỗi ca 1 lượt gọi |
| Dùng để | **CỔNG CHẶN** — rớt 1 ca là exit 1 | **PHÉP ĐO** — in tỉ lệ, mặc định exit 0 |

`--full` đo đúng đường mà người dùng thật đi qua. Vì bước LLM ngẫu nhiên, một lượt chạy
là **một mẫu**, không phải sự thật — muốn có số đáng tin thì `--repeat`.

### Cờ

```
--full            chạy cả bước dịch
--dry-run         (với --full) dùng Plan có sẵn thay bước dịch ⇒ KHÔNG gọi LLM,
                  không cần khoá. Để soi thử phần báo cáo trước khi tiêu tiền.
--repeat N        mỗi ca N lượt (mặc định 1) — cách duy nhất thấy ca KHÔNG ỔN ĐỊNH
--concurrency N   số lượt song song (mặc định 4)
--min-pass R      biến --full thành cổng chặn: tỉ lệ đúng < R thì exit 1
--only <chuỗi>    chỉ chạy ca có id chứa chuỗi
--out <file>      ghi báo cáo JSON để so theo thời gian
--dir <path>      đổi rổ golden
```

```bash
npm run bench:gate                                   # cổng chặn, offline, miễn phí
npm run bench:gate -- --full --dry-run               # thử phần báo cáo, không tốn tiền
npm run bench:gate -- --full --repeat 3              # đo thật, 3 lượt/ca
npm run bench:gate -- --full --min-pass 0.8          # dùng làm cổng trước khi deploy
npm run bench:gate -- --full --out bench/reports/2026-08-21.json
```

### `--full` trả về HAI con số, không phải một

Trước đây mọi kiểu hỏng đều gộp thành `regress-status`, nên con số duy nhất đọc được
("hỏng 12/40") **không nói được phải sửa cái gì**. Nay tách theo giai đoạn:

| Giai đoạn | Nghĩa | Sửa ở đâu |
|---|---|---|
| `translate-abstain` | Translator TỪ CHỐI (thiếu số liệu / ngoài danh mục) | Thường là **đúng** — không phải lỗi |
| `translate-fail` | Dịch ra non-JSON hoặc sai schema | Prompt / model translator |
| `engine-unusable` | Có Plan nhưng engine bó tay | Engine |
| `wrong-answer` | Engine ra đáp nhưng **lệch** | Engine |
| `pass` | Đúng tới đáp số cuối | — |

⇒ **DỊCH ĐƯỢC** = thước đo translator. **ĐÁP ĐÚNG** = thước đo cả đường ống.
Hai con số này tách nhau nên nhìn là biết nên sửa prompt hay vá engine.

## Rổ hiện tại phủ gì

40 ca. Mỗi đáp đều **đối chiếu tay** trước khi đóng băng (xem `source` của từng file).

| Nhóm | Ca | Loại truy vấn |
|---|---|---|
| `cap-*` | 20 | `distance`, `volume` (pyramid/prism) |
| `oxyz-*` | 10 | `equation` (mp + mặt cầu), `distance`, `angle` (2 mp; đường–mp), `point_coord`, `intersection`, `relative_position`, `sphere_metric` |
| `area-*`, `vol-*`, `sphere-*` | 5 | `area` (triangle/polygon/sphere), `volume` (tetrahedron/sphere), `volume_ratio` |
| `gt-*` | 5 | Engine **giải tích**: `optimize`, `integrate`, `solve` |

## Thêm ca mốc

1. Viết `plan` (hoặc lấy từ `problem_reports.ai_json.plan` — Tầng 0 đã lưu).
2. Chạy `solvePlan(plan)`, ĐỌC đáp thật, **ĐỐI CHIẾU TAY** xem đúng chưa.
3. Chỉ khi chắc đúng mới ghi `expect.answers` = đáp đó, và ghi cách kiểm vào `source`.
   **Đừng "tạo lại golden" từ engine đang nghi sai** — golden phải phản ánh đáp ĐÚNG,
   không phải đáp HIỆN TẠI.
4. Viết `text` là đề bài tiếng Việt tự nhiên, để ca đó cũng chạy được `--full`.

## Lỗi/hụt engine bắt được lúc soi golden (ứng viên Tầng 2)

Bước "ngó đáp bằng tay" khi gặt golden đã lộ vài chỗ — **KHÔNG đóng băng làm golden**, để dành vá:

- ✅ **[ĐÃ VÁ — Tầng 2, 2026-08-03] Thể tích khối hộp / lập phương SAI:** trước đây "lập phương cạnh 3" → `9, 9, 9` (xẻ khối thành 3 chóp) và "hộp 2×3×4" → `8`. Đã thêm primitive `solid:"prism"` vào dialect oxyz + nhắc translator dùng. Giờ lập phương → `27`, hộp 2×3×4 → `24`, hộp 3×3×5 → `45`, lăng trụ tam giác vuông → `42`. 4 golden canh giữ.
- **Tứ diện đều cạnh 3 bỏ cuộc:** cạnh 2 và cạnh 4 giải được nhưng cạnh 3 trả `ok:false` (lỗ hổng, abstain an toàn — không phải đáp sai).
- **[2026-08-21] Dạng exact của đáp mặt cầu KHÔNG nhất quán:** cùng một mặt cầu R=2 thì
  `area` trả `4π·4` (giữ dạng π nhưng **chưa rút gọn**, đúng ra là `16π`) còn `volume` trả
  thẳng `33.5103` (**mất dạng exact**, đúng ra là `32π/3`). Cả hai đều đúng về SỐ nên
  golden `oxyz-cau-tam-bankinh` vẫn canh được, nhưng người dùng đang nhìn thấy hai kiểu
  trình bày khác nhau cho cùng một bài. Ứng viên vá.
- **[2026-08-21] `volume` với `solid:"tetrahedron"` cần đủ 4 điểm trong `points`**, không
  nhận dạng `points:[3 điểm] + apex` như `solid:"pyramid"`. Không sai, nhưng hai primitive
  gần nhau lại có quy ước khác nhau — dễ làm translator sinh sai.

## Lộ trình (chưa làm)

Gặt tự động từ `problem_reports` thành ca "known-gap"; khi bản sửa làm ca đó đậu → gợi ý
kết nạp. Đây là chỗ nối Tầng 2/3.
