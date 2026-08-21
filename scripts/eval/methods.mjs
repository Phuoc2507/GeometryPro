// scripts/eval/methods.mjs
// Hai "phương pháp" để so sánh trên cùng một tập đề. Mỗi phương pháp trả kết quả CHUẨN HOÁ:
//   { status: 'answer' | 'abstain' | 'error', answers: [{kind?,text}], ms, note? }
//
//  • 'system'     — HỆ NEURO-SYMBOLIC của đề tài: LLM dịch → engine tính + tự kiểm. Từ chối an toàn
//                   khi thiếu dữ kiện (abstain) thay vì bịa.
//  • 'llm-direct' — BASELINE: để LLM GIẢI THẲNG và tự đưa đáp số (không engine, không tự kiểm).
//
// Cờ mock=true cho phép chạy OFFLINE để kiểm thử harness (không gọi LLM, không tốn tiền):
//  system-mock dùng plan golden có sẵn; llm-direct-mock giả lập tất định (một phần đúng, một phần
//  "confidently wrong", một phần từ chối) để bảng chỉ số có ý nghĩa.
import crypto from 'node:crypto';
import { solvePlan } from '../../api/_lib/kernel-bridge/solveWithKernel.js';

const DIRECT_PROMPT =
  'Bạn là trợ giảng giải toán HÌNH HỌC KHÔNG GIAN. Hãy GIẢI bài và chỉ trả về JSON:\n' +
  '{"answers":["<đáp số gọn, vd 64/3 hoặc 2√2/3 hoặc số>"]}  (một phần tử cho mỗi câu hỏi, đúng thứ tự);\n' +
  'hoặc {"abstain":true} nếu đề THIẾU dữ kiện để ra đáp số. Không kèm lời giải, không rào ```.';

const hnum = (s) => parseInt(crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 8), 16);
const extractJson = (raw) => String(raw).trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();

export function makeMethod(name, { apiKey = null, model = null, timeoutMs = 25000, mock = false } = {}) {
  // ---- HỆ NEURO-SYMBOLIC ----
  if (name === 'system') {
    return async function system(item) {
      const t0 = Date.now();
      try {
        let plan;
        if (mock) {
          plan = item.plan; // offline: dùng plan golden (bỏ qua khâu LLM dịch)
        } else {
          const { planFromProblem } = await import('../../api/_lib/kernel-bridge/solveWithKernel.js');
          plan = await planFromProblem(item.text, { apiKey, model, timeoutMs });
        }
        const result = solvePlan(plan);
        if (!result.ok) return { status: 'abstain', answers: [], ms: Date.now() - t0, note: 'engine từ chối (violation/unsolved)' };
        return { status: 'answer', answers: (result.answers || []).map((a) => ({ kind: a.kind, text: a.text })), ms: Date.now() - t0 };
      } catch (e) {
        const msg = String(e && e.message || e);
        return { status: /abstain/i.test(msg) ? 'abstain' : 'error', answers: [], ms: Date.now() - t0, note: msg };
      }
    };
  }

  // ---- BASELINE: LLM GIẢI THẲNG ----
  if (name === 'llm-direct') {
    return async function llmDirect(item) {
      const t0 = Date.now();
      if (mock) {
        // Giả lập tất định: ~1/2 đúng, ~1/4 sai tự tin, ~1/4 từ chối — để bảng chỉ số có ý nghĩa.
        const h = hnum(item.text) % 4;
        const want = (item.expect?.answers || []).map((a) => ({ text: a.text }));
        if (h === 0 || h === 1) return { status: 'answer', answers: want, ms: Date.now() - t0 };
        if (h === 2) return { status: 'answer', answers: want.map((a) => ({ text: '999' })), ms: Date.now() - t0 }; // sai tự tin
        return { status: 'abstain', answers: [], ms: Date.now() - t0 };
      }
      try {
        const { callVilao } = await import('../../api/_lib/vilao.js');
        const raw = await callVilao(DIRECT_PROMPT, item.text, { model, maxTokens: 1024, timeoutMs, apiKey });
        let j;
        try { j = JSON.parse(extractJson(raw)); } catch { return { status: 'error', answers: [], ms: Date.now() - t0, note: 'non-JSON' }; }
        if (j && j.abstain === true) return { status: 'abstain', answers: [], ms: Date.now() - t0 };
        const arr = Array.isArray(j?.answers) ? j.answers : (j?.answer != null ? [j.answer] : null);
        if (!arr) return { status: 'error', answers: [], ms: Date.now() - t0, note: 'thiếu answers' };
        return { status: 'answer', answers: arr.map((t) => ({ text: String(t) })), ms: Date.now() - t0 };
      } catch (e) {
        return { status: 'error', answers: [], ms: Date.now() - t0, note: String(e && e.message || e) };
      }
    };
  }

  throw new Error('phương pháp không hỗ trợ: ' + name);
}
