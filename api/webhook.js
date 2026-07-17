import { PayOS } from '@payos/node';
import { createClient } from '@supabase/supabase-js';
import { PRO_DURATION_DAYS } from './_lib/pricing.js';

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
        .select('user_id, status')
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

        // 3. Nâng cấp tài khoản user lên Pro (thêm 30 ngày).
        //    Cộng dồn từ hạn hiện tại nếu còn hiệu lực, để gia hạn sớm không mất
        //    số ngày còn lại.
        const { data: current } = await supabase
          .from('profiles')
          .select('plan_expires_at')
          .eq('user_id', order.user_id)
          .maybeSingle();

        const now = Date.now();
        const currentExpiry = current?.plan_expires_at
          ? new Date(current.plan_expires_at).getTime()
          : 0;
        const base = Math.max(now, currentExpiry);
        const expiryDate = new Date(base + PRO_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

        // upsert, không phải update: nếu profile chưa tồn tại thì update() sẽ sửa
        // 0 dòng và IM LẶNG thành công -> user trả tiền mà không được lên Pro.
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: order.user_id,
            plan_type: 'pro',
            plan_expires_at: expiryDate,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        if (profileError) {
          console.error(`Lỗi cập nhật Profile cho user ${order.user_id}:`, profileError);
        } else {
          console.log(`Đơn hàng ${orderCode} thanh toán thành công! User ${order.user_id} lên Pro tới ${expiryDate}.`);
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
