'use client';
import { useState } from 'react';

// LA NUEVA BÓVEDA CON REGLAS DE NEGOCIO
const REWARDS = [
  { id: 'tier1', pts: 250, minSpend: 150, label: 'Mini Topping Extra', icon: '🌶️', desc: 'Canjea un topping extra gratis en compras mayores a $150 MXN.' },
  { id: 'tier2', pts: 500, minSpend: 250, label: 'Bebida Refrescante', icon: '🥤', desc: 'Llévate una bebida directa gratis al gastar más de $250 MXN.' },
  { id: 'tier3', pts: 1000, minSpend: 350, label: 'Esquite Chico Gratis', icon: '🌽', desc: '¡Tu lealtad rinde frutos! Esquite chico gratis en tu consumo mayor a $350 MXN.' }
];

export default function MiCuenta() {
  // Estados de Navegación y Usuario
  const [view, setView] = useState<'LOGIN' | 'REGISTER' | 'DASHBOARD'>('LOGIN');
  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados del Formulario de Registro
  const [regData, setRegData] = useState({ firstName: '', lastName: '', email: '', acceptedTerms: false });

  // Estados de Modales
  const [showQR, setShowQR] = useState(false);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showCookies, setShowCookies] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // ==========================================
  // FUNCIONES DE API
  // ==========================================
  const fetchProfile = async (phoneToFetch: string) => {
    if (phoneToFetch.length !== 10) { setError('Ingresa 10 dígitos'); return; }
    setLoading(true); setError('');
    try {
        const res = await fetch(`/api/customer?phone=${phoneToFetch}`);
        const data = await res.json();
        
        if (data.success) {
            setCustomer(data);
            setView('DASHBOARD');
        } else {
            // Si no existe, lo mandamos a registrarse
            setView('REGISTER');
        }
    } catch(e) { setError('Error de conexión.'); }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regData.firstName || !regData.lastName || !regData.email) return setError('Llena todos los campos');
    if (!regData.acceptedTerms) return setError('Debes aceptar las políticas de privacidad');
    
    setLoading(true); setError('');
    try {
        const res = await fetch('/api/customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, ...regData })
        });
        const data = await res.json();
        if (data.success) {
            // Recargamos el perfil para traer el historial vacío y el bono de puntos
            await fetchProfile(phone);
        } else { setError('Error al registrar cuenta.'); }
    } catch(e) { setError('Error de red.'); }
    setLoading(false);
  };

  const handleRemoteOrder = async () => {
    setLoading(true);
    try {
        const payload = {
            cart: selectedOrder.items,
            totalAmount: selectedOrder.total,
            customerName: customer.name,
            customerPhone: customer.phone,
            paymentMethod: 'EFECTIVO_CAJA',
            orderType: 'TAKEOUT', // Asumimos que si lo pide desde el cel es para pasar por él
            orderNotes: '🚨 PEDIDO DESDE APP MÓVIL 🚨'
        };

        const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        
        if (data.success) {
            setOrderSuccess(data.orderId);
            setSelectedOrder(null);
        } else { alert('Hubo un problema enviando tu orden. Intenta en sucursal.'); }
    } catch(e) { alert('Error de red.'); }
    setLoading(false);
  };

  // ==========================================
  // UTILIDADES
  // ==========================================
  const getRank = (pts: number) => {
    if (pts >= 1000) return { name: 'Maiztro Leyenda 👑', color: 'text-yellow-400', next: null };
    if (pts >= 500) return { name: 'Maiztro Experto 🔥', color: 'text-orange-400', next: 1000 };
    if (pts >= 250) return { name: 'Maiztro Frecuente ⭐', color: 'text-blue-400', next: 500 };
    return { name: 'Maiztro Novato 🌽', color: 'text-zinc-400', next: 250 };
  };

  const resetFlow = () => { setCustomer(null); setView('LOGIN'); setPhone(''); setOrderSuccess(null); };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 md:p-12 flex flex-col items-center relative pb-20">
      
      {/* HEADER GLOBAL */}
      <h1 className="text-5xl font-black text-yellow-400 mb-2 tracking-tighter">⭐ MaiztroVIP</h1>
      <p className="text-zinc-400 font-bold mb-10 text-center">Tu lealtad sabe a esquite.</p>

      {/* ========================================== */}
      {/* VISTA 1: LOGIN                             */}
      {/* ========================================== */}
      {view === 'LOGIN' && (
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] w-full max-w-md shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
          <p className="text-center text-sm font-bold text-zinc-300">Ingresa tu número para ver tus recompensas o crear una cuenta nueva.</p>
          <input 
            type="tel" 
            placeholder="Celular (10 dígitos)" 
            value={phone} 
            onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
            maxLength={10}
            className="bg-zinc-950 border border-zinc-700 p-6 rounded-2xl text-2xl font-black text-center focus:border-yellow-400 outline-none placeholder:text-zinc-700 tracking-widest transition-colors"
          />
          {error && <p className="text-red-400 font-bold text-center text-sm animate-bounce">{error}</p>}
          <button onClick={() => fetchProfile(phone)} disabled={loading || phone.length !== 10} className="bg-yellow-400 disabled:opacity-50 text-zinc-950 py-5 rounded-2xl font-black text-xl hover:bg-yellow-300 active:scale-95 transition-all shadow-[0_0_20px_rgba(250,204,21,0.3)]">
            {loading ? 'Conectando...' : 'Siguiente ➔'}
          </button>
        </div>
      )}

      {/* ========================================== */}
      {/* VISTA 2: REGISTRO                          */}
      {/* ========================================== */}
      {view === 'REGISTER' && (
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] w-full max-w-md shadow-2xl flex flex-col gap-6 animate-in slide-in-from-right duration-300">
          <div className="text-center mb-4">
              <span className="text-5xl block mb-2">🌽</span>
              <h2 className="text-2xl font-black text-white">¡Únete a la familia!</h2>
              <p className="text-zinc-400 text-sm font-bold mt-1">Crea tu cuenta y gana 50 MaiztroPuntos de bienvenida.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Nombre" value={regData.firstName} onChange={e=>setRegData({...regData, firstName: e.target.value})} className="bg-zinc-950 border border-zinc-700 p-4 rounded-xl text-white font-bold outline-none focus:border-yellow-400 w-full" required/>
                  <input type="text" placeholder="Apellido" value={regData.lastName} onChange={e=>setRegData({...regData, lastName: e.target.value})} className="bg-zinc-950 border border-zinc-700 p-4 rounded-xl text-white font-bold outline-none focus:border-yellow-400 w-full" required/>
              </div>
              <input type="email" placeholder="Correo Electrónico" value={regData.email} onChange={e=>setRegData({...regData, email: e.target.value})} className="bg-zinc-950 border border-zinc-700 p-4 rounded-xl text-white font-bold outline-none focus:border-yellow-400 w-full" required/>
              <input type="tel" value={phone} disabled className="bg-zinc-950/50 border border-zinc-800 p-4 rounded-xl text-zinc-500 font-black tracking-widest text-center w-full cursor-not-allowed"/>
              
              <div className="flex items-start gap-3 mt-6 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <input type="checkbox" id="terms" checked={regData.acceptedTerms} onChange={e=>setRegData({...regData, acceptedTerms: e.target.checked})} className="mt-1 w-5 h-5 accent-yellow-400"/>
                  <label htmlFor="terms" className="text-xs text-zinc-400 font-medium leading-relaxed">
                      Acepto la <button type="button" onClick={()=>setShowPrivacy(true)} className="text-yellow-400 underline font-bold">Política de Privacidad</button> y el uso de <button type="button" onClick={()=>setShowCookies(true)} className="text-yellow-400 underline font-bold">Cookies</button> para gestionar mis recompensas.
                  </label>
              </div>

              {error && <p className="text-red-400 font-bold text-center text-sm">{error}</p>}

              <button type="submit" disabled={loading} className="w-full bg-yellow-400 disabled:opacity-50 text-zinc-950 py-5 rounded-2xl font-black text-xl hover:bg-yellow-300 active:scale-95 transition-all mt-4">
                  {loading ? 'Creando cuenta...' : 'Crear Cuenta ➔'}
              </button>
              <button type="button" onClick={() => setView('LOGIN')} className="w-full text-zinc-500 hover:text-white font-bold text-sm mt-4">← Regresar</button>
          </form>
        </div>
      )}

      {/* ========================================== */}
      {/* VISTA 3: DASHBOARD DEL CLIENTE             */}
      {/* ========================================== */}
      {view === 'DASHBOARD' && customer && (
        <div className="w-full max-w-4xl flex flex-col gap-10 animate-in fade-in duration-500">
          
          {/* 1. TARJETA DE LEALTAD Y PASAPORTE (QR) */}
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] shadow-2xl text-center flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"></div>
            
            <div className="flex justify-between w-full items-start mb-6">
                <div className="text-left">
                    <h2 className="text-3xl font-black mb-1 truncate max-w-[200px] md:max-w-full">Hola, {customer.name.split(' ')[0]} 👋</h2>
                    <p className={`font-black uppercase tracking-widest text-sm ${getRank(customer.points).color}`}>{getRank(customer.points).name}</p>
                </div>
                <button onClick={resetFlow} className="text-zinc-500 hover:text-white underline font-bold transition-colors text-xs bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800">Salir</button>
            </div>
            
            <div className="bg-zinc-950 px-8 py-8 rounded-[2.5rem] border border-zinc-800 w-full shadow-inner flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-center md:text-left">
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm mb-2">Tu Saldo Actual</p>
                  <p className="text-7xl font-black text-yellow-400 tracking-tighter">{Math.floor(customer.points)} <span className="text-2xl text-zinc-500 font-bold">pts</span></p>
                </div>
                
                <button onClick={() => setShowQR(true)} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-8 py-4 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 group shadow-lg w-full md:w-auto">
                    <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📱</span>
                    <span className="text-xs font-black uppercase tracking-widest text-white">Mi Código QR</span>
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
                <p className="text-sm text-zinc-400 mt-4 font-bold text-center">¡Estás a solo <span className="text-yellow-400">{Math.floor(getRank(customer.points).next! - customer.points)} pts</span> de tu próximo nivel!</p>
              </div>
            )}
          </div>

          {/* 2. CUPONES ESPECIALES ACTIVOS */}
          {customer.activeCoupons && customer.activeCoupons.length > 0 && (
              <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 p-8 rounded-[3rem] shadow-2xl">
                  <h3 className="text-2xl font-black mb-2 text-white flex items-center gap-3">🎟️ Promos Exclusivas</h3>
                  <p className="text-zinc-400 font-bold mb-6 text-sm">Dicta estos códigos en caja o ingrésalos en el Kiosco.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {customer.activeCoupons.map((coupon: any) => (
                          <div key={coupon.id} className="bg-zinc-950 p-6 rounded-2xl border border-purple-500/50 flex flex-col justify-center items-center text-center shadow-lg relative overflow-hidden">
                              <div className="absolute -right-4 -top-4 text-6xl opacity-10">🎫</div>
                              <p className="font-black text-2xl text-yellow-400 tracking-widest mb-1">{coupon.code}</p>
                              <p className="text-sm font-bold text-zinc-300">Descuento de {coupon.discountType === 'FIXED' ? `$${coupon.discount}` : `${coupon.discount}%`}</p>
                              {coupon.minAmount > 0 && <p className="text-[10px] text-purple-400 uppercase tracking-widest mt-3 font-black bg-purple-900/30 px-3 py-1 rounded-full">Min. Compra: ${coupon.minAmount}</p>}
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* 3. LA BÓVEDA DE RECOMPENSAS */}
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] shadow-2xl">
            <h3 className="text-2xl font-black mb-2 text-white flex items-center gap-3">🎁 La Bóveda de Premios</h3>
            <p className="text-zinc-500 font-bold mb-8 text-sm">Usa tus puntos en el Kiosco. Revisa el consumo mínimo de cada premio.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {REWARDS.map(reward => {
                    const canAfford = customer.points >= reward.pts;
                    return (
                        <div key={reward.id} onClick={() => canAfford && setSelectedReward(reward)} className={`relative p-6 rounded-[2rem] border-2 flex flex-col items-center text-center transition-all ${canAfford ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/50 cursor-pointer hover:scale-105 shadow-[0_0_30px_rgba(250,204,21,0.15)]' : 'bg-zinc-950 border-zinc-800 opacity-60 grayscale cursor-not-allowed'}`}>
                            {!canAfford && <div className="absolute top-4 right-4 text-xl">🔒</div>}
                            <span className="text-5xl mb-4 drop-shadow-lg">{reward.icon}</span>
                            <h4 className={`text-xl font-black mb-1 ${canAfford ? 'text-yellow-400' : 'text-zinc-400'}`}>{reward.label}</h4>
                            <p className="text-xs font-bold text-zinc-300 mb-6 h-10">{reward.desc}</p>
                            
                            <div className={`mt-auto w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex flex-col gap-1 ${canAfford ? 'bg-yellow-400 text-zinc-950' : 'bg-zinc-900 text-zinc-500'}`}>
                                <span>{canAfford ? '¡Usar Ahora!' : `Cuesta ${reward.pts} pts`}</span>
                                <span className="opacity-80">Min. Compra ${reward.minSpend}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
          </div>

          {/* 4. HISTORIAL Y RE-ORDEN (APP TO CAJA) */}
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] shadow-2xl">
            <h3 className="text-2xl font-black mb-6 border-b border-zinc-800 pb-4 text-zinc-300 flex items-center gap-3">🤤 Tus Últimos Antojos</h3>
            
            {customer.history.length === 0 ? (
                <div className="text-center py-10 bg-zinc-950 rounded-3xl border border-zinc-800">
                    <span className="text-6xl mb-4 block">🌽</span>
                    <p className="text-xl font-black text-zinc-400">Aún no tienes antojos registrados.</p>
                    <p className="text-zinc-600 font-bold mt-2">Visítanos y pide desde el Kiosco.</p>
                </div>
            ) : (
                <div className="space-y-6">
                {customer.history.map((order: any) => {
                    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                    return (
                    <div key={order.id} className="bg-zinc-950 p-6 rounded-[2rem] border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden group">
                        
                        <div className="flex-1 z-10">
                            <div className="flex items-center gap-4 mb-4">
                                <p className="font-black text-3xl text-yellow-400 italic">#{order.turnNumber}</p>
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">{new Date(order.createdAt).toLocaleDateString()}</p>
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
                        
                        <div className="flex flex-col justify-between items-end border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0 md:pl-6 z-10">
                            <p className="font-black text-3xl text-white mb-4">${(order.totalAmount + order.tipAmount).toFixed(2)}</p>
                            <button onClick={() => setSelectedOrder({ turnNumber: order.turnNumber, items, total: order.totalAmount })} className="w-full md:w-auto bg-green-500 hover:bg-green-400 text-zinc-950 font-black py-4 px-6 rounded-2xl transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                                🛒 Pedir a Mostrador
                            </button>
                        </div>
                    </div>
                    );
                })}
                </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* MODALES INTERACTIVOS Y LEGALES             */}
      {/* ========================================== */}

      {/* ÉXITO DE ORDEN REMOTA */}
      {orderSuccess && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex justify-center items-center z-50 p-6 animate-in zoom-in duration-300">
             <div className="bg-green-500 text-white p-10 rounded-[3rem] text-center max-w-sm w-full shadow-2xl">
                <span className="text-8xl mb-6 block drop-shadow-lg">✅</span>
                <h3 className="text-3xl font-black mb-2">¡Orden Enviada!</h3>
                <p className="font-bold mb-8 opacity-90">Tu orden ya está sonando en la cocina de Maiztros.</p>
                <div className="bg-black/20 p-6 rounded-3xl mb-8">
                    <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">Tu Número de Turno</p>
                    <p className="text-5xl font-black italic">#{orderSuccess}</p>
                </div>
                <p className="text-sm font-bold mb-8">Acércate a la caja, menciona tu número y paga en efectivo o tarjeta física.</p>
                <button onClick={() => setOrderSuccess(null)} className="w-full bg-white text-green-600 font-black text-xl py-4 rounded-2xl active:scale-95 transition-transform">Entendido 👍</button>
             </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN DE RE-ORDEN */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex justify-center items-center z-50 p-6 animate-in fade-in">
            <div className="bg-zinc-900 border-2 border-green-500/50 p-10 rounded-[3rem] text-center max-w-md w-full relative">
                <button onClick={() => setSelectedOrder(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-white text-xl font-bold">✕</button>
                <span className="text-6xl mb-4 block">👨‍🍳</span>
                <h3 className="text-3xl font-black text-green-400 mb-4">¿Enviar a Cocina?</h3>
                <p className="text-zinc-300 text-sm font-bold mb-8">Si confirmas, esta orden aparecerá en la pantalla del mostrador para que la preparen inmediatamente.</p>
                
                <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-800 text-left mb-8 shadow-inner">
                    <div className="space-y-4">
                        {selectedOrder.items.map((item: any, idx: number) => (
                            <div key={idx}>
                                <p className="font-black text-white text-lg">{item.product.name}</p>
                                {item.notes && <p className="text-sm text-yellow-400/80 font-bold mt-1 leading-relaxed">{item.notes}</p>}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-between items-center mb-6">
                    <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Total a pagar en caja:</p>
                    <p className="font-black text-3xl text-white">${selectedOrder.total.toFixed(2)}</p>
                </div>

                <button onClick={handleRemoteOrder} disabled={loading} className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-zinc-950 font-black text-xl py-4 rounded-2xl shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-3">
                    {loading ? 'Enviando...' : 'Sí, confirmar orden ✅'}
                </button>
            </div>
        </div>
      )}

      {/* MODAL QR PASAPORTE */}
      {showQR && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex justify-center items-center z-50 p-6 animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] text-center max-w-sm w-full relative">
                <button onClick={() => setShowQR(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white text-xl font-bold">✕</button>
                <h3 className="text-2xl font-black text-yellow-400 mb-2">Tu Pasaporte VIP</h3>
                <p className="text-zinc-400 text-sm font-bold mb-8">Muestra este código al Maiztro en caja para sumar tus puntos rápidamente.</p>
                <div className="bg-white p-4 rounded-3xl inline-block mb-6 shadow-[0_0_30px_rgba(250,204,21,0.2)]">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${phone}&color=18181b`} alt="Código QR" className="w-56 h-56 rounded-xl" />
                </div>
                <p className="font-black text-3xl tracking-[0.2em] text-white">{phone}</p>
            </div>
        </div>
      )}

      {/* MODAL CANJE DE BOVEDA */}
      {selectedReward && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex justify-center items-center z-50 p-6 animate-in fade-in">
            <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-yellow-500/50 p-10 rounded-[3rem] text-center max-w-md w-full relative shadow-[0_0_50px_rgba(250,204,21,0.15)]">
                <span className="text-7xl mb-6 block drop-shadow-2xl">{selectedReward.icon}</span>
                <h3 className="text-3xl font-black text-white mb-2">{selectedReward.label}</h3>
                <p className="text-yellow-400 font-black text-xl mb-8 border-b border-zinc-800 pb-6">Te descontaremos ${selectedReward.discount} MXN</p>
                
                <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 mb-8 text-left">
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-3">Instrucciones de Canje</p>
                    <ol className="text-zinc-300 font-bold text-sm space-y-3">
                        <li><span className="text-yellow-400 mr-2">1.</span> Asegúrate de que tu compra en el Kiosco sea de al menos <strong className="text-white">${selectedReward.minSpend} MXN</strong>.</li>
                        <li><span className="text-yellow-400 mr-2">2.</span> Al pagar en el Kiosco, ingresa tu número: <strong>{phone}</strong>.</li>
                        <li><span className="text-yellow-400 mr-2">3.</span> El sistema detectará tus puntos. Selecciona el <strong>{selectedReward.label}</strong> en la pantalla.</li>
                        <li><span className="text-yellow-400 mr-2">4.</span> ¡El descuento de ${selectedReward.discount} se aplicará solo!</li>
                    </ol>
                </div>

                <button onClick={() => setSelectedReward(null)} className="w-full bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-black text-xl py-4 rounded-2xl shadow-lg transition-transform active:scale-95">
                    ¡Entendido! ➔
                </button>
            </div>
        </div>
      )}

      {/* LEGAL: PRIVACIDAD */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex justify-center items-center z-50 p-6 animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] max-w-lg w-full relative max-h-[80vh] flex flex-col">
                <h3 className="text-xl font-black text-white mb-4 border-b border-zinc-800 pb-4">Aviso de Privacidad Simplificado</h3>
                <div className="overflow-y-auto pr-4 space-y-4 text-sm text-zinc-300 font-medium flex-1">
                    <p>Conforme a lo establecido en la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong> de México, "Maiztros" (ubicado en Zibatá, Querétaro) informa:</p>
                    <p><strong>1. Uso de Datos:</strong> Sus datos personales (Nombre, Apellidos, Teléfono Celular y Correo Electrónico) serán utilizados exclusivamente para: (A) El registro y administración de su cuenta en nuestro programa de lealtad "MaiztroPuntos". (B) El envío de tickets de compra digitales. (C) Envío de promociones exclusivas vía WhatsApp o correo (si el usuario no opta por darse de baja).</p>
                    <p><strong>2. Protección:</strong> Sus datos se almacenan en servidores cifrados y NO serán vendidos, alquilados ni compartidos con terceros ajenos a la operación del sistema de punto de venta.</p>
                    <p><strong>3. Derechos ARCO:</strong> Usted puede ejercer en cualquier momento sus derechos de Acceso, Rectificación, Cancelación y Oposición solicitándolo en el mostrador físico de la sucursal.</p>
                </div>
                <button onClick={() => setShowPrivacy(false)} className="mt-6 w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black py-4 rounded-xl">Cerrar</button>
            </div>
        </div>
      )}

      {/* LEGAL: COOKIES */}
      {showCookies && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex justify-center items-center z-50 p-6 animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] max-w-lg w-full relative max-h-[80vh] flex flex-col">
                <h3 className="text-xl font-black text-white mb-4 border-b border-zinc-800 pb-4">Política de Cookies</h3>
                <div className="overflow-y-auto pr-4 space-y-4 text-sm text-zinc-300 font-medium flex-1">
                    <p>Este sitio web / aplicación de Kiosco utiliza "Cookies" y tecnologías de almacenamiento local (Local Storage / Session Storage) estrictamente necesarias para el funcionamiento del sistema.</p>
                    <p><strong>¿Para qué las usamos?</strong></p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Mantener su sesión activa de "MaiztroPuntos" para que no tenga que ingresar su número constantemente durante su visita.</li>
                        <li>Almacenar temporalmente los productos en el "Carrito de Compras" antes de finalizar su pedido.</li>
                    </ul>
                    <p><strong>¿Qué NO hacemos?</strong> No utilizamos cookies de rastreo publicitario de terceros (como Facebook Pixel o Google Analytics) para seguir su navegación fuera de esta aplicación.</p>
                    <p>Al utilizar este portal, usted acepta el almacenamiento de estas tecnologías esenciales en su dispositivo.</p>
                </div>
                <button onClick={() => setShowCookies(false)} className="mt-6 w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black py-4 rounded-xl">Cerrar</button>
            </div>
        </div>
      )}

    </div>
  );
}
