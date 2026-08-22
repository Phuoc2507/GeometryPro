// api/_lib/kernel/chem/organic.ts
// Engine HÓA HỮU CƠ tầng 1 (spec §5–§9) — THUẦN, tất định, KHÔNG throw ra ngoài.
// Số đo đốt cháy → mol từng nguyên tố (bảo toàn exact) → CTĐGN (LCM/GCD bigint) →
// CTPT (chốt n bằng M hoặc duyệt nghiệm nguyên chặn [1,30]) → 4 TỰ KIỂM. Este thủy phân
// tái dùng balance()+react() của v0. Mọi đại lượng ở lại trường HỮU TỈ (rat.ts).
//
// Đã áp toàn bộ PHẢN BIỆN (docs/.../2026-08-22-organic-review.md):
//   H1 (CAO)  — match query→muối/sản phẩm bằng ATOM-MAP (parseFormula 2 vế), KHÔNG so chuỗi.
//   H2 (VỪA)  — GUARD ĐỘC LẬP este: khai `acid` ⇒ kiểm `ester == acid + alcohol − H2O`.
//   H3 (VỪA)  — dựng "ledger hư cấu" sản phẩm đốt (CO2/H2O/N2/A) rồi trả mass/mol/V qua atom-map.
//   H4 (VỪA)  — guard nO ≥ 0 (và nC,nH > 0) khi suy O từ khối lượng ⇒ âm ⇒ "dữ kiện mâu thuẫn".
//   H5 (VỪA)  — class k=1 thiếu neo ⇒ LIỆT KÊ candidates (không bail cụt).
//   H6–H10    — n=2 amin đúng số C; chặn trần measure.tol ≤ 2e-2; parseDecimal dấu phẩy;
//               kiểm chéo class↔contains; band-scan M bắt đa nghiệm.
import type { ChemPlan, ChemQuery, ChemAssert } from './planSchema';
import type { OrganicUnknownOpT, CombustionOpT, MeasureOpT, EsterHydrolysisOpT, OrganicClassT } from './organicSchema';
import { ORGANIC_OP_NAMES } from './organicSchema';
import type { ChemResult, ChemAnswer, ChemLedgerEntry } from './runChem';
import type { ChemScene } from './scene';
import type { ReactionRecord, SpeciesState } from './reactionDB';
import type { LedgerRow, Violation } from './stoich';
import { MOLAR_VOLUMES, amountToMol, parsePositive, react } from './stoich';
import { balance } from './balance';
import { parseFormula, molarMass } from './formula';
import {
  type Rat, R0, rat, addR, subR, mulR, divR, cmpR, absR, isZeroR, ratToString, ratApprox, parseDecimal,
} from './rat';

const ri = (n: number): Rat => rat(BigInt(n));
const TWO = ri(2);
const TOL_CAP = rat(1n, 50n); // 2e-2 — trần measure.tol (review H7)

function bgcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a; b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a || 1n;
}

// ── Atom-map (H1) ─────────────────────────────────────────────────────────────
type AMap = Map<string, number>;
const atomMap = (formula: string): AMap => parseFormula(formula);
function sameAtomMap(a: AMap, b: AMap): boolean {
  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const k of keys) if ((a.get(k) ?? 0) !== (b.get(k) ?? 0)) return false;
  return true;
}
function addMaps(a: AMap, b: AMap): AMap {
  const o = new Map(a);
  for (const [e, c] of b) o.set(e, (o.get(e) ?? 0) + c);
  return o;
}
function subMaps(a: AMap, b: AMap): AMap {
  const o = new Map(a);
  for (const [e, c] of b) o.set(e, (o.get(e) ?? 0) - c);
  return o;
}
// Ráp atom-map → chuỗi công thức (thứ tự C, H, rồi còn lại alphabet). Dùng cho muối động.
function mapToFormula(m: AMap): string {
  const rank = (e: string) => (e === 'C' ? 0 : e === 'H' ? 1 : 2);
  const els = [...m.keys()].filter((e) => (m.get(e) ?? 0) > 0);
  els.sort((a, b) => (rank(a) !== rank(b) ? rank(a) - rank(b) : a < b ? -1 : a > b ? 1 : 0));
  let s = '';
  for (const e of els) {
    const c = m.get(e)!;
    s += e + (c > 1 ? String(c) : '');
  }
  return s;
}

// ── Ứng viên CTPT ─────────────────────────────────────────────────────────────
type Cand = { C: number; H: number; O: number; N: number };
function candFormula(c: Cand): string {
  let s = '';
  const put = (el: string, n: number) => { if (n > 0) s += el + (n > 1 ? String(n) : ''); };
  put('C', c.C); put('H', c.H); put('O', c.O); put('N', c.N);
  return s;
}
function kOf(c: Cand): number { return (2 * c.C + 2 + c.N - c.H) / 2; }

