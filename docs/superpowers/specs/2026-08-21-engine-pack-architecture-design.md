# Kiến trúc Engine Pack Đa Môn (Multi-Subject Engine Packs) — Design Spec

**Ngày:** 2026-08-21
**Trạng thái:** ĐÃ QUA PHẢN BIỆN PHIÊN 1 (21/08/2026) — mọi finding F1–F18 + phán quyết C1–C10, D1–D6 đã áp vào spec (báo cáo: `docs/superpowers/reviews/2026-08-21-arch-physics-review-phien1.md`; phán quyết chép tại §14). Kế hoạch rollout tổng: `docs/superpowers/plans/2026-08-21-engine-pack-rollout.md`.
**Tiền đề:** Kernel hình học + engine giải tích + module kinematic đã chạy production-shape; baseline **1072 test xanh / 168 file** (đo 2026-08-21 bằng `npx vitest run`).
**Nguyên tắc thừa kế:** đúng tinh thần `docs/MERGE-BRIEF.md` — **mọi thứ chỉ CỘNG THÊM**, luồng Toán hiện tại không đổi một hành vi nào.

---

## 1. Mục tiêu & bối cảnh

**Mục tiêu một câu:** Nhân bản triết lý chống ảo giác của geo3d — *"LLM chỉ DỊCH đề thành Plan JSON; ENGINE tất định TÍNH và TỰ KIỂM"* — sang các môn tự nhiên khác (trước mắt: **Vật lý động học lớp 10** và **Hóa vô cơ THPT**), bằng kiến trúc **engine pack**: mỗi môn là một thư mục con của kernel, soi gương pattern `analysis/`, có schema + compute + entrypoint riêng, **không đụng** `run()`/core hiện có.

**Vì sao bây giờ:** hạ tầng cần thiết đã tồn tại và đã được chứng minh:

| Mảnh ghép có sẵn | Ở đâu | Vai trò cho pack mới |
|---|---|---|
| Pattern "engine bọc ngoài, không sửa core" | `api/_lib/kernel/analysis/runAnalysis.ts` (comment dòng 2–4: *"bọc ngoài run() — KHÔNG sửa run()"*) | **Pattern mẫu** cho mọi pack |
| Contract kết quả có cấu trúc | `api/_lib/kernel/run.ts:19-26` — `{ ok, entities, answers, violations, errors, trace }` | Khuôn cho contract chung §5 |
| Số học exact (Rational + Surd) | `api/_lib/kernel/scalar.ts` | Physics tái dùng để trả `20√3 m` thay vì `34.64` |
| Giải phương trình exact bậc ≤ 2, nhận-dạng-căn-đẹp | `api/_lib/kernel/analysis/solver1d.ts`, `recognize.ts` | Physics: thời điểm gặp nhau/chạm đất |
| Animation engine-computed | `mover` trong `AnalysisPlanSchema` (runAnalysis.ts:73-77) + `Agent3D`/`AnimationTimeline` (src/types/geometry.ts) + `AnimatedAgent.tsx` | Physics xuất chuyển động, frontend animate — **không cần sửa frontend** |
| Route có dry-run nhận plan thẳng | `api/analyze-geometry-v2.js` (nhánh `{plan}`, dev-only) | Khuôn cho route đa môn |
| Tag tự-persist theo hình | `GeometryData.tags?: string[]` (src/types/geometry.ts:390) chảy vào `saved_geometries.geometry_data` + localStorage history | Điểm gắn taxonomy §9, **không cần migration DB** |

**Không mục tiêu (YAGNI):** không xây simulator vật lý tổng quát (va chạm, lực, nhiều chiều tự do), không xây engine hữu cơ/điện phân định lượng phức tạp, không sửa UI Toán hiện có. Phạm vi v0 của từng pack ở §7–§8.

---

## 2. Khái niệm "engine pack"

**Định nghĩa:** một engine pack = một thư mục con của `api/_lib/kernel/` đóng gói trọn khả năng giải một môn:

1. **Schema plan riêng** (Zod) — hoặc `extend` schema có sẵn (như `AnalysisPlanSchema = RunPlanSchema.extend({...})`), hoặc **độc lập hoàn toàn** khi môn không chia entity với hình học (Hóa).
2. **Tầng compute riêng** — công thức tất định của môn, exact khi ở trong trường Rational+Surd, numeric + self-check khi không.
3. **Entrypoint `runX(raw: unknown)` riêng** — không bao giờ ném với plan hợp lệ schema; mọi hỏng hóc thành `violations`/`errors` có cấu trúc (bất biến thừa kế từ run()).
4. **Tầng scene riêng** — xuất mô tả cảnh JSON để frontend render (§6).
5. **Test riêng** trong `__tests__/` của pack — vitest tự nhặt nhờ pattern include `api/_lib/kernel/**/*.test.ts` (vitest.config.ts), không đụng cấu hình.

**Bất biến cứng (điều làm nên chữ "pack"):**

- KHÔNG sửa `run.ts`, `planSchema.ts`, `unifiedPlan.ts`, `compute/**`, `verify*.ts`, `execute.ts` — core hình học đóng băng với pack mới.
- Pack **được import** module core/pack khác như thư viện (chiều: pack → core). Core **không bao giờ** import pack (chiều ngược cấm — core không biết pack tồn tại).
- Mỗi pack tự chịu schema của mình; không nhét op môn mới vào `UnifiedOpSchema`.

**So sánh ba pack (analysis là pack "đời đầu" đã chứng minh pattern):**

