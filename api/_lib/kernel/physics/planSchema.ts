// api/_lib/kernel/physics/planSchema.ts
// PhysicsPlanSchema (zod) — chép nguyên spec §5 (đã áp F2/F3 phản biện phiên 1).
// LLM chỉ DỊCH đề → plan JSON; mọi con số chép thẳng từ đề, đơn vị lệch hệ nền
// khai per-quantity (v0Unit/xUnit/tUnit/vUnit) để ENGINE đổi hữu tỉ EXACT.
import { z } from 'zod';
const Num = z.number().finite();
const Obj = z.string().min(1);

// F2/D1 (phản biện phiên 1): UNIT PER-QUANTITY — LLM chỉ CHÉP số + unit từ đề; ENGINE đổi về hệ nền
// `units` của plan bằng HỮU TỈ EXACT (bảng factor unit→SI: km/h→m/s ×5/18; km→m ×1000; min→s ×60;
// h→s ×3600). Không khai unit ⇒ số hiểu theo hệ nền (tương thích P1–P10 cũ). Cấm LLM tự chia 3,6.
const VelUnit = z.enum(['m/s', 'km/h']);
const LenUnit = z.enum(['m', 'km']);
const TimeUnit = z.enum(['s', 'min', 'h']);

const Mover1dOp = z.object({
  op: z.literal('mover1d'), name: Obj,
  x0: Num,                          // toạ độ đầu trên trục chuyển động
  xUnit: LenUnit.optional(),        // đơn vị của x0 (vắng = units.length)
  v0: Num,                          // vận tốc đầu, ĐẠI SỐ: âm = ngược chiều dương
  v0Unit: VelUnit.optional(),       // đơn vị của v0 (vắng = units.length/units.time) — bài "54 km/h, a=3 m/s²" khai đây
  a: Num.default(0),                // gia tốc (0 = thẳng đều) — LUÔN theo hệ nền (đề có a hầu như luôn SI; aUnit → v1)
  startAt: Num.default(0),          // thời điểm xuất phát t0 — "xe B đi sau 30 phút" ⇒ startAt: 30, tUnit: 'min'
  tUnit: TimeUnit.optional(),       // đơn vị của startAt (vắng = units.time)
  axis: z.enum(['x', 'y']).default('x'), // 'y' = chuyển động thẳng đứng (thang máy…)
});
const FreeFallOp = z.object({
  op: z.literal('free_fall'), name: Obj,
  h0: Num.positive(),               // độ cao thả
  xUnit: LenUnit.optional(),        // đơn vị của h0 VÀ x0 (một unit cho cả hai — đề không trộn m/km trong một vật)
  g: Num.positive(),                // BẮT BUỘC — LLM truyền 9.8 hoặc 10 THEO ĐỀ, theo hệ nền (m/s²). Engine KHÔNG hard-code g.
  x0: Num.default(0),
});
const ProjectileOp = z.object({
  op: z.literal('projectile'), name: Obj,
  x0: Num.default(0),
  h0: Num.min(0),                   // 0 = ném từ mặt đất
  xUnit: LenUnit.optional(),        // đơn vị của x0/h0
  v0: Num.positive(),               // ĐỘ LỚN (>0) — chiều nằm ở angleDeg
  v0Unit: VelUnit.optional(),
  // LUÔN là ĐỘ. 0 = ném ngang; 90 = thẳng đứng LÊN; −90 = thẳng đứng XUỐNG (F11). Độ→radian là việc
  // NỘI BỘ engine. THẤP(6): chặn |angleDeg| > 90 — "ném ngược chiều trục x" (vd 180°) không phải bài
  // projectile lớp 10; mô tả bằng mover1d (v0 âm) hoặc đổi chiều dương của trục.
  angleDeg: Num
    .min(-90, 'angleDeg phải trong [−90, 90] — ném ngược chiều trục x hãy mô tả bằng mover1d (v0 âm) hoặc đổi chiều dương của trục')
    .max(90, 'angleDeg phải trong [−90, 90] — ném ngược chiều trục x hãy mô tả bằng mover1d (v0 âm) hoặc đổi chiều dương của trục'),
  g: Num.positive(),                // BẮT BUỘC, như free_fall
});
export const PhysicsOpSchema = z.discriminatedUnion('op', [Mover1dOp, FreeFallOp, ProjectileOp]);

