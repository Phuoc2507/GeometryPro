# Chế độ "Advance" (bài động + đa-câu) — Design Spec

**Ngày:** 2026-07-20
**Trạng thái:** Chờ duyệt spec
**Nhánh:** off `main` (= claude/kinematic hiện tại). HỎI trước khi gộp/deploy (main auto-deploy prod).

---

## 1. Mục tiêu

Thêm mode thứ 3 **"Advance"** cho phép app xử lý hai lớp bài mà Vẽ nhanh/Vẽ kỹ không làm:
1. **Animation liên tục** (bài động): máy bay bay, vật tròn xoay, nước dâng… — engine tính đại lượng + xuất
   timeline để frontend chạy.
2. **Đa-câu cùng hình**: 1 hình gốc, câu a/b/c mỗi câu vẽ thêm điểm/đường rồi hỏi — người dùng bấm qua từng
   câu, hệ thống đã chia cảnh sẵn từ đầu.

Advance là **tier cao** (model mạnh hơn + tốn credit nhiều hơn). Giữ nguyên nguyên tắc **chống ảo giác**: LLM
chỉ DỊCH/TÁCH, ENGINE tính + tự kiểm; không giải được → "chưa kiểm chứng", không bịa.

**Phạm vi spec này = KHUNG mode Advance + luồng đa-câu.** Các *module nội dung animation liên tục* (vật tròn
xoay, nước dâng) là follow-up spec riêng; kinematic (máy bay) đã xong và chảy qua khung này.

## 2. Bối cảnh & tiền đề

- **Đã sửa (tiền đề bắt buộc, DONE):** `normalizeGeometryData` không còn cắt `timeline`/`agents` → animation
  của engine tới được frontend qua route vẽ. (commit 813622f, đã deploy.)
- **Đã sửa (DONE):** `solve_multi` hội tụ hệ giao tuyến (Nelder-Mead polish, commit 16412b6).
- **3 mode hiện tại → mới:** `DrawMode` đang `'quick' | 'detailed'`; thêm `'advance'`.
- Frontend đã có sẵn: `AnimationContext` (1 `globalTimeRef`), `TimelinePlayer` (render khi `videoMode`),
  `GeometryData.timeline`/`agents`, `Point3D.hidden`, build-reveal (isBuilding stagger trong GeometryRenderer).

## 3. Cấu trúc 3 mode (thay đổi hành vi)

| Mode | Engine | Nút "video" |
|---|---|---|
| **Vẽ nhanh** (`quick`) | 1 call, như cũ | chỉ **build reveal** (hiện dần điểm+cạnh). KHÔNG cinematic. |
| **Vẽ kỹ** (`detailed`) | 2 call, như cũ | chỉ **build reveal**. KHÔNG cinematic. |
| **Advance** (`advance`) 🆕 | nhiều call, model mạnh | **thích ứng**: đa-câu → stepper; liên tục → timeline. |

Bỏ nhánh `cinematic` khỏi quick/detailed là **an toàn** (không component nào render theo `geometry.detailLevel`).

## 4. Mô hình dữ liệu (xương sống)

```ts
interface AdvanceScene {
  base: GeometryData;   // chứa TẤT CẢ phần tử của mọi câu — MỘT hệ toạ độ
  steps: Step[];        // mỗi câu 1 bước; bài animation liên tục = 1 bước
}
interface Step {
  id: string;
  label: string;                 // "Câu a", "Câu b"…
  visibleIds: string[];          // phần tử HIỆN ở bước này (cumulative: câu sau ⊇ câu trước)
  highlightIds?: string[];       // phần nhấn mạnh cho câu này
  answer?: { text: string; approx?: number; verified: boolean };
  timeline?: AnimationTimeline;  // nếu bước này có animation
}
```

**Quyết định thiết kế (theo phản biện workflow):**
- **KHÔNG bọc `Scene { geometry, timeline }`** — `GeometryData` đã chứa `timeline` bên trong và renderer chỉ đọc
  `geometry.timeline`; bọc thêm ⇒ 2 nguồn sự thật. Ở đây timeline nằm trong `base` (bài liên tục) hoặc trong
  `step` (câu động).
