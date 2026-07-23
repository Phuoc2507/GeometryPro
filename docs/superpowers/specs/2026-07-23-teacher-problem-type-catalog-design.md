# Bảng phân loại dạng bài cho giáo viên — Thiết kế

> Tiểu dự án **D** trong chương trình 3-mức-an-toàn + trải nghiệm giáo viên (thứ tự E → A → B → **D** → C).
> Phụ thuộc **B** (đã ship): `classifyTier` / `SafetyClassification` / `safetyTierMeta`.

**Ngày:** 2026-07-23
**Nhánh / worktree:** `claude/teacher-catalog` · `F:\geo3dnew\geo3d\.claude\worktrees\teacher-catalog` (tách từ `origin/main` = `714e174`)

---

## 1. Mục tiêu

Cho giáo viên một **trang tra cứu** trả lời: *"GeometryPro xử lý được những dạng bài nào, và tin được tới đâu?"*

Với mỗi dạng bài engine nhận diện, trang hiện tên dạng, **Mức an toàn** hiện tại, và — với những dạng engine **chứng thực được** — một đề ví dụ mà giáo viên bấm **"Vẽ thử"** để nạp thẳng hình vào canvas. Dạng chưa chứng thực vẫn hiện **thành thật**, không giấu, kèm ghi chú trung tính "engine tính được nhưng chưa cấp chứng thực".

Đây thuần là một mặt tiền hướng giáo viên. Nó **không** đổi hành vi engine và **không** thêm code kernel. Toàn bộ giá trị của nó là sự minh bạch trung thực, nên luật cứng duy nhất là: **không nội dung nào trên trang được khẳng định một đáp án mà engine chưa thực sự tính ra.**

## 2. Các quyết định sản phẩm đã chốt (từ người dùng)

| # | Hạng mục | Lựa chọn |
|---|----------|----------|
| 1 | Đối tượng | **Chỉ giáo viên, có gate.** Bắt buộc đăng nhập; đúng điều kiện của TeacherMode. Vào từ `UserMenu`. Học sinh không thấy. |
| 2 | Tương tác | **"Vẽ thử" nạp hình** vào canvas — không chỉ đọc. Dùng lại đúng cơ chế nạp sẵn có. |
| 3 | Phạm vi | **Đủ taxonomy, gồm cả dạng Mức 3**, hiện thành thật là "chưa chứng thực". |
| 4 | Ví dụ Cực trị | **Câu 1** (đống rơm parabol, đỉnh `16/3 m = 533 cm`). |

## 3. Ràng buộc trung thực bất di bất dịch

Những điều này xuất phát từ lý do tồn tại của cả chương trình (chống bịa đáp số). Chúng là yêu cầu, không phải tuỳ chọn:

- **H1 — Không khẳng định thứ chưa chứng thực.** Một giá trị đáp án chỉ được hiện là đã chứng thực ("Đã kiểm chứng", Mức 1) **nếu** engine thật sự tính ra nó. Được bảo đảm bằng một guard CI chạy lại ví dụ (§7).
- **H2 — Cấm lấy nguồn từ `demoResults`.** `src/data/demoResults.ts` là *bộ trình diễn đã render* và chứa một hình **sai chứng minh được** (Câu 9: tâm/bán kính mặt cầu và đỉnh 14 m đều sai). Không ví dụ / đáp án / hình nào trong bảng được lấy từ đó. Guard chặn về mặt cấu trúc.
- **H3 — Mức là động, soi theo B.** Trang phân loại các dạng đúng cách B phân loại từng bài: `level 1 ⟺ engineSolved`. Bảng không bao giờ tự bịa Mức; một dạng "có khả năng Mức 1" **khi và chỉ khi** nó mang một ví dụ chứng thực vượt qua guard chạy-engine-thật (§7).
- **H4 — Mức 3 trung tính, không hù dọa.** Dạng chưa chứng thực dùng tông Info trung tính của B (`safetyTierMeta(3)`), không đỏ / không cảnh báo. Không có nút "Vẽ thử" (không có gì đã chứng thực để nạp).

## 4. Taxonomy (nguồn sự thật: `classifyTier.js`)

Bảng liệt kê đúng những nhãn `problemTypeOf` có thể phát ra — không hơn, không kém:

**Có khả năng chứng thực hôm nay (Mức 1 — có contract test đang pass ⇒ `engineSolved`):**

