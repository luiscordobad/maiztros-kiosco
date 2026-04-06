import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const turnNumber = 'M' + Math.floor(100 + Math.random() * 900).toString();
    const initialStatus = data.paymentMethod === 'TERMINAL' ? 'PAID' : 'AWAITING_PAYMENT';

    const order = await prisma.$transaction(async (tx) => {
      
      // BUSCAMOS EL TURNO ACTIVO
      const activeShift = await tx.shift.findFirst({ where: { status: 'OPEN' } });

      const newOrder = await tx.order.create({
        data: {
          turnNumber,
          customerName: data.customerName || 'Cliente',
          customerPhone: data.customerPhone || null,
          customerEmail: data.customerEmail || null,
          orderType: data.orderType || 'DINE_IN',
          paymentMethod: data.paymentMethod,
          items: data.cart || [],
          orderNotes: data.orderNotes || '',
          totalAmount: data.totalAmount, 
          pointsDiscount: data.pointsDiscount || 0, 
          couponCode: data.couponCode || null,
          tipAmount: data.tipAmount || 0,
          status: initialStatus,
          shiftId: activeShift?.id || null // LO ASIGNAMOS AL TURNO
        }
      });

      if (data.customerPhone && data.customerPhone.length === 10) {
         const earnedPoints = data.totalAmount; 
         const pointsToDeduct = (data.pointsDeducted || 0); 

         await tx.customer.upsert({
           where: { phone: data.customerPhone },
           update: { name: data.customerName, points: { increment: earnedPoints - pointsToDeduct } },
           create: { phone: data.customerPhone, name: data.customerName, points: earnedPoints }
         });
      }
      return newOrder;
    });

    return NextResponse.json({ success: true, orderId: turnNumber });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error al procesar orden' }, { status: 500 });
  }
}
