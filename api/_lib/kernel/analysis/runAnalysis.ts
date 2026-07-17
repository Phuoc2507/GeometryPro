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
import { optimizeParam, solveParam } from './paramsolve';
import { recognizeConstant } from './recognize';
import { fitPoly, evalPoly, derivPoly, extremumOfPoly } from './polyfit';

const NumOrExpr = z.union([z.number(), z.string()]);

// Nguồn SỐ cho mục tiêu/điều kiện: truy vấn HÌNH HỌC, hoặc BIỂU THỨC (gọi được hàm đã khai báo).
const ScalarSource = z.union([
  QueryESchema,
  z.object({ kind: z.literal('expr'), expr: z.string() }),
]);

const AnalyzeSchema = z.union([
  z.object({ kind: z.literal('optimize'), parameter: z.string(), sense: z.enum(['max', 'min']), objective: ScalarSource }),
  z.object({
    kind: z.literal('solve'), parameter: z.string(),
    constraint: z.object({ of: ScalarSource, equals: NumOrExpr }),
    report: ScalarSource,
  }),
  z.object({ kind: z.literal('integrate'), variable: z.string(), from: NumOrExpr, to: NumOrExpr, integrand: z.string() }),
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
  })).default([]),
  analyze: AnalyzeSchema,
});
export type AnalysisPlan = z.infer<typeof AnalysisPlanSchema>;

export type AnalysisResult = {
  ok: boolean;
  parameter: { name: string; value: number };
  answer: { approx: number; text: string; approximate: boolean };
  violations: unknown[];
  errors: { message: string }[];
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

export function runAnalysis(raw: unknown): AnalysisResult {
  const parsed = AnalysisPlanSchema.safeParse(raw);
  if (!parsed.success) return fail('?', `Invalid analysis plan: ${parsed.error.issues[0]?.message ?? 'schema'}`);
  const plan = parsed.data;
  const paramNames = plan.parameters.map((p) => p.name);

  // Khớp mọi hàm khai báo tại env → map tên→hàm số để biểu thức gọi được (engine khớp, LLM không tính).
  const fitAt = (env: Env): { coeffs: Record<string, number[]>; funcs: Funcs } => {
    const coeffs: Record<string, number[]> = {};
    const funcs: Funcs = {};
    for (const fd of plan.functions) {
      const pts = fd.through.map(([px, py]) => [evalExpr(String(px), env), evalExpr(String(py), env)] as [number, number]);
      const lead = fd.leading !== undefined ? evalExpr(fd.leading, env) : undefined;
      const c = fitPoly(fd.degree, pts, lead);
      coeffs[fd.name] = c;
      funcs[fd.name] = (x: number) => evalPoly(c, x);
    }
    return { coeffs, funcs };
  };

  // ---- integrate: thuần hàm số, không cần tham số/hình học ----
  if (plan.analyze.kind === 'integrate') {
    const az = plan.analyze;
    try {
      const { funcs } = fitAt({});
      const from = evalExpr(String(az.from), {}, funcs);
      const to = evalExpr(String(az.to), {}, funcs);
      const r = integrate((x) => evalExpr(az.integrand, { [az.variable]: x }, funcs), from, to);
      const nice = recognizeConstant(r.value);
      return {
        ok: true, parameter: { name: az.variable, value: NaN },
        answer: { approx: r.value, text: nice ? nice.text : r.value.toFixed(4), approximate: !nice },
        violations: [], errors: [],
      };
    } catch (e) { return fail(az.variable, (e as Error).message); }
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
      return op;
    });
  };

  const isExprSrc = (s: unknown): s is { kind: 'expr'; expr: string } =>
    !!s && typeof s === 'object' && (s as { kind?: string }).kind === 'expr';

  // Đánh giá nguồn số tại giá trị tham số (KHÔNG kèm asserts — dùng khi quét/giải). null nếu lỗi.
  const evalQuery = (value: number, src: unknown): number | null => {
    const env = { [pname]: value };
    if (isExprSrc(src)) {
      try { return evalExpr(src.expr, env, fitAt(env).funcs); } catch { return null; }
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
    if (isExprSrc(src)) {
      try { val = evalExpr(src.expr, env, fitAt(env).funcs); } catch (e) { return fail(pname, (e as Error).message); }
      if (plan.ops.length > 0) {
        try {
          const res = run({ solidName: plan.solidName, ops: concreteOps(value), asserts: plan.asserts, queries: [] });
          violations = res.violations; errors = res.errors.map((e) => ({ message: e.message }));
        } catch (e) { errors = [{ message: (e as Error).message }]; }
      }
    } else {
      let ops: unknown[];
      try { ops = concreteOps(value); } catch (e) { return fail(pname, (e as Error).message); }
      const res = run({ solidName: plan.solidName, ops, asserts: plan.asserts, queries: [src] });
      try { if (res.answers.length > 0) val = scalarOf(res.answers[0]); } catch { /* không trả số */ }
      violations = res.violations; errors = res.errors.map((e) => ({ message: e.message }));
    }
    const nice = Number.isFinite(val) ? recognizeConstant(val) : null;
    return {
      ok: violations.length === 0 && errors.length === 0 && Number.isFinite(val),
      parameter: { name: pname, value },
      answer: { approx: val, text: nice ? nice.text : (Number.isFinite(val) ? val.toFixed(4) : '(lỗi)'), approximate: !nice },
      violations, errors,
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
