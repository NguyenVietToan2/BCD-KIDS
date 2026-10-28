
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { auth } from "../../../auth";

export const runtime = "nodejs";

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

export async function GET() {
  try {
    const session = await auth();

    const products = await prisma.product.findMany({
      where:
        session?.user?.role === "ADMIN"
          ? {}
          : { active: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Lỗi lấy danh sách sản phẩm:", error);

    return NextResponse.json(
      { error: "Không tải được sản phẩm. Hãy kiểm tra kết nối cơ sở dữ liệu." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Bạn không có quyền quản trị." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const sku =
      typeof body.sku === "string" ? body.sku.trim() : "";
    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    const category =
      typeof body.category === "string"
        ? body.category.trim()
        : "";

    if (
      !sku ||
      !name ||
      !category ||
      !isNonNegativeInteger(body.price) ||
      !isNonNegativeInteger(body.stock) ||
      !Number.isSafeInteger(body.minQty) ||
      body.minQty < 1
    ) {
      return NextResponse.json(
        { error: "Vui lòng kiểm tra mã hàng, tên, danh mục, giá và số lượng." },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        category,
        description:
          typeof body.description === "string"
            ? body.description
            : "",
        price: body.price,
        stock: body.stock,
        minQty: body.minQty,
        image:
          typeof body.image === "string"
            ? body.image.trim()
            : "",
        variants: Array.isArray(body.variants)
          ? body.variants
          : [],
        active: body.active !== false,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Lỗi thêm sản phẩm:", error);

    const message =
      error instanceof Error &&
      error.message.includes("Unique constraint")
        ? "Mã sản phẩm đã tồn tại. Vui lòng sử dụng mã khác."
        : "Không thêm được sản phẩm. Hãy kiểm tra dữ liệu và kết nối cơ sở dữ liệu.";

    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
