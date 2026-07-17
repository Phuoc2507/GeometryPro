// api/_lib/kernel/run.ts
import { z } from 'zod';
import { UnifiedOpSchema, executeUnifiedPlan } from './unifiedPlan';
import { AssertOpSchema } from './planSchema';
import { QueryESchema, computeQuery, type QueryAnswer } from './compute/query';
import { verifyAssertE } from './verifyE';
import { type EntityTable, createEmptyEntityTable } from './entityTable';
import type { Violation } from './types';

export const RunPlanSchema = z.object({
  solidName: z.string().min(1),
  ops: z.array(UnifiedOpSchema).min(1),
  asserts: z.array(AssertOpSchema).default([]),
  queries: z.array(QueryESchema).default([]),
});

export type RunPlan = z.infer<typeof RunPlanSchema>;
export type EngineError = { message: string };
export type EngineResult = {
  ok: boolean;
  entities: EntityTable;
  answers: QueryAnswer[];
  violations: Violation[];
  errors: EngineError[];
  trace: string[];
};

// Entrypoint hợp nhất. Không bao giờ ném với plan hợp lệ schema — mọi hỏng hóc thành
// violations/errors có cấu trúc.
export function run(rawPlan: unknown): EngineResult {
  const trace: string[] = [];
  const errors: EngineError[] = [];
  const violations: Violation[] = [];
  const answers: QueryAnswer[] = [];

  const parsed = RunPlanSchema.safeParse(rawPlan);
  if (!parsed.success) {
    return { ok: false, entities: createEmptyEntityTable(), answers, violations, errors: [{ message: `Invalid plan: ${parsed.error.issues[0]?.message ?? 'schema error'}` }], trace };
  }
  const plan = parsed.data;

  let entities: EntityTable;
  try {
    entities = executeUnifiedPlan(plan);
    trace.push(`executed ${plan.ops.length} ops, ${entities.points.size} points`);
  } catch (e) {
    return { ok: false, entities: createEmptyEntityTable(), answers, violations, errors: [{ message: (e as Error).message }], trace };
  }

  for (const assert of plan.asserts) {
    try {
      const v = verifyAssertE(assert, entities);
      if (v) violations.push(v);
    } catch (e) {
      errors.push({ message: `assert ${assert.relation}(${assert.args.join(',')}): ${(e as Error).message}` });
    }
  }
  trace.push(`verified ${plan.asserts.length} asserts, ${violations.length} violation(s)`);

  for (const query of plan.queries) {
    const r = computeQuery(query, entities);
    if (r.ok) answers.push(r.answer);
    else errors.push({ message: `query ${query.kind}: ${r.problem}` });
  }
  trace.push(`computed ${answers.length}/${plan.queries.length} queries`);

  return { ok: violations.length === 0 && errors.length === 0, entities, answers, violations, errors, trace };
}
