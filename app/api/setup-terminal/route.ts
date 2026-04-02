import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const token = process.env.MP_ACCESS_TOKEN;

    // PASO 1: Obtener el ID real de la terminal (Tipo__Serial)
    const listRes = await fetch('https://api.mercadopago.com/terminals/v1/list?limit=50', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      }
    });
    const listData = await listRes.json();
    
    const terminal = listData.data?.terminals?.[0];

    if (!terminal) {
      return NextResponse.json({ error: 'No se encontraron terminales vinculadas a tu cuenta.' });
    }

    const terminalId = terminal.id;

    // PASO 2: Forzar la activación del modo PDV vía API
    const setupRes = await fetch('https://api.mercadopago.com/terminals/v1/setup', {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        terminals: [
          {
            id: terminalId,
            operating_mode: 'PDV'
          }
        ]
      })
    });

    const setupData = await setupRes.json();

    return NextResponse.json({
      mensaje: 'Proceso de activación completado',
      terminalEncontrada: terminalId,
      estadoActual: terminal.operating_mode,
      resultadoSetup: setupData
    });

  } catch (error) {
    return NextResponse.json({ error: 'Error en el proceso de activación' }, { status: 500 });
  }
}
