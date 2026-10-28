import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { auth } from "../../../../auth";
import { prisma } from "../../../../lib/prisma";

function sign(data: string, secret: string) { return createHmac("sha512", secret).update(data, "utf-8").digest("hex"); }
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  const { orderId } = await request.json().catch(() => ({}));
  const order = await prisma.order.findFirst({ where: { id: String(orderId ?? ""), userId: session.user.id, paymentMethod: "VNPAY", paymentStatus: "PENDING" } });
  if (!order) return NextResponse.json({ error: "Không tìm thấy đơn VNPAY đang chờ thanh toán." }, { status: 404 });
  const { VNPAY_TMN_CODE, VNPAY_HASH_SECRET, VNPAY_URL, NEXT_PUBLIC_APP_URL } = process.env;
  if (!VNPAY_TMN_CODE || !VNPAY_HASH_SECRET || !VNPAY_URL || !NEXT_PUBLIC_APP_URL) return NextResponse.json({ error: "Chưa cấu hình thông tin người bán VNPay trong .env." }, { status: 503 });
  const params: Record<string, string> = {
    vnp_Version: "2.1.0", vnp_Command: "pay", vnp_TmnCode: VNPAY_TMN_CODE,
    vnp_Amount: String(order.total * 100), vnp_CurrCode: "VND", vnp_TxnRef: order.orderNumber,
    vnp_OrderInfo: `Thanh toan don hang ${order.orderNumber}`, vnp_OrderType: "other", vnp_Locale: "vn",
    vnp_ReturnUrl: `${NEXT_PUBLIC_APP_URL}/payment-result`, vnp_IpAddr: request.headers.get("x-forwarded-for")?.split(",")[0] ?? "127.0.0.1",
    vnp_CreateDate: new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14),
  };
  const sorted = Object.fromEntries(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)));
  const query = new URLSearchParams(sorted).toString();
  const secureHash = sign(query, VNPAY_HASH_SECRET);
  return NextResponse.json({ paymentUrl: `${VNPAY_URL}?${query}&vnp_SecureHash=${secureHash}` });
}
