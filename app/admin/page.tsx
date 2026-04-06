'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'INVENTARIO' | 'PANICO' | 'VENTAS' | 'MARKETING'>('VENTAS');
  const [data, setData] = useState<{ products: any[], modifiers: any[], coupons: any[], orders: any[], shifts: any[], inventoryItems: any[] }>({ products: [], modifiers: [], coupons: [], orders: [], shifts: [], inventoryItems: [] });
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('');
  const [newCouponType, setNewCouponType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [newCouponMinAmount, setNewCouponMinAmount] = useState(''); 

  const [addAmounts, setAddAmounts] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin?startDate=${startDate}&endDate=${endDate}`);
    const json = await res.json();
    if (json.success) setData(json);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [startDate, endDate]);

  const initInventory = async () => {
    if (!confirm("Esto cargará los datos iniciales. ¿Estás seguro?")) return;
    await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'init_inventory' }) });
    fetchData();
  };

  const updatePhysicalStock = async (id: string, newStock: string) => {
    if (newStock === '') return;
    setData({ ...data, inventoryItems: data.inventoryItems.map(i => i.id === id ? { ...i, stock: parseFloat(newStock) } : i) });
    await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, type: 'update_stock', newStock }) });
  };

  const addPhysicalStock = async (id: string) => {
    const amount = addAmounts[id];
    if (!amount || isNaN(parseFloat(amount))) return;
    setData({ ...data, inventoryItems: data.inventoryItems.map(i => i.id === id ? { ...i, stock: i.stock + parseFloat(amount) } : i) });
    setAddAmounts({ ...addAmounts, [id]: '' }); 
    await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, type: 'add_stock', addAmount: amount }) });
  };

  const toggleStatus = async (id: string, type: 'product' | 'modifier' | 'coupon' | 'inventory_toggle', currentStatus: boolean) => {
    if (type === 'product') setData({ ...data, products: data.products.map(i => i.id === id ? { ...i, isAvailable: !currentStatus } : i) });
    else if (type === 'modifier') setData({ ...data, modifiers: data.modifiers.map(i => i.id === id ? { ...i, isAvailable: !currentStatus } : i) });
    else if (type === 'inventory_toggle') setData({ ...data, inventoryItems: data.inventoryItems.map(i => i.id === id ? { ...i, isAvailable: !currentStatus } : i) });
    else if (type === 'coupon') setData({ ...data, coupons: data.coupons.map(i => i.id === id ? { ...i, isActive: !currentStatus } : i) });
    
    await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, type, [type === 'coupon' ? 'isActive' : 'isAvailable']: !currentStatus }) });
  };

  const toggleCategory = async (category: string, isModifier: boolean, currentItems: any[]) => {
    const targetState = !currentItems.every(i => i.isAvailable); 
    if (isModifier) setData({ ...data, modifiers: data.modifiers.map(m => m.type === category ? { ...m, isAvailable: targetState } : m) });
    else setData({ ...data, products: data.products.map(p => p.category === category ? { ...p, isAvailable: targetState } : p) });
    await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'toggle_category', category, targetState, isModifier }) });
  };

  const handleCreateCoupon = async () => {
    if (!newCouponCode || !newCouponDiscount) return alert('Llena los datos del cupón');
    const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: newCouponCode, discount: newCouponDiscount, discountType: newCouponType, minAmount: newCouponMinAmount }) });
    const json = await res.json();
    if (json.success) { setNewCouponCode(''); setNewCouponDiscount(''); setNewCouponMinAmount(''); fetchData(); } 
    else { alert(json.error); }
  };

  const deleteCoupon = async (id: string) => {
    if(!confirm("¿Eliminar este cupón definitivamente?")) return;
    setData({ ...data, coupons: data.coupons.filter(c => c.id !== id) });
    await fetch(`/api/admin?id=${id}`, { method: 'DELETE' });
  };

  const handleRefund = async (orderId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta orden?')) return;
    setData({ ...data, orders: data.orders.map(o => o.id === orderId ? { ...o, status: 'REFUNDED' } : o) });
    await fetch('/api/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, newStatus: 'REFUNDED' }) });
  };

  const exportToCSV = () => {
    let csv = 'Turno,Estado,Fecha,Cliente,MetodoPago,MontoBruto,Descuento,MontoNeto\n';
    data.orders.forEach(o => { const date = new Date(o.createdAt); csv += `${o.turnNumber},${o.status},${date.toLocaleDateString()},${o.customerName},${o.paymentMethod},${o.totalAmount + (o.pointsDiscount||0)},${o.pointsDiscount||0},${o.totalAmount}\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Maiztros_Ventas.csv`; a.click();
  };

  const getTicketUrl = (turnNumber: string) => `${typeof window !== 'undefined' ? window.location.origin : 'https://maiztros.vercel.app'}/ticket/${turnNumber}`;
  const sendWhatsApp = (phone: string, name: string, turnNumber: string) => window.open(`https://api.whatsapp.com/send?phone=52${phone}&text=${encodeURIComponent(`¡Hola ${name}! 🌽 Aquí tienes tu ticket: ${getTicketUrl(turnNumber)}`)}`, '_blank');
  const sendEmail = (email: string | null, name: string, turnNumber: string) => {
    const targetEmail = email || window.prompt(`Ingresa el correo de ${name}:`);
    if (targetEmail) window.open(`mailto:${targetEmail}?subject=Ticket de Maiztros&body=${encodeURIComponent(`Aquí tienes tu ticket: ${getTicketUrl(turnNumber)}`)}`, '_blank');
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
    const items = isModifier ? data.modifiers.filter(m => m.type === categoryFilter) : data.products.filter(p => p.category === categoryFilter);
    if (items.length === 0) return null;
    const allAvailable = items.every(i => i.isAvailable);

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
    const items = data.inventoryItems.filter(i => i.category === category);
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

  const validOrders = data.orders.filter(o => o.status !== 'REFUNDED');
  const totalOrders = validOrders.length;
  const ventasNetas = validOrders.reduce((acc: number, o: any) => acc + o.totalAmount, 0);

  return (
    <ProtectedRoute title="Dashboard Directivo">
      <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-10 font-sans max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-6 mb-8 gap-6">
          <h1 className="text-4xl font-black text-yellow-400">📊 MAIZTROS BI</h1>
          <div className="flex flex-wrap bg-zinc-900 rounded-full p-1 border border-zinc-800 overflow-hidden">
            <button onClick={() => setActiveTab('VENTAS')} className={`px-4 py-2 font-bold transition-all text-sm md:text-base ${activeTab === 'VENTAS' ? 'bg-yellow-400 text-zinc-950 rounded-full' : 'text-zinc-500 hover:text-white'}`}>📈 Ventas / Tesorería</button>
            <button onClick={() => setActiveTab('INVENTARIO')} className={`px-4 py-2 font-bold transition-all text-sm md:text-base ${activeTab === 'INVENTARIO' ? 'bg-yellow-400 text-zinc-950 rounded-full' : 'text-zinc-500 hover:text-white'}`}>📦 Stock Físico</button>
            <button onClick={() => setActiveTab('PANICO')} className={`px-4 py-2 font-bold transition-all text-sm md:text-base flex items-center gap-2 ${activeTab === 'PANICO' ? 'bg-red-500 text-white rounded-full' : 'text-zinc-500 hover:text-red-400'}`}>🚨 Menú Digital</button>
            <button onClick={() => setActiveTab('MARKETING')} className={`px-4 py-2 font-bold transition-all text-sm md:text-base ${activeTab === 'MARKETING' ? 'bg-yellow-400 text-zinc-950 rounded-full' : 'text-zinc-500 hover:text-white'}`}>🎟️ Marketing</button>
          </div>
        </header>

        {loading ? <p className="text-center text-zinc-500 text-xl py-20 animate-pulse">Sincronizando...</p> : (
          <>
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

            {/* PESTAÑA DE PÁNICO OPTIMIZADA */}
            {activeTab === 'PANICO' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="bg-red-950/10 border border-red-900/50 p-8 rounded-[2rem]">
                  <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-3">🚨 Panel de Pánico</h2>
                  <p className="text-zinc-400 font-bold mb-8">Apaga productos o sabores específicos. Lo que desactives desaparecerá instantáneamente del Kiosco.</p>
                  
                  {/* SECCIÓN 1: PRODUCTOS PRINCIPALES */}
                  <h2 className="text-2xl font-black text-yellow-400 mt-8 mb-4 border-l-4 border-yellow-400 pl-4">🍔 Menú Principal</h2>
                  {renderMenuCategory('COMBO', 'Cajas de Combos', false)}
                  {renderMenuCategory('ESQUITE', 'Esquites Sueltos', false)}
                  {renderMenuCategory('ESPECIALIDAD', 'Especialidades', false)}
                  {renderMenuCategory('BEBIDA', 'Bebidas Directas', false)}
                  
                  {/* SECCIÓN 2: OPCIONES INTERNAS (SABORES ESPECÍFICOS) */}
                  <h2 className="text-2xl font-black text-orange-400 mt-12 mb-4 border-l-4 border-orange-400 pl-4">🎯 Opciones y Sabores (Dentro de los Combos)</h2>
                  {renderPanicSubOptions('PAPAS', 'Tipos de Papas')}
                  {renderPanicSubOptions('MARUCHAN', 'Sabores de Maruchan')}
                  {renderPanicSubOptions('BEBIDA', 'Sabores de Boing / Refresco')}

                  {/* SECCIÓN 3: TOPPINGS Y MODIFICADORES */}
                  <h2 className="text-2xl font-black text-purple-400 mt-12 mb-4 border-l-4 border-purple-400 pl-4">🧂 Barra de Toppings</h2>
                  {renderMenuCategory('ADEREZO', 'Aderezos', true)}
                  {renderMenuCategory('QUESO', 'Quesos', true)}
                  {renderMenuCategory('POLVO', 'Polvos Extras', true)}
                  {renderMenuCategory('CHILE', 'Chiles', true)}
                </div>
              </div>
            )}

            {/* MARKETING MEJORADO */}
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

            {/* VENTAS / TESORERÍA */}
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
                  <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800"><p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Ticket Promedio</p><p className="text-4xl font-black text-yellow-400">${totalOrders > 0 ? (ventasNetas/totalOrders).toFixed(2) : '0.00'}</p></div>
                  <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800"><p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2">Órdenes Exitosas</p><p className="text-4xl font-black text-white">{totalOrders}</p></div>
                </div>

                <div className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 shadow-xl mt-8">
                  <h3 className="text-xl font-black mb-6 text-white border-b border-zinc-800 pb-4">Historial de Tickets y Operaciones</h3>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
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
