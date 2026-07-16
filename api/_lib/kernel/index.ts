import { PlanSchema, type Plan } from './planSchema';
import { executePlan } from './execute';
import { verifyPlan } from './verify';
import { toGeometryData } from './toGeometryData';
import { Trace } from './trace';
import type { SymbolTable, VerifyResult } from './types';
import type { GeometryData } from '../../../src/types/geometry';

export type KernelRunResult = {
  plan: Plan;
  symtab: SymbolTable;
  geometry: GeometryData;
  verify: VerifyResult;
  trace: Trace;
};

export function runPlan(rawPlan: unknown): KernelRunResult {
  const trace = new Trace();
  const plan = PlanSchema.parse(rawPlan);
  trace.log('execute', `Executing plan "${plan.solidName}" with ${plan.ops.length} ops`);
  const symtab = executePlan(plan);
  trace.log('execute', `Executed successfully: ${symtab.points.size} points defined`);
  const verify = verifyPlan(plan, symtab);
  trace.log('verify', `Verification ${verify.ok ? 'passed' : 'failed'}: ${verify.violations.length} violation(s)`);
  const geometry = toGeometryData(symtab, plan.solidName);
  return { plan, symtab, geometry, verify, trace };
}

export * from './planSchema';
export * from './types';
export * from './exactForm';
export { verifyPlan, verifyAssert, checkDegeneracy } from './verify';
export { attemptDeterministicRepair, REPAIR_MAX_RELATIVE_ERROR, REPAIR_MAX_PERP_ERROR } from './repair';
export { executePlan, executeOp, createEmptySymbolTable } from './execute';
export { resolveEntity } from './resolve';
export { toGeometryData } from './toGeometryData';
export { Trace } from './trace';
