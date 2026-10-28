
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { auth } from "../../../../auth";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isIntegerAtLeast(
  value: unknown,
  minimum: number
): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum;
}

function isValidImageUrl(value: string): boolean {
  if (!value) return true;

  // Cho phép ảnh được lưu trong public/uploads.
  if (value.startsWith("/uploads/")) {
    return (
      !value.includes("..") &&
      !value.includes("\\") &&
      !value.includes("?") &&
      !value.includes("#")
    );
  }

  // Hoặc URL ảnh HTTPS/HTTP bên ngoài.
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}

export async function GET(
  _request: Request,
  context: Context
) {
  try {
    const session = await auth();

    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Bạn không có quyền quản trị." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Không tìm thấy sản phẩm." },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Lỗi lấy chi tiết sản phẩm:", error);

    return NextResponse.json(
      { error: "Không lấy được thông tin sản phẩm." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: Context
) {
  try {
    const session = await auth();

    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Bạn không có quyền quản trị. Hãy đăng nhập bằng tài khoản ADMIN." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Dữ liệu gửi lên không phải JSON hợp lệ." },
        { status: 400 }
      );
    }

    if (!isObject(body)) {
      return NextResponse.json(
        { error: "Dữ liệu sản phẩm không hợp lệ." },
        { status: 400 }
      );
    }

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
      !isIntegerAtLeast(body.price, 0) ||
      !isIntegerAtLeast(body.stock, 0) ||
      !isIntegerAtLeast(body.minQty, 1)
    ) {
      return NextResponse.json(
        {
          error:
            "Vui lòng nhập đúng mã hàng, tên, danh mục, giá, tồn kho và số lượng tối thiểu.",
        },
        { status: 400 }
      );
    }

    if (
      body.description !== undefined &&
      typeof body.description !== "string"
    ) {
      return NextResponse.json(
        { error: "Mô tả sản phẩm không hợp lệ." },
        { status: 400 }
      );
    }

    if (
      body.image !== undefined &&
      typeof body.image !== "string"
    ) {
      return NextResponse.json(
        { error: "Đường dẫn ảnh không hợp lệ." },
        { status: 400 }
      );
    }

    if (
      body.variants !== undefined &&
      !Array.isArray(body.variants)
    ) {
      return NextResponse.json(
        { error: "Danh sách biến thể không hợp lệ." },
        { status: 400 }
      );
    }

    if (
      body.active !== undefined &&
      typeof body.active !== "boolean"
    ) {
      return NextResponse.json(
        { error: "Trạng thái sản phẩm không hợp lệ." },
        { status: 400 }
      );
    }

    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Sản phẩm không tồn tại." },
        { status: 404 }
      );
    }

    const image =
      typeof body.image === "string"
        ? body.image.trim()
        : existing.image;

    if (!isValidImageUrl(image)) {
      return NextResponse.json(
        {
          error:
            "Đường dẫn ảnh không hợp lệ. Hãy dùng /uploads/ten-anh.jpg hoặc URL HTTP(S).",
        },
        { status: 400 }
      );
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        sku,
        name,
        category,
        description:
          typeof body.description === "string"
            ? body.description
            : existing.description,
        price: body.price,
        stock: body.stock,
        minQty: body.minQty,
        image,
        variants:
          body.variants !== undefined
            ? body.variants
            : existing.variants,
        active:
          typeof body.active === "boolean"
            ? body.active
            : existing.active,
      },
    });

    return NextResponse.json({
      message: "Cập nhật sản phẩm thành công.",
      product,
    });
  } catch (error) {
    console.error("Lỗi cập nhật sản phẩm:", error);

    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error
        ? error.code
        : undefined;

    if (code === "P2002") {
      return NextResponse.json(
        { error: "Mã hàng đã tồn tại. Vui lòng nhập mã khác." },
        { status: 409 }
      );
    }

    if (code === "P2025") {
      return NextResponse.json(
        { error: "Không tìm thấy sản phẩm cần cập nhật." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Cập nhật thất bại. Hãy kiểm tra dữ liệu và terminal." },
      { status: 500 }
    );
  }
}

