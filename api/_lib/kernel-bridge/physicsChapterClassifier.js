// api/_lib/kernel-bridge/physicsChapterClassifier.js
// PREFILTER TỪ KHÓA TẤT ĐỊNH cấp 2: một đề ĐÃ được subjectClassifier gán 'physics' thì thuộc CHƯƠNG nào?
// → 'kinematics' | 'dynamics' | 'circuit' | 'oscillation'. KHÔNG gọi LLM (nhanh/rẻ/tất định/không mạng).
// Route đa môn dùng kết quả để chọn ĐÚNG bộ {prompt dịch, schema, engine} cho chương đó.
//
// TRIẾT LÝ AN TOÀN (đối xứng subjectClassifier):
//   • 'kinematics' là MẶC ĐỊNH — đây là nhánh đã chạy end-to-end từ đầu (P1–P10), đã kiểm nhiều nhất.
//     Chỉ rẽ sang dynamics/circuit/oscillation khi tín hiệu chương đó ĐỦ MẠNH và VƯỢT động học.
//   • Nhận nhầm CHƯƠNG (trong cùng physics) KHÔNG tạo "đáp sai âm thầm": schema/engine chương kia
//     thiếu dữ kiện → ABSTAIN (ok:false "ngoài phạm vi"), không bịa. Sai lầm tệ nhất chỉ là "từ chối
//     một đề giải được", không phải "trả sai". Vì vậy ưu tiên chính xác nhưng thiên về kinematics khi mơ hồ.
//
// CƠ CHẾ: chấm điểm theo SỰ HIỆN DIỆN của mẫu (mỗi mẫu 1 lần — một từ lặp lại không thao túng điểm),
// như subjectClassifier. Điểm cao nhất thắng; hòa hoặc quá yếu → kinematics.

const STRONG = 3;
const MED = 2;
const WEAK = 1;

// ── DAO ĐỘNG ĐIỀU HÒA (oscillation) — từ vựng rất đặc trưng, ít trùng ──────────────
const OSC_LEXICAL = [
  [/dao động điều hòa/, STRONG],
  [/dao động điều hoà/, STRONG],
  [/con lắc (?:lò xo|đơn|toán học)/, STRONG],
  [/\bbiên độ\b/, STRONG],
  [/\bli độ\b/, STRONG],
  [/tần số góc/, STRONG],
  [/pha ban đầu/, STRONG],
  [/phương trình dao động/, STRONG],
  [/vị trí cân bằng/, STRONG],
  [/\bcon lắc\b/, MED],
  [/\bdao động\b/, MED],
  [/chu kỳ|chu kì/, MED],
  [/\blò xo\b/, MED],
  [/\bpha\b/, WEAK],
  [/\bquỹ đạo\b/, WEAK],
];

// ── MẠCH ĐIỆN (circuit — dòng điện không đổi) — đặc trưng, ít trùng động học ────────
const CIRCUIT_LEXICAL = [
  [/điện trở/, STRONG],
  [/hiệu điện thế/, STRONG],
  [/cường độ dòng điện/, STRONG],
  [/suất điện động/, STRONG],
  [/mắc (?:nối tiếp|song song)/, STRONG],
  [/ampe kế/, STRONG],
  [/vôn kế/, STRONG],
  [/định luật ôm|định luật ohm/, STRONG],
  [/điện trở trong/, STRONG],
  [/\bdòng điện\b/, MED],
  [/mạch điện|mạch ngoài|mạch chính/, MED],
  [/nguồn điện/, MED],
  [/\bôm\b|\bohm\b|\bΩ\b/, MED],
  [/\bbóng đèn\b|\bđèn\b/, MED],
  [/biến trở/, MED],
  [/\bpin\b|\bacquy|\bắc quy/, WEAK],
  [/công suất (?:tiêu thụ|điện|định mức)/, WEAK],
  [/\bvôn\b|\bampe\b/, WEAK],
];

