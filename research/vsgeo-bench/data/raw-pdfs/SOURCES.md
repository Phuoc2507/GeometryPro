# Nguồn đề gốc (đề chính thức Bộ GD&ĐT)

Các file PDF đề thi tốt nghiệp THPT môn Toán là **văn bản hành chính nhà nước** (không thuộc phạm vi bảo hộ quyền tác giả). Đề được dùng cho mục đích **nghiên cứu phi lợi nhuận**; mọi seed trong `../seeds/` đều **chuẩn hoá lại lời văn** (không chép nguyên văn) và ghi rõ nguồn ở trường `source.ref`.

Các file PDF (~13MB) **không commit vào git** — chỉ giữ URL để tải lại khi cần.

| Năm | File | URL tải |
|-----|------|---------|
| 2023 | tn-thpt-2023-toan.pdf | https://toanmath.com/toanmath-pdf/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-2023-mon-toan.pdf |
| 2024 | tn-thpt-2024-toan.pdf | https://toanmath.com/toanmath-pdf/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-2024-mon-toan.pdf |
| 2025 | tn-thpt-2025-toan.pdf | https://toanmath.com/toanmath-pdf/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-2025-mon-toan.pdf |
| 2026 | tn-thpt-2026-toan.pdf | https://toanmath.com/toanmath-pdf/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-2026-mon-toan.pdf |

Tải lại:

```bash
cd research/vsgeo-bench/data/raw-pdfs
for Y in 2023 2024 2025 2026; do
  curl -L -o tn-thpt-$Y-toan.pdf \
    "https://toanmath.com/toanmath-pdf/de-chinh-thuc-ky-thi-tot-nghiep-thpt-nam-$Y-mon-toan.pdf"
done
```

## Ghi chú định dạng đề

- **2023–2024**: đề trắc nghiệm 50 câu (định dạng cũ). Các câu ~43–50 là vận dụng cao — nguồn bài hình khó chính.
- **2025–2026**: định dạng mới (GDPT 2018) — có phần Đúng/Sai và **trả lời ngắn** (đáp số dạng số). Giá trị cao vì (a) đáp số ngắn = ground-truth không nhập nhằng cho máy chấm, (b) mới nên ít bị nhiễm dữ liệu huấn luyện AI.

## Quy tắc lấy mẫu (chống trùng)

Trong một năm, 24 mã đề (101–124) chỉ **hoán vị số/thứ tự đáp án** cùng một khung bài. Vì vậy **chỉ lấy 1 mã đề đại diện/năm**; để critic đa dạng gom cụm "cùng khung khác số" và giữ 1 đại diện (+ tối đa 1 biến thể để test tính nhất quán).

## Đáp án lưu dạng GIÁ TRỊ, không lưu chữ cái A/B/C/D

Đáp án A/B/C/D phụ thuộc mã đề (bị hoán vị) nên seed lưu **giá trị toán học gốc** (vd `sqrt(6)`, `28*pi*a^2/3`). Nhờ đó seed độc lập mã đề và dễ chống trùng.
