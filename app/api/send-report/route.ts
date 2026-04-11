import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'maiztrosqro@gmail.com',
    pass: 'AQUI_VA_TU_CONTRASEÑA_DE_APLICACION' // <-- RECUERDA PONER TU CLAVE DE 16 LETRAS AQUÍ
  }
});

const MP_RATE = 0.0406; // 4.06% real (3.5% + IVA)

// =========================================================================
// POST: REPORTE EJECUTIVO MANUAL (DESDE EL PANEL ADMIN)
// =========================================================================
export async function POST(req: Request) {
  try {
    const { 
        startDate, endDate, story, ticketModa,
        ventasNetas, gastosFisicos, comisionesTerminal, utilidadNeta, 
        ventasEfectivo, ventasTarjeta, totalDescuentos,
        topProducts, topToppingsPaid,
        audit, nomina,
        dayChartData, hourChartData, lowStockItems, expenses
    } = await req.json();

    const renderBar = (val: number, max: number, color: string) => {
        const pct = max > 0 ? (val / max) * 100 : 0;
        return `<div style="background-color: #e4e4e7; width: 100%; height: 8px; border-radius: 4px; margin-top: 5px; overflow: hidden;">
                  <div style="background-color: ${color}; width: ${pct}%; height: 100%; border-radius: 4px;"></div>
                </div>`;
    };

    const maxProd = topProducts.length > 0 ? Math.max(...topProducts.map((p:any) => p.qty)) : 1;
    const maxPaid = topToppingsPaid.length > 0 ? Math.max(...topToppingsPaid.map((p:any) => p.qty)) : 1;
    const maxDay = dayChartData && dayChartData.length > 0 ? Math.max(...dayChartData.map((d:any) => d.Ventas)) : 1;
    const maxHour = hourChartData && hourChartData.length > 0 ? Math.max(...hourChartData.map((h:any) => h.Ventas)) : 1;

    const html = `
    <div style="font-family: Helvetica, Arial, sans-serif; max-width: 700px; margin: 0 auto; background-color: #ffffff; color: #18181b; padding: 40px; border: 1px solid #e4e4e7; border-radius: 16px;">
        
        <p style="margin: 0; color: #2563eb; font-size: 28px; font-weight: bold; letter-spacing: -1px;">MAIZTROS BI - REPORTE DE RESULTADOS</p>
        <p style="margin: 5px 0 0 0; color: #71717a; font-size: 12px;">Periodo Analizado: ${startDate} al ${endDate}</p>

        <div style="margin-top: 30px; background-color: #f8fafc; padding: 20px; border-radius: 12px; border-left: 4px solid #2563eb;">
            <p style="margin: 0; font-weight: bold; font-size: 16px;">Resumen Ejecutivo</p>
            <p style="margin: 10px 0 0 0; font-size: 14px; line-height: 1.6; color: #334155;">${story}</p>
        </div>

        ${ticketModa > 0 ? `
        <div style="background-color: #eff6ff; padding: 20px; border-radius: 12px; margin-top: 20px; border: 1px solid #bfdbfe;">
            <p style="margin: 0 0 10px 0; color: #2563eb; font-size: 14px; font-weight: bold;">💡 ESTRATEGIA RECOMENDADA:</p>
            <p style="margin: 0; color: #1e3a8a; font-size: 13px; line-height: 1.5;">
                Tu ticket de compra más frecuente (Moda) es de <b>$${ticketModa.toFixed(2)}</b>. Crea un combo especial que cueste <b>$${(ticketModa + 20).toFixed(2)}</b> para empujar este promedio y aumentar márgenes.
            </p>
        </div>` : ''}

        ${lowStockItems && lowStockItems.length > 0 ? `
        <div style="margin-top: 20px; background-color: #fef2f2; padding: 20px; border-radius: 12px; border: 1px solid #fecaca;">
            <p style="margin: 0 0 10px 0; color: #dc2626; font-size: 14px; font-weight: bold;">⚠️ ALERTA DE INVENTARIO CRÍTICO:</p>
            <ul style="margin: 0; padding-left: 20px; color: #991b1b; font-size: 13px;">
                ${lowStockItems.map((item:any) => `<li><b>${item.name}</b> (Quedan: ${item.stock.toFixed(2)} ${item.unit})</li>`).join('')}
            </ul>
        </div>` : ''}

        <table style="width: 100%; margin-top: 30px; border-collapse: collapse; text-align: center;">
            <thead>
                <tr style="background-color: #f1f5f9; font-size: 11px; text-transform: uppercase; color: #475569;">
                    <th style="padding: 12px; border: 1px solid #e2e8f0;">Ingresos Brutos</th>
                    <th style="padding: 12px; border: 1px solid #e2e8f0;">Gastos Físicos</th>
                    <th style="padding: 12px; border: 1px solid #e2e8f0;">Comisiones MP</th>
                    <th style="padding: 12px; border: 1px solid #e2e8f0;">Utilidad Neta</th>
                </tr>
            </thead>
            <tbody>
                <tr style="font-size: 18px; font-weight: bold;">
                    <td style="padding: 15px; border: 1px solid #e2e8f0; color: #18181b;">$${ventasNetas.toFixed(2)}</td>
                    <td style="padding: 15px; border: 1px solid #e2e8f0; color: #ef4444;">-$${gastosFisicos.toFixed(2)}</td>
                    <td style="padding: 15px; border: 1px solid #e2e8f0; color: #f97316;">-$${comisionesTerminal.toFixed(2)}</td>
                    <td style="padding: 15px; border: 1px solid #e2e8f0; color: ${utilidadNeta >= 0 ? '#16a34a' : '#ef4444'};">$${utilidadNeta.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>

        <div style="margin-top: 15px; text-align: center; font-size: 13px; color: #71717a;">
            Efectivo (Caja): <b>$${ventasEfectivo.toFixed(2)}</b> | Tarjeta (Banco): <b>$${ventasTarjeta.toFixed(2)}</b> | Costo Lealtad VIP: <b>-$${totalDescuentos.toFixed(2)}</b>
        </div>

        ${dayChartData && hourChartData ? `
        <div style="margin-top: 40px; border-top: 2px solid #e4e4e7; padding-top: 30px;">
            <p style="margin: 0; font-size: 16px; font-weight: bold;">Tendencias de Tráfico</p>
            <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
                <tr>
                    <td style="width: 48%; vertical-align: top; padding-right: 2%">
                        <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: bold;">Ventas por Día</p>
                        ${dayChartData.map((d:any) => `
                            <div style="margin-bottom: 12px;">
                                <div style="display: flex; justify-content: space-between; font-size: 12px;"><span>${d.Dia}</span><b>$${d.Ventas.toFixed(2)}</b></div>
                                ${renderBar(d.Ventas, maxDay, "#a855f7")}
                            </div>
                        `).join('')}
                    </td>
                    <td style="width: 48%; vertical-align: top; padding-left: 2%">
                        <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: bold;">Tráfico por Hora</p>
                        ${hourChartData.map((h:any) => `
                            <div style="margin-bottom: 12px;">
                                <div style="display: flex; justify-content: space-between; font-size: 12px;"><span>${h.Hora}</span><b style="color:#ca8a04;">$${h.Ventas.toFixed(2)}</b></div>
                                ${renderBar(h.Ventas, maxHour, "#eab308")}
                            </div>
                        `).join('')}
                    </td>
                </tr>
            </table>
        </div>` : ''}

        <div style="margin-top: 40px; border-top: 2px solid #e4e4e7; padding-top: 30px;">
            <p style="margin: 0; font-size: 16px; font-weight: bold;">Rendimiento de Productos</p>
            <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
                <tr>
                    <td style="width: 48%; vertical-align: top; padding-right: 2%">
                        <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: bold;">Top 10 Productos Base</p>
                        ${topProducts.map((p:any) => `
                            <div style="margin-bottom: 12px;">
                                <div style="display: flex; justify-content: space-between; font-size: 12px;"><span>${p.name}</span><b style="color:#16a34a;">${p.qty} unds</b></div>
                                ${renderBar(p.qty, maxProd, "#2563eb")}
                            </div>
                        `).join('')}
                    </td>
                    <td style="width: 48%; vertical-align: top; padding-left: 2%">
                        <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: bold;">Top Extras (Con Costo)</p>
                        ${topToppingsPaid.map((p:any) => `
                            <div style="margin-bottom: 12px;">
                                <div style="display: flex; justify-content: space-between; font-size: 12px;"><span>${p.name}</span><b style="color:#ea580c;">${p.qty} usos</b></div>
                                ${renderBar(p.qty, maxPaid, "#f97316")}
                            </div>
                        `).join('')}
                    </td>
                </tr>
            </table>
        </div>

        ${expenses && expenses.length > 0 ? `
        <div style="margin-top: 40px; border-top: 2px solid #e4e4e7; padding-top: 30px;">
            <p style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">Desglose de Gastos Físicos</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                <tr style="background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                    <th style="padding: 10px;">Fecha</th>
                    <th style="padding: 10px;">Categoría</th>
                    <th style="padding: 10px;">Descripción</th>
                    <th style="padding: 10px; text-align: right;">Monto</th>
                </tr>
                ${expenses.map((e:any) => `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 10px; color: #71717a;">${new Date(e.date).toLocaleDateString('es-MX')}</td>
                        <td style="padding: 10px; font-weight:bold;">${e.category}</td>
                        <td style="padding: 10px;">${e.description}</td>
                        <td style="padding: 10px; text-align: right; color: #ef4444; font-weight:bold;">-$${e.amount.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </table>
        </div>` : ''}

        <div style="margin-top: 40px; border-top: 2px solid #e4e4e7; padding-top: 30px;">
            <p style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">Auditoría de Cortes de Caja</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
                <tr style="background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                    <th style="padding: 10px 5px;">Día</th>
                    <th style="padding: 10px 5px;">Cajero</th>
                    <th style="padding: 10px 5px;">Ingresos Efct</th>
                    <th style="padding: 10px 5px;">Retiros</th>
                    <th style="padding: 10px 5px;">Esperado</th>
                    <th style="padding: 10px 5px;">Reportado</th>
                    <th style="padding: 10px 5px; text-align: right;">Diferencia</th>
                </tr>
                ${audit.map((a:any) => {
                    const expected = a.fondo + a.ventas + a.propinas - a.retiros;
                    const diff = a.reportado - expected;
                    const diffColor = Math.abs(diff) <= 0.5 ? '#16a34a' : (diff < 0 ? '#ef4444' : '#ca8a04');
                    const diffText = Math.abs(diff) <= 0.5 ? 'Exacto' : (diff < 0 ? `Falta $${Math.abs(diff).toFixed(2)}` : `Sobra $${diff.toFixed(2)}`);
                    const [year, month, day] = a.date.split('-');
                    return `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 10px 5px; color:#71717a;">${day}/${month}</td>
                        <td style="padding: 10px 5px; font-weight:bold;">${a.cajero}</td>
                        <td style="padding: 10px 5px; color:#16a34a;">$${a.ventas.toFixed(2)}</td>
                        <td style="padding: 10px 5px; color:#ef4444;">-$${a.retiros.toFixed(2)}</td>
                        <td style="padding: 10px 5px;">$${expected.toFixed(2)}</td>
                        <td style="padding: 10px 5px; font-weight:bold;">$${a.reportado.toFixed(2)}</td>
                        <td style="padding: 10px 5px; text-align: right; color:${diffColor}; font-weight:bold;">${diffText}</td>
                    </tr>`;
                }).join('')}
            </table>
        </div>

        <div style="margin-top: 40px; border-top: 2px solid #e4e4e7; padding-top: 30px;">
            <p style="margin: 0 0 5px 0; font-size: 16px; font-weight: bold;">Nómina Detallada a Pagar</p>
            <p style="margin: 0 0 15px 0; color: #71717a; font-size: 11px;">*Propinas incluyen efectivo + propinas de tarjeta (ya descontado el 4.06% de MP).</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
                <tr style="background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                    <th style="padding: 10px 5px;">Cajero</th>
                    <th style="padding: 10px 5px;">Días Trab.</th>
                    <th style="padding: 10px 5px;">Sueldo Base</th>
                    <th style="padding: 10px 5px;">Propinas Netas</th>
                    <th style="padding: 10px 5px;">Ajuste Luis</th>
                    <th style="padding: 10px 5px; text-align: right;">Total a Pagar</th>
                </tr>
                ${nomina.map((n:any) => `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 10px 5px; font-weight:bold;">${n.cajero}</td>
                        <td style="padding: 10px 5px; color:#71717a;">${n.diasTrabajados}</td>
                        <td style="padding: 10px 5px;">$${n.sueldoBase.toFixed(2)}</td>
                        <td style="padding: 10px 5px; color:#db2777;">+$${n.propinasNetas.toFixed(2)}</td>
                        <td style="padding: 10px 5px; color:#2563eb;">${n.ajuste >= 0 ? '+' : ''}$${n.ajuste.toFixed(2)}</td>
                        <td style="padding: 10px 5px; text-align: right; color:#2563eb; font-weight:bold; font-size:14px;">$${n.totalPagar.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </table>
        </div>

        <p style="text-align: center; color: #94a3b8; font-size: 11px; margin-top: 60px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
            Este reporte ejecutivo es generado por el sistema automatizado Maiztros BI.
        </p>
    </div>`;

    await transporter.sendMail({
        from: '"Maiztros BI" <maiztrosqro@gmail.com>',
        to: 'maiztrosqro@gmail.com',
        subject: `📊 Resultados Maiztros | ${startDate} al ${endDate}`,
        html
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


// =========================================================================
// GET: EL SÚPER REPORTE AUTOMÁTICO DE CIERRE DE CAJA
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

        const sStart = new Date(lastShift.openedAt);
        const sEnd = new Date(lastShift.closedAt!);
        
        const diffMs = sEnd.getTime() - sStart.getTime();
        const horasTrabajadas = (diffMs / (1000 * 60 * 60)).toFixed(1);

        const openedAt = sStart.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
        const closedAt = sEnd.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

        const orders = await prisma.order.findMany({
            where: {
                createdAt: { gte: lastShift.openedAt, lte: lastShift.closedAt! },
                status: { not: 'REFUNDED' }
            }
        });

        let ventasEfectivo = 0;
        let ventasTarjeta = 0;
        let propinasEfectivo = 0;
        let propinasTarjetaBrutas = 0;
        let comisionesTerminal = 0;

        orders.forEach(o => {
            const tip = o.tipAmount || 0;
            if (o.paymentMethod === 'EFECTIVO_CAJA') {
                ventasEfectivo += o.totalAmount;
                propinasEfectivo += tip;
            } else if (o.paymentMethod === 'TERMINAL') {
                ventasTarjeta += o.totalAmount;
                propinasTarjetaBrutas += tip;
                comisionesTerminal += (o.totalAmount + tip) * MP_RATE;
            }
        });

        const propinasTarjetaNetas = propinasTarjetaBrutas * (1 - MP_RATE);
        const propinasTotalesNetas = propinasEfectivo + propinasTarjetaNetas;
        
        const retiros = lastShift.movements.filter(m => m.type === 'OUT').reduce((acc, m) => acc + m.amount, 0);
        const esperadoEnCaja = (lastShift.startingCash || 0) + ventasEfectivo + propinasEfectivo - retiros;
        const diferencia = (lastShift.reportedCash || 0) - esperadoEnCaja;

        // TOP PRODUCTOS DE ESTE TURNO
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
        const topProducts = Object.keys(productsMap).map(k => ({ name: k, qty: productsMap[k] })).sort((a,b)=>b.qty - a.qty).slice(0,10);

        const html = `
        <div style="font-family: Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #ffffff; color: #18181b; padding: 40px; border: 1px solid #e4e4e7; border-radius: 16px;">
            
            <p style="margin: 0; color: #ca8a04; font-size: 28px; font-weight: bold; text-align: center;">CORTE DE CAJA FINALIZADO</p>
            <p style="text-align: center; color: #71717a; margin-top: 5px; font-size: 13px;">Reporte Automático de Turno</p>

            <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-top: 30px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0 0 10px 0; color: #2563eb; font-size: 16px; font-weight: bold;">Reloj Checador y Asistencia</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Cajero Responsable:</strong> ${lastShift.openedBy}</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Hora de Entrada:</strong> ${openedAt}</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Hora de Salida:</strong> ${closedAt}</p>
                <p style="margin: 5px 0; font-size: 14px; color: #475569;"><strong>Tiempo Total de Turno:</strong> ${horasTrabajadas} horas</p>
            </div>

            <table style="width: 100%; margin-top: 25px; border-collapse: collapse; text-align: center;">
                <thead>
                    <tr style="background-color: #f1f5f9; font-size: 11px; text-transform: uppercase;">
                        <th style="padding: 12px; border: 1px solid #e2e8f0;">Ventas Totales</th>
                        <th style="padding: 12px; border: 1px solid #e2e8f0; color: #ea580c;">Comisiones MP</th>
                        <th style="padding: 12px; border: 1px solid #e2e8f0; color: #db2777;">Propinas Netas Cajero</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="font-size: 18px; font-weight: bold;">
                        <td style="padding: 15px; border: 1px solid #e2e8f0;">$${(ventasEfectivo + ventasTarjeta).toFixed(2)}</td>
                        <td style="padding: 15px; border: 1px solid #e2e8f0; color: #ea580c;">-$${comisionesTerminal.toFixed(2)}</td>
                        <td style="padding: 15px; border: 1px solid #e2e8f0; color: #db2777;">+$${propinasTotalesNetas.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <div style="background-color: #f0fdf4; padding: 25px; border-radius: 12px; margin-top: 25px; border: 1px solid #bbf7d0;">
                <p style="margin: 0 0 15px 0; color: #16a34a; font-size: 16px; font-weight: bold;">Auditoría de Caja Física (Solo Efectivo)</p>
                
                <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #dcfce7;">
                        <td style="padding: 8px 0; color: #374151;">Fondo Inicial con el que abrió:</td>
                        <td style="text-align: right; font-weight: bold;">$${lastShift.startingCash?.toFixed(2)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #dcfce7;">
                        <td style="padding: 8px 0; color: #374151;">+ Ventas en Efectivo:</td>
                        <td style="text-align: right; font-weight: bold; color: #16a34a;">+$${ventasEfectivo.toFixed(2)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #dcfce7;">
                        <td style="padding: 8px 0; color: #374151;">+ Propinas dejadas en Efectivo:</td>
                        <td style="text-align: right; font-weight: bold; color: #db2777;">+$${propinasEfectivo.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #374151;">- Retiros / Pagos de Caja Chica:</td>
                        <td style="text-align: right; font-weight: bold; color: #ef4444;">-$${retiros.toFixed(2)}</td>
                    </tr>
                </table>

                <div style="margin-top: 15px; padding-top: 15px; border-top: 2px dashed #86efac;">
                    <p style="margin: 0; display: flex; justify-content: space-between; font-size: 15px; color: #374151;">
                        <span>Matemática Exacta (Esperado):</span> <b>$${esperadoEnCaja.toFixed(2)}</b>
                    </p>
                    <p style="margin: 8px 0 0 0; display: flex; justify-content: space-between; font-size: 20px; font-weight: bold;">
                        <span>Cajero Reportó (Billetes):</span> <b>$${(lastShift.reportedCash || 0).toFixed(2)}</b>
                    </p>
                </div>
                
                <div style="margin-top: 20px; text-align: center; padding: 15px; border-radius: 8px; background-color: ${Math.abs(diferencia) <= 0.5 ? '#dcfce7' : (diferencia < 0 ? '#fee2e2' : '#fef3c7')};">
                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${Math.abs(diferencia) <= 0.5 ? '#15803d' : (diferencia < 0 ? '#b91c1c' : '#b45309')};">
                        DIFERENCIA: ${Math.abs(diferencia) <= 0.5 ? 'CAJA CUADRADA PERFECTA ✅' : (diferencia < 0 ? `FALTAN $${Math.abs(diferencia).toFixed(2)} ❌` : `SOBRAN $${diferencia.toFixed(2)} ⚠️`)}
                    </p>
                </div>
            </div>

            <div style="background-color: #fff7ed; padding: 25px; border-radius: 12px; margin-top: 25px; border: 1px solid #fed7aa;">
                <p style="margin: 0 0 15px 0; color: #ea580c; font-size: 16px; font-weight: bold;">Transacciones MercadoPago (Terminal)</p>
                <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #ffedd5;">
                        <td style="padding: 8px 0; color: #374151;">Total Cobrado en Terminal:</td>
                        <td style="text-align: right; font-weight: bold;">$${(ventasTarjeta + propinasTarjetaBrutas).toFixed(2)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #ffedd5;">
                        <td style="padding: 8px 0; color: #374151;">- Comisión MP Retenida (4.06%):</td>
                        <td style="text-align: right; font-weight: bold; color: #ef4444;">-$${comisionesTerminal.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0 0 0; color: #ea580c; font-weight: bold;">Depósito Real al Banco:</td>
                        <td style="text-align: right; font-weight: bold; color: #ea580c; font-size: 18px; padding-top: 12px;">$${((ventasTarjeta + propinasTarjetaBrutas) - comisionesTerminal).toFixed(2)}</td>
                    </tr>
                </table>
            </div>

            ${topProducts.length > 0 ? `
            <div style="margin-top: 30px;">
                <p style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold; color: #3b82f6;">Top Productos Vendidos en este Turno</p>
                <table style="width: 100%; font-size: 13px; text-align: left; border-collapse: collapse;">
                    ${topProducts.map((p:any, i:number) => `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 0; color: #64748b;">#${i+1}</td>
                            <td style="padding: 8px 0; font-weight: bold; color: #1e293b;">${p.name}</td>
                            <td style="padding: 8px 0; text-align: right; color: #2563eb; font-weight: bold;">${p.qty} unds</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
            ` : ''}

            <p style="text-align: center; color: #94a3b8; font-size: 11px; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                Corte generado automáticamente. No es necesario responder a este correo.
            </p>
        </div>`;

        await transporter.sendMail({
            from: '"Maiztros Bot" <maiztrosqro@gmail.com>',
            to: 'maiztrosqro@gmail.com',
            subject: `🌽 Corte de Caja: ${lastShift.openedBy} | Diferencia: $${diferencia.toFixed(2)}`,
            html
        });
        return NextResponse.json({ success: true, message: "Corte diario enviado" });
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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #18181b; padding: 30px; border-radius: 16px; border: 1px solid #e4e4e7;">
            <p style="margin: 0; color: #2563eb; text-align: center; font-size: 24px; font-weight: bold;">REPORTE EJECUTIVO SEMANAL</p>
            <p style="text-align: center; color: #71717a; margin-top: 5px;">Del ${startLastWeek.toLocaleDateString('es-MX')} al ${endLastWeek.toLocaleDateString('es-MX')}</p>

            <div style="background-color: #f8fafc; padding: 30px; border-radius: 12px; margin-top: 30px; text-align: center; border: 2px solid ${growth >= 0 ? '#16a34a' : '#ef4444'};">
                <p style="margin: 0 0 10px 0; color: #475569;">Ventas de la Semana</p>
                <p style="margin: 0; font-size: 48px; font-weight: bold; color: #18181b;">$${salesLastWeek.toFixed(2)}</p>
                <p style="margin: 15px 0 0 0; font-size: 18px; font-weight: bold; color: ${growth >= 0 ? '#16a34a' : '#ef4444'};">
                    ${growth >= 0 ? '📈 Crecimos un' : '📉 Caímos un'} ${Math.abs(growth).toFixed(1)}% vs semana pasada.
                </p>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8;">(Semana anterior: $${salesPrevWeek.toFixed(2)})</p>
            </div>
        </div>`;

        await transporter.sendMail({
            from: '"Maiztros BI" <maiztrosqro@gmail.com>',
            to: 'maiztrosqro@gmail.com',
            subject: `📊 Rendimiento Semanal Maiztros | ${growth >= 0 ? 'Crecimiento' : 'Alerta'}`,
            html
        });
        return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Tipo de reporte inválido" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
