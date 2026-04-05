'use client';
import { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute'; // Candado de seguridad

export default function CocinaKDS() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para la alerta sonora
  const [soundEnabled, setSoundEnabled] = useState(false);
  const previousOrderCount = useRef(0);

  const playDing = () => {
    if (!soundEnabled) return;
    // Sonido de notificación claro y fuerte
    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/ding.ogg');
    audio.play().catch(e => console.log("Sonido bloqueado por el navegador, requiere interacción del usuario."));
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders?status=PAID');
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
        
        // Si hay más órdenes ahora que en el chequeo anterior, ¡suena la campana!
        if (data.orders.length > previousOrderCount.current) {
          playDing();
        }
        previousOrderCount.current = data.orders.length;
      }
    } catch (error) {
      console.error('Error de red al buscar órdenes');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000); // Revisa cada 3 segundos
    return () => clearInterval(interval);
  }, [soundEnabled]); // Volvemos a atar el useEffect al estado del sonido por si cambia

  const handleDespachar = async (orderId: string) => {
    // 1. Lo quitamos de la pantalla al instante por fluidez
    setOrders(orders.filter(o => o.id !== orderId)); 
    
    // 2. Le avisamos a la base de datos que ya está completado
    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, newStatus: 'COMPLETED' })
    });
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 text-white flex justify-center items-center text-3xl">Cargando KDS...</div>;

  return (
    <ProtectedRoute title="Monitor de Cocina">
      <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-10 font-sans">
        <header className="flex justify-between items-center border-b border-zinc-800 pb-6 mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black text-yellow-400 tracking-tighter">🔥 PARRILLA MAIZTROS</h1>
            
            {/* Botón de Sonido (Necesario porque los navegadores bloquean el sonido automático) */}
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)} 
              className={`px-4 py-2 rounded-full font-bold text-sm transition-colors border ${soundEnabled ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30'}`}
            >
              {soundEnabled ? '🔊 Sonido ON' : '🔇 Sonido OFF (Tocar para activar)'}
            </button>
          </div>
          
          <div className="bg-zinc-900 px-6 py-2 rounded-full border border-zinc-700 font-bold text-zinc-400">
            Tickets Activos: <span className="text-white text-xl">{orders.length}</span>
          </div>
        </header>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-32 opacity-50">
            <span className="text-8xl mb-6">🧹</span>
            <h2 className="text-3xl font-bold">Cocina Limpia</h2>
            <p className="text-xl mt-2">Esperando el siguiente antojo...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {orders.map((order) => {
              const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
              const timeAgo = Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / 60000);
              const isLate = timeAgo >= 10; // Alerta roja si pasan 10 minutos

              return (
                <div key={order.id} className={`bg-zinc-900 border-2 rounded-[2rem] flex flex-col overflow-hidden shadow-2xl transition-colors duration-500 ${isLate ? 'border-red-500 shadow-red-500/20' : 'border-zinc-700'}`}>
                  
                  {/* Cabecera del Ticket */}
                  <div className={`p-6 flex justify-between items-center border-b ${isLate ? 'bg-red-500/20 border-red-500/50' : 'bg-zinc-800/50 border-zinc-800'}`}>
                    <div>
                      <h2 className="text-4xl font-black italic tracking-tighter">#{order.turnNumber}</h2>
                      <p className="text-zinc-400 font-bold mt-1">{order.customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-black text-xl ${order.orderType === 'DINE_IN' ? 'text-yellow-400' : 'text-blue-400'}`}>
                        {order.orderType === 'DINE_IN' ? '🍽️ AQUÍ' : '🎒 LLEVAR'}
                      </p>
                      <p className={`text-sm font-bold mt-1 ${isLate ? 'text-red-400 animate-pulse' : 'text-zinc-500'}`}>
                        Hace {timeAgo} min
                      </p>
                    </div>
                  </div>

                  {/* Lista de Productos y Toppings */}
                  <div className="p-6 flex-1 bg-zinc-950/50 overflow-y-auto space-y-4">
                    {items.map((item: any, idx: number) => (
                      <div key={idx} className="pb-4 border-b border-zinc-800/50 last:border-0 last:pb-0">
                        <p className="text-xl font-black">{item.product.name}</p>
                        {item.notes && (
                          <p className="text-zinc-400 text-sm mt-2 font-medium whitespace-pre-wrap leading-relaxed">
                            {item.notes.split(' | ').join('\n')}
                          </p>
                        )}
                      </div>
                    ))}
                    
                    {/* Nota Especial del Cliente */}
                    {order.orderNotes && (
                      <div className="mt-4 p-4 bg-yellow-400/10 border border-yellow-400/20 rounded-xl">
                        <p className="text-yellow-400 font-bold uppercase text-xs mb-1">Nota Especial:</p>
                        <p className="text-white font-medium">{order.orderNotes}</p>
                      </div>
                    )}
                  </div>

                  {/* Botón de Despachar */}
                  <button 
                    onClick={() => handleDespachar(order.id)}
                    className="w-full bg-green-500 hover:bg-green-400 text-zinc-950 py-6 font-black text-2xl uppercase tracking-widest active:bg-green-600 transition-colors"
                  >
                    ✅ Despachado
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
