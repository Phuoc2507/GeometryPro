// api/_lib/kernel/analysis/runAnalysis.ts
// Entry GIẢI TÍCH: bọc ngoài run() — LLM khai báo hình có 1 tham số tự do + mục tiêu/điều kiện;
// engine thay tham số bằng số, chạy run() (hình học số), đọc truy vấn, rồi tối ưu/giải theo tham số.
// KHÔNG sửa run(). Chống ảo giác: engine tính, LLM chỉ khai báo.
import { z } from 'zod';
import { run, RunPlanSchema } from '../run';
import { UnifiedOpSchema } from '../unifiedPlan';
import { QueryESchema } from '../compute/query';
import { evalExpr, type Env, type Funcs } from './expr';
import { integrate } from './quadrature';
import { optimizeParam, solveParam, optimizeMulti } from './paramsolve';
import { recognizeConstant } from './recognize';
import { fitPoly, evalPoly, derivPoly, extremumOfPoly } from './polyfit';
import { intersectionVolume, type Solid } from './solids';
import { entityTableToGeometryData } from '../entityToGeometry';
import { buildAnalysisFigure, type FigureInput } from './analysisFigure';

const NumOrExpr = z.union([z.number(), z.string()]);

// Khối tròn xoay trục đứng — chỉ sống ở lớp analysis (engine hình học không đổi).
const SolidDeclSchema = z.union([
  z.object({ name: z.string(), kind: z.literal('cylinder'), center: z.tuple([NumOrExpr, NumOrExpr]), radius: NumOrExpr, from: NumOrExpr, to: NumOrExpr }),
  z.object({ name: z.string(), kind: z.literal('cone'), center: z.tuple([NumOrExpr, NumOrExpr]), baseRadius: NumOrExpr, baseZ: NumOrExpr, apexZ: NumOrExpr }),
]);

// Nguồn SỐ cho mục tiêu/điều kiện: truy vấn HÌNH HỌC, hoặc BIỂU THỨC (gọi được hàm đã khai báo).
const ScalarSource = z.union([
  QueryESchema,
  z.object({ kind: z.literal('expr'), expr: z.string() }),
  z.object({ kind: z.literal('solid_volume'), of: z.tuple([z.string(), z.string()]), mode: z.literal('intersection') }),
]);

const AnalyzeSchema = z.union([
  z.object({ kind: z.literal('optimize'), parameter: z.string(), sense: z.enum(['max', 'min']), objective: ScalarSource }),
  z.object({
    kind: z.literal('solve'), parameter: z.string(),
    constraint: z.object({ of: ScalarSource, equals: NumOrExpr }),
    report: ScalarSource,
  }),
  z.object({ kind: z.literal('integrate'), variable: z.string(), from: NumOrExpr, to: NumOrExpr, integrand: z.string() }),
  z.object({ kind: z.literal('eval'), of: ScalarSource }),
  z.object({ kind: z.literal('optimize_multi'), parameters: z.array(z.string()).min(2), sense: z.enum(['max', 'min']), objective: ScalarSource }),
]);

// Op TẦNG HÀM: chỉ tồn tại ở lớp analysis — concreteOps hạ chúng thành op hình học SỐ trước khi gọi run().
const FunctionOpSchema = z.union([
  z.object({ op: z.literal('curve_point'), name: z.string(), f: z.string(), x: NumOrExpr }),
  z.object({ op: z.literal('tangent_line'), name: z.string(), f: z.string(), x: NumOrExpr }),
  z.object({ op: z.literal('curve_extremum'), name: z.string(), f: z.string(), domain: z.tuple([NumOrExpr, NumOrExpr]) }),
]);

export const AnalysisPlanSchema = RunPlanSchema.extend({
  ops: z.array(z.union([FunctionOpSchema, UnifiedOpSchema])).default([]),
  parameters: z.array(z.object({ name: z.string(), domain: z.tuple([NumOrExpr, NumOrExpr]) })).default([]),
  functions: z.array(z.object({
    name: z.string(),
    form: z.literal('poly'),
    degree: z.number().int().min(1),
    through: z.array(z.tuple([NumOrExpr, NumOrExpr])),
    leading: z.string().optional(), // tên tham số dùng làm hệ số bậc cao nhất (để trống ⇒ khớp đủ điểm)
    slopeAt: z.array(z.tuple([NumOrExpr, NumOrExpr])).default([]),
  })).default([]),
  solids: z.array(SolidDeclSchema).default([]),
  analyze: AnalyzeSchema,
  // ĐƠN VỊ HIỂN THỊ (tuỳ chọn): engine tính theo đơn vị gốc của đề (vd cm³); nếu đề hỏi đáp theo đơn vị
  // khác (vd "lít"), LLM khai answerScale (hệ số nhân, vd 0.001 cho cm³→lít) + answerUnit ("lít") để đáp
  // hiện đúng đơn vị. Bỏ trống ⇒ hiện số trần. KHÔNG ảnh hưởng phép tính, chỉ khâu hiển thị cuối.
  answerScale: NumOrExpr.optional(),
  answerUnit: z.string().optional(),
});
export type AnalysisPlan = z.infer<typeof AnalysisPlanSchema>;

