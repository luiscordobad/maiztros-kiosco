// @ts-nocheck
/* eslint-disable */
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

  // ==========================================
  // ESTADOS PARA LA TERMINAL FÍSICA
  // ==========================================
  const [waitingTerminal, setWaitingTerminal] = useState(false);
  const [terminalIntentId, setTerminalIntentId] = useState<string | null>(null);
  const [terminalStatusMsg, setTerminalStatusMsg] = useState('Conectando con la terminal...');

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
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success) {
         // 🌟 LÓGICA ACTUALIZADA: Atrapamos las órdenes en Caja y las Web (PickToGo y Takeout)
         const validOrders = data.orders.filter((o: any) => 
            o.status === 'AWAITING_PAYMENT' || 
            (o.status === 'PENDING' && o.orderType === 'PICK_TO_GO') || 
            (o.status === 'PENDING' && o.orderType === 'TAKEOUT')
         );
         setPendingCash(validOrders);
      }
    } catch (error) { console.error("Error fetching orders"); }
  };

  useEffect(() => {
    fetchCashOrders();
    const interval = setInterval(fetchCashOrders, 4000);
    return () => clearInterval(interval);
  }, [activeShift]);

  const getShiftAlert = () => {
    const hours = currentTime.getHours();
    const mins = currentTime.getMinutes();
    const day = currentTime.getDay(); 

    if (!activeShift && hours === 17 && mins >= 45) return { msg: "⚠️ ATENCIÓN: El turno debería estar abierto. Favor de iniciar jornada.", color: "bg-red-600" };
    if (activeShift && day !== 0 && (hours > 21 || (hours === 21 && mins >= 45))) return { msg: "📢 HORA DE CIERRE: Favor de proceder con el conteo final.", color: "bg-orange-600" };
    if (activeShift && day === 0 && (hours > 20 || (hours === 20 && mins >= 45))) return { msg: "📢 HORA DE CIERRE DOMINICAL: Favor de proceder con el conteo final.", color: "bg-orange-600" };
    return null;
  };

  const shiftAlertMessage = getShiftAlert(); 

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

  // ==========================================
  // 🌟 CIERRE DE TURNO Y REPORTE SILENCIOSO
  // ==========================================
  const handleCloseShift = async () => {
    if (!reportedCash) return;
    await fetch('/api/shift', { method: 'PATCH', body: JSON.stringify({ shiftId: activeShift.id, reportedCash }) });
    setShowCloseModal(false); setReportedCash(''); checkShift();
    fetch('/api/send-report?type=daily').catch(() => {});
  };

  const changePaymentMethod = async (orderId: string, currentMethod: string) => {
    const newMethod = currentMethod === 'TERMINAL' ? 'EFECTIVO_CAJA' : 'TERMINAL';
    if (!window.confirm(`¿Cambiar método de pago a ${newMethod === 'TERMINAL' ? 'Tarjeta (Terminal)' : 'Efectivo (Caja)'}?`)) return;

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

  // 🌟 NUEVA LÓGICA: Mandar directo al KDS sin cobrar (porque ya está pagado en web)
  const sendToKDS = async (orderId: string) => {
      if (!window.confirm('¿Mandar este pedido a la pantalla de cocina (KDS) ahora?')) return;
      await fetch('/api/orders', { 
          method: 'PATCH', 
          headers: { 'Content-Type': 'application/json' }, 
          // 'PREPARING' es el estado que el KDS escucha
          body: JSON.stringify({ orderId, newStatus: 'PREPARING' }) 
      });
      fetchCashOrders();
  };

  // ==========================================
  // LÓGICA DE EDICIÓN EN CAJA
  // ==========================================
  const handleCobrarClick = (order: any) => {
    const editableItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    setSelectedOrder({ ...order, items: editableItems });
    setReceivedAmount('');
  };

  const updateItemQty = (index: number, delta: number) => {
      const newItems = [...selectedOrder.items];
      const item = newItems[index];
      
      const unitPrice = item.totalPrice / (item.quantity || 1);
      const newQty = (item.quantity || 1) + delta;

      if (newQty <= 0) {
          if (window.confirm('¿Eliminar este producto de la orden?')) newItems.splice(index, 1);
          else return;
      } else {
          newItems[index] = { ...item, quantity: newQty, totalPrice: unitPrice * newQty };
      }

      const newTotal = newItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
      setSelectedOrder({ ...selectedOrder, items: newItems, totalAmount: newTotal });
  };

  const updateItemNotes = (index: number, newNotes: string) => {
      const newItems = [...selectedOrder.items];
      newItems[index] = { ...newItems[index], notes: newNotes };
      setSelectedOrder({ ...selectedOrder, items: newItems });
  };

  const finalizarCobroFisico = async () => {
    await fetch('/api/orders', { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
            orderId: selectedOrder.id, 
            newStatus: 'PAID', // Al marcar PAID, el KDS lo atrapa automáticamente
            updatedItems: selectedOrder.items, 
            newTotal: selectedOrder.totalAmount 
        }) 
    });
    setSelectedOrder(null);
    fetchCashOrders();
  };

  const cancelarOrdenTotal = async () => {
    if (!window.confirm('¿Estás seguro de que deseas CANCELAR esta orden por completo? Desaparecerá de la lista.')) return;
    
    try {
        await fetch('/api/orders', { 
            method: 'PATCH', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ orderId: selectedOrder.id, newStatus: 'REFUNDED' }) 
        });
        setSelectedOrder(null);
        fetchCashOrders();
    } catch (error) {
        window.alert("Error al intentar cancelar la orden."); 
    }
  };

  // ==========================================
  // LÓGICA PARA ACTIVAR Y ESCUCHAR LA TERMINAL
  // ==========================================
  const checkTerminalStatus = async (intentId: string, order: any) => {
    try {
      const res = await fetch(`/api/terminal?intentId=${intentId}`);
      const data = await res.json();
      const currentState = (data.state || '').toUpperCase();
      
      if (currentState === 'OPEN') setTerminalStatusMsg('💳 Esperando que el cliente pase la tarjeta...');
      if (currentState === 'PROCESSING') setTerminalStatusMsg('⏳ Procesando el pago con el banco...');
      if (currentState === 'FINISHED') { 
        setTerminalStatusMsg('✅ ¡Pago aprobado!'); 
        
        await fetch('/api/orders', { 
            method: 'PATCH', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                orderId: order.id, 
                newStatus: 'PAID', // El KDS lo detectará automáticamente
                updatedItems: order.items,
                newTotal: order.totalAmount
            }) 
        });
        
        setWaitingTerminal(false); 
        setTerminalIntentId(null); 
        setSelectedOrder(null);
        checkShift(); 
        fetchCashOrders();
        return true; 
      }
      if (currentState === 'CANCELED' || currentState === 'ABANDONED') { 
        window.alert('El cobro fue cancelado en la terminal física o se acabó el tiempo.'); 
        setWaitingTerminal(false); 
        setTerminalIntentId(null); 
        return true; 
      }
      return false; 
    } catch (e) { return false; }
  };

  const triggerTerminalPayment = async () => {
    const finalTotal = selectedOrder.totalAmount + selectedOrder.tipAmount;
    try {
      setWaitingTerminal(true);
      setTerminalStatusMsg('Iniciando conexión con Terminal...');
      
      const res = await fetch('/api/terminal', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ amount: finalTotal, description: `Orden #${selectedOrder.turnNumber}` }) 
      });
      const data = await res.json();
      
      if (data.success) {
        setTerminalIntentId(data.intentId);
        const interval = setInterval(async () => { 
            const finished = await checkTerminalStatus(data.intentId, selectedOrder); 
            if (finished) clearInterval(interval); 
        }, 3000);
      } else { 
        window.alert('Error al conectar con la terminal. Revisa la red.'); 
        setWaitingTerminal(false); 
      }
    } catch (e) { 
      window.alert("Error de conexión"); 
      setWaitingTerminal(false); 
    }
  };
  
  const getQuickBills = (total: number) => {
      const bills = [50, 100, 200, 500, 1000];
      return bills.filter(b => b > total);
  };

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
      {(_role: any) => (
        <div className="min-h-screen bg-zinc-950 text-white font-sans">
          {shiftAlertMessage && <div className={`${shiftAlertMessage.color} p-4 text-center font-black text-white animate-pulse sticky top-0 z-50`}>{shiftAlertMessage.msg}</div>}

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
                  const isPickToGo = order.orderType === 'PICK_TO_GO';
                  const isWebOrder = order.status === 'PENDING' && order.orderType === 'TAKEOUT';
                  
                  return (
                    <div key={order.id} className={`bg-zinc-900 p-6 rounded-[2rem] border-2 shadow-xl flex flex-col justify-between h-auto min-h-[16rem] transition-colors ${
                        isPickToGo ? 'border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.3)] bg-purple-900/10' : 
                        isWebOrder ? 'border-blue-500/50 bg-blue-900/10' : 
                        'border-orange-500/50'
                    }`}>
                      <div>
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-5xl font-black italic text-white">#{order.turnNumber}</p>
                            {isPickToGo ? (
                                <span className="bg-purple-600 text-white px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest animate-pulse border border-purple-400">⚡ Pick To Go</span>
                            ) : isWebOrder ? (
                                <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg text-xs font-black border border-blue-500/30 uppercase tracking-widest">📱 App VIP</span>
                            ) : (
                                <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-lg text-xs font-black border border-orange-500/30 uppercase tracking-widest">En Caja</span>
                            )}
                        </div>
                        <p className="text-zinc-300 font-bold text-xl truncate pr-2">{order.customerName}</p>
                        
                        <div className="mt-4 pt-4 border-t border-zinc-800">
                            {isPickToGo ? (
                                <>
                                    <p className="text-purple-300 text-[10px] font-black uppercase tracking-widest mb-1">Pagado en MercadoPago ✅</p>
                                    <p className="text-4xl text-white font-black">${(order.totalAmount + order.tipAmount).toFixed(2)}</p>
                                    <div className="bg-purple-600 text-white font-black text-xs text-center py-2 px-3 rounded-xl mt-3 uppercase tracking-widest">
                                        ⏰ RECOGE A LAS {order.pickupTime || 'Pronto'}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Total a Cobrar</p>
                                    <p className="text-4xl text-white font-black">${(order.totalAmount + order.tipAmount).toFixed(2)}</p>
                                    <p className="text-xs text-zinc-500 font-bold mt-1 uppercase tracking-widest">{order.paymentMethod === 'TERMINAL' ? '💳 Pago con Tarjeta' : '💵 Pago en Efectivo'}</p>
                                </>
                            )}
                        </div>
                      </div>
                      
                      <div className="mt-6 flex flex-col gap-2">
                          {isPickToGo ? (
                              // 🌟 BOTÓN MÁGICO QUE MANDA LA ORDEN AL KDS
                              <button onClick={() => sendToKDS(order.id)} className="w-full bg-purple-500 hover:bg-purple-400 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-purple-500/20">
                                  🍳 Mandar a Cocina
                              </button>
                          ) : isWebOrder ? (
                              <button onClick={() => acceptWebOrder(order.id)} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20">
                                  ⏱️ Aceptar y dar Tiempo
                              </button>
                          ) : (
                              <div className="flex gap-2">
                                  <button onClick={() => changePaymentMethod(order.id, order.paymentMethod)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold p-4 rounded-xl transition-all active:scale-95 border border-zinc-700" title="Cambiar Método de Pago">
                                      🔄
                                  </button>
                                  <button onClick={() => handleCobrarClick(order)} className="flex-1 bg-green-500 hover:bg-green-400 text-zinc-950 py-4 rounded-xl font-black text-lg uppercase transition-all active:scale-95 shadow-lg shadow-green-500/20">
                                      💰 Cobrar / Editar
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
          {/* MODAL COBRO: EDITOR Y CALCULADORA          */}
          {/* ========================================== */}
          {selectedOrder && (
            <div className="fixed inset-0 bg-black/95 flex justify-center items-center p-4 z-[60] backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-zinc-900 border border-zinc-800 w-full max-w-5xl rounded-[3rem] overflow-hidden flex flex-col shadow-2xl max-h-[90vh]">
                  
                  <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
                      <div>
                          <h2 className="text-3xl font-black text-white">Cobro e Inspección #{selectedOrder.turnNumber}</h2>
                          <p className="text-zinc-500 font-bold text-sm mt-1">Modifica, cobra o cancela esta orden por completo.</p>
                      </div>
                      <button onClick={() => setSelectedOrder(null)} className="text-zinc-500 hover:text-white text-4xl font-light transition-colors">✕</button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* LADO IZQUIERDO: EDITOR DE ITEMS */}
                      <div className="space-y-4">
                          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">Productos en la orden</h3>
                          {selectedOrder.items.map((item: any, idx: number) => (
                              <div key={idx} className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 flex flex-col gap-4">
                                  <div className="flex justify-between items-start">
                                      <p className="font-black text-lg text-yellow-400">{item.product.name}</p>
                                      <p className="font-black text-xl text-white">${item.totalPrice.toFixed(2)}</p>
                                  </div>
                                  
                                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                      {/* Controles de Cantidad */}
                                      <div className="flex items-center bg-zinc-900 rounded-xl border border-zinc-700">
                                          <button onClick={() => updateItemQty(idx, -1)} className="px-4 py-2 font-black text-xl text-zinc-400 hover:text-red-500 transition-colors">-</button>
                                          <span className="px-4 font-black text-lg text-white">{item.quantity || 1}</span>
                                          <button onClick={() => updateItemQty(idx, 1)} className="px-4 py-2 font-black text-xl text-zinc-400 hover:text-green-500 transition-colors">+</button>
                                      </div>
                                      {/* Editor de Notas */}
                                      <textarea 
                                          value={item.notes || ''} 
                                          onChange={(e) => updateItemNotes(idx, e.target.value)}
                                          placeholder="Toppings / Notas de cocina..."
                                          className="flex-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-sm font-bold text-zinc-300 focus:border-yellow-400 outline-none h-16 resize-none transition-colors"
                                      />
                                  </div>
                              </div>
                          ))}
                          {selectedOrder.items.length === 0 && (
                              <div className="text-center py-10 bg-zinc-950 rounded-2xl border border-red-500/50 border-dashed">
                                  <span className="text-4xl mb-2 block">🗑️</span>
                                  <p className="text-red-400 font-bold text-lg">¡La orden quedó vacía!</p>
                                  <p className="text-zinc-500 text-sm mt-1">Usa el botón rojo de abajo para cancelar esta orden definitivamente.</p>
                              </div>
                          )}
                      </div>

                      {/* LADO DERECHO: PAGO Y CALCULADORA */}
                      <div className="bg-zinc-950 p-8 rounded-[2rem] border border-zinc-800 flex flex-col">
                          <div className="mb-8">
                              <p className="text-zinc-500 font-black uppercase text-xs tracking-widest mb-2">Total Final a Cobrar</p>
                              <p className="text-7xl font-black text-white">${(selectedOrder.totalAmount + selectedOrder.tipAmount).toFixed(2)}</p>
                              <div className="flex gap-2 mt-3">
                                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${selectedOrder.paymentMethod === 'TERMINAL' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                                      {selectedOrder.paymentMethod === 'TERMINAL' ? '💳 TARJETA' : '💵 EFECTIVO'}
                                  </span>
                                  {selectedOrder.tipAmount > 0 && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-zinc-800 text-zinc-400">Incl. Propina</span>}
                              </div>
                          </div>

                          {selectedOrder.paymentMethod === 'EFECTIVO_CAJA' ? (
                              <div className="space-y-6">
                                  {/* CALCULADORA RÁPIDA */}
                                  <div>
                                      <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest mb-2">Calculadora Rápida</p>
                                      <div className="flex flex-wrap gap-2 mb-3">
                                          <button onClick={() => setReceivedAmount((selectedOrder.totalAmount + selectedOrder.tipAmount).toString())} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-2 rounded-xl text-sm transition-colors border border-zinc-700">Exacto</button>
                                          {getQuickBills(selectedOrder.totalAmount + selectedOrder.tipAmount).map(bill => (
                                              <button key={bill} onClick={() => setReceivedAmount(bill.toString())} className="bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-zinc-900 border border-green-500/30 font-black px-4 py-2 rounded-xl text-sm transition-colors">${bill}</button>
                                          ))}
                                      </div>
                                      <input 
                                          type="number" 
                                          value={receivedAmount} 
                                          onChange={e => setReceivedAmount(e.target.value)} 
                                          placeholder="Monto personalizado..."
                                          className="w-full bg-zinc-900 border border-zinc-700 p-4 rounded-xl text-2xl font-black text-white outline-none focus:border-green-500 transition-colors"
                                      />
                                  </div>
                                  
                                  <div className="flex justify-between items-center p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
                                      <span className="text-zinc-500 font-bold text-lg uppercase tracking-widest">Cambio:</span>
                                      <span className={`text-4xl font-black ${Math.max(0, (parseFloat(receivedAmount)||0) - (selectedOrder.totalAmount + selectedOrder.tipAmount)) > 0 ? 'text-green-400' : 'text-zinc-600'}`}>
                                          ${Math.max(0, (parseFloat(receivedAmount)||0) - (selectedOrder.totalAmount + selectedOrder.tipAmount)).toFixed(2)}
                                      </span>
                                  </div>
                              </div>
                          ) : (
                              <div className="bg-blue-900/10 border border-blue-500/30 p-8 rounded-2xl text-center flex-1 flex flex-col justify-center">
                                  <span className="text-6xl mb-4 block">💳</span>
                                  <p className="text-blue-400 font-black text-2xl mb-2">Terminal Bancaria</p>
                                  <p className="text-zinc-400 text-sm font-bold leading-relaxed">Al presionar el botón azul, el total se enviará automáticamente a la terminal física para cobrar.</p>
                              </div>
                          )}

                          <div className="mt-auto pt-8 flex gap-3 border-t border-zinc-800">
                              <button onClick={() => setSelectedOrder(null)} className="bg-zinc-800 hover:bg-zinc-700 px-6 py-6 rounded-2xl font-bold text-white transition-colors">Volver</button>
                              
                              <button onClick={cancelarOrdenTotal} className="bg-red-900/30 hover:bg-red-600 text-red-400 hover:text-white px-6 py-6 rounded-2xl font-black transition-colors border border-red-900/50 hover:border-red-500" title="Eliminar orden por completo">
                                  🗑️ Cancelar
                              </button>

                              {selectedOrder.paymentMethod === 'TERMINAL' ? (
                                  <button onClick={triggerTerminalPayment} disabled={selectedOrder.items.length === 0} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-all disabled:opacity-50">💳 Cobrar</button>
                              ) : (
                                  <button 
                                    onClick={finalizarCobroFisico} 
                                    disabled={selectedOrder.items.length === 0 || (!receivedAmount || parseFloat(receivedAmount) < (selectedOrder.totalAmount + selectedOrder.tipAmount))} 
                                    className="flex-1 bg-green-500 hover:bg-green-400 text-zinc-950 py-6 rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:bg-zinc-700 disabled:text-zinc-500"
                                  >
                                    {(!receivedAmount || parseFloat(receivedAmount) < (selectedOrder.totalAmount + selectedOrder.tipAmount)) && selectedOrder.items.length > 0 ? 'Falta Dinero ⚠️' : 'Confirmar ✅'}
                                  </button>
                              )}
                          </div>
                      </div>
                  </div>
                </div>
            </div>
          )}

          {/* OVERLAY DE ESPERA DE TERMINAL */}
          {waitingTerminal && (
            <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-md flex flex-col justify-center items-center z-[70] text-center p-8 animate-in fade-in zoom-in-95 duration-200">
              <span className="text-[10rem] animate-pulse mb-8">💳</span>
              <h2 className="text-6xl font-black text-yellow-400 mb-6">Terminal Activada</h2>
              <p className="text-3xl text-zinc-300 font-medium bg-zinc-900 px-8 py-4 rounded-full border border-zinc-700 shadow-xl">{terminalStatusMsg}</p>
              <div className="mt-16 w-32 h-32 border-8 border-zinc-800 border-t-yellow-400 rounded-full animate-spin"></div>
              
              <button onClick={() => { setWaitingTerminal(false); setTerminalIntentId(null); }} className="mt-16 text-zinc-500 hover:text-white underline font-bold uppercase tracking-widest text-xs">
                Cancelar operación en sistema
              </button>
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
