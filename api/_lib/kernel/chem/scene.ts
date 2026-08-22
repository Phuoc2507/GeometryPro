// api/_lib/kernel/chem/scene.ts
// ChemScene JSON cho frontend (spec chem §11–§12) — sinh TẤT ĐỊNH từ ledger + record + bảng màu.
// Review đã áp:
//   F16 — bổ sung màu chất rắn DB sinh ra (CuCl2, FeCl3, Ca(OH)2, Na2CO3, K2MnO4, MnO2…);
//         default solid ngoài bảng = "xám nhạt" (có chủ đích).
//   F24 — color_change: "nhạt dần" khi consumed > 0; "mất màu" CHỈ khi after = 0.
//   §16.2 — dd CuCl2 chốt "xanh lam" (đồng bộ Cu²⁺; dd đặc thực tế ngả lục — ghi chú, không đổi).
import { type ReactionRecord, type SpeciesState } from './reactionDB';
import { type LedgerRow } from './stoich';
import { type Rat, cmpR, R0, isZeroR } from './rat';

export type ChemColor = { colorName: string; hex: string };

export const COLORS: {
  solution: Record<string, ChemColor>;
  solid: Record<string, ChemColor>;
  gas: Record<string, ChemColor>;
  defaults: Record<'solution' | 'solid' | 'gas' | 'liquid', ChemColor>;
} = {
  // Dung dịch (không có trong bảng ⇒ "không màu")
  solution: {
    // ion Cu²⁺ — xanh lam (dd CuCl2 đặc thực tế ngả xanh lục do phức cloro, đề thi VN ghi "xanh")
    CuSO4: { colorName: 'xanh lam', hex: '#2E86DE' },
    CuCl2: { colorName: 'xanh lam', hex: '#2E86DE' },
    'Cu(NO3)2': { colorName: 'xanh lam', hex: '#2E86DE' },
    // ion Fe³⁺ — vàng nâu
    FeCl3: { colorName: 'vàng nâu', hex: '#B7791F' },
    'Fe2(SO4)3': { colorName: 'vàng nâu', hex: '#B7791F' },
    'Fe(NO3)3': { colorName: 'vàng nâu', hex: '#B7791F' },
    // ion Fe²⁺ — lục rất nhạt (gần như không màu); thêm Fe(NO3)2 (sản phẩm R23) — cùng ion
    FeCl2: { colorName: 'lục rất nhạt (gần như không màu)', hex: '#C8E6C9' },
    FeSO4: { colorName: 'lục rất nhạt (gần như không màu)', hex: '#C8E6C9' },
    'Fe(NO3)2': { colorName: 'lục rất nhạt (gần như không màu)', hex: '#C8E6C9' },
    KMnO4: { colorName: 'tím', hex: '#6F42C1' },
  },
  // Chất rắn / kết tủa
  solid: {
    Cu: { colorName: 'đỏ (ánh kim)', hex: '#B87333' },
    CuO: { colorName: 'đen', hex: '#1B1B1B' },
    'Cu(OH)2': { colorName: 'xanh lam', hex: '#3498DB' },
    Fe: { colorName: 'trắng xám', hex: '#7F8C8D' },
    Ag: { colorName: 'trắng xám (ánh kim)', hex: '#C0C0C0' },
    AgCl: { colorName: 'trắng (hóa đen ngoài sáng)', hex: '#F5F5F5' },
    BaSO4: { colorName: 'trắng', hex: '#FAFAFA' },
    CaCO3: { colorName: 'trắng', hex: '#FAFAFA' },
    BaCO3: { colorName: 'trắng', hex: '#FAFAFA' },
    'Mg(OH)2': { colorName: 'trắng', hex: '#FAFAFA' },
    'Zn(OH)2': { colorName: 'trắng', hex: '#FAFAFA' },
    Na: { colorName: 'trắng bạc', hex: '#DCDCDC' },
    K: { colorName: 'trắng bạc', hex: '#DCDCDC' },
    Mg: { colorName: 'trắng bạc', hex: '#DCDCDC' },
    Al: { colorName: 'trắng bạc', hex: '#D9D9D9' },
    Zn: { colorName: 'xám bạc', hex: '#A9A9A9' },
    Ca: { colorName: 'trắng bạc', hex: '#DCDCDC' },
    Ba: { colorName: 'trắng bạc', hex: '#DCDCDC' },
    KMnO4: { colorName: 'tím đen', hex: '#3D1E52' },
    'Fe(OH)3': { colorName: 'nâu đỏ', hex: '#8B4513' },
    'Fe(OH)2': { colorName: 'trắng xanh', hex: '#D5E8D4' },
    Fe2O3: { colorName: 'đỏ nâu', hex: '#A0522D' },
    Fe3O4: { colorName: 'nâu đen', hex: '#2C2C2C' },
    FeS: { colorName: 'xám đen', hex: '#3B3B3B' },
    S: { colorName: 'vàng', hex: '#F1C40F' },
    MgO: { colorName: 'trắng', hex: '#FDFDFD' },
    CaO: { colorName: 'trắng', hex: '#FDFDFD' },
    Al2O3: { colorName: 'trắng', hex: '#FDFDFD' },
    ZnO: { colorName: 'trắng', hex: '#FDFDFD' },
    'Al(OH)3': { colorName: 'keo trắng', hex: '#F2F2F2' },
    // F16: chất rắn DB sinh ra còn thiếu trong bảng spec
    CuCl2: { colorName: 'vàng nâu', hex: '#C08A2D' }, // khói/rắn khan CuCl2 (R06)
    FeCl3: { colorName: 'nâu đỏ', hex: '#8B3A1E' }, // khói/rắn khan FeCl3 (R05)
    'Ca(OH)2': { colorName: 'trắng', hex: '#FAFAFA' }, // tôi vôi (R24)
    Na2CO3: { colorName: 'trắng', hex: '#FAFAFA' }, // nhiệt phân NaHCO3 (R47)
    K2MnO4: { colorName: 'lục', hex: '#2E7D32' }, // nhiệt phân KMnO4 (R44)
    MnO2: { colorName: 'đen', hex: '#2B2B2B' }, // nhiệt phân KMnO4 (R44)
    NaHCO3: { colorName: 'trắng', hex: '#FAFAFA' },
  },
  // Chất khí (màu/dấu hiệu)
  gas: {
    H2: { colorName: 'không màu', hex: '#F8F9FA' },
    O2: { colorName: 'không màu', hex: '#F8F9FA' },
    N2: { colorName: 'không màu', hex: '#F8F9FA' },
    CO: { colorName: 'không màu (độc)', hex: '#F8F9FA' },
    CO2: { colorName: 'không màu (làm đục nước vôi trong)', hex: '#F8F9FA' },
    Cl2: { colorName: 'vàng lục (mùi hắc, độc)', hex: '#BFCE3A' },
    SO2: { colorName: 'không màu (mùi hắc)', hex: '#F8F9FA' },
    SO3: { colorName: 'không màu', hex: '#F8F9FA' },
    NO: { colorName: 'không màu (hóa nâu trong không khí)', hex: '#F8F9FA' },
    NO2: { colorName: 'nâu đỏ', hex: '#8B3A1E' },
    NH3: { colorName: 'không màu (mùi khai, làm xanh quỳ tím ẩm)', hex: '#F8F9FA' },
    H2O: { colorName: 'không màu (hơi nước)', hex: '#F8F9FA' },
  },
  defaults: {
    solution: { colorName: 'không màu', hex: '#EAF4FB' },
    solid: { colorName: 'xám nhạt', hex: '#D3D3D3' }, // F16: default có chủ đích
    gas: { colorName: 'không màu', hex: '#F8F9FA' },
    liquid: { colorName: 'không màu', hex: '#EAF4FB' },
  },
};

