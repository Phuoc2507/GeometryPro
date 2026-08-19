// api/admin.js
// Endpoint quản trị GỘP (một function → nhẹ giới hạn serverless của Vercel).
// MỌI hành động đều đi qua requireAdmin (verify JWT + role='admin') TRƯỚC.
// Đọc dữ liệu người dùng/đơn hàng và cấp/trừ credit bằng service-role — client
// KHÔNG bao giờ tự làm các việc này.
import crypto from 'crypto';
import { withSentry, reportServerError } from './_lib/sentry.js';
import { requireAdmin } from './_lib/adminAuth.js';
import { grant, getAccount } from './_lib/credits.js';
import { normalizePrompt } from './_lib/promptNormalize.js';
import { buildGoldenResponse } from './_lib/goldenStore.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const gate = await requireAdmin(req);
  if (!gate.ok) return res.status(gate.status).json({ error: gate.error });
  const { admin } = gate;
  const action = req.body?.action;

  try {
    switch (action) {
      case 'list-users':   return await listUsers(admin, req, res);
      case 'list-orders':  return await listOrders(admin, req, res);
      case 'grant-credit': return await grantCredit(gate, req, res);
      case 'set-role':     return await setRole(gate, req, res);
      case 'set-plan':     return await setPlan(gate, req, res);
      case 'save-golden':   return await saveGolden(gate, req, res);
      case 'list-golden':   return await listGolden(admin, req, res);
      case 'delete-golden': return await deleteGolden(admin, req, res);
      case 'list-withdrawals':   return await listWithdrawals(admin, req, res);
      case 'resolve-withdrawal': return await resolveWithdrawal(admin, req, res);
      default:             return res.status(400).json({ error: 'Hành động không hợp lệ' });
    }
  } catch (error) {
    await reportServerError(error, { route: 'admin', action });
    console.error('[admin] lỗi:', error?.message);
    return res.status(500).json({ error: error?.message || 'Lỗi máy chủ' });
  }
}

function clampPage(v) { return Math.max(1, parseInt(v, 10) || 1); }
function clampPerPage(v) { return Math.min(100, Math.max(1, parseInt(v, 10) || 30)); }

// ── list-users: gộp auth.users (email) + profiles (gói/credit/role) ──────────
async function listUsers(admin, req, res) {
  const page = clampPage(req.body?.page);
  const perPage = clampPerPage(req.body?.perPage);

  const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
  if (error) return res.status(500).json({ error: error.message });

  const users = data?.users || [];
  const ids = users.map((u) => u.id);
  const profileMap = {};
  if (ids.length) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('user_id, display_name, role, plan_tier, plan_code, plan_expires_at, plan_credits, purchased_credits')
      .in('user_id', ids);
    for (const p of profiles || []) profileMap[p.user_id] = p;
  }

  const merged = users.map((u) => {
    const p = profileMap[u.id] || {};
    const planCr = Number(p.plan_credits ?? 0);
    const purchCr = Number(p.purchased_credits ?? 0);
    return {
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at ?? null,
      last_sign_in_at: u.last_sign_in_at ?? null,
      display_name: p.display_name ?? null,
      role: p.role ?? 'user',
      plan_tier: p.plan_tier ?? 'free',
      plan_code: p.plan_code ?? 'free',
      plan_expires_at: p.plan_expires_at ?? null,
      plan_credits: planCr,
      purchased_credits: purchCr,
      credits: planCr + purchCr,
    };
  });

  return res.json({ users: merged, page, hasMore: !!data?.nextPage, total: data?.total ?? null });
}

// ── list-orders: đơn hàng + tên hiển thị của người mua ───────────────────────
async function listOrders(admin, req, res) {
  const page = clampPage(req.body?.page);
  const perPage = clampPerPage(req.body?.perPage);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data: orders, error } = await admin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) return res.status(500).json({ error: error.message });

  const ids = [...new Set((orders || []).map((o) => o.user_id).filter(Boolean))];
  const nameMap = {};
  if (ids.length) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', ids);
    for (const p of profiles || []) nameMap[p.user_id] = p.display_name;
  }

  const merged = (orders || []).map((o) => ({ ...o, display_name: nameMap[o.user_id] ?? null }));
  return res.json({ orders: merged, page, hasMore: (orders || []).length === perPage });
}

