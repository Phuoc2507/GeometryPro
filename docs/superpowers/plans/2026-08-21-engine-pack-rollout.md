# Engine Pack Đa Môn (Lý + Hóa + Taxonomy) — Kế hoạch rollout tổng

> **For agentic workers:** Đây là KẾ HOẠCH TỔNG theo phase. Mỗi phase P1–P4 phải được cắt thành plan chi tiết bằng superpowers:writing-plans (TDD, checkbox từng step) TRƯỚC khi thực thi; file này chỉ chốt phạm vi, file đụng tới, tiêu chí nghiệm thu và rủi ro từng phase. Steps use checkbox (`- [ ]`).

**Goal:** Nhân triết lý "LLM chỉ DỊCH — ENGINE tất định TÍNH và TỰ KIỂM" sang Vật lý (động học 10) và Hóa (vô cơ THPT) bằng kiến trúc engine pack; kèm cây tri thức (taxonomy tag) dùng chung 3 môn. Luồng Toán hiện tại KHÔNG đổi hành vi.

**Architecture:** Mỗi môn = một pack con của kernel soi gương `analysis/` (schema + compute + `runX()` riêng, không đụng `run()`/core). Routing môn ở tầng bridge/route mới `api/analyze-problem.js`. Contract chung `{ ok, answers, violations, errors, trace, scene }`. Spec: `docs/superpowers/specs/2026-08-21-engine-pack-architecture-design.md` (đọc TRƯỚC khi cắt plan con).

**Tech Stack:** TypeScript + Zod + Vitest (pack, trong `api/_lib/kernel/`); JS thuần cho bridge/route (import từ `kernel-dist/index.mjs`); esbuild qua `npm run build:kernel`; Vilao cho translator/classifier (`VILAO_TRANSLATOR_MODEL`, mặc định `ram/gemini-3.5-flash-low`).

**Baseline (đo 2026-08-21):** `npx vitest run` → **1072 test xanh / 168 file**. Con số này là sàn bất khả xâm phạm của MỌI phase.

---

## Bối cảnh cho người thực thi (đọc trước)

