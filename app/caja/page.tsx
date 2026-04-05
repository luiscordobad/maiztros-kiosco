'use client';
import { useState, useEffect } from 'react';

export default function MonitorCaja() {
  const [pendingCash, setPendingCash] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [receivedAmount, setReceivedAmount] = useState<string>('');

  const fetchCashOrders = async () => {
    try {
      const res = await fetch('/api/orders?status=AWAITING_PAYMENT');
      const data = await res.json();
      if (data.success) setPendingCash(data.orders);
    } catch (error) {
      console.error("Error fetching cash orders");
    }
  };

  useEffect(() => {
    fetchCashOrders();
    const interval = setInterval(fetchCashOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCobrarClick = (order: any) => {
    setSelectedOrder(order);
    setReceivedAmount('');
  };

  const confirmarPago = async () => {
    if(!selectedOrder) return;
    
    // Cambiamos el estado a PAID para que la cocina lo vea
    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: selectedOrder.id, newStatus: 'PAID' })
    });
    
    setSelectedOrder(null);
    setReceivedAmount('');
    fetchCashOrders();
  };

  const orderTotal = selectedOrder ? (selectedOrder.totalAmount + selectedOrder.tipAmount) : 0;
  const receivedFloat = parseFloat(receivedAmount) || 0;
  const changeToGive = receivedFloat - orderTotal;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <header className="flex justify-between items-center border-b border-zinc-800 pb-6 mb-8">
        <h1 className="text-4xl font-black text-green-500 tracking-tighter">💵 CAJA MAIZTROS</h1>
        <div className="bg-zinc-900 px-6 py-2 rounded-full border border-zinc-700 font-bold text-zinc-400">
          Pagos Pendientes: <span className="text-white text-xl">{pendingCash.length}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pendingCash.map(order => (
          <div key={order.id} className="bg-zinc-900 p-6 rounded-3xl border-2 border-orange-500/50 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex justify-between items-start mb-4">
                <p className="text-5xl font-black italic">#{order.turnNumber}</p>
                <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-lg text-sm font-bold border border-orange-500/30">En Espera</span>
              </div>
              <p className="text-zinc-400 font-bold text-xl">{order.customerName}</p>
              
              <div className="mt-4 pt-4 border-t border-zinc-800">
                 <p className="text-zinc-500 text-sm font-bold uppercase mb-1">Total a Cobrar</p>
                 <p className="text-4xl text-green-400 font-black">${(order.totalAmount + order.tipAmount).toFixed(2)}</p>
              </div>
            </div>
            <button 
              onClick={() => handleCobrarClick(order)}
              className="mt-6 w-full bg-green-600 hover:bg-green-500 text-white py-5 rounded-2xl font-black text-xl uppercase transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] active:scale-95"
            >
              💰 Recibir Pago
            </button>
          </div>
        ))}
        {pendingCash.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center mt-32 opacity-50">
            <span className="text-8xl mb-6">☕</span>
            <p className="text-3xl font-bold">Todo cobrado al momento.</p>
          </div>
        )}
      </div>

      {/* MODAL DE CALCULADORA DE CAMBIO */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/95 flex justify-center items-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-xl rounded-[3rem] p-10 flex flex-col shadow-2xl">
            
            <div className="flex justify-between items-start border-b border-zinc-800 pb-6 mb-8">
              <div>
                <p className="text-zinc-400 font-bold uppercase tracking-widest text-sm mb-1">Cobrando Turno</p>
                <h2 className="text-5xl font-black text-white">#{selectedOrder.turnNumber}</h2>
              </div>
              <div className="text-right">
                <p className="text-zinc-400 font-bold uppercase tracking-widest text-sm mb-1">Total</p>
                <h2 className="text-5xl font-black text-green-400">${orderTotal.toFixed(2)}</h2>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-zinc-500 font-bold uppercase text-sm mb-2 block">Efectivo Recibido</label>
                <div className="flex bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden focus-within:border-green-400 transition-colors">
                  <span className="flex items-center justify-center px-6 text-3xl font-black text-zinc-500 bg-zinc-950">$</span>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    value={receivedAmount} 
                    onChange={(e) => setReceivedAmount(e.target.value)} 
                    className="w-full bg-transparent p-5 outline-none text-4xl font-black text-white"
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {[50, 100, 200, 500].map(bill => (
                  <button 
                    key={bill} 
                    onClick={() => setReceivedAmount(bill.toString())}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xl py-4 rounded-xl border border-zinc-700 transition-colors"
                  >
                    ${bill}
                  </button>
                ))}
                <button 
                  onClick={() => setReceivedAmount(orderTotal.toString())}
                  className="col-span-4 bg-zinc-800 hover:bg-zinc-700 text-green-400 font-black text-xl py-4 rounded-xl border border-zinc-700 transition-colors uppercase tracking-widest"
                >
                  Exacto (${orderTotal.toFixed(2)})
                </button>
              </div>

              <div className={`p-6 rounded-2xl mt-8 ${changeToGive >= 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'} border-2`}>
                <p className="text-zinc-400 font-bold uppercase text-sm mb-1">Su Cambio</p>
                <p className={`text-6xl font-black ${changeToGive >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${changeToGive >= 0 ? changeToGive.toFixed(2) : '0.00'}
                </p>
                {changeToGive < 0 && receivedAmount !== '' && (
                   <p className="text-red-400 font-bold mt-2 text-sm">Faltan ${(orderTotal - receivedFloat).toFixed(2)}</p>
                )}
              </div>
            </div>

            <div className="mt-10 flex gap-4">
              <button 
                onClick={() => setSelectedOrder(null)} 
                className="flex-1 bg-zinc-800 text-zinc-300 py-6 rounded-2xl font-black text-xl hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarPago} 
                disabled={changeToGive < 0 || receivedAmount === ''}
                className="flex-[2] bg-green-500 text-zinc-950 py-6 rounded-2xl font-black text-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-400 active:scale-95 transition-transform"
              >
                Confirmar y Cocinar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
