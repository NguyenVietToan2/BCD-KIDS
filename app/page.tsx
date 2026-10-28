
"use client";

import { useEffect, useMemo, useState } from "react";

type Variant = {
  name: string;
  color: string;
  images?: string[];
};

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  minQty: number;
  stock: number;
  description: string;
  image: string;
  variants: Variant[];
};

type CartLine = {
  product: Product;
  variantName: string;
  quantity: number;
};

const money = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [variantName, setVariantName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [checkout, setCheckout] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [customer, setCustomer] = useState({
    customerName: "",
    phone: "",
    email: "",
    address: "",
    note: "",
    paymentMethod: "COD",
  });

  // Tải sản phẩm từ API
  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);

      try {
        const response = await fetch("/api/products", {
          cache: "no-store",
        });

        const data: unknown = await response.json();

        if (!response.ok) {
          const errorMessage =
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "Không tải được sản phẩm.";

          throw new Error(errorMessage);
        }

        if (!Array.isArray(data)) {
          throw new Error("API không trả về danh sách sản phẩm.");
        }

        if (!cancelled) {
          setProducts(data as Product[]);
          setMessage("");
          console.log("BCD KIDS - Sản phẩm:", data);
        }
      } catch (error) {
        console.error("Lỗi tải sản phẩm:", error);

        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Không tải được sản phẩm. Hãy kiểm tra kết nối cơ sở dữ liệu."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = [
    "Tất cả",
    ...Array.from(new Set(products.map((p) => p.category))),
  ];

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (category === "Tất cả" || p.category === category) &&
          `${p.name} ${p.sku}`
            .toLowerCase()
            .includes(search.toLowerCase().trim())
      ),
    [products, category, search]
  );

  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  const total = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  function openProduct(product: Product) {
    setSelected(product);
    setVariantName(product.variants?.[0]?.name ?? "Mặc định");
    setQuantity(product.minQty);
    setMessage("");
  }

  function add() {
    if (!selected) return;

    if (
      quantity < selected.minQty ||
      quantity > selected.stock ||
      !Number.isInteger(quantity)
    ) {
      setMessage(
        `Số lượng phải từ ${selected.minQty} đến ${selected.stock}.`
      );
      return;
    }

    setCart((old) => {
      const key = selected.id + variantName;
      const found = old.find(
        (item) => item.product.id + item.variantName === key
      );

      if (found) {
        return old.map((item) =>
          item.product.id + item.variantName === key
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...old, { product: selected, variantName, quantity }];
    });

    setSelected(null);
    setMessage("");
  }

  function setLineQty(index: number, delta: number) {
    setCart((old) =>
      old.map((item, i) =>
        i === index
          ? {
              ...item,
              quantity: Math.max(
                1,
                Math.min(item.product.stock, item.quantity + delta)
              ),
            }
          : item
      )
    );
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...customer,
          items: cart.map((item) => ({
            productId: item.product.id,
            variantName: item.variantName,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không thể tạo đơn hàng.");
      }

      if (customer.paymentMethod === "VNPAY") {
        const paymentResponse = await fetch("/api/payments/vnpay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: data.order.id }),
        });

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
          throw new Error(
            paymentData.error || "Không thể tạo liên kết thanh toán."
          );
        }

        window.location.href = paymentData.paymentUrl;
        return;
      }

      setCart([]);
      setCheckout(false);
      setMessage(
        `Đã tạo đơn ${data.order.orderNumber}. Nhân viên sẽ liên hệ xác nhận.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Có lỗi khi đặt hàng."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shop">
      <div className="topbar">
        <div className="wrap topbar-inner">
          <span>Chuyên sỉ toàn quốc · Giá tốt cho đại lý</span>
          <span>Hỗ trợ khách hàng: vui lòng cập nhật số hotline thật</span>
        </div>
      </div>

      <header className="header">
        <div className="wrap header-inner">
          <a className="brand" href="/">
            <span className="brand-icon">🍊</span>
            <span>
              <strong>BCD KIDS</strong>
              <small>WHOLESALE STORE</small>
            </span>
          </a>

          <label className="search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên sản phẩm hoặc mã..."
            />
          </label>

          <a className="cart-button" href="/login">
            Tài khoản
          </a>

          <a className="cart-button" href="/orders">
            Đơn hàng
          </a>

          <button
            className="cart-button"
            onClick={() => setCheckout(true)}
          >
            🛒 Giỏ hàng <b>{count}</b>
          </button>
        </div>
      </header>

      <div className="wrap">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">ĐỒNG HÀNH CÙNG ĐẠI LÝ</div>
            <h1>
              Nhập sỉ thông minh.
              <br />
              <span>Kinh doanh dễ dàng.</span>
            </h1>
            <p>
              Nguồn hàng đa dạng, giá sỉ minh bạch, đặt hàng nhanh
              chóng cho cửa hàng và nhà bán lẻ.
            </p>
            <a className="primary-button" href="#san-pham">
              Khám phá sản phẩm →
            </a>
            <div className="hero-points">
              <span>✓ Giá sỉ cạnh tranh</span>
              <span>✓ Đặt hàng linh hoạt</span>
              <span>✓ Hỗ trợ tận tâm</span>
            </div>
          </div>

          <div className="hero-visual">
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=85"
              alt="Không gian cửa hàng thời trang"
            />
          </div>
        </section>

        <section className="benefits">
          <div>
            <span className="benefit-icon">♧</span>
            <span>
              <strong>Giá bán sỉ</strong>
              <small>Ưu đãi theo số lượng</small>
            </span>
          </div>
          <div>
            <span className="benefit-icon">◇</span>
            <span>
              <strong>Nguồn hàng rõ ràng</strong>
              <small>Thông tin minh bạch</small>
            </span>
          </div>
          <div>
            <span className="benefit-icon">✓</span>
            <span>
              <strong>Đặt hàng tiện lợi</strong>
              <small>Quản lý giỏ hàng nhanh</small>
            </span>
          </div>
          <div>
            <span className="benefit-icon">♡</span>
            <span>
              <strong>Hỗ trợ tận tâm</strong>
              <small>Đồng hành cùng đại lý</small>
            </span>
          </div>
        </section>

        <section className="catalog" id="san-pham">
          <div className="section-heading">
            <div>
              <div className="eyebrow">DANH MỤC SẢN PHẨM</div>
              <h2>Hàng sỉ nổi bật</h2>
              <p>Chọn sản phẩm, màu sắc và số lượng cần nhập.</p>
            </div>
            <span className="product-count">
              {loading ? "Đang tải..." : `${filtered.length} sản phẩm`}
            </span>
          </div>

          <div className="filters">
            <div className="category-list">
              {categories.map((item) => (
                <button
                  key={item}
                  className={`category ${
                    category === item ? "active" : ""
                  }`}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="empty">Đang tải sản phẩm, vui lòng chờ...</div>
          ) : filtered.length > 0 ? (
            <div className="product-grid">
              {filtered.map((product) => (
                <article className="product-card" key={product.id}>
                  <button
                    className="product-image"
                    onClick={() => openProduct(product)}
                  >
                    <img
                      src={
                        product.image ||
                        product.variants?.[0]?.images?.[0] ||
                        "https://placehold.co/600x600?text=BCD+KIDS"
                      }
                      alt={product.name}
                    />
                    <span className="image-tag">GIÁ SỈ</span>
                    <span className="quick-view">Xem chi tiết ↗</span>
                  </button>

                  <div className="product-info">
                    <span className="product-category">
                      {product.category}
                    </span>
                    <h3>{product.name}</h3>
                    <div className="sku">Mã hàng: {product.sku}</div>
                    <div className="price-row">
                      <strong>{money(product.price)}</strong>
                      <span>/ sản phẩm</span>
                    </div>
                    <div className="product-bottom">
                      <span>Tối thiểu {product.minQty} sản phẩm</span>
                      <button
                        className="add-button"
                        onClick={() => openProduct(product)}
                      >
                        Chọn hàng +
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">
              {message
                ? `Lỗi: ${message}`
                : products.length
                  ? "Không tìm thấy sản phẩm phù hợp."
                  : "Chưa có sản phẩm. Hãy kiểm tra dữ liệu trong trang quản trị và cơ sở dữ liệu."}
            </div>
          )}
        </section>
      </div>

      <footer className="footer">
        <div className="wrap footer-inner">
          <div className="brand">
            <span className="brand-icon">🍊</span>
            <span>
              <strong>BCD KIDS</strong>
              <small>WHOLESALE STORE</small>
            </span>
          </div>
          <p>Sản phẩm, giá và tồn kho được lấy từ cơ sở dữ liệu.</p>
        </div>
      </footer>

      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <section className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setSelected(null)}>
              ×
            </button>

            <div className="modal-gallery">
              <img
                src={
                  selected.image ||
                  selected.variants?.[0]?.images?.[0] ||
                  "https://placehold.co/600x600?text=BCD+KIDS"
                }
                alt={selected.name}
              />
            </div>

            <div className="modal-details">
              <span className="product-category">
                {selected.category} · {selected.sku}
              </span>
              <h2>{selected.name}</h2>
              <div className="modal-price">{money(selected.price)}</div>
              <p className="description">{selected.description}</p>

              <span className="field-label">Chọn màu / mẫu</span>
              <div className="color-options">
                {(selected.variants?.length
                  ? selected.variants
                  : [{ name: "Mặc định", color: "#dddddd" }]
                ).map((variant) => (
                  <button
                    key={variant.name}
                    className={`color-option ${
                      variantName === variant.name ? "chosen" : ""
                    }`}
                    onClick={() => setVariantName(variant.name)}
                  >
                    <span
                      className="swatch"
                      style={{ backgroundColor: variant.color }}
                    />
                    {variant.name}
                  </button>
                ))}
              </div>

              <p className="stock-line">
                Còn <strong>{selected.stock}</strong> sản phẩm
              </p>

              <span className="field-label">Số lượng nhập</span>
              <div className="quantity-control">
                <button
                  onClick={() =>
                    setQuantity((q) => Math.max(selected.minQty, q - 1))
                  }
                >
                  −
                </button>
                <input
                  type="number"
                  min={selected.minQty}
                  max={selected.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
                <button
                  onClick={() =>
                    setQuantity((q) => Math.min(selected.stock, q + 1))
                  }
                >
                  +
                </button>
              </div>

              <small className="minimum">
                Số lượng tối thiểu: {selected.minQty}
              </small>

              <div className="modal-total">
                <span>Tạm tính</span>
                <strong>{money(selected.price * quantity)}</strong>
              </div>

              {message && <p className="notice">{message}</p>}

              <button className="primary-button full" onClick={add}>
                Thêm vào giỏ hàng
              </button>
            </div>
          </section>
        </div>
      )}

      {checkout && (
        <div className="overlay" onClick={() => setCheckout(false)}>
          <section
            className="cart-panel checkout-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cart-heading">
              <h2>Giỏ hàng & đặt hàng</h2>
              <button className="close" onClick={() => setCheckout(false)}>
                ×
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <span>🛒</span>
                <h3>Chưa có sản phẩm</h3>
                <p>Chọn sản phẩm và số lượng để bắt đầu nhập sỉ.</p>
                <button
                  className="primary-button"
                  onClick={() => setCheckout(false)}
                >
                  Tiếp tục mua hàng
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item, index) => (
                    <div
                      className="cart-item"
                      key={item.product.id + item.variantName}
                    >
                      <img
                        src={
                          item.product.image ||
                          item.product.variants?.[0]?.images?.[0] ||
                          "https://placehold.co/100x100"
                        }
                        alt={item.product.name}
                      />

                      <div className="cart-item-info">
                        <strong>{item.product.name}</strong>
                        <small>
                          Mẫu: {item.variantName} · {money(item.product.price)}
                        </small>

                        <div className="mini-quantity">
                          <button onClick={() => setLineQty(index, -1)}>
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button onClick={() => setLineQty(index, 1)}>
                            +
                          </button>
                          <button
                            onClick={() =>
                              setCart((old) =>
                                old.filter((_, i) => i !== index)
                              )
                            }
                          >
                            Xóa
                          </button>
                        </div>
                      </div>

                      <strong>
                        {money(item.quantity * item.product.price)}
                      </strong>
                    </div>
                  ))}
                </div>

                <div className="cart-summary">
                  <span>Tổng tiền hàng</span>
                  <strong>{money(total)}</strong>
                </div>

                <form className="checkout-form" onSubmit={placeOrder}>
                  <h3>Thông tin nhận hàng</h3>

                  {(
                    [
                      ["customerName", "Họ tên người nhận", "text"],
                      ["phone", "Số điện thoại", "tel"],
                      ["email", "Email", "email"],
                      ["address", "Địa chỉ nhận hàng", "text"],
                    ] as const
                  ).map(([key, label, type]) => (
                    <label key={key}>
                      {label}
                      <input
                        required
                        type={type}
                        value={customer[key]}
                        onChange={(e) =>
                          setCustomer({
                            ...customer,
                            [key]: e.target.value,
                          })
                        }
                      />
                    </label>
                  ))}

                  <label>
                    Ghi chú
                    <textarea
                      value={customer.note}
                      onChange={(e) =>
                        setCustomer({ ...customer, note: e.target.value })
                      }
                    />
                  </label>

                  <label>
                    Phương thức thanh toán
                    <select
                      value={customer.paymentMethod}
                      onChange={(e) =>
                        setCustomer({
                          ...customer,
                          paymentMethod: e.target.value,
                        })
                      }
                    >
                      <option value="COD">
                        Thanh toán khi nhận hàng (COD)
                      </option>
                      <option value="VNPAY">Thanh toán trực tuyến VNPay</option>
                    </select>
                  </label>

                  {message && <p className="form-error">{message}</p>}

                  <button
                    className="primary-button full"
                    disabled={busy}
                  >
                    {busy ? "Đang xử lý…" : "Xác nhận đặt hàng"}
                  </button>

                  <small>
                    Đặt hàng cần đăng nhập tài khoản khách sỉ. Giá được xác
                    thực lại trên máy chủ.
                  </small>
                </form>
              </>
            )}
          </section>
        </div>
      )}

      {message && !selected && !checkout && (
        <div className="toast" role="status">
          {message}
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}
    </main>
  );
}
