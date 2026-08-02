# Tầng 1 — Cổng regression engine ("bench:gate") — Thiết kế

**Ngày:** 2026-08-03
**Thuộc chương trình:** App tự cải tiến theo lịch (Tầng 0 → 3). Tầng 0 (nộp cả bài) đã SHIPPED.
**Quyết định đã chốt với user:** (1) chạy TAY trước deploy — `npm run bench:gate`; (2) dựng GỌN trong nhánh prod, KHÔNG merge `research/vsgeo-bench` (harness nặng, thiên đo model ngoài).

---

## Mục tiêu (một câu)

Một lệnh chạy tay, phát lại một **rổ đề mốc** qua engine sống, **rớt là chặn** (exit ≠ 0), để một bản sửa engine không âm thầm làm hỏng những đề trước đây giải đúng.

## Vì sao dựng được gọn & rẻ

- Engine đã export `solvePlan(plan)` (`api/_lib/kernel-bridge/solveWithKernel.js`) — chạy Plan qua engine **KHÔNG gọi LLM, tất định**. ⇒ Cổng lõi = phát lại `plan` đã lưu, miễn phí, offline.
- Đã có `answersAgree`/`toNumeric` (`api/_lib/answerCompare.js`) so đáp số (căn/phân số/thập phân, sai số tương đối). ⇒ KHÔNG cần chép gì từ grader của vsgeo-bench.
- Có tiền lệ script chạy engine: `scripts/kernel-smoke.mjs` (import kernel-dist, chạy, `process.exit(code)`).

## Kiến trúc

Tách **logic thuần (test bằng vitest)** khỏi **vỏ CLI (.mjs)** — đúng nếp codebase (logic thuần trong `api/_lib/**` + `__tests__`, script I/O mỏng trong `scripts/`).

**Hai chế độ phát lại:**

| Chế độ | Đầu vào ca | Đường chạy | Bắt được | Chi phí |
|---|---|---|---|---|
| **engine-replay** (mặc định) | `plan` (JSON) | `solvePlan(plan)` | engine tụt lùi | Miễn phí, offline, tất định |
| **full-pipeline** (`--full`) | `text` (đề chữ) | `solveProblem(text)` | translator + engine | Tốn LLM, cần API key/env |

Cổng-trước-deploy dùng **engine-replay** làm lõi (nhanh/rẻ/tất định). `--full` để chạy sâu định kỳ khi cần.

## Định dạng ca mốc (golden)

Mỗi ca là 1 file JSON trong `bench/golden/*.json`:

```json
{
  "id": "smoke-pyramid-01",
  "source": "kernel-smoke | problem_reports:<uuid> | hand",
  "text": "Cho hình chóp S.ABCD ... (tùy chọn, cần cho --full)",
  "plan": { "solidName": "S.ABCD", "ops": [...], "asserts": [...], "queries": [...] },
  "expect": {
    "ok": true,
    "answers": [
      { "kind": "distance", "text": "√2" },
      { "kind": "volume", "text": "8/3" }
    ]
  }
}
```

- `plan` bắt buộc (cho engine-replay). `text` tùy chọn (cần khi `--full`).
- `expect.answers` khớp THEO THỨ TỰ với `queries`; so bằng `answersAgree` (số), KHÔNG so chuỗi thô (√2 == 1.414… hợp lệ).

## Phân loại kết quả mỗi ca

- **pass** — `ok` khớp kỳ vọng và mọi đáp số khớp (trong sai số).
- **regress-status** — kỳ vọng `ok:true` nhưng nay `ok:false`/0 điểm/0 đáp (trước giải được, nay hỏng).
- **regress-answer** — vẫn `ok:true` nhưng một đáp số LỆCH số (đáp đổi khác).
- **error** — `solvePlan`/`solveProblem` văng ngoại lệ (vd kernel-dist lỗi).
- **improved** *(chỉ ở chế độ đối chiếu ngược, không phải v1 lõi)* — ca kỳ vọng-hỏng nay đậu ⇒ gợi ý kết nạp.

