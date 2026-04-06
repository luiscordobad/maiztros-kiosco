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
    const { orderId, action, newPaymentMethod, etaMinutes, newStatus, updatedItems, newTotal } = body;

    // 1. Acción: Guardar cambios y Pagar (Caja)
    if (newStatus === 'PAID') {
        const dataToUpdate: any = { status: 'PAID' };
        if (updatedItems) dataToUpdate.items = JSON.stringify(updatedItems);
        if (newTotal !== undefined) dataToUpdate.totalAmount = newTotal;

        await prisma.order.update({
            where: { id: orderId },
            data: dataToUpdate
        });
        return NextResponse.json({ success: true });
    }

    // 2. Acción: Marcar como Despachado (Cocina / KDS) - ¡EL QUE FALTABA!
    if (newStatus === 'COMPLETED') {
        await prisma.order.update({
            where: { id: orderId },
            data: { status: 'COMPLETED' }
        });
        return NextResponse.json({ success: true });
    }

    // 3. Acción: Cambiar Método de Pago
    if (action === 'CHANGE_PAYMENT') {
        await prisma.order.update({
            where: { id: orderId },
            data: { paymentMethod: newPaymentMethod }
        });
        return NextResponse.json({ success: true });
    }

    // 4. Acción: Aceptar pedido App VIP con ETA
    if (action === 'ACCEPT_ORDER') {
        const etaDate = new Date();
        etaDate.setMinutes(etaDate.getMinutes() + parseInt(etaMinutes));
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        const existingNotes = order?.orderNotes ? `\n${order.orderNotes}` : '';
        const newNotes = `⏱️ [RECOGER EN ${etaMinutes} MIN] (${etaDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})${existingNotes}`;

        await prisma.order.update({
            where: { id: orderId },
            data: { status: 'PREPARING', orderNotes: newNotes }
        });
        return NextResponse.json({ success: true });
    }

    // 5. Acción: Reembolso / Cancelación
    if (newStatus === 'REFUNDED') {
        await prisma.order.update({ where: { id: orderId }, data: { status: 'REFUNDED' } });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
