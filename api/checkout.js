import { PayOS } from '@payos/node';
import { createClient } from '@supabase/supabase-js';
import { withSentry, reportServerError } from './_lib/sentry.js';
import { validateReferral, REFERRAL_DISCOUNT_RATE } from './_lib/referralCore.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

function configuredAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL || 'http://localhost:8080';
}

function sameOriginUrl(candidate, fallback) {
  if (!candidate) return fallback;
  try {
    const expected = new URL(configuredAppUrl());
    const parsed = new URL(candidate, expected);
    return parsed.origin === expected.origin ? parsed.toString() : fallback;
  } catch {
    return fallback;
  }
}

async function handler(req, res) {
  const appOrigin = new URL(configuredAppUrl()).origin;
  if (req.headers.origin === appOrigin) {
    res.setHeader('Access-Control-Allow-Origin', appOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  let orderCode = null;
  try {
    const { returnUrl, cancelUrl, planCode, creditPack, referralCode } = req.body || {};
    const isCreditPack = creditPack != null && planCode == null;

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase service role chưa được cấu hình' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Bạn cần đăng nhập để thanh toán' });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !user) {
      return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ' });
    }

    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
    if (!clientId || !apiKey || !checksumKey) {
      return res.status(500).json({ error: 'PayOS chưa được cấu hình trên server' });
    }

    let finalAmount;
    let orderPlanCode;
    let creditAmount = null;
    let description;
    // Mã mời (chỉ áp cho gói, không áp cho nạp credit lẻ). Mặc định không có.
    let refCode = null;
    let refReferrerId = null;
    let refDiscount = 0;

    if (isCreditPack) {
      const amount = Number(creditPack);
      if (!Number.isInteger(amount) || amount < 10 || amount > 10000) {
        return res.status(400).json({ error: 'Số credit không hợp lệ (10–10000)' });
      }
      const { data: pricing, error: pricingError } = await supabase
        .from('pricing_config')
        .select('value')
        .eq('key', 'credit_price_vnd')
        .maybeSingle();
      if (pricingError || !pricing || Number(pricing.value) <= 0) {
        return res.status(503).json({ error: 'Không đọc được đơn giá credit' });
      }
      finalAmount = amount * Number(pricing.value);
      orderPlanCode = null;
      creditAmount = amount;
      description = `Geo3D +${amount}cr`.slice(0, 25);
    } else {
      const code = typeof planCode === 'string' && planCode ? planCode : 'pro_1m';
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('code, price_vnd, active')
        .eq('code', code)
        .maybeSingle();
      if (planError || !plan || plan.active === false) {
        return res.status(400).json({ error: `Gói không hợp lệ: ${code}` });
      }
      finalAmount = Number(plan.price_vnd);
      orderPlanCode = plan.code;
      description = `Geo3D ${plan.code}`.slice(0, 25);

      // Áp mã mời: kiểm tra ở server (nguồn sự thật) rồi giảm 10%. Mã sai/không đủ
      // điều kiện → bỏ qua, tính giá đầy đủ (client đã tự kiểm trước khi bấm).
      if (typeof referralCode === 'string' && referralCode.trim()) {
        const rv = await validateReferral(supabase, referralCode, user.id);
        if (rv.ok && rv.referrerId !== user.id) {
          refDiscount = Math.round(finalAmount * REFERRAL_DISCOUNT_RATE);
          finalAmount = finalAmount - refDiscount;
          refCode = rv.code;
          refReferrerId = rv.referrerId;
        }
      }
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true });
    if (profileError) {
      console.error('[checkout] prepare profile:', profileError);
      return res.status(500).json({ error: 'Không chuẩn bị được tài khoản thanh toán' });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        amount: finalAmount,
        plan_code: orderPlanCode,
        credit_amount: creditAmount,
        status: 'pending',
        referral_code: refCode,
        referrer_id: refReferrerId,
        discount_amount: refDiscount,
      })
      .select('order_code')
      .single();
    if (orderError || !order) {
      console.error('[checkout] create order:', orderError);
      return res.status(500).json({ error: 'Không tạo được đơn hàng' });
    }
    orderCode = Number(order.order_code);

    const baseUrl = configuredAppUrl();
    const successFallback = `${baseUrl.replace(/\/$/, '')}/?payment=success`;
    const cancelFallback = baseUrl;
    const payos = new PayOS({ clientId, apiKey, checksumKey });
    const paymentRequest = {
      orderCode,
      amount: finalAmount,
      description,
      returnUrl: sameOriginUrl(returnUrl, successFallback),
      cancelUrl: sameOriginUrl(cancelUrl, cancelFallback),
    };
    let payment;
    try {
      payment = await payos.paymentRequests.create(paymentRequest);
    } catch (createError) {
      // The upstream request may have succeeded even if its response was lost.
      // Recover the existing link by the stable order code instead of creating
      // another order or charging a different amount.
      try {
        payment = await payos.paymentRequests.get(orderCode);
      } catch {
        throw createError;
      }
    }
    if (!payment?.checkoutUrl) {
      throw new Error('PayOS không trả về checkout URL');
    }

    return res.status(200).json({ checkoutUrl: payment.checkoutUrl, orderCode });
  } catch (error) {
    await reportServerError(error, { route: 'checkout' });
    if (orderCode && supabase) {
      await supabase
        .from('orders')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('order_code', orderCode);
    }
    console.error('[checkout]', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal Server Error',
    });
  }
}

export default withSentry(handler, 'checkout');
