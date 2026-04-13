// @ts-nocheck
/* eslint-disable */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const turnNumber = 'M' + Math.floor(100 + Math.random() * 900).toString();
    
    const safeOrderType = data.isPickToGo ? 'TAKEOUT' : (data.orderType || 'DINE_IN');
    const initialStatus = data.isPickToGo ? 'AWAITING_PAYMENT' : (data.paymentMethod === 'TERMINAL' ? 'PAID' : 'AWAITING_PAYMENT');

    // 🛡️ ESCUDO ANTI-ERROR: Empaquetamos todo en las notas para no romper la BD
    const extraInfo = [
      data.pickupTime ? `⏰ RECOGE: ${data.pickupTime}` : null,
      data.customerEmail ? `📧 CORREO: ${data.customerEmail}` : null,
      data.orderNotes ? `📝 NOTAS: ${data.orderNotes}` : null
    ].filter(Boolean).join(' | ');

    const order = await prisma.$transaction(async (tx) => {
      const activeShift = await tx.shift.findFirst({ where: { status: 'OPEN' } });
      
      const newOrder = await tx.order.create({
        data: {
          turnNumber,
          customerName: data.customerName || 'Cliente',
          customerPhone: data.customerPhone || null,
          orderType: safeOrderType,
          paymentMethod: data.paymentMethod,
          items: JSON.stringify(data.cart || []), 
          orderNotes: extraInfo, // <--- Aquí guardamos todo lo nuevo de forma segura
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

      // MOTOR DE INVENTARIO
      const inventoryUpdates: Record<string, number> = {};
      const addDeduction = (name: string, qty: number) => { if (!name) return; inventoryUpdates[name] = (inventoryUpdates[name] || 0) + qty; };
      (data.cart || []).forEach((item: any) => {
          const pName = item.product.name || '';
          if (item.notes) {
              const notesArray = item.notes.split(' | ');
              notesArray.forEach((note: string) => {
                  if (note.includes('Bolsa de Papas:')) addDeduction(note.split(': ')[1].trim(), 1);
                  if (note.includes('Sabor de Maruchan:')) addDeduction(note.split(': ')[1].trim(), 1);
                  if (note.includes('Tu Sabor:')) addDeduction(note.split(': ')[1].trim(), 1);
                  if (note.includes('Tu Bebida:') || note.includes('Bebida 1:') || note.includes('Bebida 2:') || note.includes('Bebida 3:') || note.includes('Bebida 4:')) addDeduction(note.split(': ')[1].trim(), 1);
              });
          }
          if (pName.includes('Esquite Chico')) { addDeduction('Vaso Chico', 1); addDeduction('Cuchara', 1); }
          else if (pName.includes('Esquite Mediano')) { addDeduction('Vaso Mediano', 1); addDeduction('Cuchara', 1); }
          else if (pName.includes('Esquite Grande')) { addDeduction('Vaso Grande', 1); addDeduction('Cuchara', 1); }
      });
      for (const [name, qty] of Object.entries(inventoryUpdates)) {
          await tx.inventoryItem.updateMany({ where: { name }, data: { stock: { decrement: qty } } });
      }
      return newOrder;
    });

    if (data.isPickToGo) {
        const preference = new Preference(client);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://maiztros.vercel.app';
        const result = await preference.create({
            body: {
                items: data.cart.map((item: any) => ({ title: item.product.name, quantity: 1, unit_price: Number(item.totalPrice), currency_id: 'MXN' })),
                payer: { name: data.customerName, email: data.customerEmail },
                back_urls: { success: `${baseUrl}/pedir?status=approved&order_id=${order.id}` },
                auto_return: 'approved',
                external_reference: order.id, 
            }
        });
        return NextResponse.json({ success: true, turnNumber: order.turnNumber, preferenceId: result.id });
    }
    return NextResponse.json({ success: true, turnNumber: order.turnNumber });
  } catch (error: any) {
    console.error("🔥 ERROR EN CHECKOUT:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