| Dạng bài | Contract test cấp chứng thực | Đáp án đã kiểm chứng (minh hoạ) |
|----------|------------------------------|----------------------------------|
| Khoảng cách | `api/_lib/kernel/__tests__/e2e-flagship.test.ts` | `d(A,(SCD)) = √2` |
| Thể tích | `api/_lib/kernel/__tests__/e2e-flagship.test.ts` | `V = 8/3` |
| Diện tích | `api/_lib/kernel/analysis/__tests__/cau4-contract.test.ts` | thiết diện lớn nhất `392 cm²` |
| Cực trị | `api/_lib/kernel/analysis/__tests__/cau1-contract.test.ts` | điểm cao nhất `16/3 m = 533 cm` (Câu 1) |
| Toạ độ điểm | `api/_lib/kernel/__tests__/translator-contract.test.ts` | trực tâm `H = (16/21, 8/21, 4/21)` |
| Mặt cầu | `api/_lib/kernel/analysis/__tests__/cau9-integration.test.ts` | `R = 10 − 2√7 ≈ 4,7085` |

`file:line` chính xác + `program` (đầu vào kernel) chính xác của mỗi mục sẽ được chốt ở bước writing-plans bằng cách đọc từng test được trích. Bảng trên là ý định; guard (§7) là thứ thực thi.

**Chưa chứng thực hôm nay (Mức 3 — hiện thành thật, không "Vẽ thử"):**

`Góc`, `Phương trình`, `Vị trí tương đối`, `Giao`, `Tỉ số thể tích`, `Tích phân`, `Giải phương trình`, `Tính giá trị`, `Khác`.

Mỗi dạng kèm một ghi chú trung tính, thuộc một trong hai kiểu:
- **"engine tính được, chưa cấp chứng thực"** — engine ra được một con số nhưng B gán Mức 3 theo chính sách (vd `Phương trình`, `Tích phân`, `Giải phương trình`, `Tính giá trị`).
- **"chưa hỗ trợ chứng thực"** — chưa có đường engine đáng tin (vd `Góc` trong không gian — lỗ hổng đã biết; `Vị trí tương đối`, `Giao`, `Tỉ số thể tích`, `Khác`).

Ghi chú của từng dạng là dữ liệu nằm trên mục đó, được quyết ở bước lập kế hoạch bằng cách đối chiếu từng dạng với engine; trang chỉ render đúng thứ mục ấy khai báo.

## 5. Mô hình dữ liệu

Một module có kiểu — nguồn nội dung duy nhất của bảng:

**`src/data/problemTypeCatalog.ts`**

```ts
import type { GeometryData } from '@/context/GeometryContext'; // hoặc nơi GeometryData được định nghĩa
import type { SafetyLevel } from '@/lib/safetyTier';

/** Ví dụ đã chứng thực, được engine kiểm (chỉ dành cho mục Mức 1). */
export interface CatalogExample {
  /** Đề bài tiếng Việt hiện cho giáo viên. */
  de: string;
  /** Đáp án đã kiểm chứng, dạng chữ cho người đọc, vd "d(A,(SCD)) = √2". */
  answer: string;
  /**
   * Đầu vào kernel cho đúng bài này — CÙNG cấu hình mà contract test cấp
   * chứng thực của nó giải. Guard chạy cái này và khẳng định engine trả về
   * `answer` ở level 1. Đây là thứ làm cho đáp án trung thực.
   */
  program: unknown;               // shape = đầu vào runAny() (RunPlan | AnalysisPlan)
  /** file:line của contract test cấp chứng thực (trích dẫn cho người đọc). */
  sourceTest: string;
  /** Hình nạp được cho "Vẽ thử" — vẽ khớp cấu hình của `program`. */
  geometry: GeometryData;
}

export interface CatalogEntry {
  /** Đúng một trong các nhãn classifyTier.js có thể phát ra. */
  type: string;                   // 'Khoảng cách' | 'Góc' | ...
  /** Mức an toàn hiện tại cho mức hỗ trợ tốt nhất của DẠNG này. */
  level: SafetyLevel;             // 1 | 3 (2 để dành cho C)
  /** Mô tả trung tính một dòng về dạng bài. */
  blurb: string;
  /** Ghi chú trung thực cho Mức 3; null với mục Mức 1. */
  note: string | null;
  /** Có mặt khi level === 1. Vắng mặt/undefined với Mức 3. */
  example?: CatalogExample;
}

export const PROBLEM_TYPE_CATALOG: CatalogEntry[] = [ /* ... */ ];
```

