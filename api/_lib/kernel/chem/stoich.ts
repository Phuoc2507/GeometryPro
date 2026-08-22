// api/_lib/kernel/chem/stoich.ts
// Stoichiometry HỮU TỈ exact (spec chem §9): lượng đề cho → mol, chất hết/chất dư (ξ),
// sổ cái ledger, và TỰ KIỂM bằng 2 định luật bảo toàn (đẳng thức hữu tỉ CHÍNH XÁC,
// không dung sai — review F10: chỉ asserts đối chiếu DỮ KIỆN ĐỀ mới có tol).
// Review F6/F3/F4/F5/F7: enforce record.domain TRƯỚC khi trả đáp — vi phạm miền áp dụng
// ⇒ trả outOfScope "ngoài phạm vi v0" + lý do hóa học, TUYỆT ĐỐI không trả đáp số.
import { molarMass, parseFormula } from './formula';
import { type ReactionRecord } from './reactionDB';
import { type Rat, R0, rat, addR, subR, mulR, divR, cmpR, isZeroR, minR, parseDecimal, ratToString } from './rat';

// Thể tích mol khí — hỗ trợ CẢ HAI mốc (spec §9.3): 22,4 (đktc) và 24,79 (đkc GDPT 2018).
export const MOLAR_VOLUMES: Record<number, Rat> = {
  22.4: rat(112n, 5n),
  24.79: rat(2479n, 100n),
};

export type AmountInput =
  | { grams: number | string }
  | { mol: number | string }
  | { liters_gas: number | string }
  | { solution: { molarity: number | string; liters: number | string } }
  | { solution_percent: { massGrams: number | string; percent: number | string } }
  | { excess: true };

// Parse một lượng đề cho, chặn ≤ 0 (review F22).
export function parsePositive(x: number | string, label: string): Rat {
  const v = parseDecimal(x);
  if (cmpR(v, R0) <= 0) throw new Error(`${label} phải > 0 (nhận được ${ratToString(v)})`);
  return v;
}

// Lượng đề cho → mol hữu tỉ (bảng §9.1). KHÔNG gọi cho amount excess.
export function amountToMol(formula: string, amount: AmountInput, vm: Rat): Rat {
  if ('excess' in amount) throw new Error(`amountToMol: ${formula} là chất dư (excess) — không có mol hữu hạn`);
  if ('grams' in amount) return divR(parsePositive(amount.grams, `khối lượng ${formula}`), molarMass(formula));
  if ('mol' in amount) return parsePositive(amount.mol, `số mol ${formula}`);
  if ('liters_gas' in amount) return divR(parsePositive(amount.liters_gas, `thể tích khí ${formula}`), vm);
  if ('solution' in amount) {
    return mulR(
      parsePositive(amount.solution.molarity, `nồng độ CM của ${formula}`),
      parsePositive(amount.solution.liters, `thể tích dung dịch ${formula}`)
    );
  }
  const mass = parsePositive(amount.solution_percent.massGrams, `khối lượng dung dịch ${formula}`);
  const pct = parsePositive(amount.solution_percent.percent, `C% của ${formula}`);
  const soluteMass = divR(mulR(mass, pct), rat(100n));
  return divR(soluteMass, molarMass(formula));
}

export type LedgerRow = {
  formula: string;
  role: 'reactant' | 'product' | 'spectator';
  coeff: number; // 0 với spectator
  before: Rat | null; // null = ∞ (excess)
  consumed: Rat;
  produced: Rat;
  after: Rat | null; // null = ∞ (excess)
  excess: boolean;
};

export type Violation = { law: string; detail: string };

export type ReactResult =
  | { ok: true; ledger: LedgerRow[]; violations: []; xi: Rat }
  | { ok: false; ledger: LedgerRow[]; violations: Violation[]; outOfScope?: { message: string } };

