import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Obtener todas las órdenes pendientes
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error obteniendo órdenes' }, { status: 500 });
  }
}

// Marcar una orden como DESPACHADA
export async function PATCH(request: Request) {
  try {
    const { orderId } = await request.json();
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'COMPLETED' }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error actualizando orden' }, { status: 500 });
  }
}
