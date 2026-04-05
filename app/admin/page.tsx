'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'INVENTARIO' | 'VENTAS'>('INVENTARIO');
  const [data, setData] = useState({ products: [], modifiers: [], orders: [] });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const res = await fetch('/api/admin');
    const json = await res.json();
    if (json.success) setData(json);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleStock = async (id: string, type: 'product' | 'modifier', currentStatus: boolean) => {
    // Actualización optimista (se cambia en pantalla al instante)
    const updateList = (list: any[]) => list.map(i => i.id === id ? { ...i, isAvailable: !currentStatus } : i);
    if (type === 'product') setData({ ...data, products: updateList(data.products) });
    else setData({ ...data, modifiers: updateList(data.modifiers) });

    // Impacto real en base de datos
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type, isAvailable: !currentStatus })
    });
  };

  // --- MATEMÁTICAS DEL CORTE DE CAJA ---
  const ventasHoy = data.orders.reduce((acc: number, o: any) => acc + o.totalAmount, 0);
  const propinasHoy = data.orders.reduce((acc: number, o: any) => acc + o.tipAmount, 0);
  const totalEfectivo = data.orders.filter((o:any) => o.paymentMethod === 'EFECTIVO_CAJA').reduce((acc: number, o: any) => acc + o.totalAmount, 0);
  const totalTerminal = data.orders.filter((o:any) => o.paymentMethod === 'TERMINAL').reduce((acc: number, o: any) => acc + o.totalAmount, 0);

  if (loading) return <div className="min-h-screen bg-zinc-950 text-white flex justify-center items-center">Cargando Sistema...</div>;

  return (
    <ProtectedRoute title="Administración Maiztros">
      <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-10 font-sans max-w-5xl mx-auto">
        <header className="flex justify-between items-center border-b border-zinc-800 pb-6 mb-8">
          <h1 className="text-4xl font-black text-yellow-400">⚙️ MAIZTROS ADMIN</h1>
          <div className="flex gap-4">
            <button onClick={() => setActiveTab('INVENTARIO')} className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'INVENTARIO' ? 'bg-yellow-400 text-zinc-950' : 'bg-zinc-900 text-zinc-500'}`}>Inventario</button>
            <button onClick={() => setActiveTab('VENTAS')} className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'VENTAS' ? 'bg-yellow-400 text-zinc-950' : 'bg-zinc-900 text-zinc-500'}`}>Corte de Caja</button>
          </div>
        </header>

        {activeTab === 'INVENTARIO' && (
          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-black mb-6 text-zinc-400 uppercase">🌽 Productos Principales</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.products.map((p: any) => (
                  <div key={p.id} className="bg-zinc-900 p-5 rounded-2xl flex justify-between items-center border border-zinc-800">
                    <p className="font-bold text-lg">{p.name}</p>
                    <button onClick={() => toggleStock(p.id, 'product', p.isAvailable)} className={`px-6 py-2 rounded-lg font-black text-sm uppercase w-32 ${p.isAvailable ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500 text-white'}`}>
                      {p.isAvailable ? 'En Stock' : 'Agotado'}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-black mb-6 text-zinc-400 uppercase">🌶️ Toppings y Modificadores</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.modifiers.map((m: any) => (
                  <div key={m.id} className="bg-zinc-900 p-5 rounded-2xl flex justify-between items-center border border-zinc-800">
                    <p className="font-bold text-lg">{m.name} <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-500 ml-2">{m.type}</span></p>
                    <button onClick={() => toggleStock(m.id, 'modifier', m.isAvailable)} className={`px-6 py-2 rounded-lg font-black text-sm uppercase w-32 ${m.isAvailable ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500 text-white'}`}>
                      {m.isAvailable ? 'En Stock' : 'Agotado'}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'VENTAS' && (
          <div className="space-y-6">
            <div className="bg-zinc-900 p-10 rounded-[3rem] border border-zinc-800 text-center shadow-2xl">
              <p className="text-zinc-500 font-bold uppercase tracking-widest mb-2">Ventas Totales de Hoy</p>
              <h2 className="text-[6rem] font-black text-green-400 leading-none mb-4">${ventasHoy.toFixed(2)}</h2>
              <p className="text-yellow-400 font-bold text-xl">+ ${propinasHoy.toFixed(2)} en Propinas para el equipo</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-4xl">💳</span>
                  <p className="text-zinc-400 font-bold uppercase">Pagado en Terminal</p>
                </div>
                <p className="text-5xl font-black text-white">${totalTerminal.toFixed(2)}</p>
              </div>
              <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-4xl">💵</span>
                  <p className="text-zinc-400 font-bold uppercase">Pagado en Efectivo</p>
                </div>
                <p className="text-5xl font-black text-white">${totalEfectivo.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
