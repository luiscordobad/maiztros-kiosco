import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'maiztrosqro@gmail.com',
    pass: 'whyn dmeg vtnb ndll' // <-- RECUERDA PONER TU CLAVE DE 16 LETRAS
  }
});

// =========================================================================
// POST: REPORTE EJECUTIVO (IGUAL AL PDF) DESDE EL BOTÓN DEL ADMIN
// =========================================================================
export async function POST(req: Request) {
  try {
    const { 
        startDate, endDate, story, ticketModa,
        ventasNetas, gastosTotales, utilidadNeta, 
        ventasEfectivo, ventasTarjeta, totalDescuentos,
        topProducts, topToppingsPaid, topToppingsFree, 
        audit, nomina 
    } = await req.json();

    // Función auxiliar para dibujar barras en HTML
    const renderBar = (qty: number, max: number, color: string) => {
        const pct = max > 0 ? (qty / max) * 100 : 0;
        return `<div style="background-color: #3f3f46; width: 100%; height: 6px; border-radius: 10px; margin-top: 5px; overflow: hidden;">
                  <div style="background-color: ${color}; width: ${pct}%; height: 100%; border-radius: 10px;"></div>
                </div>`;
    };

    const maxProd = topProducts.length > 0 ? Math.max(...topProducts.map((p:any) => p.qty)) : 1;
    const maxPaid = topToppingsPaid.length > 0 ? Math.max(...topToppingsPaid.map((p:any) => p.qty)) : 1;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background-color: #18181b; color: #ffffff; padding: 30px; border-radius: 16px;">
        
        <h1 style="color: #3b82f6; text-align: center; margin-bottom: 0; font-size: 28px;">MAIZTROS BI - REPORTE EJECUTIVO</h1>
        <p style="text-align: center; color: #a1a1aa; margin-top: 5px; font-size: 14px;">Periodo Analizado: ${startDate} al ${endDate}</p>

        <div style="margin-top: 30px;">
            <h3 style="color: #ffffff; border-bottom: 1px solid #3f3f46; padding-bottom: 10px;">Resumen de Operación y Ventas</h3>
            <p style="color: #d4d4d8; font-size: 14px; line-height: 1.6;">${story}</p>
        </div>

        ${ticketModa > 0 ? `
        <div style="background-color: #eff6ff; padding: 20px; border-radius: 12px; margin-top: 20px; border: 1px solid #bfdbfe;">
            <h4 style="margin: 0 0 10px 0; color: #2563eb; font-size: 14px;">💡 ESTRATEGIA RECOMENDADA:</h4>
            <p style="margin: 0; color: #1e3a8a; font-size: 13px; line-height: 1.5;">
                Tu ticket de compra más frecuente (Moda) es de <b>$${ticketModa.toFixed(2)}</b>. Crea un combo o paquete especial que cueste <b>$${(ticketModa + 20).toFixed(2)}</b> para empujar este promedio hacia arriba y aumentar tus márgenes de ganancia.
            </p>
        </div>
        ` : ''}

        <div style="display: flex; gap: 10px; margin-top: 30px; text-align: center;">
            <div style="background-color: #27272a; padding: 15px; border-radius: 12px; flex: 1;">
                <p style="margin: 0; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Ingresos Brutos</p>
                <p style="margin: 5px 0 0 0; color: #ffffff; font-size: 20px; font-weight: bold;">$${ventasNetas.toFixed(2)}</p>
            </div>
            <div style="background-color: #27272a; padding: 15px; border-radius: 12px; flex: 1;">
                <p style="margin: 0; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Gastos Operativos</p>
                <p style="margin: 5px 0 0 0; color: #f87171; font-size: 20px; font-weight: bold;">-$${gastosTotales.toFixed(2)}</p>
            </div>
            <div style="background-color: #27272a; padding: 15px; border-radius: 12px; flex: 1; border: 1px solid ${utilidadNeta >= 0 ? '#22c55e' : '#ef4444'}">
                <p style="margin: 0; color: ${utilidadNeta >= 0 ? '#4ade80' : '#f87171'}; font-size: 11px; text-transform: uppercase;">Utilidad Neta</p>
                <p style="margin: 5px 0 0 0; color: ${utilidadNeta >= 0 ? '#4ade80' : '#f87171'}; font-size: 20px; font-weight: bold;">$${utilidadNeta.toFixed(2)}</p>
            </div>
        </div>

        <div style="background-color: #27272a; padding: 20px; border-radius: 12px; margin-top: 15px;">
            <h4 style="margin: 0 0 15px 0; color: #ffffff;">Flujo de Efectivo (Liquidez)</h4>
            <p style="margin: 5px 0; display: flex; justify-content: space-between; font-size: 14px;">
                <span style="color:#a1a1aa;">💵 Efectivo (Caja):</span> <b style="color:#4ade80;">$${ventasEfectivo.toFixed(2)}</b>
            </p>
            <p style="margin: 5px 0; display: flex; justify-content: space-between; font-size: 14px;">
                <span style="color:#a1a1aa;">💳 Tarjeta (Banco):</span> <b style="color:#60a5fa;">$${ventasTarjeta.toFixed(2)}</b>
            </p>
            <p style="margin: 5px 0; display: flex; justify-content: space-between; font-size: 14px;">
                <span style="color:#a1a1aa;">🎁 Costo Lealtad (VIP):</span> <b style="color:#c084fc;">-$${totalDescuentos.toFixed(2)}</b>
            </p>
        </div>

        <h3 style="color: #4ade80; margin-top: 40px; border-bottom: 1px solid #3f3f46; padding-bottom: 10px;">🌽 Top 10 Productos Base</h3>
        <div style="margin-top: 15px;">
            ${topProducts.map((p:any) => `
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; font-size: 14px;">
                        <span style="color:#e4e4e7;">${p.name}</span>
                        <span style="color:#4ade80; font-weight:bold;">${p.qty} unds</span>
                    </div>
                    ${renderBar(p.qty, maxProd, '#4ade80')}
                </div>
            `).join('')}
        </div>

        <h3 style="color: #fb923c; margin-top: 40px; border-bottom: 1px solid #3f3f46; padding-bottom: 10px;">🧀 Top Toppings (Con Costo)</h3>
        <div style="margin-top: 15px;">
            ${topToppingsPaid.map((p:any) => `
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; font-size: 14px;">
                        <span style="color:#e4e4e7;">${p.name}</span>
                        <span style="color:#fb923c; font-weight:bold;">${p.qty} usos</span>
                    </div>
                    ${renderBar(p.qty, maxPaid, '#fb923c')}
                </div>
            `).join('')}
        </div>

        <h3 style="color: #ffffff; margin-top: 40px; border-bottom: 1px solid #3f3f46; padding-bottom: 10px;">💰 Auditoría de Cortes de Caja</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; text-align: left;">
            <thead>
                <tr style="border-bottom: 1px solid #52525b; color: #a1a1aa;">
                    <th style="padding: 8px 4px;">Día</th>
                    <th style="padding: 8px 4px;">Esperado</th>
                    <th style="padding: 8px 4px;">Reportado</th>
                    <th style="padding: 8px 4px; text-align: right;">Diferencia</th>
                </tr>
            </thead>
            <tbody>
                ${audit.map((a:any) => {
                    const expected = a.fondo + a.ventas + a.propinas - a.retiros;
                    const diff = a.reportado - expected;
                    const diffColor = Math.abs(diff) <= 0.5 ? '#4ade80' : (diff < 0 ? '#f87171' : '#facc15');
                    const diffText = Math.abs(diff) <= 0.5 ? 'Exacto' : (diff < 0 ? `Falta $${Math.abs(diff).toFixed(2)}` : `Sobra $${diff.toFixed(2)}`);
                    const [year, month, day] = a.date.split('-');
                    return `
                    <tr style="border-bottom: 1px solid #3f3f46;">
                        <td style="padding: 8px 4px; color:#d4d4d8;">${day}/${month}</td>
                        <td style="padding: 8px 4px; color:#e4e4e7;">$${expected.toFixed(2)}</td>
                        <td style="padding: 8px 4px; color:#ffffff; font-weight:bold;">$${a.reportado.toFixed(2)}</td>
                        <td style="padding: 8px 4px; text-align: right; color:${diffColor}; font-weight:bold;">${diffText}</td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>

        <h3 style="color: #ffffff; margin-top: 40px; border-bottom: 1px solid #3f3f46; padding-bottom: 10px;">🧑‍🍳 Nómina a Pagar</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; text-align: left;">
            <thead>
                <tr style="border-bottom: 1px solid #52525b; color: #a1a1aa;">
                    <th style="padding: 8px 4px;">Cajero</th>
                    <th style="padding: 8px 4px;">Días</th>
                    <th style="padding: 8px 4px;">Propinas</th>
                    <th style="padding: 8px 4px; text-align: right;">Total Pagar</th>
                </tr>
            </thead>
            <tbody>
                ${nomina.map((n:any) => `
                    <tr style="border-bottom: 1px solid #3f3f46;">
                        <td style="padding: 8px 4px; color:#e4e4e7; font-weight:bold;">${n.cajero}</td>
                        <td style="padding: 8px 4px; color:#d4d4d8;">${n.diasTrabajados}</td>
                        <td style="padding: 8px 4px; color:#f472b6;">+$${n.propinasTotales.toFixed(2)}</td>
                        <td style="padding: 8px 4px; text-align: right; color:#60a5fa; font-weight:bold; font-size: 14px;">$${n.totalPagar.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <p style="text-align: center; color: #52525b; font-size: 11px; margin-top: 50px;">Generado por Maiztros Automations</p>
    </div>`;

    await transporter.sendMail({
        from: '"Maiztros BI" <maiztrosqro@gmail.com>',
        to: 'maiztrosqro@gmail.com',
        subject: `📊 Reporte Ejecutivo Maiztros | ${startDate} al ${endDate}`,
        html
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// =========================================================================
// GET: SE MANTIENE INTACTO (Para Cron Jobs y Cierre de Caja Automático)
// =========================================================================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'daily';

    if (type === 'daily') {
        const lastShift = await prisma.shift.findFirst({
            where: { closedAt: { not: null } },
            orderBy: { closedAt: 'desc' },
            include: { movements: true }
        });

        if (!lastShift) return NextResponse.json({ error: "No hay turnos cerrados" }, { status: 400 });

        const openedAt = new Date(lastShift.openedAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
        const closedAt = new Date(lastShift.closedAt!).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

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

        const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #18181b; color: #ffffff; padding: 30px; border-radius: 16px;">
            <h1 style="color: #facc15; text-align: center; margin-bottom: 0;">🌽 CORTE DE CAJA DIARIO</h1>
            <p style="text-align: center; color: #a1a1aa; margin-top: 5px;">Reporte Automático de Operación</p>

            <div style="background-color: #27272a; padding: 20px; border-radius: 12px; margin-top: 30px; border-left: 5px solid #3b82f6;">
                <h3 style="margin: 0 0 15px 0; color: #60a5fa;">⏱️ Reloj Checador y Asistencia</h3>
                <p style="margin: 5px 0;"><strong>Cajero Responsable:</strong> ${lastShift.openedBy}</p>
                <p style="margin: 5px 0;"><strong>Hora de Entrada:</strong> ${openedAt}</p>
                <p style="margin: 5px 0; color: #f87171;"><strong>Hora de Salida:</strong> ${closedAt}</p>
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

    if (type === 'weekly') {
        const today = new Date();
        const endLastWeek = new Date(today);
        endLastWeek.setDate(today.getDate() - today.getDay());
        endLastWeek.setHours(23, 59, 59, 999);
        const startLastWeek = new Date(endLastWeek);
        startLastWeek.setDate(endLastWeek.getDate() - 6);
        startLastWeek.setHours(0, 0, 0, 0);

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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
