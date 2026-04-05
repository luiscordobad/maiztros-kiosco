import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');
  const code = searchParams.get('code');
  
  // 1. Validar Cupón
  if (code) {
    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon || !coupon.isActive) return NextResponse.json({ success: false, error: 'Cupón inválido o expirado' });
    return NextResponse.json({ success: true, coupon });
  }

  // 2. Traer perfil e historial de un cliente
  if (phone && phone.length === 10) {
    const customer = await prisma.customer.findUnique({ where: { phone } });
    const history = await prisma.order.findMany({
      where: { customerPhone: phone, status: { in: ['PAID', 'COMPLETED'] } },
      orderBy: { createdAt: 'desc' },
      take: 10 // Mostramos los últimos 10
    });
    return NextResponse.json({ success: true, points: customer?.points || 0, name: customer?.name || '', history });
  }

  return NextResponse.json({ success: false });
}
