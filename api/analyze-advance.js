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
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { creditsConfigured, checkAndConsume, refund, creditCostFor } from './_lib/credits.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ===== LÕI THUẦN (deps-injected) — test 3 nhánh KHÔNG cần mạng =====
// deps = { splitProblem, buildAdvanceScene, solveProblem }. Xem test analyze-advance.test.js.
export async function assembleAdvance(problem, deps, opts = {}) {
  const split = await deps.splitProblem(problem, opts);

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

  // single / build-fail / animation-fail → FALLBACK: xử bài đơn, đánh dấu degraded để handler hoàn credit.
  // solveProblem NÉM khi translator abstain → trả degraded sạch (KHÔNG để 500 xuyên lên handler).
  try {
    const out = await deps.solveProblem(problem, opts);
    return { mode: 'kernel', degraded: true, ...out };
  } catch (e) {
    return { mode: 'kernel', degraded: true, ok: false, abstained: true, error: String(e?.message || e).slice(0, 120) };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let userId = null;        // ví credit: cần ở scope hàm để catch ngoài cùng hoàn được
  let creditCharge = null;  // { cost, reqId } nếu đã TRỪ credit (paid tier) → hoàn khi lỗi
  try {
    // ---- Auth Bearer (Supabase) — copy pattern analyze-geometry.js ----
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }
    const token = authHeader.split(' ')[1];
    if (supabase) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
      userId = user.id;
    }

    // ---- Đề bài ----
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 1) {
      return res.status(400).json({ error: 'Mô tả không được để trống' });
    }
    if (prompt.trim().length > 5000) {
      return res.status(400).json({ error: 'Mô tả quá dài (tối đa 5000 ký tự)' });
    }
    const problem = prompt.trim();

    // ---- TRỪ CREDIT cho lượt Advance (feature 'draw', action 'draw_advance') ----
    // Trừ TRƯỚC khi làm việc nặng; hoàn ở catch nếu lỗi. Fail-open khi credit CHƯA cấu hình.
    if (userId && creditsConfigured()) {
      const gate = await checkAndConsume(userId, 'draw', 'draw_advance');
      if (!gate.ok) {
        return res.status(402).json({ error: gate.message || 'Bạn đã hết lượt/credit để vẽ.', code: gate.reason });
      }
      if (gate.mode === 'credit') creditCharge = { cost: gate.cost, reqId: crypto.randomUUID() };
    }

    // ---- Nạp ĐỘNG các mảnh pipeline (lỗi import ⇒ rơi vào catch, hoàn credit) ----
    const [{ splitProblem }, { buildAdvanceScene }, { solveProblem }] = await Promise.all([
      import('./_lib/advance/splitProblem.js'),
      import('./_lib/advance/buildAdvanceScene.js'),
      import('./_lib/kernel-bridge/solveWithKernel.js'),
    ]);

    const result = await assembleAdvance(problem, { splitProblem, buildAdvanceScene, solveProblem });

    // ---- Fallback tụt-hạng: đã trừ mức Advance nhưng chỉ xử bài đơn ⇒ HOÀN chênh lệch xuống Vẽ kỹ ----
    // Công bằng: user chỉ bị tính bằng mức "Vẽ kỹ" (draw_detailed) khi không được phục vụ đa-cảnh.
    if (result?.degraded && creditCharge && userId) {
      const target = creditCostFor('draw_detailed');
      const diff = creditCharge.cost - target;
      if (diff > 0) {
        try { await refund(userId, diff, creditCharge.reqId + ':downgrade'); }
        catch (e) { console.warn('Hoàn credit tụt-hạng lỗi:', e?.message); }
        creditCharge.cost = target; // còn lại = mức Vẽ kỹ (phòng lỗi phát sinh sau vẫn hoàn đúng)
      }
    }

    return res.json(result);
  } catch (error) {
    console.error('Error in analyze-advance:', error);
    // Lỗi sau khi đã trừ ⇒ HOÀN credit đã trừ (nếu có). Quota free không hoàn.
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
