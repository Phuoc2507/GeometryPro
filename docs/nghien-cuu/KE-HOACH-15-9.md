# 🗓️ Kế hoạch nước rút tới 15/9 (còn ~24 ngày)

> Phần kỹ thuật đã gần xong. 24 ngày này dồn cho **phần người**: đề thật, số đo, và **làm chủ để bảo vệ**.
> Nguyên tắc: **KHÔNG ôm cho hoàn hảo.** Đủ tốt + trung thực + bảo vệ được > đồ sộ mà không giải thích được.

## Mục tiêu tối thiểu (đủ để dự thi tốt)
- ✅ **50–80 đề THẬT** có nguồn, tự giải, đã nạp benchmark (không cần 300).
- ✅ Số **end-to-end thật** điền vào báo cáo (hết ⟦CHỜ ĐO⟧).
- ✅ **Bạn giải thích được** engine + cổng từ chối + cách kiểm — tự commit.
- ✅ Báo cáo + slides + poster bằng **giọng của mình**, số thật.

---

## Tuần 1 — 22→29/8 · THU ĐỀ + BẮT ĐẦU LÀM CHỦ
- [ ] 3 người chạy `label:studio`, mỗi người **~5 bài/ngày** → cuối tuần **~80 bài** đã kiểm khớp. (Đọc `huong-dan-chon-bai.md` trước.)
- [ ] Mỗi tối: `--promote` + `npm run bench:gate` (phải xanh) → **tự commit**.
- [ ] **Bạn (trưởng nhóm):** mỗi ngày đọc 1 phần code lõi + `nang-luc-va-ranh-gioi.md`, ghi chú bằng lời mình. (30–45 phút/ngày — đừng bỏ.)

## Tuần 2 — 30/8→5/9 · ĐO SỐ THẬT + CHỐT DỮ LIỆU
- [ ] Gom nốt đề đạt **≥ 50–80** (đủ dạng). Nạp hết, `bench:gate` xanh.
- [ ] Chạy `chay-do-that.sh` (có API key) → lấy accuracy / confidently-wrong / baseline.
- [ ] **Điền số thật** vào báo cáo §5.5, §5.7 (thay ⟦CHỜ ĐO⟧). Cập nhật "đã có N đề thật có nguồn".
- [ ] Bạn: tự sửa vài chỗ code nhỏ + tự commit; tập chạy demo (`npm run dev`, `bench:gate`).

## Tuần 3 — 6→12/9 · HOÀN THIỆN + LUYỆN NÓI
- [ ] Đọc lại **toàn báo cáo**, sửa cho giống giọng mình; chốt slides + poster với số thật.
- [ ] Luyện **phỏng vấn**: dùng `phong-van-bao-ve.md`, nhờ người đóng vai giám khảo hỏi vặn.
- [ ] Chuẩn bị **demo sống**: nhập 1 đề → chỉ đáp dạng căn + hình 3D; hoặc chạy `bench:gate` tại chỗ.

## 13→15/9 · TỔNG DUYỆT (chừa buffer)
- [ ] Đọc soát chính tả/số liệu lần cuối. In ấn. Tập nói trọn 1 lượt. Sao lưu.

---

## Ai làm gì
| Người | Việc chính |
|---|---|
| **Bạn (trưởng nhóm)** | làm chủ code + báo cáo + phỏng vấn + đo số (API) |
| **2 em** | thu đề + tự giải + nhập qua `label:studio` |

## Nếu bị trễ, cắt theo thứ tự này (giữ phần lõi)
1. Giảm đề thật xuống **~40 bài** (vẫn nói được "có đề thật").
2. Bỏ tối ưu prompt trên LLM thật (giữ bản mock, ghi rõ là mô phỏng).
3. **KHÔNG cắt:** đề thật (dù ít), số end-to-end, và **bạn làm chủ để bảo vệ.**

> Rủi ro lớn nhất **không phải thiếu thời gian** — mà là để dồn "làm chủ code" tới phút chót. Làm đều mỗi ngày từ tuần 1.
