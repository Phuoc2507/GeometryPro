# MERGE BRIEF — nhánh `claude/project-reading-e990ce` (Geometry + Analysis Engine)

**Đọc file này trước khi merge.** Viết cho người/agent đang giữ `main`.

**TL;DR:** Nhánh này **chỉ CỘNG THÊM** một engine hình học/giải tích tất định. Nó **không đụng `src/`**,
**không đụng route cũ**. Merge xong **app chạy y hệt như trước** — engine chỉ nằm sẵn, chưa ai gọi tới.

| | |
|---|---|
| Nhánh | `claude/project-reading-e990ce` |
| So với `main` | **115 commit trước · 0 commit sau** (không phân kỳ) |
| Quy mô | **135 file · +20.067 / −25 dòng** |
| Điểm chung (merge-base) | `db890d0` = đúng HEAD của `main` |
| Rủi ro với sản phẩm | **Gần như bằng 0** (xem "KHÔNG đụng gì") |

---

## 1. Vì sao có nhánh này

Luồng cũ để **LLM tự sinh toạ độ + tự tính đáp số** → sai/ảo giác và chậm. Nhánh này thay bằng nguyên tắc:

> **LLM chỉ DỊCH đề thành mô hình. ENGINE tất định TÍNH và TỰ KIỂM.**

Engine trả **đáp số chính xác dạng căn** khi có (vd `8000√2/27`, `10−2√7`, `16/3`), và khi buộc phải
dùng số thì có **tự kiểm hội tụ** + **nhận dạng lại dạng căn đẹp**. Nếu mô hình không thoả điều kiện
đề, engine trả **violation** chứ **không bịa đáp số**.

---

## 2. Merge vào những gì

| Nhóm | Đường dẫn | Nội dung |
|---|---|---|
| **Engine hình học** | `api/_lib/kernel/**` | Số học chính xác (hữu tỉ + một căn), thực thể (điểm/đường/mặt/cầu), 2 dialect (tổng hợp + Oxyz), tầng compute (khoảng cách · góc · thể tích · diện tích · phương trình · vị trí tương đối · giao), phép dựng (chân đường vuông góc, đối xứng, trực tâm, tâm ngoại tiếp), `run()` |
| **Engine giải tích** | `api/_lib/kernel/analysis/**` | Biểu thức, giải phương trình, tối ưu 1 & nhiều biến, khớp đa thức (kể cả ràng buộc đạo hàm), tích phân số, khối tròn xoay (trụ/nón) + thể tích giao, nhận-dạng-căn-đẹp, `runAnalysis()` |
| **Cầu nối LLM** | `api/_lib/kernel-bridge/**` | Prompt dịch đề → Plan JSON; `solveWithKernel.js` |
| **Vilao** | `api/_lib/vilao.js` | **Chỉ THÊM** tuỳ chọn `model` (mặc định không đổi ⇒ caller cũ không ảnh hưởng) |
| **Route MỚI** | `api/analyze-geometry-v2.js` | Xem §5 |
| **server.js** | `server.js` | **Chỉ THÊM** mount `/api/analyze-geometry-v2` |
| **Build/test** | `scripts/build-kernel.mjs`, `scripts/kernel-smoke.mjs`, `vitest.config.ts`, `.gitignore` | esbuild gói kernel `.ts` → `.mjs`; cấu hình test |
| **package.json** | | Thêm `scripts` + devDep `vitest` (xem §3) |
| **Docs** | `docs/superpowers/**` | 3 spec + 15 plan (chỉ tài liệu) |

## 2b. ⚠️ KHÔNG đụng gì (phần quan trọng nhất)

- **`src/**` — KHÔNG một dòng nào.**
- **`api/analyze-geometry.js`, `api/solve.js`, `api/checkout.js`, `api/webhook.js` — KHÔNG đụng.**
- Toàn bộ **25 dòng bị xoá** chỉ nằm ở `package.json`, `.gitignore`, `server.js` (đều là thêm-vào).

---

## 3. Bề mặt xung đột: **đúng 2 file**

### `package.json` — hai bên sửa hai vùng KHÁC NHAU ⇒ git tự merge được
- **Nhánh này sửa:** khối `scripts` + thêm devDep `vitest`.
  ```
  "build:kernel": "node scripts/build-kernel.mjs",
  "build": "npm run build:kernel && vite build",     ← ĐỔI: build kernel trước
  "server": "npm run build:kernel && node server.js",
  "smoke:kernel": "npm run build:kernel && node scripts/kernel-smoke.mjs",
  "test": "vitest run",
  "test:watch": "vitest",
  devDependencies: + "vitest": "^4.1.10"
  ```
- **Bên `main` (WIP) sửa:** khối `dependencies` (`canvas-confetti`, `@types/canvas-confetti`).
- ⇒ Không đụng nhau. Nếu git vẫn báo conflict thì **giữ CẢ HAI** khối.

### `package-lock.json` — cả hai đụng, có thể conflict
**Đừng sửa tay.** Xoá và tái sinh:
```bash
rm package-lock.json && npm install && git add package-lock.json
```

---

## 4. Các bước merge

