import { PayOS } from '@payos/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Must use service role to bypass RLS for inserts
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
  // Bật CORS nếu được gọi từ frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // planCode xác định gói + giá. KHÔNG nhận giá từ client. Mặc định 'pro_1m'
    // để giữ tương thích với nút "Nâng cấp" cũ (chưa gửi planCode).
    const { returnUrl, cancelUrl, planCode, creditPack } = req.body || {};
    const isCreditPack = creditPack != null && planCode == null;

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase credentials are not configured correctly' });
    }

    // Identify the buyer from their JWT. Never from the request body: trusting a
    // client-supplied userId lets anyone create orders against another account.
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Bạn cần đăng nhập để mua gói Pro' });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Phiên đăng nhập không hợp lệ' });
    }
    const userId = user.id;

    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    if (!clientId || !apiKey || !checksumKey) {
      return res.status(500).json({ error: 'PayOS credentials are not configured on server' });
    }

    const payos = new PayOS({ clientId, apiKey, checksumKey });

    // GIÁ tính ở server (nguồn sự thật). Giá client gửi lên luôn bị bỏ qua.
    let finalAmount, orderPlanCode, description;
    if (isCreditPack) {
      // Nạp credit lẻ: số credit × đơn giá trong DB. plan_code = null để webhook
      // biết đây là đơn NẠP CREDIT (không phải mua gói).
      const n = parseInt(creditPack, 10);
      if (!Number.isInteger(n) || n < 10 || n > 10000) {
        return res.status(400).json({ error: 'Số credit không hợp lệ (10–10000)' });
      }
      const { data: pc } = await supabase
        .from('pricing_config').select('value').eq('key', 'credit_price_vnd').maybeSingle();
      const creditPrice = pc?.value || 500;
      finalAmount = n * creditPrice;
      orderPlanCode = null;
      description = `Geo3D +${n}cr`.slice(0, 25);
    } else {
      const code = planCode || 'pro_1m';
      const { data: plan, error: planError } = await supabase
        .from('plans').select('code, name, price_vnd, active').eq('code', code).maybeSingle();
      if (planError || !plan || plan.active === false) {
        return res.status(400).json({ error: `Gói không hợp lệ: ${code}` });
      }
      finalAmount = plan.price_vnd;
      orderPlanCode = code;
      description = `Geo3D ${code}`.slice(0, 25);
    }

    // Tạo mã đơn hàng duy nhất (số nguyên < 2147483647)
    const orderCode = Math.floor(Math.random() * 900000) + 100000;

    // orders.user_id FKs to profiles(user_id), so a missing profile makes the
    // insert below fail. Signup normally creates it via the on_auth_user_created
    // trigger; ensure it here too so checkout can never dead-end.
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });

    if (profileError) {
      console.error('Lỗi khi đảm bảo profile tồn tại:', profileError);
      return res.status(500).json({ error: 'Failed to prepare account for checkout' });
    }

    // 1. Lưu order vào database ở trạng thái pending
    const { error: dbError } = await supabase.from('orders').insert({
      order_code: orderCode,
      user_id: userId,
      amount: finalAmount,
      plan_code: orderPlanCode,
      status: 'pending'
    });

    if (dbError) {
      console.error('Lỗi khi lưu order vào Supabase:', dbError);
      return res.status(500).json({ error: 'Failed to create order in database' });
    }

    // 2. Tạo payment link với PayOS
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL || 'http://localhost:8080';
    
    const requestData = {
      orderCode: orderCode,
      amount: finalAmount,
      description,
      returnUrl: returnUrl || `${baseUrl}/?payment=success`,
      cancelUrl: cancelUrl || baseUrl
    };

    const paymentLinkRes = await payos.paymentRequests.create(requestData);

    return res.status(200).json({
      checkoutUrl: paymentLinkRes.checkoutUrl,
      orderCode: orderCode
    });
  } catch (error) {
    console.error('Lỗi khi tạo payment link:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