**Cổng RỚT (exit 1)** khi có bất kỳ ca `regress-*` hoặc `error`. `pass` toàn bộ ⇒ exit 0.

## Thành phần (file)

| File | Trách nhiệm | Test |
|---|---|---|
| `api/_lib/bench/compareCase.js` | THUẦN: `compareCase(golden, result) → { id, verdict, detail }`. Dùng `answersAgree`. | `__tests__/compareCase.test.js` |
| `api/_lib/bench/loadGolden.js` | THUẦN: đọc + validate mảng file golden từ 1 thư mục → cases (báo lỗi ca hỏng schema). | `__tests__/loadGolden.test.js` (fixtures) |
| `api/_lib/bench/runGate.js` | Điều phối: nhận `cases` + hàm `solveOne(case)` (TIÊM VÀO để test) → `{ results, summary, hasRegression }`. | `__tests__/runGate.test.js` (solver giả) |
| `scripts/bench-gate.mjs` | Vỏ CLI: nạp golden, nối `solvePlan`/`solveProblem` thật, in bảng, `process.exit`. Cờ `--full`, `--dir`. | (smoke tay) |
| `bench/golden/*.json` | Rổ mốc khởi tạo (vài ca known-good, bắt đầu từ pyramid kernel-smoke). | — |
| `bench/golden/README.md` | Cách thêm/tạo lại golden + lộ trình gặt từ `problem_reports`. | — |
| `package.json` | `"bench:gate": "npm run build:kernel && node scripts/bench-gate.mjs"` | — |

`runGate` nhận `solveOne` tiêm vào ⇒ test được toàn bộ điều phối + phân loại + exit-logic **không cần engine/LLM** (solver giả trả kết quả dựng sẵn).

## Khởi tạo rổ mốc (bootstrap)

v1 hand-author 3–5 ca known-good (ca đầu = pyramid trong `kernel-smoke.mjs`, đáp đã biết `√2`, `8/3`) để CHỨNG MINH cổng chạy. Sau đó lớn dần bằng cờ `--capture` (chạy sau, không thuộc lõi v1): nhận danh sách đề chữ → `solveProblem` → ca nào `ok+verified` thì ghi thành golden (text + plan + answers).

## Khép vòng lặp (lộ trình, KHÔNG thuộc v1)

Gặt `problem_reports` (giờ đã có `ai_json.plan`/`split` nhờ Tầng 0) thành ca "known-gap" (kỳ vọng-hỏng hôm nay). Khi một bản sửa làm ca đó đậu → verdict `improved` → gợi ý kết nạp vào rổ mốc. Đây là chỗ nối Tầng 1 ↔ Tầng 2/3. v1 chỉ cần cổng known-good chạy được trước; harvest là bước kế.

## Phạm vi v1 (YAGNI)

**CÓ:** engine-replay gate + phân loại regress + exit code + rổ golden hand-seed + `compareCase`/`loadGolden`/`runGate` có test + lệnh npm + `--full` (đường sâu).
**KHÔNG (để sau):** `--capture`, harvest từ problem_reports, chạy theo lịch (Tầng 3), CI, dashboard, so biến thể/perturbation.

## Rủi ro & giảm thiểu

- **Golden bám bản-sửa-sai:** nếu ai đó "tạo lại golden" sau khi engine đã sai thì cổng vô dụng. ⇒ Tạo lại golden phải là hành động CÓ CHỦ Ý (cờ `--capture` riêng), README cảnh báo; đáp số golden nên đối chiếu tay lúc seed.
- **Thứ tự đáp số:** `expect.answers` khớp theo index với `queries`; nếu Plan đổi thứ tự query thì lệch. ⇒ compareCase so theo index và báo rõ "số lượng/thứ tự đáp khác".
- **kernel-dist cũ:** cổng phải chạy SAU `build:kernel` (đã nhét vào lệnh npm) để phản ánh engine mới nhất.
