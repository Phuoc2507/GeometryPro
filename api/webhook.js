import { PayOS } from '@payos/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    if (!clientId || !apiKey || !checksumKey) {
      return res.status(500).json({ error: 'PayOS credentials missing' });
    }
    
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase service role key missing' });
    }

    const payos = new PayOS({ clientId, apiKey, checksumKey });

    // Xác thực webhook từ PayOS (kiểm tra chữ ký)
    const webhookData = await payos.webhooks.verify(req.body);
    console.log('Nhận được webhook từ PayOS:', webhookData.orderCode);

    if (webhookData.code === '00' || webhookData.success === true) {
      const orderCode = webhookData.orderCode;
      
      // 1. Tìm user_id dựa vào order_code
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('user_id, status, plan_code, amount')
        .eq('order_code', orderCode)
        .maybeSingle();
        
      if (fetchError || !order) {
        console.error(`Không tìm thấy đơn hàng ${orderCode} trong DB.`);
      } else if (order.status !== 'paid') {
        // 2. Cập nhật trạng thái đơn hàng
        await supabase
          .from('orders')
          .update({ status: 'paid', updated_at: new Date().toISOString() })
          .eq('order_code', orderCode);

        // 3. Đơn NẠP CREDIT LẺ (plan_code null) hay MUA GÓI (plan_code có giá trị).
        if (!order.plan_code) {
          const { data: pc } = await supabase
            .from('pricing_config').select('value').eq('key', 'credit_price_vnd').maybeSingle();
          const creditPrice = pc?.value || 500;
          const n = Math.round((order.amount || 0) / creditPrice);
          if (n > 0) {
            const { error: grantErr } = await supabase.rpc('grant_credits', {
              p_user_id: order.user_id, p_amount: n, p_reason: 'purchase',
              p_ref: String(orderCode), p_to_purchased: true,
            });
            if (grantErr) console.error(`Lỗi nạp credit đơn ${orderCode}:`, grantErr.message);
            else console.log(`Đơn ${orderCode} OK — user ${order.user_id} nạp +${n} credit lẻ.`);
          }
        } else {
        const { data: plan } = await supabase
          .from('plans')
          .select('code, tier, duration_days, credits_per_cycle')
          .eq('code', order.plan_code || 'pro_1m')
          .maybeSingle();

        if (!plan) {
          console.error(`Không tìm thấy gói ${order.plan_code} cho đơn ${orderCode}.`);
        } else {
          // Cộng dồn hạn từ hạn hiện tại nếu còn hiệu lực (gia hạn sớm không mất ngày).
          const { data: current } = await supabase
            .from('profiles')
            .select('plan_expires_at')
            .eq('user_id', order.user_id)
            .maybeSingle();

          const now = Date.now();
          const currentExpiry = current?.plan_expires_at ? new Date(current.plan_expires_at).getTime() : 0;
          const base = Math.max(now, currentExpiry);
          const expiryDate = new Date(base + plan.duration_days * 24 * 60 * 60 * 1000).toISOString();

          // upsert (không phải update): nếu profile chưa tồn tại thì update() sửa 0 dòng
          // và IM LẶNG thành công -> user trả tiền mà không được lên gói.
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              user_id: order.user_id,
              plan_type: plan.tier,              // giữ cột cũ cho tương thích
              plan_tier: plan.tier,
              plan_code: plan.code,
              plan_expires_at: expiryDate,
              plan_credits: plan.credits_per_cycle,       // cấp mới cả kỳ (không cộng dồn)
              credits_reset_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

          if (profileError) {
            console.error(`Lỗi cập nhật Profile cho user ${order.user_id}:`, profileError);
          } else {
            // Ghi sổ cái (unique index theo ref=order_code chống cấp 2 lần).
            await supabase.from('credit_ledger').insert({
              user_id: order.user_id,
              delta: plan.credits_per_cycle,
              reason: 'plan_grant',
              ref: String(orderCode),
              balance_after: plan.credits_per_cycle
            });
            console.log(`Đơn ${orderCode} OK — user ${order.user_id} lên ${plan.tier} tới ${expiryDate}, +${plan.credits_per_cycle} credit.`);
          }
        }
        }
      } else {
        console.log(`Đơn hàng ${orderCode} đã được xử lý trước đó.`);
      }
    }

    // Luôn trả về 200 để PayOS biết webhook đã được nhận
    return res.status(200).json({
      success: true,
      message: 'Webhook received successfully',
    });
  } catch (error) {
    console.error('Lỗi khi xử lý webhook (có thể là webhook test từ PayOS):', error.message);
    // Vẫn trả về 200 để PayOS xác nhận Webhook URL thành công trên Dashboard
    return res.status(200).json({ success: true, message: 'Received with error: ' + error.message });
  }
}
