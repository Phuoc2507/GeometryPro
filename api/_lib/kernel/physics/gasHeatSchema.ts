// api/_lib/kernel/physics/gasHeatSchema.ts
// GasHeatPlanSchema (zod) — chép nguyên spec §6 (physics-pack v1 KHÍ LÍ TƯỞNG + VẬT LÍ NHIỆT lớp 12).
// TRIẾT LÝ (như circuit/dynamics): LLM chỉ DỊCH đề → khai trạng thái khí / quá trình / vật nhiệt +
// câu hỏi; ẩn số = TRƯỜNG BỎ TRỐNG. KHÔNG field nào nhận đáp đã tính hộ (R1): không T-đã-Kelvin,
// không p-đáy đã nhân ρgh, không n đã chia pV/RT. Engine đổi °C→K (+273), đổi đơn vị, tính thuỷ tĩnh.
// superRefine = GATE tất định "đúng-một-ẩn" + chặn trộn chuyển-thể-vào-cân-bằng (phi tuyến) ⇒ abstain.
//
// PHÁN QUYẾT ĐIỀU PHỐI đã áp: D34-c MỘT process/plan v1; D34-e plan.R optional (engine default 831/100);
// D34-f +273 cứng; H4: KHÔNG chạm tsconfig.kernel.json (glob physics/**/*.ts đã phủ).
import { z } from 'zod';

const Num = z.number().finite();
const Name = z.string().min(1).regex(/^[A-Za-z0-9_]+$/); // tên = id: không dấu/cách

const PRES_UNITS = ['Pa', 'kPa', 'atm', 'bar', 'mmHg'] as const;
const VOL_UNITS = ['m3', 'L', 'mL', 'cm3'] as const;
const TEMP_UNITS = ['C', 'K'] as const;
const MASS_UNITS = ['kg', 'g'] as const;
const LEN_UNITS = ['m', 'cm'] as const;

const PresUnit = z.enum(PRES_UNITS);
const VolUnit = z.enum(VOL_UNITS);
const TempUnit = z.enum(TEMP_UNITS);
const MassUnit = z.enum(MASS_UNITS);
const LenUnit = z.enum(LEN_UNITS);

const Pressure = z.object({ value: Num.positive(), unit: PresUnit.default('Pa') });
const Volume = z.object({ value: Num.positive(), unit: VolUnit.default('m3') });
const Temp = z.object({ value: Num, unit: TempUnit.default('K') }); // value có thể ≤0 (°C âm); K PHẢI >0 sau đổi (engine self-check)
const Mass = z.object({ value: Num.positive(), unit: MassUnit.default('kg') });
const Scal = z.object({ value: Num.positive() }); // đại lượng không-đổi-đơn-vị (c, n, molarMass, λ, L, ρ)

// Áp suất thuỷ tĩnh (bọt khí đáy hồ) — engine tính p = p₀ + ρgh; LLM chỉ CHÉP p₀, h, ρ, g (KHÔNG tự nhân).
const Hydrostatic = z.object({
  atmosphere: Pressure,
  depth: z.object({ value: Num.positive(), unit: LenUnit.default('m') }),
  density: Scal.default({ value: 1000 }), // ρ (kg/m³); nước = 1000
  g: Num.positive().default(10),
});

// ── Ops KHÍ ─────────────────────────────────────────────────────────────────────
const StateOp = z.object({
  op: z.literal('state'),
  name: Name,
  p: Pressure.optional(), // BỎ TRỐNG = ẩn (state_value hỏi) HOẶC không xuất hiện trong luật
  pFromDepth: Hydrostatic.optional(), // thay cho p: engine tính p₀+ρgh (loại trừ p — superRefine)
  V: Volume.optional(),
  T: Temp.optional(), // đẳng nhiệt có thể bỏ T cả hai trạng thái (triệt tiêu)
  n: Scal.optional(), // số mol (Clapeyron)
  mass: Mass.optional(), // khối lượng khí (Clapeyron; cần molarMass)
  molarMass: Scal.optional(), // M (g/mol) — cầu mass↔mol
});

const ProcessOp = z.object({
  op: z.literal('process'),
  kind: z.enum(['isothermal', 'isochoric', 'isobaric', 'general']),
  from: Name,
  to: Name,
});

