// api/_lib/kernelMissLog.js
// "NỘP CẢ BÀI": khi engine tất định KHÔNG phục vụ được một đề (từ chối / dịch được nhưng chạy
// ra không dùng được / văng lỗi), tóm tắt VÌ SAO bó tay + kèm "bài làm" của bước dịch
// (Plan JSON translator) để ghi vào problem_reports. Trước đây các nhánh này chỉ console.log rồi
// rơi về LLM ⇒ mất trắng thông tin: không biết engine bó tay ở DẠNG nào, bao nhiêu lần, và máy
// đã "hiểu đề" thành gì. Đây là nguyên liệu cho trang /admin và vòng tự-cải-tiến sau này.
//
// Tách 2 lớp:
//   • describeKernelMiss(k, thrown)  — THUẦN (không I/O), trả { errorStage, errorMessage, aiJson }
//     hoặc null nếu kết quả thực ra DÙNG ĐƯỢC (không có gì để ghi). Dễ unit-test.
//   • logKernelMiss(ctx)             — lớp bọc bắn-rồi-quên, gọi logBrokenProblem. KHÔNG await:
//     các call site VẪN chạy tiếp sang LLM (request còn sống) nên insert kịp hoàn tất; await ở
//     đây sẽ thêm một vòng DB vào TRƯỚC lời gọi LLM vốn đã chậm ⇒ đội độ trễ cho MỌI đề.
import { logBrokenProblem } from './brokenProblemLog.js';

const ABSTAIN_PREFIX = 'translator abstained: ';

/**
 * Mô tả một lần engine "bó tay" để ghi log. KHÔNG gây side-effect.
 * @param {object|null} k        kết quả solveProblem: { plan, ok, geometry, answers, violations, errors }
 * @param {Error|null} [thrown]  ngoại lệ nếu chính import()/solveProblem văng lỗi (kernel-dist thiếu…)
 * @returns {{errorStage:string, errorMessage:string, aiJson:*}|null}
 */
export function describeKernelMiss(k, thrown = null) {
  // 1) Engine văng ngoại lệ (kernel-dist chưa build, solvePlan ném bất ngờ…).
  if (thrown) {
    return {
      errorStage: 'kernel_error',
      errorMessage: String(thrown?.message || thrown || 'lỗi engine'),
      aiJson: null,
    };
  }
  if (!k) return null;

  // 2) Bước dịch KHÔNG ra Plan (k.plan == null): hoặc translator TỪ CHỐI (abstain), hoặc dịch hỏng.
  if (k.plan == null) {
    const msg = (k.errors && k.errors[0] && k.errors[0].message) || 'bước dịch thất bại';
    if (typeof msg === 'string' && msg.startsWith(ABSTAIN_PREFIX)) {
      return {
        errorStage: 'abstain',
        errorMessage: msg.slice(ABSTAIN_PREFIX.length) || msg,
        aiJson: null, // chưa có Plan để nộp
      };
    }
    return { errorStage: 'translate_fail', errorMessage: String(msg), aiJson: null };
  }

  // 3) CÓ Plan nhưng chạy ra không dùng được. Nếu thực ra dùng được thì KHÔNG ghi (trả null).
  const nViol = k.violations?.length ?? 0;
  const nErr = k.errors?.length ?? 0;
  const nPts = k.geometry?.points?.length ?? 0;
  if (k.ok && nViol === 0 && nErr === 0 && nPts > 0) return null;

  // Nộp CẢ Plan JSON để thấy engine đã "hiểu đề" thành gì mà vẫn hỏng.
  const parts = [`ok=${k.ok},pts=${nPts}`];
  if (nViol) parts.push(`${nViol} vi phạm: ` + k.violations.map((v) => v?.message || JSON.stringify(v)).join('; '));
  if (nErr) parts.push(`${nErr} lỗi: ` + k.errors.map((e) => e?.message || JSON.stringify(e)).join('; '));
  return {
    errorStage: 'kernel_unusable',
    errorMessage: parts.join(' | '),
    aiJson: { plan: k.plan, violations: k.violations || [], errors: k.errors || [] },
  };
}

/**
 * Ghi một lần engine bó tay vào problem_reports — BẮN RỒI QUÊN (không await, không throw).
 * Gọi ở nhánh engine-không-phục-vụ; nếu kết quả thực ra dùng được thì tự bỏ qua.
 * @param {object} ctx
 * @param {string} ctx.endpoint
 * @param {string} ctx.mode           'quick'|'detailed'|…
 * @param {string} ctx.prompt         đề bài (sẽ được logBrokenProblem cắt bớt khi lưu)
 * @param {string|null} [ctx.userId]
 * @param {number|null} [ctx.durationMs]
 * @param {object|null} [ctx.k]       kết quả solveProblem
 * @param {Error|null} [ctx.thrown]   ngoại lệ engine (nếu có)
 */
export function logKernelMiss({ endpoint, mode, prompt, userId = null, durationMs = null, k = null, thrown = null }) {
  const miss = describeKernelMiss(k, thrown);
  if (!miss) return; // engine phục vụ được → không có gì để ghi
  // KHÔNG await: nhánh gọi vẫn chạy tiếp sang LLM nên instance còn sống để insert hoàn tất.
  logBrokenProblem({
    endpoint,
    userId,
    mode,
    model: process.env.VILAO_TRANSLATOR_MODEL || null, // miss xảy ra ở bước DỊCH (translator)
    prompt,
    imageProvided: false, // khối kernel chỉ chạy khi KHÔNG có ảnh
    durationMs,
    ...miss,
  });
}
