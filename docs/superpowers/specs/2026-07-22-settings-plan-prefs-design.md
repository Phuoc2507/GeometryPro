# Trang Cài đặt — Gói & Tuỳ chọn hiển thị (Tiểu-dự án E) — Thiết kế

**Ngày:** 2026-07-22
**Thuộc chương trình:** 3-mức an toàn + trải nghiệm giáo viên (E → A → B → D → C). E là bước đầu: rủi ro thấp, thắng nhanh, và dựng sẵn lớp lưu tuỳ chọn mà C sẽ dùng.

## Mục tiêu

Biến `/settings` (hiện chỉ là khung account rỗng) thành trang Cài đặt hợp nhất gồm ba việc:
1. **Hiển thị gói/credit** của người dùng (chỉ đọc) + lối "Nâng cấp / Quản lý gói".
2. **Tuỳ chọn hiển thị bản vẽ, lưu bền** — hết cảnh reload là mất.
3. **Nối sống** mục "Lưới toạ độ" đang là nút chết.

**Ràng buộc:** không migration DB (dùng localStorage), không đổi luồng gate/engine, phải qua build gate trước khi push (deploy).

## Hiện trạng (đã khảo sát)

- Route `/settings` → `src/pages/Settings.tsx` (lazy ở `src/App.tsx:51`, có auth-guard). Hiện chỉ: email (khoá), tên hiển thị, URL avatar, nút Lưu (`updateProfile`), Đăng xuất, và một badge Pro/Free trơ.
- `useAuth()` (`src/context/AuthContext.tsx`) đã expose sẵn: `isPro`, `tier`, `credits`, `planCredits`, `purchasedCredits`, `drawQuotaRemaining`, `plan_expires_at`, `plan_code`. Bảng `plans` có cột `name`. `formatCredits(n)` ở `src/lib/utils.ts:12`.
- `UpgradeModal` (`src/components/UpgradeModal.tsx`) đã tồn tại, có `FALLBACK_PLANS` (tên gói tĩnh khi bảng `plans` chưa migrate).
- Ba toggle hiển thị `showPoints`/`autoColor`/`autoRotate` sống **in-memory** trong `GeometryContext` (`src/context/GeometryContext.tsx`); reset mỗi lần mount vì `GeometryProvider` nằm trong `TeacherMode` (`src/pages/TeacherMode.tsx:141`). Không có localStorage.
- "Lưới tọa độ" ở `src/components/layout/TopToolbar.tsx:59` là `onClick={() => {}}` (nút chết). `CoordinateGridPlanes` (`src/components/3d/CoordinateGridPlanes.tsx`) nhận `showXY/showXZ/showYZ` nhưng bị hard-code `showXY` tại `GeometryCanvas.tsx:234`.
- Chưa có store preferences; đã có sẵn pattern localStorage khoá `geo3d:*` (vd `geo3d:last-mode`).
- Component UI sẵn có: `Switch`, `Card`, `Alert` (shadcn, `Alert` hiện chưa dùng nơi nào).

## Kiến trúc — ba đơn vị

### Đơn vị 1 — Lớp Preferences (mới, nền cho mọi toggle)

- **`src/lib/preferences.ts`**
  - Kiểu `AppPreferences` + hằng `DEFAULT_PREFERENCES`.
  - `loadPreferences(): AppPreferences` — đọc một khoá localStorage `geo3d:prefs` (JSON), `try/catch`, hợp nhất với default cho mọi khoá thiếu/hỏng.
  - `savePreferences(next): void` — ghi lại toàn bộ object.
  - `setPreference(key, value): AppPreferences` — tiện ích load → gán → save → trả bản mới.
- **`src/hooks/usePreferences.ts`** — hook cho phần UI: trả `{ prefs, setPref(key, value) }`; `setPref` gọi `setPreference` rồi cập nhật state cục bộ để trang Settings render lại.
- **Schema `AppPreferences`:**
  | key | kiểu | mặc định | ghi chú |
  |---|---|---|---|
  | `showCoordinateGrid` | boolean | `true` | giữ như hiện trạng (XY đang bật) |
  | `showPoints` | boolean | `true` | khớp initialState hiện tại |
  | `autoColorPlanes` | boolean | `false` | khớp initialState hiện tại |
  | `autoRotate` | boolean | `false` | khớp initialState hiện tại |
  | `showIllustrationValues` | boolean | `true` | dành cho tiểu-dự án C (hiện số ở bài minh hoạ) |

- **Nguồn sự thật = prefs.** Không có store toàn cục mới. Vì trang Settings và scene 3D nằm ở **route khác nhau** (không mở đồng thời), không cần đồng bộ hai chiều live: chỉ cần **seed-on-mount**.
  - `GeometryContext` khởi tạo `initialState` các toggle từ `loadPreferences()` (thay cho hằng số cứng).
  - Mỗi dispatcher toggle (`togglePoints`, `toggleAutoColor`, `setAutoRotate`, và `toggleCoordinateGrid` mới) **ghi ngược** vào prefs qua `setPreference`.
  - Trang Settings đọc/ghi prefs qua `usePreferences`. Khi người dùng sang Teacher/Student, `GeometryContext` seed lại từ prefs → thay đổi có hiệu lực.

