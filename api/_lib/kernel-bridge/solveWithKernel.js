// api/_lib/kernel-bridge/solveWithKernel.js
// Đường ống "kernel mode": đề → (LLM Translator) → Plan JSON → engine.run() → hình + đáp số.
// Import engine từ bản đã build (esbuild) để chạy được trong route .js thuần.
import { runAny, RunPlanSchema, AnalysisPlanSchema, entityTableToGeometryData } from '../kernel-dist/index.mjs';
import { callVilao } from '../vilao.js';
import { TRANSLATOR_PROMPT } from './translatorPrompt.js';
import { answersAgree } from '../answerCompare.js';

// Gỡ hàng rào ```json nếu model lỡ thêm dù đã dặn.
function extractJson(raw) {
  return String(raw).trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
}

// Đề tiếng Việt → Plan JSON hợp lệ (đã validate bằng schema của engine).
// Model dịch có thể đổi qua env VILAO_TRANSLATOR_MODEL; mặc định gemini-flash (nhanh/rẻ).
const TRANSLATOR_MODEL = process.env.VILAO_TRANSLATOR_MODEL || 'ram/gemini-3.5-flash-low';

// Timeout MẶC ĐỊNH cho bước dịch. Đo thực tế: 5–10s/đề (cả gemini lẫn claude). Đặt 25s = thừa đệm.
// KHÔNG dùng mặc định 180s của callVilao: khi engine là bước THỬ TRƯỚC rồi mới rơi về luồng cũ,
// một lần LLM treo sẽ bắt người dùng chờ 3 phút trước khi luồng cũ mới bắt đầu.
const TRANSLATE_TIMEOUT_MS = Number(process.env.VILAO_TRANSLATOR_TIMEOUT_MS) || 25000;

export async function planFromProblem(problem, options = {}) {
  const raw = await callVilao(TRANSLATOR_PROMPT, problem, {
    model: TRANSLATOR_MODEL,
    maxTokens: 4096,
    timeoutMs: options.timeoutMs ?? TRANSLATE_TIMEOUT_MS,
  });
  let json;
  try {
    json = JSON.parse(extractJson(raw));
  } catch {
    throw new Error('Translator returned non-JSON output');
  }
  // Bộ dịch TỰ KHƯỚC TỪ khi đề thiếu số liệu / ngoài danh mục (chống "phục vụ sai"). Ném ⇒ route
  // rơi về luồng LLM cũ, thay vì để engine trả đáp tự tin cho một bài không nên trả.
  if (json && typeof json === 'object' && json.abstain === true) {
    throw new Error('translator abstained: ' + (json.abstain_reason || 'thiếu số liệu / ngoài danh mục'));
  }
  // Plan có khối `analyze` (bài tham số/tối ưu/hàm số) dùng schema analysis; còn lại là plan hình học thuần.
  const schema = json && typeof json === 'object' && 'analyze' in json ? AnalysisPlanSchema : RunPlanSchema;
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new Error('Translator plan failed schema: ' + (parsed.error.issues[0]?.message || 'invalid'));
  }
  // "scaleSymbol" (thang CHỮ): bài ĐO TUYỆT ĐỐI trên hình RẮN-tới-đồng-dạng, kích thước cho bằng một
  // chữ duy nhất (vd cạnh 'a'). Engine toạ-độ-hoá tại a=1 rồi solvePlan ghép ×a^k vào đáp. Schema
  // KHÔNG khai trường này nên safeParse loại bỏ ⇒ giữ lại từ json gốc. Chỉ nhận MỘT chữ cái.
  if (typeof json.scaleSymbol === 'string' && /^[a-zA-Z]$/.test(json.scaleSymbol)) {
    parsed.data.scaleSymbol = json.scaleSymbol;
  }
  return parsed.data;
}

// Chạy một Plan qua engine → gói kết quả để frontend dùng.
// Đáp số exact của engine mang BigInt (num/den của phân số chính xác). JSON.stringify NÉM khi gặp
// BigInt ⇒ res.json() của route sẽ chết. Chuyển BigInt → chuỗi để mọi consumer serialize được.
// (Giá trị exact vẫn đọc được ở .text dạng '√2'; đây chỉ là làm cho JSON an toàn.)
function jsonSafe(v) {
  if (typeof v === 'bigint') return v.toString();
  if (Array.isArray(v)) return v.map(jsonSafe);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = jsonSafe(val);
    return out;
  }
  return v;
}