| | `analysis/` (đã có) | `physics/` (mới) | `chem/` (mới) |
|---|---|---|---|
| Schema | `RunPlanSchema.extend` (dùng chung ops hình học) | Độc lập, có thể tham chiếu điểm mốc toạ độ | Độc lập hoàn toàn (không có entity hình học) |
| Quan hệ với `run()` | Gọi `run()` bên trong (thay tham số → chạy hình học số) | KHÔNG gọi `run()`; tái dùng `scalar.ts`, `analysis/solver1d.ts`, `analysis/recognize.ts` như thư viện | KHÔNG gọi `run()`; tái dùng `scalar.ts` (cân bằng trên hữu tỉ BigInt) |
| Entrypoint | `runAnalysis(raw)` | `runPhysics(raw)` | `runChem(raw)` |
| Scene | `entityTableToGeometryData` + agents/timeline (mover) | GeometryData + `agents`/`timeline`/`curves` (có sẵn) | GeometryData (points/lines rỗng) + `chemScene` (field mới, §6.3) |
| Chống ảo giác | asserts + self-certificate + hội tụ | asserts từ dữ kiện đề + đối chiếu closed-form vs sampling | asserts từ dữ kiện đề + DB phản ứng tự-kiểm + bảo toàn nguyên tố |

---

## 3. Quy hoạch thư mục & quy ước export

```
api/_lib/kernel/
  physics/                      # PACK VẬT LÝ — v0: động học lớp 10
    index.ts                    # export public: runPhysics, PhysicsPlanSchema, types — THÊM Ở P2 (bước người tích hợp; v0 chưa có — spec pack Lý §14.1)
    runPhysics.ts               # entrypoint (soi gương runAnalysis.ts)
    planSchema.ts               # PhysicsPlanSchema (Zod) — tên file theo spec pack Lý (chốt §14.1 spec pack)
    kinematics.ts               # mô hình chuyển động → Quad x(t),y(t) + đạo hàm (closed-form) + đổi đơn vị exact
    compute.ts                  # trả lời queries (range, max_height, meet, …) exact-khi-được
    scene.ts                    # motion → GeometryData {points, lines, curves, agents, timeline}
    __tests__/                  # golden tính tay + violation + scene format
  chem/                         # PACK HÓA — v0: vô cơ THPT
    index.ts                    # export public: runChem, ChemPlanSchema, ChemScene types
    runChem.ts                  # entrypoint
    schema.ts                   # ChemPlanSchema (Zod)
    formula.ts                  # parse công thức hoá học ("Al2(SO4)3" → {Al:2,S:3,O:12}) + khối lượng mol
    balance.ts                  # cân bằng = nullspace ma trận nguyên tố trên hữu tỉ (tái dùng scalar.ts)
    stoichiometry.ts            # mol/khối lượng/thể tích khí/chất dư-hết/nồng độ
    reactionDB.ts               # DB ~50 phản ứng vô cơ + hiện tượng CÓ CẤU TRÚC (§8.3)
    scene.ts                    # kết quả → ChemScene (vessels, precipitate, gasBubbles…)
    __tests__/                  # balance golden + DB integrity (tự-kiểm) + stoichiometry + violation
  taxonomy/                     # CÂY TRI THỨC dùng chung (§9)
    tags.ts                     # TAG_REGISTRY + isKnownTag + parseTag + seed 3 môn
    __tests__/
  analysis/                     # (đã có — không đổi)
  …core (đã có — không đổi)…
```

**Quy ước export (người tích hợp làm SAU, spec chỉ ghi quy ước):**

- Mỗi pack gom toàn bộ bề mặt public vào `<pack>/index.ts` của chính nó.
- Khi tích hợp (phase nối route), người tích hợp thêm **đúng một dòng** vào `api/_lib/kernel/index.ts`:
  ```ts
  export { runPhysics, PhysicsPlanSchema } from './physics';   // P2
  export { runChem, ChemPlanSchema } from './chem';            // P4
  export { TAG_REGISTRY, isKnownTag, parseTag } from './taxonomy/tags'; // khi bridge cần
  ```
- `scripts/build-kernel.mjs` bundle từ `kernel/index.ts` → `kernel-dist/index.mjs` (esbuild, ESM, node18) — **không cần sửa build script**; export đến đâu bundle đến đó. Trước khi tích hợp, pack vẫn test được đầy đủ qua vitest (import .ts trực tiếp), y như analysis đã từng.
- Route `.js` chỉ được import từ `kernel-dist/index.mjs` (như `solveWithKernel.js:4` đang làm) — không import `.ts` nguồn.

**Ghi chú tái dùng chéo (quyết định có chủ đích — chốt C2, F4):** physics import `analysis/solver1d.ts`, `analysis/recognize.ts` như thư viện toán (KHÔNG dùng `analysis/expr.ts` — F4 đã gạch khỏi danh sách), cộng thêm `compute/answer.ts` (certifyScalar — thuộc core, chiều pack→core hợp lệ sẵn). Import `analysis/*` là pack→pack, hơi lệch quy tắc "pack → core"; lý do chấp nhận ở v0: tách các file này ra `kernel/mathlib/` sẽ **sửa import của analysis** (vi phạm "chỉ cộng thêm"). Ghi TODO: tách mathlib khi có đợt refactor có chủ đích, kèm codemod import.

---

## 4. Định tuyến môn (subject routing)

### 4.1 Request contract

Theo precedent MERGE-BRIEF (thêm route MỚI `analyze-geometry-v2` thay vì sửa `analyze-geometry`), ta thêm **route mới** `api/analyze-problem.js`, mount tại `POST /api/analyze-problem` (thêm ~5 dòng vào `server.js` — cùng cỡ thay đổi mà MERGE-BRIEF §2 đã liệt kê là an toàn). Route v2 hiện tại **đóng băng, không đụng**.