```bash
# 1) Commit/stash WIP của bạn trước (merge sẽ bị chặn nếu package.json còn bẩn)
git add -A && git commit -m "wip: freemium/quota/pricing"

# 2) Lấy nhánh engine
git fetch origin claude/project-reading-e990ce

# 3) Merge
git merge origin/claude/project-reading-e990ce

# 4) Nếu package-lock.json conflict → tái sinh
rm -f package-lock.json && npm install && git add package-lock.json

# 5) KIỂM CHỨNG (bắt buộc)
npm test                        # kỳ vọng: 397 test XANH
npx tsc --noEmit -p tsconfig.json   # kỳ vọng: sạch
npm run build                   # phải chạy build:kernel rồi vite build, không lỗi

# 6) Kết thúc merge
git commit
```

**Nếu `main` chưa có commit nào mới:** merge sẽ là **fast-forward**, không thể conflict.

---

## 5. Route mới `POST /api/analyze-geometry-v2` (chạy SONG SONG, không thay route cũ)

```jsonc
// A) Chạy thẳng Plan JSON qua engine — KHÔNG cần LLM, không cần API key. Dùng để test.
{ "plan": { "solidName": "...", "ops": [...], "asserts": [...], "queries": [...] } }
// → { mode: "dry-run", ok, entities, answers, violations, errors, trace }

// B) Dịch đề bằng LLM (Vilao) rồi chạy engine.
{ "problem": "Cho hình chóp S.ABCD ..." }
// → { mode: "kernel", ... }
```
- Nhánh (B) cần env **`VILAO_API_KEY`**; model đặt qua `VILAO_TRANSLATOR_MODEL`
  (mặc định `ram/gemini-3.5-flash-low`).
- Nhánh (A) **không cần gì cả** — cách nhanh nhất để thử engine.

---

## 6. ⚠️ Cảnh báo DEPLOY (đọc trước khi lên production)

`.gitignore` có thêm `api/_lib/kernel-dist/` ⇒ **bundle kernel KHÔNG nằm trong git**. Nó được sinh ra
bởi `npm run build:kernel` (đã nằm trong `npm run build`).

`api/analyze-geometry-v2.js` **import từ `kernel-dist`**, nên trên Vercel phải chắc chắn build command
chạy **`npm run build`** (đã gồm `build:kernel`) **TRƯỚC** khi đóng gói serverless functions.
**Nếu chưa chắc → hãy kiểm thử trước khi deploy.** Route cũ không phụ thuộc thứ này nên
**không merge nào làm hỏng luồng hiện tại**; rủi ro chỉ nằm ở route v2.

---

## 7. Trạng thái engine (để biết nó làm được gì)

Đã kiểm trên bộ **10 bài khó** trong `src/data/demoQuestions.ts` — engine giải trọn **8/10**:

| Câu | Đáp số engine |
|---|---|
| 1 đống rơm | `16/3` m → **533 cm** |
| 3 máy bay/radar | S–Đ–Đ–Đ (`√481`; 10500 m; 22600 m) |
| 4 đèn lồng | **392 cm²** · **12,95 L** · **2,866 cm** |
| 5 hồ bơi | **7,49 m** |
| 6 chóp rỗng | `8000√2/27` ≈ **419 cm³** |
| 8 nón∩trụ | **7,0205** = `64π/9 − 512/9 + 24√3` |
| 9 quả cầu 3 cột | `10 − 2√7` ≈ **4,71 m** |
| 10 bóng tấm pin | **16,52 m²** |

**Không làm (có chủ ý):** Câu 2d (cần mô hình **gấp** tấm phẳng) và Câu 7 (cần **trải phẳng** tìm
geodesic; đề OCR thiếu hình nên không kiểm chứng được). Làm chúng = viết engine riêng cho đúng 1 bài,
hoặc để LLM tự suy — phá vỡ nguyên tắc chống ảo giác.

### 🐛 Một phát hiện đáng lưu ý về dữ liệu sản phẩm
`src/data/benchmarkDemos.json` + `src/data/demoResults.ts` là **dữ liệu dựng TAY, không do engine tính**,
và **Câu 9 SAI về toán**: lưu bán kính `2√3 ≈ 3,46`, nhưng khi đó đỉnh cầu = `8 + 3,46 = 11,46 m ≠ 14 m`
như đề cho. **Đáp số đúng là `10 − 2√7 ≈ 4,71 m`** (engine tính ra, đã kiểm tay + Monte Carlo).
Câu 5 cũng vẽ đoạn MN **không phải cực tiểu** (10,44 m thay vì 7,49 m). Nhánh này **không sửa** các
file đó — để bên giữ `main` quyết.

---

## 8. Ghi chú
- Nhánh này **chưa từng được deploy**, chỉ phát triển cục bộ.
- Test: `npm test` → **397 test**. Toàn bộ tầng engine có test; các bài trên đều có test hợp đồng
  chạy end-to-end qua `run()` / `runAnalysis()`.
- Thiết kế/lý do nằm ở `docs/superpowers/specs/`; từng bước triển khai ở `docs/superpowers/plans/`.
