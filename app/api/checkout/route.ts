import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cart, totalAmount, customerName, customerPhone } = body;

    const order = await prisma.order.create({
      data: {
        customerName: customerName,
        customerPhone: customerPhone,
        totalAmount: totalAmount,
        kitchenStatus: 'RECEIVED',
        paymentStatus: 'PENDING',
        items: {
          create: cart.map((item: any) => ({
            productId: item.product.id,
            quantity: item.quantity,
            calculatedPrice: item.totalPrice,
            notes: item.notes // Aquí guardamos toda la instrucción para cocina
          }))
        }
      }
    });

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error("Error guardando orden:", error);
    return NextResponse.json({ success: false, error: 'Error' }, { status: 500 });
  }
}
