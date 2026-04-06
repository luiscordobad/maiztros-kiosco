'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from 'recharts';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'FINANZAS' | 'VENTAS' | 'INVENTARIO' | 'PANICO' | 'MARKETING' | 'AUDITORIA'>('FINANZAS');
  const [data, setData] = useState<any>({ products: [], modifiers: [], coupons: [], orders: [], shifts: [], inventoryItems: [], expenses: [], auditLogs: [] });
  const [loading, setLoading] = useState(true);

  // Por defecto filtramos los últimos 7 días
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const [startDate, setStartDate] = useState(lastWeek.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('');
  const [newCouponType, setNewCouponType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [newCouponMinAmount, setNewCouponMinAmount] = useState(''); 

  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('INSUMOS');
  const [newExpenseDesc, setNewExpenseDesc] = useState('');

  const [addAmounts, setAddAmounts] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin?startDate=${startDate}&endDate=${endDate}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [startDate, endDate]);

  const updatePanic = async (id: string, type: string, currentStatus: boolean) => {
      await fetch('/api/admin', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, type, isAvailable: !currentStatus, author: 'Luis (Admin)' })
      });
      fetchData();
  };

  const initInventory = async () => {
    if (!confirm("Esto cargará los datos iniciales. ¿Estás seguro?")) return;
    await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'init_inventory', author: 'Luis (Admin)' }) });
    fetchData();
  };

  const updatePhysicalStock = async (id: string, newStock: string) => {
    if (newStock === '') return;
    setData({ ...data, inventoryItems: data.inventoryItems.map((i:any) => i.id === id ? { ...i, stock: parseFloat(newStock) } : i) });
    await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, type: 'update_stock', newStock, author: 'Luis (Admin)' }) });
  };

  const addPhysicalStock = async (id: string) => {
    const amount = addAmounts[id];
    if (!amount || isNaN(parseFloat(amount))) return;
    setData({ ...data, inventoryItems: data.inventoryItems.map((i:any) => i.id === id ? { ...i, stock: i.stock + parseFloat(amount) } : i) });
    setAddAmounts({ ...addAmounts, [id]: '' }); 
    await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, type: 'add_stock', addAmount: amount, author: 'Luis (Admin)' }) });
  };

  const toggleStatus = async (id: string, type: 'product' | 'modifier' | 'coupon' | 'inventory_toggle', currentStatus: boolean) => {
    if (type === 'product') setData({ ...data, products: data.products.map((i:any) => i.id === id ? { ...i, isAvailable: !currentStatus } : i) });
    else if (type === 'modifier') setData({ ...data, modifiers: data.modifiers.map((i:any) => i.id === id ? { ...i, isAvailable: !currentStatus } : i) });
    else if (type === 'inventory_toggle') setData({ ...data, inventoryItems: data.inventoryItems.map((i:any) => i.id === id ? { ...i, isAvailable: !currentStatus } : i) });
    else if (type === 'coupon') setData({ ...data, coupons: data.coupons.map((i:any) => i.id === id ? { ...i, isActive: !currentStatus } : i) });
    
    await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, type, [type === 'coupon' ? 'isActive' : 'isAvailable']: !currentStatus, author: 'Luis (Admin)' }) });
  };

  const toggleCategory = async (category: string, isModifier: boolean, currentItems: any[]) => {
    const targetState = !currentItems.every((i:any) => i.isAvailable); 
    if (isModifier) setData({ ...data, modifiers: data.modifiers.map((m:any) => m.type === category ? { ...m, isAvailable: targetState } : m) });
    else setData({ ...data, products: data.products.map((p:any) => p.category === category ? { ...p, isAvailable: targetState } : p) });
    await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'toggle_category', category, targetState, isModifier, author: 'Luis (Admin)' }) });
  };

  const handleCreateCoupon = async () => {
    if (!newCouponCode || !newCouponDiscount) return alert('Llena los datos del cupón');
    const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'coupon', code: newCouponCode, discount: newCouponDiscount, discountType: newCouponType, minAmount: newCouponMinAmount, author: 'Luis (Admin)' }) });
    const json = await res.json();
    if (json.success) { setNewCouponCode(''); setNewCouponDiscount(''); setNewCouponMinAmount(''); fetchData(); } 
    else { alert(json.error || 'Error al crear cupón'); }
  };

  const deleteCoupon = async (id: string) => {
    if(!confirm("¿Eliminar este cupón definitivamente?")) return;
    setData({ ...data, coupons: data.coupons.filter((c:any) => c.id !== id) });
    await fetch(`/api/admin?id=${id}&type=coupon&author=Luis (Admin)`, { method: 'DELETE' });
  };

  const handleAddExpense = async () => {
    if (!newExpenseAmount || !newExpenseDesc) return alert('Llena todos los campos del gasto');
    const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'expense', amount: newExpenseAmount, category: newExpenseCategory, description: newExpenseDesc, author: 'Luis (Admin)' }) });
    const json = await res.json();
    if (json.success) { setNewExpenseAmount(''); setNewExpenseDesc(''); fetchData(); } 
    else { alert('Error al registrar gasto'); }
  };

  const deleteExpense = async (id: string) => {
    if(!confirm("¿Eliminar este registro de gasto?")) return;
    setData({ ...data, expenses: data.expenses.filter((e:any) => e.id !== id) });
    await fetch(`/api/admin?id=${id}&type=expense&author=Luis (Admin)`, { method: 'DELETE' });
  };

  const handleRefund = async (orderId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta orden?')) return;
    setData({ ...data, orders: data.orders.map((o:any) => o.id === orderId ? { ...o, status: 'REFUNDED' } : o) });
    await fetch('/api/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, newStatus: 'REFUNDED' }) });
    await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'audit', action: 'ORDEN_CANCELADA', details: `Orden ID: ${orderId}`, author: 'Luis (Admin)' }) });
  };

  const exportToCSV = () => {
    let csv = 'Turno,Estado,Fecha,Cliente,MetodoPago,MontoBruto,Descuento,MontoNeto\n';
    data.orders.forEach((o:any) => { const date = new Date(o.createdAt); csv += `${o.turnNumber},${o.status},${date.toLocaleDateString()},${o.customerName},${o.paymentMethod},${o.totalAmount + (o.pointsDiscount||0)},${o.pointsDiscount||0},${o.totalAmount}\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Maiztros_Ventas.csv`; a.click();
  };

  const getTicketUrl = (turnNumber: string) => `${typeof window !== 'undefined' ? window.location.origin : 'https://maiztros.vercel.app'}/ticket/${turnNumber}`;
  
  const sendWhatsApp = (phone: string, name: string, turnNumber: string) => {
    const text = `¡Hola ${name}! 🌽 Aquí tienes tu ticket digital de Maiztros: ${getTicketUrl(turnNumber)}`;
    window.open(`https://api.whatsapp.com/send?phone=52${phone}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const sendEmail = (email: string | null, name: string, turnNumber: string) => {
    const targetEmail = email || window.prompt(`El sistema no tiene un correo registrado.\n\nIngresa el correo al que quieres mandar el ticket de ${name}:`);
    if (targetEmail) window.open(`mailto:${targetEmail}?subject=Tu Ticket de Maiztros&body=${encodeURIComponent(`Aquí tienes tu ticket: ${getTicketUrl(turnNumber)}`)}`, '_blank');
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

  const paymentData = [
    { name: 'Efectivo en Caja', value: ventasEfectivo, color: '#22c55e' },
    { name: 'Tarjeta (Banco)', value: ventasTarjeta, color: '#3b82f6' }
  ];

  const salesByDateMap = validOrders.reduce((acc: any, order: any) => {
    const dateStr = new Date(order.createdAt).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
    if (!acc[dateStr]) acc[dateStr] = 0;
    acc[dateStr] += order.totalAmount;
    return acc;
  }, {});

  const salesTrendData = Object.keys(salesByDateMap).map(date => ({
    Fecha: date,
    Ventas: salesByDateMap[date]
  }));

  const hourMap = validOrders.reduce((acc: any, order: any) => {
    const hour = new Date(order.createdAt).getHours();
    const label = `${hour}:00`;
    acc[label] = (acc[label] || 0) + order.totalAmount;
    return acc;
  }, {});
  const hourChartData = Object.keys(hourMap).map(h => ({ Hora: h, Ventas: hourMap[h] })).sort((a:any, b:any) => parseInt(a.Hora) - parseInt(b.Hora));

  const productVolume: any = {};
  validOrders.forEach((o: any) => {
      if(o.items) {
          o.items.forEach((item: any) => {
              const name = item.product?.name || 'Producto Desconocido';
              productVolume[name] = (productVolume[name] || 0) + 1;
          });
      }
  });
  const topProductsData = Object.keys(productVolume).map(name => ({ name, qty: productVolume[name] })).sort((a:any, b:any) => b.qty - a.qty).slice(0, 5);

  // ==========================================
  // COMPONENTES REUTILIZABLES
  // ==========================================
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
                <div className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl overflow-hidden focus-within:border-yellow-400"><p className="text-[9px] text-zinc-500 font-bold uppercase text-center mt-1">Total Exacto</p><input type="number" defaultValue={item.stock} onBlur={(e) => updatePhysicalStock(item.id, e.target.value)} className="bg-transparent w-full p-2 text-center text-white font-bold outline-none"/></div>
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
          <button onClick={() => toggleCategory(categoryFilter, isModifier, items)} className={`px-4 py-1.5 rounded-lg font-black text-xs uppercase transition-transform active:scale-95 ${allAvailable ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white' : 'bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-zinc-900'}`}>
            {allAvailable ? 'Apagar Todos' : 'Prender Todos'}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item: any) => (
            <button key={item.id} onClick={() => toggleStatus(item.id, isModifier ? 'modifier' : 'product', item.isAvailable)} className={`p-4 rounded-xl flex justify-between items-center border transition-all text-left ${item.isAvailable ? 'bg-zinc-900 border-zinc-700 hover:border-red-400' : 'bg-red-950/20 border-red-900/50 text-red-400 opacity-70'}`}>
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
        <h3 className="text-lg font-black text-zinc-300 mb-4 border-b border-zinc-800 pb-3">{title} <span className="text-xs text-zinc-500 ml-2 font-normal">(Ocultar de las opciones del combo)</span></h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item: any) => (
            <button key={item.id} onClick={() => toggleStatus(item.id, 'inventory_toggle', item.isAvailable)} className={`p-4 rounded-xl flex justify-between items-center border transition-all text-left ${item.isAvailable ? 'bg-zinc-900 border-zinc-700 hover:border-red-400' : 'bg-red-950/20 border-red-900/50 text-red-400 opacity-70'}`}>
              <span className="font-bold text-sm truncate">{item.name}</span>
              <span className="text-lg">{item.isAvailable ? '✅' : '❌'}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute title="Luis - Centro de Control">
      <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-10 font-sans max-w-7xl mx-auto">
        
        {/* NAVEGACIÓN Y HEADER */}
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b border-zinc-800 pb-6 mb-8 gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-400 p-3 rounded-2xl text-zinc-950 text-2xl font-black italic">M</div>
            <h1 className="text-3xl font-black tracking-tighter">MAIZTROS <span className="text-zinc-500 font-normal">BI</span></h1>
          </div>
          <div className="flex flex-wrap bg-zinc-900/50 rounded-2xl p-1.5 border border-zinc-800 w-full xl:w-auto gap-1">
            {['FINANZAS', 'VENTAS', 'INVENTARIO', 'PANICO', 'MARKETING', 'AUDITORIA'].map((tab: any) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl font-bold transition-all text-sm md:text-base ${activeTab === tab ? 'bg-yellow-400 text-zinc-950 shadow-lg' : 'text-zinc-500 hover:text-white'}`}>{tab}</button>
            ))}
          </div>
        </header>

        {/* FILTROS GLOBALES Y SYNC */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex items-center gap-4 col-span-1 md:col-span-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-white font-bold outline-none flex-1 w-full"/>
                <span className="text-zinc-600">→</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-white font-bold outline-none flex-1 w-full"/>
            </div>
            <div className="bg-green-500/10 p-4 rounded-2xl border border-green-500/30 flex justify-between items-center">
                <span className="text-xs font-bold text-green-500 tracking-widest">UTILIDAD P&L</span>
                <span className="font-black text-xl text-green-400">${utilidadNeta.toFixed(0)}</span>
            </div>
            <button onClick={fetchData} className="bg-zinc-800 hover:bg-zinc-700 text-white font-black p-4 rounded-2xl transition-colors">🔄 Sincronizar Data</button>
        </div>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-zinc-500 font-bold animate-pulse">Procesando información...</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            
            {/* ======================= */}
            {/* PESTAÑA: FINANZAS (BI)  */}
            {/* ======================= */}
            {activeTab === 'FINANZAS' && (
              <div className="space-y-8">
                
                {/* Métricas Rápidas */}
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
                    <p className="text-sm font-bold mt-3 opacity-90 relative z-10">Margen: <span className="bg-black/20 px-2 py-1 rounded">{margenGanancia.toFixed(1)}%</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Gráfica de Horas Pico (BI) */}
                    <div className="lg:col-span-2 bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 flex flex-col">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-2">🔥 Horas con más Movimiento <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-500 tracking-widest">ZIBATÁ PEAK</span></h3>
                        {hourChartData.length > 0 ? (
                          <div className="h-[300px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={hourChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                      <defs>
                                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="5%" stopColor="#facc15" stopOpacity={0.3}/>
                                              <stop offset="95%" stopColor="#facc15" stopOpacity={0}/>
                                          </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                                      <XAxis dataKey="Hora" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                                      <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                                      <Tooltip contentStyle={{backgroundColor: '#09090b', borderRadius: '1rem', border: '1px solid #27272a', color: '#fff'}} itemStyle={{ color: '#eab308', fontWeight: 'bold' }} />
                                      <Area type="monotone" dataKey="Ventas" stroke="#facc15" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                                  </AreaChart>
                              </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="h-[300px] flex items-center justify-center text-zinc-600 font-bold">Sin datos suficientes</div>
                        )}
                    </div>

                    {/* Top 5 Productos y Canal de Pago (BI) */}
                    <div className="flex flex-col gap-8">
                        <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 flex-1">
                            <h3 className="text-xl font-black mb-6">🏆 Los + Vendidos</h3>
                            <div className="space-y-6">
                                {topProductsData.length > 0 ? topProductsData.map((p, i) => (
                                    <div key={p.name} className="flex items-center gap-4">
                                        <span className="text-xs font-black text-zinc-600 w-4">0{i+1}</span>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <p className="text-sm font-bold truncate max-w-[150px]">{p.name}</p>
                                                <p className="text-sm font-black text-yellow-400">{p.qty} pz</p>
                                            </div>
                                            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-yellow-400 h-full" style={{width: `${(p.qty / topProductsData[0].qty) * 100}%`}}></div>
                                            </div>
                                        </div>
                                    </div>
                                )) : <p className="text-zinc-600 text-sm">Sin datos.</p>}
                            </div>
                        </div>

                        {/* Tarjeta vs Efectivo */}
                        <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800">
                          <h3 className="text-xl font-black mb-4">💳 Ingresos</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                              <span className="text-xs font-bold text-zinc-300 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Tarjeta</span>
                              <span className="font-black text-blue-400">${ventasTarjeta.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                              <span className="text-xs font-bold text-zinc-300 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Efectivo</span>
                              <span className="font-black text-green-400">${ventasEfectivo.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                    </div>
                </div>

                {/* Gráfica Histórica de Ventas */}
                <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-xl flex flex-col">
                  <h3 className="text-xl font-black text-white mb-6">Tendencia de Ventas (Rango Seleccionado)</h3>
                  {salesTrendData.length > 0 ? (
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis dataKey="Fecha" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                          <Tooltip cursor={{fill: '#27272a'}} contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '1rem' }} itemStyle={{ color: '#eab308', fontWeight: 'bold' }} />
                          <Bar dataKey="Ventas" fill="#facc15" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-zinc-600 font-bold">No hay ventas registradas en esta fecha.</div>
                  )}
                </div>

                {/* 4. MÓDULO DE EGRESOS (DISEÑO COLUMNAS RESTAURADO) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                  <div className="lg:col-span-1 bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 shadow-xl">
                    <h3 className="text-2xl font-black text-white mb-6">Registrar Gasto (Egreso)</h3>
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
                        <label className="text-zinc-500 text-xs font-bold uppercase mb-1 block">Descripción (Opcional)</label>
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
                              <button onClick={() => deleteExpense(e.id)} className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg font-black transition-colors" title="Borrar Gasto">🗑️</button>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ======================= */}
            {/* PESTAÑA: VENTAS Y TICKETS */}
            {/* ======================= */}
            {activeTab === 'VENTAS' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800"><p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Ticket Promedio</p><p className="text-4xl font-black text-yellow-400">${ticketPromedio.toFixed(2)}</p></div>
                    <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800"><p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Pts Canjeados</p><p className="text-4xl font-black text-purple-400">${totalDescuentos.toFixed(2)}</p></div>
                    <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 col-span-2 md:col-span-1"><p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Órdenes Exitosas</p><p className="text-4xl font-black text-white">{totalOrders}</p></div>
                  </div>

                  <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                          <h3 className="text-2xl font-black">📜 Historial de Tickets</h3>
                          <button onClick={exportToCSV} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black text-sm">⬇️ Exportar CSV</button>
                      </div>
                      
                      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                          {data.orders.slice().reverse().map((o: any) => (
                              <div key={o.id} className={`p-5 rounded-2xl border flex flex-col md:flex-row justify-between md:items-center gap-4 transition-colors ${o.status === 'REFUNDED' ? 'bg-red-950/20 border-red-900/50 opacity-60' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
                                  <div className="flex gap-4 items-center">
                                      <div className="bg-zinc-900 p-3 rounded-xl">
                                        <p className="text-2xl font-black italic text-yellow-500 w-16">#{o.turnNumber}</p>
                                      </div>
                                      <div>
                                          <p className="font-bold text-lg">{o.customerName}</p>
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
                                          {o.customerPhone && (
                                            <button onClick={() => sendWhatsApp(o.customerPhone, o.customerName, o.turnNumber)} className="bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-zinc-900 border border-green-500/30 px-3 py-2 rounded-lg text-xs font-black transition-colors" title="Enviar WhatsApp">📱</button>
                                          )}
                                          <button onClick={() => sendEmail(o.customerEmail, o.customerName, o.turnNumber)} className="bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white border border-blue-500/30 px-3 py-2 rounded-lg text-xs font-black transition-colors" title="Enviar Correo">✉️</button>
                                          <button onClick={() => window.open(getTicketUrl(o.turnNumber), '_blank')} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-xs font-bold border border-zinc-700 transition-colors">🖨️ Ver Ticket</button>
                                          {o.status !== 'REFUNDED' && <button onClick={() => handleRefund(o.id)} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg text-xs font-black border border-red-500/30 transition-colors" title="Cancelar Orden">🛑</button>}
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
                </div>
            )}

            {/* ======================= */}
            {/* PESTAÑA: AUDITORÍA (LOGS) */}
            {/* ======================= */}
            {activeTab === 'AUDITORIA' && (
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

            {/* ======================= */}
            {/* PESTAÑA: INVENTARIO     */}
            {/* ======================= */}
            {activeTab === 'INVENTARIO' && (
                <div className="space-y-12 animate-in fade-in duration-300">
                  <section className="bg-zinc-900/50 p-8 rounded-[2rem] border border-zinc-800">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-zinc-800 pb-4 gap-4">
                      <div>
                        <h2 className="text-3xl font-black text-white">📦 Stock Físico</h2>
                        <p className="text-zinc-500 font-bold text-sm">Gestiona tus entradas y salidas de producto.</p>
                      </div>
                      {data.inventoryItems?.length === 0 && (
                        <button onClick={initInventory} className="bg-red-600 hover:bg-red-500 text-white font-black px-4 py-2 rounded-xl text-sm animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                          ⚠️ Cargar Datos Iniciales
                        </button>
                      )}
                    </div>
                    {data.inventoryItems?.length > 0 && (
                      <>
                        {renderInventoryGroup('INSUMO', '🌽 Producción de Elote (Control por Lotes - Manual)', true)}
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

            {/* ======================= */}
            {/* PESTAÑA: PANICO         */}
            {/* ======================= */}
            {activeTab === 'PANICO' && (
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

            {/* ======================= */}
            {/* PESTAÑA: MARKETING      */}
            {/* ======================= */}
            {activeTab === 'MARKETING' && (
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
                    <h3 className="text-xl font-black mb-6 text-white border-b border-zinc-800 pb-4">Cupones Existentes</h3>
                    <div className="space-y-4">
                      {data.coupons.map((c: any) => (
                        <div key={c.id} className={`p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center border gap-4 ${c.isActive ? 'bg-zinc-950 border-purple-500/30' : 'bg-zinc-950/50 border-zinc-800 opacity-60'}`}>
                          <div>
                            <p className="font-black text-2xl text-yellow-400 tracking-widest">{c.code}</p>
                            <p className="text-sm font-bold text-zinc-300 mt-1">Descuenta {c.discountType === 'FIXED' ? `$${c.discount} pesos` : `${c.discount}% del total`}</p>
                            {c.minAmount > 0 && <p className="text-xs font-bold text-purple-400 mt-1 bg-purple-500/10 inline-block px-2 py-1 rounded">Compra mínima: ${c.minAmount}</p>}
                          </div>
                          <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={() => toggleStatus(c.id, 'coupon', c.isActive)} className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-sm uppercase ${c.isActive ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>{c.isActive ? 'Activo' : 'Apagado'}</button>
                            <button onClick={() => deleteCoupon(c.id)} className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-4 py-3 rounded-xl font-black transition-colors" title="Eliminar Cupón">🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
            )}

          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
