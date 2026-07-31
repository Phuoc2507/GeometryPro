# Codebook phân loại lỗi — VSGeo-Bench

> Sổ tay mã hóa để dán nhãn lỗi cho output model. Mục tiêu: hai người dán độc lập
> cùng một lời giải sai sẽ chọn cùng một nhãn (đo bằng Cohen's κ, xem labeling-guide.md).
> Mỗi bản ghi được gán ĐÚNG MỘT nhãn lỗi CHÍNH (lỗi sớm nhất / gốc rễ nhất).
>
> ⚠️ **KHUNG CHỜ 2 EM ĐIỀN.** Các phần ghi `...(2 em điền)...` phải do 2 em tự viết
> TỪ OUTPUT MODEL THẬT (chạy ở kế hoạch 03), vì chính 2 em sẽ bảo vệ nó trước hội đồng (§7).
> KHÔNG bịa ví dụ.

## Mã nhãn (dùng đúng chuỗi này trong file JSON dán nhãn)
`spatial` · `auxiliary` · `theorem` · `arithmetic` · `reading` · `presentation`

---

## 1. `spatial` — Lỗi tưởng tượng không gian
- **Định nghĩa:** model nhận SAI một quan hệ hình học 3D (đoạn nào vuông góc với đoạn nào,
  hình chiếu của điểm rơi vào đâu, hai mặt có cắt nhau không...).
- **Dấu hiệu nhận biết:** ...(2 em điền)...
- **Ví dụ (trích output thật, rút gọn):** ...(2 em điền — dán nguyên văn 1 đoạn output model sai)...
- **RANH GIỚI phân biệt:** khác `theorem` ở chỗ định lý áp dụng ĐÚNG nhưng hình dung SAI;
  khác `reading` ở chỗ đề hiểu đúng nhưng dựng cấu hình 3D sai. ...(2 em bổ sung)...

## 2. `auxiliary` — Lỗi dựng hình phụ
- **Định nghĩa:** dựng sai đường/điểm phụ, hoặc "bịa" một hình phụ không hợp lệ.
- **Dấu hiệu nhận biết:** ...(2 em điền)...
- **Ví dụ (trích output thật, rút gọn):** ...(2 em điền)...
- **RANH GIỚI phân biệt:** ...(2 em điền)...

## 3. `theorem` — Lỗi áp dụng định lý/công thức
- **Định nghĩa:** chọn sai hoặc dùng sai một định lý/công thức (vd áp công thức khoảng cách
  cho cấu hình không thỏa điều kiện của công thức đó).
- **Dấu hiệu nhận biết:** ...(2 em điền)...
- **Ví dụ (trích output thật, rút gọn):** ...(2 em điền)...
- **RANH GIỚI phân biệt:** khác `arithmetic` ở chỗ CHỌN công thức sai (chứ không phải chọn
  đúng rồi tính lộn số). ...(2 em bổ sung)...

## 4. `arithmetic` — Lỗi số học/đại số
- **Định nghĩa:** phương pháp ĐÚNG nhưng tính toán SAI (nhân/chia/khai căn/giải phương trình).
- **Dấu hiệu nhận biết:** ...(2 em điền)...
- **Ví dụ (trích output thật, rút gọn):** ...(2 em điền)...
- **RANH GIỚI phân biệt:** ...(2 em điền)...

## 5. `reading` — Lỗi đọc đề
- **Định nghĩa:** hiểu sai dữ kiện đề (đọc nhầm số, bỏ sót điều kiện, nhầm điểm/cạnh).
- **Dấu hiệu nhận biết:** ...(2 em điền)...
- **Ví dụ (trích output thật, rút gọn):** ...(2 em điền)...
- **RANH GIỚI phân biệt:** ...(2 em điền)...

## 6. `presentation` — Lỗi trình bày/không kết luận
- **Định nghĩa:** thiếu đáp án cuối, tự mâu thuẫn, hoặc bỏ dở.
- **Dấu hiệu nhận biết:** ...(2 em điền)...
- **Ví dụ (trích output thật, rút gọn):** ...(2 em điền)...
- **RANH GIỚI phân biệt:** ...(2 em điền)...

---

## Quy tắc chọn khi phân vân (tie-break)
1. Nếu có NHIỀU lỗi, chọn lỗi **gốc rễ / xảy ra sớm nhất** trong lời giải.
2. Nếu lời giải đúng phương pháp nhưng sai một phép tính cuối → `arithmetic`, KHÔNG phải `theorem`.
3. Nếu không xác định được (output quá mơ hồ) → ghi `presentation` và nêu lý do trong ghi chú.

---

## Checklist nghiệm thu (đạt khi tất cả đều ✔)
- [ ] Đủ 6 loại, mỗi loại có đủ 4 phần (định nghĩa / dấu hiệu / ví dụ thật / ranh giới).
- [ ] Mỗi loại có **ít nhất 1 ví dụ trích từ output model thật**, không phải bịa.
- [ ] Mã nhãn dùng đúng 6 chuỗi: `spatial` `auxiliary` `theorem` `arithmetic` `reading` `presentation`.
- [ ] Có mục "ranh giới phân biệt" cho các cặp dễ nhầm (`spatial`↔`theorem`, `theorem`↔`arithmetic`).
- [ ] Có quy tắc tie-break khi một lời giải dính nhiều lỗi.
