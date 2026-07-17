// api/_lib/kernel/analysis/runAnalysis.ts
// Entry GIẢI TÍCH: bọc ngoài run() — LLM khai báo hình có 1 tham số tự do + mục tiêu/điều kiện;
// engine thay tham số bằng số, chạy run() (hình học số), đọc truy vấn, rồi tối ưu/giải theo tham số.
// KHÔNG sửa run(). Chống ảo giác: engine tính, LLM chỉ khai báo.
import { z } from 'zod';
import { run, RunPlanSchema } from '../run';
import { QueryESchema } from '../compute/query';
import { evalExpr } from './expr';
import { optimizeParam, solveParam } from './paramsolve';
import { recognizeConstant } from './recognize';

const NumOrExpr = z.union([z.number(), z.string()]);

const AnalyzeSchema = z.union([
  z.object({ kind: z.literal('optimize'), parameter: z.string(), sense: z.enum(['max', 'min']), objective: QueryESchema }),
  z.object({
    kind: z.literal('solve'), parameter: z.string(),
    constraint: z.object({ of: QueryESchema, equals: NumOrExpr }),
    report: QueryESchema,
  }),
]);

export const AnalysisPlanSchema = RunPlanSchema.extend({
  parameters: z.array(z.object({ name: z.string(), domain: z.tuple([NumOrExpr, NumOrExpr]) })).min(1),
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
  const pname = plan.analyze.parameter;
  const paramNames = plan.parameters.map((p) => p.name);
  const decl = plan.parameters.find((p) => p.name === pname);
  if (!decl) return fail(pname, `parameter "${pname}" chưa khai báo`);
  const lo = evalExpr(String(decl.domain[0]), {});
  const hi = evalExpr(String(decl.domain[1]), {});

  // Dựng plan CỤ THỂ tại giá trị tham số + một truy vấn mục tiêu; trả số của truy vấn (hoặc null nếu lỗi).
  const evalQuery = (value: number, query: unknown): number | null => {
    const env = { [pname]: value };
    const ops = plan.ops.map((op) => {
      const o = op as Record<string, unknown>;
      if (o.op === 'oxyz_point' && Array.isArray(o.at)) return { ...o, at: (o.at as (number | string)[]).map((c) => numify(c, env, paramNames)) };
      if (o.op === 'oxyz_circumsphere_offset') return { ...o, t: numify(o.t as number | string, env, paramNames) };
      return op;
    });
    const res = run({ solidName: plan.solidName, ops, asserts: [], queries: [query] });
    if (!res.ok || res.answers.length === 0) return null;
    try { return scalarOf(res.answers[0]); } catch { return null; }
  };

  if (plan.analyze.kind === 'optimize') {
    const obj = plan.analyze.objective;
    const f = (x: number): number => { const v = evalQuery(x, obj); if (v === null) throw new Error('objective lỗi tại tham số'); return v; };
    let best;
    try { best = optimizeParam(f, lo, hi, plan.analyze.sense); } catch (e) { return fail(pname, (e as Error).message); }
    const nice = recognizeConstant(best.value);
    return { ok: true, parameter: { name: pname, value: best.x }, answer: { approx: best.value, text: nice ? nice.text : best.value.toFixed(4), approximate: !nice }, violations: [], errors: [] };
  }

  // solve
  const target = evalExpr(String(plan.analyze.constraint.equals), {});
  const cof = plan.analyze.constraint.of;
  const g = (x: number): number => { const v = evalQuery(x, cof); if (v === null) throw new Error('constraint lỗi tại tham số'); return v; };
  let sol;
  try { sol = solveParam(g, target, lo, hi); } catch (e) { return fail(pname, (e as Error).message); }
  if (!sol) return fail(pname, 'không tìm được nghiệm tham số trong miền');
  const reported = evalQuery(sol.x, plan.analyze.report);
  if (reported === null) return fail(pname, 'report query lỗi tại nghiệm');
  const nice = recognizeConstant(reported);
  return { ok: true, parameter: { name: pname, value: sol.x }, answer: { approx: reported, text: nice ? nice.text : reported.toFixed(4), approximate: !nice }, violations: [], errors: [] };
}

// Dispatch: có `analyze` ⇒ runAnalysis; ngược lại run() thường.
export function runAny(raw: unknown): ReturnType<typeof run> | AnalysisResult {
  if (raw && typeof raw === 'object' && 'analyze' in (raw as object)) return runAnalysis(raw);
  return run(raw);
}
