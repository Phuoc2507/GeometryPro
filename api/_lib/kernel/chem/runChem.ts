// api/_lib/kernel/chem/runChem.ts
// Entrypoint engine Hóa v0 (spec chem §10): ChemPlan JSON → {reactions, ledger, answers,
// scene, violations, errors, trace}. LLM chỉ DỊCH đề thành plan; engine tra DB đóng,
// tính hữu tỉ exact, tự kiểm 2 định luật bảo toàn — KHÔNG bao giờ suy diễn phản ứng mới,
// KHÔNG bao giờ throw (mọi lỗi trả về qua errors[]).
// Review đã áp tại tầng này: F2 (error nước-trước), F8 (C% trừ chất rắn dư), F10 (tol
// tương đối 1e-3 cho asserts dữ kiện đề), F20 (bảng luật suy state tường minh),
// F21 (chia 0 CM → error), F23, F24 (scene), F26 (error chuẩn), §16.7 (cần đun nóng nhẹ).
import { z } from 'zod';
import { ChemPlanSchema, type ChemPlan, type ChemQuery, type SpeciesOp } from './planSchema';
import { parseFormula, isHydrate, molarMass } from './formula';
import {
  REACTIONS, findMatches, classifyNoMatch, METALS, IONS, solubilityOf,
  type ReactionRecord, type SpeciesState, type Variant,
} from './reactionDB';
import { MOLAR_VOLUMES, amountToMol, parsePositive, react, type LedgerRow, type Violation } from './stoich';
import { buildScene, EMPTY_SCENE, type ChemScene, type SceneSpeciesInput } from './scene';
import {
  type Rat, R0, rat, addR, subR, mulR, divR, cmpR, absR, isZeroR, parseDecimal, ratToString, ratApprox,
} from './rat';

export type ChemAnswer = {
  query: unknown;
  exact: string | null;
  approx: number | null;
  unit: string;
  text: string;
};

export type ChemLedgerEntry = {
  formula: string;
  state: SpeciesState;
  before: string | null; // hữu tỉ "1/10"; null = ∞ (excess)
  consumed: string;
  produced: string;
  after: string | null;
  excess: boolean;
};

export type ChemResult = {
  ok: boolean;
  reactions: { id: string; equation: string; coefficients: number[] }[];
  noReaction?: { reason: string };
  ledger: ChemLedgerEntry[];
  answers: ChemAnswer[];
  scene: ChemScene;
  violations: Violation[];
  errors: { message: string }[];
  trace: string[];
};

// ── Suy trạng thái (bảng luật TƯỜNG MINH — review F20) ───────────────────────
// 1. state khai tường minh → dùng.
// 2. amount solution/solution_percent → solution; liters_gas → gas (phải thuộc GAS_SET).
// 3. formula ∈ GAS_SET (danh sách khí đóng) → gas; H2O → liquid.
// 4. axit thông dụng {HCl, H2SO4, HNO3} → solution (dung dịch axit).
// 5. kim loại đơn chất → solid; phi kim rắn {S, C, P, Si} → solid.
// 6. oxit (2 nguyên tố, có O, không thuộc GAS_SET) → solid.
// 7. hợp chất ion KHÔNG TAN (bảng §8.3) → solid.
// 8. còn lại (muối tan/ít tan hoặc hợp chất ngoài tầng ion): nếu mix có dung dịch
//    → MƠ HỒ, bắt LLM khai state (error); nếu mix khô hoàn toàn → solid (chất cân được).
const GAS_SET = new Set(['H2', 'O2', 'N2', 'Cl2', 'CO', 'CO2', 'SO2', 'SO3', 'NO', 'NO2', 'NH3']);
const ACID_SOLUTIONS = new Set(['HCl', 'H2SO4', 'HNO3']);
const SOLID_NONMETALS = new Set(['S', 'C', 'P', 'Si']);

type SpeciesInfo = {
  formula: string;
  variant?: Variant;
  state: SpeciesState;
  excess: boolean;
  qualitative: boolean;
  mol: Rat | null;
  pouredMassG: Rat | null; // khối lượng ĐỔ VÀO (cho C%); solution_percent = cả khối dd
  pouredMassUnknownWhy?: string;
  solutionVolumeL: Rat | null; // chỉ khi amount.solution
  amountText?: string;
};

