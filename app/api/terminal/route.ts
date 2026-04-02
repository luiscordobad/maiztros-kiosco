import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { amount } = await request.json();
    const token = process.env.MP_ACCESS_TOKEN;

    const devicesRes = await fetch('https://api.mercadopago.com/point/integration-api/devices', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const devicesData = await devicesRes.json();
    
    let terminal = devicesData.devices?.find((d: any) => d.external_pos_id === 'CAJA_KIOSCO_1' && d.operating_mode === 'PDV');
    if (!terminal) {
       terminal = devicesData.devices?.find((d: any) => d.operating_mode === 'PDV');
    }

    if (!terminal) {
      return NextResponse.json({ success: false, error: 'No se encontró tu Smart 2 en modo PDV.' }, { status: 400 });
    }

    // CONVERSIÓN DE PESOS A CENTAVOS
    // Multiplicamos por 100 y redondeamos para evitar fracciones de centavo (ej. $180.50 -> 18050)
    const amountInCents = Math.round(amount * 100);

    const intentRes = await fetch(`https://api.mercadopago.com/point/integration-api/devices/${terminal.id}/payment-intents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountInCents,
        additional_info: {
          external_reference: "Kiosco_Maiztros",
          print_on_terminal: false
        }
      })
    });
    
    const intentData = await intentRes.json();
    
    if (!intentRes.ok || intentData.error) {
       return NextResponse.json({ 
         success: false, 
         error: `MERCADO PAGO DICE: ${intentData.message || intentData.error || 'Error desconocido'}` 
       }, { status: 400 });
    }

    return NextResponse.json({ success: true, intentId: intentData.id });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error interno del servidor.' }, { status: 500 });
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
