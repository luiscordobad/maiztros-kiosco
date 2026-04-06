'use client';
import { useState } from 'react';

export default function MiCuenta() {
  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 md:p-12 flex flex-col items-center">
      <h1 className="text-5xl font-black text-yellow-400 mb-2">⭐ MaiztroPuntos</h1>
      <p className="text-zinc-400 font-bold mb-10 text-center">Revisa tus puntos, niveles y compras anteriores.</p>

      {!customer ? (
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] w-full max-w-md shadow-2xl flex flex-col gap-6">
          <input 
            type="tel" 
            placeholder="Tu Celular (10 dígitos)" 
            value={phone} 
            onChange={e => setPhone(e.target.value)}
            maxLength={10}
            className="bg-zinc-950 border border-zinc-700 p-6 rounded-2xl text-2xl font-black text-center focus:border-yellow-400 outline-none placeholder:text-zinc-700 tracking-widest"
          />
          {error && <p className="text-red-400 font-bold text-center">{error}</p>}
          <button onClick={fetchProfile} disabled={loading} className="bg-yellow-400 text-zinc-950 py-5 rounded-2xl font-black text-xl hover:bg-yellow-300 transition-all shadow-lg">
            {loading ? 'Buscando...' : 'Entrar a mi cuenta'}
          </button>
        </div>
      ) : (
        <div className="w-full max-w-3xl flex flex-col gap-8 animate-in fade-in">
          
          {/* TARJETA DE LEALTAD */}
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] shadow-2xl text-center flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"></div>
            <h2 className="text-3xl font-black mb-1">Hola, {customer.name || 'Maiztro'} 👋</h2>
            <p className={`font-black uppercase tracking-widest mb-6 ${getRank(customer.points).color}`}>{getRank(customer.points).name}</p>
            
            <div className="bg-zinc-950 px-12 py-8 rounded-[2rem] border border-zinc-800 inline-block w-full max-w-md shadow-inner">
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm mb-2">Tu Saldo Actual</p>
              <p className="text-7xl font-black text-white">{Math.floor(customer.points)} <span className="text-2xl text-zinc-600">pts</span></p>
              
              {getRank(customer.points).next && (
                <div className="mt-6 text-left">
                  <div className="flex justify-between text-xs font-bold text-zinc-400 mb-2 uppercase tracking-widest">
                    <span>Progreso</span>
                    <span>Meta: {getRank(customer.points).next} pts</span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-3 overflow-hidden border border-zinc-800">
                    <div className="bg-yellow-400 h-full rounded-full transition-all duration-1000" style={{ width: `${(customer.points / getRank(customer.points).next!) * 100}%` }}></div>
                  </div>
                  <p className="text-xs text-yellow-500 mt-3 font-bold text-center">Faltan {Math.floor(getRank(customer.points).next! - customer.points)} pts para tu próximo premio.</p>
                </div>
              )}
            </div>
            <button onClick={() => setCustomer(null)} className="mt-8 text-zinc-500 hover:text-white underline font-bold transition-colors">Cerrar Sesión</button>
          </div>

          {/* HISTORIAL DESGLOSADO */}
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] shadow-2xl">
            <h3 className="text-2xl font-black mb-6 border-b border-zinc-800 pb-4 text-zinc-300">Tus Últimos Antojos</h3>
            <div className="space-y-6">
              {customer.history.map((order: any) => {
                const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                return (
                  <div key={order.id} className="bg-zinc-950 p-6 rounded-[2rem] border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="flex justify-between items-start mb-4 border-b border-zinc-800/50 pb-4">
                      <div>
                        <p className="font-black text-2xl text-yellow-400 italic">#{order.turnNumber}</p>
                        <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mt-1">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <p className="font-black text-3xl text-green-400">${(order.totalAmount + order.tipAmount).toFixed(2)}</p>
                    </div>
                    
                    {/* Lista de productos comprados */}
                    <div className="space-y-2">
                      {items.map((item: any, idx: number) => (
                        <div key={idx} className="flex flex-col">
                          <p className="font-bold text-white text-lg">• {item.product.name}</p>
                          {item.notes && <p className="text-sm text-zinc-500 pl-4 border-l-2 border-zinc-800 ml-1 mt-1 leading-relaxed">{item.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