// (c)+(d) — hóa trị/độ bất bão hòa; realizability tối thiểu HC k≥1 ⇒ x≥2 (§15.4).
function valenceOK(c: Cand): boolean {
  const { C: x, H: y, O: z, N: t } = c;
  if (x < 1 || y < 1) return false;
  const num = 2 * x + 2 + t - y;
  if (num < 0 || num % 2 !== 0) return false; // (c) k nguyên ≥ 0
  const k = num / 2;
  if (((y - t) % 2 + 2) % 2 !== 0) return false; // (d) y ≡ t (mod 2)
  if (y > 2 * x + 2 + t) return false;           // (d) y ≤ 2x+2+t
  if (z === 0 && t === 0 && k >= 1 && x < 2) return false; // cacben C1H2… loại
  return true;
}
function empiricalOf(c: Cand): string {
  const arr = [c.C, c.H, c.O, c.N].filter((v) => v > 0);
  let g = 0n;
  for (const v of arr) g = bgcd(g, BigInt(v));
  const gg = g === 0n ? 1n : g;
  return candFormula({
    C: Number(BigInt(c.C) / gg), H: Number(BigInt(c.H) / gg),
    O: Number(BigInt(c.O) / gg), N: Number(BigInt(c.N) / gg),
  });
}

// ── Dãy đồng đẳng (bảng đóng §6) ─────────────────────────────────────────────
type ClassSpec = { k: number; oCount: number; nCount: number; hOfN: (n: number) => number; minC: number; hasO: boolean; hasN: boolean };
const CLASS_TABLE: Record<Exclude<OrganicClassT, 'none'>, ClassSpec> = {
  'ankan':        { k: 0, oCount: 0, nCount: 0, hOfN: (n) => 2 * n + 2, minC: 1, hasO: false, hasN: false },
  'anken':        { k: 1, oCount: 0, nCount: 0, hOfN: (n) => 2 * n,     minC: 2, hasO: false, hasN: false },
  'ankin':        { k: 2, oCount: 0, nCount: 0, hOfN: (n) => 2 * n - 2, minC: 2, hasO: false, hasN: false },
  'ancol-no-don': { k: 0, oCount: 1, nCount: 0, hOfN: (n) => 2 * n + 2, minC: 1, hasO: true,  hasN: false },
  'axit-no-don':  { k: 1, oCount: 2, nCount: 0, hOfN: (n) => 2 * n,     minC: 1, hasO: true,  hasN: false },
  'este-no-don':  { k: 1, oCount: 2, nCount: 0, hOfN: (n) => 2 * n,     minC: 2, hasO: true,  hasN: false },
  'amin-no-don':  { k: 0, oCount: 0, nCount: 1, hOfN: (n) => 2 * n + 3, minC: 1, hasO: false, hasN: true },
};

// ── Mô hình chất chưa biết ────────────────────────────────────────────────────
type El = 'C' | 'H' | 'O' | 'N';
type OModel = {
  name: string;
  klass: OrganicClassT;
  contains: Set<El> | null;
  co2: Rat | null; h2o: Rat | null; n2: Rat | null; o2: Rat | null;
  sampleMol: Rat | null; sampleMassG: Rat | null;
  M: { value: Rat; tol: Rat; exact: boolean } | null;
};

type BuildOK = { ok: true; model: OModel };
type BuildErr = { ok: false; error: string };

