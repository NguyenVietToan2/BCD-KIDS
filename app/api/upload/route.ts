
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { auth } from "../../../auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

// Kiểm tra nội dung thật của ảnh, không chỉ dựa vào tên file.
function isValidImage(bytes: Buffer, type: string): boolean {
  if (type === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (type === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
      )
    );
  }

  if (type === "image/webp") {
    return (
      bytes.length >= 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    );
  }

  if (type === "image/gif") {
    const signature = bytes.toString("ascii", 0, 6);
    return signature === "GIF87a" || signature === "GIF89a";
  }

  return false;
}

export async function POST(request: Request) {
  try {
    // Giữ nguyên cơ chế xác thực NextAuth hiện có.
    const session = await auth();

    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json(
        {
          error:
            "Bạn không có quyền quản trị. Hãy đăng nhập bằng tài khoản ADMIN.",
        },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Vui lòng chọn ảnh. Tên trường tải lên phải là 'file'." },
        { status: 400 }
      );
    }

    if (!Object.hasOwn(ALLOWED_TYPES, file.type)) {
      return NextResponse.json(
        { error: "Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF." },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Ảnh phải lớn hơn 0 và không vượt quá 5 MB." },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    if (!isValidImage(bytes, file.type)) {
      return NextResponse.json(
        { error: "Nội dung tệp không khớp với định dạng ảnh." },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const filename = `${randomUUID()}${ALLOWED_TYPES[file.type]}`;
    const filePath = path.join(uploadDir, filename);

    // Tên file ngẫu nhiên, không sử dụng tên file do người dùng cung cấp.
    await writeFile(filePath, bytes, { flag: "wx" });

    return NextResponse.json(
      { url: `/uploads/${filename}` },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload image error:", error);

    return NextResponse.json(
      { error: "Tải ảnh thất bại. Hãy kiểm tra terminal của Next.js." },
      { status: 500 }
    );
  }
}