// ── grant-credit: cấp (dương) / trừ (âm) credit MUA cho một user ──────────────
async function grantCredit(gate, req, res) {
  const userId = String(req.body?.userId || '');
  const amount = Number(req.body?.amount);
  const reason = (req.body?.reason ? String(req.body.reason) : 'admin-adjust').slice(0, 100);

  if (!userId) return res.status(400).json({ error: 'Thiếu userId' });
  if (!Number.isFinite(amount) || amount === 0) {
    return res.status(400).json({ error: 'Số credit không hợp lệ' });
  }
  // Trừ credit: không cho vượt quá số credit MUA đang có (tránh số dư âm).
  if (amount < 0) {
    const acct = await getAccount(userId);
    const purchased = acct ? Number(acct.purchased_credits || 0) : 0;
    if (purchased + amount < 0) {
      return res.status(400).json({ error: `Không đủ credit mua để trừ (còn ${purchased}).` });
    }
  }

  // IDEMPOTENT: dùng key do client sinh (ổn định trong 1 lần mở hộp thoại) làm ref.
  // grant_credits dedup theo ref → nếu response mất mạng và admin bấm lại, KHÔNG cộng
  // credit lần 2. Không có key hợp lệ → sinh ngẫu nhiên (giữ hành vi cũ).
  const rawKey = req.body?.idempotencyKey;
  const key = (typeof rawKey === 'string' && /^[\w:-]{8,80}$/.test(rawKey)) ? rawKey : crypto.randomUUID();
  const ref = `admin-grant:${key}`;
  const result = await grant(userId, amount, `admin:${reason}`, ref, true);
  if (!result || result.ok === false) {
    return res.status(500).json({ error: 'Không cấp/trừ được credit (kiểm tra user tồn tại).' });
  }
  return res.json({ ok: true, remaining: result.remaining ?? null });
}

// ── set-role: nâng/hạ quyền admin ────────────────────────────────────────────
async function setRole(gate, req, res) {
  const userId = String(req.body?.userId || '');
  const role = String(req.body?.role || '');
  if (!userId) return res.status(400).json({ error: 'Thiếu userId' });
  if (role !== 'admin' && role !== 'user') {
    return res.status(400).json({ error: 'Vai trò không hợp lệ' });
  }
  // Chặn tự gỡ quyền của chính mình (tránh tự khoá mình ra ngoài trang admin).
  if (userId === gate.userId && role !== 'admin') {
    return res.status(400).json({ error: 'Không thể tự gỡ quyền quản trị của chính bạn' });
  }
  // Chặn gỡ admin CUỐI CÙNG (tránh cả hệ thống không còn ai quản trị).
  if (role === 'user') {
    const { count, error: cErr } = await gate.admin
      .from('profiles')
      .select('user_id', { count: 'exact', head: true })
      .eq('role', 'admin');
    if (cErr) return res.status(500).json({ error: cErr.message });
    if ((count ?? 0) <= 1) {
      return res.status(400).json({ error: 'Không thể gỡ quản trị viên cuối cùng' });
    }
  }
  const { error } = await gate.admin
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
}

