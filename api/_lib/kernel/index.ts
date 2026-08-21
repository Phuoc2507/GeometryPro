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
export { run, RunPlanSchema, type EngineResult } from './run';
export { entityTableToGeometryData } from './entityToGeometry';
export { runAnalysis, runAny, AnalysisPlanSchema } from './analysis/runAnalysis';
// Khối tròn xoay (Advance – rev-ox): builder cần chúng qua kernel-dist (không import .ts nguồn).
export { buildAnalysisFigure } from './analysis/analysisFigure';
export { evalProfile, compileProfile, sampleProfile, revolutionVolumeDisk, buildRevolutionSolidOx, revolutionVolumeShellOy, buildRevolutionSolidOy, buildRevolutionSolidOyDisk } from './analysis/revolution';
export { sectionK, sliceStackVolume, buildSliceStack, planarArea, buildAreaRegion } from './analysis/sliceVolume';
// Vật thể tròn xoay GHÉP khúc (Advance – vessel: bình/lu/chậu). Thể tích đóng + đối chiếu tích phân số.
export { buildVesselSolid, vesselVolume, vesselSegmentVolume, validateVesselSegments, vesselProfile, sampleVesselProfile, vesselSegmentsFromMeasures } from './analysis/vessel';
export { buildPolyhedron, resolveSectionPoint, planeFrom3, sliceConvexPolyhedron, polygonArea3D, buildSectionCut } from './analysis/sectionCut';
// Parser biểu thức 1 biến — dùng bởi api/_lib/exprExpand.js (nở đường cong 'expr' của Vẽ nhanh/Vẽ kỹ).
export { parseExpr, evalExpr } from './analysis/expr';
// Engine pack đa môn (chỉ CỘNG THÊM — không đụng luồng hình học/giải tích).
// Vật lý động học lớp 10: dán đề Lý → vật chuyển động + đáp số tất định.
export { runPhysics, type PhysicsResult } from './physics/runPhysics';
export { PhysicsPlanSchema, type PhysicsPlan } from './physics/planSchema';
// Hóa vô cơ THPT: dán đề Hóa → phản ứng + hiện tượng + đáp số (namespace tránh trùng tên).
export * as chem from './chem/index';
