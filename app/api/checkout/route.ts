import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const turnNumber = 'M' + Math.floor(100 + Math.random() * 900).toString();
    const initialStatus = data.paymentMethod === 'TERMINAL' ? 'PAID' : 'AWAITING_PAYMENT';

    const order = await prisma.$transaction(async (tx) => {
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
          shiftId: activeShift?.id || null 
        }
      });

      if (data.customerPhone && data.customerPhone.length === 10) {
         const earnedPoints = data.totalAmount; 
         const pointsToDeduct = data.pointsDeducted || 0; 

         await tx.customer.upsert({
           where: { phone: data.customerPhone },
           update: { name: data.customerName, points: { increment: earnedPoints - pointsToDeduct } },
           create: { phone: data.customerPhone, name: data.customerName, points: earnedPoints }
         });
      }

      // MOTOR DE DEDUCCIÓN INTELIGENTE
      const inventoryUpdates: Record<string, number> = {};
      const addDeduction = (name: string, qty: number) => {
          if (!name) return;
          inventoryUpdates[name] = (inventoryUpdates[name] || 0) + qty;
      };

      data.cart.forEach((item: any) => {
          const pName = item.product.name || '';
          
          if (item.notes) {
              const notesArray = item.notes.split(' | ');
              notesArray.forEach((note: string) => {
                  if (note.includes('Bolsa de Papas:')) addDeduction(note.split(': ')[1].trim(), 1);
                  if (note.includes('Sabor de Maruchan:')) addDeduction(note.split(': ')[1].trim(), 1);
                  if (note.includes('Tu Sabor:')) addDeduction(note.split(': ')[1].trim(), 1); // Combo Especialista
                  if (note.includes('Tu Bebida:') || note.includes('Bebida 1:') || note.includes('Bebida 2:') || note.includes('Bebida 3:') || note.includes('Bebida 4:')) addDeduction(note.split(': ')[1].trim(), 1);
                  if (note.includes('Sabor de Boing:') || note.includes('Sabor de Refresco:')) addDeduction(note.split(': ')[1].trim(), 1);
              });
          }

          if (pName === item.notes && (item.product.category === 'BEBIDA' || item.product.category === 'PAPA_SOLA')) {
              addDeduction(pName, 1);
          }
          
          if (pName === item.notes && item.product.category === 'MARUCHAN_SOLA') {
              addDeduction(pName, 1);
              addDeduction('Tenedor', 1);
          }

          // RECETAS BASE
          if (pName.includes('Individual') || pName.includes('Solitario')) { addDeduction('Vaso Mediano', 1); addDeduction('Cuchara', 1); }
          else if (pName.includes('Pareja') || pName.includes('Dúo')) { addDeduction('Vaso Mediano', 2); addDeduction('Cuchara', 2); }
          else if (pName.includes('Familiar') || pName.includes('Tribu')) { addDeduction('Vaso Grande', 2); addDeduction('Vaso Chico', 2); addDeduction('Cuchara', 4); }
          else if (pName.includes('Especialidad') || pName.includes('Especialista')) {
              if (item.notes.includes('Construpapas')) {
                  addDeduction('Hamburguesero', 1); addDeduction('Tenedor', 1);
              } else if (item.notes.includes('Obra Maestra')) {
                  addDeduction('Vaso Grande', 1); addDeduction('Tenedor', 1);
              }
          }
          else if (pName.includes('Esquite Chico')) { addDeduction('Vaso Chico', 1); addDeduction('Cuchara', 1); }
          else if (pName.includes('Esquite Mediano')) { addDeduction('Vaso Mediano', 1); addDeduction('Cuchara', 1); }
          else if (pName.includes('Esquite Grande')) { addDeduction('Vaso Grande', 1); addDeduction('Cuchara', 1); }
          else if (pName.includes('Construpapas')) { addDeduction('Hamburguesero', 1); addDeduction('Tenedor', 1); }
          else if (pName.includes('Obra Maestra')) { addDeduction('Vaso Grande', 1); addDeduction('Tenedor', 1); }
          else if (pName.includes('Don Maiztro')) { addDeduction('Hamburguesero', 1); addDeduction('Tenedor', 1); }
      });

      for (const [name, qty] of Object.entries(inventoryUpdates)) {
          await tx.inventoryItem.updateMany({
              where: { name },
              data: { stock: { decrement: qty } }
          });
      }

      return newOrder;
    });

    return NextResponse.json({ success: true, orderId: turnNumber });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error al procesar orden' }, { status: 500 });
  }
}
