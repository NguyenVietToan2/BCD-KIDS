import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma";

const schema = z.object({
  customerName: z.string().trim().min(2).max(120), phone: z.string().trim().min(9).max(20),
  email: z.string().trim().email(), address: z.string().trim().min(8).max(500), note: z.string().max(1000).optional(),
  paymentMethod: z.enum(["COD", "VNPAY"]),
  items: z.array(z.object({ productId: z.string().min(1), variantName: z.string().min(1).max(80), quantity: z.number().int().positive() })).min(1).max(100),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Vui lòng đăng nhập tài khoản khách sỉ trước khi đặt hàng." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Thông tin đặt hàng chưa hợp lệ.", details: parsed.error.flatten() }, { status: 400 });

  try {
    const order = await prisma.$transaction(async (tx) => {
      const ids = [...new Set(parsed.data.items.map((i) => i.productId))];
      const products = await tx.product.findMany({ where: { id: { in: ids }, active: true } });
      const productMap = new Map(products.map((p) => [p.id, p]));
      const lines = parsed.data.items.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) throw new Error("Một sản phẩm không còn khả dụng.");
        if (item.quantity < product.minQty) throw new Error(`${product.name}: số lượng tối thiểu là ${product.minQty}.`);
        if (item.quantity > product.stock) throw new Error(`${product.name}: không đủ tồn kho.`);
        const variants = Array.isArray(product.variants) ? product.variants as { name?: string }[] : [];
        if (!variants.some((v) => v.name === item.variantName)) throw new Error(`Mẫu ${item.variantName} không hợp lệ.`);
        return { product, variantName: item.variantName, quantity: item.quantity, lineTotal: product.price * item.quantity };
      });
      // Reject repeated product/color rows that could otherwise oversell stock.
      const grouped = new Map<string, number>();
      for (const line of lines) grouped.set(line.product.id, (grouped.get(line.product.id) ?? 0) + line.quantity);
      for (const [id, qty] of grouped) if (qty > productMap.get(id)!.stock) throw new Error("Số lượng đặt vượt tồn kho.");
      const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
      const orderNumber = `SS${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;
      const created = await tx.order.create({ data: {
        orderNumber, userId: session.user.id, customerName: parsed.data.customerName, phone: parsed.data.phone,
        email: parsed.data.email, address: parsed.data.address, note: parsed.data.note ?? "", subtotal, shippingFee: 0, total: subtotal,
        paymentMethod: parsed.data.paymentMethod, paymentStatus: parsed.data.paymentMethod === "VNPAY" ? "PENDING" : "UNPAID",
        items: { create: lines.map((line) => ({ productId: line.product.id, productName: line.product.name, sku: line.product.sku, variantName: line.variantName, unitPrice: line.product.price, quantity: line.quantity, lineTotal: line.lineTotal })) },
      }, include: { items: true } });
      for (const [id, qty] of grouped) await tx.product.update({ where: { id }, data: { stock: { decrement: qty } } });
      return created;
    });
    return NextResponse.json({ order: { id: order.id, orderNumber: order.orderNumber, total: order.total, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tạo đơn hàng.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