// Kiểm miền áp dụng (review F6) — trả thông điệp lỗi hoặc null nếu hợp lệ.
export function checkDomain(
  record: ReactionRecord,
  mols: Map<string, Rat>,
  excessSet: Set<string>
): string | null {
  const d = record.domain;
  if (!d) return null;
  const outOfScope = (detail: string) =>
    `ngoài phạm vi v0: ${detail} — ${d.reason}`;

  for (const f of d.requireExcess ?? []) {
    if (!excessSet.has(f)) {
      return outOfScope(`record ${record.id} yêu cầu ${f} phải DƯ (khai excess:true), nhưng đề cho ${f} hữu hạn hoặc không khai dư`);
    }
  }
  for (const f of d.mustBeLimiting ?? []) {
    if (excessSet.has(f)) {
      return outOfScope(`record ${record.id} yêu cầu ${f} phải là chất HẾT TRƯỚC, nhưng ${f} được khai dư (excess)`);
    }
    const nf = mols.get(f);
    const cf = record.reactants.find((x) => x.formula === f)?.coeff;
    if (!nf || !cf) continue; // thiếu số liệu (bài định tính) — runChem đã xử lý riêng
    const ratioF = divR(nf, rat(BigInt(cf)));
    for (const other of record.reactants) {
      if (other.formula === f || excessSet.has(other.formula)) continue;
      const no = mols.get(other.formula);
      if (!no) continue;
      const ratioO = divR(no, rat(BigInt(other.coeff)));
      if (cmpR(ratioF, ratioO) > 0) {
        return outOfScope(
          `n(${f}) = ${ratToString(nf)} mol vượt tỉ lệ cho phép so với n(${other.formula}) = ${ratToString(no)} mol (cần n(${f})/${cf} ≤ n(${other.formula})/${other.coeff})`
        );
      }
    }
  }
  if (d.maxRatio) {
    const { of, per, ratio } = d.maxRatio;
    const nOf = mols.get(of);
    const nPer = mols.get(per);
    if (excessSet.has(of)) return outOfScope(`${of} được khai dư (excess) nhưng miền áp dụng giới hạn n(${of}) ≤ ${ratio}·n(${per})`);
    if (nOf && nPer && cmpR(nOf, mulR(parseDecimal(ratio), nPer)) > 0) {
      return outOfScope(`n(${of}) = ${ratToString(nOf)} > ${ratio}·n(${per})`);
    }
  }
  return null;
}