export function colorOf(formula: string, state: SpeciesState): ChemColor {
  if (state === 'solution') return COLORS.solution[formula] ?? COLORS.defaults.solution;
  if (state === 'solid') return COLORS.solid[formula] ?? COLORS.defaults.solid;
  if (state === 'gas') return COLORS.gas[formula] ?? COLORS.defaults.gas;
  return COLORS.defaults.liquid;
}

// ── ChemScene (spec §11) ─────────────────────────────────────────────────────
export type ChemSceneEvent =
  | { t: number; kind: 'pour'; from: string; into: string; formula: string }
  | { t: number; kind: 'add_solid'; into: string; formula: string }
  | { t: number; kind: 'heat'; vessel: string }
  | { t: number; kind: 'color_change'; vessel: string; fromColor: string; toColor: string; text: string }
  | { t: number; kind: 'precipitate'; vessel: string; formula: string; color: string; text: string }
  | { t: number; kind: 'gas_bubbles'; vessel: string; formula: string; text: string }
  | { t: number; kind: 'dissolve'; vessel: string; formula: string; text: string };

export type ChemScene = {
  vessels: {
    id: string;
    kind: 'beaker' | 'test_tube';
    contents: { formula: string; state: 'solution' | 'solid' | 'gas'; color: string; colorName: string; amountText?: string }[];
  }[];
  events: ChemSceneEvent[];
  captions: { t: number; text: string }[];
};

export type SceneSpeciesInput = {
  formula: string;
  state: SpeciesState;
  excess: boolean;
  amountText?: string;
};

export const EMPTY_SCENE: ChemScene = { vessels: [], events: [], captions: [] };

