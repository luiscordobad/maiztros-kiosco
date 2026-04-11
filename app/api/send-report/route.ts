// @ts-nocheck
/* eslint-disable */
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'maiztrosqro@gmail.com',
    pass: 'whyn dmeg vtnb ndll' // <-- Usa tu clave de 16 letras
  }
});

const MP_RATE = 0.0406; // 3.5% + IVA de Mercado Pago

// =========================================================================
// POST: ENVIAR REPORTE EJECUTIVO (ESPEJO DEL PDF - FONDO CLARO)
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

    const renderBar = (qty: number, max: number, color: string) => {
        const pct = max > 0 ? (qty / max) * 100 : 0;
        return `<div style="background-color: #e4e4e7; width: 100%; height: 8px; border-radius: 4px; margin-top: 5px; overflow: hidden;">
                  <div style="background-color: ${color}; width: ${pct}%; height: 100%; border-radius: 4px;"></div>
                </div>`;
    };

    const maxProd = topProducts.length > 0 ? Math.max(...topProducts.map((p:any) => p.qty)) : 1;
    const maxPaid = topToppingsPaid.length > 0 ? Math.max(...topToppingsPaid.map((p:any) => p.qty)) : 1;
    const maxDay = dayChartData && dayChartData.length > 0 ? Math.max(...dayChartData.map((d:any) => d.Ventas)) : 1;
    const maxHour = hourChartData && hourChartData.length > 0 ? Math.max(...hourChartData.map((h:any) => h.Ventas)) : 1;

    const textDark = "#18181b"; 
    const textGray = "#71717a"; 
    const primaryBlue = "#2563eb"; 
    const bgLight = "#f4f4f5"; 

    const html = `
    <div style="font-family: Helvetica, Arial, sans-serif; max-width: 700px; margin: 0 auto; background-color: #ffffff; color: ${textDark}; padding: 40px; border: 1px solid #e4e4e7; border-radius: 16px;">
        
        <p style="margin: 0; color: ${primaryBlue}; font-size: 28px; font-weight: bold; letter-spacing: -1px;">MAIZTROS BI - REPORTE EJECUTIVO</p>
        <p style="margin: 5px 0 0 0; color: ${textGray}; font-size: 12px; font-weight: normal;">Periodo Analizado: ${startDate} al ${endDate}</p>

        <div style="margin-top: 30px;">
            <p style="margin: 0; color: ${textDark}; font-size: 16px; font-weight: bold;">Resumen de Operación y Ventas</p>
            <p style="margin: 10px 0 0 0; color: #3f3f46; font-size: 14px; line-height: 1.6;">${story}</p>
        </div>

        ${ticketModa > 0 ? `
        <div style="background-color: #eff6ff; padding: 20px; border-radius: 12px; margin-top: 20px; border: 1px solid #bfdbfe;">
            <h4 style="margin: 0 0 10px 0; color: #2563eb; font-size: 14px;">💡 ESTRATEGIA RECOMENDADA:</h4>
            <p style="margin: 0; color: #1e3a8a; font-size: 13px; line-height: 1.5;">
                Tu ticket de compra más frecuente (Moda) es de <b>$${ticketModa.toFixed(2)}</b>. Crea un combo o paquete especial que cueste <b>$${(ticketModa + 20).toFixed(2)}</b> para empujar este promedio hacia arriba y aumentar tus márgenes.
            </p>
        </div>
        ` : ''}

        ${lowStockItems && lowStockItems.length > 0 ? `
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 12px; margin-top: 20px; border: 1px solid #fecaca;">
            <h4 style="margin: 0 0 10px 0; color: #dc2626; font-size: 14px;">⚠️ ALERTA DE INVENTARIO BAJO:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #991b1b; font-size: 13px;">
                ${lowStockItems.map((item:any) => `<li><b>${item.name}</b> (Quedan: ${item.stock.toFixed(1)} ${item.unit})</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        <table style="width: 100%; margin-top: 30px; border-collapse: collapse; text-align: center; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden;">
            <thead>
                <tr style="background-color: ${bgLight}; color: ${textDark}; font-size: 11px; font-weight: bold;">
                    <th style="padding: 12px; border: 1px solid #e4e4e7;">Ingresos Brutos</th>
                    <th style="padding: 12px; border: 1px solid #e4e4e7;">Gastos Físicos</th>
                    <th style="padding: 12px; border: 1px solid #e4e4e7;">Comisiones MP</th>
                    <th style="padding: 12px; border: 1px solid #e4e4e7;">Utilidad Neta</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 15px 10px; border: 1px solid #e4e4e7; font-size: 18px; font-weight: bold; color: ${textDark};">$${ventasNetas.toFixed(2)}</td>
                    <td style="padding: 15px 10px; border: 1px solid #e4e4e7; font-size: 18px; font-weight: bold; color: #ef4444;">-$${gastosFisicos.toFixed(2)}</td>
                    <td style="padding: 15px 10px; border: 1px solid #e4e4e7; font-size: 18px; font-weight: bold; color: #ea580c;">-$${comisionesTerminal.toFixed(2)}</td>
                    <td style="padding: 15px 10px; border: 1px solid #e4e4e7; font-size: 18px; font-weight: bold; color: ${utilidadNeta >= 0 ? '#16a34a' : '#ef4444'};">$${utilidadNeta.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>

        <div style="margin-top: 20px; text-align: center; font-size: 13px; color: ${textGray};">
            <p style="margin: 0;">Efectivo (Caja): <b>$${ventasEfectivo.toFixed(2)}</b> | Tarjeta (Banco): <b>$${ventasTarjeta.toFixed(2)}</b> | Costo VIP: <b>-$${totalDescuentos.toFixed(2)}</b></p>
        </div>

        ${dayChartData && hourChartData ? `
        <div style="margin-top: 40px; border-top: 2px solid #e4e4e7; padding-top: 30px;">
            <p style="margin: 0; color: ${textDark}; font-size: 16px; font-weight: bold;">Tendencias de Tráfico</p>
            <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
                <tr>
                    <td style="width: 48%; vertical-align: top; padding-right: 2%">
                        <p style="margin: 0 0 15px 0; color: ${textDark}; font-size: 14px; font-weight: bold;">Ventas por Día</p>
                        ${dayChartData.map((d:any) => `
                            <div style="margin-bottom: 12px;">
                                <div style="display: flex; justify-content: space-between; font-size: 13px;">
                                    <span style="color: ${textDark};">${d.Dia}</span>
                                    <span style="color: #a855f7; font-weight:bold;">$${d.Ventas.toFixed(2)}</span>
                                </div>
                                ${renderBar(d.Ventas, maxDay, "#a855f7")}
                            </div>
                        `).join('')}
                    </td>
                    <td style="width: 48%; vertical-align: top; padding-left: 2%">
                        <p style="margin: 0 0 15px 0; color: ${textDark}; font-size: 14px; font-weight: bold;">Tráfico por Hora</p>
                        ${hourChartData.map((h:any) => `
                            <div style="margin-bottom: 12px;">
                                <div style="display: flex; justify-content: space-between; font-size: 13px;">
                                    <span style="color: ${textDark};">${h.Hora}</span>
                                    <span style="color: #ca8a04; font-weight:bold;">$${h.Ventas.toFixed(2)}</span>
                                </div>
                                ${renderBar(h.Ventas, maxHour, "#eab308")}
                            </div>
                        `).join('')}
                    </td>
                </tr>
            </table>
        </div>
        ` : ''}

        <div style="margin-top: 40px; border-top: 2px solid #e4e4e7; padding-top: 30px;">
            <p style="margin: 0; color: ${textDark}; font-size: 16px; font-weight: bold;">Rendimiento de Productos</p>
            
            <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
                <tr>
                    <td style="width: 48%; vertical-align: top; padding-right: 2%">
                        <p style="margin: 0 0 15px 0; color: ${textDark}; font-size: 14px; font-weight: bold;">Top 10 Productos Base</p>
                        ${topProducts.map((p:any) => `
                            <div style="margin-bottom: 12px;">
                                <div style="display: flex; justify-content: space-between; font-size: 13px;">
                                    <span style="color: ${textDark};">${p.name}</span>
                                    <span style="color: #16a34a; font-weight:bold;">${p.qty} unds</span>
                                </div>
                                ${renderBar(p.qty, maxProd, primaryBlue)}
                            </div>
                        `).join('')}
                    </td>
                    <td style="width: 48%; vertical-align: top; padding-left: 2%">
                        <p style="margin: 0 0 15px 0; color: ${textDark}; font-size: 14px; font-weight: bold;">Top Extras (Con Costo)</p>
                        ${topToppingsPaid.map((p:any) => `
                            <div style="margin-bottom: 12px;">
                                <div style="display: flex; justify-content: space-between; font-size: 13px;">
                                    <span style="color: ${textDark};">${p.name}</span>
                                    <span style="color: #ea580c; font-weight:bold;">${p.qty} usos</span>
                                </div>
                                ${renderBar(p.qty, maxPaid, "#f97316")}
                            </div>
                        `).join('')}
                    </td>
                </tr>
            </table>
        </div>

        ${expenses && expenses.length > 0 ? `
        <div style="margin-top: 40px; border-top: 2px solid #e4e4e7; padding-top: 30px;">
            <p style="margin: 0 0 15px 0; color: ${textDark}; font-size: 16px; font-weight: bold;">Desglose de Gastos Físicos</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; text-align: left;">
                <thead>
                    <tr style="background-color: ${bgLight}; color: ${textDark}; font-weight: bold; border-bottom: 1px solid #e4e4e7;">
                        <th style="padding: 10px 5px;">Fecha</th>
                        <th style="padding: 10px 5px;">Categoría</th>
                        <th style="padding: 10px 5px;">Descripción</th>
                        <th style="padding: 10px 5px; text-align: right;">Monto</th>
                    </tr>
                </thead>
                <tbody>
                    ${expenses.map((e:any) => `
                        <tr style="border-bottom: 1px solid #e4e4e7;">
                            <td style="padding: 10px 5px; color: ${textGray};">${new Date(e.date).toLocaleDateString('es-MX')}</td>
                            <td style="padding: 10px 5px; color: ${textDark}; font-weight: bold;">${e.category}</td>
                            <td style="padding: 10px 5px; color: ${textDark};">${e.description}</td>
                            <td style="padding: 10px 5px; text-align: right; color: #ef4444; font-weight: bold;">-$${e.amount.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>` : ''}

        <div style="margin-top: 40px; border-top: 2px solid #e4e4e7; padding-top: 30px;">
            <p style="margin: 0; color: ${textDark}; font-size: 16px; font-weight: bold;">Auditoria Operativa (Cortes de Caja)</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; text-align: left;">
                <thead>
                    <tr style="background-color: ${bgLight}; color: ${textDark}; font-weight: bold; border-bottom: 1px solid #e4e4e7;">
                        <th style="padding: 10px 5px;">Día</th>
                        <th style="padding: 10px 5px;">Cajero</th>
                        <th style="padding: 10px 5px;">Ventas Efct</th>
                        <th style="padding: 10px 5px;">Retiros</th>
                        <th style="padding: 10px 5px;">Esperado</th>
                        <th style="padding: 10px 5px;">Reportado</th>
                        <th style="padding: 10px 5px; text-align: right;">Diferencia</th>
                    </tr>
                </thead>
                <tbody>
                    ${audit.map((a:any) => {
                        const expected = a.fondo + a.ventas + a.propinas - a.retiros;
                        const diff = a.reportado - expected;
                        const diffColor = Math.abs(diff) <= 0.5 ? '#16a34a' : (diff < 0 ? '#ef4444' : '#ca8a04');
                        const diffText = Math.abs(diff) <= 0.5 ? 'Exacto' : (diff < 0 ? `Falta $${Math.abs(diff).toFixed(2)}` : `Sobra $${diff.toFixed(2)}`);
                        const [year, month, day] = a.date.split('-');
                        const cajerosStr = Array.isArray(a.cajero) ? a.cajero.join(', ') : (a.cajero || 'N/A'); // 🌟 CORRECCIÓN DEFINITIVA DE N/A
                        return `
                        <tr style="border-bottom: 1px solid #e4e4e7;">
                            <td style="padding: 10px 5px; color: ${textGray};">${day}/${month}</td>
                            <td style="padding: 10px 5px; color: ${textDark}; font-weight: bold;">${cajerosStr}</td>
                            <td style="padding: 10px 5px; color: #16a34a;">$${a.ventas.toFixed(2)}</td>
                            <td style="padding: 10px 5px; color: #ef4444;">-$${a.retiros.toFixed(2)}</td>
                            <td style="padding: 10px 5px; color: ${textDark};">$${expected.toFixed(2)}</td>
                            <td style="padding: 10px 5px; color: ${textDark}; font-weight: bold;">$${a.reportado.toFixed(2)}</td>
                            <td style="padding: 10px 5px; text-align: right; color: ${diffColor}; font-weight: bold;">${diffText}</td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <div style="margin-top: 40px; border-top: 2px solid #e4e4e7; padding-top: 30px;">
            <p style="margin: 0; color: ${textDark}; font-size: 16px; font-weight: bold;">Nomina Calculada a Pagar</p>
            <p style="margin: 5px 0 15px 0; color: ${textGray}; font-size: 11px;">*Las propinas por tarjeta ya tienen descontado el 4.06% de MP.</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; text-align: left;">
                <thead>
                    <tr style="background-color: ${bgLight}; color: ${textDark}; font-weight: bold; border-bottom: 1px solid #e4e4e7;">
                        <th style="padding: 10px 5px;">Cajero</th>
                        <th style="padding: 10px 5px;">Días Trab.</th>
                        <th style="padding: 10px 5px;">Sueldo Base</th>
                        <th style="padding: 10px 5px;">Propinas (Netas)</th>
                        <th style="padding: 10px 5px;">Ajuste Luis</th>
                        <th style="padding: 10px 5px; text-align: right;">Total a Pagar</th>
                    </tr>
                </thead>
                <tbody>
                    ${nomina.map((n:any) => `
                        <tr style="border-bottom: 1px solid #e4e4e7;">
                            <td style="padding: 10px 5px; color: ${textDark}; font-weight: bold;">${n.cajero}</td>
                            <td style="padding: 10px 5px; color: ${textGray};">${n.diasTrabajados}</td>
                            <td style="padding: 10px 5px; color: ${textDark};">$${n.sueldoBase.toFixed(2)}</td>
                            <td style="padding: 10px 5px; color: #db2777;">+$${n.propinasNetas.toFixed(2)}</td>
                            <td style="padding: 10px 5px; color: ${primaryBlue};">${n.ajuste >= 0 ? '+' : ''}$${n.ajuste.toFixed(2)}</td>
                            <td style="padding: 10px 5px; text-align: right; color: ${primaryBlue}; font-weight: bold; font-size: 14px;">$${n.totalPagar.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <p style="text-align: center; color: ${textGray}; font-size: 11px; margin-top: 50px; border-top: 1px solid #e4e4e7; padding-top: 20px;">Este reporte fue generado automáticamente por Maiztros BI.</p>
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
// GET: CIERRES DE CAJA DIARIOS AUTOMÁTICOS
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
        const totalVentas = ventasEfectivo + ventasTarjeta;
        
        const retiros = lastShift.movements.filter(m => m.type === 'OUT').reduce((acc, m) => acc + m.amount, 0);
        const esperadoEnCaja = (lastShift.startingCash || 0) + ventasEfectivo + propinasEfectivo - retiros;
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
                        <td style="padding: 15px; border: 1px solid #e2e8f0;">$${totalVentas.toFixed(2)}</td>
                        <td style="padding: 15px; border: 1px solid #e2e8f0; color: #ea580c;">-$${comisionesTerminal.toFixed(2)}</td>
                        <td style="padding: 15px; border: 1px solid #e2e8f0; color: #db2777;">+$${propinasTotalesNetas.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <div style="background-color: #f0fdf4; padding: 25px; border-radius: 12px; margin-top: 25px; border: 1px solid #bbf7d0;">
                <p style="margin: 0 0 15px 0; color: #16a34a; font-size: 16px; font-weight: bold;">Auditoría de Caja Física (Solo Efectivo)</p>
                
                <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #dcfce7;">
                        <td style="padding: 8px 0; color: #374151;">Fondo Inicial:</td>
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
                        <span>Esperado en Caja:</span> <b>$${esperadoEnCaja.toFixed(2)}</b>
                    </p>
                    <p style="margin: 8px 0 0 0; display: flex; justify-content: space-between; font-size: 20px; font-weight: bold;">
                        <span>Cajero Reportó:</span> <b>$${(lastShift.reportedCash || 0).toFixed(2)}</b>
                    </p>
                </div>
                
                <div style="margin-top: 20px; text-align: center; padding: 15px; border-radius: 8px; background-color: ${Math.abs(diferencia) <= 0.5 ? '#dcfce7' : (diferencia < 0 ? '#fee2e2' : '#fef3c7')};">
                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${Math.abs(diferencia) <= 0.5 ? '#15803d' : (diferencia < 0 ? '#b91c1c' : '#b45309')};">
                        DIFERENCIA: ${Math.abs(diferencia) <= 0.5 ? 'CAJA CUADRADA ✅' : (diferencia < 0 ? `FALTAN $${Math.abs(diferencia).toFixed(2)} ❌` : `SOBRAN $${diferencia.toFixed(2)} ⚠️`)}
                    </p>
                </div>
            </div>

            <div style="background-color: #fff7ed; padding: 25px; border-radius: 12px; margin-top: 25px; border: 1px solid #fed7aa;">
                <p style="margin: 0 0 15px 0; color: #ea580c; font-size: 16px; font-weight: bold;">Transacciones MercadoPago (Terminal)</p>
                <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #ffedd5;">
                        <td style="padding: 8px 0; color: #374151;">Cobrado en Terminal (Ventas + Propinas):</td>
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
            subject: `🌽 Corte Diario: ${lastShift.openedBy} | Diferencia: $${diferencia.toFixed(2)}`,
            html
        });
        return NextResponse.json({ success: true, message: "Corte diario enviado" });
    }

    // Cron semanal mantenido igual...
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
