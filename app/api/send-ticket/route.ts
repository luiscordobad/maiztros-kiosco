import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, orderUrl, turnNumber } = await req.json();

    if (!email || !orderUrl) {
        return NextResponse.json({ success: false, error: "Faltan datos." }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'maiztrosqro@gmail.com',
        pass: 'whyn dmeg vtnb ndll' // <-- RECUERDA PONER TU CLAVE DE 16 LETRAS
      }
    });

    const mailOptions = {
      from: '"Maiztros" <maiztrosqro@gmail.com>',
      to: email,
      subject: `🌽 Tu Ticket de Compra - Maiztros (#${turnNumber})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #18181b; color: #ffffff; padding: 30px; border-radius: 16px;">
          <h1 style="color: #facc15; text-align: center; font-size: 32px; margin-bottom: 0;">🌽 MAIZTROS</h1>
          <h2 style="color: #a1a1aa; text-align: center; margin-top: 5px; font-weight: normal;">¡Gracias por tu compra!</h2>

          <div style="background-color: #27272a; padding: 20px; border-radius: 8px; margin-top: 30px; text-align: center;">
            <p style="margin: 0; color: #e4e4e7; font-size: 18px;">Tu número de turno es:</p>
            <p style="margin: 10px 0 0 0; color: #facc15; font-size: 48px; font-weight: bold; font-style: italic;">#${turnNumber}</p>
          </div>

          <p style="text-align: center; font-size: 16px; margin-top: 30px;">
            Puedes ver el detalle de tu orden y descargar tu recibo haciendo clic en el siguiente enlace:
          </p>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${orderUrl}" style="background-color: #facc15; color: #18181b; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 8px; font-size: 18px; display: inline-block;">Ver mi Ticket Digital</a>
          </div>

          <p style="text-align: center; color: #52525b; font-size: 12px; margin-top: 50px;">
            Si tienes alguna duda con tu orden, responde a este correo. ¡Esperamos verte pronto!
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Error enviando ticket:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