export type AnalysisResult = {
  ok: boolean;
  parameter: { name: string; value: number };
  answer: { approx: number; text: string; approximate: boolean };
  violations: unknown[];
  errors: { message: string }[];
  geometry?: unknown; // hình DỰNG TẠI NGHIỆM (để route vẽ hiện được), null nếu bài không có hình
};

// Số hoá một entry toạ độ/tham số: nếu là chuỗi CÓ chứa tên tham số → evalExpr; ngược lại giữ nguyên.
function numify(c: number | string, env: Record<string, number>, params: string[]): number | string {
  if (typeof c === 'string' && params.some((p) => new RegExp(`\\b${p}\\b`).test(c))) return evalExpr(c, env);
  return c;
}

// Đọc SỐ từ một answer (distance/area/volume/scalar/sphere_metric có approx; angle có degrees).
function scalarOf(a: unknown): number {
  const o = a as Record<string, unknown>;
  if (o && typeof o.approx === 'number') return o.approx;
  if (o && typeof o.degrees === 'number') return o.degrees;
  throw new Error('Truy vấn mục tiêu/điều kiện không trả số');
}

function fail(name: string, msg: string): AnalysisResult {
  return { ok: false, parameter: { name, value: NaN }, answer: { approx: NaN, text: '(lỗi)', approximate: true }, violations: [], errors: [{ message: msg }] };
}

// Số thập phân GỌN cho đáp không nhận dạng được: ít chữ số hơn khi trị lớn, cắt số 0 thừa.
// 12949.3333→"12949.33"; 0.86602→"0.866"; 7.0→"7". Tránh ".toFixed(4)" cứng ra "12949.3333" xấu.
function fmtNum(x: number): string {
  if (!Number.isFinite(x)) return '(lỗi)';
  // Trị LỚN (≥1000): 2 chữ số thập phân (12949.33) — 4 chữ số ở đây chỉ ra đuôi rác. Còn lại giữ 4 chữ
  // số như cũ để không mất độ chính xác quen thuộc (7.0205 giữ nguyên). parseFloat cắt số 0 thừa.
  const digits = Math.abs(x) >= 1000 ? 2 : 4;
  return parseFloat(x.toFixed(digits)).toString();
}

