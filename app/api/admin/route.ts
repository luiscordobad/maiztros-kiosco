import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const initialInventory = [
  { name: 'Chips Fuego', category: 'PAPAS', stock: 4, unit: 'pz' },
  { name: 'Chips Jalapeño', category: 'PAPAS', stock: 4, unit: 'pz' },
  { name: 'Chips Sal', category: 'PAPAS', stock: 6, unit: 'pz' },
  { name: 'Doritos Nacho', category: 'PAPAS', stock: 4, unit: 'pz' },
  { name: 'Tostitos Morados', category: 'PAPAS', stock: 6, unit: 'pz' },
  { name: 'Cheetos Flamin Hot', category: 'PAPAS', stock: 6, unit: 'pz' },
  { name: 'Takis Fuego', category: 'PAPAS', stock: 7, unit: 'pz' },
  { name: 'Takis Original', category: 'PAPAS', stock: 6, unit: 'pz' },
  { name: 'Runners', category: 'PAPAS', stock: 3, unit: 'pz' },
  { name: 'Tostitos Verdes', category: 'PAPAS', stock: 24, unit: 'pz' },
  { name: 'Pollo Picante', category: 'MARUCHAN', stock: 3, unit: 'pz' },
  { name: 'Carne de Res', category: 'MARUCHAN', stock: 6, unit: 'pz' },
  { name: 'Camarón, Limón y Habanero', category: 'MARUCHAN', stock: 24, unit: 'pz' },
  { name: 'Camarón y Piquín', category: 'MARUCHAN', stock: 2, unit: 'pz' },
  { name: 'Sprite', category: 'BEBIDA', stock: 9, unit: 'pz' },
  { name: 'Manzanita', category: 'BEBIDA', stock: 5, unit: 'pz' },
  { name: 'Coca Original', category: 'BEBIDA', stock: 3, unit: 'pz' },
  { name: 'Coca Zero', category: 'BEBIDA', stock: 12, unit: 'pz' },
  { name: 'Boing Manzana', category: 'BEBIDA', stock: 6, unit: 'pz' },
  { name: 'Boing Mango', category: 'BEBIDA', stock: 1, unit: 'pz' },
  { name: 'Boing Guayaba', category: 'BEBIDA', stock: 3, unit: 'pz' },
  { name: 'Boing Fresa', category: 'BEBIDA', stock: 3, unit: 'pz' },
  { name: 'Agua Mineral', category: 'BEBIDA', stock: 8, unit: 'pz' },
  { name: 'Agua Natural', category: 'BEBIDA', stock: 10, unit: 'pz' },
  { name: 'Vaso Chico', category: 'EMPAQUE', stock: 50, unit: 'pz' },
  { name: 'Vaso Mediano', category: 'EMPAQUE', stock: 50, unit: 'pz' },
  { name: 'Vaso Grande', category: 'EMPAQUE', stock: 50, unit: 'pz' },
  { name: 'Hamburguesero', category: 'EMPAQUE', stock: 50, unit: 'pz' },
  { name: 'Cuchara', category: 'EMPAQUE', stock: 100, unit: 'pz' },
  { name: 'Tenedor', category: 'EMPAQUE', stock: 100, unit: 'pz' },
  { name: 'Kilo de Elote', category: 'INSUMO', stock: 5, unit: 'kg' },
];

function categorizarPilar(nombre: string): string {
    const n = nombre.toLowerCase();
    if (n.includes('don maiztro') || n.includes('sabritas + maruchan')) return 'Don Maiztro';
    if (n.includes('obra maestra') || n.includes('maruchan + esquite')) return 'Obra Maestra';
    if (n.includes('construpapa') || n.includes('sabritas + esquite') || n.includes('papas + esquite')) return 'Construpapas';
    if (n.includes('esquite')) return 'Esquites';
    if (['agua', 'pepsi', 'coca', 'boing', '7up', 'manzanita', 'búho', 'refresco', 'jugo', 'fanta', 'sprite', 'mundet'].some(v => n.includes(v))) return 'Bebidas';
    if (['upgrade', 'extra', 'topping', 'ingrediente', 'aderezo'].some(v => n.includes(v))) return 'Extras/Upgrades';
    return 'Otros';
}

