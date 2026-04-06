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
    const res = await fetch('/api/orders?status=AWAITING_PAYMENT');
    const data = await res.json();
    if (data.success) setPendingCash(data.orders);
  };

  useEffect(() => {
    fetchCashOrders();
    const interval = setInterval(fetchCashOrders, 4000);
    return () => clearInterval(interval);
  }, [activeShift]);

  // LÓGICA DE ALERTAS DE HORARIO
  const getShiftAlert = () => {
    const hours = currentTime.getHours();
    const mins = currentTime.getMinutes();
    const day = currentTime.getDay(); // 0 es Domingo

    // Alerta de Apertura (5:45 PM - 6:00 PM)
    if (!activeShift && hours === 17 && mins >= 45) {
      return { msg: "⚠️ ATENCIÓN: El turno debería estar abierto. Favor de iniciar jornada.", color: "bg-red-600" };
    }
    // Alerta de Cierre Lunes-Sábado (9:45 PM)
    if (activeShift && day !== 0 && (hours > 21 || (hours === 21 && mins >= 45))) {
      return { msg: "📢 HORA DE CIERRE: Favor de proceder con el conteo final.", color: "bg-orange-600" };
    }
    // Alerta de Cierre Domingo (8:45 PM)
    if (activeShift && day === 0 && (hours > 20 || (hours === 20 && mins >= 45))) {
      return { msg: "📢 HORA DE CIERRE DOMINICAL: Favor de proceder con el conteo final.", color: "bg-orange-600" };
    }
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
    await fetch('/api/shift', { 
      method: 'POST', 
      body: JSON.stringify({ shiftId: activeShift.id, type: 'OUT', amount: moveAmount, reason: moveReason }) 
    });
    setShowMoveModal(false); setMoveAmount(''); setMoveReason('');
    checkShift();
  };

  const handleCloseShift = async () => {
    if (!reportedCash) return;
    await fetch('/api/shift', { method: 'PATCH', body: JSON.stringify({ shiftId: activeShift.id, reportedCash }) });
    setShowCloseModal(false); setReportedCash(''); checkShift();
  };

  if (shiftLoading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Verificando...</div>;

  return (
    <ProtectedRoute title="Caja Maiztros">
      <div className="min-h-screen bg-zinc-950 text-white font-sans">
        
        {alert && (
          <div className={`${alert.color} p-4 text-center font-black text-white animate-pulse sticky top-0 z-50`}>
            {alert.msg}
          </div>
        )}

        <div className="p-8">
          {!activeShift ? (
            <div className="max-w-md mx-auto bg-zinc-900 p-10 rounded-[3rem] border border-zinc-800 shadow-2xl mt-10">
              <h1 className="text-3xl font-black text-yellow-400 mb-6 text-center italic">Inicio de Turno</h1>
              <div className="space-y-4">
                <input type="text" placeholder="Tu Nombre" value={cashierName} onChange={e => setCashierName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 p-4 rounded-xl text-white outline-none"/>
                <input type="number" placeholder="Fondo Inicial ($)" value={startingCash} onChange={e => setStartingCash(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 p-4 rounded-xl text-white font-black text-2xl outline-none"/>
                <button onClick={handleOpenShift} className="w-full bg-yellow-400 text-zinc-950 font-black py-4 rounded-xl mt-4 hover:bg-yellow-300">Abrir Caja</button>
              </div>
            </div>
          ) : (
            <>
              <header className="flex flex-col md:flex-row justify-between items-center border-b border-zinc-800 pb-6 mb-8 gap-4">
                <div>
                  <h1 className="text-4xl font-black text-green-500">💵 CAJA</h1>
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mt-1">Responsable: {activeShift.openedBy}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowMoveModal(true)} className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-full font-bold text-sm border border-zinc-700 transition-colors">💸 Retiro / Gasto</button>
                  <button onClick={() => setShowCloseModal(true)} className="bg-white text-zinc-950 px-6 py-2 rounded-full font-black text-sm transition-colors">Finalizar Jornada</button>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingCash.map(order => (
                  <div key={order.id} className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl flex flex-col justify-between h-64">
                    <div>
                      <p className="text-5xl font-black italic text-white mb-2">#{order.turnNumber}</p>
                      <p className="text-zinc-500 font-bold">{order.customerName}</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <p className="text-3xl font-black text-green-400">${(order.totalAmount + order.tipAmount).toFixed(2)}</p>
                      <button onClick={() => { setSelectedOrder(order); setReceivedAmount(''); }} className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-black transition-all active:scale-95">Cobrar</button>
                    </div>
                  </div>
                ))}
                {pendingCash.length === 0 && <p className="col-span-full text-center text-zinc-600 text-xl mt-20 font-bold">No hay cobros pendientes ☕</p>}
              </div>
            </>
          )}
        </div>

        {/* MODAL COBRO (Omitido por brevedad, igual que el anterior) */}
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
                 }} className="flex-2 bg-green-500 text-zinc-950 py-4 rounded-xl font-black text-xl">Confirmar</button>
               </div>
             </div>
          </div>
        )}

        {/* MODAL RETIRO / GASTO */}
        {showMoveModal && (
          <div className="fixed inset-0 bg-black/90 flex justify-center items-center p-4 z-[60] backdrop-blur-md">
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-[2.5rem] p-8">
              <h2 className="text-2xl font-black text-white mb-6">Registrar Retiro de Efectivo</h2>
              <div className="space-y-4">
                <input type="number" value={moveAmount} onChange={e => setMoveAmount(e.target.value)} placeholder="Monto $" className="w-full bg-zinc-950 border border-zinc-700 p-4 rounded-xl text-white text-2xl font-black outline-none focus:border-red-500"/>
                <input type="text" value={moveReason} onChange={e => setMoveReason(e.target.value)} placeholder="Motivo (Ej. Retiro Luis / Pago Gas)" className="w-full bg-zinc-950 border border-zinc-700 p-4 rounded-xl text-white outline-none focus:border-red-500"/>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowMoveModal(false)} className="flex-1 bg-zinc-800 py-4 rounded-xl font-bold">Cancelar</button>
                  <button onClick={handleCashMovement} className="flex-1 bg-red-600 text-white font-black py-4 rounded-xl shadow-lg">Confirmar Retiro</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL FINALIZAR JORNADA */}
        {showCloseModal && (
          <div className="fixed inset-0 bg-black/95 flex justify-center items-center p-4 z-[60] backdrop-blur-sm">
            <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-[3rem] p-10 text-center">
              <span className="text-6xl mb-4 block">💰</span>
              <h2 className="text-2xl font-black mb-2">Validación de Fondos</h2>
              <p className="text-zinc-500 text-sm mb-8 font-medium">Cuenta todo el efectivo en caja (incluyendo morralla) e ingresa el monto total.</p>
              <input type="number" value={reportedCash} onChange={e => setReportedCash(e.target.value)} placeholder="$ 0.00" className="w-full bg-zinc-900 border border-zinc-700 p-6 rounded-2xl text-4xl font-black text-white outline-none mb-8 text-center"/>
              <div className="flex gap-4">
                <button onClick={() => setShowCloseModal(false)} className="flex-1 bg-zinc-800 py-4 rounded-xl font-bold">Volver</button>
                <button onClick={handleCloseShift} className="flex-1 bg-green-500 text-zinc-950 py-4 rounded-xl font-black shadow-lg">Cerrar Turno</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