**Vì sao dùng module `.ts` chứ không JSON:** nó import kiểu `GeometryData` / `SafetyLevel` (an toàn lúc biên dịch, và trang không thể lệch khỏi union `SafetyLevel` của B), và có thể chứa object `program` dưới dạng literal.

**Bất biến (guard thực thi):** `entry.level === 1 ⟺ entry.example != null`.

## 6. Giao diện & tích hợp

Theo đúng **khuôn E** (`src/pages/Settings.tsx`) — cùng gate đăng nhập, cùng layout Card của shadcn, cùng `useAuth`.

### 6.1 Trang mới — `src/pages/ProblemTypeCatalog.tsx`

- **Gate:** copy gate của Settings. `useAuth()` → nếu `!isLoading && !user` → `navigate('/auth')`. Sau đó kiểm **khả năng giáo viên**: chỉ render bảng cho những tài khoản đúng điều kiện của TeacherMode; người đã đăng nhập nhưng không phải giáo viên thấy một card mời nâng cấp ngắn (dùng lại tông "Gói của tôi" của Settings + `openUpgradeModal`). Vị từ chính xác (`canUseTeacherTools`) soi theo đúng thứ đang gate `TeacherMode` / mở UI giáo viên — sẽ chốt ở bước lập kế hoạch bằng cách đọc `TeacherMode.tsx` và `useAuth`.
- **Layout:** hai nhóm, dùng `safetyTierMeta` của B cho kiểu badge để trang đồng bộ thị giác với banner:
  - **"Mức 1 — Đã chứng thực"** — mỗi dạng chứng thực một Card: tên dạng + badge `safetyTierMeta(1)`, `blurb`, đề `de` của ví dụ, `answer` đã kiểm chứng (nhãn "Đáp án đã kiểm chứng"), trích "Nguồn: `sourceTest`", và nút **"Vẽ thử"**.
  - **"Mức 3 — Chưa chứng thực"** — mỗi dạng chưa chứng thực một hàng/Card: tên dạng + badge trung tính `safetyTierMeta(3)`, `blurb`, và `note` trung thực. **Không** nút.
- **Hành vi "Vẽ thử":** `onClick` → `loadGeometry(entry.example.geometry, { silent })` (đúng action context mà `DropZone` dùng) → `navigate('/teacher')` để hình hiện trên canvas giáo viên. Cần route bảng nằm **trong** cây `GeometryProvider` (xác nhận ở bước lập kế hoạch; App.tsx đã bọc các route trong provider).

### 6.2 Route — `src/App.tsx`

Thêm **phía trên** catch-all (tôn trọng comment "ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL" đang có):

```tsx
<Route path="/teacher/dang-bai" element={<ProblemTypeCatalog />} />
```

### 6.3 Điểm vào — `src/components/UserMenu.tsx`

Thêm một `DropdownMenuItem` — **"Bảng phân loại dạng bài"** (icon vd `LayoutGrid`/`BookOpen`) → `navigate('/teacher/dang-bai')`. Chỉ render khi `canUseTeacherTools` (gate giáo viên ngay ở điểm vào, nên học sinh không thấy lối vào).

## 7. Guard trung thực (CI)

Hai lớp. Lớp B là bảo đảm chống-bịa; lớp A là vệ sinh cấu trúc rẻ tiền.

