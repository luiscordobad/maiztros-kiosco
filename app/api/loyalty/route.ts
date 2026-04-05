import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');
  
  if (!phone || phone.length !== 10) return NextResponse.json({ success: false });

  try {
    const customer = await prisma.customer.findUnique({ where: { phone } });
    return NextResponse.json({ 
      success: true, 
      points: customer?.points || 0, 
      name: customer?.name || '' 
    });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
