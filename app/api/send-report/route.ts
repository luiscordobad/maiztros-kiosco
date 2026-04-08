import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// ========================================================
// 1. PLANTILLA HTML PROFESIONAL PARA EL CORREO
// ========================================================
const generateEmailHTML = (data: any, title: string) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #18181b; color: #ffffff; padding: 30px; border-radius: 16px;">
      <h1 style="color: #facc15; text-align: center; font-size: 32px; margin-bottom: 0;">🌽 MAIZTROS</h1>
      <h2 style="color: #a1a1aa; text-align: center; margin-top: 5px; font-weight: normal;">${title}</h2>
      
      <div style="background-color: #27272a; padding: 15px; border-radius: 8px; margin-top: 30px; text-align: center;">
        <p style="margin: 0; color: #e4e4e7; font-size: 16px;"><strong>Periodo Evaluado:</strong><br/> ${data.startDate} al ${data.endDate}</p>
      </div>

      <h3 style="color: #4ade80; border-bottom: 1px solid #3f3f46; padding-bottom: 10px; margin-top: 30px;">💰 Resumen Financiero</h3>
      <ul style="list-style: none; padding: 0; font-size: 16px;">
          <li style="margin-bottom: 12px; display: flex; justify-content: space-between;">
            <span style="color: #a1a1aa;">Ingresos Brutos:</span> 
            <b style="color: #ffffff; float: right;">$${data.ventasNetas.toFixed(2)}</b>
          </li>
          <li style="margin-bottom: 12px; display: flex; justify-content: space-between;">
            <span style="color: #a1a1aa;">Gastos (Egresos):</span> 
            <b style="color: #f87171; float: right;">-$${data.gastosTotales.toFixed(2)}</b>
          </li>
          <li style="margin-top: 20px; padding-top: 15px; border-top: 1px dashed #3f3f46; font-size: 20px;">
            <span style="color: #ffffff;">Utilidad Neta:</span> 
            <b style="color: ${data.utilidadNeta >= 0 ? '#4ade80' : '#f87171'}; float: right;">$${data.utilidadNeta.toFixed(2)}</b>
          </li>
      </ul>

      <h3 style="color: #60a5fa; border-bottom: 1px solid #3f3f46; padding-bottom: 10px; margin-top: 40px;">🏆 Top 5 Productos Vendidos</h3>
      <ul style="padding-left: 0; list-style: none;">
          ${data.topProducts.map((p:any, i:number) => `
            <li style="margin-bottom: 10px; background-color: #27272a; padding: 10px 15px; border-radius: 8px;">
              <strong style="color: #71717a; margin-right: 10px;">#${i+1}</strong> 
              ${p.name} 
              <strong style="color: #facc15; float: right;">${p.qty} unds.</strong>
            </li>
          `).join('')}
      </ul>
      
      <p style="text-align: center; color: #52525b; font-size: 11px; margin-top: 50px;">
        Este es un reporte automático generado por el Kiosco Inteligente de Maiztros BI.
      </p>
    </div>
  `;
};

// ========================================================
// 2. POST: ENVÍO MANUAL DESDE EL PANEL DE ADMIN
// ========================================================
export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'maiztrosqro@gmail.com',
        pass: 'whyn dmeg vtnb ndll' // <-- REEMPLAZA ESTO
      }
    });

    const mailOptions = {
      from: '"Maiztros Admin" <maiztrosqro@gmail.com>',
      to: 'maiztrosqro@gmail.com',
      subject: `🌽 Reporte de Inteligencia Maiztros`,
      html: generateEmailHTML(data, 'Reporte Solicitado Manualmente')
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Error en envío manual:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ========================================================
// 3. GET: ENVÍO AUTOMÁTICO POR VERCEL (CRON JOBS)
// ========================================================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'DAILY'; // 'DAILY' o 'WEEKLY'

    // A) Configurar Fechas
    const end = new Date();
    end.setDate(end.getDate() - 1); // Ayer
    end.setHours(23, 59, 59, 999);

    const start = new Date(end);
    if (type === 'WEEKLY') {
      start.setDate(start.getDate() - 6); // Retrocede 6 días más (7 en total)
    }
    start.setHours(0, 0, 0, 0);

    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];

    // B) Consultar Base de Datos (Prisma)
    const [orders, expenses] = await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          status: { not: 'REFUNDED' } // Ignorar los cancelados
        }
      }),
      prisma.expense.findMany({
        where: {
          date: { gte: start, lte: end }
        }
      })
    ]);

    // C) Procesar Matemáticas
    const ventasNetas = orders.reduce((acc, o) => acc + o.totalAmount, 0);
    const gastosTotales = expenses.reduce((acc, e) => acc + e.amount, 0);
    const utilidadNeta = ventasNetas - gastosTotales;

    // D) Procesar Ranking de Productos
    const productVolume: any = {};
    orders.forEach((o: any) => {
      if(o.items) {
          const itemsArr = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
          itemsArr.forEach((item: any) => {
              const name = item.product?.name || 'Desconocido';
              productVolume[name] = (productVolume[name] || 0) + (item.quantity || 1);
          });
      }
    });
    
    const topProducts = Object.keys(productVolume)
      .map(name => ({ name, qty: productVolume[name] }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5); // Solo los mejores 5

    // E) Armar paquete de datos
    const reportData = {
      startDate: startDateStr,
      endDate: endDateStr,
      ventasNetas,
      gastosTotales,
      utilidadNeta,
      topProducts
    };

    const title = type === 'WEEKLY' ? 'Cierre de Operaciones Semanal' : 'Cierre de Operaciones Diario';

    // F) Enviar Correo
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'maiztrosqro@gmail.com',
        pass: 'whyn dmeg vtnb ndll' // <-- REEMPLAZA ESTO TAMBIÉN
      }
    });

    const mailOptions = {
      from: '"Maiztros Admin" <maiztrosqro@gmail.com>',
      to: 'maiztrosqro@gmail.com',
      subject: `🌽 ${title} | ${startDateStr}`,
      html: generateEmailHTML(reportData, title)
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true, message: `Reporte automático ${type} enviado exitosamente.` });

  } catch (error: any) {
    console.error("Error en Cron Job:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