```jsonc
// A) Dịch đề bằng LLM, subject tường minh:
{ "subject": "physics", "problem": "Một vật được ném xiên từ mặt đất với vận tốc đầu 20 m/s..." }

// B) Không có subject ⇒ auto-detect bằng classifier (§4.2):
{ "problem": "Cho 5,6 gam Fe tác dụng với dung dịch HCl dư..." }

// C) Dry-run plan thẳng, KHÔNG cần LLM (dev-only, NODE_ENV=production trả 404 — sao y nhánh {plan} của v2):
{ "subject": "physics", "plan": { /* PhysicsPlan JSON */ } }
```

`subject ∈ 'geometry' | 'physics' | 'chem'`. `subject: 'geometry'` (hoặc classifier trả geometry) ⇒ route ủy quyền **nguyên vẹn** cho `solveProblem`/`solvePlan` của `kernel-bridge/solveWithKernel.js` — cùng code path với v2, nên hành vi Toán trùng bit với hiện tại.

### 4.2 Classifier môn (khi thiếu `subject`)

Hai tầng, rẻ trước đắt sau:

1. **Prefilter từ khoá tất định** (0 token): hit các marker gần-như-chắc — `mol|gam.*dung dịch|phản ứng|kết tủa|dãy hoạt động` → chem; `gia tốc|m/s²|rơi tự do|ném ngang|ném xiên|chuyển động thẳng đều` → physics; `hình chóp|Oxyz|mặt phẳng|tứ diện` → geometry. Chỉ chốt khi **duy nhất một** môn hit.
2. **Classifier LLM rẻ** (mơ hồ hoặc 0/2+ môn hit): cùng hạ tầng Vilao với translator (`VILAO_TRANSLATOR_MODEL`, mặc định `ram/gemini-3.5-flash-low`), prompt few-shot trả đúng một token `geometry|physics|chem`, timeout ngắn; lỗi/timeout ⇒ mặc định `geometry` (luồng trưởng thành nhất).

**Ca ranh giới đã biết (bắt buộc có trong few-shot):** bài "máy bay & radar" (Câu 3 demo) *có chuyển động* nhưng hiện do **pack Toán** giải trọn bằng `mover` + optimize — classifier phải trả `geometry` cho lớp bài "hình không gian có vật chuyển động, hỏi khoảng cách/góc"; `physics` dành cho bài động học thuần (hỏi v, a, t, quãng đường, tầm xa theo công thức chuyển động).

**Chuỗi fallback:** translator của pack nào cũng có quyền `abstain` (sao cơ chế `{"abstain": true}` của translator Toán — `solveWithKernel.js:38`). Nếu pack được chọn abstain/schema-fail ⇒ route thử `geometry` một lần (nếu chưa thử) rồi mới trả Mức-3. Không bao giờ đoán bừa đáp số chỉ vì chọn nhầm môn.

### 4.3 Sơ đồ luồng

```
problem ──► [prefilter] ──► [classifier LLM] ──► subject
                                                  │
        ┌─────────────────────────────────────────┼──────────────────────────┐
        ▼                                         ▼                          ▼
  'geometry'                                 'physics'                    'chem'
  solveWithKernel.js                    solveWithPhysics.js          solveWithChem.js
  (KHÔNG ĐỔI — code path v2)            prompt Lý → PhysicsPlan      prompt Hóa → ChemPlan
  runAny() = run()/runAnalysis()        runPhysics()                 runChem()
        │                                         │                          │
        └────────────────► CONTRACT CHUNG { ok, answers, violations, errors, trace, scene } ◄──┘
```

---

## 5. Hợp đồng response chung

Mọi nhánh của `/api/analyze-problem` trả:

```jsonc
{
  "ok": true,                 // không violation & không error
  "subject": "physics",       // môn đã định tuyến (kể cả khi auto-detect)
  "answers": [                // MỖI đáp một entry — khuôn theo QueryAnswer của run()
    {
      "kind": "range",        // loại truy vấn của pack
      "text": "20√3 m",       // hiển thị; exact khi có, numeric + nhận-dạng khi không
      "approx": 34.6410,      // gương số — LUÔN có khi đáp là số
      "unit": "m",            // MỚI so với Toán: Lý/Hóa luôn mang đơn vị (m, m/s, s, gam, lít, mol)
      "approximate": false    // true ⇒ numeric/nhận dạng, không phải exact chứng minh được
    }
  ],
  "violations": [],           // dữ kiện đề mà mô hình không thoả (recompute-và-đối-chiếu) — KHÔNG bịa đáp
  "errors": [],               // plan hợp-lệ-schema nhưng không tính được (thay cho throw)
  "trace": ["..."],           // vết execute→verify→compute để narrate/debug
  "scene": { /* GeometryData mở rộng — §6 */ },
  "plan": { /* plan đã dịch (chỉ mode LLM) */ },
  "tier": { /* phân loại 3 mức an toàn — §5.1 */ }
}
```

Quy ước:

- **`scene` là GeometryData mở rộng** (§6) — Toán: chính là `geometry` mà `solvePlan` đang trả (route alias `scene = geometry`, đồng thời giữ nguyên field `geometry` trong nhánh geometry để consumer cũ nếu tái dùng không gãy). Lý: thêm `agents` + `timeline` + `curves`. Hóa: thêm `chemScene`.
- **`answers[].unit`**: field cộng thêm, tùy chọn — nhánh Toán không phát (giữ nguyên shape `QueryAnswer` + cơ chế `answerScale`/`answerUnit` của analysis, runAnalysis.ts:79-83). Engine Lý/Hóa **tự tính và tự ghi đơn vị** — LLM không được nhúng đơn vị vào số.
- **BigInt-safe**: mọi nhánh đi qua `jsonSafe` như `solveWithKernel.js:60-69` (đáp exact mang BigInt sẽ giết `res.json`).
- **`tier`**: nhánh Toán dùng `classifyTier` y nguyên. Lý/Hóa v0: mapping tối giản cùng ngữ nghĩa — level 1 ⟺ engine giải + answers hữu hạn + 0 violation; level 3 kèm `reason` (violation/error/abstain). Mở rộng `problemTypeOf` cho môn mới bằng bảng label riêng trong bridge của pack (không sửa `classifyTier.js`).

---

## 6. Tầng scene: "engine xuất mô tả cảnh JSON, frontend render"

Nguyên tắc bất di dịch: **mọi con số xuất hiện trên màn hình do engine tính** — toạ độ, hệ số quỹ đạo, mức dung dịch, màu kết tủa đều nằm trong scene JSON; frontend chỉ render, LLM không chạm.

### 6.1 Physics scene — tái dùng 100% hạ tầng có sẵn

`GeometryData` đã có đủ chỗ: `agents?: Agent3D[]`, `timeline?: AnimationTimeline`, `curves?: Curve3D[]` (src/types/geometry.ts:388-389, 245-258). `AnimatedAgent.tsx` đã render track `parametric_path`. **P1–P2 không cần sửa một dòng frontend nào.**

Chi tiết kỹ thuật BẮT BUỘC tuân thủ (đọc từ code renderer, src/components/3d/AnimatedAgent.tsx:61-105):

- Ưu tiên phát `params.equations: { x, y, z }` (object) thay vì chuỗi `params.path` — parser path split theo dấu `','` nên biểu thức chứa phẩy sẽ gãy; `equations` không qua bước split.
- Biểu thức được eval bằng `new Function('t', 'return ' + expr)` ⇒ phải là **JS thuần**: dùng `t*t`, KHÔNG dùng `t^2` (renderer chỉ replace chuỗi `'t^2'` **một lần duy nhất** — `String.replace` với string arg; `^` sót lại là XOR của JS, sai lặng lẽ). Engine emit sẵn `5*t*t`.
- `t` trong track là **GIÂY thật** trên `[start, end]` (bằng chứng: mover, Câu 3 demo). Physics dùng thời gian vật lý thật của bài ⇒ animation đúng nhịp tự nhiên.
- Trục **z của geo3d là trục đứng** (renderer map geo3d (x,y,z) → threejs (x,z,y)) ⇒ độ cao ném xiên nằm ở z.
- `params.landing_point: [x,y,z]` giữ agent đứng yên tại điểm rơi sau khi track kết thúc — physics nên phát để quả bóng không "đơ giữa trời".
- Quỹ đạo tĩnh (đường parabol mờ dưới animation): phát `curves: [{ type: 'expr', samples: [...] }]` — `Curve3D.samples` do engine tính sẵn, frontend vẽ Line không cần parser (src/types/geometry.ts:252).

Ví dụ scene ném xiên (rút gọn) — engine tính mọi hệ số:

```jsonc
{
  "name": "nem-xien",
  "points": [ { "id": "O", "label": "O", "x": 0, "y": 0, "z": 0 },
              { "id": "L", "label": "Điểm rơi", "x": 34.641, "y": 0, "z": 0, "highlight": true } ],
  "lines": [ { "id": "ground", "from": "O", "to": "L", "style": "dashed" } ],
  "curves": [ { "id": "traj", "type": "expr", "plane": "xz", "style": "dashed",
                "params": {}, "samples": [ { "x": 0, "y": 0 }, { "x": 1.732, "y": 1.5 }, /* …engine sample… */ ] } ],
  "agents": [ { "id": "ball", "label": "Quả bóng", "initialPosition": [0, 0, 0], "color": "#FFA500", "radius": 0.3 } ],
  "timeline": { "duration": 3.4641, "tracks": [ {
      "id": "throw", "start": 0, "end": 3.4641, "type": "parametric_path", "targetId": "ball",
      "params": { "equations": { "x": "10*t", "y": "0", "z": "17.3205*t - 5*t*t" },
                  "landing_point": [34.641, 0, 0] } } ] },
  "tags": ["ly/10/dong-hoc/nem-xien"]
}
```

### 6.2 Geometry scene — không đổi

Nhánh Toán tiếp tục dùng `entityTableToGeometryData` / `buildAnalysisFigure` như hiện tại. Spec này không thêm yêu cầu nào cho nó.

### 6.3 ChemScene — extension point (khung, chi tiết để spec pack Hóa)

Field mới **tùy chọn** trên GeometryData: `chemScene?: ChemScene` (thêm vào `src/types/geometry.ts` ở phase P4 — thêm optional field là thay đổi cộng thêm, không phá consumer nào). Scene Hóa vẫn LÀ một GeometryData hợp lệ: `{ name, points: [], lines: [], chemScene }` — canvas thấy `chemScene` thì render ChemSceneView thay vì cảnh 3D.

Khung v0 (đủ cho vô cơ THPT; mọi chuỗi màu/hiện tượng lấy từ DB phản ứng §8.3, không do LLM viết):