// ── set-plan: admin ĐỔI GÓI (tier/credit/hạn) cho một user, KHÔNG qua thanh toán ─
// Client chỉ gửi MÃ GÓI; server đọc bảng `plans` (nguồn chuẩn) rồi ghi hồ sơ y hệt
// fulfill_paid_order nhưng cấp một kỳ hạn MỚI tính từ bây giờ. planCode='free' (hoặc
// gói hạn 0) ⇒ GỠ gói: hạ về free, hết hạn null, plan_credits về 0. Đây là ghi đè
// quản trị (cấp/hỗ trợ tay) — credit MUA (purchased_credits) giữ nguyên, không đụng.
async function setPlan(gate, req, res) {
  const { admin } = gate;
  const userId = String(req.body?.userId || '');
  const planCode = String(req.body?.planCode || '');
  if (!userId) return res.status(400).json({ error: 'Thiếu userId' });
  if (!planCode) return res.status(400).json({ error: 'Thiếu mã gói' });

  const { data: plan, error: pErr } = await admin
    .from('plans')
    .select('code, tier, name, duration_days, credits_per_cycle')
    .eq('code', planCode)
    .maybeSingle();
  if (pErr) return res.status(500).json({ error: pErr.message });
  if (!plan) return res.status(400).json({ error: 'Gói không tồn tại' });

  const durationDays = Number(plan.duration_days) || 0;
  const isFree = plan.tier === 'free' || plan.code === 'free' || durationDays <= 0;
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const patch = {
    plan_type: isFree ? 'free' : plan.tier,
    plan_tier: isFree ? 'free' : plan.tier,
    plan_code: plan.code,
    plan_expires_at: isFree ? null : new Date(nowMs + durationDays * 86400000).toISOString(),
    plan_credits: isFree ? 0 : Number(plan.credits_per_cycle) || 0,
    credits_reset_at: nowIso,
    updated_at: nowIso,
  };

  const { error } = await admin.from('profiles').update(patch).eq('user_id', userId);
  if (error) return res.status(500).json({ error: error.message });

  return res.json({
    ok: true,
    plan_tier: patch.plan_tier,
    plan_code: patch.plan_code,
    plan_credits: patch.plan_credits,
    plan_expires_at: patch.plan_expires_at,
  });
}

// ── save-golden: LƯU "hình chuẩn" (hình đúng do admin duyệt) cho một đề ───────
// Đóng vòng lặp học: bài máy vẽ SAI → admin dựng lại hình đúng → lưu golden →
// lần sau gặp lại đúng đề đó, route phục vụ THẲNG hình này (bỏ qua engine/LLM).
// Upsert theo prompt_norm ⇒ duyệt lại cùng đề = GHI ĐÈ.
const GOLDEN_PROMPT_MAX = 5000;
const GOLDEN_NOTE_MAX = 1000;
const GOLDEN_RESPONSE_MAX = 500000; // chặn JSON quá khổ (ký tự)

async function saveGolden(gate, req, res) {
  const { admin, userId } = gate;
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  const geometry = req.body?.geometry;
  const advanceScene = req.body?.advanceScene || null; // có ⇒ lưu golden dạng Nâng cao (giữ bước + đáp số)
  const mode = req.body?.mode ? String(req.body.mode).slice(0, 32) : null;
  const calculationLog = typeof req.body?.calculationLog === 'string' ? req.body.calculationLog.slice(0, 2000) : null;
  const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, GOLDEN_NOTE_MAX) : null;
  const sourceReportId = req.body?.sourceReportId ? String(req.body.sourceReportId) : null;

  if (!prompt) return res.status(400).json({ error: 'Thiếu đề bài' });
  const points = geometry?.points;
  if (!Array.isArray(points) || points.length === 0) {
    return res.status(400).json({ error: 'Hình không hợp lệ (cần ít nhất 1 điểm)' });
  }
  const promptNorm = normalizePrompt(prompt);
  if (!promptNorm) return res.status(400).json({ error: 'Đề bài rỗng sau chuẩn hoá' });

  const response = buildGoldenResponse({ prompt, geometry, advanceScene, mode, calculationLog });
  // Chặn payload khổng lồ (tránh phình DB / vượt giới hạn jsonb hợp lý).
  let responseSize = 0;
  try { responseSize = JSON.stringify(response).length; } catch { responseSize = Infinity; }
  if (!Number.isFinite(responseSize) || responseSize > GOLDEN_RESPONSE_MAX) {
    return res.status(400).json({ error: 'Hình quá lớn để lưu làm hình chuẩn' });
  }

  const row = {
    prompt_norm: promptNorm,
    prompt: prompt.slice(0, GOLDEN_PROMPT_MAX),
    mode,
    response,
    source: 'admin',
    note,
    source_report_id: sourceReportId,
    created_by: userId || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from('golden_figures')
    .upsert(row, { onConflict: 'prompt_norm' })
    .select('id')
    .single();
  if (error) return res.status(500).json({ error: error.message });

  // Nếu duyệt từ một bài lỗi cụ thể → đánh dấu bài đó "đã sửa".
  if (sourceReportId) {
    const { error: upErr } = await admin
      .from('problem_reports')
      .update({ status: 'đã sửa', updated_at: new Date().toISOString() })
      .eq('id', sourceReportId);
    if (upErr) console.warn('[admin] không cập nhật được trạng thái bài lỗi:', upErr.message);
  }

  return res.json({ ok: true, id: data?.id ?? null });
}

