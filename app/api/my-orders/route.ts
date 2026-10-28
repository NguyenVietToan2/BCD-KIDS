import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma";
export async function GET(){const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Vui lòng đăng nhập."},{status:401});const orders=await prisma.order.findMany({where:{userId:session.user.id},include:{items:true},orderBy:{createdAt:"desc"},take:100});return NextResponse.json(orders);}
