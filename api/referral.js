import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { withSentry, reportServerError } from './_lib/sentry.js';
import { validateReferral, referralReasonText } from './_lib/referralCore.js';

// Phase 1 — Mã mời: trả về mã mời của user (sinh nếu chưa có) + vài số liệu cho
// trang "Giới thiệu bạn".
// Phase 6 — trước khi đọc số dư, "chín" các khoản đã hết thời gian treo. Làm LƯỜI ở
// đây (thay vì cron) vì người mời chỉ quan tâm số dư đúng vào lúc họ mở trang này.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

// Bảng chữ dễ đọc: bỏ 0/O/1/I để người dùng đọc/gõ tay không nhầm.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function genCode(len = 7) {
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return out;
}

async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase service role chưa được cấu hình' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Bạn cần đăng nhập' });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !user) {
      return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ' });
    }

    // Chế độ KIỂM TRA mã (?validate=CODE) — dùng cho ô nhập mã ở màn thanh toán.
    const validateCode = req.query?.validate;
    if (validateCode !== undefined) {
      const result = await validateReferral(supabase, validateCode, user.id);
      return res.status(200).json({
        valid: result.ok,
        reason: result.reason || null,
        message: result.ok ? null : referralReasonText(result.reason),
        referrerName: result.ok ? (result.referrerName || null) : null,
      });
    }

    // Đảm bảo có dòng profiles để gắn mã.
    await supabase
      .from('profiles')
      .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true });

    // Chín các khoản đã tới hạn TRƯỚC khi đọc số dư (Phase 6). Hỏng thì bỏ qua —
    // số dư hiển thị sẽ thiếu phần vừa tới hạn, nhưng trang vẫn mở được.
    const { error: matureErr } = await supabase.rpc('mature_commissions', { p_user_id: user.id });
    if (matureErr) console.warn('[referral] mature_commissions:', matureErr.message);

    // Đọc mã hiện có + số dư ví.
    let { data: profile } = await supabase
      .from('profiles')
      .select('referral_code, commission_available, commission_pending')
      .eq('user_id', user.id)
      .maybeSingle();

    // Chưa có mã → sinh mã duy nhất (thử lại nếu trùng, tối đa vài lần).
    if (!profile?.referral_code) {
      for (let attempt = 0; attempt < 6; attempt++) {
        const code = genCode();
        const { error: updErr } = await supabase
          .from('profiles')
          .update({ referral_code: code })
          .eq('user_id', user.id)
          .is('referral_code', null);
        // Trùng mã (unique index) → thử mã khác. Không lỗi → đã gán (hoặc race, đọc lại bên dưới).
        if (!updErr) break;
        if (updErr.code === '23505') continue;
        console.error('[referral] set code:', updErr);
        return res.status(500).json({ error: 'Không tạo được mã mời' });
      }
      const reread = await supabase
        .from('profiles')
        .select('referral_code, commission_available, commission_pending')
        .eq('user_id', user.id)
        .maybeSingle();
      profile = reread.data;
    }

    // Đếm số người đã rủ (mọi trạng thái).
    const { count: referredCount } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', user.id);

    // Tài khoản ngân hàng nhận tiền (nếu đã thêm).
    const { data: payoutAccount } = await supabase
      .from('payout_accounts')
      .select('bank_code, account_number, account_name')
      .eq('user_id', user.id)
      .maybeSingle();

    // Tham số rào chắn (Phase 6) — client cần để hiện đúng ngưỡng/thời gian treo
    // thay vì chôn con số trong giao diện rồi lệch khi admin chỉnh ở DB.
    const { data: cfgRows } = await supabase
      .from('pricing_config')
      .select('key, value')
      .in('key', ['referral_min_withdrawal', 'referral_hold_days']);
    const cfg = Object.fromEntries((cfgRows || []).map((r) => [r.key, Number(r.value)]));

    // Khoản treo sắp chín sớm nhất — để trả lời đúng câu "bao giờ rút được?".
    const { data: nextPending } = await supabase
      .from('referrals')
      .select('mature_at')
      .eq('referrer_id', user.id)
      .eq('status', 'pending')
      .not('mature_at', 'is', null)
      .order('mature_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    // Số lượt đang chờ admin duyệt (bị bộ lọc chống gian lận gắn cờ).
    const { count: flaggedCount } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', user.id)
      .eq('status', 'flagged');

    // Lịch sử rút tiền gần đây.
    const { data: withdrawals } = await supabase
      .from('withdrawals')
      .select('id, amount, status, requested_at, processed_at')
      .eq('user_id', user.id)
      .order('requested_at', { ascending: false })
      .limit(10);

    return res.status(200).json({
      code: profile?.referral_code || null,
      referredCount: referredCount || 0,
      commissionAvailable: profile?.commission_available || 0,
      commissionPending: profile?.commission_pending || 0,
      payoutAccount: payoutAccount || null,
      withdrawals: withdrawals || [],
      minWithdrawal: cfg.referral_min_withdrawal ?? 100000,
      holdDays: cfg.referral_hold_days ?? 7,
      nextMatureAt: nextPending?.mature_at || null,
      flaggedCount: flaggedCount || 0,
    });
  } catch (error) {
    await reportServerError(error, { route: 'referral' });
    console.error('[referral]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export default withSentry(handler, 'referral');
