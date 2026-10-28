
"use client";

import { useEffect, useRef, useState } from "react";

type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  description?: string | null;
  price: number;
  stock: number;
  minQty: number;
  image?: string | null;
  variants?: unknown;
  active: boolean;
};

type ProductForm = {
  sku: string;
  name: string;
  category: string;
  description: string;
  price: string;
  stock: string;
  minQty: string;
  image: string;
  active: boolean;
};

const emptyForm: ProductForm = {
  sku: "",
  name: "",
  category: "Áo",
  description: "",
  price: "99000",
  stock: "0",
  minQty: "1",
  image: "",
  active: true,
};

function formatPrice(price: number) {
  return price.toLocaleString("vi-VN") + " ₫";
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function loadProducts() {
    setLoading(true);
    try {
      const response = await fetch("/api/products", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không tải được sản phẩm.");
      }

      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Lỗi tải sản phẩm."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  function updateField<K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFile(null);
    setPreview("");
    setMessage("");
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      sku: product.sku,
      name: product.name,
      category: product.category,
      description: product.description ?? "",
      price: String(product.price),
      stock: String(product.stock),
      minQty: String(product.minQty),
      image: product.image ?? "",
      active: product.active,
    });
    setFile(null);
    setPreview(product.image ?? "");
    setMessage("");
    setError("");
    if (fileInput.current) fileInput.current.value = "";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectImage(selectedFile?: File) {
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setError("Vui lòng chọn một tệp hình ảnh.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("Ảnh phải nhỏ hơn hoặc bằng 5 MB.");
      return;
    }

    setError("");
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setMessage("");

    const price = Number(form.price);
    const stock = Number(form.stock);
    const minQty = Number(form.minQty);

    if (
      !form.sku.trim() ||
      !form.name.trim() ||
      !form.category.trim() ||
      !Number.isSafeInteger(price) ||
      price < 0 ||
      !Number.isSafeInteger(stock) ||
      stock < 0 ||
      !Number.isSafeInteger(minQty) ||
      minQty < 1
    ) {
      setError(
        "Hãy nhập mã hàng, tên, danh mục, giá và số lượng hợp lệ."
      );
      return;
    }

    setSaving(true);

    try {
      let image = form.image.trim();

      // Nếu chọn ảnh từ máy tính, tải ảnh lên trước.
      if (file) {
        const uploadData = new FormData();
        uploadData.append("file", file);

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadData,
        });

        const uploaded = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploaded.error || "Không tải được ảnh.");
        }

        image = uploaded.url;
      }

      const body = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        price,
        stock,
        minQty,
        image,
        active: form.active,
      };

      const response = await fetch(
        editingId
          ? `/api/products/${editingId}`
          : "/api/products",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Không lưu được sản phẩm."
        );
      }

      setMessage(
        editingId
          ? "Đã cập nhật sản phẩm thành công."
          : "Đã thêm sản phẩm thành công."
      );

      setEditingId(null);
      setForm(emptyForm);
      setFile(null);
      setPreview("");
      if (fileInput.current) fileInput.current.value = "";

      await loadProducts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Đã xảy ra lỗi."
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredProducts = products.filter((product) => {
    const keyword = search.trim().toLowerCase();
    return (
      product.name.toLowerCase().includes(keyword) ||
      product.sku.toLowerCase().includes(keyword) ||
      product.category.toLowerCase().includes(keyword)
    );
  });

  return (
    <main className="min-h-screen bg-gray-50 p-4 text-gray-900 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <a href="/" className="font-medium text-emerald-700 hover:underline">
          ← Quay lại cửa hàng
        </a>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Quản lý sản phẩm</h1>
            <p className="mt-2 text-sm text-gray-500">
              Chỉnh sửa tên, giá, ảnh và thông tin hàng hóa.
            </p>
          </div>

          <button
            type="button"
            onClick={startCreate}
            className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
          >
            + Thêm sản phẩm
          </button>
        </div>

        {message && (
          <p className="mt-4 rounded-lg bg-green-100 p-3 text-green-800">
            {message}
          </p>
        )}

        {error && (
          <p className="mt-4 whitespace-pre-wrap rounded-lg bg-red-100 p-3 text-red-700">
            {error}
          </p>
        )}

        <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">
            {editingId ? "Sửa sản phẩm" : "Thêm sản phẩm mới"}
          </h2>

          <form onSubmit={handleSubmit} className="mt-5 grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Mã sản phẩm (SKU) *
                </span>
                <input
                  required
                  value={form.sku}
                  onChange={(e) => updateField("sku", e.target.value)}
                  placeholder="VD: AO-THUN-001"
                  className="w-full rounded-lg border p-3 outline-none focus:border-emerald-600"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Tên sản phẩm *
                </span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Áo thun nam"
                  className="w-full rounded-lg border p-3 outline-none focus:border-emerald-600"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Danh mục *
                </span>
                <select
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  className="w-full rounded-lg border bg-white p-3"
                >
                  <option value="Áo">Áo</option>
                  <option value="Quần">Quần</option>
                  <option value="Giày dép">Giày dép</option>
                  <option value="Phụ kiện">Phụ kiện</option>
                  <option value="Áo khoác">Áo khoác</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Giá bán (VNĐ) *
                </span>
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={form.price}
                  onChange={(e) => updateField("price", e.target.value)}
                  placeholder="99000"
                  className="w-full rounded-lg border p-3"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">
                    Tồn kho
                  </span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={(e) => updateField("stock", e.target.value)}
                    className="w-full rounded-lg border p-3"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium">
                    Số lượng tối thiểu
                  </span>
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={form.minQty}
                    onChange={(e) => updateField("minQty", e.target.value)}
                    className="w-full rounded-lg border p-3"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Mô tả
                </span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    updateField("description", e.target.value)
                  }
                  className="w-full rounded-lg border p-3"
                  placeholder="Mô tả sản phẩm..."
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Đường dẫn ảnh (nếu có)
                </span>
                <input
                  value={form.image}
                  onChange={(e) => {
                    updateField("image", e.target.value);
                    if (!file) setPreview(e.target.value);
                  }}
                  placeholder="/uploads/ao-thun.jpg hoặc URL ảnh"
                  className="w-full rounded-lg border p-3"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Hoặc tải ảnh từ máy tính (tối đa 5 MB)
                </span>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => selectImage(e.target.files?.[0])}
                  className="w-full rounded-lg border p-3 text-sm"
                />
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => updateField("active", e.target.checked)}
                />
                <span className="text-sm">Hiển thị sản phẩm trên cửa hàng</span>
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-700 px-6 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? "Đang lưu..."
                    : editingId
                      ? "Lưu thay đổi"
                      : "Thêm sản phẩm"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={startCreate}
                    className="rounded-lg border px-5 py-3"
                  >
                    Hủy sửa
                  </button>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-semibold">Xem trước sản phẩm</h3>
              <div className="rounded-xl border bg-gray-50 p-4">
                {preview ? (
                  <img
                    src={preview}
                    alt="Xem trước sản phẩm"
                    onError={() => {
                      if (preview.startsWith("blob:")) return;
                    }}
                    className="h-72 w-full rounded-lg object-contain"
                  />
                ) : (
                  <div className="flex h-72 items-center justify-center text-gray-400">
                    Chưa có ảnh sản phẩm
                  </div>
                )}

                <h3 className="mt-4 text-lg font-semibold">
                  {form.name || "Tên sản phẩm"}
                </h3>
                <p className="mt-2 text-2xl font-bold text-emerald-700">
                  {form.price !== "" && Number.isFinite(Number(form.price))
                    ? formatPrice(Number(form.price))
                    : "Giá sản phẩm"}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Danh mục: {form.category || "Chưa chọn"}
                </p>
              </div>
            </div>
          </form>
        </section>

        <section className="mt-8 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">
              Danh sách sản phẩm ({filteredProducts.length})
            </h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, mã hoặc danh mục..."
              className="w-full rounded-lg border p-3 sm:max-w-sm"
            />
          </div>

          {loading ? (
            <p className="py-8 text-gray-500">Đang tải sản phẩm...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="py-8 text-gray-500">
              Chưa có sản phẩm hoặc không tìm thấy kết quả.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-3">Ảnh</th>
                    <th className="p-3">Sản phẩm</th>
                    <th className="p-3">Giá</th>
                    <th className="p-3">Tồn kho</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-t">
                      <td className="p-3">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-16 w-16 rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                            Chưa có ảnh
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <p className="font-semibold">{product.name}</p>
                        <p className="mt-1 text-gray-500">
                          {product.sku} · {product.category}
                        </p>
                      </td>
                      <td className="p-3 font-semibold text-emerald-700">
                        {formatPrice(product.price)}
                      </td>
                      <td className="p-3">{product.stock}</td>
                      <td className="p-3">
                        {product.active ? "Đang bán" : "Đã ẩn"}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => startEdit(product)}
                          className="rounded-lg border border-emerald-700 px-3 py-2 font-medium text-emerald-700 hover:bg-emerald-50"
                        >
                          Sửa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
