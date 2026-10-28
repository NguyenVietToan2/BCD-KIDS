# BCD KIDS — nền tảng nâng cấp đặt hàng sỉ

Bộ khung này nâng cấp giao diện ban đầu thành ứng dụng Next.js có PostgreSQL/Prisma, đăng nhập khách sỉ, quản trị sản phẩm/đơn hàng và luồng thanh toán VNPay. Cần cấu hình môi trường trước khi dùng thật.

## 1. Chuẩn bị

- Node.js 20.9 trở lên.
- PostgreSQL đang chạy và có database rỗng tên `sieusi` (hoặc cập nhật `DATABASE_URL`).
- Tài khoản người bán VNPay đã được cấp `TMN_CODE` và `HASH_SECRET` nếu bật thanh toán online.

## 2. Cài đặt

Trong thư mục dự án, mở Terminal:

```bash
npm install
```

Sao chép `.env.example` thành `.env` (Windows PowerShell):

```powershell
Copy-Item .env.example .env
```

Sửa `.env` với thông tin PostgreSQL, `AUTH_SECRET` dài/ngẫu nhiên, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Không gửi `.env` cho người khác và không commit lên Git.

Tạo database PostgreSQL tên `sieusi`, sau đó chạy:

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Mở `http://localhost:3000`. Seed tạo 6 sản phẩm mẫu và tài khoản quản trị từ `ADMIN_EMAIL`/`ADMIN_PASSWORD`. Nếu thay đổi thông tin admin sau khi seed, chạy seed lại sẽ cập nhật mật khẩu/role của email đó.

- Trang đăng ký khách sỉ: `/register`
- Đăng nhập: `/login`
- Trang quản trị: `/admin`
- API sản phẩm: `GET /api/products`
- API tạo đơn: `POST /api/orders` (yêu cầu đăng nhập)

## 3. Thanh toán VNPay

1. Đăng ký/được VNPay cấp tài khoản merchant và thông tin sandbox.
2. Điền `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL` và `NEXT_PUBLIC_APP_URL` vào `.env`.
3. Đưa website lên HTTPS trước khi kiểm thử end-to-end.
4. Cấu hình **IPN URL** trong trang quản lý merchant VNPay trỏ tới `https://TEN-MIEN-CUA-BAN/api/payments/vnpay-ipn`.
5. Chạy giao dịch thử theo tài liệu chính thức VNPay; xác minh cả chữ ký, số tiền, trạng thái giao dịch và IPN trước khi dùng production.

`VNPAY_URL` mặc định trỏ sandbox. Không chuyển sang production cho tới khi VNPay phê duyệt merchant và kiểm thử hoàn tất. Trình duyệt quay về trang kết quả không được coi là bằng chứng thanh toán; trạng thái đơn chỉ được đánh dấu đã trả tiền khi IPN có chữ ký hợp lệ.

## 4. Những việc cần hoàn thiện trước khi nhận đơn thật

- Điền hotline, chính sách đổi trả/giao hàng, địa chỉ doanh nghiệp và thông tin pháp lý.
- Kiểm thử cạnh tranh tồn kho, hủy đơn và quy trình hoàn tiền; hiện bản khung trừ tồn kho khi tạo đơn, kể cả đơn VNPay chưa thanh toán, vì vậy cần thêm tác vụ hết hạn đơn và hoàn tồn kho trước khi mở bán rộng rãi.
- Bổ sung giới hạn tần suất, CAPTCHA/chống spam đăng ký, email xác minh/khôi phục mật khẩu, nhật ký quản trị và sao lưu database.
- Chức năng quản trị hiện thêm/ẩn sản phẩm và cập nhật trạng thái đơn; chỉnh sửa sản phẩm chi tiết có thể gọi `PATCH /api/products/:id` nhưng chưa có biểu mẫu chỉnh sửa trực quan.
- Xác minh lại các quy tắc/format chữ ký với tài liệu VNPay mới nhất và merchant sandbox. Không dùng dữ liệu mẫu hoặc thông tin thanh toán giả trong môi trường production.

## 5. Cấu trúc chính

- `app/page.tsx`: trang cửa hàng, lọc/tìm sản phẩm, giỏ hàng và form checkout.
- `app/login/page.tsx`, `app/register/page.tsx`: đăng nhập/đăng ký khách sỉ.
- `app/admin/page.tsx`: quản lý đơn hàng, thêm/ẩn sản phẩm.
- `app/api/orders/route.ts`: xác thực, kiểm tra giá/tồn kho phía server, ghi đơn và chi tiết đơn.
- `app/api/payments/vnpay/route.ts`: tạo URL thanh toán đã ký.
- `app/api/payments/vnpay-ipn/route.ts`: xác minh callback server-to-server.
- `prisma/schema.prisma`: cấu trúc PostgreSQL.
