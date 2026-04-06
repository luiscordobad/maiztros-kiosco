'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function MonitorCaja() {
  const [activeShift, setActiveShift] = useState<any>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Apertura
  const [cashierName, setCashierName] = useState('');
  const [startingCash, setStartingCash] = useState('');

  // Movimientos (Retiros)
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveAmount, setMoveAmount] = useState('');
  const [moveReason, setMoveReason] = useState('');
  const [moveAuthor, setMoveAuthor] = useState('LUIS (JEFE)'); // <-- NUEVO: Autorización

  // Cierre
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [reportedCash, setReportedCash] = useState('');

  const [pendingCash, setPendingCash] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [receivedAmount, setReceivedAmount] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    checkShift();
    return () => clearInterval(timer);
  }, []);

  const checkShift = async () => {
    const res = await fetch('/api/shift');
    const data = await res.json();
    if (data.success && data.shift) setActiveShift(data.shift);
    else setActiveShift(null);
    setShiftLoading(false);
  };

  const fetchCashOrders = async () => {
    if (!activeShift) return;
    try {
      const res = await fetch('/api/orders?status=AWAITING_PAYMENT');
      const data = await res.json();
      if (data.success) setPendingCash(data.orders);
    } catch (error) { console.error("Error fetching orders"); }
  };

  useEffect(() => {
    fetchCashOrders();
    const interval = setInterval(fetchCashOrders, 4000);
    return () => clearInterval(interval);
  }, [activeShift]);

  // ALERTAS DE HORARIO 
  const getShiftAlert = () => {
    const hours = currentTime.getHours();
    const mins = currentTime.getMinutes();
    const day = currentTime.getDay(); 

    if (!activeShift && hours === 17 && mins >= 45) return { msg: "⚠️ ATENCIÓN: El turno debería estar abierto. Favor de iniciar jornada.", color: "bg-red-600" };
    if (activeShift && day !== 0 && (hours > 21 || (hours === 21 && mins >= 45))) return { msg: "📢 HORA DE CIERRE: Favor de proceder con el conteo final.", color: "bg-orange-600" };
    if (activeShift && day === 0 && (hours > 20 || (hours === 20 && mins >= 45))) return { msg: "📢 HORA DE CIERRE DOMINICAL: Favor de proceder con el conteo final.", color: "bg-orange-600" };
    return null;
  };

  const alert = getShiftAlert();

  const handleOpenShift = async () => {
    if (!cashierName || !startingCash) return;
    await fetch('/api/shift', { method: 'POST', body: JSON.stringify({ openedBy: cashierName, startingCash }) });
    checkShift();
  };

  const handleCashMovement = async () => {
    if (!moveAmount || !moveReason) return;
    // Guardamos quién lo autorizó directamente en el motivo para poder filtrarlo en el Admin
    const finalReason = `[${moveAuthor}] ${moveReason}`;
    await fetch('/api/shift', { 
      method: 'POST', 
      body: JSON.stringify({ shiftId: activeShift.id, type: 'OUT', amount: moveAmount, reason: finalReason }) 
    });
    setShowMoveModal(false); setMoveAmount(''); setMoveReason('');
    checkShift();
  };

  const handleCloseShift = async () => {
    if (!reportedCash) return;
    await fetch('/api/shift', { method: 'PATCH', body: JSON.stringify({ shiftId: activeShift.id, reportedCash }) });
    setShowCloseModal(false); setReportedCash(''); checkShift();
  };

  // COBROS
  const handleCobrarClick = (order: any) => { setSelectedOrder(order); setReceivedAmount(''); };
  const confirmarPago = async () => {
    if(!selectedOrder) return;
    await fetch('/api/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: selectedOrder.id, newStatus: 'PAID' }) });
    setSelectedOrder(null); setReceivedAmount(''); fetchCashOrders();
  };

  const orderTotal = selectedOrder ? (selectedOrder.totalAmount + selectedOrder.tipAmount) : 0;
  const receivedFloat = parseFloat(receivedAmount) || 0;
  const changeToGive = receivedFloat - orderTotal;

  if (shiftLoading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Verificando...</div>;

  if (!activeShift) {
    return (
      <ProtectedRoute title="Apertura de Caja">
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] w-full max-w-md shadow-2xl text-center">
            <span className="text-6xl mb-6 block">🔐</span>
            <h1 className="text-3xl font-black text-yellow-400 mb-2">Caja Cerrada</h1>
            <p className="text-zinc-400 font-bold mb-8">Abre un turno para poder cobrar.</p>
            <div className="space-y-4 text-left">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nombre del Cajero</label>
                <input type="text" value={cashierName} onChange={e => setCashierName(e.target.value)} placeholder="Ej. Luis C." className="w-full bg-zinc-950 border border-zinc-700 p-4 rounded-xl text-white outline-none focus:border-yellow-400 mt-1 font-bold"/>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Fondo de Caja (Morralla)</label>
                <input type="number" value={startingCash} onChange={e => setStartingCash(e.target.value)} placeholder="$ 500.00" className="w-full bg-zinc-950 border border-zinc-700 p-4 rounded-xl text-white outline-none focus:border-yellow-400 mt-1 font-black text-xl"/>
              </div>
            </div>
            <button onClick={handleOpenShift} className="w-full bg-green-500 text-zinc-950 font-black text-xl py-4 rounded-xl mt-8 hover:bg-green-400 transition-colors shadow-lg">🔓 Abrir Turno</button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute title="Caja Maiztros">
      <div className="min-h-screen bg-zinc-950 text-white font-sans">
        {alert && <div className={`${alert.color} p-4 text-center font-black text-white animate-pulse sticky top-0 z-50`}>{alert.msg}</div>}

        <div className="p-8">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-6 mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-black text-green-500 tracking-tighter">💵 CAJA MAIZTROS</h1>
              <p className="text-zinc-400 font-bold mt-1">Cajero: <span className="text-yellow-400">{activeShift.openedBy}</span> | Fondo: ${activeShift.startingCash}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-zinc-900 px-6 py-2 rounded-full border border-zinc-700 font-bold text-zinc-400">Pagos Pendientes: <span className="text-white text-xl">{pendingCash.length}</span></div>
              <button onClick={() => setShowMoveModal(true)} className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-full font-bold text-sm border border-zinc-700 transition-colors">💸 Retiro / Gasto</button>
              <button onClick={() => setShowCloseModal(true)} className="bg-white text-zinc-950 px-6 py-2 rounded-full font-black text-sm transition-colors">Finalizar Jornada</button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingCash.map(order => (
              <div key={order.id} className="bg-zinc-900 p-6 rounded-3xl border-2 border-orange-500/50 shadow-xl flex flex-col justify-between h-64">
                <div>
                  <div className="flex justify-between items-start mb-4"><p className="text-5xl font-black italic text-white">#{order.turnNumber}</p><span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-lg text-sm font-bold border border-orange-500/30 animate-pulse">En Espera</span></div>
                  <p className="text-zinc-400 font-bold text-xl">{order.customerName}</p>
                  <div className="mt-4 pt-4 border-t border-zinc-800"><p className="text-zinc-500 text-sm font-bold uppercase mb-1">Total a Cobrar</p><p className="text-4xl text-green-400 font-black">${(order.totalAmount + order.tipAmount).toFixed(2)}</p></div>
                </div>
                <button onClick={() => handleCobrarClick(order)} className="mt-6 w-full bg-green-600 hover:bg-green-500 text-white py-5 rounded-2xl font-black text-xl uppercase transition-all active:scale-95">💰 Recibir Pago</button>
              </div>
            ))}
            {pendingCash.length === 0 && <p className="col-span-full text-center text-zinc-600 text-xl mt-20 font-bold">No hay cobros pendientes ☕</p>}
          </div>
        </div>

        {/* MODAL COBRO (Se mantiene igual) */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/95 flex justify-center items-center p-4 z-[60] backdrop-blur-sm">
             <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-[3rem] p-10 flex flex-col shadow-2xl">
               <h2 className="text-3xl font-black mb-6">Cobrando #{selectedOrder.turnNumber}</h2>
               <input type="number" placeholder="Paga con..." value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)} className="w-full bg-zinc-900 p-6 rounded-2xl text-4xl font-black text-white outline-none mb-4" autoFocus />
               <p className="text-zinc-500 font-bold mb-8 text-xl">Cambio: <span className="text-green-400 text-3xl font-black">${Math.max(0, (parseFloat(receivedAmount)||0) - (selectedOrder.totalAmount + selectedOrder.tipAmount)).toFixed(2)}</span></p>
               <div className="flex gap-4">
                 <button onClick={() => setSelectedOrder(null)} className="flex-1 bg-zinc-800 py-4 rounded-xl font-bold">Cancelar</button>
                 <button onClick={async () => {
                    await fetch('/api/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: selectedOrder.id, newStatus: 'PAID' }) });
                    setSelectedOrder(null); checkShift(); fetchCashOrders();
                 }} className="flex-[2] bg-green-500 text-zinc-950 py-4 rounded-xl font-black text-xl">Confirmar</button>
               </div>
             </div>
          </div>
        )}

        {/* MODAL RETIRO / GASTO - CON SELECTOR DE AUTOR */}
        {showMoveModal && (
          <div className="fixed inset-0 bg-black/90 flex justify-center items-center p-4 z-[60] backdrop-blur-md">
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
              <h2 className="text-2xl font-black text-white mb-6">Registrar Retiro de Efectivo</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-zinc-500 text-xs font-bold uppercase mb-1 block">¿Quién autoriza / retira?</label>
                  <select value={moveAuthor} onChange={e => setMoveAuthor(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 p-4 rounded-xl text-white font-bold outline-none focus:border-red-500">
                    <option value="LUIS (JEFE)">Luis (Jefe)</option>
                    <option value="COLABORADOR">Colaborador en Turno</option>
                  </select>
                </div>
                <input type="number" value={moveAmount} onChange={e => setMoveAmount(e.target.value)} placeholder="Monto ($)" className="w-full bg-zinc-950 border border-zinc-700 p-4 rounded-xl text-white text-2xl font-black outline-none focus:border-red-500"/>
                <input type="text" value={moveReason} onChange={e => setMoveReason(e.target.value)} placeholder="Motivo (Ej. Pago hielo, Gasolina)" className="w-full bg-zinc-950 border border-zinc-700 p-4 rounded-xl text-white outline-none focus:border-red-500"/>
                
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowMoveModal(false)} className="flex-1 bg-zinc-800 py-4 rounded-xl font-bold hover:bg-zinc-700 transition-colors">Cancelar</button>
                  <button onClick={handleCashMovement} className="flex-1 bg-red-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-red-500 transition-colors">Confirmar Retiro</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL FINALIZAR JORNADA (Corte Ciego) */}
        {showCloseModal && (
          <div className="fixed inset-0 bg-black/95 flex justify-center items-center p-4 z-[60] backdrop-blur-sm">
            <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-[3rem] p-10 text-center shadow-2xl">
              <span className="text-6xl mb-4 block">💰</span>
              <h2 className="text-2xl font-black mb-2 text-white">Validación de Fondos</h2>
              <p className="text-zinc-500 text-sm mb-8 font-medium">Cuenta todo el efectivo en caja (incluyendo morralla) e ingresa el monto total.</p>
              <input type="number" value={reportedCash} onChange={e => setReportedCash(e.target.value)} placeholder="$ 0.00" className="w-full bg-zinc-900 border border-zinc-700 p-6 rounded-2xl text-4xl font-black text-white outline-none mb-8 text-center focus:border-yellow-400"/>
              <div className="flex gap-4">
                <button onClick={() => setShowCloseModal(false)} className="flex-1 bg-zinc-800 py-4 rounded-xl font-bold text-white hover:bg-zinc-700">Volver</button>
                <button onClick={handleCloseShift} className="flex-[2] bg-green-500 text-zinc-950 py-4 rounded-xl font-black shadow-lg hover:bg-green-400">Cerrar Turno</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
