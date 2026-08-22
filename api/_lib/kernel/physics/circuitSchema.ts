// api/_lib/kernel/physics/circuitSchema.ts
// CircuitPlanSchema (zod) — chép nguyên spec §6 (dc-circuit v1, đã áp phán quyết đợt 2).
// LLM CHỈ DỊCH đề → cây topology + câu hỏi; KHÔNG có field nào nhận R_tđ/I/U đã tính hộ.
// Số dư của đề (số chỉ ampe kế, "biết I = 2 A"…) → asserts, KHÔNG được bỏ (CI-2).
import { z } from 'zod';

const Num = z.number().finite();
const Name = z.string().min(1).regex(/^[A-Za-z0-9_]+$/); // tên = id: không dấu, không cách

// ── Lá (leaf) ────────────────────────────────────────────────────────────────
const ResistorLeaf = z.object({
  kind: z.literal('resistor'),
  name: Name,
  ohms: Num.positive(),
  unit: z.enum(['ohm', 'kohm']).default('ohm'), // per-quantity (F2): kohm → engine ×1000 exact
});
const LampLeaf = z.object({
  kind: z.literal('lamp'),
  name: Name,
  ratedVolts: Num.positive(), // U_đm (V)
  ratedWatts: Num.positive(), // P_đm (W) — engine tự suy R = U_đm²/P_đm (coi hằng, ghi assumption)
});
const UnknownLeaf = z.object({
  kind: z.literal('unknown_resistor'),
  name: Name, // biến trở CẦN TÌM (bài nghịch) — KHÔNG có ohms
});

export type CircuitNode =
  | z.infer<typeof ResistorLeaf>
  | z.infer<typeof LampLeaf>
  | z.infer<typeof UnknownLeaf>
  | { kind: 'series'; name?: string; items: CircuitNode[] }
  | { kind: 'parallel'; name?: string; items: CircuitNode[] };

// Cây đệ quy: nhóm series/parallel với items ≥ 2; lá là phần tử.
export const CircuitNodeSchema: z.ZodType<CircuitNode> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    ResistorLeaf,
    LampLeaf,
    UnknownLeaf,
    z.object({ kind: z.literal('series'), name: Name.optional(), items: z.array(CircuitNodeSchema).min(2) }),
    z.object({ kind: z.literal('parallel'), name: Name.optional(), items: z.array(CircuitNodeSchema).min(2) }),
  ]),
  // Cast: z.lazy + discriminatedUnion dưới strictNullChecks:false suy ra kiểu output "lỏng" (mọi field
  // optional) không khớp CircuitNode tự khai (kind bắt buộc ở nhóm). z.infer vẫn = CircuitNode nhờ annotation.
) as unknown as z.ZodType<CircuitNode>;

// ── Queries ──────────────────────────────────────────────────────────────────
export const CircuitQuerySchema = z.discriminatedUnion('kind', [
  // resistance (ĐỔI TÊN từ total_resistance — phán quyết §15.2): bỏ of = R_tđ mạch ngoài;
  // of = tên lá/khối = R (tương đương) của phần tử đó (vd R đèn suy từ định mức).
  z.object({ kind: z.literal('resistance'), of: Name.optional(), label: z.string().optional() }),
  // current: bỏ of = I mạch chính (qua nguồn); of = I qua lá/khối.
  z.object({ kind: z.literal('current'), of: Name.optional(), label: z.string().optional() }),
  // voltage: bỏ of = U mạch ngoài = U hai cực nguồn; of = U hai đầu lá/khối.
  z.object({ kind: z.literal('voltage'), of: Name.optional(), label: z.string().optional() }),
  // power: P tiêu thụ của lá/khối = U·I.
  z.object({ kind: z.literal('power'), of: Name, label: z.string().optional() }),
  // power_source: total = E·I | internal = I²r | external = U_N·I.
  z.object({
    kind: z.literal('power_source'),
    part: z.enum(['total', 'internal', 'external']).default('total'),
    label: z.string().optional(),
  }),
  // energy A = P·t của lá/khối (bỏ of = mạch ngoài); tUnit/unit engine đổi exact (§6.4).
  z.object({
    kind: z.literal('energy'),
    of: Name.optional(),
    t: Num.positive(),
    tUnit: z.enum(['s', 'min', 'h']).default('s'),
    unit: z.enum(['J', 'kJ', 'Wh', 'kWh']).default('J'),
    label: z.string().optional(),
  }),
  // energy_source: công của nguồn A_ng = E·I·t.
  z.object({
    kind: z.literal('energy_source'),
    t: Num.positive(),
    tUnit: z.enum(['s', 'min', 'h']).default('s'),
    unit: z.enum(['J', 'kJ', 'Wh', 'kWh']).default('J'),
    label: z.string().optional(),
  }),
  // efficiency H = U_N/E, trả PHẦN TRĂM (unit '%').
  z.object({ kind: z.literal('efficiency'), label: z.string().optional() }),
  // lamp_check: of PHẢI là lamp; ratio = I_thực/I_đm + verdict cấu trúc (§8.1).
  z.object({ kind: z.literal('lamp_check'), of: Name, label: z.string().optional() }),
  // solve_resistance: of PHẢI là unknown_resistor; tìm R để I MẠCH CHÍNH = targetCurrent (§7.5).
  z.object({
    kind: z.literal('solve_resistance'),
    of: Name,
    targetCurrent: Num.positive(),
    targetCurrentUnit: z.enum(['A', 'mA']).default('A'),
    label: z.string().optional(),
  }),
]);

