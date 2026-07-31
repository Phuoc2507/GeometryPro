// api/admin.js
// Endpoint quản trị GỘP (một function → nhẹ giới hạn serverless của Vercel).
// MỌI hành động đều đi qua requireAdmin (verify JWT + role='admin') TRƯỚC.
// Đọc dữ liệu người dùng/đơn hàng và cấp/trừ credit bằng service-role — client
// KHÔNG bao giờ tự làm các việc này.
import crypto from 'crypto';
import { withSentry, reportServerError } from './_lib/sentry.js';
import { requireAdmin } from './_lib/adminAuth.js';
import { grant, getAccount } from './_lib/credits.js';

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

export default withSentry(handler, 'admin');