```ts
interface ChemScene {
  vessels: ChemVessel[];               // mỗi bình một cột cảnh
  caption?: string;                    // chú thích tổng ("Fe tan dần, sủi bọt khí không màu")
}
interface ChemVessel {
  id: string;
  kind: 'test_tube' | 'beaker' | 'flask' | 'gas_jar';
  label?: string;                      // "Ống nghiệm 1"
  contents: Array<{                    // các lớp trong bình, vẽ từ dưới lên
    species: string;                   // "CuSO4"
    state: 'dung_dich' | 'ran' | 'long';
    color: string;                     // hex — tra từ DB màu chất (vd Cu²⁺ "#4FA3D1")
    levelPct: number;                  // 0–100, mức chiếm bình
  }>;
  precipitate?: { species: string; color: string; amountHint?: 'it' | 'nhieu' } | null;  // kết tủa lắng đáy
  gasBubbles?: { species: string; color: string; rate: 'cham' | 'vua' | 'manh' } | null; // bọt khí bay lên
  labels: string[];                    // dòng hiện tượng gắn cạnh bình (từ DB, đã kiểm)
}
```

Chi tiết render (2D overlay hay mesh 3D trong r3f, animation sủi bọt…) do **spec riêng của pack Hóa** chốt ở P4 — spec này chỉ đóng băng *hình dạng JSON* để engine P3 build sẵn scene mà không đợi frontend. (Spec pack Hóa chi tiết đang soạn song song: `docs/superpowers/specs/2026-08-21-chem-pack-design.md` — khi hai spec lệch nhau về khung ChemScene, phiên phản biện chốt một bản.)

---

## 7. Pack Vật lý v0 — động học lớp 10 (phác thảo để P1 cắt plan)

### 7.1 Phạm vi v0

Chuyển động **chất điểm, gia tốc không đổi, closed-form**: thẳng đều · thẳng biến đổi đều · rơi tự do · ném ngang · ném xiên; **1–2 vật** (gặp nhau/đuổi kịp). Ngoài phạm vi: lực/động lực học, đồ thị cho-hình (đọc đồ thị từ ảnh), chuyển động tròn, va chạm.

### 7.2 PhysicsPlanSchema (Zod, độc lập)

```jsonc
{
  "name": "nem-xien-20ms-60do",
  "g": 10,                              // LLM CHÉP từ đề ("lấy g = 10 m/s²"); default 10 khi đề im lặng
  "bodies": [
    { "id": "ball", "label": "Quả bóng",
      "motion": { "kind": "projectile", "from": [0, 0, 0], "speed": 20, "angleDeg": 60 } }
    // các kind khác: "uniform" {from, velocity:[vx,vy,vz]}, "uniform_accel" {from, v0, a, dir},
    //                "free_fall" {from(z=h)}, "horizontal_throw" {from, speed}
  ],
  "asserts": [                          // dữ kiện THỪA đề cho — engine tính lại, lệch ⇒ violation
    { "kind": "flight_time", "body": "ball", "equals": 3.46, "tol": 0.01 }
  ],
  "queries": [
    { "kind": "max_height", "body": "ball" },
    { "kind": "range", "body": "ball" },
    { "kind": "state_at", "body": "ball", "t": 1, "what": "speed" }
  ],
  "knowledgeTags": ["ly/10/dong-hoc/nem-xien"]
}
```

Queries v0: `state_at` (vị trí/vận tốc/tốc độ tại t) · `flight_time` · `range` (tầm xa) · `max_height` · `time_when` (khi nào cao độ/quãng đường/khoảng cách đạt giá trị) · `meet` (2 vật gặp nhau: thời điểm + vị trí) · `distance_between_at` (khoảng cách 2 vật tại t).

### 7.3 Compute: exact-khi-được, numeric + tự kiểm khi không

- Mỗi body hạ thành bộ hàm `x(t), y(t), z(t)` đa thức bậc ≤ 2 theo t (motion.ts).
- Công thức đáp closed-form chạy trên `Scalar` (scalar.ts): góc đẹp (30/45/60/90…) cho sin/cos dạng Surd ⇒ `range = v²·sin2θ/g = 20√3` **exact**; góc lẻ ⇒ float + `recognizeConstant` (analysis/recognize.ts), gắn `approximate: true`.
- `time_when`/`meet` = nghiệm đa thức bậc ≤ 2 ⇒ `solvePoly` (analysis/solver1d.ts) trả nghiệm exact; loại nghiệm ngoài miền t ≥ 0.
- **Self-certificate** (soi gương §4.4 spec unified-engine): mọi đáp closed-form đối chiếu với đánh giá số độc lập trên bộ hàm motion (thay t*, sample lân cận cho max); lệch quá ngưỡng ⇒ đẩy `errors`, không trả đáp sai.
- Kiểm tra tay cho bộ golden: v₀=20, θ=60°, g=10 ⇒ H = v₀²sin²θ/2g = **15 m** (exact), L = **20√3 ≈ 34,641 m**, T = **2√3 ≈ 3,4641 s**; rơi tự do h=45, g=10 ⇒ t = 3 s, v chạm đất = 30 m/s; xe A (x=0, v=10) đuổi xe B (x=120, v=−20) ⇒ gặp tại t = 4 s, x = 40 m.

### 7.4 Chống ảo giác riêng của Lý

- LLM **không được tự tính** thành phần vận tốc/toạ độ trung gian — chỉ khai `speed + angleDeg`; engine phân tích vx = v·cosθ, vz = v·sinθ.
- `g` phải chép từ đề; đề dùng 9,8 mà LLM khai 10 ⇒ asserts từ dữ kiện thừa của đề sẽ bắt lệch.
- Prompt Lý có cổng abstain: thiếu số liệu, chuyển động ngoài danh mục v0 (cong, tròn, có lực cản) ⇒ `{"abstain": true}` ⇒ fallback §4.2.