// ── Op NHIỆT (calorimetry + chuyển thể GỘP một op, field tuỳ query) ───────────────
const ThermalBodyOp = z.object({
  op: z.literal('thermal_body'),
  name: Name,
  mass: Mass.optional(), // BỎ TRỐNG ⇒ ẩn của mass_from_heat property=mass
  c: Scal.optional(), // nhiệt dung riêng đơn-pha J/(kg·K)
  T0: Temp.optional(), // nhiệt độ đầu (cân bằng nhiệt)
  // chuyển thể (chuỗi một chất — CHỈ dùng ở query 'heat'):
  cSolid: Scal.optional(),
  cLiquid: Scal.optional(),
  cGas: Scal.optional(),
  meltTemp: Temp.optional(),
  boilTemp: Temp.optional(),
  latentMelt: Scal.optional(), // λ (J/kg)
  latentVapor: Scal.optional(), // L (J/kg)
});

export const GasHeatOpSchema = z.discriminatedUnion('op', [StateOp, ProcessOp, ThermalBodyOp]);

// ── Queries (mỗi query MỘT đáp số + đơn vị engine ghi) ────────────────────────────
const PhasePoint = z.object({ phase: z.enum(['solid', 'liquid', 'gas']), temp: Temp });

export const GasHeatQuerySchema = z.discriminatedUnion('kind', [
  // KHÍ:
  z.object({ kind: z.literal('state_value'), of: Name, quantity: z.enum(['p', 'V', 'T']), unit: z.string().optional(), label: z.string().optional() }),
  z.object({ kind: z.literal('clapeyron'), of: Name, solveFor: z.enum(['p', 'V', 'T', 'amount', 'mass']), unit: z.string().optional(), label: z.string().optional() }),
  // NHIỆT:
  z.object({ kind: z.literal('heat'), of: Name, from: PhasePoint, to: PhasePoint, label: z.string().optional() }),
  z.object({ kind: z.literal('equilibrium_temp'), unit: TempUnit.default('C'), label: z.string().optional() }),
  z.object({ kind: z.literal('mass_from_heat'), of: Name, property: z.enum(['mass', 'c', 'T0']).default('mass'), Tf: Temp, unit: z.string().optional(), label: z.string().optional() }),
]);

const GasHeatPlanBase = z.object({
  problemName: z.string().min(1),
  atmInPa: z.union([z.literal(101325), z.literal(100000)]).default(101325), // 1 atm = ? Pa (đề khai)
  R: Scal.optional(), // D34-e: override tuỳ chọn; engine default 831/100 (SGK GDPT 2018)
  ops: z.array(GasHeatOpSchema).min(1),
  queries: z.array(GasHeatQuerySchema).min(1),
  asserts: z.array(z.object({ query: GasHeatQuerySchema, equals: Num, tol: Num.positive().optional() })).default([]),
  knowledgeTags: z.array(z.string()).default([]),
});

export type GasHeatPlan = z.infer<typeof GasHeatPlanBase>;
export type GasHeatQuery = z.infer<typeof GasHeatQuerySchema>;
export type GasHeatOp = z.infer<typeof GasHeatOpSchema>;
export type StateOpT = z.infer<typeof StateOp>;
export type ProcessOpT = z.infer<typeof ProcessOp>;
export type ThermalBodyOpT = z.infer<typeof ThermalBodyOp>;

// ── §6.3 superRefine — GATE tính tất định & abstain ────────────────────────────────
const UNIT_TABLE: Record<'p' | 'V' | 'T' | 'mass', readonly string[]> = { p: PRES_UNITS, V: VOL_UNITS, T: TEMP_UNITS, mass: MASS_UNITS };
const LATENT_KEYS = ['cSolid', 'cLiquid', 'cGas', 'meltTemp', 'boilTemp', 'latentMelt', 'latentVapor'] as const;

