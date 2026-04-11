// @ts-nocheck
/* eslint-disable */
'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function AdminWrapper() {
    return (
        <ProtectedRoute title="Luis - Centro de Control" requiredRole="ADMIN">
            {(userRole: 'ADMIN' | 'CAJERO' | 'KDS') => <AdminDashboard role={userRole || 'ADMIN'} />}
        </ProtectedRoute>
    );
}

function AdminDashboard({ role }: { role: 'ADMIN' | 'CAJERO' | 'KDS' }) {
  const [activeTab, setActiveTab] = useState<'FINANZAS' | 'VENTAS' | 'INVENTARIO' | 'PANICO' | 'MARKETING' | 'AUDITORIA' | 'CLIENTES' | 'BI'>(role === 'ADMIN' ? 'FINANZAS' : 'VENTAS');
  const [data, setData] = useState<any>({ products: [], modifiers: [], coupons: [], orders: [], shifts: [], inventoryItems: [], expenses: [], auditLogs: [], customers: [], biExtraStats: null });
  const [loading, setLoading] = useState(true);
  const [emailSending, setEmailSending] = useState(false);
  const [ticketEmailing, setTicketEmailing] = useState<string | null>(null);

  const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const [startDate, setStartDate] = useState(lastWeek.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(todayStr);
  
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('INSUMOS');
  const [newExpenseDesc, setNewExpenseDesc] = useState('');

  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('');
  const [newCouponType, setNewCouponType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [newCouponMinAmount, setNewCouponMinAmount] = useState('');

  const [addAmounts, setAddAmounts] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin?startDate=${startDate}&endDate=${endDate}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [startDate, endDate]);

  const getAuthorName = () => role === 'ADMIN' ? 'Luis (Jefe)' : 'Cajero (Staff)';

  const initInventory = async () => {
    if (!confirm("Esto cargará los datos iniciales. ¿Estás seguro?")) return;
    await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'init_inventory', author: getAuthorName() }) });
    fetchData();
  };

  const updatePhysicalStock = async (id: string, newStock: string) => {
    if (newStock === '') return;
    setData({ ...data, inventoryItems: data.inventoryItems.map((i:any) => i.id === id ? { ...i, stock: parseFloat(newStock) } : i) });
    await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, type: 'update_stock', newStock, author: getAuthorName() }) });
  };

  const addPhysicalStock = async (id: string) => {
    const amount = addAmounts[id];
    if (!amount || isNaN(parseFloat(amount))) return;
    setData({ ...data, inventoryItems: data.inventoryItems.map((i:any) => i.id === id ? { ...i, stock: i.stock + parseFloat(amount) } : i) });
    setAddAmounts({ ...addAmounts, [id]: '' }); 
    await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, type: 'add_stock', addAmount: amount, author: getAuthorName() }) });
  };

  const toggleStatus = async (id: string, type: 'product' | 'modifier' | 'coupon' | 'inventory_toggle', currentStatus: boolean) => {
    if (type === 'product') setData({ ...data, products: data.products.map((i:any) => i.id === id ? { ...i, isAvailable: !currentStatus } : i) });
    else if (type === 'modifier') setData({ ...data, modifiers: data.modifiers.map((i:any) => i.id === id ? { ...i, isAvailable: !currentStatus } : i) });
    else if (type === 'inventory_toggle') setData({ ...data, inventoryItems: data.inventoryItems.map((i:any) => i.id === id ? { ...i, isAvailable: !currentStatus } : i) });
    else if (type === 'coupon') setData({ ...data, coupons: data.coupons.map((i:any) => i.id === id ? { ...i, isActive: !currentStatus } : i) });
    await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, type, [type === 'coupon' ? 'isActive' : 'isAvailable']: !currentStatus, author: getAuthorName() }) });
  };

  const toggleCategory = async (category: string, isModifier: boolean, currentItems: any[]) => {
    const targetState = !currentItems.every((i:any) => i.isAvailable); 
    if (isModifier) setData({ ...data, modifiers: data.modifiers.map((m:any) => m.type === category ? { ...m, isAvailable: targetState } : m) });
    else setData({ ...data, products: data.products.map((p:any) => p.category === category ? { ...p, isAvailable: targetState } : p) });
    await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'toggle_category', category, targetState, isModifier, author: getAuthorName() }) });
  };

  const handleCreateCoupon = async () => {
    if (!newCouponCode || !newCouponDiscount) return alert('Llena los datos del cupón');
    const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'coupon', code: newCouponCode, discount: newCouponDiscount, discountType: newCouponType, minAmount: newCouponMinAmount, author: getAuthorName() }) });
    const json = await res.json();
    if (json.success) { setNewCouponCode(''); setNewCouponDiscount(''); setNewCouponMinAmount(''); fetchData(); } 
    else { alert(json.error || 'Error al crear cupón'); }
  };

  const deleteCoupon = async (id: string) => {
    if(!confirm("¿Eliminar este cupón definitivamente?")) return;
    setData({ ...data, coupons: data.coupons.filter((c:any) => c.id !== id) });
    await fetch(`/api/admin?id=${id}&type=coupon&author=${getAuthorName()}`, { method: 'DELETE' });
  };

  const handleAddExpense = async () => {
    if (!newExpenseAmount || !newExpenseDesc) return alert('Llena todos los campos del gasto');
    const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'expense', amount: newExpenseAmount, category: newExpenseCategory, description: newExpenseDesc, author: getAuthorName() }) });
    const json = await res.json();
    if (json.success) { setNewExpenseAmount(''); setNewExpenseDesc(''); fetchData(); } 
    else { alert('Error al registrar gasto'); }
  };

  const deleteExpense = async (id: string) => {
    if(!confirm("¿Eliminar este registro de gasto?")) return;
    setData({ ...data, expenses: data.expenses.filter((e:any) => e.id !== id) });
    await fetch(`/api/admin?id=${id}&type=expense&author=${getAuthorName()}`, { method: 'DELETE' });
  };

  const handleRefund = async (orderId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta orden?')) return;
    setData({ ...data, orders: data.orders.map((o:any) => o.id === orderId ? { ...o, status: 'REFUNDED' } : o) });
    await fetch('/api/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, newStatus: 'REFUNDED' }) });
    await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'audit', action: 'ORDEN_CANCELADA', details: `Orden ID: ${orderId}`, author: getAuthorName() }) });
  };

  const exportToCSV = () => {
    let csv = 'Turno,Estado,Fecha,Cliente,MetodoPago,Canal,MontoBruto,Descuento,MontoNeto,Cupon\n';
    data.orders.forEach((o:any) => { const date = new Date(o.createdAt); csv += `${o.turnNumber},${o.status},${date.toLocaleDateString()},${o.customerName},${o.paymentMethod},${o.orderType || 'DINE_IN'},${o.totalAmount + (o.pointsDiscount||0)},${o.pointsDiscount||0},${o.totalAmount},${o.couponCode||'N/A'}\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Maiztros_Ventas.csv`; a.click();
  };

  const getTicketUrl = (turnNumber: string) => `${typeof window !== 'undefined' ? window.location.origin : 'https://maiztros.vercel.app'}/ticket/${turnNumber}`;
  
  const sendWhatsAppPromo = (phone: string, name: string) => {
    const text = `¡Hola ${name}! 🌽 Vimos que eres uno de nuestros mejores clientes en Maiztros. Entra a tu portal VIP para conocer tus promociones de hoy. ¡Te esperamos!`;
    window.open(`https://api.whatsapp.com/send?phone=52${phone}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const sendTicketEmail = async (orderId: string, orderUrl: string, turnNumber: string) => {
      const email = window.prompt(`Ingresa el correo del cliente (Ticket #${turnNumber}):`);
      if (!email) return;

      setTicketEmailing(orderId);
      try {
          const res = await fetch('/api/send-ticket', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, orderUrl, turnNumber })
          });
          const json = await res.json();
          if (json.success) alert("✅ Ticket enviado exitosamente a " + email);
          else alert("❌ Error al enviar el ticket: " + json.error);
      } catch (e) {
          alert("Error de red al enviar el correo.");
      }
      setTicketEmailing(null);
  };

  // ==========================================
  // CÁLCULOS FINANCIEROS Y DE BI
  // ==========================================
  const validOrders = data.orders ? data.orders.filter((o:any) => o.status !== 'REFUNDED') : []; 
  const totalOrders = validOrders.length;
  
  const ventasNetas = validOrders.reduce((acc: number, o: any) => acc + o.totalAmount, 0);
  const totalDescuentos = validOrders.reduce((acc: number, o: any) => acc + (o.pointsDiscount || 0), 0);
  const gastosTotales = data.expenses ? data.expenses.reduce((acc: number, e: any) => acc + e.amount, 0) : 0;
  
  const utilidadNeta = ventasNetas - gastosTotales;
  const margenGanancia = ventasNetas > 0 ? (utilidadNeta / ventasNetas) * 100 : 0;
  const ticketPromedio = totalOrders > 0 ? (ventasNetas / totalOrders) : 0;

  const ventasEfectivo = validOrders.filter((o:any) => o.paymentMethod === 'EFECTIVO_CAJA').reduce((acc:number, o:any) => acc + o.totalAmount, 0);
  const ventasTarjeta = validOrders.filter((o:any) => o.paymentMethod === 'TERMINAL').reduce((acc:number, o:any) => acc + o.totalAmount, 0);

  const ventasVIP = validOrders.filter((o:any) => o.customerPhone || o.pointsDiscount > 0 || o.couponCode).reduce((acc:number, o:any) => acc + o.totalAmount, 0);
  const ventasGeneral = ventasNetas - ventasVIP;

  const ventasApp = validOrders.filter((o:any) => o.orderType === 'TAKEOUT').length;
  const ventasKiosco = validOrders.filter((o:any) => o.orderType === 'DINE_IN' || !o.orderType).length;
  
  const paymentData = [
    { name: 'Efectivo', value: ventasEfectivo, color: '#4ade80' },
    { name: 'Tarjeta', value: ventasTarjeta, color: '#60a5fa' }
  ];
  const vipData = [
    { name: 'Clientes VIP', value: ventasVIP, color: '#facc15' },
    { name: 'Público General', value: ventasGeneral, color: '#71717a' }
  ];

  const retencionStats = data.biExtraStats?.retention || { new: 0, returning: 0, general: 0 };
  const totalVipOrders = retencionStats.new + retencionStats.returning;
  const returningPct = totalVipOrders > 0 ? (retencionStats.returning / totalVipOrders) * 100 : 0;
  const retentionData = [
      { name: 'VIP Recurrentes', value: retencionStats.returning, color: '#4ade80' }, 
      { name: 'VIP Nuevos', value: retencionStats.new, color: '#facc15' } 
  ];

  const totalPuntosEmitidos = data.customers?.reduce((acc: number, c: any) => acc + c.points, 0) || 0;
  const deudaLealtad = totalPuntosEmitidos * 0.08; 

  const hourMap = validOrders.reduce((acc: any, order: any) => {
    const hour = new Date(order.createdAt).getHours();
    const label = `${hour}:00`;
    acc[label] = (acc[label] || 0) + order.totalAmount;
    return acc;
  }, {});
  const hourChartData = Object.keys(hourMap).map(h => ({ Hora: h, Ventas: hourMap[h] })).sort((a:any, b:any) => parseInt(a.Hora) - parseInt(b.Hora));

  const daysMapObj: Record<number, string> = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' };
  const dayMap = validOrders.reduce((acc: any, order: any) => {
    const dayIndex = new Date(order.createdAt).getDay();
    const label = daysMapObj[dayIndex];
    acc[label] = (acc[label] || 0) + order.totalAmount;
    return acc;
  }, {});
  const orderOfDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const dayChartData = orderOfDays.map(d => ({ Dia: d, Ventas: dayMap[d] || 0 }));

  const productVolume: any = {};
  const toppingVolumePaid: any = {};
  const toppingVolumeFree: any = {};
  
  validOrders.forEach((o: any) => {
      if(o.items) {
          const itemsArr = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
          itemsArr.forEach((item: any) => {
              const name = item.product?.name || 'Desconocido';
              productVolume[name] = (productVolume[name] || 0) + (item.quantity || 1);
              
              if (item.notes) {
                  const parts = item.notes.split(/[|,]/);
                  parts.forEach((p: string) => {
                      const noteText = p.toLowerCase();
                      const isFree = noteText.includes('chile') || noteText.includes('restricción') || noteText.includes('sin ');
                      const cleanIng = p.split(':')[1]?.trim() || p.trim();
                      
                      if (cleanIng && !cleanIng.toLowerCase().includes('mediano') && !cleanIng.toLowerCase().includes('grande') && cleanIng !== 'Natural') {
                          if (isFree) {
                              toppingVolumeFree[cleanIng] = (toppingVolumeFree[cleanIng] || 0) + (item.quantity || 1);
                          } else {
                              toppingVolumePaid[cleanIng] = (toppingVolumePaid[cleanIng] || 0) + (item.quantity || 1);
                          }
                      }
                  });
              }
          });
      }
  });

  const topProductsData = Object.keys(productVolume).map(name => ({ name, qty: productVolume[name] })).sort((a:any, b:any) => b.qty - a.qty).slice(0, 10);
  const topToppingsPaidData = Object.keys(toppingVolumePaid).map(name => ({ name, qty: toppingVolumePaid[name] })).sort((a:any, b:any) => b.qty - a.qty).slice(0, 10);
  const topToppingsFreeData = Object.keys(toppingVolumeFree).map(name => ({ name, qty: toppingVolumeFree[name] })).sort((a:any, b:any) => b.qty - a.qty).slice(0, 10);

  const maxProductQty = Math.max(1, ...topProductsData.map(d => d.qty));
  const maxPaidQty = Math.max(1, ...topToppingsPaidData.map(d => d.qty));
  const maxFreeQty = Math.max(1, ...topToppingsFreeData.map(d => d.qty));
  const maxPairQty = data.biExtraStats?.topPairs && data.biExtraStats.topPairs.length > 0 ? Math.max(1, ...data.biExtraStats.topPairs.map((d:any) => d.qty)) : 1;

  const pilarColors: Record<string, string> = {
      'Esquites': '#eab308', 'Construpapas': '#ef4444', 'Obra Maestra': '#3b82f6', 'Don Maiztro': '#a855f7', 'Bebidas': '#0ea5e9', 'Extras/Upgrades': '#22c55e', 'Otros': '#71717a'
  };

  // ==========================================
  // AUDITORÍA DE CAJA: AGRUPADOR ESTRICTO POR DÍA
  // ==========================================
  const auditMap: Record<string, any> = {};

  const getStrictDate = (isoString: string) => {
      try {
          const d = new Date(isoString);
          d.setHours(d.getHours() - 6); 
          return d.toISOString().split('T')[0]; 
      } catch {
          return "Fecha Inválida";
      }
  };

  data.orders?.forEach((o: any) => {
      if (o.status !== 'REFUNDED' && o.paymentMethod === 'EFECTIVO_CAJA') {
          const dStr = getStrictDate(o.updatedAt || o.createdAt);
          if (!auditMap[dStr]) auditMap[dStr] = { date: dStr, fondo: 0, ventas: 0, propinas: 0, retiros: 0, reportado: 0, cajero: new Set() };
          auditMap[dStr].ventas += o.totalAmount;
          auditMap[dStr].propinas += (o.tipAmount || 0);
      }
  });

  data.shifts?.filter((s: any) => s.closedAt).forEach((s: any) => {
      const dStr = getStrictDate(s.openedAt);
      if (!auditMap[dStr]) auditMap[dStr] = { date: dStr, fondo: 0, ventas: 0, propinas: 0, retiros: 0, reportado: 0, cajero: new Set() };
      auditMap[dStr].fondo += (s.startingCash || 0);
      auditMap[dStr].reportado += (s.reportedCash || 0);
      auditMap[dStr].cajero.add(s.openedBy);
  });

  data.expenses?.forEach((e: any) => {
      if (e.category === 'CAJA_CHICA' || e.description.toLowerCase().includes('retiro')) {
          const dStr = getStrictDate(e.date || e.createdAt);
          if (!auditMap[dStr]) auditMap[dStr] = { date: dStr, fondo: 0, ventas: 0, propinas: 0, retiros: 0, reportado: 0, cajero: new Set() };
          auditMap[dStr].retiros += e.amount;
      }
  });

  const dailyAuditArray = Object.values(auditMap).sort((a: any, b: any) => b.date.localeCompare(a.date));

  // ==========================================
  // 🌟 NUEVO: MOTOR AUTOMÁTICO DE NÓMINA
  // ==========================================
  const nominaMap: Record<string, any> = {};

  data.shifts?.filter((s: any) => s.closedAt).forEach((shift: any) => {
      const cajero = shift.openedBy || 'Desconocido';
      if (!nominaMap[cajero]) {
          nominaMap[cajero] = {
              cajero,
              diasSet: new Set(),
              sueldoBase: 0,
              propinasTotales: 0,
              totalPagar: 0,
              turnos: []
          };
      }

      // Procesar tiempos del turno localizados a México
      const sStart = new Date(shift.openedAt);
      const sEnd = new Date(shift.closedAt);
      const dateStr = sStart.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });
      const timeIn = sStart.toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute:'2-digit' });
      const timeOut = sEnd.toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute:'2-digit' });

      // Agregamos la fecha al Set. Si un cajero abre y cierra 2 veces el mismo día, solo cuenta 1 día de base.
      nominaMap[cajero].diasSet.add(dateStr);

      // Buscar propinas EXACTAS que cayeron en el tiempo de vida de este turno
      let propinasTurnoEfectivo = 0;
      let propinasTurnoTarjeta = 0;

      data.orders?.forEach((o: any) => {
          const oTime = new Date(o.updatedAt || o.createdAt).getTime();
          if (o.status !== 'REFUNDED' && oTime >= sStart.getTime() && oTime <= sEnd.getTime()) {
              const tip = o.tipAmount || 0;
              if (o.paymentMethod === 'TERMINAL') propinasTurnoTarjeta += tip;
              else propinasTurnoEfectivo += tip;
          }
      });

      const propinasTotalTurno = propinasTurnoEfectivo + propinasTurnoTarjeta;
      nominaMap[cajero].propinasTotales += propinasTotalTurno;

      nominaMap[cajero].turnos.push({
          fecha: dateStr,
          entrada: timeIn,
          salida: timeOut,
          propinas: propinasTotalTurno,
          propinasEfct: propinasTurnoEfectivo,
          propinasTarj: propinasTurnoTarjeta
      });
  });

  // Consolidar la matemática final de la Nómina
  const nominaArray = Object.values(nominaMap).map(n => {
      const diasTrabajados = n.diasSet.size;
      n.diasTrabajados = diasTrabajados;
      n.sueldoBase = diasTrabajados * 200; // 💵 $200 pesos por día
      n.totalPagar = n.sueldoBase + n.propinasTotales;
      return n;
  }).sort((a, b) => b.totalPagar - a.totalPagar);


  // ==========================================
  // FUNCIONES DE EXPORTACIÓN Y REPORTE
  // ==========================================
  const generatePDF = () => {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("Reporte de Ventas Maiztros", 14, 20);
      doc.setFontSize(12);
      doc.text(`Periodo: ${startDate} al ${endDate}`, 14, 30);
      doc.text(`Ventas Netas: $${ventasNetas.toFixed(2)}`, 14, 40);
      doc.text(`Utilidad Neta: $${utilidadNeta.toFixed(2)}`, 14, 48);

      doc.setFontSize(16);
      doc.text("Top 10 Productos", 14, 65);
      const prodBody = topProductsData.map(p => [p.name, p.qty.toString()]);
      (doc as any).autoTable({ startY: 70, head: [['Producto', 'Unidades Vendidas']], body: prodBody });

      doc.save(`Maiztros_Reporte_${startDate}.pdf`);
  };

  const sendEmailReport = async () => {
      setEmailSending(true);
      try {
          const payload = {
              startDate, endDate, ventasNetas, gastosTotales, utilidadNeta,
              topProducts: topProductsData.slice(0,5)
          };
          const res = await fetch('/api/send-report', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          const json = await res.json();
          if (json.success) alert("✅ Reporte enviado a maiztrosqro@gmail.com");
          else alert("❌ Error al enviar: " + json.error);
      } catch (e) {
          alert("Error de conexión");
      }
      setEmailSending(false);
  };

  const renderInventoryGroup = (category: string, title: string, isManual: boolean = false) => {
    const items = data.inventoryItems?.filter((i: any) => i.category === category) || [];
    if (items.length === 0) return null;
    return (
      <div className={`mb-10 p-6 rounded-[2rem] border ${isManual ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-zinc-800 bg-zinc-950/30'}`}>
        <h3 className={`text-xl font-black mb-4 ${isManual ? 'text-yellow-400' : 'text-purple-400'}`}>{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item: any) => (
            <div key={item.id} className={`bg-zinc-900 p-5 rounded-2xl border ${item.stock <= 5 ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-zinc-800'}`}>
              <div className="flex justify-between items-center mb-3"><p className="font-bold text-white truncate text-lg">{item.name}</p><span className={`font-black text-xl ${item.stock <= 5 ? 'text-red-400' : 'text-green-400'}`}>{item.stock.toFixed(2)} <span className="text-xs text-zinc-500 uppercase">{item.unit}</span></span></div>
              <div className="flex gap-2">
                <div className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl overflow-hidden focus-within:border-yellow-400"><p className="text-[9px] text-zinc-500 font-bold uppercase text-center mt-1">Total</p><input type="number" defaultValue={item.stock} onBlur={(e) => updatePhysicalStock(item.id, e.target.value)} className="bg-transparent w-full p-2 text-center text-white font-bold outline-none"/></div>
                <div className="flex-1 flex bg-zinc-950 border border-blue-500/50 rounded-xl overflow-hidden focus-within:border-blue-400"><input type="number" value={addAmounts[item.id] || ''} onChange={(e) => setAddAmounts({...addAmounts, [item.id]: e.target.value})} placeholder="+ Sumar" className="bg-transparent w-full p-2 text-center text-blue-300 font-bold outline-none placeholder:text-blue-900/50 placeholder:text-xs"/><button onClick={() => addPhysicalStock(item.id)} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-3 transition-colors">+</button></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderPanicCategory = (categoryFilter: string, title: string, isModifier: boolean) => {
    const items = isModifier ? data.modifiers.filter((m:any) => m.type === categoryFilter) : data.products.filter((p:any) => p.category === categoryFilter);
    if (items.length === 0) return null;
    const allAvailable = items.every((i:any) => i.isAvailable);

    return (
      <div className="mb-6 bg-zinc-950 p-6 rounded-[2rem] border border-zinc-800">
        <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-3">
          <h3 className="text-lg font-black text-zinc-300">{title}</h3>
          <button onClick={() => toggleCategory(categoryFilter, isModifier, items)} className={`px-4 py-1.5 rounded-lg font-black text-xs uppercase transition-transform active:scale-95 ${allAvailable ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-green-500/10 text-green-400 border border-green-500/30'}`}>
            {allAvailable ? 'Apagar Todos' : 'Prender Todos'}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item: any) => (
            <button key={item.id} onClick={() => toggleStatus(item.id, isModifier ? 'modifier' : 'product', item.isAvailable)} className={`p-4 rounded-xl flex justify-between items-center border transition-all text-left ${item.isAvailable ? 'bg-zinc-900 border-zinc-700' : 'bg-red-950/20 border-red-900/50 text-red-400 opacity-70'}`}>
              <span className="font-bold text-sm truncate">{item.name}</span>
              <span className="text-lg">{item.isAvailable ? '✅' : '❌'}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderPanicSubOptions = (category: string, title: string) => {
    const items = data.inventoryItems.filter((i:any) => i.category === category);
    if (items.length === 0) return null;
    return (
      <div className="mb-6 bg-zinc-950 p-6 rounded-[2rem] border border-zinc-800">
        <h3 className="text-lg font-black text-zinc-300 mb-4 border-b border-zinc-800 pb-3">{title}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item: any) => (
            <button key={item.id} onClick={() => toggleStatus(item.id, 'inventory_toggle', item.isAvailable)} className={`p-4 rounded-xl flex justify-between items-center border transition-all text-left ${item.isAvailable ? 'bg-zinc-900 border-zinc-700' : 'bg-red-950/20 border-red-900/50 text-red-400 opacity-70'}`}>
              <span className="font-bold text-sm truncate">{item.name}</span>
              <span className="text-lg">{item.isAvailable ? '✅' : '❌'}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const TABS_ADMIN = ['FINANZAS', 'VENTAS', 'INVENTARIO', 'PANICO', 'MARKETING', 'AUDITORIA', 'CLIENTES', 'BI'];
  const TABS_CAJERO = ['VENTAS', 'INVENTARIO'];
  const allowedTabs = role === 'ADMIN' ? TABS_ADMIN : TABS_CAJERO;

  return (
      <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-10 font-sans max-w-7xl mx-auto pb-40">
        
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b border-zinc-800 pb-6 mb-8 gap-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl text-zinc-950 text-2xl font-black italic ${role === 'ADMIN' ? 'bg-yellow-400' : 'bg-blue-400'}`}>{role === 'ADMIN' ? 'M' : 'C'}</div>
            <div>
                <h1 className="text-3xl font-black tracking-tighter">MAIZTROS <span className="text-zinc-500 font-normal">BI</span></h1>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Sesión: <span className={role === 'ADMIN' ? 'text-yellow-400' : 'text-blue-400'}>{role}</span></p>
            </div>
          </div>
          <div className="flex flex-wrap bg-zinc-900/50 rounded-2xl p-1.5 border border-zinc-800 w-full xl:w-auto gap-1">
            {allowedTabs.map((tab: any) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl font-bold transition-all text-sm md:text-base ${activeTab === tab ? 'bg-yellow-400 text-zinc-950 shadow-lg' : 'text-zinc-500 hover:text-white'}`}>
                  {tab === 'CLIENTES' ? '👥 Clientes VIP' : tab === 'BI' ? '📊 BI & ESTRATEGIA' : tab}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex items-center gap-4 col-span-1 md:col-span-2">
                <input 
                    type="date" 
                    max={todayStr} 
                    value={startDate} 
                    onChange={e => {
                        setStartDate(e.target.value);
                        if (e.target.value > endDate) setEndDate(e.target.value);
                    }} 
                    className="bg-transparent text-white font-bold outline-none flex-1 w-full cursor-pointer"
                />
                <span className="text-zinc-600">→</span>
                <input 
                    type="date" 
                    max={todayStr} 
                    value={endDate} 
                    onChange={e => {
                        setEndDate(e.target.value);
                        if (e.target.value < startDate) setStartDate(e.target.value);
                    }} 
                    className="bg-transparent text-white font-bold outline-none flex-1 w-full cursor-pointer"
                />
            </div>
            {role === 'ADMIN' ? (
                <div className="bg-green-500/10 p-4 rounded-2xl border border-green-500/30 flex justify-between items-center">
                    <span className="text-xs font-bold text-green-500 tracking-widest">UTILIDAD P&L</span>
                    <span className="font-black text-xl text-green-400">${utilidadNeta.toFixed(0)}</span>
                </div>
            ) : <div></div>}
            <button onClick={fetchData} className="bg-zinc-800 hover:bg-zinc-700 text-white font-black p-4 rounded-2xl transition-colors">🔄 Aplicar / Sync</button>
        </div>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-zinc-500 font-bold animate-pulse">Procesando información...</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            
            {/* ======================================================== */}
            {/* 🌟 PESTAÑA: BUSINESS INTELLIGENCE Y ESTRATEGIA            */}
            {/* ======================================================== */}
            {activeTab === 'BI' && role === 'ADMIN' && (
                <div className="space-y-8">
                    
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <button onClick={generatePDF} className="flex-1 bg-zinc-100 hover:bg-white text-zinc-950 px-6 py-4 rounded-xl font-black shadow-lg transition-transform active:scale-95 text-center">📄 Descargar PDF Reporte</button>
                        <button onClick={sendEmailReport} disabled={emailSending} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-xl font-black shadow-lg transition-transform active:scale-95 disabled:opacity-50 text-center">
                            {emailSending ? 'Enviando...' : '📧 Enviar a maiztrosqro@gmail.com'}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800"><p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">Órdenes</p><p className="text-2xl lg:text-3xl font-black text-white">{totalOrders}</p></div>
                        <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800"><p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">Ticket Prom.</p><p className="text-2xl lg:text-3xl font-black text-yellow-400">${ticketPromedio.toFixed(2)}</p></div>
                        
                        {data.biExtraStats && (
                            <>
                                <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800"><p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">Moda Ticket</p><p className="text-2xl lg:text-3xl font-black text-purple-400">${data.biExtraStats.ticketModa.toFixed(2)}</p></div>
                                <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800"><p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">Con Extras</p><p className="text-2xl lg:text-3xl font-black text-blue-400">{totalOrders > 0 ? ((data.biExtraStats.extrasTicketsCount / totalOrders)*100).toFixed(0) : 0}%</p></div>
                                <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800"><p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2" title="Tiempo de Preparación de la Cocina (Minutos)">Tiempo Prep.</p><p className="text-2xl lg:text-3xl font-black text-orange-400">{data.biExtraStats.avgPrepTime.toFixed(1)} <span className="text-xs">min</span></p></div>
                                <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 col-span-2 md:col-span-1"><p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2" title="Adopción VIP General">Adopción VIP</p><p className="text-2xl lg:text-3xl font-black text-green-400">{(ventasNetas > 0 ? (ventasVIP/ventasNetas*100) : 0).toFixed(0)}%</p></div>
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-xl">
                            <h3 className="text-xl font-black mb-6 text-white flex items-center gap-2">📅 Ventas por Día</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dayChartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                                        <XAxis dataKey="Dia" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                                        <Tooltip contentStyle={{backgroundColor: '#09090b', borderRadius: '1rem', border: '1px solid #27272a'}} />
                                        <Bar dataKey="Ventas" fill="#a855f7" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-xl">
                            <h3 className="text-xl font-black mb-6 text-yellow-400 flex items-center gap-2">⏰ Tráfico por Horas</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={hourChartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                                        <XAxis dataKey="Hora" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                                        <Tooltip contentStyle={{backgroundColor: '#09090b', borderRadius: '1rem', border: '1px solid #27272a', color: '#fff'}} itemStyle={{ color: '#eab308', fontWeight: 'bold' }} />
                                        <Area type="monotone" dataKey="Ventas" stroke="#facc15" fill="#facc15" fillOpacity={0.2} strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        <div className="lg:col-span-2 bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-xl">
                            <h3 className="text-xl font-black mb-6 text-white flex items-center gap-2">🎯 Ventas por Pilar</h3>
                            {data.biExtraStats && data.biExtraStats.pilaresChart.length > 0 ? (
                                <div className="space-y-4">
                                    {data.biExtraStats.pilaresChart.map((pilar: any) => (
                                        <div key={pilar.name}>
                                            <div className="flex justify-between text-sm font-bold mb-1">
                                                <span>{pilar.name}</span>
                                                <span style={{ color: pilarColors[pilar.name] || '#ffffff' }}>${pilar.revenue.toFixed(2)}</span>
                                            </div>
                                            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                                                <div className="h-full" style={{ width: `${(pilar.revenue / data.biExtraStats.pilaresChart[0].revenue) * 100}%`, backgroundColor: pilarColors[pilar.name] || '#a1a1aa' }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-zinc-600 text-sm">Sin datos suficientes.</p>}
                        </div>

                        <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-xl flex flex-col items-center justify-center">
                            <h3 className="text-xl font-black mb-2 text-white w-full text-left">💳 Pagos</h3>
                            <div className="w-48 h-48 my-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={paymentData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                            {paymentData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{backgroundColor: '#09090b', borderRadius: '1rem', border: '1px solid #27272a'}} formatter={(value: number) => `$${value.toFixed(2)}`} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="w-full flex justify-between text-sm font-bold">
                                <span className="text-green-400">💵 ${(ventasEfectivo/ventasNetas*100 || 0).toFixed(0)}% Efct.</span>
                                <span className="text-blue-400">💳 ${(ventasTarjeta/ventasNetas*100 || 0).toFixed(0)}% Tarj.</span>
                            </div>
                        </div>

                        <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-xl flex flex-col items-center justify-center">
                            <h3 className="text-xl font-black mb-2 text-white w-full text-left">🔄 Retención VIP</h3>
                            <div className="w-48 h-48 my-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={retentionData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                            {retentionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{backgroundColor: '#09090b', borderRadius: '1rem', border: '1px solid #27272a'}} formatter={(value: number) => `${value} tickets`} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="w-full flex justify-between text-sm font-bold">
                                <span className="text-green-400">Regresan: {retencionStats.returning}</span>
                                <span className="text-yellow-400">Nuevos: {retencionStats.new}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-xl">
                            <h3 className="text-xl font-black mb-6 text-green-400">🌽 Top 10 Productos Base</h3>
                            <div className="space-y-4">
                                {topProductsData.length > 0 ? topProductsData.map((p, i) => (
                                    <div key={p.name} className="flex items-center gap-4">
                                        <span className="text-xs font-black text-zinc-600 w-4">0{i+1}</span>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <p className="text-sm font-bold truncate max-w-[150px]">{p.name}</p>
                                                <p className="text-xs font-black text-green-400">{p.qty} <span className="text-[10px] text-zinc-500 uppercase">unds</span></p>
                                            </div>
                                            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                                                <div className="bg-green-400 h-full rounded-full" style={{width: `${(p.qty / maxProductQty) * 100}%`}}></div>
                                            </div>
                                        </div>
                                    </div>
                                )) : <p className="text-zinc-600 text-sm">Sin datos suficientes.</p>}
                            </div>
                        </div>

                        <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-xl">
                            <div className="mb-6">
                                <h3 className="text-xl font-black text-pink-400">🛒 Se compran juntos (Afinidad)</h3>
                                <p className="text-xs text-zinc-500 font-bold mt-1">Combinaciones más frecuentes en un mismo ticket.</p>
                            </div>
                            <div className="space-y-4">
                                {data.biExtraStats && data.biExtraStats.topPairs.length > 0 ? data.biExtraStats.topPairs.map((p: any, i: number) => (
                                    <div key={p.name} className="flex items-center gap-4">
                                        <span className="text-xs font-black text-zinc-600 w-4">0{i+1}</span>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <p className="text-sm font-bold truncate max-w-[200px]">{p.name}</p>
                                                <p className="text-xs font-black text-pink-400">{p.qty} <span className="text-[10px] text-zinc-500 uppercase">tickets</span></p>
                                            </div>
                                            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                                                <div className="bg-pink-400 h-full rounded-full" style={{width: `${(p.qty / maxPairQty) * 100}%`}}></div>
                                            </div>
                                        </div>
                                    </div>
                                )) : <p className="text-zinc-600 text-sm">Sin datos suficientes.</p>}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-xl">
                            <div className="mb-6 flex justify-between items-end">
                                <div>
                                    <h3 className="text-xl font-black text-orange-400">🧀 Top Toppings (Con Costo)</h3>
                                    <p className="text-xs text-zinc-500 font-bold mt-1">Aderezos, Quesos, Polvos.</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {topToppingsPaidData.length > 0 ? topToppingsPaidData.map((t, i) => (
                                    <div key={t.name} className="flex items-center gap-4">
                                        <span className="text-xs font-black text-zinc-600 w-4">0{i+1}</span>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <p className="text-sm font-bold truncate max-w-[150px]">{t.name}</p>
                                                <p className="text-xs font-black text-orange-400">{t.qty} <span className="text-[10px] text-zinc-500 uppercase">usos</span></p>
                                            </div>
                                            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                                                <div className="bg-orange-400 h-full rounded-full" style={{width: `${(t.qty / maxPaidQty) * 100}%`}}></div>
                                            </div>
                                        </div>
                                    </div>
                                )) : <p className="text-zinc-600 text-sm">Sin datos suficientes.</p>}
                            </div>
                        </div>

                        <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-xl">
                            <div className="mb-6 flex justify-between items-end">
                                <div>
                                    <h3 className="text-xl font-black text-blue-400">🌶️ Top Toppings (Gratis / Barra)</h3>
                                    <p className="text-xs text-zinc-500 font-bold mt-1">Chiles y Restricciones (Sin...)</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {topToppingsFreeData.length > 0 ? topToppingsFreeData.map((t, i) => (
                                    <div key={t.name} className="flex items-center gap-4">
                                        <span className="text-xs font-black text-zinc-600 w-4">0{i+1}</span>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <p className="text-sm font-bold truncate max-w-[150px]">{t.name}</p>
                                                <p className="text-xs font-black text-blue-400">{t.qty} <span className="text-[10px] text-zinc-500 uppercase">usos</span></p>
                                            </div>
                                            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                                                <div className="bg-blue-400 h-full rounded-full" style={{width: `${(t.qty / maxFreeQty) * 100}%`}}></div>
                                            </div>
                                        </div>
                                    </div>
                                )) : <p className="text-zinc-600 text-sm">Sin datos suficientes.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* PESTAÑA: FINANZAS                                        */}
            {/* ======================================================== */}
            {activeTab === 'FINANZAS' && role === 'ADMIN' && (
              <div className="space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 shadow-xl relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 text-8xl opacity-10">📈</div>
                    <p className="text-zinc-500 font-bold uppercase tracking-widest mb-2 relative z-10">Ingresos Brutos</p>
                    <p className="text-5xl font-black text-white relative z-10">${ventasNetas.toFixed(2)}</p>
                  </div>
                  <div className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 shadow-xl relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 text-8xl opacity-10">💸</div>
                    <p className="text-zinc-500 font-bold uppercase tracking-widest mb-2 relative z-10">Gastos Operativos</p>
                    <p className="text-5xl font-black text-red-400 relative z-10">-${gastosTotales.toFixed(2)}</p>
                  </div>
                  <div className={`p-8 rounded-[2rem] border shadow-xl relative overflow-hidden ${utilidadNeta >= 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <div className="absolute -right-4 -top-4 text-8xl opacity-10">🏦</div>
                    <p className={`font-bold uppercase tracking-widest mb-2 relative z-10 ${utilidadNeta >= 0 ? 'text-green-500' : 'text-red-500'}`}>Utilidad Neta</p>
                    <p className={`text-5xl font-black relative z-10 ${utilidadNeta >= 0 ? 'text-green-400' : 'text-red-400'}`}>${utilidadNeta.toFixed(2)}</p>
                    <p className="text-sm font-bold mt-3 opacity-90 relative z-10">Margen Libre: <span className="bg-black/20 px-2 py-1 rounded">{margenGanancia.toFixed(1)}%</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-xl">
                        <h3 className="text-xl font-black mb-6 text-white border-b border-zinc-800 pb-4">🌊 Flujo de Efectivo (Liquidez)</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                                <div>
                                    <p className="text-sm font-bold text-zinc-300 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span> Efectivo (Caja Física)</p>
                                    <p className="text-[10px] text-zinc-500 uppercase font-black mt-1">Dinero disponible hoy</p>
                                </div>
                                <span className="font-black text-3xl text-green-400">${ventasEfectivo.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                                <div>
                                    <p className="text-sm font-bold text-zinc-300 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Tarjeta (Terminal)</p>
                                    <p className="text-[10px] text-zinc-500 uppercase font-black mt-1">Depósitos en tránsito</p>
                                </div>
                                <span className="font-black text-3xl text-blue-400">${ventasTarjeta.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-xl">
                        <h3 className="text-xl font-black mb-6 text-white border-b border-zinc-800 pb-4">🎁 Costo de Lealtad (VIP)</h3>
                        <div className="flex items-center gap-6 h-full pb-4">
                            <div className="bg-purple-500/10 border border-purple-500/30 p-6 rounded-2xl flex-1 text-center">
                                <p className="text-xs text-purple-400 font-black uppercase tracking-widest mb-2">Descuentos Aplicados</p>
                                <p className="text-4xl font-black text-purple-400">${totalDescuentos.toFixed(2)}</p>
                                <p className="text-[10px] text-zinc-500 mt-2 font-bold leading-tight">Dinero restado de los ingresos brutos por canje de puntos.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ========================================== */}
                {/* AUDITORÍA DE CORTES DE CAJA                */}
                {/* ========================================== */}
                <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-xl flex flex-col mt-8">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-black text-white">💰 Auditoría de Cortes de Caja</h3>
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest bg-zinc-950 px-3 py-1 rounded-lg">Cálculo Exacto</span>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[800px]">
                          <thead>
                              <tr className="border-b border-zinc-800 text-zinc-500 text-xs font-black uppercase tracking-widest">
                                  <th className="pb-4 pl-4">Día</th>
                                  <th className="pb-4">Cajero</th>
                                  <th className="pb-4 text-blue-400" title="Dinero con el que abrió la caja">Fondo Inicial</th>
                                  <th className="pb-4 text-green-400" title="Suma de tickets pagados en efectivo">+ Ventas Efct.</th>
                                  <th className="pb-4 text-pink-400" title="Propinas pagadas en efectivo">+ Propinas Efct.</th>
                                  <th className="pb-4 text-red-400" title="Dinero retirado durante el turno">- Retiros</th>
                                  <th className="pb-4 text-yellow-400 font-black">= Esperado</th>
                                  <th className="pb-4 text-white font-black">Reportado</th>
                                  <th className="pb-4 text-right pr-4">Diferencia</th>
                              </tr>
                          </thead>
                          <tbody className="text-sm font-bold">
                              {dailyAuditArray.map((dayData: any, idx: number) => {
                                  const expectedCash = dayData.fondo + dayData.ventas + dayData.propinas - dayData.retiros;
                                  const difference = dayData.reportado - expectedCash;
                                  
                                  const isShortage = difference < -0.5; 
                                  const isExact = Math.abs(difference) <= 0.5;
                                  const cajerosStr = Array.from(dayData.cajero).join(', ') || 'N/A';

                                  const [year, month, day] = dayData.date.split('-');
                                  const displayDate = `${day}/${month}/${year}`;

                                  return (
                                      <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-950/50 transition-colors">
                                          <td className="py-4 pl-4 text-zinc-400">{displayDate}</td>
                                          <td className="py-4 text-white truncate max-w-[100px]">{cajerosStr}</td>
                                          <td className="py-4 text-blue-400">${dayData.fondo.toFixed(2)}</td>
                                          <td className="py-4 text-green-400">+${dayData.ventas.toFixed(2)}</td>
                                          <td className="py-4 text-pink-400">+${dayData.propinas.toFixed(2)}</td>
                                          <td className="py-4 text-red-400">-${dayData.retiros.toFixed(2)}</td>
                                          <td className="py-4 text-yellow-400 font-black">${expectedCash.toFixed(2)}</td>
                                          <td className="py-4 text-white font-black">${dayData.reportado.toFixed(2)}</td>
                                          <td className="py-4 pr-4 text-right">
                                              {isExact ? (
                                                  <span className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded text-xs font-black">Exacto</span>
                                              ) : isShortage ? (
                                                  <span className="bg-red-500/20 text-red-500 border border-red-500/50 px-3 py-1 rounded text-xs font-black" title="Falta dinero en la caja">Falta ${Math.abs(difference).toFixed(2)}</span>
                                              ) : (
                                                  <span className="bg-green-500/20 text-green-400 border border-green-500/50 px-3 py-1 rounded text-xs font-black" title="Hay más dinero del registrado">Sobra ${difference.toFixed(2)}</span>
                                              )}
                                          </td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                      {dailyAuditArray.length === 0 && (
                          <div className="text-center py-8 text-zinc-500 font-bold">No hay turnos ni ventas registradas en estos días.</div>
                      )}
                  </div>
                </div>

                {/* ========================================== */}
                {/* 🌟 NÓMINA POR CAJERO (MÓDULO NUEVO) */}
                {/* ========================================== */}
                <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-xl flex flex-col mt-8">
                  <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                      <div>
                        <h3 className="text-2xl font-black text-white">🧑‍🍳 Nómina y Rendimiento del Equipo</h3>
                        <p className="text-xs font-bold text-zinc-500 mt-1">Cálculo automático de sueldo base ($200 x día) + propinas totales.</p>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {nominaArray.length === 0 ? (
                          <p className="text-zinc-500 font-bold col-span-2 text-center py-8">No hay turnos registrados en estas fechas.</p>
                      ) : (
                          nominaArray.map((nomina: any, idx: number) => (
                              <div key={idx} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden group">
                                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -z-10 group-hover:bg-blue-500/10 transition-colors"></div>
                                  
                                  <div className="flex justify-between items-start mb-6">
                                      <div>
                                          <h4 className="text-xl font-black text-white">{nomina.cajero}</h4>
                                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{nomina.diasTrabajados} {nomina.diasTrabajados === 1 ? 'Día' : 'Días'} Laborado(s)</p>
                                      </div>
                                      <div className="text-right">
                                          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Total a Pagar</p>
                                          <p className="text-3xl font-black text-blue-400">${nomina.totalPagar.toFixed(2)}</p>
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 mb-6">
                                      <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                                          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Sueldo Base</p>
                                          <p className="text-lg font-black text-white">${nomina.sueldoBase.toFixed(2)}</p>
                                      </div>
                                      <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                                          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Propinas</p>
                                          <p className="text-lg font-black text-pink-400">${nomina.propinasTotales.toFixed(2)}</p>
                                      </div>
                                  </div>

                                  <div className="border-t border-zinc-800 pt-4">
                                      <p className="text-xs font-black text-zinc-600 uppercase tracking-widest mb-3">Desglose de Turnos (Entrada - Salida)</p>
                                      <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                          {nomina.turnos.map((t: any, i: number) => (
                                              <div key={i} className="flex justify-between items-center text-xs font-bold bg-zinc-900/50 p-2 rounded-lg">
                                                  <div className="flex items-center gap-2">
                                                      <span className="text-zinc-400">{t.fecha}</span>
                                                      <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">{t.entrada} - {t.salida}</span>
                                                  </div>
                                                  <span className="text-pink-400">+$ {t.propinas.toFixed(2)}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                  <div className="lg:col-span-1 bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 shadow-xl">
                    <h3 className="text-2xl font-black text-white mb-6">Registrar Gasto</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-zinc-500 text-xs font-bold uppercase mb-1 block">Monto Total</label>
                        <input type="number" value={newExpenseAmount} onChange={e => setNewExpenseAmount(e.target.value)} placeholder="$ 0.00" className="w-full bg-zinc-950 border border-zinc-700 p-4 rounded-xl text-white font-black text-2xl outline-none focus:border-red-400" />
                      </div>
                      <div>
                        <label className="text-zinc-500 text-xs font-bold uppercase mb-1 block">Categoría</label>
                        <select value={newExpenseCategory} onChange={e => setNewExpenseCategory(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 p-4 rounded-xl text-white font-bold outline-none focus:border-red-400">
                          <option value="INSUMOS">Insumos (Súper, Elote, etc.)</option>
                          <option value="NOMINA">Nómina / Colaboradores</option>
                          <option value="SERVICIOS">Servicios (Luz, Agua, Gas, Renta)</option>
                          <option value="OTROS">Otros Gastos</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-zinc-500 text-xs font-bold uppercase mb-1 block">Descripción</label>
                        <input type="text" value={newExpenseDesc} onChange={e => setNewExpenseDesc(e.target.value)} placeholder="Ej. Pago de gas" className="w-full bg-zinc-950 border border-zinc-700 p-4 rounded-xl text-white outline-none focus:border-red-400" />
                      </div>
                      <button onClick={handleAddExpense} className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl shadow-lg mt-4 transition-all active:scale-95">Guardar Gasto</button>
                    </div>
                  </div>

                  <div className="lg:col-span-2 bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 shadow-xl">
                    <h3 className="text-xl font-black text-white mb-6 border-b border-zinc-800 pb-4">Detalle Histórico de Egresos</h3>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {data.expenses?.length === 0 ? <p className="text-zinc-500 italic">No hay gastos registrados en este rango de fechas.</p> : 
                        data.expenses?.map((e: any) => (
                          <div key={e.id} className="p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center border bg-zinc-950 border-zinc-800 gap-4 hover:border-red-900/50 transition-colors">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded text-xs font-bold uppercase">{e.category}</span>
                                <span className="text-sm text-zinc-500">{new Date(e.date).toLocaleDateString()}</span>
                              </div>
                              <p className="font-bold text-white text-lg">{e.description}</p>
                            </div>
                            <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                              <p className="font-black text-2xl text-red-400">-${e.amount.toFixed(2)}</p>
                              <button onClick={() => deleteExpense(e.id)} className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg font-black transition-colors">🗑️</button>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ======================================================== */}
            {/* PESTAÑA: VENTAS                                          */}
            {/* ======================================================== */}
            {activeTab === 'VENTAS' && (
                <div className="space-y-8">
                  {role === 'ADMIN' && (
                      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                        <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800"><p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Ticket Promedio</p><p className="text-4xl font-black text-yellow-400">${ticketPromedio.toFixed(2)}</p></div>
                        <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 col-span-2 md:col-span-1"><p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Órdenes Exitosas</p><p className="text-4xl font-black text-white">{totalOrders}</p></div>
                      </div>
                  )}

                  <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                          <h3 className="text-2xl font-black">📜 Historial de Tickets</h3>
                          <button onClick={exportToCSV} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg shadow-blue-600/20">⬇️ Exportar CSV</button>
                      </div>
                      
                      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                          {data.orders.slice().reverse().map((o: any) => (
                              <div key={o.id} className={`p-5 rounded-2xl border flex flex-col md:flex-row justify-between md:items-center gap-4 transition-colors ${o.status === 'REFUNDED' ? 'bg-red-950/20 border-red-900/50 opacity-60' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
                                  <div className="flex gap-4 items-center">
                                      <div className="bg-zinc-900 p-3 rounded-xl">
                                        <p className="text-2xl font-black italic text-yellow-500 w-16">#{o.turnNumber}</p>
                                      </div>
                                      <div>
                                          <div className="flex items-center gap-2">
                                              <p className="font-bold text-lg">{o.customerName}</p>
                                              {o.orderType === 'TAKEOUT' && <span className="bg-purple-500/20 text-purple-400 text-[9px] px-2 py-0.5 rounded uppercase font-black tracking-widest">App VIP</span>}
                                          </div>
                                          <p className="text-[10px] text-zinc-500 uppercase font-black mt-1">{new Date(o.createdAt).toLocaleString()}</p>
                                          <div className="mt-1">
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${o.paymentMethod === 'TERMINAL' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>{o.paymentMethod === 'TERMINAL' ? '💳 Tarjeta' : '💵 Efectivo'}</span>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                                      <div className="text-right">
                                        <p className={`font-black text-xl ${o.status === 'REFUNDED' ? 'line-through text-red-500' : 'text-white'}`}>${(o.totalAmount + o.tipAmount).toFixed(2)}</p>
                                        {o.tipAmount > 0 && <p className="text-[10px] font-bold text-zinc-500">Incl. ${o.tipAmount} propina</p>}
                                      </div>
                                      <div className="flex gap-2 border-t md:border-t-0 border-zinc-800 pt-3 md:pt-0">
                                          <button 
                                              onClick={() => sendTicketEmail(o.id, getTicketUrl(o.turnNumber), o.turnNumber)} 
                                              disabled={ticketEmailing === o.id}
                                              className="bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white px-3 py-2 rounded-lg text-xs font-black border border-blue-500/30 transition-colors disabled:opacity-50" 
                                              title="Enviar Ticket al Cliente">
                                              {ticketEmailing === o.id ? '⏳' : '📧'}
                                          </button>
                                          
                                          {o.customerPhone && (
                                            <button onClick={() => sendWhatsAppPromo(o.customerPhone, o.customerName)} className="bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-zinc-950 border border-green-500/30 px-3 py-2 rounded-lg text-xs font-black transition-colors" title="Enviar por WA">📱</button>
                                          )}
                                          <button onClick={() => window.open(getTicketUrl(o.turnNumber), '_blank')} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-xs font-bold border border-zinc-700 transition-colors">🖨️ Ver Ticket</button>
                                          {o.status !== 'REFUNDED' && <button onClick={() => handleRefund(o.id)} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg text-xs font-black border border-red-500/30 transition-colors">🛑</button>}
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* PESTAÑAS RESTANTES: CLIENTES, MARKETING, AUDITORIA, ETC. */}
            {/* ======================================================== */}
            {activeTab === 'CLIENTES' && role === 'ADMIN' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_30px_rgba(250,204,21,0.1)]">
                        <div>
                            <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-2">🏦 Riesgo Financiero</h3>
                            <p className="text-zinc-400 text-sm font-bold">Valor estimado si todos los clientes canjearan sus puntos hoy mismo.</p>
                        </div>
                        <div className="flex items-center gap-8 bg-zinc-950 p-6 rounded-2xl border border-yellow-500/20">
                            <div className="text-center">
                                <p className="text-xs text-zinc-500 font-black uppercase tracking-widest mb-1">Puntos Emitidos</p>
                                <p className="text-3xl font-black text-white">{Math.floor(totalPuntosEmitidos).toLocaleString()}</p>
                            </div>
                            <div className="w-px h-12 bg-zinc-800"></div>
                            <div className="text-center">
                                <p className="text-xs text-red-400 font-black uppercase tracking-widest mb-1">Deuda Estimada</p>
                                <p className="text-3xl font-black text-red-400">-${deudaLealtad.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-xl">
                        <div className="mb-8 border-b border-zinc-800 pb-4">
                            <h3 className="text-3xl font-black text-white mb-2">👥 Maiztros VIP (Directorio)</h3>
                            <p className="text-zinc-500 font-bold">Tus mejores clientes ordenados por cantidad de puntos acumulados.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {data.customers?.length === 0 ? <p className="text-zinc-500 italic">No hay clientes registrados en el programa aún.</p> : 
                              data.customers?.map((customer: any, index: number) => (
                                <div key={customer.phone} className={`p-6 rounded-[2rem] border transition-colors relative overflow-hidden ${index < 3 ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30 shadow-[0_0_20px_rgba(250,204,21,0.1)]' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
                                    {index === 0 && <div className="absolute -right-4 -top-4 text-7xl opacity-20">👑</div>}
                                    {index === 1 && <div className="absolute -right-4 -top-4 text-7xl opacity-20">🥈</div>}
                                    {index === 2 && <div className="absolute -right-4 -top-4 text-7xl opacity-20">🥉</div>}
                                    
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-1">Cliente #{index + 1}</p>
                                                <p className="font-black text-xl text-white truncate pr-2">{customer.name || 'Cliente Frecuente'}</p>
                                                <p className="font-bold text-zinc-400 text-sm mt-1">📱 {customer.phone}</p>
                                            </div>
                                            <div className="bg-zinc-900 px-3 py-2 rounded-xl border border-zinc-700 text-center">
                                                <p className="text-[10px] text-zinc-500 uppercase font-black">Pts</p>
                                                <p className="text-yellow-400 font-black text-lg">{Math.floor(customer.points)}</p>
                                            </div>
                                        </div>
                                        <div className="mt-6 border-t border-zinc-800 pt-4">
                                            <button onClick={() => sendWhatsAppPromo(customer.phone, customer.name || 'Cliente')} className="w-full bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-zinc-950 font-black py-3 rounded-xl border border-green-500/30 transition-colors flex items-center justify-center gap-2">
                                                📱 Enviar Regalo por WA
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'MARKETING' && role === 'ADMIN' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 p-8 rounded-[2rem] shadow-2xl">
                    <h2 className="text-2xl font-black mb-6 text-white">Crear Nuevo Cupón Promocional</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div><label className="text-purple-300 text-xs font-bold uppercase mb-1 block">Código</label><input type="text" value={newCouponCode} onChange={e => setNewCouponCode(e.target.value.toUpperCase())} placeholder="MAIZTROS10" className="w-full bg-zinc-950 border border-purple-500/50 p-4 rounded-xl text-white font-black uppercase outline-none focus:border-yellow-400" /></div>
                      <div><label className="text-purple-300 text-xs font-bold uppercase mb-1 block">Descuento</label><input type="number" value={newCouponDiscount} onChange={e => setNewCouponDiscount(e.target.value)} placeholder="Ej. 10" className="w-full bg-zinc-950 border border-purple-500/50 p-4 rounded-xl text-white font-black outline-none focus:border-yellow-400" /></div>
                      <div><label className="text-purple-300 text-xs font-bold uppercase mb-1 block">Tipo</label><select value={newCouponType} onChange={e => setNewCouponType(e.target.value as 'FIXED'|'PERCENTAGE')} className="w-full bg-zinc-950 border border-purple-500/50 p-4 rounded-xl text-white font-black outline-none focus:border-yellow-400"><option value="FIXED">Pesos MXN ($)</option><option value="PERCENTAGE">Porcentaje (%)</option></select></div>
                      <div><label className="text-purple-300 text-xs font-bold uppercase mb-1 block">Mínimo Compra</label><input type="number" value={newCouponMinAmount} onChange={e => setNewCouponMinAmount(e.target.value)} placeholder="Ej. 250" className="w-full bg-zinc-950 border border-purple-500/50 p-4 rounded-xl text-white font-black outline-none focus:border-yellow-400" title="¿Cuánto deben gastar para usarlo?" /></div>
                    </div>
                    <button onClick={handleCreateCoupon} className="mt-6 w-full md:w-auto bg-purple-500 hover:bg-purple-400 text-white font-black px-8 py-4 rounded-xl shadow-lg transition-all active:scale-95">Crear Cupón</button>
                  </div>

                  <div className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 shadow-xl mt-8">
                    <h3 className="text-xl font-black mb-6 text-white border-b border-zinc-800 pb-4">Rendimiento de Cupones Activos</h3>
                    <div className="space-y-4">
                      {data.coupons.map((c: any) => {
                        const usosDelCupon = validOrders.filter((o:any) => o.couponCode === c.code);
                        const revenueGenerado = usosDelCupon.reduce((acc:number, o:any) => acc + o.totalAmount, 0);

                        return (
                            <div key={c.id} className={`p-6 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center border gap-6 ${c.isActive ? 'bg-zinc-950 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'bg-zinc-950/50 border-zinc-800 opacity-60'}`}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <p className="font-black text-3xl text-yellow-400 tracking-widest">{c.code}</p>
                                        {!c.isActive && <span className="bg-zinc-800 text-zinc-500 text-[10px] px-2 py-1 rounded font-black uppercase tracking-widest">Inactivo</span>}
                                    </div>
                                    <p className="text-sm font-bold text-zinc-300 mt-1">Descuenta {c.discountType === 'FIXED' ? `$${c.discount} pesos` : `${c.discount}% del total`}</p>
                                    {c.minAmount > 0 && <p className="text-xs font-bold text-purple-400 mt-2 bg-purple-500/10 inline-block px-3 py-1 rounded-full border border-purple-500/30">Compra mínima: ${c.minAmount}</p>}
                                </div>
                                
                                <div className="bg-zinc-900 px-6 py-4 rounded-xl border border-zinc-800 flex gap-6 items-center w-full lg:w-auto">
                                    <div className="text-center">
                                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Usos</p>
                                        <p className="font-black text-xl text-white">{usosDelCupon.length}</p>
                                    </div>
                                    <div className="w-px h-8 bg-zinc-800"></div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-green-500 font-black uppercase tracking-widest mb-1">Ventas (ROI)</p>
                                        <p className="font-black text-xl text-green-400">${revenueGenerado.toFixed(2)}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2 w-full lg:w-auto border-t lg:border-t-0 border-zinc-800 pt-4 lg:pt-0">
                                    <button onClick={() => toggleStatus(c.id, 'coupon', c.isActive)} className={`flex-1 lg:flex-none px-6 py-3 rounded-xl font-black text-sm uppercase ${c.isActive ? 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500 hover:text-zinc-900' : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'}`}>{c.isActive ? 'Apagar' : 'Prender'}</button>
                                    <button onClick={() => deleteCoupon(c.id)} className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-4 py-3 rounded-xl font-black transition-colors" title="Eliminar Cupón">🗑️</button>
                                </div>
                            </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
            )}

            {activeTab === 'AUDITORIA' && role === 'ADMIN' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800">
                        <div className="mb-6">
                          <h3 className="text-2xl font-black">🛡️ Registro de Seguridad (Logs)</h3>
                          <p className="text-zinc-500 text-sm font-bold mt-1">Historial inmutable de acciones críticas en el sistema.</p>
                        </div>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                            {data.auditLogs?.length === 0 ? <p className="text-zinc-500 italic">No hay registros de seguridad recientes.</p> : 
                              data.auditLogs?.map((log: any) => (
                                <div key={log.id} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex flex-col md:flex-row md:justify-between md:items-center gap-3 text-xs hover:border-zinc-700 transition-colors">
                                    <div className="flex flex-col md:flex-row gap-2 md:gap-4 md:items-center">
                                        <span className="text-zinc-600 font-bold whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</span>
                                        <span className="bg-zinc-900 px-3 py-1.5 rounded-lg text-blue-400 font-black uppercase text-[10px] tracking-widest border border-zinc-800 self-start md:self-auto">{log.action}</span>
                                        <p className="font-bold text-zinc-300 text-sm">{log.details}</p>
                                    </div>
                                    <span className="text-zinc-500 font-black uppercase italic whitespace-nowrap">👤 {log.author}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'INVENTARIO' && (
                <div className="space-y-12 animate-in fade-in duration-300">
                  <section className="bg-zinc-900/50 p-8 rounded-[2rem] border border-zinc-800">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-zinc-800 pb-4 gap-4">
                      <div>
                        <h2 className="text-3xl font-black text-white">📦 Stock Físico</h2>
                        <p className="text-zinc-500 font-bold text-sm">Gestiona tus entradas y salidas de producto.</p>
                      </div>
                      {data.inventoryItems?.length === 0 && role === 'ADMIN' && (
                        <button onClick={initInventory} className="bg-red-600 hover:bg-red-500 text-white font-black px-4 py-2 rounded-xl text-sm animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                          ⚠️ Cargar Datos Iniciales
                        </button>
                      )}
                    </div>
                    {data.inventoryItems?.length > 0 && (
                      <>
                        {renderInventoryGroup('INSUMO', '🌽 Producción de Elote (Control por Lotes)', true)}
                        <div className="mt-8 border-t border-zinc-800 pt-8">
                          <h3 className="text-2xl font-black text-white mb-6">Descuento Automático en Caja</h3>
                          {renderInventoryGroup('PAPAS', '🔥 Bolsas de Papas')}
                          {renderInventoryGroup('MARUCHAN', '🍜 Maruchans')}
                          {renderInventoryGroup('EMPAQUE', '🥤 Empaques y Cubiertos')}
                          {renderInventoryGroup('BEBIDA', '🧊 Bebidas')}
                        </div>
                      </>
                    )}
                  </section>
                </div>
            )}

            {activeTab === 'PANICO' && role === 'ADMIN' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="bg-red-950/10 border border-red-900/50 p-8 rounded-[2rem]">
                    <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-3">🚨 Panel de Pánico</h2>
                    <p className="text-zinc-400 font-bold mb-8">Apaga productos o sabores específicos. Lo que desactives desaparecerá instantáneamente del Kiosco.</p>
                    
                    <h2 className="text-2xl font-black text-yellow-400 mt-8 mb-4 border-l-4 border-yellow-400 pl-4">🍔 Menú Principal</h2>
                    {renderPanicCategory('COMBO', 'Cajas de Combos', false)}
                    {renderPanicCategory('ESQUITE', 'Esquites Sueltos', false)}
                    {renderPanicCategory('ESPECIALIDAD', 'Especialidades', false)}
                    {renderPanicCategory('BEBIDA', 'Bebidas Directas', false)}
                    {renderPanicCategory('ANTOJO', 'Dulces y Gomitas', false)}
                    
                    <h2 className="text-2xl font-black text-orange-400 mt-12 mb-4 border-l-4 border-orange-400 pl-4">🎯 Opciones y Sabores (Dentro de los Combos)</h2>
                    {renderPanicSubOptions('PAPAS', 'Tipos de Papas')}
                    {renderPanicSubOptions('MARUCHAN', 'Sabores de Maruchan')}
                    {renderPanicSubOptions('BEBIDA', 'Sabores de Boing / Refresco')}

                    <h2 className="text-2xl font-black text-purple-400 mt-12 mb-4 border-l-4 border-purple-400 pl-4">🧂 Barra de Toppings</h2>
                    {renderPanicCategory('ADEREZO', 'Aderezos', true)}
                    {renderPanicCategory('QUESO', 'Quesos', true)}
                    {renderPanicCategory('POLVO', 'Polvos Extras', true)}
                    {renderPanicCategory('CHILE', 'Chiles', true)}
                    {renderPanicCategory('RESTRICCION', 'Restricciones (Sin...)', true)}
                  </div>
                </div>
            )}

          </div>
        )}
      </div>
  );
}
