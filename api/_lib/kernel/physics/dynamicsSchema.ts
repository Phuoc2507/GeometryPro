// api/_lib/kernel/physics/dynamicsSchema.ts
// DynamicsPlanSchema (zod) — chép nguyên spec §6 (physics-pack v1 dynamics, đã áp phán quyết đợt 2).
// TRIẾT LÝ MERGE-BRIEF: LLM chỉ DỊCH đề → khai vật/mặt tựa/hệ số ma sát/các lực ĐỀ CHO; KHÔNG có
// field nào nhận hợp lực/thành phần lực/μN/mg·sinθ đã tính hộ (R1). Trọng lực, phản lực, ma sát,
// lực căng do ENGINE tự sinh. Sai mô hình → violations/errors ở tầng giải, KHÔNG bịa đáp.
import { z } from 'zod';

const Num = z.number().finite();
const Obj = z.string().min(1);

// ── Ops (§6.1) ────────────────────────────────────────────────────────────────
const BodyOp = z.object({
  op: z.literal('body'),
  name: Obj,
  // OPTIONAL: bài nghiêng thuần-gia-tốc đề KHÔNG cho m (a = g(sinθ − μcosθ) không cần m) — cấm LLM bịa.
  // Query/cấu hình cần m mà thiếu ⇒ error rõ "cần khối lượng của <name>" (tầng giải).
  mass: Num.positive().optional(),
  massUnit: z.enum(['kg', 'g', 'tan']).default('kg'),
  on: z.enum(['horizontal', 'incline', 'hanging']).default('horizontal'),
  inclineDeg: Num.optional(), // BẮT BUỘC khi on='incline' (superRefine), 0 < θ < 90
  mu: Num.min(0).optional(), // hệ số ma sát trượt; bỏ trống = nhẵn. Lớp 10: cũng là ma sát nghỉ cực đại.
  motion: z.enum(['down', 'up']).optional(), // CHỈ incline: chiều chuyển động THEO ĐỀ; mặc định 'down'
  v0: Num.min(0).default(0), // TỐC ĐỘ đầu dọc chiều chuyển động (≥ 0; chiều nằm ở motion/lực kéo)
  v0Unit: z.enum(['m/s', 'km/h']).default('m/s'),
});

const ForceOp = z.object({
  op: z.literal('force'),
  on: Obj, // CHỈ lực NGOÀI đề cho. Trọng lực/phản lực/ma sát/căng: engine tự sinh.
  value: Num.positive(),
  unit: z.enum(['N', 'kN']).default('N'),
  // so với PHƯƠNG MẶT TỰA (phương chuyển động); dương = chếch lên, âm = chếch xuống; |α| < 90.
  // V1: chỉ ≠ 0 khi mặt ngang (superRefine).
  angleDeg: Num.default(0),
  direction: z.enum(['forward', 'backward']).default('forward'), // "lực kéo"/"lực cản" — chép lời đề
});

// KHÔNG có op 'pulley': ròng rọc cố định SUY ra khi 2 vật của string nằm trên 2 phương khác nhau
// (bàn + treo). Dây không giãn ⇒ |a| chung; dây + ròng rọc không khối lượng ⇒ T hai đầu bằng nhau.
const StringOp = z.object({ op: z.literal('string'), between: z.tuple([Obj, Obj]) });

export const DynamicsOpSchema = z.discriminatedUnion('op', [BodyOp, ForceOp, StringOp]);

// ── Queries (§6.2) ────────────────────────────────────────────────────────────
const VUnit = z.enum(['m/s', 'km/h']).default('m/s');