function inferFixedState(op: SpeciesOp): SpeciesState | null {
  if (op.state) return op.state;
  const amount = op.amount;
  if (amount && ('solution' in amount || 'solution_percent' in amount)) return 'solution';
  if (amount && 'liters_gas' in amount) return 'gas'; // GAS_SET kiểm ở caller
  const f = op.formula;
  if (GAS_SET.has(f)) return 'gas';
  if (f === 'H2O') return 'liquid';
  if (ACID_SOLUTIONS.has(f)) return 'solution';
  if (METALS.has(f)) return 'solid';
  if (SOLID_NONMETALS.has(f)) return 'solid';
  try {
    const counts = parseFormula(f);
    if (counts.size === 2 && counts.has('O')) return 'solid'; // oxit rắn
  } catch {
    return null; // lỗi formula xử lý nơi khác
  }
  const io = IONS[f];
  if (io && solubilityOf(io.cation, io.anion) === 'khong_tan') return 'solid';
  return null; // chưa chốt được — sang bước mơ-hồ
}

function fmtVN(x: number, maxDp = 4): string {
  const factor = 10 ** maxDp;
  const rounded = Math.round(x * factor) / factor;
  let s = rounded.toString();
  if (/e/i.test(s)) s = rounded.toFixed(maxDp);
  return s.replace('.', ',');
}

function equationOf(record: ReactionRecord): string {
  const c = (n: number) => (n > 1 ? String(n) : '');
  const lhs = record.reactants.map((x) => `${c(x.coeff)}${x.formula}`).join(' + ');
  const rhs = record.products
    .map((x) => {
      const mark = x.state === 'gas' ? '↑' : x.state === 'solid' && record.medium === 'dd' ? '↓' : '';
      return `${c(x.coeff)}${x.formula}${mark}`;
    })
    .join(' + ');
  return `${lhs} → ${rhs}`;
}

// Gom message từ ZodError, đào xuyên các invalid_union để lộ message tùy chỉnh (F22).
function zodMessages(err: z.ZodError): string[] {
  const out: string[] = [];
  const walk = (issues: z.ZodIssue[]) => {
    for (const issue of issues) {
      if (issue.code === z.ZodIssueCode.invalid_union) {
        for (const ue of issue.unionErrors) walk(ue.issues);
      } else {
        out.push(`${issue.path.join('.')}${issue.path.length ? ': ' : ''}${issue.message}`);
      }
    }
  };
  walk(err.issues);
  // Ưu tiên message tùy chỉnh (custom) — chúng mang lý do thật (>0, phân cách nghìn…).
  const custom = out.filter((m) => !/^.*(Invalid|Required|Expected)/.test(m));
  return custom.length > 0 ? custom : out;
}

type EnrichedRow = LedgerRow & { state: SpeciesState };

