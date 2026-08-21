# Bộ dữ liệu chuẩn (benchmark) tiếng Việt — quy trình xây dựng

*Tài liệu này mô tả bộ dữ liệu và **công cụ gán nhãn** (`scripts/label/`) giúp mở rộng benchmark từ 20 → hàng trăm ca với ít công người nhất. Đây cũng là bản "datasheet" sơ khởi cho phần đóng góp dữ liệu của đề tài.*

## 1. Vì sao cần

Benchmark hiện có **105 ca golden / 158 đáp** (80 synthetic tự soạn + 25 capture; CHƯA có đề SGK/đề thi thật). **100% đáp ở dạng chính xác** (căn/π/hữu tỉ), 0 đáp làm tròn. Đây là nút thắt lớn nhất của khâu đánh giá: số liệu chỉ có ý nghĩa thống kê khi tập đủ lớn và đa dạng. Mục tiêu: **~150–300 bài**, phủ nhiều dạng (khoảng cách, góc, thể tích, thiết diện, tương giao, tròn xoay…) và nhiều độ khó.

## 2. Một ca golden gồm gì

```jsonc
{
  "id": "case-volume-ab12cd34",   // tự sinh (hash của đề)
  "source": "SGK 12, tr.xx",       // nguồn — GHI RÕ để bảo đảm liêm chính/bản quyền
  "difficulty": "TB",              // dễ / TB / khó (tùy chọn)
  "text": "Cho hình chóp ...",     // ĐỀ tiếng Việt
  "plan": { ... },                 // Construction Plan JSON (do LLM dịch hoặc dán tay)
  "expect": { "ok": true, "answers": [ { "kind": "volume", "text": "64/3" } ] }  // đáp ĐÚNG
}
```

## 3. Nguyên tắc liêm chính

- **Ghi nguồn** mọi đề (SGK, đề thi) — không phát tán trái phép.
- **Đáp phải do người XÁC MINH**: công cụ chỉ *đối chiếu* đáp máy với đáp người; **người là trọng tài cuối**.
- Ca engine giải sai/lệch **không được đưa vào** làm golden — chuyển thành "known‑gap" để vá engine.

## 4. Công cụ gán nhãn — luồng ít công nhất

Người dùng chỉ soạn một **worklist** (mảng JSON), mỗi mục cần **đề** + **đáp đúng** (và tùy chọn `plan`):

```jsonc
[
  { "text": "Cho hình chóp ...", "source": "SGK 12", "kind": "volume",
    "expected": ["64/3"] },                 // đề + đáp; plan sẽ do LLM dịch (cần API key)
  { "text": "...", "expected": ["a·√3/3"], "plan": { /* dán sẵn */ } }  // chạy được OFFLINE
]
```

Chạy:
```bash
# Offline: chỉ xử lý mục đã có sẵn plan (không tốn tiền)
npm run label -- --in bench/worklist.example.json

# Có API key: để LLM tự dịch đề → plan cho các mục thiếu plan
VILAO_API_KEY=... npm run label -- --in bench/worklist.json --llm
```

Công cụ chạy engine, đối chiếu đáp, rồi phân **3 rổ**:

| Rổ | Nghĩa | Xử lý |
|---|---|---|
| ✅ **Nhận** | Đáp máy khớp đáp người | Đóng gói golden vào `bench/golden-staging/` |
| ⚠️ **Cần soát** | Lệch (đáp người ≠ máy) | Người kiểm: sai đáp người? sai plan? hay engine sai? |
| 🕳️ **Engine chưa giải** | abstain / lỗi / ok:false | Ứng viên "known‑gap" để vá engine |

Sau khi **mắt‑thường soát** rổ ✅ trong staging:
```bash
node scripts/label/label.mjs --promote   # chép staging → bench/golden/
npm run bench:gate                        # chốt: cả rổ phải PASS
```

*(Thư mục `bench/golden-staging/` được `.gitignore` — chỉ ca đã promote mới vào rổ chính thức.)*

## 5. Phân bố hiện tại (105 ca / 158 đáp)

- **Theo dạng truy vấn:** thể tích 46, toạ độ điểm/giao 43, diện tích 22, khoảng cách 13, góc 8, phương trình mặt phẳng 8, vị trí tương đối 8, tỉ số thể tích 5, mặt cầu 3, đường sinh 1 (nhiều ca đa truy vấn). Nguồn: 80 synthetic + 25 capture.
- **Theo dạng đáp (158 đáp):** 36 chứa π · 23 chứa căn √ · 86 hữu tỉ · 13 nhãn/phương trình — **100% ở dạng chính xác, 0 đáp làm tròn thập phân**.
- Cần bổ sung mạnh: **góc**, **thiết diện/diện tích**, **tương giao (giao điểm/giao tuyến)**, **mặt cầu**, **tròn xoay/giải tích**, và các bài **"thang chữ"** (kích thước bằng `a`).

## 6. Việc tiếp theo

- (Người) Gom đề theo các dạng còn thiếu ở §5, tự xác minh đáp, đưa vào worklist.
- (Có API key) Chạy `--llm` để LLM dịch hàng loạt; người chỉ soát rổ ✅ và ⚠️.
- (Máy) Khi rổ đủ lớn: chia **train/test**, chạy đánh giá + tối ưu prompt trên tập train, báo cáo accuracy trên tập test.