- **Đa-câu = 1 base + bóc lớp theo ID** (`visibleIds` qua `Point3D.hidden`), KHÔNG phải N GeometryData đầy đủ →
  tránh **trôi toạ độ** giữa các câu (nếu dịch lại mỗi câu, hai lần dịch chọn hệ toạ độ khác nhau) và tránh
  phình dữ liệu.

| Loại bài | base | steps | Trình chiếu |
|---|---|---|---|
| Animation liên tục | hình + `base.timeline` | 1 | timeline |
| Đa-câu cùng hình | union mọi phần tử | N (bóc lớp) | stepper |
| Lai | union | N, vài bước có `timeline` | stepper + play ở câu đó |

## 5. Trình chiếu

Nút video Advance mở panel; hiện gì tuỳ dữ liệu:
- `steps.length > 1` → **Stepper**: tab `Câu a │ b │ c` **+** nút ◀ ▶, kèm đáp số câu đang xem.
- `steps.length ≤ 1` và có `base.timeline` → **Timeline** (tái dùng `TimelinePlayer`).
- Lai → stepper ngoài; câu có `timeline` hiện thêm ▶.

**Nguyên tắc kỹ thuật:**
1. Chuyển câu = đổi tập `visibleIds` trên **một base đã nạp** (ẩn/hiện qua `Point3D.hidden`) → **tức thì, không
   gọi lại API, KHÔNG `SET_GEOMETRY`** (tránh xoá undo/redo + replay build 1-2s gây giật).
2. Bóc lớp kiểu **(a) cộng dồn + nhấn mạnh**: câu b = giữ câu a **+ thêm** phần mới, phần của câu b nổi bật,
   phần cũ mờ đi.
3. Phần tử mới lộ ra **hiện dần** (tái dùng stagger của build-reveal cho id mới). *(v1 có thể hiện ngay.)*
4. Animation trong một câu tái dùng **đúng một `globalTimeRef`** + `TimelinePlayer` sẵn có. Stepper chỉ là
   **chỉ số câu** (state nhẹ), không phải đồng hồ thứ hai.

## 6. Luồng backend — route `/api/analyze-advance`

Route riêng (không đụng luồng vẽ cũ). Pipeline:

- **Pass 0 — TÁCH + phân loại** *(model mạnh)*: ra `type` = `multi_question | continuous_animation | single`;
  nếu đa-câu → `parts: [{ label, hỏi, phần_tử_mới }]` + phần dựng hình chung.
  - **Lưới coverage tất định (chống ảo giác):** mọi **số / tên điểm / nhãn "Câu a,b,c"** trong đề gốc phải xuất
    hiện ở ≥1 part; thiếu → KHÔNG serve đa-cảnh, rơi về xử lý bài đơn. (Bước tách là điểm engine không tự kiểm
    được → cần lưới này.)
- **Pass 1 — DỰNG BASE (dịch MỘT lần):** dịch "hình chung + hợp mọi câu" thành **một** plan → một `base`
  GeometryData chứa toàn bộ phần tử, một hệ toạ độ. Engine dựng + `asserts` tự kiểm.
