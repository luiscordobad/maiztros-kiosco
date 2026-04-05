import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  try {
    // 1. Traer Inventario
    const products = await prisma.product.findMany({ orderBy: { category: 'asc' } });
    const modifiers = await prisma.modifier.findMany({ orderBy: { type: 'asc' } });

    // 2. Filtro de Fechas para Ventas
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // Por defecto: Hoy
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999); // Asegurar el final del día
    }

    const orders = await prisma.order.findMany({
      where: { 
        createdAt: { gte: startDate, lte: endDate }, 
        status: { in: ['PAID', 'COMPLETED'] } // Solo lo que sí se pagó
      },
      orderBy: { createdAt: 'desc' }
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
