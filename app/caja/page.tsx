'use client';
import { useState, useEffect } from 'react';

export default function MonitorCaja() {
  const [pendingCash, setPendingCash] = useState<any[]>([]);

  const fetchCashOrders = async () => {
    const res = await fetch('/api/orders?status=AWAITING_PAYMENT');
    const data = await res.json();
    if (data.success) setPendingCash(data.orders);
  };

  useEffect(() => {
    fetchCashOrders();
    const interval = setInterval(fetchCashOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  const confirmarPago = async (orderId: string) => {
    // Cambiamos el estado a PAID para que la cocina lo vea
    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, newStatus: 'PAID' })
    });
    fetchCashOrders();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <h1 className="text-4xl font-black text-green-500 mb-8">💵 CONTROL DE CAJA</h1>
      <div className="grid grid-cols-1 gap-4">
        {pendingCash.map(order => (
          <div key={order.id} className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 flex justify-between items-center">
            <div>
              <p className="text-3xl font-black">#{order.turnNumber}</p>
              <p className="text-zinc-400 font-bold">{order.customerName}</p>
              <p className="text-2xl text-yellow-400 font-black mt-2">TOTAL: ${order.totalAmount + order.tipAmount}</p>
            </div>
            <button 
              onClick={() => confirmarPago(order.id)}
              className="bg-green-600 hover:bg-green-500 text-white px-10 py-5 rounded-2xl font-black text-xl uppercase transition-all shadow-lg active:scale-95"
            >
              💰 Cobrado - Enviar a Cocina
            </button>
          </div>
        ))}
        {pendingCash.length === 0 && <p className="text-center text-zinc-500 text-2xl mt-20">No hay pagos en efectivo pendientes.</p>}
      </div>
    </div>
  );
}
