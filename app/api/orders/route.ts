import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    const orders = await prisma.order.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { orderId, action, newPaymentMethod, etaMinutes, newStatus } = body;

    // 1. Cambiar Método de Pago (Efectivo <-> Terminal)
    if (action === 'CHANGE_PAYMENT') {
        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { paymentMethod: newPaymentMethod }
        });
        
        // Registramos en Auditoría para que tú (Jefe) lo veas en el Admin
        await prisma.auditLog.create({
            data: { 
              action: 'CAMBIO_METODO_PAGO', 
              details: `Orden ${updatedOrder.turnNumber} cambió a ${newPaymentMethod === 'TERMINAL' ? 'TARJETA' : 'EFECTIVO'}`, 
              author: 'Caja' 
            }
        });
        return NextResponse.json({ success: true, order: updatedOrder });
    }

    // 2. Aceptar Pedido Web con ETA (Click & Collect)
    if (action === 'ACCEPT_ORDER') {
        const etaDate = new Date();
        etaDate.setMinutes(etaDate.getMinutes() + parseInt(etaMinutes));

        // Como no tenemos campo ETA en Prisma, lo inyectamos al inicio de las notas para que el KDS y el cliente lo vean
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        const existingNotes = order?.orderNotes ? `\n${order.orderNotes}` : '';
        const newNotes = `⏱️ [RECOGER EN ${etaMinutes} MIN] (${etaDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})${existingNotes}`;

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { 
                status: 'PREPARING', // Lo mandamos directo a preparar (KDS)
                orderNotes: newNotes
            }
        });
        return NextResponse.json({ success: true, order: updatedOrder });
    }

    // 3. Cancelar / Reembolsar o Pagar (Lo que ya tenías)
    if (newStatus) {
        await prisma.order.update({ where: { id: orderId }, data: { status: newStatus } });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