function buildModel(unknown: OrganicUnknownOpT, plan: ChemPlan, vm: Rat, trace: string[]): BuildOK | BuildErr {
  const name = unknown.name;
  const comb = plan.ops.find((o) => o.op === 'combustion' && (o as CombustionOpT).of === name) as CombustionOpT | undefined;
  const meas = plan.ops.find((o) => o.op === 'measure' && (o as MeasureOpT).of === name) as MeasureOpT | undefined;

  let co2: Rat | null = null, h2o: Rat | null = null, n2: Rat | null = null, o2: Rat | null = null;
  try {
    if (comb?.co2) co2 = amountToMol('CO2', comb.co2 as never, vm);
    if (comb?.h2o) h2o = amountToMol('H2O', comb.h2o as never, vm);
    if (comb?.n2) n2 = amountToMol('N2', comb.n2 as never, vm);
    if (comb?.o2) o2 = amountToMol('O2', comb.o2 as never, vm);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  let sampleMol: Rat | null = null, sampleMassG: Rat | null = null;
  const s = unknown.sample;
  try {
    if (s) {
      if ('mol' in s) sampleMol = parsePositive(s.mol, `số mol mẫu ${name}`);
      else if ('grams' in s) sampleMassG = parsePositive(s.grams, `khối lượng mẫu ${name}`);
      else if ('liters_gas' in s) sampleMol = divR(parsePositive(s.liters_gas, `thể tích mẫu ${name}`), vm);
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  let M: OModel['M'] = null;
  if (meas) {
    try {
      const val = parseDecimal(meas.value as never);
      let tol = meas.tol !== undefined ? parseDecimal(meas.tol as never) : R0;
      const exact = meas.tol === undefined;
      if (cmpR(tol, TOL_CAP) > 0) {
        trace.push(`measure.tol=${ratToString(tol)} vượt trần — chặn về ${ratToString(TOL_CAP)} (review H7)`);
        tol = TOL_CAP;
      }
      if (meas.kind === 'molar_mass') {
        M = { value: val, tol, exact };
      } else {
        // vapor_density: M_A = d · M_ref (H2→2, air→29, khí khác → molarMass)
        if (!meas.ref) return { ok: false, error: `measure vapor_density của ${name} thiếu 'ref' (H2/air/khí)` };
        const Mref = meas.ref === 'H2' ? TWO : meas.ref === 'air' ? ri(29) : molarMass(meas.ref);
        M = { value: mulR(val, Mref), tol, exact };
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  const contains = unknown.contains ? new Set(unknown.contains as El[]) : null;
  return { ok: true, model: { name, klass: unknown.class, contains, co2, h2o, n2, o2, sampleMol, sampleMassG, M } };
}

// ── Suy O trong MẪU cho nhánh class=none (§5.1 + H4) ─────────────────────────
function determineSampleOxygen(model: OModel): { ok: true; nC: Rat; nH: Rat; nN: Rat; nO: Rat } | BuildErr {
  const nC = model.co2;
  const nH = model.h2o ? mulR(TWO, model.h2o) : null;
  const nN = model.n2 ? mulR(TWO, model.n2) : R0;
  if (!nC || !nH) return { ok: false, error: 'thiếu số đo CO2 hoặc H2O — không lập được CTĐGN (chất chưa khai class)' };
  if (cmpR(nC, R0) <= 0 || cmpR(nH, R0) <= 0) return { ok: false, error: 'mol C hoặc H ≤ 0 — dữ kiện mâu thuẫn' };

  let nOa: Rat | null = null, nOb: Rat | null = null;
  if (model.sampleMassG) {
    const num = subR(subR(subR(model.sampleMassG, mulR(ri(12), nC)), nH), mulR(ri(14), nN));
    nOa = divR(num, ri(16));
  }
  if (model.o2) nOb = subR(addR(mulR(TWO, nC), model.h2o!), mulR(TWO, model.o2));
  if (nOa && nOb && cmpR(nOa, nOb) !== 0) {
    return { ok: false, error: 'hai route tính O (khối lượng mẫu vs bảo toàn O2) LỆCH — dữ kiện mâu thuẫn' };
  }
  let nO = nOa ?? nOb;
  if (nO === null) {
    if (model.contains) {
      if (model.contains.has('O')) return { ok: false, error: 'đề khai chứa O nhưng thiếu dữ kiện định lượng O (cần m mẫu, O2 tiêu thụ, hoặc class chứa O)' };
      nO = R0;
    } else {
      return { ok: false, error: 'không xác định được O: thiếu m mẫu / O2 / class / contains — engine KHÔNG mặc định O = 0' };
    }
  }
  if (cmpR(nO, R0) < 0) return { ok: false, error: 'khối lượng C + H (+N) vượt khối lượng mẫu ⇒ nO < 0 — dữ kiện mâu thuẫn hoặc chất không chỉ chứa C,H,O' };
  if (model.contains && !model.contains.has('O') && cmpR(nO, R0) > 0) {
    return { ok: false, error: 'khối lượng mẫu > mC + mH ⇒ hợp chất CÓ oxi, nhưng đề khai chỉ chứa C,H — khai THIẾU nguyên tố O (§10.4)' };
  }
  return { ok: true, nC, nH, nN, nO };
}

// Rút CTĐGN từ vectơ mol nguyên tố (LCM mẫu → GCD tử) — §5.2.
function reduceEmpirical(m: { C: Rat; H: Rat; O: Rat; N: Rat }): Cand {
  const order: El[] = ['C', 'H', 'O', 'N'];
  let lcm = 1n;
  for (const e of order) if (!isZeroR(m[e])) lcm = (lcm / bgcd(lcm, m[e].den)) * m[e].den;
  const ints: Record<El, bigint> = { C: 0n, H: 0n, O: 0n, N: 0n };
  for (const e of order) ints[e] = isZeroR(m[e]) ? 0n : (m[e].num * lcm) / m[e].den;
  let g = 0n;
  for (const e of order) if (ints[e] !== 0n) g = bgcd(g, ints[e]);
  const gg = g === 0n ? 1n : g;
  return { C: Number(ints.C / gg), H: Number(ints.H / gg), O: Number(ints.O / gg), N: Number(ints.N / gg) };
}

// ── Cỗ máy ứng viên chung (§5.3 + §5.4) ──────────────────────────────────────
// n_A neo theo ưu tiên; datum dùng làm neo trở thành hằng đẳng, các datum còn lại PIN n.
function deriveAnchorNA(cand: Cand, model: OModel): Rat | null {
  if (model.sampleMol) return model.sampleMol;
  if (model.co2 && cand.C > 0) return divR(model.co2, ri(cand.C));
  if (model.sampleMassG) return divR(model.sampleMassG, molarMass(candFormula(cand)));
  if (model.n2 && cand.N > 0) return divR(mulR(TWO, model.n2), ri(cand.N));
  if (model.h2o && cand.H > 0) return divR(mulR(TWO, model.h2o), ri(cand.H));
  return null;
}
// Tự kiểm (a)+(b): dựng lại MỌI số đo đã cho từ (cand, n_A) — exact (M có thể tol).
function reconstructOK(cand: Cand, nA: Rat, model: OModel): boolean {
  const F = candFormula(cand);
  if (model.co2 && cmpR(mulR(ri(cand.C), nA), model.co2) !== 0) return false;
  if (model.h2o && cmpR(mulR(divR(ri(cand.H), TWO), nA), model.h2o) !== 0) return false;
  if (model.n2 && cmpR(mulR(divR(ri(cand.N), TWO), nA), model.n2) !== 0) return false;
  if (model.o2) {
    const perMol = subR(addR(ri(cand.C), divR(ri(cand.H), ri(4))), divR(ri(cand.O), TWO));
    if (cmpR(mulR(perMol, nA), model.o2) !== 0) return false;
  }
  if (model.sampleMassG && cmpR(mulR(nA, molarMass(F)), model.sampleMassG) !== 0) return false;
  if (model.sampleMol && cmpR(nA, model.sampleMol) !== 0) return false;
  if (model.M) {
    const Mc = molarMass(F);
    if (model.M.exact) {
      if (cmpR(Mc, model.M.value) !== 0) return false;
    } else {
      const diff = absR(subR(Mc, model.M.value));
      const limit = mulR(model.M.tol, absR(model.M.value));
      if (cmpR(diff, limit) > 0) return false;
    }
  }
  return true;
}

type SolveResult =
  | { kind: 'unique'; formula: string; empirical: string; k: number; cand: Cand; nA: Rat; M: Rat }
  | { kind: 'multi'; empirical?: string; candidates: string[] }
  | { kind: 'error'; error: string };

function solveFormula(model: OModel, trace: string[]): SolveResult {
  const klass = model.klass;
  let template: (n: number) => Cand;
  let minC = 1;
  let empiricalStr: string | undefined;

  if (klass !== 'none') {
    const spec = CLASS_TABLE[klass];
    // H10 — kiểm chéo class ↔ contains
    if (model.contains) {
      if (spec.hasO !== model.contains.has('O') || spec.hasN !== model.contains.has('N')) {
        return { kind: 'error', error: `loại chất "${klass}" mâu thuẫn tập nguyên tố khai (contains) — kiểm lại đề` };
      }
    }
    minC = spec.minC;
    template = (n) => ({ C: n, H: spec.hOfN(n), O: spec.oCount, N: spec.nCount });
  } else {
    const ox = determineSampleOxygen(model);
    if (!ox.ok) return { kind: 'error', error: ox.error };
    const emp = reduceEmpirical({ C: ox.nC, H: ox.nH, O: ox.nO, N: ox.nN });
    empiricalStr = candFormula(emp);
    template = (n) => ({ C: emp.C * n, H: emp.H * n, O: emp.O * n, N: emp.N * n });
    minC = 1;
  }

  const kept: { cand: Cand; nA: Rat }[] = [];
  for (let n = minC; n <= 30; n++) {
    const cand = template(n);
    if (!valenceOK(cand)) continue;
    const nA = deriveAnchorNA(cand, model);
    if (nA === null || cmpR(nA, R0) <= 0) continue;
    if (reconstructOK(cand, nA, model)) kept.push({ cand, nA });
  }

  if (kept.length === 1) {
    const { cand, nA } = kept[0];
    const formula = candFormula(cand);
    // amin: xác nhận hai route n_A khớp (2·nN2 vs nCO2/x) — tự kiểm chéo THẬT (không tautology).
    if (model.n2 && model.co2 && cand.N > 0) {
      const routeN = divR(mulR(TWO, model.n2), ri(cand.N));
      if (cmpR(routeN, nA) === 0) trace.push('amin: hai route n_A (2·nN2 và nCO2/x) khớp exact');
    }
    return { kind: 'unique', formula, empirical: empiricalStr ?? empiricalOf(cand), k: kOf(cand), cand, nA, M: molarMass(formula) };
  }
  if (kept.length >= 2) {
    return { kind: 'multi', empirical: empiricalStr, candidates: kept.map((x) => candFormula(x.cand)) };
  }
  return { kind: 'error', error: 'không CTPT nào thỏa dữ kiện — đề/mô hình mâu thuẫn (kiểm số đo, class, tỉ khối)' };
}

// ── Ledger hư cấu sản phẩm đốt (H3) ──────────────────────────────────────────
type ProdRow = { formula: string; mol: Rat; gas: boolean };
function combustionProducts(cand: Cand, nA: Rat, formula: string): ProdRow[] {
  const rows: ProdRow[] = [{ formula, mol: nA, gas: false }];
  if (cand.C > 0) rows.push({ formula: 'CO2', mol: mulR(ri(cand.C), nA), gas: true });
  if (cand.H > 0) rows.push({ formula: 'H2O', mol: mulR(divR(ri(cand.H), TWO), nA), gas: false });
  if (cand.N > 0) rows.push({ formula: 'N2', mol: mulR(divR(ri(cand.N), TWO), nA), gas: true });
  const perMol = subR(addR(ri(cand.C), divR(ri(cand.H), ri(4))), divR(ri(cand.O), TWO));
  rows.push({ formula: 'O2', mol: mulR(perMol, nA), gas: true });
  return rows;
}

// ── fmt VN (bản sao gọn của runChem.fmtVN) ────────────────────────────────────
function fmtVN(x: number, maxDp = 4): string {
  const factor = 10 ** maxDp;
  const rounded = Math.round(x * factor) / factor;
  let s = rounded.toString();
  if (/e/i.test(s)) s = rounded.toFixed(maxDp);
  return s.replace('.', ',');
}

// ── Trả lời query nhánh đốt cháy ──────────────────────────────────────────────
const ORG_GAS = new Set(['CO2', 'N2', 'O2']);
function answerCombustion(
  queries: ChemQuery[], sol: SolveResult, model: OModel, vm: Rat, vmLabel: string,
  errors: { message: string }[]
): ChemAnswer[] {
  const answers: ChemAnswer[] = [];
  const products = sol.kind === 'unique' ? combustionProducts(sol.cand, sol.nA, sol.formula) : null;
  const err = (m: string): null => { errors.push({ message: m }); return null; };

  for (const q of queries) {
    const of = 'of' in q ? q.of : '';
    let a: ChemAnswer | null = null;

    if (q.kind === 'empirical_formula') {
      if (sol.kind === 'unique' || sol.kind === 'multi') {
        const emp = sol.empirical;
        if (emp) a = { query: q, exact: emp, approx: null, unit: '', text: `CTĐGN của ${of} là ${emp}`, formula: emp };
        else a = err(`không lập được CTĐGN của ${of} (thiếu tỉ lệ nguyên tố)`);
      } else a = err(`không lập được CTĐGN của ${of}: ${sol.error}`);
    } else if (q.kind === 'molecular_formula') {
      if (sol.kind === 'unique') {
        a = {
          query: q, exact: sol.formula, approx: null, unit: '', formula: sol.formula,
          text: `CTPT của ${of} là ${sol.formula} (M = ${fmtVN(ratApprox(sol.M))}; CTĐGN ${sol.empirical}; k = ${sol.k})`,
        };
      } else if (sol.kind === 'multi') {
        const shown = sol.candidates.slice(0, 8).join(', ') + (sol.candidates.length > 8 ? ', …' : '');
        a = {
          query: q, exact: null, approx: null, unit: '', candidates: sol.candidates,
          text: `đề thiếu dữ kiện: ${sol.candidates.length} CTPT cùng thỏa (${shown}); cần M/tỉ khối để chốt duy nhất`,
        };
      } else a = err(`không chốt được CTPT của ${of}: ${sol.error}`);
    } else if (q.kind === 'degree_unsaturation') {
      if (sol.kind === 'unique') a = { query: q, exact: String(sol.k), approx: sol.k, unit: '', text: `độ bất bão hòa k của ${of} = ${sol.k}` };
      else a = err(`chưa chốt CTPT ⇒ chưa tính được k của ${of}`);
    } else if (q.kind === 'oxygen_needed') {
      if (sol.kind !== 'unique') a = err(`chưa chốt CTPT ⇒ chưa tính được O2 cần đốt ${of}`);
      else {
        const prods = ['CO2', 'H2O']; if (sol.cand.N > 0) prods.push('N2');
        const b = balance([sol.formula, 'O2'], prods);
        if (!b.ok) a = err(`không cân bằng được PT đốt ${sol.formula}: ${b.problem}`);
        else {
          const perMol = divR(ri(b.coefficients[1]), ri(b.coefficients[0]));
          const molO2 = mulR(perMol, sol.nA);
          if (q.as === 'liters_gas') {
            const v = mulR(molO2, vm);
            a = { query: q, exact: ratToString(v), approx: ratApprox(v), unit: 'L', text: `V(O2) cần đốt ${of} = ${fmtVN(ratApprox(v))} lít (${vmLabel})` };
          } else {
            a = { query: q, exact: ratToString(molO2), approx: ratApprox(molO2), unit: 'mol', text: `n(O2) cần đốt ${of} = ${fmtVN(ratApprox(molO2))} mol` };
          }
        }
      }
    } else {
      // mass / mol / volume_gas của sản phẩm đốt hoặc chính chất A — atom-map match (H1/H3).
      if (!products) { a = err(`chưa chốt CTPT ⇒ chưa dựng được lượng sản phẩm cho truy vấn ${q.kind} ${of}`); }
      else {
        const tMap = atomMap(of);
        const row = products.find((p) => sameAtomMap(atomMap(p.formula), tMap));
        if (!row) a = err(`"${of}" không thuộc sản phẩm đốt (CO2/H2O/N2/O2) hay chất A — kiểm lại 'of' của query ${q.kind}`);
        else if (q.kind === 'mol') a = { query: q, exact: ratToString(row.mol), approx: ratApprox(row.mol), unit: 'mol', text: `n(${of}) = ${fmtVN(ratApprox(row.mol))} mol` };
        else if (q.kind === 'mass') {
          const m = mulR(row.mol, molarMass(row.formula));
          a = { query: q, exact: ratToString(m), approx: ratApprox(m), unit: 'g', text: `m(${of}) = ${fmtVN(ratApprox(m))} g` };
        } else if (q.kind === 'volume_gas') {
          if (!row.gas || !ORG_GAS.has(row.formula)) a = err(`"${of}" không phải chất khí ở điều kiện thường — không quy ra thể tích khí (nước là chất lỏng, §15.1)`);
          else { const v = mulR(row.mol, vm); a = { query: q, exact: ratToString(v), approx: ratApprox(v), unit: 'L', text: `V(${of}) = ${fmtVN(ratApprox(v))} lít (${vmLabel})` }; }
        } else a = err(`truy vấn ${q.kind} chưa hỗ trợ ở nhánh đốt cháy hữu cơ v1`);
      }
    }
    if (a) answers.push(a);
  }
  return answers;
}

// ── Nhánh đốt cháy → CTPT ─────────────────────────────────────────────────────
function runCombustion(
  unknown: OrganicUnknownOpT, plan: ChemPlan, emptyScene: ChemScene,
  trace: string[], errors: { message: string }[], violations: Violation[], vm: Rat, vmLabel: string
): ChemResult {
  const built = buildModel(unknown, plan, vm, trace);
  if (!built.ok) { errors.push({ message: built.error }); return finish(false); }
  const model = built.model;
  const sol = solveFormula(model, trace);
  if (sol.kind === 'unique') trace.push(`CTPT ${model.name} = ${sol.formula} (CTĐGN ${sol.empirical}, k=${sol.k}, M=${ratToString(sol.M)})`);

  // Đa nghiệm + có truy vấn molecular_formula ⇒ violation "thiếu dữ kiện" (H5, O6).
  const wantsMolecular = plan.queries.some((q) => q.kind === 'molecular_formula');
  if (sol.kind === 'multi' && wantsMolecular) {
    violations.push({ law: 'đề thiếu dữ kiện', detail: `${sol.candidates.length} CTPT cùng thỏa (${sol.candidates.slice(0, 8).join(', ')}${sol.candidates.length > 8 ? ', …' : ''}) — cần M/tỉ khối để chốt duy nhất` });
  }

  // Assert chống ảo giác (F10: tol tương đối, default 1e-3; CTPT so ATOM-MAP).
  const assertProducts = sol.kind === 'unique' ? combustionProducts(sol.cand, sol.nA, sol.formula) : null;
  for (const as of plan.asserts as ChemAssert[]) {
    if (as.kind === 'given_formula') {
      if (as.of !== model.name) { errors.push({ message: `assert given_formula: '${as.of}' không khớp chất chưa biết '${model.name}'` }); continue; }
      if (sol.kind === 'unique') {
        if (sameAtomMap(atomMap(sol.formula), atomMap(as.formula))) trace.push(`given_formula khớp: ${sol.formula}`);
        else violations.push({ law: `given_formula ${as.of}`, detail: `engine tính CTPT = ${sol.formula} nhưng đề khai ${as.formula} — mô hình lệch dữ kiện, KHÔNG xác nhận` });
      } else {
        violations.push({ law: `given_formula ${as.of}`, detail: `đề khai CTPT ${as.formula} nhưng engine chưa chốt được CTPT duy nhất — không xác nhận` });
      }
      continue;
    }
    // given_mass / given_mol — đối chiếu số đo sản phẩm đốt (hoặc chất A) qua atom-map (H1).
    if (!assertProducts) { errors.push({ message: `assert ${as.kind} ${as.of}: chưa chốt CTPT ⇒ không dựng được lượng để đối chiếu` }); continue; }
    const row = assertProducts.find((p) => sameAtomMap(atomMap(p.formula), atomMap(as.of)));
    if (!row) { errors.push({ message: `assert ${as.kind}: '${as.of}' không thuộc sản phẩm đốt (CO2/H2O/N2/O2) hay chất A` }); continue; }
    let given: Rat;
    try { given = parsePositive(as.kind === 'given_mass' ? as.grams : as.mol, `assert ${as.of}`); }
    catch (e) { errors.push({ message: e instanceof Error ? e.message : String(e) }); continue; }
    const computed = as.kind === 'given_mass' ? mulR(row.mol, molarMass(row.formula)) : row.mol;
    const tolR = parseDecimal(as.tol ?? 0.001);
    if (cmpR(absR(subR(computed, given)), mulR(tolR, absR(given))) > 0) {
      violations.push({ law: `${as.kind} ${as.of}`, detail: `đề cho ${ratToString(given)} nhưng engine tính ${ratToString(computed)} — lệch quá tol tương đối ${ratToString(tolR)}, mô hình lệch dữ kiện` });
    } else trace.push(`assert ${as.kind}(${as.of}) khớp: ${ratToString(computed)} ≈ ${ratToString(given)}`);
  }

  // Đáp GIỮ NGUYÊN kể cả khi đa nghiệm (O6: empirical_formula vẫn chốt "CH2") — chỉ
  // molecular_formula rơi vào candidates + violation. ok phản ánh errors/violations.
  const answers = answerCombustion(plan.queries, sol, model, vm, vmLabel, errors);
  return { ok: errors.length === 0 && violations.length === 0, reactions: [], ledger: [], answers, scene: emptyScene, violations, errors, trace };
}

// ── Nhánh este thủy phân (§7 + H1 + H2) ──────────────────────────────────────
function applyAmount(formula: string, amount: unknown, mols: Map<string, Rat>, excessSet: Set<string>, vm: Rat): string | null {
  if (!amount) return null;
  if (typeof amount === 'object' && amount !== null && 'excess' in amount) { excessSet.add(formula); return null; }
  try {
    mols.set(formula, amountToMol(formula, amount as never, vm));
    return null;
  } catch (e) { return e instanceof Error ? e.message : String(e); }
}

function runEster(
  op: EsterHydrolysisOpT, plan: ChemPlan, emptyScene: ChemScene,
  trace: string[], errors: { message: string }[], violations: Violation[], vm: Rat, vmLabel: string
): ChemResult {
  const done = (ok: boolean, reactions: ChemResult['reactions'], ledger: ChemLedgerEntry[], answers: ChemAnswer[]): ChemResult =>
    ({ ok, reactions, ledger, answers, scene: emptyScene, violations, errors, trace });
  const fail = (msg: string): ChemResult => { errors.push({ message: msg }); return done(false, [], [], []); };

  let esterAtoms: AMap, alcoholAtoms: AMap;
  try { esterAtoms = atomMap(op.ester); alcoholAtoms = atomMap(op.alcohol); }
  catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
  const naohAtoms = atomMap('NaOH');
  const h2oAtoms = atomMap('H2O');

  // H2 — GUARD ĐỘC LẬP: khai acid ⇒ kiểm este hóa ngược (ester == acid + alcohol − H2O).
  if (op.acid) {
    let acidAtoms: AMap;
    try { acidAtoms = atomMap(op.acid); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
    const expected = subMaps(addMaps(acidAtoms, alcoholAtoms), h2oAtoms);
    if (!sameAtomMap(expected, esterAtoms)) {
      violations.push({ law: 'ghép este (este hóa ngược)', detail: `axit "${op.acid}" + ancol "${op.alcohol}" − H2O = ${mapToFormula(expected)} ≠ este "${op.ester}" (${mapToFormula(esterAtoms)}) — khai SAI nửa axit/ancol, KHÔNG trả đáp số` });
      return done(false, [], [], []);
    }
    trace.push('guard este hóa khớp: axit + ancol − H2O = ester');
  } else {
    trace.push('CẢNH BÁO (review H2): không khai "acid" ⇒ KHÔNG có guard độc lập cho nửa ancol; đọc nhầm ancol ⇒ khối lượng muối có thể sai âm thầm. Khuyến nghị khai acid.');
  }

  // Muối = ester + NaOH − alcohol (cộng/trừ atom-map). Guard số nguyên tử âm.
  const saltAtoms = subMaps(addMaps(esterAtoms, naohAtoms), alcoholAtoms);
  for (const [el, c] of saltAtoms) {
    if (c < 0) { violations.push({ law: 'ráp muối', detail: `muối ráp ra số nguyên tử ${el} = ${c} < 0 — nửa ancol không khớp este` }); return done(false, [], [], []); }
  }
  const saltFormula = mapToFormula(saltAtoms);

  // Cân bằng [ester, NaOH] → [salt, alcohol]; buộc 1:1:1:1.
  const bal = balance([op.ester, 'NaOH'], [saltFormula, op.alcohol]);
  if (!bal.ok) return fail(`không cân bằng được thủy phân este: ${bal.problem} — ngoài phạm vi este đơn chức 1:1 (v1)`);
  if (bal.coefficients.some((c) => c !== 1)) return fail(`hệ số thủy phân ${bal.coefficients.join(':')} ≠ 1:1:1:1 — không phải este đơn chức, mạch hở, thủy phân đơn giản (v1)`);

  const record: ReactionRecord = {
    id: 'ORG-ester',
    reactants: [{ formula: op.ester, coeff: 1 }, { formula: 'NaOH', coeff: 1 }],
    products: [{ formula: saltFormula, coeff: 1, state: 'solution' }, { formula: op.alcohol, coeff: 1, state: 'liquid' }],
    conditions: [], medium: 'dd', type: 'trao đổi', redox: false,
    phenomena: ['este bị thủy phân trong dung dịch kiềm (xà phòng hóa)'],
    tags: ['hoa/12/este-lipit/thuy-phan-este'],
  };

  const mols = new Map<string, Rat>();
  const excessSet = new Set<string>();
  const e1 = applyAmount(op.ester, op.esterAmount, mols, excessSet, vm);
  if (e1) return fail(e1);
  const e2 = applyAmount('NaOH', op.baseAmount, mols, excessSet, vm);
  if (e2) return fail(e2);

  const outcome = react(record, mols, excessSet);
  if (!outcome.ok) {
    if (outcome.outOfScope) return fail(outcome.outOfScope.message);
    violations.push(...outcome.violations);
    errors.push({ message: 'tự kiểm bảo toàn (react v0) thất bại — không trả đáp số' });
    return done(false, [], [], []);
  }
  trace.push(`ξ(thủy phân) = ${ratToString(outcome.xi)} mol; muối ráp = ${saltFormula} (M = ${ratToString(molarMass(saltFormula))})`);

  const stateOf = (f: string): SpeciesState => f === op.ester ? 'liquid' : f === 'NaOH' ? 'solution' : f === saltFormula ? 'solution' : f === op.alcohol ? 'liquid' : 'solution';
  const ledger: ChemLedgerEntry[] = outcome.ledger.map((row) => serializeRow(row, stateOf(row.formula)));

  // Trả lời query mass/mol/volume_gas qua ATOM-MAP (H1: "CH3COONa" khớp "C2H3NaO2").
  const answers: ChemAnswer[] = [];
  for (const q of plan.queries) {
    const of = 'of' in q ? q.of : '';
    if (q.kind === 'equation') { answers.push({ query: q, exact: null, approx: null, unit: '', text: esterEquation(record) }); continue; }
    if (q.kind === 'phenomena') { answers.push({ query: q, exact: null, approx: null, unit: '', text: record.phenomena.join('; ') }); continue; }
    if (q.kind !== 'mass' && q.kind !== 'mol' && q.kind !== 'volume_gas' && q.kind !== 'remaining') {
      errors.push({ message: `truy vấn ${q.kind} chưa hỗ trợ ở nhánh este thủy phân v1` }); continue;
    }
    const tMap = atomMap(of);
    const row = outcome.ledger.find((r) => sameAtomMap(atomMap(r.formula), tMap));
    if (!row) { errors.push({ message: `"${of}" không có trong phản ứng thủy phân — kiểm lại 'of' của query ${q.kind}` }); continue; }
    if (row.after === null) { errors.push({ message: `"${of}" khai dư (excess) — lượng vô hạn, không truy vấn ${q.kind}` }); continue; }
    if (q.kind === 'mol') answers.push({ query: q, exact: ratToString(row.after), approx: ratApprox(row.after), unit: 'mol', text: `n(${of}) = ${fmtVN(ratApprox(row.after))} mol` });
    else if (q.kind === 'mass') { const m = mulR(row.after, molarMass(row.formula)); answers.push({ query: q, exact: ratToString(m), approx: ratApprox(m), unit: 'g', text: `m(${of}) = ${fmtVN(ratApprox(m))} g` }); }
    else if (q.kind === 'remaining') { const g = mulR(row.after, molarMass(row.formula)); answers.push({ query: q, exact: ratToString(row.after), approx: ratApprox(row.after), unit: 'mol', text: isZeroR(row.after) ? `${of} đã phản ứng hết` : `${of} còn ${fmtVN(ratApprox(row.after))} mol (≈ ${fmtVN(ratApprox(g))} g)` }); }
    else errors.push({ message: `"${of}" — thể tích khí không áp dụng cho muối/ancol thủy phân (§15.1)` });
  }

  const reactions = [{ id: record.id, equation: esterEquation(record), coefficients: [1, 1, 1, 1] }];
  void vmLabel;
  return done(errors.length === 0 && violations.length === 0, reactions, ledger, answers);
}

function esterEquation(record: ReactionRecord): string {
  const side = (arr: { formula: string; coeff: number }[]) => arr.map((x) => (x.coeff > 1 ? x.coeff : '') + x.formula).join(' + ');
  return `${side(record.reactants)} → ${side(record.products)}`;
}
function serializeRow(row: LedgerRow, state: SpeciesState): ChemLedgerEntry {
  return {
    formula: row.formula, state,
    before: row.before === null ? null : ratToString(row.before),
    consumed: ratToString(row.consumed), produced: ratToString(row.produced),
    after: row.after === null ? null : ratToString(row.after), excess: row.excess,
  };
}

// ── Dispatch nhánh hữu cơ (gọi từ runChem — DIFF 2a) ─────────────────────────
export function hasOrganicOp(plan: ChemPlan): boolean {
  return plan.ops.some((o) => ORGANIC_OP_NAMES.has(o.op));
}

export function runOrganic(plan: ChemPlan, emptyScene: ChemScene): ChemResult {
  const trace: string[] = [];
  const errors: { message: string }[] = [];
  const violations: Violation[] = [];
  const bail = (msg: string): ChemResult => { errors.push({ message: msg }); return { ok: false, reactions: [], ledger: [], answers: [], scene: emptyScene, violations, errors, trace }; };

  const vm = MOLAR_VOLUMES[plan.molarVolume];
  const vmLabel = plan.molarVolume === 22.4 ? 'đktc, 22,4 L/mol' : 'đkc, 24,79 L/mol';

  try {
    const esterOps = plan.ops.filter((o) => o.op === 'ester_hydrolysis') as EsterHydrolysisOpT[];
    const unknownOps = plan.ops.filter((o) => o.op === 'organic_unknown') as OrganicUnknownOpT[];

    if (esterOps.length > 0) {
      if (esterOps.length > 1) return bail('v1 chỉ hỗ trợ MỘT phản ứng ester_hydrolysis mỗi plan');
      if (unknownOps.length > 0) return bail('không trộn ester_hydrolysis với đốt cháy (organic_unknown) trong một plan (v1)');
      return runEster(esterOps[0], plan, emptyScene, trace, errors, violations, vm, vmLabel);
    }
    if (unknownOps.length === 0) return bail('plan hữu cơ không khai organic_unknown hay ester_hydrolysis');
    if (unknownOps.length > 1) return bail('v1 chỉ hỗ trợ MỘT chất chưa biết (organic_unknown) mỗi plan');
    return runCombustion(unknownOps[0], plan, emptyScene, trace, errors, violations, vm, vmLabel);
  } catch (e) {
    return bail(`lỗi engine hữu cơ: ${e instanceof Error ? e.message : String(e)}`);
  }
}
