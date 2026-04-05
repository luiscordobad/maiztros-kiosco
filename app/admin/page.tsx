'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'INVENTARIO' | 'VENTAS'>('INVENTARIO');
  const [data, setData] = useState<{ products: any[], modifiers: any[], orders: any[] }>({ products: [], modifiers: [], orders: [] });
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin?startDate=${startDate}&endDate=${endDate}`);
    const json = await res.json();
    if (json.success) setData(json);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [startDate, endDate]);

  const toggleStock = async (id: string, type: 'product' | 'modifier', currentStatus: boolean) => {
    const updateList = (list: any[]) => list.map(i => i.id === id ? { ...i, isAvailable: !currentStatus } : i);
    if (type === 'product') setData({ ...data, products: updateList(data.products) });
    else setData({ ...data, modifiers: updateList(data.modifiers) });

    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type, isAvailable: !currentStatus })
    });
  };

  const handleRefund = async (orderId: string) => {
    if (!confirm('¿Estás seguro de cancelar y reembolsar esta orden? Se restará de las ventas.')) return;
    setData({ ...data, orders: data.orders.map(o => o.id === orderId ? { ...o, status: 'REFUNDED' } : o) });
    await fetch('/api/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, newStatus: 'REFUNDED' }) });
  };

  // ACCIONES DE COMPARTIR TICKET
  const getTicketUrl = (turnNumber: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://maiztros.vercel.app';
    return `${baseUrl}/ticket/${turnNumber}`;
  };

  const sendWhatsApp = (phone: string, name: string, turnNumber: string) => {
    const text = `¡Hola ${name}! 🌽 Aquí tienes tu ticket y localizador digital de Maiztros: ${getTicketUrl(turnNumber)} ¡Gracias por visitarnos!`;
    window.open(`https://api.whatsapp.com/send?phone=52${phone}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const sendEmail = (email: string, name: string, turnNumber: string) => {
    const body = `Hola ${name},\n\nPuedes ver o descargar tu ticket de compra aquí:\n${getTicketUrl(turnNumber)}\n\n¡Gracias por tu compra!`;
    window.open(`mailto:${email}?subject=Tu Ticket de Maiztros&body=${encodeURIComponent(body)}`, '_blank');
  };

  const validOrders = data.orders.filter(o => o.status !== 'REFUNDED');
  
  const totalOrders = validOrders.length;
  const ventasNetas = validOrders.reduce((acc: number, o: any) => acc + o.totalAmount, 0);
  const totalDescuentos = validOrders.reduce((acc: number, o: any) => acc + (o.pointsDiscount || 0), 0);
  const ticketPromedio = totalOrders > 0 ? (ventasNetas / totalOrders) : 0;

  const exportToCSV = () => {
    let csv = 'Turno,Estado,Fecha,Cliente,Celular,Tipo,MetodoPago,MontoBruto,DescuentoPuntos,MontoNeto\n';
    data.orders.forEach(o => {
      const date = new Date(o.createdAt);
      csv += `${o.turnNumber},${o.status},${date.toLocaleDateString()},${o.customerName || 'Cliente'},${o.customerPhone || 'N/A'},${o.orderType},${o.paymentMethod},${(o.totalAmount + (o.pointsDiscount||0))},${o.pointsDiscount||0},${o.totalAmount}\n`;
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
          <div className="flex bg-zinc-900 rounded-full p-1 border border-zinc-800">
            <button onClick={() => setActiveTab('INVENTARIO')} className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'INVENTARIO' ? 'bg-yellow-400 text-zinc-950' : 'text-zinc-500 hover:text-white'}`}>📦 Inventario</button>
            <button onClick={() => setActiveTab('VENTAS')} className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'VENTAS' ? 'bg-yellow-400 text-zinc-950' : 'text-zinc-500 hover:text-white'}`}>📈 Ventas y Tickets</button>
          </div>
        </header>

        {activeTab === 'INVENTARIO' && (
          <div className="space-y-12">
            {loading ? <p className="text-center text-zinc-500 text-xl py-20">Actualizando base de datos...</p> : (
              <>
                <section>
                  <h2 className="text-2xl font-black mb-6 text-zinc-400 uppercase tracking-widest border-l-4 border-yellow-400 pl-4">Productos Principales</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.products.map((p: any) => (
                      <div key={p.id} className="bg-zinc-900 p-5 rounded-2xl flex justify-between items-center border border-zinc-800 hover:border-zinc-700 transition-colors">
                        <p className="font-bold text-lg">{p.name}</p>
                        <button onClick={() => toggleStock(p.id, 'product', p.isAvailable)} className={`px-6 py-2 rounded-lg font-black text-sm uppercase w-32 shadow-lg transition-transform active:scale-95 ${p.isAvailable ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500 text-white'}`}>
                          {p.isAvailable ? 'En Stock' : 'Agotado'}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        )}

        {activeTab === 'VENTAS' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <label className="text-zinc-500 text-xs font-bold uppercase mb-1">Desde</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-zinc-950 border border-zinc-700 p-3 rounded-xl text-white outline-none focus:border-yellow-400" />
                </div>
                <span className="text-zinc-600 font-black mt-4">→</span>
                <div className="flex flex-col">
                  <label className="text-zinc-500 text-xs font-bold uppercase mb-1">Hasta</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-zinc-950 border border-zinc-700 p-3 rounded-xl text-white outline-none focus:border-yellow-400" />
                </div>
              </div>
              <button onClick={exportToCSV} disabled={data.orders.length === 0} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-black disabled:opacity-50">
                ⬇️ Exportar CSV
              </button>
            </div>

            {loading ? <p className="text-center text-zinc-500 py-10">Calculando métricas...</p> : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-lg">
                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Ingresos Netos</p>
                    <p className="text-4xl md:text-5xl font-black text-green-400">${ventasNetas.toFixed(2)}</p>
                  </div>
                  <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-lg">
                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Ticket Promedio</p>
                    <p className="text-4xl md:text-5xl font-black text-yellow-400">${ticketPromedio.toFixed(2)}</p>
                  </div>
                  <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-lg">
                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Puntos Canjeados</p>
                    <p className="text-4xl md:text-5xl font-black text-purple-400">${totalDescuentos.toFixed(2)}</p>
                  </div>
                  <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-lg">
                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Órdenes Pagadas</p>
                    <p className="text-4xl md:text-5xl font-black text-white">{totalOrders}</p>
                  </div>
                </div>

                <div className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 shadow-xl mt-8">
                  <h3 className="text-xl font-black mb-6 text-white border-b border-zinc-800 pb-4">Historial de Tickets y Operaciones</h3>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {data.orders.map(order => (
                      <div key={order.id} className={`p-4 rounded-2xl flex flex-col md:flex-row justify-between items-center border ${order.status === 'REFUNDED' ? 'bg-red-950/20 border-red-900/50 opacity-60' : 'bg-zinc-950 border-zinc-800'}`}>
                        <div className="flex items-center gap-6 mb-4 md:mb-0 w-full md:w-auto">
                          <p className="text-3xl font-black italic w-24 text-yellow-500">#{order.turnNumber}</p>
                          <div>
                            <p className="font-bold">{order.customerName} {order.customerPhone && <span className="text-yellow-500 text-sm ml-2">⭐ {order.customerPhone}</span>}</p>
                            <p className="text-sm text-zinc-500">{new Date(order.createdAt).toLocaleString()} • {order.paymentMethod === 'TERMINAL' ? '💳' : '💵'}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
                          <p className={`font-black text-xl w-24 text-right ${order.status === 'REFUNDED' ? 'line-through text-red-500' : 'text-green-400'}`}>
                            ${(order.totalAmount + order.tipAmount).toFixed(2)}
                          </p>
                          
                          {/* BOTONES DE COMPARTIR Y ACCIONES */}
                          <div className="flex gap-2">
                            {order.customerPhone && (
                              <button onClick={() => sendWhatsApp(order.customerPhone, order.customerName, order.turnNumber)} className="bg-green-500 hover:bg-green-600 text-zinc-950 p-2 rounded-lg font-black" title="Enviar WhatsApp">📱 WA</button>
                            )}
                            {order.customerEmail && (
                              <button onClick={() => sendEmail(order.customerEmail, order.customerName, order.turnNumber)} className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg font-black" title="Enviar Correo">✉️</button>
                            )}
                            <button onClick={() => window.open(getTicketUrl(order.turnNumber), '_blank')} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-bold">🖨️ Ver / Imprimir</button>
                            
                            {order.status !== 'REFUNDED' && (
                              <button onClick={() => handleRefund(order.id)} className="bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white px-4 py-2 rounded-lg text-sm font-bold border border-red-500/30">🛑 Cancelar</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