export function runAnalysis(raw: unknown): AnalysisResult {
  const parsed = AnalysisPlanSchema.safeParse(raw);
  if (!parsed.success) return fail('?', `Invalid analysis plan: ${parsed.error.issues[0]?.message ?? 'schema'}`);
  const plan = parsed.data;
  const paramNames = plan.parameters.map((p) => p.name);

  // Dựng đáp số THỐNG NHẤT: (1) nhân hệ số đơn vị nếu đề hỏi đơn vị khác, (2) nhận-dạng-căn-đẹp trên
  // trị đã đổi đơn vị, (3) nếu không đẹp thì format thập phân gọn, (4) gắn đơn vị. approx = trị đã đổi.
  const answerScale = plan.answerScale != null ? evalExpr(String(plan.answerScale), {}) : 1;
  const answerUnit = plan.answerUnit ? ` ${plan.answerUnit}` : '';
  const mkAnswer = (val: number) => {
    const display = Number.isFinite(val) ? val * answerScale : val;
    const nice = Number.isFinite(display) ? recognizeConstant(display) : null;
    const num = nice ? nice.text : fmtNum(display);
    return { approx: display, text: num + answerUnit, approximate: !nice };
  };

  // Khớp mọi hàm khai báo tại env → map tên→hàm số để biểu thức gọi được (engine khớp, LLM không tính).
  const fitAt = (env: Env): { coeffs: Record<string, number[]>; funcs: Funcs } => {
    const coeffs: Record<string, number[]> = {};
    const funcs: Funcs = {};
    for (const fd of plan.functions) {
      const pts = fd.through.map(([px, py]) => [evalExpr(String(px), env), evalExpr(String(py), env)] as [number, number]);
      const lead = fd.leading !== undefined ? evalExpr(fd.leading, env) : undefined;
      const slopes = fd.slopeAt.map(([sx, ss]) => [evalExpr(String(sx), env), evalExpr(String(ss), env)] as [number, number]);
      const c = fitPoly(fd.degree, pts, lead, slopes);
      coeffs[fd.name] = c;
      funcs[fd.name] = (x: number) => evalPoly(c, x);
    }
    return { coeffs, funcs };
  };

  // Dựng khối tại env (số hoá mọi trường).
  const buildSolids = (env: Env): Record<string, Solid> => {
    const out: Record<string, Solid> = {};
    for (const sd of plan.solids) {
      const n = (v: number | string): number => evalExpr(String(v), env);
      out[sd.name] = sd.kind === 'cylinder'
        ? { kind: 'cylinder', cx: n(sd.center[0]), cy: n(sd.center[1]), radius: n(sd.radius), from: n(sd.from), to: n(sd.to) }
        : { kind: 'cone', cx: n(sd.center[0]), cy: n(sd.center[1]), baseRadius: n(sd.baseRadius), baseZ: n(sd.baseZ), apexZ: n(sd.apexZ) };
    }
    return out;
  };
  // Dựng FigureInput cho bài giải tích thuần tại env: hàm→coeffs (+miền x từ through), điểm oxyz_point, khối.
  const buildFigureInput = (env: Env): FigureInput => {
    const polys = fitAt(env).coeffs;
    const polyDomains: Record<string, [number, number]> = {};
    for (const fd of plan.functions) {
      const xs = fd.through.map(([px]) => evalExpr(String(px), env));
      if (xs.length > 0) polyDomains[fd.name] = [Math.min(...xs), Math.max(...xs)];
    }
    const points: { id: string; x: number; y: number; z: number }[] = [];
    for (const op of plan.ops) {
      const o = op as Record<string, unknown>;
      if (o.op === 'oxyz_point' && Array.isArray(o.at)) {
        const at = (o.at as (number | string)[]).map((c) => evalExpr(String(c), env));
        points.push({ id: String(o.name), x: at[0], y: at[1], z: at[2] ?? 0 });
      }
    }
    return { polys, polyDomains, points, solids: buildSolids(env) };
  };

  const isExprSrc = (s: unknown): s is { kind: 'expr'; expr: string } =>
    !!s && typeof s === 'object' && (s as { kind?: string }).kind === 'expr';
  const isSolidVolSrc = (s: unknown): s is { kind: 'solid_volume'; of: [string, string]; mode: 'intersection' } =>
    !!s && typeof s === 'object' && (s as { kind?: string }).kind === 'solid_volume';
  const solidVolumeAt = (env: Env, src: { of: [string, string] }): number => {
    const built = buildSolids(env);
    const a = built[src.of[0]], b = built[src.of[1]];
    if (!a) throw new Error(`Khối "${src.of[0]}" chưa khai báo trong solids`);
    if (!b) throw new Error(`Khối "${src.of[1]}" chưa khai báo trong solids`);
    return intersectionVolume(a, b).value;
  };

  // ---- integrate: thuần hàm số, không cần tham số/hình học ----
  if (plan.analyze.kind === 'integrate') {
    const az = plan.analyze;
    try {
      const { funcs } = fitAt({});
      const from = evalExpr(String(az.from), {}, funcs);
      const to = evalExpr(String(az.to), {}, funcs);
      const r = integrate((x) => evalExpr(az.integrand, { [az.variable]: x }, funcs), from, to);
      return {
        ok: true, parameter: { name: az.variable, value: NaN },
        answer: mkAnswer(r.value),
        violations: [], errors: [], geometry: buildAnalysisFigure(az.variable, buildFigureInput({})),
      };
    } catch (e) { return fail(az.variable, (e as Error).message); }
  }

  // ---- eval: tính thẳng một nguồn số (không cần tham số/hình học) ----
  if (plan.analyze.kind === 'eval') {
    const src = plan.analyze.of;
    try {
      let val: number;
      if (isSolidVolSrc(src)) val = solidVolumeAt({}, src);
      else if (isExprSrc(src)) val = evalExpr(src.expr, {}, fitAt({}).funcs);
      else return fail('-', 'analyze.eval chỉ nhận nguồn "expr" hoặc "solid_volume"');
      return {
        ok: Number.isFinite(val), parameter: { name: '-', value: NaN },
        answer: mkAnswer(val),
        violations: [], errors: [], geometry: buildAnalysisFigure(plan.solidName || 'figure', buildFigureInput({})),
      };
    } catch (e) { return fail('-', (e as Error).message); }
  }

  // ---- optimize_multi: tối ưu nhiều tham số; objective PHẢI là biểu thức (chưa hỗ trợ query hình học) ----
  if (plan.analyze.kind === 'optimize_multi') {
    const az = plan.analyze;
    const src = az.objective;
    if (!isExprSrc(src)) return fail(az.parameters.join(','), 'optimize_multi chỉ nhận objective dạng "expr"');
    const decls = az.parameters.map((nm) => plan.parameters.find((p) => p.name === nm));
    const missing = az.parameters.find((nm, i) => !decls[i]);
    if (missing) return fail(az.parameters.join(','), `parameter "${missing}" chưa khai báo`);
    try {
      const los = decls.map((d) => evalExpr(String(d!.domain[0]), {}));
      const his = decls.map((d) => evalExpr(String(d!.domain[1]), {}));
      const objective = (xs: number[]): number => {
        const env: Env = {};
        az.parameters.forEach((nm, i) => { env[nm] = xs[i]; });
        return evalExpr(src.expr, env, fitAt(env).funcs);
      };
      const best = optimizeMulti(objective, los, his, az.sense);
      const envBest: Env = {};
      az.parameters.forEach((nm, i) => { envBest[nm] = best.xs[i]; });
      return {
        ok: Number.isFinite(best.value), parameter: { name: az.parameters.join(','), value: NaN },
        answer: mkAnswer(best.value),
        violations: [], errors: [], geometry: buildAnalysisFigure(az.parameters.join(','), buildFigureInput(envBest)),
      };
    } catch (e) { return fail(az.parameters.join(','), (e as Error).message); }
  }

  const pname = plan.analyze.parameter;
  const decl = plan.parameters.find((p) => p.name === pname);
  if (!decl) return fail(pname, `parameter "${pname}" chưa khai báo`);
  const lo = evalExpr(String(decl.domain[0]), {});
  const hi = evalExpr(String(decl.domain[1]), {});

  // Thay tham số bằng số trong các op (điểm/mặt-cầu-lệch).
  const concreteOps = (value: number): unknown[] => {
    const env = { [pname]: value };
    // 1) Khớp hàm tại giá trị tham số hiện tại (engine tự khớp — LLM không tính).
    const fitted = fitAt(env).coeffs;
    const needFn = (name: string): number[] => {
      const c = fitted[name];
      if (!c) throw new Error(`Hàm "${name}" chưa khai báo trong functions`);
      return c;
    };
    // 2) Hạ op hàm → op hình học SỐ; thay tham số trong op hình học thường.
    return plan.ops.map((op) => {
      const o = op as Record<string, unknown>;
      if (o.op === 'curve_point') {
        const c = needFn(o.f as string);
        const x = evalExpr(String(o.x), env);
        return { op: 'oxyz_point', name: o.name, at: [x, evalPoly(c, x), 0] };
      }
      if (o.op === 'tangent_line') {
        const c = needFn(o.f as string);
        const x = evalExpr(String(o.x), env);
        const slope = evalPoly(derivPoly(c), x);
        return { op: 'oxyz_line', name: o.name, by: { form: 'point_dir', base: [x, evalPoly(c, x), 0], dir: [1, slope, 0] } };
      }
      if (o.op === 'curve_extremum') {
        const c = needFn(o.f as string);
        const dom = o.domain as [number | string, number | string];
        const ex = extremumOfPoly(c, evalExpr(String(dom[0]), env), evalExpr(String(dom[1]), env));
        if (!ex) throw new Error(`curve_extremum: hàm "${o.f as string}" không có cực trị trong miền`);
        return { op: 'oxyz_point', name: o.name, at: [ex.x, ex.y, 0] };
      }
      if (o.op === 'oxyz_point' && Array.isArray(o.at)) return { ...o, at: (o.at as (number | string)[]).map((c) => numify(c, env, paramNames)) };
      if (o.op === 'oxyz_circumsphere_offset') return { ...o, t: numify(o.t as number | string, env, paramNames) };
      // mp (α) dạng hệ số ax+by+cz+d=0 với hệ số là THAM SỐ (vd d='k'): thay tham số vào a,b,c,d.
      if (o.op === 'oxyz_plane' && (o.by as { form?: string })?.form === 'coeffs') {
        const by = o.by as { form: 'coeffs'; a: number | string; b: number | string; c: number | string; d: number | string };
        return { ...o, by: {
          ...by,
          a: numify(by.a, env, paramNames), b: numify(by.b, env, paramNames),
          c: numify(by.c, env, paramNames), d: numify(by.d, env, paramNames),
        } };
      }
      // Điểm chia K = a + t·(b−a) với t là THAM SỐ (vd t='s'): thay tham số vào t.
      if (o.op === 'oxyz_ratio') return { ...o, t: numify(o.t as number | string, env, paramNames) };
      return op;
    });
  };

  // Đánh giá nguồn số tại giá trị tham số (KHÔNG kèm asserts — dùng khi quét/giải). null nếu lỗi.
  const evalQuery = (value: number, src: unknown): number | null => {
    const env = { [pname]: value };
    if (isExprSrc(src)) {
      try { return evalExpr(src.expr, env, fitAt(env).funcs); } catch { return null; }
    }
    if (isSolidVolSrc(src)) {
      try { return solidVolumeAt(env, src); } catch { return null; }
    }
    let ops: unknown[];
    try { ops = concreteOps(value); } catch { return null; }
    const res = run({ solidName: plan.solidName, ops, asserts: [], queries: [src] });
    if (!res.ok || res.answers.length === 0) return null;
    try { return scalarOf(res.answers[0]); } catch { return null; }
  };

  // Tại nghiệm cuối: lấy đáp số + kiểm asserts (nếu có hình học) để tự kiểm mô hình.
  const finalize = (value: number, src: unknown): AnalysisResult => {
    const env = { [pname]: value };
    let violations: unknown[] = [];
    let errors: { message: string }[] = [];
    let val = NaN;
    let geometry: unknown = null;
    if (isExprSrc(src) || isSolidVolSrc(src)) {
      try {
        val = isSolidVolSrc(src) ? solidVolumeAt(env, src) : evalExpr(src.expr, env, fitAt(env).funcs);
      } catch (e) { return fail(pname, (e as Error).message); }
      if (plan.ops.length > 0) {
        try {
          const res = run({ solidName: plan.solidName, ops: concreteOps(value), asserts: plan.asserts, queries: [] });
          violations = res.violations; errors = res.errors.map((e) => ({ message: e.message }));
          if (res.entities.points.size > 0) geometry = entityTableToGeometryData(res.entities, plan.solidName || 'figure');
        } catch (e) { errors = [{ message: (e as Error).message }]; }
      }
    } else {
      let ops: unknown[];
      try { ops = concreteOps(value); } catch (e) { return fail(pname, (e as Error).message); }
      const res = run({ solidName: plan.solidName, ops, asserts: plan.asserts, queries: [src] });
      try { if (res.answers.length > 0) val = scalarOf(res.answers[0]); } catch { /* không trả số */ }
      violations = res.violations; errors = res.errors.map((e) => ({ message: e.message }));
      if (res.entities.points.size > 0) geometry = entityTableToGeometryData(res.entities, plan.solidName || 'figure');
    }
    return {
      ok: violations.length === 0 && errors.length === 0 && Number.isFinite(val),
      parameter: { name: pname, value },
      answer: mkAnswer(val),
      violations, errors, geometry,
    };
  };

  if (plan.analyze.kind === 'optimize') {
    const obj = plan.analyze.objective;
    const f = (x: number): number => { const v = evalQuery(x, obj); if (v === null) throw new Error('objective lỗi tại tham số'); return v; };
    let best;
    try { best = optimizeParam(f, lo, hi, plan.analyze.sense); } catch (e) { return fail(pname, (e as Error).message); }
    return finalize(best.x, obj);
  }

  // solve
  const target = evalExpr(String(plan.analyze.constraint.equals), {});
  const cof = plan.analyze.constraint.of;
  const g = (x: number): number => { const v = evalQuery(x, cof); if (v === null) throw new Error('constraint lỗi tại tham số'); return v; };
  let sol;
  try { sol = solveParam(g, target, lo, hi); } catch (e) { return fail(pname, (e as Error).message); }
  if (!sol) return fail(pname, 'không tìm được nghiệm tham số trong miền');
  return finalize(sol.x, plan.analyze.report);
}

// Dispatch: có `analyze` ⇒ runAnalysis; ngược lại run() thường.
export function runAny(raw: unknown): ReturnType<typeof run> | AnalysisResult {
  if (raw && typeof raw === 'object' && 'analyze' in (raw as object)) return runAnalysis(raw);
  return run(raw);
}
