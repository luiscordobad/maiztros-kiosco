import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { amount, description } = await request.json();
    const token = process.env.MP_ACCESS_TOKEN;

    // 1. Buscar la terminal en tu cuenta
    const devicesRes = await fetch('https://api.mercadopago.com/point/integration-api/devices', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const devicesData = await devicesRes.json();
    
    // Buscamos la terminal que esté encendida en modo PDV
    const terminal = devicesData.devices?.find((d: any) => d.operating_mode === 'PDV');

    if (!terminal) {
      return NextResponse.json({ success: false, error: 'No se encontró ninguna terminal encendida en Modo PDV.' }, { status: 400 });
    }

    // 2. Mandar el cobro a la terminal física
    const intentRes = await fetch(`https://api.mercadopago.com/point/integration-api/devices/${terminal.id}/payment-intents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amount,
        description: description,
        payment: { installments: 1, type: "credit_card", installments_cost: "seller" },
        additional_info: { print_on_terminal: false } // No imprimimos papel, mandamos el digital
      })
    });
    
    const intentData = await intentRes.json();
    return NextResponse.json({ success: true, intentId: intentData.id });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error interno conectando a Mercado Pago' }, { status: 500 });
  }
}

// Esta función pregunta el estado del cobro cada 3 segundos
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