// ── list-golden: liệt kê hình chuẩn (KHÔNG kèm response để nhẹ) ───────────────
async function listGolden(admin, req, res) {
  const page = clampPage(req.body?.page);
  const perPage = clampPerPage(req.body?.perPage);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error } = await admin
    .from('golden_figures')
    .select('id, prompt, prompt_norm, mode, source, note, source_report_id, created_at, updated_at')
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) return res.status(500).json({ error: error.message });

  return res.json({ golden: data || [], page, hasMore: (data || []).length === perPage });
}

// ── delete-golden: xoá một hình chuẩn theo id ────────────────────────────────
async function deleteGolden(admin, req, res) {
  const id = String(req.body?.id || '');
  if (!id) return res.status(400).json({ error: 'Thiếu id' });
  const { error } = await admin.from('golden_figures').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
}

// ── list-withdrawals: yêu cầu rút hoa hồng + STK + danh tính người mời ────────
async function listWithdrawals(admin, req, res) {
  const page = clampPage(req.body?.page);
  const perPage = clampPerPage(req.body?.perPage);
  const from = (page - 1) * perPage;

  const { data: rows, error } = await admin
    .from('withdrawals')
    .select('id, user_id, amount, status, transfer_ref, admin_note, requested_at, processed_at, payout_account_id')
    .order('requested_at', { ascending: false })
    .range(from, from + perPage);
  if (error) return res.status(500).json({ error: error.message });

  const all = rows || [];
  const hasMore = all.length > perPage;
  const pageRows = all.slice(0, perPage);

  // STK nhận tiền.
  const acctIds = [...new Set(pageRows.map((r) => r.payout_account_id).filter(Boolean))];
  const acctMap = {};
  if (acctIds.length) {
    const { data: accts } = await admin
      .from('payout_accounts')
      .select('id, bank_code, account_number, account_name')
      .in('id', acctIds);
    for (const a of accts || []) acctMap[a.id] = a;
  }

  // Tên + email người mời.
  const userIds = [...new Set(pageRows.map((r) => r.user_id))];
  const nameMap = {};
  if (userIds.length) {
    const { data: profs } = await admin.from('profiles').select('user_id, display_name').in('user_id', userIds);
    for (const p of profs || []) nameMap[p.user_id] = p.display_name;
  }
  const emailMap = {};
  await Promise.all(userIds.map(async (uid) => {
    try {
      const { data } = await admin.auth.admin.getUserById(uid);
      if (data?.user?.email) emailMap[uid] = data.user.email;
    } catch { /* bỏ qua nếu không lấy được email */ }
  }));

  const withdrawals = pageRows.map((r) => {
    const a = acctMap[r.payout_account_id] || {};
    return {
      id: r.id,
      amount: r.amount,
      status: r.status,
      transfer_ref: r.transfer_ref,
      admin_note: r.admin_note,
      requested_at: r.requested_at,
      processed_at: r.processed_at,
      bank_code: a.bank_code ?? null,
      account_number: a.account_number ?? null,
      account_name: a.account_name ?? null,
      referrer_name: nameMap[r.user_id] ?? null,
      referrer_email: emailMap[r.user_id] ?? null,
    };
  });

  return res.json({ withdrawals, page, hasMore });
}

// ── resolve-withdrawal: đánh dấu đã chi / từ chối (hoàn tiền) qua RPC ─────────
async function resolveWithdrawal(admin, req, res) {
  const id = String(req.body?.withdrawalId || '');
  const actionType = req.body?.actionType;
  if (!id || !['paid', 'rejected'].includes(actionType)) {
    return res.status(400).json({ error: 'Tham số không hợp lệ' });
  }
  const { data, error } = await admin.rpc('resolve_withdrawal', {
    p_withdrawal_id: id,
    p_action: actionType,
    p_transfer_ref: req.body?.transferRef || null,
    p_admin_note: req.body?.adminNote || null,
  });
  if (error) return res.status(500).json({ error: error.message });
  if (!data?.ok) return res.status(400).json({ error: data?.err || 'Không xử lý được yêu cầu' });
  return res.json(data);
}

export default withSentry(handler, 'admin');
