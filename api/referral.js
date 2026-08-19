import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { withSentry, reportServerError } from './_lib/sentry.js';
import { validateReferral, referralReasonText } from './_lib/referralCore.js';

// Phase 1 — Mã mời: trả về mã mời của user (sinh nếu chưa có) + vài số liệu cho
// trang "Giới thiệu bạn". CHƯA đụng tới tiền hoa hồng thật (đó là Phase 3).

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

    return res.status(200).json({
      code: profile?.referral_code || null,
      referredCount: referredCount || 0,
      commissionAvailable: profile?.commission_available || 0,
      commissionPending: profile?.commission_pending || 0,
    });
  } catch (error) {
    await reportServerError(error, { route: 'referral' });
    console.error('[referral]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export default withSentry(handler, 'referral');
