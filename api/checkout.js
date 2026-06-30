import PayOS from '@payos/node';

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
    const { amount, description, returnUrl, cancelUrl } = req.body;

    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    if (!clientId || !apiKey || !checksumKey) {
      return res.status(500).json({ error: 'PayOS credentials are not configured on server' });
    }

    const payos = new PayOS(clientId, apiKey, checksumKey);

    const orderCode = Number(String(Date.now()).slice(-6)); // Tạo mã đơn hàng duy nhất 6 số
    
    const requestData = {
      orderCode: orderCode,
      amount: amount || 20000,
      description: description || 'Nang cap Geo3D Pro',
      returnUrl: returnUrl || 'https://geo3d.io.vn/success',
      cancelUrl: cancelUrl || 'https://geo3d.io.vn/cancel'
    };

    const paymentLinkRes = await payos.createPaymentLink(requestData);

    return res.status(200).json({
      checkoutUrl: paymentLinkRes.checkoutUrl,
      orderCode: orderCode
    });
  } catch (error) {
    console.error('Lỗi khi tạo payment link:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
