import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  try {
    // 1. Traer Inventario y Cupones
    const products = await prisma.product.findMany({ orderBy: { category: 'asc' } });
    const modifiers = await prisma.modifier.findMany({ orderBy: { type: 'asc' } });
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });

    // 2. Filtro de Fechas para el Historial
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0); 
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999); 

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999); 
    }

    // 3. Traer TODAS las órdenes del rango
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, products, modifiers, coupons, orders });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error del servidor' }, { status: 500 });
  }
}

// Actualizar switches (Inventario y Cupones)
export async function PATCH(request: Request) {
  try {
    const { id, type, isAvailable, isActive } = await request.json();
    if (type === 'product') {
      await prisma.product.update({ where: { id }, data: { isAvailable } });
    } else if (type === 'modifier') {
      await prisma.modifier.update({ where: { id }, data: { isAvailable } });
    } else if (type === 'coupon') {
      await prisma.coupon.update({ where: { id }, data: { isActive } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// Crear nuevos Cupones
export async function POST(request: Request) {
  try {
    const { code, discount, discountType } = await request.json();
    await prisma.coupon.create({
      data: { 
        code: code.toUpperCase().trim(), 
        discount: parseFloat(discount), 
        discountType 
      }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'El cupón ya existe o es inválido' }, { status: 500 });
  }
}
