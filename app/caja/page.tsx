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
  const [moveAuthor, setMoveAuthor] = useState('LUIS (JEFE)');

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
      // ATENCIÓN: Ahora traemos PENDING (Pedidos de la app) y AWAITING_PAYMENT (Pedidos del kiosco en efectivo)
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success) {
         // Filtramos solo las órdenes que la caja debe atender
         const validOrders = data.orders.filter((o: any) => o.status === 'AWAITING_PAYMENT' || (o.status === 'PENDING' && o.orderType === 'TAKEOUT'));
         setPendingCash(validOrders);
      }
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

  // ==========================================
  // NUEVAS FUNCIONES OPERATIVAS (ETA Y CAMBIO DE PAGO)
  // ==========================================
  const changePaymentMethod = async (orderId: string, currentMethod: string) => {
    const newMethod = currentMethod === 'TERMINAL' ? 'EFECTIVO_CAJA' : 'TERMINAL';
    if (!confirm(`¿Cambiar método de pago a ${newMethod === 'TERMINAL' ? 'Tarjeta (Terminal)' : 'Efectivo (Caja)'}?`)) return;

    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'CHANGE_PAYMENT', orderId, newPaymentMethod: newMethod })
    });
    fetchCashOrders(); 
  };

  const acceptWebOrder = async (orderId: string) => {
    const minutes = window.prompt('Pedido desde App Móvil.\n¿En cuántos minutos estará listo? (Ej. 15)');
    if (!minutes || isNaN(parseInt(minutes))) return;

    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ACCEPT_ORDER', orderId, etaMinutes: minutes })
    });
    fetchCashOrders(); 
  };

  // COBROS
  const handleCobrarClick = (order: any) => { setSelectedOrder(order); setReceivedAmount(''); };
  
  if (shiftLoading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white"><div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div></div>;

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
            <button onClick={handleOpenShift} className="w-full bg-green-500 text-zinc-950 font-black text-xl py-4 rounded-xl mt-8 hover:bg-green-400 transition-colors shadow-lg active:scale-95">🔓 Abrir Turno</button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute title="Caja Maiztros" requiredRole="CAJERO">
      {(role: any) => (
        <div className="min-h-screen bg-zinc-950 text-white font-sans">
          {alert && <div className={`${alert.color} p-4 text-center font-black text-white animate-pulse sticky top-0 z-50`}>{alert.msg}</div>}

          <div className="p-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-6 mb-8 gap-4">
              <div>
                <h1 className="text-4xl font-black text-green-500 tracking-tighter">💵 CAJA MAIZTROS</h1>
                <p className="text-zinc-400 font-bold mt-1">Cajero: <span className="text-yellow-400">{activeShift.openedBy}</span> | Fondo Inicial: ${activeShift.startingCash}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="bg-zinc-900 px-6 py-2 rounded-full border border-zinc-700 font-bold text-zinc-400">Pendientes: <span className="text-white text-xl">{pendingCash.length}</span></div>
                <button onClick={() => setShowMoveModal(true)} className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-full font-bold text-sm border border-zinc-700 transition-colors shadow-lg">💸 Retiro / Gasto</button>
                <button onClick={() => setShowCloseModal(true)} className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-full font-black text-sm transition-colors shadow-lg shadow-red-600/20">Cerrar Turno 🔒</button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingCash.map(order => {
                  const isWebOrder = order.status === 'PENDING' && order.orderType === 'TAKEOUT';
                  
                  return (
                    <div key={order.id} className={`bg-zinc-900 p-6 rounded-[2rem] border-2 shadow-xl flex flex-col justify-between h-auto min-h-[16rem] transition-colors ${isWebOrder ? 'border-purple-500/50 bg-purple-900/10' : 'border-orange-500/50'}`}>
                      <div>
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-5xl font-black italic text-white">#{order.turnNumber}</p>
                            {isWebOrder ? (
                                <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-lg text-xs font-black border border-purple-500/30 uppercase tracking-widest animate-pulse">📱 Nuevo Web</span>
                            ) : (
                                <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-lg text-xs font-black border border-orange-500/30 uppercase tracking-widest">En Caja</span>
                            )}
                        </div>
                        <p className="text-zinc-300 font-bold text-xl truncate pr-2">{order.customerName}</p>
                        
                        <div className="mt-4 pt-4 border-t border-zinc-800">
                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Total a Cobrar</p>
                            <p className="text-4xl text-white font-black">${(order.totalAmount + order.tipAmount).toFixed(2)}</p>
                            <p className="text-xs text-zinc-500 font-bold mt-1 uppercase tracking-widest">{order.paymentMethod === 'TERMINAL' ? '💳 Pago con Tarjeta' : '💵 Pago en Efectivo'}</p>
                        </div>
                      </div>
                      
                      <div className="mt-6 flex flex-col gap-2">
                          {/* BOTONES DE ACCIÓN (ETA Y CAMBIO DE PAGO) */}
                          {isWebOrder ? (
                              <button onClick={() => acceptWebOrder(order.id)} className="w-full bg-purple-500 hover:bg-purple-400 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-purple-500/20">
                                  ⏱️ Aceptar y dar Tiempo
                              </button>
                          ) : (
                              <div className="flex gap-2">
                                  <button onClick={() => changePaymentMethod(order.id, order.paymentMethod)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold p-4 rounded-xl transition-all active:scale-95 border border-zinc-700" title="Cambiar Método de Pago">
                                      🔄
                                  </button>
                                  <button onClick={() => handleCobrarClick(order)} className="flex-1 bg-green-500 hover:bg-green-400 text-zinc-950 py-4 rounded-xl font-black text-lg uppercase transition-all active:scale-95 shadow-lg shadow-green-500/20">
                                      💰 Recibir Pago
                                  </button>
                              </div>
                          )}
                      </div>
                    </div>
                  );
              })}
              {pendingCash.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                      <span className="text-8xl mb-4">🧹</span>
                      <p className="text-zinc-400 text-2xl font-black">Barra Limpia</p>
                      <p className="text-zinc-500 font-bold mt-2">No hay cobros ni pedidos pendientes.</p>
                  </div>
              )}
            </div>
          </div>

          {/* ========================================== */}
          {/* MODALES (MISMOS QUE TENÍAS, DISEÑO MEJORADO) */}
          {/* ========================================== */}
          
          {/* MODAL COBRO */}
          {selectedOrder && (
            <div className="fixed inset-0 bg-black/95 flex justify-center items-center p-4 z-[60] backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-[3rem] p-10 flex flex-col shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-3xl font-black text-white">Cobro #{selectedOrder.turnNumber}</h2>
                      <span className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded text-xs font-bold uppercase">{selectedOrder.paymentMethod === 'TERMINAL' ? 'TARJETA' : 'EFECTIVO'}</span>
                  </div>
                  
                  {selectedOrder.paymentMethod === 'TERMINAL' ? (
                      <div className="bg-blue-500/10 border border-blue-500/30 p-6 rounded-2xl mb-8 text-center">
                          <span className="text-6xl block mb-4">💳</span>
                          <p className="text-blue-400 font-black text-2xl mb-2">Cobra en Terminal</p>
                          <p className="text-white font-black text-5xl">${(selectedOrder.totalAmount + selectedOrder.tipAmount).toFixed(2)}</p>
                      </div>
                  ) : (
                      <>
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-2">Total a cobrar: ${(selectedOrder.totalAmount + selectedOrder.tipAmount).toFixed(2)}</p>
                        <input type="number" placeholder="El cliente paga con..." value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)} className="w-full bg-zinc-950 p-6 rounded-2xl text-4xl font-black text-white outline-none border border-zinc-700 focus:border-green-500 mb-4 transition-colors" autoFocus />
                        <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 mb-8 flex justify-between items-center">
                            <span className="text-zinc-500 font-bold text-xl">Dar Cambio:</span>
                            <span className="text-green-400 text-4xl font-black">${Math.max(0, (parseFloat(receivedAmount)||0) - (selectedOrder.totalAmount + selectedOrder.tipAmount)).toFixed(2)}</span>
                        </div>
                      </>
                  )}

                  <div className="flex gap-4">
                    <button onClick={() => setSelectedOrder(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-5 rounded-2xl font-bold text-white transition-colors">Cancelar</button>
                    <button onClick={async () => {
                        await fetch('/api/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: selectedOrder.id, newStatus: 'PAID' }) });
                        setSelectedOrder(null); setReceivedAmount(''); checkShift(); fetchCashOrders();
                    }} className="flex-[2] bg-green-500 hover:bg-green-400 text-zinc-950 py-5 rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-all">Confirmar Pago</button>
                  </div>
                </div>
            </div>
          )}

          {/* MODAL RETIRO / GASTO */}
          {showMoveModal && (
            <div className="fixed inset-0 bg-black/90 flex justify-center items-center p-4 z-[60] backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
                <h2 className="text-2xl font-black text-white mb-6">Registrar Retiro de Efectivo</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1 block">¿Quién autoriza / retira?</label>
                    <select value={moveAuthor} onChange={e => setMoveAuthor(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 p-4 rounded-xl text-white font-bold outline-none focus:border-red-500 transition-colors">
                      <option value="LUIS (JEFE)">Luis (Jefe)</option>
                      <option value="COLABORADOR">Colaborador en Turno</option>
                    </select>
                  </div>
                  <input type="number" value={moveAmount} onChange={e => setMoveAmount(e.target.value)} placeholder="Monto ($)" className="w-full bg-zinc-950 border border-zinc-700 p-4 rounded-xl text-white text-2xl font-black outline-none focus:border-red-500 transition-colors"/>
                  <input type="text" value={moveReason} onChange={e => setMoveReason(e.target.value)} placeholder="Motivo (Ej. Pago hielo, Gasolina)" className="w-full bg-zinc-950 border border-zinc-700 p-4 rounded-xl text-white font-bold outline-none focus:border-red-500 transition-colors"/>
                  
                  <div className="flex gap-3 pt-4">
                    <button onClick={() => setShowMoveModal(false)} className="flex-1 bg-zinc-800 py-4 rounded-xl font-bold hover:bg-zinc-700 transition-colors text-white">Cancelar</button>
                    <button onClick={handleCashMovement} className="flex-[2] bg-red-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-red-500 transition-colors active:scale-95">Confirmar Retiro</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODAL FINALIZAR JORNADA */}
          {showCloseModal && (
            <div className="fixed inset-0 bg-black/95 flex justify-center items-center p-4 z-[60] backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-[3rem] p-10 text-center shadow-2xl">
                <span className="text-6xl mb-4 block">💰</span>
                <h2 className="text-2xl font-black mb-2 text-white">Corte de Caja (Ciego)</h2>
                <p className="text-zinc-500 text-sm mb-8 font-bold">Cuenta todo el efectivo físico en caja (incluyendo morralla y fondo) e ingresa el monto total exacto.</p>
                <input type="number" value={reportedCash} onChange={e => setReportedCash(e.target.value)} placeholder="$ 0.00" className="w-full bg-zinc-950 border border-zinc-700 p-6 rounded-2xl text-4xl font-black text-white outline-none mb-8 text-center focus:border-yellow-400 transition-colors"/>
                <div className="flex gap-4">
                  <button onClick={() => setShowCloseModal(false)} className="flex-1 bg-zinc-800 py-4 rounded-xl font-bold text-white hover:bg-zinc-700 transition-colors">Volver</button>
                  <button onClick={handleCloseShift} className="flex-[2] bg-red-600 text-white py-4 rounded-xl font-black shadow-lg hover:bg-red-500 active:scale-95 transition-all">Cerrar Turno 🔒</button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </ProtectedRoute>
  );
}
