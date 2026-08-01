// Pass 0 của "Advance mode": LLM TÁCH đề nhiều câu thành parts + phân loại,
// rồi lưới coverageCheck (tất định) hậu-kiểm để CHỐNG ẢO GIÁC.
//
// Nguyên tắc vàng: MỌI đường thất bại (LLM ném, JSON hỏng, type lạ, <2 part,
// coverage fail) → trả { type: 'single' } để route rơi về xử lý bài đơn an toàn.
// KHÔNG BAO GIỜ serve đa-cảnh khi chưa chắc chắn.

import { callVilao, hedge } from '../vilao.js';
import { SPLIT_PROMPT } from './splitPrompt.js';
import { coverageCheck } from './coverage.js';

// Model/khoá cho bước tách đề. ADVANCE_MODEL/ADVANCE_API_KEY là OVERRIDE tuỳ chọn (A/B model, khoá
// riêng). MẶC ĐỊNH = model & VILAO_API_KEY base. CẢNH BÁO CHÍ MẠNG cũ: override set-nhưng-hỏng (vd
// ADVANCE_API_KEY còn trỏ khoá 403 cũ) sẽ ĐÈ base ⇒ MỌI lượt tách hỏng ⇒ "chưa vẽ được đề tròn xoay".
// Nay có fallback tự-chữa: override hỏng → thử lại bằng khoá/model base (xem splitProblem).
// Mọi mẫu calculus tất định mà analyze-advance có nhánh route (`split.template === ...`). PHẢI đồng bộ
// với danh sách nhánh bên đó — thêm mẫu mới ở cả 2 nơi, nếu không template bị vứt ⇒ tính năng chết.
const CALC_TEMPLATES = ['rev-ox', 'cross-known', 'area-plane', 'section-poly', 'rev-vessel'];

const DEFAULT_SPLIT_MODEL = 'ram/gemini-3.5-flash-low';
const ADVANCE_MODEL = process.env.ADVANCE_MODEL || DEFAULT_SPLIT_MODEL;
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

