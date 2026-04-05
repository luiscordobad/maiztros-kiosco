import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'PAID'; // Por defecto la cocina busca las pagadas

  try {
    const orders = await prisma.order.findMany({
      where: { status: status },
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { orderId, newStatus } = await request.json();
    // newStatus puede ser 'PAID' (desde caja) o 'COMPLETED' (desde cocina)
    await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus || 'COMPLETED' }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
