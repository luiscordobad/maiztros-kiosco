import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Generar turno: M + 3 dígitos
    const turnNumber = 'M' + Math.floor(100 + Math.random() * 900).toString();

    const newOrder = await prisma.order.create({
      data: {
        turnNumber: turnNumber,
        customerName: data.customerName || 'Cliente',
        orderType: data.orderType || 'DINE_IN',
        paymentMethod: data.paymentMethod || 'EFECTIVO',
        items: data.cart || [], // Prisma se encarga de convertir el array a JSONB
        orderNotes: data.orderNotes || '',
        totalAmount: parseFloat(data.totalAmount) || 0,
        tipAmount: parseFloat(data.tipAmount) || 0,
        status: 'PENDING'
      }
    });

    return NextResponse.json({ success: true, orderId: turnNumber });
  } catch (error: any) {
    console.error("Error en Checkout:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
