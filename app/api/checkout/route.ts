import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { Resend } from 'resend';

// Conectamos nuestra llave secreta
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cart, totalAmount, customerName, customerPhone, customerEmail, paymentMethod } = body;

    // 1. Guardar en Base de Datos
    const order = await prisma.order.create({
      data: {
        customerName,
        customerPhone,
        customerEmail,
        paymentMethod,
        totalAmount,
        kitchenStatus: 'RECEIVED',
        paymentStatus: 'PENDING',
        items: {
          create: cart.map((item: any) => ({
            productId: item.product.id,
            quantity: item.quantity,
            calculatedPrice: item.totalPrice,
            notes: item.notes
          }))
        }
      }
    });

    // 2. Enviar Ticket por Correo (Si el cliente dejó su email)
    if (customerEmail && process.env.RESEND_API_KEY) {
      
      // Armamos una lista de texto bonito con lo que compró
      const itemsList = cart.map((item: any) => 
        `• ${item.quantity}x ${item.product.name} - $${item.totalPrice}\n  ${item.notes ? item.notes.split(' | ').join('\n  ') : ''}`
      ).join('\n\n');

      await resend.emails.send({
        from: 'Maiztros Kiosco <onboarding@resend.dev>',
        to: customerEmail,
        subject: `¡Tu orden en Maiztros está en la cocina! (Turno #${order.id.slice(-4).toUpperCase()})`,
        text: `
¡Hola ${customerName}!

Gracias por tu compra en Maiztros. Tu orden ya está en nuestra estación de preparación.

Tu turno es el: #${order.id.slice(-4).toUpperCase()}

RESUMEN DE TU ORDEN:
-------------------------
${itemsList}
-------------------------
TOTAL PAGADO: $${totalAmount.toFixed(2)}

Método de pago: ${paymentMethod}

Te llamaremos por tu nombre en cuanto esté listo. ¡Disfruta tu antojo!
        `,
      });
    }

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error("Error procesando checkout:", error);
    return NextResponse.json({ success: false, error: 'Error' }, { status: 500 });
  }
}
