
"use client";

import { useState } from "react";

export default function AdminProductsPage() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [preview, setPreview] = useState("");

  function handleImage(file?: File) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setImage(url);
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 text-gray-900">
      <div className="mx-auto max-w-5xl">
        <a href="/" className="text-emerald-700">
          ← Quay lại cửa hàng
        </a>

        <h1 className="mt-5 text-3xl font-bold">
          Quản lý sản phẩm
        </h1>
        <p className="mt-2 text-gray-500">
          Chỉnh sửa thông tin sản phẩm BCD KIDS
        </p>

        <section className="mt-6 grid gap-6 rounded-2xl border bg-white p-6 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              Thông tin sản phẩm
            </h2>

            <label className="block">
              <span className="mb-1 block">Tên sản phẩm</span>
              <input
                className="w-full rounded-lg border p-3"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên sản phẩm"
              />
            </label>

            <label className="block">
              <span className="mb-1 block">Giá bán (VNĐ)</span>
              <input
                className="w-full rounded-lg border p-3"
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ví dụ: 99000"
              />
            </label>

            <label className="block">
              <span className="mb-1 block">Ảnh sản phẩm</span>
              <input
                className="w-full rounded-lg border p-3"
                type="file"
                accept="image/*"
                onChange={(e) => handleImage(e.target.files?.[0])}
              />
            </label>

            <p className="text-sm text-amber-700">
              Đây là giao diện nhập liệu thử nghiệm.
              Chưa lưu dữ liệu vào PostgreSQL.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-semibold">
              Xem trước sản phẩm
            </h2>

            <div className="rounded-xl border bg-gray-50 p-4">
              {preview ? (
                <img
                  src={preview}
                  alt="Ảnh xem trước"
                  className="h-64 w-full rounded-lg object-contain"
                />
              ) : (
                <div className="flex h-64 items-center justify-center text-gray-400">
                  Chưa chọn ảnh
                </div>
              )}

              <h3 className="mt-4 font-semibold">
                {name || "Tên sản phẩm"}
              </h3>

              <p className="mt-2 text-xl font-bold text-emerald-700">
                {price
                  ? Number(price).toLocaleString("vi-VN") + " ₫"
                  : "Giá sản phẩm"}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
