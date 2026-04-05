'use client';
import { useEffect, useState } from 'react';

export default function TicketBeeper({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const enableNotifications = () => {
    // Truco: Reproducimos un audio en silencio para que el navegador nos dé permiso de usar bocinas
    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
    audio.volume = 0.01; 
    audio.play().catch(() => {});
    
    // Probamos si el celular soporta vibración (Android sí, iPhone no)
    if (navigator.vibrate) navigator.vibrate(200); 
    
    setNotificationsEnabled(true);
  };

  const fetchOrder = async () => {
    const res = await fetch(`/api/orders/${params.id}`);
    const data = await res.json();
    if (data.success) {
      if (data.order.status === 'COMPLETED' && order?.status !== 'COMPLETED' && order !== null) {
        // Escándalo activado (Solo si dieron permiso)
        if (navigator.vibrate) navigator.vibrate([1000, 500, 1000, 500, 2000]); 
        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
        audio.play().catch(() => console.log("Audio bloqueado"));
      }
      setOrder(data.order);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 3000); 
    return () => clearInterval(interval);
  }, [params.id, order]);

  if (loading) return <div className="min-h-screen bg-zinc-950 text-white flex justify-center items-center font-bold text-2xl">Buscando ticket... 🌽</div>;
  if (!order) return <div className="min-h-screen bg-zinc-950 text-white flex justify-center items-center font-bold text-2xl">Ticket no encontrado ❌</div>;

  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  const isReady = order.status === 'COMPLETED';

  return (
    <div className={`min-h-screen flex flex-col items-center p-6 font-sans transition-colors duration-500 ${isReady ? 'bg-green-500 animate-pulse' : 'bg-zinc-950'}`}>
      
      {isReady && (
        <div className="text-center mt-10 mb-6">
          <h1 className="text-6xl font-black text-white drop-shadow-xl mb-2">¡LISTO!</h1>
          <p className="text-2xl font-bold text-white">Pasa a la barra a recoger tu orden 🤤</p>
        </div>
      )}

      <div className="bg-white text-zinc-950 w-full max-w-md p-8 rounded-3xl shadow-2xl mt-4 relative overflow-hidden">
        {/* Estado Visual Superior */}
        <div className={`absolute top-0 left-0 right-0 h-4 ${isReady ? 'bg-green-500' : 'bg-yellow-400'}`}></div>

        <div className="text-center border-b-2 border-dashed border-zinc-300 pb-6 mb-6 mt-4">
          <h1 className="text-4xl font-black text-yellow-500 mb-2">MAIZTROS</h1>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Ticket Digital</p>
          <h2 className="text-7xl font-black italic mt-4">#{order.turnNumber}</h2>
          <p className="font-bold text-xl mt-2">{order.customerName}</p>
          
          {!isReady && (
             <div className="mt-6 bg-yellow-100 text-yellow-800 p-4 rounded-xl border border-yellow-300 flex flex-col gap-3">
               <p className="font-black text-lg animate-pulse">⏳ Preparando en Cocina...</p>
               
               {!notificationsEnabled ? (
                 <button onClick={enableNotifications} className="bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-black py-3 px-4 rounded-lg shadow-lg active:scale-95 transition-all">
                   🔔 Toca aquí para Activar Sonido
                 </button>
               ) : (
                 <p className="text-sm font-bold text-green-700 bg-green-200 py-2 rounded-lg">✅ Notificaciones activas</p>
               )}
               
             </div>
          )}
        </div>

        <div className="space-y-4 mb-6 border-b-2 border-dashed border-zinc-300 pb-6">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between items-start">
              <div className="flex-1 pr-4">
                <p className="font-black text-lg leading-tight">{item.product.name}</p>
                {item.notes && <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{item.notes}</p>}
              </div>
              <p className="font-black text-lg">${item.totalPrice.toFixed(2)}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-2xl font-black pt-4 border-t border-zinc-200">
            <p>TOTAL PAGADO</p><p className="text-green-600">${(order.totalAmount + order.tipAmount).toFixed(2)}</p>
          </div>
        </div>

        <div className="text-center text-sm font-bold text-zinc-400">
          <p>Método: {order.paymentMethod === 'TERMINAL' ? '💳 Tarjeta' : '💵 Efectivo'}</p>
          <p>Fecha: {new Date(order.createdAt).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