// react — tính ξ (mức phản ứng), ghi sổ cái, rồi TỰ KIỂM 2 định luật bảo toàn.
// mols: mol các chất HỮU HẠN (kể cả chất không tham gia record — spectator);
// excessSet: các chất khai dư (∞, bỏ qua khi lấy min ξ).
export function react(
  record: ReactionRecord,
  mols: Map<string, Rat>,
  excessSet: Set<string>
): ReactResult {
  // F6: enforce miền áp dụng TRƯỚC khi tính — vi phạm thì không trả bất kỳ đáp số nào.
  const domainError = checkDomain(record, mols, excessSet);
  if (domainError) {
    return { ok: false, ledger: [], violations: [], outOfScope: { message: domainError } };
  }

  // ξ = min hữu tỉ n(Rᵢ)/aᵢ trên các reactant hữu hạn (excess bỏ qua) — §9.2.
  let xi: Rat | null = null;
  for (const rr of record.reactants) {
    if (excessSet.has(rr.formula)) continue;
    const n = mols.get(rr.formula);
    if (n === undefined) {
      return {
        ok: false, ledger: [], violations: [],
        outOfScope: { message: `thiếu lượng chất ${rr.formula} (không khai amount cũng không khai excess) — không xác định được mức phản ứng` },
      };
    }
    const ratio = divR(n, rat(BigInt(rr.coeff)));
    xi = xi === null ? ratio : minR(xi, ratio);
  }
  if (xi === null) {
    // F23: mọi reactant đều excess ⇒ ξ vô định.
    return {
      ok: false, ledger: [], violations: [],
      outOfScope: { message: 'không có chất hữu hạn: mọi chất tham gia đều khai dư (excess) — mức phản ứng ξ vô định, không tính được' },
    };
  }

  const ledger: LedgerRow[] = [];
  const seen = new Set<string>();
  for (const rr of record.reactants) {
    const isExcess = excessSet.has(rr.formula);
    const consumed = mulR(rat(BigInt(rr.coeff)), xi);
    const before = isExcess ? null : mols.get(rr.formula)!;
    ledger.push({
      formula: rr.formula,
      role: 'reactant',
      coeff: rr.coeff,
      before,
      consumed,
      produced: R0,
      after: before === null ? null : subR(before, consumed),
      excess: isExcess,
    });
    seen.add(rr.formula);
  }
  for (const pp of record.products) {
    const produced = mulR(rat(BigInt(pp.coeff)), xi);
    const before = mols.get(pp.formula) ?? R0; // sản phẩm có sẵn trong mix (hiếm) — cộng dồn
    ledger.push({
      formula: pp.formula,
      role: 'product',
      coeff: pp.coeff,
      before,
      consumed: R0,
      produced,
      after: addR(before, produced),
      excess: false,
    });
    seen.add(pp.formula);
  }
  // Spectator: chất khai trong mix nhưng không nằm trong record.
  for (const [f, n] of mols) {
    if (seen.has(f)) continue;
    ledger.push({ formula: f, role: 'spectator', coeff: 0, before: n, consumed: R0, produced: R0, after: n, excess: false });
  }
  for (const f of excessSet) {
    if (seen.has(f)) continue;
    ledger.push({ formula: f, role: 'spectator', coeff: 0, before: null, consumed: R0, produced: R0, after: null, excess: true });
  }

  // ── TỰ KIỂM (luôn bật, exact — §9.5) ────────────────────────────────────────
  const violations: Violation[] = [];

  // 1) Bảo toàn khối lượng: Σ m(consumed) = Σ m(produced), cmpR === 0.
  let massIn = R0;
  let massOut = R0;
  for (const row of ledger) {
    if (!isZeroR(row.consumed)) massIn = addR(massIn, mulR(row.consumed, molarMass(row.formula)));
    if (!isZeroR(row.produced)) massOut = addR(massOut, mulR(row.produced, molarMass(row.formula)));
  }
  if (cmpR(massIn, massOut) !== 0) {
    violations.push({
      law: 'bảo toàn khối lượng',
      detail: `Σm(tiêu thụ) = ${ratToString(massIn)} g ≠ Σm(tạo thành) = ${ratToString(massOut)} g`,
    });
  }

  // 2) Bảo toàn TỪNG nguyên tố (exact).
  const elIn = new Map<string, Rat>();
  const elOut = new Map<string, Rat>();
  for (const row of ledger) {
    if (!isZeroR(row.consumed)) {
      for (const [el, cnt] of parseFormula(row.formula)) {
        elIn.set(el, addR(elIn.get(el) ?? R0, mulR(row.consumed, rat(BigInt(cnt)))));
      }
    }
    if (!isZeroR(row.produced)) {
      for (const [el, cnt] of parseFormula(row.formula)) {
        elOut.set(el, addR(elOut.get(el) ?? R0, mulR(row.produced, rat(BigInt(cnt)))));
      }
    }
  }
  for (const el of new Set([...elIn.keys(), ...elOut.keys()])) {
    const a = elIn.get(el) ?? R0;
    const b = elOut.get(el) ?? R0;
    if (cmpR(a, b) !== 0) {
      violations.push({
        law: `bảo toàn nguyên tố ${el}`,
        detail: `mol ${el} tiêu thụ = ${ratToString(a)} ≠ tạo thành = ${ratToString(b)}`,
      });
    }
  }

  // 3) after ≥ 0 với mọi chất hữu hạn.
  for (const row of ledger) {
    if (row.after !== null && cmpR(row.after, R0) < 0) {
      violations.push({
        law: 'âm lượng chất',
        detail: `${row.formula} có after = ${ratToString(row.after)} < 0 (bug limiting)`,
      });
    }
  }

  if (violations.length > 0) return { ok: false, ledger, violations };
  return { ok: true, ledger, violations: [], xi };
}
