// Logic dùng chung cho chương trình Mã Mời (Phase 2).
// Dùng ở cả api/referral.js (kiểm tra mã trước khi mua) lẫn api/checkout.js (áp giảm 10%).

export const REFERRAL_DISCOUNT_RATE = 0.10; // giảm 10% cho người được mời

const REASONS = {
  no_code: 'Chưa nhập mã mời',
  not_found: 'Mã mời không tồn tại',
  self: 'Không dùng được mã của chính bạn',
  not_first: 'Ưu đãi chỉ áp dụng cho lần mua gói ĐẦU TIÊN',
  error: 'Không kiểm tra được mã, thử lại sau',
};

export function referralReasonText(reason) {
  return REASONS[reason] || 'Mã mời không hợp lệ';
}

// Chuẩn hoá mã: bỏ khoảng trắng, viết hoa (mã sinh ở api/referral.js vốn là A-Z2-9).
export function normalizeCode(raw) {
  return String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Kiểm tra một mã mời có dùng được cho người mua này không.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin  client service-role
 * @param {string} rawCode
 * @param {string} buyerUserId
 * @returns {Promise<{ok:boolean, reason?:string, code?:string, referrerId?:string, referrerName?:string|null}>}
 */
export async function validateReferral(admin, rawCode, buyerUserId) {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, reason: 'no_code' };

  const { data: ref, error } = await admin
    .from('profiles')
    .select('user_id, display_name')
    .eq('referral_code', code)
    .maybeSingle();
  if (error) return { ok: false, reason: 'error' };
  if (!ref) return { ok: false, reason: 'not_found' };
  if (ref.user_id === buyerUserId) return { ok: false, reason: 'self' };

  // "Đơn đầu tiên": người mua chưa từng có đơn đã thanh toán.
  const { count, error: cntErr } = await admin
    .from('orders')
    .select('order_code', { count: 'exact', head: true })
    .eq('user_id', buyerUserId)
    .eq('status', 'paid');
  if (cntErr) return { ok: false, reason: 'error' };
  if ((count || 0) > 0) return { ok: false, reason: 'not_first' };

  return { ok: true, code, referrerId: ref.user_id, referrerName: ref.display_name || null };
}