function determinarTamano(nombre: string): string {
    const n = nombre.toLowerCase();
    if (n.includes('chico') || n.includes('8 oz')) return 'Chico (8oz)';
    if (n.includes('mediano') || n.includes('12 oz')) return 'Mediano (12oz)';
    if (n.includes('grande') || n.includes('16 oz')) return 'Grande (16oz)';
    return 'N/A';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  if (searchParams.get('action') === 'kiosco_sync') {
    const inventoryItems = await prisma.inventoryItem.findMany();
    return NextResponse.json({ success: true, inventoryItems });
  }

  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  try {
    let startDate = new Date(); 
    let endDate = new Date(); 
    
    if (startDateParam && endDateParam) { 
      startDate = new Date(`${startDateParam}T00:00:00-06:00`); 
      endDate = new Date(`${endDateParam}T23:59:59-06:00`); 
    } else {
      startDate.setHours(0, 0, 0, 0); 
      endDate.setHours(23, 59, 59, 999); 
    }

    // Le quitamos el limitador (take:100) a clientes para que cruce correctamente la retención histórica
    const [products, modifiers, coupons, inventoryItems, orders, shifts, expenses, auditLogs, customers] = await Promise.all([
      prisma.product.findMany({ orderBy: { category: 'asc' } }),
      prisma.modifier.findMany({ orderBy: { type: 'asc' } }),
      prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.inventoryItem.findMany({ orderBy: { category: 'asc' } }),
      prisma.order.findMany({ where: { createdAt: { gte: startDate, lte: endDate } }, orderBy: { createdAt: 'asc' } }),
      prisma.shift.findMany({ where: { openedAt: { gte: startDate, lte: endDate } }, include: { orders: { where: { paymentMethod: 'EFECTIVO_CAJA', status: 'PAID' } }, movements: true }, orderBy: { openedAt: 'desc' } }),
      prisma.expense.findMany({ where: { date: { gte: startDate, lte: endDate } }, orderBy: { date: 'desc' } }),
      prisma.auditLog.findMany({ take: 50, orderBy: { createdAt: 'desc' } }),
      prisma.customer.findMany({ orderBy: { points: 'desc' } })
    ]);

    // ==========================================
    // PROCESAMIENTO DE BUSINESS INTELLIGENCE AVANZADO
    // ==========================================
    const biStats = {
        pilares: {} as Record<string, { qty: number, revenue: number }>,
        tamanosEsquites: {} as Record<string, number>,
        ticketAmounts: [] as number[],
        extrasTicketsCount: 0,
        prepTimeSum: 0,
        prepTimeCount: 0,
        pairs: {} as Record<string, number>,
        ordersNewVip: 0,
        ordersReturningVip: 0,
        ordersGeneral: 0
    };

    // Mapa de creación de clientes para saber si son nuevos hoy o ya existían
    const customerDateMap: Record<string, Date> = {};
    customers.forEach((c: any) => {
        customerDateMap[c.phone] = new Date(c.createdAt);
    });

    orders.forEach((order: any) => {
        if (order.status === 'REFUNDED') return;
        
        biStats.ticketAmounts.push(order.totalAmount);
        
        // 1. LEAD TIME (Eficiencia Operativa)
        if (order.status === 'COMPLETED' && order.updatedAt && order.createdAt) {
            const diffMins = (new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime()) / 60000;
            // Filtramos errores de dedo (menos de 1 minuto o más de 120 minutos que se les olvidó picarle)
            if (diffMins > 0 && diffMins < 120) {
                biStats.prepTimeSum += diffMins;
                biStats.prepTimeCount++;
            }
        }

        // 2. RETENCIÓN VIP (Tasa de clientes recurrentes)
        if (order.customerPhone) {
            const cDate = customerDateMap[order.customerPhone];
            if (cDate && cDate < startDate) {
                biStats.ordersReturningVip++; // El cliente ya existía antes de este filtro
            } else {
                biStats.ordersNewVip++; // El cliente se registró dentro de este filtro
            }
        } else {
            biStats.ordersGeneral++; // Cliente anónimo
        }

        let hasExtra = false;

        if (order.items) {
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            
            // 3. MATRIZ DE AFINIDAD (¿Qué se compra junto?)
            const prodNames = items.map((i:any) => i.product?.name).filter(Boolean);
            const uniquePNames = Array.from(new Set(pNames)) as string[]; // Solo contamos 1 vez por orden
            
            for(let i=0; i < uniquePNames.length; i++) {
                for(let j = i+1; j < uniquePNames.length; j++) {
                    const pair = [uniquePNames[i], uniquePNames[j]].sort().join(' + ');
                    biStats.pairs[pair] = (biStats.pairs[pair] || 0) + 1;
                }
            }

            items.forEach((item: any) => {
                const prodName = item.product?.name || 'Desconocido';
                const pilar = categorizarPilar(prodName);
                const tamano = determinarTamano(prodName);
                const qty = item.quantity || 1;
                const rev = item.totalPrice || 0;

                if (!biStats.pilares[pilar]) biStats.pilares[pilar] = { qty: 0, revenue: 0 };
                biStats.pilares[pilar].qty += qty;
                biStats.pilares[pilar].revenue += rev;

                if (pilar === 'Esquites' && tamano !== 'N/A') {
                    biStats.tamanosEsquites[tamano] = (biStats.tamanosEsquites[tamano] || 0) + qty;
                }
                if (pilar === 'Extras/Upgrades' || rev > (item.product?.basePrice * qty)) {
                    hasExtra = true;
                }
            });
        }
        if (hasExtra) biStats.extrasTicketsCount++;
    });

    let ticketModa = 0;
    if (biStats.ticketAmounts.length > 0) {
        const counts: Record<number, number> = {};
        let maxCount = 0;
        biStats.ticketAmounts.forEach(num => {
            counts[num] = (counts[num] || 0) + 1;
            if (counts[num] > maxCount) { maxCount = counts[num]; ticketModa = num; }
        });
    }

    const pilaresChart = Object.keys(biStats.pilares).map(k => ({ name: k, qty: biStats.pilares[k].qty, revenue: biStats.pilares[k].revenue })).sort((a,b)=>b.qty - a.qty);
    const tamanosChart = Object.keys(biStats.tamanosEsquites).map(k => ({ name: k, value: biStats.tamanosEsquites[k] }));
    const avgPrepTime = biStats.prepTimeCount > 0 ? (biStats.prepTimeSum / biStats.prepTimeCount) : 0;
    const topPairs = Object.keys(biStats.pairs).map(k => ({ name: k, qty: biStats.pairs[k] })).sort((a,b)=>b.qty - a.qty).slice(0, 5);

    return NextResponse.json({ 
        success: true, 
        products, modifiers, coupons, inventoryItems, orders, shifts, expenses, auditLogs, customers,
        biExtraStats: {
            pilaresChart,
            tamanosChart,
            ticketModa,
            extrasTicketsCount: biStats.extrasTicketsCount,
            avgPrepTime,
            topPairs,
            retention: { new: biStats.ordersNewVip, returning: biStats.ordersReturningVip, general: biStats.ordersGeneral }
        }
    });
  } catch (error) { 
      return NextResponse.json({ success: false, error: 'Error' }, { status: 500 }); 
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, type, isAvailable, isActive, newStock, addAmount, category, targetState, isModifier, author } = await request.json();
    
    if (type === 'init_inventory') { await prisma.inventoryItem.createMany({ data: initialInventory, skipDuplicates: true }); return NextResponse.json({ success: true }); }
    if (type === 'update_stock') { await prisma.inventoryItem.update({ where: { id }, data: { stock: parseFloat(newStock) } }); return NextResponse.json({ success: true }); }
    if (type === 'add_stock') { await prisma.inventoryItem.update({ where: { id }, data: { stock: { increment: parseFloat(addAmount) } } }); return NextResponse.json({ success: true }); }

    if (type === 'toggle_category') {
      if (isModifier) await prisma.modifier.updateMany({ where: { type: category }, data: { isAvailable: targetState } });
      else await prisma.product.updateMany({ where: { category: category }, data: { isAvailable: targetState } });
      await prisma.auditLog.create({ data: { action: 'CAMBIO_PANICO_CATEGORIA', details: `${category} set ${targetState}`, author: author || 'Luis' } });
      return NextResponse.json({ success: true });
    }

    if (type === 'inventory_toggle') {
      await prisma.inventoryItem.update({ where: { id }, data: { isAvailable } });
      await prisma.auditLog.create({ data: { action: 'CAMBIO_PANICO_INVENTARIO', details: `ID: ${id} set ${isAvailable}`, author: author || 'Luis' } });
    }

    if (type === 'product') {
        await prisma.product.update({ where: { id }, data: { isAvailable } });
        await prisma.auditLog.create({ data: { action: 'CAMBIO_PANICO_PRODUCTO', details: `ID: ${id} set ${isAvailable}`, author: author || 'Luis' } });
    }
    else if (type === 'modifier') {
        await prisma.modifier.update({ where: { id }, data: { isAvailable } });
        await prisma.auditLog.create({ data: { action: 'CAMBIO_PANICO_TOPPING', details: `ID: ${id} set ${isAvailable}`, author: author || 'Luis' } });
    }
    else if (type === 'coupon') await prisma.coupon.update({ where: { id }, data: { isActive } });
    
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ success: false }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const author = body.author || 'Luis (Admin)';
    
    if (body.type === 'expense') {
      await prisma.expense.create({
        data: { amount: parseFloat(body.amount), category: body.category, description: body.description }
      });
      await prisma.auditLog.create({ data: { action: 'NUEVO_GASTO', details: `$${body.amount} - ${body.description}`, author } });
      return NextResponse.json({ success: true });
    }

    if (body.type === 'audit') {
        await prisma.auditLog.create({ data: { action: body.action, details: body.details, author: body.author } });
        return NextResponse.json({ success: true });
    }

    await prisma.coupon.create({ data: { code: body.code.toUpperCase().trim(), discount: parseFloat(body.discount), discountType: body.discountType, minAmount: parseFloat(body.minAmount) || 0 } });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ success: false, error: 'Error en la petición' }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    const author = searchParams.get('author') || 'Luis (Admin)';

    if (id) {
      if (type === 'expense') {
          await prisma.expense.delete({ where: { id } });
          await prisma.auditLog.create({ data: { action: 'BORRAR_GASTO', details: `ID Gasto: ${id}`, author } });
      } else {
          await prisma.coupon.delete({ where: { id } });
      }
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false });
  } catch(e) { return NextResponse.json({ success: false }, { status: 500 }); }
}
