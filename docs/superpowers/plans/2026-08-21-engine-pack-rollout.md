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
- **Scene Lý dùng hạ tầng có sẵn:** `GeometryData.agents/timeline/curves` + renderer `src/components/3d/AnimatedAgent.tsx`. Ba quirk BẮT BUỘC: phát `params.equations {x,y,z}` (không dùng chuỗi `path` — parser split theo `','`); biểu thức JS thuần `t*t` (KHÔNG `t^2` — chỉ được replace 1 lần, `^` là XOR); `t` = GIÂY thật; kèm `landing_point`. Trục z geo3d là trục đứng.
- **Tag tự-persist:** `GeometryData.tags?: string[]` (src/types/geometry.ts:390) đi theo `geometry_data` JSON vào saved_geometries + localStorage — gắn tag là đủ, không migration.
- **Precedent gắn field ngoài schema:** `scaleSymbol` được bridge gắn lại từ json gốc sau `safeParse` (solveWithKernel.js:47-53) — `knowledgeTags` làm y hệt.
- Lệnh chuẩn: `npx vitest run` (toàn suite) · `npx vitest run <file>` (một file) · `npm run build:kernel` (rebuild dist) · `npx tsc --noEmit -p tsconfig.json` (type sạch) · dry-run route không cần LLM: POST `{subject, plan}` (dev-only).
- **HỎI trước khi gộp main** (auto-deploy) — nghi thức như mọi plan trước.

---

## Phase P0 — Spec + Taxonomy registry

**Mục tiêu:** Chốt spec kiến trúc (file specs ở trên) + dựng cây tri thức dùng chung để mọi phase sau gắn tag ngay từ đầu.

**Files:**
- Create: `docs/superpowers/specs/2026-08-21-engine-pack-architecture-design.md` (đã có — chính là spec này)
- Create: `docs/superpowers/plans/2026-08-21-engine-pack-rollout.md` (file này)
- Create: `api/_lib/kernel/taxonomy/tags.ts` — `TAG_REGISTRY` seed 3 môn (16 tag Toán, 8 tag Lý, 10 tag Hóa theo spec §9.3) + `isKnownTag` + `parseTag`
- Create: `api/_lib/kernel/taxonomy/__tests__/tags.test.ts`

**Steps:**
- [ ] Spec qua phản biện (phiên brainstorming/review riêng), chốt các "điểm phân vân" cuối spec.
- [ ] Viết `tags.ts`: registry là `Record<tag, {label}>`; `parseTag` tách 4 tầng `subject/grade/chapter/skill` (grade cho phép dải `9-10`); `isKnownTag` tra registry.
- [ ] Test: format 4 tầng cho TỪNG key trong registry (regex `^[a-z0-9-]+(\/[a-z0-9-]+){3}$`); `parseTag` đúng/sai mẫu; tối thiểu tồn tại 3 tag mồi của spec (`toan/12/khoi-tron-xoay/the-tich`, `ly/10/dong-hoc/nem-xien`, `hoa/9-10/kim-loai/day-hoat-dong`); label không rỗng.
- [ ] Commit: `feat(taxonomy): tag registry subject/grade/chapter/skill + seed 3 mon`.

**Nghiệm thu:**
- `npx vitest run` → 1072 test cũ + test taxonomy mới, tất cả xanh; `npx tsc --noEmit` sạch.
- KHÔNG file có sẵn nào bị sửa (diff chỉ gồm file Create ở trên).

**Rủi ro:** chọn `grade` lệch chương trình (GDPT-2018 vs đề luyện thi quen) → theo spec: đặt theo lớp thường-gặp-trong-đề, alias để sau; registry sai còn sửa rẻ chừng nào chưa ai tiêu thụ — đó là lý do P0 đi trước.

---

## Phase P1 — Physics engine v0 (động học 10) + test

**Mục tiêu:** `runPhysics(plan)` chạy thuần trong kernel: 5 mô hình chuyển động closed-form (thẳng đều, biến đổi đều, rơi tự do, ném ngang, ném xiên), 1–2 vật, 7 loại query, asserts dữ-kiện-thừa, đáp exact-khi-được. CHƯA nối route, CHƯA LLM.

**Files:**
- Create: `api/_lib/kernel/physics/{index,runPhysics,schema,motion,compute,scene}.ts`
- Create: `api/_lib/kernel/physics/__tests__/{motion,compute,runPhysics,scene}.test.ts`
- KHÔNG sửa: `kernel/index.ts` (export để P2), mọi file core.