- **Pattern mẫu:** `api/_lib/kernel/analysis/runAnalysis.ts` — entry bọc ngoài, KHÔNG sửa `run()`; plan hợp-lệ-schema không bao giờ throw (hỏng ⇒ `violations`/`errors`). Pack mới sao pattern này nhưng KHÔNG gọi `run()` (Lý/Hóa không dựng entity hình học).
- **Contract run():** `api/_lib/kernel/run.ts:19-26` — `{ ok, entities, answers, violations, errors, trace }`. Contract pack bỏ `entities`, thêm `scene`.
- **Vitest tự nhặt test pack:** include `api/_lib/kernel/**/*.test.ts` (vitest.config.ts) ⇒ P0/P1/P3 test được TRƯỚC khi export qua index.ts.
- **Export = bước người tích hợp:** pack xong vẫn chưa ai gọi tới; chỉ khi P2/P4 thêm dòng `export ... from './physics'` vào `api/_lib/kernel/index.ts` + `npm run build:kernel` thì route .js mới import được (qua `kernel-dist/index.mjs` — không import .ts nguồn, xem `solveWithKernel.js:4`).
- **Scene Lý dùng hạ tầng có sẵn:** `GeometryData.agents/timeline/curves` + renderer `src/components/3d/AnimatedAgent.tsx`. Ba quirk BẮT BUỘC: phát `params.equations {x,y,z}` (không dùng chuỗi `path` — parser split theo `','`); biểu thức JS thuần `t*t` (KHÔNG `t^2` — chỉ được replace 1 lần, `^` là XOR); `t` = **giây PLAYBACK kể từ `track.start`** (F4 — engine nhân sẵn hệ số timeScale k theo quy tắc spec pack Lý §8.2); kèm `landing_point`. Trục z geo3d là trục đứng.
- **Tag tự-persist:** `GeometryData.tags?: string[]` (src/types/geometry.ts:390) đi theo `geometry_data` JSON vào saved_geometries + localStorage — gắn tag là đủ, không migration.
- **Precedent gắn field ngoài schema:** `scaleSymbol` được bridge gắn lại từ json gốc sau `safeParse` (solveWithKernel.js:47-53) — `knowledgeTags` làm y hệt.
- Lệnh chuẩn: `npx vitest run` (toàn suite) · `npx vitest run <file>` (một file) · `npm run build:kernel` (rebuild dist) · `npx tsc --noEmit -p tsconfig.json` (type sạch) · **`npx tsc --noEmit -p tsconfig.kernel.json`** (type sạch cho `api/_lib/kernel/**` — F9: tsconfig gốc KHÔNG include api/** nên gate cũ rỗng với kernel; file tsconfig.kernel.json tạo ở phase đầu tiên chạm kernel .ts theo mẫu plan Lý Task 6) · dry-run route không cần LLM: POST `{subject, plan}` (dev-only).
- **HỎI trước khi gộp main** (auto-deploy) — nghi thức như mọi plan trước.

---

## Phase P0 — Spec + Taxonomy registry

**Mục tiêu:** Chốt spec kiến trúc (file specs ở trên) + dựng cây tri thức dùng chung để mọi phase sau gắn tag ngay từ đầu.

**Files:**
- Create: `docs/superpowers/specs/2026-08-21-engine-pack-architecture-design.md` (đã có — chính là spec này)
- Create: `docs/superpowers/plans/2026-08-21-engine-pack-rollout.md` (file này)
- Create: `api/_lib/kernel/taxonomy/tags.ts` — `TAG_REGISTRY` seed 3 môn (16 tag Toán, 8 tag Lý, **11 tag Hóa** — F10 sửa đếm sai "10" — theo spec §9.3) + `isKnownTag` + `parseTag`
- Create: `api/_lib/kernel/taxonomy/__tests__/tags.test.ts`

**Steps:**
- [x] Spec qua phản biện — ĐÃ XONG phiên 1 (21/08): các điểm phân vân chốt tại **spec kiến trúc §14** (10 phán quyết C1–C10); báo cáo đầy đủ: `docs/superpowers/reviews/2026-08-21-arch-physics-review-phien1.md`. Mọi phase sau thi công theo §14, không mở lại.
- [ ] Viết `tags.ts`: registry là `Record<tag, {label}>`; `parseTag` tách 4 tầng `subject/grade/chapter/skill` (grade cho phép dải `9-10`); `isKnownTag` tra registry.
- [ ] Test: format 4 tầng cho TỪNG key trong registry (regex `^[a-z0-9-]+(\/[a-z0-9-]+){3}$`); `parseTag` đúng/sai mẫu; tối thiểu tồn tại 3 tag mồi của spec (`toan/12/khoi-tron-xoay/the-tich`, `ly/10/dong-hoc/nem-xien`, `hoa/9-10/kim-loai/day-hoat-dong`); label không rỗng.
- [ ] Commit: `feat(taxonomy): tag registry subject/grade/chapter/skill + seed 3 mon`.

**Nghiệm thu:**
- `npx vitest run` → 1072 test cũ + test taxonomy mới, tất cả xanh; `npx tsc --noEmit` sạch.
- `npx tsc --noEmit -p tsconfig.kernel.json` sạch (F9 — nếu file chưa tồn tại vì P1 chưa chạy: tạo ngay theo mẫu plan Lý Task 6, tính là file Create của phase này).
- KHÔNG file có sẵn nào bị sửa (diff chỉ gồm file Create ở trên).

**Rủi ro:** chọn `grade` lệch chương trình (GDPT-2018 vs đề luyện thi quen) → theo spec: đặt theo lớp thường-gặp-trong-đề, alias để sau; registry sai còn sửa rẻ chừng nào chưa ai tiêu thụ — đó là lý do P0 đi trước.

---

## Phase P1 — Physics engine v0 (động học 10) + test

**Mục tiêu:** `runPhysics(plan)` chạy thuần trong kernel: 5 mô hình chuyển động closed-form (thẳng đều, biến đổi đều, rơi tự do, ném ngang, ném xiên — gồm ném thẳng đứng lên/xuống qua angleDeg ±90, F11), 1–2 vật, **12 loại query** (danh mục chuẩn: spec pack Lý §5–§6, gồm `time_when_velocity`/`position_when_velocity` — F3), unit per-quantity engine đổi exact (F2/D1), asserts dữ-kiện-thừa, đáp exact-khi-được. CHƯA nối route, CHƯA LLM.

**Files:**
- Create: `api/_lib/kernel/physics/{planSchema,kinematics,compute,runPhysics,scene}.ts` (tên file theo spec pack Lý — chốt §14.1 spec pack; `physics/index.ts` 3 dòng để P2, bước người tích hợp)
- Create: `api/_lib/kernel/physics/__tests__/{kinematics,compute,runPhysics,scene,physics-contract}.test.ts`
- Create: `tsconfig.kernel.json` (nếu P0 chưa tạo — F9, mẫu ở plan Lý Task 6)
- KHÔNG sửa: `kernel/index.ts` (export để P2), mọi file core.

**Steps:**
- [ ] Thi công theo plan chi tiết ĐÃ CẮT: `docs/superpowers/plans/2026-08-21-physics-pack-v0.md` (TDD từng module, đã cập nhật theo phản biện phiên 1).
- [ ] `planSchema.ts` + `kinematics.ts`: op → bộ đa thức bậc ≤ 2 theo t mỗi trục + vận tốc; `g` BẮT BUỘC theo op, LLM chép từ đề (spec pack §5 — không default); **unit per-quantity `v0Unit`/`xUnit`/`tUnit`: engine đổi về hệ nền bằng hữu tỉ EXACT (km/h→m/s ×5/18, min→s ×60…) — LLM chỉ chép số + unit (F2/D1)**; EXACT_TRIG {0,±30,±45,±60,±90} (C8/F11).
- [ ] `compute.ts`: queries `position_at / velocity_at / time_to_ground / range / max_height / impact_velocity / meet_time / meet_position / distance_between_at / time_when / time_when_velocity / position_when_velocity`; exact qua `scalar.ts` với góc đẹp; nghiệm bậc ≤ 2 qua `analysis/solver1d.solveQuadratic` (F4 — `solvePoly` không tồn tại); rơi về numeric + `recognizeConstant` (cờ `approximate`); self-check thay-ngược + certify float độc lập; meet_time 2 nghiệm ⇒ nghiệm đầu + dòng info "còn nghiệm t₂" (D3).
- [ ] `runPhysics.ts`: parse → compute queries → verify asserts (recompute + tol) → `{ ok, answers(unit), checks, violations, errors, geometry, charts, meta }`; không throw với plan hợp lệ.
- [ ] `scene.ts`: points (mốc xuất phát + chạm đất, label text trần — mức v0 chốt F8) + `curves.samples` quỹ đạo (**Curve3D phát `params: {}`** — F9) + `agents` + `timeline` với `equations` object, `t*t`, `landing_point`, playback theo quy tắc spec pack §8.2 (D2).
- [ ] Commit theo từng task của plan con.

**Nghiệm thu (test xanh nào):**
- Golden tính tay (bắt buộc, số đã kiểm trong spec §7.3 + spec pack §10): ném xiên v₀=20, θ=60°, g=10 ⇒ H=15 (exact `15`), L=`20√3`≈34.641, T=`2√3`≈3.4641; rơi tự do h=45 ⇒ t=3 s, v=30 m/s; hai xe (0,+10) vs (120,−20) ⇒ gặp t=4 s, x=40 m; **hãm phanh 54 km/h (khai `v0Unit`), a=−3 ⇒ v₀=15 m/s exact, t_dừng=5 s, s=75/2 m (P11)**; **ném thẳng đứng xuống h=60, v₀=5, angleDeg=−90 ⇒ 3 s, 35 m/s (P12)**.
- Violation test: đề "chạm đất sau 5 s" (assert equals 5) trên bài T=2√3 ⇒ `ok:false` + violation, answers vẫn tính nhưng không bịa lại.
- Test đổi đơn vị (F2): 54 km/h → 15 m/s, 30 min → 1/2 h, 2 km → 2000 m — tất cả exact (hữu tỉ).
- Scene format test: `equations` dùng `t*t` (không chứa `^`, không chứa `,` trong biểu thức; z bài P6 theo mẫu `0 + 17.320508*t + -5*t*t`), agent initialPosition = from, `landing_point` = điểm rơi, duration theo quy tắc playback.
- Toàn suite: 1072 cũ + taxonomy + **47 test physics mới** (đếm theo plan Lý Task 6: 13+13+5+4+12 — gồm 12 bài contract P1–P12), tất cả xanh; `tsc --noEmit` sạch; **`npx tsc --noEmit -p tsconfig.kernel.json` sạch (F9)**.

**Rủi ro:** đơn vị (km/h, phút) trộn trong đề → unit per-quantity + engine đổi exact + test riêng (F2 — KHÔNG để LLM đổi); exact cho góc lẻ không tồn tại → chấp nhận numeric + `approximate:true` (đừng cố CAS hoá); cross-pack import `analysis/solver1d` → chỉ 2 module thuần (`solver1d`, `recognize` — C2, bỏ `expr`), ghi TODO mathlib trong code.

---

## Phase P2 — Prompt dịch đề Lý + nối route + scene/timeline chạy thật

**Mục tiêu:** Đề Lý tiếng Việt chạy end-to-end qua LLM: classifier môn → translator Lý → `runPhysics` → response contract chung → canvas animate vật bay. Đây là phase "người tích hợp" đầu tiên.

**Files:**
- Create: `api/_lib/kernel-bridge/physicsTranslatorPrompt.js` (few-shot: ném xiên + rơi tự do + hai xe gặp nhau; cổng abstain; cấm LLM tự tính vx/vz; bắt chép `g` và `knowledgeTags`)
- Create: `api/_lib/kernel-bridge/subjectClassifier.js` (prefilter từ khoá tất định + classifier LLM rẻ; few-shot có ca ranh giới "máy bay & radar" → geometry)
- Create: `api/_lib/kernel-bridge/solveWithPhysics.js` (planFromProblem kiểu Lý + solvePhysicsPlan + jsonSafe + alias `scene = result.geometry` + `trace` tổng hợp từ `checks[].detail` + errors — F7 + gắn knowledgeTags vào scene.tags theo precedent scaleSymbol)
- Create: `api/_lib/kernel/physics/index.ts` (3 dòng export public — bước người tích hợp, spec pack §14.1)
- Create: `api/analyze-problem.js` (route: `{subject?, problem?, plan?}`; nhánh geometry ủy quyền nguyên `solveWithKernel.js`; nhánh plan dry-run dev-only 404 ở production — sao y v2; **BỌC QUOTA/BILLING y v2 cho MỌI nhánh LLM — F1: `resolveAiAccess` feature `draw`/action `draw_quick` TRƯỚC classifier+translator, `withQuota` response, lỗi ⇒ `refundAiUsage` + hoàn credit + `logBrokenProblem` — khung code: spec kiến trúc §4.1**)
- Create: `scripts/e2e-physics.mjs` (đo 2 lần với LLM thật, kiểu `e2e-advance` — F14: `scripts/e2e-advance.mjs`, KHÔNG phải `e2e-kinematic.mjs` vốn không tồn tại)
- Modify: `server.js` — CHỈ thêm import + mount `/api/analyze-problem` (cộng thêm, sao khuôn mount v2)
- Modify: `api/_lib/kernel/index.ts` — CHỈ thêm `export { runPhysics, PhysicsPlanSchema } from './physics';` + export taxonomy
- Rebuild + commit: `api/_lib/kernel-dist/` theo quy trình build:kernel

**Steps:**
- [ ] Cắt plan chi tiết (writing-plans) từ spec §4–§6 (gồm khung quota §4.1 — F1).
- [ ] Export pack qua `kernel/index.ts`, `npm run build:kernel`, smoke import từ dist.
- [ ] Route + bridge + dry-run test (không LLM): POST plan ném xiên golden ⇒ answers + scene đúng như P1. Dry-run nằm TRƯỚC tầng quota (không gọi LLM — sao y v2).
- [ ] Quota (F1): mọi nhánh LLM (classifier + translator, kể cả geometry ủy quyền) nằm SAU `resolveAiAccess` và trong khung try/catch refund; test/ca thử "hết lượt ⇒ accessError, KHÔNG gọi LLM"; classifier không tạo lượt trừ quota riêng.
- [ ] Prompt + `node --check`; e2e LLM thật 2/2 đề ném xiên: LLM khai `v0+angleDeg` (không tự tính thành phần, không tự đổi đơn vị — unit khai qua `v0Unit`/`xUnit`/`tUnit`), đáp khớp golden, scene có agents/timeline.
- [ ] Kiểm animate trên browser (nạp scene engine-sinh vào localStorage → mở canvas → agent bay parabol, 0 lỗi eval mỗi frame — quy trình KIN-T3 của kinematic plan). **Kèm bước thử ngưỡng playback trên canvas thật (D2):** một bài giây-thật (3 ≤ T ≤ 15, k=1) + một bài nén (hai xe theo giờ → 10 s, k≠1) — ngưỡng 3–15 s GIỮ nguyên sau phản biện, chỉ chỉnh nếu cảm quan canvas bác bỏ.
- [ ] Đối chiếu hành vi Toán: bắn 2–3 đề hình học qua `/api/analyze-problem` (subject geometry + auto-detect) ⇒ kết quả trùng với `/api/analyze-geometry-v2`.

**Nghiệm thu (test xanh nào):**
- Toàn suite xanh (1072 cũ nguyên vẹn + P0 + P1 + test route/bridge mới); `tsc --noEmit` sạch; `npx tsc --noEmit -p tsconfig.kernel.json` sạch (F9); `npm run build` xanh.
- Dry-run route trả contract chung đúng shape (có `subject`, `scene`, `answers[].unit`; nhánh physics: `trace` tổng hợp từ checks/errors — F7).
- **Vượt quota bị chặn giống v2 (F1):** hết lượt ⇒ `accessError` trước khi bất kỳ LLM nào được gọi; guest theo `guestMax` như v2.
- E2E LLM 2/2; classifier trả `geometry` cho đề "máy bay & radar" (ca ranh giới); prefilter nhận `m/s2`/`m/s^2` (F17); browser animate OK (kèm ca thử playback D2).
- Route v2 KHÔNG đổi một dòng — diff không chạm `api/analyze-geometry-v2.js`, `api/_lib/kernel-bridge/solveWithKernel.js`, `translatorPrompt.js`.

**Rủi ro:** LLM Lý bịa toạ độ/thành phần vận tốc (R1 kiểu kinematic) → few-shot cấm + asserts bắt; classifier nhầm môn → fallback abstain→geometry + log subject vào trace để đo về sau; kernel-dist quên rebuild → smoke import trong CI thủ công (`npm run smoke:kernel`); treo LLM → timeout ngắn kiểu `TRANSLATE_TIMEOUT_MS`.

---

## Phase P3 — Chem engine v0 (balance + stoichiometry + DB 50 phản ứng + hiện tượng) + test

**Mục tiêu:** `runChem(plan)` thuần kernel: cân bằng tất định, tính theo phương trình (chất dư/hết, mol/gam/lít/CM), hiện tượng TRA từ DB có cấu trúc, xuất `chemScene` JSON theo khung spec §6.3. CHƯA render, CHƯA LLM.

**Files:**
- Create: `api/_lib/kernel/chem/{index,runChem,schema,formula,balance,stoichiometry,reactionDB,scene}.ts`
- Create: `api/_lib/kernel/chem/__tests__/{formula,balance,stoichiometry,reactionDB,runChem,scene}.test.ts`
- KHÔNG sửa: `kernel/index.ts` (export để P4), mọi file core/pack khác.

**Steps:**
- [ ] Cắt plan chi tiết (writing-plans) từ **spec pack Hóa** `docs/superpowers/specs/2026-08-21-chem-pack-design.md` — phản biện phiên 1 ĐÃ CHỐT (F5): schema plan theo chem spec §10, ChemScene theo chem spec §11; kiến trúc §8.1/§6.3 chỉ còn là pointer. Áp thêm F6/C10 (tol hai tầng) + F10 (tags DB theo registry 4 tầng) — vòng sửa Hóa đang cập nhật 2 file Hóa song song.
- [ ] `formula.ts`: parser công thức (ngoặc lồng `Al2(SO4)3`) + bảng khối lượng mol SGK; test vector nguyên tố.
- [ ] `balance.ts`: nullspace ma trận nguyên tố trên hữu tỉ (Rational BigInt của `scalar.ts`) → hệ số nguyên tối giản; tự kiểm đếm lại nguyên tố 2 vế; trả lỗi có cấu trúc khi hệ vô nghiệm/phản ứng phi lý.
- [ ] `reactionDB.ts`: ~50 phản ứng vô cơ (kim loại+axit/muối, trao đổi-kết tủa, nhiệt phân, điều chế khí, CO₂+nước vôi) với `phenomena.effects` CÓ CẤU TRÚC + `tags` taxonomy.
- [ ] `stoichiometry.ts`: given→mol; chất hết/dư; mọi đơn vị hỏi; `molarVolume` từ plan (default 24,79 — đkc GDPT-2018; đề "đktc" ⇒ 22,4).
- [ ] `runChem.ts` + `scene.ts`: contract chung + `chemScene` (vessels/contents/precipitate/gasBubbles/labels từ effects DB).
- [ ] Commit theo từng task.

**Nghiệm thu (test xanh nào):**
- Balance golden: `Fe + 2HCl → FeCl2 + H2` · `2Al + 3H2SO4 → Al2(SO4)3 + 3H2` · `2KMnO4 → K2MnO4 + MnO2 + O2` (+ ≥10 ca nữa, gồm 1 ca vô nghiệm ⇒ error có cấu trúc, không throw).
- **DB integrity tự-kiểm:** một test lặp TỪNG entry của 50 phản ứng, chạy `balance()` đối chiếu hệ số DB (luật vàng spec §8.3 — sao "Lớp B" của problemTypeCatalog); schema effects hợp lệ 100%.
- Stoichiometry golden tay: Fe 5,6 g + HCl dư ⇒ H₂ **2,479 lít** (đkc) / 2,24 lít (đktc 22,4), FeCl₂ **12,7 g**; 1 bài chất dư/hết có dư định lượng đúng.
- Violation test: đề cho "thu được 3 lít khí" trên bài 2,479 lít ⇒ `ok:false` + violation.
- Phenomena: bài khớp DB trả đúng text+effects; bài KHÔNG khớp trả "chưa có trong DB" (không sinh).
- Toàn suite: 1072 + P0 + P1 (+P2 nếu đã gộp) + ~55–70 test chem mới, xanh; `tsc --noEmit` sạch; `npx tsc --noEmit -p tsconfig.kernel.json` sạch (F9).

**Rủi ro:** DB 50 phản ứng là khối dữ liệu tay lớn → chính test integrity là lưới (hệ số sai là đỏ ngay); parser công thức edge case (hydrat `CuSO4.5H2O`) → v0 loại khỏi phạm vi, ghi rõ; nghiệm nullspace nhiều chiều (phản ứng tổ hợp) → v0 chỉ nhận nullspace 1 chiều, ngoài ⇒ error có cấu trúc.

---

## Phase P4 — ChemScene render + UI chọn môn + nối route Hóa

**Mục tiêu:** Người dùng chọn môn (hoặc auto-detect), gõ đề Hóa, thấy đáp + hiện tượng + cảnh ống nghiệm (kết tủa/bọt khí) render từ `chemScene`. Phase DUY NHẤT đụng `src/**` — toàn bộ là cộng thêm.

**Files:**
- Create: `api/_lib/kernel-bridge/chemTranslatorPrompt.js`, `api/_lib/kernel-bridge/solveWithChem.js`
- Modify: `api/analyze-problem.js` — thêm nhánh `chem` (dispatcher, sao khuôn nhánh physics)
- Modify: `api/_lib/kernel/index.ts` — CHỈ thêm `export { runChem, ChemPlanSchema } from './chem';` + rebuild kernel-dist
- Modify: `src/types/geometry.ts` — CHỈ thêm `chemScene?: ChemScene` (optional, kèm type theo **chem spec §11** — events-based; kiến trúc §6.3 là pointer, F5)
- Create: `src/components/chem/ChemSceneView.tsx` (render vessels/contents/precipitate/gasBubbles/labels; React thuần + react-router theo AGENTS.md — KHÔNG Next.js)
- Modify: component nhập đề hiện có — thêm selector môn `Toán | Lý | Hóa | Tự nhận diện` (component cụ thể chốt khi cắt plan con, thay đổi cộng thêm quanh chỗ gọi API)
- Modify: điểm rẽ render canvas — `geometry.chemScene` có mặt ⇒ mount `ChemSceneView` (một nhánh điều kiện cộng thêm)
- Create: test structure cho ChemScene type + smoke test component (render với fixture chemScene golden của P3)

**Steps:**
- [ ] Cắt plan chi tiết (writing-plans): spec con cho render ChemScene (2D overlay vs r3f — chốt tại đây), rồi mới code.
- [ ] Nối route + prompt Hóa; dry-run plan Fe+HCl qua route ⇒ contract + chemScene đúng fixture P3.
- [ ] E2E LLM thật 2/2 đề Hóa (Fe+HCl; BaCl₂+Na₂SO₄ kết tủa trắng): plan hợp schema, đáp khớp golden, hiện tượng từ DB.
- [ ] UI chọn môn + render; kiểm browser: đề Hóa hiện ống nghiệm + kết tủa + label hiện tượng; đề Toán/Lý đi đúng đường cũ.
- [ ] Hồi quy UI Toán: các trang /teacher, /student với đề hình học không đổi hành vi (smoke thủ công + test hiện có).

**Nghiệm thu (test xanh nào):**
- Toàn suite xanh: 1072 cũ nguyên vẹn + toàn bộ test P0–P4; `tsc --noEmit` sạch; `npx tsc --noEmit -p tsconfig.kernel.json` sạch (F9); `npm run build` xanh (build:kernel + vite).
- Dry-run route chem đúng contract; e2e LLM 2/2; browser render ChemScene không lỗi console.
- Diff `src/**` chỉ gồm: 1 optional field trong types, component MỚI, selector môn + 1 nhánh render — không sửa logic Toán nào.

**Rủi ro:** render Hóa là bề mặt UX mới hoàn toàn → giữ v0 tối giản (tĩnh, không animation sủi bọt — để đợt sau); selector môn làm rối flow nhập hiện tại → mặc định "Tự nhận diện", không bắt người dùng chọn; `chemScene` làm phình geometry_data lưu lịch sử → scene Hóa nhỏ (không points/lines), chấp nhận.

---

## Kiểm cuối + gộp (sau mỗi phase, và chốt toàn tuyến sau P4)

- [ ] `npx vitest run` toàn suite xanh (sàn 1072 + cộng dồn); `npx tsc --noEmit -p tsconfig.json` sạch; **`npx tsc --noEmit -p tsconfig.kernel.json` sạch** (F9 — gate typecheck cho `api/_lib/kernel/**`); `npm run build` xanh.
- [ ] `git status` chỉ chứa file chủ đích của phase; kernel-dist rebuild đúng nhịp (chỉ đổi khi kernel .ts đổi).
- [ ] Hành vi Toán đối chiếu không đổi (v2 + solve + UI cũ).
- [ ] Cập nhật memory (engine-pack đa môn) + Findings dưới đây.
- [ ] **HỎI trước khi gộp main** (auto-deploy). Sau deploy: verify prod theo cảnh báo MERGE-BRIEF §6 (build:kernel phải chạy trước khi đóng gói serverless).

## Findings

(Ghi lại theo từng phase khi thực thi — format như KIN-T1/T2/T3 của `2026-07-19-kinematic-module.md`: mã phase, việc đã làm, commit, số test xanh, bằng chứng end-to-end.)

---

## Changelog phản biện phiên 1 (21/08)

- **F1 (P2):** route `analyze-problem.js` ghi rõ bọc quota/billing y v2 (`resolveAiAccess` `draw`/`draw_quick` trước classifier+translator, `withQuota`, refund + `logBrokenProblem` khi lỗi); thêm step quota + tiêu chí nghiệm thu "vượt quota bị chặn giống v2"; classifier không tạo lượt trừ riêng.
- **F2/D1 (P1):** bỏ mô tả "quy về SI ngay khi parse"; thay bằng unit per-quantity (`v0Unit`/`xUnit`/`tUnit`) + engine đổi hữu tỉ exact; thêm tiêu chí test đổi đơn vị.
- **F3/F11 (P1):** mục tiêu 12 loại query (thêm `time_when_velocity`/`position_when_velocity`); golden thêm P11 hãm phanh + P12 ném thẳng đứng xuống (angleDeg −90); EXACT_TRIG {0,±30,±45,±60,±90}.
- **F4 (Bối cảnh, P1):** `solvePoly` → `solveQuadratic`; quirk `t` sửa thành "giây playback kể từ track.start"; tên file/tên query theo spec pack (`planSchema`/`kinematics`, query tách-một-số); cross-import chỉ còn `solver1d` + `recognize`.
- **F5 (P3, P4):** plan Hóa cắt từ chem spec (schema §10, ChemScene §11); kiến trúc §8.1/§6.3 là pointer.
- **F8 (P1):** scene v0 chốt mức plan (mốc xuất phát + chạm đất, label text trần).
- **F9 (Bối cảnh, P0–P4, Kiểm cuối):** thêm gate `npx tsc --noEmit -p tsconfig.kernel.json` (tsconfig gốc không include api/**); `tsconfig.kernel.json` tạo ở phase đầu tiên chạm kernel .ts (mẫu: plan Lý Task 6); buildScene phát `params: {}` cho Curve3D.
- **F10 (P0):** "10 tag Hóa" → **11**.
- **F13 (P0):** step phản biện đánh dấu XONG, trỏ tới spec kiến trúc §14 (C1–C10) + file review.
- **F14 (P2):** script mẫu e2e là `scripts/e2e-advance.mjs` (không phải `e2e-kinematic.mjs`).
- **D2 (P2):** thêm bước thử ngưỡng playback 3–15 s trên canvas thật.
- **F15 (P1):** số test physics chốt 47 (khớp plan Lý Task 6 sau sửa).
