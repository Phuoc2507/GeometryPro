// api/_lib/kernel/chem/index.ts
// Bề mặt công khai của chem pack v0 (review F13: chem-pack-design thắng; có index.ts
// để route/bridge v1 import một chỗ). KHÔNG import ngược từ core kernel vào đây.
export { runChem } from './runChem';
export type { ChemResult, ChemAnswer, ChemLedgerEntry } from './runChem';
export { ChemPlanSchema } from './planSchema';
export type { ChemPlan, ChemQuery, ChemAssert, SpeciesOp, MixOp } from './planSchema';
export { REACTIONS, ACTIVITY_SERIES, IONS, findReactions, explainNoReaction, classifyNoMatch, solubilityOf } from './reactionDB';
export type { ReactionRecord, ReactionDomain, SpeciesState, Variant } from './reactionDB';
export { balance } from './balance';
export { parseFormula, molarMass, isHydrate } from './formula';
export { atomicMassOf, ATOMIC_MASS } from './atomicMass';
export { MOLAR_VOLUMES, amountToMol, react } from './stoich';
export type { LedgerRow, Violation } from './stoich';
export { COLORS, colorOf, buildScene } from './scene';
export type { ChemScene, ChemSceneEvent } from './scene';
export { rat, parseDecimal, ratToString, ratApprox } from './rat';
export type { Rat } from './rat';
