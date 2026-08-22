// src/lib/subjectPrefilter.ts
// ─────────────────────────────────────────────────────────────────────────────
// BẢN SAO FRONTEND (mirror) của `api/_lib/kernel-bridge/subjectClassifier.js` — GIỮ ĐỒNG BỘ THỦ CÔNG.
//
// Vì sao mirror thay vì import xuyên biên api/ → src/:
//   • `tsconfig.app.json` chỉ include `["src"]`; kéo file api/ vào chương trình typecheck của FE làm
//     "dính" cả chuỗi phụ thuộc backend (giống lý do đã nêu ở `src/types/chemScene.ts`).
//   • Prefilter là logic TẤT ĐỊNH thuần (không mạng, không LLM) ⇒ chép nguyên sang FE để "đoán môn"
//     NGAY khi người dùng dán đề, quyết định gọi `/api/analyze-problem` (Lý/Hóa) hay giữ luồng Toán —
//     KHÔNG tốn một vòng mạng chỉ để biết đây là đề Toán.
//
// Đối chiếu 1:1 với subjectClassifier.js tại thời điểm tạo. Nếu file nguồn đổi bảng từ khóa/ngưỡng →
// cập nhật file này cho khớp (test `__tests__/subjectPrefilter.test.ts` đối chiếu nhãn để bắt lệch).
//
// TRIẾT LÝ AN TOÀN (như bản gốc): 'geometry' là MẶC ĐỊNH. Đề không rõ Lý/Hóa → 'geometry' (luồng Toán
// cũ tự abstain nếu ngoài phạm vi, KHÔNG bịa). Chỉ trả 'physics'/'chem' khi tín hiệu môn đó ĐỦ MẠNH và
// VƯỢT điểm hình học. 'unknown' = Lý và Hóa cùng mạnh, ngang nhau (mơ hồ) — FE gộp về 'geometry'.
// ─────────────────────────────────────────────────────────────────────────────

export type Subject = 'geometry' | 'physics' | 'chem';
export type SubjectRaw = Subject | 'unknown';

const STRONG = 3;
const MED = 2;
const WEAK = 1;

type LexRow = readonly [RegExp, number];

// ── HÓA — từ khóa tiếng Việt (khớp trên bản đã lowercase) ──────────────────────
const CHEM_LEXICAL: readonly LexRow[] = [
  // Dấu hiệu MẠNH — gần như chỉ xuất hiện trong đề Hóa
  [/phản ứng/, STRONG],
  [/dung dịch/, STRONG],
  [/ho[àa] tan/, STRONG], // "hòa tan" | "hoà tan"
  [/kết tủa/, STRONG],
  [/nồng độ/, STRONG],
  [/nhiệt phân/, STRONG],
  [/kim loại/, STRONG],
  [/ox[ií]t/, STRONG], // "oxit" | "oxít"
  [/\bax[ií]t\b/, STRONG], // "axit" | "axít"
  [/bazơ/, STRONG],
  [/\bmuối\b/, STRONG],
  [/đktc/, STRONG],
  [/đkc/, STRONG],
  [/phương trình h[óo]a học/, STRONG],
  [/điều chế/, STRONG],
  [/\bmol\b/, STRONG],
  // Dấu hiệu VỪA
  [/\bnung\b/, MED],
  [/\d\s*(?:g|gam)\b/, MED], // khối lượng gam: "5,4 g", "16,8 gam" ("kg" không dính vì có 'k')
  [/khối lượng muối/, MED],
  [/\bkhử\b/, MED],
  [/trung h[òo]a/, MED],
  // Tên nguyên tố tiếng Việt KHÔNG mơ hồ
  [/\bnhôm\b/, MED], [/\bsắt\b/, MED], [/\bkẽm\b/, MED], [/\bnatri\b/, MED],
  [/\bkali\b/, MED], [/\bcanxi\b/, MED], [/\bmagie\b/, MED], [/\bbari\b/, MED],
  // Dấu hiệu YẾU (cộng dồn, một mình không đủ)
  [/\bkhí\b/, WEAK], // "khí H2", "khí thoát"
  [/thoát ra/, WEAK],
  [/chất rắn/, WEAK],
  [/số mol/, WEAK],
  [/phần trăm/, WEAK],
  [/khối lượng/, WEAK],
  [/h[óo]a học/, WEAK],
];

