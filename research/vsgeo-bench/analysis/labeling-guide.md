# Hướng dẫn dán nhãn lỗi & đo độ đồng thuận

> Việc dán nhãn là CÔNG SỨC TRÍ TUỆ của 2 em và là bằng chứng khoa học cho tính khách quan
> của taxonomy. Làm đúng quy trình 4 bước dưới đây.

## Chọn mẫu để dán nhãn
- Chỉ dán nhãn các bản ghi có `verdict = "incorrect"` (lỗi thì mới có loại lỗi).
- Lấy **mẫu ngẫu nhiên** ≥ 60 bản ghi sai (đủ để κ có ý nghĩa), trải đều các model & chủ đề.
- Ghi lại cách lấy mẫu (seed/tiêu chí) để tái lập.

## Quy trình 4 bước (BẮT BUỘC theo thứ tự)
1. **Dán ĐỘC LẬP:** mỗi em tự đọc từng bản ghi và gán ĐÚNG MỘT nhãn theo `taxonomy.md`.
   TUYỆT ĐỐI không trao đổi trong bước này.
2. **Đo κ vòng 1:** ghép hai bộ nhãn, tính Cohen's κ (xem mục "Cách tính κ" bên dưới).
3. **Thảo luận & thống nhất:** rà các bản ghi hai em BẤT ĐỒNG; bàn để chốt nhãn chung;
   nếu do codebook chưa rõ → **sửa `taxonomy.md`** cho rõ hơn (ghi lại thay đổi).
4. **Dán lại & chốt:** dán lại mẫu theo codebook đã sửa; đo κ vòng 2; lưu bộ nhãn ĐÃ CHỐT.

## Mục tiêu κ
- κ ≥ 0.61 ("đáng kể", Landis & Koch) là NGƯỠNG TỐI THIỂU để báo cáo.
- Lý tưởng κ ≥ 0.80. Nếu κ < 0.61 sau vòng 2 → codebook còn mơ hồ, lặp lại bước 3.

## Định dạng file nhãn (JSON)
Mỗi em lưu một file, ví dụ `labels-em1.json`, `labels-em2.json`, là MẢNG các object:

```json
[
  { "recordId": "vsgeo-0137__gpt__run1", "labeler": "em1", "errorType": "spatial" },
  { "recordId": "vsgeo-0044__gemini__run2", "labeler": "em1", "errorType": "arithmetic" }
]
```

- `recordId`: chuỗi định danh DUY NHẤT một bản ghi (gợi ý: `seedId__modelId__run{n}`).
  Hai em phải dùng CÙNG bộ recordId, CÙNG thứ tự, để ghép cặp đúng.
- `labeler`: "em1" hoặc "em2".
- `errorType`: đúng một trong 6 mã ở `taxonomy.md`.

## Cách tính κ (dùng lại kappa.ts đã viết ở Task 8)
Script `compute-kappa.ts` đã có sẵn cạnh file này. Chạy:

```
npx tsx research/vsgeo-bench/analysis/compute-kappa.ts labels-em1.json labels-em2.json
```

In ra dạng:
```
Số cặp so được: 62
Cohen's κ = 0.7419
```

Script ghép hai file nhãn theo `recordId` (không phụ thuộc thứ tự dòng), cảnh báo nếu có
recordId lệch giữa hai file, rồi in κ. 2 em chỉ cần thay đường dẫn hai file nhãn của mình.

## Checklist nghiệm thu (đạt khi tất cả đều ✔)
- [ ] Nêu rõ quy trình 4 bước và **thứ tự bắt buộc** (độc lập → κ → thảo luận → chốt).
- [ ] Có định dạng JSON `{recordId, labeler, errorType}` và quy ước `recordId`.
- [ ] Nêu mục tiêu κ (≥ 0.61, lý tưởng ≥ 0.80) và cách xử lý khi κ thấp.
- [ ] Có script `compute-kappa.ts` chạy được, dùng lại `kappa.ts`.
- [ ] Ghi rõ "dán nhãn là công sức trí tuệ của 2 em".
