import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');

  if (!phone) return NextResponse.json({ success: false, error: 'Teléfono requerido' }, { status: 400 });

  try {
    const customer = await prisma.customer.findUnique({
      where: { phone }
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: 'No encontrado' });
    }

    // Traemos su historial de órdenes pagadas
    const history = await prisma.order.findMany({
      where: { customerPhone: phone, status: { not: 'REFUNDED' } },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Traemos cupones activos para la sección de promociones
    const activeCoupons = await prisma.coupon.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, ...customer, history, activeCoupons });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error de servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, firstName, lastName, email } = body;

    if (!phone || phone.length !== 10) return NextResponse.json({ success: false, error: 'Teléfono inválido' });

    const fullName = `${firstName} ${lastName}`.trim();

    const newCustomer = await prisma.customer.upsert({
      where: { phone },
      update: { name: fullName }, // Si ya existía, actualiza su nombre
      create: { 
        phone, 
        name: fullName,
        points: 50 // ¡Bono de bienvenida de 50 pts por registrarse!
      }
    });

    return NextResponse.json({ success: true, customer: newCustomer });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error al registrar' }, { status: 500 });
  }
}
