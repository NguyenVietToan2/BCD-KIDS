import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "BCD KIDS",
  description: "BCD KIDS - Cửa hàng thời trang trẻ em, nguồn hàng giá sỉ dành cho đại lý",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