// Vá escape JSON không hợp lệ (fallback khi JSON.parse chặt NÉM). Nguồn thực tế: gpt-5.6-sol thỉnh
// thoảng nhả `"fnLabel":"y=-x^2+2x,\ y=0"` — `\<space>` (thin-space LaTeX lọt vào chuỗi) KHÔNG phải
// escape JSON hợp lệ ⇒ parse chặt ném ⇒ mất template ⇒ "chưa vẽ được". Cách vá: escape LẠI mọi
// backslash lẻ đứng trước ký tự không hợp lệ, NHƯNG giữ NGUYÊN escape hợp lệ. TỐI QUAN TRỌNG: cặp
// `\\` (backslash đã escape — gemini, model prod, dùng đầy trong setup LaTeX: `\\le`, `\\sqrt`) phải
// còn nguyên; nhánh 1 của regex nuốt trọn escape hợp lệ TRƯỚC nên `\\x` không bao giờ rơi vào nhánh vá.
// Nhánh: (1) \uXXXX hoặc \["\\/bfnrtu] = escape hợp lệ → giữ; (2) \<ký tự khác> = lẻ → nhân đôi backslash;
// (3) \ ở cuối chuỗi → nhân đôi. Cờ `s` để `.` bắt cả xuống dòng.
function repairJsonEscapes(s) {
  return s.replace(/\\(?:u[0-9a-fA-F]{4}|["\\/bfnrtu])|\\(.)|\\$/gs,
    (m, bad) => {
      if (bad !== undefined) return '\\\\' + bad;   // nhánh 2: backslash lẻ trước ký tự khác → nhân đôi
      return m === '\\' ? '\\\\' : m;               // nhánh 3: backslash cuối chuỗi → nhân đôi; nhánh 1: giữ
    });
}

export async function splitProblem(problem, opts = {}) {
  // GỘP đọc-ảnh + phân-loại: nếu có ảnh, cùng 1 lượt vision vừa CHÉP đề (điền vào `setup`) vừa phân
  // loại — thay cho 2 lượt transcribe→split. SPLIT_PROMPT có nhánh "nếu có ảnh" hướng dẫn việc này.
  const imageBase64 = opts.imageBase64 || null;
  const model = opts.model || ADVANCE_MODEL;
  const primaryKey = opts.apiKey || ADVANCE_API_KEY;   // undefined ⇒ callVilao tự dùng VILAO_API_KEY base

  // NGÂN SÁCH thời gian theo LOẠI đầu vào (nguồn gốc bug 504):
  //  • CHỮ: nhanh (~5–10s) nhưng model nhanh (gemini-3.5-flash-low) thỉnh thoảng spike ~16–19s. Timeout
  //    18s/lượt + hedge (spike >6s → bắn lượt 2 song song, lấy cái nhanh). 13s CŨ cắt TRƯỚC khi spike nhả
  //    token ⇒ {type:'single'} không template ⇒ đề calculus (rev-ox/section…) thỉnh thoảng "chưa vẽ được".
  //    Worst-case wall = 6s (hedge delay) + 18s = 24s, vẫn dưới trần 60s Vercel.
  //  • ẢNH (vision): time-to-first-token LỚN (~16–40s tuỳ provider). Timeout 13s CŨ bắn TRƯỚC khi
  //    model nhả token đầu ⇒ client tự ngắt (CLIENT_DISCONNECT, 0 token) ⇒ MỌI lượt tách-ảnh hỏng ⇒
  //    fallback/retry chồng nhau > 60s ⇒ 504. Ảnh cần ngân sách RỘNG (38s < lằn 60s Vercel) và
  //    KHÔNG hedge: TTFT chậm là TƯƠNG QUAN (bắn lượt 2 song song cũng chậm y hệt) → chỉ tốn gấp đôi
  //    token mà không nhanh hơn. Đề chữ mới hưởng lợi từ hedge (spike độc lập).
  const splitTimeoutMs = imageBase64 ? 38000 : 18000;
  const runOnce = (apiKey, modelToUse) => callVilao(SPLIT_PROMPT, problem || 'Đọc đề trong ảnh đính kèm rồi phân loại.', {
    model: modelToUse, apiKey, imageBase64, maxTokens: 2048, timeoutMs: splitTimeoutMs, maxAttempts: 1,
  });

  // Ảnh → 1 lượt trần trụi (không hedge). Chữ → bọc hedge chống spike.
  const runGuarded = (apiKey, modelToUse) =>
    imageBase64 ? runOnce(apiKey, modelToUse) : hedge(() => runOnce(apiKey, modelToUse), { delayMs: 6000 });

  // Có dùng OVERRIDE (khoá/model riêng khác base) không? Nếu có mà HỎNG thì còn đường lui về base.
  const usingOverride = (primaryKey && primaryKey !== process.env.VILAO_API_KEY) || model !== DEFAULT_SPLIT_MODEL;

  let parsed;
  try {
    let raw;
    try {
      raw = await runGuarded(primaryKey, model);
    } catch (e) {
      // Override set-nhưng-hỏng (khoá 403/hết hạn, model lạ) KHÔNG được âm thầm giết bước vẽ:
      // lui về khoá base (VILAO_API_KEY) + model mặc định. Đa số user chỉ set đúng 1 khoá base này.
      if (!usingOverride) throw e;
      raw = await runGuarded(undefined, null);  // null model → callVilao dùng VILAO_MODEL
    }
    const jsonText = extractJson(raw);
    try {
      parsed = JSON.parse(jsonText);            // đường chặt: model JSON đúng (gemini) → không đụng gì
    } catch {
      parsed = JSON.parse(repairJsonEscapes(jsonText));  // model nhả escape lỗi (gpt `\ `) → vá rồi thử lại
    }
  } catch {
    return { type: 'single' };
  }

  // Bản chép đề (model điền vào `setup`) — trả kèm MỌI nhánh để route (analyze-advance) còn nhận diện
  // đề tròn xoay & đặt nhãn lịch sử khi đề vào bằng ẢNH (lúc đó `problem` rỗng).
  const setup = typeof parsed?.setup === 'string' ? parsed.setup : '';

  // Mẫu calculus là TẤT ĐỊNH ở engine: builder tự dựng khối + tự kiểm (thể tích/diện tích), KHÔNG phụ
  // thuộc số câu. Bài điển hình CHỈ 1 câu nên type thường là 'single' — phải GIỮ template kể cả khi
  // single, nếu không các nhánh route (analyze-advance) không bao giờ chạy. Danh sách này PHẢI khớp mọi
  // `split.template === ...` bên analyze-advance (rev-ox, cross-known, area-plane, section-poly), nếu
  // không cả Đợt 2/3 sẽ chết end-to-end (unit test builder vẫn xanh vì inject template thẳng vào deps).
  const revTemplate = (CALC_TEMPLATES.includes(parsed?.template) && parsed?.templateParams)
    ? { template: parsed.template, templateParams: parsed.templateParams }
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
