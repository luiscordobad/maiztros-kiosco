'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'INVENTARIO' | 'VENTAS' | 'MARKETING'>('VENTAS');
  const [data, setData] = useState<{ products: any[], modifiers: any[], coupons: any[], orders: any[], shifts: any[] }>({ products: [], modifiers: [], coupons: [], orders: [], shifts: [] });
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('');
  const [newCouponType, setNewCouponType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin?startDate=${startDate}&endDate=${endDate}`);
    const json = await res.json();
    if (json.success) setData(json);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [startDate, endDate]);

  const toggleStatus = async (id: string, type: 'product' | 'modifier' | 'coupon', currentStatus: boolean) => {
    if (type === 'product') setData({ ...data, products: data.products.map(i => i.id === id ? { ...i, isAvailable: !currentStatus } : i) });
    else if (type === 'modifier') setData({ ...data, modifiers: data.modifiers.map(i => i.id === id ? { ...i, isAvailable: !currentStatus } : i) });
    else if (type === 'coupon') setData({ ...data, coupons: data.coupons.map(i => i.id === id ? { ...i, isActive: !currentStatus } : i) });

    await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, type, [type === 'coupon' ? 'isActive' : 'isAvailable']: !currentStatus }) });
  };

  const handleCreateCoupon = async () => {
    if (!newCouponCode || !newCouponDiscount) return alert('Llena todos los campos');
    const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: newCouponCode, discount: newCouponDiscount, discountType: newCouponType }) });
    const json = await res.json();
    if (json.success) { setNewCouponCode(''); setNewCouponDiscount(''); fetchData(); } 
    else { alert(json.error); }
  };

  const handleRefund = async (orderId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta orden? Se restará de las ventas.')) return;
    setData({ ...data, orders: data.orders.map(o => o.id === orderId ? { ...o, status: 'REFUNDED' } : o) });
    await fetch('/api/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, newStatus: 'REFUNDED' }) });
  };

  const getTicketUrl = (turnNumber: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://maiztros.vercel.app';
    return `${baseUrl}/ticket/${turnNumber}`;
  };

  const sendWhatsApp = (phone: string, name: string, turnNumber: string) => {
    const text = `¡Hola ${name}! 🌽 Aquí tienes tu ticket digital de Maiztros: ${getTicketUrl(turnNumber)}`;
    window.open(`https://api.whatsapp.com/send?phone=52${phone}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const sendEmail = (email: string | null, name: string, turnNumber: string) => {
    const targetEmail = email || window.prompt(`Ingresa el correo al que quieres mandar el ticket de ${name}:`);
    if (!targetEmail) return;
    const body = `Hola ${name},\n\nPuedes ver o descargar tu ticket de compra aquí:\n${getTicketUrl(turnNumber)}`;
    window.open(`mailto:${targetEmail}?subject=Tu Ticket de Maiztros&body=${encodeURIComponent(body)}`, '_blank');
  };

  const validOrders = data.orders.filter(o => o.status !== 'REFUNDED');
  const totalOrders = validOrders.length;
  const ventasNetas = validOrders.reduce((acc: number, o: any) => acc + o.totalAmount, 0);

  const exportToCSV = () => {
    let csv = 'Turno,Estado,Fecha,Cliente,MetodoPago,MontoBruto,Descuento,MontoNeto\n';
    data.orders.forEach(o => {
      const date = new Date(o.createdAt);
      csv += `${o.turnNumber},${o.status},${date.toLocaleDateString()},${o.customerName},${o.paymentMethod},${o.totalAmount + (o.pointsDiscount||0)},${o.pointsDiscount||0},${o.totalAmount}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Maiztros_Ventas.csv`; a.click();
  };

  return (
    <ProtectedRoute title="Dashboard Directivo">
      <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-10 font-sans max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-6 mb-8 gap-6">
          <h1 className="text-4xl font-black text-yellow-400">📊 MAIZTROS BI</h1>
          <div className="flex bg-zinc-900 rounded-full p-1 border border-zinc-800 overflow-hidden">
            <button onClick={() => setActiveTab('VENTAS')} className={`px-6 py-2 font-bold transition-all ${activeTab === 'VENTAS' ? 'bg-yellow-400 text-zinc-950 rounded-full' : 'text-zinc-500 hover:text-white'}`}>📈 Ventas / Tesorería</button>
            <button onClick={() => setActiveTab('MARKETING')} className={`px-6 py-2 font-bold transition-all ${activeTab === 'MARKETING' ? 'bg-yellow-400 text-zinc-950 rounded-full' : 'text-zinc-500 hover:text-white'}`}>🎟️ Marketing</button>
            <button onClick={() => setActiveTab('INVENTARIO')} className={`px-6 py-2 font-bold transition-all ${activeTab === 'INVENTARIO' ? 'bg-yellow-400 text-zinc-950 rounded-full' : 'text-zinc-500 hover:text-white'}`}>📦 Inventario</button>
          </div>
        </header>

        {loading ? <p className="text-center text-zinc-500 text-xl py-20 animate-pulse">Sincronizando...</p> : (
          <>
            {activeTab === 'INVENTARIO' && (
              <div className="space-y-12 animate-in fade-in duration-300">
                <section>
                  <h2 className="text-2xl font-black mb-6 text-zinc-400 uppercase tracking-widest border-l-4 border-yellow-400 pl-4">Productos Principales</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.products.map((p: any) => (
                      <div key={p.id} className="bg-zinc-900 p-5 rounded-2xl flex justify-between items-center border border-zinc-800">
                        <p className="font-bold text-lg">{p.name}</p>
                        <button onClick={() => toggleStatus(p.id, 'product', p.isAvailable)} className={`px-6 py-2 rounded-lg font-black text-sm uppercase w-32 ${p.isAvailable ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500 text-white'}`}>{p.isAvailable ? 'En Stock' : 'Agotado'}</button>
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <h2 className="text-2xl font-black mb-6 text-zinc-400 uppercase tracking-widest border-l-4 border-yellow-400 pl-4">Modificadores</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.modifiers.map((m: any) => (
                      <div key={m.id} className="bg-zinc-900 p-5 rounded-2xl flex justify-between items-center border border-zinc-800">
                        <p className="font-bold text-sm">{m.name} <span className="text-[10px] uppercase text-zinc-500 block">{m.type}</span></p>
                        <button onClick={() => toggleStatus(m.id, 'modifier', m.isAvailable)} className={`px-4 py-2 rounded-lg font-black text-xs uppercase w-24 ${m.isAvailable ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500 text-white'}`}>{m.isAvailable ? 'Activo' : 'Agotado'}</button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'MARKETING' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 p-8 rounded-[2rem] shadow-2xl">
                  <h2 className="text-2xl font-black mb-6 text-white">Crear Nuevo Cupón</h2>
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full"><label className="text-purple-300 text-xs font-bold uppercase mb-1 block">Código</label><input type="text" value={newCouponCode} onChange={e => setNewCouponCode(e.target.value.toUpperCase())} placeholder="CÓDIGO" className="w-full bg-zinc-950 border border-purple-500/50 p-4 rounded-xl text-white font-black uppercase outline-none focus:border-yellow-400" /></div>
                    <div className="flex-1 w-full"><label className="text-purple-300 text-xs font-bold uppercase mb-1 block">Descuento</label><input type="number" value={newCouponDiscount} onChange={e => setNewCouponDiscount(e.target.value)} placeholder="Ej. 50" className="w-full bg-zinc-950 border border-purple-500/50 p-4 rounded-xl text-white font-black outline-none focus:border-yellow-400" /></div>
                    <div className="flex-1 w-full">
                      <label className="text-purple-300 text-xs font-bold uppercase mb-1 block">Tipo</label>
                      <select value={newCouponType} onChange={e => setNewCouponType(e.target.value as 'FIXED'|'PERCENTAGE')} className="w-full bg-zinc-950 border border-purple-500/50 p-4 rounded-xl text-white font-black outline-none focus:border-yellow-400"><option value="FIXED">Pesos MXN ($)</option><option value="PERCENTAGE">Porcentaje (%)</option></select>
                    </div>
                    <button onClick={handleCreateCoupon} className="bg-purple-500 hover:bg-purple-400 text-white font-black px-8 py-4 rounded-xl shadow-lg transition-all active:scale-95">Crear</button>
                  </div>
                </div>
                <div className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 shadow-xl mt-8">
                  <h3 className="text-xl font-black mb-6 text-white border-b border-zinc-800 pb-4">Cupones Existentes</h3>
                  <div className="space-y-4">
                    {data.coupons.map((c: any) => (
                      <div key={c.id} className={`p-5 rounded-2xl flex justify-between items-center border ${c.isActive ? 'bg-zinc-950 border-purple-500/30' : 'bg-zinc-950/50 border-zinc-800 opacity-50'}`}>
                        <div><p className="font-black text-xl text-yellow-400">{c.code}</p><p className="text-sm font-bold text-zinc-400">Descuenta {c.discountType === 'FIXED' ? `$${c.discount}` : `${c.discount}%`}</p></div>
                        <button onClick={() => toggleStatus(c.id, 'coupon', c.isActive)} className={`px-6 py-2 rounded-lg font-black text-sm uppercase ${c.isActive ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-400'}`}>{c.isActive ? 'Activo' : 'Apagado'}</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'VENTAS' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col"><label className="text-zinc-500 text-xs font-bold uppercase mb-1">Desde</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-zinc-950 border border-zinc-700 p-3 rounded-xl text-white outline-none focus:border-yellow-400" /></div>
                    <span className="text-zinc-600 font-black mt-4">→</span>
                    <div className="flex flex-col"><label className="text-zinc-500 text-xs font-bold uppercase mb-1">Hasta</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-zinc-950 border border-zinc-700 p-3 rounded-xl text-white outline-none focus:border-yellow-400" /></div>
                  </div>
                  <button onClick={exportToCSV} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-black">⬇️ Exportar CSV</button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800"><p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Ingresos Netos</p><p className="text-4xl font-black text-green-400">${ventasNetas.toFixed(2)}</p></div>
                  <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800"><p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Órdenes Exitosas</p><p className="text-4xl font-black text-white">{totalOrders}</p></div>
                </div>

                {/* NUEVO: AUDITORÍA DE CAJA (TURNOS Y MOVIMIENTOS) */}
                <div className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 shadow-xl mt-8">
                  <h3 className="text-xl font-black mb-6 text-white border-b border-zinc-800 pb-4">Auditoría de Caja y Movimientos (Tesorería)</h3>
                  <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                    {data.shifts?.length === 0 ? <p className="text-zinc-500 italic">No hay turnos en estas fechas.</p> : 
                      data.shifts?.map((shift: any) => {
                        const cashOrders = shift.orders.reduce((acc: number, o: any) => acc + (o.totalAmount + o.tipAmount), 0);
                        const shiftWithdrawals = shift.movements?.filter((m:any) => m.type === 'OUT').reduce((acc: number, m: any) => acc + m.amount, 0) || 0;
                        const systemCash = shift.startingCash + cashOrders - shiftWithdrawals;
                        const difference = (shift.reportedCash || 0) - systemCash;

                        return (
                          <div key={shift.id} className="bg-zinc-950 p-6 rounded-[2rem] border border-zinc-800 flex flex-col gap-4">
                            <div className="flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-center">
                              <div>
                                <p className="font-black text-xl text-yellow-400">Cajero: {shift.openedBy}</p>
                                <p className="text-sm text-zinc-500 uppercase font-bold tracking-widest">
                                  {new Date(shift.openedAt).toLocaleString()} - {shift.status === 'CLOSED' ? new Date(shift.closedAt).toLocaleTimeString() : 'ABIERTO'}
                                </p>
                              </div>
                              <div className="flex gap-8 bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-center">
                                <div><p className="text-xs text-zinc-500 uppercase font-bold">Calculado Sistema</p><p className="font-black text-lg text-white">${systemCash.toFixed(2)}</p></div>
                                <div><p className="text-xs text-zinc-500 uppercase font-bold">Físico Reportado</p><p className="font-black text-lg text-white">{shift.status === 'CLOSED' ? `$${shift.reportedCash?.toFixed(2)}` : '---'}</p></div>
                                {shift.status === 'CLOSED' && (
                                  <div><p className="text-xs text-zinc-500 uppercase font-bold">Cuadre</p><p className={`font-black text-lg ${difference === 0 ? 'text-green-500' : 'text-red-500'}`}>{difference > 0 ? '+' : ''}{difference.toFixed(2)}</p></div>
                                )}
                              </div>
                            </div>
                            
                            {/* Desglose de Movimientos de Dinero */}
                            {shift.movements?.length > 0 && (
                              <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                                <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Movimientos de Efectivo en Turno</p>
                                {shift.movements.map((m: any) => {
                                  const isBoss = m.reason.includes('[LUIS');
                                  return (
                                    <div key={m.id} className="flex justify-between items-center py-2 border-b border-zinc-800/50 last:border-0">
                                      <p className="text-sm font-bold text-zinc-300">
                                        <span className={`px-2 py-1 rounded text-[10px] mr-2 uppercase ${isBoss ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                          {isBoss ? 'Tú (Jefe)' : 'Colaborador'}
                                        </span>
                                        {m.reason.replace(/\[.*?\]\s*/, '')} {/* Limpia el tag visualmente */}
                                      </p>
                                      <p className="font-black text-red-400">-${m.amount.toFixed(2)}</p>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    }
                  </div>
                </div>

                {/* HISTORIAL DE TICKETS (Misma tabla de siempre) */}
                <div className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 shadow-xl mt-8">
                  <h3 className="text-xl font-black mb-6 text-white border-b border-zinc-800 pb-4">Historial de Tickets</h3>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {data.orders.map(order => (
                      <div key={order.id} className={`p-4 rounded-2xl flex flex-col xl:flex-row justify-between items-center border ${order.status === 'REFUNDED' ? 'bg-red-950/20 border-red-900/50 opacity-60' : 'bg-zinc-950 border-zinc-800'}`}>
                        <div className="flex items-center gap-6 mb-4 xl:mb-0 w-full xl:w-auto">
                          <p className="text-3xl font-black italic w-24 text-yellow-500">#{order.turnNumber}</p>
                          <div><p className="font-bold text-lg">{order.customerName}</p><p className="text-sm text-zinc-500">{new Date(order.createdAt).toLocaleString()}</p></div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto justify-end">
                          <p className={`font-black text-xl w-24 text-right ${order.status === 'REFUNDED' ? 'line-through text-red-500' : 'text-green-400'}`}>${(order.totalAmount + order.tipAmount).toFixed(2)}</p>
                          <div className="flex flex-wrap gap-2 justify-end">
                            <button onClick={() => window.open(getTicketUrl(order.turnNumber), '_blank')} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">🖨️ Ver Ticket</button>
                            {order.status !== 'REFUNDED' && <button onClick={() => handleRefund(order.id)} className="bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white px-4 py-2 rounded-lg text-sm font-bold border border-red-500/30 transition-colors">🛑 Cancelar</button>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
