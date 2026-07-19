// api/_lib/credits.js
// Cổng credit/quota phía server. Dùng SERVICE ROLE (bỏ qua RLS) + gọi các RPC
// atomic đã tạo trong supabase_credits_migration.sql.
//
// Luồng chuẩn ở mỗi route AI:
//   const gate = await checkAndConsume(userId, 'draw', 'draw_detailed');
//   if (!gate.ok) return res.status(402).json({ error: gate.message, code: gate.reason });
//   try { ...gọi AI... } catch (e) { await refund(userId, gate.cost, reqId); throw e; }
import { createClient } from '@supabase/supabase-js';
import { ruleFor, creditCostFor } from './entitlements.js';

// Re-export để các route tính chênh lệch phí (vd: fallback tụt-hạng Advance→Vẽ kỹ hoàn
// creditCostFor('draw_advance') - creditCostFor('draw_detailed')) mà chỉ cần import 1 module credit.
export { creditCostFor };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = url && key ? createClient(url, key) : null;

export function creditsConfigured() {
  return !!admin;
}

// Tier hiệu lực: hạ về 'free' khi gói hết hạn (mirror hàm effective_tier trong SQL).
function effectiveTier(profile) {
  if (!profile || profile.plan_code === 'free' || profile.plan_tier === 'free') return 'free';
  if (!profile.plan_expires_at) return 'free';
  if (new Date(profile.plan_expires_at).getTime() <= Date.now()) return 'free';
  return profile.plan_tier || 'free';
}

// Đọc ví + tier hiệu lực cho FE / kiểm tra.
export async function getAccount(userId) {
  if (!admin) return null;
  const { data } = await admin
    .from('profiles')
    .select('plan_tier, plan_code, plan_expires_at, plan_credits, purchased_credits')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return { tier: 'free', credits: 0, plan_credits: 0, purchased_credits: 0, plan_code: 'free' };
  const tier = effectiveTier(data);
  // numeric(12,2) về từ PostgREST là CHUỖI -> ép Number, không thì "203.80" + "0.2" = nối chuỗi.
  const planCr = Number(data.plan_credits ?? 0);
  const purchCr = Number(data.purchased_credits ?? 0);
  return {
    tier,
    plan_code: tier === 'free' ? 'free' : data.plan_code,
    plan_expires_at: data.plan_expires_at,
    plan_credits: planCr,
    purchased_credits: purchCr,
    credits: planCr + purchCr,
  };
}

// Kiểm tra + TIÊU cho 1 (feature, action). Trả:
//   { ok:true,  mode, cost, remaining? }
//   { ok:false, reason:'blocked'|'quota_exceeded'|'insufficient'|'not_configured', message, cost }
export async function checkAndConsume(userId, feature, action) {
  if (!admin) return { ok: false, reason: 'not_configured', message: 'Hệ thống credit chưa cấu hình', cost: 0 };

  const acct = await getAccount(userId);
  const rule = ruleFor(acct.tier, feature);

  if (rule.mode === 'blocked') {
    return { ok: false, reason: 'blocked', message: 'Gói hiện tại không dùng được tính năng này. Vui lòng nâng cấp.', cost: 0 };
  }
  if (rule.mode === 'unlimited') {
    return { ok: true, mode: 'unlimited', cost: 0 };
  }
  if (rule.mode === 'quota') {
    const { data, error } = await admin.rpc('consume_quota', {
      p_user_id: userId, p_feature: feature, p_max: rule.max, p_period_days: rule.periodDays,
    });
    if (error) return { ok: false, reason: 'error', message: error.message, cost: 0 };
    if (!data?.ok) return { ok: false, reason: 'quota_exceeded', message: `Đã hết lượt miễn phí (${rule.max}/${rule.periodDays} ngày). Nâng cấp để dùng tiếp.`, cost: 0, used: data?.used, max: data?.max };
    return { ok: true, mode: 'quota', cost: 0, used: data.used, max: data.max };
  }

  // mode === 'credit'
  const cost = creditCostFor(action);
  const { data, error } = await admin.rpc('spend_credits', {
    p_user_id: userId, p_cost: cost, p_reason: action, p_ref: null,
  });
  if (error) return { ok: false, reason: 'error', message: error.message, cost };
  if (!data?.ok) {
    if (data?.err === 'insufficient') return { ok: false, reason: 'insufficient', message: `Không đủ credit (cần ${cost}, còn ${data.remaining}). Vui lòng nạp thêm.`, cost, remaining: data.remaining };
    return { ok: false, reason: data?.err || 'error', message: 'Không trừ được credit', cost };
  }
  return { ok: true, mode: 'credit', cost, remaining: data.remaining };
}

// Hoàn credit đã trừ (gọi khi AI lỗi sau khi đã trừ). Chỉ có tác dụng với mode 'credit'.
export async function refund(userId, amount, ref) {
  if (!admin || !amount) return;
  try {
    await admin.rpc('refund_credits', { p_user_id: userId, p_amount: amount, p_ref: String(ref || Date.now()) });
  } catch (e) {
    console.error('refund_credits lỗi:', e?.message);
  }
}

// Cấp credit khi thanh toán thành công (gọi từ webhook). Idempotent theo ref.
export async function grant(userId, amount, reason, ref, toPurchased = true) {
  if (!admin) return { ok: false };
  const { data, error } = await admin.rpc('grant_credits', {
    p_user_id: userId, p_amount: amount, p_reason: reason, p_ref: String(ref), p_to_purchased: toPurchased,
  });
  if (error) { console.error('grant_credits lỗi:', error.message); return { ok: false }; }
  return data;
}
