// api/analyze-problem.js
// Route MỚI (đa môn): POST { problem } → prefilter môn (D23) → engine Lý/Hóa chạy end-to-end → đáp.
// Đề Toán/không rõ → trả { subject:'geometry', delegate:true } để FRONTEND tự gọi luồng Toán cũ
// (route này KHÔNG tự gọi lại luồng Toán). Bắt chước analyze-geometry-v2.js VỀ khung Sentry +
// dry-run + logBrokenProblem, NHƯNG theo D22: chỉ YÊU CẦU ĐĂNG NHẬP, KHÔNG trừ credit/quota.
import { createClient } from '@supabase/supabase-js';
import { classifySubject } from './_lib/kernel-bridge/subjectClassifier.js';
import {
  solvePhysicsProblem, solveChemProblem, solvePhysicsPlan, solveChemPlan,
} from './_lib/kernel-bridge/solveSubject.js';
import { withSentry, reportServerError } from './_lib/sentry.js';
import { logBrokenProblem } from './_lib/brokenProblemLog.js';

// ── AUTH-CHỈ-KIỂM (D22): xác thực Bearer token mà KHÔNG tiêu quota/credit ────────
// Vì sao KHÔNG dùng resolveAiAccess: hàm đó LUÔN gọi checkAndConsume → trừ quota (gói free) hoặc
// trừ credit (student/teacher). D22 yêu cầu "chỉ cần auth context, KHÔNG trừ". Nên ta chép ĐÚNG nửa
// XÁC THỰC của aiAccess.resolveAiAccess (Bearer → supabase admin.auth.getUser) và DỪNG trước bước tiêu.
let cachedAdmin = null;
let cachedAdminKey = '';
function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const cacheKey = `${url}:${key}`;
  if (!cachedAdmin || cachedAdminKey !== cacheKey) {
    cachedAdmin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    cachedAdminKey = cacheKey;
  }
  return cachedAdmin;
}

async function resolveAuthNoCharge(req) {
  const authHeader = req.headers?.authorization;
  if (!authHeader) {
    return { ok: false, status: 401, code: 'auth_required', message: 'Vui lòng đăng nhập để dùng tính năng này' };
  }
  if (!authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, code: 'invalid_token', message: 'Authorization header không hợp lệ' };
  }
  const admin = getAdmin();
  if (!admin) {
    return { ok: false, status: 503, code: 'auth_not_configured', message: 'Hệ thống xác thực chưa được cấu hình' };
  }
  const token = authHeader.slice('Bearer '.length).trim();
  const { data: { user } = {}, error } = await admin.auth.getUser(token);
  if (error || !user) {
    return { ok: false, status: 401, code: 'invalid_token', message: 'Phiên đăng nhập không hợp lệ' };
  }
  return { ok: true, userId: user.id };
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const startedAt = Date.now();
  const { problem, plan, subject } = req.body || {};

  // DRY-RUN (dev): { plan, subject } chạy thẳng engine — điểm vào tất định cho dev/test, KHÔNG mở
  // ở production (như v2). Cần "subject" để chọn engine vì plan Lý và Hóa khác schema.
  if (plan) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Not Found' });
    }
    if (subject === 'physics') return res.json({ mode: 'dry-run', ...solvePhysicsPlan(plan) });
    if (subject === 'chem') return res.json({ mode: 'dry-run', ...solveChemPlan(plan) });
    return res.status(400).json({ error: 'dry-run cần { plan, subject: "physics" | "chem" }' });
  }

  if (!problem || typeof problem !== 'string' || problem.trim().length < 1) {
    return res.status(400).json({ error: 'Provide { problem: string }' });
  }
  if (problem.trim().length > 5000) {
    return res.status(400).json({ error: 'Mô tả quá dài (tối đa 5000 ký tự)' });
  }

  // D23: prefilter từ khóa tất định (KHÔNG tốn LLM). Đề Toán/không rõ ⇒ giao lại luồng Toán cho FE.
  // Phân loại chạy TRƯỚC auth vì nó miễn phí và không lộ gì; chỉ bước LLM (tốn tiền) mới cần auth.
  const detected = classifySubject(problem);
  if (detected !== 'physics' && detected !== 'chem') {
    return res.json({ subject: 'geometry', delegate: true, detected });
  }

  // D22: yêu cầu đăng nhập nhưng KHÔNG trừ credit/quota (chỉ auth context, chống spam ẩn danh).
  const auth = await resolveAuthNoCharge(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.message, code: auth.code });

  try {
    const out = detected === 'physics'
      ? await solvePhysicsProblem(problem.trim())
      : await solveChemProblem(problem.trim());

    // Engine có abstain + tự kiểm: dịch sai/ngoài phạm vi ⇒ ok:false (KHÔNG bịa). Vẫn trả 200 kèm
    // subject + lý do để FE hiện "ngoài phạm vi" / tự rơi về; log lại để cải thiện prompt/DB.
    if (!out.ok) {
      await logBrokenProblem({
        endpoint: 'analyze-problem', userId: auth.userId, mode: detected,
        prompt: problem.trim(), aiJson: out.plan ?? null,
        errorMessage: out.errors?.[0]?.message || 'engine ok:false',
        errorStage: out.abstained ? 'unsupported' : (out.plan ? 'verify' : 'parse'),
        durationMs: Date.now() - startedAt,
      });
    }
    return res.json({ mode: 'engine', ...out });
  } catch (error) {
    await reportServerError(error, { route: 'analyze-problem' });
    await logBrokenProblem({
      endpoint: 'analyze-problem', userId: auth.userId, mode: detected,
      prompt: problem.trim(),
      errorMessage: error instanceof Error ? error.message : 'engine-mode failed',
      errorStage: 'exception', durationMs: Date.now() - startedAt,
    });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'engine-mode failed',
    });
  }
}

export default withSentry(handler, 'analyze-problem');