// ── VẬT LÝ — từ khóa tiếng Việt ────────────────────────────────────────────────
const PHYS_LEXICAL: readonly LexRow[] = [
  // MẠNH — đặc trưng động học lớp 10
  [/vận tốc/, STRONG],
  [/gia tốc/, STRONG],
  [/rơi tự do/, STRONG],
  [/ném ngang/, STRONG],
  [/ném xiên/, STRONG],
  [/ném (?:thẳng đứng|lên|một vật|vật)/, STRONG],
  [/hãm phanh/, STRONG],
  [/quãng đường/, STRONG],
  [/chuyển động (?:thẳng|nhanh dần|chậm dần|đều)/, STRONG],
  [/thả (?:rơi|một vật|vật)/, STRONG],
  [/chạm (?:đất|mặt nước|sàn)/, STRONG],
  [/đuổi kịp/, STRONG],
  [/trọng lực/, STRONG],
  [/\bkm\/h\b/, STRONG],
  [/\bm\/s\b/, STRONG], // cũng khớp "m/s²"
  // VỪA
  [/tốc độ/, MED],
  [/\blực\b/, MED],
  [/gặp nhau/, MED],
  [/xuất phát/, MED],
  [/độ cao cực đại/, MED],
  [/tầm xa/, MED],
  [/\bchuyển động\b/, MED],
  [/vận tốc đầu/, MED],
  // YẾU
  [/\bvật\b/, WEAK],
  [/khởi hành/, WEAK],
  [/độ cao/, WEAK],
];

// ── HÌNH HỌC — từ khóa tiếng Việt (điểm nền; mặc định vẫn là geometry) ──────────
// KHÔNG dùng từ CHIA SẺ với Lý/Hóa (toạ độ, điểm, thể tích trần…) để tránh thổi điểm nền trên đề Lý/Hóa.
const GEO_LEXICAL: readonly LexRow[] = [
  [/hình chóp/, STRONG],
  [/lăng trụ/, STRONG],
  [/tứ diện/, STRONG],
  [/mặt phẳng/, STRONG],
  [/oxyz/, STRONG],
  [/hình lập phương/, STRONG],
  [/hình hộp/, STRONG],
  [/mặt cầu/, STRONG],
  [/khối cầu/, STRONG],
  [/khoảng cách từ/, STRONG],
  [/thể tích khối/, STRONG],
  [/hình vuông cạnh/, STRONG],
  [/khối chóp/, STRONG],
  [/trung điểm/, MED],
  [/trọng tâm/, MED],
  [/góc giữa/, MED],
  [/hình chiếu/, MED],
  [/đường thẳng/, MED],
  [/hình (?:trụ|nón)/, MED],
  [/thiết diện/, MED],
  [/vuông góc/, MED],
  [/\btam giác\b/, WEAK],
  [/\bcạnh\b/, WEAK],
  [/bán kính/, WEAK],
  [/đường (?:cao|tròn)/, WEAK],
];

// ── Công thức hóa học (chạy trên văn bản GỐC, phân biệt hoa/thường) ─────────────
// KHÔNG đưa ký hiệu 1 chữ (H, C, O…) vì trùng NHÃN ĐIỂM hình học. "Ba"/"Ca" trần bỏ (trùng "ba"=3, "ca").
const FORMULA_TOKENS = [
  'H2SO4', 'HNO3', 'H3PO4', 'H2CO3', 'HCl', 'HBr', 'H2S', 'H2O',
  'NaOH', 'KOH', 'NaCl', 'KCl', 'NaHCO3', 'Na2CO3', 'NaNO3', 'Na2SO4',
  'CaCO3', 'BaCO3', 'CaO', 'BaO', 'MgO', 'CuO', 'FeO', 'ZnO', 'Al2O3', 'Fe2O3', 'Fe3O4',
  'BaCl2', 'BaSO4', 'AgCl', 'AgNO3', 'CuSO4', 'ZnSO4', 'FeSO4', 'Fe2(SO4)3',
  'FeCl2', 'FeCl3', 'AlCl3', 'CuCl2', 'ZnCl2', 'AlCl3', 'KMnO4', 'K2MnO4', 'MnO2', 'KClO3',
  'Cu(OH)2', 'Fe(OH)2', 'Fe(OH)3', 'Al(OH)3', 'Zn(OH)2', 'Mg(OH)2', 'Ca(OH)2', 'Ba(OH)2',
  'NH3', 'CO2', 'SO2', 'SO3', 'NO2', 'CO', 'NO', 'N2', 'O2', 'H2', 'Cl2',
];
// Sắp mẫu dài trước ngắn để khớp "CO2" trước "CO"; escape ký tự đặc biệt.
const FORMULA_SET_RE = new RegExp(
  '(?:' + FORMULA_TOKENS.slice().sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')',
  'g',
);
// Regex TỔNG QUÁT cho hợp chất có CHỮ THƯỜNG + SỐ (Cu…4, Na…3, Fe2…). Buộc có chữ thường nên KHÔNG
// dính nhãn khối hình học kiểu "A1B1C1" (toàn hoa+số, không chữ thường).
const FORMULA_GENERIC_RE = /[A-Z][a-z][A-Za-z()]*\d/g;

