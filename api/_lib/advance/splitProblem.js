// Pass 0 của "Advance mode": LLM TÁCH đề nhiều câu thành parts + phân loại,
// rồi lưới coverageCheck (tất định) hậu-kiểm để CHỐNG ẢO GIÁC.
//
// Nguyên tắc vàng: MỌI đường thất bại (LLM ném, JSON hỏng, type lạ, <2 part,
// coverage fail) → trả { type: 'single' } để route rơi về xử lý bài đơn an toàn.
// KHÔNG BAO GIỜ serve đa-cảnh khi chưa chắc chắn.

import { callVilao, hedge } from '../vilao.js';
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
  // GỘP đọc-ảnh + phân-loại: nếu có ảnh, cùng 1 lượt vision vừa CHÉP đề (điền vào `setup`) vừa phân
  // loại — thay cho 2 lượt transcribe→split. SPLIT_PROMPT có nhánh "nếu có ảnh" hướng dẫn việc này.
  const imageBase64 = opts.imageBase64 || null;
  let parsed;
  try {
    const call = () => callVilao(SPLIT_PROMPT, problem || 'Đọc đề trong ảnh đính kèm rồi phân loại.', {
      model: opts.model || ADVANCE_MODEL,
      apiKey: opts.apiKey || ADVANCE_API_KEY,
      imageBase64,
      maxTokens: 2048,
      // 13s/lượt, hedge tự lo retry nên callVilao KHÔNG tự retry (maxAttempts:1) → khỏi chồng phí token.
      // Spike (>6s) → hedge bắn lượt 2 song song, lấy cái nhanh. 2 lượt song song nên tổng vẫn <60s.
      timeoutMs: 13000,
      maxAttempts: 1,
    });
    const raw = await hedge(call, { delayMs: 6000 });
    parsed = JSON.parse(extractJson(raw));
  } catch {
    return { type: 'single' };
  }

  // Bản chép đề (model điền vào `setup`) — trả kèm MỌI nhánh để route (analyze-advance) còn nhận diện
  // đề tròn xoay & đặt nhãn lịch sử khi đề vào bằng ẢNH (lúc đó `problem` rỗng).
  const setup = typeof parsed?.setup === 'string' ? parsed.setup : '';

  // Mẫu calculus (rev-ox) là TẤT ĐỊNH ở engine: builder tự dựng khối + tự kiểm thể tích, KHÔNG phụ
  // thuộc số câu. Bài tròn xoay điển hình CHỈ 1 câu ("tính thể tích") nên type thường là 'single' —
  // phải GIỮ template kể cả khi single, nếu không nhánh rev-ox (analyze-advance) không bao giờ chạy.
  const revTemplate = (parsed?.template === 'rev-ox' && parsed?.templateParams)
    ? { template: 'rev-ox', templateParams: parsed.templateParams }
    : null;

  // Vật/nước/tròn xoay chuyển động liên tục → giữ nguyên (route riêng xử lý); kèm template nếu có.
  if (parsed?.type === 'continuous_animation') return { setup, ...parsed, ...(revTemplate || {}) };

  // Không phải đa-câu hợp lệ → an toàn về single; nhưng vẫn kèm template rev-ox (engine tự kiểm).
  if (parsed?.type !== 'multi_question' || !Array.isArray(parsed.parts) || parsed.parts.length < 2) {
    return { type: 'single', setup, ...(revTemplate || {}) };
  }

  // Lưới tất định: LLM có nuốt mất số/điểm nào của đề gốc không? (soi cả setup lẫn parts —
  // kích thước/toạ độ thường ở setup, không trong câu hỏi.) Đề vào bằng ẢNH ⇒ `problem` rỗng,
  // dùng chính `setup` (bản chép) làm văn bản gốc để đối chiếu.
  const cov = coverageCheck(problem || setup, parsed.parts, setup);
  if (!cov.ok) return { type: 'single', setup, ...(revTemplate || {}), _coverageMissing: cov.missing };

  const out = { type: 'multi_question', setup, parts: parsed.parts };
  // Mẫu calculus (rev-ox): giữ template + params để route dựng khối tròn xoay tất định.
  if (revTemplate) { out.template = revTemplate.template; out.templateParams = revTemplate.templateParams; }
  return out;
}
