// api/analyze-advance.js
// Route "Advance mode" — RÁP pipeline đa-câu thành một endpoint.
// Luồng: auth Bearer (Supabase) → trừ credit `draw_advance` → splitProblem (Pass 0) → phân nhánh:
//   - multi_question   → buildAdvanceScene → scene≠null ⇒ { mode:'advance', scene }
//   - continuous_animation → solveProblem (engine bài đơn, kinematic chảy qua đây) → gói 1-step timeline
//   - single / build-fail / animation-fail → FALLBACK bài đơn (solveProblem) + HOÀN chênh lệch credit
//     xuống mức "Vẽ kỹ" (draw_detailed) ⇒ { mode:'kernel', degraded:true, ...out }
//
// LƯU Ý (giống analyze-geometry.js): các mảnh advance/kernel-bridge được nạp ĐỘNG trong handler,
// KHÔNG import tĩnh — vì solveWithKernel.js kéo theo api/_lib/kernel-dist/ (BỊ GITIGNORE, chỉ sinh
// bởi `npm run build:kernel`). Import tĩnh sẽ giết route lúc load nếu kernel chưa build; nạp động ⇒
// lỗi rơi vào try/catch và trả lỗi sạch (đồng thời hoàn credit).
import crypto from 'crypto';
import { refund, creditCostFor } from './_lib/credits.js';
import { accessError, resolveAiAccess, withQuota, refundAiUsage } from './_lib/aiAccess.js';
import { withSentry, reportServerError } from './_lib/sentry.js';

// Nhắn TRUNG THỰC khi đề rõ là tròn xoay nhưng KHÔNG dựng được mẫu rev-ox (ảnh mờ, kiểu quay chưa
// hỗ trợ…): thà báo thẳng còn hơn vẽ bừa một hình 3D không liên quan.
export const REV_UNSUPPORTED_MSG =
  'Đề tròn xoay này mình chưa dựng được khối (có thể ảnh đọc chưa rõ, hoặc kiểu quay chưa hỗ trợ). ' +
  'Bạn thử gõ lại đề bằng chữ, hoặc chụp rõ hơn giúp mình nhé.';

// Nhận diện đề TRÒN XOAY một cách TẤT ĐỊNH (không LLM) — dùng ở nhánh fallback để chống vẽ-bừa.
// Bắt "tròn xoay", hoặc (quay/xoay + quanh + trục Ox/Oy/hoành/tung).
export function looksLikeRevolution(text) {
  const s = String(text || '').toLowerCase();
  if (!s) return false;
  if (s.includes('tròn xoay')) return true;
  const hasSpin = /\b(quay|xoay)\b/.test(s);
  const hasAxis = /quanh/.test(s) && /(trục|\box\b|\boy\b|hoành|tung)/.test(s);
  return hasSpin && hasAxis;
}