function refineGasHeat(plan: GasHeatPlan, ctx: z.RefinementCtx): void {
  const issue = (message: string): void => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  const states = plan.ops.filter((o): o is StateOpT => o.op === 'state');
  const bodies = plan.ops.filter((o): o is ThermalBodyOpT => o.op === 'thermal_body');
  const processes = plan.ops.filter((o): o is ProcessOpT => o.op === 'process');
  const stateBy = new Map(states.map((s) => [s.name, s]));
  const bodyBy = new Map(bodies.map((b) => [b.name, b]));

  // (1) Tên duy nhất trên toàn ops (state + thermal_body).
  const seen = new Set<string>();
  for (const o of plan.ops) {
    if (o.op === 'process') continue;
    if (seen.has(o.name)) issue(`tên "${o.name}" khai báo trùng`);
    seen.add(o.name);
  }

  // (2) p và pFromDepth loại trừ nhau.
  for (const s of states) if (s.p !== undefined && s.pFromDepth !== undefined) issue(`trạng thái "${s.name}" khai CẢ p lẫn pFromDepth (loại trừ nhau)`);

  // (D34-c) MỘT process/plan cho v1.
  if (processes.length > 1) issue(`v1 chỉ hỗ trợ MỘT quá trình (process) mỗi plan, nhận ${processes.length}`);
  for (const pr of processes) {
    if (!stateBy.has(pr.from)) issue(`process.from trỏ trạng thái "${pr.from}" không tồn tại`);
    if (!stateBy.has(pr.to)) issue(`process.to trỏ trạng thái "${pr.to}" không tồn tại`);
    if (pr.from === pr.to) issue(`process nối hai trạng thái trùng "${pr.from}"`);
  }

  const hasQ = (s: StateOpT, qq: 'p' | 'V' | 'T'): boolean =>
    qq === 'p' ? s.p !== undefined || s.pFromDepth !== undefined : qq === 'V' ? s.V !== undefined : s.T !== undefined;
  const LAW: Record<ProcessOpT['kind'], ('p' | 'V' | 'T')[]> = {
    isothermal: ['p', 'V'], isochoric: ['p', 'T'], isobaric: ['V', 'T'], general: ['p', 'V', 'T'],
  };
  const checkUnit = (u: string | undefined, dim: 'p' | 'V' | 'T' | 'mass' | 'amount' | 'c'): void => {
    if (u === undefined) return;
    if (dim === 'amount') { if (u !== 'mol') issue(`đơn vị số mol phải là "mol", nhận "${u}"`); return; }
    if (dim === 'c') { if (u !== 'J/(kg·K)') issue(`đơn vị nhiệt dung riêng phải là "J/(kg·K)", nhận "${u}"`); return; }
    if (!UNIT_TABLE[dim].includes(u)) issue(`đơn vị "${u}" không hợp lệ cho đại lượng ${dim} (bảng: ${UNIT_TABLE[dim].join(', ')})`);
  };

  for (const q of plan.queries) {
    if (q.kind === 'state_value') {
      const of = stateBy.get(q.of);
      if (!of) { issue(`state_value.of trỏ trạng thái "${q.of}" không tồn tại`); continue; }
      checkUnit(q.unit, q.quantity);
      // (3) GATE "đúng-một-ẩn": đúng một process chứa 'of'; blank trong đại-lượng-của-luật = đúng 1, và = quantity hỏi.
      const procs = processes.filter((pr) => pr.from === q.of || pr.to === q.of);
      if (procs.length !== 1) { issue(`state_value "${q.of}" cần đúng MỘT quá trình chứa nó (nhận ${procs.length})`); continue; }
      const pr = procs[0];
      const from = stateBy.get(pr.from), to = stateBy.get(pr.to);
      if (!from || !to) continue;
      const blanks: { name: string; q: 'p' | 'V' | 'T' }[] = [];
      for (const st of [from, to]) for (const lq of LAW[pr.kind]) if (!hasQ(st, lq)) blanks.push({ name: st.name, q: lq });
      if (blanks.length !== 1) { issue(`quá trình ${pr.kind} cần ĐÚNG MỘT ẩn trong đại lượng của luật, nhận ${blanks.length}`); continue; }
      const b = blanks[0];
      if (b.name !== q.of || b.q !== q.quantity) issue(`ẩn số (${b.name}.${b.q}) không khớp câu hỏi (${q.of}.${q.quantity})`);
    } else if (q.kind === 'clapeyron') {
      const of = stateBy.get(q.of);
      if (!of) { issue(`clapeyron.of trỏ trạng thái "${q.of}" không tồn tại`); continue; }
      const dimOf: 'p' | 'V' | 'T' | 'mass' | 'amount' | 'c' = q.solveFor === 'amount' ? 'amount' : q.solveFor === 'mass' ? 'mass' : q.solveFor;
      checkUnit(q.unit, dimOf);
      const nProvided = of.n !== undefined || (of.mass !== undefined && of.molarMass !== undefined);
      if (q.solveFor === 'p' && (of.p !== undefined || of.pFromDepth !== undefined)) issue('clapeyron solveFor=p nhưng p đã cho (ẩn phải bỏ trống)');
      if (q.solveFor === 'V' && of.V !== undefined) issue('clapeyron solveFor=V nhưng V đã cho');
      if (q.solveFor === 'T' && of.T !== undefined) issue('clapeyron solveFor=T nhưng T đã cho');
      if (q.solveFor === 'amount' && of.n !== undefined) issue('clapeyron solveFor=amount nhưng n đã cho');
      if ((q.solveFor === 'amount' || q.solveFor === 'mass') && !(of.p !== undefined || of.pFromDepth !== undefined)) issue('clapeyron cần p (hoặc pFromDepth) để tính n/mass');
      if ((q.solveFor === 'amount' || q.solveFor === 'mass') && of.V === undefined) issue('clapeyron cần V để tính n/mass');
      if ((q.solveFor === 'amount' || q.solveFor === 'mass') && of.T === undefined) issue('clapeyron cần T để tính n/mass');
      if (q.solveFor === 'mass' && of.molarMass === undefined) issue('clapeyron solveFor=mass cần molarMass (M)');
      if ((q.solveFor === 'p' || q.solveFor === 'V' || q.solveFor === 'T') && !nProvided) issue(`clapeyron solveFor=${q.solveFor} cần biết n (hoặc mass+molarMass)`);
    } else if (q.kind === 'heat') {
      if (!bodyBy.has(q.of)) issue(`heat.of "${q.of}" không phải vật nhiệt (thermal_body) hoặc không tồn tại`);
    } else if (q.kind === 'equilibrium_temp') {
      if (bodies.length < 2) issue(`equilibrium_temp cần ≥ 2 vật nhiệt, nhận ${bodies.length}`);
      for (const b of bodies) {
        if (b.mass === undefined || b.c === undefined || b.T0 === undefined) issue(`equilibrium_temp: vật "${b.name}" thiếu mass/c/T0`);
        if (LATENT_KEYS.some((k) => b[k] !== undefined)) issue(`equilibrium_temp: vật "${b.name}" có tham số chuyển thể — v1 chặn trộn chuyển-thể-vào-cân-bằng (phi tuyến), hãy tách query 'heat'`);
      }
    } else if (q.kind === 'mass_from_heat') {
      const of = bodyBy.get(q.of);
      if (!of) { issue(`mass_from_heat.of "${q.of}" không phải vật nhiệt (thermal_body) hoặc không tồn tại`); continue; }
      if (bodies.length < 2) issue(`mass_from_heat cần ≥ 2 vật nhiệt, nhận ${bodies.length}`);
      checkUnit(q.unit, q.property === 'mass' ? 'mass' : q.property === 'c' ? 'c' : 'T');
      for (const b of bodies) if (LATENT_KEYS.some((k) => b[k] !== undefined)) issue(`mass_from_heat: vật "${b.name}" có tham số chuyển thể — v1 chặn phi tuyến (chỉ cảm nhiệt thuần)`);
      const need: ('mass' | 'c' | 'T0')[] = ['mass', 'c', 'T0'];
      if (of[q.property] !== undefined) issue(`mass_from_heat property=${q.property} nhưng "${q.of}" đã cho ${q.property} (ẩn phải bỏ trống)`);
      for (const nk of need) if (nk !== q.property && of[nk] === undefined) issue(`mass_from_heat: vật ẩn "${q.of}" cần ${nk}`);
      for (const b of bodies) if (b.name !== q.of) for (const nk of need) if (b[nk] === undefined) issue(`mass_from_heat: vật "${b.name}" thiếu ${nk}`);
    }
  }
}

export const GasHeatPlanSchema = GasHeatPlanBase.superRefine(refineGasHeat);