// ── ĐỘNG LỰC HỌC (dynamics — lực/ma sát/nghiêng/ròng rọc) ──────────────────────────
// TRÙNG với kinematics ở "gia tốc/vận tốc". DẤU HIỆU PHÂN BIỆT = có LỰC/MA SÁT/NGHIÊNG/RÒNG RỌC.
const DYNAMICS_LEXICAL = [
  [/lực ma sát/, STRONG],
  [/hệ số ma sát/, STRONG],
  [/mặt phẳng nghiêng|mặt nghiêng|dốc nghiêng/, STRONG],
  [/ròng rọc/, STRONG],
  [/lực kéo/, STRONG],
  [/lực căng/, STRONG],
  [/định luật (?:ii|2) newton|niu-?tơn/, STRONG],
  [/\bma sát\b/, MED],
  [/lực (?:tác dụng|đẩy|cản|hãm)/, MED],
  [/phản lực/, MED],
  [/hợp lực/, MED],
  [/\bnewton\b|\bniu-?tơn\b/, MED],
  [/\bmặt phẳng ngang\b/, MED],
  [/\blực\b/, WEAK],
  [/\bkéo\b/, WEAK],
];

// ── ĐỘNG HỌC (kinematics) — MẶC ĐỊNH; cho điểm để đề chuyển động thuần thắng lực-lẻ ─
const KINEMATICS_LEXICAL = [
  [/rơi tự do/, STRONG],
  [/ném ngang/, STRONG],
  [/ném xiên/, STRONG],
  [/ném (?:thẳng đứng|lên)/, STRONG],
  [/hãm phanh/, STRONG],
  [/\bquãng đường\b/, STRONG],
  [/chuyển động (?:thẳng|nhanh dần|chậm dần|đều)/, STRONG],
  [/thả (?:rơi|một vật|vật)/, STRONG],
  [/chạm (?:đất|mặt nước|sàn)/, STRONG],
  [/đuổi kịp/, STRONG],
  [/tầm xa/, STRONG],
  [/độ cao cực đại/, STRONG],
  [/gặp nhau/, MED],
  [/vận tốc đầu/, MED],
  [/\bvận tốc\b/, MED],
  [/\bgia tốc\b/, MED],
  [/\btốc độ\b/, WEAK],
  [/xuất phát/, WEAK],
  [/\bkm\/h\b/, WEAK],
];

function lexicalScore(lowerText, table) {
  let s = 0;
  for (const [re, w] of table) if (re.test(lowerText)) s += w;
  return s;
}

// Ngưỡng: một chương "khác động học" chỉ thắng khi điểm ĐỦ MẠNH (chống một từ lẻ cướp nhánh).
const CONFIDENT_MIN = 3;

/**
 * Chương Vật lý của một đề (giả định đề ĐÃ là physics). Mặc định an toàn 'kinematics'.
 * @param {string} problem đề tiếng Việt (chuỗi thô)
 * @returns {'kinematics'|'dynamics'|'circuit'|'oscillation'}
 */
export function classifyPhysicsChapter(problem) {
  if (!problem || typeof problem !== 'string' || !problem.trim()) return 'kinematics';
  const lower = problem.toLowerCase();

  const osc = lexicalScore(lower, OSC_LEXICAL);
  const circuit = lexicalScore(lower, CIRCUIT_LEXICAL);
  const dyn = lexicalScore(lower, DYNAMICS_LEXICAL);
  const kin = lexicalScore(lower, KINEMATICS_LEXICAL);

  // Ứng viên "khác động học" mạnh nhất.
  const others = [
    ['oscillation', osc],
    ['circuit', circuit],
    ['dynamics', dyn],
  ];
  others.sort((a, b) => b[1] - a[1]);
  const [topName, topScore] = others[0];

  // Quá yếu → kinematics (mặc định). Không đủ tự tin thì giữ nhánh đã kiểm nhiều nhất.
  if (topScore < CONFIDENT_MIN) return 'kinematics';
  // Chương khác phải VƯỢT (>) điểm động học để rẽ; hòa/thua → kinematics.
  if (topScore > kin) return topName;
  return 'kinematics';
}

// Xuất phụ cho test/telemetry: điểm thô từng chương.
export function physicsChapterScores(problem) {
  const lower = String(problem || '').toLowerCase();
  return {
    kinematics: lexicalScore(lower, KINEMATICS_LEXICAL),
    dynamics: lexicalScore(lower, DYNAMICS_LEXICAL),
    circuit: lexicalScore(lower, CIRCUIT_LEXICAL),
    oscillation: lexicalScore(lower, OSC_LEXICAL),
  };
}