export const PhysicsQuerySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('position_at'), of: Obj, t: Num, tUnit: TimeUnit.optional(), axis: z.enum(['x', 'y']).optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('velocity_at'), of: Obj, t: Num, tUnit: TimeUnit.optional(), component: z.enum(['x', 'y', 'speed']).default('speed'), label: z.string().optional() }),
  z.object({ kind: z.literal('time_to_ground'), of: Obj, label: z.string().optional() }),   // min t>t0: y(t)=0
  z.object({ kind: z.literal('range'), of: Obj, label: z.string().optional() }),            // x(t_đất) − x(t0) — tầm xa
  z.object({ kind: z.literal('max_height'), of: Obj, label: z.string().optional() }),       // y tại đỉnh v_y=0
  z.object({ kind: z.literal('impact_velocity'), of: Obj, component: z.enum(['x', 'y', 'speed']).default('speed'), label: z.string().optional() }),
  z.object({ kind: z.literal('meet_time'), a: Obj, b: Obj, label: z.string().optional() }),      // min t≥max(t0a,t0b): pos_a=pos_b
  z.object({ kind: z.literal('meet_position'), a: Obj, b: Obj, label: z.string().optional() }),
  z.object({ kind: z.literal('distance_between_at'), a: Obj, b: Obj, t: Num, tUnit: TimeUnit.optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('time_when'), of: Obj, position: Num, xUnit: LenUnit.optional(), axis: z.enum(['x', 'y']).optional(), label: z.string().optional() }), // min t≥t0: coord=position
  // F3 (phản biện phiên 1): cặp query cho lớp bài "hãm phanh/dừng lại/đạt vận tốc cho trước".
  // v(t) TUYẾN TÍNH ⇒ nghiệm exact. `value` là giá trị ĐẠI SỐ theo component (dừng lại: value 0).
  // Tách-một-số như meet_time/meet_position (triết lý §14.4): time_… trả t, position_… trả toạ độ tại t đó.
  z.object({ kind: z.literal('time_when_velocity'), of: Obj, value: Num, vUnit: VelUnit.optional(), component: z.enum(['x', 'y']).optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('position_when_velocity'), of: Obj, value: Num, vUnit: VelUnit.optional(), component: z.enum(['x', 'y']).optional(), label: z.string().optional() }),
]);

export const PhysicsPlanSchema = z.object({
  problemName: z.string().min(1),
  // Hệ đơn vị NHẤT QUÁN của cả plan — chỉ để GẮN NHÃN đáp + scale timeline, KHÔNG đổi công thức
  // (công thức động học bất biến theo hệ đơn vị nhất quán: km + h + km/h chạy y hệt m + s + m/s).
  units: z.object({ length: z.string().default('m'), time: z.string().default('s') }).default({}),
  ops: z.array(PhysicsOpSchema).min(1),
  queries: z.array(PhysicsQuerySchema).min(1),
  // Assert = DỮ KIỆN DƯ của đề dùng đối chiếu mô hình (vd đề cho sẵn "sau 2 s vật đi được 30 m").
  // KHÔNG phải nơi LLM nộp đáp số. tol mặc định TOL_ASSERT (xem §7).
  asserts: z.array(z.object({ query: PhysicsQuerySchema, equals: Num, tol: Num.positive().optional() })).default([]),
  charts: z.array(z.object({ kind: z.enum(['x_t', 'v_t']), of: z.array(Obj).min(1) })).default([]),
  scene: z.object({
    durationSec: Num.positive().optional(),          // ép thời lượng playback; bỏ trống = quy tắc §8.2
    labels: z.record(z.string(), z.string()).optional(), // name → nhãn hiển thị ("Xe A", "Quả bóng"…)
  }).default({}),
});
export type PhysicsPlan = z.infer<typeof PhysicsPlanSchema>;
export type PhysicsOp = z.infer<typeof PhysicsOpSchema>;
export type PhysicsQuery = z.infer<typeof PhysicsQuerySchema>;
