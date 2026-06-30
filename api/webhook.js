import PayOS from '@payos/node';

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

    const payos = new PayOS(clientId, apiKey, checksumKey);

    // Xác thực webhook từ PayOS (kiểm tra chữ ký)
    const webhookData = payos.verifyPaymentWebhookData(req.body);

    console.log('Nhận được webhook từ PayOS:', webhookData);

    if (webhookData.code === '00' || webhookData.success === true) {
      // TODO: Cập nhật database Supabase của bạn tại đây
      // Ví dụ: Đánh dấu user đã mua gói thành công dựa vào webhookData.orderCode
      console.log(`Đơn hàng ${webhookData.orderCode} đã thanh toán thành công!`);
    }

    // Luôn trả về 200 để PayOS biết webhook đã được nhận
    return res.status(200).json({
      success: true,
      message: 'Webhook received successfully',
    });
  } catch (error) {
    console.error('Lỗi khi xử lý webhook:', error);
    // Vẫn trả về 200 hoặc có thể trả về lỗi tuỳ thuộc vào việc bạn muốn PayOS gửi lại không
    return res.status(400).json({ error: error.message || 'Invalid webhook data' });
  }
}
