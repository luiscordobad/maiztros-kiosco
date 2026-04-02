import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Generar un número de turno aleatorio (Ej. M492)
    const turnNumber = 'M' + Math.floor(100 + Math.random() * 900).toString();

    // Guardar en la base de datos
    const newOrder = await prisma.order.create({
      data: {
        turnNumber,
        customerName: data.customerName || 'Cliente',
        orderType: data.orderType || 'DINE_IN',
        paymentMethod: data.paymentMethod || 'EFECTIVO',
        items: data.cart || [],
        orderNotes: data.orderNotes || '',
        totalAmount: data.totalAmount,
        tipAmount: data.tipAmount || 0,
        status: 'PENDING'
      }
    });

    return NextResponse.json({ success: true, orderId: turnNumber });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error guardando la orden' }, { status: 500 });
  }
}
