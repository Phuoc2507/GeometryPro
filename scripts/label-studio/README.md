# Xưởng gán nhãn bằng ảnh (label-studio)

Dán ảnh chụp đề → hệ đọc chữ + dịch → đối chiếu đáp bạn tự giải → lưu ca đạt. Đỡ phải gõ lại đề.
**Chạy trên máy bạn** (web của Claude chặn `api.vilao.ai`). Ba anh em có thể chạy song song, mỗi người một máy.

## Chạy
```bash
git pull
npm install                    # nếu chưa cài
VILAO_API_KEY=sk-... npm run label:studio
```
Mở **http://localhost:5178**.

## Dùng (mỗi ca ~20 giây)
1. **Chụp đề**: Win+Shift+S khoanh vùng đề → ảnh vào clipboard.
2. Bấm ô bên trái, **Ctrl+V** để dán ảnh → bấm **📖 Đọc đề từ ảnh**.
3. **Đọc lại & sửa** đề ở ô bên phải cho khớp bản gốc (máy đọc có thể sai vài ký tự).
4. Nhập **đáp bạn tự giải** (nhiều đáp cách nhau bằng `|`), chọn dạng, ghi **nguồn**.
5. Bấm **✅ Kiểm**:
   - **KHỚP** (đáp bạn = đáp engine) → bấm **💾 Lưu**. Ca vào `bench/golden-staging/`.
   - **LỆCH** → soát lại (bạn sai? đề thiếu? engine sai?). **Không ép khớp.**
   - **Engine chưa giải / Từ chối** → bỏ qua, ghi lại làm "known-gap".

## Chốt vào benchmark (sau khi gom một mẻ)
```bash
node scripts/label/label.mjs --promote     # chép staging → bench/golden/
npm run bench:gate                          # phải PASS
git add bench/golden/ && git commit -m "benchmark: +N đề thật từ ảnh, tự giải xác minh"
```

## Lưu ý
- **Đáp là do bạn giải**, máy chỉ đối chiếu — giữ đúng liêm chính (xem `docs/nghien-cuu/huong-dan-nhap-de-that.md`).
- Máy đọc chữ (OCR) có thể sai, **luôn soát đề bằng mắt** trước khi kiểm.
- Không commit API key. Sau đợt làm, tạo key mới trên Vilao và huỷ key cũ.
