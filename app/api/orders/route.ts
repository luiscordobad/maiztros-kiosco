import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// El KDS y la Caja usan este GET para buscar órdenes
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'PAID'; 

  try {
    const orders = await prisma.order.findMany({
      where: { status: status },
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error al obtener órdenes' }, { status: 500 });
  }
}

// El KDS y la Caja usan este PATCH para actualizar órdenes
export async function PATCH(request: Request) {
  try {
    const { orderId, newStatus } = await request.json();
    
    await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus || 'COMPLETED' }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error al actualizar orden' }, { status: 500 });
  }
}
