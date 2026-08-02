// Dựng MỘT ca golden "known-good" TỪ kết quả solveProblem. THUẦN, không I/O.
// Chỉ giữ khi engine giải GỌN (ok, không vi phạm, không phải đáp "đại diện" thang chữ)
// VÀ mọi đáp SO ĐƯỢC BẰNG SỐ — vì bench:gate đối chiếu đáp theo số; đáp không parse
// được sẽ khiến cổng luôn báo lệch. Trả { kept:true, golden } | { kept:false, reason }.
import { toNumeric } from '../answerCompare.js';

export function buildGoldenFromSolve(id, text, result) {
  if (!result || !result.plan) return { kept: false, reason: 'dịch hỏng/abstain (không có plan)' };
  if (!result.ok) return { kept: false, reason: 'engine không giải được (ok:false)' };
  if (result.representative) return { kept: false, reason: 'đáp "đại diện" (thang chữ) — bỏ' };
  if (Array.isArray(result.violations) && result.violations.length) {
    return { kept: false, reason: `có ${result.violations.length} vi phạm ràng buộc` };
  }
  const answers = Array.isArray(result.answers) ? result.answers : [];
  if (answers.length === 0) return { kept: false, reason: 'không có đáp nào' };
  for (const a of answers) {
    if (toNumeric(a?.text) === null) {
      return { kept: false, reason: `đáp không so được bằng số: "${a?.text ?? ''}"` };
    }
  }
  const golden = {
    id,
    source: 'capture',
    text,
    plan: result.plan,
    expect: { ok: true, answers: answers.map((a) => ({ kind: a.kind, text: a.text })) },
  };
  return { kept: true, golden };
}