export function runChem(input: unknown): ChemResult {
  const trace: string[] = [];
  const errors: { message: string }[] = [];
  const violations: Violation[] = [];
  const bail = (msg: string, scene: ChemScene = EMPTY_SCENE): ChemResult => {
    errors.push({ message: msg });
    return { ok: false, reactions: [], ledger: [], answers: [], scene, violations, errors, trace };
  };

  // 1) safeParse — plan hỏng trả lỗi, không throw.
  const parsed = ChemPlanSchema.safeParse(input);
  if (!parsed.success) {
    return bail(`ChemPlan không hợp lệ: ${zodMessages(parsed.error).join('; ')}`);
  }
  const plan: ChemPlan = parsed.data;
  const vm = MOLAR_VOLUMES[plan.molarVolume];
  const vmLabel = plan.molarVolume === 22.4 ? 'đktc, 22,4 L/mol' : 'đkc, 24,79 L/mol';

  const speciesOps = plan.ops.filter((o): o is SpeciesOp => o.op === 'species');
  const mixOps = plan.ops.filter((o) => o.op === 'mix');
  if (mixOps.length > 1) return bail('v0 chỉ hỗ trợ đúng MỘT op mix — trộn tuần tự nhiều mix là tính năng v1');
  const mixOp = mixOps[0] as { op: 'mix'; of?: string[]; heated: boolean } | undefined;
  if (mixOp?.of) return bail('mix.of (trộn theo danh sách/tuần tự) là tính năng v1 — v0 luôn trộn tất cả species');
  const heated = mixOp?.heated ?? false;
  if (speciesOps.length === 0) return bail('plan không khai chất nào (op species)');

  // 2) Parse công thức + lượng chất.
  const infos: SpeciesInfo[] = [];
  const seenFormulas = new Set<string>();
  for (const op of speciesOps) {
    try {
      parseFormula(op.formula);
    } catch (e) {
      return bail(e instanceof Error ? e.message : String(e));
    }
    if (seenFormulas.has(op.formula)) return bail(`chất "${op.formula}" khai trùng — v0 mỗi chất một dòng species`);
    seenFormulas.add(op.formula);
    if (mixOp && isHydrate(op.formula)) {
      return bail(`hydrat "${op.formula}" chưa hỗ trợ phản ứng ở v0 (chỉ tính M/đổi đơn vị khi không mix)`);
    }
    const amount = op.amount;
    const excess = !!amount && 'excess' in amount;
    const qualitative = !amount;
    let mol: Rat | null = null;
    let pouredMassG: Rat | null = null;
    let pouredMassUnknownWhy: string | undefined;
    let solutionVolumeL: Rat | null = null;
    let amountText: string | undefined;
    if (amount && !excess) {
      try {
        mol = amountToMol(op.formula, amount, vm);
        if ('grams' in amount) {
          pouredMassG = parsePositive(amount.grams, 'khối lượng');
          amountText = `${fmtVN(ratApprox(pouredMassG))} g`;
        } else if ('mol' in amount) {
          pouredMassG = mulR(mol, molarMass(op.formula));
          amountText = `${fmtVN(ratApprox(mol))} mol`;
        } else if ('liters_gas' in amount) {
          if (!GAS_SET.has(op.formula)) {
            return bail(`"${op.formula}" khai liters_gas nhưng không thuộc danh sách khí đóng — kiểm tra lại đề/plan`);
          }
          pouredMassG = mulR(mol, molarMass(op.formula));
          amountText = `${fmtVN(ratApprox(parsePositive(amount.liters_gas, 'V')))} L khí`;
        } else if ('solution' in amount) {
          solutionVolumeL = parsePositive(amount.solution.liters, 'thể tích dung dịch');
          pouredMassUnknownWhy = `dung dịch ${op.formula} khai theo CM×V — không rõ khối lượng dung dịch`;
          amountText = `${fmtVN(ratApprox(solutionVolumeL))} L dd`;
        } else if ('solution_percent' in amount) {
          pouredMassG = parsePositive(amount.solution_percent.massGrams, 'khối lượng dung dịch');
          amountText = `${fmtVN(ratApprox(pouredMassG))} g dd`;
        }
      } catch (e) {
        return bail(e instanceof Error ? e.message : String(e));
      }
    }
    if (excess) amountText = 'dư';
    infos.push({
      formula: op.formula,
      variant: op.variant,
      state: 'solid', // tạm — gán thật ở bước suy state dưới
      excess,
      qualitative,
      mol,
      pouredMassG,
      pouredMassUnknownWhy,
      solutionVolumeL,
      amountText,
    });
  }

  // 3) Suy state theo bảng luật F20 (2 lượt: cố định trước, mơ hồ sau).
  const fixedStates = speciesOps.map((op) => inferFixedState(op));
  const mixHasSolutionOrLiquid = fixedStates.some((s) => s === 'solution' || s === 'liquid');
  for (let i = 0; i < infos.length; i++) {
    const st = fixedStates[i];
    if (st) {
      infos[i].state = st;
      continue;
    }
    const io = IONS[infos[i].formula];
    if (infos[i].excess && io && solubilityOf(io.cation, io.anion) === 'tan') {
      // Muối tan khai DƯ (excess) → nghĩa duy nhất hợp lý là "dung dịch X dư".
      infos[i].state = 'solution';
      trace.push(`state(${infos[i].formula}) = solution (muối tan khai excess, luật F20)`);
      continue;
    }
    if (mixHasSolutionOrLiquid) {
      return bail(
        `trạng thái (state) của "${infos[i].formula}" MƠ HỒ: muối tan có thể là chất rắn khan hoặc dung dịch — LLM phải khai state tường minh cho species này (luật F20)`
      );
    }
    infos[i].state = 'solid';
    trace.push(`state(${infos[i].formula}) = solid (mix khô, suy theo luật F20)`);
  }

  const sceneSpecies: SceneSpeciesInput[] = infos.map((s) => ({
    formula: s.formula,
    state: s.state,
    excess: s.excess,
    amountText: s.amountText,
  }));
  const staticScene = () => buildScene({ species: sceneSpecies, record: null, ledger: null, heated, noReactionReason: undefined });

  const mols = new Map<string, Rat>();
  for (const s of infos) if (s.mol) mols.set(s.formula, s.mol);
  const excessSet = new Set(infos.filter((s) => s.excess).map((s) => s.formula));
  const qualitativeMode = infos.some((s) => s.qualitative);

  // ── Chế độ KHÔNG mix: chỉ đổi đơn vị từng chất (spec §10) ──────────────────
  if (!mixOp) {
    const ledgerRows: EnrichedRow[] = infos.map((s) => ({
      formula: s.formula,
      role: 'reactant',
      coeff: 0,
      before: s.excess ? null : s.mol,
      consumed: R0,
      produced: R0,
      after: s.excess ? null : s.mol,
      excess: s.excess,
      state: s.state,
    }));
    const answers = answerQueries(plan.queries, {
      rows: ledgerRows, infos, record: null, noReason: null, vm, vmLabel, errors, trace, qualitativeMode,
    });
    return {
      ok: errors.length === 0, reactions: [], ledger: serializeLedger(ledgerRows), answers,
      scene: staticScene(), violations, errors, trace,
    };
  }

  // ── Chế độ mix ─────────────────────────────────────────────────────────────
  const speciesKeys = infos.map((s) => ({ formula: s.formula, variant: s.variant, state: s.state }));
  const { matches, heatMisses } = findMatches(speciesKeys, { heated });
  trace.push(`findReactions: ${matches.map((m) => m.id).join(', ') || '(không khớp)'}${heatMisses.length ? `; thiếu t°: ${heatMisses.map((m) => m.id).join(', ')}` : ''}`);

  if (matches.length === 0) {
    if (heatMisses.length > 0) {
      // §16.7: R38 không đun → "cần đun nóng nhẹ"; các record t° khác → cần đun nóng.
      const soft = heatMisses.some((m) => m.id === 'R38');
      const ids = heatMisses.map((m) => `${m.id} (${equationOf(m)})`).join('; ');
      return bail(
        soft
          ? `phản ứng cần đun nóng nhẹ: ${ids} — mix.heated đang là false; KHÔNG kết luận "không phản ứng" và tuyệt đối không có "kết tủa NH4OH"`
          : `phản ứng cần đun nóng (t°): ${ids} — mix.heated đang là false`,
        staticScene()
      );
    }
    const verdictInfo = classifyNoMatch(speciesKeys, { heated });
    if (verdictInfo?.verdict === 'no_reaction') {
      // Không phản ứng CÓ LÝ DO — trả kết quả với ledger nguyên trạng.
      const rows: EnrichedRow[] = infos.map((s) => ({
        formula: s.formula, role: 'reactant', coeff: 0,
        before: s.excess ? null : s.mol, consumed: R0, produced: R0,
        after: s.excess ? null : s.mol, excess: s.excess, state: s.state,
      }));
      const answers = answerQueries(plan.queries, {
        rows, infos, record: null, noReason: verdictInfo.reason, vm, vmLabel, errors, trace, qualitativeMode,
      });
      const scene = buildScene({ species: sceneSpecies, record: null, ledger: null, heated, noReactionReason: verdictInfo.reason });
      return {
        ok: errors.length === 0,
        reactions: [],
        noReaction: { reason: verdictInfo.reason },
        ledger: serializeLedger(rows),
        answers, scene, violations, errors, trace,
      };
    }
    if (verdictInfo?.verdict === 'out_of_scope') return bail(verdictInfo.reason, staticScene());
    const names = infos.map((s) => s.formula).join(' + ');
    return bail(`không có record nào trong DB khớp {${names}} và guard không giải thích được — ngoài phạm vi DB v0`, staticScene());
  }
  if (matches.length >= 2) {
    return bail(`đa phản ứng: tập chất khớp đồng thời ${matches.map((m) => m.id).join(', ')} — ngoài phạm vi v0, engine không tự chọn`, staticScene());
  }

  const record = matches[0];
  trace.push(`record ${record.id}: ${equationOf(record)}`);

  // ── CAO-1: chống "spectator ẩn" ────────────────────────────────────────────
  // Record chỉ khớp TẬP CON species ⇒ phần thừa (spectator) KHÔNG được mặc nhiên coi là trơ.
  // Phải CHỨNG MINH TRƠ trước khi cho đi tiếp, nếu không engine sẽ dạy sai kèm dấu kiểm chứng
  // (vd Al + Fe + CuSO4 → chỉ khớp R20 (Fe+CuSO4) → trả 6,4g Cu, giấu mất Al hoạt động hơn).
  const spectatorError = checkSpectatorsInert(record, speciesKeys, heated);
  if (spectatorError) return bail(spectatorError, staticScene());

  // ── Định tính: chỉ phenomena/equation; vẫn enforce requireExcess (F5) ──────
  if (qualitativeMode) {
    const domainError = checkQualitativeDomain(record, excessSet);
    if (domainError) return bail(domainError, staticScene());
    const rows: EnrichedRow[] = infos.map((s) => ({
      formula: s.formula, role: 'reactant', coeff: 0,
      before: s.excess ? null : s.mol, consumed: R0, produced: R0,
      after: s.excess ? null : s.mol, excess: s.excess, state: s.state,
    }));
    const answers = answerQueries(plan.queries, {
      rows, infos, record, noReason: null, vm, vmLabel, errors, trace, qualitativeMode: true,
    });
    const scene = buildScene({
      species: sceneSpecies, record,
      ledger: qualitativeLedger(record, infos), heated,
    });
    return {
      ok: errors.length === 0,
      reactions: [{ id: record.id, equation: equationOf(record), coefficients: [...record.reactants.map((x) => x.coeff), ...record.products.map((x) => x.coeff)] }],
      ledger: serializeLedger(rows),
      answers, scene, violations, errors, trace,
    };
  }

  // ── Định lượng: react() — domain guard enforce TRƯỚC, rồi bảo toàn exact ───
  const outcome = react(record, mols, excessSet);
  if (!outcome.ok) {
    if (outcome.outOfScope) return bail(outcome.outOfScope.message, staticScene());
    violations.push(...outcome.violations);
    errors.push({ message: 'tự kiểm bảo toàn thất bại — không trả đáp số (xem violations)' });
    return { ok: false, reactions: [], ledger: [], answers: [], scene: staticScene(), violations, errors, trace };
  }
  trace.push(`ξ = ${ratToString(outcome.xi)} mol`);

  const stateBySpecies = new Map(infos.map((s) => [s.formula, s.state]));
  const stateByProduct = new Map(record.products.map((pp) => [pp.formula, pp.state]));
  const rows: EnrichedRow[] = outcome.ledger.map((row) => ({
    ...row,
    state: row.role === 'product' ? stateByProduct.get(row.formula)! : stateBySpecies.get(row.formula) ?? 'solid',
  }));

  // Asserts dữ kiện ĐỀ (F10: tol tương đối, default 1e-3; nội bộ vẫn exact).
  for (const as of plan.asserts) {
    const isMass = as.kind === 'given_mass';
    const row = rows.find((rr) => rr.formula === as.of);
    if (!row) {
      errors.push({ message: `assert ${as.kind}: chất "${as.of}" không có trong sổ cái phản ứng` });
      continue;
    }
    if (row.after === null) {
      errors.push({ message: `assert ${as.kind}: "${as.of}" được khai dư (excess) — lượng vô hạn, không đối chiếu được` });
      continue;
    }
    let given: Rat;
    try {
      given = parsePositive(isMass ? (as as { grams: number | string }).grams : (as as { mol: number | string }).mol, `giá trị assert ${as.of}`);
    } catch (e) {
      errors.push({ message: e instanceof Error ? e.message : String(e) });
      continue;
    }
    const computed = isMass ? mulR(row.after, molarMass(as.of)) : row.after;
    const tolR = parseDecimal(as.tol ?? 0.001);
    const diff = absR(subR(computed, given));
    const limit = mulR(tolR, absR(given));
    if (cmpR(diff, limit) > 0) {
      violations.push({
        law: `${as.kind} ${as.of}`,
        detail: `đề cho ${isMass ? 'm' : 'n'}(${as.of}) = ${ratToString(given)}${isMass ? ' g' : ' mol'} nhưng engine tính được ${ratToString(computed)}${isMass ? ' g' : ' mol'} (lệch quá tol tương đối ${as.tol ?? 0.001}) — mô hình hóa sai đâu đó, không trả đáp số`,
      });
    } else {
      trace.push(`assert ${as.kind}(${as.of}) khớp: ${ratToString(computed)} ≈ ${ratToString(given)} (tol ${as.tol ?? 0.001})`);
    }
  }
  if (violations.length > 0) {
    return {
      ok: false,
      reactions: [{ id: record.id, equation: equationOf(record), coefficients: [...record.reactants.map((x) => x.coeff), ...record.products.map((x) => x.coeff)] }],
      ledger: serializeLedger(rows),
      answers: [], // không trả đáp số khi mô hình lệch dữ kiện đề (bài 11)
      scene: staticScene(),
      violations, errors, trace,
    };
  }

  const answers = answerQueries(plan.queries, {
    rows, infos, record, noReason: null, vm, vmLabel, errors, trace, qualitativeMode: false,
  });
  const scene = buildScene({ species: sceneSpecies, record, ledger: outcome.ledger, heated });
  return {
    ok: errors.length === 0,
    reactions: [{ id: record.id, equation: equationOf(record), coefficients: [...record.reactants.map((x) => x.coeff), ...record.products.map((x) => x.coeff)] }],
    ledger: serializeLedger(rows),
    answers, scene, violations, errors, trace,
  };
}