---

## 8. Pack Hóa v0 — vô cơ THPT (phác thảo để P3 cắt plan)

### 8.1 ChemPlanSchema (Zod, độc lập)

```jsonc
{
  "name": "fe-tac-dung-hcl",
  "reaction": { "reactants": ["Fe", "HCl"], "products": ["FeCl2", "H2"] },
  //           HOẶC { "dbId": "fe-hcl" } — tham chiếu thẳng DB §8.3
  "given": [ { "species": "Fe", "gram": 5.6 } ],          // mol | gram | litGas | solution {CM, litres}
  "conditions": { "molarVolume": 24.79 },                  // đkc GDPT-2018 (25°C, 1 bar); đề cũ "đktc" ⇒ 22.4 — LLM CHÉP từ đề
  "asserts": [ { "kind": "amount", "species": "H2", "litGas": 2.479, "tol": 0.01 } ],
  "queries": [
    { "kind": "balance" },                                 // hệ số cân bằng
    { "kind": "amount", "species": "H2", "unit": "lit" },  // 2,479 lít
    { "kind": "amount", "species": "FeCl2", "unit": "gam" },
    { "kind": "phenomena" }                                // hiện tượng — TRA DB, không sinh
  ],
  "knowledgeTags": ["hoa/9-10/kim-loai/tac-dung-axit", "hoa/8-9/tinh-toan/tinh-theo-phuong-trinh"]
}
```

### 8.2 Compute tất định

- **formula.ts**: parse "Al2(SO4)3" → vector nguyên tố {Al:2, S:3, O:12}; bảng khối lượng mol nguyên tử (hằng số trong code, theo SGK: Fe 56, Cl 35,5, …).
- **balance.ts**: ma trận nguyên tố × chất, tìm nullspace trên hữu tỉ (tái dùng Rational BigInt của scalar.ts), quy về hệ số nguyên tối giản, **tự kiểm** bằng đếm lại nguyên tố hai vế. Ví dụ golden: `Fe + 2HCl → FeCl2 + H2`; `2Al + 3H2SO4 → Al2(SO4)3 + 3H2`; `2KMnO4 →(t°) K2MnO4 + MnO2 + O2`.
- **stoichiometry.ts**: given → mol (m/M, V/molarVolume, CM·V); tìm **chất hết/chất dư** (min mol/hệ số); tính mọi species theo chất hết; đổi ngược ra đơn vị hỏi. Golden tay: Fe 5,6 g = 0,1 mol ⇒ H₂ 0,1 mol ⇒ **2,479 lít** (đkc 24,79) / 2,24 lít (đktc 22,4); FeCl₂ 0,1 mol = **12,7 g**.
- **Asserts**: đề cho "thu được V lít khí"/"m gam kết tủa" ⇒ engine tính lại đối chiếu; lệch ⇒ violation "mô hình sai đề", không trả bừa.

### 8.3 Reaction DB — mỏ neo chống ảo giác (~50 phản ứng vô cơ)

```ts
interface ReactionEntry {
  id: string;                                    // 'fe-hcl'
  equation: { reactants: Array<{ formula: string; coeff: number }>;
              products:  Array<{ formula: string; coeff: number }> };  // hệ số ĐÃ cân bằng
  conditions?: string;                           // 'đun nóng', 'điện phân nóng chảy', 'xúc tác'
  types: Array<'the' | 'trao_doi' | 'hoa_hop' | 'phan_huy' | 'oxi_hoa_khu' | 'trung_hoa'>;
  phenomena: {
    text: string;                                // câu SGK: "Sắt tan dần, có bọt khí không màu thoát ra"
    effects: ChemEffect[];                       // BẢN CÓ CẤU TRÚC — scene.ts tiêu thụ
  };
  tags: string[];                                // taxonomy §9
}
type ChemEffect =
  | { kind: 'gas';         species: string; color: string; note?: string }         // sủi bọt
  | { kind: 'precipitate'; species: string; color: string }                        // kết tủa (BaSO4 trắng…)
  | { kind: 'dissolve';    species: string }                                       // chất rắn tan dần
  | { kind: 'color_change'; from: string; to: string; note?: string }              // dd không màu → xanh lam
  | { kind: 'heat';        change: 'toa_nhiet' | 'thu_nhiet' };
```

Nội dung v0: kim loại + axit (HCl/H₂SO₄ loãng), kim loại + muối (dãy hoạt động), axit + bazơ/muối (trao đổi, kết tủa BaSO₄/AgCl/…), oxit + axit/bazơ, nhiệt phân (KMnO₄, CaCO₃, KClO₃), điều chế khí thông dụng (H₂, O₂, CO₂, Cl₂), CO₂ + nước vôi.

**Hai luật vàng:**
1. **DB tự-kiểm bằng chính engine:** test integrity chạy `balance()` trên equation của TỪNG entry — DB không bao giờ lệch với bộ cân bằng (soi gương "Lớp B" của `problemTypeCatalog.ts`: dữ liệu hiển thị phải được engine thật chứng thực).
2. **Hiện tượng chỉ được TRA, không được SINH:** query `phenomena` match phản ứng của plan với DB (theo tập chất, sau chuẩn hoá); không match ⇒ trả "chưa có trong DB hiện tượng" (Mức-3 cho ý đó), tuyệt đối không để LLM điền.

---

## 9. Cây tri thức (taxonomy) dùng chung

### 9.1 Schema tag

