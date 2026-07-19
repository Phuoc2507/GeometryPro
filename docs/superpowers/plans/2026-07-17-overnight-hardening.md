# Overnight Hardening — khắc phục các hạn chế của engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Bối cảnh:** Engine đã lên production (www.geo3d.io.vn), engine-first + lưới LLM cũ. Bảng hạn chế (#1..#6)
đã bàn. #3 (bền số) đã xong. Đây là kế hoạch khắc phục phần còn lại **an toàn**, chạy qua đêm bằng subagent.

**Ràng buộc TUYỆT ĐỐI:**
- **KHÔNG deploy.** Mọi thứ ở lại git.
- Giữ **≥403 test xanh**; task nào làm đỏ test cũ ⇒ sửa hoặc revert, KHÔNG để lại đỏ.
- KHÔNG sửa `run()`/lõi Scalar theo kiểu rủi ro (refactor đa-căn #2-full là SPEC riêng cho người dùng duyệt, KHÔNG cài đặt).
- Mỗi task: TDD (đỏ→xanh), commit riêng, message rõ.

**Trạng thái các hạn chế & hướng xử lý:**
| # | Hạn chế | Cách xử đêm nay |
|---|---|---|
| 1 | LLM hiểu sai → tự tin sai | B (abstain) đã xong. Thêm **A1 cross-check GATED** (Task 3) + hardening prompt (controller làm) |
| 2 | Căn đẹp single-surd | **Recognizer++** (Task 1) — bản rẻ, KHÔNG refactor lõi. #2-full = spec riêng |
| 3 | Bộ giải số | ✅ XONG |
| 4 | Phủ hẹp / analysis mong manh | Hardening prompt (controller làm) |
| 5 | Giới hạn kỹ thuật | Để YAGNI |
| 6 | Chưa đo | **Instrumentation** (Task 2) — log quyết định để đo liên tục |

---

## Task 1: `recognize.ts`++ — nhận dạng nhiều dạng căn đẹp hơn (#2-lite)

**Files:** Modify `api/_lib/kernel/analysis/recognize.ts` · Test `api/_lib/kernel/analysis/__tests__/recognize.test.ts`

**Mục tiêu:** bắt thêm `a√b/c` với b lớn (vd `165√385/196`), giữ `p+q√r`, thêm dạng **π** (`kπ/m`, `p+qπ`),
và **siết kiểm dựng-lại** (1e-10) để giảm khớp giả khi mở rộng không gian tìm.

- [ ] **Step 1: Test đỏ** — THÊM vào `describe('recognizeConstant', ...)`:
```ts
  it('a√b/c với b lớn: 165√385/196', () => {
    const r = recognizeConstant(165 * Math.sqrt(385) / 196);
    expect(r).not.toBeNull();
    expect(r!.text).toBe('165√385/196');
  });
  it('dạng π: kπ/m và p+qπ', () => {
    expect(recognizeConstant(Math.PI / 3)!.text).toBe('π/3');
    expect(recognizeConstant(2 * Math.PI)!.text).toBe('2π');
    expect(recognizeConstant(1 + Math.PI)!.text).toBe('1 + π');
  });
  it('KHÔNG khớp giả: số ngẫu nhiên vẫn null', () => {
    expect(recognizeConstant(0.7234981123)).toBeNull();
    expect(recognizeConstant(Math.E * 1.37219)).toBeNull();
  });
  it('vẫn giữ các dạng cũ', () => {
    expect(recognizeConstant(Math.sqrt(7))!.text).toBe('√7');
    expect(recognizeConstant(10 - 2 * Math.sqrt(7))!.text).toBe('10 - 2√7');
    expect(recognizeConstant(1.5)!.text).toBe('3/2');
  });
```

- [ ] **Step 2: Chạy — ĐỎ** (`b=385` ngoài bảng cũ; dạng π chưa có).

- [ ] **Step 3: Cài đặt.** Sửa `recognize.ts`:
  - Sinh bảng square-free tới N=400 bằng hàm (thay mảng cứng): `isSquareFree(n)` + `SQUAREFREE = [...list ≤ 400]`.
  - `asRational`: cho `maxDen` lên **200**.
  - Thêm nhánh **π** TRƯỚC nhánh trả null:
    - `kπ/m`: `x/π` là hữu tỉ (den ≤ 64) ⇒ `(p/q)π` (định dạng: bỏ hệ số 1, bỏ mẫu 1).
    - `p+qπ`: quét q hữu tỉ nhỏ (qn∈[-8,8], qd≤8, q≠0), `p = x − q·π` phải hữu tỉ (den ≤ 16) ⇒ `p ± |q|π`.
  - **Siết:** với MỌI dạng, chỉ chấp nhận khi `Math.abs(value − x) < 1e-10` (chặt hơn 1e-9 cũ). Ưu tiên: hữu tỉ → a√b/c → p+q√r → kπ/m → p+qπ (đơn giản trước).
  - Định dạng π: dùng ký tự `π`. `fmtSurdTerm`-tương tự cho π (hệ số 1 ⇒ chỉ `π`).

- [ ] **Step 4: XANH + lint + full suite.** `npx vitest run` (≥403+ mới), `npx eslint api/_lib/kernel/analysis/recognize.ts`.
- [ ] **Step 5: Commit** `feat(engine): recognizer++ — a√b/c b lớn, dạng π, siết kiểm dựng-lại (#2-lite)`

---

## Task 2: Instrumentation — log quyết định engine để đo hit-rate (#6)

**Files:** Create `api/_lib/engineDecisionLog.js` · Modify `api/analyze-geometry.js` · Test `api/_lib/__tests__/engineDecisionLog.test.js`

**Mục tiêu:** mỗi request in **một dòng JSON có cấu trúc** để grep được từ log Vercel → đo % engine phục vụ và
LÝ DO trượt trên traffic thật. KHÔNG chứa nội dung đề nhạy cảm (chỉ độ dài + hash ngắn).

- [ ] **Step 1: Test đỏ** — `engineDecisionLog.test.js`:
```js
import { describe, it, expect, vi } from 'vitest';
import { logEngineDecision } from '../engineDecisionLog.js';
describe('logEngineDecision', () => {
  it('in một dòng JSON có prefix [engine-decision]', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logEngineDecision({ mode: 'quick', served: true, reason: '', ms: 1234, promptLen: 80 });
    const line = spy.mock.calls.at(-1)[0];
    expect(line).toContain('[engine-decision]');
    const obj = JSON.parse(line.replace('[engine-decision] ', ''));
    expect(obj.served).toBe(true); expect(obj.mode).toBe('quick'); expect(obj.ms).toBe(1234);
    expect(obj).not.toHaveProperty('prompt'); // KHÔNG log nội dung đề
    spy.mockRestore();
  });
});
```

- [ ] **Step 2/3: Cài đặt `engineDecisionLog.js`:**
```js
// api/_lib/engineDecisionLog.js
// In MỘT dòng JSON có cấu trúc cho mỗi lần route chạy engine → grep từ log Vercel để đo hit-rate.
// KHÔNG log nội dung đề (chỉ độ dài) — tránh rò dữ liệu người dùng.
export function logEngineDecision({ mode, served, reason = '', ms = 0, promptLen = 0 }) {
  try {
    console.log('[engine-decision] ' + JSON.stringify({
      t: 'engine-decision', mode, served: !!served, reason: reason.slice(0, 60),
      ms: Math.round(ms), promptLen,
    }));
  } catch { /* không bao giờ để log làm chết request */ }
}
```

- [ ] **Step 4: Nối vào `api/analyze-geometry.js`** — import `logEngineDecision`; gọi ở CẢ 3 điểm ra của khối kernel (quick + detailed/static): khi engine PHỤC VỤ (`served:true, reason:''`), khi rơi về vì không dùng được (`served:false, reason:'unusable:...'`), khi ném (`served:false, reason:'error:...'`). Đo `ms` bằng `Date.now()` quanh `solveProblem`. KHÔNG đổi payload trả về.

- [ ] **Step 5: XANH + full suite + commit** `feat: log quyết định engine (đo hit-rate từ prod, không rò đề)`

---

## Task 3: A1 cross-check — đối chiếu engine ↔ luồng cũ, GATED (#1)

**Files:** Create `api/_lib/answerCompare.js` · Test `api/_lib/__tests__/answerCompare.test.js`

**Mục tiêu:** hàm THUẦN so hai đáp số (chuỗi engine `√2` vs số) về mặt SỐ — nền cho đối chiếu. Wiring vào route
để **GATED sau env `KERNEL_CROSSCHECK` (mặc định TẮT)** — có khả năng nhưng KHÔNG tốn phí trừ khi bật.

- [ ] **Step 1: Test đỏ** — `answerCompare.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { toNumeric, answersAgree } from '../answerCompare.js';
describe('answerCompare', () => {
  it('toNumeric: đọc số từ text đáp engine', () => {
    expect(toNumeric('√2')).toBeCloseTo(Math.SQRT2, 6);
    expect(toNumeric('2√39/13')).toBeCloseTo(2 * Math.sqrt(39) / 13, 6);
    expect(toNumeric('16/3')).toBeCloseTo(16 / 3, 6);
    expect(toNumeric('7.02')).toBeCloseTo(7.02, 6);
    expect(toNumeric('không phải số')).toBeNull();
  });
  it('answersAgree: khớp trong dung sai tương đối', () => {
    expect(answersAgree('√2', 1.41421356, 1e-3)).toBe(true);
    expect(answersAgree('√2', 2.0, 1e-3)).toBe(false);
    expect(answersAgree('không phải số', 1, 1e-3)).toBeNull(); // không so được
  });
});
```

- [ ] **Step 2/3: Cài đặt `answerCompare.js`** — `toNumeric(text)`: parse các dạng engine hay trả (`a√b/c`,
  `p±q√r`, phân số `p/q`, số thập phân); trả `number|null`. `answersAgree(engineText, otherNum, relTol)`:
  `null` nếu không parse được engineText; else `|a−b| ≤ relTol·max(1,|a|)`.
  (CHỈ dùng regex + Math.sqrt, không phụ thuộc kernel.)

- [ ] **Step 4: Wiring GATED (trong `analyze-geometry.js`, khối kernel quick).** CHỈ khi
  `process.env.KERNEL_CROSSCHECK === 'on'` VÀ engine phục vụ: (không chặn kết quả) log so sánh —
  nhưng KHÔNG chạy luồng cũ ở đây (tránh phức tạp/độ trễ). Thay vào đó ghi TODO + chỉ nối `answersAgree`
  vào chỗ đã có sẵn cả hai đáp số nếu có. Nếu không có đường lấy đáp cũ dễ dàng ⇒ chỉ commit module +
  test (khả năng có sẵn), wiring để lại. **Ưu tiên KHÔNG làm chậm/đắt route mặc định.**

- [ ] **Step 5: XANH + commit** `feat: answerCompare — nền đối chiếu engine↔luồng cũ (gated, mặc định tắt)`

---

## Việc CONTROLLER tự làm (không giao subagent — cần LLM thật + đo)
- **Hardening prompt giải tích (#4/#1):** làm Câu 1/9-style phục vụ trên cách gõ tự nhiên; mạnh hơn phần abstain.
  Kiểm bằng harness + API key (subagent không có key/thời gian).
- **Re-measure** bằng harness sau khi mọi task xong → báo cáo hit-rate mới.
- **Spec #2-full (đa-căn):** viết `docs/superpowers/specs/…-multiterm-surd.md` — KHÔNG cài đặt, để người dùng duyệt.

## Self-review
- Tất cả task đều là module THUẦN / instrumentation / gated ⇒ không phá luồng đang chạy.
- Không đụng `run()`, không đụng Scalar lõi, không deploy.
- Mỗi task giữ ≥403 test xanh.
