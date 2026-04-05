import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Órdenes en preparación
    const preparing = await prisma.order.findMany({
      where: { status: 'PAID' },
      orderBy: { createdAt: 'asc' }
    });

    // Órdenes despachadas en los últimos 15 minutos
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60000);
    const ready = await prisma.order.findMany({
      where: { status: 'COMPLETED', updatedAt: { gte: fifteenMinsAgo } },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ success: true, preparing, ready });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
