import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cart, totalAmount, customerName, customerPhone, customerEmail, paymentMethod, orderType } = body;

    const order = await prisma.order.create({
      data: {
        customerName, customerPhone, customerEmail, paymentMethod, orderType, totalAmount,
        kitchenStatus: 'RECEIVED', paymentStatus: 'PENDING',
        items: {
          create: cart.map((item: any) => ({
            productId: item.product.id, quantity: item.quantity, calculatedPrice: item.totalPrice, notes: item.notes
          }))
        }
      }
    });

    if (customerEmail && process.env.RESEND_API_KEY) {
      const itemsList = cart.map((item: any) => 
        `• ${item.quantity}x ${item.product.name} - $${item.totalPrice}\n  ${item.notes ? item.notes.split(' | ').join('\n  ') : ''}`
      ).join('\n\n');

      const tipoOrden = orderType === 'TAKEOUT' ? '🎒 PARA LLEVAR' : '🍽️ PARA COMER AQUÍ';

      await resend.emails.send({
        from: 'Maiztros Kiosco <onboarding@resend.dev>',
        to: customerEmail,
        subject: `¡Tu orden en Maiztros está en la cocina! (Turno #${order.id.slice(-4).toUpperCase()})`,
        text: `¡Hola ${customerName}!\n\nTu turno es el: #${order.id.slice(-4).toUpperCase()}\n\nTipo de orden: ${tipoOrden}\n\nRESUMEN DE TU ORDEN:\n-------------------------\n${itemsList}\n-------------------------\nTOTAL PAGADO: $${totalAmount.toFixed(2)}\nMétodo de pago: ${paymentMethod}\n\nTe llamaremos por tu nombre en cuanto esté listo.`,
      });
    }

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error' }, { status: 500 });
  }
}
