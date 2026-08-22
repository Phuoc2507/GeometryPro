// src/components/chem/sampleScenes.ts
// ─────────────────────────────────────────────────────────────────────────────
// 3 cảnh mẫu (+1 bonus) đúng shape `ChemScene` — dựng THỦ CÔNG khớp CHÍNH XÁC cách
// `buildScene` (api/_lib/kernel/chem/scene.ts) phát ra event/màu cho từng bài. Dùng chung
// cho demo và test → cảnh trong test = cảnh trong demo (không lệch).
//
// Màu/hex lấy đúng bảng COLORS §12:
//   FeCl3 (dd) vàng nâu #B7791F · Fe(OH)3 (rắn) nâu đỏ #8B4513 · dd không màu #EAF4FB
//   CuSO4 (dd) xanh lam #2E86DE · Cu (rắn) đỏ ánh kim #B87333 · Fe (rắn) trắng xám #7F8C8D
//   Zn (rắn) xám bạc #A9A9A9 · H2/CO2 (khí) không màu #F8F9FA · CaCO3 (rắn) trắng #FAFAFA
// ─────────────────────────────────────────────────────────────────────────────
import type { ChemScene } from '@/types/chemScene';

/**
 * (a) BÀI KẾT TỦA — FeCl3 + 3NaOH → Fe(OH)3↓(nâu đỏ) + 3NaCl (R36).
 * Nhỏ NaOH vào dd FeCl3 (vàng nâu) ⇒ kết tủa nâu đỏ, dd nhạt màu dần. 2 bình.
 */
export const sceneFeOH3Precipitate: ChemScene = {
  vessels: [
    {
      id: 'v1',
      kind: 'beaker',
      contents: [{ formula: 'FeCl3', state: 'solution', color: '#B7791F', colorName: 'vàng nâu', amountText: 'dung dịch FeCl₃' }],
    },
    {
      id: 'v2',
      kind: 'beaker',
      contents: [{ formula: 'NaOH', state: 'solution', color: '#EAF4FB', colorName: 'không màu', amountText: 'dung dịch NaOH' }],
    },
  ],
  events: [
    { t: 0, kind: 'pour', from: 'v2', into: 'v1', formula: 'NaOH' },
    { t: 1, kind: 'color_change', vessel: 'v1', fromColor: '#B7791F', toColor: '#EAF4FB', text: 'màu vàng nâu của dung dịch FeCl₃ nhạt dần' },
    { t: 2, kind: 'precipitate', vessel: 'v1', formula: 'Fe(OH)3', color: '#8B4513', text: 'xuất hiện kết tủa nâu đỏ (Fe(OH)₃)' },
  ],
  captions: [{ t: 1, text: 'Xuất hiện kết tủa nâu đỏ Fe(OH)₃; màu vàng nâu của dung dịch nhạt dần.' }],
};

/**
 * (b) BÀI SỦI KHÍ — Zn + 2HCl → ZnCl2 + H2↑ (R13).
 * Thả viên kẽm vào dd HCl ⇒ kẽm tan, sủi bọt khí H2 không màu. 1 bình.
 */
export const sceneZnHClGas: ChemScene = {
  vessels: [
    {
      id: 'v1',
      kind: 'beaker',
      contents: [
        { formula: 'HCl', state: 'solution', color: '#EAF4FB', colorName: 'không màu', amountText: 'dung dịch HCl' },
        { formula: 'Zn', state: 'solid', color: '#A9A9A9', colorName: 'xám bạc', amountText: '13 g' },
      ],
    },
  ],
  events: [
    { t: 0, kind: 'add_solid', into: 'v1', formula: 'Zn' },
    { t: 1, kind: 'dissolve', vessel: 'v1', formula: 'Zn', text: 'viên kẽm tan dần' },
    { t: 2, kind: 'gas_bubbles', vessel: 'v1', formula: 'H2', text: 'thoát khí H₂ không màu (sủi bọt)' },
  ],
  captions: [{ t: 1, text: 'Viên kẽm tan dần, sủi bọt khí không màu (H₂).' }],
};

/**
 * (c) BÀI ĐỔI MÀU — Fe + CuSO4 → FeSO4 + Cu↓ (R20).
 * Ngâm đinh sắt (dư) trong dd CuSO4 (xanh lam) ⇒ dd mất màu xanh, lớp Cu đỏ bám lên sắt. 1 bình.
 */
export const sceneFeCuSO4Color: ChemScene = {
  vessels: [
    {
      id: 'v1',
      kind: 'beaker',
      contents: [
        { formula: 'CuSO4', state: 'solution', color: '#2E86DE', colorName: 'xanh lam', amountText: 'dung dịch CuSO₄' },
        { formula: 'Fe', state: 'solid', color: '#7F8C8D', colorName: 'trắng xám', amountText: 'đinh sắt (dư)' },
      ],
    },
  ],
  events: [
    { t: 0, kind: 'add_solid', into: 'v1', formula: 'Fe' },
    { t: 1, kind: 'dissolve', vessel: 'v1', formula: 'Fe', text: 'Fe tan một phần (còn dư)' },
    {
      t: 2,
      kind: 'color_change',
      vessel: 'v1',
      fromColor: '#2E86DE',
      toColor: '#EAF4FB',
      text: 'màu xanh lam của dung dịch CuSO₄ nhạt dần rồi mất màu hoàn toàn (CuSO₄ hết)',
    },
    { t: 3, kind: 'precipitate', vessel: 'v1', formula: 'Cu', color: '#B87333', text: 'lớp đồng màu đỏ (ánh kim) bám lên đinh sắt (Cu)' },
  ],
  captions: [{ t: 1, text: 'Lớp đồng đỏ bám lên sắt; màu xanh lam của dung dịch nhạt dần rồi mất màu.' }],
};

/**
 * (bonus) NHIỆT PHÂN — CaCO3 --t°--> CaO + CO2↑ (R43). Ống nghiệm + đun + khí thoát.
 * Khoe nhánh render `test_tube` + `heat` (3 cảnh trên không dùng tới).
 */
export const sceneCaCO3Decompose: ChemScene = {
  vessels: [
    {
      id: 'v1',
      kind: 'test_tube',
      contents: [{ formula: 'CaCO3', state: 'solid', color: '#FAFAFA', colorName: 'trắng', amountText: '50 g' }],
    },
  ],
  events: [
    { t: 0, kind: 'add_solid', into: 'v1', formula: 'CaCO3' },
    { t: 1, kind: 'heat', vessel: 'v1' },
    { t: 2, kind: 'gas_bubbles', vessel: 'v1', formula: 'CO2', text: 'thoát khí CO₂ không màu (làm đục nước vôi trong)' },
  ],
  captions: [{ t: 2, text: 'Nung CaCO₃: chất rắn phân hủy, khí CO₂ thoát ra làm đục nước vôi trong.' }],
};

export const SAMPLE_SCENES: { key: string; title: string; scene: ChemScene }[] = [
  { key: 'precipitate', title: '(a) Kết tủa · FeCl₃ + NaOH → Fe(OH)₃↓ nâu đỏ', scene: sceneFeOH3Precipitate },
  { key: 'gas', title: '(b) Sủi khí · Zn + HCl → H₂↑', scene: sceneZnHClGas },
  { key: 'color', title: '(c) Đổi màu · Fe + CuSO₄ → dung dịch nhạt màu + Cu đỏ', scene: sceneFeCuSO4Color },
  { key: 'decompose', title: '(bonus) Nhiệt phân · CaCO₃ →(t°) CaO + CO₂↑', scene: sceneCaCO3Decompose },
];
