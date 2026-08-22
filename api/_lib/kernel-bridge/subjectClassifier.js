// api/_lib/kernel-bridge/subjectClassifier.js
// PREFILTER TỪ KHÓA TẤT ĐỊNH nhận diện môn của một đề (D23/F17): KHÔNG gọi LLM — nhanh, rẻ,
// tất định, không mạng. Chạy TRƯỚC luồng dịch để quyết định đi engine Lý / Hóa hay giữ luồng Toán.
//
// TRIẾT LÝ AN TOÀN (quan trọng khi phản biện):
//   • 'geometry' là MẶC ĐỊNH: đề không rõ Lý/Hóa → trả 'geometry' để frontend chạy luồng Toán cũ.
//     Sai kiểu "Lý/Hóa bị nhận nhầm thành geometry" chỉ khiến đề rơi về luồng LLM Toán (vẫn tự
//     abstain nếu ngoài phạm vi) — KHÔNG bịa. Ngược lại, nhận nhầm geometry → Lý/Hóa sẽ nạp sai
//     engine. Vì vậy chỉ trả 'physics'/'chem' khi tín hiệu môn đó ĐỦ MẠNH và VƯỢT điểm hình học.
//   • 'unknown' chỉ khi Lý và Hóa CÙNG mạnh và NGANG nhau (mơ hồ nặng) — route coi như geometry
//     (delegate luồng Toán) nhưng tách nhãn để log/telemetry phân biệt.
//
// CƠ CHẾ: chấm điểm theo SỰ HIỆN DIỆN của từ khóa (mỗi mẫu tính 1 lần, không nhân theo số lần lặp
// để một từ lặp lại không thao túng điểm). Công thức hóa học nhận diện trên văn bản GỐC (phân biệt
// hoa/thường: "CO" khí ≠ "co"; điểm hình học A1/B1 KHÔNG có chữ thường nên không dính regex công thức).

const STRONG = 3;
const MED = 2;
const WEAK = 1;

// ── HÓA — từ khóa tiếng Việt (khớp trên bản đã l/lowercase) ─────────────────────
const CHEM_LEXICAL = [
  // Dấu hiệu MẠNH — gần như chỉ xuất hiện trong đề Hóa
  [/phản ứng/, STRONG],
  [/dung dịch/, STRONG],
  [/ho[àa] tan/, STRONG],           // "hòa tan" | "hoà tan"
  [/kết tủa/, STRONG],
  [/nồng độ/, STRONG],
  [/nhiệt phân/, STRONG],
  [/kim loại/, STRONG],
  [/ox[ií]t/, STRONG],              // "oxit" | "oxít"
  [/\bax[ií]t\b/, STRONG],          // "axit" | "axít"
  [/bazơ/, STRONG],
  [/\bmuối\b/, STRONG],
  [/đktc/, STRONG],
  [/đkc/, STRONG],
  [/phương trình h[óo]a học/, STRONG],
  [/điều chế/, STRONG],
  [/\bmol\b/, STRONG],
  // Dấu hiệu VỪA
  [/\bnung\b/, MED],
  [/\d\s*(?:g|gam)\b/, MED],        // khối lượng gam: "5,4 g", "16,8 gam" ("kg" không dính vì có 'k')
  [/khối lượng muối/, MED],
  [/\bkhử\b/, MED],
  [/trung h[òo]a/, MED],
  // Tên nguyên tố tiếng Việt KHÔNG mơ hồ (tránh "đồng"=đồng thời, "bạc" — không đưa vào)
  [/\bnhôm\b/, MED], [/\bsắt\b/, MED], [/\bkẽm\b/, MED], [/\bnatri\b/, MED],
  [/\bkali\b/, MED], [/\bcanxi\b/, MED], [/\bmagie\b/, MED], [/\bbari\b/, MED],
  // Dấu hiệu YẾU (đi kèm để cộng dồn, một mình không đủ)
  [/\bkhí\b/, WEAK],                // "khí H2", "khí thoát" (cả "không khí" — vẫn thiên Hóa)
  [/thoát ra/, WEAK],
  [/chất rắn/, WEAK],
  [/số mol/, WEAK],
  [/phần trăm/, WEAK],
  [/khối lượng/, WEAK],
  [/h[óo]a học/, WEAK],
  // HÓA HỮU CƠ (D38) — đốt cháy tìm CTPT + este; dấu hiệu hữu cơ đặc trưng (không mơ hồ với Lý/hình)
  [/đốt cháy/, STRONG], [/hiđrocacbon|hidrocacbon/, STRONG], [/công thức phân tử/, STRONG],
  [/\bctpt\b/, STRONG], [/\beste\b|\bete\b/, STRONG], [/\bancol\b/, STRONG], [/đồng đẳng/, STRONG],
  [/anken|ankan|ankin|ankađien/, STRONG], [/\baxit\s+(?:hữu cơ|cacboxylic)/, STRONG],
  [/tỉ khối/, MED], [/thủy phân|thuỷ phân/, MED],
];

