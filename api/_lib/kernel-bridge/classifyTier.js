// api/_lib/kernel-bridge/classifyTier.js
// Phân loại 3 MỨC AN TOÀN (tách khỏi tier GÓI CƯỚC). Neo TUYỆT ĐỐI vào engineSolved:
// level 1 ⟺ engineSolved(result). Module THUẦN — chỉ import engineSolved (không kéo kernel-dist)
// ⇒ test siêu nhẹ, không cần build engine.
import { engineSolved } from '../solveAssemble.js';

// Query hình học (RunPlan.queries[].kind) → nhãn tiếng Việt.
const QUERY_LABEL = {
  distance: 'Khoảng cách', angle: 'Góc', volume: 'Thể tích', area: 'Diện tích',
  equation: 'Phương trình', relative_position: 'Vị trí tương đối', intersection: 'Giao',
  point_coord: 'Toạ độ điểm', sphere_metric: 'Mặt cầu', volume_ratio: 'Tỉ số thể tích',
};
// Analyze (AnalysisPlan.analyze.kind) → nhãn.
const ANALYZE_LABEL = {
  optimize: 'Cực trị', optimize_multi: 'Cực trị', integrate: 'Tích phân',
  solve: 'Giải phương trình', solve_multi: 'Giải phương trình', eval: 'Tính giá trị',
};

// Nhãn dạng bài — TẤT ĐỊNH từ plan (KHÔNG đụng translator ở Nhịp 1). Nhịp 2: translator có thể
// xuất `plan.problemKind` (câu-chữ theo đề) ⇒ ưu tiên; field này DORMANT ở Nhịp 1 (luôn undefined).
function problemTypeOf(plan) {
  if (plan && typeof plan.problemKind === 'string' && plan.problemKind.trim()) return plan.problemKind.trim();
  const qk = plan && plan.queries && plan.queries[0] && plan.queries[0].kind;
  if (qk && QUERY_LABEL[qk]) return QUERY_LABEL[qk];
  const ak = plan && plan.analyze && plan.analyze.kind;
  if (ak && ANALYZE_LABEL[ak]) return ANALYZE_LABEL[ak];
  return 'Khác';
}

// Trục CHÍNH XÁC — CHỈ gọi khi đã engineSolved (Mức 1) ⇒ answers[0].approx hữu hạn.
// GATE 'parameter' in result TRƯỚC: nhánh phân tích KHÔNG có field `exact` ⇒ answers[0].exact là
// undefined ⇒ `undefined != null` là TRUE (bẫy!). Không gate sẽ dán nhầm 'exact' cho đáp số.
function exactnessOf(result) {
  if ('parameter' in result) return 'numeric';
  const a = result.answers[0];
  return a && a.exact != null && a.approximate === false ? 'exact' : 'numeric';
}

// Số ĐO ĐƯỢC TRÊN HÌNH đang vẽ (Mức 2). Bài THANG CHỮ dựng ở thang scaleSymbol=1 ⇒ approxAtScale
// là giá trị tại thang đó — hợp lệ để HIỆN KÈM NHÃN, KHÔNG hợp lệ để khẳng định là đáp số tuyệt đối.
// Trả null khi không có số đo (Mức 2 vẫn hợp lệ, chỉ là không có gì để hiện).
function illustrationOf(result) {
  const a = result && result.answers && result.answers[0];
  if (!a || typeof a.approxAtScale !== 'number' || !Number.isFinite(a.approxAtScale)) return null;
  return {
    approxAtScale: a.approxAtScale,
    scaleSymbol: typeof a.scaleSymbol === 'string' ? a.scaleSymbol : null,
    note: a.scaleSymbol ? `đo ở hình vẽ với ${a.scaleSymbol} = 1` : 'đo ở hình vẽ này',
  };
}

// Lấy message an toàn từ phần tử violation/error (có thể là {message} hoặc chuỗi).
function msgOf(x, fallback) {
  if (x == null) return fallback;
  if (typeof x === 'string') return x;
  return (typeof x.message === 'string' && x.message) || fallback;
}

export function classifyTier(result) {
  const plan = result && result.plan;
  const problemType = problemTypeOf(plan);

  // Thứ tự: representative → engineSolved → còn lại.
  if (result && result.representative === true) {
    return { level: 2, exactness: null, problemType, reason: null, illustration: illustrationOf(result) };
  }
  if (engineSolved(result)) {
    return { level: 1, exactness: exactnessOf(result), problemType, reason: null };
  }
  let reason;
  if (result && result.violations && result.violations.length) {
    reason = { kind: 'violation', message: msgOf(result.violations[0], 'Vi phạm giả thiết của đề.') };
  } else if (result && result.errors && result.errors.length) {
    reason = { kind: 'error', message: msgOf(result.errors[0], 'Lỗi tính toán.') };
  } else {
    reason = { kind: 'unsolved', message: 'Engine chưa chứng thực đáp số dạng này — đang hiện lời giải AI, CHƯA kiểm chứng.' };
  }
  return { level: 3, exactness: null, problemType, reason };
}

// Ánh xạ một lỗi NÉM từ planFromProblem (abstain / non-JSON / sai schema) → object tier Mức 3.
// Dùng ở solveProblem (catch), analyze-geometry (catch), solve.js (catch). Thuần ⇒ test được.
export function tierFromThrow(err) {
  const message = err && err.message ? String(err.message) : 'Lỗi dịch đề.';
  const kind = /abstain/i.test(message) ? 'abstain' : 'error';
  return { level: 3, exactness: null, problemType: 'Khác', reason: { kind, message } };
}