// ===== LÕI THUẦN (deps-injected) — test 3 nhánh KHÔNG cần mạng =====
// deps = { splitProblem, buildAdvanceScene, solveProblem, transcribeImage }. Xem test analyze-advance.test.js.
export async function assembleAdvance(problem, deps, opts = {}) {
  // Pass -1: nếu có ẢNH → chép đề ra chữ (model vision rẻ) rồi chạy pipeline chữ như thường.
  // Chép RA CHỮ (KHÔNG đẩy ảnh xuống splitProblem) để coverageCheck chống-ảo-giác soi được đề thật.
  // Chép hỏng/rỗng → coi như không có đề ⇒ rơi xuống fallback bài đơn (degrade + hoàn credit).
  if (opts.imageBase64 && deps.transcribeImage) {
    try {
      const text = (await deps.transcribeImage(opts.imageBase64, opts)) || '';
      problem = text.trim() || problem;   // giữ seed chữ (nếu user vừa gõ vừa dán ảnh) khi chép rỗng
    } catch { problem = problem || ''; }   // chép ném → để problem như cũ; '' sẽ dẫn tới single/degrade
  }

  const split = await deps.splitProblem(problem, opts);

  // Nhánh mẫu calculus (Đợt 1: rev-ox). Engine dựng khối tất định, tự kiểm thể tích.
  if (split.template === 'rev-ox' && split.templateParams && deps.buildRevolutionScene) {
    try {
      const scene = deps.buildRevolutionScene(split.templateParams);
      if (scene) return { mode: 'advance', scene };
    } catch { /* dựng mẫu hỏng → rơi xuống fallback bài đơn */ }
  }

  if (split.type === 'multi_question') {
    const scene = await deps.buildAdvanceScene(problem, split, opts);
    if (scene) return { mode: 'advance', scene };
    // scene=null (base dựng hỏng) → rơi xuống fallback bài đơn.
  } else if (split.type === 'continuous_animation') {
    try {
      const out = await deps.solveProblem(problem, opts);
      if (out?.ok && out.geometry) {
        const g = out.geometry;
        return {
          mode: 'advance',
          scene: {
            base: g,
            steps: [{ id: 'main', label: '', visibleIds: (g.points || []).map((p) => p.id), timeline: g.timeline }],
          },
        };
      }
    } catch { /* solveProblem ném → rơi xuống fallback bài đơn */ }
    // engine chịu animation → rơi xuống fallback bài đơn.
  }

  // Đề RÕ là tròn xoay nhưng rơi tới đây (không dựng được mẫu rev-ox) ⇒ KHÔNG vẽ bừa hình 3D lạ
  // (chống ảo giác). Trả tín hiệu trung thực để frontend nhắn người dùng gõ lại / chụp rõ hơn.
  // (Bài đã dựng được rev-ox thì đã return ở nhánh trên, không chạm tới đây.)
  if (looksLikeRevolution(problem)) {
    return { mode: 'kernel', degraded: true, ok: false, revUnsupported: true, error: REV_UNSUPPORTED_MSG };
  }

  // single / build-fail / animation-fail → FALLBACK: xử bài đơn, đánh dấu degraded để handler hoàn credit.
  // solveProblem NÉM khi translator abstain → trả degraded sạch (KHÔNG để 500 xuyên lên handler).
  try {
    const out = await deps.solveProblem(problem, opts);
    return { mode: 'kernel', degraded: true, ...out };
  } catch (e) {
    return { mode: 'kernel', degraded: true, ok: false, abstained: true, error: String(e?.message || e).slice(0, 120) };
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let userId = null;        // ví credit: cần ở scope hàm để catch ngoài cùng hoàn được
  let creditCharge = null;  // { cost, reqId } nếu đã TRỪ credit (paid tier) → hoàn khi lỗi
  let access = null;        // cần ở scope hàm để catch hoàn được quota free/khách
  try {
    // ---- Đề bài ---- (Advance nhận CHỮ hoặc ẢNH: có ảnh thì Pass -1 CHÉP đề ảnh ra chữ trong lõi)
    const { prompt, imageBase64 } = req.body || {};
    const hasText = typeof prompt === 'string' && prompt.trim().length >= 1;
    if (!hasText && !imageBase64) {
      return res.status(400).json({ error: 'Thiếu dữ liệu: cần prompt hoặc ảnh' });
    }
    if (hasText && prompt.trim().length > 5000) {
      return res.status(400).json({ error: 'Mô tả quá dài (tối đa 5000 ký tự)' });
    }
    // Seed CHỮ: có chữ thì dùng chữ; chỉ-ảnh → '' (Pass -1 transcribeImage trong lõi sẽ điền đề vào).
    const problemSeed = hasText ? prompt.trim() : '';

    access = await resolveAiAccess(req, res, {
      feature: 'draw',
      action: 'draw_advance',
      allowGuest: false,
    });
    if (!access.ok) return accessError(res, access);
    userId = access.userId;
    if (access.gate.mode === 'credit') {
      creditCharge = { cost: access.gate.cost, reqId: crypto.randomUUID() };
    }

    // ---- Nạp ĐỘNG các mảnh pipeline (lỗi import ⇒ rơi vào catch, hoàn credit) ----
    const [{ splitProblem }, { buildAdvanceScene }, { solveProblem }, { transcribeImage }, { buildRevolutionScene }] = await Promise.all([
      import('./_lib/advance/splitProblem.js'),
      import('./_lib/advance/buildAdvanceScene.js'),
      import('./_lib/kernel-bridge/solveWithKernel.js'),
      import('./_lib/advance/transcribeImage.js'),
      import('./_lib/advance/buildRevolutionScene.js'),
    ]);

    // Có ảnh → assembleAdvance chạy Pass -1 (transcribeImage) CHÉP đề ra chữ RỒI mới splitProblem.
    // splitProblem/buildAdvanceScene/solveProblem chỉ nhận CHỮ (opts.imageBase64 chảy qua nhưng bị bỏ qua)
    // ⇒ coverageCheck (Pass 0) soi trên đề-chữ đã chép, chống ảo giác y như luồng nhập-chữ.
    const result = await assembleAdvance(problemSeed, { splitProblem, buildAdvanceScene, solveProblem, transcribeImage, buildRevolutionScene }, { imageBase64 });

    // ---- Fallback tụt-hạng: đã trừ mức Advance nhưng chỉ xử bài đơn ⇒ HOÀN chênh lệch xuống Vẽ kỹ ----
    // Công bằng: user chỉ bị tính bằng mức "Vẽ kỹ" (draw_detailed) khi không được phục vụ đa-cảnh.
    if (result?.degraded && creditCharge && userId) {
      if (result.revUnsupported) {
        // KHÔNG vẽ được gì (đề tròn xoay không dựng nổi) ⇒ HOÀN TOÀN BỘ, không tính tiền.
        try { await refund(userId, creditCharge.cost, creditCharge.reqId + ':rev-unsupported'); }
        catch (e) { console.warn('Hoàn credit rev-unsupported lỗi:', e?.message); }
        creditCharge.cost = 0;
      } else {
        const target = creditCostFor('draw_detailed');
        const diff = creditCharge.cost - target;
        if (diff > 0) {
          try { await refund(userId, diff, creditCharge.reqId + ':downgrade'); }
          catch (e) { console.warn('Hoàn credit tụt-hạng lỗi:', e?.message); }
          creditCharge.cost = target; // còn lại = mức Vẽ kỹ (phòng lỗi phát sinh sau vẫn hoàn đúng)
        }
      }
    }

    return res.json(withQuota(result, access));
  } catch (error) {
    await reportServerError(error, { route: 'analyze-advance' });
    console.error('Error in analyze-advance:', error);
    // Lỗi sau khi đã trừ ⇒ HOÀN credit đã trừ (nếu có) VÀ lượt quota free/khách.
    await refundAiUsage(access);
    if (creditCharge && userId) {
      try { await refund(userId, creditCharge.cost, creditCharge.reqId); }
      catch (e) { console.warn('refund credit lỗi:', e?.message); }
    }
    const isAbort = error?.name === 'AbortError' || (error?.message || '').includes('aborted');
    const status = isAbort ? 504 : (error?.status || 500);
    const message = isAbort
      ? 'Yêu cầu quá lâu, vui lòng thử lại với đề bài ngắn hơn'
      : (error?.message || 'Unknown error');
    return res.status(status).json({ error: message });
  }
}

export const config = { maxDuration: 60 };

export default withSentry(handler, 'analyze-advance');
