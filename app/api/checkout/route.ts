import { NextResponse } from "next/server";
import PayOS from "@payos/node";

const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID || "",
  process.env.PAYOS_API_KEY || "",
  process.env.PAYOS_CHECKSUM_KEY || ""
);

export async function POST(request: Request) {
  try {
    const { price, userId } = await request.json();

    // 1. Tạo một mã đơn hàng ngẫu nhiên (PayOS yêu cầu kiểu số nguyên)
    const orderCode = Number(String(Date.now()).slice(-6));

    // 2. Cấu hình thông tin thanh toán gói
    const paymentData = {
      orderCode: orderCode,
      amount: price, // Ví dụ: 50000 hoặc 100000 VND
      description: `Premium GeometryPro`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?status=success`,
      // Bạn có thể truyền thêm userId vào metadata để tí nữa webhook xử lý cho đúng người
      metadata: {
        userId: userId,
      },
    };

    // 3. Gọi API PayOS để lấy link thanh toán và mã QR
    const paymentLinkRes = await payos.createPaymentLink(paymentData);

    // 4. Trả link về cho Frontend hiển thị QR
    return NextResponse.json({ url: paymentLinkRes.checkoutUrl });
  } catch (error) {
    console.error("PayOS Checkout Error:", error);
    return NextResponse.json({ error: "Không thể tạo mã QR thanh toán" }, { status: 500 });
  }
}
