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

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 md:p-12 flex flex-col items-center">
      <h1 className="text-5xl font-black text-yellow-400 mb-2">⭐ MaiztroPuntos</h1>
      <p className="text-zinc-400 font-bold mb-10 text-center">Revisa tus puntos, cupones y compras anteriores.</p>

      {!customer ? (
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] w-full max-w-md shadow-2xl flex flex-col gap-6">
          <input 
            type="tel" 
            placeholder="Tu Celular (10 dígitos)" 
            value={phone} 
            onChange={e => setPhone(e.target.value)}
            maxLength={10}
            className="bg-zinc-950 border border-zinc-700 p-6 rounded-2xl text-2xl font-black text-center focus:border-yellow-400 outline-none placeholder:text-zinc-700"
          />
          {error && <p className="text-red-400 font-bold text-center">{error}</p>}
          <button onClick={fetchProfile} disabled={loading} className="bg-yellow-400 text-zinc-950 py-5 rounded-2xl font-black text-xl hover:bg-yellow-300 transition-all shadow-lg">
            {loading ? 'Buscando...' : 'Entrar a mi cuenta'}
          </button>
        </div>
      ) : (
        <div className="w-full max-w-3xl flex flex-col gap-8 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] shadow-2xl text-center flex flex-col items-center">
            <h2 className="text-3xl font-black mb-2">Hola, {customer.name || 'Maiztro'} 👋</h2>
            <div className="bg-zinc-950 px-10 py-6 rounded-3xl border border-zinc-800 inline-block mt-4">
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm mb-2">Tu Saldo Actual</p>
              <p className="text-6xl font-black text-yellow-400">{Math.floor(customer.points)} <span className="text-2xl text-yellow-600">pts</span></p>
              <p className="text-green-400 font-bold mt-2">Equivale a ${(Math.floor(customer.points) / 100).toFixed(2)} MXN de descuento</p>
            </div>
            <p className="text-zinc-500 text-sm mt-6 font-medium">Ganas 1 punto por cada $1 peso de compra.<br/>Úsalos en el Kiosco en tu próxima visita.</p>
            <button onClick={() => setCustomer(null)} className="mt-8 text-zinc-400 underline font-bold">Cerrar Sesión</button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] shadow-2xl">
            <h3 className="text-2xl font-black mb-6 border-b border-zinc-800 pb-4">Tus Últimos Antojos</h3>
            <div className="space-y-4">
              {customer.history.map((order: any) => (
                <div key={order.id} className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 flex justify-between items-center">
                  <div>
                    <p className="font-black text-lg text-yellow-400">#{order.turnNumber}</p>
                    <p className="text-sm text-zinc-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="font-black text-xl">${(order.totalAmount + order.tipAmount).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
