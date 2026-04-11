import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'maiztrosqro@gmail.com',
    pass: 'whyn dmeg vtnb ndll' // <-- RECUERDA PONER TU CLAVE DE 16 LETRAS AQUÍ
  }
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'daily'; // 'daily' o 'weekly'

    // =========================================================================
    // LÓGICA 1: REPORTE DIARIO (Se dispara silenciosamente al cerrar la caja)
    // =========================================================================
    if (type === 'daily') {
        // 1. Buscar el turno MÁS RECIENTE que acaba de ser cerrado
        const lastShift = await prisma.shift.findFirst({
            where: { closedAt: { not: null } },
            orderBy: { closedAt: 'desc' },
            include: { movements: true }
        });

        if (!lastShift) return NextResponse.json({ error: "No hay turnos cerrados" }, { status: 400 });

        // Extraer horas exactas en horario de México
        const openedAt = new Date(lastShift.openedAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
        const closedAt = new Date(lastShift.closedAt!).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

        // 2. Buscar todas las órdenes de ese turno exacto
        const orders = await prisma.order.findMany({
            where: {
                createdAt: { gte: lastShift.openedAt, lte: lastShift.closedAt! },
                status: { not: 'REFUNDED' }
            }
        });

        const ventasEfectivo = orders.filter(o => o.paymentMethod === 'EFECTIVO_CAJA').reduce((acc, o) => acc + o.totalAmount, 0);
        const ventasTarjeta = orders.filter(o => o.paymentMethod === 'TERMINAL').reduce((acc, o) => acc + o.totalAmount, 0);
        const propinas = orders.reduce((acc, o) => acc + (o.tipAmount || 0), 0);
        const totalVentas = ventasEfectivo + ventasTarjeta;
        
        const retiros = lastShift.movements.filter(m => m.type === 'OUT').reduce((acc, m) => acc + m.amount, 0);
        const esperadoEnCaja = (lastShift.startingCash || 0) + ventasEfectivo + propinas - retiros;
        const diferencia = (lastShift.reportedCash || 0) - esperadoEnCaja;

        // 3. Top Productos vendidos en ese turno
        const productsMap: any = {};
        orders.forEach(o => {
            if(o.items) {
                const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
                items.forEach((i:any) => {
                    const name = i.product?.name || 'Varios';
                    productsMap[name] = (productsMap[name] || 0) + (i.quantity || 1);
                });
            }
        });
        const topProducts = Object.keys(productsMap).map(k => ({ name: k, qty: productsMap[k] })).sort((a,b)=>b.qty - a.qty).slice(0,5);

        // 4. Armar el correo
        const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #18181b; color: #ffffff; padding: 30px; border-radius: 16px;">
            <h1 style="color: #facc15; text-align: center; margin-bottom: 0;">🌽 CORTE DE CAJA DIARIO</h1>
            <p style="text-align: center; color: #a1a1aa; margin-top: 5px;">Reporte Automático de Operación</p>

            <div style="background-color: #27272a; padding: 20px; border-radius: 12px; margin-top: 30px; border-left: 5px solid #3b82f6;">
                <h3 style="margin: 0 0 15px 0; color: #60a5fa;">⏱️ Reloj Checador y Asistencia</h3>
                <p style="margin: 5px 0;"><strong>Cajero Responsable:</strong> ${lastShift.openedBy}</p>
                <p style="margin: 5px 0;"><strong>Hora de Entrada (Apertura):</strong> ${openedAt}</p>
                <p style="margin: 5px 0; color: #f87171;"><strong>Hora de Salida (Cierre):</strong> ${closedAt}</p>
            </div>

            <div style="background-color: #27272a; padding: 20px; border-radius: 12px; margin-top: 20px; border-left: 5px solid #4ade80;">
                <h3 style="margin: 0 0 15px 0; color: #4ade80;">💵 Resumen Financiero</h3>
                <p style="margin: 5px 0; display: flex; justify-content: space-between;"><span>Fondo Inicial:</span> <b>$${lastShift.startingCash?.toFixed(2)}</b></p>
                <p style="margin: 5px 0; display: flex; justify-content: space-between;"><span>Ventas Efectivo:</span> <b>+$${ventasEfectivo.toFixed(2)}</b></p>
                <p style="margin: 5px 0; display: flex; justify-content: space-between;"><span>Ventas Tarjeta:</span> <b>+$${ventasTarjeta.toFixed(2)}</b></p>
                <p style="margin: 5px 0; display: flex; justify-content: space-between;"><span>Propinas Totales:</span> <b style="color:#f472b6;">+$${propinas.toFixed(2)}</b></p>
                <p style="margin: 5px 0; display: flex; justify-content: space-between;"><span>Retiros/Gastos:</span> <b style="color:#f87171;">-$${retiros.toFixed(2)}</b></p>
                <hr style="border: 1px dashed #3f3f46; margin: 15px 0;" />
                <h2 style="margin: 0; display: flex; justify-content: space-between;"><span>Total Ventas:</span> <b>$${totalVentas.toFixed(2)}</b></h2>
            </div>

            <div style="background-color: #27272a; padding: 20px; border-radius: 12px; margin-top: 20px; border-left: 5px solid #facc15;">
                <h3 style="margin: 0 0 15px 0; color: #facc15;">⚖️ Auditoría Física de Billetes</h3>
                <p style="margin: 5px 0; display: flex; justify-content: space-between;"><span>Sistema Espera:</span> <b>$${esperadoEnCaja.toFixed(2)}</b></p>
                <p style="margin: 5px 0; display: flex; justify-content: space-between;"><span>Cajero Entregó:</span> <b>$${(lastShift.reportedCash || 0).toFixed(2)}</b></p>
                <h3 style="margin: 15px 0 0 0; text-align: right; color: ${diferencia < -0.5 ? '#f87171' : '#4ade80'};">
                    Diferencia: ${diferencia < -0.5 ? `FALTA $${Math.abs(diferencia).toFixed(2)}` : `SOBRA $${diferencia.toFixed(2)}`}
                </h3>
            </div>

            <h3 style="color: #a855f7; margin-top: 30px; border-bottom: 1px solid #3f3f46; padding-bottom: 10px;">🏆 Top 5 Productos del Turno</h3>
            <ul style="list-style: none; padding: 0;">
                ${topProducts.map(p => `<li style="background: #27272a; margin-bottom: 5px; padding: 10px; border-radius: 8px; display: flex; justify-content: space-between;"><span>${p.name}</span> <b>${p.qty} unds</b></li>`).join('')}
            </ul>
            <p style="text-align: center; color: #52525b; font-size: 11px; margin-top: 40px;">Enviado por Maiztros Automations</p>
        </div>`;

        await transporter.sendMail({
            from: '"Maiztros Bot" <maiztrosqro@gmail.com>',
            to: 'maiztrosqro@gmail.com',
            subject: `🌽 Corte de Caja: ${lastShift.openedBy} | Diferencia: $${diferencia.toFixed(2)}`,
            html
        });

        return NextResponse.json({ success: true, message: "Reporte diario enviado" });
    }

    // =========================================================================
    // LÓGICA 2: REPORTE SEMANAL (Se dispara los Lunes vía Vercel Cron)
    // =========================================================================
    if (type === 'weekly') {
        const today = new Date();
        
        // Fechas Semana Pasada (Lunes a Domingo)
        const endLastWeek = new Date(today);
        endLastWeek.setDate(today.getDate() - today.getDay()); // Domingo pasado
        endLastWeek.setHours(23, 59, 59, 999);
        const startLastWeek = new Date(endLastWeek);
        startLastWeek.setDate(endLastWeek.getDate() - 6); // Lunes pasado
        startLastWeek.setHours(0, 0, 0, 0);

        // Fechas Semana Trasanterior (Para comparar)
        const endPrevWeek = new Date(startLastWeek);
        endPrevWeek.setDate(startLastWeek.getDate() - 1);
        endPrevWeek.setHours(23, 59, 59, 999);
        const startPrevWeek = new Date(endPrevWeek);
        startPrevWeek.setDate(endPrevWeek.getDate() - 6);
        startPrevWeek.setHours(0, 0, 0, 0);

        const [lastWeekOrders, prevWeekOrders] = await Promise.all([
            prisma.order.findMany({ where: { createdAt: { gte: startLastWeek, lte: endLastWeek }, status: { not: 'REFUNDED' } } }),
            prisma.order.findMany({ where: { createdAt: { gte: startPrevWeek, lte: endPrevWeek }, status: { not: 'REFUNDED' } } })
        ]);

        const salesLastWeek = lastWeekOrders.reduce((acc, o) => acc + o.totalAmount, 0);
        const salesPrevWeek = prevWeekOrders.reduce((acc, o) => acc + o.totalAmount, 0);
        
        let growth = 0;
        if (salesPrevWeek > 0) growth = ((salesLastWeek - salesPrevWeek) / salesPrevWeek) * 100;

        const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #18181b; color: #ffffff; padding: 30px; border-radius: 16px;">
            <h1 style="color: #a855f7; text-align: center; margin-bottom: 0;">📊 REPORTE EJECUTIVO SEMANAL</h1>
            <p style="text-align: center; color: #a1a1aa; margin-top: 5px;">Del ${startLastWeek.toLocaleDateString('es-MX')} al ${endLastWeek.toLocaleDateString('es-MX')}</p>

            <div style="background-color: #27272a; padding: 30px; border-radius: 12px; margin-top: 30px; text-align: center; border: 2px solid ${growth >= 0 ? '#4ade80' : '#f87171'};">
                <h3 style="margin: 0 0 10px 0; color: #e4e4e7; font-weight: normal;">Ventas de la Semana</h3>
                <h1 style="margin: 0; font-size: 48px; color: #ffffff;">$${salesLastWeek.toFixed(2)}</h1>
                <p style="margin: 15px 0 0 0; font-size: 18px; font-weight: bold; color: ${growth >= 0 ? '#4ade80' : '#f87171'};">
                    ${growth >= 0 ? '📈 Creciste un' : '📉 Caíste un'} ${Math.abs(growth).toFixed(1)}% vs la semana anterior.
                </p>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #a1a1aa;">(Semana anterior: $${salesPrevWeek.toFixed(2)})</p>
            </div>
            
            <p style="text-align: center; margin-top: 40px; font-size: 14px;">Entra a tu Panel de Control para ver el análisis profundo de inventarios y retención VIP.</p>
        </div>`;

        await transporter.sendMail({
            from: '"Maiztros BI" <maiztrosqro@gmail.com>',
            to: 'maiztrosqro@gmail.com',
            subject: `📊 Reporte Semanal Maiztros | ${growth >= 0 ? 'Crecimiento' : 'Alerta'}`,
            html
        });

        return NextResponse.json({ success: true, message: "Reporte semanal enviado" });
    }

    return NextResponse.json({ error: "Tipo de reporte inválido" }, { status: 400 });

  } catch (error: any) {
    console.error("Error en cron:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
