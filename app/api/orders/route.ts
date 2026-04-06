import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { orderId, action, newPaymentMethod, etaMinutes } = body;

    // 1. Cambiar Método de Pago (Efectivo <-> Terminal)
    if (action === 'CHANGE_PAYMENT') {
        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { paymentMethod: newPaymentMethod }
        });
        // Opcional: Registrar en Auditoría
        await prisma.auditLog.create({
            data: { action: 'CAMBIO_METODO_PAGO', details: `Orden ${updatedOrder.turnNumber} a ${newPaymentMethod}`, author: 'Caja' }
        });
        return NextResponse.json({ success: true, order: updatedOrder });
    }

    // 2. Aceptar Pedido Web con ETA (Click & Collect)
    if (action === 'ACCEPT_ORDER') {
        const etaDate = new Date();
        etaDate.setMinutes(etaDate.getMinutes() + parseInt(etaMinutes));

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { 
                status: 'ACCEPTED', 
                // Asumiendo que agregas un campo 'eta' (DateTime) a tu modelo Order en schema.prisma, 
                // si no lo tienes, puedes guardarlo temporalmente en orderNotes o agregarlo al schema.
                orderNotes: `[ETA: ${etaMinutes} min] Listo aprox a las ${etaDate.toLocaleTimeString()}`
            }
        });
        return NextResponse.json({ success: true, order: updatedOrder });
    }

    // 3. Cancelar / Reembolsar (Lo que ya tenías)
    if (body.newStatus === 'REFUNDED') {
        await prisma.order.update({ where: { id: orderId }, data: { status: 'REFUNDED' } });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