### Đơn vị 2 — Trang Settings mở rộng

Trong `src/pages/Settings.tsx`, giữ nguyên khối account đang có, thêm hai `Card` bên dưới:

- **"Gói của tôi"** (chỉ đọc):
  - Tên gói: tra từ bảng `plans` theo `plan_code`; nếu `plans` chưa migrate hoặc `plan_code` undefined → map tĩnh kiểu `FALLBACK_PLANS`, cuối cùng fallback hiển thị `tier` thô / "Miễn phí".
  - Trạng thái: Pro/Free/Hết hạn dựa `isPro` + `plan_expires_at` (kèm số ngày còn lại).
  - Credit: `formatCredits(planCredits + purchasedCredits)`; **ẩn dòng này** nếu credit undefined (chưa áp SQL).
  - Nút **"Nâng cấp / Quản lý gói"** → mở `UpgradeModal` (state cục bộ mở/đóng).
- **"Hiển thị & Bản vẽ"**: danh sách `Switch` đọc/ghi prefs qua `usePreferences`:
  - Lưới toạ độ · Hiện điểm · Tô màu mặt phẳng · Tự xoay · **Hiện số ở bài minh hoạ**.

### Đơn vị 3 — Nối "Lưới toạ độ" cho sống

- `GeometryState` thêm `showCoordinateGrid: boolean` (`src/types/geometry.ts`), seed từ prefs.
- `GeometryContext`: action `TOGGLE_COORDINATE_GRID` + dispatcher `toggleCoordinateGrid()` (ghi prefs).
- `TopToolbar.tsx:59`: thay `onClick={() => {}}` bằng `onClick={toggleCoordinateGrid}`; icon check phản ánh `state.showCoordinateGrid`.
- `GeometryCanvas.tsx:234`: `<CoordinateGridPlanes showXY={state.showCoordinateGrid} showXZ={false} showYZ={false} />` (giữ tối giản: chỉ bật/tắt mặt XY như hiện tại).

## Luồng dữ liệu

- **Gói:** `useAuth()` (đã đọc `profiles` + `usage_counters`) + một truy vấn `plans.name` (hoặc map tĩnh). **Không ghi** cột gói ở client (RLS chặn — đúng thiết kế).
- **Tuỳ chọn:** localStorage `geo3d:prefs` qua `usePreferences`; `GeometryContext` seed lúc mount; toggle toolbar ghi ngược prefs.

## Xử lý lỗi & suy biến

- localStorage thiếu/JSON hỏng → `loadPreferences` trả `DEFAULT_PREFERENCES`.
- Bảng `plans` chưa migrate → tên gói dùng map tĩnh; nếu vẫn không có → hiện `tier`/"Miễn phí".
- `plan_code`/credit undefined → khối gói vẫn render, ẩn dòng credit, coi như Free.
- `updateProfile` account (đang có) giữ nguyên hành vi.

## Kiểm thử

- **Unit** `preferences.ts`: round-trip load/save; fallback khi JSON hỏng; hợp nhất default khi thiếu key; `setPreference` chỉ đổi một khoá.
- **Component/logic Settings** (nếu có harness testing-library — xác nhận trong plan): render đúng theo `useAuth` mock (free / pro / hết hạn); `Switch` gọi `setPref`.
- **Wiring 3D**: `toggleCoordinateGrid` đổi `state.showCoordinateGrid` → prop `CoordinateGridPlanes`; giá trị bền qua remount nhờ seed từ prefs.
- **Thủ công (dev :8080):** `/settings` hiện đủ 3 khối; bật/tắt lưới toạ độ trong Teacher mode có tác dụng và **giữ sau reload**; nút Nâng cấp mở `UpgradeModal`.
- **Cổng build:** `npm run build` exit 0 trước khi commit/push (push = auto-deploy Vercel).

> Ghi chú kiểm thử: `tsc` không phải cổng build của repo; harness test frontend cần xác nhận trong plan (kiểm `package.json`). `preferences.ts` là logic thuần nên test được không phụ thuộc React; phần UI dựa vào verify thủ công + build gate nếu chưa có testing-library.

## Ngoài phạm vi (YAGNI)

- Lịch sử giao dịch credit (`credit_ledger` có RLS nhưng chưa dựng UI).
- Đồng bộ prefs đa thiết bị qua server (localStorage per-thiết-bị là đủ cho tuỳ chọn hiển thị).
- Vá types Supabase tự sinh đang cũ (giữ cast `as Profile` như code hiện tại).
- Đồng bộ hai chiều live giữa trang Settings đang mở và scene 3D đang mở (khác route, không xảy ra đồng thời) — seed-on-mount là đủ.

## Rủi ro & lưu ý

- `GeometryProvider` nằm trong `TeacherMode`; cần xác nhận trong plan liệu `StudentMode` có scene/provider riêng để seed prefs ở đó (nếu grid cần áp cho cả view học sinh).
- Không đổi hợp đồng API `/api/solve` — E hoàn toàn ở frontend + localStorage.
