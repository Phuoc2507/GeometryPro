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
import { getAccount } from './_lib/credits.js';
import { ruleFor } from './_lib/entitlements.js';

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

  // ── CHẶN TÀI KHOẢN BỊ KHÓA (KHÔNG trừ credit theo D22) ────────────────────────
  // Chỉ ĐỌC profiles (bắt chước getAccount ở aiAccess/credits), KHÔNG gọi checkAndConsume (không tiêu).
  // "blocked": tài khoản admin đặt sang tier lạ/không khai báo ⇒ ruleFor(...).mode === 'blocked'
  // (entitlements mặc định blocked cho tier không có trong POLICY). "hết hạn": effectiveTier tự hạ về
  // 'free' ⇒ VẪN được dùng (đúng D22 — miễn phí cho người đăng nhập). Lỗi đọc DB ⇒ fail-OPEN (không
  // chặn người dùng hợp lệ vì DB chập chờn; chi phí LLM đã có rate-limit chặn riêng ở handler).
  try {
    const account = await getAccount(user.id);
    if (account && ruleFor(account.tier, 'solve').mode === 'blocked') {
      return { ok: false, status: 403, code: 'account_blocked', message: 'Tài khoản của bạn hiện không dùng được tính năng này.' };
    }
  } catch {
    /* fail-open: bỏ qua lỗi đọc profiles, không chặn nhầm người dùng hợp lệ */
  }

  return { ok: true, userId: user.id };
}

// ── RATE-LIMIT THÔ in-memory (D29) — chống ĐỐT TIỀN LLM khi token rò rỉ gọi vô hạn ─────────────────
// KHÔNG phải quota tính tiền (giữ D22 "không trừ credit"); chỉ trần chống lạm dụng. Cửa sổ trượt 60 s,
// mặc định 30 req/phút/userId. State in-memory theo tiến trình (đủ cho tính năng ẩn; reset khi deploy).
const RL_WINDOW_MS = 60_000;
const RL_MAX = 30;
const rlHits = new Map(); // userId -> number[] (mốc thời gian ms trong cửa sổ)
let rlLastSweep = 0;
function rateLimitOk(userId) {
  const now = Date.now();
  // Quét dọn định kỳ để Map không phình theo số user (xóa entry hết hạn).
  if (now - rlLastSweep > RL_WINDOW_MS) {
    for (const [k, ts] of rlHits) {
      const kept = ts.filter((t) => now - t < RL_WINDOW_MS);
      if (kept.length) rlHits.set(k, kept); else rlHits.delete(k);
    }
    rlLastSweep = now;
  }
  const arr = (rlHits.get(userId) || []).filter((t) => now - t < RL_WINDOW_MS);
  if (arr.length >= RL_MAX) { rlHits.set(userId, arr); return false; }
  arr.push(now);
  rlHits.set(userId, arr);
  return true;
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

  // D29: rate-limit thô/userId chống đốt tiền LLM (KHÔNG trừ credit). Vượt trần ⇒ 429.
  if (!rateLimitOk(auth.userId)) {
    return res.status(429).json({ error: 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.', code: 'rate_limited' });
  }

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
    // [THẤP] KHÔNG lộ error.message nội bộ ra client. Log chi tiết ở server (Sentry + console),
    // trả thông điệp CHUNG cho người dùng.
    console.error('[analyze-problem] lỗi xử lý:', error instanceof Error ? (error.stack || error.message) : error);
    return res.status(500).json({ error: 'Lỗi xử lý, vui lòng thử lại' });
  }
}

export default withSentry(handler, 'analyze-problem');
