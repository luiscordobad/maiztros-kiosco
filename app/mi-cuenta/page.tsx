'use client';
import { useState } from 'react';

const REWARDS = [
  { id: 'tier1', pts: 250, discount: 25, label: 'Premio Básico', icon: '🥤', desc: 'Descuento de $25 (Ideal para Extras o Bebidas)' },
  { id: 'tier2', pts: 500, discount: 60, label: 'Premio Doble', icon: '🌽', desc: 'Descuento de $60 (Ideal para Esquites)' },
  { id: 'tier3', pts: 1000, discount: 150, label: 'Premio Leyenda', icon: '👑', desc: 'Descuento de $150 (Ideal para Combos)' }
];

export default function MiCuenta() {
  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados para los Modales (Pop-ups)
  const [showQR, setShowQR] = useState(false);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchProfile = async () => {
    if (phone.length !== 10) { setError('Ingresa 10 dígitos'); return; }
    setLoading(true); setError('');
    const res = await fetch(`/api/customer?phone=${phone}`);
    const data = await res.json();
    
    if (data.success && data.history.length > 0) {
      setCustomer(data);
    } else {
      setError('No encontramos compras con este número. ¡Anímate a probar Maiztros!');
      setCustomer(null);
    }
    setLoading(false);
  };

  const getRank = (pts: number) => {
    if (pts >= 1000) return { name: 'Maiztro Leyenda 👑', color: 'text-yellow-400', next: null };
    if (pts >= 500) return { name: 'Maiztro Experto 🔥', color: 'text-orange-400', next: 1000 };
    if (pts >= 250) return { name: 'Maiztro Frecuente ⭐', color: 'text-blue-400', next: 500 };
    return { name: 'Maiztro Novato 🌽', color: 'text-zinc-400', next: 250 };
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 md:p-12 flex flex-col items-center relative pb-20">
      
      {/* HEADER */}
      <h1 className="text-5xl font-black text-yellow-400 mb-2 tracking-tighter">⭐ MaiztroPuntos</h1>
      <p className="text-zinc-400 font-bold mb-10 text-center">Revisa tus puntos, premios y antojos favoritos.</p>

      {/* LOGIN */}
      {!customer ? (
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] w-full max-w-md shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
          <input 
            type="tel" 
            placeholder="Tu Celular (10 dígitos)" 
            value={phone} 
            onChange={e => setPhone(e.target.value)}
            maxLength={10}
            className="bg-zinc-950 border border-zinc-700 p-6 rounded-2xl text-2xl font-black text-center focus:border-yellow-400 outline-none placeholder:text-zinc-700 tracking-widest transition-colors"
          />
          {error && <p className="text-red-400 font-bold text-center text-sm animate-bounce">{error}</p>}
          <button onClick={fetchProfile} disabled={loading} className="bg-yellow-400 text-zinc-950 py-5 rounded-2xl font-black text-xl hover:bg-yellow-300 active:scale-95 transition-all shadow-[0_0_20px_rgba(250,204,21,0.3)]">
            {loading ? 'Buscando...' : 'Entrar a mi Bóveda'}
          </button>
        </div>
      ) : (
        <div className="w-full max-w-4xl flex flex-col gap-10 animate-in fade-in duration-500">
          
          {/* ========================================== */}
          {/* 1. TARJETA DE LEALTAD Y PASAPORTE (QR)     */}
          {/* ========================================== */}
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] shadow-2xl text-center flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"></div>
            
            <div className="flex justify-between w-full items-start mb-6">
                <div className="text-left">
                    <h2 className="text-3xl font-black mb-1">Hola, {customer.name || 'Maiztro'} 👋</h2>
                    <p className={`font-black uppercase tracking-widest text-sm ${getRank(customer.points).color}`}>{getRank(customer.points).name}</p>
                </div>
                <button onClick={() => setCustomer(null)} className="text-zinc-500 hover:text-white underline font-bold transition-colors text-xs bg-zinc-950 px-3 py-2 rounded-xl">Salir</button>
            </div>
            
            <div className="bg-zinc-950 px-8 py-8 rounded-[2.5rem] border border-zinc-800 w-full shadow-inner flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-center md:text-left">
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm mb-2">Tu Saldo Actual</p>
                  <p className="text-7xl font-black text-yellow-400 tracking-tighter">{Math.floor(customer.points)} <span className="text-2xl text-zinc-500 font-bold">pts</span></p>
                </div>
                
                {/* BOTÓN DE PASAPORTE (OPCIÓN 1) */}
                <button onClick={() => setShowQR(true)} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 p-4 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 group">
                    <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📱</span>
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-300">Mostrar mi QR</span>
                </button>
            </div>

            {getRank(customer.points).next && (
              <div className="w-full mt-8 text-left bg-zinc-950/50 p-6 rounded-3xl border border-zinc-800/50">
                <div className="flex justify-between text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">
                  <span>Tu Progreso</span>
                  <span className="text-yellow-400">Meta: {getRank(customer.points).next} pts</span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-4 overflow-hidden border border-zinc-800 shadow-inner">
                  <div className="bg-gradient-to-r from-yellow-500 to-yellow-300 h-full rounded-full transition-all duration-1000 relative" style={{ width: `${(customer.points / getRank(customer.points).next!) * 100}%` }}>
                      <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                  </div>
                </div>
                <p className="text-sm text-zinc-400 mt-4 font-bold text-center">¡Estás a solo <span className="text-yellow-400">{Math.floor(getRank(customer.points).next! - customer.points)} pts</span> de tu próximo premio!</p>
              </div>
            )}
          </div>

          {/* ========================================== */}
          {/* 2. LA BÓVEDA DE RECOMPENSAS (OPCIÓN 2)     */}
          {/* ========================================== */}
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] shadow-2xl">
            <h3 className="text-2xl font-black mb-2 text-white flex items-center gap-3">🎁 La Bóveda de Premios</h3>
            <p className="text-zinc-500 font-bold mb-8 text-sm">Tus puntos valen dinero. Úsalos en el Kiosco para pagar tus antojos.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {REWARDS.map(reward => {
                    const canAfford = customer.points >= reward.pts;
                    return (
                        <div key={reward.id} onClick={() => canAfford && setSelectedReward(reward)} className={`relative p-6 rounded-[2rem] border-2 flex flex-col items-center text-center transition-all ${canAfford ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/50 cursor-pointer hover:scale-105 shadow-[0_0_30px_rgba(250,204,21,0.15)]' : 'bg-zinc-950 border-zinc-800 opacity-60 grayscale cursor-not-allowed'}`}>
                            {!canAfford && <div className="absolute top-4 right-4 text-xl">🔒</div>}
                            <span className="text-5xl mb-4 drop-shadow-lg">{reward.icon}</span>
                            <h4 className={`text-xl font-black mb-1 ${canAfford ? 'text-yellow-400' : 'text-zinc-400'}`}>{reward.label}</h4>
                            <p className="text-xs font-bold text-zinc-300 mb-6 h-8">{reward.desc}</p>
                            
                            <div className={`mt-auto w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest ${canAfford ? 'bg-yellow-400 text-zinc-950' : 'bg-zinc-900 text-zinc-600'}`}>
                                {canAfford ? '¡Usar Ahora!' : `${reward.pts} pts`}
                            </div>
                        </div>
                    );
                })}
            </div>
          </div>

          {/* ========================================== */}
          {/* 3. HISTORIAL Y FAVORITOS (OPCIÓN 3)        */}
          {/* ========================================== */}
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] shadow-2xl">
            <h3 className="text-2xl font-black mb-6 border-b border-zinc-800 pb-4 text-zinc-300 flex items-center gap-3">🤤 Tus Últimos Antojos</h3>
            <div className="space-y-6">
              {customer.history.map((order: any) => {
                const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                return (
                  <div key={order.id} className="bg-zinc-950 p-6 rounded-[2rem] border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                            <p className="font-black text-3xl text-yellow-400 italic">#{order.turnNumber}</p>
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded-lg">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        
                        <div className="space-y-3">
                        {items.map((item: any, idx: number) => (
                            <div key={idx} className="flex flex-col">
                            <p className="font-black text-white text-lg">• {item.product.name}</p>
                            {item.notes && <p className="text-sm text-zinc-400 pl-4 border-l-2 border-zinc-800 ml-1 mt-1 leading-relaxed">{item.notes}</p>}
                            </div>
                        ))}
                        </div>
                    </div>
                    
                    <div className="flex flex-col justify-between items-end border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0 md:pl-6">
                        <p className="font-black text-3xl text-green-400 mb-4">${(order.totalAmount + order.tipAmount).toFixed(2)}</p>
                        <button onClick={() => setSelectedOrder({ turnNumber: order.turnNumber, items, total: order.totalAmount })} className="w-full md:w-auto bg-green-500 hover:bg-green-400 text-zinc-950 font-black py-4 px-6 rounded-2xl transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                            ⭐ ¡Lo quiero igual!
                        </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* MODALES (POP-UPS) INTERACTIVOS             */}
      {/* ========================================== */}

      {/* MODAL 1: QR PASAPORTE */}
      {showQR && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex justify-center items-center z-50 p-6 animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] text-center max-w-sm w-full relative">
                <button onClick={() => setShowQR(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white text-xl font-bold">✕</button>
                <h3 className="text-2xl font-black text-yellow-400 mb-2">Tu Pasaporte</h3>
                <p className="text-zinc-400 text-sm font-bold mb-8">Muestra este código al Maiztro o en el Kiosco para sumar puntos.</p>
                <div className="bg-white p-4 rounded-3xl inline-block mb-6">
                    {/* Generamos un QR con API Externa confiable sin instalar librerías extra */}
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${phone}&color=18181b`} alt="Código QR" className="w-56 h-56 rounded-xl" />
                </div>
                <p className="font-black text-3xl tracking-[0.2em] text-white">{phone}</p>
            </div>
        </div>
      )}

      {/* MODAL 2: CANJE DE BOVEDA */}
      {selectedReward && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex justify-center items-center z-50 p-6 animate-in fade-in">
            <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-yellow-500/50 p-10 rounded-[3rem] text-center max-w-md w-full relative shadow-[0_0_50px_rgba(250,204,21,0.15)]">
                <span className="text-7xl mb-6 block drop-shadow-2xl">{selectedReward.icon}</span>
                <h3 className="text-3xl font-black text-white mb-2">{selectedReward.label} Desbloqueado</h3>
                <p className="text-yellow-400 font-black text-xl mb-8 border-b border-zinc-800 pb-6">Te descontaremos ${selectedReward.discount} MXN</p>
                
                <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 mb-8 text-left">
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-3">¿Cómo usarlo?</p>
                    <ol className="text-zinc-300 font-bold text-sm space-y-3">
                        <li><span className="text-yellow-400 mr-2">1.</span> Ve al Kiosco de Maiztros.</li>
                        <li><span className="text-yellow-400 mr-2">2.</span> Arma tu antojo favorito.</li>
                        <li><span className="text-yellow-400 mr-2">3.</span> En la pantalla de pago, ingresa tu celular <strong>{phone}</strong>.</li>
                        <li><span className="text-yellow-400 mr-2">4.</span> ¡Listo! Selecciona el premio en pantalla y el descuento es automático.</li>
                    </ol>
                </div>

                <button onClick={() => setSelectedReward(null)} className="w-full bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-black text-xl py-4 rounded-2xl shadow-lg transition-transform active:scale-95">
                    ¡Entendido! ➔
                </button>
            </div>
        </div>
      )}

      {/* MODAL 3: RE-ORDENAR (FAVORITO) */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex justify-center items-center z-50 p-6 animate-in fade-in">
            <div className="bg-green-950/20 border-2 border-green-500/50 p-10 rounded-[3rem] text-center max-w-md w-full relative">
                <button onClick={() => setSelectedOrder(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-white text-xl font-bold">✕</button>
                <span className="text-6xl mb-4 block">👨‍🍳</span>
                <h3 className="text-3xl font-black text-green-400 mb-4">¡Excelente Elección!</h3>
                <p className="text-zinc-300 text-sm font-bold mb-8">Pasa directamente a la caja y muéstrale esta pantalla al Maiztro para que te prepare exactamente esto:</p>
                
                <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-800 text-left mb-8 shadow-inner">
                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-4">Orden de {customer.name || 'Maiztro'}</p>
                    <div className="space-y-4">
                        {selectedOrder.items.map((item: any, idx: number) => (
                            <div key={idx}>
                                <p className="font-black text-white text-lg">{item.product.name}</p>
                                {item.notes && <p className="text-sm text-yellow-400/80 font-bold mt-1 leading-relaxed">{item.notes}</p>}
                            </div>
                        ))}
                    </div>
                </div>
                <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest mb-1">Precio Aproximado</p>
                <p className="font-black text-4xl text-white mb-6">${selectedOrder.total.toFixed(2)}</p>
            </div>
        </div>
      )}

    </div>
  );
}
