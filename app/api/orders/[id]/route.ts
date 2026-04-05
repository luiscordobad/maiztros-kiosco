import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const order = await prisma.order.findFirst({
      where: { turnNumber: params.id } // Busca por ejemplo: M492
    });
    if (!order) return NextResponse.json({ success: false, error: 'No encontrado' });
    return NextResponse.json({ success: true, order });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
