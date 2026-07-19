// Pass 0 của "Advance mode": LLM TÁCH đề nhiều câu thành parts + phân loại,
// rồi lưới coverageCheck (tất định) hậu-kiểm để CHỐNG ẢO GIÁC.
//
// Nguyên tắc vàng: MỌI đường thất bại (LLM ném, JSON hỏng, type lạ, <2 part,
// coverage fail) → trả { type: 'single' } để route rơi về xử lý bài đơn an toàn.
// KHÔNG BAO GIỜ serve đa-cảnh khi chưa chắc chắn.

import { callVilao } from '../vilao.js';
import { SPLIT_PROMPT } from './splitPrompt.js';
import { coverageCheck } from './coverage.js';

// Model mạnh cho bước tách đề — cấu hình qua ENV (benchmark chọn gpt-5.6-sol).
const ADVANCE_MODEL = process.env.ADVANCE_MODEL || 'ram/gemini-3.5-flash-low';
const ADVANCE_API_KEY = process.env.ADVANCE_API_KEY || undefined;

// Trích JSON từ output LLM (có thể lẫn ```json ... ``` hoặc chữ thừa quanh object).
// Hàm extractJson trong solveWithKernel.js là local/không export nên viết bản nhỏ tại chỗ,
// đồng thời chắc hơn: cắt từ dấu '{' đầu tới '}' cuối.
function extractJson(raw) {
  const s = String(raw).trim();
  const i = s.indexOf('{');
  const j = s.lastIndexOf('}');
  if (i === -1 || j === -1 || j < i) return s;
  return s.slice(i, j + 1);
}

export async function splitProblem(problem, opts = {}) {
  let parsed;
  try {
    const raw = await callVilao(SPLIT_PROMPT, problem, {
      model: opts.model || ADVANCE_MODEL,
      apiKey: opts.apiKey || ADVANCE_API_KEY,
      maxTokens: 2048,
      timeoutMs: 25000,
    });
    parsed = JSON.parse(extractJson(raw));
  } catch {
    return { type: 'single' };
  }

  // Vật/nước/tròn xoay chuyển động liên tục → giữ nguyên (route riêng xử lý).
  if (parsed?.type === 'continuous_animation') return parsed;

  // Không phải đa-câu hợp lệ → an toàn về single.
  if (parsed?.type !== 'multi_question' || !Array.isArray(parsed.parts) || parsed.parts.length < 2) {
    return { type: 'single' };
  }

  // Lưới tất định: LLM có nuốt mất số/điểm nào của đề gốc không?
  const cov = coverageCheck(problem, parsed.parts);
  if (!cov.ok) return { type: 'single', _coverageMissing: cov.missing };

  return { type: 'multi_question', setup: parsed.setup || '', parts: parsed.parts };
}