Chuỗi 4 tầng phân cách `/`: **`subject/grade/chapter/skill`** — chữ thường, không dấu, `-` nối từ.

```
toan/12/khoi-tron-xoay/the-tich
ly/10/dong-hoc/nem-xien
hoa/9-10/kim-loai/day-hoat-dong
```

`grade` cho phép dải (`9-10`, `8-9`) vì nội dung THCS-THPT gối nhau. Registry tại `api/_lib/kernel/taxonomy/tags.ts`:

```ts
export const TAG_REGISTRY: Record<string, { label: string }> = { /* seed §9.3 */ };
export function isKnownTag(t: string): boolean;
export function parseTag(t: string): { subject: string; grade: string; chapter: string; skill: string } | null;
```

### 9.2 Chỗ gắn (ba điểm, đều đã có đường sẵn)

1. **Plan kết quả:** mọi translator prompt (Toán/Lý/Hóa) dạy LLM phát `knowledgeTags: string[]`. Schema Zod không khai field này ⇒ `safeParse` strip ⇒ bridge **gắn lại từ json gốc sau khi lọc `isKnownTag`** — đúng precedent `scaleSymbol` (solveWithKernel.js:47-53). Tag lạ bị drop lặng + ghi trace, không bao giờ fail bài vì tag.
2. **Scene/hình:** bridge merge `knowledgeTags` đã lọc vào `scene.tags` — `GeometryData.tags?: string[]` **có sẵn** (src/types/geometry.ts:390) và đang chung sống với tag tự do kiểu `'2D'` (GeometryCanvas.tsx:477 chỉ `includes('2D')` ⇒ tag mới vô hại). Hình lưu nguyên JSON vào `saved_geometries.geometry_data` + localStorage history ⇒ **taxonomy tự persist, zero migration**.
3. **Lịch sử làm bài:** luồng solve đã truyền `tags` (useSolver.ts:45, SolverPanel.tsx:967) ⇒ dữ liệu tag × kết quả (ok/violations/tier) tích lũy sẵn trong lịch sử.

**Mục đích tương lai (ngoài phạm vi spec):** job phân tích lịch sử theo tag → **bản đồ lỗ hổng kiến thức** ("em sai 70% bài `ly/10/dong-hoc/nem-xien`"). Spec này chỉ bảo đảm dữ liệu được gắn đúng chỗ từ bây giờ.

### 9.3 Seed registry (danh sách khởi điểm — chốt nội dung ở P0)

**Toán — hình KG + giải tích** (map từ 15 nhãn máy của `problemTypeCatalog.ts` + các lớp analysis đã có: revolution/sliceStacks/areaRegions/sectionCuts):

| Tag | Nhãn | Nguồn nhãn máy |
|---|---|---|
| `toan/11/quan-he-vuong-goc/khoang-cach` | Khoảng cách (điểm–mặt, hai đường chéo nhau) | Khoảng cách |
| `toan/11/quan-he-vuong-goc/goc` | Góc (đường–đường, đường–mặt, nhị diện) | Góc |
| `toan/11/the-tich/khoi-chop-lang-tru` | Thể tích khối chóp/lăng trụ/tứ diện | Thể tích |
| `toan/11/the-tich/ti-so-the-tich` | Tỉ số thể tích | Tỉ số thể tích |
| `toan/11/hinh-khong-gian/thiet-dien` | Thiết diện | (sectionCuts) |
| `toan/12/oxyz/toa-do-diem` | Toạ độ điểm đặc biệt | Toạ độ điểm |
| `toan/12/oxyz/phuong-trinh` | PT mặt phẳng/đường/mặt cầu | Phương trình |
| `toan/12/oxyz/vi-tri-tuong-doi` | Vị trí tương đối | Vị trí tương đối |
| `toan/12/oxyz/giao` | Giao điểm/giao tuyến | Giao |
| `toan/12/khoi-tron-xoay/the-tich` | Thể tích nón/trụ/cầu, vật tròn xoay | (vessel/revolution) |
| `toan/12/khoi-tron-xoay/mat-cau` | Mặt cầu ngoại tiếp/metric | Mặt cầu |
| `toan/12/ung-dung-dao-ham/cuc-tri` | Cực trị – tối ưu (1 & nhiều biến) | Cực trị |
| `toan/12/ung-dung-dao-ham/giai-phuong-trinh` | Giải PT ràng buộc (tiếp tuyến, tham số) | Giải phương trình |
| `toan/12/tich-phan/dien-tich-hinh-phang` | Diện tích hình phẳng | (areaRegions) |
| `toan/12/tich-phan/the-tich-tron-xoay` | Thể tích tròn xoay, thiết diện biết | Tích phân |
| `toan/10/hinh-hoc/dien-tich-tam-giac-da-giac` | Diện tích tam giác/đa giác | Diện tích |

**Lý — động học 10:** `ly/10/dong-hoc/` + {`chuyen-dong-thang-deu`, `bien-doi-deu`, `roi-tu-do`, `nem-ngang`, `nem-xien`, `gap-nhau-duoi-kip`, `do-thi-chuyen-dong`, `van-toc-tuong-doi`}.

**Hóa — vô cơ:** `hoa/9-10/kim-loai/{day-hoat-dong, tac-dung-axit, tac-dung-muoi}` · `hoa/9-10/axit-bazo-muoi/{phan-ung-trao-doi, nhan-biet}` · `hoa/9-10/oxit/oxit-axit-oxit-bazo` · `hoa/9-10/dieu-che/dieu-che-khi` · `hoa/8-9/tinh-toan/{tinh-theo-phuong-trinh, nong-do-dung-dich, chat-du-chat-het}` · `hoa/10/phan-ung/oxi-hoa-khu`.

