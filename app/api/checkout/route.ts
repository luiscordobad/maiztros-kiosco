import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// 🌟 LLAVE PRIVADA INYECTADA (Mercado Pago)
const client = new MercadoPagoConfig({ accessToken: 'APP_USR-7607374029647293-041312-d7d3cbecd760de7cb5a7514f68fa2190-3308548083' });

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Calculamos el turno (M + 3 dígitos)
    const turnNumber = 'M' + Math.floor(100 + Math.random() * 900).toString();
    
    // Si es "Pick To Go" online, forzamos que inicie en AWAITING_PAYMENT hasta que MP avise.
    // Si es en el kiosco físico y elige "Terminal", lo mandamos como PAID (porque ya la terminal de la sucursal lo aprobó).
    const isOnlinePayment = data.orderType === 'PICK_TO_GO' && data.paymentMethod === 'TERMINAL';
    const initialStatus = isOnlinePayment ? 'AWAITING_PAYMENT' : (data.paymentMethod === 'TERMINAL' ? 'PAID' : 'AWAITING_PAYMENT');

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
          items: JSON.stringify(data.cart || []), // Aseguramos formato JSON string
          orderNotes: data.orderNotes || '',
          totalAmount: data.totalAmount, 
          pointsDiscount: data.pointsDiscount || 0, 
          couponCode: data.couponCode || null,
          tipAmount: data.tipAmount || 0,
          pickupTime: data.pickupTime || null, // 🌟 Agregado para Pick to Go
          status: initialStatus,
          shiftId: activeShift?.id || null 
        }
      });

      // MANEJO DE PUNTOS VIP
      if (data.customerPhone && data.customerPhone.length === 10) {
         const earnedPoints = data.totalAmount; 
         const pointsToDeduct = data.pointsDeducted || 0; 

         await tx.customer.upsert({
           where: { phone: data.customerPhone },
           update: { name: data.customerName, points: { increment: earnedPoints - pointsToDeduct } },
           create: { phone: data.customerPhone, name: data.customerName, points: earnedPoints }
         });
      }

      // MOTOR DE DEDUCCIÓN INTELIGENTE DE INVENTARIO
      const inventoryUpdates: Record<string, number> = {};
      const addDeduction = (name: string, qty: number) => {
          if (!name) return;
          inventoryUpdates[name] = (inventoryUpdates[name] || 0) + qty;
      };

      (data.cart || []).forEach((item: any) => {
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
              if (item.notes && item.notes.includes('Construpapas')) {
                  addDeduction('Hamburguesero', 1); addDeduction('Tenedor', 1);
              } else if (item.notes && item.notes.includes('Obra Maestra')) {
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

    // 🌟 INTEGRACIÓN MERCADO PAGO ONLINE (Pick To Go)
    if (isOnlinePayment) {
        const preference = new Preference(client);

        const itemsForMP = data.cart.map((item: any) => ({
            id: item.product.id || 'ITEM',
            title: item.product.name,
            quantity: 1,
            unit_price: item.totalPrice,
            currency_id: 'MXN'
        }));

        if (data.pointsDiscount > 0 && itemsForMP.length > 0) {
            itemsForMP[0].unit_price = Math.max(0, itemsForMP[0].unit_price - data.pointsDiscount);
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://maiztros.vercel.app';

        const result = await preference.create({
            body: {
                items: itemsForMP,
                payer: {
                    name: data.customerName || 'Cliente',
                    email: data.customerEmail || 'cliente@maiztros.com',
                },
                back_urls: {
                    success: `${baseUrl}/pedir?status=approved&order_id=${order.id}`,
                    failure: `${baseUrl}/pedir?status=failure`,
                    pending: `${baseUrl}/pedir?status=pending`,
                },
                auto_return: 'approved',
                notification_url: `${baseUrl}/api/webhooks/mercadopago`, 
                external_reference: order.id, 
            }
        });

        // Retornamos el success con el ID de preferencia para abrir el Widget en la Web
        return NextResponse.json({ 
            success: true, 
            orderId: order.id, 
            turnNumber,
            preferenceId: result.id 
        });
    }

    // Retorno normal para Kiosco Físico o Pago en Efectivo
    return NextResponse.json({ success: true, orderId: order.id, turnNumber });

  } catch (error: any) {
    console.error("Error en checkout:", error);
    return NextResponse.json({ success: false, error: 'Error al procesar orden' }, { status: 500 });
  }
}
