'use client';
import { useEffect, useState } from 'react';

export default function TicketBeeper({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Estados para el sistema de reseñas (Google Maps)
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // LINK DE TU GOOGLE MAPS (Cámbialo por el tuyo)
  const GOOGLE_MAPS_LINK = "https://maps.app.goo.gl/pKx1y5PgKfs5yxzA8";

  const enableNotifications = () => {
    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
    audio.volume = 0.01; 
    audio.play().catch(() => {});
    if (navigator.vibrate) navigator.vibrate(200); 
    setNotificationsEnabled(true);
  };

  const fetchOrder = async () => {
    try {
        const res = await fetch(`/api/orders/${params.id}`);
        const data = await res.json();
        if (data.success) {
        if (data.order.status === 'COMPLETED' && order?.status !== 'COMPLETED' && order !== null) {
            if (navigator.vibrate) navigator.vibrate([1000, 500, 1000, 500, 2000]); 
            const audio = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
            audio.play().catch(() => console.log("Audio bloqueado"));
        }
        setOrder(data.order);
        }
    } catch (e) { console.error("Buscando actualización..."); }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 3000); 
    return () => clearInterval(interval);
  }, [params.id, order]);

  const handleDownload = () => {
    window.print();
  };

  const handleStarClick = (stars: number) => {
    setRating(stars);
    if (stars === 5) {
      window.open(GOOGLE_MAPS_LINK, '_blank');
      setSubmitted(true);
    }
  };

  const handlePrivateFeedback = () => {
    if (!feedback) return;
    console.log("Queja enviada a gerencia:", feedback);
    setSubmitted(true);
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 text-white flex justify-center items-center font-bold text-2xl">Buscando ticket... 🌽</div>;
  if (!order) return <div className="min-h-screen bg-zinc-950 text-white flex justify-center items-center font-bold text-2xl">Ticket no encontrado ❌</div>;

  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  
  // Lógica Visual del Estatus
  const isPendingPay = order.status === 'AWAITING_PAYMENT' || order.status === 'PENDING';
  const isCooking = order.status === 'PAID' || order.status === 'PREPARING';
  const isReady = order.status === 'COMPLETED';
  const isRefunded = order.status === 'REFUNDED';

  const puntosGanados = Math.floor(order.totalAmount);

  return (
    <div className={`min-h-screen flex flex-col items-center p-6 font-sans transition-colors duration-500 ${isRefunded ? 'bg-red-900' : isReady ? 'bg-green-500' : 'bg-zinc-950'} print:bg-white print:p-0 pb-20`}>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body { background-color: white; }
          .ticket-container { box-shadow: none; border: none; margin: 0; padding: 0; }
        }
      `}} />

      {/* HEADER DINÁMICO */}
      {isRefunded && (
        <div className="text-center mt-10 mb-6 no-print">
          <h1 className="text-6xl font-black text-white drop-shadow-xl mb-2">CANCELADO</h1>
          <p className="text-2xl font-bold text-white">Esta orden fue reembolsada.</p>
        </div>
      )}

      {isReady && !isRefunded && (
        <div className="text-center mt-10 mb-6 no-print animate-pulse">
          <h1 className="text-6xl font-black text-white drop-shadow-xl mb-2">¡LISTO!</h1>
          <p className="text-2xl font-bold text-white">Pasa a la barra a recoger tu orden 🤤</p>
        </div>
      )}

      {!isReady && !isRefunded && (
        <div className="text-center mt-10 mb-6 no-print">
          <h1 className="text-4xl font-black text-yellow-400 drop-shadow-xl mb-2 tracking-tighter">MAIZTROS</h1>
          <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Rastreador de Orden</p>
        </div>
      )}

      {/* RASTREADOR VISUAL (Solo aparece si no ha sido cancelado ni entregado) */}
      {!isRefunded && !isReady && (
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl mb-6 relative overflow-hidden no-print">
            <div className="relative">
                <div className="absolute left-[20px] top-0 bottom-0 w-1 bg-zinc-800 z-0"></div>
                <div className="space-y-8 relative z-10">
                    <div className="flex items-center gap-6 transition-all duration-500">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-lg transition-colors ${isPendingPay ? 'bg-orange-500 text-white border-4 border-orange-900 animate-pulse' : 'bg-green-500 text-zinc-950'}`}>
                            {isPendingPay ? '💸' : '✓'}
                        </div>
                        <div>
                            <p className={`font-black text-lg ${isPendingPay ? 'text-orange-400' : 'text-zinc-500'}`}>
                                {order.paymentMethod === 'EFECTIVO_CAJA' && isPendingPay ? 'Falta Pago en Caja' : 'Orden Recibida'}
                            </p>
                            {isPendingPay && order.paymentMethod === 'EFECTIVO_CAJA' && <p className="text-xs text-zinc-400 font-bold mt-1">Acércate al mostrador para pagar.</p>}
                        </div>
                    </div>
                    <div className={`flex items-center gap-6 transition-all duration-500 ${isPendingPay ? 'opacity-40 grayscale' : ''}`}>
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-lg transition-colors ${isCooking ? 'bg-yellow-400 text-zinc-950 border-4 border-yellow-900 animate-pulse' : 'bg-zinc-800 text-zinc-600'}`}>
                            🔥
                        </div>
                        <div>
                            <p className={`font-black text-lg ${isCooking ? 'text-yellow-400' : 'text-zinc-600'}`}>Preparando Antojo</p>
                            {isCooking && <p className="text-xs text-zinc-400 font-bold mt-1">Los Maiztros están trabajando.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* SISTEMA DE RESEÑAS (Aparece solo cuando está LISTO) */}
      {isReady && !submitted && (
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl mb-6 text-center animate-in slide-in-from-bottom-8 duration-700 no-print">
              <span className="text-5xl mb-4 block">🤤</span>
              <h3 className="text-xl font-black text-white mb-2">¿Qué tal estuvieron tus esquites?</h3>
              <p className="text-zinc-400 font-bold text-xs mb-6">Tu calificación nos ayuda a mantener la calidad.</p>
              <div className="flex justify-center gap-2 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => handleStarClick(star)} className={`text-5xl transition-transform hover:scale-110 active:scale-95 ${rating >= star ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'text-zinc-700 hover:text-yellow-400/50'}`}>★</button>
                  ))}
              </div>
              {rating > 0 && rating < 5 && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                      <p className="text-red-400 font-bold text-xs mb-3 uppercase tracking-widest">¡Ayúdanos a mejorar!</p>
                      <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Cuéntanos qué pasó para poder mejorar" className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-yellow-400 text-sm font-bold h-24 resize-none mb-3 transition-colors" />
                      <button onClick={handlePrivateFeedback} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black py-3 rounded-xl transition-colors text-sm">Enviar mensaje a Gerencia 📩</button>
                  </div>
              )}
          </div>
      )}

      {submitted && (
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] text-center mb-6 animate-in zoom-in duration-500 no-print">
              <span className="text-4xl block mb-2">💛</span>
              <p className="text-green-400 font-black text-lg">¡Gracias por tu opinión!</p>
              <p className="text-zinc-400 text-xs font-bold mt-1">Los Maiztros valoramos mucho tu comentario.</p>
          </div>
      )}

      {/* RECIBO FÍSICO / IMPRIMIBLE */}
      <div className="bg-white text-zinc-950 w-full max-w-md p-8 rounded-3xl shadow-2xl relative overflow-hidden ticket-container">
        <div className={`absolute top-0 left-0 right-0 h-4 no-print ${isRefunded ? 'bg-red-500' : isReady ? 'bg-green-500' : 'bg-yellow-400'}`}></div>

        <div className="text-center border-b-2 border-dashed border-zinc-300 pb-6 mb-6 mt-4">
          <h1 className="text-4xl font-black text-yellow-500 mb-2 no-print">MAIZTROS</h1>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Ticket Oficial</p>
          <h2 className="text-7xl font-black italic mt-4">#{order.turnNumber}</h2>
          <p className="font-bold text-xl mt-2">{order.customerName}</p>
          {order.customerPhone && <p className="text-sm font-bold text-zinc-400 mt-1">Cel: {order.customerPhone}</p>}
          
          {!isReady && !isRefunded && (
             <div className="mt-6 bg-yellow-100 text-yellow-800 p-4 rounded-xl border border-yellow-300 flex flex-col gap-3 no-print">
               {!notificationsEnabled ? (
                 <button onClick={enableNotifications} className="bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-black py-3 px-4 rounded-lg shadow-lg active:scale-95 transition-all">
                   🔔 Toca aquí para Activar Alarma de Entrega
                 </button>
               ) : (
                 <p className="text-sm font-bold text-green-700 bg-green-200 py-2 rounded-lg">✅ Tu celular sonará cuando esté listo</p>
               )}
             </div>
          )}
        </div>

        <div className="space-y-4 mb-6 border-b-2 border-dashed border-zinc-300 pb-6">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between items-start">
              <div className="flex-1 pr-4">
                <p className="font-black text-lg leading-tight flex items-center gap-1">
                    {item.quantity > 1 && <span className="bg-zinc-200 px-1 rounded text-sm">{item.quantity}x</span>}
                    {item.product.name}
                </p>
                {item.notes && <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{item.notes}</p>}
              </div>
              <p className="font-black text-lg">${item.totalPrice.toFixed(2)}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2 mb-6 border-b-2 border-dashed border-zinc-300 pb-6">
          <div className="flex justify-between text-zinc-500 font-bold"><p>Subtotal</p><p>${order.totalAmount.toFixed(2)}</p></div>
          {order.pointsDiscount > 0 && <div className="flex justify-between text-green-600 font-bold"><p>Descuentos</p><p>-${order.pointsDiscount.toFixed(2)}</p></div>}
          <div className="flex justify-between text-zinc-500 font-bold"><p>Propina Equipo</p><p>${order.tipAmount.toFixed(2)}</p></div>
          <div className="flex justify-between text-2xl font-black pt-4 border-t border-zinc-200">
            <p>TOTAL</p>
            <p className={isRefunded ? "text-red-500 line-through" : "text-green-600"}>
              ${(order.totalAmount + order.tipAmount - (order.pointsDiscount||0)).toFixed(2)}
            </p>
          </div>
        </div>

        {order.customerPhone && !isRefunded && (
          <div className="bg-yellow-50 p-4 rounded-xl text-center mb-6 border border-yellow-200">
            <p className="font-black text-yellow-600 text-lg">⭐ Acumulaste {puntosGanados} pts</p>
            <p className="text-xs text-yellow-700 font-bold mt-1">Con tu cuenta: {order.customerPhone}</p>
          </div>
        )}

        <div className="text-center text-sm font-bold text-zinc-400 mb-6">
          <p>Método: {order.paymentMethod === 'TERMINAL' ? '💳 Tarjeta' : '💵 Efectivo'}</p>
          <p>Estado: {isRefunded ? '❌ REEMBOLSADO' : isPendingPay ? '⏳ PENDIENTE DE PAGO' : '✅ PAGADO'}</p>
          <p>Fecha: {new Date(order.createdAt).toLocaleString()}</p>
        </div>

        <button onClick={handleDownload} className="no-print w-full bg-zinc-900 text-white py-4 rounded-xl font-black text-lg hover:bg-zinc-800 transition-colors flex justify-center items-center gap-2">
          ⬇️ Descargar / Imprimir Ticket
        </button>
      </div>
    </div>
  );
}