// ── VẬT LÝ — từ khóa tiếng Việt ────────────────────────────────────────────────
const PHYS_LEXICAL = [
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
  [/\bm\/s\b/, STRONG],             // cũng khớp "m/s²"
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

  // ── CÁC CHƯƠNG LÝ ĐÃ NỐI ROUTE (D32/D35): mạch điện · động lực học · dao động ──
  // Nay dispatch theo chương (physicsChapterClassifier) đã hoạt động + bộ dịch 3 chương đã có,
  // nên MỞ từ khóa để đề các chương này ĐẠT 'physics' (trước đây rơi geometry). Chỉ chọn dấu hiệu
  // KHÔNG mơ hồ với hình học/hóa (VD "điện trở"/"con lắc" đặc trưng Lý; tránh "mặt phẳng" trần vốn của geo).
  // MẠCH ĐIỆN:
  [/điện trở/, STRONG], [/hiệu điện thế/, STRONG], [/cường độ dòng điện/, STRONG],
  [/suất điện động/, STRONG], [/mắc (?:nối tiếp|song song)/, STRONG], [/ampe kế|vôn kế/, STRONG],
  [/\bdòng điện\b/, MED], [/mạch điện|mạch ngoài/, MED], [/điện trở trong/, STRONG],
  // DAO ĐỘNG:
  [/dao động điều h[òo]a/, STRONG], [/con lắc/, STRONG], [/\bbiên độ\b/, STRONG],
  [/\bli độ\b/, STRONG], [/tần số góc/, STRONG], [/\bdao động\b/, MED], [/chu kỳ|chu kì/, WEAK],
  // ĐỘNG LỰC HỌC (dấu hiệu LỰC/MA SÁT/RÒNG RỌC — phân biệt với động học thuần):
  [/lực ma sát/, STRONG], [/hệ số ma sát/, STRONG], [/mặt phẳng nghiêng|mặt nghiêng/, STRONG],
  [/ròng rọc/, STRONG], [/lực kéo/, STRONG], [/lực căng/, STRONG], [/\bma sát\b/, MED],
  // SÓNG CƠ & SÓNG ÂM (D37):
  [/sóng cơ/, STRONG], [/sóng âm/, STRONG], [/bước sóng/, STRONG], [/giao thoa/, STRONG],
  [/sóng dừng/, STRONG], [/mức cường độ âm|cường độ âm/, STRONG], [/bụng sóng|nút sóng/, STRONG],
  // ĐIỆN TRƯỜNG TĨNH (D37 — đã gỡ khỏi stop-words):
  [/điện trường/, STRONG], [/cường độ điện trường/, STRONG], [/điện tích điểm/, STRONG],
  [/đường sức/, STRONG], [/tĩnh điện/, STRONG], [/\bđiện tích\b/, MED],
  // ĐIỆN XOAY CHIỀU (D38):
  [/điện xoay chiều|xoay chiều/, STRONG], [/cảm kháng/, STRONG], [/dung kháng/, STRONG],
  [/tổng trở/, STRONG], [/cuộn cảm/, STRONG], [/mạch rlc/, STRONG],
  // KHÍ LÝ TƯỞNG + NHIỆT (D38) — QUAN TRỌNG: đề gas/nhiệt hay có "mol" (tín hiệu Hóa) nên PHẢI đủ mạnh
  // để thắng chem, tránh gas-heat bị route nhầm sang Hóa rồi abstain.
  [/khí lý tưởng|khí lí tưởng/, STRONG], [/đẳng nhiệt/, STRONG], [/đẳng áp/, STRONG], [/đẳng tích/, STRONG],
  [/nhiệt lượng/, STRONG], [/nhiệt dung riêng/, STRONG], [/cân bằng nhiệt/, STRONG],
  [/phương trình trạng thái/, STRONG], [/nhiệt nóng chảy|nhiệt hóa hơi|nhiệt hoá hơi/, STRONG],
];

