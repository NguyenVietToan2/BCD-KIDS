import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
const prisma = new PrismaClient();
async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    await prisma.user.upsert({ where: { email }, update: { role: "ADMIN", passwordHash: await hash(password, 12) }, create: { name: "Quản trị BCD KIDS", email, passwordHash: await hash(password, 12), role: "ADMIN" } });
  } else console.warn("Chưa tạo admin: hãy đặt ADMIN_EMAIL và ADMIN_PASSWORD trong .env trước khi chạy seed.");
  const samples = [
    { sku:"AT001",name:"Áo thun basic unisex",category:"Áo",price:45000,minQty:10,stock:250,description:"Áo thun cơ bản, phù hợp bán tại cửa hàng thời trang và kinh doanh online.",image:"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",variants:[{name:"Trắng",color:"#f4f2eb",images:[]},{name:"Đen",color:"#252525",images:[]},{name:"Be",color:"#c8b69a",images:[]}] },
    { sku:"ASM002",name:"Áo sơ mi thời trang",category:"Áo",price:85000,minQty:5,stock:120,description:"Áo sơ mi phong cách hiện đại, thích hợp nhập sỉ theo lô.",image:"https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=80",variants:[{name:"Trắng",color:"#f4f2eb",images:[]},{name:"Xanh",color:"#667b91",images:[]}] },
    { sku:"AK003",name:"Áo khoác casual",category:"Áo khoác",price:135000,minQty:5,stock:85,description:"Áo khoác casual dành cho khách sỉ.",image:"https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80",variants:[{name:"Đen",color:"#252525",images:[]},{name:"Nâu",color:"#98785d",images:[]}] },
    { sku:"TX004",name:"Túi xách thời trang",category:"Phụ kiện",price:95000,minQty:5,stock:100,description:"Túi xách thiết kế đơn giản.",image:"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=80",variants:[{name:"Nâu",color:"#98785d",images:[]},{name:"Đen",color:"#252525",images:[]}] },
    { sku:"GS005",name:"Giày sneaker basic",category:"Giày dép",price:165000,minQty:5,stock:75,description:"Giày sneaker phong cách đơn giản.",image:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",variants:[{name:"Trắng",color:"#f4f2eb",images:[]},{name:"Đen",color:"#252525",images:[]}] },
    { sku:"QD006",name:"Quần dài casual",category:"Quần",price:110000,minQty:5,stock:140,description:"Quần dài dễ phối đồ, thích hợp bán sỉ.",image:"https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80",variants:[{name:"Đen",color:"#252525",images:[]},{name:"Be",color:"#c8b69a",images:[]}] },
  ];
  for (const p of samples) await prisma.product.upsert({ where: { sku:p.sku }, update: {}, create: p });
}
main().finally(()=>prisma.$disconnect());