**Lớp A — guard cấu trúc (nhẹ, không engine):** `src/data/__tests__/problemTypeCatalog.structure.test.ts`
- Mỗi `type` là một nhãn `classifyTier.js` có thể phát ra; không trùng; mọi nhãn phát-ra-được đều có mặt (phủ đủ theo quyết định #3).
- Bất biến `level === 1 ⟺ example != null`.
- Mỗi mục Mức 3 có `note` khác rỗng và **không** có `example`.
- **H2:** khẳng định không `geometry` nào trong bảng bằng (tham chiếu hoặc cấu trúc) với bất kỳ mục nào của `demoResults` (import `demoResults`, đối chiếu chéo).
- Với mỗi ví dụ Mức 1: `geometry.points` chứa các điểm được nêu trong `answer` (vd `A`, `S`, `C`, `D` cho ví dụ khoảng cách) — hình sai/rỗng sẽ fail ở đây.

**Lớp B — guard chạy-engine-thật (bảo đảm H1):** `api/_lib/__tests__/problemTypeCatalog.engine.test.js` (đặt cạnh engine cho dễ import kernel; nằm trong glob vitest `api/_lib/__tests__/**/*.test.js` đang có).
- Với mỗi mục Mức 1: `runAny(entry.example.program)` → khẳng định `classifyTier(result).level === 1` **và** đáp án của engine khớp `entry.example.answer` (so đúng giá trị exact/approx mà contract test khẳng định). Nếu engine đổi đáp án, test này fail cho tới khi bảng được cập nhật — bảng **không thể âm thầm lệch khỏi engine**.
- Vướng import (test JS này cần `program` của bảng .ts): giải ở bước lập kế hoạch — hoặc (a) import module bảng qua alias `@` của vitest, hoặc (b) export cặp `{program, answer}` của các mục Mức 1 ra một module chung nhỏ mà cả trang lẫn test cùng import. Ưu tiên (a) nếu alias resolve được trong project `node`; nếu không thì (b).

**Suite hiện tại vẫn xanh:** 539/539 test, `tsc` 0 lỗi, `npm run build` exit 0.

## 8. Ngoài phạm vi (YAGNI)

- **Tự sinh hình từ engine** lúc build (qua `buildGeometryFromPoints`). Khả thi và trung thực hơn hẳn, nhưng nặng; v1 vẽ tay 6 hình khớp với `program` của nó và cho guard kiểm. Ghi lại là cải tiến tương lai để bỏ hẳn việc vẽ tay.
- **Minh hoạ đại diện Mức 2** — đó là tiểu dự án **C** (dùng `showIllustrationValues`). Nhánh `SafetyLevel === 2` không được sinh ở đây.
- **Sửa/thêm ví dụ từ UI.** Bảng là tĩnh, ghim theo engine, được review code.
- **Đề mẫu cho dạng Mức 3.** Tuỳ chọn; nếu thêm sau thì mang **không** đáp án và **không** hình, ghi rõ "ví dụ dạng đề — chưa chứng thực". Không có trong v1.
- **Làm giàu `problemKind` của `translatorPrompt.js`** (B-Nhịp 2 / A-Nhịp 2) — bị gate sau cổng translator 50-case live, không liên quan D.

## 9. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|--------|-----------|
| Hình vẽ tay sai hình học (đúng kiểu thất bại Câu 9) | Hình vẽ khớp toạ độ chính xác của `program`; guard Lớp A kiểm các điểm nêu trong đáp án có mặt; *đáp án* (khẳng định cốt lõi về trung thực) được ghim vào engine thật bởi Lớp B. Hình là minh hoạ, đáp án là đã chứng thực. |
| Bảng lệch khỏi engine sau khi engine đổi | Guard chạy-engine-thật Lớp B fail CI ngay khi có lệch. |
| Dữ liệu sai của `demoResults` lọt vào | Lệnh cấm H2 về cấu trúc trong guard Lớp A. |
| Gate giáo viên để lọt học sinh/tài khoản free | Gate copy từ Settings + vị từ khả-năng-giáo-viên; link trong UserMenu cũng gate; trang đẩy người chưa đăng nhập về `/auth`. |
| "Vẽ thử" nạp xong nhưng hình không hiện trên canvas | Xác nhận route bảng nằm trong `GeometryProvider`; `loadGeometry` rồi `navigate('/teacher')`. |

## 10. Sản phẩm bàn giao

1. `src/data/problemTypeCatalog.ts` — bảng có kiểu (đủ dạng; 6 ví dụ chứng thực).
2. `src/pages/ProblemTypeCatalog.tsx` — trang gate giáo viên.
3. `src/App.tsx` — route `/teacher/dang-bai` phía trên catch-all.
4. `src/components/UserMenu.tsx` — link bảng, gate giáo viên.
5. `src/data/__tests__/problemTypeCatalog.structure.test.ts` — guard Lớp A.
6. `api/_lib/__tests__/problemTypeCatalog.engine.test.js` — guard chạy-engine-thật Lớp B.

Ship theo `deploy-freely-to-prod`: build xanh → FF-push `claude/teacher-catalog:main` → xác nhận Vercel `state:success` qua API commit-status của GitHub.