// Chú thích THANG CHỮ cho đáp đo tuyệt đối trên hình xác-định-tới-đồng-dạng (vd cạnh 'a').
// Engine tính tại a=1 ⇒ đáp exact chính xác bằng (số thuần)·a^k. Ghép ×a^k vào .text để KHÔNG
// hiển thị số trần gây hiểu nhầm là số tuyệt đối. k: khoảng-cách/độ-dài=1, diện-tích=2, thể-tích=3.
// GÓC và TỈ SỐ bất biến theo cỡ (k=0) ⇒ KHÔNG có trong bảng ⇒ giữ nguyên, không ghép.
const SCALE_EXP = { distance: 1, length: 1, area: 2, volume: 3 };
function scaleText(text, sym, k) {
  const t = String(text).trim();
  const s = k === 1 ? sym : `${sym}${k === 2 ? '²' : k === 3 ? '³' : '^' + k}`;
  if (t === '1') return s;                          // a·1 → a
  if (/^\d+(?:\.\d+)?$/.test(t)) return `${t}${s}`; // 2 → 2a ; 13 → 13a
  return `${s}·${t}`;                               // √3/3 → a·√3/3
}
function applyScaleSymbol(answers, sym) {
  if (!sym || !Array.isArray(answers)) return answers;
  return answers.map((a) => {
    const k = SCALE_EXP[a && a.kind];
    if (!k || a.text == null) return a;
    const t = String(a.text).trim();
    if (t === '' || t === '0' || a.approx === 0) return a; // đáp 0 (vd thẳng hàng ⇒ area 0): không ghép
    // approx là giá trị tại a=1, sẽ gây hiểu nhầm nếu hiện dạng thập phân trần ⇒ bỏ.
    return { ...a, text: scaleText(a.text, sym, k), approx: null, scaleSymbol: sym, scaleExp: k };
  });
}

export function solvePlan(plan) {
  const result = runAny(plan);
  // Nhánh analysis: runAnalysis trả { parameter, answer } và KHÔNG có entities ⇒ chưa dựng được hình.
  if (!('entities' in result)) {
    // Nhánh analysis: runAnalysis nay trả THÊM hình dựng tại nghiệm (optimize/solve có op hình học)
    // ⇒ route vẽ hiện được cả hình lẫn đáp số. Gắn `kind` để calculation_log của route định dạng gọn.
    return jsonSafe({
      ok: result.ok,
      geometry: result.geometry ?? null,
      parameter: result.parameter,
      answers: result.ok ? [{ kind: 'kết quả', ...result.answer }] : [],
      violations: result.violations,
      errors: result.errors,
    });
  }
  return jsonSafe({
    ok: result.ok,
    geometry: entityTableToGeometryData(result.entities, plan.solidName || 'figure'),
    answers: applyScaleSymbol(result.answers, plan.scaleSymbol), // ghép ×a^k nếu là bài THANG CHỮ
    violations: result.violations,
    errors: result.errors,
    trace: result.trace,
  });
}

export async function solveProblem(problem, options = {}) {
  const plan = await planFromProblem(problem, options);
  const result = { plan, ...solvePlan(plan) };

  // A1 — ĐỐI CHIẾU 2 ĐƯỜNG (gated qua env KERNEL_CROSSCHECK='on'; mặc định TẮT ⇒ không tốn thêm).
  // Dịch đề LẦN 2 độc lập rồi so ĐÁP SỐ. Lệch ⇒ engine không đủ tin ⇒ đánh dấu ok=false để route
  // rơi về luồng LLM cũ (thay vì phục vụ một đáp có thể sai). Trùng ⇒ tin cao. Đây là lưới chống #1.
  if (String(process.env.KERNEL_CROSSCHECK || '').trim() === 'on' && result.ok && result.answers?.length) {
    try {
      const r2 = solvePlan(await planFromProblem(problem, options));
      const a1text = result.answers[0]?.text;
      const a2num = r2.answers?.[0]?.approx;
      const agree = a2num != null && Number.isFinite(a2num) ? answersAgree(a1text, a2num, 1e-3) : null;
      if (agree === false) {
        return {
          ...result, ok: false, crossCheck: 'disagree',
          errors: [...(result.errors || []), { message: `cross-check lệch: "${a1text}" vs "${r2.answers?.[0]?.text}"` }],
        };
      }
      result.crossCheck = agree === true ? 'agree' : 'unverified';
    } catch { /* lỗi khi đối chiếu ⇒ giữ kết quả gốc, không chặn */ }
  }
  return result;
}