// ── CAO-1: kiểm mọi spectator (species ngoài record) có THỰC SỰ trơ không ──────
// Với MỖI spectator, ghép cặp với TỪNG chất còn lại trong mix:
//   • cặp khớp một record khác (findMatches ≥ 1) → ĐA PHẢN ỨNG, engine không tự chọn → bail;
//   • classifyNoMatch cặp KHÔNG trả 'no_reaction' (tức out_of_scope hoặc null) → chất có thể
//     phản ứng nhưng chưa mô hình hóa → NGOÀI PHẠM VI v0 → bail.
// Chỉ giữ role trơ khi MỌI cặp đều "không phản ứng CÓ LÝ DO".
//
// QUYẾT ĐỊNH THIẾT KẾ — tập "chất còn lại" = các species KHÁC trong mix (reactant của record +
// spectator khác), KHÔNG gồm SẢN PHẨM. Lý do:
//   (a) ca review Al+Fe+CuSO4 đã bị chặn nhờ cặp spectator×reactant (Al×CuSO4 → null) — không
//       cần soi sản phẩm;
//   (b) ghép spectator với sản phẩm gây DƯƠNG TÍNH GIẢ: H2O (dung môi/sản phẩm phổ biến) và kim
//       loại sản phẩm (vd Ag trơ × Cu vừa sinh ra) đều cho classifyNoMatch = null OAN, chặn nhầm
//       bài spectator hợp lệ.
// Ngoại lệ TRƠ hiển nhiên: HAI KIM LOẠI đơn chất không bao giờ phản ứng với nhau (classifyNoMatch
// trả null cho cặp kim loại-kim loại) → bỏ qua, nếu không sẽ chặn oan bài "hỗn hợp kim loại +
// axit/muối" kinh điển (vd Cu trơ trong Fe+HCl, Fe+Cu trong CuSO4).
function checkSpectatorsInert(
  record: ReactionRecord,
  species: { formula: string; variant?: Variant; state: SpeciesState }[],
  heated: boolean
): string | null {
  const inRecord = new Set(record.reactants.map((rr) => rr.formula));
  const spectators = species.filter((s) => !inRecord.has(s.formula));
  for (const sp of spectators) {
    for (const other of species) {
      if (other.formula === sp.formula) continue;
      // Hai kim loại đơn chất luôn trơ với nhau — không phải "hidden reaction".
      if (METALS.has(sp.formula) && METALS.has(other.formula)) continue;
      const pair = [sp, other];
      const { matches } = findMatches(pair, { heated });
      if (matches.length > 0) {
        return `đa phản ứng: ngoài phản ứng chính (${record.id}), "${sp.formula}" còn phản ứng với "${other.formula}" (${matches
          .map((m) => m.id)
          .join(', ')}) — ngoài phạm vi v0, engine không tự chọn phản ứng`;
      }
      const verdict = classifyNoMatch(pair, { heated });
      if (verdict?.verdict === 'no_reaction') continue; // trơ CÓ LÝ DO — chấp nhận
      return `ngoài phạm vi v0: "${sp.formula}" có thể phản ứng với "${other.formula}" (chưa mô hình hóa trong DB v0) — không thể coi "${sp.formula}" là chất trơ để bỏ qua`;
    }
  }
  return null;
}

