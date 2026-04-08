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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  if (searchParams.get('action') === 'kiosco_sync') {
    const inventoryItems = await prisma.inventoryItem.findMany();
    return NextResponse.json({ success: true, inventoryItems });
  }

  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  try {
    // 1. FILTRO DE FECHAS ESTRICTO
    let startDate = new Date(); startDate.setHours(0, 0, 0, 0); 
    let endDate = new Date(); endDate.setHours(23, 59, 59, 999); 
    
    if (startDateParam && endDateParam) { 
      startDate = new Date(`${startDateParam}T00:00:00Z`); 
      endDate = new Date(`${endDateParam}T23:59:59Z`); 
    }

    const [products, modifiers, coupons, inventoryItems, orders, shifts, expenses, auditLogs, customers] = await Promise.all([
      prisma.product.findMany({ orderBy: { category: 'asc' } }),
      prisma.modifier.findMany({ orderBy: { type: 'asc' } }),
      prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.inventoryItem.findMany({ orderBy: { category: 'asc' } }),
      prisma.order.findMany({ where: { createdAt: { gte: startDate, lte: endDate } }, orderBy: { createdAt: 'asc' } }),
      prisma.shift.findMany({ where: { openedAt: { gte: startDate, lte: endDate } }, include: { orders: { where: { paymentMethod: 'EFECTIVO_CAJA', status: 'PAID' } }, movements: true }, orderBy: { openedAt: 'desc' } }),
      prisma.expense.findMany({ where: { date: { gte: startDate, lte: endDate } }, orderBy: { date: 'desc' } }),
      prisma.auditLog.findMany({ take: 50, orderBy: { createdAt: 'desc' } }),
      prisma.customer.findMany({ orderBy: { points: 'desc' }, take: 100 })
    ]);

    // =========================================================
    // 2. LÓGICA DE BI (TOPPINGS Y DÍAS DE LA SEMANA) AÑADIDA
    // =========================================================
    const toppingStats: any = {};
    const dayStats: any = { 
      '1 Lunes': 0, '2 Martes': 0, '3 Miércoles': 0, '4 Jueves': 0, 
      '5 Viernes': 0, '6 Sábado': 0, '7 Domingo': 0 
    };
    
    const daysMap = ['7 Domingo', '1 Lunes', '2 Martes', '3 Miércoles', '4 Jueves', '5 Viernes', '6 Sábado'];

    orders.forEach((order: any) => {
      if (order.status === 'REFUNDED') return;

      // A) Ventas por Día de la Semana
      const dayName = daysMap[new Date(order.createdAt).getDay()];
      dayStats[dayName] = (dayStats[dayName] || 0) + order.totalAmount;

      // B) Contabilidad de Toppings Extraídos de las notas
      if (order.items) {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        items.forEach((item: any) => {
          if (item.notes) {
            // Separador flexible por si vienen divididos por barra o coma
            const ingredients = item.notes.split(/[|,]/);
            ingredients.forEach((ing: string) => {
              const cleanIng = ing.split(':')[1]?.trim() || ing.trim();
              if (cleanIng && cleanIng !== 'Natural') {
                toppingStats[cleanIng] = (toppingStats[cleanIng] || 0) + (item.quantity || 1);
              }
            });
          }
        });
      }
    });

    // Formateamos para las gráficas
    const topToppings = Object.keys(toppingStats)
      .map(name => ({ name, qty: toppingStats[name] }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    const chartDayData = Object.keys(dayStats).map(day => ({ day, Ventas: dayStats[day] }));

    return NextResponse.json({ 
        success: true, 
        products, 
        modifiers, 
        coupons, 
        inventoryItems, 
        orders, 
        shifts, 
        expenses, 
        auditLogs, 
        customers,
        topToppings,     // <-- Añadido
        chartDayData     // <-- Añadido
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
