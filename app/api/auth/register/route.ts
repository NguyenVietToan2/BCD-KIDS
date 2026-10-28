import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
const schema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email(), password: z.string().min(10).max(100), phone: z.string().trim().min(9).max(20).optional() });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Tên, email hoặc số điện thoại chưa hợp lệ. Mật khẩu cần ít nhất 10 ký tự." }, { status: 400 });
  try { const user = await prisma.user.create({ data: { name: parsed.data.name, email: parsed.data.email.toLowerCase(), passwordHash: await hash(parsed.data.password, 12), phone: parsed.data.phone } }); return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 }); }
  catch { return NextResponse.json({ error: "Email đã được sử dụng." }, { status: 409 }); }
}