- **Pass 2 — GIẢI từng câu (engine, rẻ):** mỗi câu → engine tính đáp + xác định `visibleIds` cộng dồn. Câu engine
  giải được → `answer.verified = true`; câu engine chịu → LLM trả lời + gắn **`verified: false` ("chưa kiểm
  chứng")**, không bịa.
- **Pass 3 — RÁP** `AdvanceScene`.
- **continuous_animation:** bỏ qua Pass 0-tách, đưa vào module tương ứng (kinematic đã có; tròn xoay/nước dâng
  = follow-up) → sinh `base` + `timeline`, `steps` = 1.

**Chống ảo giác — điểm tin LLM & chốt chặn:**

| Tin LLM ở | Chốt chặn |
|---|---|
| Tách đề (Pass 0) | lưới coverage tất định; fail → bài đơn |
| Dịch base (Pass 1) | engine `asserts` + cross-check |
| Đáp từng câu (Pass 2) | engine tự kiểm; chịu → "chưa kiểm chứng" |

## 7. Model · Credit · Latency

- **Model (benchmark 375-run chọn):** premium **`gpt-5.6-sol`** cho Pass 0 (tách) + Pass 1 (dịch) — thắng ở
  tách + tốc độ + độ ổn định; **`gemini-3.5-flash-low`** fallback/baseline (87%, miễn phí). Cấu hình qua ENV
  `ADVANCE_MODEL` / `ADVANCE_API_KEY`; bật `KERNEL_CROSSCHECK` cho advance. **Sửa nhỏ:** `callVilao`
  (api/_lib/vilao.js) hiện dùng một `VILAO_API_KEY` → thêm tham số `apiKey` per-call (mỗi model một key).
- **Credit:** **tính phẳng** (một mức cố định, bất kể số câu — vì chi phí thực ≈ 2 call LLM bất kể N) **+ hoàn về
  mức "Vẽ kỹ" khi tụt hạng** (coverage/base fail → bài đơn). Con số: **TBD** (khớp hệ credit-wallet). Dùng lại
  `checkAndConsume`/`refund`; thêm `CREDIT_COST['draw_advance']`.
- **Latency:** vì dịch base **một lần** (không nhân N) ⇒ đa-câu ≈ Pass0 + Pass1 + engine/câu ≈ 30-50s. Đặt
  `maxDuration` route; **cap N ≤ 6 câu**; stream tiến trình qua SSE (sẵn có).

## 8. Ghép frontend (dọn chỗ hard-code 2 mode)

- Thêm `'advance'` vào `DrawMode` + nút thứ 3 trong `DrawModeSelector.tsx` (icon Sparkles đang bỏ không).
- Bỏ nhánh cinematic ở quick/detailed (Pass-1 classifier).
- Sửa nhị-phân → map theo mode: `speedMultiplier` (GeometryContext.tsx:547 `quick?1:0.5` → 'advance' âm thầm
  rơi 0.5), `modeLabels`, tham số mặc định; thêm case `SET_VIDEO_MODE` vào reducer; `drawAction` phát
  `'draw_advance'`.
- Component **AdvanceStepper** mới (tab + ◀▶ + đổi `visibleIds`); tái dùng `TimelinePlayer` cho bài liên tục.

## 9. Ngoài phạm vi (YAGNI)

- **Module nội dung animation liên tục** (vật tròn xoay — *lưu ý: THỂ TÍCH tròn xoay đã tính được qua
  `integrate`, module chỉ cần MẶT 3D + animation quét*; nước dâng) = **spec riêng, sau**.
- Gấp giấy / trải phẳng: hoãn (hiếm, tốn) — đã thống nhất.
- Không đụng `run()`/core engine.

## 10. Tiêu chí thành công

- Bài đa-câu cùng hình: 1 base + N bước, bấm qua câu **tức thì, mượt, không trôi toạ độ**, mỗi câu có đáp
  (engine-verified hoặc "chưa kiểm chứng").
- Bài liên tục (kinematic): chảy qua Advance, animate đúng.
- Chống ảo giác: coverage-fail → bài đơn; đáp không kiểm được → gắn nhãn, không bịa.
- Không hồi quy: Vẽ nhanh/Vẽ kỹ không đổi (trừ bỏ cinematic); toàn suite xanh.

## 11. Rủi ro & giảm thiểu

- **Tách đề sai (ảo giác phân hoạch)** → lưới coverage tất định; fail thì về bài đơn.
- **Câu engine không giải được** → nhãn "chưa kiểm chứng" (lựa chọn a), không bịa.
- **Trôi toạ độ** → dịch base MỘT lần (đã chọn base+reveal).
- **Latency/timeout** → cap N, deadline, stream, dịch-một-lần.
- **'advance' âm thầm kế thừa hành vi 'detailed'/rơi 0.5** → map tường minh mọi chỗ nhị-phân (mục 8).
