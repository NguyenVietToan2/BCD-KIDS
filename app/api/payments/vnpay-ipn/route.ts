import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "../../../../lib/prisma";

function sign(data: string, secret: string) { return createHmac("sha512", secret).update(data, "utf-8").digest("hex"); }
export async function GET(request: Request) {
  const secret = process.env.VNPAY_HASH_SECRET;
  if (!secret) return NextResponse.json({ RspCode: "99", Message: "Configuration error" });
  const url = new URL(request.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => { if (key.startsWith("vnp_") && key !== "vnp_SecureHash" && key !== "vnp_SecureHashType") params[key] = value; });
  const received = url.searchParams.get("vnp_SecureHash") ?? "";
  const sortedQuery = new URLSearchParams(Object.fromEntries(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)))).toString();
  const expected = sign(sortedQuery, secret);
  const valid = received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  if (!valid) return NextResponse.json({ RspCode: "97", Message: "Invalid signature" });
  const order = await prisma.order.findUnique({ where: { orderNumber: params.vnp_TxnRef } });
  if (!order) return NextResponse.json({ RspCode: "01", Message: "Order not found" });
  if (Number(params.vnp_Amount) !== order.total * 100) return NextResponse.json({ RspCode: "04", Message: "Invalid amount" });
  if (order.paymentStatus === "PAID") return NextResponse.json({ RspCode: "00", Message: "Confirm Success" });
  if (params.vnp_ResponseCode === "00" && params.vnp_TransactionStatus === "00") {
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID", status: "CONFIRMED", paidAt: new Date(), paymentRef: params.vnp_TransactionNo ?? null } });
    return NextResponse.json({ RspCode: "00", Message: "Confirm Success" });
  }
  await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED", paymentRef: params.vnp_TransactionNo ?? null } });
  return NextResponse.json({ RspCode: "00", Message: "Recorded failed payment" });
}
