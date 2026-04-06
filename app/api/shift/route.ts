import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const activeShift = await prisma.shift.findFirst({
      where: { status: 'OPEN' },
      include: { 
        orders: { where: { paymentMethod: 'EFECTIVO_CAJA', status: 'PAID' } },
        movements: true
      }
    });
    return NextResponse.json({ success: true, shift: activeShift });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Si la petición trae un 'type', es un movimiento de efectivo (Retiro)
    if (body.type) {
      const movement = await prisma.cashMovement.create({
        data: { 
          shiftId: body.shiftId, 
          type: body.type, 
          amount: parseFloat(body.amount), 
          reason: body.reason 
        }
      });
      return NextResponse.json({ success: true, movement });
    }

    // Si no, es apertura de turno
    const existing = await prisma.shift.findFirst({ where: { status: 'OPEN' } });
    if (existing) return NextResponse.json({ success: false, error: 'Turno ya abierto' });

    const newShift = await prisma.shift.create({
      data: { openedBy: body.openedBy, startingCash: parseFloat(body.startingCash), status: 'OPEN' }
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