// requireExcess vẫn enforce được ở bài định tính (chỉ cần cờ khai excess — F5).
function checkQualitativeDomain(record: ReactionRecord, excessSet: Set<string>): string | null {
  const d = record.domain;
  if (!d) return null;
  for (const f of d.requireExcess ?? []) {
    if (!excessSet.has(f)) {
      return `ngoài phạm vi v0: record ${record.id} yêu cầu ${f} phải DƯ (khai excess:true) — ${d.reason}`;
    }
  }
  for (const f of d.mustBeLimiting ?? []) {
    if (excessSet.has(f)) {
      return `ngoài phạm vi v0: record ${record.id} yêu cầu ${f} là chất hết trước, nhưng ${f} khai dư — ${d.reason}`;
    }
  }
  return null;
}

// Ledger "tượng trưng" cho bài định tính (chỉ nuôi scene: kết tủa/khí/màu).
function qualitativeLedger(record: ReactionRecord, infos: SpeciesInfo[]): LedgerRow[] {
  const one = rat(1n);
  const rows: LedgerRow[] = [];
  for (const rr of record.reactants) {
    rows.push({ formula: rr.formula, role: 'reactant', coeff: rr.coeff, before: one, consumed: one, produced: R0, after: R0, excess: false });
  }
  for (const pp of record.products) {
    rows.push({ formula: pp.formula, role: 'product', coeff: pp.coeff, before: R0, consumed: R0, produced: one, after: one, excess: false });
  }
  void infos;
  return rows;
}

