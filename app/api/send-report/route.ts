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
        startDate, endDate, story,
        ventasNetas, gastosTotales, comisionesTerminal, utilidadNeta, 
        ventasEfectivo, ventasTarjeta, totalDescuentos,
        topProducts, topToppingsPaid,
        audit, nomina 
    } = await req.json();

    const renderBar = (qty: number, max: number, color: string) => {
        const pct = max > 0 ? (qty / max) * 100 : 0;
        return `<div style="background-color: #e4e4e7; width: 100%; height: 8px; border-radius: 4px; margin-top: 5px; overflow: hidden;">
                  <div style="background-color: ${color}; width: ${pct}%; height: 100%; border-radius: 4px;"></div>
                </div>`;
    };

    const maxProd = topProducts.length > 0 ? Math.max(...topProducts.map((p:any) => p.qty)) : 1;
    const maxPaid = topToppingsPaid.length > 0 ? Math.max(...topToppingsPaid.map((p:any) => p.qty)) : 1;

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

        <table style="width: 100%; margin-top: 30px; border-collapse: collapse; text-align: center; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden;">
            <thead>
                <tr style="background-color: ${bgLight}; color: ${textDark}; font-size: 11px; font-weight: bold;">
                    <th style="padding: 12px; border: 1px solid #e4e4e7;">Ingresos Brutos</th>
                    <th style="padding: 12px; border: 1px solid #e4e4e7;">Gastos Op.</th>
                    <th style="padding: 12px; border: 1px solid #e4e4e7;">Comisiones MP</th>
                    <th style="padding: 12px; border: 1px solid #e4e4e7;">Utilidad Neta</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 15px 10px; border: 1px solid #e4e4e7; font-size: 18px; font-weight: bold; color: ${textDark};">$${ventasNetas.toFixed(2)}</td>
                    <td style="padding: 15px 10px; border: 1px solid #e4e4e7; font-size: 18px; font-weight: bold; color: #ef4444;">-$${gastosTotales.toFixed(2)}</td>
                    <td style="padding: 15px 10px; border: 1px solid #e4e4e7; font-size: 18px; font-weight: bold; color: #f97316;">-$${comisionesTerminal.toFixed(2)}</td>
                    <td style="padding: 15px 10px; border: 1px solid #e4e4e7; font-size: 18px; font-weight: bold; color: ${utilidadNeta >= 0 ? '#16a34a' : '#ef4444'};">$${utilidadNeta.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>

        <div style="margin-top: 20px; text-align: center; font-size: 13px; color: ${textGray};">
            <p style="margin: 0;">Efectivo (Caja): <b>$${ventasEfectivo.toFixed(2)}</b> | Tarjeta (Banco): <b>$${ventasTarjeta.toFixed(2)}</b> | Costo VIP: <b>-$${totalDescuentos.toFixed(2)}</b></p>
        </div>

        <div style="margin-top: 40px; border-top: 2px solid #e4e4e7; padding-top: 30px;">
            <p style="margin: 0; color: ${textDark}; font-size: 16px; font-weight: bold;">Rendimiento de Productos</p>
            
            <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
                <tr>
                    <td style="width: 48%; vertical-align: top; padding-right: 2%">
                        <p style="margin: 0; color: ${textDark}; font-size: 14px; font-weight: bold;">Top 10 Productos Base</p>
                        <div style="margin-top: 15px;">
                            ${topProducts.map((p:any) => `
                                <div style="margin-bottom: 12px;">
                                    <div style="display: flex; justify-content: space-between; font-size: 13px;">
                                        <span style="color: ${textDark};">${p.name}</span>
                                        <span style="color: #16a34a; font-weight:bold;">${p.qty} unds</span>
                                    </div>
                                    ${renderBar(p.qty, maxProd, primaryBlue)}
                                </div>
                            `).join('')}
                        </div>
                    </td>
                    <td style="width: 48%; vertical-align: top; padding-left: 2%">
                        <p style="margin: 0; color: ${textDark}; font-size: 14px; font-weight: bold;">Top Extras (Con Costo)</p>
                        <div style="margin-top: 15px;">
                            ${topToppingsPaid.map((p:any) => `
                                <div style="margin-bottom: 12px;">
                                    <div style="display: flex; justify-content: space-between; font-size: 13px;">
                                        <span style="color: ${textDark};">${p.name}</span>
                                        <span style="color: #ca8a04; font-weight:bold;">${p.qty} usos</span>
                                    </div>
                                    ${renderBar(p.qty, maxPaid, "#f97316")}
                                </div>
                            `).join('')}
                        </div>
                    </td>
                </tr>
            </table>
        </div>

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
                        const cajerosStr = Array.from(a.cajero).join(', ') || 'N/A';
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
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
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
// GET: CIERRES DE CAJA Y CRON JOBS
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

        const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #18181b; padding: 30px; border-radius: 16px; border: 1px solid #e4e4e7;">
            <h1 style="color: #ca8a04; text-align: center; margin-bottom: 0;">🌽 CORTE DE CAJA DIARIO</h1>
            <p style="text-align: center; color: #71717a; margin-top: 5px;">Reporte Automático de Operación</p>

            <div style="background-color: #f4f4f5; padding: 20px; border-radius: 12px; margin-top: 30px; border-left: 5px solid #2563eb;">
                <h3 style="margin: 0 0 15px 0; color: #2563eb;">⏱️ Datos del Turno</h3>
                <p style="margin: 5px 0;"><strong>Cajero Responsable:</strong> ${lastShift.openedBy}</p>
                <p style="margin: 5px 0;"><strong>Hora de Entrada:</strong> ${openedAt}</p>
                <p style="margin: 5px 0; color: #ef4444;"><strong>Hora de Salida:</strong> ${closedAt}</p>
            </div>

            <div style="background-color: #f4f4f5; padding: 20px; border-radius: 12px; margin-top: 20px; border-left: 5px solid #16a34a;">
                <h3 style="margin: 0 0 15px 0; color: #16a34a;">⚖️ Auditoría de Caja Física (Efectivo)</h3>
                <p style="margin: 5px 0; display: flex; justify-content: space-between; font-size: 14px;"><span>Fondo Inicial:</span> <b>$${lastShift.startingCash?.toFixed(2)}</b></p>
                <p style="margin: 5px 0; display: flex; justify-content: space-between; font-size: 14px;"><span>Ventas Efectivo:</span> <b>+$${ventasEfectivo.toFixed(2)}</b></p>
                <p style="margin: 5px 0; display: flex; justify-content: space-between; font-size: 14px;"><span>Propinas Efct:</span> <b style="color:#db2777;">+$${propinasEfectivo.toFixed(2)}</b></p>
                <p style="margin: 5px 0; display: flex; justify-content: space-between; font-size: 14px;"><span>Retiros/Gastos:</span> <b style="color:#ef4444;">-$${retiros.toFixed(2)}</b></p>
                <hr style="border: 1px dashed #e4e4e7; margin: 15px 0;" />
                <p style="margin: 5px 0; display: flex; justify-content: space-between; font-size: 14px; color: #71717a;"><span>Dinero que DEBE haber:</span> <b>$${esperadoEnCaja.toFixed(2)}</b></p>
                <h2 style="margin: 10px 0 0 0; display: flex; justify-content: space-between; font-size: 20px;"><span>Dinero que REPORTASTE:</span> <b>$${(lastShift.reportedCash || 0).toFixed(2)}</b></h2>
                
                <h3 style="margin: 20px 0 0 0; text-align: right; color: ${Math.abs(diferencia) <= 0.5 ? '#16a34a' : (diferencia < 0 ? '#ef4444' : '#ca8a04')}; font-size: 18px;">
                    Diferencia: ${Math.abs(diferencia) <= 0.5 ? 'Exacto (Caja Cuadrada)' : (diferencia < 0 ? `FALTA $${Math.abs(diferencia).toFixed(2)}` : `SOBRA $${diferencia.toFixed(2)}`)}
                </h3>
            </div>

            <div style="background-color: #f4f4f5; padding: 20px; border-radius: 12px; margin-top: 20px; border-left: 5px solid #f97316;">
                <h3 style="margin: 0 0 15px 0; color: #ea580c;">💳 Terminal y Propinas MercadoPago</h3>
                <p style="margin: 5px 0; display: flex; justify-content: space-between; font-size: 14px;"><span>Ventas Cobradas en Tarjeta:</span> <b>$${ventasTarjeta.toFixed(2)}</b></p>
                <p style="margin: 5px 0; display: flex; justify-content: space-between; font-size: 14px;"><span>Comisión MP (4.06%):</span> <b style="color:#ef4444;">-$${comisionesTerminal.toFixed(2)}</b></p>
                <p style="margin: 5px 0; display: flex; justify-content: space-between; font-size: 14px;"><span>Propinas Tarjeta Brutas:</span> <b>$${propinasTarjetaBrutas.toFixed(2)}</b></p>
                <p style="margin: 5px 0; display: flex; justify-content: space-between; font-size: 14px;"><span>Propinas Tarjeta Netas (Para el cajero):</span> <b style="color:#16a34a;">$${propinasTarjetaNetas.toFixed(2)}</b></p>
            </div>

            <p style="text-align: center; color: #71717a; font-size: 11px; margin-top: 40px; border-top: 1px solid #e4e4e7; padding-top: 10px;">Enviado automáticamente por Maiztros Bot.</p>
        </div>`;

        await transporter.sendMail({
            from: '"Maiztros Bot" <maiztrosqro@gmail.com>',
            to: 'maiztrosqro@gmail.com',
            subject: `🌽 Corte Diario: ${lastShift.openedBy} | Diferencia: $${diferencia.toFixed(2)}`,
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
            <h1 style="color: #2563eb; text-align: center; margin-bottom: 0;">📊 REPORTE EJECUTIVO SEMANAL</h1>
            <p style="text-align: center; color: #71717a; margin-top: 5px;">Del ${startLastWeek.toLocaleDateString('es-MX')} al ${endLastWeek.toLocaleDateString('es-MX')}</p>

            <div style="background-color: #f4f4f5; padding: 30px; border-radius: 12px; margin-top: 30px; text-align: center; border: 2px solid ${growth >= 0 ? '#16a34a' : '#ef4444'};">
                <h3 style="margin: 0 0 10px 0; color: #3f3f46; font-weight: normal;">Ventas de la Semana</h3>
                <h1 style="margin: 0; font-size: 48px; color: #18181b;">$${salesLastWeek.toFixed(2)}</h1>
                <p style="margin: 15px 0 0 0; font-size: 18px; font-weight: bold; color: ${growth >= 0 ? '#16a34a' : '#ef4444'};">
                    ${growth >= 0 ? '📈 Creciste un' : '📉 Caíste un'} ${Math.abs(growth).toFixed(1)}% vs la semana anterior.
                </p>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #71717a;">(Semana anterior: $${salesPrevWeek.toFixed(2)})</p>
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