// Sinh scene tất định: mỗi species dạng solution → 1 beaker; chất rắn add_solid vào
// vessel trộn; heated → heat; sản phẩm kết tủa/khí → precipitate/gas_bubbles; dung dịch
// có màu bị tiêu thụ → color_change (F24); captions theo phenomena / lý do noReaction.
export function buildScene(input: {
  species: SceneSpeciesInput[];
  record: ReactionRecord | null;
  ledger: LedgerRow[] | null;
  heated: boolean;
  noReactionReason?: string;
}): ChemScene {
  const { species, record, ledger, heated, noReactionReason } = input;
  const vessels: ChemScene['vessels'] = [];
  const events: ChemSceneEvent[] = [];
  const captions: ChemScene['captions'] = [];
  let t = 0;

  const solutionSpecies = species.filter((s) => s.state === 'solution');
  for (const s of solutionSpecies) {
    const c = colorOf(s.formula, 'solution');
    vessels.push({
      id: `v${vessels.length + 1}`,
      kind: 'beaker',
      contents: [{ formula: s.formula, state: 'solution', color: c.hex, colorName: c.colorName, amountText: s.amountText }],
    });
  }
  if (vessels.length === 0) {
    // Không có dung dịch nào (vd nhiệt phân) → một ống nghiệm chứa chất rắn/khí ban đầu.
    vessels.push({ id: 'v1', kind: 'test_tube', contents: [] });
  }
  const mixId = vessels[0].id;

  // Đổ các dung dịch còn lại vào vessel trộn (vessels[i] ↔ solutionSpecies[i]).
  for (let i = 1; i < solutionSpecies.length; i++) {
    events.push({ t: t++, kind: 'pour', from: vessels[i].id, into: mixId, formula: solutionSpecies[i].formula });
  }
  // Thêm chất rắn / dẫn khí vào vessel trộn.
  for (const s of species) {
    if (s.state === 'solid') {
      const c = colorOf(s.formula, 'solid');
      vessels[0].contents.push({ formula: s.formula, state: 'solid', color: c.hex, colorName: c.colorName, amountText: s.amountText });
      events.push({ t: t++, kind: 'add_solid', into: mixId, formula: s.formula });
    } else if (s.state === 'gas') {
      const c = colorOf(s.formula, 'gas');
      vessels[0].contents.push({ formula: s.formula, state: 'gas', color: c.hex, colorName: c.colorName, amountText: s.amountText });
      events.push({ t: t++, kind: 'gas_bubbles', vessel: mixId, formula: s.formula, text: `dẫn khí ${s.formula} vào` });
    }
  }
  if (heated) events.push({ t: t++, kind: 'heat', vessel: mixId });

  if (!record || !ledger) {
    if (noReactionReason) captions.push({ t, text: `không có phản ứng xảy ra: ${noReactionReason}` });
    return { vessels, events, captions };
  }

  const reactionT = t;
  const stateOfSpecies = new Map(species.map((s) => [s.formula, s.state]));

  // Chất rắn tham gia tan dần (môi trường dung dịch).
  if (record.medium === 'dd') {
    for (const row of ledger) {
      if (row.role !== 'reactant' || isZeroR(row.consumed)) continue;
      if (stateOfSpecies.get(row.formula) !== 'solid') continue;
      const gone = row.after !== null && cmpR(row.after, R0) === 0;
      events.push({
        t: t++, kind: 'dissolve', vessel: mixId, formula: row.formula,
        text: gone ? `${row.formula} tan hết` : `${row.formula} tan một phần (còn dư)`,
      });
    }
  }

  // F24: dung dịch có màu bị tiêu thụ → nhạt dần; CHỈ khi after = 0 mới "mất màu".
  for (const row of ledger) {
    if (row.role !== 'reactant' || isZeroR(row.consumed)) continue;
    if (stateOfSpecies.get(row.formula) !== 'solution') continue;
    const c = COLORS.solution[row.formula];
    if (!c) continue; // dung dịch không màu — không có gì để nhạt
    const emptied = row.after !== null && cmpR(row.after, R0) === 0;
    events.push({
      t: t++, kind: 'color_change', vessel: mixId, fromColor: c.hex, toColor: COLORS.defaults.solution.hex,
      text: emptied
        ? `màu ${c.colorName} của dung dịch ${row.formula} nhạt dần rồi mất màu hoàn toàn (${row.formula} hết)`
        : `màu ${c.colorName} của dung dịch ${row.formula} nhạt dần`,
    });
  }

  // Sản phẩm: kết tủa (rắn trong môi trường dd) / khí.
  for (const prod of record.products) {
    if (prod.state === 'solid' && record.medium === 'dd') {
      const c = colorOf(prod.formula, 'solid');
      events.push({
        t: t++, kind: 'precipitate', vessel: mixId, formula: prod.formula, color: c.hex,
        text: `xuất hiện kết tủa ${c.colorName} (${prod.formula})`,
      });
    } else if (prod.state === 'gas') {
      const c = colorOf(prod.formula, 'gas');
      events.push({
        t: t++, kind: 'gas_bubbles', vessel: mixId, formula: prod.formula,
        text: `thoát khí ${prod.formula} ${c.colorName}`,
      });
    }
  }

  for (const ph of record.phenomena) captions.push({ t: reactionT, text: ph });
  return { vessels, events, captions };
}
