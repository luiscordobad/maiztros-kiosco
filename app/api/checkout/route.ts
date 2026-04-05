// app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const turnNumber = 'M' + Math.floor(100 + Math.random() * 900).toString();

    // Lógica de estado inicial
    // Si es terminal, asumimos que la terminal ya confirmó. Si es efectivo, espera validación.
    const initialStatus = data.paymentMethod === 'TERMINAL' ? 'PAID' : 'AWAITING_PAYMENT';

    const newOrder = await prisma.order.create({
      data: {
        turnNumber,
        customerName: data.customerName || 'Cliente',
        orderType: data.orderType || 'DINE_IN',
        paymentMethod: data.paymentMethod,
        items: data.cart || [],
        orderNotes: data.orderNotes || '',
        totalAmount: data.totalAmount,
        tipAmount: data.tipAmount || 0,
        status: initialStatus // <--- Aquí aplicamos el filtro
      }
    });

    return NextResponse.json({ success: true, orderId: turnNumber });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error al procesar orden' }, { status: 500 });
  }
}