export const DynamicsQuerySchema = z.discriminatedUnion('kind', [
  // — Động lực học —
  // ĐẠI SỐ theo chiều dương (= chiều chuyển động): hệ ròng rọc luôn ra dương; vật hãm ra ÂM (B04).
  // 'of' bỏ trống = gia tốc hệ (2 vật chung |a|); có 'of' phải là body tồn tại.
  z.object({ kind: z.literal('acceleration'), of: Obj.optional(), label: z.string().optional() }),
  // Trả ĐỘ LỚN (≥0): tension = lực căng dây; friction = μN; weight = mg; net = m·|a| (hợp lực).
  z.object({
    kind: z.literal('force_value'),
    force: z.enum(['tension', 'friction', 'weight', 'net']),
    on: Obj,
    label: z.string().optional(),
  }),
  z.object({ kind: z.literal('normal_force'), on: Obj, label: z.string().optional() }), // N (độ lớn)
  // F_min để vật BẮT ĐẦU trượt trên mặt ngang (μ nghỉ = mu). KHÔNG khai op force (giá trị là ẩn số).
  // DY-1 (§17.3): v1 CHỈ nhận α = 0 — SCHEMA CHẶN bằng z.literal(0); α ≠ 0 fail parse với lỗi tiếng Việt.
  z.object({
    kind: z.literal('min_force_to_move'),
    on: Obj,
    angleDeg: z
      .literal(0, { errorMap: () => ({ message: 'min_force_to_move v1 chỉ nhận angleDeg = 0 (α ≠ 0 để v2)' }) })
      .default(0),
    label: z.string().optional(),
  }),

  // — Kế thừa động học v0 (chạy trên gia tốc engine vừa tính; §8) —
  z.object({ kind: z.literal('velocity_at'), of: Obj, t: Num.positive(), label: z.string().optional() }),
  // x0 = 0 và chuyển động không đổi chiều trong miền hợp lệ ⇒ position = QUÃNG ĐƯỜNG.
  z.object({ kind: z.literal('position_at'), of: Obj, t: Num.positive(), label: z.string().optional() }),
  z.object({ kind: z.literal('time_when'), of: Obj, position: Num.positive(), label: z.string().optional() }),
  // F3: đạt tốc độ cho trước; value: 0 = lúc dừng. DY-3 — chính tả field THEO V0 (`value`/`vUnit`).
  z.object({
    kind: z.literal('time_when_velocity'),
    of: Obj,
    value: Num.min(0),
    vUnit: VUnit,
    label: z.string().optional(),
  }),
  // v = √(v0² + 2as) — "vận tốc ở chân dốc" (LLM không chain được).
  z.object({ kind: z.literal('velocity_after_distance'), of: Obj, distance: Num.positive(), label: z.string().optional() }),
  // s = v0²/(2|a|)
  z.object({ kind: z.literal('distance_to_stop'), of: Obj, label: z.string().optional() }),
]);

