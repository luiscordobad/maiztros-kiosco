import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 1. Traer Inventario
    const products = await prisma.product.findMany({ orderBy: { category: 'asc' } });
    const modifiers = await prisma.modifier.findMany({ orderBy: { type: 'asc' } });

    // 2. Traer Ventas de HOY (Corte de Caja)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: { 
        createdAt: { gte: startOfDay }, 
        status: { in: ['PAID', 'COMPLETED'] } 
      }
    });

    return NextResponse.json({ success: true, products, modifiers, orders });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error del servidor' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, type, isAvailable } = await request.json();
    if (type === 'product') {
      await prisma.product.update({ where: { id }, data: { isAvailable } });
    } else {
      await prisma.modifier.update({ where: { id }, data: { isAvailable } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