// ── Plan đầy đủ + superRefine (§6.3) ─────────────────────────────────────────
export const CircuitPlanSchema = z
  .object({
    problemName: z.string().min(1),
    source: z.object({
      emf: Num.positive(), // E (V) — "mắc vào U không đổi" ⇒ emf = U, r = 0
      r: Num.min(0).default(0), // điện trở trong (Ω)
    }),
    circuit: CircuitNodeSchema, // mạch ngoài; MỘT lá đơn cũng hợp lệ (bếp điện, một đèn)
    queries: z.array(CircuitQuerySchema).min(1),
    asserts: z
      .array(z.object({ query: CircuitQuerySchema, equals: Num, tol: Num.positive().optional() }))
      .default([]),
  })
  .superRefine((plan, ctx) => {
    // Thu thập tên + loại lá + độ sâu nhóm bằng một lượt duyệt cây.
    const names: string[] = [];
    const leafKinds = new Map<string, string>(); // tên lá → kind
    let leafCount = 0;
    let maxDepth = 0;
    const RESERVED = new Set(['_ngoai', '_nguon']); // từ khóa hiển thị nội bộ (§6.3 rule 5)

    const walk = (node: CircuitNode, depth: number): void => {
      if (node.kind === 'series' || node.kind === 'parallel') {
        maxDepth = Math.max(maxDepth, depth);
        if (node.name) names.push(node.name);
        for (const it of node.items) walk(it, depth + 1);
        return;
      }
      leafCount++;
      names.push(node.name);
      leafKinds.set(node.name, node.kind);
    };
    walk(plan.circuit, 1);

    // (1) Tên duy nhất trên toàn cây.
    const seen = new Set<string>();
    for (const nm of names) {
      if (seen.has(nm)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `tên "${nm}" trùng — mọi tên (lá + nhóm) phải duy nhất` });
      seen.add(nm);
      // (5) Không dùng từ khóa nội bộ.
      if (RESERVED.has(nm)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `tên "${nm}" là từ khóa hiển thị nội bộ, không được dùng` });
    }
    const nameSet = seen;

    // (2) Số lá ≤ 8; độ sâu nhóm ≤ 4.
    if (leafCount > 8) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `mạch có ${leafCount} lá, vượt trần 8 (v1)` });
    if (maxDepth > 4) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `nhóm sâu ${maxDepth} tầng, vượt trần 4 (v1)` });

    // (3) unknown_resistor: tối đa MỘT; có ẩn ⇔ đúng một solve_resistance trỏ vào nó.
    const unknowns = [...leafKinds.entries()].filter(([, k]) => k === 'unknown_resistor').map(([n]) => n);
    if (unknowns.length > 1) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `có ${unknowns.length} unknown_resistor, tối đa 1 (v1)` });
    const solveQs = plan.queries.filter((q) => q.kind === 'solve_resistance');
    if (unknowns.length === 1 && solveQs.length !== 1)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `có ẩn "${unknowns[0]}" nhưng ${solveQs.length} query solve_resistance (cần đúng 1)` });
    if (unknowns.length === 0 && solveQs.length > 0)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `có solve_resistance nhưng không có unknown_resistor nào` });
    for (const sq of solveQs) {
      if (sq.of && leafKinds.get(sq.of) !== 'unknown_resistor')
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `solve_resistance.of "${sq.of}" không trỏ tới unknown_resistor` });
    }

    // (4) lamp_check.of phải trỏ tới lá lamp.
    for (const q of plan.queries) {
      if (q.kind === 'lamp_check' && leafKinds.get(q.of) !== 'lamp')
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `lamp_check.of "${q.of}" không trỏ tới lá lamp` });
    }

    // (1b) mọi `of` trong queries/asserts phải tồn tại.
    const checkRef = (of: string | undefined, where: string): void => {
      if (of !== undefined && !nameSet.has(of))
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${where} trỏ tới tên "${of}" không tồn tại trong cây` });
    };
    for (const q of plan.queries) if ('of' in q) checkRef((q as { of?: string }).of, `query ${q.kind}`);
    for (const a of plan.asserts) if ('of' in a.query) checkRef((a.query as { of?: string }).of, `assert ${a.query.kind}`);
  });

export type CircuitPlan = z.infer<typeof CircuitPlanSchema>;
export type CircuitQuery = z.infer<typeof CircuitQuerySchema>;