function serializeLedger(rows: EnrichedRow[]): ChemLedgerEntry[] {
  return rows.map((row) => ({
    formula: row.formula,
    state: row.state,
    before: row.before === null ? null : ratToString(row.before),
    consumed: ratToString(row.consumed),
    produced: ratToString(row.produced),
    after: row.after === null ? null : ratToString(row.after),
    excess: row.excess,
  }));
}

// ── Trả lời queries ──────────────────────────────────────────────────────────
type QueryCtx = {
  rows: EnrichedRow[];
  infos: SpeciesInfo[];
  record: ReactionRecord | null;
  noReason: string | null;
  vm: Rat;
  vmLabel: string;
  errors: { message: string }[];
  trace: string[];
  qualitativeMode: boolean;
};

function answerQueries(queries: ChemQuery[], ctx: QueryCtx): ChemAnswer[] {
  const answers: ChemAnswer[] = [];
  for (const q of queries) {
    const ans = answerOne(q, ctx);
    if (ans) {
      answers.push(ans);
      if (ans.exact && ans.exact.replace('-', '').split('/').some((part) => part.length > 15)) {
        ctx.trace.push(`cảnh báo: phân số dài bất thường trong đáp (${ans.exact}) — kiểm tra dữ kiện đề`);
      }
    }
  }
  return answers;
}

