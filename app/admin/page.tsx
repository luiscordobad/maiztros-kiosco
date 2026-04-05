'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'INVENTARIO' | 'VENTAS'>('INVENTARIO');
  const [data, setData] = useState<{ products: any[], modifiers: any[], orders: any[] }>({ products: [], modifiers: [], orders: [] });
  const [loading, setLoading] = useState(true);

  // Filtros de fecha
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

  // --- KPIs y MÉTRICAS (Data Analytics) ---
  const totalOrders = data.orders.length;
  const ventasNetas = data.orders.reduce((acc: number, o: any) => acc + o.totalAmount, 0);
  const propinasTotales = data.orders.reduce((acc: number, o: any) => acc + o.tipAmount, 0);
  const ticketPromedio = totalOrders > 0 ? (ventasNetas / totalOrders) : 0;
  
  const totalEfectivo = data.orders.filter((o:any) => o.paymentMethod === 'EFECTIVO_CAJA').reduce((acc: number, o: any) => acc + o.totalAmount, 0);
  const totalTerminal = data.orders.filter((o:any) => o.paymentMethod === 'TERMINAL').reduce((acc: number, o: any) => acc + o.totalAmount, 0);

  // --- TOP PRODUCTOS (Análisis del JSON) ---
  const productCounts: Record<string, number> = {};
  data.orders.forEach(order => {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    items.forEach((item: any) => {
      const name = item.product.name;
      productCounts[name] = (productCounts[name] || 0) + 1;
    });
  });
  
  const topProducts = Object.entries(productCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5); // Top 5

  // --- EXPORTAR A CSV ---
  const exportToCSV = () => {
    let csv = 'Turno,Fecha,Hora,Cliente,Tipo,MetodoPago,Monto,Propina\n';
    data.orders.forEach(o => {
      const date = new Date(o.createdAt);
      csv += `${o.turnNumber},${date.toLocaleDateString()},${date.toLocaleTimeString()},${o.customerName || 'Cliente'},${o.orderType},${o.paymentMethod},${o.totalAmount},${o.tipAmount}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Maiztros_Ventas_${startDate}_al_${endDate}.csv`;
    a.click();
  };

  return (
    <ProtectedRoute title="Dashboard Directivo">
      <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-10 font-sans max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-6 mb-8 gap-6">
          <h1 className="text-4xl font-black text-yellow-400">📊 MAIZTROS BI</h1>
          <div className="flex bg-zinc-900 rounded-full p-1 border border-zinc-800">
            <button onClick={() => setActiveTab('INVENTARIO')} className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'INVENTARIO' ? 'bg-yellow-400 text-zinc-950' : 'text-zinc-500 hover:text-white'}`}>📦 Inventario</button>
            <button onClick={() => setActiveTab('VENTAS')} className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'VENTAS' ? 'bg-yellow-400 text-zinc-950' : 'text-zinc-500 hover:text-white'}`}>📈 Analíticos</button>
          </div>
        </header>

        {/* TAB 1: INVENTARIO */}
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
                        <button onClick={() => toggleStock(p.id, 'product', p.isAvailable)} className={`px-6 py-2 rounded-lg font-black text-sm uppercase w-32 shadow-lg transition-transform active:scale-95 ${p.isAvailable ? 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30' : 'bg-red-500 text-white hover:bg-red-400'}`}>
                          {p.isAvailable ? 'En Stock' : 'Agotado'}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <h2 className="text-2xl font-black mb-6 text-zinc-400 uppercase tracking-widest border-l-4 border-yellow-400 pl-4">Modificadores</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.modifiers.map((m: any) => (
                      <div key={m.id} className="bg-zinc-900 p-5 rounded-2xl flex justify-between items-center border border-zinc-800">
                        <div>
                          <p className="font-bold text-sm">{m.name}</p>
                          <span className="text-[10px] font-black tracking-widest uppercase text-zinc-500">{m.type}</span>
                        </div>
                        <button onClick={() => toggleStock(m.id, 'modifier', m.isAvailable)} className={`px-4 py-2 rounded-lg font-black text-xs uppercase w-24 ${m.isAvailable ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500 text-white'}`}>
                          {m.isAvailable ? 'On' : 'Off'}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        )}

        {/* TAB 2: ANALÍTICOS (BI) */}
        {activeTab === 'VENTAS' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* FILTROS DE FECHA Y EXPORTACIÓN */}
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
              <button onClick={exportToCSV} disabled={totalOrders === 0} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-black disabled:opacity-50 flex items-center gap-2 transition-colors">
                ⬇️ Exportar CSV
              </button>
            </div>

            {loading ? <p className="text-center text-zinc-500 py-10">Calculando métricas...</p> : (
              <>
                {/* KPIs PRINCIPALES */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-lg">
                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Ingresos Netos</p>
                    <p className="text-4xl md:text-5xl font-black text-green-400">${ventasNetas.toFixed(2)}</p>
                  </div>
                  <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-lg">
                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Órdenes Totales</p>
                    <p className="text-4xl md:text-5xl font-black text-white">{totalOrders}</p>
                  </div>
                  <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-lg">
                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Ticket Promedio</p>
                    <p className="text-4xl md:text-5xl font-black text-yellow-400">${ticketPromedio.toFixed(2)}</p>
                  </div>
                  <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-lg">
                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Propinas (Staff)</p>
                    <p className="text-4xl md:text-5xl font-black text-purple-400">${propinasTotales.toFixed(2)}</p>
                  </div>
                </div>

                {/* DISTRIBUCIÓN Y TOP PRODUCTOS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                  <div className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 shadow-xl">
                    <h3 className="text-xl font-black mb-6 text-white border-b border-zinc-800 pb-4">Métodos de Pago</h3>
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between font-bold mb-2"><span>💳 Terminal (Mercado Pago)</span> <span>${totalTerminal.toFixed(2)}</span></div>
                        <div className="w-full bg-zinc-950 rounded-full h-4 overflow-hidden"><div className="bg-blue-500 h-4 rounded-full" style={{ width: `${ventasNetas > 0 ? (totalTerminal/ventasNetas)*100 : 0}%` }}></div></div>
                      </div>
                      <div>
                        <div className="flex justify-between font-bold mb-2"><span>💵 Efectivo (Caja)</span> <span>${totalEfectivo.toFixed(2)}</span></div>
                        <div className="w-full bg-zinc-950 rounded-full h-4 overflow-hidden"><div className="bg-green-500 h-4 rounded-full" style={{ width: `${ventasNetas > 0 ? (totalEfectivo/ventasNetas)*100 : 0}%` }}></div></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 shadow-xl">
                    <h3 className="text-xl font-black mb-6 text-white border-b border-zinc-800 pb-4">Top 5 Productos</h3>
                    <div className="space-y-4">
                      {topProducts.length === 0 ? <p className="text-zinc-500">No hay ventas en este periodo.</p> : 
                        topProducts.map(([name, count], idx) => (
                          <div key={name} className="flex items-center gap-4">
                            <span className="text-zinc-600 font-black">#{idx + 1}</span>
                            <div className="flex-1 bg-zinc-950 rounded-full h-8 overflow-hidden relative border border-zinc-800">
                              <div className="bg-yellow-400/20 h-full" style={{ width: `${(count as number / (topProducts[0][1] as number)) * 100}%` }}></div>
                              <span className="absolute left-4 top-1 font-bold text-sm">{name}</span>
                            </div>
                            <span className="font-black text-yellow-400 w-8 text-right">{count}</span>
                          </div>
                        ))
                      }
                    </div>
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