**Steps:**
- [ ] Cắt plan chi tiết bằng writing-plans từ spec §7 (TDD từng module).
- [ ] `schema.ts` + `motion.ts`: body → bộ đa thức bậc ≤ 2 `x(t),y(t),z(t)` + vận tốc; `g` là field LLM chép từ đề (default 10); mọi input quy về SI ngay khi parse.
- [ ] `compute.ts`: queries `state_at / flight_time / range / max_height / time_when / meet / distance_between_at`; exact qua `scalar.ts` với góc đẹp; nghiệm bậc ≤ 2 qua `analysis/solver1d.solvePoly`; rơi về numeric + `recognizeConstant` (cờ `approximate`); self-certificate closed-form vs sampling.
- [ ] `runPhysics.ts`: parse → compute queries → verify asserts (recompute + tol) → `{ ok, answers(unit), violations, errors, trace, scene }`; không throw với plan hợp lệ.
- [ ] `scene.ts`: points (mốc, điểm rơi highlight) + `curves.samples` quỹ đạo + `agents` + `timeline` với `equations` object, `t*t`, `landing_point`, duration = thời gian bay thật.
- [ ] Commit theo từng task của plan con.

**Nghiệm thu (test xanh nào):**
- Golden tính tay (bắt buộc, số đã kiểm trong spec §7.3): ném xiên v₀=20, θ=60°, g=10 ⇒ H=15 (exact `15`), L=`20√3`≈34.641, T=`2√3`≈3.4641; rơi tự do h=45 ⇒ t=3 s, v=30 m/s; hai xe (0,+10) vs (120,−20) ⇒ gặp t=4 s, x=40 m.
- Violation test: đề "chạm đất sau 5 s" (assert equals 5) trên bài T=2√3 ⇒ `ok:false` + violation, answers vẫn tính nhưng không bịa lại.
- Scene format test: `equations.z === "17.3205*t - 5*t*t"` (không chứa `^`, không chứa `,` trong biểu thức), agent initialPosition = from, `landing_point` = điểm rơi, duration = T.
- Toàn suite: 1072 cũ + taxonomy + ~35–45 test physics mới, tất cả xanh; `tsc --noEmit` sạch.

**Rủi ro:** đơn vị (km/h, phút) lọt vào không quy đổi → chặn ở schema-parse + test riêng; exact cho góc lẻ không tồn tại → chấp nhận numeric + `approximate:true` (đừng cố CAS hoá); cross-pack import `analysis/solver1d` → chỉ 3 module thuần, ghi TODO mathlib trong code.

---

## Phase P2 — Prompt dịch đề Lý + nối route + scene/timeline chạy thật

**Mục tiêu:** Đề Lý tiếng Việt chạy end-to-end qua LLM: classifier môn → translator Lý → `runPhysics` → response contract chung → canvas animate vật bay. Đây là phase "người tích hợp" đầu tiên.

**Files:**
- Create: `api/_lib/kernel-bridge/physicsTranslatorPrompt.js` (few-shot: ném xiên + rơi tự do + hai xe gặp nhau; cổng abstain; cấm LLM tự tính vx/vz; bắt chép `g` và `knowledgeTags`)
- Create: `api/_lib/kernel-bridge/subjectClassifier.js` (prefilter từ khoá tất định + classifier LLM rẻ; few-shot có ca ranh giới "máy bay & radar" → geometry)
- Create: `api/_lib/kernel-bridge/solveWithPhysics.js` (planFromProblem kiểu Lý + solvePhysicsPlan + jsonSafe + gắn knowledgeTags vào scene.tags theo precedent scaleSymbol)
- Create: `api/analyze-problem.js` (route: `{subject?, problem?, plan?}`; nhánh geometry ủy quyền nguyên `solveWithKernel.js`; nhánh plan dry-run dev-only 404 ở production — sao y v2)
- Create: `scripts/e2e-physics.mjs` (đo 2 lần với LLM thật, kiểu `e2e-kinematic`)
- Modify: `server.js` — CHỈ thêm import + mount `/api/analyze-problem` (cộng thêm, sao khuôn mount v2)
- Modify: `api/_lib/kernel/index.ts` — CHỈ thêm `export { runPhysics, PhysicsPlanSchema } from './physics';` + export taxonomy
- Rebuild + commit: `api/_lib/kernel-dist/` theo quy trình build:kernel

**Steps:**
- [ ] Cắt plan chi tiết (writing-plans) từ spec §4–§6.
- [ ] Export pack qua `kernel/index.ts`, `npm run build:kernel`, smoke import từ dist.
- [ ] Route + bridge + dry-run test (không LLM): POST plan ném xiên golden ⇒ answers + scene đúng như P1.
- [ ] Prompt + `node --check`; e2e LLM thật 2/2 đề ném xiên: LLM khai `speed+angleDeg` (không tự tính thành phần), đáp khớp golden, scene có agents/timeline.
- [ ] Kiểm animate trên browser (nạp scene engine-sinh vào localStorage → mở canvas → agent bay parabol, 0 lỗi eval mỗi frame — quy trình KIN-T3 của kinematic plan).
- [ ] Đối chiếu hành vi Toán: bắn 2–3 đề hình học qua `/api/analyze-problem` (subject geometry + auto-detect) ⇒ kết quả trùng với `/api/analyze-geometry-v2`.

