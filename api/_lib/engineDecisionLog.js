// api/_lib/engineDecisionLog.js
// In MỘT dòng JSON có cấu trúc cho mỗi lần route chạy engine → grep từ log Vercel để đo hit-rate.
// KHÔNG log nội dung đề (chỉ độ dài) — tránh rò dữ liệu người dùng.
export function logEngineDecision({ mode, served, reason = '', ms = 0, promptLen = 0 }) {
  try {
    console.log('[engine-decision] ' + JSON.stringify({
      t: 'engine-decision', mode, served: !!served, reason: reason.slice(0, 60),
      ms: Math.round(ms), promptLen,
    }));
  } catch { /* không bao giờ để log làm chết request */ }
}
