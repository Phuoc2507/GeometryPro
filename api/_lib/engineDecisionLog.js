// api/_lib/engineDecisionLog.js
// In MỘT dòng JSON có cấu trúc cho mỗi lần route chạy engine → grep từ log Vercel để đo hit-rate.
// KHÔNG log nội dung đề (chỉ độ dài) — tránh rò dữ liệu người dùng.
// `approx`: khi PHỤC VỤ, đáp có bị "xấp xỉ" không (recognizer KHÔNG tìm được dạng đẹp ⇒ trả số thập
// phân thô). Đây là tín hiệu đo #2 (số căn-đa-số-hạng): đếm `served:true, approx:true` trên log prod ⇒
// biết ta đang trả bao nhiêu đáp lẽ-ra-đẹp mà đang hiện thập phân → có đáng làm bản nhị thức a+b√c không.
// CHỈ là boolean, KHÔNG log giá trị đáp (giữ nguyên nguyên tắc không rò nội dung người dùng).
export function logEngineDecision({ mode, served, reason = '', ms = 0, promptLen = 0, approx = null }) {
  try {
    console.log('[engine-decision] ' + JSON.stringify({
      t: 'engine-decision', mode, served: !!served, reason: reason.slice(0, 60),
      ms: Math.round(ms), promptLen, approx,
    }));
  } catch { /* không bao giờ để log làm chết request */ }
}
