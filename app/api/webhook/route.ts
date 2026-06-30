import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PayOS = require("@payos/node");

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// @ts-ignore
const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID || "",
  process.env.PAYOS_API_KEY || "",
  process.env.PAYOS_CHECKSUM_KEY || ""
);

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Xác thực chữ ký Webhook từ PayOS (đảm bảo tính bảo mật)
    let webhookData;
    try {
      webhookData = payos.verifyPaymentWebhookData(payload);
    } catch (e) {
      console.error('Invalid Webhook Signature:', e);
      return NextResponse.json({ success: false, message: "Chữ ký không hợp lệ" }, { status: 400 });
    }
    
    // Với PayOS, mã lỗi "00" biểu thị giao dịch thành công
    if (webhookData.code !== "00") {
      return NextResponse.json({ success: true, message: "Webhook đã nhận nhưng giao dịch chưa thành công" });
    }

    const orderCode = String(webhookData.orderCode);

    // 1. Tìm Transaction trong Database dựa trên orderCode
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('id, user_id, status')
      .eq('order_code', orderCode)
      .single();

    if (txError || !transaction) {
      console.error('Không tìm thấy giao dịch:', txError);
      return NextResponse.json({ success: false, message: "Không tìm thấy giao dịch hợp lệ" }, { status: 404 });
    }

    if (transaction.status === 'completed') {
      return NextResponse.json({ success: true, message: "Giao dịch này đã được xử lý từ trước" });
    }

    // 2. Cập nhật trạng thái người dùng thành Premium (is_premium = true)
    const { error: userError } = await supabaseAdmin
      .from('users')
      .update({ is_premium: true })
      .eq('id', transaction.user_id);

    if (userError) {
      console.error('Lỗi khi cập nhật User:', userError);
      return NextResponse.json({ success: false, message: "Không thể cập nhật trạng thái User" }, { status: 500 });
    }

    // 3. Cập nhật trạng thái giao dịch thành hoàn tất
    const { error: updateTxError } = await supabaseAdmin
      .from('transactions')
      .update({ status: 'completed' })
      .eq('id', transaction.id);

    if (updateTxError) {
      console.error('Lỗi khi cập nhật Transaction:', updateTxError);
    }

    console.log(`[Webhook] Nâng cấp Premium thành công cho User: ${transaction.user_id}`);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ success: false, message: "Lỗi hệ thống" }, { status: 500 });
  }
}