**Nghiệm thu (test xanh nào):**
- Toàn suite xanh (1072 cũ nguyên vẹn + P0 + P1 + test route/bridge mới); `tsc --noEmit` sạch; `npm run build` xanh.
- Dry-run route trả contract chung đúng shape (có `subject`, `scene`, `answers[].unit`).
- E2E LLM 2/2; classifier trả `geometry` cho đề "máy bay & radar" (ca ranh giới); browser animate OK.
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
- [ ] Cắt plan chi tiết (writing-plans) từ spec §8 — đối chiếu với spec pack Hóa chi tiết `docs/superpowers/specs/2026-08-21-chem-pack-design.md` (soạn song song; lệch nhau ⇒ phản biện chốt trước khi code).
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
- Toàn suite: 1072 + P0 + P1 (+P2 nếu đã gộp) + ~55–70 test chem mới, xanh; `tsc --noEmit` sạch.

**Rủi ro:** DB 50 phản ứng là khối dữ liệu tay lớn → chính test integrity là lưới (hệ số sai là đỏ ngay); parser công thức edge case (hydrat `CuSO4.5H2O`) → v0 loại khỏi phạm vi, ghi rõ; nghiệm nullspace nhiều chiều (phản ứng tổ hợp) → v0 chỉ nhận nullspace 1 chiều, ngoài ⇒ error có cấu trúc.

---

## Phase P4 — ChemScene render + UI chọn môn + nối route Hóa

**Mục tiêu:** Người dùng chọn môn (hoặc auto-detect), gõ đề Hóa, thấy đáp + hiện tượng + cảnh ống nghiệm (kết tủa/bọt khí) render từ `chemScene`. Phase DUY NHẤT đụng `src/**` — toàn bộ là cộng thêm.

**Files:**
- Create: `api/_lib/kernel-bridge/chemTranslatorPrompt.js`, `api/_lib/kernel-bridge/solveWithChem.js`
- Modify: `api/analyze-problem.js` — thêm nhánh `chem` (dispatcher, sao khuôn nhánh physics)
- Modify: `api/_lib/kernel/index.ts` — CHỈ thêm `export { runChem, ChemPlanSchema } from './chem';` + rebuild kernel-dist
- Modify: `src/types/geometry.ts` — CHỈ thêm `chemScene?: ChemScene` (optional, kèm interface theo spec §6.3)
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
- Toàn suite xanh: 1072 cũ nguyên vẹn + toàn bộ test P0–P4; `tsc --noEmit` sạch; `npm run build` xanh (build:kernel + vite).
- Dry-run route chem đúng contract; e2e LLM 2/2; browser render ChemScene không lỗi console.
- Diff `src/**` chỉ gồm: 1 optional field trong types, component MỚI, selector môn + 1 nhánh render — không sửa logic Toán nào.

**Rủi ro:** render Hóa là bề mặt UX mới hoàn toàn → giữ v0 tối giản (tĩnh, không animation sủi bọt — để đợt sau); selector môn làm rối flow nhập hiện tại → mặc định "Tự nhận diện", không bắt người dùng chọn; `chemScene` làm phình geometry_data lưu lịch sử → scene Hóa nhỏ (không points/lines), chấp nhận.

---

## Kiểm cuối + gộp (sau mỗi phase, và chốt toàn tuyến sau P4)

- [ ] `npx vitest run` toàn suite xanh (sàn 1072 + cộng dồn); `npx tsc --noEmit -p tsconfig.json` sạch; `npm run build` xanh.
- [ ] `git status` chỉ chứa file chủ đích của phase; kernel-dist rebuild đúng nhịp (chỉ đổi khi kernel .ts đổi).
- [ ] Hành vi Toán đối chiếu không đổi (v2 + solve + UI cũ).
- [ ] Cập nhật memory (engine-pack đa môn) + Findings dưới đây.
- [ ] **HỎI trước khi gộp main** (auto-deploy). Sau deploy: verify prod theo cảnh báo MERGE-BRIEF §6 (build:kernel phải chạy trước khi đóng gói serverless).

## Findings

(Ghi lại theo từng phase khi thực thi — format như KIN-T1/T2/T3 của `2026-07-19-kinematic-module.md`: mã phase, việc đã làm, commit, số test xanh, bằng chứng end-to-end.)
