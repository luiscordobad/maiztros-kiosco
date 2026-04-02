import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { amount, description } = await request.json();
    const token = process.env.MP_ACCESS_TOKEN;

    // 1. Buscar TODAS las terminales en tu cuenta
    const devicesRes = await fetch('https://api.mercadopago.com/point/integration-api/devices', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const devicesData = await devicesRes.json();
    
    // 2. FRANCOTIRADOR: Buscar exactamente la terminal asignada a tu caja y que esté en PDV
    // Si la caja no coincide, busca al menos la que esté en PDV.
    let terminal = devicesData.devices?.find((d: any) => d.external_pos_id === 'CAJA_KIOSCO_1' && d.operating_mode === 'PDV');
    
    // Fallback: Si no la encuentra por nombre exacto, agarra la primera PDV que vea
    if (!terminal) {
       terminal = devicesData.devices?.find((d: any) => d.operating_mode === 'PDV');
    }

    if (!terminal) {
      return NextResponse.json({ success: false, error: 'No se encontró tu Smart 2. Revisa que esté encendida y en modo PDV.' }, { status: 400 });
    }

    // 3. Mandar el cobro a la terminal física
    const intentRes = await fetch(`https://api.mercadopago.com/point/integration-api/devices/${terminal.id}/payment-intents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amount,
        description: description,
        payment: { installments: 1, type: "credit_card", installments_cost: "seller" },
        additional_info: { print_on_terminal: false } 
      })
    });
    
    const intentData = await intentRes.json();
    
    if (intentData.error) {
       return NextResponse.json({ success: false, error: 'La terminal rechazó la conexión. ¿Está encendida?' }, { status: 400 });
    }

    return NextResponse.json({ success: true, intentId: intentData.id });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error interno conectando a Mercado Pago' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const intentId = searchParams.get('intentId');
    const token = process.env.MP_ACCESS_TOKEN;

    const res = await fetch(`https://api.mercadopago.com/point/integration-api/payment-intents/${intentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    return NextResponse.json({ state: data.state, paymentStatus: data.payment?.state });
  } catch (error) {
    return NextResponse.json({ state: 'ERROR' }, { status: 500 });
  }
}
