// src/types/chemScene.ts
// ─────────────────────────────────────────────────────────────────────────────
// MIRROR (bản sao type) của `api/_lib/kernel/chem/scene.ts` — GIỮ ĐỒNG BỘ THỦ CÔNG.
//
// Vì sao KHÔNG import trực tiếp type từ api/ vào src/:
//   1. `tsconfig.app.json` chỉ `include: ["src"]`. Import xuyên biên `api/_lib/kernel/chem/scene.ts`
//      sẽ kéo theo cả chuỗi phụ thuộc của kernel (reactionDB → stoich → rat → scalar…) vào
//      chương trình typecheck của FE — trong khi `tsconfig.kernel.json` đã ghi rõ kernel cũ còn
//      ~20 lỗi type sẵn có (run.ts, verify.ts, dialects/oxyz.ts…). Kéo vào = FE "dính" lỗi không phải của mình.
//   2. api/ là backend serverless (Vercel functions), src/ là app Vite — trộn biên giới build/runtime
//      là mùi kiến trúc. Component ChemScene phải THUẦN, chỉ phụ thuộc dữ liệu (props), không phụ thuộc kernel.
//
// Do đó: khai lại ĐÚNG shape ở đây. Nếu `scene.ts` (nguồn) đổi type → cập nhật file này cho khớp.
// Đã đối chiếu 1:1 với scene.ts tại thời điểm tạo (spec chem §11–§12).
// ─────────────────────────────────────────────────────────────────────────────

/** Một màu hóa chất: tên tiếng Việt + mã hex (khớp bảng COLORS trong scene.ts §12). */
export type ChemColor = { colorName: string; hex: string };

/** Trạng thái một chất trong bình (đúng union của scene.ts — KHÔNG có 'liquid' ở tầng content). */
export type ChemContentState = 'solution' | 'solid' | 'gas';

/** Một chất nằm trong bình: công thức + trạng thái + màu (hex đã tra sẵn) + tên màu + lượng (nếu có). */
export type ChemContent = {
  formula: string;
  state: ChemContentState;
  color: string;      // hex, ví dụ '#2E86DE'
  colorName: string;  // 'xanh lam'…
  amountText?: string;
};

/** Một bình: cốc (beaker) hoặc ống nghiệm (test_tube). */
export type ChemVessel = {
  id: string;                         // 'v1', 'v2'…
  kind: 'beaker' | 'test_tube';
  contents: ChemContent[];
};

/**
 * Chuỗi sự kiện theo mốc thời gian logic `t` (0,1,2…). Frontend tự co giãn thời lượng.
 * Discriminated union theo `kind` — render đúng từng nhánh, không đoán field.
 */
export type ChemSceneEvent =
  | { t: number; kind: 'pour'; from: string; into: string; formula: string }
  | { t: number; kind: 'add_solid'; into: string; formula: string }
  | { t: number; kind: 'heat'; vessel: string }
  | { t: number; kind: 'color_change'; vessel: string; fromColor: string; toColor: string; text: string }
  | { t: number; kind: 'precipitate'; vessel: string; formula: string; color: string; text: string }
  | { t: number; kind: 'gas_bubbles'; vessel: string; formula: string; text: string }
  | { t: number; kind: 'dissolve'; vessel: string; formula: string; text: string };

/** Cảnh thí nghiệm Hóa — hợp đồng dữ liệu engine → frontend (scene.ts §11). */
export type ChemScene = {
  vessels: ChemVessel[];
  events: ChemSceneEvent[];
  captions: { t: number; text: string }[];
};

/** Cảnh rỗng (đối chiếu EMPTY_SCENE của scene.ts). */
export const EMPTY_CHEM_SCENE: ChemScene = { vessels: [], events: [], captions: [] };

/**
 * Màu mặc định cho dung dịch "không màu" (đối chiếu COLORS.defaults.solution của scene.ts).
 * Dùng khi cần vẽ mức dung dịch mà content không tự mang màu (hiếm — content luôn kèm hex).
 */
export const CHEM_DEFAULT_SOLUTION_HEX = '#EAF4FB';