export const DynamicsPlanSchema = z
  .object({
    problemName: z.string().min(1),
    // KHÔNG default (chống hard-code, như v0). Optional vì bài "ngang nhẵn thuần lực" (B01, B10) không cần g.
    // Mô hình cần trọng lực (mu / incline / hanging / query N, weight, min_force) mà thiếu g ⇒ error rõ.
    g: Num.positive().optional(),
    ops: z.array(DynamicsOpSchema).min(1),
    queries: z.array(DynamicsQuerySchema).min(1),
    asserts: z
      .array(z.object({ query: DynamicsQuerySchema, equals: Num, tol: Num.positive().optional() }))
      .default([]), // dữ kiện DƯ của đề, như v0 §7.2
    charts: z.array(z.object({ kind: z.enum(['x_t', 'v_t']), of: z.array(Obj).min(1) })).default([]),
    scene: z
      .object({ durationSec: Num.positive().optional(), labels: z.record(z.string(), z.string()).optional() })
      .default({}),
  })
  .superRefine((plan, ctx) => {
    const bodies = plan.ops.filter((o): o is z.infer<typeof BodyOp> => o.op === 'body');
    const forces = plan.ops.filter((o): o is z.infer<typeof ForceOp> => o.op === 'force');
    const strings = plan.ops.filter((o): o is z.infer<typeof StringOp> => o.op === 'string');
    const byName = new Map(bodies.map((b) => [b.name, b]));
    const issue = (message: string): void => ctx.addIssue({ code: z.ZodIssueCode.custom, message });

    // Tên body duy nhất.
    const seen = new Set<string>();
    for (const b of bodies) {
      if (seen.has(b.name)) issue(`vật "${b.name}" khai báo 2 lần`);
      seen.add(b.name);
    }

    // (1) incline phải có inclineDeg ∈ (0,90); motion chỉ hợp lệ với incline.
    for (const b of bodies) {
      if (b.on === 'incline') {
        if (b.inclineDeg === undefined) issue(`vật "${b.name}" trên mặt nghiêng thiếu inclineDeg`);
        else if (!(b.inclineDeg > 0 && b.inclineDeg < 90)) issue(`inclineDeg của "${b.name}" phải trong khoảng (0, 90), nhận ${b.inclineDeg}`);
      } else if (b.inclineDeg !== undefined) {
        issue(`inclineDeg chỉ hợp lệ với on='incline' (vật "${b.name}")`);
      }
      if (b.motion !== undefined && b.on !== 'incline') issue(`motion chỉ hợp lệ với on='incline' (vật "${b.name}")`);
      // (7) mu chỉ với horizontal/incline.
      if (b.mu !== undefined && b.on === 'hanging') issue(`vật treo "${b.name}" không được khai mu (không có mặt tựa)`);
    }

    // (2) tối đa 2 body; 2 body ⇔ đúng 1 string nối 2 body tồn tại, khác nhau.
    if (bodies.length < 1) issue('cần ít nhất 1 vật (op body)');
    if (bodies.length > 2) issue(`v1 chỉ hỗ trợ tối đa 2 vật, nhận ${bodies.length}`);
    if (bodies.length === 2 && strings.length !== 1) issue(`hệ 2 vật cần đúng 1 dây (string), nhận ${strings.length}`);
    if (bodies.length === 1 && strings.length > 0) issue('hệ 1 vật không được khai string');
    for (const s of strings) {
      const [a, b] = s.between;
      if (a === b) issue(`dây nối hai đầu trùng "${a}"`);
      if (!byName.has(a)) issue(`dây trỏ tới vật "${a}" không tồn tại`);
      if (!byName.has(b)) issue(`dây trỏ tới vật "${b}" không tồn tại`);
    }

    // (3) hệ 2 vật: chỉ {hanging, hanging} hoặc {horizontal, hanging}; khác ⇒ "cấu hình chưa hỗ trợ v1".
    if (bodies.length === 2 && strings.length === 1) {
      const ons = bodies.map((b) => b.on).sort().join('+');
      // sort đưa về: 'hanging+hanging' | 'hanging+horizontal' | 'horizontal+horizontal' | 'hanging+incline' | 'incline+incline' …
      if (ons !== 'hanging+hanging' && ons !== 'hanging+horizontal') {
        issue(`cấu hình hệ 2 vật "${bodies.map((b) => b.on).join(' + ')}" chưa hỗ trợ v1 (chỉ Atwood treo+treo hoặc bàn ngang+treo)`);
      }
      // (6) hệ 2 vật v1: v0 = 0 cả hai (bài VN hệ ròng rọc xuất phát từ nghỉ — §17.10).
      for (const b of bodies) if (b.v0 !== 0) issue(`hệ 2 vật v1 phải xuất phát từ nghỉ (vật "${b.name}" khai v0 = ${b.v0})`);
    }

    // (4) hanging body phải nằm trong string (không hệ treo đơn); không mu/incline/motion.
    const inString = new Set<string>();
    for (const s of strings) { inString.add(s.between[0]); inString.add(s.between[1]); }
    for (const b of bodies) {
      if (b.on === 'hanging' && !inString.has(b.name)) issue(`vật treo "${b.name}" phải nằm trong một dây (v1 không có hệ treo đơn / thang máy)`);
    }

    // (5) force.on trỏ body tồn tại; force trên incline bắt buộc angleDeg=0; |angleDeg| < 90.
    for (const f of forces) {
      const b = byName.get(f.on);
      if (!b) { issue(`lực tác dụng lên vật "${f.on}" không tồn tại`); continue; }
      if (Math.abs(f.angleDeg) >= 90) issue(`góc lực |α| phải < 90 (vật "${f.on}", nhận ${f.angleDeg})`);
      if (b.on === 'incline' && f.angleDeg !== 0) issue(`lực trên mặt nghiêng chỉ được dọc mặt dốc (angleDeg = 0), vật "${f.on}"`);
      if (b.on === 'hanging') issue(`v1 không nhận lực ngoài trên vật treo "${f.on}"`);
    }

    // Mọi 'of'/'on' trong queries phải trỏ body tồn tại (trừ acceleration.of bỏ trống = hệ).
    const refBody = (name: string | undefined, where: string): void => {
      if (name !== undefined && !byName.has(name)) issue(`${where} trỏ tới vật "${name}" không tồn tại`);
    };
    for (const q of plan.queries) {
      if (q.kind === 'acceleration') refBody(q.of, `query ${q.kind}`);
      else if ('on' in q) refBody(q.on, `query ${q.kind}`);
      else if ('of' in q) refBody(q.of, `query ${q.kind}`);
    }
  });

export type DynamicsPlan = z.infer<typeof DynamicsPlanSchema>;
export type DynamicsQuery = z.infer<typeof DynamicsQuerySchema>;
export type DynamicsBodyOp = z.infer<typeof BodyOp>;
export type DynamicsForceOp = z.infer<typeof ForceOp>;