function answerOne(q: ChemQuery, ctx: QueryCtx): ChemAnswer | null {
  const { rows, infos, record, noReason, vm, vmLabel, errors } = ctx;
  const err = (m: string) => {
    errors.push({ message: m });
    return null;
  };

  if (q.kind === 'phenomena') {
    if (record) {
      return { query: q, exact: null, approx: null, unit: '', text: record.phenomena.join('; ') };
    }
    if (noReason) {
      return { query: q, exact: null, approx: null, unit: '', text: `không có phản ứng xảy ra: ${noReason}` };
    }
    return err('query phenomena cần op mix (v0 không suy hiện tượng khi chưa trộn)');
  }
  if (q.kind === 'equation') {
    if (record) {
      const eq = `${record.reactants.map((x) => (x.coeff > 1 ? x.coeff : '') + x.formula).join(' + ')} → ${record.products
        .map((x) => {
          const mark = x.state === 'gas' ? '↑' : x.state === 'solid' && record.medium === 'dd' ? '↓' : '';
          return (x.coeff > 1 ? x.coeff : '') + x.formula + mark;
        })
        .join(' + ')}`;
      return { query: q, exact: null, approx: null, unit: '', text: eq };
    }
    if (noReason) return { query: q, exact: null, approx: null, unit: '', text: `không có phản ứng (${noReason})` };
    return err('query equation cần op mix có phản ứng');
  }

  // Từ đây là truy vấn ĐỊNH LƯỢNG.
  if (ctx.qualitativeMode) {
    return err(`bài định tính (có chất không khai lượng) — không trả lời được truy vấn định lượng "${q.kind}"${'of' in q ? ` của ${q.of}` : ''}`);
  }
  const target = 'of' in q ? q.of : '';
  const row = rows.find((rr) => rr.formula === target);
  if (!row) return err(`"${target}" không có trong sổ cái phản ứng — kiểm tra lại trường 'of' của query ${q.kind}`);
  if (row.after === null) {
    return err(`"${target}" được khai dư (excess) — lượng còn lại vô hạn, không truy vấn được ${q.kind}`);
  }

  if (q.kind === 'mol') {
    return {
      query: q, exact: ratToString(row.after), approx: ratApprox(row.after), unit: 'mol',
      text: `n(${target}) = ${fmtVN(ratApprox(row.after))} mol`,
    };
  }
  if (q.kind === 'mass') {
    const m = mulR(row.after, molarMass(target));
    return {
      query: q, exact: ratToString(m), approx: ratApprox(m), unit: 'g',
      text: `m(${target}) = ${fmtVN(ratApprox(m))} g`,
    };
  }
  if (q.kind === 'volume_gas') {
    if (row.state !== 'gas') {
      return err(`"${target}" không phải chất khí (trạng thái ${row.state}) — không có thể tích khí (F26)`);
    }
    // VỪA-5: state='gas' ở một số record (R45–R48) chỉ để mô tả HIỆN TƯỢNG hơi nước, KHÔNG
    // đồng nghĩa là chất khí ở điều kiện thường. Điều kiện tính V = thuộc GAS_SET (H2O không thuộc).
    if (!GAS_SET.has(target)) {
      return err(`${target} không phải chất khí ở điều kiện thường (không thuộc danh sách khí đóng) — không quy ra thể tích khí được`);
    }
    const v = mulR(row.after, vm);
    return {
      query: q, exact: ratToString(v), approx: ratApprox(v), unit: 'L',
      text: `V(${target}) = ${fmtVN(ratApprox(v))} lít (${vmLabel})`,
    };
  }
  if (q.kind === 'remaining') {
    if (isZeroR(row.after)) {
      return { query: q, exact: '0', approx: 0, unit: 'mol', text: `${target} đã phản ứng hết (dư 0 mol)` };
    }
    const g = mulR(row.after, molarMass(target));
    return {
      query: q, exact: ratToString(row.after), approx: ratApprox(row.after), unit: 'mol',
      text: `${target} dư ${fmtVN(ratApprox(row.after))} mol (≈ ${fmtVN(ratApprox(g))} g)`,
    };
  }
  // concentration
  if (q.as === 'CM') {
    if (row.state !== 'solution') {
      return err(`CM chỉ áp dụng cho chất tan trong dung dịch — "${target}" đang là chất rắn/khí (trạng thái ${row.state}) (F26)`);
    }
    let vTotal = R0;
    for (const s of infos) {
      if (s.state !== 'solution') continue; // chất rắn/khí KHÔNG góp thể tích (H04)
      if (s.excess) {
        return err(`dung dịch ${s.formula} khai dư (excess) — không rõ thể tích, không tính được CM`);
      }
      if (s.solutionVolumeL === null) {
        return err(`không rõ thể tích của dung dịch ${s.formula} (khai theo C%/gam) — không tính được CM`);
      }
      vTotal = addR(vTotal, s.solutionVolumeL);
    }
    if (isZeroR(vTotal)) {
      return err('tổng thể tích dung dịch bằng 0 — không tính được CM (chặn chia 0, F21)');
    }
    const cm = divR(row.after, vTotal);
    return {
      query: q, exact: ratToString(cm), approx: ratApprox(cm), unit: 'M',
      text: `CM(${target}) = ${fmtVN(ratApprox(cm))}M (coi thể tích dung dịch cộng tính, V tổng = ${fmtVN(ratApprox(vTotal))} L)`,
    };
  }
  // C% — F8: m_dd sau = Σ đổ vào − m kết tủa/rắn − m khí (kể cả CHẤT RẮN DƯ chưa tan).
  if (row.state !== 'solution') {
    return err(`C% chỉ áp dụng cho chất tan trong dung dịch — "${target}" đang ở trạng thái ${row.state}`);
  }
  let poured = R0;
  for (const s of infos) {
    if (s.excess) return err(`chất ${s.formula} khai dư (excess) — không xác định được khối lượng dung dịch sau phản ứng, không tính được C%`);
    if (s.pouredMassG === null) {
      return err(s.pouredMassUnknownWhy ?? `không rõ khối lượng đổ vào của ${s.formula} — không tính được C%`);
    }
    poured = addR(poured, s.pouredMassG);
  }
  let removed = R0;
  for (const rr of rows) {
    if (rr.after === null || isZeroR(rr.after)) continue;
    if (rr.state === 'solid' || rr.state === 'gas') {
      removed = addR(removed, mulR(rr.after, molarMass(rr.formula)));
    }
  }
  const mdd = subR(poured, removed);
  if (cmpR(mdd, R0) <= 0) return err('khối lượng dung dịch sau phản ứng ≤ 0 — dữ kiện đề mâu thuẫn');
  const mx = mulR(row.after, molarMass(target));
  const cpct = mulR(divR(mx, mdd), rat(100n));
  return {
    query: q, exact: ratToString(cpct), approx: ratApprox(cpct), unit: '%',
    text: `C%(${target}) = ${fmtVN(ratApprox(cpct), 2)}% (m_dd sau = tổng đổ vào − kết tủa − khí thoát ra − chất rắn dư = ${fmtVN(ratApprox(mdd))} g)`,
  };
}
