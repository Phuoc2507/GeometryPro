import { PayOS } from '@payos/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Must use service role to bypass RLS for inserts
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
  // Bật CORS nếu được gọi từ frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId, amount, description, returnUrl, cancelUrl } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId in request' });
    }

    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    if (!clientId || !apiKey || !checksumKey) {
      return res.status(500).json({ error: 'PayOS credentials are not configured on server' });
    }
    
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase credentials are not configured correctly' });
    }

    const payos = new PayOS({ clientId, apiKey, checksumKey });

    // Tạo mã đơn hàng duy nhất (số nguyên < 2147483647)
    const orderCode = Math.floor(Math.random() * 900000) + 100000;
    const finalAmount = amount || 49000; // Giá mặc định 49k/tháng

    // 1. Lưu order vào database ở trạng thái pending
    const { error: dbError } = await supabase.from('orders').insert({
      order_code: orderCode,
      user_id: userId,
      amount: finalAmount,
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
      description: description || 'Geo3D Pro - 1 Tháng',
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