Ghi chú versioning: `grade` đặt theo **lớp thường gặp trong đề luyện thi** (khối tròn xoay để 12 dù GDPT-2018 đã kéo nón/trụ/cầu xuống lớp 9). Nếu sau này cần map theo bộ sách, thêm alias trong registry — không đổi format tag.

---

## 10. Nguyên tắc an toàn & không-hồi-quy (điều kiện tiên quyết của mọi phase)

| Cam kết | Cơ chế bảo đảm |
|---|---|
| Luồng Toán không đổi hành vi | Nhánh geometry của route mới ủy quyền nguyên code path v2; route v2 + `solveWithKernel.js` không sửa |
| Không đụng core | Diff của P1/P3 nằm trọn trong `kernel/physics/**`, `kernel/chem/**`, `kernel/taxonomy/**` (file MỚI 100%) |
| `src/**` không đổi cho tới P4 | P4 chỉ: thêm optional field `chemScene` + component mới + UI chọn môn (cộng thêm) |
| Baseline test bất khả xâm phạm | `npx vitest run`: **1072 test cũ xanh nguyên vẹn** ở mọi phase; test mới cộng dồn |
| Type sạch | `npx tsc --noEmit -p tsconfig.json` sạch (nghi thức MERGE-BRIEF §4) |
| Deploy an toàn | `npm run build` (đã gồm `build:kernel`) xanh; kernel-dist rebuild + commit mỗi khi kernel .ts đổi |
| Không bịa đáp | Mọi pack thừa kế bất biến: plan hợp-lệ-schema không bao giờ throw; sai mô hình ⇒ `violations`; ngoài năng lực ⇒ abstain |

---

## 11. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Classifier chọn nhầm môn (nhất là physics vs Toán-kinematic) | Prefilter chỉ chốt khi 1 môn hit; few-shot có ca ranh giới (Câu 3 radar → geometry); fallback abstain → geometry; log subject vào trace để đo |
| LLM Lý tự tính vx/vz (ảo giác quen tay) | Schema chỉ nhận `speed + angleDeg`; prompt cấm tường minh (sao R1 của kinematic spec); asserts dữ-kiện-thừa bắt lệch |
| `t^2`/dấu phẩy làm gãy animation | Engine chỉ phát `equations` object + `t*t`; test format so khớp chuỗi; kiểm browser ở phase nối route (sao KIN-T3) |
| DB Hóa sai hệ số/hiện tượng | Test integrity: balance() từng entry + schema effects; hiện tượng chỉ TRA không SINH |
| molarVolume lệch chương trình (22,4 vs 24,79) | Field bắt buộc LLM chép từ đề; default 24,79; asserts từ số liệu đề bắt lệch nếu chép sai |
| Đơn vị sai/lẫn (m vs km/h) | Engine quy đổi về SI ngay ở schema-parse (vd `velocityKmh` → m/s), answers mang `unit` do engine ghi |
| Route mới phình bề mặt bảo trì | Route chỉ là dispatcher mỏng; toàn bộ logic trong bridge/pack đã test; dry-run cho phép test route không cần LLM |
| Cross-pack import (physics → analysis) thành nợ | Chỉ 3 module thuần (`solver1d`, `recognize`, `expr`); TODO tách `mathlib/` ghi ngay trong code |

---

## 12. Tiêu chí thành công của kiến trúc (định nghĩa "xong" cho toàn spec)

1. Một đề Lý động học chạy end-to-end: dịch → `runPhysics` → đáp exact/numeric có `unit` + scene có `agents`/`timeline` animate được trên canvas hiện có, **không sửa frontend**.
2. Một đề Hóa vô cơ chạy end-to-end: dịch → `runChem` → cân bằng + mol/khối lượng/thể tích đúng golden tay + hiện tượng tra DB + `chemScene` render được.
3. Đề mô hình sai (assert lệch dữ kiện) ⇒ violation, không trả đáp — cả ba môn.
4. `subject` sai/mơ hồ không bao giờ tạo đáp bừa: abstain + fallback chain hoạt động.
5. Tag taxonomy xuất hiện trong `scene.tags` của cả ba môn và persist qua lịch sử/saved geometries mà không migration.
6. Baseline 1072 test + tsc + `npm run build` xanh ở mọi thời điểm merge.

---

## 13. Cấu trúc file dự kiến (tổng, để writing-plans cắt từng phase)

```
api/_lib/kernel/physics/{index,runPhysics,schema,motion,compute,scene}.ts + __tests__/    (P1)
api/_lib/kernel/chem/{index,runChem,schema,formula,balance,stoichiometry,reactionDB,scene}.ts + __tests__/  (P3)
api/_lib/kernel/taxonomy/tags.ts + __tests__/                                             (P0)
api/_lib/kernel-bridge/{physicsTranslatorPrompt,solveWithPhysics,subjectClassifier}.js    (P2)
api/_lib/kernel-bridge/{chemTranslatorPrompt,solveWithChem}.js                            (P4)
api/analyze-problem.js  (route mới)                                                       (P2, mở rộng P4)
server.js               (CHỈ thêm mount /api/analyze-problem)                             (P2)
api/_lib/kernel/index.ts (CHỈ thêm dòng export pack — bước "người tích hợp")              (P2, P4)
src/types/geometry.ts   (CHỈ thêm chemScene?: ChemScene)                                  (P4)
src/components/chem/ChemSceneView.tsx + UI chọn môn (React + react-router, theo AGENTS.md)(P4)
```