// ── HÌNH HỌC — từ khóa tiếng Việt (để tính điểm nền; mặc định vẫn là geometry) ──
// KHÔNG dùng các từ CHIA SẺ với Lý/Hóa (toạ độ, điểm, thể tích trần, đường, khối lượng…)
// để tránh thổi điểm nền trên đề Lý/Hóa.
const GEO_LEXICAL = [
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
// Danh mục các chất vô cơ hay gặp — gồm cả loại TOÀN HOA-không-số (HCl, KOH, CO2…) mà regex
// tổng quát bỏ sót. KHÔNG đưa ký hiệu 1 chữ (H, C, O, S, K, N, P…) vì trùng NHÃN ĐIỂM hình học.
// KHÔNG đưa "Ba"/"Ca" trần (trùng "ba"=3, "ca"=ca/kíp khi đầu câu) — vẫn bắt được qua BaCl2/CaCO3.
const FORMULA_TOKENS = [
  'H2SO4', 'HNO3', 'H3PO4', 'H2CO3', 'HCl', 'HBr', 'H2S', 'H2O',
  'NaOH', 'KOH', 'NaCl', 'KCl', 'NaHCO3', 'Na2CO3', 'NaNO3', 'Na2SO4',
  'CaCO3', 'BaCO3', 'CaO', 'BaO', 'MgO', 'CuO', 'FeO', 'ZnO', 'Al2O3', 'Fe2O3', 'Fe3O4',
  'BaCl2', 'BaSO4', 'AgCl', 'AgNO3', 'CuSO4', 'ZnSO4', 'FeSO4', 'Fe2(SO4)3',
  'FeCl2', 'FeCl3', 'AlCl3', 'CuCl2', 'ZnCl2', 'AlCl3', 'KMnO4', 'K2MnO4', 'MnO2', 'KClO3',
  'Cu(OH)2', 'Fe(OH)2', 'Fe(OH)3', 'Al(OH)3', 'Zn(OH)2', 'Mg(OH)2', 'Ca(OH)2', 'Ba(OH)2',
  'NH3', 'CO2', 'SO2', 'SO3', 'NO2', 'CO', 'NO', 'N2', 'O2', 'H2', 'Cl2',
];
// Sắp mẫu dài trước ngắn để \b...\b khớp "CO2" trước "CO"; escape ký tự đặc biệt trong ngoặc.
const FORMULA_SET_RE = new RegExp(
  '(?:' + FORMULA_TOKENS.slice().sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')',
  'g',
);
// Regex TỔNG QUÁT cho hợp chất có CHỮ THƯỜNG + SỐ (Cu…4, Na…3, Fe2…, Ag…3). Buộc có chữ thường
// nên KHÔNG dính nhãn khối hình học kiểu "A1B1C1" (toàn hoa+số, không chữ thường).
const FORMULA_GENERIC_RE = /[A-Z][a-z][A-Za-z()]*\d/g;

// Đếm số công thức hóa học RIÊNG BIỆT (chặn trần để một chuỗi dài không thao túng điểm).
function formulaScore(originalText) {
  const hits = new Set();
  let m;
  FORMULA_SET_RE.lastIndex = 0;
  while ((m = FORMULA_SET_RE.exec(originalText)) !== null) hits.add(m[0]);
  FORMULA_GENERIC_RE.lastIndex = 0;
  while ((m = FORMULA_GENERIC_RE.exec(originalText)) !== null) hits.add(m[0]);
  return Math.min(3, hits.size); // mỗi công thức = WEAK(1), tối đa 3
}

function lexicalScore(lowerText, table) {
  let s = 0;
  for (const [re, w] of table) if (re.test(lowerText)) s += w;
  return s;
}

// ── STOP-WORDS: chương ENGINE CHƯA CÓ ⇒ KHÔNG route sang Lý/Hóa ─────────────────
// Đề chứa các cụm này thuộc chương engine v0 chưa phục vụ (điện trường/từ trường/hạt nhân/phóng xạ/
// điện phân…). Nếu route sang physics/chem, translator hoặc ABSTAIN (tốn 1 lượt LLM vô ích) hoặc — tệ
// hơn — dịch lệch ngữ cảnh sang động học/phản ứng rồi cho đáp SAI. An toàn hơn: hạ về 'geometry' để
// frontend chạy luồng Toán (vẫn tự abstain nếu ngoài phạm vi). Chiều nguy hiểm duy nhất của classifier
// là geometry/khác → physics/chem (đánh cược translator); stop-words khoá đúng chiều đó.
// D37 (cập nhật D35): mạch điện/động lực/dao động/SÓNG CƠ/ĐIỆN TRƯỜNG nay ĐÃ nối route (dispatch theo
// chương + bộ dịch riêng) ⇒ từ khóa của chúng ĐÃ mở trong PHYS_LEXICAL, và "điện trường"/"điện tích" ĐÃ
// GỠ khỏi stop-words (efield phục vụ được). CÒN LẠI chưa có engine: TỪ TRƯỜNG/CẢM ỨNG TỪ/HẠT NHÂN/PHÓNG
// XẠ/ĐIỆN PHÂN ⇒ GIỮ stop-words để không route sang physics rồi abstain (thà rơi geometry/Toán). Đề dính
// "từ trường" (vd hạt điện tích trong từ trường) vẫn bị stop TRƯỚC khi chấm điểm ⇒ không nhận nhầm efield.
const STOP_WORDS_RE = /từ trường|cảm ứng từ|hạt nhân|phóng xạ|điện phân/;

// Ngưỡng quyết định
const CONFIDENT_MIN = 3; // dưới mức này ⇒ tín hiệu Lý/Hóa quá yếu ⇒ mặc định geometry
const STRONG_MIN = 4;    // "mạnh" (để xét mơ hồ Lý-Hóa)
const AMBIG_DELTA = 2;   // |chem − phys| ≤ 2 và cả hai mạnh ⇒ 'unknown'

/**
 * Phân loại môn của một đề bằng prefilter từ khóa tất định.
 * @param {string} problem  đề tiếng Việt (chuỗi thô)
 * @returns {'geometry'|'physics'|'chem'|'unknown'}
 */
export function classifySubject(problem) {
  if (!problem || typeof problem !== 'string' || !problem.trim()) return 'geometry';
  const lower = problem.toLowerCase();

  // Chương chưa hỗ trợ (điện trường/từ trường/hạt nhân/phóng xạ/điện phân…) ⇒ KHÔNG đánh cược
  // translator: hạ thẳng về 'geometry' (luồng Toán tự abstain). Chặn TRƯỚC khi chấm điểm môn.
  if (STOP_WORDS_RE.test(lower)) return 'geometry';

  const chem = lexicalScore(lower, CHEM_LEXICAL) + formulaScore(problem);
  const phys = lexicalScore(lower, PHYS_LEXICAL);
  const geo = lexicalScore(lower, GEO_LEXICAL);

  const top = Math.max(chem, phys);
  // Tín hiệu Lý/Hóa quá yếu (hoặc bằng 0) ⇒ mặc định an toàn geometry (luồng Toán cũ).
  if (top < CONFIDENT_MIN) return 'geometry';

  // Cả Lý lẫn Hóa cùng MẠNH và NGANG nhau ⇒ mơ hồ nặng.
  if (chem >= STRONG_MIN && phys >= STRONG_MIN && Math.abs(chem - phys) <= AMBIG_DELTA) return 'unknown';

  // Bên thắng phải VƯỢT điểm hình học (chống đề hình lỡ dính vài token công thức/đơn vị).
  if (chem > phys) return chem > geo ? 'chem' : 'geometry';
  if (phys > chem) return phys > geo ? 'physics' : 'geometry';

  // chem === phys (đều ≥ CONFIDENT_MIN nhưng chưa chạm ngưỡng mơ hồ mạnh): coi như chưa chắc.
  return chem >= STRONG_MIN ? 'unknown' : 'geometry';
}

// Xuất phụ cho test/telemetry: điểm thô từng môn (không phải API chính).
export function subjectScores(problem) {
  const lower = String(problem || '').toLowerCase();
  return {
    chem: lexicalScore(lower, CHEM_LEXICAL) + formulaScore(String(problem || '')),
    physics: lexicalScore(lower, PHYS_LEXICAL),
    geometry: lexicalScore(lower, GEO_LEXICAL),
  };
}
