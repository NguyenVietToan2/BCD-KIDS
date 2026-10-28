import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { prisma } from "../../../../lib/prisma";
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  return NextResponse.json(await prisma.order.findMany({ include: { user: { select: { name: true, email: true } }, items: true }, orderBy: { createdAt: "desc" }, take: 200 }));
}
export async function PATCH(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const statuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"];
  if (!body?.id || !statuses.includes(body.status)) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  const existing = await prisma.order.findUnique({ where: { id: String(body.id) } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy đơn hàng." }, { status: 404 });
  if (body.status === "CANCELLED" && existing.paymentStatus === "PAID") return NextResponse.json({ error: "Đơn đã thanh toán. Hãy xử lý hoàn tiền trước khi hủy." }, { status: 409 });
  return NextResponse.json(await prisma.order.update({ where: { id: existing.id }, data: { status: body.status } }));
}
