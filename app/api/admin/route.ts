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
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  try {
    const products = await prisma.product.findMany({ orderBy: { category: 'asc' } });
    const modifiers = await prisma.modifier.findMany({ orderBy: { type: 'asc' } });
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    const inventoryItems = await prisma.inventoryItem.findMany({ orderBy: { category: 'asc' } });

    let startDate = new Date(); startDate.setHours(0, 0, 0, 0); 
    let endDate = new Date(); endDate.setHours(23, 59, 59, 999); 
    if (startDateParam && endDateParam) { startDate = new Date(startDateParam); endDate = new Date(endDateParam); endDate.setHours(23, 59, 59, 999); }

    const orders = await prisma.order.findMany({ where: { createdAt: { gte: startDate, lte: endDate } }, orderBy: { createdAt: 'desc' } });
    const shifts = await prisma.shift.findMany({ where: { openedAt: { gte: startDate, lte: endDate } }, include: { orders: { where: { paymentMethod: 'EFECTIVO_CAJA', status: 'PAID' } }, movements: true }, orderBy: { openedAt: 'desc' } });

    return NextResponse.json({ success: true, products, modifiers, coupons, inventoryItems, orders, shifts });
  } catch (error) { return NextResponse.json({ success: false, error: 'Error' }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const { id, type, isAvailable, isActive, newStock, addAmount, category, targetState, isModifier } = await request.json();
    
    if (type === 'init_inventory') { await prisma.inventoryItem.createMany({ data: initialInventory, skipDuplicates: true }); return NextResponse.json({ success: true }); }
    if (type === 'update_stock') { await prisma.inventoryItem.update({ where: { id }, data: { stock: parseFloat(newStock) } }); return NextResponse.json({ success: true }); }
    if (type === 'add_stock') { await prisma.inventoryItem.update({ where: { id }, data: { stock: { increment: parseFloat(addAmount) } } }); return NextResponse.json({ success: true }); }

    // NUEVO: APAGAR/PRENDER CATEGORÍAS COMPLETAS
    if (type === 'toggle_category') {
      if (isModifier) await prisma.modifier.updateMany({ where: { type: category }, data: { isAvailable: targetState } });
      else await prisma.product.updateMany({ where: { category: category }, data: { isAvailable: targetState } });
      return NextResponse.json({ success: true });
    }

    if (type === 'product') await prisma.product.update({ where: { id }, data: { isAvailable } });
    else if (type === 'modifier') await prisma.modifier.update({ where: { id }, data: { isAvailable } });
    else if (type === 'coupon') await prisma.coupon.update({ where: { id }, data: { isActive } });
    
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ success: false }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const { code, discount, discountType, minAmount } = await request.json();
    await prisma.coupon.create({ data: { code: code.toUpperCase().trim(), discount: parseFloat(discount), discountType, minAmount: parseFloat(minAmount) || 0 } });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ success: false, error: 'El cupón ya existe o es inválido' }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (id) {
      await prisma.coupon.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false });
  } catch(e) { return NextResponse.json({ success: false }, { status: 500 }); }
}
