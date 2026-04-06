import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Buscar si hay un turno abierto
    const activeShift = await prisma.shift.findFirst({
      where: { status: 'OPEN' },
      include: { orders: true }
    });
    return NextResponse.json({ success: true, shift: activeShift });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { openedBy, startingCash } = await request.json();
    
    // Validar que no haya otro turno abierto
    const existing = await prisma.shift.findFirst({ where: { status: 'OPEN' } });
    if (existing) return NextResponse.json({ success: false, error: 'Ya hay un turno abierto' });

    const newShift = await prisma.shift.create({
      data: { openedBy, startingCash: parseFloat(startingCash), status: 'OPEN' }
    });
    return NextResponse.json({ success: true, shift: newShift });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { shiftId, reportedCash } = await request.json();
    
    await prisma.shift.update({
      where: { id: shiftId },
      data: { reportedCash: parseFloat(reportedCash), status: 'CLOSED', closedAt: new Date() }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