/** Đếm số công thức hóa học RIÊNG BIỆT (chặn trần 3 để một chuỗi dài không thao túng điểm). */
function formulaScore(originalText: string): number {
  const hits = new Set<string>();
  let m: RegExpExecArray | null;
  FORMULA_SET_RE.lastIndex = 0;
  while ((m = FORMULA_SET_RE.exec(originalText)) !== null) hits.add(m[0]);
  FORMULA_GENERIC_RE.lastIndex = 0;
  while ((m = FORMULA_GENERIC_RE.exec(originalText)) !== null) hits.add(m[0]);
  return Math.min(3, hits.size); // mỗi công thức = WEAK(1), tối đa 3
}

function lexicalScore(lowerText: string, table: readonly LexRow[]): number {
  let s = 0;
  for (const [re, w] of table) if (re.test(lowerText)) s += w;
  return s;
}

// Ngưỡng quyết định (khớp bản gốc)
const CONFIDENT_MIN = 3; // dưới mức này ⇒ tín hiệu Lý/Hóa quá yếu ⇒ mặc định geometry
const STRONG_MIN = 4; // "mạnh" (để xét mơ hồ Lý-Hóa)
const AMBIG_DELTA = 2; // |chem − phys| ≤ 2 và cả hai mạnh ⇒ 'unknown'

/**
 * Phân loại môn của một đề bằng prefilter từ khóa tất định (4 nhãn — mirror classifySubject của backend).
 * Xuất riêng để test đối chiếu 1:1 với route; app dùng {@link detectSubject} (gộp 'unknown' → 'geometry').
 */
export function classifySubject(problem: string): SubjectRaw {
  if (!problem || typeof problem !== 'string' || !problem.trim()) return 'geometry';
  const lower = problem.toLowerCase();

  const chem = lexicalScore(lower, CHEM_LEXICAL) + formulaScore(problem);
  const phys = lexicalScore(lower, PHYS_LEXICAL);
  const geo = lexicalScore(lower, GEO_LEXICAL);

  const top = Math.max(chem, phys);
  // Tín hiệu Lý/Hóa quá yếu (hoặc 0) ⇒ mặc định an toàn geometry (luồng Toán cũ).
  if (top < CONFIDENT_MIN) return 'geometry';

  // Cả Lý lẫn Hóa cùng MẠNH và NGANG nhau ⇒ mơ hồ nặng.
  if (chem >= STRONG_MIN && phys >= STRONG_MIN && Math.abs(chem - phys) <= AMBIG_DELTA) return 'unknown';

  // Bên thắng phải VƯỢT điểm hình học (chống đề hình lỡ dính vài token công thức/đơn vị).
  if (chem > phys) return chem > geo ? 'chem' : 'geometry';
  if (phys > chem) return phys > geo ? 'physics' : 'geometry';

  // chem === phys (đều ≥ CONFIDENT_MIN nhưng chưa chạm ngưỡng mơ hồ mạnh): coi như chưa chắc.
  return chem >= STRONG_MIN ? 'unknown' : 'geometry';
}

/**
 * API chính cho FRONTEND: đoán môn để chọn luồng. Gộp 'unknown' → 'geometry' vì route
 * (`/api/analyze-problem`) cũng coi mọi thứ KHÔNG phải physics/chem là delegate luồng Toán.
 * → dùng: `detectSubject(problem) === 'geometry'` ⇒ giữ luồng Toán; ngược lại gọi useSubjectSolver.
 */
export function detectSubject(problem: string): Subject {
  const s = classifySubject(problem);
  return s === 'physics' || s === 'chem' ? s : 'geometry';
}

/** Điểm thô từng môn — cho test/telemetry (không phải API chính). */
export function subjectScores(problem: string): { chem: number; physics: number; geometry: number } {
  const lower = String(problem || '').toLowerCase();
  return {
    chem: lexicalScore(lower, CHEM_LEXICAL) + formulaScore(String(problem || '')),
    physics: lexicalScore(lower, PHYS_LEXICAL),
    geometry: lexicalScore(lower, GEO_LEXICAL),
  };
}
